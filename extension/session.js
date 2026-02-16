// Session handlers — starting and ending work sessions
// Depends on: session-state.js (state, saveState, flushProductive, resetSessionState),
//             blocking.js (blockSites, unblockSites, redirectBlockedTabs),
//             tab-monitor.js (checkCurrentTab), backend-api.js (notifyBackend),
//             reward.js (bankActiveReward), storage.js

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
  // Subscribers: settings.js:173 (lockSiteSections)
  chrome.runtime.sendMessage({ action: 'sessionStarted' }).catch(() => {});

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

  if (state.rewardActive) await bankActiveReward();
  resetSessionState();
  saveState();

  await unblockSites();
  chrome.alarms.clear('checkSession');
  await setStorage({ shameLevel: 0 });
  chrome.action.setBadgeText({ text: '' });
  // Subscribers: settings.js:174 (lockSiteSections)
  chrome.runtime.sendMessage({ action: 'sessionEnded' }).catch(() => {});

  return { success: true, endedEarly: true, minutesCompleted };
}
