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
 * Read a single registry value from the proxy settings key.
 * @param {string} valueName - Registry value name (e.g., 'ProxyEnable')
 * @param {'REG_DWORD'|'REG_SZ'} regType - Registry type
 * @param {*} defaultValue - Value to return if key doesn't exist
 * @returns {Promise<*>}
 */
async function readRegValue(valueName, regType, defaultValue) {
  try {
    const { stdout } = await execFileAsync('reg', ['query', REG_KEY, '/v', valueName]);
    const pattern = regType === 'REG_DWORD'
      ? new RegExp(`${valueName}\\s+REG_DWORD\\s+0x([0-9a-fA-F]+)`)
      : new RegExp(`${valueName}\\s+REG_SZ\\s+(.+)`);
    const match = stdout.match(pattern);
    if (!match) return defaultValue;
    return regType === 'REG_DWORD' ? parseInt(match[1], 16) : match[1].trim();
  } catch {
    return defaultValue;
  }
}

/**
 * Read current Windows proxy settings from registry.
 * @returns {Promise<{ proxyEnable: number, proxyServer: string, proxyOverride: string }>}
 */
export async function getProxySettings() {
  return {
    proxyEnable: await readRegValue('ProxyEnable', 'REG_DWORD', 0),
    proxyServer: await readRegValue('ProxyServer', 'REG_SZ', ''),
    proxyOverride: await readRegValue('ProxyOverride', 'REG_SZ', ''),
  };
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
  await applyProxySettings({
    proxyEnable: 1,
    proxyServer: `localhost:${port}`,
    proxyOverride: 'localhost;127.0.0.1;*.local;<local>',
  });
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
