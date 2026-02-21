// Scheduler — evaluates break list modes/schedules and syncs DNR blocking rules
// Depends on: list-utils.js, session-state.js (state), storage.js, constants.js

let schedulerCache = { blockingListIds: new Set(), blockingSites: [], blockingApps: [] };

async function evaluateScheduler() {
  const result = await getStorage(['breakLists']);
  const breakLists = migrateBreakLists(result.breakLists || DEFAULTS.breakLists);

  const blockingLists = getListsBlockingNow(breakLists, state.sessionActive);
  const sites = getBlockingSites(breakLists, state.sessionActive);
  const apps = getBlockingApps(breakLists, state.sessionActive);

  schedulerCache = {
    blockingListIds: new Set(blockingLists.map(l => l.id)),
    blockingSites: sites,
    blockingApps: apps,
  };

  await updateBlockingRules(sites);

  return schedulerCache;
}

async function updateBlockingRules(sites) {
  const result = await getStorage(['allowedPaths']);
  const allowedPaths = result.allowedPaths || DEFAULTS.allowedPaths;

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.filter(r => r.id < NUCLEAR_RULE_ID_OFFSET).map(r => r.id);

  const blockRules = sites
    .map(s => s.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, ''))
    .filter(s => s.length > 0)
    .map((site, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: `/blocked.html?domain=${encodeURIComponent(site)}` } },
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

function getSchedulerCache() {
  return schedulerCache;
}

function isCurrentlyBlocking() {
  return schedulerCache.blockingSites.length > 0;
}
