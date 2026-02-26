/**
 * Main entry point — wires all components together and starts the app.
 *
 * Component wiring (thin procedure layer):
 *   Proxy ──reportSiteVisit──▶ Session Engine
 *   App Monitor ──reportAppFocus──▶ Session Engine
 *   Session Engine ──stateChanged──▶ WebSocket broadcast (via web server)
 *   Session Engine ──blockingStateChanged──▶ Proxy (updates rule engine state)
 *   Web UI ──fetch(/api/*)──▶ Web Server ──▶ Session Engine
 */

import { ensureCA, isCAInstalled, installCA } from './proxy/ca-manager.js';
import { startProxy } from './proxy/proxy-server.js';
import {
  enableSystemProxy, disableSystemProxy,
  getProxySettings, saveProxyBackup, restoreProxyBackup,
} from './proxy/system-proxy.js';
import { createSessionEngine } from './session/session-engine.js';
import { startAppMonitor } from './monitor/app-monitor.js';
import { killApp } from './monitor/app-killer.js';
import { startWebServer } from './web/server.js';
import { getAll } from './storage.js';
import { PROXY_PORT, WEB_PORT } from './shared/constants.js';
import { getBlockedApps, createListContext } from './shared/list-utils.js';
import { computeNuclearStage, collectNuclearExceptions, getNuclearSiteDomains } from './shared/nuclear-utils.js';
import { processMatches } from './shared/domain-utils.js';

// Module-level flag: only restore proxy on shutdown if THIS process successfully enabled it.
// Prevents a failed second launch from disabling the proxy for an already-running instance.
let proxyOwned = false;

/**
 * Build the blocking state from storage config and session engine status.
 * Derives flat arrays from the active break list and computes nuclear stages.
 *
 * @param {Object} config - Storage data with lists, activeListId, nuclearBlockData
 * @param {Object} sessionStatus - Current session state
 * @returns {import('./proxy/rule-engine.js').BlockingState}
 */
function buildBlockingState(config, sessionStatus) {
  const nuclearRawSites = config.nuclearBlockData?.sites || [];
  const listCtx = createListContext(config.lists, config.activeListId);
  return {
    sessionActive: sessionStatus.sessionActive,
    rewardActive: sessionStatus.rewardActive || false,
    blockedSites: listCtx.blockedSites,
    allowedPaths: listCtx.allowedPaths,
    nuclearSites: nuclearRawSites.map(site => ({
      ...site,
      domains: getNuclearSiteDomains(site),
      stage: computeNuclearStage(site),
    })),
    nuclearExceptions: collectNuclearExceptions(nuclearRawSites),
    blockingMode: listCtx.blockingMode,
  };
}

/**
 * Start all components and wire them together.
 * @returns {Promise<{ shutdown: () => Promise<void> }>}
 */
