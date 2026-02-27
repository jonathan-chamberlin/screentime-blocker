---
phase: application-blocking
plan: 1
type: execute
total_waves: 3
total_tasks: 5
requirements_covered: []
files_modified: [native-host/brainrot-native-host.js, extension/native-host.js, extension/background.js, extension/settings.html, extension/settings.js]
---

# Plan: Application Blocking — Plan 1

## Objective
Enable blocking desktop applications (not just time tracking) so apps like Steam can be used as reward apps during break time, with immediate closure + shame redirect when accessed during work sessions.

## Context
- **Project**: Brainrot Blocker with native messaging host for desktop app detection
- **Phase goals**: Block apps by closing them during work sessions; allow during reward burn
- **Prerequisites**: Phase 6 (application-detection) complete with native host detecting focused apps
- **Key decisions**:
  - Close app immediately when detected (option 1)
  - Show shame page in browser after closure
  - Integrate blocked/productive toggle in existing settings UI
  - Steam is the primary use case for reward app

## Wave 1 — Native Host Blocking

<task type="auto">
  <name>Add application closing logic to native host</name>
  <files>native-host/brainrot-native-host.js</files>
  <action>
Add a new command handler `closeApp` that terminates a process by name:

```javascript
case 'closeApp':
  const processName = message.processName;
  // Use child_process.exec to run taskkill on Windows
  exec(`taskkill /IM "${processName}.exe" /F`, (error, stdout, stderr) => {
    sendMessage({
      command: 'appClosed',
      success: !error,
      processName: processName,
      error: error ? error.message : null
    });
  });
  break;
```

Add proper error handling for:
- Process not found (non-fatal)
- Permission denied (notify extension)
- Invalid process name (validation)

Import `exec` from `child_process` module at top of file.
  </action>
  <verify>node native-host/brainrot-native-host.js (manual test with sample closeApp message)</verify>
  <done>Native host can receive closeApp command and successfully terminate processes via taskkill</done>
</task>

## Wave 2 — Extension Blocking Logic

<task type="auto">
  <name>Add blocked apps storage and detection in native-host.js</name>
  <files>extension/native-host.js</files>
  <action>
Add `blockedApps` to storage alongside productive apps.

Modify `processAppUpdate()` function to check if current app is in blocked apps list during active session:

```javascript
async function processAppUpdate(appName) {
  const result = await getStorage(['blockedApps', 'sessionActive', 'rewardActive']);
  const blockedApps = result.blockedApps || [];

  // During work session: close blocked apps
  if (result.sessionActive && !result.rewardActive) {
    const blockedApp = blockedApps.find(app => app.process === appName);
    if (blockedApp) {
      // Send closeApp command to native host
      nativePort.postMessage({
        command: 'closeApp',
        processName: appName
      });

      // Trigger shame redirect in browser
      chrome.runtime.sendMessage({ action: 'blockedAppDetected', appName: blockedApp.name });
    }
  }

  // Existing productive app logic remains unchanged
  // ...
}
```

Add `blockedAppDetected` to message handlers in background.js (Wave 2 task).
  </action>
  <verify>grep "blockedApps" extension/native-host.js</verify>
  <done>Native host module checks blocked apps during sessions and sends close commands</done>
</task>

<task type="auto">
  <name>Add blocked app message handler in background.js</name>
  <files>extension/background.js</files>
  <action>
Add new message handler to messageHandlers object:

```javascript
blockedAppDetected: (msg, sender, sendResponse) => {
  if (state.sessionActive) {
    state.blockedAttempts++;
    saveState();

    // Redirect active tab to blocked page
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, {
          url: chrome.runtime.getURL('blocked.html?app=' + encodeURIComponent(msg.appName))
        });
      }
    });

    notifyBackend('blocked-attempt', { session_id: state.sessionId, app: msg.appName });
  }
  sendResponse({ success: true });
  return false;
}
```

This increments blocked attempts counter and redirects to shame page with app name.
  </action>
  <verify>grep "blockedAppDetected" extension/background.js</verify>
  <done>Background script handles blocked app detection with shame redirect</done>
</task>

## Wave 3 — Settings UI

<task type="auto">
  <name>Add blocked apps UI section to settings page</name>
  <files>extension/settings.html, extension/settings.js</files>
  <action>
**HTML** (add after productive apps section):
```html
<div class="section" id="blocked-apps-section" data-lockable>
  <h2>Blocked Applications</h2>
  <p class="section-description">Apps that will be closed during work sessions (accessible during breaks)</p>

  <div id="blocked-apps-list" class="apps-list">
    <!-- Dynamically populated with checkboxes like productive apps -->
  </div>

  <div class="custom-app">
    <input type="text" id="custom-blocked-app-name" placeholder="App name (e.g., Steam)">
    <input type="text" id="custom-blocked-app-process" placeholder="Process name (e.g., steam)">
    <button id="add-blocked-app">Add Blocked App</button>
  </div>

  <button class="save-btn" data-setting="blockedApps">Save Blocked Apps</button>
</div>
```

**JS** (settings.js):
- Add `loadBlockedApps()` function similar to `loadProductiveApps()`
- Populate checkboxes for common apps (Steam, Epic Games, Discord, etc.)
- Add event listener for "Add Blocked App" button
- Save blockedApps to chrome.storage on save button click
- Lock section during active sessions (use existing data-lockable logic)

Default blocked apps for checkboxes:
```javascript
{ name: 'Steam', process: 'steam', checked: true },
{ name: 'Epic Games Launcher', process: 'EpicGamesLauncher', checked: false },
{ name: 'Discord', process: 'Discord', checked: false },
{ name: 'Minecraft', process: 'javaw', checked: false },
```
  </action>
  <verify>Open extension/settings.html in Chrome, verify blocked apps section appears and saves correctly</verify>
  <done>Settings page has blocked apps section with checkboxes, custom app input, and save functionality</done>
</task>

<task type="auto">
  <name>Update blocked.html to show app blocking message</name>
  <files>extension/blocked.js</files>
  <action>
Check URL parameters for `?app=` query string.

If present, modify the blocked page message to indicate an app was closed:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const blockedApp = urlParams.get('app');

if (blockedApp) {
  // Update message to show app blocking instead of site blocking
  const messageElement = document.querySelector('.blocked-message');
  messageElement.textContent = `${blockedApp} was closed. Focus on your work!`;
}
```

Otherwise, use existing site blocking message logic.
  </action>
  <verify>Load blocked.html?app=Steam in Chrome, verify app name appears in message</verify>
  <done>Blocked page shows custom message when app is closed instead of site</done>
</task>

## Success Criteria
- Native host can close processes via taskkill command
- Extension detects when user opens a blocked app during work session
- Blocked app is immediately closed
- Browser redirects to shame page with app-specific message
- Settings UI allows marking apps as blocked with checkboxes and custom input
- Steam can be marked as blocked, closes when opened during work session
- Blocked apps are accessible during reward burn (no closing)
- Graceful fallback when native host unavailable (apps not blocked, only browser-based blocking works)
