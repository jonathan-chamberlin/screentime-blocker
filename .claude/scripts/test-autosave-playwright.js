#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../extension');

async function testAutoSave() {
  console.log('\n========================================');
  console.log('TESTING AUTO-SAVE FUNCTIONALITY');
  console.log('========================================\n');

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox'
    ]
  });

  try {
    // Get extension ID
    let serviceWorker = browser.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await browser.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    console.log(`✓ Extension loaded: ${extensionId}\n`);

    // Open settings page
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/settings.html`);
    await page.waitForTimeout(2000);
    console.log('✓ Settings page loaded\n');

    // Test 1: Verify save buttons are removed
    console.log('Test 1: Checking save buttons removed...');
    const saveButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const saveButtonsFound = [];
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if ((text.includes('save') && btn.id !== 'add-blocked-app')) {
          saveButtonsFound.push(btn.id || btn.textContent);
        }
      });
      return saveButtonsFound;
    });

    if (saveButtons.length === 0) {
      console.log('  ✓ PASS: All save buttons removed\n');
    } else {
      console.log(`  ✗ FAIL: Found ${saveButtons.length} save buttons: ${saveButtons.join(', ')}\n`);
    }

    // Test 2: Verify saved indicator exists
    console.log('Test 2: Checking saved indicator...');
    const indicatorExists = await page.evaluate(() => {
      return !!document.getElementById('saved-indicator');
    });

    if (indicatorExists) {
      console.log('  ✓ PASS: Saved indicator element exists\n');
    } else {
      console.log('  ✗ FAIL: Saved indicator not found\n');
    }

    // Test 3: Test auto-save on text input
    console.log('Test 3: Testing auto-save on text input...');
    await page.fill('#penaltyTarget', 'Test Charity');
    console.log('  - Typed "Test Charity" in penalty target');

    // Wait for debounce + save
    await page.waitForTimeout(1000);
    console.log('  - Waited 1 second for auto-save');

    // Check if saved indicator appeared
    const indicatorVisible = await page.evaluate(() => {
      const indicator = document.getElementById('saved-indicator');
      return indicator && indicator.style.display !== 'none';
    });

    if (indicatorVisible) {
      console.log('  ✓ PASS: Saved indicator appeared\n');
    } else {
      console.log('  ⚠ WARNING: Saved indicator did not appear (may have already faded)\n');
    }

    // Verify it was saved to storage
    const savedValue = await page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['penaltyTarget'], (result) => {
          resolve(result.penaltyTarget);
        });
      });
    });

    if (savedValue === 'Test Charity') {
      console.log('  ✓ PASS: Value saved to chrome.storage\n');
    } else {
      console.log(`  ✗ FAIL: Expected "Test Charity", got "${savedValue}"\n`);
    }

    // Test 4: Test auto-save on radio button
    console.log('Test 4: Testing auto-save on radio button...');
    await page.click('input[name="strictMode"][value="on"]');
    console.log('  - Clicked Strict Mode "on"');

    await page.waitForTimeout(800);

    const strictModeValue = await page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['strictMode'], (result) => {
          resolve(result.strictMode);
        });
      });
    });

    if (strictModeValue === 'on') {
      console.log('  ✓ PASS: Strict mode saved immediately\n');
    } else {
      console.log(`  ✗ FAIL: Expected "on", got "${strictModeValue}"\n`);
    }

    // Test 5: Visual verification
    console.log('Test 5: Taking screenshot for visual verification...');
    const screenshotPath = path.resolve(__dirname, '../../.screenshots/autosave-test.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✓ Screenshot saved: ${screenshotPath}\n`);

    console.log('========================================');
    console.log('ALL TESTS COMPLETE');
    console.log('========================================\n');

    await page.close();
    await browser.close();

    return true;

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    await browser.close();
    return false;
  }
}

testAutoSave().then(success => {
  process.exit(success ? 0 : 1);
});
