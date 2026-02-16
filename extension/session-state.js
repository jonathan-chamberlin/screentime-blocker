// Session state — single source of truth for all runtime state
// All modules access state via these functions (loaded via importScripts global scope)

let state = {
  sessionActive: false,
  sessionId: null,
  sessionStartTime: null,
  rewardActive: false,
  blockedAttempts: 0,
  productiveSeconds: 0,
  lastProductiveTick: null,
  isOnProductiveSite: false,
  rewardGrantCount: 0,
  rewardTotalSeconds: 0,
  rewardBurnedSeconds: 0,
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
  const flushed = flushElapsed(state.isOnProductiveSite, state.lastProductiveTick, state.productiveSeconds);
  state.productiveSeconds = flushed.seconds;
  state.lastProductiveTick = flushed.lastTick;
}

// Flush elapsed reward burn time into accumulator
function flushReward() {
  const flushed = flushElapsed(state.isOnRewardSite, state.lastRewardTick, state.rewardBurnedSeconds);
  state.rewardBurnedSeconds = flushed.seconds;
  state.lastRewardTick = flushed.lastTick;
}

// Zero out all session-related fields
function resetSessionState() {
  state.sessionActive = false;
  state.sessionId = null;
  state.sessionStartTime = null;
  state.blockedAttempts = 0;
  state.productiveSeconds = 0;
  state.lastProductiveTick = null;
  state.isOnProductiveSite = false;
  state.rewardGrantCount = 0;
}

// Load blocked sites + allowed paths from storage
async function loadSiteConfig() {
  const result = await getStorage(['rewardSites', 'allowedPaths']);
  return {
    sites: result.rewardSites || DEFAULTS.rewardSites,
    allowedPaths: result.allowedPaths || DEFAULTS.allowedPaths,
  };
}
