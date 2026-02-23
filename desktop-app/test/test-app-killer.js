/**
 * Tests for src/monitor/app-killer.js — process termination.
 */

import { describe, it, expect } from 'vitest';
import { killApp } from '../src/monitor/app-killer.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/** Helper: wait for ms. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('app-killer', () => {
  it('kills a running process (notepad)', async () => {
    // Launch notepad
    exec('notepad.exe');
    await wait(1500); // Give notepad time to start

    const result = await killApp('notepad');
    expect(result.success).toBe(true);

    // Verify process is gone
    await wait(500);
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq notepad.exe" /NH');
      expect(stdout).not.toContain('notepad.exe');
    } catch {
      // tasklist might error if no processes match, which is fine
    }
  });

  it('returns failure gracefully for non-existent process', async () => {
    const result = await killApp('totally_fake_process_xyz');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
