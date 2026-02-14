// FocusContract Background Service Worker
const API_BASE_URL = 'http://localhost:3000';

// Session state
let state = {
  sessionActive: false,
  sessionId: null,
  sessionStartTime: null,
  rewardActive: false,
  rewardEndTime: null,
  blockedAttempts: 0,
  // Productive tab tracking
  productiveSeconds: 0,
  lastProductiveTick: null,
  isOnProductiveSite: false,
  sessionCompleted: false,
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
    // If session was active, check if it's still valid
    if (state.sessionActive && state.sessionStartTime) {
      blockSites();
      checkCurrentTab();
    }
    // If session completed (waiting for reward burn), keep sites blocked
    if (state.sessionCompleted) {
      blockSites();
    }
    // If reward was active, check if it expired
    if (state.rewardActive && state.rewardEndTime) {
      if (Date.now() >= state.rewardEndTime) {
        state.rewardActive = false;
        state.rewardEndTime = null;
        blockSites();
        saveState();
      }
    }
    // If reward is paused, keep sites blocked
    if (state.rewardPaused) {
      blockSites();
    }
  }
});

function saveState() {
  chrome.storage.local.set({ focusState: state });
}

// --- Tab monitoring for productive site tracking ---

// Check if a URL matches any site in a list (domain matching)
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

// Check if a URL matches any allowed path (domain + path prefix matching)
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

// Check the current active tab and update productive state
async function checkCurrentTab() {
  if (!state.sessionActive) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) {
      updateProductiveState(false);
      return;
    }

    const result = await new Promise(r =>
      chrome.storage.local.get(['productiveSites', 'productiveMode', 'rewardSites', 'allowedPaths'], r)
    );
    const mode = result.productiveMode || 'whitelist';
    const allowedPaths = result.allowedPaths || [];

    // Allowed paths are always productive (user explicitly whitelisted these pages)
    if (urlMatchesAllowedPaths(tab.url, allowedPaths)) {
      updateProductiveState(true);
      return;
    }

    let isProductive;
    if (mode === 'all-except-blocked') {
      const blockedSites = result.rewardSites || ['youtube.com'];
      isProductive = !urlMatchesSites(tab.url, blockedSites);
    } else {
      const productiveSites = result.productiveSites || ['docs.google.com', 'notion.so', 'github.com'];
      isProductive = urlMatchesSites(tab.url, productiveSites);
    }

    updateProductiveState(isProductive);
  } catch (err) {
    console.log('[FocusContract] Tab check error:', err.message);
  }
}

function updateProductiveState(isProductive) {
  const now = Date.now();

  // If we were on a productive site, accumulate the time since last tick
  if (state.isOnProductiveSite && state.lastProductiveTick) {
    const elapsed = Math.floor((now - state.lastProductiveTick) / 1000);
    state.productiveSeconds += Math.max(0, elapsed);
  }

  state.isOnProductiveSite = isProductive;
  state.lastProductiveTick = now;
  saveState();
}

// Tab activated (user switched tabs)
chrome.tabs.onActivated.addListener(() => {
  if (state.sessionActive) {
    checkCurrentTab();
  }
});

