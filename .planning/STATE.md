# Project State

## Current Position
- **Phase**: refactor
- **Stage**: execution complete
- **Last Updated**: 2026-02-14

## Refactor Summary

Completed 4-wave refactor to reduce fragility and duplication across the extension codebase.

### Wave 1: Shared Utility Modules
Created 4 new modules extracted from background.js:
- `constants.js` — `DEFAULTS`, `ALARM_PERIOD_MINUTES`, `ALLOW_RULE_ID_OFFSET`
- `storage.js` — async `getStorage()`/`setStorage()` wrappers
- `timer.js` — `flushElapsed()` and `snapshotSeconds()`
- `site-utils.js` — `urlMatchesSites()`, `urlMatchesAllowedPaths()`, `isBlockedUrl()`

### Wave 2: Refactor background.js
- Replaced 20+ storage callbacks with async/await via `getStorage`/`setStorage`
- Replaced 9 duplicated timer-flushing patterns with `flushElapsed()`/`snapshotSeconds()`
- Replaced 4 duplicated URL-matching combos with `isBlockedUrl()`
- Replaced all magic numbers with constants
- Removed dead `closeBlockedTabs()` function
- Reduced from 618 → 522 lines

### Wave 3: Refactor popup.js and blocked.js
- Split monolithic `renderUI()` into `renderStats()`, `renderInputLock()`, `renderTimer()`, `renderButtons()`
- Extracted 200+ lines of shame data into `shame-data.js`
- Replaced storage callbacks and magic defaults in popup.js
- Deduplicated quote/screen picking with `pickNonRepeating()`

### Wave 4: Refactor settings.js and cleanup
- Replaced `DEFAULT_SETTINGS` with shared `DEFAULTS` from constants.js
- Replaced all storage callbacks with async/await
- Replaced fragile `lockIndices = [0, 1, 2]` with `data-lockable` attributes
- Added `constants.js` and `storage.js` script imports to settings.html
- Added settings-only keys (strictMode, penaltyType, etc.) to shared DEFAULTS

## Architecture (Current)

### Module Structure
```
extension/
├── constants.js      # Shared defaults and magic numbers
├── storage.js        # Async chrome.storage wrappers
├── timer.js          # Timer flush/snapshot helpers (background only)
├── site-utils.js     # URL matching helpers (background only)
├── shame-data.js     # Shame screen content data (blocked page only)
├── background.js     # Service worker (imports all utilities)
├── popup.js          # Popup UI (uses constants + storage via HTML script tags)
├── blocked.js        # Blocked page logic (uses shame-data via HTML script tag)
├── settings.js       # Settings page (uses constants + storage via HTML script tags)
└── ...
```

### Continuous Session Model
- Sessions never auto-complete. User starts a session and quits manually.
- `rewardGrantCount` tracks how many reward batches have been granted.
- Each time `productiveSeconds >= workMinutes * 60 * (rewardGrantCount + 1)`, a new batch is added to `unusedRewardSeconds`.
- Confetti fires on each threshold crossing via `rewardEarned` message.
- Session and reward can coexist (`sessionActive` and `rewardActive` both true).

### Tab-Dependent Timers
- **Work timer**: Only accumulates `productiveSeconds` when active tab is on a productive site.
- **Reward timer**: Only burns `rewardBurnedSeconds` when active tab is on a reward/blocked site.
- Both use `flushElapsed()` from timer.js.

### Reward Flow
1. User earns reward seconds by hitting work thresholds
2. User clicks "Burn Reward Minutes" (only during active session, after first threshold)
3. Sites unblocked, countdown starts (tab-dependent)
4. User can pause reward → remaining seconds banked to `unusedRewardSeconds`, returns to session view
5. On expiry: sites re-blocked, open reward tabs redirected to "Reward Time's Up" screen

## Post-Refactor Changes
- **End Session skip penalty**: When threshold is met (`rewardGrantCount >= 1`), clicking "End Session" ends immediately without penalty modal. "Quit Early (coward)" still shows penalty modal.
- **Lock all settings sections**: All 5 settings sections (including Penalty and Payment) now locked during work sessions via `data-lockable`.

## Test Results (All 23 Passing)

### Settings Page (Tests 1-11)
| # | Test | Status |
|---|------|--------|
| 1 | Open settings — fields load with saved/default values | PASS |
| 2 | Edit reward sites and save — confirmation, persists on reload | PASS |
| 3 | Edit allowed paths and save — persists on reload | PASS |
| 4 | Toggle productive mode to whitelist — list appears | PASS |
| 5 | Toggle back to all-except-blocked — list hides | PASS |
| 6 | Save productive sites — confirmation, persists | PASS |
| 7 | Change strict mode and save — persists on reload | PASS |
| 8 | Change penalty config and save — persists on reload | PASS |
| 9 | Change payment method and save — persists on reload | PASS |
| 10 | Start session, open settings — ALL 5 sections locked | PASS |
| 11 | End session, open settings — all sections unlocked | PASS |

### Popup Session Flow (Tests 12-18)
| # | Test | Status |
|---|------|--------|
| 12 | No session — "Lock In" visible, reward balance as MM:SS | PASS |
| 13 | Start session, visit blocked site — shame screen appears | PASS |
| 14 | Stay on productive site until confetti — burn button becomes clickable | PASS |
| 15 | Click burn — countdown starts, pause button appears | PASS |
| 16 | Click pause — time banked, returns to session view | PASS |
| 17 | Click burn again — uses full banked balance | PASS |
| 18 | Click "End Session" (threshold met) — ends immediately, reward persists | PASS |

### Stop Button Behavior (Tests 19-23)
| # | Test | Status |
|---|------|--------|
| 19 | Before threshold — "Quit Early (coward)", penalty modal appears, cancel | PASS |
| 20 | Before threshold — confirm penalty, session ends | PASS |
| 21 | Wait for threshold — button text changes to "End Session" | PASS |
| 22 | Click "End Session" — ends immediately, NO penalty modal | PASS |
| 23 | Start new session — button resets to "Quit Early (coward)" | PASS |

## Key Decisions Made
| When | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Eliminate rewardPaused UI state | Pausing now immediately banks seconds; no separate paused screen |
| 2026-02-14 | Store reward balance as seconds | Avoids rounding bugs from Math.ceil(seconds/60) conversion |
| 2026-02-14 | Extract shared utility modules | Reduces duplication, makes changes less likely to break things |
| 2026-02-14 | data-lockable attributes | Robust section locking instead of fragile index-based approach |

## Phase Progress
| Phase | Status | Notes |
|-------|--------|-------|
| core-experience | complete | Timer, blocking, rewards, penalty modal, settings, popup dashboard |
| shame-mode | complete | 4-level escalating GIF shame system, blocked attempt tracking |
| backend-and-auth | complete | JSON file DB, Auth0 login, session persistence, leaderboard API |
| polish-demo | complete | Testing, bug fixes, reward expiry redirect |
| refactor | complete | 4-wave refactor: shared utilities, async/await, deduplication |

## Blockers
- None
