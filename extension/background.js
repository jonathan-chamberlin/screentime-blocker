// FocusContract Background Service Worker
const API_BASE_URL = 'http://localhost:3000';

// Session state
let state = {
  sessionActive: false,
  sessionId: null,
  sessionStartTime: null,
  rewardActive: false,
  blockedAttempts: 0,
  // Productive tab tracking
  productiveSeconds: 0,
  lastProductiveTick: null,
  isOnProductiveSite: false,
  // Continuous session: track how many reward batches granted
  rewardGrantCount: 0,
  // Reward tab tracking (countdown only when on reward site)
  rewardTotalSeconds: 0,
  rewardBurnedSeconds: 0,
  isOnRewardSite: false,
  lastRewardTick: null,
  // Reward pause/resume
  rewardPaused: false,
  rewardRemainingSeconds: 0,
  // Settings (defaults, will be overridden from storage)
  workMinutes: 50,
  rewardMinutes: 10,
};

// Load persisted state on startup
chrome.storage.local.get(['focusState'], (result) => {
  if (result.focusState) {
    state = { ...state, ...result.focusState };
    if (state.sessionActive && state.sessionStartTime) {
      blockSites();
      checkCurrentTab();
      chrome.alarms.create('checkSession', { periodInMinutes: 0.25 });
    }
    if (state.rewardActive) {
      // During reward, sites should be unblocked
      unblockSites();
      checkCurrentTab();
      chrome.alarms.create('checkSession', { periodInMinutes: 0.25 });
    }
    if (state.rewardPaused) {
      blockSites();
    }
    // If neither session nor reward is active but not paused, ensure sites are unblocked
    if (!state.sessionActive && !state.rewardActive && !state.rewardPaused) {
      unblockSites();
    }
  }
});

function saveState() {
  chrome.storage.local.set({ focusState: state });
}

// --- Tab monitoring ---

function urlMatchesSites(url, sites) {
  if (!url || !sites || sites.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return sites.some(site => {
      const cleanSite = site.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
      return hostname === cleanSite || hostname.endsWith('.' + cleanSite);
    });
  } catch {
    return false;
  }
}

function urlMatchesAllowedPaths(url, allowedPaths) {
  if (!url || !allowedPaths || allowedPaths.length === 0) return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const fullPath = hostname + urlObj.pathname.toLowerCase();
    return allowedPaths.some(path => {
      const clean = path.trim().replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return fullPath.startsWith(clean);
    });
  } catch {
    return false;
  }
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

    const result = await new Promise(r =>
      chrome.storage.local.get(['productiveSites', 'productiveMode', 'rewardSites', 'allowedPaths'], r)
    );
    const blockedSites = result.rewardSites || ['youtube.com'];
    const allowedPaths = result.allowedPaths || [];

    // Productive tracking (only during active session)
    if (state.sessionActive) {
      const mode = result.productiveMode || 'whitelist';

      if (urlMatchesAllowedPaths(tab.url, allowedPaths)) {
        updateProductiveState(true);
      } else if (mode === 'all-except-blocked') {
        updateProductiveState(!urlMatchesSites(tab.url, blockedSites));
      } else {
        const productiveSites = result.productiveSites || ['docs.google.com', 'notion.so', 'github.com'];
        updateProductiveState(urlMatchesSites(tab.url, productiveSites));
      }
    }

    // Reward site tracking (only during active reward)
    if (state.rewardActive) {
      const isOnReward = urlMatchesSites(tab.url, blockedSites) && !urlMatchesAllowedPaths(tab.url, allowedPaths);
      updateRewardState(isOnReward);
    }
  } catch (err) {
    console.log('[FocusContract] Tab check error:', err.message);
  }
}

function updateProductiveState(isProductive) {
  const now = Date.now();
  if (state.isOnProductiveSite && state.lastProductiveTick) {
    const elapsed = Math.floor((now - state.lastProductiveTick) / 1000);
    state.productiveSeconds += Math.max(0, elapsed);
  }
  state.isOnProductiveSite = isProductive;
  state.lastProductiveTick = now;
  saveState();
}

function updateRewardState(isOnReward) {
  const now = Date.now();
  if (state.isOnRewardSite && state.lastRewardTick) {
    const elapsed = Math.floor((now - state.lastRewardTick) / 1000);
    state.rewardBurnedSeconds += Math.max(0, elapsed);
  }
  state.isOnRewardSite = isOnReward;
  state.lastRewardTick = now;
  saveState();
}

// Tab activated
chrome.tabs.onActivated.addListener(() => {
  if (state.sessionActive || state.rewardActive) {
    checkCurrentTab();
  }
});

