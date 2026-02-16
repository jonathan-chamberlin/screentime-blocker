// Brainrot Blocker Background Service Worker
importScripts('constants.js', 'storage.js', 'timer.js', 'site-utils.js');

const API_BASE_URL = 'http://localhost:3000';

// Session state
let state = {
  sessionActive: false,
  sessionId: null,
  sessionStartTime: null,
  rewardActive: false,
  blockedAttempts: 0,
  productiveSeconds: 0,
  lastProductiveTick: null,
  isOnProductiveSite: false,
  rewardGrantCount: 0,
  rewardTotalSeconds: 0,
  rewardBurnedSeconds: 0,
  isOnRewardSite: false,
  lastRewardTick: null,
  workMinutes: DEFAULTS.workMinutes,
  rewardMinutes: DEFAULTS.rewardMinutes,
};

// Native messaging state
let nativePort = null;
let currentAppName = null;
let nativeHostAvailable = false;
let browserHasFocus = true;

function connectNativeHost() {
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((msg) => {
      if (msg.type === 'app-focus') {
        currentAppName = msg.processName;
        if (state.sessionActive && !browserHasFocus) {
          isProductiveApp(currentAppName).then(isProductive => {
            if (isProductive !== state.isOnProductiveSite) {
              updateProductiveState(isProductive);
            }
          });
        }
      } else if (msg.type === 'pong') {
        nativeHostAvailable = true;
      }
    });

    nativePort.onDisconnect.addListener(() => {
      nativeHostAvailable = false;
      currentAppName = null;
      nativePort = null;
      setTimeout(connectNativeHost, 5000);
    });

    nativePort.postMessage({ type: 'ping' });
  } catch (err) {
    nativeHostAvailable = false;
  }
}

// Load persisted state on startup
(async () => {
  const result = await getStorage(['focusState']);
  if (result.focusState) {
    state = { ...state, ...result.focusState };
    if (state.sessionActive && state.sessionStartTime) {
      blockSites();
      checkCurrentTab();
      chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
    }
    if (state.rewardActive) {
      unblockSites();
      checkCurrentTab();
      chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
    }
    if (!state.sessionActive && !state.rewardActive) {
      unblockSites();
    }
  }
  connectNativeHost();
})();

function saveState() {
  setStorage({ focusState: state });
}

// --- Shared helpers ---

async function loadSiteConfig() {
  const result = await getStorage(['rewardSites', 'allowedPaths']);
  return {
    sites: result.rewardSites || DEFAULTS.rewardSites,
    allowedPaths: result.allowedPaths || DEFAULTS.allowedPaths,
  };
}

function flushProductive() {
  const flushed = flushElapsed(state.isOnProductiveSite, state.lastProductiveTick, state.productiveSeconds);
  state.productiveSeconds = flushed.seconds;
  state.lastProductiveTick = flushed.lastTick;
}

function flushReward() {
  const flushed = flushElapsed(state.isOnRewardSite, state.lastRewardTick, state.rewardBurnedSeconds);
  state.rewardBurnedSeconds = flushed.seconds;
  state.lastRewardTick = flushed.lastTick;
}

// --- Tab monitoring ---

async function isProductiveApp(processName) {
  if (!processName || !nativeHostAvailable) return false;

  const result = await getStorage(['productiveApps', 'productiveMode']);
  const mode = result.productiveMode || DEFAULTS.productiveMode;

  if (mode === 'all-except-blocked') return true;

  const productiveApps = result.productiveApps || DEFAULTS.productiveApps;
  return productiveApps.some(app =>
    app.toLowerCase() === processName.toLowerCase()
  );
}

async function checkCurrentTab() {
  if (!state.sessionActive && !state.rewardActive) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) {
      if (state.sessionActive) updateProductiveState(false);
      if (state.rewardActive) updateRewardState(false);
      return;
    }

    const result = await getStorage(['productiveSites', 'productiveMode', 'rewardSites', 'allowedPaths']);
    const blockedSites = result.rewardSites || DEFAULTS.rewardSites;
    const allowedPaths = result.allowedPaths || DEFAULTS.allowedPaths;

    if (state.sessionActive) {
      const mode = result.productiveMode || DEFAULTS.productiveMode;

      if (urlMatchesAllowedPaths(tab.url, allowedPaths)) {
        console.log('[BrainrotBlocker] Tab productive (allowed path):', tab.url);
        updateProductiveState(true);
      } else if (mode === 'all-except-blocked') {
        const isProductive = !urlMatchesSites(tab.url, blockedSites);
        console.log('[BrainrotBlocker] mode=all-except-blocked, url:', tab.url, 'productive:', isProductive);
        updateProductiveState(isProductive);
      } else {
        const productiveSites = result.productiveSites || DEFAULTS.productiveSites;
        const isProductive = urlMatchesSites(tab.url, productiveSites);
        console.log('[BrainrotBlocker] mode=whitelist, url:', tab.url, 'productive:', isProductive, 'sites:', productiveSites);
        updateProductiveState(isProductive);
      }
    }

    if (state.rewardActive) {
      updateRewardState(isBlockedUrl(tab.url, blockedSites, allowedPaths));
    }
  } catch (err) {
    console.log('[BrainrotBlocker] Tab check error:', err.message);
  }
}

