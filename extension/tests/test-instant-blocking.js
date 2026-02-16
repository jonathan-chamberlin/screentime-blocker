/**
 * Test suite for instant blocking and app detection fixes
 *
 * These tests verify:
 * 1. handleStartSession calls redirectBlockedTabs to immediately redirect open blocked tabs
 * 2. Native host listener calls updateProductiveState when app changes during active session
 */

// Test 1: Verify redirectBlockedTabs is called during session start
function testHandleStartSessionCallsRedirectBlockedTabs() {
  console.log('Test 1: handleStartSession calls redirectBlockedTabs');

  // Read background.js to verify the function call is present
  fetch(chrome.runtime.getURL('background.js'))
    .then(response => response.text())
    .then(code => {
      // Find handleStartSession function
      const handleStartSessionMatch = code.match(/async function handleStartSession\(\)\s*{[\s\S]*?^}/m);
      if (!handleStartSessionMatch) {
        console.error('FAIL: handleStartSession function not found');
        return;
      }

      const functionBody = handleStartSessionMatch[0];

      // Verify blockSites is called
      if (!functionBody.includes('await blockSites()')) {
        console.error('FAIL: blockSites() call not found');
        return;
      }

      // Verify redirectBlockedTabs is called
      if (!functionBody.includes('await redirectBlockedTabs()')) {
        console.error('FAIL: redirectBlockedTabs() call not found');
        return;
      }

      // Verify redirectBlockedTabs is called AFTER blockSites
      const blockSitesIndex = functionBody.indexOf('await blockSites()');
      const redirectBlockedTabsIndex = functionBody.indexOf('await redirectBlockedTabs()');

      if (redirectBlockedTabsIndex <= blockSitesIndex) {
        console.error('FAIL: redirectBlockedTabs() should be called after blockSites()');
        return;
      }

      console.log('PASS: handleStartSession correctly calls redirectBlockedTabs after blockSites');
    })
    .catch(err => {
      console.error('FAIL: Error reading background.js:', err);
    });
}

// Test 2: Verify native host listener updates productive state on app change
function testNativeHostListenerUpdatesProductiveState() {
  console.log('Test 2: Native host listener calls updateProductiveState on app change');

  // Read background.js to verify the listener logic
  fetch(chrome.runtime.getURL('background.js'))
    .then(response => response.text())
    .then(code => {
      // Find the native host message listener
      const listenerMatch = code.match(/nativePort\.onMessage\.addListener\(\(msg\)\s*=>\s*{[\s\S]*?}\s*\);/);
      if (!listenerMatch) {
        console.error('FAIL: Native host message listener not found');
        return;
      }

      const listenerBody = listenerMatch[0];

      // Verify it handles 'app-focus' messages
      if (!listenerBody.includes("msg.type === 'app-focus'")) {
        console.error('FAIL: app-focus message type handler not found');
        return;
      }

      // Verify it stores previous app
      if (!listenerBody.includes('prevApp')) {
        console.error('FAIL: Previous app tracking not found');
        return;
      }

      // Verify it checks session state
      if (!listenerBody.includes('state.sessionActive')) {
        console.error('FAIL: Session active check not found');
        return;
      }

      // Verify it checks browser focus
      if (!listenerBody.includes('browserHasFocus')) {
        console.error('FAIL: Browser focus check not found');
        return;
      }

      // Verify it checks if app changed
      if (!listenerBody.includes('currentAppName !== prevApp')) {
        console.error('FAIL: App change check not found');
        return;
      }

      // Verify it calls isProductiveApp and updateProductiveState
      if (!listenerBody.includes('isProductiveApp')) {
        console.error('FAIL: isProductiveApp call not found');
        return;
      }

      if (!listenerBody.includes('updateProductiveState')) {
        console.error('FAIL: updateProductiveState call not found');
        return;
      }

      console.log('PASS: Native host listener correctly updates productive state on app change');
    })
    .catch(err => {
      console.error('FAIL: Error reading background.js:', err);
    });
}

// Run all tests
console.log('=== Running Instant Blocking and App Detection Tests ===');
testHandleStartSessionCallsRedirectBlockedTabs();
testNativeHostListenerUpdatesProductiveState();
console.log('=== Tests Complete ===');
