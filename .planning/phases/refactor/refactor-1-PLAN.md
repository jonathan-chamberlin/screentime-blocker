---
phase: refactor
plan: 1
type: execute
total_waves: 4
total_tasks: 8
requirements_covered: []
files_modified: [extension/storage.js, extension/constants.js, extension/timer.js, extension/site-utils.js, extension/background.js, extension/popup.js, extension/blocked.js, extension/shame-data.js, extension/popup.html, extension/blocked.html, extension/settings.html]
---

# Plan: Refactor — Eliminate Fragility Through Deduplication & Shared Utilities

## Objective
The codebase has grown organically through feature additions. Every change now risks breaking something because the same logic patterns (timer flushing, storage access, site matching, state bookkeeping) are copy-pasted 5-20 times across files. This refactor extracts shared utilities and reduces background.js from ~620 lines of tangled concerns to clear, single-responsibility functions. **Zero behavior changes** — only structural improvements.

## Context
- Project: FocusContract Chrome Extension (MV3)
- Phase goals: Make the codebase resilient to future changes by eliminating duplication
- Prerequisites: All features complete (core, shame, auth, polish phases done)
- Key decisions: No new features, no behavior changes, refactor only

## Wave 1 — Shared Utilities (Foundation)

Create the utility modules that all other files will import. These are pure functions with no side effects.

<task type="auto">
  <name>Create storage utility — async wrapper for chrome.storage.local</name>
  <files>extension/storage.js</files>
  <action>
    Create `extension/storage.js` with two async functions that eliminate callback hell:

    ```js
    async function getStorage(keys) {
      return new Promise(r => chrome.storage.local.get(keys, r));
    }
    async function setStorage(obj) {
      return new Promise(r => chrome.storage.local.set(obj, r));
    }
    ```

    These replace 20+ inline `chrome.storage.local.get([...], (result) => {...})` callback patterns throughout the codebase.
  </action>
  <verify>File exists and exports both functions. No syntax errors (open in browser dev tools).</verify>
  <done>storage.js exists with getStorage and setStorage functions</done>
</task>

<task type="auto">
  <name>Create constants module — eliminate magic numbers and default values</name>
  <files>extension/constants.js</files>
  <action>
    Create `extension/constants.js` with all magic values currently scattered across files:

    ```js
    const DEFAULTS = {
      workMinutes: 50,
      rewardMinutes: 10,
      rewardSites: ['youtube.com'],
      productiveSites: ['docs.google.com', 'notion.so', 'github.com'],
      allowedPaths: [],
      productiveMode: 'all-except-blocked',
    };
    const ALARM_PERIOD_MINUTES = 0.25;
    const ALLOW_RULE_ID_OFFSET = 1000;
    ```

    These replace hardcoded defaults that appear 5+ times each (e.g., `['youtube.com']` appears in background.js in 4 separate functions, `50` and `10` appear in popup.js, settings.js, and background.js).
  </action>
  <verify>File exists and defines DEFAULTS, ALARM_PERIOD_MINUTES, ALLOW_RULE_ID_OFFSET.</verify>
  <done>constants.js exists with all extracted constants</done>
</task>

<task type="auto">
  <name>Create timer utilities — extract the time-flushing pattern duplicated 9 times</name>
  <files>extension/timer.js</files>
  <action>
    Create `extension/timer.js` with functions that encapsulate the time-flushing pattern currently copy-pasted 9 times across background.js:

    ```js
    // Flush elapsed time since last tick into an accumulator
    // Returns the updated values { seconds, lastTick }
    function flushElapsed(isActive, lastTick, accumulatedSeconds) {
      if (!isActive || !lastTick) return { seconds: accumulatedSeconds, lastTick };
      const now = Date.now();
      const elapsed = Math.floor((now - lastTick) / 1000);
      return {
        seconds: accumulatedSeconds + Math.max(0, elapsed),
        lastTick: now,
      };
    }

    // Get a snapshot of accumulated seconds (read-only, doesn't mutate)
    function snapshotSeconds(isActive, lastTick, accumulatedSeconds) {
      if (!isActive || !lastTick) return accumulatedSeconds;
      return accumulatedSeconds + Math.max(0, Math.floor((Date.now() - lastTick) / 1000));
    }
    ```

    The current pattern is:
    ```js
    // Appears 9 times with slight variations:
    if (state.isOnProductiveSite && state.lastProductiveTick) {
      const elapsed = Math.floor((Date.now() - state.lastProductiveTick) / 1000);
      state.productiveSeconds += Math.max(0, elapsed);
      state.lastProductiveTick = Date.now();
    }
    ```

    With these utilities, each callsite becomes a one-liner.
  </action>
  <verify>File exists and exports flushElapsed and snapshotSeconds.</verify>
  <done>timer.js exists with both timer utility functions</done>
