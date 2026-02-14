document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const timerSection = document.getElementById('timer-section');
  const timerDisplay = document.getElementById('timer-display');
  const timerLabel = document.getElementById('timer-label');
  const ratioDisplay = document.getElementById('ratio-display');
  const todayMinutes = document.getElementById('today-minutes');
  const rewardBalance = document.getElementById('reward-balance');
  const streakTitle = document.getElementById('streak-title');
  const btnStart = document.getElementById('btn-start');
  const btnEnd = document.getElementById('btn-end');
  const btnReward = document.getElementById('btn-reward');
  const btnLogin = document.getElementById('btn-login');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnSettings = document.getElementById('btn-settings');
  const authDot = document.getElementById('auth-dot');
  const authText = document.getElementById('auth-text');
  const penaltyModal = document.getElementById('penalty-modal');
  const modalMinutes = document.getElementById('modal-minutes');
  const modalPenalty = document.getElementById('modal-penalty');
  const modalTarget = document.getElementById('modal-target');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  let timerInterval = null;
  let currentStatus = null;

  // Format seconds into MM:SS
  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Show confetti animation
  function showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#1a73e8', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
    const confettiCount = 50;

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
    if (minutes === 0) return 'Certified Couch Goblin 🛋️';
    if (minutes < 50) return 'Mildly Functional Human 🚶';
    if (minutes < 150) return 'Productivity Padawan ⚔️';
    if (minutes < 300) return 'Focus Sensei 🧘';
    return 'Productivity Demigod ⚡';
  }

  // Get full status from background
  function getStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        resolve(response || {});
      });
    });
  }

  // Fetch status from background and update buttons/stats (not timer)
  async function refreshStatus() {
    const status = await getStatus();
    currentStatus = status;

    // Update ratio display
    ratioDisplay.textContent = `Work ${status.workMinutes || 50} min \u2192 Earn ${status.rewardMinutes || 10} min reward`;

    // Update stats
    todayMinutes.textContent = status.todayMinutes || 0;
    rewardBalance.textContent = status.unusedRewardMinutes || 0;

    // Update streak title
    streakTitle.textContent = getStreakTitle(status.todayMinutes || 0);

    if (status.rewardActive) {
      timerSection.className = 'timer-section reward';
      timerLabel.textContent = 'Reward time remaining';
      btnStart.style.display = 'none';
      btnEnd.style.display = 'none';
      btnReward.style.display = 'none';
    } else if (status.sessionActive) {
      timerSection.className = 'timer-section active';
      timerLabel.textContent = 'Working session active';
      btnStart.style.display = 'none';
      btnEnd.style.display = 'block';
      btnReward.style.display = 'none';
    } else {
      timerSection.className = 'timer-section';
      timerDisplay.textContent = '00:00';
      timerLabel.textContent = 'No active session';
      btnStart.style.display = 'block';
      btnEnd.style.display = 'none';
      btnReward.style.display = (status.unusedRewardMinutes > 0) ? 'block' : 'none';
    }

    // Auth status
    const token = await Auth.getToken();
    if (token) {
      authDot.className = 'auth-dot connected';
      authText.textContent = 'Synced';
      btnLogin.textContent = 'Sign Out';
      btnLeaderboard.style.display = 'block';
    } else {
      authDot.className = 'auth-dot disconnected';
      authText.textContent = 'Not connected';
      btnLogin.textContent = 'Sign In to Sync Data';
      btnLeaderboard.style.display = 'none';
    }
  }

  // Tick the timer display locally every second (no message to background)
  function tickTimer() {
    if (!currentStatus) return;

    if (currentStatus.sessionActive && currentStatus.sessionStartTime) {
      const elapsedSec = Math.floor((Date.now() - currentStatus.sessionStartTime) / 1000);
      const remainingSec = Math.max(0, (currentStatus.workMinutes || 50) * 60 - elapsedSec);
      timerDisplay.textContent = formatTime(elapsedSec);
      timerLabel.textContent = `Working \u2014 ${Math.ceil(remainingSec / 60)} min remaining`;
    } else if (currentStatus.rewardActive && currentStatus.rewardEndTime) {
      const remainingSec = Math.max(0, Math.floor((currentStatus.rewardEndTime - Date.now()) / 1000));
      timerDisplay.textContent = formatTime(remainingSec);
      timerLabel.textContent = 'Reward time remaining';
      if (remainingSec <= 0) {
        stopTimerUpdates();
        refreshStatus();
      }
    }
  }

  // Start live timer updates (local tick, no background messages)
  function startTimerUpdates() {
    stopTimerUpdates();
    timerInterval = setInterval(tickTimer, 1000);
  }

  function stopTimerUpdates() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Button handlers
  btnStart.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'startSession' }, (response) => {
      if (response && response.success) {
        refreshStatus();
        startTimerUpdates();
      }
    });
  });

  btnEnd.addEventListener('click', async () => {
    // First ask background for confirmation info
    chrome.runtime.sendMessage({ action: 'endSession', confirmed: false }, (response) => {
      if (response && response.needsConfirmation) {
        // Show penalty modal
        const elapsed = currentStatus.sessionStartTime
          ? Math.floor((Date.now() - currentStatus.sessionStartTime) / 60000)
          : 0;
        modalMinutes.textContent = elapsed;
        // Load penalty config from storage
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
        stopTimerUpdates();
        refreshStatus();
      }
    });
  });

  btnReward.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'useReward' }, (response) => {
      if (response && response.success) {
        refreshStatus();
        startTimerUpdates();
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
        // Fetch user profile from Auth0 and sync to backend
        syncUserProfile(accessToken);
      } catch (err) {
        console.error('Login failed:', err.message);
        alert('Login failed: ' + err.message);
      }
    }
    refreshStatus();
  });

  // Sync user profile to backend after login
  async function syncUserProfile(token) {
    try {
      // Decode JWT to get Auth0 domain (or use CONFIG)
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

  btnSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });

  // Listen for messages from background (session completed, reward expired)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'sessionCompleted') {
      showConfetti();
      stopTimerUpdates();
      refreshStatus();
    } else if (message.action === 'rewardExpired') {
      stopTimerUpdates();
      refreshStatus();
    }
  });

  // Initialize
  await refreshStatus();
  const status = await getStatus();
  if (status.sessionActive || status.rewardActive) {
    startTimerUpdates();
  }
});
