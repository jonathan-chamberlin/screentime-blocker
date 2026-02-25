/**
 * REST API routes for the local web server.
 * Bridges HTTP requests from the UI to the session engine and storage.
 *
 * Replaces: chrome.runtime.onMessage handlers in extension/background.js
 */

import { Router } from 'express';
import { getAll, set } from '../../storage.js';
import {
  getBlockedSites, getAllowedPaths,
  getProductiveMode, getProductiveSites, getProductiveApps,
} from '../../shared/list-utils.js';
import { computeNuclearStage, getNuclearSiteDomains } from '../../shared/nuclear-utils.js';

/**
 * @typedef {Object} ApiRouterDeps
 * @property {import('../../session/session-engine.js').SessionEngineAPI} sessionEngine
 * @property {((eventType: string, data: Object) => void)} [broadcast] - WebSocket broadcast fn
 * @property {(mergedData: Object) => void} [onSettingsChanged] - Refreshes proxy blocking state
 */

/**
 * Create API router wired to a session engine and storage.
 *
 * @param {ApiRouterDeps} deps
 * @returns {Router}
 */
export function createApiRouter({ sessionEngine, broadcast, onSettingsChanged }) {
  const router = Router();

  /**
   * Helper: save updated data, refresh blocking state, broadcast to clients.
   * @param {Object} merged - The full merged storage data after set()
   */
  function notifySettingsChanged(merged) {
    applySettingsToEngine(sessionEngine, merged);
    if (onSettingsChanged) onSettingsChanged(merged);
    if (broadcast) broadcast('settings-updated', extractSettings(merged));
  }

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
      notifySettingsChanged(merged);

      res.json(extractSettings(merged));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Nuclear Block API ---

  /** GET /api/nuclear/site?domain=X — Get nuclear site data for a domain (used by blocked pages). */
  router.get('/nuclear/site', async (req, res) => {
    try {
      const domain = (req.query.domain || '').toLowerCase().replace(/^www\./, '');
      if (!domain) return res.status(400).json({ error: 'domain query param required' });

      const data = await getAll();
      const sites = data.nuclearBlockData?.sites || [];
      const site = sites.find(s => {
        const domains = getNuclearSiteDomains(s);
        return domains.some(d => d.replace(/^www\./, '').toLowerCase() === domain);
      });

      if (!site) return res.status(404).json({ error: 'Site not found in nuclear block list' });

      res.json({ ...site, stage: computeNuclearStage(site) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/nuclear/click-unblock — Start cooldown2 for a nuclear site. */
  router.post('/nuclear/click-unblock', async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const data = await getAll();
      const sites = data.nuclearBlockData?.sites || [];
      const site = sites.find(s => s.id === id);
      if (!site) return res.status(404).json({ error: 'Site not found' });

      site.unblockClickedAt = Date.now();
      const merged = await set({ nuclearBlockData: { ...data.nuclearBlockData, sites } });
      notifySettingsChanged(merged);

      res.json({ ok: true, stage: computeNuclearStage(site) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/nuclear/confirm-unblock — Remove a nuclear site (final unblock). */
  router.post('/nuclear/confirm-unblock', async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const data = await getAll();
      const sites = (data.nuclearBlockData?.sites || []).filter(s => s.id !== id);
      const merged = await set({ nuclearBlockData: { ...data.nuclearBlockData, sites } });
      notifySettingsChanged(merged);

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/nuclear/block-again — Re-block a nuclear site with new cooldown. */
  router.post('/nuclear/block-again', async (req, res) => {
    try {
      const { id, cooldown1Ms } = req.body;
      if (!id || !cooldown1Ms) return res.status(400).json({ error: 'id and cooldown1Ms required' });

      const data = await getAll();
      const sites = data.nuclearBlockData?.sites || [];
      const site = sites.find(s => s.id === id);
      if (!site) return res.status(404).json({ error: 'Site not found' });

      site.addedAt = Date.now();
      site.cooldown1Ms = cooldown1Ms;
      site.unblockClickedAt = null;

      const merged = await set({ nuclearBlockData: { ...data.nuclearBlockData, sites } });
      notifySettingsChanged(merged);

      res.json({ ok: true, stage: computeNuclearStage(site) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/nuclear/add — Add a new nuclear site (used by choice page re-block). */
  router.post('/nuclear/add', async (req, res) => {
    try {
      const { entry } = req.body;
      if (!entry) return res.status(400).json({ error: 'entry required' });

      const data = await getAll();
      const sites = data.nuclearBlockData?.sites || [];
      sites.push(entry);
      const merged = await set({ nuclearBlockData: { ...data.nuclearBlockData, sites } });
      notifySettingsChanged(merged);

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** GET /api/usage — Get session history, daily summaries, and streak data for analytics. */
  router.get('/usage', async (req, res) => {
    try {
      const data = await getAll();
      res.json({
        history: data.sessionHistory || [],
        summaries: data.dailySummaries || {},
        streakData: data.streakData || { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      });
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
    lists: data.lists,
    activeListId: data.activeListId,
    nuclearBlockData: data.nuclearBlockData,
  };
}

/**
 * Apply changed settings to the session engine's live config.
 * Derives flat arrays from the active lists so the engine doesn't
 * need to know about the list structure.
 *
 * @param {import('../../session/session-engine.js').SessionEngineAPI} engine
 * @param {import('../../storage.js').StorageData} data
 */
function applySettingsToEngine(engine, data) {
  engine.updateConfig({
    productiveSites: getProductiveSites(data.lists, data.activeListId),
    productiveApps: getProductiveApps(data.lists, data.activeListId),
    blockedSites: getBlockedSites(data.lists, data.activeListId),
    productiveMode: getProductiveMode(data.lists, data.activeListId),
    workMinutes: data.workMinutes,
    rewardMinutes: data.rewardMinutes,
    strictMode: data.strictMode,
    blockTaskManager: data.blockTaskManager,
  });
}
