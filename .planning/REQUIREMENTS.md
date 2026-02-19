# Requirements

## Phase: scaffold

### REQ-001: Chrome Extension Manifest V3
- **Description**: Create a valid Manifest V3 Chrome extension with popup, background service worker, content scripts, and blocked page
- **Acceptance Criteria**:
  - Extension loads in Chrome without errors
  - Popup opens when clicking extension icon
  - Background service worker runs
- **Priority**: Must-have

### REQ-002: Backend Server Boilerplate
- **Description**: Create Node.js + Express server with project structure, package.json, and basic health endpoint
- **Acceptance Criteria**:
  - `npm install && npm start` runs the server
  - GET /health returns 200
- **Priority**: Must-have

## Phase: core-timer-blocking

### REQ-003: Session Timer Logic
- **Description**: Implement work session timer that counts up, tracks elapsed minutes, and determines when work duration is complete
- **Acceptance Criteria**:
  - Timer starts on "Start Work Session" click
  - Timer counts elapsed minutes
  - Session completes when work duration reached
  - Reward minutes granted on completion
- **Priority**: Must-have

### REQ-004: Site Blocking
- **Description**: Block reward sites during active work sessions using declarativeNetRequest, redirect to blocked.html
- **Acceptance Criteria**:
  - Reward sites redirect to blocked.html during work session
  - Blocked page shows remaining work time
  - Sites unblocked when no session active
- **Priority**: Must-have

### REQ-005: Reward Time System
- **Description**: Track reward minutes, allow using them to temporarily unblock reward sites
- **Acceptance Criteria**:
  - Reward minutes accumulate on session completion
  - "Use Reward Minutes" unblocks reward sites and starts countdown
  - Sites re-blocked when reward time expires
- **Priority**: Must-have

### REQ-006: Popup Dashboard UI
- **Description**: Main popup showing session status, today's stats, reward minutes, and action buttons
- **Acceptance Criteria**:
  - Shows current session elapsed time
  - Shows today's total work minutes
  - Shows unused reward minutes
  - Start/End/Reward buttons work correctly
- **Priority**: Must-have

### REQ-007: End Session Early with Penalty
- **Description**: Allow ending session early with confirmation modal showing simulated penalty
- **Acceptance Criteria**:
  - "End Session Early" shows confirmation with penalty details
  - Confirming ends session, logs penalty, no reward granted
  - Canceling returns to session
- **Priority**: Must-have

## Phase: settings

### REQ-008: Work/Reward Ratio Configuration
- **Description**: Settings page with configurable work and reward minutes
- **Acceptance Criteria**:
  - Default 50/10 ratio
  - User can change and save values
  - Values persist across sessions
- **Priority**: Must-have

### REQ-009: Site List Management
- **Description**: Configure reward sites and productive sites lists
- **Acceptance Criteria**:
  - Text area for reward sites (one domain per line)
  - Text area for productive sites
  - Lists saved and used by blocking logic
- **Priority**: Must-have

### REQ-010: Penalty Configuration
- **Description**: Configure simulated penalty (charity/anti-charity, amount, payment method label)
- **Acceptance Criteria**:
  - Radio select for charity/anti-charity
  - Name and amount inputs
  - Payment method label input
  - Values shown in end-early confirmation modal
- **Priority**: Must-have

## Phase: backend

### REQ-011: JSON File Storage
- **Description**: Implement local JSON file database at server/data/db.json with auto-creation if missing
- **Acceptance Criteria**:
  - server/data/db.json created automatically on first run
  - Stores users, sessions, and blocked attempts
  - Supports read/write operations with proper error handling
- **Priority**: Must-have

### REQ-012: REST API Endpoints
- **Description**: Implement all backend API endpoints for session management, stats, and leaderboard
- **Acceptance Criteria**:
  - POST /session/start - Start new work session
  - POST /session/end - End session and record stats
  - POST /session/blocked-attempt - Track blocked site visits
  - GET /stats/today - Return today's stats for user
  - GET /leaderboard - Return all users ranked by work minutes
  - POST /auth/profile - Save/update user profile
  - Proper error handling on all endpoints
  - Returns correct data shapes
- **Priority**: Must-have

## Phase: auth0-integration

### REQ-013: Auth0 Authentication
- **Description**: Auth0 SPA flow in Chrome extension with Google social login and email/password
- **Acceptance Criteria**:
  - "Sign In" button triggers Auth0 login
  - Google and email/password login work
  - Access token stored and sent with API calls
- **Priority**: Must-have

