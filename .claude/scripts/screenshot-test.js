#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../../.screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const PHASES = [
  {
    name: 'Phase 8',
    path: path.resolve(__dirname, '../../../screentime-blocker-phase8/extension'),
    screenshots: [
      { page: 'settings.html', name: 'phase8-settings.png', scroll: 0 },
      { page: 'settings.html', name: 'phase8-productive-sites.png', scroll: 2000 }
    ]
  },
  {
    name: 'Phase 9',
    path: path.resolve(__dirname, '../../../screentime-blocker-phase9/extension'),
    screenshots: [
      { page: 'settings.html', name: 'phase9-blocked-apps.png', scroll: 3000 }
    ]
  },
  {
    name: 'Phase 10',
    path: path.resolve(__dirname, '../../../screentime-blocker-phase10/extension'),
    screenshots: [
      { page: 'settings.html', name: 'phase10-settings-initial.png', scroll: 0 },
      { page: 'settings.html', name: 'phase10-no-save-buttons.png', scroll: 1000 }
    ]
  }
];

async function takeScreenshots(phase) {
  console.log(`\nCapturing screenshots for ${phase.name}...`);

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${phase.path}`,
      `--load-extension=${phase.path}`,
      '--no-sandbox'
    ]
  });

  try {
    let serviceWorker = browser.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await browser.waitForEvent('serviceworker');
    }

    const extensionId = serviceWorker.url().split('/')[2];
    console.log(`Extension ID: ${extensionId}`);

    for (const shot of phase.screenshots) {
      const page = await browser.newPage();
      await page.goto(`chrome-extension://${extensionId}/${shot.page}`);
      await page.waitForTimeout(1500);

      if (shot.scroll) {
        await page.evaluate((scrollAmount) => {
          window.scrollTo(0, scrollAmount);
        }, shot.scroll);
        await page.waitForTimeout(500);
      }

      const screenshotPath = path.join(screenshotsDir, shot.name);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  ✓ Saved: ${shot.name}`);

      await page.close();
    }

    await browser.close();
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function main() {
  console.log('Taking screenshots of all implementations...\n');

  for (const phase of PHASES) {
    await takeScreenshots(phase);
  }

  console.log(`\n✓ All screenshots saved to: ${screenshotsDir}\n`);
}

main().catch(console.error);
