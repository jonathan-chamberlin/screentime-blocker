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

let saveTimeouts = {};

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

  document.getElementById('rewardSites').value =
    (result.rewardSites || DEFAULTS.rewardSites).join('\n');

  document.getElementById('allowedPaths').value =
    (result.allowedPaths || DEFAULTS.allowedPaths).join('\n');

  const productiveMode = result.productiveMode || DEFAULTS.productiveMode;
  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    if (radio.value === productiveMode) radio.checked = true;
  });
  toggleProductiveSitesList(productiveMode);

  document.getElementById('productiveSites').value =
    (result.productiveSites || DEFAULTS.productiveSites).join('\n');

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

async function loadProductiveApps() {
  const result = await getStorage(['productiveApps', 'companionMode']);
  const userApps = result.productiveApps || [];
  const companionMode = result.companionMode || DEFAULTS.companionMode;

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

  chrome.runtime.sendMessage({ action: 'getNativeHostStatus' }, (response) => {
    if (companionMode === 'on' && (!response || !response.available)) {
      document.getElementById('nativeHostWarning').style.display = 'block';
    } else {
      document.getElementById('nativeHostWarning').style.display = 'none';
    }
  });
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

async function loadBlockedApps() {
  const result = await getStorage(['blockedApps']);
  const userBlockedApps = result.blockedApps || [];

  const grid = document.getElementById('blockedAppsList');
  grid.innerHTML = '';

  const defaultBlockedApps = [
    { name: 'Steam', process: 'steam', checked: true },
    { name: 'Epic Games Launcher', process: 'EpicGamesLauncher', checked: false },
    { name: 'Discord', process: 'Discord', checked: false },
    { name: 'Minecraft', process: 'javaw', checked: false },
  ];

  defaultBlockedApps.forEach(app => {
    const item = document.createElement('div');
    item.className = 'app-checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'blocked-app-' + app.process;
    const isChecked = userBlockedApps.some(ua => ua.process === app.process);
    checkbox.checked = isChecked || (userBlockedApps.length === 0 && app.checked);

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
  const blockedApps = [];

  const defaultBlockedApps = [
    { name: 'Steam', process: 'steam' },
    { name: 'Epic Games Launcher', process: 'EpicGamesLauncher' },
    { name: 'Discord', process: 'Discord' },
    { name: 'Minecraft', process: 'javaw' },
  ];

  defaultBlockedApps.forEach(app => {
    const checkbox = document.getElementById('blocked-app-' + app.process);
    if (checkbox && checkbox.checked) {
      blockedApps.push({ name: app.name, process: app.process });
    }
  });

  await setStorage({ blockedApps });
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

async function saveRewardSites() {
  const sites = document.getElementById('rewardSites').value
    .split('\n').map(s => s.trim()).filter(s => s.length > 0);
  const allowedPaths = document.getElementById('allowedPaths').value
    .split('\n').map(p => p.trim()).filter(p => p.length > 0);

  await setStorage({ rewardSites: sites, allowedPaths });
  chrome.runtime.sendMessage({ action: 'updateRewardSites', sites });
  showConfirmation('rewardSitesConfirmation');
}

function toggleProductiveSitesList(mode) {
  document.getElementById('productiveSitesGroup').style.display =
    mode === 'whitelist' ? 'block' : 'none';
}

async function saveProductiveSites() {
  const productiveMode = document.querySelector('input[name="productiveMode"]:checked').value;
  const sites = document.getElementById('productiveSites').value
    .split('\n').map(s => s.trim()).filter(s => s.length > 0);

  await setStorage({ productiveMode, productiveSites: sites });
  showConfirmation('productiveSitesConfirmation');
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

document.addEventListener('DOMContentLoaded', async () => {
  // Apply app name from constants
  document.title = APP_NAME + ' Settings';
  document.querySelector('.header h1').textContent = APP_NAME + ' Settings';

  await setApiBaseUrlFromConfig();
  await loadSettings();
  await loadProductiveApps();
  await loadBlockedApps();

  // Lock sections if session is active
  chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
    if (status && status.sessionActive) lockSiteSections(true);
  });

  // Listen for session start/end while settings page is open
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'sessionStarted') lockSiteSections(true);
    if (message.action === 'sessionEnded') lockSiteSections(false);
  });

  // Auto-save for reward sites
  document.getElementById('rewardSites').addEventListener('input', (e) => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    autoSave('rewardSites', sites);
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
      autoSave('productiveMode', e.target.value);
    });
  });

  // Auto-save for productive sites
  document.getElementById('productiveSites').addEventListener('input', (e) => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    autoSave('productiveSites', sites);
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

  // Companion mode toggle
  document.querySelectorAll('input[name="companionMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      autoSave('companionMode', mode);
      chrome.runtime.sendMessage({ action: 'setCompanionMode', mode }, (response) => {
        if (response && response.success) {
          loadProductiveApps();
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
});