// Tab URL changed
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && (state.sessionActive || state.rewardActive)) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        checkCurrentTab();
      }
    });
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (state.sessionActive || state.rewardActive) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      if (state.sessionActive) updateProductiveState(false);
      if (state.rewardActive) updateRewardState(false);
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
  if (message.action === 'resumeReward') {
    handleResumeReward().then(sendResponse);
    return true;
  }
  if (message.action === 'getStatus') {
    chrome.storage.local.get(['todayMinutes', 'unusedRewardMinutes'], (result) => {
      // Snapshot productive seconds
      let currentProductiveSeconds = state.productiveSeconds;
      if (state.isOnProductiveSite && state.lastProductiveTick && state.sessionActive) {
        currentProductiveSeconds += Math.floor((Date.now() - state.lastProductiveTick) / 1000);
      }

      // Snapshot reward remaining
      let rewardRemainingSeconds = 0;
      if (state.rewardActive) {
        let burned = state.rewardBurnedSeconds;
        if (state.isOnRewardSite && state.lastRewardTick) {
          burned += Math.floor((Date.now() - state.lastRewardTick) / 1000);
        }
        rewardRemainingSeconds = Math.max(0, state.rewardTotalSeconds - burned);
      } else if (state.rewardPaused) {
        rewardRemainingSeconds = state.rewardRemainingSeconds;
      }

      sendResponse({
        sessionActive: state.sessionActive,
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime,
        workMinutes: state.workMinutes,
        rewardMinutes: state.rewardMinutes,
        rewardActive: state.rewardActive,
        todayMinutes: result.todayMinutes || 0,
        unusedRewardMinutes: result.unusedRewardMinutes || 0,
        productiveSeconds: currentProductiveSeconds,
        rewardGrantCount: state.rewardGrantCount,
        rewardPaused: state.rewardPaused,
        rewardRemainingSeconds,
        isOnProductiveSite: state.isOnProductiveSite,
        isOnRewardSite: state.isOnRewardSite,
      });
    });
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

async function handleStartSession() {
  state.sessionId = crypto.randomUUID();
  state.sessionActive = true;
  state.sessionStartTime = Date.now();
  state.productiveSeconds = 0;
  state.lastProductiveTick = Date.now();
  state.isOnProductiveSite = false;
  state.rewardGrantCount = 0;
  state.rewardPaused = false;
  state.rewardRemainingSeconds = 0;
  state.blockedAttempts = 0;
  saveState();

  await blockSites();
  await checkCurrentTab();

  notifyBackend('start', { session_id: state.sessionId });
  chrome.alarms.create('checkSession', { periodInMinutes: 0.25 });

  return { success: true, sessionId: state.sessionId };
}

async function handleEndSession(confirmed) {
  if (!confirmed) {
    return {
      needsConfirmation: true,
      elapsedMinutes: Math.floor(state.productiveSeconds / 60),
    };
  }

  // Flush productive time
  if (state.isOnProductiveSite && state.lastProductiveTick) {
    state.productiveSeconds += Math.floor((Date.now() - state.lastProductiveTick) / 1000);
  }

  const minutesCompleted = Math.floor(state.productiveSeconds / 60);

  chrome.storage.local.get(['todayMinutes'], (result) => {
    chrome.storage.local.set({ todayMinutes: (result.todayMinutes || 0) + minutesCompleted });
  });

  notifyBackend('end', {
    session_id: state.sessionId,
    minutes_completed: minutesCompleted,
    ended_early: true,
    blocked_attempts: state.blockedAttempts,
  });

  // Also end reward if active
  if (state.rewardActive) {
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
  state.rewardPaused = false;
  state.rewardRemainingSeconds = 0;
  saveState();

  await unblockSites();
  chrome.alarms.clear('checkSession');
  chrome.storage.local.set({ shameLevel: 0 });

  return { success: true, endedEarly: true, minutesCompleted };
}

// Grant reward when threshold is crossed (session continues)
function checkAndGrantReward() {
  const nextThreshold = state.workMinutes * 60 * (state.rewardGrantCount + 1);
  if (state.productiveSeconds >= nextThreshold) {
    state.rewardGrantCount++;
    saveState();

    // Grant reward minutes
    chrome.storage.local.get(['todayMinutes', 'unusedRewardMinutes'], (result) => {
      chrome.storage.local.set({
        todayMinutes: (result.todayMinutes || 0) + state.workMinutes,
        unusedRewardMinutes: (result.unusedRewardMinutes || 0) + state.rewardMinutes,
      });
    });

    // Notify popup for confetti
    chrome.runtime.sendMessage({ action: 'rewardEarned', grantCount: state.rewardGrantCount }).catch(() => {});
    return true;
  }
  return false;
}

async function handleUseReward() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['unusedRewardMinutes'], async (result) => {
      const available = result.unusedRewardMinutes || 0;
      if (available <= 0) {
        resolve({ success: false, reason: 'No reward minutes available' });
        return;
      }

      const useMinutes = Math.min(available, state.rewardMinutes);
      state.rewardActive = true;
      state.rewardTotalSeconds = useMinutes * 60;
      state.rewardBurnedSeconds = 0;
      state.isOnRewardSite = false;
      state.lastRewardTick = Date.now();
      state.rewardPaused = false;
      state.rewardRemainingSeconds = 0;
      saveState();

      chrome.storage.local.set({ unusedRewardMinutes: available - useMinutes });

      await unblockSites();

      // Ensure tick alarm is running
      chrome.alarms.create('checkSession', { periodInMinutes: 0.25 });

      // Check current tab to start reward tracking
      await checkCurrentTab();

      resolve({ success: true, rewardMinutes: useMinutes });
    });
  });
}

