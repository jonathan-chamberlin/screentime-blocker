# Project: FocusContract

## Vision
A Chrome extension commitment contract system that blocks reward websites during active work sessions, uses a configurable work-to-reward ratio, tracks session data in Snowflake, and uses Auth0 for authentication and cross-device persistence. Simulates financial penalties for ending sessions early to create real commitment accountability.

## Target Users
Students and knowledge workers who want to enforce focus time by blocking distracting websites and earning reward browsing time through completed work sessions.

## Tech Stack
- **Frontend**: Chrome Extension (Manifest V3)
- **Backend**: Node.js + Express
- **Database**: Snowflake
- **Auth**: Auth0 (Google social login + email/password)
- **APIs**: Chrome declarativeNetRequest, chrome.storage.local
- **Other**: JWT validation middleware

## Constraints
- Hackathon timeline — speed is critical
- Manifest V3 only (no Manifest V2)
- No real payment processing
- No console errors in production
- Clean, demo-ready UI
- Proper Auth0 token validation
- Proper Snowflake connection pooling

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Blocking method | declarativeNetRequest | MV3 compliant, reliable |
| Anonymous mode | chrome.storage.local | No backend needed for anon users |
| Penalty system | Simulated only | No Stripe/payment integration for MVP |
| Stats computation | Dynamic queries | Avoid maintaining materialized view table |

## Out of Scope
- No real payments / Stripe / crypto
- No leaderboard
- No AI evaluation
- No parent-child logic for MVP
- No merging of anonymous data on login
