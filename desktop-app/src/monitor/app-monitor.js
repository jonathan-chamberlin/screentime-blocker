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
 * PowerShell script that returns the foreground window's process name and title.
 * Uses Add-Type to compile C# code that calls Win32 APIs.
 * Output format: "processName|windowTitle" (pipe-delimited).
 */
const PS_GET_FOREGROUND = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class FG {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int maxCount);
  public static string Get() {
    IntPtr hw = GetForegroundWindow();
    uint pid; GetWindowThreadProcessId(hw, out pid);
    StringBuilder sb = new StringBuilder(512);
    GetWindowText(hw, sb, 512);
    try { return Process.GetProcessById((int)pid).ProcessName + "|" + sb.ToString(); }
    catch { return ""; }
  }
}
"@
[FG]::Get()
`.trim();

/**
 * Get the currently focused foreground process name and window title.
 * @returns {Promise<{ processName: string, windowTitle: string }>}
 */
export async function getForegroundProcess() {
  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command', PS_GET_FOREGROUND,
    ], { timeout: 5000 });
    const raw = stdout.trim();
    const pipeIdx = raw.indexOf('|');
    if (pipeIdx === -1) return { processName: raw, windowTitle: '' };
    return {
      processName: raw.slice(0, pipeIdx),
      windowTitle: raw.slice(pipeIdx + 1),
    };
  } catch {
    return { processName: '', windowTitle: '' };
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
 * - 'app-changed' ({ processName: string, windowTitle: string, timestamp: number })
 *   Subscribers: session-engine (via main.js wiring)
 */
export function startAppMonitor(options = {}) {
  const { pollMs = APP_MONITOR_POLL_MS } = options;
  const emitter = new EventEmitter();
  let lastProcess = '';
  let lastTitle = '';
  let running = true;
  let timeoutId = null;

  async function poll() {
    if (!running) return;

    const { processName, windowTitle } = await getForegroundProcess();
    // Emit when process OR window title changes (catches browser tab switches)
    if (processName && (processName !== lastProcess || windowTitle !== lastTitle)) {
      lastProcess = processName;
      lastTitle = windowTitle;
      emitter.emit('app-changed', {
        processName,
        windowTitle,
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