### REQ-014: JWT Validation Middleware
- **Description**: Backend validates Auth0 JWT on all authenticated endpoints
- **Acceptance Criteria**:
  - Valid JWT required for all API endpoints
  - user_id extracted from token
  - All database records associated with user_id
- **Priority**: Must-have

### REQ-015: Leaderboard
- **Description**: Leaderboard showing all users ranked by total work minutes
- **Acceptance Criteria**:
  - GET /leaderboard returns all users sorted by work minutes (descending)
  - Each entry shows avatar, name, work minutes, and slack attempts count
  - Frontend displays leaderboard with proper ranking
  - Updates reflect new sessions in real-time
- **Priority**: Must-have

## Phase: polish-demo

### REQ-016: Clean Demo-Ready UI
- **Description**: Polish all UI elements for clean demo presentation
- **Acceptance Criteria**:
  - No console errors
  - Clean, professional styling
  - Smooth transitions between states
  - Leaderboard UI is visually polished
- **Priority**: Must-have

### REQ-017: Demo Flow Validation
- **Description**: Full demo flow works end-to-end including shame mode and leaderboard
- **Acceptance Criteria**:
  - Install → Login → Start session → Block site (shame GIF appears) → Multiple blocks escalate shame level → Complete → Reward → Stats reflected in leaderboard → Early end → Penalty recorded
  - All data flows through backend correctly
  - Leaderboard updates with new session data
- **Priority**: Must-have

### REQ-018: Shame Mode - 10 Levels
- **Description**: Escalating shame screens on blocked page with 10 levels of increasing guilt
- **Acceptance Criteria**:
  - Each blocked page visit increments shame level (1-10)
  - Each level displays unique shame GIF/image
  - Level persists throughout session
  - Level resets when session ends
  - GIFs escalate in intensity (mild disappointment → extreme guilt)
- **Priority**: Must-have

### REQ-019: Blocked Attempt Tracking
- **Description**: Track every blocked page visit and display on leaderboard
- **Acceptance Criteria**:
  - Each blocked.html load tracked locally during session
  - Total count sent with POST /session/end
  - Count stored in database per session
  - Leaderboard shows total "slack attempts" for each user
  - Higher slack attempts indicate more procrastination
- **Priority**: Must-have

## Phase: application-detection

### REQ-020: Native Messaging Host
- **Description**: Node.js native messaging host that detects the focused Windows application and reports it to the Chrome extension
- **Acceptance Criteria**:
  - Standalone Node.js script communicating via Chrome's native messaging protocol (length-prefixed JSON on stdin/stdout)
  - Polls focused window every 1 second using Windows APIs
  - Sends `{ type: 'app-focus', processName: '...' }` messages
  - Responds to `ping` with `pong` for health checks
  - Includes install.bat and uninstall.bat for Windows registry
- **Priority**: Must-have

### REQ-021: Productive Apps Timer Integration
- **Description**: Work timer counts time in productive desktop apps, not just browser tabs
- **Acceptance Criteria**:
  - Browser loses focus + productive app focused → timer continues
  - Browser loses focus + non-productive app focused → timer pauses
  - Whitelist mode: only listed apps count as productive
  - All-except-blocked mode: any desktop app counts as productive
  - Badge text "⏸" on extension icon when timer paused during session
  - Badge cleared when timer running or no session active
- **Priority**: Must-have

### REQ-022: Productive Apps Settings UI
- **Description**: Settings UI for configuring which desktop apps count as productive
- **Acceptance Criteria**:
  - Checkbox grid of ~20 curated productivity apps grouped by category
  - Text field for custom process names (one per line)
  - Warning banner when native host not installed
  - Section locked during active sessions via data-lockable
- **Priority**: Must-have

### REQ-023: Graceful Fallback
- **Description**: Extension works normally when native host is unavailable
- **Acceptance Criteria**:
  - Without native host, extension behaves identically to current behavior
  - Warning shown in settings when native host unavailable
  - Auto-reconnect attempted every 5 seconds on disconnect
  - No console errors when native host missing
- **Priority**: Must-have

## Phase: ai-readability-refactor

### REQ-024: Split background.js god module
- **Description**: Decompose 680-line background.js into focused modules
- **Acceptance Criteria**:
  - background.js under 200 lines, orchestrator only
  - Each extracted module under 150 lines, single responsibility
  - importScripts() loads all modules correctly
  - Extension runs identically to before
- **Priority**: Must-have

