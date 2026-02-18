// Nuclear Block — permanent site blocking with staged cooldown unblocking
// Storage key: nbData (intentionally generic)
// Rule IDs: NUCLEAR_RULE_ID_OFFSET (2000) and above
// Depends on: constants.js (NUCLEAR_RULE_ID_OFFSET), storage.js

const NUCLEAR_DEFAULT_DATA = {
  sites: [],
  secondCooldownEnabled: true,
  secondCooldownMs: 18 * 60 * 60 * 1000, // 18 hours
};

async function getNuclearData() {
  const result = await getStorage(['nbData']);
  return result.nbData || { ...NUCLEAR_DEFAULT_DATA };
}

async function saveNuclearData(data) {
  await setStorage({ nbData: data });
}

// Get all domains that should currently be nuclear-blocked
function getNuclearDomains(data) {
  const domains = [];
  for (const site of data.sites) {
    if (site.domains) {
      domains.push(...site.domains);
    } else if (site.domain) {
      domains.push(site.domain);
    }
  }
  return domains;
}

// Derive stage from site data
function getNuclearSiteStage(site) {
  const now = Date.now();
  if (now - site.addedAt < site.cooldown1Ms) return 'locked';
  if (!site.unblockClickedAt) return 'ready';
  if (now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
  return 'expired';
}

async function applyNuclearRules() {
  const data = await getNuclearData();
  const now = Date.now();

  // Auto-remove sites where second cooldown has expired
  const before = data.sites.length;
  data.sites = data.sites.filter(site => getNuclearSiteStage(site) !== 'expired');
  if (data.sites.length !== before) {
    await saveNuclearData(data);
  }

  const domains = getNuclearDomains(data);

  // Remove existing nuclear rules, add new ones
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const nuclearIds = existingRules
    .filter(r => r.id >= NUCLEAR_RULE_ID_OFFSET)
    .map(r => r.id);

  const addRules = domains
    .map(d => d.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, ''))
    .filter(d => d.length > 0)
    .map((domain, i) => ({
      id: NUCLEAR_RULE_ID_OFFSET + i,
      priority: 3, // beats allow rules (priority 2) and block rules (priority 1)
      action: { type: 'redirect', redirect: { extensionPath: '/nuclear-blocked.html' } },
      condition: { requestDomains: [domain], resourceTypes: ['main_frame'] },
    }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: nuclearIds,
    addRules,
  });
}

async function addNuclearSite(entry) {
  const data = await getNuclearData();
  // Prevent duplicate domains
  const existingDomains = new Set(getNuclearDomains(data));
  const newDomains = entry.domains || (entry.domain ? [entry.domain] : []);
  if (newDomains.every(d => existingDomains.has(d))) return; // all already blocked
  data.sites.push(entry);
  await saveNuclearData(data);
  await applyNuclearRules();
}

async function clickUnblockNuclear(id) {
  const data = await getNuclearData();
  const site = data.sites.find(s => s.id === id);
  if (!site) return;

  // If second cooldown is disabled or zero, remove immediately
  if (!data.secondCooldownEnabled || site.cooldown2Ms <= 0) {
    data.sites = data.sites.filter(s => s.id !== id);
  } else {
    site.unblockClickedAt = Date.now();
  }
  await saveNuclearData(data);
  await applyNuclearRules();
}

async function blockAgainNuclear(id, cooldown1Ms) {
  const data = await getNuclearData();
  const site = data.sites.find(s => s.id === id);
  if (!site) return;
  site.addedAt = Date.now();
  site.cooldown1Ms = cooldown1Ms;
  site.unblockClickedAt = null;
  await saveNuclearData(data);
  await applyNuclearRules();
}

async function removeNuclearSite(id) {
  const data = await getNuclearData();
  data.sites = data.sites.filter(s => s.id !== id);
  await saveNuclearData(data);
  await applyNuclearRules();
}
