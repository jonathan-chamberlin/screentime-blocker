Began coding 2/14/26 11:15am
Finished coding 2/14/26 8:45pm

# 📄 HACKATHON SPEC — GUILT-TRIPPY FOCUS BLOCKER WITH LEADERBOARD

## Project Name

Brainrot Blocker

---

# 1. Overview

Build a Chrome extension that:

* Blocks reward websites during active work sessions
* Uses a configurable work → reward ratio (default 50 → 10)
* Escalates shame/guilt with 10 levels of GIF screens when you try to cheat
* Tracks session data in a simple JSON file (no cloud database)
* Uses Auth0 for leaderboard identity (not cross-device sync)
* Shows competitive leaderboard of who's working the most
* Simulates financial penalties for ending sessions early

This is a hilariously guilt-trippy focus tool with social competition, not a serious commitment contract.

---

# 2. Architecture

## Frontend

Chrome Extension (Manifest V3)

Responsibilities:

* Timer logic
* Site blocking (full redirect)
* Dashboard UI
* Settings UI
* Shame escalation (10 GIF screens)
* Auth login trigger
* API communication with backend

## Backend

Node.js + Express server

Responsibilities:

* Auth0 JWT validation
* REST API endpoints
* Writing events to JSON file (server/data/db.json)
* Querying aggregated stats from JSON file
* Leaderboard computation

## Auth

Use Auth0:

* Google social login
* Email/password fallback
* Anonymous mode (local only, no backend persistence, no leaderboard)
* If user logs in, events tied to Auth0 user_id for leaderboard only

## Database

Simple JSON file: server/data/db.json

Structure:

```json
{
  "sessions": [],
  "profiles": [],
  "blockedAttempts": []
}
```

No Snowflake. No cloud database. Just a local JSON file.

---

# 3. Core Features

## 3.1 Session Logic

Default configuration:

* Work: 50 minutes
* Reward: 10 minutes

Users can edit these values in settings.

### Session Flow

When user clicks "Start Work Session":

1. reward sites are immediately blocked
2. timer begins counting upward
3. event logged to backend (if logged in):

   * type: session_started
   * timestamp
   * user_id (if logged in)

When user completes full work duration:

* reward_minutes += configured reward
* event logged:

  * session_completed
  * minutes_completed
  * reward_minutes_earned

If user clicks "End Session Early":

* show confirmation modal:
  "If you end early, you will give $X to {selected_target} (charged to {payment_method})."
* if confirmed:

  * session ends
  * event logged:

    * session_ended_early
    * minutes_completed
    * penalty_amount
  * reward not granted

No real payment integration.

---

## 3.2 Shame Mode (10-Level Escalation)

When user tries to visit a blocked site during a work session:

* First visit: gentle reminder GIF ("You got this!")
* 2nd–5th visits: progressively more disappointed/judgmental GIFs
* 6th–9th visits: hilariously over-the-top guilt-trip GIFs
* 10th+ visit: maximum shame GIF (e.g., "Really? AGAIN?")

Each blocked attempt is logged via POST /session/blocked-attempt

GIFs rotate through 10 fixed levels based on attempt count during current session.

---

## 3.3 Leaderboard

Displays competitive stats:

* Top 10 users by total work minutes this week
* Top 10 users by completion streak
* Top 10 users by fewest blocked attempts

Pulled from GET /leaderboard endpoint.

Auth0 identity required to appear on leaderboard (anonymous users can view but not participate).

Leaderboard is purely for competition, not cross-device sync.

---

# 4. Site Blocking Logic

User defines:

Productive sites (allow during work)
Reward sites (block during work unless reward minutes available)

Blocking method:

* Use Chrome declarativeNetRequest API
* Full redirect to internal extension page:
  blocked.html

Blocked page displays:

* Shame GIF (level 1–10 based on attempt count)
* "You're currently in a work session."
* "Complete your session to unlock this site."
* Show remaining work time

During reward time:

* reward sites temporarily unblocked
* reward timer decrements

If reward minutes reach zero:

* reward sites blocked again

---

# 5. Dashboard UI (Popup UI)

Main Popup Layout:

