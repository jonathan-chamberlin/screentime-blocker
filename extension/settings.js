function showConfirmation(elementId) {
  const confirmation = document.getElementById(elementId);
  confirmation.classList.add('show');
  setTimeout(() => confirmation.classList.remove('show'), 2000);
}

function showSavedIndicator() {
  const indicator = document.getElementById('saved-indicator');
  indicator.classList.add('show');
  setTimeout(() => indicator.classList.remove('show'), 2000);
}

function setEmojiFavicon(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(emoji, 32, 35);

  const icon = document.querySelector('link[rel="icon"]') || document.createElement('link');
  icon.rel = 'icon';
  icon.href = canvas.toDataURL('image/png');
  document.head.appendChild(icon);
}

let saveTimeouts = {};
let nativeHostStatusPoll = null;

async function setApiBaseUrlFromConfig() {
  if (CONFIG && typeof CONFIG.API_BASE_URL === 'string' && CONFIG.API_BASE_URL.trim()) {
    await setStorage({ apiBaseUrl: CONFIG.API_BASE_URL.trim() });
  }
}

function autoSave(key, value) {
  if (saveTimeouts[key]) {
    clearTimeout(saveTimeouts[key]);
  }

  saveTimeouts[key] = setTimeout(async () => {
    await setStorage({ [key]: value });
    showSavedIndicator();
  }, 500);
}

async function loadSettings() {
  const result = await getStorage(Object.keys(DEFAULTS));

  document.getElementById('allowedPaths').value =
    (result.allowedPaths || DEFAULTS.allowedPaths).join('\n');

  document.getElementById('skipProductivityCheck').value =
    (result.skipProductivityCheck || DEFAULTS.skipProductivityCheck).join('\n');

  const penaltyType = result.penaltyType || DEFAULTS.penaltyType;
  document.querySelectorAll('input[name="penaltyType"]').forEach(radio => {
    if (radio.value === penaltyType) radio.checked = true;
  });

  const strictMode = result.strictMode || DEFAULTS.strictMode;
  document.querySelectorAll('input[name="strictMode"]').forEach(radio => {
    if (radio.value === strictMode) radio.checked = true;
  });

  const companionMode = result.companionMode || DEFAULTS.companionMode;
  document.querySelectorAll('input[name="companionMode"]').forEach(radio => {
    if (radio.value === companionMode) radio.checked = true;
  });

  const penaltyEnabled = result.penaltyEnabled || DEFAULTS.penaltyEnabled;
  document.querySelectorAll('input[name="penaltyEnabled"]').forEach(radio => {
    if (radio.value === penaltyEnabled) radio.checked = true;
  });
  togglePenaltySections(penaltyEnabled);

  document.getElementById('penaltyTarget').value = result.penaltyTarget || DEFAULTS.penaltyTarget;
  document.getElementById('penaltyAmount').value = result.penaltyAmount || DEFAULTS.penaltyAmount;
  document.getElementById('paymentMethod').value = result.paymentMethod || DEFAULTS.paymentMethod;
}

function setSyncStatus(text, isError) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#ff6b7a' : '#888';
}

function getSelectedCompanionMode() {
  const selected = document.querySelector('input[name="companionMode"]:checked');
  return selected ? selected.value : DEFAULTS.companionMode;
}

function refreshNativeHostWarning() {
  const warning = document.getElementById('nativeHostWarning');
  if (!warning) return;
  const companionMode = getSelectedCompanionMode();

  if (companionMode !== 'on') {
    warning.style.display = 'none';
    return;
  }

  chrome.runtime.sendMessage({ action: 'getNativeHostStatus' }, (response) => {
    if (companionMode === 'on' && (!response || !response.available)) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
  });
}

function scheduleNativeHostStatusChecks() {
  if (nativeHostStatusPoll) {
    clearInterval(nativeHostStatusPoll);
    nativeHostStatusPoll = null;
  }

  // Immediate check.
  refreshNativeHostWarning();

  // Re-check for a few seconds to catch startup race with service worker/native ping.
  let attempts = 0;
  nativeHostStatusPoll = setInterval(() => {
    attempts++;
    refreshNativeHostWarning();
    if (attempts >= 6 || getSelectedCompanionMode() !== 'on') {
      clearInterval(nativeHostStatusPoll);
      nativeHostStatusPoll = null;
    }
  }, 1000);
}

function togglePenaltySections(penaltyEnabled) {
  const visible = penaltyEnabled === 'on';
  document.getElementById('section-penalty-config').style.display = visible ? 'block' : 'none';
  document.getElementById('section-penalty-reminder').style.display = visible ? 'block' : 'none';
}

async function savePenalty() {
  const penaltyType = document.querySelector('input[name="penaltyType"]:checked').value;
  const penaltyTarget = document.getElementById('penaltyTarget').value.trim();
  const penaltyAmount = parseInt(document.getElementById('penaltyAmount').value, 10);

  await setStorage({ penaltyType, penaltyTarget, penaltyAmount });
  showConfirmation('penaltyConfirmation');
}

async function savePayment() {
  const paymentMethod = document.getElementById('paymentMethod').value.trim();
  await setStorage({ paymentMethod });
  showConfirmation('paymentConfirmation');
}

function lockSiteSections(locked) {
  document.querySelectorAll('[data-lockable]').forEach(section => {
    section.classList.toggle('section-locked', locked);
  });
}

// --- Nuclear Block ---

let nuclearTransitionTimer = null;

function scheduleNuclearTransition(sites) {
  if (nuclearTransitionTimer) {
    clearTimeout(nuclearTransitionTimer);
    nuclearTransitionTimer = null;
  }

  // Find the smallest countdown across all active sites
  let minMs = Infinity;
  for (const site of sites) {
    const stage = getNuclearSiteStage(site);
    if (stage === 'locked' || stage === 'unblocking') {
      minMs = Math.min(minMs, getNuclearCountdownMs(site));
    }
  }

  if (minMs !== Infinity && minMs > 0) {
    nuclearTransitionTimer = setTimeout(() => {
      nuclearTransitionTimer = null;
      loadNuclearBlock();
    }, minMs + 50); // +50ms buffer so stage check resolves cleanly
  }
}