function updateProductiveState(isProductive) {
  flushProductive();
  state.isOnProductiveSite = isProductive;
  state.lastProductiveTick = Date.now();
  saveState();
  updateBadge(isProductive);
}

function updateRewardState(isOnReward) {
  flushReward();
  state.isOnRewardSite = isOnReward;
  state.lastRewardTick = Date.now();
  saveState();
  updateBadge(isOnReward);
}

function updateBadge(isActive) {
  if (!isActive && (state.sessionActive || state.rewardActive)) {
    chrome.action.setBadgeText({ text: '\u23F8' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff4757' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.tabs.onActivated.addListener(() => {
  if (state.sessionActive || state.rewardActive) checkCurrentTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && (state.sessionActive || state.rewardActive)) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) checkCurrentTab();
    });
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  browserHasFocus = windowId !== chrome.windows.WINDOW_ID_NONE;

  if (state.sessionActive || state.rewardActive) {
    if (!browserHasFocus) {
      if (state.sessionActive) {
        const isProductive = await isProductiveApp(currentAppName);
        updateProductiveState(isProductive);
      }
      if (state.rewardActive) {
        updateRewardState(false);
      }
    } else {
      checkCurrentTab();
    }
  }
});

// --- Message handling ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startSession') {
    handleStartSession().then(sendResponse);
    return true;
  }
  if (message.action === 'endSession') {
    handleEndSession(message.confirmed).then(sendResponse);
    return true;
  }
  if (message.action === 'useReward') {
    handleUseReward().then(sendResponse);
    return true;
  }
  if (message.action === 'pauseReward') {
    handlePauseReward().then(sendResponse);
    return true;
  }
  if (message.action === 'getNativeHostStatus') {
    sendResponse({ available: nativeHostAvailable });
    return false;
  }
  if (message.action === 'getStatus') {
    (async () => {
      const result = await getStorage(['todayMinutes', 'unusedRewardSeconds']);

      const currentProductiveSeconds = state.sessionActive
        ? snapshotSeconds(state.isOnProductiveSite, state.lastProductiveTick, state.productiveSeconds)
        : state.productiveSeconds;

      let rewardRemainingSeconds = 0;
      if (state.rewardActive) {
        const burned = snapshotSeconds(state.isOnRewardSite, state.lastRewardTick, state.rewardBurnedSeconds);
        rewardRemainingSeconds = Math.max(0, state.rewardTotalSeconds - burned);
      }

      sendResponse({
        sessionActive: state.sessionActive,
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime,
        workMinutes: state.workMinutes,
        rewardMinutes: state.rewardMinutes,
        rewardActive: state.rewardActive,
        todayMinutes: result.todayMinutes || 0,
        unusedRewardSeconds: result.unusedRewardSeconds || 0,
        productiveSeconds: currentProductiveSeconds,
        rewardGrantCount: state.rewardGrantCount,
        rewardRemainingSeconds,
        isOnProductiveSite: state.isOnProductiveSite,
        isOnRewardSite: state.isOnRewardSite,
        nativeHostAvailable: nativeHostAvailable,
        currentAppName: currentAppName,
      });
    })();
    return true;
  }
  if (message.action === 'updateSettings') {
    state.workMinutes = message.workMinutes || state.workMinutes;
    state.rewardMinutes = message.rewardMinutes || state.rewardMinutes;
    saveState();
    sendResponse({ success: true });
    return false;
  }
  if (message.action === 'blockedPageLoaded') {
    if (state.sessionActive) {
      state.blockedAttempts++;
      saveState();
      notifyBackend('blocked-attempt', { session_id: state.sessionId });
    }
    sendResponse({ success: true });
    return false;
  }
  if (message.action === 'updateRewardSites') {
    if (state.sessionActive) {
      blockSites().then(() => sendResponse({ success: true }));
      return true;
    }
    sendResponse({ success: true });
    return false;
  }
});

// --- Session handlers ---