</task>

<task type="auto">
  <name>Create site-matching utilities — extract URL matching duplicated across 4+ functions</name>
  <files>extension/site-utils.js</files>
  <action>
    Create `extension/site-utils.js` by extracting from background.js:

    1. Move `urlMatchesSites(url, sites)` here (currently background.js lines 55-66)
    2. Move `urlMatchesAllowedPaths(url, allowedPaths)` here (currently background.js lines 68-81)
    3. Add a combined helper since the check `urlMatchesSites(url, sites) && !urlMatchesAllowedPaths(url, allowedPaths)` appears 4+ times:

    ```js
    function isBlockedUrl(url, blockedSites, allowedPaths) {
      return urlMatchesSites(url, blockedSites) && !urlMatchesAllowedPaths(url, allowedPaths);
    }
    ```

    This combined check is duplicated in: checkCurrentTab() line 116, closeBlockedTabs() line 444, redirectBlockedTabs() line 463, redirectNonActiveTabs() line 483.
  </action>
  <verify>File exists and exports urlMatchesSites, urlMatchesAllowedPaths, isBlockedUrl.</verify>
  <done>site-utils.js exists with all three URL matching functions</done>
</task>

## Wave 2 — Refactor background.js (Core)

Apply the shared utilities to background.js — the largest and most fragile file.

