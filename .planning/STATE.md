# Project State

## Current Position
- **Phase**: application-detection
- **Stage**: executing
- **Last Updated**: 2026-02-15

## Session Context
Starting Phase 6: application-detection. User journey decisions have been captured through extensive Q&A. Ready to generate PLAN.md.

## Key Decisions Made
| When | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Eliminate rewardPaused UI state | Pausing now immediately banks seconds; no separate paused screen |
| 2026-02-14 | Store reward balance as seconds | Avoids rounding bugs from Math.ceil(seconds/60) conversion |
| 2026-02-14 | Extract shared utility modules | Reduces duplication, makes changes less likely to break things |
| 2026-02-14 | data-lockable attributes | Robust section locking instead of fragile index-based approach |
| 2026-02-15 | Curated apps + custom process names | Friendly UX for common apps, flexible for power users |
| 2026-02-15 | Same section, separate list for apps | Keeps "What counts as productive?" as single concept |
| 2026-02-15 | Windows only | Simplest path; cross-platform can come later |
| 2026-02-15 | Badge text "⏸" for paused indicator | Subtle but visible feedback on toolbar icon |
| 2026-02-15 | Both modes support apps | All-except-blocked: any app productive. Whitelist: only listed apps |
| 2026-02-15 | 1-second poll rate | Responsive with minimal resource impact |
| 2026-02-15 | Always-running native host | Simpler lifecycle, no start/stop coordination |
| 2026-02-15 | Graceful fallback with warning | Extension works without native host, shows warning in settings |
| 2026-02-15 | Checkbox UI for curated apps | More discoverable than typing process names |

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
| application-detection | discussing | Native messaging host + productive apps tracking |