export async function startApp() {
  console.log('[main] Starting Brainrot Blocker...');

  // Load config from storage (mutable — refreshed on settings changes)
  let config = await getAll();

  // 1. Ensure CA certificate exists and is trusted
  await ensureCA();
  console.log('[main] CA certificate ready');

  try {
    const caInstalled = await isCAInstalled();
    if (!caInstalled) {
      console.log('[main] Installing CA certificate to Windows trust store (may trigger UAC)...');
      await installCA();
      console.log('[main] CA certificate installed to trust store');
    }
  } catch (err) {
    console.warn('[main] Could not install CA to trust store:', err.message);
    console.warn('[main] Browsers may show certificate warnings. Run as admin to install.');
  }

  // 2. Create session engine — derive flat arrays from active list
  const listCtx = createListContext(config.lists, config.activeListId);
  const engine = createSessionEngine({
    productiveSites: listCtx.productiveSites,
    productiveApps: listCtx.productiveApps,
    blockedSites: listCtx.blockedSites,
    productiveMode: listCtx.productiveMode,
    workMinutes: config.workMinutes,
    rewardMinutes: config.rewardMinutes,
    strictMode: config.strictMode,
    blockTaskManager: config.blockTaskManager,
  });

  // Mutable blocking state — updated when session or settings change
  let currentBlockingState = buildBlockingState(config, engine.getStatus());

  // Wire: session engine updates blocking state for proxy
  engine.on('blockingStateChanged', () => {
    currentBlockingState = buildBlockingState(config, engine.getStatus());
    console.log('[main] blockingStateChanged — sessionActive=%s, rewardActive=%s, blockedSites=%j, mode=%s',
      currentBlockingState.sessionActive,
      currentBlockingState.rewardActive,
      currentBlockingState.blockedSites,
      currentBlockingState.blockingMode);
  });

  // Wire: break expired — kill all blocked apps when break ends
  engine.on('breakExpired', () => {
    const blockedAppsList = getBlockedApps(config.lists, config.activeListId);
    for (const app of blockedAppsList) {
      killApp(app);
    }
  });

  // Wire: session engine handles blocked app killing
  engine.on('stateChanged', (state) => {
    if (state.sessionActive && state.blockTaskManager && state.currentApp === 'Taskmgr') {
      killApp('Taskmgr');
    }
  });

  // Callback for when settings change via API — refreshes config and blocking state
  function onSettingsChanged(mergedData) {
    config = mergedData;
    currentBlockingState = buildBlockingState(config, engine.getStatus());
  }

  // 3. Start HTTPS proxy
  const proxyHandle = await startProxy({
    port: PROXY_PORT,
    getBlockingState: () => currentBlockingState,
    onSiteVisit: (visit) => engine.reportSiteVisit(visit),
  });
  console.log('[main] HTTPS proxy ready');

  // 4. Enable system proxy so browser traffic routes through our MITM proxy
  //    First, recover from any previous crash (backup file = unclean shutdown)
  await restoreProxyBackup();
  //    Save current settings, then enable ours
  const originalProxy = await getProxySettings();
  await saveProxyBackup(originalProxy);
  await enableSystemProxy(PROXY_PORT);
  proxyOwned = true; // Track that we own the proxy — only restore on OUR shutdown
  console.log('[main] System proxy enabled (localhost:' + PROXY_PORT + ')');

  // 5. Start web server
  const webHandle = await startWebServer({
    port: WEB_PORT,
    sessionEngine: engine,
    onSettingsChanged,
    getBlockingState: () => currentBlockingState,
  });
  console.log('[main] Web server ready');

  // 6. Start app monitor
  const appMonitor = startAppMonitor();
  appMonitor.emitter.on('app-changed', (focus) => {
    engine.reportAppFocus(focus);

    // Kill blocked apps during session (but not during break)
    const status = engine.getStatus();
    if (status.sessionActive && !status.rewardActive) {
      const blockedAppsList = getBlockedApps(config.lists, config.activeListId);
      const isBlocked = blockedAppsList.some(
        (app) => processMatches(focus.processName, app)
      );
      if (isBlocked) {
        killApp(focus.processName);
      }
    }
  });
  console.log('[main] App monitor ready');

  console.log(`[main] Brainrot Blocker running — Dashboard: http://localhost:${WEB_PORT}`);

  // Graceful shutdown — restore proxy settings before stopping
  async function shutdown() {
    console.log('[main] Shutting down...');
    try {
      await restoreProxyBackup();
      console.log('[main] System proxy restored');
    } catch (err) {
      console.error('[main] Failed to restore proxy settings:', err.message);
      try { await disableSystemProxy(); } catch { /* last resort */ }
    }
    appMonitor.stop();
    engine.destroy();
    await proxyHandle.stop();
    await webHandle.stop();
    console.log('[main] Shutdown complete');
  }

  // Handle process signals
  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });

  // Crash safety — try to restore proxy on unexpected errors (only if we own it)
  process.on('uncaughtException', async (err) => {
    console.error('[main] Uncaught exception:', err);
    if (proxyOwned) { try { await restoreProxyBackup(); } catch { /* best effort */ } }
    process.exit(1);
  });
  process.on('unhandledRejection', async (err) => {
    console.error('[main] Unhandled rejection:', err);
    if (proxyOwned) { try { await restoreProxyBackup(); } catch { /* best effort */ } }
    process.exit(1);
  });

  return { shutdown };
}

// Auto-start when run directly
const isDirectRun = process.argv[1]?.endsWith('main.js');
if (isDirectRun) {
  startApp().catch(async (err) => {
    console.error('[main] Failed to start:', err);
    // Only restore proxy if we successfully enabled it — a failed second launch
    // must not disable the proxy for an already-running instance
    if (proxyOwned) { try { await restoreProxyBackup(); } catch { /* best effort */ } }
    process.exit(1);
  });
}
