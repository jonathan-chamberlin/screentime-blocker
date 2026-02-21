// Tests for productivity check feature
// Run with: node extension/tests/test-productivity-check.js

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

function test(description, fn) {
  console.log(`\n${description}`);
  fn();
}

// Test 1: Content script file exists and is valid JavaScript
test('Content script file exists and is valid JavaScript', () => {
  const scriptPath = path.join(__dirname, '..', 'productivity-check.js');
  assert(fs.existsSync(scriptPath), 'productivity-check.js exists');

  const content = fs.readFileSync(scriptPath, 'utf8');
  assert(content.includes('THRESHOLD_MS'), 'Contains THRESHOLD_MS constant');
  assert(content.includes('showProductivityCheck'), 'Contains showProductivityCheck function');
  assert(content.includes('addToBlockedSites'), 'Contains addToBlockedSites message action');
  assert(content.includes('Are you really working'), 'Contains productivity check message');

  // Check for valid JavaScript (basic check)
  try {
    new Function(content);
    assert(true, 'JavaScript syntax is valid');
  } catch (err) {
    assert(false, `JavaScript syntax error: ${err.message}`);
  }
});

// Test 2: Manifest.json has content_scripts entry
test('Manifest.json has content_scripts entry', () => {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifest.content_scripts, 'content_scripts section exists');
  assert(Array.isArray(manifest.content_scripts), 'content_scripts is an array');
  assert(manifest.content_scripts.length > 0, 'content_scripts has at least one entry');

  const contentScript = manifest.content_scripts[0];
  assert(contentScript.matches.includes('<all_urls>'), 'content_scripts matches all URLs');
  assert(contentScript.js.includes('productivity-check.js'), 'content_scripts includes productivity-check.js');
  assert(contentScript.run_at === 'document_idle', 'content_scripts runs at document_idle');
});

// Test 3: Background.js has addToBlockedSites handler
test('Background.js has addToBlockedSites message handler', () => {
  const backgroundPath = path.join(__dirname, '..', 'background.js');
  assert(fs.existsSync(backgroundPath), 'background.js exists');

  const content = fs.readFileSync(backgroundPath, 'utf8');
  assert(content.includes('addToBlockedSites:'), 'Contains addToBlockedSites handler');
  assert(content.includes('breakLists'), 'Handler references breakLists');
  assert(content.includes('evaluateScheduler()'), 'Handler calls evaluateScheduler()');
  assert(content.includes('redirectBlockedTabs()'), 'Handler calls redirectBlockedTabs()');
});

// Test 4: Content script timer configuration
test('Content script has correct timer configuration', () => {
  const scriptPath = path.join(__dirname, '..', 'productivity-check.js');
  const content = fs.readFileSync(scriptPath, 'utf8');

  assert(content.includes('PRODUCTIVITY_CHECK_MINUTES * 60 * 1000'), 'THRESHOLD_MS uses PRODUCTIVITY_CHECK_MINUTES');
  assert(content.includes('setInterval(checkTime, 30000)'), 'Checks every 30 seconds');
  assert(content.includes('setTimeout(checkTime, THRESHOLD_MS)'), 'Initial check at threshold time');
});

// Test 5: Modal UI elements
test('Modal UI has required elements', () => {
  const scriptPath = path.join(__dirname, '..', 'productivity-check.js');
  const content = fs.readFileSync(scriptPath, 'utf8');

  assert(content.includes('brainrot-yes-working'), 'Has "Yes, I\'m working" button');
  assert(content.includes('brainrot-not-working'), 'Has "No, block this site" button');
  assert(content.includes('brainrot-modal-backdrop'), 'Has modal backdrop');
  assert(content.includes('brainrot-modal'), 'Has modal container');
  assert(content.includes('z-index: 2147483647'), 'Modal has maximum z-index');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(50));

process.exit(testsFailed > 0 ? 1 : 0);
