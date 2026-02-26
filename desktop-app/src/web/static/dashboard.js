    /* --- Dropdown definitions --- */
    const WORK_OPTIONS = [
      { value: 0.083, label: '5s (test)' }, { value: 0.167, label: '10s (test)' },
      { value: 1, label: '1 min' }, { value: 5, label: '5 min' }, { value: 10, label: '10 min' },
      { value: 15, label: '15 min' }, { value: 25, label: '25 min' }, { value: 50, label: '50 min' },
      { value: 90, label: '90 min' }, { value: 120, label: '2 hours' }, { value: 180, label: '3 hours' },
    ];
    const REWARD_OPTIONS = [
      { value: 0.083, label: '5s (test)' }, { value: 0.167, label: '10s (test)' },
      { value: 1, label: '1 min' }, { value: 5, label: '5 min' }, { value: 10, label: '10 min' },
      { value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '60 min' },
    ];

    function populateSelect(id, options, currentValue) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (String(opt.value) === String(currentValue)) o.selected = true;
        el.appendChild(o);
      }
    }

    /* --- DOM refs --- */
    const lockInBtn = document.getElementById('lockInBtn');
    const endBtn = document.getElementById('endBtn');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const idleIndicator = document.getElementById('idleIndicator');
    const listSelected = document.getElementById('listSelected');
    const listDropdown = document.getElementById('listDropdown');
    const selectedListName = document.getElementById('selectedListName');
    const selectedListMeta = document.getElementById('selectedListMeta');
    const workTimerEl = document.getElementById('workTimerEl');
    const productiveTimerEl = document.getElementById('productiveTimerEl');
    const focusBox = document.getElementById('focusBox');
    const currentFocusEl = document.getElementById('currentFocusEl');
    const blockedAttemptsEl = document.getElementById('blockedAttemptsEl');
    const takeBreakBtn = document.getElementById('takeBreakBtn');
    const rewardBanner = document.getElementById('rewardBanner');
    const rewardBannerTime = document.getElementById('rewardBannerTime');
    const breakBanner = document.getElementById('breakBanner');
    const timerGrid = document.getElementById('timerGrid');
    const rewardTimerCard = document.getElementById('rewardTimerCard');
    const rewardTimerEl = document.getElementById('rewardTimerEl');
    const confettiCanvas = document.getElementById('confettiCanvas');

    let prevRewardGrantCount = -1; // -1 = not yet initialized from server
    let _breakExpiredRedirected = false;

    /** Confetti burst animation on canvas */
    function triggerConfetti() {
      const ctx = confettiCanvas.getContext('2d');
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      const colors = ['#6c5ce7', '#00c853', '#ffd600', '#e94560', '#ff9100', '#00b0ff'];
      const particles = [];
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
          y: confettiCanvas.height / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: Math.random() * -14 - 4,
          size: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
        });
      }
      let frame;
      function animate() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        let alive = false;
        for (const p of particles) {
          if (p.life <= 0) continue;
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.life -= 0.012;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        if (alive) {
          frame = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
      }
      animate();
    }

    /* Known browser process names (lowercase, no .exe) */
    const BROWSERS = new Set([
      'chrome', 'msedge', 'firefox', 'comet', 'sidekick',
      'brave', 'opera', 'vivaldi', 'arc', 'waterfox', 'librewolf',
      'chromium', 'iridium', 'thorium', 'zen',
    ]);

    /**
     * Extract the tab/page portion from a browser window title.
     * Browser titles are typically "Page Title - BrowserName".
     * Returns the part before the last " - " separator.
     */
    function extractTabTitle(windowTitle) {
      if (!windowTitle) return '';
      const lastDash = windowTitle.lastIndexOf(' - ');
      if (lastDash > 0) return windowTitle.slice(0, lastDash).trim();
      // Some browsers use " — " (em dash)
      const lastEmDash = windowTitle.lastIndexOf(' \u2014 ');
      if (lastEmDash > 0) return windowTitle.slice(0, lastEmDash).trim();
      return windowTitle.trim();
    }

    /** Format the Current Focus label from app + site state */
    function formatFocus(state) {
      const app = state.currentApp || '';
      const appLower = app.toLowerCase().replace('.exe', '');
      if (app && BROWSERS.has(appLower)) {
        // Prefer proxy-reported domain, fall back to window title
        const site = state.currentSite || '';
        const tabTitle = extractTabTitle(state.currentWindowTitle);
        const detail = site || tabTitle;
        if (detail) return `${app} \u203a ${detail}`;
      }
      return state.currentSite || app || '\u2014';
    }

    /** Format ms to MM:SS or H:MM:SS */
    function formatTimer(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const pad = (n) => String(n).padStart(2, '0');
      if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
      return `${pad(minutes)}:${pad(seconds)}`;
    }

    /** Update all UI elements from session state */
    function updateUI(state) {
      lockInBtn.disabled = state.sessionActive;

      // Strict mode: can't end session until reward earned
      if (state.strictMode && state.sessionActive && state.rewardGrantCount === 0) {
        endBtn.disabled = true;
      } else {
        endBtn.disabled = !state.sessionActive;
      }

      // Status badge — break mode, active, or inactive
      if (state.sessionActive && state.rewardActive) {
        statusBadge.className = 'status-badge break';
        statusText.textContent = 'Break Mode';
      } else if (state.sessionActive) {
        statusBadge.className = 'status-badge active';
        statusText.textContent = 'Session Active';
      } else {
        statusBadge.className = 'status-badge inactive';
        statusText.textContent = 'Inactive';
      }

      idleIndicator.className = 'idle-indicator' + (state.isIdle ? ' visible' : '');

      workTimerEl.textContent = formatTimer(state.workTimerMs);
      productiveTimerEl.textContent = formatTimer(state.productiveMs);

      // Reward timer card — show when any reward has been granted
      const showReward = state.rewardGrantCount > 0;
      rewardTimerCard.style.display = showReward ? '' : 'none';
      timerGrid.className = 'timer-grid' + (showReward ? ' three-col' : '');
      if (showReward) {
        rewardTimerEl.textContent = formatTimer(state.unusedRewardMs);
      }

      // Take a Break button
      if (state.sessionActive && state.rewardGrantCount > 0) {
        takeBreakBtn.style.display = '';
        takeBreakBtn.disabled = state.rewardActive || state.unusedRewardMs <= 0;
      } else {
        takeBreakBtn.style.display = 'none';
      }

      // Reward banner — show when reward available and NOT in break mode
      if (state.sessionActive && state.unusedRewardMs > 0 && !state.rewardActive) {
        rewardBanner.className = 'reward-banner visible';
        rewardBannerTime.textContent = formatTimer(state.unusedRewardMs);
      } else {
        rewardBanner.className = 'reward-banner';
      }

      // Break banner — show when in break mode
      breakBanner.className = 'break-banner' + (state.rewardActive ? ' visible' : '');

      // Reset tracking when session is inactive
      if (!state.sessionActive) {
        _breakExpiredRedirected = false;
        prevRewardGrantCount = 0;
      }

      // Confetti on new reward grant — skip on first update (sync from server)
      if (prevRewardGrantCount === -1) {
        prevRewardGrantCount = state.rewardGrantCount;
      } else if (state.sessionActive && state.rewardGrantCount > prevRewardGrantCount) {
        triggerConfetti();
        prevRewardGrantCount = state.rewardGrantCount;
      }

      // Break expiry redirect (only during active session)
      if (state.sessionActive && !state.rewardActive && state.rewardBurnedMs > 0 && state.unusedRewardMs <= 0 && !_breakExpiredRedirected) {
        _breakExpiredRedirected = true;
        window.location.href = '/break-time-up.html';
        return;
      }

      const isProductive = state.isOnProductiveSite || state.isOnProductiveApp;
      focusBox.className = 'focus-box ' + (isProductive ? 'productive' : 'normal');
      currentFocusEl.textContent = formatFocus(state);

      blockedAttemptsEl.textContent = state.blockedAttempts;
    }

    /** Build the meta string like "3 sites blocked · 2 apps · All sites & apps productive" */
    function listMetaText(list) {
      const parts = [];
      const siteCount = list.blocked?.sites?.length || 0;
      const appCount = list.blocked?.apps?.length || 0;
      if (siteCount) parts.push(`${siteCount} site${siteCount > 1 ? 's' : ''} blocked`);
      if (appCount) parts.push(`${appCount} app${appCount > 1 ? 's' : ''}`);
      const prodMode = list.productive?.mode || 'all-except-blocked';
      if (prodMode === 'all-except-blocked') {
        parts.push('All sites & apps productive');
      } else {
        const prodSites = list.productive?.sites?.length || 0;
        const prodApps = list.productive?.apps?.length || 0;
        if (prodSites) parts.push(`${prodSites} productive site${prodSites > 1 ? 's' : ''}`);
        if (prodApps) parts.push(`${prodApps} productive app${prodApps > 1 ? 's' : ''}`);
      }
      return parts.join(' \u00b7 ') || 'No items';
    }

    /** Format the mode label for display */
    function modeLabel(mode) {
      if (mode === 'always-on') return 'Always On';
      return mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    let cachedLists = [];
    let cachedActiveId = '';

    /** Populate the custom list dropdown and update the selected display */
    function populateListSelect(_, lists, activeId) {
      cachedLists = lists || [];
      cachedActiveId = activeId;
      const active = cachedLists.find(l => l.id === activeId) || cachedLists[0];

      // Update selected display
      if (active) {
        selectedListName.textContent = active.name;
        selectedListMeta.textContent = listMetaText(active);
      } else {
        selectedListName.textContent = '\u2014';
        selectedListMeta.textContent = '';
      }

      // Build dropdown options
      listDropdown.innerHTML = '';
      for (const list of cachedLists) {
        const opt = document.createElement('div');
        opt.className = 'list-option' + (list.id === activeId ? ' active' : '');
        opt.innerHTML = `
          <div class="list-info">
            <span class="list-name">${list.name}</span>
            <span class="list-meta">${listMetaText(list)}</span>
          </div>
          <span class="mode-badge ${list.mode}">${modeLabel(list.mode)}</span>
        `;
        opt.addEventListener('click', () => {
          cachedActiveId = list.id;
          populateListSelect(null, cachedLists, list.id);
          listDropdown.classList.remove('open');
          listSelected.classList.remove('open');
          fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activeListId: list.id }),
          }).catch(e => console.error('Failed to save activeListId:', e));
        });
        listDropdown.appendChild(opt);
      }
    }

    /** Save a settings update */
    async function saveSetting(updates) {
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (e) {
        console.error('Failed to save setting:', e);
      }
    }

    /** Load settings and populate list dropdown + config controls */
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        populateListSelect(null, settings.lists, settings.activeListId);
        populateSelect('workMinutes', WORK_OPTIONS, settings.workMinutes);
        populateSelect('rewardMinutes', REWARD_OPTIONS, settings.rewardMinutes);
        // Toggles
        document.getElementById('toggle-blockTaskManager').classList.toggle('on', !!settings.blockTaskManager);
        document.getElementById('toggle-strictMode').classList.toggle('on', !!settings.strictMode);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    /* --- Custom dropdown toggle --- */
    listSelected.addEventListener('click', () => {
      listSelected.classList.toggle('open');
      listDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#listSelector')) {
        listSelected.classList.remove('open');
        listDropdown.classList.remove('open');
      }
    });

    /* --- Session config change handlers --- */
    document.getElementById('workMinutes').addEventListener('change', (e) => {
      saveSetting({ workMinutes: parseFloat(e.target.value) });
    });
    document.getElementById('rewardMinutes').addEventListener('change', (e) => {
      saveSetting({ rewardMinutes: parseFloat(e.target.value) });
    });

    function setupToggle(id, key) {
      const el = document.getElementById(id);
      el.addEventListener('click', () => {
        const isOn = el.classList.contains('on');
        el.classList.toggle('on', !isOn);
        saveSetting({ [key]: !isOn });
      });
    }
    setupToggle('toggle-blockTaskManager', 'blockTaskManager');
    setupToggle('toggle-strictMode', 'strictMode');

    /* --- Session button handlers --- */
    lockInBtn.addEventListener('click', async () => {
      const res = await fetch('/api/session/start', { method: 'POST' });
      const state = await res.json();
      updateUI(state);
    });

    endBtn.addEventListener('click', async () => {
      const res = await fetch('/api/session/end', { method: 'POST' });
      const state = await res.json();
      updateUI(state);
    });

    takeBreakBtn.addEventListener('click', async () => {
      const res = await fetch('/api/session/break/start', { method: 'POST' });
      const state = await res.json();
      updateUI(state);
    });

    /* --- WebSocket for real-time updates --- */
    function connectWS() {
      const ws = new WebSocket(`ws://${location.host}`);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'tick' || msg.type === 'stateChanged') {
          updateUI(msg.data);
        }
        if (msg.type === 'settings-updated') {
          populateListSelect(null, msg.data.lists, msg.data.activeListId);
          populateSelect('workMinutes', WORK_OPTIONS, msg.data.workMinutes);
          populateSelect('rewardMinutes', REWARD_OPTIONS, msg.data.rewardMinutes);
          document.getElementById('toggle-blockTaskManager').classList.toggle('on', !!msg.data.blockTaskManager);
          document.getElementById('toggle-strictMode').classList.toggle('on', !!msg.data.strictMode);
        }
      };
      ws.onclose = () => {
        setTimeout(connectWS, 2000);
      };
    }
    connectWS();

    /* --- Initial load --- */
    fetch('/api/session/status').then(r => r.json()).then(updateUI);
    loadSettings();
