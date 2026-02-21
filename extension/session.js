// Session handlers — starting and ending work sessions
// Depends on: session-state.js (state, saveState, flushProductive, resetSessionState),
//             scheduler.js (evaluateScheduler), blocking.js (redirectBlockedTabs),
//             tab-monitor.js (checkCurrentTab), backend-api.js (notifyBackend),
//             reward.js (bankActiveReward), storage.js

async function handleStartSession() {
  state.sessionId = crypto.randomUUID();
  state.sessionActive = true;
  state.sessionStartTime = Date.now();
  state.productiveMillis = 0;
  state.lastProductiveTick = Date.now();
  state.isOnProductiveSite = false;
  state.rewardGrantCount = 0;
  state.blockedAttempts = 0;
  state.blockedDomainsMap = {};
  saveState();

  await evaluateScheduler();
  await redirectBlockedTabs();
  await checkCurrentTab();

  notifyBackend('start', { session_id: state.sessionId });
  chrome.alarms.create('checkSession', { periodInMinutes: ALARM_PERIOD_MINUTES });
  startRewardCheckInterval();
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
      elapsedMinutes: Math.floor(state.productiveMillis / 1000 / 60),
    };
  }

  flushProductive();
  const minutesCompleted = Math.floor(state.productiveMillis / 1000 / 60);
  const endedEarly = state.rewardGrantCount < 1;

  const todayResult = await getStorage(['todayMinutes']);
  await setStorage({ todayMinutes: (todayResult.todayMinutes || 0) + minutesCompleted });

  notifyBackend('end', {
    session_id: state.sessionId,
    minutes_completed: minutesCompleted,
    ended_early: endedEarly,
    blocked_attempts: state.blockedAttempts,
  });

  await saveSessionRecord({
    sessionId: state.sessionId,
    startTime: state.sessionStartTime,
    endTime: Date.now(),
    workMinutes: state.workMinutes,
    rewardMinutes: state.rewardMinutes,
    productiveMillis: state.productiveMillis,
    blockedAttempts: state.blockedAttempts,
    blockedDomains: { ...state.blockedDomainsMap },
    rewardGrantCount: state.rewardGrantCount,
    endedEarly,
  });

  if (state.rewardActive) await bankActiveReward();
  resetSessionState();
  saveState();

  await evaluateScheduler();
  chrome.alarms.clear('checkSession');
  stopRewardCheckInterval();
  await setStorage({ shameLevel: 0 });
  chrome.action.setBadgeText({ text: '' });
  // Subscribers: settings.js:174 (lockSiteSections)
  chrome.runtime.sendMessage({ action: 'sessionEnded' }).catch(() => {});

  return { success: true, endedEarly, minutesCompleted };
}

async function saveSessionRecord(record) {
  const result = await getStorage(['sessionHistory', 'dailySummaries', 'streakData']);
  const history = result.sessionHistory || [];
  history.push(record);

  // Update daily summary
  const summaries = result.dailySummaries || {};
  const dateKey = new Date(record.endTime).toLocaleDateString('en-CA'); // YYYY-MM-DD
  const day = summaries[dateKey] || {
    date: dateKey,
    totalProductiveMinutes: 0,
    sessionsCompleted: 0,
    sessionsEndedEarly: 0,
    totalBlockedAttempts: 0,
    blockedDomains: {},
  };
  day.totalProductiveMinutes += Math.floor(record.productiveMillis / 1000 / 60);
  day.sessionsCompleted++;
  if (record.endedEarly) day.sessionsEndedEarly++;
  day.totalBlockedAttempts += record.blockedAttempts;
  for (const [domain, count] of Object.entries(record.blockedDomains || {})) {
    day.blockedDomains[domain] = (day.blockedDomains[domain] || 0) + count;
  }
  summaries[dateKey] = day;

  // Update streak (only completed sessions count)
  const streak = result.streakData || { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  if (!record.endedEarly) {
    const today = new Date(record.endTime).toLocaleDateString('en-CA');
    if (streak.lastActiveDate !== today) {
      const yesterday = new Date(record.endTime - 86400000).toLocaleDateString('en-CA');
      if (streak.lastActiveDate === yesterday) {
        streak.currentStreak++;
      } else {
        streak.currentStreak = 1;
      }
      streak.lastActiveDate = today;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    }
  }

  await setStorage({ sessionHistory: history, dailySummaries: summaries, streakData: streak });
}
