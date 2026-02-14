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

## Phase: backend-snowflake

### REQ-011: Snowflake Integration
- **Description**: Connect backend to Snowflake, create focus_sessions table, write/read session data
- **Acceptance Criteria**:
  - Snowflake connection established with connection pooling
  - focus_sessions table created
  - Can insert and query session records
- **Priority**: Must-have

### REQ-012: REST API Endpoints
- **Description**: Implement POST /session/start, POST /session/end, GET /stats/today, POST /settings/save, GET /settings
- **Acceptance Criteria**:
  - All 5 endpoints functional
  - Proper error handling
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
  - All Snowflake records associated with user_id
- **Priority**: Must-have

### REQ-015: Cross-Device Persistence
- **Description**: Logged-in users get settings and stats from backend; anonymous users use local storage
- **Acceptance Criteria**:
  - Logged-in: settings saved to backend, stats from Snowflake
  - Anonymous: everything in chrome.storage.local
  - Logout reverts to local-only mode
- **Priority**: Must-have

## Phase: polish-demo

### REQ-016: Clean Demo-Ready UI
- **Description**: Polish all UI elements for clean demo presentation
- **Acceptance Criteria**:
  - No console errors
  - Clean, professional styling
  - Smooth transitions between states
- **Priority**: Must-have

### REQ-017: Demo Flow Validation
- **Description**: Full demo flow works end-to-end as specified in spec section 11
- **Acceptance Criteria**:
  - Install → Login → Start session → Block site → Complete → Reward → Stats in Snowflake → Early end → Penalty recorded
- **Priority**: Must-have
