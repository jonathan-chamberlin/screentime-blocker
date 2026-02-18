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

    if (key === 'rewardSites') {
      chrome.runtime.sendMessage({ action: 'updateRewardSites', sites: value });
    }
  }, 500);
}

async function loadSettings() {
  const result = await getStorage(Object.keys(DEFAULTS));

  document.getElementById('allowedPaths').value =
    (result.allowedPaths || DEFAULTS.allowedPaths).join('\n');

  const productiveMode = result.productiveMode || DEFAULTS.productiveMode;
  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    if (radio.value === productiveMode) radio.checked = true;
  });
  toggleProductiveSitesList(productiveMode);

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
  toggleAppSections(companionMode);

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

async function loadProductiveApps() {
  const result = await getStorage(['productiveApps', 'companionMode']);
  const userApps = result.productiveApps || [];

  const grid = document.getElementById('curatedAppsList');
  grid.innerHTML = '';

  const categories = [];
  const seen = new Set();
  CURATED_APPS.forEach(app => {
    if (!seen.has(app.category)) {
      seen.add(app.category);
      categories.push(app.category);
    }
  });

  categories.forEach(category => {
    const header = document.createElement('div');
    header.className = 'app-category-header';
    header.textContent = category;
    grid.appendChild(header);

    CURATED_APPS.filter(a => a.category === category).forEach(app => {
      const item = document.createElement('div');
      item.className = 'app-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'app-' + app.process;
      checkbox.checked = userApps.includes(app.process);

      const label = document.createElement('span');
      label.textContent = app.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      grid.appendChild(item);
    });
  });

  const curatedProcessNames = CURATED_APPS.map(a => a.process);
  const customApps = userApps.filter(app => !curatedProcessNames.includes(app));
  document.getElementById('customApps').value = customApps.join('\n');

  refreshNativeHostWarning();
}

async function saveProductiveApps() {
  const apps = [];

  CURATED_APPS.forEach(app => {
    const checkbox = document.getElementById('app-' + app.process);
    if (checkbox && checkbox.checked) {
      apps.push(app.process);
    }
  });

  const customText = document.getElementById('customApps').value;
  const customApps = customText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  apps.push(...customApps);

  await setStorage({ productiveApps: apps });
}

const PRESET_BLOCKED_APPS = [
  // detectProcesses: process names the foreground window may report (Steam UI runs under steamwebhelper)
  // killProcesses: all processes to kill when blocked
  { name: 'Steam', process: 'steam', detectProcesses: ['steam', 'steamwebhelper'], killProcesses: ['steam', 'steamwebhelper'], checked: true },
  { name: 'Epic Games Launcher', process: 'EpicGamesLauncher', checked: false },
  { name: 'Discord', process: 'Discord', checked: false },
  { name: 'Minecraft', process: 'javaw', checked: false },
  // Games
  { name: 'League of Legends', process: 'LeagueClientUx.exe', detectProcesses: ['LeagueClientUx.exe', 'League of Legends.exe'], killProcesses: ['League of Legends.exe', 'LeagueClientUx.exe', 'LeagueClient.exe', 'LeagueClientUxRender.exe'], checked: false },
  { name: 'Valorant', process: 'VALORANT-Win64-Shipping.exe', detectProcesses: ['VALORANT-Win64-Shipping.exe'], killProcesses: ['VALORANT-Win64-Shipping.exe', 'vgtray.exe', 'vgc.exe'], checked: false },
  { name: 'Fortnite', process: 'FortniteClient-Win64-Shipping.exe', detectProcesses: ['FortniteClient-Win64-Shipping.exe'], killProcesses: ['FortniteClient-Win64-Shipping.exe', 'FortniteLauncher.exe'], checked: false },
  { name: 'Apex Legends', process: 'r5apex.exe', detectProcesses: ['r5apex.exe', 'r5apex_dx12.exe'], killProcesses: ['r5apex.exe', 'r5apex_dx12.exe'], checked: false },
  { name: 'World of Warcraft', process: 'Wow.exe', detectProcesses: ['Wow.exe'], killProcesses: ['Wow.exe'], checked: false },
  { name: 'Overwatch 2', process: 'Overwatch.exe', detectProcesses: ['Overwatch.exe'], killProcesses: ['Overwatch.exe'], checked: false },
];

