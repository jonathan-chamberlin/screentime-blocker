/**
 * Tests for settings API endpoints (GET/PUT /api/settings).
 * Verifies settings retrieval, partial updates, persistence,
 * live engine config propagation, and unified list support.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startWebServer } from '../src/web/server.js';
import { createSessionEngine } from '../src/session/session-engine.js';
import { reset } from '../src/storage.js';

const TEST_PORT = 14567;
let serverHandle = null;
let engine = null;

/** Helper to PUT settings */
async function putSettings(data) {
  return fetch(`http://localhost:${TEST_PORT}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/** Helper to GET settings */
async function getSettings() {
  const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`);
  return res.json();
}

beforeAll(async () => {
  await reset();

  engine = createSessionEngine({
    productiveSites: ['github.com'],
    productiveApps: ['Code.exe'],
    blockedSites: ['youtube.com', 'reddit.com'],
    productiveMode: 'whitelist',
    workMinutes: 50,
    rewardMinutes: 10,
    strictMode: false,
    blockTaskManager: false,
  });

  serverHandle = await startWebServer({
    port: TEST_PORT,
    sessionEngine: engine,
  });
});

afterAll(async () => {
  engine.destroy();
  if (serverHandle) await serverHandle.stop();
  await reset();
});

describe('settings API: GET /api/settings', () => {
  it('returns full settings shape including unified list fields', async () => {
    const data = await getSettings();

    expect(data).toHaveProperty('workMinutes');
    expect(data).toHaveProperty('rewardMinutes');
    expect(data).toHaveProperty('strictMode');
    expect(data).toHaveProperty('blockTaskManager');
    expect(data).toHaveProperty('idleTimeoutSeconds');
    expect(data).toHaveProperty('lists');
    expect(data).toHaveProperty('activeListId');
    expect(data).toHaveProperty('nuclearBlockData');
  });

  it('does not expose session history or internal data', async () => {
    const data = await getSettings();
    expect(data).not.toHaveProperty('sessionHistory');
    expect(data).not.toHaveProperty('dailySummaries');
    expect(data).not.toHaveProperty('streakData');
  });

  it('returns default list with unified shape', async () => {
    const data = await getSettings();
    expect(data.lists.length).toBeGreaterThan(0);
    const list = data.lists[0];
    expect(list).toHaveProperty('blocked');
    expect(list).toHaveProperty('productive');
    expect(list.blocked).toHaveProperty('sites');
    expect(list.blocked).toHaveProperty('apps');
    expect(list.blocked).toHaveProperty('allowedPaths');
    expect(list.productive).toHaveProperty('mode');
    expect(list.productive).toHaveProperty('sites');
    expect(list.productive).toHaveProperty('apps');
  });
});

describe('settings API: PUT /api/settings', () => {
  it('partial update merges correctly', async () => {
    const res = await putSettings({ workMinutes: 25 });
    const data = await res.json();
    expect(data.workMinutes).toBe(25);
    expect(data.rewardMinutes).toBe(10);
  });

  it('persists changes across reads', async () => {
    await putSettings({ rewardMinutes: 15 });
    const data = await getSettings();
    expect(data.rewardMinutes).toBe(15);
  });

  it('updates boolean toggles', async () => {
    await putSettings({ blockTaskManager: true });
    const data = await getSettings();
    expect(data.blockTaskManager).toBe(true);
  });

  it('updates idle timeout', async () => {
    await putSettings({ idleTimeoutSeconds: 60 });
    const data = await getSettings();
    expect(data.idleTimeoutSeconds).toBe(60);
  });

  it('propagates changes to session engine config', async () => {
    await putSettings({ strictMode: true });
    const status = engine.getStatus();
    expect(status.strictMode).toBe(true);
  });

  it('rejects invalid body', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '"not an object"',
    });
    expect(res.status).toBe(400);
  });

  it('settings page loads with list CRUD sections', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/settings.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Settings');
    // "What to Block" and "What Counts as Productive" are now rendered
    // dynamically by settings.js — verify JS/CSS are linked instead
    expect(text).toContain('settings.js');
    expect(text).toContain('settings.css');
    expect(text).toContain('New List');
  });
});

describe('settings API: unified list support', () => {
  it('switching active list persists', async () => {
    // Add a second list
    const data = await getSettings();
    const newList = {
      id: 'test-list-2', name: 'Gaming', mode: 'manual',
      blocked: { sites: ['twitch.tv'], apps: [], allowedPaths: [] },
      productive: { mode: 'all-except-blocked', sites: [], apps: [] },
      schedule: null,
    };
    data.lists.push(newList);
    await putSettings({ lists: data.lists });

    // Switch active list
    await putSettings({ activeListId: 'test-list-2' });
    const updated = await getSettings();
    expect(updated.activeListId).toBe('test-list-2');
  });

  it('switching active list updates engine blocked sites', async () => {
    // Engine should now be using twitch.tv from 'test-list-2'
    engine.reportSiteVisit({
      url: 'https://twitch.tv/', domain: 'twitch.tv', path: '/', timestamp: Date.now(),
    });
    const status = engine.getStatus();
    expect(status.isOnBlockedSite).toBe(true);
  });

  it('creating a new list persists', async () => {
    const before = await getSettings();
    const countBefore = before.lists.length;

    before.lists.push({
      id: 'test-list-3', name: 'New List', mode: 'off',
      blocked: { sites: [], apps: [], allowedPaths: [] },
      productive: { mode: 'all-except-blocked', sites: [], apps: [] },
      schedule: null,
    });
    await putSettings({ lists: before.lists });

    const after = await getSettings();
    expect(after.lists.length).toBe(countBefore + 1);
    expect(after.lists.find(l => l.id === 'test-list-3')).toBeTruthy();
  });

  it('deleting a list persists', async () => {
    const before = await getSettings();
    const filtered = before.lists.filter(l => l.id !== 'test-list-3');
    await putSettings({ lists: filtered });

    const after = await getSettings();
    expect(after.lists.find(l => l.id === 'test-list-3')).toBeFalsy();
  });

  it('active list ID persists across reads', async () => {
    await putSettings({ activeListId: 'default' });
    const d1 = await getSettings();
    expect(d1.activeListId).toBe('default');

    const d2 = await getSettings();
    expect(d2.activeListId).toBe('default');
  });
});
