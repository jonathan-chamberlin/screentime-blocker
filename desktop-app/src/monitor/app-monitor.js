/**
 * App Monitor — detects the foreground Windows application.
 *
 * Uses PowerShell with embedded C# P/Invoke to call GetForegroundWindow
 * and GetWindowThreadProcessId. This avoids requiring ffi-napi native
 * compilation while still providing real Win32 API access.
 *
 * Ported from: native-host/host.ps1
 * (Native messaging protocol removed — direct event emission instead)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { APP_MONITOR_POLL_MS } from '../shared/constants.js';

const execFileAsync = promisify(execFile);

/**
 * PowerShell script that returns the foreground window's process name.
 * Uses Add-Type to compile C# code that calls Win32 APIs.
 */
const PS_GET_FOREGROUND = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class FG {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  public static string Get() {
    IntPtr hw = GetForegroundWindow();
    uint pid; GetWindowThreadProcessId(hw, out pid);
    try { return Process.GetProcessById((int)pid).ProcessName; }
    catch { return ""; }
  }
}
"@
[FG]::Get()
`.trim();

/**
 * Get the name of the currently focused foreground process.
 * @returns {Promise<string>} Process name (without .exe), e.g., "Code"
 */
export async function getForegroundProcess() {
  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command', PS_GET_FOREGROUND,
    ], { timeout: 5000 });
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Start monitoring the foreground app at regular intervals.
 *
 * @param {Object} options
 * @param {number} [options.pollMs] - Poll interval (default: APP_MONITOR_POLL_MS)
 * @returns {{ emitter: EventEmitter, stop: () => void }}
 *
 * Events emitted:
 * - 'app-changed' ({ processName: string, timestamp: number })
 *   Subscribers: session-engine (via main.js wiring)
 */
export function startAppMonitor(options = {}) {
  const { pollMs = APP_MONITOR_POLL_MS } = options;
  const emitter = new EventEmitter();
  let lastProcess = '';
  let running = true;
  let timeoutId = null;

  async function poll() {
    if (!running) return;

    const processName = await getForegroundProcess();
    if (processName && processName !== lastProcess) {
      lastProcess = processName;
      emitter.emit('app-changed', {
        processName,
        timestamp: Date.now(),
      });
    }

    if (running) {
      timeoutId = setTimeout(poll, pollMs);
    }
  }

  // Start polling
  poll();

  function stop() {
    running = false;
    if (timeoutId) clearTimeout(timeoutId);
    emitter.removeAllListeners();
  }

  return { emitter, stop };
}
