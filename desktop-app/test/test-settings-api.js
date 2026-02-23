/**
 * Tests for settings API endpoints (GET/PUT /api/settings).
 * Verifies settings retrieval, partial updates, persistence,
 * and live engine config propagation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startWebServer } from '../src/web/server.js';
import { createSessionEngine } from '../src/session/session-engine.js';
import { reset } from '../src/storage.js';

const TEST_PORT = 14567;
let serverHandle = null;
let engine = null;

beforeAll(async () => {
  // Reset storage to known defaults before tests
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
  // Restore defaults
  await reset();
});

describe('settings API: GET /api/settings', () => {
  it('returns full settings shape', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toHaveProperty('workMinutes');
    expect(data).toHaveProperty('rewardMinutes');
    expect(data).toHaveProperty('strictMode');
    expect(data).toHaveProperty('blockTaskManager');
    expect(data).toHaveProperty('idleTimeoutSeconds');
    expect(data).toHaveProperty('productiveMode');
    expect(data).toHaveProperty('breakLists');
    expect(data).toHaveProperty('productiveSites');
    expect(data).toHaveProperty('productiveApps');
    expect(data).toHaveProperty('blockedApps');
    expect(data).toHaveProperty('nuclearBlockData');
  });

  it('does not expose session history or internal data', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`);
    const data = await res.json();

    expect(data).not.toHaveProperty('sessionHistory');
    expect(data).not.toHaveProperty('dailySummaries');
    expect(data).not.toHaveProperty('streakData');
    expect(data).not.toHaveProperty('focusState');
  });
});

describe('settings API: PUT /api/settings', () => {
  it('partial update merges correctly', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workMinutes: 25 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workMinutes).toBe(25);
    // Other fields should remain at defaults
    expect(data.rewardMinutes).toBe(10);
  });

  it('persists changes across reads', async () => {
    await fetch(`http://localhost:${TEST_PORT}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardMinutes: 15 }),
    });

    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`);
    const data = await res.json();
    expect(data.rewardMinutes).toBe(15);
  });

  it('updates boolean toggles', async () => {
    await fetch(`http://localhost:${TEST_PORT}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockTaskManager: true }),
    });

    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`);
    const data = await res.json();
    expect(data.blockTaskManager).toBe(true);
  });

  it('updates idle timeout', async () => {
    await fetch(`http://localhost:${TEST_PORT}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idleTimeoutSeconds: 60 }),
    });

    const res = await fetch(`http://localhost:${TEST_PORT}/api/settings`);
    const data = await res.json();
    expect(data.idleTimeoutSeconds).toBe(60);
  });

  it('propagates changes to session engine config', async () => {
    await fetch(`http://localhost:${TEST_PORT}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strictMode: true }),
    });

    // Engine should now have strictMode: true
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

  it('settings page loads', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/settings.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Settings');
    expect(text).toContain('Work Duration');
    expect(text).toContain('Idle Timeout');
    expect(text).toContain('Nuclear Block');
  });
});
