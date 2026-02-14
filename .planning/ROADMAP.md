# Roadmap

## Phase 1: tracer-bullet
- **Goal**: Thinnest possible end-to-end slice proving every layer works together: Chrome extension popup → background service worker → site blocking → backend API → Snowflake write/read → Auth0 login
- **Success Criteria**:
  - Extension loads in Chrome, popup has a "Start Session" button
  - Clicking "Start Session" tells background script to block youtube.com via declarativeNetRequest
  - Visiting youtube.com redirects to blocked.html
  - Extension sends POST /session/start to backend
  - Backend validates Auth0 JWT and writes a row to Snowflake focus_sessions table
  - GET /stats/today returns the session data from Snowflake
  - Auth0 login flow works from extension (even if minimal)
  - "End Session" unblocks youtube.com and sends POST /session/end
  - The full round trip is observable and working
- **Requirements**: REQ-001, REQ-002, REQ-003 (minimal), REQ-004 (minimal), REQ-011, REQ-012 (minimal), REQ-013 (minimal), REQ-014
- **Dependencies**: None
- **Status**: not-started

## Phase 2: core-experience
- **Goal**: Flesh out the full work session experience — real timer, reward system, penalty modal, full popup dashboard
- **Success Criteria**:
  - Timer counts up and completes at configured work duration
  - Reward minutes granted on completion and usable
  - End-early penalty confirmation modal works
  - Popup shows all stats (session time, today total, reward balance)
  - All state persisted in chrome.storage.local for anonymous mode
- **Requirements**: REQ-003 (full), REQ-005, REQ-006, REQ-007
- **Dependencies**: Phase 1
- **Status**: not-started

## Phase 3: settings
- **Goal**: Full settings page with work/reward ratio, site lists, and penalty configuration
- **Success Criteria**:
  - Settings page accessible from popup
  - Work/reward ratio configurable and persisted
  - Reward and productive site lists editable
  - Penalty config (charity/anti-charity, amount, payment label) saved
  - Settings values used by timer and blocking logic
- **Requirements**: REQ-008, REQ-009, REQ-010
- **Dependencies**: Phase 2
- **Status**: not-started

## Phase 4: backend-sync
- **Goal**: Wire extension to backend for logged-in users — settings sync, full session lifecycle in Snowflake, stats from Snowflake
- **Success Criteria**:
  - All 5 REST endpoints fully functional with proper data shapes
  - Extension switches between local and backend persistence based on auth state
  - Session start/end/early-end all recorded in Snowflake
  - Settings saved and loaded from backend when logged in
  - Stats aggregated from Snowflake queries
- **Requirements**: REQ-012 (full), REQ-015
- **Dependencies**: Phase 3
- **Status**: not-started

## Phase 5: polish-demo
- **Goal**: Polish UI and validate full demo flow end-to-end
- **Success Criteria**:
  - Zero console errors
  - Full demo sequence works (install → login → start → block → complete → reward → stats → early-end → penalty)
  - UI is clean and professional
- **Requirements**: REQ-016, REQ-017
- **Dependencies**: Phase 4
- **Status**: not-started
