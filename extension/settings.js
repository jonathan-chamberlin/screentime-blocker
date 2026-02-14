const DEFAULT_SETTINGS = {
    workMinutes: 50,
    rewardMinutes: 10,
    rewardSites: ['youtube.com', 'instagram.com', 'pinterest.com', 'reddit.com', 'tiktok.com'],
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
        document.getElementById('workMinutes').value = result.workMinutes || DEFAULT_SETTINGS.workMinutes;
        document.getElementById('rewardMinutes').value = result.rewardMinutes || DEFAULT_SETTINGS.rewardMinutes;

        const rewardSites = result.rewardSites || DEFAULT_SETTINGS.rewardSites;
        document.getElementById('rewardSites').value = rewardSites.join('\n');

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

function saveRatio() {
    const workMinutes = parseInt(document.getElementById('workMinutes').value, 10);
    const rewardMinutes = parseInt(document.getElementById('rewardMinutes').value, 10);

    chrome.storage.local.set({ workMinutes, rewardMinutes }, () => {
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            workMinutes,
            rewardMinutes
        });
        showConfirmation('ratioConfirmation');
    });
}

function saveRewardSites() {
    const sitesText = document.getElementById('rewardSites').value;
    const sites = sitesText
        .split('\n')
        .map(site => site.trim())
        .filter(site => site.length > 0);

    chrome.storage.local.set({ rewardSites: sites }, () => {
        chrome.runtime.sendMessage({
            action: 'updateRewardSites',
            sites: sites
        });
        showConfirmation('rewardSitesConfirmation');
    });
}

function saveProductiveSites() {
    const sitesText = document.getElementById('productiveSites').value;
    const sites = sitesText
        .split('\n')
        .map(site => site.trim())
        .filter(site => site.length > 0);

    chrome.storage.local.set({ productiveSites: sites }, () => {
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

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('saveRatio').addEventListener('click', saveRatio);
    document.getElementById('saveRewardSites').addEventListener('click', saveRewardSites);
    document.getElementById('saveProductiveSites').addEventListener('click', saveProductiveSites);
    document.getElementById('savePenalty').addEventListener('click', savePenalty);
    document.getElementById('savePayment').addEventListener('click', savePayment);
});
