# screentime-blocker

Perfect. Below is a **clean, implementation-ready spec** you can paste directly into Claude Code.

It is structured, scoped tightly for hackathon execution, and optimized for:

* 🏆 Best use of Auth0
* 🏆 Best use of Snowflake

No overengineering. No stretch features. Just a clean, winnable build.

---

# 📄 HACKATHON SPEC — COMMITMENT CONTRACT CHROME EXTENSION

## Project Name

FocusContract (working name)

---

# 1. Overview

Build a Chrome extension that:

* Blocks reward websites during active work sessions
* Uses a configurable work → reward ratio (default 50 → 10)
* Tracks session data in Snowflake
* Uses Auth0 for authentication and cross-device persistence
* Simulates financial penalties for ending sessions early

This is a commitment contract system, not just a blocker.

---

# 2. Architecture

## Frontend

Chrome Extension (Manifest V3)

Responsibilities:

* Timer logic
* Site blocking (full redirect)
* Dashboard UI
* Settings UI
* Auth login trigger
* API communication with backend

## Backend

Node.js + Express server

Responsibilities:

* Auth0 JWT validation
* REST API endpoints
* Writing events to Snowflake
* Querying aggregated stats from Snowflake

## Auth

Use Auth0:

* Google social login
* Email/password fallback
* Anonymous mode (local only, no backend persistence)
* If user logs in, all future events tied to Auth0 user_id

## Database

Snowflake

Tables:

* focus_sessions
* user_daily_stats (optional but recommended)

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
3. event logged to backend:

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

# 4. Site Blocking Logic

User defines:

Productive sites (allow during work)
Reward sites (block during work unless reward minutes available)

Blocking method:

* Use Chrome declarativeNetRequest or webRequest API
* Full redirect to internal extension page:
  blocked.html

Blocked page displays:

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

* Locally if anonymous
* In backend if logged in

---

# 7. Authentication Flow (Auth0)

Use Auth0 SPA flow.

Frontend:

* "Sign In to Sync Data" button
* On success:

  * store access token
  * send token to backend
  * backend validates JWT

Backend:

* Use Auth0 middleware to verify JWT
* Extract user_id from token
* Associate all Snowflake records with user_id

If logged out:

* revert to local-only mode

No merging of anonymous data.

No parent-child logic in MVP.

---

# 8. Snowflake Schema

## Table: focus_sessions

Columns:

* session_id (UUID)
* user_id (string)
* start_timestamp (timestamp)
* end_timestamp (timestamp)
* minutes_completed (int)
* ended_early (boolean)
* penalty_amount (number)
* reward_minutes_earned (int)

---

## Table: user_daily_stats (optional)

* user_id
* date
* total_minutes_worked
* unused_reward_minutes

Alternatively:
Compute aggregates dynamically via query.

---

# 9. Backend API Endpoints

POST /session/start
POST /session/end
GET /stats/today
POST /settings/save
GET /settings

All authenticated endpoints require valid Auth0 JWT.

Anonymous mode:

* no backend calls
* all local

---

# 10. Persistence Rules

If Anonymous:

* Use chrome.storage.local

If Logged In:

* Save settings to backend
* Save sessions to Snowflake
* Stats queried from Snowflake

Reward minutes accumulate indefinitely.
Unused reward minutes persist across days.

---

# 11. Demo Plan (Critical)

Demo Flow:

1. Install extension
2. Log in with Auth0
3. Start session
4. Try opening youtube.com → redirected
5. Complete session
6. Reward minutes granted
7. Show Snowflake dashboard stats updating
8. End session early to show penalty modal
9. Show recorded penalty in Snowflake data

Highlight:

* Identity persistence
* Structured analytics
* Configurable commitment penalty

---

# 12. Out of Scope

* No real payments
* No Stripe
* No crypto
* No leaderboard
* No AI evaluation
* No parent-child for MVP

---

# 13. Non-Negotiable Constraints

* Manifest V3
* Clean UI
* No console errors
* Proper Auth0 token validation
* Proper Snowflake connection pooling

---

END OF SPEC

---

If you want, next I can give you:

* The exact folder structure Claude should generate
* The exact Snowflake SQL to create tables
* Or a step-by-step implementation order so you don’t get overwhelmed

What do you want next: architecture clarity, database setup, or implementation sequence?
