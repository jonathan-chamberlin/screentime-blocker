/**
 * System Proxy Configuration — enables/disables the Windows system proxy
 * so browser traffic routes through our MITM proxy on localhost.
 *
 * Uses HKCU registry (no admin required) for proxy settings.
 * Saves original settings to a backup file for crash recovery.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getStorageDir } from '../storage.js';

const execFileAsync = promisify(execFile);

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
const BACKUP_FILE = 'proxy-backup.json';

/**
 * Get path to the proxy backup file.
 * @returns {string}
 */
function getBackupPath() {
  return join(getStorageDir(), BACKUP_FILE);
}

/**
 * Read current Windows proxy settings from registry.
 * @returns {Promise<{ proxyEnable: number, proxyServer: string, proxyOverride: string }>}
 */
export async function getProxySettings() {
  const settings = { proxyEnable: 0, proxyServer: '', proxyOverride: '' };

  try {
    const { stdout } = await execFileAsync('reg', [
      'query', REG_KEY,
      '/v', 'ProxyEnable',
    ]);
    const match = stdout.match(/ProxyEnable\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
    if (match) settings.proxyEnable = parseInt(match[1], 16);
  } catch { /* key doesn't exist = disabled */ }

  try {
    const { stdout } = await execFileAsync('reg', [
      'query', REG_KEY,
      '/v', 'ProxyServer',
    ]);
    const match = stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/);
    if (match) settings.proxyServer = match[1].trim();
  } catch { /* key doesn't exist */ }

  try {
    const { stdout } = await execFileAsync('reg', [
      'query', REG_KEY,
      '/v', 'ProxyOverride',
    ]);
    const match = stdout.match(/ProxyOverride\s+REG_SZ\s+(.+)/);
    if (match) settings.proxyOverride = match[1].trim();
  } catch { /* key doesn't exist */ }

  return settings;
}

/**
 * Save proxy settings to backup file (for crash recovery).
 * @param {Object} settings
 */
export async function saveProxyBackup(settings) {
  await writeFile(getBackupPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Restore proxy settings from backup file (crash recovery).
 * Deletes the backup file after successful restore.
 * No-op if backup file doesn't exist.
 * @returns {Promise<boolean>} true if backup was restored
 */
export async function restoreProxyBackup() {
  const backupPath = getBackupPath();
  if (!existsSync(backupPath)) return false;

  try {
    const raw = await readFile(backupPath, 'utf-8');
    const settings = JSON.parse(raw);
    await applyProxySettings(settings);
    await unlink(backupPath);
    console.log('[proxy] Restored proxy settings from backup (crash recovery)');
    return true;
  } catch (err) {
    console.error('[proxy] Failed to restore proxy backup:', err.message);
    // Still try to disable proxy as a safety measure
    try { await disableSystemProxy(); } catch { /* ignore */ }
    try { await unlink(backupPath); } catch { /* ignore */ }
    return false;
  }
}

/**
 * Apply specific proxy settings to the registry.
 * @param {{ proxyEnable: number, proxyServer: string, proxyOverride: string }} settings
 */
async function applyProxySettings(settings) {
  await execFileAsync('reg', [
    'add', REG_KEY,
    '/v', 'ProxyEnable', '/t', 'REG_DWORD',
    '/d', String(settings.proxyEnable), '/f',
  ]);

  if (settings.proxyServer) {
    await execFileAsync('reg', [
      'add', REG_KEY,
      '/v', 'ProxyServer', '/t', 'REG_SZ',
      '/d', settings.proxyServer, '/f',
    ]);
  }

  if (settings.proxyOverride) {
    await execFileAsync('reg', [
      'add', REG_KEY,
      '/v', 'ProxyOverride', '/t', 'REG_SZ',
      '/d', settings.proxyOverride, '/f',
    ]);
  }

  await notifyProxyChange();
}

/**
 * Enable the Windows system proxy to route through our MITM proxy.
 * @param {number} port - Proxy port (e.g., 8443)
 */
export async function enableSystemProxy(port) {
  await execFileAsync('reg', [
    'add', REG_KEY,
    '/v', 'ProxyEnable', '/t', 'REG_DWORD',
    '/d', '1', '/f',
  ]);

  await execFileAsync('reg', [
    'add', REG_KEY,
    '/v', 'ProxyServer', '/t', 'REG_SZ',
    '/d', `localhost:${port}`, '/f',
  ]);

  await execFileAsync('reg', [
    'add', REG_KEY,
    '/v', 'ProxyOverride', '/t', 'REG_SZ',
    '/d', 'localhost;127.0.0.1;*.local;<local>', '/f',
  ]);

  await notifyProxyChange();
}

/**
 * Disable the Windows system proxy.
 */
export async function disableSystemProxy() {
  await execFileAsync('reg', [
    'add', REG_KEY,
    '/v', 'ProxyEnable', '/t', 'REG_DWORD',
    '/d', '0', '/f',
  ]);

  await notifyProxyChange();
}

/**
 * Notify Windows that proxy settings have changed so browsers pick them up
 * immediately without needing a restart.
 * Uses PowerShell to call InternetSetOption(INTERNET_OPTION_SETTINGS_CHANGED).
 */
async function notifyProxyChange() {
  try {
    await execFileAsync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class WinINet { [DllImport("wininet.dll", SetLastError=true)] public static extern bool InternetSetOption(System.IntPtr hInternet, int dwOption, System.IntPtr lpBuffer, int dwBufferLength); }'; [WinINet]::InternetSetOption([System.IntPtr]::Zero, 39, [System.IntPtr]::Zero, 0) | Out-Null; [WinINet]::InternetSetOption([System.IntPtr]::Zero, 37, [System.IntPtr]::Zero, 0) | Out-Null`,
    ]);
  } catch {
    // Not critical — browsers will pick up changes within a few seconds anyway
  }
}
