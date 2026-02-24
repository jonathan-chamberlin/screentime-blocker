/**
 * Tests for src/session/session-engine.js — session management,
 * work timer, and productive timer with exact switching sequences.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSessionEngine } from '../src/session/session-engine.js';

/** Helper: wait for ms. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Default test config using whitelist mode. */
function makeConfig() {
  return {
    productiveSites: ['github.com', 'docs.google.com'],
    productiveApps: ['Code.exe', 'chrome.exe'],
    blockedSites: ['youtube.com', 'reddit.com', 'instagram.com'],
    productiveMode: 'whitelist',
    workMinutes: 50,
    rewardMinutes: 10,
    strictMode: false,
    blockTaskManager: false,
  };
}

/** Helper: make a site visit event. */
function siteVisit(domain) {
  return { url: `https://${domain}/`, domain, path: '/', timestamp: Date.now() };
}

/** Helper: make an app focus event. */
function appFocus(processName) {
  return { processName, timestamp: Date.now() };
}

let engine;

beforeEach(() => {
  engine = createSessionEngine(makeConfig());
});

afterEach(() => {
  engine.destroy();
});

describe('session-engine: core timer tests', () => {
  it('start session → workTimer starts incrementing', async () => {
    engine.startSession();
    await wait(300);
    const status = engine.getStatus();

    expect(status.sessionActive).toBe(true);
    expect(status.workTimerMs).toBeGreaterThan(0);
    expect(status.sessionId).toBeTruthy();
  });

  it('report productive site → productiveTimer starts incrementing', async () => {
    engine.startSession();
    engine.reportSiteVisit(siteVisit('github.com'));
    await wait(300);
    const status = engine.getStatus();

    expect(status.isOnProductiveSite).toBe(true);
    expect(status.productiveMs).toBeGreaterThan(0);
  });

  it('report non-productive non-blocked site → productiveTimer pauses, workTimer continues', async () => {
    engine.startSession();
    engine.reportSiteVisit(siteVisit('github.com'));
    await wait(200);

    // Switch to non-productive site
    engine.reportSiteVisit(siteVisit('example.com'));
    // Also report non-productive app so isOnProductiveApp is false
    engine.reportAppFocus(appFocus('notepad'));
    const beforePause = engine.getStatus().productiveMs;

    await wait(300);
    const afterPause = engine.getStatus();

    expect(afterPause.isOnProductiveSite).toBe(false);
    // Productive timer should have barely moved (only tick imprecision)
    expect(afterPause.productiveMs - beforePause).toBeLessThan(50);
    // Work timer should have continued
    expect(afterPause.workTimerMs).toBeGreaterThan(400);
  });

  it('end session → both timers stop, accumulated values returned', async () => {
    engine.startSession();
    engine.reportSiteVisit(siteVisit('github.com'));
    await wait(300);

    const finalState = engine.endSession();

    expect(finalState.sessionActive).toBe(false);
    expect(finalState.workTimerMs).toBeGreaterThan(0);
    expect(finalState.productiveMs).toBeGreaterThan(0);

    // After ending, timers should not change
    const afterEnd = engine.getStatus();
    await wait(200);
    expect(engine.getStatus().workTimerMs).toBe(afterEnd.workTimerMs);
  });

  it('getStatus() returns correct SessionState shape', () => {
    const status = engine.getStatus();

    expect(status).toHaveProperty('sessionActive');
    expect(status).toHaveProperty('sessionId');
    expect(status).toHaveProperty('workTimerMs');
    expect(status).toHaveProperty('productiveMs');
    expect(status).toHaveProperty('rewardActive');
    expect(status).toHaveProperty('currentSite');
    expect(status).toHaveProperty('currentApp');
    expect(status).toHaveProperty('currentWindowTitle');
    expect(status).toHaveProperty('isOnProductiveSite');
    expect(status).toHaveProperty('isOnProductiveApp');
    expect(status).toHaveProperty('isOnBlockedSite');
    expect(status).toHaveProperty('isIdle');
    expect(status).toHaveProperty('blockedAttempts');
    expect(status).toHaveProperty('workMinutes');
    expect(status).toHaveProperty('rewardMinutes');
    expect(status).toHaveProperty('strictMode');
    expect(status).toHaveProperty('blockTaskManager');
  });
});

