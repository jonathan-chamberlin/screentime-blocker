---
phase: per-list-modes
plan: 1
type: execute
total_waves: 4
total_tasks: 10
requirements_covered: [REQ-040, REQ-041, REQ-042, REQ-043, REQ-044]
files_modified: [extension/constants.js, extension/list-utils.js, extension/scheduler.js, extension/blocking.js, extension/session-state.js, extension/background.js, extension/settings.html, extension/settings.js, extension/popup.html, extension/popup.js, extension/tab-monitor.js]
---

# Plan: Per-List Blocking Modes + Scheduled Blocking — Plan 1

## Objective
Each break list gets an independent blocking mode (Off / Manual / Scheduled / Always-On). Build the scheduler engine that evaluates schedules on alarm ticks and updates DNR rules. Replace the "active" checkbox in settings with a mode dropdown. Preserve existing manual session behavior while adding scheduled blocking.

## Context
- Project: Brainrot Blocker — Chrome extension commitment contract system
- Phase goals: Per-list blocking modes, scheduled blocking engine, mode-aware UI
- Prerequisites: Phase 7 complete (modular architecture, list-utils.js, break lists with isActive)
- Key decisions: Schedules co-located on list objects; DNR + in-memory cache; mode dropdown replaces checkbox; isActive derived from mode; schedule transitions immediate

## Wave 1 — Data Model + Scheduler Core (no UI dependencies)

<task type="auto">
  <name>Add mode and schedules fields to break list data model</name>
  <files>extension/constants.js, extension/list-utils.js</files>
  <action>
    In constants.js:
    1. Add `mode: 'manual'` and `schedules: []` to DEFAULT_BREAK_LIST
    2. Add BLOCKING_MODES constant: `{ OFF: 'off', MANUAL: 'manual', SCHEDULED: 'scheduled', ALWAYS_ON: 'always-on' }`
    3. Add MODE_STRENGTH constant for ordering: `{ 'off': 0, 'manual': 1, 'scheduled': 2, 'always-on': 3 }` (used later for settings lock)

    In list-utils.js:
    4. Add `migrateBreakList(list)` function: if list has no `mode` field, set `mode` to `list.isActive ? 'manual' : 'off'` and `schedules` to `[]`. Always derive `isActive` as `mode !== 'off'`. Return mutated list.
    5. Add `migrateBreakLists(lists)` function: maps over array, calls migrateBreakList on each, returns array.
    6. Update `getActiveBreakSites()` to call migrateBreakList on each list before checking isActive (safety net).
    7. Update `getActiveBreakApps()` same way.
    8. Add `isScheduleActiveNow(schedules)` function: given a schedules array, check if current time (day-of-week + HH:MM) falls within any window. Each schedule is `{ days: [0-6], startTime: 'HH:MM', endTime: 'HH:MM' }`. Sunday = 0, Saturday = 6. Handle overnight windows (startTime > endTime spans midnight). Return boolean.
    9. Add `getListsBlockingNow(breakLists, sessionActive)` function: returns array of list objects that should currently be blocking. Logic per mode:
       - 'off': never blocks
       - 'manual': blocks only if sessionActive is true
       - 'scheduled': blocks if isScheduleActiveNow(list.schedules)
       - 'always-on': always blocks
    10. Add `getBlockingSites(breakLists, sessionActive)` function: calls getListsBlockingNow, unions all sites. Returns string array.
    11. Add `getBlockingApps(breakLists, sessionActive)` function: calls getListsBlockingNow, unions all apps. Returns array.
  </action>
  <verify>Extension loads without errors; existing blocking behavior unchanged (all lists have mode 'manual' after migration)</verify>
  <done>constants.js has BLOCKING_MODES and MODE_STRENGTH. list-utils.js has migration functions, isScheduleActiveNow, getListsBlockingNow, getBlockingSites, getBlockingApps. DEFAULT_BREAK_LIST has mode and schedules fields.</done>
</task>