function fuzzyTimeLeft(ms) {
  const MONTH = 30 * 24 * 60 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  if (ms <= 0) return null; // signal "ready"
  if (ms >= MONTH) return Math.ceil(ms / MONTH) + ' months';
  if (ms >= 2 * DAY) return Math.ceil(ms / DAY) + ' days';
  if (ms >= DAY) return '1 day';
  if (ms >= 2 * HOUR) return Math.floor(ms / HOUR) + ' hours';
  if (ms >= HOUR) return '1 hour';
  return 'Less than 1 hour';
}

function getNuclearSiteStage(site) {
  const now = Date.now();
  if (now - site.addedAt < site.cooldown1Ms) return 'locked';
  if (!site.unblockClickedAt) return 'ready';
  if (now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
  return 'confirm';
}

function getNuclearCountdownMs(site) {
  const now = Date.now();
  const stage = getNuclearSiteStage(site);
  if (stage === 'locked') return site.cooldown1Ms - (now - site.addedAt);
  if (stage === 'unblocking') return site.cooldown2Ms - (now - site.unblockClickedAt);
  return 0;
}

async function loadNuclearBlock() {
  // Render presets immediately from static data — no async needed
  const presetsGrid = document.getElementById('nuclearPresetsList');
  presetsGrid.innerHTML = '';
  PRESET_NUCLEAR_SITES.forEach(preset => {
    const item = document.createElement('div');
    item.className = 'nuclear-preset-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'nuclear-preset-' + (preset.domain || preset.domains[0]);

    const label = document.createElement('span');
    label.textContent = preset.name;

    item.appendChild(checkbox);
    item.appendChild(label);
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
      }
    });
    presetsGrid.appendChild(item);
  });

  // Load storage data to update sites list, radio, and "already added" preset states
  chrome.runtime.sendMessage({ action: 'getNuclearData' }, (data) => {
    if (chrome.runtime.lastError || !data) {
      data = { sites: [], secondCooldownEnabled: true, secondCooldownMs: 18 * 60 * 60 * 1000 };
    }

    // If any sites have expired, trigger background cleanup and re-render
    const hasExpired = (data.sites || []).some(site => getNuclearSiteStage(site) === 'expired');
    if (hasExpired) {
      chrome.runtime.sendMessage({ action: 'applyNuclearRules' }, () => loadNuclearBlock());
      return;
    }

    // Set second cooldown dropdown
    const { secondCooldownEnabled, secondCooldownMs } = data;
    let selectVal = 'off';
    if (secondCooldownEnabled) {
      // Find the closest matching option by comparing ms values
      const options = [
        ['5s', 5000], ['10m', 600000], ['20m', 1200000],
        ['1h', 3600000], ['2h', 7200000], ['4h', 14400000],
        ['8h', 28800000], ['12h', 43200000], ['18h', 64800000],
        ['24h', 86400000], ['36h', 129600000], ['48h', 172800000],
        ['3d', 259200000], ['5d', 432000000], ['7d', 604800000],
        ['14d', 1209600000], ['30d', 2592000000],
      ];
      selectVal = '18h';
      for (const [key, ms] of options) {
        if (secondCooldownMs <= ms) { selectVal = key; break; }
      }
    }
    document.getElementById('nuclearSecondCooldown').value = selectVal;

    // Render current nuclear sites
    const list = document.getElementById('nuclearSitesList');
    list.innerHTML = '';
    if (!data.sites || data.sites.length === 0) {
      list.innerHTML = '<p class="nuclear-empty">No sites added yet.</p>';
    } else {
      data.sites.forEach(site => {
        const stage = getNuclearSiteStage(site);

        const card = document.createElement('div');
        card.className = 'nuclear-site-card';

        const info = document.createElement('div');
        info.className = 'site-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'site-name';
        nameEl.textContent = site.name;

        const countdownEl = document.createElement('div');
        countdownEl.className = 'site-countdown';

        if (stage === 'locked') {
          const ms = getNuclearCountdownMs(site);
          const fuzzy = fuzzyTimeLeft(ms) || '1 day';
          countdownEl.textContent = fuzzy + ' until you can request unblock';
        } else if (stage === 'ready') {
          countdownEl.className = 'site-countdown ready';
        } else if (stage === 'unblocking') {
          const ms = getNuclearCountdownMs(site);
          const fuzzy = fuzzyTimeLeft(ms) || '1 day';
          countdownEl.textContent = fuzzy + ' until site is removed';
          countdownEl.className = 'site-countdown unblocking';
        } else if (stage === 'confirm') {
          countdownEl.textContent = 'Waiting for your final decision';
          countdownEl.className = 'site-countdown ready';
        }

        info.appendChild(nameEl);
        info.appendChild(countdownEl);
        card.appendChild(info);

        if (stage === 'ready' || stage === 'confirm') {
          const btn = document.createElement('button');
          btn.className = 'btn-unblock';
          if (stage === 'confirm') {
            btn.textContent = 'Unblock Now';
          } else if (site.cooldown2Ms > 0) {
            btn.textContent = 'Unblock';
          } else {
            btn.textContent = 'Unblock Now';
          }
          btn.dataset.siteId = site.id;
          btn.addEventListener('click', () => {
            if (stage === 'confirm') {
              window.location.href = chrome.runtime.getURL('nuclear-block-last-chance.html');
            } else {
              handleUnblockNuclear(site.id);
            }
          });
          card.appendChild(btn);

          const blockAgainSelect = document.createElement('select');
          blockAgainSelect.className = 'select-block-again';
          [
            { label: 'Block Again', value: '' },
            { label: '⚠ 10 seconds (testing)', value: '10000' },
            { label: '24 hours', value: '86400000' },
            { label: '48 hours', value: '172800000' },
            { label: '1 week', value: '604800000' },
            { label: '1 month', value: '2592000000' },
            { label: '3 months', value: '7776000000' },
            { label: '6 months', value: '15552000000' },
            { label: '1 year', value: '31536000000' },
          ].forEach(({ label, value }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            if (!value) opt.disabled = true;
            blockAgainSelect.appendChild(opt);
          });
          blockAgainSelect.value = '';
          blockAgainSelect.addEventListener('change', () => {
            const ms = parseInt(blockAgainSelect.value, 10);
            if (ms) handleBlockAgainNuclear(site.id, ms);
          });
          card.appendChild(blockAgainSelect);
        }

        list.appendChild(card);
      });
    }

    // Update preset "already added" states now that we have storage data
    const existingDomains = new Set();
    (data.sites || []).forEach(site => {
      if (site.domains) site.domains.forEach(d => existingDomains.add(d));
      else if (site.domain) existingDomains.add(site.domain);
    });

    PRESET_NUCLEAR_SITES.forEach(preset => {
      const presetDomains = preset.domains || (preset.domain ? [preset.domain] : []);
      const alreadyAdded = presetDomains.every(d => existingDomains.has(d));
      const checkbox = document.getElementById('nuclear-preset-' + (preset.domain || preset.domains[0]));
      if (!checkbox) return;
      checkbox.disabled = alreadyAdded;
      checkbox.title = alreadyAdded ? 'Already in Nuclear Block' : '';
      const labelEl = checkbox.nextElementSibling;
      if (labelEl) labelEl.textContent = preset.name + (alreadyAdded ? ' ✓' : '');
    });

    // Render break lists as nuclear-blockable options
    getStorage(['breakLists']).then(result => {
      const breakLists = result.breakLists || DEFAULTS.breakLists;
      const breakListsGrid = document.getElementById('nuclearBreakLists');
      breakListsGrid.innerHTML = '';

      const listsWithSites = breakLists.filter(l => l.sites && l.sites.length > 0);
      if (listsWithSites.length === 0) {
        breakListsGrid.innerHTML = '<span style="font-size: 12px; color: #5c5862; font-style: italic;">No break lists with sites yet.</span>';
        return;
      }

      listsWithSites.forEach(list => {
        const item = document.createElement('div');
        item.className = 'nuclear-preset-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'nuclear-breaklist-' + list.id;
        checkbox.dataset.domains = JSON.stringify(list.sites);
        checkbox.dataset.listName = list.name;

        const alreadyAdded = list.sites.every(d => existingDomains.has(d));
        checkbox.disabled = alreadyAdded;

        const label = document.createElement('span');
        label.textContent = list.name + ' (' + list.sites.length + ' sites)' + (alreadyAdded ? ' ✓' : '');

        item.appendChild(checkbox);
        item.appendChild(label);
        item.addEventListener('click', (e) => {
          if (e.target !== checkbox && !checkbox.disabled) {
            checkbox.checked = !checkbox.checked;
          }
        });
        breakListsGrid.appendChild(item);
      });
    });

    // Schedule a precise re-render at the next state transition
    scheduleNuclearTransition(data.sites || []);
  });
}

