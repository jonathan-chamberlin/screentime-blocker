const DEFAULT_SETTINGS = {
    workMinutes: 50,
    rewardMinutes: 10,
    rewardSites: ['youtube.com', 'instagram.com', 'pinterest.com', 'reddit.com', 'tiktok.com'],
    allowedPaths: [],
    productiveMode: 'whitelist',
    productiveSites: ['docs.google.com', 'notion.so', 'github.com'],
    penaltyType: 'Charity',
    penaltyTarget: '',
    penaltyAmount: 5,
    paymentMethod: ''
};

function showConfirmation(elementId) {
    const confirmation = document.getElementById(elementId);
    confirmation.classList.add('show');
    setTimeout(() => {
        confirmation.classList.remove('show');
    }, 2000);
}

function loadSettings() {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
        const rewardSites = result.rewardSites || DEFAULT_SETTINGS.rewardSites;
        document.getElementById('rewardSites').value = rewardSites.join('\n');

        const allowedPaths = result.allowedPaths || DEFAULT_SETTINGS.allowedPaths;
        document.getElementById('allowedPaths').value = allowedPaths.join('\n');

        const productiveMode = result.productiveMode || DEFAULT_SETTINGS.productiveMode;
        const modeRadios = document.querySelectorAll('input[name="productiveMode"]');
        modeRadios.forEach(radio => {
            if (radio.value === productiveMode) radio.checked = true;
        });
        toggleProductiveSitesList(productiveMode);

        const productiveSites = result.productiveSites || DEFAULT_SETTINGS.productiveSites;
        document.getElementById('productiveSites').value = productiveSites.join('\n');

        const penaltyType = result.penaltyType || DEFAULT_SETTINGS.penaltyType;
        const radioButtons = document.querySelectorAll('input[name="penaltyType"]');
        radioButtons.forEach(radio => {
            if (radio.value === penaltyType) {
                radio.checked = true;
            }
        });

        document.getElementById('penaltyTarget').value = result.penaltyTarget || DEFAULT_SETTINGS.penaltyTarget;
        document.getElementById('penaltyAmount').value = result.penaltyAmount || DEFAULT_SETTINGS.penaltyAmount;
        document.getElementById('paymentMethod').value = result.paymentMethod || DEFAULT_SETTINGS.paymentMethod;
    });
}

function saveRewardSites() {
    const sitesText = document.getElementById('rewardSites').value;
    const sites = sitesText
        .split('\n')
        .map(site => site.trim())
        .filter(site => site.length > 0);

    const pathsText = document.getElementById('allowedPaths').value;
    const allowedPaths = pathsText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

    chrome.storage.local.set({ rewardSites: sites, allowedPaths }, () => {
        chrome.runtime.sendMessage({
            action: 'updateRewardSites',
            sites: sites
        });
        showConfirmation('rewardSitesConfirmation');
    });
}

function toggleProductiveSitesList(mode) {
    const group = document.getElementById('productiveSitesGroup');
    group.style.display = mode === 'whitelist' ? 'block' : 'none';
}

function saveProductiveSites() {
    const productiveMode = document.querySelector('input[name="productiveMode"]:checked').value;
    const sitesText = document.getElementById('productiveSites').value;
    const sites = sitesText
        .split('\n')
        .map(site => site.trim())
        .filter(site => site.length > 0);

    chrome.storage.local.set({ productiveMode, productiveSites: sites }, () => {
        showConfirmation('productiveSitesConfirmation');
    });
}

function savePenalty() {
    const penaltyType = document.querySelector('input[name="penaltyType"]:checked').value;
    const penaltyTarget = document.getElementById('penaltyTarget').value.trim();
    const penaltyAmount = parseInt(document.getElementById('penaltyAmount').value, 10);

    chrome.storage.local.set({ penaltyType, penaltyTarget, penaltyAmount }, () => {
        showConfirmation('penaltyConfirmation');
    });
}

function savePayment() {
    const paymentMethod = document.getElementById('paymentMethod').value.trim();

    chrome.storage.local.set({ paymentMethod }, () => {
        showConfirmation('paymentConfirmation');
    });
}

function lockSiteSections(locked) {
    // Disable/enable textareas
    document.getElementById('rewardSites').disabled = locked;
    document.getElementById('allowedPaths').disabled = locked;
    document.getElementById('productiveSites').disabled = locked;

    // Disable/enable radio buttons
    document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
        radio.disabled = locked;
    });

    // Disable/enable save buttons
    document.getElementById('saveRewardSites').disabled = locked;
    document.getElementById('saveProductiveSites').disabled = locked;

    // Add/remove locked class to section elements
    const sections = document.querySelectorAll('.section');
    if (locked) {
        sections[0].classList.add('section-locked'); // Reward Sites section
        sections[1].classList.add('section-locked'); // Productive Sites section
    } else {
        sections[0].classList.remove('section-locked');
        sections[1].classList.remove('section-locked');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    // Check session status and lock sections if session is active
    chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
        if (status && status.sessionActive) {
            lockSiteSections(true);
        }
    });

    document.getElementById('saveRewardSites').addEventListener('click', saveRewardSites);
    document.getElementById('saveProductiveSites').addEventListener('click', saveProductiveSites);

    // Toggle productive sites list visibility when mode changes
    document.querySelectorAll('input[name="productiveMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => toggleProductiveSitesList(e.target.value));
    });
    document.getElementById('savePenalty').addEventListener('click', savePenalty);
    document.getElementById('savePayment').addEventListener('click', savePayment);
});
