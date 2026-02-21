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

function setEmojiFavicon(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(emoji, 32, 34);

  const icon = document.querySelector('link[rel="icon"]') || document.createElement('link');
  icon.rel = 'icon';
  icon.href = canvas.toDataURL('image/png');
  document.head.appendChild(icon);
}

function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#4ade80', '#f472b6', '#eab308', '#c084fc', '#f9a8d4', '#a78bfa'];
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
      if (userInfo.email) {
        await chrome.storage.local.set({ user_email: userInfo.email });
      }
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
  el.todayMinutes.textContent = `${status.todayMinutes || 0} min`;
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
  el.btnEnd.textContent = thresholdMet ? 'End session' : 'Quit early (coward)';
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
      el.timerSection.className = 'timer-hero reward';
      el.timerLabel.textContent = 'break time remaining';
    } else {
      el.timerSection.className = 'timer-hero paused';
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
      el.timerSection.className = 'timer-hero active';
      const appSuffix = status.currentAppName ? ` (${status.currentAppName})` : '';
      el.timerLabel.textContent = `${remainingMin} min until you earn a break${appSuffix}`;
    } else {
      el.timerSection.className = 'timer-hero paused';
      el.timerLabel.textContent = 'timer paused \u2014 open a productive site or app to resume';
    }
  } else if (status.blocking) {
    const productiveSec = status.productiveSeconds || 0;
    el.timerDisplay.textContent = formatTime(productiveSec);
    if (status.isOnProductiveSite) {
      el.timerSection.className = 'timer-hero active';
      el.timerLabel.textContent = 'productive time (always-on blocking)';
    } else {
      el.timerSection.className = 'timer-hero paused';
      el.timerLabel.textContent = 'timer paused \u2014 open a productive site to resume';
    }
  } else {
    el.timerSection.className = 'timer-hero';
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
    el.btnStart.textContent = 'Lock in';
    el.btnStart.style.display = 'block';
  }
}

async function renderActiveLists() {
  const container = document.getElementById('active-lists-display');
  if (!container) return;
  container.innerHTML = '';

  const data = await getStorage(['breakLists', 'productiveMode']);
  const breakLists = migrateBreakLists(data.breakLists || DEFAULTS.breakLists);

  // Get scheduler status to know which scheduled lists are currently active
  let schedulerStatus = null;
  try {
    schedulerStatus = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSchedulerStatus' }, resolve);
    });
  } catch (e) { /* ignore */ }
  const blockingIds = new Set(schedulerStatus?.blockingListIds || []);

  const modeLabels = { manual: 'Manual', scheduled: 'Scheduled', 'always-on': 'Always On' };

  // Show each non-off break list
  for (const list of breakLists) {
    if (list.mode === 'off') continue;

    const row = document.createElement('div');
    row.className = 'row';

    const icon = document.createElement('div');
    icon.className = 'row-icon';
    icon.textContent = '🚫';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = list.name;

    const badge = document.createElement('span');
    badge.className = 'popup-mode-badge mode-' + list.mode;
    if (list.mode === 'scheduled' && blockingIds.has(list.id)) {
      badge.classList.add('active-now');
      badge.textContent = (modeLabels[list.mode] || list.mode) + ' · Active';
    } else {
      badge.textContent = modeLabels[list.mode] || list.mode;
    }

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(badge);
    container.appendChild(row);
  }

  // If no lists are active, show a placeholder
  if (container.children.length === 0) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="row-icon">🚫</div>
      <div class="row-label" style="color: var(--text-dim);">No active break lists</div>
    `;
    container.appendChild(row);
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
    el.authText.className = '';
    el.authStatus.classList.remove('clickable');
    return;
  }

  const token = await Auth.getToken();
  el.authStatus.classList.add('clickable');
  if (token) {
    el.authDot.className = 'auth-dot connected';
    const { user_email } = await chrome.storage.local.get('user_email');
    el.authText.textContent = user_email || 'signed in';
    el.authText.className = 'auth-email';
  } else {
    el.authDot.className = 'auth-dot disconnected';
    el.authText.textContent = 'Sign in';
    el.authText.className = 'auth-link';
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
  setEmojiFavicon('🔥');

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
  el.btnLeaderboard = document.getElementById('btn-leaderboard');
  el.btnSettings = document.getElementById('btn-settings');
  el.btnReportLink = document.getElementById('btn-report-link');
  el.linkedinLink = document.getElementById('linkedin-link');
  el.authStatus = document.getElementById('auth-status');
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
    if (changes.breakLists || changes.productiveLists || changes.productiveMode) {
      renderActiveLists();
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

  el.authStatus.addEventListener('click', async () => {
    if (!Auth.isConfigured()) return;
    const token = await Auth.getToken();
    if (token) {
      await Auth.logout();
      await chrome.storage.local.remove('user_email');
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

  document.getElementById('btn-usage').addEventListener('click', () => {
    chrome.tabs.create({ url: 'usage.html' });
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
  renderActiveLists();
  if (currentStatus && (currentStatus.sessionActive || currentStatus.rewardActive || currentStatus.blocking)) {
    startPolling();
  }
});
