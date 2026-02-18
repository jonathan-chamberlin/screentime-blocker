// Tab monitoring — tracks active tab and updates productive/reward state
// Depends on: session-state.js (state, saveState, flushProductive, flushReward),
//             site-utils.js, storage.js, native-host.js (isProductiveApp, browserHasFocus, currentAppName)

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
        updateProductiveState(true);
      } else if (mode === 'all-except-blocked') {
        const isProductive = !urlMatchesSites(tab.url, blockedSites);
        updateProductiveState(isProductive);
      } else {
        const productiveSites = result.productiveSites || DEFAULTS.productiveSites;
        const isProductive = urlMatchesSites(tab.url, productiveSites);
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

  if (state.rewardActive && state.rewardBurnedMillis >= state.rewardTotalMillis) {
    handleRewardExpired();
  }
}

function updateBadge(isActive) {
  if (!isActive && (state.sessionActive || state.rewardActive)) {
    chrome.action.setBadgeText({ text: '\u23F8' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff4757' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// --- Tab/window event listeners ---

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
        // If user switched to a blocked app, keep burning break time; otherwise pause
        isBlockedApp(currentAppName).then(isBlocked => updateRewardState(isBlocked));
      }
    } else {
      checkCurrentTab();
    }
  }
});
