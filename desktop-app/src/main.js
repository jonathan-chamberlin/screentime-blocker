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

import { ensureCA } from './proxy/ca-manager.js';
import { startProxy } from './proxy/proxy-server.js';
import { createSessionEngine } from './session/session-engine.js';
import { startAppMonitor } from './monitor/app-monitor.js';
import { killApp } from './monitor/app-killer.js';
import { startWebServer } from './web/server.js';
import { getAll } from './storage.js';
import { PROXY_PORT, WEB_PORT, BLOCKING_MODES } from './shared/constants.js';

/**
 * Build the initial blocking state from storage and session engine.
 * Pure function: takes config + session status, returns BlockingState.
 *
 * @param {Object} config - Storage data with breakLists, nuclearBlockData
 * @param {Object} sessionStatus - Current session state
 * @returns {import('./proxy/rule-engine.js').BlockingState}
 */
function buildBlockingState(config, sessionStatus) {
  const defaultList = config.breakLists?.[0] || {
    mode: BLOCKING_MODES.MANUAL,
    sites: [],
    allowedPaths: [],
  };

  return {
    sessionActive: sessionStatus.sessionActive,
    rewardActive: sessionStatus.rewardActive || false,
    blockedSites: defaultList.sites || [],
    allowedPaths: defaultList.allowedPaths || [],
    nuclearSites: config.nuclearBlockData?.sites || [],
    blockingMode: defaultList.mode || BLOCKING_MODES.MANUAL,
  };
}

/**
 * Start all components and wire them together.
 * @returns {Promise<{ shutdown: () => Promise<void> }>}
 */
export async function startApp() {
  console.log('[main] Starting Brainrot Blocker...');

  // Load config from storage
  const config = await getAll();

  // 1. Ensure CA certificate exists
  await ensureCA();
  console.log('[main] CA certificate ready');

  // 2. Create session engine
  const engine = createSessionEngine({
    productiveSites: config.productiveSites || [],
    productiveApps: config.productiveApps || [],
    blockedSites: config.breakLists?.[0]?.sites || [],
    productiveMode: config.productiveMode,
    workMinutes: config.workMinutes,
    rewardMinutes: config.rewardMinutes,
    strictMode: config.strictMode,
    blockTaskManager: config.blockTaskManager,
  });

  // Mutable blocking state — updated when session changes
  let currentBlockingState = buildBlockingState(config, engine.getStatus());

  // Wire: session engine updates blocking state for proxy
  engine.on('blockingStateChanged', () => {
    currentBlockingState = buildBlockingState(config, engine.getStatus());
  });

  // Wire: session engine handles blocked app killing
  engine.on('stateChanged', (state) => {
    if (state.sessionActive && state.blockTaskManager && state.currentApp === 'Taskmgr') {
      killApp('Taskmgr');
    }
  });

  // 3. Start HTTPS proxy
  const proxyHandle = await startProxy({
    port: PROXY_PORT,
    getBlockingState: () => currentBlockingState,
    onSiteVisit: (visit) => engine.reportSiteVisit(visit),
  });
  console.log('[main] HTTPS proxy ready');

  // 4. Start web server
  const webHandle = await startWebServer({
    port: WEB_PORT,
    sessionEngine: engine,
  });
  console.log('[main] Web server ready');

  // 5. Start app monitor
  const appMonitor = startAppMonitor();
  appMonitor.emitter.on('app-changed', (focus) => {
    engine.reportAppFocus(focus);

    // Kill blocked apps during session
    if (engine.getStatus().sessionActive) {
      const blockedApps = config.blockedApps || [];
      const isBlocked = blockedApps.some(
        (app) => app.toLowerCase().replace('.exe', '') ===
          focus.processName.toLowerCase()
      );
      if (isBlocked) {
        killApp(focus.processName);
      }
    }
  });
  console.log('[main] App monitor ready');

  console.log(`[main] Brainrot Blocker running — Dashboard: http://localhost:${WEB_PORT}`);

  // Graceful shutdown
  async function shutdown() {
    console.log('[main] Shutting down...');
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

  return { shutdown };
}

// Auto-start when run directly
const isDirectRun = process.argv[1]?.endsWith('main.js');
if (isDirectRun) {
  startApp().catch((err) => {
    console.error('[main] Failed to start:', err);
    process.exit(1);
  });
}
