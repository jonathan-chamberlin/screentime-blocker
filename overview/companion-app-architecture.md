# Companion App Architecture (v1)

## Goals

1. Extension-only mode works out of the box for website blocking.
2. Companion App mode is optional and enables desktop app tracking/blocking.
3. Cloud config sync keeps extension + companion app aligned.

## Current implementation status

- Extension-only default: `companionMode = off`.
- Optional companion toggle in settings.
- Backend sync endpoints:
  - `GET /config`
  - `PUT /config`
- Extension sync actions:
  - `syncSettingsToBackend`
  - `pullSettingsFromBackend`

## Data contract (`settings` payload)

The extension stores and syncs this shared config object:

- `rewardSites`
- `allowedPaths`
- `productiveMode`
- `productiveSites`
- `productiveApps`
- `blockedApps`
- `strictMode`
- `penaltyType`
- `penaltyTarget`
- `penaltyAmount`
- `paymentMethod`
- `workMinutes`
- `rewardMinutes`
- `companionMode`

## Runtime model

- Extension-only:
  - Website blocking and timers run in Chrome only.
  - No native host connection attempt.
- Companion mode:
  - Extension attempts native host connection.
  - Foreground desktop app events are used for productive/app-block checks.

## Companion app (next build target)

1. Package a desktop app installer (Windows first).
2. App authenticates user (or uses short-lived device token from backend).
3. App polls `GET /config` and applies policy locally.
4. App reports local app focus/blocked events to extension via native messaging.
5. Optional: app can report events directly to backend for analytics continuity.

