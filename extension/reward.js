// Reward handlers — earning, using, pausing, and expiring break time
// Depends on: session-state.js (state, saveState, flushReward), storage.js,
//             blocking.js (blockSites, unblockSites, redirectBlockedTabs),
//             tab-monitor.js (checkCurrentTab)

async function checkAndGrantReward() {
  const nextThreshold = state.workMinutes * 60 * 1000 * (state.rewardGrantCount + 1);
  if (state.productiveMillis >= nextThreshold) {
    state.rewardGrantCount++;
    saveState();

    const result = await getStorage(['todayMinutes', 'unusedRewardSeconds']);
    await setStorage({
      todayMinutes: (result.todayMinutes || 0) + state.workMinutes,
      unusedRewardSeconds: (result.unusedRewardSeconds || 0) + state.rewardMinutes * 60,
    });

    // Subscribers: popup.js:358 (showConfetti + poll)
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
  state.rewardTotalMillis = availableSeconds * 1000;
  state.rewardBurnedMillis = 0;
  state.isOnRewardSite = false;
  state.lastRewardTick = Date.now();
  saveState();

  await setStorage({ unusedRewardSeconds: 0 });
  await unblockSites();
  chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
  await checkCurrentTab();
  startRewardCountdown();

  return { success: true, rewardSeconds: availableSeconds };
}

async function handlePauseReward() {
  if (!state.rewardActive) {
    return { success: false, reason: 'No active reward to pause' };
  }

  flushReward();

  const remainingMillis = Math.max(0, state.rewardTotalMillis - state.rewardBurnedMillis);
  const remainingSeconds = Math.floor(remainingMillis / 1000);
  if (remainingSeconds > 0) {
    const cur = await getStorage(['unusedRewardSeconds']);
    await setStorage({ unusedRewardSeconds: (cur.unusedRewardSeconds || 0) + remainingSeconds });
  }

  state.rewardActive = false;
  state.isOnRewardSite = false;
  state.lastRewardTick = null;
  state.rewardTotalMillis = 0;
  state.rewardBurnedMillis = 0;
  saveState();
  stopRewardCountdown();

  if (state.sessionActive) {
    setTimeout(() => {
      blockSites().catch(e => console.log('[handlePauseReward] blockSites error:', e));
      redirectBlockedTabs('reward-paused').catch(e => console.log('[handlePauseReward] redirect error:', e));
    }, 0);
  }

  return { success: true, bankedSeconds: remainingSeconds };
}

// --- Reward expiry ---

async function handleRewardExpired() {
  state.rewardActive = false;
  state.rewardTotalMillis = 0;
  state.rewardBurnedMillis = 0;
  state.isOnRewardSite = false;
  state.lastRewardTick = null;
  saveState();
  chrome.action.setBadgeText({ text: '' });
  await blockSites();
  await redirectBlockedTabs('reward-expired');
  // Subscribers: popup.js:361 (poll)
  chrome.runtime.sendMessage({ action: 'rewardExpired' }).catch(() => {});
  stopRewardCountdown();
}

// Bank remaining reward time back to storage (used when ending session with active reward)
async function bankActiveReward() {
  flushReward();
  const remainingMillis = Math.max(0, state.rewardTotalMillis - state.rewardBurnedMillis);
  const remainingSec = Math.floor(remainingMillis / 1000);
  if (remainingSec > 0) {
    const cur = await getStorage(['unusedRewardSeconds']);
    await setStorage({ unusedRewardSeconds: (cur.unusedRewardSeconds || 0) + remainingSec });
  }
  state.rewardActive = false;
  state.rewardTotalMillis = 0;
  state.rewardBurnedMillis = 0;
  state.isOnRewardSite = false;
  state.lastRewardTick = null;
  stopRewardCountdown();
}

// --- Reward countdown interval ---

let rewardCountdownInterval = null;

function startRewardCountdown() {
  stopRewardCountdown();
  rewardCountdownInterval = setInterval(() => {
    if (!state.rewardActive) { stopRewardCountdown(); return; }
    flushReward();
    saveState();
    if (state.rewardBurnedMillis >= state.rewardTotalMillis) {
      handleRewardExpired();
    }
  }, 1000);
}

function stopRewardCountdown() {
  if (rewardCountdownInterval) {
    clearInterval(rewardCountdownInterval);
    rewardCountdownInterval = null;
  }
}