Large Text:
"You've worked X minutes this session."

Smaller Text:

* "Today: Y work minutes"
* "Unused reward minutes: Z"
* "Work 50 minutes → Earn 10 reward minutes"

Buttons:

* Start Work Session
* End Session Early (only visible during session)
* Use Reward Minutes (if available)
* View Leaderboard
* Settings
* Sign In / Log Out

Dashboard pulls:

* today's total minutes
* unused reward minutes
  from backend if logged in
  from local storage if anonymous

---

# 6. Settings Page

Sections:

## 6.1 Work / Reward Ratio

Inputs:

* Work Minutes (default 50)
* Reward Minutes (default 10)
  Save button

---

## 6.2 Reward Sites

Text area:

* One domain per line
  Example:
  youtube.com
  instagram.com
  pinterest.com

Save button

---

## 6.3 Productive Sites

Text area:
Example:
canvas.instructure.com
docs.google.com
notion.so

Save button

---

## 6.4 Penalty Configuration (Simulated Only)

Radio Select:
( ) Charity
( ) Anti-Charity

If Charity selected:

* Text input: Charity Name
* Number input: Donation Amount per failed session

If Anti-Charity selected:

* Text input: Anti-Charity Name
* Number input: Donation Amount per failed session

---

## 6.5 Payment Method (Simulated)

Text input:

* Payment method label (e.g., "Visa ending in 4242")

Save button

No real payment processing.

All values stored:

* Locally (chrome.storage.local)
* Synced to backend only if logged in (for leaderboard profile display)

---

# 7. Authentication Flow (Auth0)

Use Auth0 SPA flow.

Frontend:

* "Sign In to Join Leaderboard" button
* On success:

  * store access token
  * send token to backend
  * backend validates JWT
  * POST /auth/profile to register user in leaderboard

Backend:

* Use Auth0 middleware to verify JWT
* Extract user_id from token
* Associate all JSON records with user_id

If logged out:

* revert to local-only mode
* cannot appear on leaderboard

No merging of anonymous data.

No parent-child logic in MVP.

---

# 8. Backend API Endpoints

GET /health
POST /session/start
POST /session/end
POST /session/blocked-attempt
GET /stats/today
GET /leaderboard
POST /auth/profile

All authenticated endpoints require valid Auth0 JWT.

Anonymous mode:

* no backend calls
* all local
* cannot access leaderboard

---

# 9. Persistence Rules

If Anonymous:

* Use chrome.storage.local
* No leaderboard participation

If Logged In:

* Save sessions to JSON file (server/data/db.json)
* Save blocked attempts to JSON file
* Stats queried from JSON file
* Leaderboard computed from JSON file

Reward minutes accumulate indefinitely.
Unused reward minutes persist across days.

---

# 10. Demo Plan (Critical)

Demo Flow:

1. Install extension
2. Log in with Auth0
3. Start session
4. Try opening youtube.com → redirected to shame GIF #1
5. Try 5 more times → show escalating shame GIFs (levels 2-6)
6. Complete session
7. Reward minutes granted
8. Show leaderboard with competitive stats
9. End session early to show penalty modal
10. Demonstrate 10th blocked attempt to show maximum shame GIF

Highlight:

* Shame escalation (10 GIF levels)
* Leaderboard competition
* Configurable commitment penalty
* Clean UI with timer and rewards

---

# 11. Out of Scope

* No real payments
* No Stripe
* No crypto
* No AI evaluation
* No parent-child for MVP
* No cross-device sync (Auth0 is only for leaderboard identity)

---

# 12. Non-Negotiable Constraints

* Manifest V3
* Clean UI
* No console errors
* Proper Auth0 token validation
* Simple JSON file for persistence (no cloud database)

---

END OF SPEC

---

## Ways to Improve

* Once the work minutes threshold is reached, it takes 5-10 seconds for the UI to update and allow you to burn reward minutes. The reward grant check runs on a 15-second alarm cycle, so there's a noticeable delay between crossing the threshold and seeing the confetti/burn button enable.
* Make the leaderboard live — currently uses static CSV test data. Wire it up to the backend API so it pulls real user stats from the JSON database.
