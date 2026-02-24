/**
 * Session Engine — manages work sessions, tracks productive time,
 * and coordinates timer logic.
 *
 * Work timer: always increments while session is active (regardless of site/app).
 * Productive timer: only increments when the user is on a productive site OR app.
 *
 * The engine receives site visit and app focus reports from the proxy and
 * app monitor respectively, and uses them to determine productive state.
 *
 * Ported from: extension/session.js + extension/session-state.js
 * (chrome.alarms replaced with setInterval, chrome.storage replaced with events)
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { extractDomain } from '../proxy/rule-engine.js';

/**
 * @typedef {Object} SessionState
 * @property {boolean} sessionActive
 * @property {string|null} sessionId
 * @property {number} workTimerMs - total ms since session start
 * @property {number} productiveMs - ms on productive sites/apps only
 * @property {boolean} rewardActive
 * @property {number} rewardGrantCount
 * @property {number} rewardTotalMs
 * @property {number} rewardBurnedMs
 * @property {number} unusedRewardMs
 * @property {string|null} currentSite
 * @property {string|null} currentApp
 * @property {boolean} isOnProductiveSite
 * @property {boolean} isOnProductiveApp
 * @property {boolean} isOnBlockedSite
 * @property {boolean} isIdle
 * @property {number} blockedAttempts
 * @property {number} workMinutes
 * @property {number} rewardMinutes
 * @property {boolean} strictMode
 * @property {boolean} blockTaskManager
 */

/**
 * @typedef {Object} SessionEngineConfig
 * @property {string[]} productiveSites
 * @property {string[]} productiveApps - process names (with .exe)
 * @property {string[]} blockedSites
 * @property {string} productiveMode - 'all-except-blocked' | 'whitelist'
 * @property {number} workMinutes
 * @property {number} rewardMinutes
 * @property {boolean} strictMode
 * @property {boolean} blockTaskManager
 */

const TICK_INTERVAL_MS = 100; // Internal tick for timer precision

/**
 * Create a new session engine instance.
 *
 * @param {SessionEngineConfig} config
 * @returns {SessionEngineAPI}
 *
 * Events emitted on returned emitter:
 * - 'stateChanged' (SessionState) — subscribers: WebSocket broadcast (via main.js)
 * - 'blockingStateChanged' — subscribers: proxy rule engine (via main.js)
 */
