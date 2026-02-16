#!/usr/bin/env node

/**
 * End-to-end test: Verify Steam gets blocked during work session
 *
 * Test Steps:
 * 1. Load Phase 9 extension
 * 2. Open settings and mark Steam as blocked
 * 3. Start a work session
 * 4. Attempt to launch Steam
 * 5. Verify Steam is closed and shame page appears
 */

const { chromium } = require('playwright');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const EXTENSION_PATH = path.resolve(__dirname, '../../../screentime-blocker-phase9/extension');
const NATIVE_HOST_PATH = path.resolve(__dirname, '../../../screentime-blocker-phase9/native-host');

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('END-TO-END TEST: Steam Application Blocking');
  console.log('='.repeat(70) + '\n');

  // Step 1: Check if native host is installed
  console.log('Step 1: Checking native host installation...');
  const nativeHostInstalled = await checkNativeHost();
  if (!nativeHostInstalled) {
    console.log('⚠️  Native host not installed. Installing...');
    await installNativeHost();
  } else {
    console.log('✓ Native host already installed');
  }

  // Step 2: Launch browser with Phase 9 extension
  console.log('\nStep 2: Loading Phase 9 extension...');
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox'
    ]
  });

  let serviceWorker = browser.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await browser.waitForEvent('serviceworker');
  }
  const extensionId = serviceWorker.url().split('/')[2];
  console.log(`✓ Extension loaded: ${extensionId}`);

  try {
    // Step 3: Configure Steam as blocked
    console.log('\nStep 3: Marking Steam as blocked app...');
    const settingsPage = await browser.newPage();
    await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);
    await settingsPage.waitForTimeout(2000);

    // Check Steam checkbox
    const steamChecked = await settingsPage.evaluate(() => {
      // Find Steam checkbox
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      for (const checkbox of checkboxes) {
        const parent = checkbox.parentElement;
        if (parent && parent.textContent.includes('Steam')) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    });

    if (!steamChecked) {
      throw new Error('Could not find or check Steam checkbox');
    }
    console.log('✓ Steam checkbox checked');

    // Click save button
    await settingsPage.click('button:has-text("SAVE")');
    await settingsPage.waitForTimeout(1000);
    console.log('✓ Blocked apps saved');

    // Provide extension ID for native host
    console.log(`\n⚠️  IMPORTANT: You need to update the native host manifest with this extension ID:`);
    console.log(`   Extension ID: ${extensionId}`);
    console.log(`   File: ${NATIVE_HOST_PATH}/com.brainrotblocker.native.json`);
    console.log(`   Update "allowed_origins" to include: "chrome-extension://${extensionId}/"`);
    console.log('\nPress ENTER when you\'ve updated the manifest...');

    // Wait for user to update manifest
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    await settingsPage.close();

    // Step 4: Start work session
    console.log('\nStep 4: Starting work session...');
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForTimeout(1500);

    // Click Lock In button
    await popupPage.click('button:has-text("Lock In")');
    await popupPage.waitForTimeout(1000);
    console.log('✓ Work session started');
    await popupPage.close();

    // Step 5: Check if Steam is running
    console.log('\nStep 5: Checking for Steam process...');
    const steamRunning = await isSteamRunning();

    if (!steamRunning) {
      console.log('⚠️  Steam is not running. Please launch Steam manually.');
      console.log('   The extension should close it immediately.');
      console.log('\nPress ENTER after launching Steam...');

      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    } else {
      console.log('✓ Steam is already running');
    }

    // Wait a few seconds for extension to detect and close Steam
    console.log('\nWaiting for extension to detect Steam...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if Steam was closed
    const steamStillRunning = await isSteamRunning();

    if (steamStillRunning) {
      console.log('✗ FAIL: Steam is still running (not blocked)');
      console.log('   Possible issues:');
      console.log('   - Native host not receiving messages from extension');
      console.log('   - Extension ID not added to native host manifest');
      console.log('   - Native host process name mismatch');
    } else {
      console.log('✓ SUCCESS: Steam was closed by the extension!');
    }

    // Check if shame page appeared
    const pages = browser.pages();
    const blockedPage = pages.find(p => p.url().includes('blocked.html'));

    if (blockedPage) {
      console.log('✓ Shame page appeared (blocked.html)');

      // Take screenshot of shame page
      const screenshotPath = path.resolve(__dirname, '../../.screenshots/steam-blocked.png');
      await blockedPage.screenshot({ path: screenshotPath });
      console.log(`✓ Screenshot saved: ${screenshotPath}`);
    } else {
      console.log('⚠️  Shame page did not appear');
    }

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
  } finally {
    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE');
    console.log('='.repeat(70) + '\n');

    console.log('Press ENTER to close browser...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    await browser.close();
  }
}

async function isSteamRunning() {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq steam.exe"');
    return stdout.includes('steam.exe');
  } catch (error) {
    return false;
  }
}

async function checkNativeHost() {
  try {
    const { stdout } = await execAsync('reg query "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.brainrotblocker.native"');
    return stdout.includes('com.brainrotblocker.native');
  } catch (error) {
    return false;
  }
}

async function installNativeHost() {
  try {
    const installScript = path.join(NATIVE_HOST_PATH, 'install.bat');
    await execAsync(`"${installScript}"`);
    console.log('✓ Native host installed');
  } catch (error) {
    console.error('✗ Failed to install native host:', error.message);
    throw error;
  }
}

main().catch(console.error);
