/**
 * Shared constants for Brainrot Blocker desktop app.
 * All magic values live here — no literal numbers/strings in logic modules.
 *
 * Ported from: extension/constants.js (Chrome API refs removed)
 */

// --- Network ---
export const PROXY_PORT = 8443;
export const WEB_PORT = 3456;
export const PROXY_HOST = 'localhost';

// --- Timers ---
export const SESSION_CHECK_INTERVAL_MS = 15_000;
export const REWARD_CHECK_INTERVAL_MS = 1_000;
export const NUCLEAR_CHECK_INTERVAL_MS = 60_000;
export const SCHEDULER_CHECK_INTERVAL_MS = 15_000;
export const APP_MONITOR_POLL_MS = 1_000;
export const IDLE_CHECK_INTERVAL_MS = 1_000;
export const WEBSOCKET_TICK_MS = 1_000;

// --- Defaults ---
export const DEFAULT_WORK_MINUTES = 50;
export const DEFAULT_REWARD_MINUTES = 10;
export const DEFAULT_IDLE_TIMEOUT_SECONDS = 180;
export const DEFAULT_PRODUCTIVE_MODE = 'all-except-blocked';
export const DEFAULT_LIST_NAME = 'Default List';
export const DEFAULT_LIST_ID = 'default';
export const DEFAULT_LIST_2_NAME = 'Default List 2';
export const DEFAULT_LIST_2_ID = 'default-2';

// --- Browser Detection ---
// Process names (lowercase, without .exe) recognized as browsers.
// When the foreground app is a browser, Current Focus shows "Browser > domain".
export const BROWSER_PROCESS_NAMES = [
  'chrome', 'msedge', 'firefox', 'comet', 'sidekick',
  'brave', 'opera', 'vivaldi', 'arc', 'waterfox', 'librewolf',
  'chromium', 'iridium', 'thorium', 'zen',
];

// --- Blocking Modes ---
export const BLOCKING_MODES = /** @type {const} */ ({
  OFF: 'off',
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  ALWAYS_ON: 'always-on',
});

// --- Nuclear Block ---
export const DEFAULT_COOLDOWN_1_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DEFAULT_COOLDOWN_2_MS = 18 * 60 * 60 * 1000; // 18 hours

// --- Shame System ---
export const SHAME_LEVEL_THRESHOLDS = [0, 1, 4, 8, 12];

// --- Productivity Check ---
export const PRODUCTIVITY_CHECK_MINUTES = 5;

// --- Storage ---
export const APP_DATA_DIR_NAME = 'BrainrotBlocker';
export const DATA_FILE_NAME = 'data.json';
export const CA_DIR_NAME = 'ca';
export const CA_CERT_FILE = 'root-ca.crt';
export const CA_KEY_FILE = 'root-ca.key';
export const CA_COMMON_NAME = 'Brainrot Blocker Local CA';
export const CA_VALIDITY_YEARS = 10;

// --- Preset Blocked Sites ---
export const DEFAULT_BLOCKED_SITES = [
  'youtube.com',
  'reddit.com',
  'instagram.com',
];

// --- Preset Allowed Paths ---
export const DEFAULT_ALLOWED_PATHS = [
  'youtube.com/veritasium',
];

// --- Preset Productive Sites ---
export const DEFAULT_PRODUCTIVE_SITES = [
  'github.com',
  'docs.google.com',
];

// --- Preset Blocked Apps ---
export const DEFAULT_BLOCKED_APPS = [
  'steam.exe',
  'discord.exe',
];

// --- Preset Productive Apps ---
export const DEFAULT_PRODUCTIVE_APPS = [
  'Code.exe',
  'chrome.exe',
];
