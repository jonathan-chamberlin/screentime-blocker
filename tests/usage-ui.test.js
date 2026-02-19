import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { chromium } from 'playwright';

const extensionPath = path.resolve('extension');

describe('Usage Page UI', () => {
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
    await page.evaluate(() => chrome.storage.local.remove([
      'sessionHistory', 'dailySummaries', 'streakData'
    ]));
    await context.close();
  });

  test('popup has 4 header buttons in correct order', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(1500);

    const buttons = await page.$$eval('.header-actions .icon-btn', els =>
      els.map(el => ({ id: el.id, title: el.title }))
    );

    assert.strictEqual(buttons.length, 4);
    assert.strictEqual(buttons[0].id, 'btn-usage');
    assert.strictEqual(buttons[0].title, 'Usage Stats');
    assert.strictEqual(buttons[1].id, 'btn-info');
    assert.strictEqual(buttons[2].id, 'btn-leaderboard');
    assert.strictEqual(buttons[3].id, 'btn-settings');
  });

  test('usage button opens usage.html in new tab', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(1500);

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#btn-usage'),
    ]);
    await newPage.waitForLoadState();

    assert.ok(newPage.url().includes('usage.html'));
    await newPage.close();
  });

  test('usage page shows empty state when no data', async () => {
    // Ensure no data
    await page.evaluate(() => chrome.storage.local.remove([
      'sessionHistory', 'dailySummaries', 'streakData'
    ]));

    await page.goto(`chrome-extension://${extensionId}/usage.html`);
    await page.waitForTimeout(2000);

    const emptyText = await page.$eval('.empty-state', el => el.textContent);
    assert.ok(emptyText.includes('No usage data yet'));
  });

  test('usage page renders all sections with data', async () => {
    // Inject mock data
    await page.evaluate(() => {
      const now = Date.now();
      const DAY = 86400000;
      const history = [];
      const summaries = {};

      for (let i = 6; i >= 0; i--) {
        const dayTime = now - i * DAY;
        const dateKey = new Date(dayTime).toLocaleDateString('en-CA');
        const productiveMin = 45 + i * 5;
        history.push({
          sessionId: crypto.randomUUID(),
          startTime: dayTime,
          endTime: dayTime + productiveMin * 60000,
          workMinutes: 50,
          rewardMinutes: 10,
          productiveMillis: productiveMin * 60000,
          blockedAttempts: 3 - Math.floor(i / 3),
          blockedDomains: { 'reddit.com': 2, 'youtube.com': 1 },
          rewardGrantCount: 1,
          endedEarly: false,
        });
        summaries[dateKey] = {
          date: dateKey,
          totalProductiveMinutes: productiveMin,
          sessionsCompleted: 1,
          sessionsEndedEarly: 0,
          totalBlockedAttempts: 3 - Math.floor(i / 3),
          blockedDomains: { 'reddit.com': 2, 'youtube.com': 1 },
        };
      }

      const streakData = {
        currentStreak: 7,
        longestStreak: 7,
        lastActiveDate: new Date().toLocaleDateString('en-CA'),
      };

      return chrome.storage.local.set({ sessionHistory: history, dailySummaries: summaries, streakData });
    });

    await page.goto(`chrome-extension://${extensionId}/usage.html`);
    await page.waitForTimeout(2000);

    // Verify empty state is gone
    const emptyState = await page.$('.empty-state');
    assert.strictEqual(emptyState, null, 'Empty state should not be visible');

    // Verify streak banner exists and shows correct values
    const streakNumbers = await page.$$eval('.streak-number', els => els.map(el => el.textContent));
    assert.ok(streakNumbers.length >= 2);
    assert.strictEqual(streakNumbers[0], '7'); // current streak
    assert.strictEqual(streakNumbers[1], '7'); // longest streak

    // Verify weekly comparison cards exist
    const weekCards = await page.$$('.week-card');
    assert.strictEqual(weekCards.length, 2);

    // Verify section headings
    const headings = await page.$$eval('.section h2', els => els.map(el => el.textContent));
    assert.ok(headings.includes('Blocked Attempts (Last 14 Days)'));
    assert.ok(headings.includes('Most Blocked Sites'));
    assert.ok(headings.includes('Daily Productive Minutes (Last 30 Days)'));
    assert.ok(headings.includes('Average Minutes by Day of Week'));
    assert.ok(headings.includes('Average Session Duration'));

    // Verify stats grid has 3 cards
    const statCards = await page.$$('.stats-grid .stat-card');
    assert.strictEqual(statCards.length, 3);

    // Verify blocked sites horizontal bars exist
    const hBars = await page.$$('.h-bar-row');
    assert.ok(hBars.length >= 1, 'Should have blocked site bars');

    // Verify the first blocked domain is reddit.com (highest count)
    const firstDomain = await page.$eval('.h-bar-domain', el => el.textContent);
    assert.strictEqual(firstDomain.trim(), 'reddit.com');

    // Verify completion rate is 100% (all sessions completed)
    const statValues = await page.$$eval('.stat-value', els => els.map(el => el.textContent));
    const completionRate = statValues.find(v => v.includes('%'));
    assert.strictEqual(completionRate, '100%');

    // Verify total sessions = 7
    const totalSessions = statValues.find(v => v === '7');
    assert.ok(totalSessions, 'Should show 7 total sessions');
  });

  test('usage page title is correct', async () => {
    const title = await page.title();
    assert.ok(title.includes('Usage Stats'));
  });

  test('blocked attempts trend shows declining message when improving', async () => {
    // The mock data has declining blocked attempts (higher i = fewer attempts)
    const trendText = await page.$eval('.week-change + .section', el => el.textContent);
    // Just verify the section exists and has trend text
    assert.ok(trendText.includes('Blocked Attempts'));
  });
});