export function createSessionEngine(config) {
  const emitter = new EventEmitter();

  let sessionActive = false;
  let sessionId = null;
  let sessionStartTime = 0;
  let workTimerMs = 0;
  let productiveMs = 0;
  let lastTickTime = 0;

  let currentSite = null;
  let currentApp = null;
  let currentWindowTitle = null;
  let isOnProductiveSite = false;
  let isOnProductiveApp = false;
  let isOnBlockedSite = false;
  let isIdle = false;
  let blockedAttempts = 0;

  // Config values (can be updated via updateConfig)
  let { productiveSites, productiveApps, blockedSites, productiveMode,
    workMinutes, rewardMinutes, strictMode, blockTaskManager } = config;

  let tickInterval = null;

  /**
   * Check if currently productive based on site AND app state.
   * In whitelist mode: productive only if on a listed site or app.
   * In all-except-blocked mode: productive unless on a blocked site.
   */
  function isCurrentlyProductive() {
    if (productiveMode === 'whitelist') {
      return isOnProductiveSite || isOnProductiveApp;
    }
    // all-except-blocked: productive unless on a blocked site
    return !isOnBlockedSite;
  }

  /**
   * Internal tick — updates work and productive timers.
   * Runs every TICK_INTERVAL_MS for precision.
   */
  function tick() {
    if (!sessionActive || isIdle) return;

    const now = Date.now();
    const elapsed = now - lastTickTime;
    lastTickTime = now;

    workTimerMs += elapsed;

    if (isCurrentlyProductive()) {
      productiveMs += elapsed;
    }
  }

  /** Start the internal tick timer. */
  function startTicking() {
    lastTickTime = Date.now();
    tickInterval = setInterval(tick, TICK_INTERVAL_MS);
  }

  /** Stop the internal tick timer. */
  function stopTicking() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  /** Build the current session state snapshot. */
  function getStatus() {
    return {
      sessionActive,
      sessionId,
      workTimerMs,
      productiveMs,
      rewardActive: false, // Tracer bullet: rewards not yet implemented
      rewardGrantCount: 0,
      rewardTotalMs: 0,
      rewardBurnedMs: 0,
      unusedRewardMs: 0,
      currentSite,
      currentApp,
      currentWindowTitle,
      isOnProductiveSite,
      isOnProductiveApp,
      isOnBlockedSite,
      isIdle,
      blockedAttempts,
      workMinutes,
      rewardMinutes,
      strictMode,
      blockTaskManager,
    };
  }

  /**
   * Start a new work session.
   * @param {number} [customWorkMinutes]
   * @returns {SessionState}
   */
  function startSession(customWorkMinutes) {
    if (sessionActive) return getStatus();

    sessionActive = true;
    sessionId = randomUUID();
    sessionStartTime = Date.now();
    workTimerMs = 0;
    productiveMs = 0;
    blockedAttempts = 0;
    isIdle = false;

    if (customWorkMinutes !== undefined) {
      workMinutes = customWorkMinutes;
    }

    startTicking();
    emitter.emit('stateChanged', getStatus());
    emitter.emit('blockingStateChanged');
    return getStatus();
  }

  /**
   * End the current session.
   * @returns {SessionState}
   */
  function endSession() {
    if (!sessionActive) return getStatus();

    // Flush final tick
    tick();
    stopTicking();

    sessionActive = false;
    const finalState = getStatus();

    sessionId = null;
    emitter.emit('stateChanged', finalState);
    emitter.emit('blockingStateChanged');
    return finalState;
  }

  /**
   * Report a site visit from the proxy.
   * Updates current site and productive state.
   *
   * @param {{ url: string, domain: string, path: string, timestamp: number }} siteVisit
   */
  function reportSiteVisit(siteVisit) {
    const domain = siteVisit.domain;
    currentSite = domain;

    // Check if this site is productive
    isOnProductiveSite = isProductiveSite(domain);
    // Check if this site is blocked
    isOnBlockedSite = blockedSites.some(
      (s) => domain === s.replace(/^www\./, '').toLowerCase()
    );

    if (isOnBlockedSite && sessionActive) {
      blockedAttempts++;
    }

    emitter.emit('stateChanged', getStatus());
  }

  /**
   * Report app focus change from the app monitor.
   * Updates current app and productive state.
   *
   * @param {{ processName: string, windowTitle?: string, timestamp: number }} appFocus
   */
  function reportAppFocus(appFocus) {
    currentApp = appFocus.processName;
    currentWindowTitle = appFocus.windowTitle || null;

    // Check if this app is productive
    isOnProductiveApp = productiveApps.some(
      (app) => app.toLowerCase().replace('.exe', '') ===
        appFocus.processName.toLowerCase().replace('.exe', '')
    );

    emitter.emit('stateChanged', getStatus());
  }

  /**
   * Set idle state (from idle detector).
   * @param {boolean} idle
   */
  function setIdle(idle) {
    if (isIdle === idle) return;
    isIdle = idle;

    if (!idle && sessionActive) {
      // Resuming from idle — reset lastTickTime to avoid counting idle time
      lastTickTime = Date.now();
    }

    emitter.emit('stateChanged', getStatus());
  }

  /**
   * Check if a domain is a productive site.
   * @param {string} domain
   * @returns {boolean}
   */
  function isProductiveSite(domain) {
    const normalized = domain.replace(/^www\./, '').toLowerCase();
    return productiveSites.some(
      (s) => normalized === s.replace(/^www\./, '').toLowerCase() ||
        normalized.endsWith('.' + s.replace(/^www\./, '').toLowerCase())
    );
  }

  /**
   * Update engine configuration (e.g., when settings change).
   * @param {Partial<SessionEngineConfig>} updates
   */
  function updateConfig(updates) {
    if (updates.productiveSites) productiveSites = updates.productiveSites;
    if (updates.productiveApps) productiveApps = updates.productiveApps;
    if (updates.blockedSites) blockedSites = updates.blockedSites;
    if (updates.productiveMode) productiveMode = updates.productiveMode;
    if (updates.workMinutes !== undefined) workMinutes = updates.workMinutes;
    if (updates.rewardMinutes !== undefined) rewardMinutes = updates.rewardMinutes;
    if (updates.strictMode !== undefined) strictMode = updates.strictMode;
    if (updates.blockTaskManager !== undefined) blockTaskManager = updates.blockTaskManager;
  }

  /** Clean up timers. */
  function destroy() {
    stopTicking();
    emitter.removeAllListeners();
  }

  return {
    startSession,
    endSession,
    getStatus,
    reportSiteVisit,
    reportAppFocus,
    setIdle,
    updateConfig,
    destroy,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
  };
}
