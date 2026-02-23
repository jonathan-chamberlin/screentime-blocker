/**
 * End-to-end integration test — verifies the full pipeline:
 * proxy + session engine + web server + app monitor all wired together.
 *
 * NOTE: This test does NOT set the system proxy (to avoid affecting the
 * test machine). It directly makes HTTP requests through the proxy.
 * Full system proxy E2E is deferred to manual/browser-agent testing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import WebSocket from 'ws';
import { ensureCA } from '../src/proxy/ca-manager.js';
import { startProxy } from '../src/proxy/proxy-server.js';
import { createSessionEngine } from '../src/session/session-engine.js';
import { startWebServer } from '../src/web/server.js';
import { startAppMonitor } from '../src/monitor/app-monitor.js';
import { BLOCKING_MODES } from '../src/shared/constants.js';

const E2E_PROXY_PORT = 28443;
const E2E_WEB_PORT = 23456;

let engine = null;
let proxyHandle = null;
let webHandle = null;
let appMonitor = null;
let currentBlockingState = null;

/** Helper: wait for ms. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pure function: build blocking state from config + session */
function buildBlockingState(sessionStatus) {
  return {
    sessionActive: sessionStatus.sessionActive,
    rewardActive: false,
    blockedSites: ['youtube.com', 'reddit.com', 'instagram.com'],
    allowedPaths: ['youtube.com/veritasium'],
    nuclearSites: [],
    blockingMode: BLOCKING_MODES.MANUAL,
  };
}

/** Make HTTP request through the proxy. */
function proxyRequest(host, path = '/') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port: E2E_PROXY_PORT,
      path: `http://${host}${path}`,
      headers: { Host: host },
    }, (res) => {
      res.resume();
      resolve({ statusCode: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

beforeAll(async () => {
  await ensureCA();

  engine = createSessionEngine({
    productiveSites: ['github.com', 'docs.google.com'],
    productiveApps: ['Code.exe'],
    blockedSites: ['youtube.com', 'reddit.com', 'instagram.com'],
    productiveMode: 'whitelist',
    workMinutes: 50,
    rewardMinutes: 10,
    strictMode: false,
    blockTaskManager: false,
  });

  currentBlockingState = buildBlockingState(engine.getStatus());

  engine.on('blockingStateChanged', () => {
    currentBlockingState = buildBlockingState(engine.getStatus());
  });

  proxyHandle = await startProxy({
    port: E2E_PROXY_PORT,
    getBlockingState: () => currentBlockingState,
    onSiteVisit: (visit) => engine.reportSiteVisit(visit),
  });

  webHandle = await startWebServer({
    port: E2E_WEB_PORT,
    sessionEngine: engine,
  });

  appMonitor = startAppMonitor({ pollMs: 2000 });
  appMonitor.emitter.on('app-changed', (focus) => engine.reportAppFocus(focus));
}, 20000);

afterAll(async () => {
  if (appMonitor) appMonitor.stop();
  if (engine) engine.destroy();
  if (proxyHandle) await proxyHandle.stop();
  if (webHandle) await webHandle.stop();
});

describe('e2e: full pipeline', () => {
  it('dashboard loads via web server', async () => {
    const res = await fetch(`http://localhost:${E2E_WEB_PORT}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Lock In');
    expect(text).toContain('Brainrot Blocker');
  });

  it('start session via API → session active', async () => {
    const res = await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/start`, {
      method: 'POST',
    });
    const data = await res.json();
    expect(data.sessionActive).toBe(true);
  });

  it('work timer increments over 3 seconds', async () => {
    const before = await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/status`);
    const dataBefore = await before.json();

    await wait(3000);

    const after = await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/status`);
    const dataAfter = await after.json();

    expect(dataAfter.workTimerMs).toBeGreaterThan(dataBefore.workTimerMs);
  });

  it('proxy blocks youtube.com → 302 to blocked page', async () => {
    const res = await proxyRequest('youtube.com', '/');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('blocked');
    expect(res.headers.location).toContain('domain=youtube.com');
  });

  it('proxy allows youtube.com/veritasium → passes through (path exception)', async () => {
    const res = await proxyRequest('youtube.com', '/veritasium');
    // Should NOT be 302 (allowed through)
    expect(res.statusCode).not.toBe(302);
  });

  it('proxy allows github.com → passes through', async () => {
    const res = await proxyRequest('github.com', '/');
    expect(res.statusCode).not.toBe(302);
  });

  it('productive timer increments on productive site visits', async () => {
    // Simulate visiting github.com (productive)
    engine.reportSiteVisit({
      url: 'https://github.com/',
      domain: 'github.com',
      path: '/',
      timestamp: Date.now(),
    });

    const before = engine.getStatus().productiveMs;
    await wait(1000);
    const after = engine.getStatus().productiveMs;

    expect(after).toBeGreaterThan(before);
  });

  it('productive timer pauses on non-productive site', async () => {
    // Switch to non-productive site AND non-productive app
    engine.reportSiteVisit({
      url: 'https://example.com/',
      domain: 'example.com',
      path: '/',
      timestamp: Date.now(),
    });
    engine.reportAppFocus({ processName: 'notepad', timestamp: Date.now() });

    const before = engine.getStatus().productiveMs;
    await wait(500);
    const after = engine.getStatus().productiveMs;

    // Should barely move (within tick imprecision)
    expect(after - before).toBeLessThan(50);
  });

  it('app monitor reports foreground app', async () => {
    const status = engine.getStatus();
    // App monitor should have reported something by now
    // (it's been running during all previous tests)
    expect(status.currentApp).toBeTruthy();
  });

  it('end session → timers stop', async () => {
    const res = await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/end`, {
      method: 'POST',
    });
    const data = await res.json();
    expect(data.sessionActive).toBe(false);

    const workAfterEnd = data.workTimerMs;
    await wait(500);

    const status = await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/status`);
    const statusData = await status.json();
    expect(statusData.workTimerMs).toBe(workAfterEnd);
  });

  it('WebSocket pushes real-time updates', async () => {
    // Start a fresh session
    await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/start`, { method: 'POST' });

    const messages = [];
    const ws = new WebSocket(`ws://localhost:${E2E_WEB_PORT}`);
    await new Promise((r) => ws.on('open', r));

    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));
    await wait(2500);
    ws.close();

    await fetch(`http://localhost:${E2E_WEB_PORT}/api/session/end`, { method: 'POST' });

    const ticks = messages.filter((m) => m.type === 'tick');
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0].data.sessionActive).toBe(true);
  });
});
