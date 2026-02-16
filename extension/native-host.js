// Native messaging — connects to the native host for desktop app detection
// Depends on: constants.js (NATIVE_HOST_NAME), storage.js, session-state.js (state)

let nativePort = null;
let currentAppName = null;
let nativeHostAvailable = false;
let browserHasFocus = true;

function connectNativeHost() {
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
      setTimeout(connectNativeHost, 5000);
    });

    nativePort.postMessage({ type: 'ping' });
  } catch (err) {
    nativeHostAvailable = false;
  }
}

async function processAppUpdate(appName) {
  const result = await getStorage(['blockedApps', 'sessionActive', 'rewardActive']);
  const blockedApps = result.blockedApps || [];

  // During work session: close blocked apps
  if (result.sessionActive && !result.rewardActive) {
    const blockedApp = blockedApps.find(app => app.process === appName);
    if (blockedApp) {
      // Send closeApp command to native host
      if (nativePort) {
        nativePort.postMessage({
          command: 'closeApp',
          processName: appName
        });
      }

      // Trigger shame redirect in browser
      chrome.runtime.sendMessage({ action: 'blockedAppDetected', appName: blockedApp.name });
    }
  }
}

async function isProductiveApp(processName) {
  const result = await getStorage(['productiveApps', 'productiveMode']);
  const mode = result.productiveMode || DEFAULTS.productiveMode;

  // "Always counting" mode: everything is productive (sites + apps)
  if (mode === 'all-except-blocked') return true;

  // Whitelist mode: need native host and a matching process name
  if (!processName || !nativeHostAvailable) return false;

  const productiveApps = result.productiveApps || DEFAULTS.productiveApps;
  return productiveApps.some(app =>
    app.toLowerCase() === processName.toLowerCase()
  );
}
