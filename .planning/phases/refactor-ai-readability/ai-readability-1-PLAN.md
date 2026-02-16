---
phase: ai-readability-refactor
plan: 1
type: execute
total_waves: 4
total_tasks: 10
requirements_covered: [REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034]
files_modified: [extension/background.js, extension/session.js, extension/reward.js, extension/tab-monitor.js, extension/blocking.js, extension/native-host.js, extension/backend-api.js, extension/session-state.js, extension/message-router.js, extension/popup.js, extension/blocked.js, extension/shame-data.js, extension/leaderboard.js, extension/tests/unit-tests.html, extension/manifest.json]
---

# Plan: AI Readability Refactor — Plan 1

## Objective
Decompose the 680-line background.js god module into focused single-responsibility modules, add unit tests for pure functions, eliminate dead code and duplicates, and make all state dependencies explicit — maximizing AI agent readability while maintaining identical runtime behavior.

## Context
- Project: Brainrot Blocker Chrome Extension
- Phase goals: No file >200 lines, all pure functions tested, no dead code, explicit state
- Prerequisites: All prior phases complete (core, shame, backend, auth, polish, refactor, app-detection)
- Key decisions: importScripts() modules, self-contained test.html, handler map, 4-wave execution

## Wave 1 — Foundation: Tests + Dead Code + Small Fixes

<task type="auto">
  <name>Create unit tests for pure functions</name>
  <files>extension/tests/unit-tests.html</files>
  <action>
    Create a self-contained test.html page that runs unit tests in the browser.
    Include the source files via script tags (constants.js, timer.js, site-utils.js, shame-data.js).

    Write tests for:
    1. timer.js — flushElapsed:
       - inactive returns unchanged values
       - null lastTick returns unchanged values
       - active with valid lastTick returns accumulated seconds + elapsed
       - negative elapsed clamped to 0
    2. timer.js — snapshotSeconds:
       - inactive returns accumulatedSeconds
       - active returns accumulatedSeconds + elapsed
    3. site-utils.js — urlMatchesSites:
       - matches exact domain
       - matches subdomain (www.youtube.com matches youtube.com)
       - rejects non-matching domain
       - handles empty/null inputs
    4. site-utils.js — urlMatchesAllowedPaths:
       - matches path prefix
       - rejects non-matching path
    5. site-utils.js — isBlockedUrl:
       - blocked site not in allowed paths returns true
       - blocked site in allowed paths returns false
    6. shame-data.js — getShameLevel:
       - attempts 1-2 return level 1
       - attempts 3-4 return level 2
       - attempts 5-6 return level 3
       - attempts 7+ return level 4

    Use a minimal inline test framework (assert + result display), no external dependencies.
    Show pass/fail count and detailed results in the page.
  </action>
  <verify>Open extension/tests/unit-tests.html in a browser and verify all tests pass</verify>
  <done>All unit tests pass, page shows green pass count</done>
</task>

<task type="auto">
  <name>Delete dead code, fix API_BASE_URL, cleanup console.logs</name>
  <files>extension/background.js</files>
  <action>
    In background.js, make these changes:

    1. DELETE the entire redirectNonActiveTabs function (lines 631-647) — it's never called after the reward flow worktree replaced it with redirectBlockedTabs.

    2. DELETE the hardcoded API_BASE_URL constant on line 4:
       `const API_BASE_URL = 'http://localhost:3000';`
       The notifyBackend function at line 667 uses this. Change it to read from CONFIG:
       In notifyBackend, replace `API_BASE_URL` with `(typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:3000')`.
       This way it uses CONFIG when available (popup pages have config.js loaded) and falls back for the service worker.

       Actually, since background.js is a service worker that doesn't load config.js, the cleanest fix is:
       - Keep a const but name it clearly: `const BACKEND_URL = 'http://localhost:3000';`
       - Add a comment: `// Must match CONFIG.API_BASE_URL in config.js — service worker can't load config.js`
       This documents the duplication so AI won't miss it.

    3. REMOVE debug console.log statements at lines 149, 153, 158 (the [BrainrotBlocker] tab check logs in checkCurrentTab). Keep error-level console.log calls (the catch blocks).

    Do NOT change any other logic or behavior.
  </action>
  <verify>Extension loads without errors, sessions start/end correctly</verify>
  <done>redirectNonActiveTabs deleted, API_BASE_URL documented, debug logs removed</done>
