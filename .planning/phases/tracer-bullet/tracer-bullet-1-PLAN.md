---
phase: tracer-bullet
plan: 1
type: execute
total_waves: 4
total_tasks: 9
requirements_covered: [REQ-001, REQ-002, REQ-003 (minimal), REQ-004 (minimal), REQ-011, REQ-012 (minimal), REQ-013 (minimal), REQ-014]
files_modified: [
  extension/manifest.json,
  extension/popup.html,
  extension/popup.js,
  extension/background.js,
  extension/blocked.html,
  extension/blocked.js,
  extension/auth.js,
  server/package.json,
  server/index.js,
  server/db.js,
  server/middleware/auth.js,
  server/.env.example
]
---

# Plan: Tracer Bullet — Plan 1

## Objective
Fire one thin round through every layer of the system: Chrome extension popup → background service worker → declarativeNetRequest site blocking → Node.js backend → Snowflake database → Auth0 authentication. Every layer gets the minimum viable implementation to prove the full path works.

## Context
- Project: FocusContract — commitment contract Chrome extension
- Phase goals: Prove every layer works together end-to-end
- Prerequisites: Empty repo with README
- Key decisions: declarativeNetRequest for blocking, chrome.identity.launchWebAuthFlow for Auth0, snowflake-sdk for DB

## Wave 1 — Foundation (extension manifest + backend boilerplate + Snowflake schema)

<task type="auto">
  <name>Create Chrome Extension scaffold with Manifest V3</name>
  <files>extension/manifest.json, extension/popup.html, extension/popup.js, extension/blocked.html, extension/blocked.js</files>
  <action>
    Create the extension/ directory with a minimal Manifest V3 Chrome extension.

    manifest.json:
    - manifest_version: 3
    - name: "FocusContract"
    - version: "1.0.0"
    - description: "Commitment contract focus timer"
    - permissions: ["declarativeNetRequest", "storage", "identity"]
    - host_permissions: ["<all_urls>"]
    - action.default_popup: "popup.html"
    - background.service_worker: "background.js"
    - web_accessible_resources: [{ resources: ["blocked.html"], matches: ["<all_urls>"] }]

    popup.html:
    - Simple HTML with a title "FocusContract"
    - A status line showing "No active session"
    - "Sign In" button (id="btn-login")
    - "Start Work Session" button (id="btn-start")
    - "End Session" button (id="btn-end", hidden by default)
    - A div for status messages (id="status")
    - Link popup.js as a script (type="module" is NOT supported in MV3 popups, use regular script)
    - Basic inline styles: centered layout, clean sans-serif font, buttons with padding

    popup.js:
    - Stub file with DOMContentLoaded listener
    - Wire up button click handlers that call chrome.runtime.sendMessage with actions: "startSession", "endSession"
    - Login button calls a function from auth.js (will be implemented in Wave 2)
    - Listen for responses and update status div

    blocked.html:
    - Full-page message: "You're currently in a work session."
    - Subtitle: "Complete your session to unlock this site."
    - Simple centered styling
    - Include blocked.js

    blocked.js:
    - Empty for now, placeholder for future timer display
  </action>
  <verify>Check that manifest.json is valid JSON and all referenced files exist</verify>
  <done>Extension directory exists with valid manifest.json, popup.html, popup.js, blocked.html, blocked.js</done>
</task>

<task type="auto">
  <name>Create Node.js Express backend with health endpoint</name>
  <files>server/package.json, server/index.js, server/.env.example, server/.gitignore</files>
  <action>
    Create the server/ directory with a minimal Express server.

    package.json:
    - name: "focuscontract-server"
    - scripts: { "start": "node index.js", "dev": "node --watch index.js" }
    - dependencies: express, cors, dotenv, snowflake-sdk, express-jwt (for future use), jwks-rsa (for future use)

    index.js:
    - require dotenv/config
    - Create Express app on PORT from env (default 3000)
    - Use cors() middleware (allow all origins for hackathon)
    - Use express.json() middleware
    - GET /health returns { status: "ok" }
    - Placeholder route comments for: POST /session/start, POST /session/end, GET /stats/today
    - Listen on PORT, log "Server running on port {PORT}"

    .env.example:
    - PORT=3000
    - SNOWFLAKE_ACCOUNT=
    - SNOWFLAKE_USERNAME=
    - SNOWFLAKE_PASSWORD=
    - SNOWFLAKE_DATABASE=
    - SNOWFLAKE_SCHEMA=
    - SNOWFLAKE_WAREHOUSE=
    - AUTH0_DOMAIN=
    - AUTH0_AUDIENCE=

    .gitignore:
    - node_modules/
    - .env
  </action>
  <verify>cd server && npm install && node -e "require('./index.js')" (should start without crash — will need to kill after)</verify>
  <done>Server starts, GET /health returns 200</done>
