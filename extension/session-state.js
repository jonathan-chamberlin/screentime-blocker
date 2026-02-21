// Session state — single source of truth for all runtime state
// All modules access state via these functions (loaded via importScripts global scope)

let state = {
  sessionActive: false,
  sessionId: null,
  sessionStartTime: null,
  rewardActive: false,
  blockedAttempts: 0,
  blockedDomainsMap: {},
  productiveMillis: 0,  // Changed from productiveSeconds
  lastProductiveTick: null,
  isOnProductiveSite: false,
  rewardGrantCount: 0,
  rewardTotalMillis: 0,  // Changed from rewardTotalSeconds
  rewardBurnedMillis: 0,  // Changed from rewardBurnedSeconds
  isOnRewardSite: false,
  lastRewardTick: null,
  workMinutes: DEFAULTS.workMinutes,
  rewardMinutes: DEFAULTS.rewardMinutes,
};

function saveState() {
  setStorage({ focusState: state });
}

// Flush elapsed productive time into accumulator
function flushProductive() {
  const flushed = flushElapsed(state.isOnProductiveSite, state.lastProductiveTick, state.productiveMillis);
  state.productiveMillis = flushed.millis;
  state.lastProductiveTick = flushed.lastTick;
}

// Flush elapsed reward burn time into accumulator
function flushReward() {
  const flushed = flushElapsed(state.isOnRewardSite, state.lastRewardTick, state.rewardBurnedMillis);
  state.rewardBurnedMillis = flushed.millis;
  state.lastRewardTick = flushed.lastTick;
}

// Zero out all session-related fields
function resetSessionState() {
  state.sessionActive = false;
  state.sessionId = null;
  state.sessionStartTime = null;
  state.blockedAttempts = 0;
  state.blockedDomainsMap = {};
  state.productiveMillis = 0;
  state.lastProductiveTick = null;
  state.isOnProductiveSite = false;
  state.rewardGrantCount = 0;
}

// Load blocked sites + allowed paths from storage (mode-aware via scheduler)
async function loadSiteConfig() {
  const result = await getStorage(['breakLists', 'allowedPaths']);
  const breakLists = result.breakLists || DEFAULTS.breakLists;
  return {
    sites: getBlockingSites(breakLists, state.sessionActive),
    allowedPaths: result.allowedPaths || DEFAULTS.allowedPaths,
  };
}
