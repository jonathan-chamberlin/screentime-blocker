// List utilities — helpers for break lists and productive lists
// Loaded via importScripts (service worker) and <script> tags (settings, popup)

function getActiveBreakSites(breakLists) {
  if (!breakLists || !breakLists.length) return [];
  const sites = new Set();
  for (const list of breakLists) {
    if (list.isActive && list.sites) {
      for (const site of list.sites) sites.add(site);
    }
  }
  return Array.from(sites);
}

function getActiveBreakApps(breakLists) {
  if (!breakLists || !breakLists.length) return [];
  const seen = new Set();
  const apps = [];
  for (const list of breakLists) {
    if (list.isActive && list.apps) {
      for (const app of list.apps) {
        const key = typeof app === 'string' ? app : app.process;
        if (!seen.has(key)) {
          seen.add(key);
          apps.push(app);
        }
      }
    }
  }
  return apps;
}

function getActiveProductiveSites(productiveLists) {
  if (!productiveLists || !productiveLists.length) return [];
  const sites = new Set();
  for (const list of productiveLists) {
    if (list.isActive && list.sites) {
      for (const site of list.sites) sites.add(site);
    }
  }
  return Array.from(sites);
}

function getActiveProductiveApps(productiveLists) {
  if (!productiveLists || !productiveLists.length) return [];
  const apps = new Set();
  for (const list of productiveLists) {
    if (list.isActive && list.apps) {
      for (const app of list.apps) apps.add(app);
    }
  }
  return Array.from(apps);
}

function generateListId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function createNewList(type, name) {
  return {
    id: generateListId(type === 'break' ? 'break' : 'prod'),
    name: name,
    sites: [],
    apps: [],
    isActive: false,
  };
}
