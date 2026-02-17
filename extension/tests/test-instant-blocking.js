// Instant blocking and native app detection static checks
// Run with: node extension/tests/test-instant-blocking.js

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`PASS: ${message}`);
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function testSessionStartRedirectsBlockedTabs() {
  const sessionCode = read('session.js');

  const startIdx = sessionCode.indexOf('async function handleStartSession()');
  assert(startIdx >= 0, 'handleStartSession exists');
  if (startIdx < 0) return;

  const blockIdx = sessionCode.indexOf('await blockSites()', startIdx);
  const redirectIdx = sessionCode.indexOf('await redirectBlockedTabs()', startIdx);
  assert(blockIdx >= 0, 'handleStartSession calls blockSites()');
  assert(redirectIdx >= 0, 'handleStartSession calls redirectBlockedTabs()');
  assert(redirectIdx > blockIdx, 'redirectBlockedTabs() is called after blockSites()');
}

function testNativeHostCompanionModeGuards() {
  const nativeHostCode = read('native-host.js');

  assert(
    nativeHostCode.includes('function setCompanionModeEnabled(enabled)'),
    'native-host defines setCompanionModeEnabled'
  );
  assert(
    nativeHostCode.includes('if (!companionModeEnabled)'),
    'native-host checks companionModeEnabled before connecting'
  );
  assert(
    nativeHostCode.includes('if (!companionModeEnabled || !processName || !nativeHostAvailable) return false;'),
    'isProductiveApp enforces companion mode + native host in whitelist mode'
  );
}

console.log('=== Running Instant Blocking and App Detection Tests ===');
testSessionStartRedirectsBlockedTabs();
testNativeHostCompanionModeGuards();
console.log('=== Tests Complete ===');
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
