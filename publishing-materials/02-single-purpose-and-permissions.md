# Single Purpose And Permissions

## Single Purpose Statement

Brainrot Blocker helps users stay focused by blocking distracting websites during timed sessions, tracking productive time, and unlocking earned break time.

## Permission Justifications

`declarativeNetRequest`
- Creates and updates blocking rules for user-selected sites during sessions, reward mode, and Nuclear Block.

`storage`
- Stores local settings and state such as blocked sites, productive sites, timers, strict mode, and preferences.

`tabs`
- Reads active tab URL to determine whether timer should run and to redirect blocked requests to extension pages.

`alarms`
- Runs background timer ticks and scheduled checks while sessions/reward windows are active.

`identity`
- Optional sign-in for account-linked features such as leaderboard functionality.

`nativeMessaging`
- Optional companion app mode only; communicates with a locally installed native host for desktop app tracking/blocking.

`host_permissions: <all_urls>`
- Required because users can choose any domain to block/allow, and rules must be enforceable across arbitrary websites.
