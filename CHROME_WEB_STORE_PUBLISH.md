# Chrome Web Store Publish Guide

This repo is now set up to package the extension from `extension/` directly.

## 1) Prep release config

1. Open `extension/manifest.json` and bump `version` (must be higher than previous upload).
2. Create `extension/config.js` for production leaderboard/auth (optional):

```js
window.CONFIG = {
  AUTH0_DOMAIN: "YOUR_AUTH0_DOMAIN",
  AUTH0_CLIENT_ID: "YOUR_AUTH0_CLIENT_ID",
  AUTH0_AUDIENCE: "YOUR_AUTH0_AUDIENCE",
  API_BASE_URL: "https://YOUR_API_DOMAIN",
};
```

If you skip `config.js`, extension still works with leaderboard auth disabled.

## 2) Build upload zip

Run from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1
```

Output zip is created in `dist/`.

## 3) Create store listing

Open: `https://chrome.google.com/webstore/devconsole`

1. Click **New item**.
2. Upload `dist/brainrot-blocker-v<version>.zip`.
3. Fill listing assets:
   - App name: `Brainrot Blocker`
   - Short description: site blocking + timed focus sessions + reward minutes
   - Detailed description: explain blocking behavior, productivity checks, optional leaderboard sign-in
   - Icons/screenshots: use assets from `extension/` and `screenshots_for_readme/`

## 4) Complete privacy section (important)

Because this extension can authenticate users and send session stats to your backend, provide:

1. A public privacy policy URL.
2. Accurate data disclosures in CWS form:
   - Authentication data (if leaderboard enabled)
   - Usage/activity data (focused minutes, blocked attempts)
3. Data purpose: core functionality + optional leaderboard.
4. Confirm no sale of user data.

## 5) Permission justifications to paste into CWS

- `declarativeNetRequest`: blocks configured distracting domains during focus sessions.
- `storage`: saves local settings, timers, and user preferences.
- `tabs`: checks active tabs to run/pause timers and redirect blocked pages.
- `alarms`: updates session timers in background.
- `identity`: optional Auth0 sign-in for leaderboard profile.
- `nativeMessaging`: optional desktop app detection via user-installed native host.
- `host_permissions (<all_urls>)`: needed because users can choose any site to block/allow.

## 6) Review-safe checks before submit

1. No placeholder/dev naming in manifest.
2. Version bumped.
3. Backend endpoints are production URLs (if leaderboard enabled).
4. Privacy policy URL is live and matches actual behavior.
5. Test install from the exact zip you uploaded.

