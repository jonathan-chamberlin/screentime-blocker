// Brainrot Blocker Background Service Worker — orchestrator
// Loads all modules via importScripts (global scope shared across files)
importScripts(
  'constants.js',
  'list-utils.js',
  'storage.js',
  'timer.js',
  'site-utils.js',
  'session-state.js',
  'blocking.js',
  'scheduler.js',
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
  }

  // Migrate break lists on startup (one-time migration for lists without mode field)
  const listsResult = await getStorage(['breakLists']);
  if (listsResult.breakLists) {
    const migrated = migrateBreakLists(listsResult.breakLists);
    const needsSave = migrated.some((l, i) => l.mode !== (listsResult.breakLists[i] && listsResult.breakLists[i].mode));
    if (needsSave) await setStorage({ breakLists: migrated });
  }

  // Evaluate scheduler to apply correct blocking rules based on modes
  await evaluateScheduler();

  // Restore session/reward-specific state after scheduler has set base rules
  if (state.sessionActive && state.sessionStartTime) {
    checkCurrentTab();
    chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
    startRewardCheckInterval();
  }
  // evaluateScheduler() above handles auto-session start for always-on/scheduled blocking
  if (state.rewardActive) {
    await unblockSites(); // Reward overrides all session-level blocking
    checkCurrentTab();
    chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
    startRewardCountdown();
  }

  const companionResult = await getStorage(['companionMode']);
  const companionMode = companionResult.companionMode || DEFAULTS.companionMode;
  setCompanionModeEnabled(companionMode === 'on');

  // Always apply nuclear block rules on startup
  await applyNuclearRules();

  // Periodic alarms
  chrome.alarms.create('checkNuclear', { periodInMinutes: 1 });
  chrome.alarms.create('evaluateScheduler', { periodInMinutes: ALARM_PERIOD_MINUTES });
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

      const trackingActive = state.sessionActive || isCurrentlyBlocking();
      const currentProductiveSeconds = trackingActive
        ? snapshotSeconds(state.isOnProductiveSite, state.lastProductiveTick, state.productiveMillis)
        : Math.floor(state.productiveMillis / 1000);

      let rewardRemainingSeconds = 0;
      if (state.rewardActive) {
        const burned = snapshotSeconds(state.isOnRewardSite, state.lastRewardTick, state.rewardBurnedMillis);
        rewardRemainingSeconds = Math.max(0, Math.floor(state.rewardTotalMillis / 1000) - burned);
      }

      sendResponse({
        sessionActive: state.sessionActive,
        autoSession: state.autoSession,
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime,
        workMinutes: state.workMinutes,
        rewardMinutes: state.rewardMinutes,
        rewardActive: state.rewardActive,
        blocking: isCurrentlyBlocking(),
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
      const domain = msg.domain || 'unknown';
      if (domain !== 'unknown') {
        state.blockedDomainsMap[domain] = (state.blockedDomainsMap[domain] || 0) + 1;
      }
      saveState();
      notifyBackend('blocked-attempt', { session_id: state.sessionId });
    }
    sendResponse({ success: true });
    return false;
  },
  updateRewardSites: (msg, sender, sendResponse) => {
    evaluateScheduler().then(() => sendResponse({ success: true }));
    return true;
  },
  addToBlockedSites: (msg, sender, sendResponse) => {
    (async () => {
      try {
        const result = await getStorage(['breakLists']);
        const breakLists = result.breakLists || DEFAULTS.breakLists;
        // Add to first active break list (or default)
        const targetList = breakLists.find(l => l.isActive) || breakLists[0];
        if (targetList && !targetList.sites.includes(msg.site)) {
          targetList.sites.push(msg.site);
          await setStorage({ breakLists });
        }
        await evaluateScheduler();
        if (state.sessionActive) {
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
        setCompanionModeEnabled(false);

        // Preserve data that survives Delete All Data intentionally
        const savedNbData = await getNuclearData();
        const savedLists = await getStorage(['breakLists', 'productiveLists']);

        state = {
          sessionActive: false,
          autoSession: false,
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

        // Restore break lists and productive lists
        if (savedLists.breakLists) await setStorage({ breakLists: savedLists.breakLists });
        if (savedLists.productiveLists) await setStorage({ productiveLists: savedLists.productiveLists });

        await evaluateScheduler();
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  },
  deleteAnalytics: (msg, sender, sendResponse) => {
    (async () => {
      try {
        await setStorage({
          sessionHistory: [],
          dailySummaries: {},
          streakData: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
          todayMinutes: 0,
          unusedRewardSeconds: 0,
        });
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
  addNuclearException: (msg, sender, sendResponse) => {
    addNuclearException(msg.id, msg.exception).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
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
  confirmUnblockNuclear: (msg, sender, sendResponse) => {
    confirmUnblockNuclear(msg.id).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  removeNuclearSite: (msg, sender, sendResponse) => {
    removeNuclearSite(msg.id).then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  },
  getSchedulerStatus: (msg, sender, sendResponse) => {
    const cache = getSchedulerCache();
    sendResponse({
      blockingListIds: Array.from(cache.blockingListIds),
      blockingSites: cache.blockingSites,
      blockingApps: cache.blockingApps,
    });
    return false;
  },
  recheckCurrentTab: (msg, sender, sendResponse) => {
    checkCurrentTab().then(() => sendResponse({ success: true }));
    return true;
  },
  evaluateScheduler: (msg, sender, sendResponse) => {
    evaluateScheduler().then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
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
  if (alarm.name === 'checkNuclear' || alarm.name === 'nuclearRuleRefresh') {
    await applyNuclearRules();
  }

  if (alarm.name === 'evaluateScheduler') {
    await evaluateScheduler();
    // Ensure checkSession alarm runs when blocking is active (for productive time tracking)
    if (isCurrentlyBlocking() || state.sessionActive || state.rewardActive) {
      chrome.alarms.get('checkSession', (existing) => {
        if (!existing) chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
      });
    }
  }

  if (alarm.name === 'checkSession') {
    const blocking = isCurrentlyBlocking();

    if (state.sessionActive || blocking) {
      flushProductive();
      saveState();

      if (browserHasFocus) {
        await checkCurrentTab();
      } else {
        const isProductive = await isProductiveApp(currentAppName);
        updateProductiveState(isProductive);
      }

      if (state.sessionActive) await checkAndGrantReward();
    }

    if (state.rewardActive) {
      flushReward();
      saveState();

      if (state.rewardBurnedMillis >= state.rewardTotalMillis) {
        await handleRewardExpired();
      }
    }

    if (!state.sessionActive && !state.rewardActive && !blocking) {
      chrome.alarms.clear('checkSession');
    }
  }
});
