import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { chromium } from 'playwright';

const extensionPath = path.resolve('extension');

describe('Usage Data Layer', () => {
  let context, page, extensionId;

  before(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
      ],
    });
    let sw = context.serviceWorkers()[0];
    if (!sw) sw = await context.waitForEvent('serviceworker');
    extensionId = sw.url().split('/')[2];
    page = await context.newPage();
  });

  after(async () => {
    // Clean up test data
    await page.evaluate(() => chrome.storage.local.remove([
      'sessionHistory', 'dailySummaries', 'streakData'
    ]));
    await context.close();
  });

  // Helper to send message to background
  async function sendMessage(action, data = {}) {
    return page.evaluate(({ action, data }) => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({ action, ...data }, resolve);
      });
    }, { action, data });
  }

  // Helper to read storage
  async function getStorageKeys(keys) {
    return page.evaluate((keys) => {
      return new Promise(resolve => chrome.storage.local.get(keys, resolve));
    }, keys);
  }

  test('session start initializes blockedDomainsMap', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(1000);

    const result = await sendMessage('startSession');
    assert.ok(result.success);

    const { focusState } = await getStorageKeys(['focusState']);
    assert.ok(focusState);
    assert.deepStrictEqual(focusState.blockedDomainsMap, {});
    assert.strictEqual(focusState.blockedAttempts, 0);
    assert.ok(focusState.sessionActive);

    // Clean up - end session
    await sendMessage('endSession', { confirmed: true });
  });

  test('blockedPageLoaded tracks domain in blockedDomainsMap', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(1000);

    await sendMessage('startSession');

    // Simulate blocked page loads with domains
    await sendMessage('blockedPageLoaded', { domain: 'reddit.com' });
    await sendMessage('blockedPageLoaded', { domain: 'reddit.com' });
    await sendMessage('blockedPageLoaded', { domain: 'youtube.com' });

    const { focusState } = await getStorageKeys(['focusState']);
    assert.strictEqual(focusState.blockedAttempts, 3);
    assert.strictEqual(focusState.blockedDomainsMap['reddit.com'], 2);
    assert.strictEqual(focusState.blockedDomainsMap['youtube.com'], 1);

    await sendMessage('endSession', { confirmed: true });
  });

  test('session end saves sessionHistory record', async () => {
    // Clear any prior data
    await page.evaluate(() => chrome.storage.local.remove([
      'sessionHistory', 'dailySummaries', 'streakData'
    ]));

    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(1000);

    await sendMessage('startSession');
    await sendMessage('blockedPageLoaded', { domain: 'tiktok.com' });

    // Wait a moment so productiveMillis > 0 if on productive site
    await page.waitForTimeout(500);

    await sendMessage('endSession', { confirmed: true });
    await page.waitForTimeout(500); // Wait for async storage write

    const { sessionHistory } = await getStorageKeys(['sessionHistory']);
    assert.ok(Array.isArray(sessionHistory));
    assert.strictEqual(sessionHistory.length, 1);

    const record = sessionHistory[0];
    assert.ok(record.sessionId);
    assert.ok(record.startTime > 0);
    assert.ok(record.endTime >= record.startTime);
    assert.strictEqual(record.workMinutes, 50); // default
    assert.strictEqual(record.blockedAttempts, 1);
    assert.deepStrictEqual(record.blockedDomains, { 'tiktok.com': 1 });
    assert.strictEqual(record.endedEarly, true); // no reward earned
  });

  test('session end updates dailySummaries', async () => {
    const { dailySummaries } = await getStorageKeys(['dailySummaries']);
    assert.ok(dailySummaries);

    const today = new Date().toLocaleDateString('en-CA');
    const dayData = dailySummaries[today];
    assert.ok(dayData, 'Should have summary for today');
    assert.strictEqual(dayData.sessionsCompleted, 1);
    assert.strictEqual(dayData.totalBlockedAttempts, 1);
    assert.strictEqual(dayData.blockedDomains['tiktok.com'], 1);
  });

  test('streak data initializes correctly for first session', async () => {
    const { streakData } = await getStorageKeys(['streakData']);
    assert.ok(streakData);
    // First session ended early (no reward), so streak should not increment
    assert.strictEqual(streakData.currentStreak, 0);
    assert.strictEqual(streakData.longestStreak, 0);
  });

  test('multiple sessions accumulate in history', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(1000);

    // Second session
    await sendMessage('startSession');
    await sendMessage('blockedPageLoaded', { domain: 'instagram.com' });
    await sendMessage('blockedPageLoaded', { domain: 'instagram.com' });
    await sendMessage('endSession', { confirmed: true });
    await page.waitForTimeout(500);

    const { sessionHistory, dailySummaries } = await getStorageKeys(['sessionHistory', 'dailySummaries']);
    assert.strictEqual(sessionHistory.length, 2);

    const today = new Date().toLocaleDateString('en-CA');
    assert.strictEqual(dailySummaries[today].sessionsCompleted, 2);
    assert.strictEqual(dailySummaries[today].totalBlockedAttempts, 3); // 1 + 2
    assert.strictEqual(dailySummaries[today].blockedDomains['instagram.com'], 2);
    assert.strictEqual(dailySummaries[today].blockedDomains['tiktok.com'], 1);
  });
});
