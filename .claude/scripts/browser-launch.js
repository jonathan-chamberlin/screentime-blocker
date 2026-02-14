// Launch Chromium with the FocusContract extension loaded
// Stays running in background with CDP on port 9222
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../../extension');
const USER_DATA_DIR = path.resolve(__dirname, '../../.browser-profile');
const STATE_FILE = path.resolve(__dirname, '../../.browser-state.json');
const PORT = 9222;

(async () => {
  // Clean up stale state
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);

  console.log(`Launching Chromium with extension: ${EXTENSION_PATH}`);
  console.log(`CDP port: ${PORT}`);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      `--remote-debugging-port=${PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  // Find extension ID via multiple methods
  let extensionId = null;

  // Method 1: Wait for service worker to register
  const swPromise = new Promise((resolve) => {
    context.on('serviceworker', (sw) => {
      const match = sw.url().match(/chrome-extension:\/\/([a-z]{32})/);
      if (match) resolve(match[1]);
    });
    // Also check already-registered service workers
    for (const sw of context.serviceWorkers()) {
      const match = sw.url().match(/chrome-extension:\/\/([a-z]{32})/);
      if (match) { resolve(match[1]); break; }
    }
  });

  // Method 2: Navigate to chrome://extensions and scrape
  const scrapePromise = (async () => {
    await new Promise(r => setTimeout(r, 3000)); // wait for extension to load
    const page = context.pages()[0] || await context.newPage();
    await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    // Get extension ID from the page
    const id = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) return null;
      const itemList = manager.shadowRoot.querySelector('extensions-item-list');
      if (!itemList || !itemList.shadowRoot) return null;
      const items = itemList.shadowRoot.querySelectorAll('extensions-item');
      for (const item of items) {
        if (item.shadowRoot) {
          const name = item.shadowRoot.querySelector('#name');
          if (name && name.textContent.includes('FocusContract')) {
            return item.id;
          }
        }
      }
      return null;
    }).catch(() => null);
    return id;
  })();

  // Race: first method to find the ID wins
  extensionId = await Promise.race([
    swPromise,
    scrapePromise,
    new Promise(r => setTimeout(() => r(null), 15000)), // 15s timeout
  ]);

  // Fallback: read from manifest in profile dir
  if (!extensionId) {
    const extDir = path.join(USER_DATA_DIR, 'Default', 'Extensions');
    if (fs.existsSync(extDir)) {
      for (const dir of fs.readdirSync(extDir)) {
        if (dir.length === 32) { extensionId = dir; break; }
      }
    }
  }

  // Save state for other scripts
  const state = {
    port: PORT,
    extensionId: extensionId || 'unknown',
    pid: process.pid,
    launchedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`Extension ID: ${extensionId || 'not detected'}`);
  console.log(`State saved to: ${STATE_FILE}`);
  console.log('Browser running. Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('Closing browser...');
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
    await context.close();
    process.exit(0);
  });
})();
