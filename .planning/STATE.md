# Project State

## Current Position
- **Phase**: per-list-modes (Phase 8)
- **Stage**: execute-complete → ready for verification
- **Plan**: per-list-modes-1-PLAN.md
- **Wave**: 4/4 (all waves complete)
- **Last Updated**: 2026-02-20

## Session Context
Phase 8 (per-list-modes) fully executed across 4 waves. All break lists now have mode (off/manual/scheduled/always-on) and schedules fields. Scheduler module evaluates modes on alarm ticks and updates DNR rules. Settings UI has mode dropdown per list with inline schedule editor. Popup shows mode badges. Migration converts legacy isActive to mode. Unit tests added for scheduler functions. Ready for manual verification.

## Key Decisions Made
| When | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Eliminate rewardPaused UI state | Pausing now immediately banks seconds; no separate paused screen |
| 2026-02-14 | Store reward balance as seconds | Avoids rounding bugs from Math.ceil(seconds/60) conversion |
| 2026-02-14 | Extract shared utility modules | Reduces duplication, makes changes less likely to break things |
| 2026-02-14 | data-lockable attributes | Robust section locking instead of fragile index-based approach |
| 2026-02-15 | Curated apps + custom process names | Friendly UX for common apps, flexible for power users |
| 2026-02-16 | importScripts() module system | No build system; MV3 service workers don't support ES modules |
| 2026-02-16 | Self-contained test.html for unit tests | No npm/node; runs in browser |
| 2026-02-16 | Handler map for message routing | Single-line registration vs 100-line if/else |
| 2026-02-16 | 4-wave execution | Tests first, then small refactors, then big split, then popup cleanup |
| 2026-02-18 | Lists contain both sites AND apps | Simpler mental model; one list = one activity context |
| 2026-02-18 | Multiple lists active simultaneously | Composability — e.g., "Social Media" + "Gaming" both blocked |
| 2026-02-18 | Category header toggles all items | Faster bulk selection UX |
| 2026-02-18 | No migration from old format | Start fresh; avoid edge cases |
| 2026-02-18 | Default break list ships pre-populated | Out-of-box useful experience |
| 2026-02-20 | Per-list blocking modes | Each break list gets mode: off/manual/scheduled/always-on |
| 2026-02-20 | Schedules co-located on break list objects | Delete list = delete schedules; one storage read gets everything |
| 2026-02-20 | DNR + in-memory cache for scheduler | DNR rules persist across service worker restarts; cache avoids async reads |
| 2026-02-20 | Immediate schedule transitions | No grace period or notification when schedule window ends |
| 2026-02-20 | Schedule takes precedence over manual | Scheduled = automatic commitment; manual adds on top |
| 2026-02-20 | Mode dropdown replaces active checkbox | Compact, familiar UI pattern |
| 2026-02-20 | isActive derived from mode !== 'off' | Minimizes breakage; existing code that reads isActive still works |

## Blockers
- None

## Phase Progress
| Phase | Status | Notes |
|-------|--------|-------|
| core-experience | complete | Timer, blocking, rewards, penalty modal, settings, popup dashboard |
| shame-mode | complete | 4-level escalating GIF shame system, blocked attempt tracking |
| backend-and-auth | complete | JSON file DB, Auth0 login, session persistence, leaderboard API |
| polish-demo | complete | Testing, bug fixes, reward expiry redirect |
| refactor | complete | 4-wave refactor: shared utilities, async/await, deduplication |
| application-detection | complete | Native messaging host + productive apps tracking |
| ai-readability-refactor | complete | Modular architecture: background.js split into 8 focused modules |
| per-list-modes | execute-complete | Per-list blocking modes + scheduled blocking engine |
| always-on-rewards | not-started | Background productive tracking + always-on reward pools |
| settings-lock | not-started | Commitment device: lock settings, cooldown for weakening |
| blocking-modes-polish | not-started | Migration, testing, mode-specific block pages |
| application-blocking | not-started | Block desktop apps, Steam as reward app |
| unified-settings-save | not-started | Single floating save banner in settings |
| chrome-web-store | not-started | Package and deploy to Chrome Web Store |
