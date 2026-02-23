/**
 * Tests for src/storage.js — JSON file persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAll, get, set, reset } from '../src/storage.js';
import { existsSync } from 'node:fs';
import { rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_DATA_DIR_NAME, DATA_FILE_NAME } from '../src/shared/constants.js';

const storageDir = join(process.env.APPDATA, APP_DATA_DIR_NAME);
const dataPath = join(storageDir, DATA_FILE_NAME);

// Use a test-specific environment to avoid stomping real data
// We back up and restore any existing data file
let originalData = null;

beforeEach(async () => {
  if (existsSync(dataPath)) {
    originalData = await readFile(dataPath, 'utf-8');
  }
  // Start each test with a clean slate
  await rm(dataPath, { force: true });
  await rm(dataPath + '.tmp', { force: true });
});

afterEach(async () => {
  // Restore original data if it existed
  if (originalData !== null) {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(storageDir, { recursive: true });
    await writeFile(dataPath, originalData, 'utf-8');
    originalData = null;
  }
});

describe('storage', () => {
  it('loads defaults on first run when no file exists', async () => {
    const data = await getAll();

    expect(data.workMinutes).toBe(50);
    expect(data.rewardMinutes).toBe(10);
    expect(data.strictMode).toBe(false);
    expect(data.blockTaskManager).toBe(false);
    expect(data.idleTimeoutSeconds).toBe(180);
    expect(data.lists).toHaveLength(2);
    // List 1: blocked only, no productive items
    expect(data.lists[0].blocked.sites).toContain('youtube.com');
    expect(data.lists[0].blocked.apps).toContain('steam.exe');
    expect(data.lists[0].productive.mode).toBe('all-except-blocked');
    expect(data.lists[0].productive.sites).toEqual([]);
    expect(data.lists[0].productive.apps).toEqual([]);
    // List 2: blocked + productive items
    expect(data.lists[1].blocked.sites).toContain('youtube.com');
    expect(data.lists[1].productive.mode).toBe('whitelist');
    expect(data.lists[1].productive.sites).toContain('github.com');
    expect(data.lists[1].productive.apps).toContain('Code.exe');
    // File should now exist on disk
    expect(existsSync(dataPath)).toBe(true);
  });

  it('writes data and reads it back correctly', async () => {
    await set({ workMinutes: 25, strictMode: true });
    const data = await getAll();

    expect(data.workMinutes).toBe(25);
    expect(data.strictMode).toBe(true);
  });

  it('partial update preserves other keys', async () => {
    // Initialize with defaults
    await getAll();
    // Update only workMinutes
    await set({ workMinutes: 30 });
    const data = await getAll();

    expect(data.workMinutes).toBe(30);
    // Other defaults preserved
    expect(data.rewardMinutes).toBe(10);
    expect(data.idleTimeoutSeconds).toBe(180);
    expect(data.lists).toHaveLength(2);
  });

  it('get() retrieves a single key', async () => {
    await set({ workMinutes: 42 });
    const val = await get('workMinutes');
    expect(val).toBe(42);
  });

  it('reset() restores all defaults', async () => {
    await set({ workMinutes: 99, strictMode: true, blockTaskManager: true });
    const data = await reset();

    expect(data.workMinutes).toBe(50);
    expect(data.strictMode).toBe(false);
    expect(data.blockTaskManager).toBe(false);
  });

  it('handles concurrent read/write without corruption', async () => {
    // Fire multiple writes concurrently
    const writes = Array.from({ length: 10 }, (_, i) =>
      set({ workMinutes: i })
    );
    await Promise.all(writes);

    // File should still be valid JSON
    const data = await getAll();
    expect(typeof data.workMinutes).toBe('number');
    expect(data.lists).toHaveLength(2);
  });
});
