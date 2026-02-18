# Reviewer Notes

## Overview

Brainrot Blocker is primarily a website focus/session extension. Core behavior works without backend auth and without native host installation.

## Default Test Path (No Extra Install)

1. Open the extension popup.
2. Click `Lock In`.
3. Visit a known blocked site (example: `youtube.com`).
4. Confirm redirect to `blocked.html` and escalating behavior on repeated attempts.
5. Open Settings and verify blocked/productive configuration updates.
6. End session and verify normal browsing resumes.

## Optional Features

`Sign-in / Leaderboard`
- Requires Auth0/backend configuration.
- If not configured, extension remains functional and sign-in UI is non-blocking.

`Companion App Mode`
- Optional toggle in Settings.
- Requires local native host installation.
- Not required for core website-blocking features.

## Security Notes

- Manifest V3 extension.
- No remote JS script execution for extension logic.
- Native messaging is optional and local-only.
- Permissions are scoped to blocking/session functionality described above.
