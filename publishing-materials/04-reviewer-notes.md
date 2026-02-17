# Reviewer Notes

## Overview

Brainrot Blocker is a focus/session extension. Its default mode is extension-only website blocking.

## Default Test Path (No Extra Install)

1. Open popup.
2. Click `Lock In`.
3. Navigate to a blocked site (example: youtube.com).
4. Confirm redirect to `blocked.html`.
5. Open Settings and adjust blocked/productive lists.

## Optional Features

`Sign-in / Leaderboard`
- Requires valid Auth0 + backend config.
- If not configured, extension remains functional and sign-in is disabled gracefully.

`Companion App Mode`
- Optional toggle in Settings.
- Requires user-installed native host on local device.
- Not required for core website-blocking behavior.

## Security Notes

- No remote JavaScript execution is used.
- Release packaging uses a sanitized `config.js` by default.
- Core permissions are used only for blocking/session functionality.