async function handlePauseReward() {
  if (!state.rewardActive) {
    return { success: false, reason: 'No active reward to pause' };
  }

  // Flush burned time
  if (state.isOnRewardSite && state.lastRewardTick) {
    state.rewardBurnedSeconds += Math.floor((Date.now() - state.lastRewardTick) / 1000);
  }

  const remaining = Math.max(0, state.rewardTotalSeconds - state.rewardBurnedSeconds);
  state.rewardRemainingSeconds = remaining;
  state.rewardPaused = true;
  state.rewardActive = false;
  state.isOnRewardSite = false;
  state.lastRewardTick = null;
  state.rewardTotalSeconds = 0;
  state.rewardBurnedSeconds = 0;
  saveState();

  // Re-block if session is active, otherwise just block
  await blockSites();
  await closeBlockedTabs();

  return { success: true, remainingSeconds: remaining };
}

async function handleResumeReward() {
  if (!state.rewardPaused || state.rewardRemainingSeconds <= 0) {
    return { success: false, reason: 'No paused reward to resume' };
  }

  state.rewardActive = true;
  state.rewardTotalSeconds = state.rewardRemainingSeconds;
  state.rewardBurnedSeconds = 0;
  state.isOnRewardSite = false;
  state.lastRewardTick = Date.now();
  state.rewardPaused = false;
  state.rewardRemainingSeconds = 0;
  saveState();

  await unblockSites();
  chrome.alarms.create('checkSession', { periodInMinutes: 0.25 });
  await checkCurrentTab();

  return { success: true };
}

async function closeBlockedTabs() {
  try {
    const result = await new Promise(r => chrome.storage.local.get(['rewardSites', 'allowedPaths'], r));
    const sites = result.rewardSites || ['youtube.com'];
    const allowedPaths = result.allowedPaths || [];
    const tabs = await chrome.tabs.query({});
    const tabsToClose = tabs.filter(tab =>
      tab.url && urlMatchesSites(tab.url, sites) && !urlMatchesAllowedPaths(tab.url, allowedPaths)
    );
    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose.map(t => t.id));
    }
  } catch (err) {
    console.log('[FocusContract] Error closing blocked tabs:', err.message);
  }
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkSession') {
    // Check session threshold
    if (state.sessionActive) {
      // Flush productive time
      if (state.isOnProductiveSite && state.lastProductiveTick) {
        const now = Date.now();
        const elapsed = Math.floor((now - state.lastProductiveTick) / 1000);
        state.productiveSeconds += Math.max(0, elapsed);
        state.lastProductiveTick = now;
        saveState();
      }
      await checkCurrentTab();
      checkAndGrantReward();
    }

    // Check reward expiry
    if (state.rewardActive) {
      // Flush reward burned time
      if (state.isOnRewardSite && state.lastRewardTick) {
        const now = Date.now();
        const elapsed = Math.floor((now - state.lastRewardTick) / 1000);
        state.rewardBurnedSeconds += Math.max(0, elapsed);
        state.lastRewardTick = now;
        saveState();
      }

      if (state.rewardBurnedSeconds >= state.rewardTotalSeconds) {
        // Reward expired
        await closeBlockedTabs();
        state.rewardActive = false;
        state.rewardTotalSeconds = 0;
        state.rewardBurnedSeconds = 0;
        state.isOnRewardSite = false;
        state.lastRewardTick = null;
        saveState();

        if (state.sessionActive) {
          await blockSites();
        }
        chrome.runtime.sendMessage({ action: 'rewardExpired' }).catch(() => {});
      }
    }

    // Clear alarm if nothing needs ticking
    if (!state.sessionActive && !state.rewardActive) {
      chrome.alarms.clear('checkSession');
    }
  }
});

async function blockSites() {
  const result = await new Promise(r => chrome.storage.local.get(['rewardSites', 'allowedPaths'], r));
  const sites = result.rewardSites || ['youtube.com'];
  const allowedPaths = result.allowedPaths || [];

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
      id: 1000 + i,
      priority: 2,
      action: { type: 'allow' },
      condition: { urlFilter: `||${path}`, resourceTypes: ['main_frame'] },
    }));

  const addRules = [...blockRules, ...allowRules];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

async function unblockSites() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map(r => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
}

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('access_token', (result) => {
      resolve(result.access_token || null);
    });
  });
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