function getNuclearSecondCooldown() {
  const val = document.getElementById('nuclearSecondCooldown')?.value || '18h';
  if (val === 'off') return { enabled: false, ms: 0 };
  const MS = {
    '5s':    5 * 1000,
    '10m':  10 * 60 * 1000,
    '20m':  20 * 60 * 1000,
    '1h':    1 * 60 * 60 * 1000,
    '2h':    2 * 60 * 60 * 1000,
    '4h':    4 * 60 * 60 * 1000,
    '8h':    8 * 60 * 60 * 1000,
    '12h':  12 * 60 * 60 * 1000,
    '18h':  18 * 60 * 60 * 1000,
    '24h':  24 * 60 * 60 * 1000,
    '36h':  36 * 60 * 60 * 1000,
    '48h':  48 * 60 * 60 * 1000,
    '3d':    3 * 24 * 60 * 60 * 1000,
    '5d':    5 * 24 * 60 * 60 * 1000,
    '7d':    7 * 24 * 60 * 60 * 1000,
    '14d':  14 * 24 * 60 * 60 * 1000,
    '30d':  30 * 24 * 60 * 60 * 1000,
  };
  return { enabled: true, ms: MS[val] ?? MS['18h'] };
}

function saveNuclearSettings() {
  const { enabled, ms } = getNuclearSecondCooldown();
  // Update only the second-cooldown settings fields; preserve the sites list
  chrome.storage.local.get(['nbData'], (result) => {
    const nbData = result.nbData || { sites: [] };
    nbData.secondCooldownEnabled = enabled;
    nbData.secondCooldownMs = ms;
    chrome.storage.local.set({ nbData }, () => showSavedIndicator());
  });
}

function addNuclearSiteFromUI() {
  const cooldown1Ms = parseInt(document.getElementById('nuclearCooldown').value, 10);
  const { enabled, ms: cooldown2Ms } = getNuclearSecondCooldown();

  const entries = [];

  // Collect checked presets
  PRESET_NUCLEAR_SITES.forEach(preset => {
    const checkbox = document.getElementById('nuclear-preset-' + (preset.domain || preset.domains[0]));
    if (checkbox && checkbox.checked && !checkbox.disabled) {
      entries.push({
        id: 'nuclear-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        name: preset.name,
        ...(preset.domain ? { domain: preset.domain } : { domains: preset.domains }),
        addedAt: Date.now(),
        cooldown1Ms,
        cooldown2Ms: enabled ? cooldown2Ms : 0,
        unblockClickedAt: null,
      });
    }
  });

  // Collect checked break lists
  document.querySelectorAll('#nuclearBreakLists input[type="checkbox"]').forEach(cb => {
    if (cb.checked && !cb.disabled) {
      const domains = JSON.parse(cb.dataset.domains);
      entries.push({
        id: 'nuclear-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        name: cb.dataset.listName,
        domains,
        addedAt: Date.now(),
        cooldown1Ms,
        cooldown2Ms: enabled ? cooldown2Ms : 0,
        unblockClickedAt: null,
      });
    }
  });

  // Collect custom domain
  const customInput = document.getElementById('nuclearCustomDomain');
  const customDomain = customInput.value.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  if (customDomain.length > 0) {
    entries.push({
      id: 'nuclear-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      name: customDomain,
      domain: customDomain,
      addedAt: Date.now(),
      cooldown1Ms,
      cooldown2Ms: enabled ? cooldown2Ms : 0,
      unblockClickedAt: null,
    });
  }

  if (entries.length === 0) {
    alert('Select at least one preset or enter a domain to add.');
    return;
  }

  let pending = entries.length;
  entries.forEach(entry => {
    chrome.runtime.sendMessage({ action: 'addNuclearSite', entry }, () => {
      pending--;
      if (pending === 0) {
        customInput.value = '';
        loadNuclearBlock();
        showSavedIndicator();
      }
    });
  });
}

function handleUnblockNuclear(id) {
  chrome.runtime.sendMessage({ action: 'clickUnblockNuclear', id }, () => {
    loadNuclearBlock();
    showSavedIndicator();
  });
}

function handleBlockAgainNuclear(id, cooldown1Ms) {
  chrome.runtime.sendMessage({ action: 'blockAgainNuclear', id, cooldown1Ms }, () => {
    loadNuclearBlock();
    showSavedIndicator();
  });
}