<task type="auto">
  <name>Create scheduler.js module</name>
  <files>extension/scheduler.js</files>
  <action>
    Create new file extension/scheduler.js. This module runs in the service worker and is responsible for evaluating schedules and updating DNR rules.

    Module structure:
    1. In-memory cache: `let schedulerCache = { blockingListIds: new Set(), blockingSites: [], blockingApps: [] }`

    2. `async function evaluateScheduler()` — the main function called on startup + every alarm tick:
       a. Read breakLists from storage via getStorage(['breakLists'])
       b. Migrate lists via migrateBreakLists()
       c. Call getListsBlockingNow(breakLists, state.sessionActive) to get currently-blocking lists
       d. Call getBlockingSites(breakLists, state.sessionActive) for sites
       e. Call getBlockingApps(breakLists, state.sessionActive) for apps
       f. Update schedulerCache
       g. Call updateBlockingRules(sites) to sync DNR rules (only session-level rules, IDs < NUCLEAR_RULE_ID_OFFSET)
       h. Return the cache for callers that need it

    3. `async function updateBlockingRules(sites)` — syncs DNR rules:
       a. Read allowedPaths from storage
       b. Get existing dynamic rules, filter to session-level (ID < NUCLEAR_RULE_ID_OFFSET)
       c. Build block rules from sites (same logic as current blockSites())
       d. Build allow rules from allowedPaths (same logic as current blockSites())
       e. Call chrome.declarativeNetRequest.updateDynamicRules with removeRuleIds + addRules
       Note: When sites array is empty, this effectively removes all session-level rules (like current unblockSites())

    4. `function getSchedulerCache()` — returns current schedulerCache for popup/tab queries

    5. `function isCurrentlyBlocking()` — returns schedulerCache.blockingSites.length > 0

    This module depends on: list-utils.js (getListsBlockingNow, getBlockingSites, getBlockingApps, migrateBreakLists), session-state.js (state), storage.js (getStorage), constants.js (NUCLEAR_RULE_ID_OFFSET, ALLOW_RULE_ID_OFFSET, DEFAULTS)
  </action>
  <verify>File exists and is syntactically valid JS</verify>
  <done>scheduler.js module created with evaluateScheduler, updateBlockingRules, getSchedulerCache, isCurrentlyBlocking functions</done>
</task>

## Wave 2 — Integrate Scheduler into Background + Update Blocking (depends on Wave 1)

<task type="auto">
  <name>Wire scheduler.js into background.js and replace blockSites/unblockSites calls</name>
  <files>extension/background.js</files>
  <action>
    1. Add 'scheduler.js' to the importScripts list (after 'blocking.js')
    2. In the startup IIFE:
       - After restoring state from focusState, call `await evaluateScheduler()` instead of the manual blockSites()/unblockSites() branching
       - Keep the existing nuclear rules application
       - Create a new alarm: `chrome.alarms.create('evaluateScheduler', { periodInMinutes: ALARM_PERIOD_MINUTES })` so the scheduler runs every 15 seconds
    3. In the alarm handler:
       - Add case for 'evaluateScheduler' alarm: call `await evaluateScheduler()`
       - Keep existing 'checkSession' and 'checkNuclear' alarm handling
    4. In messageHandlers:
       - Update 'startSession' handler: after handleStartSession(), call `await evaluateScheduler()` (it will now pick up sessionActive=true and apply manual list rules)
       - Update 'updateRewardSites' handler: call `await evaluateScheduler()` instead of blockSites()
       - Update 'addToBlockedSites' handler: call `await evaluateScheduler()` and `await redirectBlockedTabs()` instead of blockSites() + redirectBlockedTabs()
       - Add new 'getSchedulerStatus' handler that returns getSchedulerCache() for popup queries
       - Add new 'evaluateScheduler' handler that calls evaluateScheduler() and returns success (for settings page to trigger re-evaluation after mode changes)
    5. In deleteAllData handler: call `await evaluateScheduler()` after resetting state
  </action>
  <verify>Extension loads; starting a session still blocks break sites; ending a session still unblocks</verify>
  <done>background.js imports scheduler.js, startup calls evaluateScheduler, alarm handler runs evaluateScheduler periodically, message handlers updated</done>
