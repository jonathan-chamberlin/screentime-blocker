// Popup UI — main extension popup
// Depends on: constants.js (APP_NAME, DEFAULTS), storage.js, auth.js (Auth), config.js/config.default.js (CONFIG)

// --- Pure helpers (no DOM dependency) ---

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStreakTitle(minutes) {
  if (minutes === 0) return 'Certified Couch Goblin';
  if (minutes < 50) return 'Mildly Functional Human';
  if (minutes < 150) return 'Productivity Padawan';
  if (minutes < 300) return 'Focus Sensei';
  return 'Productivity Demigod';
}

function getStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      resolve(response || {});
    });
  });
}

function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#00ff88', '#f093fb', '#ffaa00', '#ff4757', '#667eea', '#f5576c'];
  for (let i = 0; i < 60; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    container.appendChild(confetti);
  }

  setTimeout(() => document.body.removeChild(container), 3500);
}

async function syncUserProfile(token) {
  if (!CONFIG.AUTH0_DOMAIN || !CONFIG.API_BASE_URL) return;
  try {
    const userInfoRes = await fetch(`https://${CONFIG.AUTH0_DOMAIN}/userinfo`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      await fetch(`${CONFIG.API_BASE_URL}/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: userInfo.name || userInfo.nickname || userInfo.email,
          pictureUrl: userInfo.picture || null,
        }),
      });
    }
  } catch (err) {
    console.log('Profile sync failed:', err.message);
  }
}

// --- DOM element references (populated in init) ---

const el = {};
let statusPollInterval = null;
let currentStatus = null;
let strictMode = false;

// --- Render functions ---

function renderStats(status) {
  el.todayMinutes.textContent = status.todayMinutes || 0;
  el.rewardBalance.textContent = formatTime(status.unusedRewardSeconds || 0);
  el.streakTitle.textContent = getStreakTitle(status.todayMinutes || 0);
}

function renderInputLock(status) {
  const locked = status.sessionActive || status.rewardActive;
  el.workInput.disabled = locked;
  el.rewardInput.disabled = locked;
}

function showEndButton(status) {
  el.btnEnd.style.display = 'block';
  const thresholdMet = (status.rewardGrantCount || 0) >= 1;
  el.btnEnd.textContent = thresholdMet ? 'End Session' : 'Quit Early (coward)';
  if (strictMode && !thresholdMet) {
    el.btnEnd.disabled = true;
    el.btnEnd.title = 'Complete your work threshold to unlock';
  } else {
    el.btnEnd.disabled = false;
    el.btnEnd.title = '';
  }
}

function renderTimer(status) {
  if (status.rewardActive) {
    const remaining = status.rewardRemainingSeconds || 0;
    el.timerDisplay.textContent = formatTime(remaining);
    if (status.isOnRewardSite) {
      el.timerSection.className = 'timer-section reward';
      el.timerLabel.textContent = 'break time remaining';
    } else {
      el.timerSection.className = 'timer-section paused';
      el.timerLabel.textContent = 'break paused \u2014 visit a blocked site to use your break';
    }
  } else if (status.sessionActive) {
    const productiveSec = status.productiveSeconds || 0;
    el.timerDisplay.textContent = formatTime(productiveSec);

    const goalSec = (status.workMinutes || DEFAULTS.workMinutes) * 60;
    const nextThreshold = goalSec * ((status.rewardGrantCount || 0) + 1);
    const remainingSec = Math.max(0, nextThreshold - productiveSec);
    const remainingMin = Math.ceil(remainingSec / 60);

    if (status.isOnProductiveSite) {
      el.timerSection.className = 'timer-section active';
      const appSuffix = status.currentAppName ? ` (${status.currentAppName})` : '';
      el.timerLabel.textContent = `${remainingMin} min until you earn a break${appSuffix}`;
    } else {
      el.timerSection.className = 'timer-section paused';
      el.timerLabel.textContent = 'timer paused \u2014 open a productive site or app to resume';
    }
  } else {
    el.timerSection.className = 'timer-section';
    el.timerDisplay.textContent = '00:00';
    el.timerLabel.textContent = 'ready when you are';
  }
}

function renderButtons(status) {
  el.btnStart.style.display = 'none';
  el.btnEnd.style.display = 'none';
  el.btnReward.style.display = 'none';
  el.btnPause.style.display = 'none';

  if (status.rewardActive) {
    el.btnPause.style.display = 'block';
    if (status.sessionActive) showEndButton(status);
  } else if (status.sessionActive) {
    showEndButton(status);
    if ((status.unusedRewardSeconds || 0) > 0) {
      el.btnReward.style.display = 'block';
      if ((status.rewardGrantCount || 0) === 0) {
        el.btnReward.disabled = true;
        el.btnReward.title = 'Finish your first work cycle to unlock break time';
      } else {
        el.btnReward.disabled = false;
        el.btnReward.title = '';
      }
    }
  } else {
    el.btnStart.textContent = 'Lock In';
    el.btnStart.style.display = 'block';
  }
}

function renderUI(status) {
  renderStats(status);
  renderInputLock(status);
  renderTimer(status);
  renderButtons(status);
  updateAuthUI();
}

async function updateAuthUI() {
  if (!Auth.isConfigured()) {
    el.authDot.className = 'auth-dot disconnected';
    el.authText.textContent = 'leaderboard offline';
    el.btnLogin.textContent = 'Leaderboard Not Configured';
    el.btnLogin.disabled = true;
    return;
  }

  const token = await Auth.getToken();
  if (token) {
    el.authDot.className = 'auth-dot connected';
    el.authText.textContent = 'signed in';
    el.btnLogin.textContent = 'Sign Out';
  } else {
    el.authDot.className = 'auth-dot disconnected';
    el.authText.textContent = 'not signed in';
    el.btnLogin.textContent = 'Sign In for Leaderboard';
  }
}

// --- Polling ---

function startPolling() {
  stopPolling();
  poll();
  statusPollInterval = setInterval(poll, 1000);
}

function stopPolling() {
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
    statusPollInterval = null;
  }
}

async function poll() {
  const status = await getStatus();
  currentStatus = status;
  renderUI(status);
}

// --- Init: populate DOM refs, load settings, wire event listeners ---

document.addEventListener('DOMContentLoaded', async () => {
  if (CONFIG && typeof CONFIG.API_BASE_URL === 'string' && CONFIG.API_BASE_URL.trim()) {
    await setStorage({ apiBaseUrl: CONFIG.API_BASE_URL.trim() });
  }

  document.title = APP_NAME;
  document.querySelector('.brand h1').textContent = APP_NAME;

  // Populate element references
  el.timerSection = document.getElementById('timer-section');
  el.timerDisplay = document.getElementById('timer-display');
  el.timerLabel = document.getElementById('timer-label');
  el.workInput = document.getElementById('work-input');
  el.rewardInput = document.getElementById('reward-input');
  el.todayMinutes = document.getElementById('today-minutes');
  el.rewardBalance = document.getElementById('reward-balance');
  el.streakTitle = document.getElementById('streak-title');
  el.btnStart = document.getElementById('btn-start');
  el.btnEnd = document.getElementById('btn-end');
  el.btnReward = document.getElementById('btn-reward');
  el.btnPause = document.getElementById('btn-pause');
  el.btnLogin = document.getElementById('btn-login');
  el.btnLeaderboard = document.getElementById('btn-leaderboard');
  el.btnSettings = document.getElementById('btn-settings');
  el.btnReportLink = document.getElementById('btn-report-link');
  el.linkedinLink = document.getElementById('linkedin-link');
  el.authDot = document.getElementById('auth-dot');
  el.authText = document.getElementById('auth-text');
  el.penaltyModal = document.getElementById('penalty-modal');
  el.modalMinutes = document.getElementById('modal-minutes');
  el.modalPenalty = document.getElementById('modal-penalty');
  el.modalTarget = document.getElementById('modal-target');
  el.modalCancel = document.getElementById('modal-cancel');
  el.modalConfirm = document.getElementById('modal-confirm');

  // Load saved ratio values
  const saved = await getStorage(['workMinutes', 'rewardMinutes']);
  el.workInput.value = saved.workMinutes || DEFAULTS.workMinutes;
  el.rewardInput.value = saved.rewardMinutes || DEFAULTS.rewardMinutes;

  // Save ratio on change
  function saveRatio() {
    const workMinutes = parseInt(el.workInput.value, 10) || DEFAULTS.workMinutes;
    const rewardMinutes = parseInt(el.rewardInput.value, 10) || DEFAULTS.rewardMinutes;
    setStorage({ workMinutes, rewardMinutes });
    chrome.runtime.sendMessage({ action: 'updateSettings', workMinutes, rewardMinutes });
  }
  el.workInput.addEventListener('change', saveRatio);
  el.rewardInput.addEventListener('change', saveRatio);

  // Strict mode cache
  const strictResult = await getStorage(['strictMode']);
  strictMode = strictResult.strictMode === 'on';

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.strictMode) {
      strictMode = changes.strictMode.newValue === 'on';
    }
  });

  // Button handlers
  el.btnStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startSession' }, (response) => {
      if (response && response.success) {
        poll();
        startPolling();
      }
    });
  });

  el.btnEnd.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'endSession', confirmed: false }, async (response) => {
      if (response && response.success) {
        stopPolling();
        poll();
      } else if (response && response.needsConfirmation) {
        const elapsed = currentStatus ? Math.floor((currentStatus.productiveSeconds || 0) / 60) : 0;
        el.modalMinutes.textContent = elapsed;
        const config = await getStorage(['penaltyAmount', 'penaltyTarget', 'penaltyType', 'penaltyEnabled']);
        const penaltyOn = (config.penaltyEnabled || 'off') === 'on';
        const penaltyDetails = el.penaltyModal.querySelectorAll('.penalty-amount, #modal-target, .penalty-cost-line');
        if (penaltyOn) {
          const amount = config.penaltyAmount || 5;
          const target = config.penaltyTarget || 'charity';
          const type = config.penaltyType || 'Charity';
          el.modalPenalty.textContent = `$${amount.toFixed(2)}`;
          el.modalTarget.textContent = `to ${target} (${type})`;
          penaltyDetails.forEach(el => el.style.display = '');
        } else {
          penaltyDetails.forEach(el => el.style.display = 'none');
        }
        el.penaltyModal.classList.add('visible');
      }
    });
  });

  el.modalCancel.addEventListener('click', () => {
    el.penaltyModal.classList.remove('visible');
  });

  el.modalConfirm.addEventListener('click', () => {
    el.penaltyModal.classList.remove('visible');
    chrome.runtime.sendMessage({ action: 'endSession', confirmed: true }, (response) => {
      if (response && response.success) {
        stopPolling();
        poll();
      }
    });
  });

  el.btnReward.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'useReward' }, (response) => {
      if (response && response.success) {
        poll();
        startPolling();
      }
    });
  });

  el.btnPause.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseReward' }, (response) => {
      if (response && response.success) poll();
    });
  });

  el.btnLogin.addEventListener('click', async () => {
    const token = await Auth.getToken();
    if (token) {
      await Auth.logout();
    } else {
      try {
        const accessToken = await Auth.login();
        syncUserProfile(accessToken);
      } catch (err) {
        console.error('Login failed:', err.message);
        alert('Login failed: ' + err.message);
      }
    }
    poll();
  });

  const btnInfo = document.getElementById('btn-info');
  btnInfo.addEventListener('click', () => {
    chrome.tabs.create({ url: 'how-to.html' });
  });

  el.btnLeaderboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'leaderboard.html' });
  });

  const openSettings = () => chrome.tabs.create({ url: 'settings.html' });
  el.btnSettings.addEventListener('click', openSettings);

  el.btnReportLink.addEventListener('click', () => {
    const subject = 'Brainrot Blocker Report Bug / Suggest Improvement';
    const body = [
      'Describe the bug or improvement below:',
      'Insert here:',
      '',
      '',
      '─────────────────────────────',
      'Do not delete this diagnostic data:',
      `Browser: ${(() => {
        if (navigator.userAgentData) {
          const brand = navigator.userAgentData.brands.find(
            b => !b.brand.includes('Not') && b.brand !== 'Chromium'
          );
          if (brand) return `${brand.brand} ${brand.version}`;
        }
        return 'Unknown';
      })()}`,
      `OS: ${navigator.platform}`,
      `Screen: ${screen.width}x${screen.height}`,
      `Extension version: ${chrome.runtime.getManifest().version}`,
    ].join('\n');

    chrome.tabs.create({
      url: `mailto:jcham17x@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    });
  });

  el.linkedinLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://www.linkedin.com/in/jonathan-chamberlin-bbb661241/' });
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'rewardEarned') {
      showConfetti();
      poll();
    } else if (message.action === 'rewardExpired') {
      poll();
    }
  });

  // Initialize
  await poll();
  if (currentStatus && (currentStatus.sessionActive || currentStatus.rewardActive)) {
    startPolling();
  }
});