</task>

<task type="auto">
  <name>Deduplicate blocked.js screens + shame constants + leaderboard XSS</name>
  <files>extension/blocked.js, extension/shame-data.js, extension/leaderboard.js</files>
  <action>
    1. In blocked.js: Extract a shared function from showRewardExpiredScreen and showRewardPausedScreen:
       ```
       function showInfoScreen(title, subtitle, buttonId) {
         const container = document.querySelector('.container');
         document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
         container.innerHTML = `
           <h1 class="fade-in" style="font-size: 42px; color: #ffaa00;">${title}</h1>
           <p class="subtitle fade-in" style="color: rgba(255,255,255,0.7); margin-top: 16px;">${subtitle}</p>
           <div class="fade-in" style="margin-top: 40px;">
             <button class="btn-burn-reward" style="background: linear-gradient(135deg, #00ff88, #00cc6a); color: #0a1a0f;" id="${buttonId}">Got It</button>
           </div>
         `;
         document.getElementById(buttonId).addEventListener('click', () => {
           chrome.tabs.getCurrent((tab) => { if (tab) chrome.tabs.remove(tab.id); });
         });
       }
       ```
       Then showRewardExpiredScreen calls: showInfoScreen("Break Time's Up!", "Your earned break time has run out. Back to work!", "btn-got-it");
       And showRewardPausedScreen calls: showInfoScreen("Break Ended Early", "Your unused break time has been saved. You can use it later.", "btn-got-it-paused");

    2. In shame-data.js: Add named constants for shame thresholds before getShameLevel:
       ```
       const SHAME_THRESHOLDS = { LOW: 2, MEDIUM: 4, HIGH: 6 };
       ```
       Update getShameLevel to use them:
       ```
       function getShameLevel(attempts) {
         if (attempts <= SHAME_THRESHOLDS.LOW) return 1;
         if (attempts <= SHAME_THRESHOLDS.MEDIUM) return 2;
         if (attempts <= SHAME_THRESHOLDS.HIGH) return 3;
         return 4;
       }
       ```

    3. In leaderboard.js: Replace the innerHTML approach for the avatar with DOM construction to prevent XSS:
       Change the row building to use createElement instead of innerHTML for the img src.
       Specifically, build the tr using DOM methods or at minimum set avatarSrc via a DOM property after creating elements.
  </action>
  <verify>blocked.html shows correct screens for ?reason=reward-expired and ?reason=reward-paused; leaderboard renders correctly</verify>
  <done>No duplicate screen functions, shame thresholds named, avatar XSS fixed</done>
</task>

## Wave 2 — Message Router + Session Helpers

<task type="auto">
  <name>Replace message router if/else chain with handler map</name>
  <files>extension/background.js</files>
  <action>
    Replace the entire chrome.runtime.onMessage.addListener callback (the 100-line if/else chain) with a handler map pattern.

    Create a messageHandlers object where each key is an action name and each value is a handler function:
    ```
    const messageHandlers = {
      startSession: (msg, sender, sendResponse) => {
        handleStartSession().then(sendResponse);
        return true; // async
      },
      endSession: (msg, sender, sendResponse) => {
        handleEndSession(msg.confirmed).then(sendResponse);
        return true;
      },
      useReward: (msg, sender, sendResponse) => {
        handleUseReward().then(sendResponse);
        return true;
      },
      pauseReward: (msg, sender, sendResponse) => {
        handlePauseReward().then(sendResponse);
        return true;
      },
      getNativeHostStatus: (msg, sender, sendResponse) => {
        sendResponse({ available: nativeHostAvailable });
        return false; // sync
      },
      getStatus: (msg, sender, sendResponse) => {
        // ... existing async getStatus logic ...
        return true;
      },
      updateSettings: (msg, sender, sendResponse) => {
        state.workMinutes = msg.workMinutes || state.workMinutes;
        state.rewardMinutes = msg.rewardMinutes || state.rewardMinutes;
        saveState();
        sendResponse({ success: true });
        return false;
      },
      blockedPageLoaded: (msg, sender, sendResponse) => {
        if (state.sessionActive) {
          state.blockedAttempts++;
          saveState();
          notifyBackend('blocked-attempt', { session_id: state.sessionId });
        }
        sendResponse({ success: true });
        return false;
      },
      updateRewardSites: (msg, sender, sendResponse) => {
        if (state.sessionActive) {
          blockSites().then(() => sendResponse({ success: true }));
          return true;
        }
        sendResponse({ success: true });
        return false;
      },
      addToBlockedSites: (msg, sender, sendResponse) => {
        // ... existing async logic ...
        return true;
      },
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const handler = messageHandlers[message.action];
      if (!handler) return false;
      return handler(message, sender, sendResponse);
    });
    ```

    Preserve the exact return true/false semantics for each handler (true = async response, false = sync).
  </action>
  <verify>All message actions work: start/end session, use/pause reward, getStatus, settings updates</verify>
  <done>Message router is a flat map object, each handler is 3-8 lines</done>