const NUCLEAR_CONFIRM_PHRASE = 'You can change. I love you.';

function showTypingConfirmation(siteId) {
  // Remove existing modal if any
  const existing = document.getElementById('nuclear-confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'nuclear-confirm-modal';
  overlay.className = 'nuclear-confirm-overlay';

  const modal = document.createElement('div');
  modal.className = 'nuclear-confirm-modal';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = 'Are you sure?';

  const desc = document.createElement('div');
  desc.className = 'modal-desc';
  desc.textContent = 'To unblock this site, type the phrase below exactly as shown.';

  const phrase = document.createElement('div');
  phrase.className = 'modal-phrase';
  phrase.textContent = NUCLEAR_CONFIRM_PHRASE;
  phrase.addEventListener('copy', e => e.preventDefault());
  phrase.addEventListener('contextmenu', e => e.preventDefault());

  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = 'Type the phrase here...';
  input.addEventListener('paste', e => e.preventDefault());

  const btnRow = document.createElement('div');
  btnRow.className = 'modal-btn-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'modal-btn-confirm';
  confirmBtn.textContent = 'Confirm unblock';

  input.addEventListener('input', () => {
    const match = input.value === NUCLEAR_CONFIRM_PHRASE;
    confirmBtn.classList.toggle('enabled', match);
  });

  confirmBtn.addEventListener('click', () => {
    if (input.value !== NUCLEAR_CONFIRM_PHRASE) return;
    overlay.remove();
    chrome.runtime.sendMessage({ action: 'confirmUnblockNuclear', id: siteId }, () => {
      loadNuclearBlock();
      showSavedIndicator();
    });
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  modal.appendChild(title);
  modal.appendChild(desc);
  modal.appendChild(phrase);
  modal.appendChild(input);
  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  input.focus();
}

async function handleDeleteAnalytics() {
  const confirmed = window.confirm(
    'Delete all analytics data?\n\nThis resets session history, streaks, and unused rewards. Your current session and settings are not affected.'
  );
  if (!confirmed) return;

  chrome.runtime.sendMessage({ action: 'deleteAnalytics' }, (response) => {
    if (response && response.success) {
      showSavedIndicator();
      alert('Analytics data has been deleted.');
    } else {
      alert('Failed to delete analytics. Please try again.');
    }
  });
}

async function handleDeleteAllData() {
  const confirmed = window.confirm(
    'Delete all extension data?\n\nThis will stop your active session and reset all settings. Your lists and Nuclear Block data are preserved.\n\nThis cannot be undone.'
  );
  if (!confirmed) return;

  chrome.runtime.sendMessage({ action: 'deleteAllData' }, async (response) => {
    if (response && response.success) {
      await loadSettings();
      await loadBreakLists();
      await loadProductiveLists();
      await renderActiveBreakLists();
      await renderActiveProductiveLists();
      await loadNuclearBlock();
      showSavedIndicator();
      alert('All data was deleted. Your lists and Nuclear Block data were preserved.');
    } else {
      alert('Failed to delete data. Please try again.');
    }
  });
}

// === Break Lists ===

let editingBreakListId = null;

async function loadBreakLists() {
  const result = await getStorage(['breakLists']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;

  const master = document.getElementById('breakListsMaster');
  master.innerHTML = '';

  breakLists.forEach(list => {
    const row = document.createElement('div');
    row.className = 'list-row';

    const icon = document.createElement('div');
    icon.className = 'list-icon break-icon';
    icon.textContent = list.name.charAt(0).toUpperCase();

    const nameWrap = document.createElement('div');
    nameWrap.className = 'list-name';
    const nameText = document.createTextNode(list.name);
    const badge = document.createElement('span');
    badge.className = 'list-badge';
    badge.textContent = `${list.sites.length} sites · ${list.apps.length} apps`;
    nameWrap.appendChild(nameText);
    nameWrap.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'list-action-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => openBreakListEditor(list.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'list-action-btn delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete';
    if (list.id === 'break-default') {
      deleteBtn.disabled = true;
      deleteBtn.title = 'Default list cannot be deleted';
      deleteBtn.style.opacity = '0.3';
      deleteBtn.style.pointerEvents = 'none';
    }
    deleteBtn.addEventListener('click', () => deleteBreakList(list.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(icon);
    row.appendChild(nameWrap);
    row.appendChild(actions);
    master.appendChild(row);
  });
}

function openBreakListEditor(listId) {
  editingBreakListId = listId;
  const editor = document.getElementById('breakListEditor');
  editor.style.display = 'block';

  getStorage(['breakLists', 'companionMode']).then(result => {
    const breakLists = result.breakLists || DEFAULTS.breakLists;
    const list = breakLists.find(l => l.id === listId);
    if (!list) return;

    document.getElementById('breakListEditorName').value = list.name;

    // Show/hide apps section based on companion mode
    const companionMode = result.companionMode || DEFAULTS.companionMode;
    document.getElementById('breakListEditorAppsSection').style.display = companionMode === 'on' ? 'block' : 'none';

    // Render site presets
    renderSitePresets('breakListEditorSites', PRESET_BREAK_SITES, list.sites);

    // Render custom sites (sites not in any preset)
    const allPresetDomains = new Set();
    PRESET_BREAK_SITES.forEach(s => {
      if (s.domains) s.domains.forEach(d => allPresetDomains.add(d));
      else if (s.domain) allPresetDomains.add(s.domain);
    });
    const customSites = list.sites.filter(d => !allPresetDomains.has(d));
    document.getElementById('breakListEditorCustomSites').value = customSites.join('\n');

    // Render app presets
    renderAppPresets('breakListEditorApps', PRESET_BREAK_APPS, list.apps);

    // Render custom apps
    const presetProcessNames = new Set(PRESET_BREAK_APPS.map(a => a.process));
    const customApps = list.apps.filter(a => {
      const proc = typeof a === 'string' ? a : a.process;
      return !presetProcessNames.has(proc);
    });
    document.getElementById('breakListEditorCustomApps').value = customApps.map(a => {
      if (typeof a === 'string') return a;
      return `${a.name}:${a.process}`;
    }).join('\n');
  });
}

async function saveBreakList() {
  const result = await getStorage(['breakLists']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;

  const name = document.getElementById('breakListEditorName').value.trim();
  if (!name) { alert('Please enter a list name'); return; }

  // Collect sites
  const sites = collectSitesFromEditor('breakListEditorSites', PRESET_BREAK_SITES, 'breakListEditorCustomSites');

  // Collect apps
  const apps = collectBreakAppsFromEditor('breakListEditorApps', PRESET_BREAK_APPS, 'breakListEditorCustomApps');

  if (editingBreakListId) {
    const list = breakLists.find(l => l.id === editingBreakListId);
    if (list) {
      list.name = name;
      list.sites = sites;
      list.apps = apps;
    }
  } else {
    const newList = createNewList('break', name);
    newList.sites = sites;
    newList.apps = apps;
    breakLists.push(newList);
  }

  await setStorage({ breakLists });
  closeBreakListEditor();
  await loadBreakLists();
  await renderActiveBreakLists();
  chrome.runtime.sendMessage({ action: 'updateRewardSites' });
  showSavedIndicator();
}

async function deleteBreakList(listId) {
  if (listId === 'break-default') return;
  if (!confirm('Delete this break list?')) return;

  const result = await getStorage(['breakLists']);
  const breakLists = (result.breakLists || DEFAULTS.breakLists).filter(l => l.id !== listId);
  await setStorage({ breakLists });
  await loadBreakLists();
  await renderActiveBreakLists();
  chrome.runtime.sendMessage({ action: 'updateRewardSites' });
  showSavedIndicator();
}

function closeBreakListEditor() {
  editingBreakListId = null;
  document.getElementById('breakListEditor').style.display = 'none';
}

// === Productive Lists ===

let editingProductiveListId = null;

async function loadProductiveLists() {
  const result = await getStorage(['productiveLists']);
  const productiveLists = result.productiveLists || DEFAULTS.productiveLists;

  const master = document.getElementById('productiveListsMaster');
  master.innerHTML = '';

  if (productiveLists.length === 0) {
    master.innerHTML = '<p style="color:#5c5862; font-size:13px; font-style:italic;">No productive lists yet. Create one to get started.</p>';
    return;
  }

  productiveLists.forEach(list => {
    const row = document.createElement('div');
    row.className = 'list-row';

    const icon = document.createElement('div');
    icon.className = 'list-icon productive-icon';
    icon.textContent = list.name.charAt(0).toUpperCase();

    const nameWrap = document.createElement('div');
    nameWrap.className = 'list-name';
    const nameText = document.createTextNode(list.name);
    const badge = document.createElement('span');
    badge.className = 'list-badge';
    badge.textContent = `${list.sites.length} sites · ${list.apps.length} apps`;
    nameWrap.appendChild(nameText);
    nameWrap.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'list-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'list-action-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => openProductiveListEditor(list.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'list-action-btn delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', () => deleteProductiveList(list.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(icon);
    row.appendChild(nameWrap);
    row.appendChild(actions);
    master.appendChild(row);
  });
}

function openProductiveListEditor(listId) {
  editingProductiveListId = listId;
  const editor = document.getElementById('productiveListEditor');
  editor.style.display = 'block';

  getStorage(['productiveLists', 'companionMode']).then(result => {
    const productiveLists = result.productiveLists || DEFAULTS.productiveLists;
    const list = listId ? productiveLists.find(l => l.id === listId) : null;

    document.getElementById('productiveListEditorName').value = list ? list.name : '';

    // Show/hide apps section based on companion mode
    const companionMode = result.companionMode || DEFAULTS.companionMode;
    document.getElementById('productiveListEditorAppsSection').style.display = companionMode === 'on' ? 'block' : 'none';

    // Render site presets
    renderSitePresets('productiveListEditorSites', PRESET_PRODUCTIVE_SITES, list ? list.sites : []);

    // Render custom sites
    const presetDomains = new Set(PRESET_PRODUCTIVE_SITES.map(s => s.domain));
    const customSites = list ? list.sites.filter(d => !presetDomains.has(d)) : [];
    document.getElementById('productiveListEditorCustomSites').value = customSites.join('\n');

    // Render app presets
    renderProductiveAppPresets('productiveListEditorApps', CURATED_APPS, list ? list.apps : []);

    // Render custom apps
    const presetProcessNames = new Set(CURATED_APPS.map(a => a.process));
    const customApps = list ? list.apps.filter(p => !presetProcessNames.has(p)) : [];
    document.getElementById('productiveListEditorCustomApps').value = customApps.join('\n');
  });
}

async function saveProductiveList() {
  const result = await getStorage(['productiveLists']);
  const productiveLists = result.productiveLists || DEFAULTS.productiveLists;

  const name = document.getElementById('productiveListEditorName').value.trim();
  if (!name) { alert('Please enter a list name'); return; }

  const sites = collectSitesFromEditor('productiveListEditorSites', PRESET_PRODUCTIVE_SITES, 'productiveListEditorCustomSites');
  const apps = collectProductiveAppsFromEditor('productiveListEditorApps', CURATED_APPS, 'productiveListEditorCustomApps');

  if (editingProductiveListId) {
    const list = productiveLists.find(l => l.id === editingProductiveListId);
    if (list) {
      list.name = name;
      list.sites = sites;
      list.apps = apps;
    }
  } else {
    const newList = createNewList('productive', name);
    newList.sites = sites;
    newList.apps = apps;
    productiveLists.push(newList);
  }

  await setStorage({ productiveLists });
  chrome.runtime.sendMessage({ action: 'recheckCurrentTab' }).catch(() => {});
  closeProductiveListEditor();
  await loadProductiveLists();
  await renderActiveProductiveLists();
  showSavedIndicator();
}

async function deleteProductiveList(listId) {
  if (!confirm('Delete this productive list?')) return;
  const result = await getStorage(['productiveLists']);
  const productiveLists = (result.productiveLists || DEFAULTS.productiveLists).filter(l => l.id !== listId);
  await setStorage({ productiveLists });
  chrome.runtime.sendMessage({ action: 'recheckCurrentTab' }).catch(() => {});
  await loadProductiveLists();
  await renderActiveProductiveLists();
  showSavedIndicator();
}

function closeProductiveListEditor() {
  editingProductiveListId = null;
  document.getElementById('productiveListEditor').style.display = 'none';
}

// === Active Lists Rendering ===

async function renderActiveBreakLists() {
  const result = await getStorage(['breakLists']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;

  const container = document.getElementById('activeBreakLists');
  container.innerHTML = '';

  breakLists.forEach(list => {
    // Migrate if needed
    if (!list.mode) {
      list.mode = list.isActive ? 'manual' : 'off';
    }
    if (!list.schedules) list.schedules = [];
    list.isActive = list.mode !== 'off';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '0';

    const row = document.createElement('div');
    row.className = 'list-selector-row' + (list.mode !== 'off' ? ' active' : '');
    row.style.cursor = 'default';

    const check = document.createElement('div');
    check.className = 'list-selector-check';
    check.innerHTML = '<svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg>';
    if (list.mode !== 'off') {
      check.style.background = '#f093fb';
      check.style.borderColor = '#f093fb';
      check.querySelector('svg').style.opacity = '1';
    }

    const name = document.createElement('span');
    name.className = 'list-selector-name';
    name.textContent = list.name;

    const modeBadge = document.createElement('span');
    modeBadge.className = 'mode-badge mode-' + list.mode;
    const modeLabels = { off: 'Off', manual: 'Manual', scheduled: 'Scheduled', 'always-on': 'Always On' };
    modeBadge.textContent = modeLabels[list.mode] || list.mode;

    const select = document.createElement('select');
    select.className = 'mode-select';
    select.dataset.listId = list.id;
    [
      { value: 'off', label: 'Off' },
      { value: 'manual', label: 'Manual' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'always-on', label: 'Always On' },
    ].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === list.mode) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', async (e) => {
      await changeBreakListMode(list.id, e.target.value);
    });

    // Prevent row click from doing anything
    row.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    row.appendChild(check);
    row.appendChild(name);
    row.appendChild(modeBadge);
    row.appendChild(select);
    wrapper.appendChild(row);

    // Schedule editor (shown only for 'scheduled' mode)
    if (list.mode === 'scheduled') {
      const editor = renderScheduleEditor(list);
      wrapper.appendChild(editor);
    }

    // Always-on note
    if (list.mode === 'always-on') {
      const note = document.createElement('div');
      note.className = 'always-on-note';
      note.textContent = 'Sites in this list are always blocked. Always-on reward config coming in a future update.';
      wrapper.appendChild(note);
    }

    container.appendChild(wrapper);
  });
}

async function changeBreakListMode(listId, newMode) {
  const result = await getStorage(['breakLists']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;
  const list = breakLists.find(l => l.id === listId);
  if (!list) return;

  list.mode = newMode;
  list.isActive = newMode !== 'off';
  if (!list.schedules) list.schedules = [];

  // If switching to scheduled and no schedules exist, add a default one
  if (newMode === 'scheduled' && list.schedules.length === 0) {
    list.schedules.push({
      days: [1, 2, 3, 4, 5], // Mon-Fri
      startTime: '09:00',
      endTime: '17:00',
    });
  }

  await setStorage({ breakLists });
  chrome.runtime.sendMessage({ action: 'evaluateScheduler' });
  await renderActiveBreakLists();
  showSavedIndicator();
}

function renderScheduleEditor(list) {
  const editor = document.createElement('div');
  editor.className = 'schedule-editor';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  list.schedules.forEach((schedule, schedIdx) => {
    const windowEl = document.createElement('div');
    windowEl.className = 'schedule-window';

    // Day chips
    const daysContainer = document.createElement('div');
    daysContainer.className = 'day-chips';
    dayNames.forEach((dayName, dayIdx) => {
      const chip = document.createElement('button');
      chip.className = 'day-chip' + (schedule.days.includes(dayIdx) ? ' active' : '');
      chip.textContent = dayName;
      chip.type = 'button';
      chip.addEventListener('click', async () => {
        chip.classList.toggle('active');
        await saveScheduleFromUI(list.id, editor);
      });
      daysContainer.appendChild(chip);
    });
    windowEl.appendChild(daysContainer);

    // Start time
    const startInput = document.createElement('input');
    startInput.type = 'time';
    startInput.className = 'schedule-time-input';
    startInput.value = schedule.startTime || '09:00';
    startInput.addEventListener('change', async () => {
      await saveScheduleFromUI(list.id, editor);
    });
    windowEl.appendChild(startInput);

    // Separator
    const sep = document.createElement('span');
    sep.className = 'schedule-time-separator';
    sep.textContent = 'to';
    windowEl.appendChild(sep);

    // End time
    const endInput = document.createElement('input');
    endInput.type = 'time';
    endInput.className = 'schedule-time-input';
    endInput.value = schedule.endTime || '17:00';
    endInput.addEventListener('change', async () => {
      await saveScheduleFromUI(list.id, editor);
    });
    windowEl.appendChild(endInput);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-schedule';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove this schedule window';
    removeBtn.addEventListener('click', async () => {
      windowEl.remove();
      await saveScheduleFromUI(list.id, editor);
    });
    windowEl.appendChild(removeBtn);

    editor.appendChild(windowEl);
  });

  // Add window button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-schedule';
  addBtn.type = 'button';
  addBtn.textContent = '+ Add schedule window';
  addBtn.addEventListener('click', async () => {
    const result = await getStorage(['breakLists']);
    const breakLists = result.breakLists || DEFAULTS.breakLists;
    const listData = breakLists.find(l => l.id === list.id);
    if (listData) {
      listData.schedules.push({
        days: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '17:00',
      });
      await setStorage({ breakLists });
      chrome.runtime.sendMessage({ action: 'evaluateScheduler' });
      await renderActiveBreakLists();
    }
  });
  editor.appendChild(addBtn);

  return editor;
}

async function saveScheduleFromUI(listId, editorEl) {
  const result = await getStorage(['breakLists']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;
  const list = breakLists.find(l => l.id === listId);
  if (!list) return;

  const schedules = [];
  editorEl.querySelectorAll('.schedule-window').forEach(windowEl => {
    const days = [];
    windowEl.querySelectorAll('.day-chip').forEach((chip, idx) => {
      if (chip.classList.contains('active')) days.push(idx);
    });
    const times = windowEl.querySelectorAll('.schedule-time-input');
    const startTime = times[0]?.value || '09:00';
    const endTime = times[1]?.value || '17:00';
    schedules.push({ days, startTime, endTime });
  });

  list.schedules = schedules;
  await setStorage({ breakLists });
  chrome.runtime.sendMessage({ action: 'evaluateScheduler' });
  showSavedIndicator();
}

async function renderActiveProductiveLists() {
  const result = await getStorage(['productiveLists', 'productiveMode']);
  const productiveLists = result.productiveLists || DEFAULTS.productiveLists;
  const mode = result.productiveMode || DEFAULTS.productiveMode;

  const wrapper = document.getElementById('activeProductiveLists');
  const inner = document.getElementById('activeProductiveListsInner');
  const noListsMsg = document.getElementById('noProductiveListsMsg');

  // Show/hide based on productive mode
  wrapper.style.display = mode === 'lists' ? 'block' : 'none';

  inner.innerHTML = '';

  if (productiveLists.length === 0) {
    noListsMsg.style.display = 'block';
    return;
  }
  noListsMsg.style.display = 'none';

  productiveLists.forEach(list => {
    const row = document.createElement('div');
    row.className = 'list-selector-row' + (list.isActive ? ' active' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = list.isActive;
    checkbox.dataset.listId = list.id;

    const check = document.createElement('div');
    check.className = 'list-selector-check';
    check.innerHTML = '<svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg>';

    const name = document.createElement('span');
    name.className = 'list-selector-name';
    name.textContent = list.name;

    const badge = document.createElement('span');
    badge.className = 'list-selector-badge';
    badge.textContent = `${list.sites.length} sites · ${list.apps.length} apps`;

    row.appendChild(checkbox);
    row.appendChild(check);
    row.appendChild(name);
    row.appendChild(badge);
    row.addEventListener('click', (e) => {
      checkbox.checked = !checkbox.checked;
      row.classList.toggle('active', checkbox.checked);
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    inner.appendChild(row);
  });
}

// === Shared Preset Rendering Helpers ===

function renderSitePresets(containerId, presets, selectedSites) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';

  const categories = [...new Set(presets.map(s => s.category))];
  categories.forEach(category => {
    const header = document.createElement('div');
    header.className = 'app-category-header';
    header.textContent = category;
    grid.appendChild(header);

    presets.filter(s => s.category === category).forEach(site => {
      const domains = site.domains || [site.domain];
      const item = document.createElement('div');
      item.className = 'app-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.domains = JSON.stringify(domains);
      checkbox.checked = domains.some(d => selectedSites.includes(d));

      const label = document.createElement('span');
      label.textContent = site.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
      grid.appendChild(item);
    });
  });
}

function renderAppPresets(containerId, presets, selectedApps) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';

  const categories = [...new Set(presets.map(a => a.category))];
  categories.forEach(category => {
    const header = document.createElement('div');
    header.className = 'app-category-header';
    header.textContent = category;
    grid.appendChild(header);

    presets.filter(a => a.category === category).forEach(app => {
      const item = document.createElement('div');
      item.className = 'app-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.process = app.process;
      checkbox.checked = selectedApps.some(a => {
        const proc = typeof a === 'string' ? a : a.process;
        return proc === app.process;
      });

      const label = document.createElement('span');
      label.textContent = app.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
      grid.appendChild(item);
    });
  });
}

function renderProductiveAppPresets(containerId, presets, selectedApps) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';

  const categories = [...new Set(presets.map(a => a.category))];
  categories.forEach(category => {
    const header = document.createElement('div');
    header.className = 'app-category-header';
    header.textContent = category;
    grid.appendChild(header);

    presets.filter(a => a.category === category).forEach(app => {
      const item = document.createElement('div');
      item.className = 'app-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.process = app.process;
      checkbox.checked = selectedApps.includes(app.process);

      const label = document.createElement('span');
      label.textContent = app.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
      grid.appendChild(item);
    });
  });
}

// === Collecting from Editors ===

function collectSitesFromEditor(presetContainerId, presets, customTextareaId) {
  const sites = [];
  const grid = document.getElementById(presetContainerId);
  grid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked && cb.dataset.domains) {
      sites.push(...JSON.parse(cb.dataset.domains));
    }
  });
  const customText = document.getElementById(customTextareaId).value;
  sites.push(...customText.split('\n').map(s => s.trim()).filter(s => s.length > 0));
  return sites;
}

function collectBreakAppsFromEditor(presetContainerId, presets, customTextareaId) {
  const apps = [];
  const grid = document.getElementById(presetContainerId);
  grid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked && cb.dataset.process) {
      const preset = presets.find(p => p.process === cb.dataset.process);
      if (preset) {
        const entry = { name: preset.name, process: preset.process };
        if (preset.detectProcesses) entry.detectProcesses = preset.detectProcesses;
        if (preset.killProcesses) entry.killProcesses = preset.killProcesses;
        apps.push(entry);
      }
    }
  });
  const customText = document.getElementById(customTextareaId).value;
  customText.split('\n').map(s => s.trim()).filter(s => s.length > 0).forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      apps.push({ name: parts[0].trim(), process: parts[1].trim() });
    } else {
      apps.push({ name: line, process: line });
    }
  });
  return apps;
}