async function loadBlockedApps() {
  const result = await getStorage(['blockedApps']);

  // First-time init: blockedApps was never explicitly saved — persist visual defaults now
  if (result.blockedApps === undefined) {
    const defaults = PRESET_BLOCKED_APPS
      .filter(app => app.checked)
      .map(({ name, process, detectProcesses, killProcesses }) => ({
        name, process,
        ...(detectProcesses && { detectProcesses }),
        ...(killProcesses && { killProcesses }),
      }));
    await setStorage({ blockedApps: defaults });
    result.blockedApps = defaults;
  }

  // Migrate: merge any new preset fields (detectProcesses, killProcesses) into existing stored entries
  let needsMigration = false;
  const migrated = result.blockedApps.map(stored => {
    const preset = PRESET_BLOCKED_APPS.find(p => p.process === stored.process);
    if (!preset) return stored;
    const merged = { ...stored };
    if (preset.detectProcesses && !stored.detectProcesses) { merged.detectProcesses = preset.detectProcesses; needsMigration = true; }
    if (preset.killProcesses && !stored.killProcesses) { merged.killProcesses = preset.killProcesses; needsMigration = true; }
    return merged;
  });
  if (needsMigration) {
    await setStorage({ blockedApps: migrated });
    result.blockedApps = migrated;
  }

  const userBlockedApps = result.blockedApps;
  const presetProcessNames = new Set(PRESET_BLOCKED_APPS.map(a => a.process));

  const grid = document.getElementById('blockedAppsList');
  grid.innerHTML = '';

  PRESET_BLOCKED_APPS.forEach(app => {
    const item = document.createElement('div');
    item.className = 'app-checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'blocked-app-' + app.process;
    checkbox.checked = userBlockedApps.some(ua => ua.process === app.process);

    const label = document.createElement('span');
    label.textContent = app.name;

    item.appendChild(checkbox);
    item.appendChild(label);
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    grid.appendChild(item);
  });
}

async function saveBlockedApps() {
  // Read current storage to preserve any custom apps (not in preset list)
  const result = await getStorage(['blockedApps']);
  const existing = result.blockedApps || [];
  const presetProcessNames = new Set(PRESET_BLOCKED_APPS.map(a => a.process));
  const customApps = existing.filter(app => !presetProcessNames.has(app.process));

  const presetApps = [];
  PRESET_BLOCKED_APPS.forEach(app => {
    const checkbox = document.getElementById('blocked-app-' + app.process);
    if (checkbox && checkbox.checked) {
      const entry = { name: app.name, process: app.process };
      if (app.detectProcesses) entry.detectProcesses = app.detectProcesses;
      if (app.killProcesses) entry.killProcesses = app.killProcesses;
      presetApps.push(entry);
    }
  });

  await setStorage({ blockedApps: [...presetApps, ...customApps] });
}

function addCustomBlockedApp() {
  const nameInput = document.getElementById('custom-blocked-app-name');
  const processInput = document.getElementById('custom-blocked-app-process');

  const name = nameInput.value.trim();
  const process = processInput.value.trim();

  if (!name || !process) {
    alert('Please enter both app name and process name');
    return;
  }

  getStorage(['blockedApps']).then(result => {
    const blockedApps = result.blockedApps || [];
    if (blockedApps.some(app => app.process === process)) {
      alert('This app is already in your blocked list');
      return;
    }

    blockedApps.push({ name, process });
    setStorage({ blockedApps }).then(() => {
      nameInput.value = '';
      processInput.value = '';
      loadBlockedApps();
      showSavedIndicator();
    });
  });
}

function getSitePresetDomains(site) {
  return site.domains || [site.domain];
}

function getSitePresetId(site) {
  return 'site-' + (site.domain || site.domains[0]);
}

async function loadBlockedSites() {
  const result = await getStorage(['rewardSites']);
  let storedSites = result.rewardSites;

  // First-time init: persist defaults from preset checked values
  if (storedSites === undefined) {
    storedSites = [];
    PRESET_BLOCKED_SITES.forEach(site => {
      if (site.checked) storedSites.push(...getSitePresetDomains(site));
    });
    await setStorage({ rewardSites: storedSites });
  }

  const allPresetDomains = new Set();
  PRESET_BLOCKED_SITES.forEach(site => getSitePresetDomains(site).forEach(d => allPresetDomains.add(d)));
  const customSites = storedSites.filter(d => !allPresetDomains.has(d));

  const grid = document.getElementById('blockedSitesList');
  grid.innerHTML = '';

  const categories = [...new Set(PRESET_BLOCKED_SITES.map(s => s.category))];
  categories.forEach(category => {
    const header = document.createElement('div');
    header.className = 'app-category-header';
    header.textContent = category;
    grid.appendChild(header);

    PRESET_BLOCKED_SITES.filter(s => s.category === category).forEach(site => {
      const domains = getSitePresetDomains(site);
      const item = document.createElement('div');
      item.className = 'app-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = getSitePresetId(site);
      checkbox.checked = domains.some(d => storedSites.includes(d));

      const label = document.createElement('span');
      label.textContent = site.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      grid.appendChild(item);
    });
  });

  document.getElementById('customBlockedSites').value = customSites.join('\n');
}