</task>

<task type="auto">
  <name>Extract handleEndSession helpers</name>
  <files>extension/background.js</files>
  <action>
    Extract two helper functions from handleEndSession:

    1. bankActiveReward() — extracts lines 389-401:
       ```
       async function bankActiveReward() {
         flushReward();
         const remainingSec = Math.max(0, state.rewardTotalSeconds - state.rewardBurnedSeconds);
         if (remainingSec > 0) {
           const cur = await getStorage(['unusedRewardSeconds']);
           await setStorage({ unusedRewardSeconds: (cur.unusedRewardSeconds || 0) + remainingSec });
         }
         state.rewardActive = false;
         state.rewardTotalSeconds = 0;
         state.rewardBurnedSeconds = 0;
         state.isOnRewardSite = false;
         state.lastRewardTick = null;
         stopRewardCountdown();
       }
       ```

    2. resetSessionState() — extracts lines 404-412:
       ```
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
       ```

    Then handleEndSession uses them:
    ```
    if (state.rewardActive) await bankActiveReward();
    resetSessionState();
    saveState();
    ```

    Also add event subscriber comments to each chrome.runtime.sendMessage call:
    - sessionStarted: // Subscribers: settings.js:173
    - sessionEnded: // Subscribers: settings.js:174
    - rewardEarned: // Subscribers: popup.js:358
    - rewardExpired: // Subscribers: popup.js:361
  </action>
  <verify>End session works correctly with and without active reward; reward banking preserves correct seconds</verify>
  <done>handleEndSession is ~25 lines, helpers are reusable, subscriber comments added</done>
</task>

## Wave 3 — Big Split: background.js Decomposition

<task type="auto">
  <name>Extract session-state.js module</name>
  <files>extension/session-state.js, extension/background.js</files>
  <action>
    Create extension/session-state.js containing:
    1. The state object definition (currently lines 7-23 of background.js)
    2. The saveState() function
    3. The flushProductive() and flushReward() helper functions
    4. The resetSessionState() and bankActiveReward() functions (extracted in Wave 2)

    All functions that other modules need must be at global scope (no exports — using importScripts).

    Remove these from background.js. background.js will importScripts('session-state.js') to get them.
  </action>
  <verify>Extension loads, state persists across service worker restarts</verify>
  <done>session-state.js exists with state object + state management functions</done>
</task>

