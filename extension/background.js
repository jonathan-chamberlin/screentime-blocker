// FocusContract Background Service Worker
const API_BASE_URL = 'http://localhost:3000';

// Session state
let state = {
  sessionActive: false,
  sessionId: null,
  sessionStartTime: null,
  rewardActive: false,
  rewardEndTime: null,
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
  }
});

function saveState() {
  chrome.storage.local.set({ focusState: state });
}

// Listen for messages from popup
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
  if (message.action === 'getStatus') {
    chrome.storage.local.get(['todayMinutes', 'unusedRewardMinutes'], (result) => {
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
      });
    });
    return true; // async response
  }
  if (message.action === 'updateSettings') {
    state.workMinutes = message.workMinutes || state.workMinutes;
    state.rewardMinutes = message.rewardMinutes || state.rewardMinutes;
    saveState();
    sendResponse({ success: true });
    return false;
  }
});

async function handleStartSession() {
  state.sessionId = crypto.randomUUID();
  state.sessionActive = true;
  state.sessionStartTime = Date.now();
  saveState();

  await blockSites();

  // Notify backend (fire-and-forget)
  notifyBackend('start', { session_id: state.sessionId });

  // Set alarm to check session completion
  chrome.alarms.create('checkSession', { periodInMinutes: 0.25 }); // check every 15 sec

  return { success: true, sessionId: state.sessionId };
}

async function handleEndSession(confirmed) {
  if (!confirmed) {
    // Return penalty info so popup can show confirmation
    return {
      needsConfirmation: true,
      elapsedMinutes: Math.floor((Date.now() - state.sessionStartTime) / 60000),
    };
  }

  const minutesCompleted = Math.floor((Date.now() - state.sessionStartTime) / 60000);

  // Update today's minutes
  chrome.storage.local.get(['todayMinutes'], (result) => {
    chrome.storage.local.set({ todayMinutes: (result.todayMinutes || 0) + minutesCompleted });
  });

  // Notify backend
  notifyBackend('end', {
    session_id: state.sessionId,
    minutes_completed: minutesCompleted,
    ended_early: true,
  });

  state.sessionActive = false;
  state.sessionId = null;
  state.sessionStartTime = null;
  saveState();

  await unblockSites();
  chrome.alarms.clear('checkSession');

  return { success: true, endedEarly: true, minutesCompleted };
}

async function handleCompleteSession() {
  const minutesCompleted = state.workMinutes;

  // Grant reward minutes
  chrome.storage.local.get(['todayMinutes', 'unusedRewardMinutes'], (result) => {
    chrome.storage.local.set({
      todayMinutes: (result.todayMinutes || 0) + minutesCompleted,
      unusedRewardMinutes: (result.unusedRewardMinutes || 0) + state.rewardMinutes,
    });
  });

  // Notify backend
  notifyBackend('end', {
    session_id: state.sessionId,
    minutes_completed: minutesCompleted,
    ended_early: false,
  });

  state.sessionActive = false;
  state.sessionId = null;
  state.sessionStartTime = null;
  saveState();

  await unblockSites();
  chrome.alarms.clear('checkSession');

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

      // Use all available reward minutes (or could be configurable)
      const useMinutes = Math.min(available, state.rewardMinutes);
      state.rewardActive = true;
      state.rewardEndTime = Date.now() + (useMinutes * 60000);
      saveState();

      chrome.storage.local.set({ unusedRewardMinutes: available - useMinutes });

      await unblockSites();

      // Set alarm to re-block when reward expires
      chrome.alarms.create('rewardExpired', { delayInMinutes: useMinutes });

      resolve({ success: true, rewardMinutes: useMinutes });
    });
  });
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkSession') {
    if (state.sessionActive && state.sessionStartTime) {
      const elapsed = (Date.now() - state.sessionStartTime) / 60000;
      if (elapsed >= state.workMinutes) {
        // Session complete! Auto-complete it
        await handleCompleteSession();
        // Notify any open popup
        chrome.runtime.sendMessage({ action: 'sessionCompleted' }).catch(() => {});
      }
    }
  }

  if (alarm.name === 'rewardExpired') {
    state.rewardActive = false;
    state.rewardEndTime = null;
    saveState();
    await blockSites();
    chrome.runtime.sendMessage({ action: 'rewardExpired' }).catch(() => {});
  }
});

async function blockSites() {
  // For now hardcode youtube.com — will be dynamic from settings in Phase 3
  const rules = [
    {
      id: 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
      condition: { urlFilter: '||youtube.com', resourceTypes: ['main_frame'] },
    },
  ];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map(r => r.id),
    addRules: rules,
  });
}

async function unblockSites() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [],
  });
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
      const endpoint = type === 'start' ? '/session/start' : '/session/end';
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