</task>

## Wave 2 — Core connections (Snowflake DB + Auth0 + background service worker)

<task type="auto">
  <name>Implement Snowflake connection and focus_sessions table setup</name>
  <files>server/db.js, server/setup-db.js</files>
  <action>
    Create server/db.js — Snowflake connection module:
    - require snowflake-sdk
    - Create connection using env vars: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD, SNOWFLAKE_DATABASE, SNOWFLAKE_SCHEMA, SNOWFLAKE_WAREHOUSE
    - Export a connect() function that returns a promise wrapping connection.connect()
    - Export an execute(sqlText, binds) function that returns a promise wrapping connection.execute()
    - Export the connection object

    Create server/setup-db.js — One-time table creation script:
    - Import connect and execute from db.js
    - Run CREATE TABLE IF NOT EXISTS focus_sessions (
        session_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255),
        start_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
        end_timestamp TIMESTAMP_NTZ,
        minutes_completed INTEGER DEFAULT 0,
        ended_early BOOLEAN DEFAULT FALSE,
        penalty_amount FLOAT DEFAULT 0,
        reward_minutes_earned INTEGER DEFAULT 0
      )
    - Log success/failure, then process.exit()
    - Add "setup-db" script to package.json: "node setup-db.js"
  </action>
  <verify>Check that db.js and setup-db.js exist and have no syntax errors: cd server && node -c db.js && node -c setup-db.js</verify>
  <done>db.js exports connect/execute, setup-db.js creates focus_sessions table</done>
</task>

<task type="auto">
  <name>Implement Auth0 login flow in Chrome extension</name>
  <files>extension/auth.js, extension/config.js</files>
  <action>
    Create extension/config.js — Configuration constants:
    - AUTH0_DOMAIN (placeholder: "your-tenant.auth0.com")
    - AUTH0_CLIENT_ID (placeholder: "your-client-id")
    - AUTH0_AUDIENCE (placeholder: "https://focuscontract-api")
    - API_BASE_URL: "http://localhost:3000"
    - Export all as window.CONFIG object

    Create extension/auth.js — Auth0 authentication:
    - login() function:
      - Build Auth0 authorize URL with:
        - client_id from CONFIG
        - response_type: "token"
        - redirect_uri: https://{chrome.runtime.id}.chromiumapp.org/
        - scope: "openid profile email"
        - audience from CONFIG
        - nonce: random string
      - Call chrome.identity.launchWebAuthFlow({ url, interactive: true })
      - Parse the redirect URL hash fragment to extract access_token
      - Store access_token in chrome.storage.local
      - Return the token
    - logout() function:
      - Remove access_token from chrome.storage.local
    - getToken() function:
      - Retrieve access_token from chrome.storage.local
      - Return it (or null)
    - Expose functions on window.Auth object
  </action>
  <verify>Check syntax: cd extension && node -c config.js 2>/dev/null; echo "auth.js uses chrome APIs, syntax check skipped — file exists"</verify>
  <done>auth.js has login/logout/getToken functions, config.js has all constants</done>
</task>