async function saveBlockedSites() {
  const sites = [];
  PRESET_BLOCKED_SITES.forEach(site => {
    const checkbox = document.getElementById(getSitePresetId(site));
    if (checkbox && checkbox.checked) sites.push(...getSitePresetDomains(site));
  });
  const customText = document.getElementById('customBlockedSites').value;
  sites.push(...customText.split('\n').map(s => s.trim()).filter(s => s.length > 0));

  await setStorage({ rewardSites: sites });
  chrome.runtime.sendMessage({ action: 'updateRewardSites', sites });
  showSavedIndicator();
}

async function loadProductiveSites() {
  const result = await getStorage(['productiveSites']);
  let storedSites = result.productiveSites;

  // First-time init: persist defaults from preset checked values
  if (storedSites === undefined) {
    storedSites = PRESET_PRODUCTIVE_SITES.filter(s => s.checked).map(s => s.domain);
    await setStorage({ productiveSites: storedSites });
  }

  const presetDomains = new Set(PRESET_PRODUCTIVE_SITES.map(s => s.domain));
  const customSites = storedSites.filter(d => !presetDomains.has(d));

  const grid = document.getElementById('productiveSitesList');
  grid.innerHTML = '';

  const categories = [...new Set(PRESET_PRODUCTIVE_SITES.map(s => s.category))];
  categories.forEach(category => {
    const header = document.createElement('div');
    header.className = 'app-category-header';
    header.textContent = category;
    grid.appendChild(header);

    PRESET_PRODUCTIVE_SITES.filter(s => s.category === category).forEach(site => {
      const item = document.createElement('div');
      item.className = 'app-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'productive-site-' + site.domain;
      checkbox.checked = storedSites.includes(site.domain);

      const label = document.createElement('span');
      label.textContent = site.name;

      item.appendChild(checkbox);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      grid.appendChild(item);
    });
  });

  document.getElementById('customProductiveSites').value = customSites.join('\n');
}

async function saveProductiveSites() {
  const productiveMode = document.querySelector('input[name="productiveMode"]:checked').value;
  const sites = [];
  PRESET_PRODUCTIVE_SITES.forEach(site => {
    const checkbox = document.getElementById('productive-site-' + site.domain);
    if (checkbox && checkbox.checked) sites.push(site.domain);
  });
  const customText = document.getElementById('customProductiveSites').value;
  sites.push(...customText.split('\n').map(s => s.trim()).filter(s => s.length > 0));

  await setStorage({ productiveMode, productiveSites: sites });
  showSavedIndicator();
}

function toggleProductiveSitesList(mode) {
  document.getElementById('productiveSitesGroup').style.display =
    mode === 'whitelist' ? 'block' : 'none';
}

