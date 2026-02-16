#!/usr/bin/env node

/**
 * Automated test script for Phases 8, 9, 10
 * Tests all three extension worktrees in parallel using Playwright
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WORKTREES = [
  {
    name: 'Phase 8: Expanded Site Lists',
    path: path.resolve(__dirname, '../../../screentime-blocker-phase8/extension'),
    manifestName: 'Brainrot Blocker [phase8-sites]',
    tests: ['verifyExpandedSites', 'verifyMusicSites']
  },
  {
    name: 'Phase 9: Application Blocking',
    path: path.resolve(__dirname, '../../../screentime-blocker-phase9/extension'),
    manifestName: 'Brainrot Blocker [phase9-appblock]',
    tests: ['verifyBlockedAppsUI', 'verifyBlockedAppsStorage']
  },
  {
    name: 'Phase 10: Unified Settings Save',
    path: path.resolve(__dirname, '../../../screentime-blocker-phase10/extension'),
    manifestName: 'Brainrot Blocker [phase10-save]',
    tests: ['verifySaveBanner', 'verifyNoIndividualButtons']
  }
];

async function testExtension(worktree) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${worktree.name}`);
  console.log(`Path: ${worktree.path}`);
  console.log(`${'='.repeat(60)}\n`);

  // Verify extension directory exists
  if (!fs.existsSync(worktree.path)) {
    throw new Error(`Extension path not found: ${worktree.path}`);
  }

  // Launch browser with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${worktree.path}`,
      `--load-extension=${worktree.path}`,
      '--no-sandbox'
    ]
  });

  try {
    // Get extension ID from service worker (Manifest V3)
    let serviceWorker = browser.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await browser.waitForEvent('serviceworker');
    }

    const extensionId = serviceWorker.url().split('/')[2];
    console.log(`✓ Extension loaded with ID: ${extensionId}`);

    // Run tests for this worktree
    const results = [];
    for (const testName of worktree.tests) {
      const result = await runTest(browser, extensionId, testName, worktree);
      results.push({ test: testName, ...result });
    }

    // Print results
    console.log(`\nTest Results for ${worktree.name}:`);
    results.forEach(r => {
      const status = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`  ${status}: ${r.test}`);
      if (!r.passed) {
        console.log(`    Error: ${r.error}`);
      }
    });

    const allPassed = results.every(r => r.passed);
    console.log(`\n${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}\n`);

    await browser.close();
    return { worktree: worktree.name, allPassed, results };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function runTest(browser, extensionId, testName, worktree) {
  console.log(`  Running: ${testName}...`);

  try {
    switch (testName) {
      case 'verifyExpandedSites':
        return await testExpandedSites(browser, extensionId);

      case 'verifyMusicSites':
        return await testMusicSites(browser, extensionId);

      case 'verifyBlockedAppsUI':
        return await testBlockedAppsUI(browser, extensionId);

      case 'verifyBlockedAppsStorage':
        return await testBlockedAppsStorage(browser, extensionId);

      case 'verifySaveBanner':
        return await testSaveBanner(browser, extensionId);

      case 'verifyNoIndividualButtons':
        return await testNoIndividualButtons(browser, extensionId);

      default:
        return { passed: false, error: `Unknown test: ${testName}` };
    }
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// ============================================================================
// Phase 8 Tests
// ============================================================================

async function testExpandedSites(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html`);
  await page.waitForTimeout(1000);

  // Check if constants.js loaded properly by inspecting storage
  const blockedSites = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.storage.local.get(['rewardSites'], (result) => {
        // If not in storage, check DEFAULTS in constants.js
        if (!result.rewardSites) {
          // Constants should be globally available
          resolve(window.DEFAULTS?.rewardSites || []);
        } else {
          resolve(result.rewardSites);
        }
      });
    });
  });

  await page.close();

  if (!blockedSites || blockedSites.length < 50) {
    return {
      passed: false,
      error: `Expected 50+ blocked sites, found ${blockedSites ? blockedSites.length : 0}`
    };
  }

  // Verify specific new sites exist
  const expectedSites = ['cnn.com', 'amazon.com', 'steampowered.com', 'netflix.com'];
  const missing = expectedSites.filter(site => !blockedSites.includes(site));

  if (missing.length > 0) {
    return {
      passed: false,
      error: `Missing expected sites: ${missing.join(', ')}`
    };
  }

  return { passed: true };
}

async function testMusicSites(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html`);
  await page.waitForTimeout(1000);

  const productiveSites = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.storage.local.get(['productiveSites'], (result) => {
        if (!result.productiveSites) {
          resolve(window.DEFAULTS?.productiveSites || []);
        } else {
          resolve(result.productiveSites);
        }
      });
    });
  });

  await page.close();

  // Verify music/production sites
  const expectedMusicSites = ['ableton.com', 'spotify.com', 'soundcloud.com'];
  const missing = expectedMusicSites.filter(site => !productiveSites.includes(site));

  if (missing.length > 0) {
    return {
      passed: false,
      error: `Missing expected music sites: ${missing.join(', ')}`
    };
  }

  return { passed: true };
}

// ============================================================================
// Phase 9 Tests
// ============================================================================

async function testBlockedAppsUI(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html`);
  await page.waitForTimeout(1500);

  // Check if blocked apps section exists
  const sectionExists = await page.evaluate(() => {
    return !!document.getElementById('blocked-apps-section');
  });

  if (!sectionExists) {
    await page.close();
    return { passed: false, error: 'Blocked apps section not found in settings' };
  }

  // Check if Steam checkbox exists
  const steamExists = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    return labels.some(label => label.textContent.includes('Steam'));
  });

  await page.close();

  if (!steamExists) {
    return { passed: false, error: 'Steam checkbox not found in blocked apps' };
  }

  return { passed: true };
}

async function testBlockedAppsStorage(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html`);
  await page.waitForTimeout(1500);

  // Check Steam checkbox
  const checked = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const steamLabel = labels.find(label => label.textContent.includes('Steam'));
    if (!steamLabel) return false;

    const checkbox = steamLabel.querySelector('input[type="checkbox"]');
    if (!checkbox) return false;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });

  if (!checked) {
    await page.close();
    return { passed: false, error: 'Could not check Steam checkbox' };
  }

  // Click save button
  await page.click('button[data-setting="blockedApps"]');
  await page.waitForTimeout(1000);

  // Verify storage
  const blockedApps = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.storage.local.get(['blockedApps'], (result) => {
        resolve(result.blockedApps || []);
      });
    });
  });

  await page.close();

  const hasSteam = blockedApps.some(app => app.process === 'steam');
  if (!hasSteam) {
    return { passed: false, error: 'Steam not saved to blockedApps storage' };
  }

  return { passed: true };
}

// ============================================================================
// Phase 10 Tests
// ============================================================================

async function testSaveBanner(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html`);
  await page.waitForTimeout(1500);

  // Banner should be hidden initially
  const initiallyHidden = await page.evaluate(() => {
    const banner = document.getElementById('save-banner');
    return banner && banner.classList.contains('hidden');
  });

  if (!initiallyHidden) {
    await page.close();
    return { passed: false, error: 'Save banner should be hidden initially' };
  }

  // Modify a setting
  await page.fill('#work-minutes', '60');
  await page.waitForTimeout(500);

  // Banner should appear
  const bannerVisible = await page.evaluate(() => {
    const banner = document.getElementById('save-banner');
    return banner && !banner.classList.contains('hidden');
  });

  await page.close();

  if (!bannerVisible) {
    return { passed: false, error: 'Save banner did not appear after modifying setting' };
  }

  return { passed: true };
}

async function testNoIndividualButtons(browser, extensionId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/settings.html`);
  await page.waitForTimeout(1500);

  // Count save buttons (should only be the unified one)
  const saveButtonCount = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.filter(btn =>
      btn.textContent.toLowerCase().includes('save') &&
      btn.id !== 'save-all-btn'
    ).length;
  });

  await page.close();

  if (saveButtonCount > 0) {
    return {
      passed: false,
      error: `Found ${saveButtonCount} individual save buttons (should be 0)`
    };
  }

  return { passed: true };
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('AUTOMATED TESTING: Phases 8, 9, 10');
  console.log('='.repeat(60));

  const allResults = [];

  for (const worktree of WORKTREES) {
    try {
      const result = await testExtension(worktree);
      allResults.push(result);
    } catch (error) {
      console.error(`\n✗ FATAL ERROR testing ${worktree.name}:`);
      console.error(error.message);
      allResults.push({ worktree: worktree.name, allPassed: false, error: error.message });
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));

  allResults.forEach(r => {
    const status = r.allPassed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${r.worktree}`);
  });

  const overallSuccess = allResults.every(r => r.allPassed);
  console.log(`\n${overallSuccess ? '✓ ALL PHASES PASSED' : '✗ SOME PHASES FAILED'}\n`);

  process.exit(overallSuccess ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
