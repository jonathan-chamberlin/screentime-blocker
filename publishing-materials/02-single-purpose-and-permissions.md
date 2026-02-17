# Single Purpose And Permissions

## Single Purpose Statement

Brainrot Blocker is a productivity extension that helps users reduce distraction by blocking selected websites during focus sessions, tracking session progress, and unlocking earned break time.

## Permission Justifications

`declarativeNetRequest`
- Used to block user-selected distracting domains during focus sessions and unblock them during break mode.

`storage`
- Stores settings and local state such as blocked sites, focus timers, and user preferences.

`tabs`
- Reads active tab URL to determine productivity state and redirect blocked pages during active sessions.

`alarms`
- Runs background timer updates and reward checks while sessions are active.

`identity`
- Optional sign-in flow for leaderboard and cloud sync features.

`nativeMessaging`
- Optional companion mode only. Allows communication with a locally installed native host for desktop app tracking/blocking.

`host_permissions: <all_urls>`
- Required because users can choose any domain to block or allow. Rules are applied only to user-configured targets.

