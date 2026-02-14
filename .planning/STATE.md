# Project State

## Current Position
- **Phase**: polish-demo
- **Stage**: bug-fixing / iterating
- **Last Updated**: 2026-02-14

## Session Context
After the goofiness pivot, a major feature wave added productive tab tracking, reward burn system, pause/resume, allowed path exceptions, and a credits footer. Two rounds of manual testing followed, surfacing bugs that were fixed across background.js, popup.js, blocked.js, and settings.js. The architecture shifted from a "session completes once" model to a **continuous session model** where sessions never end automatically — they grant reward batches each time a work threshold is crossed.

## Test Results (Latest Round)

### Passing
| # | Test | Status |
|---|------|--------|
| 1 | Productive tab tracking — timer only counts on productive sites | PASS |
| 2 | Blocked site during work session — shame screen shows, timer pauses | PASS |
| 3 | Timer display — numbers tick smoothly every second, no lag | PASS |
| 4 | No shake on shame screens — text fades in only | PASS |
| 5 | Allow path exceptions — whitelisted paths bypass blocks | PASS |
| 6 | LinkedIn footer — name + icon highlight together, both clickable | PASS |
| 7 | Reward timer tab-dependent — pauses when not on reward site | PASS |
| 8 | Reward burn — clicking burn starts reward countdown | PASS |
| 9 | Pause/resume reward — countdown freezes and resumes correctly | PASS |
| 10 | Productive mode toggle — "all except blocked" mode works | PASS |
| 11 | Edge case: blocked page loads during no session | PASS |
| 12 | Reward expiry — tabs close after reward countdown finishes | PASS |

### Bugs Found & Fixed This Session
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Session completion UI not updating until extension reopened | `sessionCompleted` flag required popup reload to reflect | Removed `sessionCompleted`; continuous model with `rewardGrantCount` grants rewards at each threshold crossing, sends `rewardEarned` message |
| Timer display laggy/delayed, numbers jumping | Dual-loop architecture: 1s local tick + 3s status poll caused interpolation drift | Replaced with unified 1s poll loop that fetches fresh status and renders immediately |
| Work timer ticking slower than real time | Same root cause as above (interpolation from stale 3s data) | Fixed by 1s direct polling |
| Shame screens shaking | `animClass: 'shake'` on some screens | Replaced all `shake` with `fade-in` |
| Settings editable during work session | No lock mechanism | Added `lockSiteSections()` in settings.js + `.section-locked` CSS overlay |
| LinkedIn footer not a unit | Name and icon were separate hover targets | Wrapped in single `<a>` with shared hover color |
| Reward burn only used 1x reward_minutes even after 2x threshold | `handleUseReward()` capped at `Math.min(available, state.rewardMinutes)` | Changed to use all available minutes |
| Reward expiry didn't re-block sites / showed nothing | Only called `blockSites()` if `sessionActive`; also called `closeBlockedTabs()` which just removed tabs | Always `blockSites()` on expiry; replaced `closeBlockedTabs()` with `redirectBlockedTabs('reward-expired')` that navigates to a "Reward Time's Up" screen |
| Default productive mode was whitelist (confusing for new users) | `DEFAULT_SETTINGS.productiveMode` was `'whitelist'` | Changed to `'all-except-blocked'` |

## Architecture (Current)

### Continuous Session Model
- Sessions never auto-complete. User starts a session and quits manually.
- `rewardGrantCount` tracks how many reward batches have been granted.
- Each time `productiveSeconds >= workMinutes * 60 * (rewardGrantCount + 1)`, a new batch of `rewardMinutes` is added to `unusedRewardMinutes`.
- Confetti fires on each threshold crossing via `rewardEarned` message.
- Session and reward can coexist (`sessionActive` and `rewardActive` both true).

### Tab-Dependent Timers
- **Work timer**: Only accumulates `productiveSeconds` when active tab is on a productive site (whitelist or all-except-blocked mode).
- **Reward timer**: Only burns `rewardBurnedSeconds` when active tab is on a reward/blocked site.
- Both use the same pattern: `isOn*Site` + `last*Tick` + accumulated seconds.

### Reward Flow
1. User earns reward minutes by hitting work thresholds
2. User clicks "Burn Reward Minutes" (available during session or idle)
3. Sites unblocked, countdown starts (tab-dependent)
4. User can pause reward (re-blocks sites, redirects tabs, freezes countdown)
5. User can resume reward (unblocks, countdown continues)
6. On expiry: sites re-blocked, open reward tabs redirected to "Reward Time's Up" screen

## Key Decisions Made
| When | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Tracer-bullet first | Prove full stack works end-to-end before investing in any single layer |
| 2026-02-14 | chrome.identity.launchWebAuthFlow | Standard MV3 approach for Auth0 in extensions |
| 2026-02-14 | declarativeNetRequest redirect | MV3 compliant, redirects to blocked.html |
| 2026-02-14 | Pivot to goofiness + leaderboard | Hackathon mentors loved shame screens, recommended emphasizing goofiness over serious commitment contracts |
| 2026-02-14 | Snowflake → JSON file | Eliminated cloud DB complexity; simple server/data/db.json with auto-create on first access |
| 2026-02-14 | 10-level shame with GIFs | Escalating from calm quotes to nuclear meltdown with Giphy GIFs for maximum comedic impact |
| 2026-02-14 | Continuous session model | Sessions never auto-end; reward minutes granted at each threshold crossing. Simpler UX, no "completed" state to manage |
| 2026-02-14 | Tab-dependent timers | Work timer only counts productive tabs; reward timer only counts reward-site tabs. Prevents gaming either direction |
| 2026-02-14 | Unified 1s polling in popup | Replaced dual timer/poll with single 1s fetch+render loop for smooth, accurate display |
| 2026-02-14 | Default to all-except-blocked | New users shouldn't need to configure a productive whitelist to get started |

## Blockers
- None

## Phase Progress
| Phase | Status | Notes |
|-------|--------|-------|
| core-experience | complete | Timer, blocking, rewards, penalty modal, settings, popup dashboard |
| shame-mode | complete | 4-level escalating GIF shame system (reduced from 10), blocked attempt tracking |
| backend-and-auth | complete | JSON file DB, Auth0 login, session persistence, leaderboard API, user profiles |
| polish-demo | in-progress | Two rounds of testing complete, major bugs fixed, reward expiry redirect added |

## Open Design Question
How should leftover reward minutes interact with new sessions? Current behavior: reward minutes persist in storage indefinitely. Proposed Option A: user can burn from idle, pause mid-burn, start a new session while paused minutes are saved, and accumulate more on top. Needs UI work for the paused-reward + start-session flow.

## Files Modified This Session
- `extension/background.js` — Full rewrite: continuous session model, tab monitoring, tab-dependent reward timer, redirectBlockedTabs
- `extension/popup.js` — Full rewrite: unified 1s polling, rewardEarned confetti, coexisting session+reward UI
- `extension/blocked.js` — Conditional screens (shame vs burn vs paused vs expired), no shake, non-repeating screens
- `extension/blocked.html` — Added reward-burn, reward-paused, reward-expired CSS
- `extension/settings.js` — Lock sections during session, default to all-except-blocked
- `extension/settings.html` — .section-locked CSS, default radio changed
- `extension/popup.html` — Pause/resume buttons, credits footer, timer state styles
- `extension/manifest.json` — Added tabs permission
