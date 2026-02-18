// Site blocking — declarativeNetRequest rule management and tab redirects
// Depends on: session-state.js (loadSiteConfig), site-utils.js (isBlockedUrl), constants.js (ALLOW_RULE_ID_OFFSET, NUCLEAR_RULE_ID_OFFSET)

async function blockSites() {
  const { sites, allowedPaths } = await loadSiteConfig();

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  // Only remove session/allow rules (IDs < NUCLEAR_RULE_ID_OFFSET) — preserve nuclear block rules
  const removeIds = existingRules.filter(r => r.id < NUCLEAR_RULE_ID_OFFSET).map(r => r.id);

  const blockRules = sites
    .map(s => s.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, ''))
    .filter(s => s.length > 0)
    .map((site, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
      condition: { requestDomains: [site], resourceTypes: ['main_frame'] },
    }));

  const allowRules = allowedPaths
    .map(p => p.trim().replace(/^(https?:\/\/)?(www\.)?/, ''))
    .filter(p => p.length > 0)
    .map((path, i) => ({
      id: ALLOW_RULE_ID_OFFSET + i,
      priority: 2,
      action: { type: 'allow' },
      condition: { urlFilter: `||${path}`, resourceTypes: ['main_frame'] },
    }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: [...blockRules, ...allowRules],
  });
}

async function unblockSites() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  // Only remove session/allow rules (IDs < NUCLEAR_RULE_ID_OFFSET) — preserve nuclear block rules
  const removeIds = existingRules.filter(r => r.id < NUCLEAR_RULE_ID_OFFSET).map(r => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
}

async function redirectBlockedTabs(reason) {
  try {
    const { sites, allowedPaths } = await loadSiteConfig();
    const tabs = await chrome.tabs.query({});
    const suffix = reason ? `?reason=${reason}` : '';
    const blockedUrl = chrome.runtime.getURL('blocked.html') + suffix;
    for (const tab of tabs) {
      if (tab.url && isBlockedUrl(tab.url, sites, allowedPaths)) {
        chrome.tabs.update(tab.id, { url: blockedUrl });
      }
    }
  } catch (err) {
    console.log('[BrainrotBlocker] Error redirecting blocked tabs:', err.message);
  }
}
