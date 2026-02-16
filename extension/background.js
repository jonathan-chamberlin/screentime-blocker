// Brainrot Blocker Background Service Worker — orchestrator
// Loads all modules via importScripts (global scope shared across files)
importScripts(
  'constants.js',
  'storage.js',
  'timer.js',
  'site-utils.js',
  'session-state.js',
  'blocking.js',
  'native-host.js',
  'backend-api.js',
  'tab-monitor.js',
  'reward.js',
  'session.js'
);

// --- Startup: restore persisted state ---

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
      startRewardCountdown();
    }
    if (!state.sessionActive && !state.rewardActive) {
      unblockSites();
    }
  }
  connectNativeHost();
})();

// --- Message routing ---
// Each handler returns true (async response) or false (sync response)

const messageHandlers = {
  startSession: (msg, sender, sendResponse) => {
    handleStartSession().then(sendResponse);
    return true;
  },
  endSession: (msg, sender, sendResponse) => {
    handleEndSession(msg.confirmed).then(sendResponse);
    return true;
  },
  useReward: (msg, sender, sendResponse) => {
    handleUseReward().then(sendResponse);
    return true;
  },
  pauseReward: (msg, sender, sendResponse) => {
    handlePauseReward().then(sendResponse);
    return true;
  },
  getNativeHostStatus: (msg, sender, sendResponse) => {
    sendResponse({ available: nativeHostAvailable });
    return false;
  },
  getStatus: (msg, sender, sendResponse) => {
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
  },
  updateSettings: (msg, sender, sendResponse) => {
    state.workMinutes = msg.workMinutes || state.workMinutes;
    state.rewardMinutes = msg.rewardMinutes || state.rewardMinutes;
    saveState();
    sendResponse({ success: true });
    return false;
  },
  blockedPageLoaded: (msg, sender, sendResponse) => {
    if (state.sessionActive) {
      state.blockedAttempts++;
      saveState();
      notifyBackend('blocked-attempt', { session_id: state.sessionId });
    }
    sendResponse({ success: true });
    return false;
  },
  updateRewardSites: (msg, sender, sendResponse) => {
    if (state.sessionActive) {
      blockSites().then(() => sendResponse({ success: true }));
      return true;
    }
    sendResponse({ success: true });
    return false;
  },
  addToBlockedSites: (msg, sender, sendResponse) => {
    (async () => {
      try {
        const result = await getStorage(['rewardSites']);
        const sites = result.rewardSites || DEFAULTS.rewardSites;
        if (!sites.includes(msg.site)) {
          sites.push(msg.site);
          await setStorage({ rewardSites: sites });
        }
        if (state.sessionActive) {
          await blockSites();
          await redirectBlockedTabs();
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.action];
  if (!handler) return false;
  return handler(message, sender, sendResponse);
});

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkSession') {
    if (state.sessionActive) {
      flushProductive();
      saveState();

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
        await handleRewardExpired();
      }
    }

    if (!state.sessionActive && !state.rewardActive) {
      chrome.alarms.clear('checkSession');
    }
  }
});