### REQ-025: Explicit state management
- **Description**: Extract global mutable state into dedicated state.js with getter/setter
- **Acceptance Criteria**:
  - State shape documented in one place
  - All modules access via getState/saveState
- **Priority**: Must-have

### REQ-026: Message handler map
- **Description**: Replace 100-line if/else message router with handler map
- **Acceptance Criteria**:
  - All actions in a map object
  - Adding a handler is a single line
  - return true/false behavior preserved
- **Priority**: Must-have

### REQ-027: Unit tests for pure functions
- **Description**: Automated tests for timer.js, site-utils.js, shame-data.js
- **Acceptance Criteria**:
  - Tests run via test.html in browser
  - All tests pass
- **Priority**: Must-have

### REQ-028: Remove dead code and duplicates
- **Description**: Delete unused redirectNonActiveTabs, remove stale console.logs
- **Acceptance Criteria**:
  - No dead functions
  - No debug console.logs
- **Priority**: Must-have

### REQ-029: Fix API_BASE_URL duplication
- **Description**: Single source of truth for API base URL
- **Acceptance Criteria**:
  - background.js reads from config, not hardcoded
- **Priority**: Should-have

### REQ-030: Extract handleEndSession helpers
- **Description**: Break 65-line function into bankActiveReward + resetSessionState
- **Acceptance Criteria**:
  - handleEndSession under 30 lines
- **Priority**: Should-have

### REQ-031: Event subscriber documentation
- **Description**: Comment listing subscribers for each sendMessage broadcast
- **Acceptance Criteria**:
  - Every sendMessage has subscriber comment
- **Priority**: Should-have

### REQ-032: Deduplicate blocked.js screens
- **Description**: Extract shared showInfoScreen from duplicate functions
- **Acceptance Criteria**:
  - Single showInfoScreen function used by both screens
- **Priority**: Nice-to-have

### REQ-033: Extract popup.js from closure
- **Description**: Move functions to module scope, DOMContentLoaded only wires listeners
- **Acceptance Criteria**:
  - Helper and render functions at module scope
- **Priority**: Nice-to-have

### REQ-034: Leaderboard XSS fix and shame constants
- **Description**: Sanitize avatarSrc, add named constants for shame thresholds
- **Acceptance Criteria**:
  - avatarSrc set via DOM property
  - Shame thresholds use named constants
- **Priority**: Nice-to-have

## Phase: break-productive-lists

### REQ-035: Break & Productive List Data Model
- **Description**: Storage schema for named lists, each containing sites and apps, with unique IDs and activation state
- **Acceptance Criteria**:
  - Lists stored in chrome.storage.local under `breakLists` and `productiveLists` keys
  - Each list has: id, name, sites[], apps[], isActive boolean
  - A default break list ships pre-populated (Instagram, Facebook, YouTube, Steam site+app, Adult Sites, Gambling Sites, News Sites)
  - Multiple lists can be active simultaneously
- **Priority**: Must-have

### REQ-036: List Creation & Editing UI
- **Description**: Settings UI for creating and editing break lists and productive lists
- **Acceptance Criteria**:
  - "Create new break list" and "Create new productive list" buttons
  - Clicking expands an editing section with site/app selection
  - Category header checkboxes toggle all items in that category
  - Existing preset categories available as checkbox groups
  - Custom site/app text inputs available
  - Lists can be renamed, edited, and deleted
- **Priority**: Must-have

### REQ-037: List Selection UI
- **Description**: Top-of-settings UI for selecting which lists are active
- **Acceptance Criteria**:
  - Placed below Strict Mode section
  - Break lists shown with checkboxes (multi-select)
  - Productive options: "All sites (except blocked)" + one checkbox per productive list
  - Selection persisted to storage
  - Locked during active sessions (data-lockable)
- **Priority**: Must-have

### REQ-038: Popup Active List Display
- **Description**: Popup shows which break/productive lists would apply
- **Acceptance Criteria**:
  - Shows active break list name(s)
  - Shows active productive list name(s) only when "All sites" is NOT selected
  - When no lists exist, shows guidance to create one
- **Priority**: Must-have

### REQ-039: Session Integration
- **Description**: Session blocking and productive detection use active lists instead of flat arrays
- **Acceptance Criteria**:
  - `blockSites()` unions all active break lists' sites
  - `blockedApps` unions all active break lists' apps
  - Productive site detection uses union of active productive lists' sites (or all-except-blocked)
  - Productive app detection uses union of active productive lists' apps
  - Existing session flow unchanged (start → work → break → end)
- **Priority**: Must-have
