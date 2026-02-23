/**
 * REST API routes for the local web server.
 * Bridges HTTP requests from the UI to the session engine and storage.
 *
 * Replaces: chrome.runtime.onMessage handlers in extension/background.js
 */

import { Router } from 'express';
import { getAll, set } from '../../storage.js';

/**
 * @typedef {Object} ApiRouterDeps
 * @property {import('../../session/session-engine.js').SessionEngineAPI} sessionEngine
 * @property {((eventType: string, data: Object) => void)} [broadcast] - WebSocket broadcast fn
 */

/**
 * Create API router wired to a session engine and storage.
 *
 * @param {ApiRouterDeps} deps
 * @returns {Router}
 */
export function createApiRouter({ sessionEngine, broadcast }) {
  const router = Router();

  /** POST /api/session/start — Start a work session. */
  router.post('/session/start', (req, res) => {
    const state = sessionEngine.startSession(req.body?.workMinutes);
    res.json(state);
  });

  /** POST /api/session/end — End the current session. */
  router.post('/session/end', (req, res) => {
    const state = sessionEngine.endSession();
    res.json(state);
  });

  /** GET /api/session/status — Get current session state. */
  router.get('/session/status', (req, res) => {
    res.json(sessionEngine.getStatus());
  });

  /** GET /api/settings — Get all settings from storage. */
  router.get('/settings', async (req, res) => {
    try {
      const data = await getAll();
      res.json(extractSettings(data));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/settings — Partial update of settings.
   * Merges provided keys into storage, updates session engine config,
   * and broadcasts the change to connected WebSocket clients.
   */
  router.put('/settings', async (req, res) => {
    try {
      const updates = req.body;
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Request body must be a JSON object' });
      }

      const merged = await set(updates);
      applySettingsToEngine(sessionEngine, merged);

      const settings = extractSettings(merged);
      if (broadcast) {
        broadcast('settings-updated', settings);
      }

      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

/**
 * Extract the settings-relevant subset from full storage data.
 * Keeps the API surface clean — no session history or internal data exposed.
 *
 * @param {import('../../storage.js').StorageData} data
 * @returns {Object}
 */
function extractSettings(data) {
  return {
    workMinutes: data.workMinutes,
    rewardMinutes: data.rewardMinutes,
    strictMode: data.strictMode,
    blockTaskManager: data.blockTaskManager,
    idleTimeoutSeconds: data.idleTimeoutSeconds,
    productiveMode: data.productiveMode,
    breakLists: data.breakLists,
    productiveSites: data.productiveSites,
    productiveApps: data.productiveApps,
    blockedApps: data.blockedApps,
    nuclearBlockData: data.nuclearBlockData,
  };
}

/**
 * Apply changed settings to the session engine's live config.
 * This ensures the engine picks up new productive sites, work minutes, etc.
 * without requiring a restart.
 *
 * @param {import('../../session/session-engine.js').SessionEngineAPI} engine
 * @param {import('../../storage.js').StorageData} data
 */
function applySettingsToEngine(engine, data) {
  engine.updateConfig({
    productiveSites: data.productiveSites,
    productiveApps: data.productiveApps,
    blockedSites: data.breakLists?.[0]?.sites || [],
    productiveMode: data.productiveMode,
    workMinutes: data.workMinutes,
    rewardMinutes: data.rewardMinutes,
    strictMode: data.strictMode,
    blockTaskManager: data.blockTaskManager,
  });
}
