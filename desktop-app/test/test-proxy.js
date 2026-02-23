/**
 * Tests for src/proxy/proxy-server.js — MITM proxy blocking behavior.
 *
 * These tests start the proxy and make HTTP requests through it to verify
 * blocking and allowing behavior. HTTPS MITM tests are deferred to E2E
 * testing (require CA installation + system proxy configuration).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { startProxy } from '../src/proxy/proxy-server.js';
import { ensureCA } from '../src/proxy/ca-manager.js';
import { WEB_PORT } from '../src/shared/constants.js';

const TEST_PROXY_PORT = 18443;
let proxyHandle = null;
let siteVisits = [];

/** @returns {import('../src/proxy/rule-engine.js').BlockingState} */
function makeBlockingState() {
  return {
    sessionActive: true,
    rewardActive: false,
    blockedSites: ['youtube.com', 'reddit.com', 'instagram.com'],
    allowedPaths: ['youtube.com/veritasium'],
    nuclearSites: [],
    blockingMode: 'manual',
  };
}

/**
 * Make an HTTP request through the proxy (using HTTP CONNECT tunnel
 * is complex, so we test via plain HTTP proxy requests).
 *
 * @param {string} host
 * @param {string} path
 * @returns {Promise<{ statusCode: number, headers: Object }>}
 */
function proxyRequest(host, path = '/') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port: TEST_PROXY_PORT,
      path: `http://${host}${path}`,
      headers: { Host: host },
    }, (res) => {
      // Consume body to avoid memory leaks
      res.resume();
      resolve({ statusCode: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.end();
  });
}

beforeAll(async () => {
  // Ensure CA exists for proxy cert generation
  await ensureCA();

  siteVisits = [];
  proxyHandle = await startProxy({
    port: TEST_PROXY_PORT,
    getBlockingState: makeBlockingState,
    onSiteVisit: (visit) => siteVisits.push(visit),
  });
}, 15000);

afterAll(async () => {
  if (proxyHandle) {
    await proxyHandle.stop();
  }
});

describe('proxy-server', () => {
  it('redirects blocked domain to blocked page (302)', async () => {
    const res = await proxyRequest('youtube.com', '/');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain(`localhost:${WEB_PORT}/blocked`);
    expect(res.headers.location).toContain('domain=youtube.com');
  });

  it('redirects blocked domain with path to blocked page', async () => {
    const res = await proxyRequest('reddit.com', '/r/all');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('domain=reddit.com');
  });

  it('records site visits via onSiteVisit callback', async () => {
    siteVisits = [];
    await proxyRequest('instagram.com', '/explore');

    expect(siteVisits.length).toBeGreaterThan(0);
    const visit = siteVisits[siteVisits.length - 1];
    expect(visit.domain).toBe('instagram.com');
    expect(visit.path).toBe('/explore');
    expect(typeof visit.timestamp).toBe('number');
  });

  it('does not redirect localhost requests (avoids loops)', async () => {
    // Request to localhost should pass through, not get blocked
    const res = await proxyRequest('localhost', `/blocked?domain=test`);
    // localhost requests are passed through — they may error since
    // no server is running on that port, but they won't be 302'd
    expect(res.statusCode).not.toBe(302);
  });
});
