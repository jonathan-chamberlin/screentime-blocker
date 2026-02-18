# Brainrot Blocker Privacy Policy

Last updated: February 18, 2026

Brainrot Blocker is a Chrome extension for focus sessions, website blocking, reward timers, and optional companion app / leaderboard features.

## Data We Process

1. Local extension settings and state (stored in `chrome.storage.local`)
- blocked sites (`rewardSites`)
- allowed paths
- productive mode and productive sites
- productivity-check skip list
- productive apps and blocked apps (companion mode)
- session preferences (work/reward duration, strict mode, companion mode)
- penalty reminder fields (`penaltyType`, `penaltyTarget`, `penaltyAmount`, `paymentMethod`)
- local session state and counters (for example timer state, blocked attempts, reward state, today minutes)
- nuclear block configuration (`nbData`)

2. Browsing context used for core functionality
- active tab URL/domain to determine whether a site should be blocked
- active tab URL/domain to determine whether productive timer should run
- current domain timing for the productivity-check popup

3. Optional account/auth data (only if sign-in is configured and used)
- auth access token stored locally (`access_token`)
- profile data used for leaderboard identity (display name, profile image URL)

4. Optional backend session/config data (only when signed in and API URL is configured)
- session events: start, end, blocked-attempt
- session metrics: minutes completed, ended-early status, blocked-attempt counts
- optional synced settings payload (selected extension configuration keys)
- optional profile payload (`displayName`, `pictureUrl`)

5. Optional companion app data (only when companion mode is enabled and native host is installed)
- foreground desktop process name from native host for productivity/blocking logic
- blocked app process names used locally to request app close actions

## Data We Do Not Collect

- card numbers
- bank account numbers
- payment credentials
- health information
- personal communications content
- precise location data

Penalty features are reminder-only and do not process payments.

## How Data Is Used

1. Provide core extension behavior: block/unblock logic, timer updates, reward flow, strict mode, productivity checks, and settings persistence.
2. Provide optional account/leaderboard functionality when configured.
3. Provide optional companion app behavior for desktop app productivity and blocking.
4. Keep app state consistent across extension UI pages and background service worker.

## Data Sharing

1. We do not sell personal data.
2. We do not share personal data for advertising.
3. If configured, auth/backend providers process data only to operate optional sign-in/API features.

## Retention and Control

1. Local extension data remains on device until cleared by the user or removed with extension data.
2. Settings includes a `Delete All Data` action that clears local extension data and sign-in token; Nuclear Block entries are intentionally preserved by that action.
3. Users can sign out to remove the local auth token and disable account-linked behavior.
4. Users can use extension-only mode without companion app installation.

## Security

We use reasonable technical measures to protect data, but no system is completely secure.

## Contact

For privacy questions, contact: `jonathan.chamberlin+brainrot@gmail.com`
