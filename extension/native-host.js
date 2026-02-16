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
          isProductiveApp(currentAppName).then(isProductive => {
            if (isProductive !== state.isOnProductiveSite) {
              updateProductiveState(isProductive);
            }
          });
        }
      } else if (msg.type === 'pong') {
        nativeHostAvailable = true;
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