// Tab URL changed (navigation within active tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && state.sessionActive) {
    // Only check if this is the active tab
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        checkCurrentTab();
      }
    });
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (state.sessionActive) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus — not productive
      updateProductiveState(false);
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
  if (message.action === 'completeSession') {
    handleCompleteSession().then(sendResponse);
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
      // Snapshot productive seconds (include current tick if on productive site)
      let currentProductiveSeconds = state.productiveSeconds;
      if (state.isOnProductiveSite && state.lastProductiveTick && state.sessionActive) {
        currentProductiveSeconds += Math.floor((Date.now() - state.lastProductiveTick) / 1000);
      }

      sendResponse({
        sessionActive: state.sessionActive,
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime,
        rewardEndTime: state.rewardEndTime,
        workMinutes: state.workMinutes,
        rewardMinutes: state.rewardMinutes,
        rewardActive: state.rewardActive,
        todayMinutes: result.todayMinutes || 0,
        unusedRewardMinutes: result.unusedRewardMinutes || 0,
        productiveSeconds: currentProductiveSeconds,
        sessionCompleted: state.sessionCompleted,
        rewardPaused: state.rewardPaused,
        rewardRemainingSeconds: state.rewardRemainingSeconds,
        isOnProductiveSite: state.isOnProductiveSite,
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
  state.sessionCompleted = false;
  state.rewardPaused = false;
  state.rewardRemainingSeconds = 0;
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
      elapsedMinutes: Math.floor((Date.now() - state.sessionStartTime) / 60000),
    };
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

  state.sessionActive = false;
  state.sessionId = null;
  state.sessionStartTime = null;
  state.blockedAttempts = 0;
  state.productiveSeconds = 0;
  state.lastProductiveTick = null;
  state.isOnProductiveSite = false;
  state.sessionCompleted = false;
  saveState();

  await unblockSites();
  chrome.alarms.clear('checkSession');
  chrome.storage.local.set({ shameLevel: 0 });

  return { success: true, endedEarly: true, minutesCompleted };
}

async function handleCompleteSession() {
  // Flush any remaining productive time
  if (state.isOnProductiveSite && state.lastProductiveTick) {
    state.productiveSeconds += Math.floor((Date.now() - state.lastProductiveTick) / 1000);
    state.lastProductiveTick = Date.now();
  }

  const minutesCompleted = state.workMinutes;

  // Grant reward minutes
  chrome.storage.local.get(['todayMinutes', 'unusedRewardMinutes'], (result) => {
    chrome.storage.local.set({
      todayMinutes: (result.todayMinutes || 0) + minutesCompleted,
      unusedRewardMinutes: (result.unusedRewardMinutes || 0) + state.rewardMinutes,
    });
  });

  notifyBackend('end', {
    session_id: state.sessionId,
    minutes_completed: minutesCompleted,
    ended_early: false,
    blocked_attempts: state.blockedAttempts,
  });

  // Mark session completed — sites stay blocked until user burns reward
  state.sessionActive = false;
  state.sessionCompleted = true;
  state.productiveSeconds = 0;
  state.lastProductiveTick = null;
  state.isOnProductiveSite = false;
  saveState();

  chrome.alarms.clear('checkSession');
  chrome.storage.local.set({ shameLevel: 0 });

  // Keep sites blocked — user must click "Burn Reward" to unblock
  return { success: true, endedEarly: false, minutesCompleted, rewardEarned: state.rewardMinutes };
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
      state.rewardEndTime = Date.now() + (useMinutes * 60000);
      state.sessionCompleted = false;
      state.rewardPaused = false;
      state.rewardRemainingSeconds = 0;
      state.blockedAttempts = 0;
      state.sessionId = null;
      state.sessionStartTime = null;
      saveState();

      chrome.storage.local.set({ unusedRewardMinutes: available - useMinutes });

      await unblockSites();

      chrome.alarms.create('rewardExpired', { delayInMinutes: useMinutes });

      resolve({ success: true, rewardMinutes: useMinutes });
    });
  });
}

async function handlePauseReward() {
  if (!state.rewardActive || !state.rewardEndTime) {
    return { success: false, reason: 'No active reward to pause' };
  }

  const remaining = Math.max(0, Math.floor((state.rewardEndTime - Date.now()) / 1000));
  state.rewardRemainingSeconds = remaining;
  state.rewardPaused = true;
  state.rewardActive = false;
  state.rewardEndTime = null;
  saveState();

  chrome.alarms.clear('rewardExpired');
  await blockSites();

  // Close all tabs on blocked domains (no shame increment)
  await closeBlockedTabs();

  return { success: true, remainingSeconds: remaining };
}

async function handleResumeReward() {
  if (!state.rewardPaused || state.rewardRemainingSeconds <= 0) {
    return { success: false, reason: 'No paused reward to resume' };
  }

  const remainingMinutes = state.rewardRemainingSeconds / 60;
  state.rewardEndTime = Date.now() + (state.rewardRemainingSeconds * 1000);
  state.rewardActive = true;
  state.rewardPaused = false;
  state.rewardRemainingSeconds = 0;
  saveState();

  await unblockSites();

  chrome.alarms.create('rewardExpired', { delayInMinutes: remainingMinutes });

  return { success: true, remainingMinutes };
}

// Close all tabs whose URL matches blocked sites
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
    if (state.sessionActive && state.sessionStartTime) {
      // Flush productive time if currently on productive site
      if (state.isOnProductiveSite && state.lastProductiveTick) {
        const now = Date.now();
        const elapsed = Math.floor((now - state.lastProductiveTick) / 1000);
        state.productiveSeconds += Math.max(0, elapsed);
        state.lastProductiveTick = now;
        saveState();
      }

      // Also re-check current tab in case something changed
      await checkCurrentTab();

      if (state.productiveSeconds >= state.workMinutes * 60) {
        await handleCompleteSession();
        chrome.runtime.sendMessage({ action: 'sessionCompleted' }).catch(() => {});
      }
    }
  }

  if (alarm.name === 'rewardExpired') {
    // Close all tabs on blocked sites
    await closeBlockedTabs();

    state.rewardActive = false;
    state.rewardEndTime = null;
    state.rewardPaused = false;
    state.rewardRemainingSeconds = 0;
    saveState();
    await blockSites();
    chrome.runtime.sendMessage({ action: 'rewardExpired' }).catch(() => {});
  }
});

async function blockSites() {
  const result = await new Promise(r => chrome.storage.local.get(['rewardSites', 'allowedPaths'], r));
  const sites = result.rewardSites || ['youtube.com'];
  const allowedPaths = result.allowedPaths || [];

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map(r => r.id);

  // Block rules at priority 1 (domain-level)
  const blockRules = sites
    .map(s => s.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, ''))
    .filter(s => s.length > 0)
    .map((site, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
      condition: { requestDomains: [site], resourceTypes: ['main_frame'] },
    }));

  // Allow rules at priority 2 (path-level exceptions override domain blocks)
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
  console.log(`[FocusContract] Blocked ${addRules.length} sites:`, sites);
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