</task>

<task type="auto">
  <name>Update session.js to use evaluateScheduler instead of direct blockSites/unblockSites</name>
  <files>extension/session.js</files>
  <action>
    1. In handleStartSession():
       - Replace `await blockSites()` with `await evaluateScheduler()`
       - Keep redirectBlockedTabs() call
    2. In handleEndSession():
       - Replace `await unblockSites()` with `await evaluateScheduler()` (the scheduler will see sessionActive=false and remove manual-mode blocking rules, but keep scheduled/always-on rules active)
    3. The key behavioral change: ending a session no longer calls unblockSites() which would remove ALL session-level rules. Instead, evaluateScheduler() re-evaluates which lists should currently block based on their modes.
  </action>
  <verify>Starting a session blocks break sites on manual lists. Ending a session unblocks manual-mode lists but would preserve scheduled-mode blocks if any existed.</verify>
  <done>session.js uses evaluateScheduler() for blocking state transitions instead of direct blockSites/unblockSites</done>
</task>

<task type="auto">
  <name>Update blocking.js and session-state.js loadSiteConfig to be scheduler-aware</name>
  <files>extension/blocking.js, extension/session-state.js</files>
  <action>
    In blocking.js:
    1. Keep blockSites() and unblockSites() as utility functions (they're still used for nuclear block and reward flow)
    2. Update blockSites() to accept an optional `sites` parameter. If provided, use it directly instead of calling loadSiteConfig(). This lets the scheduler pass in the computed sites list. If not provided, fall back to loadSiteConfig() for backward compat.
    3. Keep redirectBlockedTabs() — it reads from storage directly which is fine

    In session-state.js:
    4. Update loadSiteConfig() to use the new getBlockingSites() function from list-utils.js instead of getActiveBreakSites(). Pass `state.sessionActive` as the sessionActive parameter.
       - This means even the legacy codepath now respects modes

    In tab-monitor.js:
    5. Update checkCurrentTab() to read break list blocking from scheduler cache when available:
       - Instead of computing blockedSites from getActiveBreakSites(), try getSchedulerCache().blockingSites first
       - Fall back to the storage-based computation if cache is empty (race condition on startup)
    6. Update the productive site check to use the same productive list logic (unchanged, since productive lists don't have modes yet)
  </action>
  <verify>Tab monitoring correctly identifies blocked sites. Reward flow (unblockSites/blockSites) still works.</verify>
  <done>blocking.js accepts optional sites param. session-state.js loadSiteConfig uses mode-aware getBlockingSites. tab-monitor.js uses scheduler cache.</done>
</task>

<task type="auto">
  <name>Update reward.js to work with scheduler</name>
  <files>extension/reward.js</files>
  <action>
    1. In handleUseReward(): replace `await unblockSites()` with direct call to remove session-level blocking rules (we need to unblock ALL break sites during reward, regardless of mode/schedule). Keep using unblockSites() here since reward should override all blocking.
    2. In handlePauseReward(): replace the `blockSites()` call in setTimeout with `evaluateScheduler()` — this re-applies the correct blocking based on current modes instead of just blindly blocking all active sites.
    3. In handleRewardExpired(): replace `await blockSites()` with `await evaluateScheduler()` — same reasoning, re-evaluate which lists should currently block.
    4. Key insight: During reward burn, ALL session-level blocking is removed (unblockSites). When reward ends, evaluateScheduler() re-applies the correct rules based on current state.
  </action>
  <verify>Reward flow: use reward → sites unblocked → pause/expire → correct blocking rules re-applied based on modes</verify>
  <done>reward.js uses evaluateScheduler() for re-blocking after reward pause/expire, uses unblockSites() to remove blocking during active reward</done>
</task>

## Wave 3 — Settings UI (depends on Wave 1 data model)

<task type="auto">
  <name>Add mode dropdown and schedule editor to settings UI</name>
  <files>extension/settings.html, extension/settings.js</files>
  <action>
    In settings.html:
    1. No structural changes needed to the active break lists section — the rendering is done dynamically in settings.js

    In settings.js — update renderActiveBreakLists():
    2. Replace the checkbox for each break list with a mode dropdown (`<select>`):
       - Options: Off, Manual, Scheduled, Always-On
       - Selected value = list.mode (after migration)
       - Add a mode badge span next to the list name showing the current mode with a colored indicator
    3. When mode dropdown changes:
       a. Update the list's mode in storage
       b. Derive isActive from mode !== 'off'
       c. Save to storage
       d. Send message `{ action: 'evaluateScheduler' }` to background to re-evaluate rules
       e. Show saved indicator
    4. When mode is 'scheduled', show an inline schedule editor below the list row:
       a. Container div with class 'schedule-editor' (initially hidden unless mode === 'scheduled')
       b. For each existing schedule window in list.schedules, render:
          - Day checkboxes: Mon through Sun (values 1-5 for Mon-Fri, 0 for Sun, 6 for Sat)
          - Start time input (type="time", 24h format)
          - End time input (type="time", 24h format)
          - Remove button (×) to delete this window
       c. "Add schedule window" button that appends a new empty window (all days unchecked, times 09:00-17:00 default)
       d. On any change (day toggle, time change, remove), collect all windows and save to the list's schedules array in storage
       e. Send `{ action: 'evaluateScheduler' }` after saving

    Style the mode dropdown and schedule editor:
    5. Add inline styles or add CSS classes in settings.html <style> block:
       - .mode-select: compact dropdown matching existing dark theme
       - .schedule-editor: indented, slightly lighter background
       - .schedule-window: row with day chips + time inputs
       - .day-chip: small toggleable day button (Mon-Sun)
       - .day-chip.active: highlighted when selected
       - Mode badge colors: off=gray, manual=blue, scheduled=purple, always-on=green

    6. When mode is 'always-on', show a placeholder note: "Always-on reward config coming in a future update" (Phase 9)
  </action>
  <verify>Open settings page, see mode dropdown per break list. Switch to Scheduled, see schedule editor with day checkboxes and time inputs. Adding/removing windows works. Mode changes persist across page reload.</verify>
  <done>Settings UI has mode dropdown per break list, inline schedule editor for scheduled mode, mode badges, all changes auto-saved and trigger scheduler re-evaluation</done>
</task>

## Wave 4 — Popup Updates + Migration + Cleanup (depends on Waves 2 and 3)

<task type="auto">
  <name>Update popup to show mode badges and scheduler status</name>
  <files>extension/popup.html, extension/popup.js</files>
  <action>
    In popup.js — update renderActiveLists():
    1. Instead of reading rewardSites/productiveSites (old keys), read breakLists from storage
    2. Migrate lists via migrateBreakLists()
    3. For each list where mode !== 'off', render a row showing:
       - List name
       - Mode badge (colored span): "Manual" / "Scheduled" / "Always-On"
       - For scheduled: if currently in a window, show "Active" indicator; if outside window, show "Inactive"
       - Site/app count
    4. Add mode badge CSS in popup.html <style> block:
       - .mode-badge: small pill-shaped span
       - .mode-badge.manual: blue
       - .mode-badge.scheduled: purple
       - .mode-badge.always-on: green
       - .mode-badge.active: brighter variant when schedule is active

    5. Request scheduler status via `chrome.runtime.sendMessage({ action: 'getSchedulerStatus' })` to determine which lists are currently blocking (for the "Active"/"Inactive" indicator on scheduled lists)
  </action>
  <verify>Popup shows break lists with mode badges. Scheduled lists show active/inactive status based on current time.</verify>
  <done>Popup displays mode badges per break list, scheduled lists show active/inactive status, old rewardSites rendering replaced with mode-aware list rendering</done>
</task>

<task type="auto">
  <name>Run migration on startup and add unit tests for scheduler functions</name>
  <files>extension/background.js, extension/tests/test-scheduler.js, extension/tests/unit-tests.html</files>
  <action>
    In background.js startup IIFE:
    1. Before calling evaluateScheduler(), read breakLists from storage, run migrateBreakLists(), and save back if any list was missing the mode field. This ensures one-time migration.

    Create extension/tests/test-scheduler.js with tests for:
    2. isScheduleActiveNow() tests:
       - Empty schedules → false
       - Current time within a window → true
       - Current time outside all windows → false
       - Overnight window (e.g., 22:00 - 06:00) — test both inside and outside
       - Multiple windows with different days
    3. migrateBreakList() tests:
       - List with isActive: true, no mode → mode: 'manual'
       - List with isActive: false, no mode → mode: 'off'
       - List already has mode → unchanged
       - isActive derived correctly from mode
    4. getListsBlockingNow() tests:
       - Off mode → not in result
       - Manual mode with sessionActive=true → in result
       - Manual mode with sessionActive=false → not in result
       - Scheduled mode with matching schedule → in result (mock Date)
       - Always-on mode → always in result

    In extension/tests/unit-tests.html:
    5. Add <script src="../list-utils.js"> and <script src="test-scheduler.js"> to load the new tests
    6. Note: isScheduleActiveNow tests that depend on current time should use a helper that accepts a Date parameter, or the test should document that results depend on when tests run. Better: refactor isScheduleActiveNow to accept an optional `now` Date parameter for testability.
  </action>
  <verify>Open unit-tests.html in browser, all new scheduler tests pass alongside existing tests</verify>
  <done>Migration runs on startup, unit tests for isScheduleActiveNow, migrateBreakList, getListsBlockingNow all pass</done>
</task>

<task type="auto">
  <name>Clean up deprecated blockSites/unblockSites usage and verify end-to-end</name>
  <files>extension/blocking.js, extension/background.js</files>
  <action>
    1. Audit all remaining calls to blockSites() and unblockSites() across the codebase:
       - blockSites() should only be called from: scheduler.js (via updateBlockingRules), and reward.js (for reward expiry re-blocking via evaluateScheduler)
       - unblockSites() should only be called from: reward.js (handleUseReward — to remove ALL session blocking during reward burn), and blocking.js nuclear block helpers
       - If any other callers exist, replace them with evaluateScheduler()
    2. In blocking.js: add a comment documenting that blockSites/unblockSites are low-level DNR manipulation; evaluateScheduler is the high-level entry point for blocking state changes
    3. Verify the alarm setup doesn't create duplicate alarms:
       - 'evaluateScheduler' alarm should be created once on startup and persist
       - 'checkSession' alarm created/cleared based on session/reward state (existing behavior)
       - 'checkNuclear' alarm always runs (existing behavior)
    4. Ensure the 'evaluateScheduler' alarm period is ALARM_PERIOD_MINUTES (0.25 = 15 seconds) — same frequency as checkSession for responsive schedule transitions
  </action>
  <verify>Load extension, verify no console errors. Start session → break sites blocked. End session → only manual-mode blocks removed. Change a list to scheduled with current time in window → blocks apply without session. Change list to off → blocks removed.</verify>
  <done>No stale blockSites/unblockSites calls. Alarms properly configured. End-to-end flow verified: manual mode preserves existing behavior, scheduled mode blocks during windows, off mode removes blocks.</done>
</task>

## Success Criteria
1. Break lists have `mode` field persisted to storage ('off' | 'manual' | 'scheduled' | 'always-on')
2. Settings page shows mode dropdown per list instead of checkbox
3. Selecting "Scheduled" shows inline schedule editor with day/time controls
4. Scheduler evaluates all lists every 15 seconds and updates DNR rules
5. Scheduled lists block during their defined windows, free outside
6. Manual lists block only during active sessions (existing behavior unchanged)
7. Off lists never block
8. Always-on lists always block (reward integration deferred to Phase 9)
9. Popup shows mode badges per list with active/inactive status for scheduled
10. Migration converts old `isActive: true/false` to `mode: 'manual'/'off'`
11. All new pure functions have unit tests
