// Integration tests — loads all background modules with mocked Chrome APIs
// Run: node extension/tests/integration-test.js

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
// Test framework
// ═══════════════════════════════════════════════════
let passed = 0, failed = 0, errors = [];

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertApprox(actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${msg}: expected ~${expected}, got ${actual}`);
}

async function test(name, fn) {
  try {
    resetMocks();
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════
// Chrome API Mocks
// ═══════════════════════════════════════════════════
let storageData = {};
let dynamicRules = [];
let alarms = {};
let badgeText = '';
let badgeColor = '';
let messageListeners = [];
let tabsList = [];

function resetMocks() {
  storageData = {};
  dynamicRules = [];
  alarms = {};
  badgeText = '';
  badgeColor = '';
  messageListeners = [];
  tabsList = [];
}

global.chrome = {
  storage: {
    local: {
      get(keys, cb) {
        const result = {};
        for (const k of keys) {
          if (k in storageData) result[k] = storageData[k];
        }
        if (cb) cb(result);
        return Promise.resolve(result);
      },
      set(obj, cb) {
        Object.assign(storageData, obj);
        if (cb) cb();
        return Promise.resolve();
      },
    },
    onChanged: { addListener() {} },
  },
  declarativeNetRequest: {
    getDynamicRules() {
      return Promise.resolve([...dynamicRules]);
    },
    updateDynamicRules({ removeRuleIds, addRules }) {
      if (removeRuleIds) {
        dynamicRules = dynamicRules.filter(r => !removeRuleIds.includes(r.id));
      }
      if (addRules) {
        for (const rule of addRules) {
          dynamicRules.push(rule);
        }
      }
      return Promise.resolve();
    },
  },
  tabs: {
    query(opts) {
      if (opts.active && opts.lastFocusedWindow) {
        return Promise.resolve(tabsList.filter(t => t.active));
      }
      return Promise.resolve([...tabsList]);
    },
    update(tabId, props) {
      const tab = tabsList.find(t => t.id === tabId);
      if (tab) Object.assign(tab, props);
      return Promise.resolve(tab);
    },
    onActivated: { addListener() {} },
    onUpdated: { addListener() {} },
  },
  windows: {
    WINDOW_ID_NONE: -1,
    onFocusChanged: { addListener() {} },
  },
  alarms: {
    create(name, opts) { alarms[name] = opts; },
    clear(name) { delete alarms[name]; return Promise.resolve(true); },
    onAlarm: { addListener() {} },
  },
  action: {
    setBadgeText({ text }) { badgeText = text; },
    setBadgeBackgroundColor({ color }) { badgeColor = color; },
  },
  runtime: {
    getURL(path) { return `chrome-extension://fakeid/${path}`; },
    sendMessage(msg) { return Promise.resolve(); },
    connectNative() {
      return {
        onMessage: { addListener() {} },
        onDisconnect: { addListener() {} },
        postMessage() {},
      };
    },
    onMessage: { addListener(fn) { messageListeners.push(fn); } },
  },
};

global.crypto = { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) };

// ═══════════════════════════════════════════════════
// Load all extension modules (same order as importScripts)
// ═══════════════════════════════════════════════════
const extDir = path.join(__dirname, '..');
const loadOrder = [
  'constants.js', 'storage.js', 'timer.js', 'site-utils.js',
  'session-state.js', 'blocking.js', 'native-host.js', 'backend-api.js',
  'tab-monitor.js', 'reward.js', 'session.js',
];