<task type="auto">
  <name>Implement background service worker with site blocking</name>
  <files>extension/background.js</files>
  <action>
    Create extension/background.js — Background service worker:

    Session state (in-memory, simple for tracer bullet):
    - let sessionActive = false
    - let sessionId = null

    Message listener (chrome.runtime.onMessage):
    Handle action: "startSession":
      - Generate a UUID for sessionId (use crypto.randomUUID())
      - Set sessionActive = true
      - Call blockSites() to add declarativeNetRequest rules
      - Try to send session start to backend (fire-and-forget for now):
        - Get token from chrome.storage.local
        - If token exists, POST to {API_BASE_URL}/session/start with { session_id: sessionId }
        - Include Authorization: Bearer {token} header
      - Send response: { success: true, sessionId }

    Handle action: "endSession":
      - Set sessionActive = false
      - Call unblockSites() to remove declarativeNetRequest rules
      - Try to send session end to backend:
        - POST to {API_BASE_URL}/session/end with { session_id: sessionId, minutes_completed: 0, ended_early: true }
      - Clear sessionId
      - Send response: { success: true }

    Handle action: "getStatus":
      - Send response: { sessionActive, sessionId }

    blockSites() function:
      - Hardcode blocking youtube.com for the tracer bullet
      - Use chrome.declarativeNetRequest.updateDynamicRules:
        - addRules: [{ id: 1, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } }, condition: { urlFilter: "||youtube.com", resourceTypes: ["main_frame"] } }]
        - removeRuleIds: [1] (to avoid duplicates)

    unblockSites() function:
      - chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1], addRules: [] })

    Use importScripts or inline the API_BASE_URL as "http://localhost:3000" (service workers can't import ES modules in MV3, so just hardcode or use importScripts for config.js)
  </action>
  <verify>Check file exists and has no obvious syntax issues</verify>
  <done>background.js handles startSession/endSession messages, blocks/unblocks youtube.com, sends events to backend</done>
</task>

## Wave 3 — Backend API endpoints + Auth middleware

<task type="auto">
  <name>Implement Auth0 JWT validation middleware</name>
  <files>server/middleware/auth.js</files>
  <action>
    Create server/middleware/ directory and server/middleware/auth.js:

    Use the express-jwt and jwks-rsa packages to validate Auth0 JWTs.

    - Import { expressjwt } from "express-jwt" (note: express-jwt v8+ uses named export)
    - Import jwksRsa from "jwks-rsa"
    - Actually, for simplicity in a hackathon with CommonJS, use: const { expressjwt: jwt } = require("express-jwt") and const jwksRsa = require("jwks-rsa")
    - If express-jwt causes issues with CommonJS, fall back to manual JWT verification using jsonwebtoken + jwks-rsa

    Create middleware:
    - jwksUri: https://{AUTH0_DOMAIN}/.well-known/jwks.json
    - audience: process.env.AUTH0_AUDIENCE
    - issuer: https://{AUTH0_DOMAIN}/
    - algorithms: ["RS256"]

    Export the middleware function.

    Also export an optional auth middleware that doesn't reject if no token — sets req.auth if present, continues regardless. This allows endpoints to work for both anonymous and authenticated users during development.
  </action>
  <verify>cd server && node -c middleware/auth.js</verify>
  <done>Auth middleware validates Auth0 JWTs and extracts user_id</done>
</task>

<task type="auto">
  <name>Implement session API endpoints with Snowflake</name>
  <files>server/index.js</files>
  <action>
    Update server/index.js to add the session endpoints. Import db.js and auth middleware.

    POST /session/start:
    - Optionally use auth middleware (optional mode — works with or without token)
    - Extract user_id from req.auth?.sub or "anonymous"
    - Extract session_id from req.body
    - Insert into Snowflake: INSERT INTO focus_sessions (session_id, user_id, start_timestamp) VALUES (?, ?, CURRENT_TIMESTAMP())
    - Return { success: true, session_id }

    POST /session/end:
    - Same optional auth
    - Extract session_id, minutes_completed, ended_early from req.body
    - Update Snowflake: UPDATE focus_sessions SET end_timestamp = CURRENT_TIMESTAMP(), minutes_completed = ?, ended_early = ?, reward_minutes_earned = ? WHERE session_id = ?
    - reward_minutes_earned = ended_early ? 0 : 10 (hardcoded for tracer bullet)
    - Return { success: true }

    GET /stats/today:
    - Same optional auth
    - Extract user_id from req.auth?.sub or "anonymous"
    - Query Snowflake: SELECT COUNT(*) as session_count, SUM(minutes_completed) as total_minutes FROM focus_sessions WHERE user_id = ? AND start_timestamp >= CURRENT_DATE()
    - Return { session_count, total_minutes }

    Initialize Snowflake connection on server start:
    - Call db.connect() before listen()
    - Log connection status
  </action>
  <verify>cd server && node -c index.js</verify>
  <done>Three endpoints functional: POST /session/start, POST /session/end, GET /stats/today — all writing/reading Snowflake</done>
</task>

## Wave 4 — Wire popup to everything

<task type="auto">
  <name>Wire popup UI to background script and auth</name>
  <files>extension/popup.js, extension/popup.html</files>
  <action>
    Update extension/popup.html:
    - Add script tags for config.js and auth.js BEFORE popup.js (order matters, no modules in MV3 popup)
    - Add a "Stats" section showing session count and total minutes (id="stats")
    - Add a login status indicator (id="auth-status")

    Update extension/popup.js to wire everything together:

    On DOMContentLoaded:
    - Check auth status: call Auth.getToken()
    - If token exists, show "Logged in" in auth-status, change login button to "Log Out"
    - Check session status: chrome.runtime.sendMessage({ action: "getStatus" })
    - Update UI based on session state (show/hide start/end buttons)
    - If logged in, fetch stats from backend: GET {API_BASE_URL}/stats/today with Authorization header
    - Display stats in the stats div

    Login button click:
    - If not logged in: call Auth.login(), update UI on success
    - If logged in: call Auth.logout(), update UI

    Start Session button click:
    - chrome.runtime.sendMessage({ action: "startSession" })
    - Update status to "Work session active"
    - Hide start button, show end button
    - Fetch updated stats if logged in

    End Session button click:
    - chrome.runtime.sendMessage({ action: "endSession" })
    - Update status to "No active session"
    - Show start button, hide end button
    - Fetch updated stats if logged in
  </action>
  <verify>Check that popup.js has no syntax errors visible in file content</verify>
  <done>Popup fully wired: login triggers Auth0, start/end session talks to background script which talks to backend which talks to Snowflake</done>
</task>

<task type="checkpoint:human-action">
  <name>Configure Auth0 and Snowflake credentials</name>
  <files>server/.env, extension/config.js</files>
  <action>
    Ask the user to:
    1. Create an Auth0 SPA application at https://manage.auth0.com
       - Set Allowed Callback URLs to: https://{EXTENSION_ID}.chromiumapp.org/
       - Set Allowed Web Origins to: chrome-extension://{EXTENSION_ID}
       - Note the Domain and Client ID
    2. Create a custom API in Auth0 with identifier "https://focuscontract-api"
    3. Copy server/.env.example to server/.env and fill in:
       - Snowflake credentials (SNOWFLAKE_ACCOUNT, USERNAME, PASSWORD, DATABASE, SCHEMA, WAREHOUSE)
       - Auth0 credentials (AUTH0_DOMAIN, AUTH0_AUDIENCE)
    4. Update extension/config.js with Auth0 Domain and Client ID
    5. Run: cd server && npm run setup-db (to create the Snowflake table)
    6. Load the extension in Chrome: chrome://extensions → Developer mode → Load unpacked → select extension/ folder
    7. Note the Extension ID from Chrome and update the Auth0 callback URL
  </action>
  <verify>Server starts without errors: cd server && npm start. Extension loads in Chrome without errors.</verify>
  <done>Auth0 and Snowflake configured, extension loaded in Chrome, server running</done>
</task>

## Success Criteria
1. Extension loads in Chrome with popup showing Start/End/Login buttons
2. Auth0 login flow completes and token is stored
3. "Start Session" blocks youtube.com (redirects to blocked.html)
4. Backend receives session start event and writes to Snowflake
5. "End Session" unblocks youtube.com
6. Backend receives session end event and updates Snowflake
7. GET /stats/today returns session data from Snowflake
8. Full round trip is observable and working

## Verification Tooling
Use the `browser-test` skill to automate verification of the success criteria above.

**With agent-browser CLI (preferred):**
```bash
# Load extension into a headed browser
agent-browser --extension ./extension --headed open chrome-extension://<id>/popup.html

# Verify popup UI (criteria 1)
agent-browser snapshot -i   # Should show Start/End/Login buttons
agent-browser screenshot popup-check.png

# Verify blocking (criteria 3)
agent-browser click @<start-btn-ref>
agent-browser open https://youtube.com
agent-browser get url        # Should be chrome-extension://<id>/blocked.html

# Verify unblocking (criteria 5)
agent-browser open chrome-extension://<id>/popup.html
agent-browser click @<end-btn-ref>
agent-browser open https://youtube.com
agent-browser get url        # Should be https://youtube.com

# Verify backend calls (criteria 4, 6)
agent-browser network requests --filter localhost:3000
```

**With Playwright fallback (if agent-browser has socket issues):**
```bash
node .claude/scripts/browser-launch.js &
node .claude/scripts/browser-cmd.js popup
node .claude/scripts/browser-cmd.js screenshot popup-check.png
node .claude/scripts/browser-cmd.js click-role button "Start Work Session"
node .claude/scripts/browser-cmd.js navigate https://youtube.com
node .claude/scripts/browser-cmd.js url   # Should show blocked.html
```

Note: Replace `<id>` with the actual extension ID from `chrome://extensions` or `.browser-state.json`.
