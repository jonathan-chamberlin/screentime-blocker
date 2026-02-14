document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const timerSection = document.getElementById('timer-section');
  const timerDisplay = document.getElementById('timer-display');
  const timerLabel = document.getElementById('timer-label');
  const workInput = document.getElementById('work-input');
  const rewardInput = document.getElementById('reward-input');
  const todayMinutes = document.getElementById('today-minutes');
  const rewardBalance = document.getElementById('reward-balance');
  const streakTitle = document.getElementById('streak-title');
  const btnStart = document.getElementById('btn-start');
  const btnEnd = document.getElementById('btn-end');
  const btnReward = document.getElementById('btn-reward');
  const btnPause = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnLogin = document.getElementById('btn-login');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnSettings = document.getElementById('btn-settings');
  const btnSettingsLink = document.getElementById('btn-settings-link');
  const linkedinLink = document.getElementById('linkedin-link');
  const authDot = document.getElementById('auth-dot');
  const authText = document.getElementById('auth-text');
  const penaltyModal = document.getElementById('penalty-modal');
  const modalMinutes = document.getElementById('modal-minutes');
  const modalPenalty = document.getElementById('modal-penalty');
  const modalTarget = document.getElementById('modal-target');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  let statusPollInterval = null;
  let currentStatus = null;
  let lastFetchTime = 0;

  // Load saved ratio values into inputs
  chrome.storage.local.get(['workMinutes', 'rewardMinutes'], (result) => {
    workInput.value = result.workMinutes || 50;
    rewardInput.value = result.rewardMinutes || 10;
  });

  // Save ratio on change
  function saveRatio() {
    const workMinutes = parseInt(workInput.value, 10) || 50;
    const rewardMinutes = parseInt(rewardInput.value, 10) || 10;
    chrome.storage.local.set({ workMinutes, rewardMinutes });
    chrome.runtime.sendMessage({ action: 'updateSettings', workMinutes, rewardMinutes });
  }
  workInput.addEventListener('change', saveRatio);
  rewardInput.addEventListener('change', saveRatio);

  // Format seconds into MM:SS
  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Show confetti animation
  function showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#00ff88', '#f093fb', '#ffaa00', '#ff4757', '#667eea', '#f5576c'];
    const confettiCount = 60;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 0.5}s`;
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      container.appendChild(confetti);
    }

    setTimeout(() => {
      document.body.removeChild(container);
    }, 3500);
  }

  // Get streak title based on minutes
  function getStreakTitle(minutes) {
    if (minutes === 0) return 'Certified Couch Goblin';
    if (minutes < 50) return 'Mildly Functional Human';
    if (minutes < 150) return 'Productivity Padawan';
    if (minutes < 300) return 'Focus Sensei';
    return 'Productivity Demigod';
  }

  // Get full status from background
  function getStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        resolve(response || {});
      });
    });
  }

  // Unified 1-second loop: fetch status + render UI
  function startPolling() {
    stopPolling();
    poll(); // immediate first tick
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
    lastFetchTime = Date.now();
    currentStatus = status;
    renderUI(status);
  }

  // Render the full UI from a status snapshot
  function renderUI(status) {
    // Update stats
    todayMinutes.textContent = status.todayMinutes || 0;
    rewardBalance.textContent = status.unusedRewardMinutes || 0;
    streakTitle.textContent = getStreakTitle(status.todayMinutes || 0);

    // Disable ratio inputs during active session/reward
    const locked = status.sessionActive || status.rewardActive || status.rewardPaused;
    workInput.disabled = locked;
    rewardInput.disabled = locked;

    // Hide all action buttons first
    btnStart.style.display = 'none';
    btnEnd.style.display = 'none';
    btnReward.style.display = 'none';
    btnPause.style.display = 'none';
    btnResume.style.display = 'none';

    // Determine primary UI state
    // Priority: rewardActive > rewardPaused > sessionActive > idle
    if (status.rewardActive) {
      // Reward is actively burning
      const remaining = status.rewardRemainingSeconds || 0;

      if (status.isOnRewardSite) {
        timerSection.className = 'timer-section reward';
        timerLabel.textContent = 'burning reward time';
      } else {
        timerSection.className = 'timer-section paused';
        timerLabel.textContent = 'paused \u2014 switch to a reward site';
      }
      timerDisplay.textContent = formatTime(remaining);

      btnPause.style.display = 'block';
      // If session is also active, show end button too
      if (status.sessionActive) {
        btnEnd.style.display = 'block';
      }
    } else if (status.rewardPaused) {
      timerSection.className = 'timer-section paused';
      const remainMin = Math.ceil((status.rewardRemainingSeconds || 0) / 60);
      timerDisplay.textContent = formatTime(status.rewardRemainingSeconds || 0);
      timerLabel.textContent = `reward paused \u2014 ${remainMin} min saved`;
      btnResume.style.display = 'block';
      if (status.sessionActive) {
        btnEnd.style.display = 'block';
      }
    } else if (status.sessionActive) {
      // Active work session
      const productiveSec = status.productiveSeconds || 0;
      timerDisplay.textContent = formatTime(productiveSec);

      const goalSec = (status.workMinutes || 50) * 60;
      const nextThreshold = goalSec * ((status.rewardGrantCount || 0) + 1);
      const remainingSec = Math.max(0, nextThreshold - productiveSec);
      const remainingMin = Math.ceil(remainingSec / 60);

      if (status.isOnProductiveSite) {
        timerSection.className = 'timer-section active';
        timerLabel.textContent = `${remainingMin} min to next reward`;
      } else {
        timerSection.className = 'timer-section paused';
        timerLabel.textContent = 'paused \u2014 switch to a productive tab';
      }

      btnEnd.style.display = 'block';

      // Show burn button if there are unused reward minutes
      if ((status.unusedRewardMinutes || 0) > 0) {
        btnReward.style.display = 'block';
      }
    } else {
      // Idle
      timerSection.className = 'timer-section';
      timerDisplay.textContent = '00:00';
      timerLabel.textContent = 'ready when you are';
      btnStart.style.display = 'block';
      if ((status.unusedRewardMinutes || 0) > 0) {
        btnReward.style.display = 'block';
      }
    }

    // Auth status (async, fire and forget)
    updateAuthUI();
  }

  async function updateAuthUI() {
    const token = await Auth.getToken();
    if (token) {
      authDot.className = 'auth-dot connected';
      authText.textContent = 'synced';
      btnLogin.textContent = 'Sign Out';
      btnLeaderboard.style.display = 'flex';
    } else {
      authDot.className = 'auth-dot disconnected';
      authText.textContent = 'offline';
      btnLogin.textContent = 'Sign In for Leaderboard';
      btnLeaderboard.style.display = 'none';
    }
  }

  // Button handlers
  btnStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startSession' }, (response) => {
      if (response && response.success) {
        poll();
        startPolling();
      }
    });
  });

  btnEnd.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'endSession', confirmed: false }, (response) => {
      if (response && response.needsConfirmation) {
        const elapsed = currentStatus ? Math.floor((currentStatus.productiveSeconds || 0) / 60) : 0;
        modalMinutes.textContent = elapsed;
        chrome.storage.local.get(['penaltyAmount', 'penaltyTarget', 'penaltyType'], (config) => {
          const amount = config.penaltyAmount || 5;
          const target = config.penaltyTarget || 'charity';
          const type = config.penaltyType || 'Charity';
          modalPenalty.textContent = `$${amount.toFixed(2)}`;
          modalTarget.textContent = `to ${target} (${type})`;
        });
        penaltyModal.classList.add('visible');
      }
    });
  });

  modalCancel.addEventListener('click', () => {
    penaltyModal.classList.remove('visible');
  });

  modalConfirm.addEventListener('click', () => {
    penaltyModal.classList.remove('visible');
    chrome.runtime.sendMessage({ action: 'endSession', confirmed: true }, (response) => {
      if (response && response.success) {
        stopPolling();
        poll();
      }
    });
  });

  btnReward.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'useReward' }, (response) => {
      if (response && response.success) {
        poll();
        startPolling();
      }
    });
  });

  btnPause.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseReward' }, (response) => {
      if (response && response.success) {
        poll();
      }
    });
  });

  btnResume.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resumeReward' }, (response) => {
      if (response && response.success) {
        poll();
        startPolling();
      }
    });
  });

  btnLogin.addEventListener('click', async () => {
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

  async function syncUserProfile(token) {
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

  btnLeaderboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'leaderboard.html' });
  });

  const openSettings = () => chrome.tabs.create({ url: 'settings.html' });
  btnSettings.addEventListener('click', openSettings);
  btnSettingsLink.addEventListener('click', openSettings);

  // LinkedIn credits link
  linkedinLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://www.linkedin.com/in/jonathan-chamberlin-bbb661241/' });
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'rewardEarned') {
      showConfetti();
      poll(); // refresh UI to show updated reward balance
    } else if (message.action === 'rewardExpired') {
      poll();
    }
  });

  // Initialize
  await poll();
  if (currentStatus && (currentStatus.sessionActive || currentStatus.rewardActive || currentStatus.rewardPaused)) {
    startPolling();
  }
});