for (const file of loadOrder) {
  let code = fs.readFileSync(path.join(extDir, file), 'utf8');
  // Convert top-level const/let to var so they become global in eval
  code = code.replace(/^(const|let) /gm, 'var ');
  try {
    (0, eval)(code);
  } catch (e) {
    console.error(`Failed to load ${file}: ${e.message}`);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════
// Add stub functions for background.js-only code
// ═══════════════════════════════════════════════════
global.startRewardCheckInterval = function() {};
global.stopRewardCheckInterval = function() {};

// ═══════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════

async function runTests() {
  console.log('\n=== Pure Function Tests ===');

  await test('flushElapsed: inactive returns unchanged', () => {
    const result = flushElapsed(false, Date.now(), 100000);
    assertEqual(result.millis, 100000, 'millis unchanged');
  });

  await test('flushElapsed: null lastTick returns unchanged', () => {
    const result = flushElapsed(true, null, 50000);
    assertEqual(result.millis, 50000, 'millis unchanged');
  });

  await test('flushElapsed: active accumulates time', () => {
    const twoSecondsAgo = Date.now() - 2000;
    const result = flushElapsed(true, twoSecondsAgo, 10000);
    assertApprox(result.millis, 12000, 1000, 'accumulated ~2s');
    assert(result.lastTick >= twoSecondsAgo, 'lastTick updated');
  });

  await test('snapshotSeconds: inactive returns base', () => {
    assertEqual(snapshotSeconds(false, Date.now(), 100000), 100, 'returns base');
  });

  await test('snapshotSeconds: active includes elapsed', () => {
    const threeSecondsAgo = Date.now() - 3000;
    const result = snapshotSeconds(true, threeSecondsAgo, 10000);
    assertApprox(result, 13, 1, 'snapshot ~13');
  });

  await test('urlMatchesSites: matches domain', () => {
    assert(urlMatchesSites('https://www.youtube.com/watch?v=123', ['youtube.com']), 'should match');
  });

  await test('urlMatchesSites: matches subdomain', () => {
    assert(urlMatchesSites('https://music.youtube.com/', ['youtube.com']), 'should match subdomain');
  });

  await test('urlMatchesSites: no match', () => {
    assert(!urlMatchesSites('https://google.com/', ['youtube.com']), 'should not match');
  });

  await test('urlMatchesSites: empty sites', () => {
    assert(!urlMatchesSites('https://google.com/', []), 'empty sites');
  });

  await test('urlMatchesSites: invalid URL', () => {
    assert(!urlMatchesSites('not-a-url', ['youtube.com']), 'invalid url');
  });

  await test('urlMatchesAllowedPaths: matches path prefix', () => {
    assert(urlMatchesAllowedPaths('https://youtube.com/feed/subscriptions', ['youtube.com/feed']), 'should match');
  });

  await test('urlMatchesAllowedPaths: no match', () => {
    assert(!urlMatchesAllowedPaths('https://youtube.com/watch?v=123', ['youtube.com/feed']), 'should not match');
  });

  await test('isBlockedUrl: blocked site without allowed path', () => {
    assert(isBlockedUrl('https://youtube.com/watch', ['youtube.com'], []), 'should be blocked');
  });

  await test('isBlockedUrl: blocked site but on allowed path', () => {
    assert(!isBlockedUrl('https://youtube.com/feed/sub', ['youtube.com'], ['youtube.com/feed']), 'allowed path exempts');
  });

  await test('isBlockedUrl: non-blocked site', () => {
    assert(!isBlockedUrl('https://google.com/', ['youtube.com'], []), 'not blocked');
  });

  console.log('\n=== State Management Tests ===');

  await test('saveState persists state to storage', async () => {
    state.sessionActive = true;
    state.productiveMillis = 42000;
    saveState();
    assert(storageData.focusState, 'focusState saved');
    assertEqual(storageData.focusState.productiveMillis, 42000, 'seconds saved');
  });

  await test('flushProductive accumulates productive time', () => {
    state.isOnProductiveSite = true;
    state.lastProductiveTick = Date.now() - 5000;
    state.productiveMillis = 100000 
    flushProductive();
    assertApprox(state.productiveMillis, 105000, 1000, 'added ~5s');
  });

  await test('flushProductive: not on productive site does nothing', () => {
    state.isOnProductiveSite = false;
    state.lastProductiveTick = Date.now() - 5000;
    state.productiveMillis = 100000 
    flushProductive();
    assertEqual(state.productiveMillis, 100000, 'unchanged');
  });

  await test('flushReward accumulates reward burn time', () => {
    state.isOnRewardSite = true;
    state.lastRewardTick = Date.now() - 3000;
    state.rewardBurnedMillis = 50000 
    flushReward();
    assertApprox(state.rewardBurnedMillis, 53000, 1000, 'added ~3s');
  });

  await test('resetSessionState clears session fields', () => {
    state.sessionActive = true;
    state.sessionId = 'abc';
    state.productiveMillis = 500000 
    state.blockedAttempts = 3;
    state.rewardGrantCount = 2;
    resetSessionState();
    assertEqual(state.sessionActive, false, 'sessionActive');
    assertEqual(state.sessionId, null, 'sessionId');
    assertEqual(state.productiveMillis, 0, 'productiveMillis');
    assertEqual(state.blockedAttempts, 0, 'blockedAttempts');
    assertEqual(state.rewardGrantCount, 0, 'rewardGrantCount');
  });

  await test('loadSiteConfig returns defaults when empty', async () => {
    const config = await loadSiteConfig();
    assert(Array.isArray(config.sites), 'sites is array');
    assert(config.sites.includes('youtube.com'), 'has youtube');
    assert(Array.isArray(config.allowedPaths), 'allowedPaths is array');
  });

  await test('loadSiteConfig returns stored values', async () => {
    storageData.rewardSites = ['custom.com'];
    storageData.allowedPaths = ['custom.com/ok'];
    const config = await loadSiteConfig();
    assertEqual(config.sites.length, 1, 'custom sites');
    assertEqual(config.sites[0], 'custom.com', 'custom site');
    assertEqual(config.allowedPaths[0], 'custom.com/ok', 'custom path');
  });

  console.log('\n=== Blocking Module Tests ===');

  await test('blockSites creates declarativeNetRequest rules', async () => {
    storageData.rewardSites = ['youtube.com', 'reddit.com'];
    storageData.allowedPaths = [];
    await blockSites();
    assert(dynamicRules.length >= 2, `expected >=2 rules, got ${dynamicRules.length}`);
    const ytRule = dynamicRules.find(r => r.condition.requestDomains && r.condition.requestDomains.includes('youtube.com'));
    assert(ytRule, 'youtube rule exists');
    assertEqual(ytRule.action.type, 'redirect', 'redirect action');
  });

  await test('blockSites creates allow rules for allowed paths', async () => {
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = ['youtube.com/feed'];
    await blockSites();
    const allowRule = dynamicRules.find(r => r.action.type === 'allow');
    assert(allowRule, 'allow rule exists');
    assert(allowRule.priority > 1, 'allow rule has higher priority');
  });

  await test('unblockSites removes all rules', async () => {
    dynamicRules = [{ id: 1 }, { id: 2 }];
    await unblockSites();
    assertEqual(dynamicRules.length, 0, 'all rules removed');
  });

  await test('redirectBlockedTabs redirects matching tabs', async () => {
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [
      { id: 1, url: 'https://youtube.com/watch?v=abc', active: false },
      { id: 2, url: 'https://google.com/', active: true },
      { id: 3, url: 'https://www.youtube.com/', active: false },
    ];
    await redirectBlockedTabs('test');
    assert(tabsList[0].url.includes('blocked.html'), 'tab 1 redirected');
    assertEqual(tabsList[1].url, 'https://google.com/', 'tab 2 untouched');
    assert(tabsList[2].url.includes('blocked.html'), 'tab 3 redirected');
    assert(tabsList[0].url.includes('reason=test'), 'has reason param');
  });

  await test('redirectBlockedTabs respects allowed paths', async () => {
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = ['youtube.com/feed'];
    tabsList = [
      { id: 1, url: 'https://youtube.com/feed/subscriptions', active: false },
      { id: 2, url: 'https://youtube.com/watch?v=abc', active: false },
    ];
    await redirectBlockedTabs();
    assertEqual(tabsList[0].url, 'https://youtube.com/feed/subscriptions', 'allowed path not redirected');
    assert(tabsList[1].url.includes('blocked.html'), 'blocked tab redirected');
  });

  console.log('\n=== Session Lifecycle Tests ===');

  await test('handleStartSession activates session and blocks sites', async () => {
    state = { ...state, sessionActive: false, sessionId: null };
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [{ id: 1, url: 'https://github.com', active: true }];

    const result = await handleStartSession();
    assert(result.success, 'success');
    assert(result.sessionId, 'has sessionId');
    assert(state.sessionActive, 'session is active');
    assert(state.sessionStartTime > 0, 'has start time');
    assert(dynamicRules.length > 0, 'blocking rules created');
    assert(alarms.checkSession, 'alarm created');
  });

  await test('handleEndSession with no prior reward grant returns needsConfirmation', async () => {
    state.sessionActive = true;
    state.sessionId = 'test-123';
    state.rewardGrantCount = 0;
    state.productiveMillis = 120000 
    storageData.strictMode = undefined;

    const result = await handleEndSession(false);
    assert(result.needsConfirmation, 'needs confirmation');
  });

  await test('handleEndSession with confirmed=true ends session', async () => {
    state.sessionActive = true;
    state.sessionId = 'test-456';
    state.rewardGrantCount = 0;
    state.productiveMillis = 300000 
    state.rewardActive = false;
    storageData.strictMode = undefined;

    const result = await handleEndSession(true);
    assert(result.success, 'success');
    assertEqual(state.sessionActive, false, 'session ended');
    assertEqual(dynamicRules.length, 0, 'rules cleared');
  });

  await test('handleEndSession with rewardGrantCount>=1 auto-confirms', async () => {
    state.sessionActive = true;
    state.sessionId = 'test-789';
    state.rewardGrantCount = 1;
    state.productiveMillis = 3000000 
    state.rewardActive = false;

    const result = await handleEndSession(false);
    assert(result.success, 'auto-confirmed');
    assertEqual(state.sessionActive, false, 'session ended');
  });

  await test('handleEndSession accumulates todayMinutes', async () => {
    state.sessionActive = true;
    state.sessionId = 'test-min';
    state.rewardGrantCount = 1;
    state.productiveMillis = 600000  // 10 minutes
    state.rewardActive = false;
    state.isOnProductiveSite = false;
    storageData.todayMinutes = 5;

    await handleEndSession(false);
    assertEqual(storageData.todayMinutes, 15, '5 + 10 = 15 minutes');
  });

  await test('handleEndSession in strict mode with 0 grants is denied', async () => {
    state.sessionActive = true;
    state.sessionId = 'strict-test';
    state.rewardGrantCount = 0;
    storageData.strictMode = 'on';

    const result = await handleEndSession(true);
    assertEqual(result.success, false, 'denied');
    assert(result.reason.includes('Strict'), 'strict mode reason');
    assert(state.sessionActive, 'still active');
  });

  console.log('\n=== Reward Module Tests ===');

  await test('checkAndGrantReward: not enough time returns false', async () => {
    state.workMinutes = 50;
    state.productiveMillis = 100000 
    state.rewardGrantCount = 0;
    const result = await checkAndGrantReward();
    assertEqual(result, false, 'no grant');
  });

  await test('checkAndGrantReward: threshold met grants reward', async () => {
    state.workMinutes = 1; // 1 minute = 60 seconds
    state.rewardMinutes = 1;
    state.productiveMillis = 61000 
    state.rewardGrantCount = 0;
    storageData.todayMinutes = 0;
    storageData.unusedRewardSeconds = 0;

    const result = await checkAndGrantReward();
    assertEqual(result, true, 'granted');
    assertEqual(state.rewardGrantCount, 1, 'grant count incremented');
    assertEqual(storageData.todayMinutes, 1, 'todayMinutes updated');
    assertEqual(storageData.unusedRewardSeconds, 60, 'reward seconds banked');
  });

  await test('checkAndGrantReward: second threshold needs 2x time', async () => {
    state.workMinutes = 1;
    state.rewardMinutes = 1;
    state.productiveMillis = 90000  // past 1st threshold (60s) but not 2nd (120s)
    state.rewardGrantCount = 1;

    const result = await checkAndGrantReward();
    assertEqual(result, false, 'not enough for 2nd grant');
  });

  await test('handleUseReward: no session returns failure', async () => {
    state.sessionActive = false;
    const result = await handleUseReward();
    assertEqual(result.success, false, 'fails without session');
  });

  await test('handleUseReward: no seconds returns failure', async () => {
    state.sessionActive = true;
    storageData.unusedRewardSeconds = 0;
    const result = await handleUseReward();
    assertEqual(result.success, false, 'fails without seconds');
  });

  await test('handleUseReward: activates reward and unblocks', async () => {
    state.sessionActive = true;
    state.rewardActive = false;
    storageData.unusedRewardSeconds = 120;
    dynamicRules = [{ id: 1 }]; // pre-existing block rule
    tabsList = [{ id: 1, url: 'https://github.com', active: true }];

    const result = await handleUseReward();
    assert(result.success, 'success');
    assertEqual(result.rewardSeconds, 120, 'correct seconds');
    assert(state.rewardActive, 'reward active');
    assertEqual(state.rewardTotalMillis, 120000, 'total set');
    assertEqual(state.rewardBurnedMillis, 0, 'burned starts at 0');
    assertEqual(storageData.unusedRewardSeconds, 0, 'storage cleared');
    assertEqual(dynamicRules.length, 0, 'rules unblocked');
  });

  await test('handlePauseReward: banks remaining time', async () => {
    state.rewardActive = true;
    state.rewardTotalMillis = 120000 
    state.rewardBurnedMillis = 30000 
    state.isOnRewardSite = false;
    state.lastRewardTick = Date.now();
    state.sessionActive = true;
    storageData.unusedRewardSeconds = 0;
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];

    const result = await handlePauseReward();
    assert(result.success, 'success');
    assertApprox(result.bankedSeconds, 90, 2, 'banked ~90s');
    assertEqual(state.rewardActive, false, 'reward deactivated');
    assertApprox(storageData.unusedRewardSeconds, 90, 2, 'storage updated');
  });

  await test('handlePauseReward: no active reward fails', async () => {
    state.rewardActive = false;
    const result = await handlePauseReward();
    assertEqual(result.success, false, 'fails');
  });

  await test('handleRewardExpired: cleans up state and blocks', async () => {
    state.rewardActive = true;
    state.rewardTotalMillis = 60000 
    state.rewardBurnedMillis = 60000;
    state.isOnRewardSite = true;
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [{ id: 1, url: 'https://youtube.com', active: true }];

    await handleRewardExpired();
    assertEqual(state.rewardActive, false, 'reward ended');
    assertEqual(state.rewardTotalMillis, 0, 'total zeroed');
    assert(dynamicRules.length > 0, 'blocking re-enabled');
    assert(tabsList[0].url.includes('blocked.html'), 'tab redirected');
  });

  await test('bankActiveReward: banks remaining to storage', async () => {
    state.rewardActive = true;
    state.rewardTotalMillis = 100000 
    state.rewardBurnedMillis = 40000 
    state.isOnRewardSite = false;
    state.lastRewardTick = Date.now();
    storageData.unusedRewardSeconds = 10;

    await bankActiveReward();
    assertEqual(state.rewardActive, false, 'reward deactivated');
    assertApprox(storageData.unusedRewardSeconds, 70, 2, '10 existing + ~60 remaining');
  });

  console.log('\n=== Tab Monitor Tests ===');

  await test('updateProductiveState: productive sets badge clear', () => {
    state.sessionActive = true;
    state.productiveMillis = 0;
    state.isOnProductiveSite = false;
    state.lastProductiveTick = Date.now();
    updateProductiveState(true);
    assert(state.isOnProductiveSite, 'marked productive');
    assertEqual(badgeText, '', 'badge cleared');
  });

  await test('updateProductiveState: non-productive sets pause badge', () => {
    state.sessionActive = true;
    updateProductiveState(false);
    assert(!state.isOnProductiveSite, 'marked not productive');
    assertEqual(badgeText, '\u23F8', 'pause badge');
  });

  await test('updateRewardState: on reward site clears badge', () => {
    state.rewardActive = true;
    state.rewardTotalMillis = 999000 
    state.rewardBurnedMillis = 0;
    state.lastRewardTick = Date.now();
    updateRewardState(true);
    assert(state.isOnRewardSite, 'on reward site');
    assertEqual(badgeText, '', 'badge cleared');
  });

  await test('checkCurrentTab: no session or reward exits early', async () => {
    state.sessionActive = false;
    state.rewardActive = false;
    tabsList = [{ id: 1, url: 'https://youtube.com', active: true }];
    await checkCurrentTab();
    // Should not throw and state should be unchanged
    assert(true, 'no error');
  });

  await test('checkCurrentTab: all-except-blocked mode counts non-blocked as productive', async () => {
    state.sessionActive = true;
    state.rewardActive = false;
    state.isOnProductiveSite = false;
    state.lastProductiveTick = Date.now();
    storageData.productiveMode = 'all-except-blocked';
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [{ id: 1, url: 'https://github.com', active: true }];

    await checkCurrentTab();
    assert(state.isOnProductiveSite, 'github is productive in all-except-blocked');
  });

  await test('checkCurrentTab: all-except-blocked mode pauses on blocked site', async () => {
    state.sessionActive = true;
    state.rewardActive = false;
    state.isOnProductiveSite = true;
    state.lastProductiveTick = Date.now();
    storageData.productiveMode = 'all-except-blocked';
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [{ id: 1, url: 'https://youtube.com/watch', active: true }];

    await checkCurrentTab();
    assert(!state.isOnProductiveSite, 'youtube is NOT productive');
  });

  await test('checkCurrentTab: whitelist mode only counts listed sites', async () => {
    state.sessionActive = true;
    state.rewardActive = false;
    state.isOnProductiveSite = false;
    state.lastProductiveTick = Date.now();
    storageData.productiveMode = 'select-websites';
    storageData.productiveSites = ['github.com'];
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [{ id: 1, url: 'https://github.com/user/repo', active: true }];

    await checkCurrentTab();
    assert(state.isOnProductiveSite, 'github is productive in whitelist');
  });

  await test('checkCurrentTab: whitelist mode non-listed site is not productive', async () => {
    state.sessionActive = true;
    state.rewardActive = false;
    state.isOnProductiveSite = true;
    state.lastProductiveTick = Date.now();
    storageData.productiveMode = 'select-websites';
    storageData.productiveSites = ['github.com'];
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = [];
    tabsList = [{ id: 1, url: 'https://google.com/', active: true }];

    await checkCurrentTab();
    assert(!state.isOnProductiveSite, 'google not in whitelist');
  });

  await test('checkCurrentTab: allowed path overrides blocking for productivity', async () => {
    state.sessionActive = true;
    state.rewardActive = false;
    state.isOnProductiveSite = false;
    state.lastProductiveTick = Date.now();
    storageData.productiveMode = 'all-except-blocked';
    storageData.rewardSites = ['youtube.com'];
    storageData.allowedPaths = ['youtube.com/feed'];
    tabsList = [{ id: 1, url: 'https://youtube.com/feed/subscriptions', active: true }];

    await checkCurrentTab();
    assert(state.isOnProductiveSite, 'allowed path is productive');
  });

  console.log('\n=== End-to-End Scenario Tests ===');

  await test('Full session lifecycle: start → work → earn reward → use → expire → end', async () => {
    // Setup
    storageData = { rewardSites: ['youtube.com'], allowedPaths: [] };
    tabsList = [{ id: 1, url: 'https://github.com', active: true }];

    // 1. Start session
    const startResult = await handleStartSession();
    assert(startResult.success, 'started');
    assert(state.sessionActive, 'session active');

    // 2. Simulate productive work
    state.workMinutes = 1; // 1 min threshold
    state.rewardMinutes = 1; // 1 min reward
    state.productiveMillis = 61000  // just past threshold
    storageData.todayMinutes = 0;
    storageData.unusedRewardSeconds = 0;

    // 3. Check if reward earned
    const granted = await checkAndGrantReward();
    assert(granted, 'reward granted');
    assertEqual(storageData.unusedRewardSeconds, 60, '60s reward banked');

    // 4. Use reward
    const useResult = await handleUseReward();
    assert(useResult.success, 'reward activated');
    assert(state.rewardActive, 'reward is active');
    assertEqual(dynamicRules.length, 0, 'sites unblocked during reward');

    // 5. Simulate reward expiring
    state.rewardBurnedMillis = state.rewardTotalMillis;
    await handleRewardExpired();
    assertEqual(state.rewardActive, false, 'reward expired');
    assert(dynamicRules.length > 0, 'blocking re-enabled');

    // 6. End session
    const endResult = await handleEndSession(false); // auto-confirms since rewardGrantCount >= 1
    assert(endResult.success, 'session ended');
    assertEqual(state.sessionActive, false, 'session inactive');
  });

  await test('Pause reward mid-session banks time correctly', async () => {
    storageData = { rewardSites: ['youtube.com'], allowedPaths: [], unusedRewardSeconds: 120 };
    tabsList = [{ id: 1, url: 'https://github.com', active: true }];

    // Start session and use reward
    await handleStartSession();
    state.rewardGrantCount = 1; // pretend we earned a reward
    const useResult = await handleUseReward();
    assert(useResult.success, 'reward activated');

    // Simulate 30s of burn
    state.rewardBurnedMillis = 30000 
    state.isOnRewardSite = false;
    state.lastRewardTick = Date.now();

    // Pause
    const pauseResult = await handlePauseReward();
    assert(pauseResult.success, 'paused');
    assertApprox(pauseResult.bankedSeconds, 90, 2, '120-30=90 banked');
    assertEqual(state.rewardActive, false, 'reward paused');
    assertApprox(storageData.unusedRewardSeconds, 90, 2, 'stored back');
  });

  await test('isProductiveApp: all-except-blocked always returns true', async () => {
    storageData.productiveMode = 'all-except-blocked';
    const result = await isProductiveApp('SomeRandomApp');
    assert(result, 'always productive in all-except-blocked');
  });

  await test('isProductiveApp: whitelist mode needs match', async () => {
    storageData.productiveMode = 'select-websites';
    storageData.productiveApps = ['Code', 'idea64'];
    nativeHostAvailable = true;
    const resultMatch = await isProductiveApp('Code');
    assert(resultMatch, 'Code matches');
    const resultNoMatch = await isProductiveApp('Discord');
    assert(!resultNoMatch, 'Discord does not match');
  });

  await test('isProductiveApp: case insensitive matching', async () => {
    storageData.productiveMode = 'select-websites';
    storageData.productiveApps = ['Code'];
    nativeHostAvailable = true;
    const result = await isProductiveApp('code');
    assert(result, 'case insensitive match');
  });

  await test('isProductiveApp: no native host returns false in whitelist mode', async () => {
    storageData.productiveMode = 'select-websites';
    storageData.productiveApps = ['Code'];
    nativeHostAvailable = false;
    const result = await isProductiveApp('Code');
    assert(!result, 'no native host = not productive');
  });

  // ═══════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (errors.length > 0) {
    console.log('\nFailures:');
    for (const e of errors) {
      console.log(`  ✗ ${e.name}: ${e.error}`);
    }
  }
  console.log('='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