async function handleStartSession() {
  state.sessionId = crypto.randomUUID();
  state.sessionActive = true;
  state.sessionStartTime = Date.now();
  state.productiveSeconds = 0;
  state.lastProductiveTick = Date.now();
  state.isOnProductiveSite = false;
  state.rewardGrantCount = 0;
  state.blockedAttempts = 0;
  saveState();

  await blockSites();
  await redirectBlockedTabs();
  await checkCurrentTab();

  notifyBackend('start', { session_id: state.sessionId });
  chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });

  return { success: true, sessionId: state.sessionId };
}

async function handleEndSession(confirmed) {
  const settings = await getStorage(['strictMode']);
  if (settings.strictMode === 'on' && state.rewardGrantCount === 0) {
    return { success: false, reason: 'Strict mode: complete your work threshold first.' };
  }

  // If threshold met, end session immediately without confirmation
  if (!confirmed && state.rewardGrantCount >= 1) {
    confirmed = true;
  }

  if (!confirmed) {
    return {
      needsConfirmation: true,
      elapsedMinutes: Math.floor(state.productiveSeconds / 60),
    };
  }

  flushProductive();
  const minutesCompleted = Math.floor(state.productiveSeconds / 60);

  const todayResult = await getStorage(['todayMinutes']);
  await setStorage({ todayMinutes: (todayResult.todayMinutes || 0) + minutesCompleted });

  notifyBackend('end', {
    session_id: state.sessionId,
    minutes_completed: minutesCompleted,
    ended_early: true,
    blocked_attempts: state.blockedAttempts,
  });

  // Bank any active reward time
  if (state.rewardActive) {
    flushReward();
    const remainingSec = Math.max(0, state.rewardTotalSeconds - state.rewardBurnedSeconds);
    if (remainingSec > 0) {
      const cur = await getStorage(['unusedRewardSeconds']);
      await setStorage({ unusedRewardSeconds: (cur.unusedRewardSeconds || 0) + remainingSec });
    }
    state.rewardActive = false;
    state.rewardTotalSeconds = 0;
    state.rewardBurnedSeconds = 0;
    state.isOnRewardSite = false;
    state.lastRewardTick = null;
  }

  state.sessionActive = false;
  state.sessionId = null;
  state.sessionStartTime = null;
  state.blockedAttempts = 0;
  state.productiveSeconds = 0;
  state.lastProductiveTick = null;
  state.isOnProductiveSite = false;
  state.rewardGrantCount = 0;
  saveState();

  await unblockSites();
  chrome.alarms.clear('checkSession');
  await setStorage({ shameLevel: 0 });
  chrome.action.setBadgeText({ text: '' });

  return { success: true, endedEarly: true, minutesCompleted };
}

// --- Reward handlers ---

async function checkAndGrantReward() {
  const nextThreshold = state.workMinutes * 60 * (state.rewardGrantCount + 1);
  if (state.productiveSeconds >= nextThreshold) {
    state.rewardGrantCount++;
    saveState();

    const result = await getStorage(['todayMinutes', 'unusedRewardSeconds']);
    await setStorage({
      todayMinutes: (result.todayMinutes || 0) + state.workMinutes,
      unusedRewardSeconds: (result.unusedRewardSeconds || 0) + state.rewardMinutes * 60,
    });

    chrome.runtime.sendMessage({ action: 'rewardEarned', grantCount: state.rewardGrantCount }).catch(() => {});
    return true;
  }
  return false;
}

async function handleUseReward() {
  if (!state.sessionActive) {
    return { success: false, reason: 'Must be in an active work session to burn reward minutes' };
  }

  const result = await getStorage(['unusedRewardSeconds']);
  const availableSeconds = result.unusedRewardSeconds || 0;
  if (availableSeconds <= 0) {
    return { success: false, reason: 'No reward minutes available' };
  }

  state.rewardActive = true;
  state.rewardTotalSeconds = availableSeconds;
  state.rewardBurnedSeconds = 0;
  state.isOnRewardSite = false;
  state.lastRewardTick = Date.now();
  saveState();

  await setStorage({ unusedRewardSeconds: 0 });
  await unblockSites();
  chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
  await checkCurrentTab();

  return { success: true, rewardSeconds: availableSeconds };
}

