/**
 * App Killer — terminates a running process by name.
 *
 * Ported from: native-host/host.ps1 (closeApp handler)
 * Uses taskkill for forceful process termination.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Kill a process by name.
 * Uses `taskkill /IM "processName.exe" /F` for forceful termination.
 *
 * @param {string} processName - Process name with or without .exe
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function killApp(processName) {
  const name = processName.endsWith('.exe')
    ? processName
    : `${processName}.exe`;

  try {
    await execAsync(`taskkill /IM "${name}" /F`, { timeout: 5000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
