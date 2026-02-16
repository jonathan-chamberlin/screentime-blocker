---
phase: application-detection
plan: 1
type: execute
total_waves: 5
total_tasks: 10
requirements_covered: [REQ-020, REQ-021, REQ-022, REQ-023]
files_modified: [native-host/package.json, native-host/host.js, native-host/com.brainrotblocker.native.json, native-host/install.bat, native-host/uninstall.bat, extension/constants.js, extension/manifest.json, extension/background.js, extension/settings.html, extension/settings.js, extension/install-guide.html, extension/popup.js]
---

# Plan: Application Detection — Plan 1

## Objective
Add desktop application tracking so the work timer counts time spent in productive apps (e.g., VS Code) when the user switches away from Chrome. Requires a native messaging host for Windows, extension integration, and settings UI.

## Context
- Project: Brainrot Blocker — Chrome extension that blocks distracting sites during work sessions
- Phase goals: Track productive desktop app usage, continue/pause timer based on focused app
- Prerequisites: Phases 1-5 complete. Extension has modular architecture with constants.js, storage.js, timer.js, site-utils.js shared utilities.
- Key decisions: Curated app checkboxes + custom process names, both modes support apps, 1-second polling, always-running native host, graceful fallback with warning, badge text "⏸" when paused

## Wave 1 — Native Host Foundation

