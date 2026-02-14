# Project State

## Current Position
- **Phase**: polish-demo
- **Stage**: testing
- **Plan**: —
- **Wave**: —
- **Last Updated**: 2026-02-14

## Session Context
Major pivot completed: project shifted from "serious commitment contract with Snowflake" to "hilariously guilt-trippy focus tool with social competition." Snowflake removed entirely, replaced with JSON file DB. 10-level shame mode with GIFs implemented. Leaderboard added. Auth0 repurposed for leaderboard identity instead of cross-device sync. All implementation waves complete, now in manual testing.

## Key Decisions Made
| When | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Tracer-bullet first | Prove full stack works end-to-end before investing in any single layer |
| 2026-02-14 | chrome.identity.launchWebAuthFlow | Standard MV3 approach for Auth0 in extensions |
| 2026-02-14 | declarativeNetRequest redirect | MV3 compliant, redirects to blocked.html |
| 2026-02-14 | Local timer calculation | Popup calculates elapsed from sessionStartTime locally for second-level precision |
| 2026-02-14 | Pivot to goofiness + leaderboard | Hackathon mentors loved shame screens, recommended emphasizing goofiness over serious commitment contracts |
| 2026-02-14 | Snowflake → JSON file | Eliminated cloud DB complexity; simple server/data/db.json with auto-create on first access |
| 2026-02-14 | Auth0 for leaderboard identity | Auth0 value is shared leaderboard, not cross-device sync |
| 2026-02-14 | 10-level shame with GIFs | Escalating from calm quotes to nuclear meltdown with Giphy GIFs for maximum comedic impact |
| 2026-02-14 | Blocked attempt tracking | Each blocked page visit counted and displayed on leaderboard as "slack attempts" |

## Blockers
- None

## Phase Progress
| Phase | Status | Notes |
|-------|--------|-------|
| core-experience | complete | Timer, blocking, rewards, penalty modal, settings, popup dashboard |
| shame-mode | complete | 10-level escalating GIF shame system, blocked attempt tracking |
| backend-and-auth | complete | JSON file DB, Auth0 login, session persistence, leaderboard API, user profiles |
| polish-demo | in-progress | Leaderboard UI built, manual testing underway |

## Files Changed in Pivot
- `README.md` — Rewrote for goofy identity
- `server/db.js` — Snowflake SDK → JSON file read/write
- `server/index.js` — New endpoints: /leaderboard, /session/blocked-attempt, /auth/profile
- `server/package.json` — Removed snowflake-sdk
- `server/setup-db.js` — Deleted
- `server/.env.example` — Removed Snowflake vars
- `.gitignore` — Added server/data/
- `extension/blocked.js` — 10-level shame with GIFs
- `extension/blocked.html` — Added shame-gif CSS, flash animation
- `extension/background.js` — Blocked attempt tracking, extended notifyBackend
- `extension/popup.js` — Leaderboard button, profile sync after login
- `extension/popup.html` — Leaderboard button
- `extension/manifest.json` — Updated description
- `extension/leaderboard.html` — New file
- `extension/leaderboard.js` — New file
- `.planning/REQUIREMENTS.md` — Updated for new scope
- `.planning/ROADMAP.md` — Simplified to 4 phases
