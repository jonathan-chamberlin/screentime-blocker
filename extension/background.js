// Brainrot Blocker Background Service Worker — orchestrator
// Loads all modules via importScripts (global scope shared across files)
importScripts(
  'constants.js',
  'storage.js',
  'timer.js',
  'site-utils.js',
  'session-state.js',
  'blocking.js',
  'nuclear-block.js',
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
      startRewardCheckInterval();
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
  const companionResult = await getStorage(['companionMode']);
  const companionMode = companionResult.companionMode || DEFAULTS.companionMode;
  setCompanionModeEnabled(companionMode === 'on');

  // Always apply nuclear block rules on startup
  await applyNuclearRules();

  // Periodic nuclear expiry check — runs every minute regardless of session state
  chrome.alarms.create('checkNuclear', { periodInMinutes: 1 });
})();

// --- Reward threshold check interval ---
// Check every 1 second if work threshold crossed (prevents 15-second delay)
let rewardCheckInterval = null;

function startRewardCheckInterval() {
  stopRewardCheckInterval();
  rewardCheckInterval = setInterval(async () => {
    if (state.sessionActive && !state.rewardActive) {
      const nextThreshold = state.workMinutes * 60 * 1000 * (state.rewardGrantCount + 1);
      if (state.productiveMillis >= nextThreshold) {
        await checkAndGrantReward();
      }
    }
  }, 1000);
}

function stopRewardCheckInterval() {
  if (rewardCheckInterval) {
    clearInterval(rewardCheckInterval);
    rewardCheckInterval = null;
  }
}

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
        ? snapshotSeconds(state.isOnProductiveSite, state.lastProductiveTick, state.productiveMillis)
        : Math.floor(state.productiveMillis / 1000);

      let rewardRemainingSeconds = 0;
      if (state.rewardActive) {
        const burned = snapshotSeconds(state.isOnRewardSite, state.lastRewardTick, state.rewardBurnedMillis);
        rewardRemainingSeconds = Math.max(0, Math.floor(state.rewardTotalMillis / 1000) - burned);
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
        companionMode: companionModeEnabled ? 'on' : 'off',
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
  setCompanionMode: (msg, sender, sendResponse) => {
    const mode = msg.mode === 'on' ? 'on' : 'off';
    setStorage({ companionMode: mode }).then(() => {
      setCompanionModeEnabled(mode === 'on');
      sendResponse({ success: true, companionMode: mode });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  },
  syncSettingsToBackend: (msg, sender, sendResponse) => {
    pushSettingsToBackend().then(sendResponse).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  },
  pullSettingsFromBackend: (msg, sender, sendResponse) => {
    pullSettingsFromBackend().then(sendResponse).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  },
  deleteAllData: (msg, sender, sendResponse) => {
    (async () => {
      try {
        stopRewardCheckInterval();
        stopRewardCountdown();
        await chrome.alarms.clear('checkSession');
        await unblockSites();
        setCompanionModeEnabled(false);

        // Preserve nuclear block data — it survives Delete All Data intentionally
        const savedNbData = await getNuclearData();

        state = {
          sessionActive: false,
          sessionId: null,
          sessionStartTime: null,
          rewardActive: false,
          blockedAttempts: 0,
          productiveMillis: 0,
          lastProductiveTick: null,
          isOnProductiveSite: false,
          rewardGrantCount: 0,
          rewardTotalMillis: 0,
          rewardBurnedMillis: 0,
          isOnRewardSite: false,
          lastRewardTick: null,
          workMinutes: DEFAULTS.workMinutes,
          rewardMinutes: DEFAULTS.rewardMinutes,
        };

        await new Promise((resolve) => chrome.storage.local.clear(resolve));
        await setStorage({ focusState: state });

        // Restore nuclear block data and re-apply rules
        if (savedNbData && savedNbData.sites && savedNbData.sites.length > 0) {
          await setStorage({ nbData: savedNbData });
          await applyNuclearRules();
        }

        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  },
  getNuclearData: (msg, sender, sendResponse) => {
    getNuclearData().then(sendResponse);
    return true;
  },
  applyNuclearRules: (msg, sender, sendResponse) => {
    applyNuclearRules().then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  addNuclearSite: (msg, sender, sendResponse) => {
    addNuclearSite(msg.entry).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  clickUnblockNuclear: (msg, sender, sendResponse) => {
    clickUnblockNuclear(msg.id).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  blockAgainNuclear: (msg, sender, sendResponse) => {
    blockAgainNuclear(msg.id, msg.cooldown1Ms).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  removeNuclearSite: (msg, sender, sendResponse) => {
    removeNuclearSite(msg.id).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  openSettings: (msg, sender, sendResponse) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    sendResponse({ success: true });
    return false;
  },
  blockedAppDetected: (msg, sender, sendResponse) => {
    if (state.sessionActive) {
      state.blockedAttempts++;
      saveState();

      // Redirect active tab to blocked page
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, {
            url: chrome.runtime.getURL('blocked.html?app=' + encodeURIComponent(msg.appName))
          });
        }
      });

      notifyBackend('blocked-attempt', { session_id: state.sessionId, app: msg.appName });
    }
    sendResponse({ success: true });
    return false;
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.action];
  if (!handler) return false;
  return handler(message, sender, sendResponse);
});

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkNuclear') {
    await applyNuclearRules();
  }

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

      if (state.rewardBurnedMillis >= state.rewardTotalMillis) {
        await handleRewardExpired();
      }
    }

    if (!state.sessionActive && !state.rewardActive) {
      chrome.alarms.clear('checkSession');
    }
  }
});
