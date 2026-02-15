// Reload extension in browser via CDP
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  let page = ctx.pages()[0];

  if (!page) {
    console.log('No pages found');
    await browser.close();
    return;
  }

  // Navigate to extensions page
  await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Enable developer mode
  const devEnabled = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    if (!manager || !manager.shadowRoot) return 'no manager';
    const toolbar = manager.shadowRoot.querySelector('extensions-toolbar');
    if (!toolbar || !toolbar.shadowRoot) return 'no toolbar';
    const toggle = toolbar.shadowRoot.querySelector('#devMode');
    if (!toggle) return 'no toggle';
    if (!toggle.checked) {
      toggle.click();
      return 'enabled dev mode';
    }
    return 'dev mode already on';
  });
  console.log(devEnabled);
  await new Promise(r => setTimeout(r, 1000));

  // Click reload on Brainrot Blocker extension
  const reloaded = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    if (!manager || !manager.shadowRoot) return 'no manager';
    const itemList = manager.shadowRoot.querySelector('extensions-item-list');
    if (!itemList || !itemList.shadowRoot) return 'no item-list';
    const items = itemList.shadowRoot.querySelectorAll('extensions-item');
    for (const item of items) {
      if (!item.shadowRoot) continue;
      const name = item.shadowRoot.querySelector('#name');
      if (name && name.textContent.includes('Brainrot Blocker')) {
        const reload = item.shadowRoot.querySelector('#dev-reload-button');
        if (reload) {
          reload.click();
          return 'reloaded ' + item.id;
        }
        return 'no reload button for ' + item.id;
      }
    }
    return 'extension not found';
  });
  console.log(reloaded);

  await new Promise(r => setTimeout(r, 2000));

  // Check if extension service worker is running
  const sws = ctx.serviceWorkers();
  for (const sw of sws) {
    console.log('Service worker:', sw.url());
  }

  await browser.close();
})();