<task type="auto">
  <name>Extract blocking.js, native-host.js, backend-api.js modules</name>
  <files>extension/blocking.js, extension/native-host.js, extension/backend-api.js, extension/background.js</files>
  <action>
    Create three new modules:

    1. extension/blocking.js:
       - loadSiteConfig()
       - blockSites()
       - unblockSites()
       - redirectBlockedTabs(reason)

    2. extension/native-host.js:
       - nativePort, currentAppName, nativeHostAvailable, browserHasFocus variables
       - connectNativeHost()
       - isProductiveApp(processName)

    3. extension/backend-api.js:
       - BACKEND_URL constant (with comment about config.js duplication)
       - getToken()
       - notifyBackend(type, data)

    Remove all these from background.js. Update background.js importScripts to load them.

    importScripts order must be:
    importScripts('constants.js', 'storage.js', 'timer.js', 'site-utils.js', 'session-state.js', 'blocking.js', 'native-host.js', 'backend-api.js');

    Since all files share global scope via importScripts, functions can reference each other across files.
  </action>
  <verify>Site blocking works, native host connects, backend notifications send</verify>
  <done>Three new modules exist, background.js no longer contains their logic</done>
</task>

<task type="auto">
  <name>Extract tab-monitor.js, session.js, reward.js; finalize background.js as orchestrator</name>
  <files>extension/tab-monitor.js, extension/session.js, extension/reward.js, extension/background.js, extension/manifest.json</files>
  <action>
    Create three more modules:

    1. extension/tab-monitor.js:
       - checkCurrentTab()
       - updateProductiveState(isProductive)
       - updateRewardState(isOnReward)
       - updateBadge(isActive)
       - chrome.tabs.onActivated listener
       - chrome.tabs.onUpdated listener
       - chrome.windows.onFocusChanged listener

    2. extension/session.js:
       - handleStartSession()
       - handleEndSession(confirmed)

    3. extension/reward.js:
       - checkAndGrantReward()
       - handleUseReward()
       - handlePauseReward()
       - handleRewardExpired()
       - rewardCountdownInterval variable
       - startRewardCountdown()
       - stopRewardCountdown()

    4. background.js should now only contain:
       - importScripts() call loading all modules
       - The startup IIFE (load persisted state, restore session, connect native host)
       - The messageHandlers map and chrome.runtime.onMessage listener
       - The chrome.alarms.onAlarm listener

    5. Update manifest.json background.service_worker — it stays as "background.js" since importScripts handles the rest.

    Final importScripts:
    importScripts('constants.js', 'storage.js', 'timer.js', 'site-utils.js', 'session-state.js', 'blocking.js', 'native-host.js', 'backend-api.js', 'tab-monitor.js', 'session.js', 'reward.js');

    background.js target: ~120-150 lines (startup + message router + alarm handler).
  </action>
  <verify>Full extension functionality: start session, timer counts, blocking works, rewards earned/used/paused/expired, native host connects, backend notified</verify>
  <done>background.js is under 200 lines, all modules exist and are under 150 lines each</done>
</task>

## Wave 4 — popup.js Cleanup

<task type="auto">
  <name>Extract popup.js functions from DOMContentLoaded closure</name>
  <files>extension/popup.js</files>
  <action>
    Move the following functions from inside the DOMContentLoaded closure to module scope (before the addEventListener call):

    Pure helpers (no DOM dependency):
    - formatTime(totalSeconds)
    - getStreakTitle(minutes)

    DOM helpers that can be parameterized:
    - showConfetti() — uses document.body, can stay at module scope
    - getStatus() — uses chrome.runtime, no closure dependency

    Render functions — move to module scope, pass DOM elements as a parameter object:
    Create a `const elements = {}` object populated in DOMContentLoaded, then pass it to render functions.
    Or simpler: keep the element references at module scope (populated in DOMContentLoaded init).

    The DOMContentLoaded handler should:
    1. Populate DOM element references
    2. Load saved settings
    3. Wire up event listeners
    4. Start initial poll

    Target: DOMContentLoaded body is ~80 lines (setup + listeners), with render/helper functions at module scope above it.
  </action>
  <verify>Popup opens, displays stats, timer counts, all buttons work, confetti shows on reward earned</verify>
  <done>popup.js functions are at module scope, DOMContentLoaded is a compact init function</done>
</task>

## Success Criteria
- background.js is under 200 lines (orchestrator only)
- All extracted modules are under 150 lines each
- Unit tests in tests/unit-tests.html all pass
- No dead code (redirectNonActiveTabs deleted)
- No debug console.logs in production code
- Message router is a flat handler map
- State management is explicit via session-state.js
- Extension loads and functions identically to before