describe('session-engine: exact site/app switching sequence (whitelist mode)', () => {
  it('follows the exact switching order: productive site → productive app → non-productive site → productive app → productive site → non-productive app', async () => {
    // Step 1: Start session
    engine.startSession();
    await wait(50);

    // Step 2: Visit productive SITE (github.com)
    // → workTimer ✓ incrementing, productiveTimer ✓ incrementing
    engine.reportSiteVisit(siteVisit('github.com'));
    await wait(250);
    let s = engine.getStatus();
    expect(s.isOnProductiveSite).toBe(true);
    const workAfterStep2 = s.workTimerMs;
    const prodAfterStep2 = s.productiveMs;
    expect(workAfterStep2).toBeGreaterThan(0);
    expect(prodAfterStep2).toBeGreaterThan(0);

    // Step 3: Switch to productive APP (Code.exe)
    // → workTimer ✓ incrementing, productiveTimer ✓ incrementing
    engine.reportAppFocus(appFocus('Code'));
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveApp).toBe(true);
    expect(s.workTimerMs).toBeGreaterThan(workAfterStep2);
    expect(s.productiveMs).toBeGreaterThan(prodAfterStep2);
    const workAfterStep3 = s.workTimerMs;
    const prodAfterStep3 = s.productiveMs;

    // Step 4: Visit non-productive SITE (example.com, not listed)
    // → workTimer ✓ incrementing, productiveTimer... still ticking because Code.exe is productive
    engine.reportSiteVisit(siteVisit('example.com'));
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveSite).toBe(false);
    expect(s.isOnProductiveApp).toBe(true); // Code.exe still focused
    expect(s.workTimerMs).toBeGreaterThan(workAfterStep3);
    // Productive should still increment because productive APP is active
    expect(s.productiveMs).toBeGreaterThan(prodAfterStep3);

    // Now switch to non-productive app to truly pause productive timer
    engine.reportAppFocus(appFocus('notepad'));
    await wait(50);
    s = engine.getStatus();
    expect(s.isOnProductiveSite).toBe(false);
    expect(s.isOnProductiveApp).toBe(false);
    const prodBeforePause = s.productiveMs;
    const workBeforePause = s.workTimerMs;

    await wait(250);
    s = engine.getStatus();
    // productiveTimer ✗ PAUSES (neither productive site nor app)
    expect(s.productiveMs - prodBeforePause).toBeLessThan(50);
    // workTimer ✓ still incrementing
    expect(s.workTimerMs).toBeGreaterThan(workBeforePause);

    // Step 5: Switch to productive APP (Code.exe)
    // → workTimer ✓ incrementing, productiveTimer ✓ RESUMES
    engine.reportAppFocus(appFocus('Code'));
    const prodBeforeResume = s.productiveMs;
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveApp).toBe(true);
    expect(s.productiveMs).toBeGreaterThan(prodBeforeResume);

    // Step 6: Switch browser tab to productive SITE (github.com)
    // → workTimer ✓ incrementing, productiveTimer ✓ continues
    engine.reportSiteVisit(siteVisit('github.com'));
    const prodBeforeStep6 = engine.getStatus().productiveMs;
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveSite).toBe(true);
    expect(s.productiveMs).toBeGreaterThan(prodBeforeStep6);

    // Step 7: Switch to non-productive APP (notepad.exe, not listed)
    // → workTimer ✓ incrementing, productiveTimer... still ticking because github.com is productive
    engine.reportAppFocus(appFocus('notepad'));
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveApp).toBe(false);
    expect(s.isOnProductiveSite).toBe(true); // github.com still the current site
    // Productive still ticks because productive SITE is active
    expect(s.productiveMs).toBeGreaterThan(prodBeforeStep6 + 200);

    // Now also switch away from productive site
    engine.reportSiteVisit(siteVisit('example.com'));
    const prodBeforeFinalPause = engine.getStatus().productiveMs;
    await wait(250);
    s = engine.getStatus();
    // NOW productiveTimer ✗ PAUSES (no productive site, no productive app)
    expect(s.productiveMs - prodBeforeFinalPause).toBeLessThan(50);

    // Step 8: Verify final
    // workTimer > productiveTimer (work always ticks, productive only on listed sites/apps)
    expect(s.workTimerMs).toBeGreaterThan(s.productiveMs);
  });
});

