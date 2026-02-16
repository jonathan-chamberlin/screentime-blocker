function showConfirmation(elementId) {
  const confirmation = document.getElementById(elementId);
  confirmation.classList.add('show');
  setTimeout(() => confirmation.classList.remove('show'), 2000);
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

  const penaltyType = result.penaltyType || DEFAULTS.penaltyType;
  document.querySelectorAll('input[name="penaltyType"]').forEach(radio => {
    if (radio.value === penaltyType) radio.checked = true;
  });

  const strictMode = result.strictMode || DEFAULTS.strictMode;
  document.querySelectorAll('input[name="strictMode"]').forEach(radio => {
    if (radio.value === strictMode) radio.checked = true;
  });

  document.getElementById('penaltyTarget').value = result.penaltyTarget || DEFAULTS.penaltyTarget;
  document.getElementById('penaltyAmount').value = result.penaltyAmount || DEFAULTS.penaltyAmount;
  document.getElementById('paymentMethod').value = result.paymentMethod || DEFAULTS.paymentMethod;
}

async function loadProductiveApps() {
  const result = await getStorage(['productiveApps']);
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
        if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
      });
      grid.appendChild(item);
    });
  });

  const curatedProcessNames = CURATED_APPS.map(a => a.process);
  const customApps = userApps.filter(app => !curatedProcessNames.includes(app));
  document.getElementById('customApps').value = customApps.join('\n');

  chrome.runtime.sendMessage({ action: 'getNativeHostStatus' }, (response) => {
    if (!response || !response.available) {
      document.getElementById('nativeHostWarning').style.display = 'block';
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
  showConfirmation('productiveAppsConfirmation');
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
      if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
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
  showConfirmation('blockedAppsConfirmation');
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
      showConfirmation('blockedAppsConfirmation');
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

  document.getElementById('saveRewardSites').addEventListener('click', saveRewardSites);
  document.getElementById('saveProductiveSites').addEventListener('click', saveProductiveSites);

  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => toggleProductiveSitesList(e.target.value));
  });

  document.getElementById('saveStrictMode').addEventListener('click', async () => {
    const strictMode = document.querySelector('input[name="strictMode"]:checked').value;
    await setStorage({ strictMode });
    showConfirmation('strictModeConfirmation');
  });

  document.getElementById('savePenalty').addEventListener('click', savePenalty);
  document.getElementById('savePayment').addEventListener('click', savePayment);

  document.getElementById('saveProductiveApps').addEventListener('click', saveProductiveApps);
  document.getElementById('installInstructions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('install-guide.html') });
  });

  document.getElementById('saveBlockedApps').addEventListener('click', saveBlockedApps);
  document.getElementById('add-blocked-app').addEventListener('click', addCustomBlockedApp);
});
