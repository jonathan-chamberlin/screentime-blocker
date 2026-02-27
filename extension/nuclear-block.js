// Nuclear Block — permanent site blocking with staged cooldown unblocking
// Storage key: nbData (intentionally generic)
// Rule IDs: NUCLEAR_RULE_ID_OFFSET (2000) and above
// Depends on: constants.js (NUCLEAR_RULE_ID_OFFSET), storage.js

const NUCLEAR_DEFAULT_DATA = {
  sites: [],
  secondCooldownEnabled: true,
  secondCooldownMs: 18 * 60 * 60 * 1000, // 18 hours
};

function normalizeDomain(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const prefixed = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(prefixed);
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeException(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const prefixed = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(prefixed);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const path = url.pathname || '/';
    const search = url.search || '';
    return `${host}${path}${search}`;
  } catch {
    return '';
  }
}

function getExceptionHost(normalizedException) {
  if (!normalizedException || typeof normalizedException !== 'string') return '';
  const slashIdx = normalizedException.indexOf('/');
  return slashIdx === -1 ? normalizedException : normalizedException.slice(0, slashIdx);
}

function getEntryDomains(site) {
  const rawDomains = site && site.domains
    ? site.domains
    : (site && site.domain ? [site.domain] : []);
  const normalized = rawDomains
    .map(normalizeDomain)
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function exceptionBelongsToEntry(normalizedException, site) {
  const exceptionHost = getExceptionHost(normalizedException);
  if (!exceptionHost) return false;
  const domains = getEntryDomains(site);
  if (domains.length === 0) return false;
  return domains.some(domain => exceptionHost === domain || exceptionHost.endsWith(`.${domain}`));
}

function normalizeSiteEntry(entry) {
  const domains = getEntryDomains(entry);
  const normalizedExceptions = Array.isArray(entry.exceptions) ? entry.exceptions : [];
  const keptExceptions = [];
  const seen = new Set();
  for (const value of normalizedExceptions) {
    const normalized = normalizeException(value);
    if (!normalized) continue;
    if (!domains.some(domain => {
      const host = getExceptionHost(normalized);
      return host === domain || host.endsWith(`.${domain}`);
    })) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    keptExceptions.push(normalized);
  }

  const base = { ...entry, exceptions: keptExceptions };
  if (domains.length === 0) {
    delete base.domain;
    delete base.domains;
    return base;
  }
  if (domains.length === 1) {
    base.domain = domains[0];
    delete base.domains;
  } else {
    base.domains = domains;
    delete base.domain;
  }
  return base;
}

async function getNuclearData() {
  const result = await getStorage(['nbData']);
  const data = result.nbData || { ...NUCLEAR_DEFAULT_DATA };
  return {
    ...NUCLEAR_DEFAULT_DATA,
    ...data,
    sites: (data.sites || []).map(site => normalizeSiteEntry(site)),
  };
}

async function saveNuclearData(data) {
  await setStorage({ nbData: data });
}

// Get all domains that should currently be nuclear-blocked
function getNuclearDomains(data) {
  const domains = [];
  for (const site of data.sites) {
    domains.push(...getEntryDomains(site));
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

  // Remove existing nuclear rules, add new ones
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const nuclearIds = existingRules
    .filter(r => r.id >= NUCLEAR_RULE_ID_OFFSET)
    .map(r => r.id);

  // Build rules per site, routing confirm-stage sites to the last-chance page
  const addRules = [];
  let ruleIndex = 0;
  for (const site of data.sites) {
    const stage = getNuclearSiteStage(site);
    const page = stage === 'confirm' ? '/nuclear-block-last-chance.html' : '/nuclear-blocked.html';
    const domains = getEntryDomains(site);
    for (const d of domains) {
      addRules.push({
        id: NUCLEAR_RULE_ID_OFFSET + ruleIndex++,
        priority: 3,
        action: { type: 'redirect', redirect: { extensionPath: page } },
        // urlFilter blocks the base domain and all subdomains (e.g. www., m., music.)
        condition: { urlFilter: `||${d}`, resourceTypes: ['main_frame'] },
      });
    }

    const exceptions = Array.isArray(site.exceptions) ? site.exceptions : [];
    for (const exception of exceptions) {
      const normalized = normalizeException(exception);
      if (!normalized || !exceptionBelongsToEntry(normalized, site)) continue;
      addRules.push({
        id: NUCLEAR_RULE_ID_OFFSET + ruleIndex++,
        priority: 4,
        action: { type: 'allow' },
        condition: { urlFilter: `||${normalized}`, resourceTypes: ['main_frame'] },
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
  const normalizedEntry = normalizeSiteEntry(entry);

  // Prevent duplicate domains
  const existingDomains = new Set(getNuclearDomains(data));
  const newDomains = getEntryDomains(normalizedEntry);
  if (newDomains.length === 0) return;
  if (newDomains.every(d => existingDomains.has(d))) return; // all already blocked
  data.sites.push(normalizedEntry);
  await saveNuclearData(data);
  await applyNuclearRules();
  // Schedule rule refresh for when cooldown1 expires (stage changes to ready)
  if (normalizedEntry.cooldown1Ms > 0) scheduleNuclearRuleRefresh(normalizedEntry.cooldown1Ms);
}

async function addNuclearException(id, exception) {
  const data = await getNuclearData();
  const site = data.sites.find(s => s.id === id);
  if (!site) throw new Error('Nuclear entry not found.');

  const normalized = normalizeException(exception);
  if (!normalized) throw new Error('Invalid exception URL.');
  if (!exceptionBelongsToEntry(normalized, site)) {
    throw new Error('Exception must be on the same domain/subdomain as this nuclear entry.');
  }

  const existing = Array.isArray(site.exceptions) ? site.exceptions.map(normalizeException).filter(Boolean) : [];
  if (existing.includes(normalized)) return;

  site.exceptions = [...existing, normalized];
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