describe('session-engine: reverse order switching sequence', () => {
  it('handles: non-productive site → non-productive app → productive app → productive site → blocked site', async () => {
    // Step 1: Start session on non-productive site
    engine.startSession();
    engine.reportSiteVisit(siteVisit('example.com'));
    engine.reportAppFocus(appFocus('notepad'));
    await wait(250);

    let s = engine.getStatus();
    expect(s.workTimerMs).toBeGreaterThan(0);
    // Neither timer accumulating productive time
    expect(s.productiveMs).toBeLessThan(50);

    // Step 2: Switch to non-productive app → still no productive time
    engine.reportAppFocus(appFocus('explorer'));
    await wait(250);
    s = engine.getStatus();
    expect(s.productiveMs).toBeLessThan(50);

    // Step 3: Switch to productive app → productive resumes
    engine.reportAppFocus(appFocus('Code'));
    const prodBefore3 = s.productiveMs;
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveApp).toBe(true);
    expect(s.productiveMs).toBeGreaterThan(prodBefore3);

    // Step 4: Visit productive site → productive continues
    engine.reportSiteVisit(siteVisit('github.com'));
    const prodBefore4 = engine.getStatus().productiveMs;
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnProductiveSite).toBe(true);
    expect(s.productiveMs).toBeGreaterThan(prodBefore4);

    // Step 5: Visit blocked site → gets "blocked" (attempt counted), productive pauses
    engine.reportSiteVisit(siteVisit('youtube.com'));
    engine.reportAppFocus(appFocus('notepad')); // switch away from productive app
    const prodBefore5 = engine.getStatus().productiveMs;
    await wait(250);
    s = engine.getStatus();
    expect(s.isOnBlockedSite).toBe(true);
    expect(s.blockedAttempts).toBe(1);
    // Productive should pause (blocked site is not productive, notepad not productive)
    expect(s.productiveMs - prodBefore5).toBeLessThan(50);
  });
});

describe('session-engine: idle handling', () => {
  it('pauses both timers when idle', async () => {
    engine.startSession();
    engine.reportSiteVisit(siteVisit('github.com'));
    await wait(200);

    engine.setIdle(true);
    const workBefore = engine.getStatus().workTimerMs;
    const prodBefore = engine.getStatus().productiveMs;

    await wait(300);

    const s = engine.getStatus();
    expect(s.isIdle).toBe(true);
    expect(s.workTimerMs - workBefore).toBeLessThan(50);
    expect(s.productiveMs - prodBefore).toBeLessThan(50);
  });

  it('resumes timers when no longer idle', async () => {
    engine.startSession();
    engine.reportSiteVisit(siteVisit('github.com'));
    await wait(200);

    engine.setIdle(true);
    await wait(200);
    engine.setIdle(false);

    const workAfterResume = engine.getStatus().workTimerMs;
    await wait(300);

    const s = engine.getStatus();
    expect(s.workTimerMs).toBeGreaterThan(workAfterResume);
  });
});

describe('session-engine: blocked attempt counting', () => {
  it('increments blockedAttempts on blocked site visits during session', () => {
    engine.startSession();
    engine.reportSiteVisit(siteVisit('youtube.com'));
    engine.reportSiteVisit(siteVisit('reddit.com'));
    engine.reportSiteVisit(siteVisit('youtube.com'));

    expect(engine.getStatus().blockedAttempts).toBe(3);
  });

  it('does not count blocked attempts when no session active', () => {
    engine.reportSiteVisit(siteVisit('youtube.com'));
    expect(engine.getStatus().blockedAttempts).toBe(0);
  });
});

describe('session-engine: events', () => {
  it('emits stateChanged on session start', () => {
    let emitted = false;
    engine.on('stateChanged', () => { emitted = true; });
    engine.startSession();
    expect(emitted).toBe(true);
  });

  it('emits blockingStateChanged on session start and end', () => {
    let count = 0;
    engine.on('blockingStateChanged', () => { count++; });
    engine.startSession();
    engine.endSession();
    expect(count).toBe(2);
  });
});
