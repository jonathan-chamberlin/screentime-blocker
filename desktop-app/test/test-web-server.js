/**
 * Tests for src/web/server.js — local web server API and static files.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startWebServer } from '../src/web/server.js';
import { createSessionEngine } from '../src/session/session-engine.js';
import WebSocket from 'ws';

const TEST_PORT = 13456;
let serverHandle = null;
let engine = null;

/** Helper: wait for ms. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  engine = createSessionEngine({
    productiveSites: ['github.com', 'docs.google.com'],
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
});

describe('web-server: static files', () => {
  it('GET / → 200, contains "Lock In"', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Lock In');
  });

  it('GET /blocked?domain=youtube.com → 200, contains "youtube.com"', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/blocked.html?domain=youtube.com`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('BLOCKED');
  });
});

describe('web-server: API routes', () => {
  it('POST /api/session/start → 200, sessionActive: true', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessionActive).toBe(true);
    expect(data.sessionId).toBeTruthy();
  });

  it('GET /api/session/status → returns correct SessionState shape', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/session/status`);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toHaveProperty('sessionActive');
    expect(data).toHaveProperty('workTimerMs');
    expect(data).toHaveProperty('productiveMs');
    expect(data).toHaveProperty('currentSite');
    expect(data).toHaveProperty('currentApp');
    expect(data).toHaveProperty('isOnProductiveSite');
    expect(data).toHaveProperty('isOnProductiveApp');
  });

  it('POST /api/session/end → 200, sessionActive: false', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/session/end`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessionActive).toBe(false);
  });
});

describe('web-server: WebSocket', () => {
  it('receives tick messages with SessionState shape', async () => {
    // Start a session so ticks have data
    await fetch(`http://localhost:${TEST_PORT}/api/session/start`, { method: 'POST' });

    const messages = [];
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise((resolve) => {
      ws.on('open', resolve);
    });

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    // Wait for a few ticks
    await wait(2500);
    ws.close();

    // Clean up session
    await fetch(`http://localhost:${TEST_PORT}/api/session/end`, { method: 'POST' });

    // Should have received tick messages
    const ticks = messages.filter((m) => m.type === 'tick');
    expect(ticks.length).toBeGreaterThan(0);

    const tick = ticks[0];
    expect(tick.data).toHaveProperty('sessionActive');
    expect(tick.data).toHaveProperty('workTimerMs');
    expect(tick.data).toHaveProperty('productiveMs');
  });
});
