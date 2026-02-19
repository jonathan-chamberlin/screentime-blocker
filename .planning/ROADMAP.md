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

## Phase 5: refactor
- **Goal**: Eliminate fragility by extracting shared utilities, deduplicating patterns (9x timer flushing, 20x storage callbacks), and splitting monolithic functions
- **Success Criteria**:
  - Zero behavior changes — all existing features work identically
  - Shared utility modules: constants.js, storage.js, timer.js, site-utils.js
  - No duplicated time-flushing pattern (currently 9 copies)
  - All storage access uses async/await (no more callback hell)
  - popup.js renderUI split into focused sub-functions (<30 lines each)
  - Shame data extracted from blocked.js to separate data file
  - No magic numbers — defaults come from constants.js
  - background.js reduced from ~620 to ~400 lines
- **Dependencies**: Phase 4
- **Status**: COMPLETE

## Phase 6: application-detection
- **Goal**: Track productive desktop application usage so the work timer counts time spent in apps like VS Code, not just browser tabs
- **Success Criteria**:
  - Native messaging host detects focused Windows application and reports to extension
  - Work timer continues when user is in a productive app (whitelist mode: listed apps only; all-except-blocked: any app)
  - Work timer pauses with "⏸" badge when user switches to non-productive app
  - Settings UI shows curated app checkboxes + custom process name field
  - Extension falls back gracefully to browser-only tracking when native host unavailable
  - Install/uninstall scripts register native host in Windows registry
- **Requirements**: REQ-020, REQ-021, REQ-022, REQ-023
- **Dependencies**: Phase 5
- **Status**: complete

## Phase 7: ai-readability-refactor
- **Goal**: Make the codebase maximally readable for AI coding agents, reducing hallucination and cross-file breakage while improving human maintainability
- **Success Criteria**:
  - No JS file exceeds 200 lines (background.js drops from 680 to ~150)
  - All pure functions have automated unit tests that pass
  - No dead code, duplicated logic, or magic numbers without named constants
  - Extension loads and runs identically to before (manual verification)
  - Message router uses handler map instead of if/else chain
  - Global state is explicit via state.js module
- **Requirements**: REQ-024 through REQ-034
- **Dependencies**: Phase 6
- **Status**: complete

## Phase 8: break-productive-lists
- **Goal**: Replace flat site/app sections with named, reusable break lists and productive lists that users can create, edit, and activate in any combination
- **Success Criteria**:
  - Data model: lists stored in chrome.storage with unique IDs, each containing sites and apps
  - Default "Default" break list ships with Instagram, Facebook, YouTube, Steam (site+app), Adult Sites, Gambling Sites, News Sites
  - Settings UI: "Create new break list" / "Create new productive list" buttons that expand an editing section
  - Category header checkboxes toggle all items in that category
  - List selection at top of settings (below Strict Mode): checkboxes to activate any combination of break/productive lists
  - Productive mode rework: "All sites (except blocked)" option + one option per user-created productive list (multi-selectable)
  - Popup shows active break list name(s); shows active productive list name(s) only when not using "All sites" mode
  - Nuclear Block section unchanged
  - Session blocking logic uses the union of all active break lists' sites/apps
  - Productive detection logic uses the union of all active productive lists' sites/apps (or all-except-blocked if that option selected)
- **Dependencies**: Phase 7
- **Status**: not-started

## Phase 9: application-blocking
- **Goal**: Enable blocking desktop applications (not just time tracking), specifically for Steam and other apps to be used as break/reward apps
- **Success Criteria**:
  - Native host can block applications by closing them when detected
  - Settings UI allows marking apps as "blocked" vs "productive"
  - During work session, attempting to open blocked app triggers closure + shame redirect
  - During reward burn, blocked apps are accessible
  - Steam specifically can be used as a reward app
  - Graceful fallback when native host unavailable
- **Dependencies**: Phase 8
- **Status**: not-started

## Phase 10: unified-settings-save
- **Goal**: Replace individual save buttons with single floating banner save button at bottom of settings page
- **Success Criteria**:
  - All individual "Save" buttons removed from settings page
  - Single "Save Changes" banner appears at bottom when any setting is modified
  - Banner floats/sticks to bottom of viewport as user scrolls
  - Banner shows clear visual feedback (unsaved changes indicator)
  - Clicking "Save" persists all changed settings at once
  - Banner disappears after successful save with confirmation message
- **Dependencies**: Phase 8
- **Status**: not-started

## Phase 11: chrome-web-store
- **Goal**: Package extension for Chrome Web Store deployment with proper metadata, screenshots, privacy policy
- **Success Criteria**:
  - Extension packaged with production manifest (no dev-only features)
  - 5+ high-quality screenshots showing core features
  - Privacy policy document created and hosted
  - Store listing copy written with clear value proposition
  - Extension submitted and passing Chrome Web Store review
  - Public store link available
- **Dependencies**: Phases 9, 10
- **Status**: not-started
