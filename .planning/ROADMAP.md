# Roadmap

## Phase 1: core-experience
- **Goal**: Full work session experience with timer, blocking, rewards, penalty modal, popup dashboard, and settings
- **Success Criteria**:
  - Extension loads in Chrome, popup has working session controls
  - Timer counts up and completes at configured work duration
  - Reward sites blocked during work session, redirect to blocked.html
  - Reward minutes granted on completion and usable
  - End-early penalty confirmation modal works
  - Popup shows all stats (session time, today total, reward balance)
  - Settings page with work/reward ratio, site lists, penalty config
  - All state persisted in chrome.storage.local
- **Requirements**: REQ-001, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010
- **Status**: DONE

## Phase 2: shame-mode
- **Goal**: Escalating shame GIF system on blocked page with 10 levels of increasing guilt
- **Success Criteria**:
  - Each blocked page visit during session increments shame level (1-10)
  - Each level displays unique shame GIF/message
  - Level persists throughout session, resets on session end
  - Blocked attempts tracked locally during session
  - GIFs escalate from mild disappointment to extreme guilt
  - Shame counter displayed on blocked page
- **Requirements**: REQ-018, REQ-019 (partial - local tracking only)
- **Dependencies**: Phase 1
- **Status**: DONE

## Phase 3: backend-and-auth
- **Goal**: Backend API with JSON file storage, Auth0 authentication, session persistence, leaderboard, and user profiles
- **Success Criteria**:
  - Node.js + Express server running with health endpoint
  - JSON file database at server/data/db.json auto-created
  - All API endpoints functional: POST /session/start, POST /session/end, POST /session/blocked-attempt, GET /stats/today, GET /leaderboard, POST /auth/profile
  - Auth0 SPA flow in extension with Google social login
  - JWT validation middleware on all protected endpoints
  - Session start/end/blocked-attempts recorded in database
  - Leaderboard returns all users ranked by work minutes with slack attempts count
  - Extension switches between local and backend persistence based on auth state
- **Requirements**: REQ-002, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-019 (backend portion)
- **Dependencies**: Phase 2
- **Status**: DONE

## Phase 4: polish-demo
- **Goal**: Polish UI, implement leaderboard display in extension, and validate full demo flow end-to-end
- **Success Criteria**:
  - Zero console errors in extension and backend
  - Leaderboard UI added to extension (new page or tab in popup)
  - Leaderboard displays avatar, name, work minutes, slack attempts
  - Full demo sequence works: install → login → start → block (shame escalates) → multiple slack attempts → complete → reward → stats reflected in leaderboard → early-end → penalty
  - All data flows through backend correctly
  - UI is clean and professional with smooth transitions
- **Requirements**: REQ-016, REQ-017
- **Dependencies**: Phase 3
- **Status**: IN PROGRESS