<task type="auto">
  <name>Refactor background.js to use shared utilities</name>
  <files>extension/background.js</files>
  <action>
    Refactor background.js to import and use the Wave 1 utilities. This is the critical task — background.js has the most duplication.

    **Import utilities at top** (service workers use importScripts):
    ```js
    importScripts('constants.js', 'storage.js', 'timer.js', 'site-utils.js');
    ```

    **1. Replace all chrome.storage.local.get/set callbacks with getStorage/setStorage:**

    Every instance of:
    ```js
    chrome.storage.local.get(['key'], (result) => { ... });
    ```
    Becomes:
    ```js
    const result = await getStorage(['key']);
    ```

    And:
    ```js
    chrome.storage.local.set({ key: value });
    ```
    Becomes:
    ```js
    await setStorage({ key: value });
    ```

    Key locations:
    - Startup state load (line ~28): `getStorage(['focusState'])`
    - getStatus handler (line ~196): Replace callback with async
    - handleEndSession (line ~298): Multiple storage calls
    - checkAndGrantReward (line ~352): Nested callback
    - handleUseReward (line ~372): Nested callback — restructure to async/await
    - handlePauseReward (line ~413): Storage call

    **CRITICAL for getStatus handler**: The `onMessage` listener must still use `sendResponse` pattern with `return true`. Convert the internal storage call to async but keep the message handler contract intact:
    ```js
    if (message.action === 'getStatus') {
      (async () => {
        const result = await getStorage(['todayMinutes', 'unusedRewardSeconds']);
        // ... compute status ...
        sendResponse({ ... });
      })();
      return true;
    }
    ```

    **CRITICAL for handleUseReward**: Currently wraps everything in `new Promise` with nested callback. Simplify to straight async/await:
    ```js
    async function handleUseReward() {
      if (!state.sessionActive) {
        return { success: false, reason: 'Must be in an active work session to burn reward minutes' };
      }
      const result = await getStorage(['unusedRewardSeconds']);
      const availableSeconds = result.unusedRewardSeconds || 0;
      if (availableSeconds <= 0) {
        return { success: false, reason: 'No reward minutes available' };
      }
      // ... rest of logic without nesting ...
    }
    ```

    **2. Replace all 9 time-flushing patterns with timer.js functions:**

    Pattern A — Flush and update state (mutating, used in alarm handlers and state updates):
    ```js
    // Before (appears 5+ times):
    if (state.isOnProductiveSite && state.lastProductiveTick) {
      const elapsed = Math.floor((Date.now() - state.lastProductiveTick) / 1000);
      state.productiveSeconds += Math.max(0, elapsed);
      state.lastProductiveTick = Date.now();
    }

    // After:
    const flushed = flushElapsed(state.isOnProductiveSite, state.lastProductiveTick, state.productiveSeconds);
    state.productiveSeconds = flushed.seconds;
    state.lastProductiveTick = flushed.lastTick;
    ```

    Apply to:
    - `updateProductiveState()` (lines ~126-128)
    - `updateRewardState()` (lines ~137-139)
    - `handleEndSession()` productive flush (line ~293)
    - `handleEndSession()` reward flush (line ~313)
    - `handlePauseReward()` reward flush (line ~408)
    - Alarm handler productive flush (lines ~500-502)
    - Alarm handler reward flush (lines ~514-516)

    Pattern B — Read-only snapshot (non-mutating, used in getStatus):
    ```js
    // Before:
    let currentProductiveSeconds = state.productiveSeconds;
    if (state.isOnProductiveSite && state.lastProductiveTick && state.sessionActive) {
      currentProductiveSeconds += Math.floor((Date.now() - state.lastProductiveTick) / 1000);
    }

    // After:
    const currentProductiveSeconds = state.sessionActive
      ? snapshotSeconds(state.isOnProductiveSite, state.lastProductiveTick, state.productiveSeconds)
      : state.productiveSeconds;
    ```

    Apply to getStatus handler for both productive and reward snapshots.

    **3. Replace all inline URL matching with site-utils.js:**

    - Delete the `urlMatchesSites()` and `urlMatchesAllowedPaths()` function definitions from background.js (they now live in site-utils.js)
    - Replace all `urlMatchesSites(url, sites) && !urlMatchesAllowedPaths(url, paths)` combos with `isBlockedUrl(url, sites, paths)`
    - Locations: checkCurrentTab(), closeBlockedTabs(), redirectBlockedTabs(), redirectNonActiveTabs()

    **4. Replace magic numbers with constants.js:**

    - `['youtube.com']` → `DEFAULTS.rewardSites` (appears in checkCurrentTab, closeBlockedTabs, redirectBlockedTabs, redirectNonActiveTabs, blockSites)
    - `0.25` alarm period → `ALARM_PERIOD_MINUTES`
    - `1000` rule ID offset → `ALLOW_RULE_ID_OFFSET`

    **5. Extract shared site-loading pattern** — The following 5-line block appears in 4 functions (closeBlockedTabs, redirectBlockedTabs, redirectNonActiveTabs, blockSites):
    ```js
    const result = await getStorage(['rewardSites', 'allowedPaths']);
    const sites = result.rewardSites || DEFAULTS.rewardSites;
    const allowedPaths = result.allowedPaths || DEFAULTS.allowedPaths;
    ```
    Extract into:
    ```js
    async function loadSiteConfig() {
      const result = await getStorage(['rewardSites', 'allowedPaths']);
      return {
        sites: result.rewardSites || DEFAULTS.rewardSites,
        allowedPaths: result.allowedPaths || DEFAULTS.allowedPaths,
      };
    }
    ```

    **6. Delete closeBlockedTabs()** — It's never called anywhere (dead code since redirectBlockedTabs replaced it).

    **IMPORTANT**: Do NOT change any behavior. Every message handler should produce identical responses. Every state transition should work exactly the same. This is purely structural.
  </action>
  <verify>Load the extension in Chrome, open popup, start a session, visit a blocked site (verify redirect), visit a productive site (verify timer counts), end session. All features still work.</verify>
  <done>background.js uses shared utilities, no more duplicated patterns, all features work identically</done>
</task>

## Wave 3 — Refactor popup.js and blocked.js