async function handlePauseReward() {
  if (!state.rewardActive) {
    return { success: false, reason: 'No active reward to pause' };
  }

  flushReward();

  const remaining = Math.max(0, state.rewardTotalSeconds - state.rewardBurnedSeconds);
  if (remaining > 0) {
    const cur = await getStorage(['unusedRewardSeconds']);
    await setStorage({ unusedRewardSeconds: (cur.unusedRewardSeconds || 0) + remaining });
  }

  state.rewardActive = false;
  state.isOnRewardSite = false;
  state.lastRewardTick = null;
  state.rewardTotalSeconds = 0;
  state.rewardBurnedSeconds = 0;
  saveState();

  if (state.sessionActive) {
    setTimeout(() => {
      blockSites().catch(e => console.log('[handlePauseReward] blockSites error:', e));
      redirectNonActiveTabs().catch(e => console.log('[handlePauseReward] redirect error:', e));
    }, 0);
  }

  return { success: true, bankedSeconds: remaining };
}

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkSession') {
    if (state.sessionActive) {
      flushProductive();
      saveState();

      // Only check Chrome tab when browser has focus;
      // when another app has focus, re-evaluate via native host
      if (browserHasFocus) {
        await checkCurrentTab();
      } else {
        const isProductive = await isProductiveApp(currentAppName);
        updateProductiveState(isProductive);
      }

      await checkAndGrantReward();
    }

    if (state.rewardActive) {
      flushReward();
      saveState();

      if (state.rewardBurnedSeconds >= state.rewardTotalSeconds) {
        state.rewardActive = false;
        state.rewardTotalSeconds = 0;
        state.rewardBurnedSeconds = 0;
        state.isOnRewardSite = false;
        state.lastRewardTick = null;
        saveState();
        chrome.action.setBadgeText({ text: '' });

        await blockSites();
        await redirectBlockedTabs('reward-expired');
        chrome.runtime.sendMessage({ action: 'rewardExpired' }).catch(() => {});
      }
    }

    if (!state.sessionActive && !state.rewardActive) {
      chrome.alarms.clear('checkSession');
    }
  }
});

// --- Site blocking ---

async function blockSites() {
  const { sites, allowedPaths } = await loadSiteConfig();

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map(r => r.id);

  const blockRules = sites
    .map(s => s.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, ''))
    .filter(s => s.length > 0)
    .map((site, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
      condition: { requestDomains: [site], resourceTypes: ['main_frame'] },
    }));

  const allowRules = allowedPaths
    .map(p => p.trim().replace(/^(https?:\/\/)?(www\.)?/, ''))
    .filter(p => p.length > 0)
    .map((path, i) => ({
      id: ALLOW_RULE_ID_OFFSET + i,
      priority: 2,
      action: { type: 'allow' },
      condition: { urlFilter: `||${path}`, resourceTypes: ['main_frame'] },
    }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: [...blockRules, ...allowRules],
  });
}

async function unblockSites() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map(r => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
}

// --- Tab redirect helpers ---

async function redirectBlockedTabs(reason) {
  try {
    const { sites, allowedPaths } = await loadSiteConfig();
    const tabs = await chrome.tabs.query({});
    const suffix = reason ? `?reason=${reason}` : '';
    const blockedUrl = chrome.runtime.getURL('blocked.html') + suffix;
    for (const tab of tabs) {
      if (tab.url && isBlockedUrl(tab.url, sites, allowedPaths)) {
        chrome.tabs.update(tab.id, { url: blockedUrl });
      }
    }
  } catch (err) {
    console.log('[BrainrotBlocker] Error redirecting blocked tabs:', err.message);
  }
}

async function redirectNonActiveTabs(reason) {
  try {
    const { sites, allowedPaths } = await loadSiteConfig();
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const activeTabId = activeTab ? activeTab.id : null;
    const tabs = await chrome.tabs.query({});
    const suffix = reason ? `?reason=${reason}` : '';
    const blockedUrl = chrome.runtime.getURL('blocked.html') + suffix;
    for (const tab of tabs) {
      if (tab.id !== activeTabId && tab.url && isBlockedUrl(tab.url, sites, allowedPaths)) {
        chrome.tabs.update(tab.id, { url: blockedUrl });
      }
    }
  } catch (err) {
    console.log('[BrainrotBlocker] Error redirecting non-active tabs:', err.message);
  }
}

// --- Backend communication ---

async function getToken() {
  const result = await getStorage(['access_token']);
  return result.access_token || null;
}

async function notifyBackend(type, data) {
  try {
    const token = await getToken();
    if (token) {
      const endpoints = {
        'start': '/session/start',
        'end': '/session/end',
        'blocked-attempt': '/session/blocked-attempt',
        'profile': '/auth/profile',
      };
      const endpoint = endpoints[type] || `/session/${type}`;
      await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    }
  } catch (err) {
    console.log(`Backend ${type} notification failed:`, err.message);
  }
}
