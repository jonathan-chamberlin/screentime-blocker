// List utilities — helpers for break lists and productive lists
// Loaded via importScripts (service worker) and <script> tags (settings, popup)

function migrateBreakList(list) {
  if (!list.mode) {
    list.mode = list.isActive ? 'manual' : 'off';
  }
  list.isActive = list.mode !== 'off';
  if (!list.schedules) {
    list.schedules = [];
  }
  return list;
}

function migrateBreakLists(lists) {
  return lists.map(list => migrateBreakList(list));
}

function getActiveBreakSites(breakLists) {
  if (!breakLists || !breakLists.length) return [];
  const sites = new Set();
  for (const list of breakLists) {
    migrateBreakList(list);
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
    migrateBreakList(list);
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
    mode: 'off',
    schedules: [],
  };
}

function isScheduleActiveNow(schedules, now = new Date()) {
  if (!schedules || !schedules.length) return false;

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const schedule of schedules) {
    if (!schedule.days || !schedule.days.includes(currentDay)) continue;

    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return true;
      }
    } else {
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        return true;
      }
    }
  }

  return false;
}

function getListsBlockingNow(breakLists, sessionActive) {
  if (!breakLists || !breakLists.length) return [];

  const blocking = [];
  for (const list of breakLists) {
    migrateBreakList(list);

    if (list.mode === 'off') continue;
    if (list.mode === 'manual' && !sessionActive) continue;
    if (list.mode === 'scheduled' && !isScheduleActiveNow(list.schedules)) continue;

    blocking.push(list);
  }

  return blocking;
}

function getBlockingSites(breakLists, sessionActive) {
  const blockingLists = getListsBlockingNow(breakLists, sessionActive);
  const sites = new Set();

  for (const list of blockingLists) {
    if (list.sites) {
      for (const site of list.sites) sites.add(site);
    }
  }

  return Array.from(sites);
}

function getBlockingApps(breakLists, sessionActive) {
  const blockingLists = getListsBlockingNow(breakLists, sessionActive);
  const seen = new Set();
  const apps = [];

  for (const list of blockingLists) {
    if (list.apps) {
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
