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
  await loadSettings();

  // Lock sections if session is active
  chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
    if (status && status.sessionActive) lockSiteSections(true);
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
});