function toggleAppSections(companionMode) {
  const visible = companionMode === 'on';
  document.getElementById('section-productive-apps').style.display = visible ? 'block' : 'none';
  document.getElementById('section-blocked-apps').style.display = visible ? 'block' : 'none';
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

async function handleDeleteAllData() {
  const confirmed = window.confirm(
    'Delete all Brainrot Blocker data on this browser?\n\nThis cannot be undone.'
  );
  if (!confirmed) return;

  chrome.runtime.sendMessage({ action: 'deleteAllData' }, async (response) => {
    if (response && response.success) {
      await loadSettings();
      await loadBlockedSites();
      await loadProductiveSites();
      await loadProductiveApps();
      await loadBlockedApps();
      showSavedIndicator();
      alert('All Brainrot Blocker data was deleted.');
    } else {
      alert('Failed to delete data. Please try again.');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setEmojiFavicon('⚙️');

  // Apply app name from constants
  document.title = APP_NAME + ' Settings';
  document.querySelector('.header h1').textContent = APP_NAME + ' Settings';

  await setApiBaseUrlFromConfig();
  await loadSettings();
  await loadBlockedSites();
  await loadProductiveSites();
  await loadProductiveApps();
  await loadBlockedApps();
  scheduleNativeHostStatusChecks();

  // Lock sections if session is active
  chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
    if (status && status.sessionActive) lockSiteSections(true);
  });

  // Listen for session start/end while settings page is open
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'sessionStarted') lockSiteSections(true);
    if (message.action === 'sessionEnded') lockSiteSections(false);
  });

  // Auto-save for blocked sites checkboxes
  document.getElementById('blockedSitesList').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      await saveBlockedSites();
    }
  });

  // Auto-save for custom blocked sites textarea
  let customBlockedSitesTimeout;
  document.getElementById('customBlockedSites').addEventListener('input', () => {
    if (customBlockedSitesTimeout) clearTimeout(customBlockedSitesTimeout);
    customBlockedSitesTimeout = setTimeout(() => saveBlockedSites(), 500);
  });

  // Auto-save for allowed paths
  document.getElementById('allowedPaths').addEventListener('input', (e) => {
    const paths = e.target.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    autoSave('allowedPaths', paths);
  });

  // Auto-save for productive mode
  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleProductiveSitesList(e.target.value);
      saveProductiveSites();
    });
  });

  // Auto-save for productive sites checkboxes
  document.getElementById('productiveSitesList').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      await saveProductiveSites();
    }
  });

  // Auto-save for custom productive sites textarea
  let customProductiveSitesTimeout;
  document.getElementById('customProductiveSites').addEventListener('input', () => {
    if (customProductiveSitesTimeout) clearTimeout(customProductiveSitesTimeout);
    customProductiveSitesTimeout = setTimeout(() => saveProductiveSites(), 500);
  });

  // Auto-save for skip productivity check popup sites
  document.getElementById('skipProductivityCheck').addEventListener('input', (e) => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    autoSave('skipProductivityCheck', sites);
  });

  // Auto-save for productive apps checkboxes
  document.getElementById('curatedAppsList').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      await saveProductiveApps();
      showSavedIndicator();
    }
  });

  // Auto-save for custom productive apps
  let customAppsTimeout;
  document.getElementById('customApps').addEventListener('input', () => {
    if (customAppsTimeout) clearTimeout(customAppsTimeout);
    customAppsTimeout = setTimeout(async () => {
      await saveProductiveApps();
      showSavedIndicator();
    }, 500);
  });

  // Auto-save for blocked apps checkboxes
  document.getElementById('blockedAppsList').addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      await saveBlockedApps();
      showSavedIndicator();
    }
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
      toggleAppSections(mode);
      autoSave('companionMode', mode);
      chrome.runtime.sendMessage({ action: 'setCompanionMode', mode }, (response) => {
        if (response && response.success) {
          loadProductiveApps();
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

  // Keep add blocked app button functionality
  document.getElementById('add-blocked-app').addEventListener('click', addCustomBlockedApp);

  // Keep install instructions link
  document.getElementById('installInstructions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('install-guide.html') });
  });

  document.getElementById('btn-sync-push').addEventListener('click', () => {
    setSyncStatus('Pushing settings to cloud...', false);
    chrome.runtime.sendMessage({ action: 'syncSettingsToBackend' }, (response) => {
      if (response && response.success) {
        setSyncStatus('Cloud sync push complete.', false);
      } else if (response && response.skipped) {
        setSyncStatus('Sign in first to sync cloud config.', true);
      } else {
        setSyncStatus('Cloud sync push failed.', true);
      }
    });
  });

  document.getElementById('btn-sync-pull').addEventListener('click', () => {
    setSyncStatus('Pulling settings from cloud...', false);
    chrome.runtime.sendMessage({ action: 'pullSettingsFromBackend' }, async (response) => {
      if (response && response.success) {
        await loadSettings();
        await loadProductiveApps();
        await loadBlockedApps();
        setSyncStatus('Cloud sync pull complete.', false);
      } else if (response && response.skipped) {
        setSyncStatus('Sign in first to sync cloud config.', true);
      } else {
        setSyncStatus('Cloud sync pull failed.', true);
      }
    });
  });

  document.getElementById('btn-delete-all-data').addEventListener('click', handleDeleteAllData);
});