<task type="auto">
  <name>Refactor popup.js — split renderUI, use shared utilities</name>
  <files>extension/popup.js, extension/popup.html</files>
  <action>
    **1. Add script imports to popup.html** (before popup.js):
    ```html
    <script src="constants.js"></script>
    <script src="storage.js"></script>
    ```
    (popup.js doesn't need timer.js or site-utils.js — those are background-only)

    **2. Replace storage callbacks with getStorage/setStorage:**
    - `chrome.storage.local.get(['workMinutes', 'rewardMinutes'], ...)` → `getStorage`
    - `chrome.storage.local.get(['strictMode'], ...)` → `getStorage`
    - `chrome.storage.local.get(['penaltyAmount', ...], ...)` → `getStorage`
    - `chrome.storage.local.set({ workMinutes, rewardMinutes })` → `setStorage`

    For the initial load and strictMode cache, convert to async:
    ```js
    // Before:
    chrome.storage.local.get(['workMinutes', 'rewardMinutes'], (result) => {
      workInput.value = result.workMinutes || 50;
      rewardInput.value = result.rewardMinutes || 10;
    });

    // After:
    const saved = await getStorage(['workMinutes', 'rewardMinutes']);
    workInput.value = saved.workMinutes || DEFAULTS.workMinutes;
    rewardInput.value = saved.rewardMinutes || DEFAULTS.rewardMinutes;
    ```

    **3. Replace magic defaults with DEFAULTS constant:**
    - `50` → `DEFAULTS.workMinutes` (in ratio load and renderUI goalSec calculation)
    - `10` → `DEFAULTS.rewardMinutes`

    **4. Split renderUI() into focused functions:**

    Break the 75-line renderUI into 4 small functions:

    ```js
    function renderStats(status) {
      todayMinutes.textContent = status.todayMinutes || 0;
      rewardBalance.textContent = formatTime(status.unusedRewardSeconds || 0);
      streakTitle.textContent = getStreakTitle(status.todayMinutes || 0);
    }

    function renderInputLock(status) {
      const locked = status.sessionActive || status.rewardActive;
      workInput.disabled = locked;
      rewardInput.disabled = locked;
    }

    function renderTimer(status) {
      if (status.rewardActive) {
        // ... reward timer display ...
      } else if (status.sessionActive) {
        // ... work timer display ...
      } else {
        // ... idle display ...
      }
    }

    function renderButtons(status) {
      // Reset all
      btnStart.style.display = 'none';
      btnEnd.style.display = 'none';
      btnReward.style.display = 'none';
      btnPause.style.display = 'none';

      if (status.rewardActive) {
        btnPause.style.display = 'block';
        if (status.sessionActive) showEndButton(status);
      } else if (status.sessionActive) {
        showEndButton(status);
        if ((status.unusedRewardSeconds || 0) > 0) {
          btnReward.style.display = 'block';
          // ... disabled logic ...
        }
      } else {
        btnStart.textContent = 'Lock In';
        btnStart.style.display = 'block';
      }
    }

    function renderUI(status) {
      renderStats(status);
      renderInputLock(status);
      renderTimer(status);
      renderButtons(status);
      updateAuthUI();
    }
    ```

    The timer and button rendering are currently interleaved in one big if/else. Separate them so timer display and button visibility are independent concerns. The timer section class, display text, and label should be set in renderTimer(). The button visibility/disabled state should be set in renderButtons().

    **5. Convert penalty modal config fetch to async** (currently async callback that can race):
    ```js
    // Before:
    chrome.storage.local.get(['penaltyAmount', ...], (config) => { ... });

    // After:
    const config = await getStorage(['penaltyAmount', 'penaltyTarget', 'penaltyType']);
    ```

    **IMPORTANT**: Do NOT change any visual behavior. The popup should look and behave identically.
  </action>
  <verify>Open popup in all states (idle, session active, reward burning, reward paused-back-to-session). All displays and buttons match previous behavior.</verify>
  <done>popup.js is split into focused render functions, uses shared utilities, no behavior changes</done>
</task>

<task type="auto">
  <name>Refactor blocked.js — extract shame data, use shared utilities</name>
  <files>extension/blocked.js, extension/shame-data.js, extension/blocked.html</files>
  <action>
    **1. Extract shame screen data to separate file:**

    Create `extension/shame-data.js` containing:
    - The `shameScreens` object (currently 200 lines of hardcoded data in blocked.js)
    - The `guiltQuotes` array
    - The `getShameLevel()` function
    - The shame level label/color maps

    This data is currently mixed into the logic of blocked.js making it hard to modify screens without risking code changes.

    **2. Add script imports to blocked.html** (before blocked.js):
    ```html
    <script src="shame-data.js"></script>
    ```

    **3. Simplify blocked.js** — After extracting data, blocked.js should only contain:
    - The URL param check for `reason=reward-expired`
    - `showRewardExpiredScreen()` function
    - `showShameScreen()` function (now much shorter — just calls render with data from shame-data.js)
    - `pickNonRepeating()` utility
    - `renderShameScreen()` function

    **4. Deduplicate the non-repeating pick logic:**
    In the current code, `pickNonRepeating()` exists as a function but the quote selection at line ~265 reimplements the same logic inline. Refactor to reuse `pickNonRepeating()` for both screens and quotes:
    ```js
    // Before (inline duplication):
    let qIdx;
    do {
      qIdx = Math.floor(Math.random() * guiltQuotes.length);
    } while (qIdx === prevQuote && guiltQuotes.length > 1);

    // After:
    const qIdx = pickNonRepeating(guiltQuotes, lastIndex, 'quote');
    ```

    **5. Use chrome.storage.local via inline Promise** (blocked.js doesn't need the full storage.js import since it only reads shameLevel/lastShameIndex once):
    Keep the existing `chrome.storage.local.get` pattern here — it's only used once so the abstraction isn't worth the import.

    **IMPORTANT**: Shame screens must display identically. Same GIFs, same escalation, same text.
  </action>
  <verify>Start a session, visit a blocked site repeatedly. Verify shame levels escalate correctly through all 4 levels. Verify reward-expired screen still works.</verify>
  <done>Shame data extracted to shame-data.js, blocked.js is logic-only, quote picking deduplicated</done>
</task>

## Wave 4 — Settings & Final Cleanup

<task type="auto">
  <name>Refactor settings.js, update manifest, remove dead code</name>
  <files>extension/settings.js, extension/settings.html, extension/manifest.json</files>
  <action>
    **1. Add script imports to settings.html** (before settings.js):
    ```html
    <script src="constants.js"></script>
    <script src="storage.js"></script>
    ```

    **2. Refactor settings.js to use shared utilities:**
    - Replace `DEFAULT_SETTINGS` object with imports from `DEFAULTS` constant (eliminate the duplicate default definitions)
    - Replace `chrome.storage.local.get(...)` callbacks with `await getStorage(...)`
    - Replace `chrome.storage.local.set(...)` callbacks with `await setStorage(...)`
    - Make `loadSettings()` and save functions use async/await

    **3. Replace fragile section locking:**
    ```js
    // Before (fragile — breaks if HTML sections reorder):
    const lockIndices = [0, 1, 2];

    // After (robust — uses data attributes):
    const lockableSections = document.querySelectorAll('.section[data-lockable]');
    ```
    Add `data-lockable` attribute to the reward sites, productive sites, and strict mode sections in settings.html.

    **4. Update manifest.json** to register the new utility scripts as web_accessible_resources if needed. Service worker scripts loaded via `importScripts` don't need to be in web_accessible_resources — they're loaded in the background context. But verify that popup.html and blocked.html can load the scripts (they should be fine since they're loaded as extension pages with same-origin access).

    **5. Delete dead code:**
    - `closeBlockedTabs()` in background.js (if not already removed in Wave 2 — verify it's gone). It was replaced by `redirectBlockedTabs()` but the function definition may still exist.
    - Any `TODO` or `FIXME` comments
    - The `lastFetchTime` variable in popup.js (calculated but never read)

    **IMPORTANT**: Settings page must load, display, and save all settings identically.
  </action>
  <verify>Open settings page, change reward sites, productive sites, penalty config, strict mode. Verify all save correctly. Start a session, verify settings lock. End session, verify settings unlock.</verify>
  <done>settings.js uses shared utilities, section locking uses data attributes, dead code removed</done>
</task>

## Success Criteria

1. **Zero behavior changes** — All 12 test cases from STATE.md still pass
2. **No duplicated patterns** — Time flushing appears once (in timer.js), storage access uses async/await everywhere
3. **Shared utilities** — constants.js, storage.js, timer.js, site-utils.js each used by 2+ files
4. **background.js reduced** — Should drop from ~620 lines to ~400 lines
5. **popup.js renderUI split** — No function over 30 lines
6. **blocked.js data separated** — Shame screen data in its own file, blocked.js is logic-only
7. **No magic numbers** — Default values come from constants.js
