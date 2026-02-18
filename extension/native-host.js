// Native messaging — connects to the native host for desktop app detection
// Depends on: constants.js (NATIVE_HOST_NAME), storage.js, session-state.js (state)

let nativePort = null;
let currentAppName = null;
let nativeHostAvailable = false;
let browserHasFocus = true;
let companionModeEnabled = false;

function disconnectNativeHost() {
  if (nativePort) {
    try {
      nativePort.disconnect();
    } catch (err) {
      // Ignore disconnect errors.
    }
  }
  nativePort = null;
  nativeHostAvailable = false;
  currentAppName = null;
}

function setCompanionModeEnabled(enabled) {
  companionModeEnabled = !!enabled;

  if (!companionModeEnabled) {
    disconnectNativeHost();
    return;
  }

  if (!nativePort) {
    connectNativeHost();
  }
}

function connectNativeHost() {
  if (!companionModeEnabled) {
    return;
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((msg) => {
      if (msg.type === 'app-focus') {
        currentAppName = msg.processName;
        if (state.sessionActive && !browserHasFocus) {
          // Check if app is blocked first
          processAppUpdate(currentAppName);

          // Then handle productive app logic
          isProductiveApp(currentAppName).then(isProductive => {
            if (isProductive !== state.isOnProductiveSite) {
              updateProductiveState(isProductive);
            }
          });
        }
      } else if (msg.type === 'pong') {
        nativeHostAvailable = true;
      } else if (msg.type === 'appClosed') {
        // Response from closeApp command - could log for debugging
      }
    });

    nativePort.onDisconnect.addListener(() => {
      nativeHostAvailable = false;
      currentAppName = null;
      nativePort = null;
      if (companionModeEnabled) {
        setTimeout(connectNativeHost, 5000);
      }
    });

    nativePort.postMessage({ type: 'ping' });
  } catch (err) {
    nativeHostAvailable = false;
  }
}

async function processAppUpdate(appName) {
  // Use in-memory state — sessionActive/rewardActive are stored under focusState,
  // not as top-level storage keys, so reading them from storage always returns undefined
  if (!state.sessionActive || state.rewardActive) return;

  const result = await getStorage(['blockedApps']);
  const blockedApps = result.blockedApps || [];

  const appNameLower = (appName || '').toLowerCase();
  const blockedApp = blockedApps.find(app => {
    const detects = app.detectProcesses || [app.process];
    return detects.some(p => (p || '').toLowerCase() === appNameLower);
  });
  if (blockedApp && nativePort) {
    const toKill = blockedApp.killProcesses || [blockedApp.process];
    toKill.forEach(proc => {
      nativePort.postMessage({ command: 'closeApp', processName: proc });
    });
    chrome.runtime.sendMessage({ action: 'blockedAppDetected', appName: blockedApp.name });
  }
}

async function isProductiveApp(processName) {
  const result = await getStorage(['productiveApps', 'productiveMode']);
  const mode = result.productiveMode || DEFAULTS.productiveMode;

  // "Always counting" mode: everything is productive (sites + apps)
  if (mode === 'all-except-blocked') return true;

  // Whitelist mode: need native host and a matching process name
  if (!companionModeEnabled || !processName || !nativeHostAvailable) return false;

  const productiveApps = result.productiveApps || DEFAULTS.productiveApps;
  return productiveApps.some(app =>
    app.toLowerCase() === processName.toLowerCase()
  );
}
