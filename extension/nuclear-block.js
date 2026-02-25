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
  return 'confirm';
}

async function applyNuclearRules() {
  const data = await getNuclearData();

  // Remove existing nuclear rules (block + exception allow rules)
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const nuclearIds = existingRules
    .filter(r => r.id >= NUCLEAR_RULE_ID_OFFSET)
    .map(r => r.id);

  // Build block rules per site, routing confirm-stage sites to the last-chance page
  const addRules = [];
  let ruleIndex = 0;
  for (const site of data.sites) {
    const stage = getNuclearSiteStage(site);
    const page = stage === 'confirm' ? '/nuclear-block-last-chance.html' : '/nuclear-blocked.html';
    const domains = site.domains || (site.domain ? [site.domain] : []);
    for (const d of domains) {
      const clean = d.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
      if (!clean) continue;
      addRules.push({
        id: NUCLEAR_RULE_ID_OFFSET + ruleIndex++,
        priority: 3,
        action: { type: 'redirect', redirect: { extensionPath: page } },
        condition: { requestDomains: [clean], resourceTypes: ['main_frame'] },
      });
    }
  }

  // Build allow rules for nuclear exceptions (priority 4 overrides nuclear block priority 3)
  let exceptionIndex = 0;
  for (const site of data.sites) {
    if (!site.exceptions || site.exceptions.length === 0) continue;
    for (const ex of site.exceptions) {
      const path = ex.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
      if (!path) continue;
      addRules.push({
        id: NUCLEAR_EXCEPTION_RULE_ID_OFFSET + exceptionIndex++,
        priority: 4,
        action: { type: 'allow' },
        condition: { urlFilter: `||${path}`, resourceTypes: ['main_frame'] },
      });
    }
  }

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
  // Schedule rule refresh for when cooldown1 expires (stage changes to ready)
  if (entry.cooldown1Ms > 0) scheduleNuclearRuleRefresh(entry.cooldown1Ms);
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
    // Schedule a rule refresh for when cooldown2 expires (stage changes to confirm)
    scheduleNuclearRuleRefresh(site.cooldown2Ms);
  }
  await saveNuclearData(data);
  await applyNuclearRules();
}

// Schedule a one-shot alarm to refresh nuclear rules at a precise time
function scheduleNuclearRuleRefresh(delayMs) {
  const delayMin = Math.max(delayMs / 60000, 0.1); // minimum ~6 seconds
  chrome.alarms.create('nuclearRuleRefresh', { delayInMinutes: delayMin });
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
  // Schedule rule refresh for when cooldown1 expires
  if (cooldown1Ms > 0) scheduleNuclearRuleRefresh(cooldown1Ms);
}

async function confirmUnblockNuclear(id) {
  const data = await getNuclearData();
  data.sites = data.sites.filter(s => s.id !== id);
  await saveNuclearData(data);
  await applyNuclearRules();
}

async function removeNuclearSite(id) {
  const data = await getNuclearData();
  data.sites = data.sites.filter(s => s.id !== id);
  await saveNuclearData(data);
  await applyNuclearRules();
}
