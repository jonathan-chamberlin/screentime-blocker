let hasUnsavedChanges = false;
const pendingChanges = {};

function markAsChanged(settingKey, value) {
  hasUnsavedChanges = true;
  pendingChanges[settingKey] = value;
  showSaveBanner();
}

function showSaveBanner() {
  const banner = document.getElementById('save-banner');
  banner.classList.remove('hidden');
}

function hideSaveBanner() {
  const banner = document.getElementById('save-banner');
  banner.classList.add('hidden');
  hasUnsavedChanges = false;
  Object.keys(pendingChanges).forEach(key => delete pendingChanges[key]);
}

function showSuccessMessage(msg) {
  const bannerMessage = document.querySelector('.save-banner-message');
  bannerMessage.textContent = msg;
  bannerMessage.style.color = '#00ff88';
  setTimeout(() => {
    hideSaveBanner();
    bannerMessage.textContent = 'You have unsaved changes';
    bannerMessage.style.color = 'rgba(255, 255, 255, 0.8)';
  }, 2000);
}

function showErrorMessage(msg) {
  const bannerMessage = document.querySelector('.save-banner-message');
  bannerMessage.textContent = msg;
  bannerMessage.style.color = '#ff4757';
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
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        markAsChanged('_productiveAppsChanged', true);
      });
      checkbox.addEventListener('change', () => {
        markAsChanged('_productiveAppsChanged', true);
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

function toggleProductiveSitesList(mode) {
  document.getElementById('productiveSitesGroup').style.display =
    mode === 'whitelist' ? 'block' : 'none';
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

  // Lock sections if session is active
  chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
    if (status && status.sessionActive) lockSiteSections(true);
  });

  // Listen for session start/end while settings page is open
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'sessionStarted') lockSiteSections(true);
    if (message.action === 'sessionEnded') lockSiteSections(false);
  });

  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => toggleProductiveSitesList(e.target.value));
  });

  document.getElementById('installInstructions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('install-guide.html') });
  });

  // Change detection for all inputs
  document.getElementById('rewardSites').addEventListener('input', (e) => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    markAsChanged('rewardSites', sites);
  });

  document.getElementById('allowedPaths').addEventListener('input', (e) => {
    const paths = e.target.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    markAsChanged('allowedPaths', paths);
  });

  document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      markAsChanged('productiveMode', e.target.value);
    });
  });

  document.getElementById('productiveSites').addEventListener('input', (e) => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    markAsChanged('productiveSites', sites);
  });

  document.querySelectorAll('input[name="strictMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      markAsChanged('strictMode', e.target.value);
    });
  });

  document.querySelectorAll('input[name="penaltyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      markAsChanged('penaltyType', e.target.value);
    });
  });

  document.getElementById('penaltyTarget').addEventListener('input', (e) => {
    markAsChanged('penaltyTarget', e.target.value.trim());
  });

  document.getElementById('penaltyAmount').addEventListener('input', (e) => {
    markAsChanged('penaltyAmount', parseInt(e.target.value, 10));
  });

  document.getElementById('paymentMethod').addEventListener('input', (e) => {
    markAsChanged('paymentMethod', e.target.value.trim());
  });

  document.getElementById('customApps').addEventListener('input', () => {
    // This will be handled specially in unified save handler
    markAsChanged('_productiveAppsChanged', true);
  });

  // Unified save button handler
  document.getElementById('save-all-btn').addEventListener('click', async () => {
    try {
      // If productive apps changed, rebuild the full list
      if (pendingChanges._productiveAppsChanged) {
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
        pendingChanges.productiveApps = apps;
        delete pendingChanges._productiveAppsChanged;
      }

      await setStorage(pendingChanges);

      // Send update message for reward sites if changed
      if (pendingChanges.rewardSites) {
        chrome.runtime.sendMessage({
          action: 'updateRewardSites',
          sites: pendingChanges.rewardSites
        });
      }

      showSuccessMessage('All settings saved!');
    } catch (error) {
      showErrorMessage('Failed to save settings: ' + error.message);
    }
  });
});