<task type="auto">
  <name>Create native messaging host script and package</name>
  <files>native-host/package.json, native-host/host.js</files>
  <action>
    Create `native-host/` directory at the project root.

    **native-host/package.json**: Minimal package with name "brainrot-blocker-native-host", no external dependencies needed (we'll use PowerShell for window detection).

    **native-host/host.js**: Node.js script implementing Chrome's native messaging protocol:

    1. **Protocol**: Read 4-byte little-endian length prefix from stdin, then JSON payload. Write same format to stdout.
    2. **Message handling**: On receiving `{ type: 'ping' }`, respond with `{ type: 'pong' }`.
    3. **Polling**: Every 1 second, detect the foreground window's process name using a child_process.execFile call to PowerShell:
       ```
       powershell.exe -NoProfile -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class W{[DllImport(\"user32.dll\")]public static extern IntPtr GetForegroundWindow();[DllImport(\"user32.dll\")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);};' -Language CSharp; $h=[W]::GetForegroundWindow(); $pid=0; [W]::GetWindowThreadProcessId($h,[ref]$pid)|Out-Null; (Get-Process -Id $pid).ProcessName"
       ```
    4. **Output**: Send `{ type: 'app-focus', processName: 'Code' }` (without .exe suffix, as PowerShell's Get-Process returns name without extension).
    5. **Error handling**: If PowerShell fails, log to stderr (Chrome captures this), don't crash. Wrap polling in try/catch.
    6. **Stdin EOF**: When stdin closes (Chrome disconnects), exit cleanly.

    Important: stdin must be set to binary mode. Use `process.stdin.resume()` and read raw buffers. For stdout, write length-prefixed binary.

    Helper functions needed:
    - `sendMessage(obj)` — serialize to JSON, prepend 4-byte LE length, write to stdout
    - `readMessages()` — read from stdin buffer, parse length-prefixed messages
    - `getActiveWindow()` — returns Promise resolving to process name string
  </action>
  <verify>node native-host/host.js (run manually, verify it outputs JSON messages to stdout — note: will hang waiting for stdin in terminal, but should start polling)</verify>
  <done>native-host/host.js exists, implements Chrome native messaging protocol, polls foreground window every 1 second</done>
</task>

<task type="auto">
  <name>Create native host manifest and install/uninstall scripts</name>
  <files>native-host/com.brainrotblocker.native.json, native-host/install.bat, native-host/uninstall.bat</files>
  <action>
    **native-host/com.brainrotblocker.native.json**: Chrome native messaging host manifest:
    ```json
    {
      "name": "com.brainrotblocker.native",
      "description": "Brainrot Blocker - Desktop App Detection",
      "path": "host_wrapper.bat",
      "type": "stdio",
      "allowed_origins": []
    }
    ```
    Note: `allowed_origins` starts empty — the install script will populate it with the actual extension ID. The `path` field must point to a batch wrapper because Chrome on Windows needs a .bat or .exe, not a .js file directly.

    **native-host/host_wrapper.bat**: Simple wrapper that runs the Node.js script:
    ```bat
    @echo off
    node "%~dp0host.js"
    ```

    **native-host/install.bat**: Installation script that:
    1. Prompts user for their Chrome extension ID (displayed on chrome://extensions)
    2. Updates `com.brainrotblocker.native.json` — replaces `allowed_origins` with `["chrome-extension://EXTENSION_ID/"]`
    3. Updates the `path` field to the absolute path of `host_wrapper.bat`
    4. Adds registry key: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.brainrotblocker.native` pointing to the absolute path of `com.brainrotblocker.native.json`
    5. Prints success message

    **native-host/uninstall.bat**: Removes the registry key at `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.brainrotblocker.native` and prints confirmation.
  </action>
  <verify>Check that all 4 files exist and install.bat contains REG ADD command</verify>
  <done>Native host manifest, wrapper bat, install script, and uninstall script all exist with correct content</done>
</task>

## Wave 2 — Extension Constants and Manifest

<task type="auto">
  <name>Add curated apps list and defaults to constants.js</name>
  <files>extension/constants.js</files>
  <action>
    Add to constants.js (after the existing DEFAULTS object):

    1. Add `productiveApps: []` to the DEFAULTS object (after `productiveMode`).

    2. Add a new exported constant `CURATED_APPS` — array of objects with `{ name, process, category }`:

    Development category:
    - Visual Studio Code, Code, Development
    - Visual Studio, devenv, Development
    - JetBrains IDEs, idea64, Development
    - Sublime Text, sublime_text, Development
    - Notepad++, notepad++, Development
    - Windows Terminal, WindowsTerminal, Development
    - Command Prompt, cmd, Development
    - PowerShell, powershell, Development
    - Git Bash, mintty, Development

    Office category:
    - Microsoft Word, WINWORD, Office
    - Microsoft Excel, EXCEL, Office
    - Microsoft PowerPoint, POWERPNT, Office
    - Adobe Acrobat, Acrobat, Office

    Productivity category:
    - Notion, Notion, Productivity
    - Obsidian, Obsidian, Productivity
    - OneNote, ONENOTE, Productivity

    Communication category:
    - Slack, slack, Communication
    - Zoom, Zoom, Communication
    - Microsoft Teams, ms-teams, Communication

    Design category:
    - Figma, Figma, Design

    Note: Process names should NOT include .exe — PowerShell's Get-Process returns names without the extension.

    3. Add constant: `const NATIVE_HOST_NAME = 'com.brainrotblocker.native';`
  </action>
  <verify>Check that constants.js has CURATED_APPS array with 20 entries and NATIVE_HOST_NAME</verify>
  <done>constants.js has productiveApps in DEFAULTS, CURATED_APPS array with ~20 apps, and NATIVE_HOST_NAME constant</done>
</task>

<task type="auto">
  <name>Add nativeMessaging permission to manifest.json</name>
  <files>extension/manifest.json</files>
  <action>
    Add `"nativeMessaging"` to the `permissions` array in manifest.json.

    Current permissions: `["declarativeNetRequest", "storage", "identity", "alarms", "tabs"]`
    New permissions: `["declarativeNetRequest", "storage", "identity", "alarms", "tabs", "nativeMessaging"]`

    Also add `"install-guide.html"` to the `web_accessible_resources` resources array (alongside existing `"blocked.html"` and `"example-leaderboard.csv"`).
  </action>
  <verify>Check manifest.json contains nativeMessaging in permissions</verify>
  <done>manifest.json has nativeMessaging permission and install-guide.html in web_accessible_resources</done>
</task>

## Wave 3 — Background.js Integration

<task type="auto">
  <name>Add native host connection and app focus tracking to background.js</name>
  <files>extension/background.js</files>
  <action>
    Add native messaging host connection management to background.js.

    1. **New state variables** (after line 23, after existing state object):
    ```javascript
    let nativePort = null;
    let currentAppName = null;
    let nativeHostAvailable = false;
    ```

    2. **connectNativeHost() function** (after state variables):
    ```javascript
    function connectNativeHost() {
      try {
        nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        nativePort.onMessage.addListener((msg) => {
          if (msg.type === 'app-focus') {
            currentAppName = msg.processName;
            // If browser doesn't have focus and we're in a session, re-evaluate
            if (state.sessionActive || state.rewardActive) {
              checkCurrentTab();
            }
          } else if (msg.type === 'pong') {
            nativeHostAvailable = true;
          }
        });

        nativePort.onDisconnect.addListener(() => {
          nativeHostAvailable = false;
          currentAppName = null;
          nativePort = null;
          // Retry after 5 seconds
          setTimeout(connectNativeHost, 5000);
        });

        // Ping to verify connection
        nativePort.postMessage({ type: 'ping' });
      } catch (err) {
        nativeHostAvailable = false;
      }
    }
    ```

    3. **Call connectNativeHost()** at the end of the IIFE that loads state (after line 44), so it runs on service worker startup.

    4. **Modify `chrome.windows.onFocusChanged` handler** (lines 136-145):
    Replace the current handler that sets `updateProductiveState(false)` on WINDOW_ID_NONE with:
    ```javascript
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (state.sessionActive || state.rewardActive) {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
          // Browser lost focus — check if current app is productive
          if (state.sessionActive) {
            const isProductive = await isProductiveApp(currentAppName);
            updateProductiveState(isProductive);
          }
          if (state.rewardActive) {
            // Not in browser = not burning reward time on reward sites
            updateRewardState(false);
          }
        } else {
          checkCurrentTab();
        }
      }
    });
    ```

    5. **Add isProductiveApp() helper** (before checkCurrentTab):
    ```javascript
    async function isProductiveApp(processName) {
      if (!processName || !nativeHostAvailable) return false;

      const result = await getStorage(['productiveApps', 'productiveMode']);
      const mode = result.productiveMode || DEFAULTS.productiveMode;

      // In all-except-blocked mode, any desktop app is productive
      if (mode === 'all-except-blocked') return true;

      // In whitelist mode, check against user's productive apps list
      const productiveApps = result.productiveApps || DEFAULTS.productiveApps;
      return productiveApps.some(app =>
        app.toLowerCase() === processName.toLowerCase()
      );
    }
    ```

    6. **Add getNativeHostStatus message handler** — in the `chrome.runtime.onMessage.addListener` block, add:
    ```javascript
    if (message.action === 'getNativeHostStatus') {
      sendResponse({ available: nativeHostAvailable });
      return false;
    }
    ```
  </action>
  <verify>Check that background.js has connectNativeHost function, isProductiveApp function, and modified onFocusChanged handler</verify>
  <done>background.js connects to native host on startup, tracks currentAppName, checks productive app status on window focus change, exposes getNativeHostStatus</done>
</task>

<task type="auto">
  <name>Add badge management to background.js</name>
  <files>extension/background.js</files>
  <action>
    Add badge management to show "⏸" when the timer is paused during an active session.

    1. **Add updateBadge() function** (after updateRewardState):
    ```javascript
    function updateBadge(isActive) {
      if (!isActive && (state.sessionActive || state.rewardActive)) {
        chrome.action.setBadgeText({ text: '⏸' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff4757' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
    ```

    2. **Call updateBadge in updateProductiveState** — add `updateBadge(isProductive);` after `saveState();` (line 114).

    3. **Call updateBadge in updateRewardState** — add `updateBadge(isOnReward);` after `saveState();` (line 122).

    4. **Clear badge when session ends** — in `handleEndSession`, after clearing state and before returning, add:
    ```javascript
    chrome.action.setBadgeText({ text: '' });
    ```

    5. **Clear badge when reward expires** — in the alarm handler where reward expires (around line 400-410), add:
    ```javascript
    chrome.action.setBadgeText({ text: '' });
    ```

    6. **Add nativeHostAvailable to getStatus response** — in the `getStatus` message handler, add `nativeHostAvailable: nativeHostAvailable` and `currentAppName: currentAppName` to the sendResponse object.
  </action>
  <verify>Search background.js for updateBadge function and setBadgeText calls</verify>
  <done>Badge shows "⏸" when timer paused during session, clears when active or session ends. getStatus includes nativeHostAvailable.</done>
</task>

## Wave 4 — Settings UI

<task type="auto">
  <name>Add productive apps section to settings.html</name>
  <files>extension/settings.html</files>
  <action>
    Add a new "Productive Applications" subsection inside the existing "Productive Sites" section (the `div.section[data-lockable]` containing the "Productive Sites" h2, lines 248-271).

    Insert the following AFTER the existing productive sites save button container (after line 270, before the closing `</div>` of that section) but INSIDE the same section div:

    ```html
    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.06); margin: 24px 0;">

    <h3 style="color: #e0e0e0; font-size: 17px; font-weight: 600; margin-bottom: 16px;">Productive Applications</h3>

    <div id="nativeHostWarning" style="display: none; background-color: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #ff6b7a;">
      Application detection is unavailable. <a href="#" id="installInstructions" style="color: #f093fb; text-decoration: underline; margin-left: 4px;">Install the native host</a> to track desktop apps.
    </div>

    <div class="form-group">
      <label>Common productivity apps (check to count as productive)</label>
      <div id="curatedAppsList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;"></div>
    </div>

    <div class="form-group">
      <label for="customApps">Custom process names (one per line)</label>
      <textarea id="customApps" style="min-height: 80px;" placeholder="MyApp&#10;CustomTool"></textarea>
      <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">Find process names in Task Manager &gt; Details tab (without .exe)</small>
    </div>

    <div class="save-button-container">
      <button id="saveProductiveApps">Save</button>
      <span class="save-confirmation" id="productiveAppsConfirmation">Saved!</span>
    </div>
    ```

    Also add these CSS styles in the `<style>` block (before `</style>`):

    ```css
    .app-checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background-color: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .app-checkbox-item:hover {
      background-color: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .app-checkbox-item input[type="checkbox"] {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: #00ff88;
      flex-shrink: 0;
    }

    .app-checkbox-item span {
      font-size: 13px;
      color: #e0e0e0;
      cursor: pointer;
    }

    .app-category-header {
      grid-column: 1 / -1;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      font-weight: 600;
      margin-top: 8px;
    }

    .app-category-header:first-child {
      margin-top: 0;
    }
    ```
  </action>
  <verify>Check settings.html has curatedAppsList div, customApps textarea, and app-checkbox-item CSS</verify>
  <done>settings.html has productive apps subsection with warning banner, checkbox grid container, custom textarea, and save button inside the productive sites section</done>
</task>

<task type="auto">
  <name>Add productive apps logic to settings.js</name>
  <files>extension/settings.js</files>
  <action>
    Add functions to settings.js for loading and saving productive apps.

    1. **Add loadProductiveApps() function** (after loadSettings):
    ```javascript
    async function loadProductiveApps() {
      const result = await getStorage(['productiveApps']);
      const userApps = result.productiveApps || [];

      const grid = document.getElementById('curatedAppsList');
      grid.innerHTML = '';

      // Group CURATED_APPS by category
      const categories = [];
      const seen = new Set();
      CURATED_APPS.forEach(app => {
        if (!seen.has(app.category)) {
          seen.add(app.category);
          categories.push(app.category);
        }
      });

      categories.forEach(category => {
        const header = document.createElement('div');
        header.className = 'app-category-header';
        header.textContent = category;
        grid.appendChild(header);

        CURATED_APPS.filter(a => a.category === category).forEach(app => {
          const item = document.createElement('div');
          item.className = 'app-checkbox-item';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = 'app-' + app.process;
          checkbox.checked = userApps.includes(app.process);

          const label = document.createElement('span');
          label.textContent = app.name;

          item.appendChild(checkbox);
          item.appendChild(label);
          item.addEventListener('click', (e) => {
            if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
          });
          grid.appendChild(item);
        });
      });

      // Load custom apps (those not in curated list)
      const curatedProcessNames = CURATED_APPS.map(a => a.process);
      const customApps = userApps.filter(app => !curatedProcessNames.includes(app));
      document.getElementById('customApps').value = customApps.join('\n');

      // Check native host availability
      chrome.runtime.sendMessage({ action: 'getNativeHostStatus' }, (response) => {
        if (!response || !response.available) {
          document.getElementById('nativeHostWarning').style.display = 'block';
        }
      });
    }
    ```

    2. **Add saveProductiveApps() function** (after loadProductiveApps):
    ```javascript
    async function saveProductiveApps() {
      const apps = [];

      // Collect checked curated apps
      CURATED_APPS.forEach(app => {
        const checkbox = document.getElementById('app-' + app.process);
        if (checkbox && checkbox.checked) {
          apps.push(app.process);
        }
      });

      // Add custom apps
      const customText = document.getElementById('customApps').value;
      const customApps = customText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      apps.push(...customApps);

      await setStorage({ productiveApps: apps });
      showConfirmation('productiveAppsConfirmation');
    }
    ```

    3. **Wire up in DOMContentLoaded** — add these lines inside the existing DOMContentLoaded handler:
    - Call `await loadProductiveApps();` after `await loadSettings();`
    - Add event listener: `document.getElementById('saveProductiveApps').addEventListener('click', saveProductiveApps);`
    - Add install instructions link handler:
      ```javascript
      document.getElementById('installInstructions').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('install-guide.html') });
      });
      ```
  </action>
  <verify>Check settings.js has loadProductiveApps and saveProductiveApps functions</verify>
  <done>settings.js renders curated app checkboxes grouped by category, loads/saves productive apps from storage, checks native host availability</done>
</task>

## Wave 5 — Install Guide and Polish

<task type="auto">
  <name>Create install guide page</name>
  <files>extension/install-guide.html</files>
  <action>
    Create `extension/install-guide.html` — a simple page with installation instructions for the native messaging host. Use the same styling as settings.html (dark theme, Space Grotesk font).

    Content:
    - Title: "Enable App Detection — Brainrot Blocker"
    - Explanation: "To track time in desktop apps (VS Code, Word, etc.), install the native messaging host."
    - Prerequisites: Node.js must be installed
    - Steps:
      1. Open the `native-host` folder in the extension directory
      2. Double-click `install.bat`
      3. When prompted, paste your extension ID (found on chrome://extensions with Developer mode on)
      4. Restart Chrome
      5. The warning in Settings should disappear
    - Troubleshooting section:
      - "Make sure Node.js is installed and available in PATH"
      - "Check that the extension ID matches exactly"
      - "Try running install.bat as Administrator if permission denied"
    - Link back to settings page

    Keep it simple — no JavaScript needed, just static HTML with inline styles matching the dark theme.
  </action>
  <verify>Check that install-guide.html exists</verify>
  <done>install-guide.html exists with clear step-by-step native host installation instructions</done>
</task>

<task type="auto">
  <name>Add app tracking info to popup status display</name>
  <files>extension/popup.js</files>
  <action>
    Minor enhancement to popup.js to show when the timer is tracking a desktop app vs browser tab.

    Read popup.js first to understand the current renderTimer function.

    In the getStatus response handling, the background now sends `nativeHostAvailable` and `currentAppName`.

    Find where the timer label shows "paused" or productivity status text. If there's a label that says something like "on productive site" or shows productivity status, enhance it:
    - When `status.isOnProductiveSite` is true AND the browser doesn't have focus (we can check if `status.currentAppName` is set), show the app name: e.g., "Tracking: Code"
    - When paused, the existing behavior is fine

    This is a MINIMAL change — just add the app name to the existing status display if available. Don't restructure the popup. If there's no natural place for it, skip this enhancement and just ensure the badge (from Wave 3) is the indicator.
  </action>
  <verify>Check popup.js for any references to currentAppName or nativeHostAvailable</verify>
  <done>popup.js shows desktop app name when tracking a productive app (if natural place exists), or badge is the sole indicator</done>
</task>

## Success Criteria
1. Native host starts, connects to extension, and reports foreground window process name
2. In whitelist mode: timer counts when VS Code is focused (if VS Code is in productive apps list)
3. In all-except-blocked mode: timer counts when any desktop app is focused
4. Timer pauses with "⏸" badge when switching to non-productive app (whitelist mode)
5. Settings page shows curated apps with checkboxes, saves/loads correctly
6. Warning banner shown when native host not installed
7. Extension works normally (no errors) when native host is absent
8. Install/uninstall scripts work correctly
