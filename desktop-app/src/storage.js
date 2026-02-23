/**
 * Local JSON file storage — replaces chrome.storage.local.
 * Stores data at %APPDATA%/BrainrotBlocker/data.json.
 * Provides get/set/getAll with file locking via rename-on-write.
 */

import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  APP_DATA_DIR_NAME,
  DATA_FILE_NAME,
  DEFAULT_BLOCKED_SITES,
  DEFAULT_ALLOWED_PATHS,
  DEFAULT_PRODUCTIVE_SITES,
  DEFAULT_BLOCKED_APPS,
  DEFAULT_PRODUCTIVE_APPS,
  DEFAULT_WORK_MINUTES,
  DEFAULT_REWARD_MINUTES,
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  DEFAULT_PRODUCTIVE_MODE,
  BLOCKING_MODES,
} from './shared/constants.js';

/**
 * @typedef {Object} StorageData
 * @property {number} workMinutes
 * @property {number} rewardMinutes
 * @property {boolean} strictMode
 * @property {boolean} blockTaskManager
 * @property {number} idleTimeoutSeconds
 * @property {string} productiveMode - 'all-except-blocked' | 'whitelist'
 * @property {Array<import('./shared/constants.js').BreakList>} breakLists
 * @property {string[]} productiveSites
 * @property {string[]} productiveApps
 * @property {string[]} blockedApps
 * @property {Object} nuclearBlockData
 * @property {Array<Object>} sessionHistory
 * @property {Object} dailySummaries
 * @property {Object} streakData
 * @property {Object|null} focusState
 */

/** @returns {StorageData} */
function getDefaults() {
  return {
    workMinutes: DEFAULT_WORK_MINUTES,
    rewardMinutes: DEFAULT_REWARD_MINUTES,
    strictMode: false,
    blockTaskManager: false,
    idleTimeoutSeconds: DEFAULT_IDLE_TIMEOUT_SECONDS,
    productiveMode: DEFAULT_PRODUCTIVE_MODE,
    breakLists: [
      {
        id: 'default',
        name: 'Default Block List',
        mode: BLOCKING_MODES.MANUAL,
        sites: [...DEFAULT_BLOCKED_SITES],
        apps: [...DEFAULT_BLOCKED_APPS],
        allowedPaths: [...DEFAULT_ALLOWED_PATHS],
        schedule: null,
      },
    ],
    productiveSites: [...DEFAULT_PRODUCTIVE_SITES],
    productiveApps: [...DEFAULT_PRODUCTIVE_APPS],
    blockedApps: [...DEFAULT_BLOCKED_APPS],
    nuclearBlockData: { sites: [] },
    sessionHistory: [],
    dailySummaries: {},
    streakData: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
    focusState: null,
  };
}

/**
 * Simple async mutex to serialize file writes.
 * Prevents concurrent writes from racing on the same .tmp file.
 */
let writeLock = Promise.resolve();

/**
 * Acquire the write lock, execute fn, then release.
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
function withLock(fn) {
  const prev = writeLock;
  let release;
  writeLock = new Promise((resolve) => { release = resolve; });
  return prev.then(fn).finally(release);
}

/**
 * Resolve the storage directory path.
 * @returns {string}
 */
function getStorageDir() {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error('APPDATA environment variable is not set');
  }
  return join(appData, APP_DATA_DIR_NAME);
}

/**
 * Resolve the data file path.
 * @returns {string}
 */
function getDataPath() {
  return join(getStorageDir(), DATA_FILE_NAME);
}

/**
 * Ensure the storage directory exists.
 * @returns {Promise<void>}
 */
async function ensureDir() {
  const dir = getStorageDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Read all stored data. Returns defaults if file doesn't exist.
 * @returns {Promise<StorageData>}
 */
export async function getAll() {
  await ensureDir();
  const dataPath = getDataPath();

  if (!existsSync(dataPath)) {
    const defaults = getDefaults();
    await writeAtomic(dataPath, defaults);
    return defaults;
  }

  try {
    const raw = await readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Merge with defaults so new keys are always present
    return { ...getDefaults(), ...parsed };
  } catch {
    // Corrupted file — reset to defaults
    const defaults = getDefaults();
    await writeAtomic(dataPath, defaults);
    return defaults;
  }
}

/**
 * Get a single key from storage.
 * @param {string} key
 * @returns {Promise<unknown>}
 */
export async function get(key) {
  const all = await getAll();
  return all[key];
}

/**
 * Set one or more keys in storage (partial update).
 * @param {Partial<StorageData>} updates
 * @returns {Promise<StorageData>}
 */
export function set(updates) {
  return withLock(async () => {
    const all = await getAll();
    const merged = { ...all, ...updates };
    await writeAtomic(getDataPath(), merged);
    return merged;
  });
}

/**
 * Write data atomically: write to temp file, then rename.
 * Prevents corruption from interrupted writes.
 *
 * @param {string} targetPath
 * @param {StorageData} data
 * @returns {Promise<void>}
 */
async function writeAtomic(targetPath, data) {
  const tmpPath = targetPath + '.tmp';
  const json = JSON.stringify(data, null, 2);
  await writeFile(tmpPath, json, 'utf-8');
  try {
    await rename(tmpPath, targetPath);
  } catch {
    // On Windows, rename fails if target exists in some edge cases
    await unlink(targetPath).catch(() => {});
    await rename(tmpPath, targetPath);
  }
}

/**
 * Reset all data to defaults.
 * @returns {Promise<StorageData>}
 */
export function reset() {
  return withLock(async () => {
    const defaults = getDefaults();
    await ensureDir();
    await writeAtomic(getDataPath(), defaults);
    return defaults;
  });
}

/**
 * Get the storage directory path (for other modules that need it, e.g. CA certs).
 * @returns {string}
 */
export { getStorageDir };
