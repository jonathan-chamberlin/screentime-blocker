/**
 * Tests for settings API endpoints (GET/PUT /api/settings).
 * Verifies settings retrieval, partial updates, persistence,
 * live engine config propagation, and multi-list support.
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
  it('returns full settings shape including list fields', async () => {
    const data = await getSettings();

    expect(data).toHaveProperty('workMinutes');
    expect(data).toHaveProperty('rewardMinutes');
    expect(data).toHaveProperty('strictMode');
    expect(data).toHaveProperty('blockTaskManager');
    expect(data).toHaveProperty('idleTimeoutSeconds');
    expect(data).toHaveProperty('productiveMode');
    expect(data).toHaveProperty('breakLists');
    expect(data).toHaveProperty('productiveLists');
    expect(data).toHaveProperty('activeBreakListId');
    expect(data).toHaveProperty('activeProductiveListId');
    expect(data).toHaveProperty('blockedApps');
    expect(data).toHaveProperty('nuclearBlockData');
  });

  it('does not expose session history or internal data', async () => {
    const data = await getSettings();
    expect(data).not.toHaveProperty('sessionHistory');
    expect(data).not.toHaveProperty('dailySummaries');
    expect(data).not.toHaveProperty('streakData');
  });

  it('returns default break list with isActive field', async () => {
    const data = await getSettings();
    expect(data.breakLists.length).toBeGreaterThan(0);
    expect(data.breakLists[0]).toHaveProperty('isActive');
    expect(data.breakLists[0]).toHaveProperty('sites');
    expect(data.breakLists[0]).toHaveProperty('allowedPaths');
  });

  it('returns default productive list', async () => {
    const data = await getSettings();
    expect(data.productiveLists.length).toBeGreaterThan(0);
    expect(data.productiveLists[0]).toHaveProperty('sites');
    expect(data.productiveLists[0]).toHaveProperty('apps');
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
    expect(text).toContain('Work Duration');
    expect(text).toContain('What is Distracting');
    expect(text).toContain('What is Productive');
    expect(text).toContain('New Block List');
    expect(text).toContain('New Productive List');
  });
});

describe('settings API: multi-list support', () => {
  it('switching active break list persists', async () => {
    // Add a second break list
    const data = await getSettings();
    const newList = {
      id: 'test-bl-2', name: 'Gaming', isActive: false, mode: 'manual',
      sites: ['twitch.tv'], apps: [], allowedPaths: [], schedule: null,
    };
    data.breakLists.push(newList);
    await putSettings({ breakLists: data.breakLists });

    // Switch active list
    await putSettings({ activeBreakListId: 'test-bl-2' });
    const updated = await getSettings();
    expect(updated.activeBreakListId).toBe('test-bl-2');
  });

  it('switching active break list updates engine blocked sites', async () => {
    // Engine should now be using twitch.tv from 'test-bl-2'
    engine.reportSiteVisit({
      url: 'https://twitch.tv/', domain: 'twitch.tv', path: '/', timestamp: Date.now(),
    });
    const status = engine.getStatus();
    expect(status.isOnBlockedSite).toBe(true);
  });

  it('switching active productive list persists', async () => {
    const data = await getSettings();
    const newList = {
      id: 'test-pl-2', name: 'Study', isActive: false,
      sites: ['coursera.org'], apps: ['Notion.exe'],
    };
    data.productiveLists.push(newList);
    await putSettings({ productiveLists: data.productiveLists });

    await putSettings({ activeProductiveListId: 'test-pl-2' });
    const updated = await getSettings();
    expect(updated.activeProductiveListId).toBe('test-pl-2');
  });

  it('creating a new break list persists', async () => {
    const before = await getSettings();
    const countBefore = before.breakLists.length;

    before.breakLists.push({
      id: 'test-bl-3', name: 'New List', isActive: false, mode: 'off',
      sites: [], apps: [], allowedPaths: [], schedule: null,
    });
    await putSettings({ breakLists: before.breakLists });

    const after = await getSettings();
    expect(after.breakLists.length).toBe(countBefore + 1);
    expect(after.breakLists.find(l => l.id === 'test-bl-3')).toBeTruthy();
  });

  it('deleting a break list persists', async () => {
    const before = await getSettings();
    const filtered = before.breakLists.filter(l => l.id !== 'test-bl-3');
    await putSettings({ breakLists: filtered });

    const after = await getSettings();
    expect(after.breakLists.find(l => l.id === 'test-bl-3')).toBeFalsy();
  });

  it('active list ID persists across reads', async () => {
    await putSettings({ activeBreakListId: 'default' });
    const d1 = await getSettings();
    expect(d1.activeBreakListId).toBe('default');

    // Read again to confirm persistence
    const d2 = await getSettings();
    expect(d2.activeBreakListId).toBe('default');
  });
});