function collectProductiveAppsFromEditor(presetContainerId, presets, customTextareaId) {
  const apps = [];
  const grid = document.getElementById(presetContainerId);
  grid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked && cb.dataset.process) {
      apps.push(cb.dataset.process);
    }
  });
  const customText = document.getElementById(customTextareaId).value;
  apps.push(...customText.split('\n').map(s => s.trim()).filter(s => s.length > 0));
  return apps;
}

// === Toggle active list ===

async function toggleBreakListActive(listId, isActive) {
  const result = await getStorage(['breakLists']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;
  const list = breakLists.find(l => l.id === listId);
  if (list) {
    // When toggling via checkbox, switch between 'off' and 'manual'
    list.isActive = isActive;
    list.mode = isActive ? 'manual' : 'off';
    await setStorage({ breakLists });
    chrome.runtime.sendMessage({ action: 'evaluateScheduler' });
    showSavedIndicator();
  }
}

async function toggleProductiveListActive(listId, isActive) {
  const result = await getStorage(['productiveLists']);
  const productiveLists = result.productiveLists || DEFAULTS.productiveLists;
  const list = productiveLists.find(l => l.id === listId);
  if (list) {
    list.isActive = isActive;
    await setStorage({ productiveLists });
    showSavedIndicator();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setEmojiFavicon('⚙️');

  // Apply app name from constants
  document.title = APP_NAME + ' Settings';
  document.querySelector('.header h1').textContent = APP_NAME + ' Settings';

  await setApiBaseUrlFromConfig();
  await loadSettings();
  await loadNuclearBlock();

  await loadBreakLists();
  await loadProductiveLists();
  await renderActiveBreakLists();
  await renderActiveProductiveLists();

  // Load productive mode for initial render
  const prodModeResult = await getStorage(['productiveMode']);
  const productiveMode = prodModeResult.productiveMode || DEFAULTS.productiveMode;
  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.checked = radio.value === productiveMode;
  });
  renderActiveProductiveLists();

  // Lock sections if session is active
  chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
    if (status && status.sessionActive) lockSiteSections(true);
  });

  // Listen for session start/end while settings page is open
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'sessionStarted') lockSiteSections(true);
    if (message.action === 'sessionEnded') lockSiteSections(false);
  });

  // Auto-save for allowed paths
  document.getElementById('allowedPaths').addEventListener('input', (e) => {
    const paths = e.target.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    autoSave('allowedPaths', paths);
  });

  // Auto-save for skip productivity check popup sites
  document.getElementById('skipProductivityCheck').addEventListener('input', (e) => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    autoSave('skipProductivityCheck', sites);
  });

  // Auto-save for strict mode
  document.querySelectorAll('input[name="strictMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      autoSave('strictMode', e.target.value);
    });
  });

  // Auto-save for penalty enabled toggle
  document.querySelectorAll('input[name="penaltyEnabled"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      togglePenaltySections(e.target.value);
      autoSave('penaltyEnabled', e.target.value);
    });
  });

  // Companion mode toggle
  document.querySelectorAll('input[name="companionMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      autoSave('companionMode', mode);
      chrome.runtime.sendMessage({ action: 'setCompanionMode', mode }, (response) => {
        if (response && response.success) {
          scheduleNativeHostStatusChecks();
          setSyncStatus(
            mode === 'on'
              ? 'Companion mode enabled. Install native host/app on this device.'
              : 'Extension-only mode enabled.',
            false
          );
        } else {
          setSyncStatus('Could not switch companion mode.', true);
        }
      });
    });
  });

  // Auto-save for penalty type
  document.querySelectorAll('input[name="penaltyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      autoSave('penaltyType', e.target.value);
    });
  });

  // Auto-save for penalty target
  document.getElementById('penaltyTarget').addEventListener('input', (e) => {
    autoSave('penaltyTarget', e.target.value.trim());
  });

  // Auto-save for penalty amount
  document.getElementById('penaltyAmount').addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      autoSave('penaltyAmount', value);
    }
  });

  // Auto-save for payment method
  document.getElementById('paymentMethod').addEventListener('input', (e) => {
    autoSave('paymentMethod', e.target.value.trim());
  });

  document.getElementById('btn-delete-analytics').addEventListener('click', handleDeleteAnalytics);
  document.getElementById('btn-delete-all-data').addEventListener('click', handleDeleteAllData);

  // Nuclear Block
  document.getElementById('nuclearSecondCooldown').addEventListener('change', () => saveNuclearSettings());

  document.getElementById('btn-add-nuclear').addEventListener('click', addNuclearSiteFromUI);

  const cooldownSelect = document.getElementById('nuclearCooldown');
  const secondCooldownSelect = document.getElementById('nuclearSecondCooldown');
  const cooldownWarning = document.getElementById('nuclearCooldownTestWarning');
  function updateCooldownWarning() {
    const testMode = cooldownSelect.value === '10000' || secondCooldownSelect.value === '5s';
    cooldownWarning.style.display = testMode ? 'block' : 'none';
  }
  cooldownSelect.addEventListener('change', updateCooldownWarning);
  secondCooldownSelect.addEventListener('change', updateCooldownWarning);
  updateCooldownWarning();

  // Refresh nuclear countdowns every minute
  setInterval(() => loadNuclearBlock(), 60 * 1000);

  // Re-render nuclear block when storage changes (e.g. block again from good-choice/last-chance page)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.nbData) loadNuclearBlock();
  });

  // Active break list mode changes (handled inline by select change events)
  // No change listener needed on container — mode selects have their own handlers

  // Active productive list toggles
  document.getElementById('activeProductiveListsInner').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox' && e.target.dataset.listId) {
      await toggleProductiveListActive(e.target.dataset.listId, e.target.checked);
    }
  });

  // Productive mode radio
  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const mode = e.target.value;
      await setStorage({ productiveMode: mode });
      renderActiveProductiveLists();
      showSavedIndicator();
    });
  });

  // Break list CRUD buttons
  document.getElementById('btn-create-break-list').addEventListener('click', () => {
    editingBreakListId = null;
    document.getElementById('breakListEditor').style.display = 'block';
    document.getElementById('breakListEditorName').value = '';
    renderSitePresets('breakListEditorSites', PRESET_BREAK_SITES, []);
    document.getElementById('breakListEditorCustomSites').value = '';
    renderAppPresets('breakListEditorApps', PRESET_BREAK_APPS, []);
    document.getElementById('breakListEditorCustomApps').value = '';
    // Show/hide apps section
    getStorage(['companionMode']).then(r => {
      document.getElementById('breakListEditorAppsSection').style.display = (r.companionMode || DEFAULTS.companionMode) === 'on' ? 'block' : 'none';
    });
  });
  document.getElementById('btn-save-break-list').addEventListener('click', saveBreakList);
  document.getElementById('btn-cancel-break-list').addEventListener('click', closeBreakListEditor);

  // Productive list CRUD buttons
  document.getElementById('btn-create-productive-list').addEventListener('click', () => {
    editingProductiveListId = null;
    document.getElementById('productiveListEditor').style.display = 'block';
    document.getElementById('productiveListEditorName').value = '';
    renderSitePresets('productiveListEditorSites', PRESET_PRODUCTIVE_SITES, []);
    document.getElementById('productiveListEditorCustomSites').value = '';
    renderProductiveAppPresets('productiveListEditorApps', CURATED_APPS, []);
    document.getElementById('productiveListEditorCustomApps').value = '';
    getStorage(['companionMode']).then(r => {
      document.getElementById('productiveListEditorAppsSection').style.display = (r.companionMode || DEFAULTS.companionMode) === 'on' ? 'block' : 'none';
    });
  });
  document.getElementById('btn-save-productive-list').addEventListener('click', saveProductiveList);
  document.getElementById('btn-cancel-productive-list').addEventListener('click', closeProductiveListEditor);

  // Collapsible sections — disabled for now, but handler kept for future use
  // To re-enable: add class="collapsible" to .section elements that should collapse
  document.querySelectorAll('.section.collapsible h2').forEach(h2 => {
    h2.addEventListener('click', () => {
      h2.closest('.section').classList.toggle('expanded');
    });
  });
});
