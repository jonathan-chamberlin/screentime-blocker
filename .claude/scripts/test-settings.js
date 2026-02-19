const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extPath = path.resolve(__dirname, '../../extension');
  const profilePath = path.resolve(__dirname, '../../.browser-profile');
  const screenshotDir = path.resolve(__dirname, '../../.screenshots');

  const browser = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    args: [
      '--disable-extensions-except=' + extPath,
      '--load-extension=' + extPath,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer'
    ]
  });

  let sw = browser.serviceWorkers()[0];
  if (!sw) sw = await browser.waitForEvent('serviceworker', { timeout: 10000 });
  const extId = sw.url().split('/')[2];
  console.log('Extension ID:', extId);

  // Test settings page
  const page = await browser.newPage();

  // Collect ALL console messages
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleMsgs.push({ type: 'pageerror', text: err.message }));

  await page.goto('chrome-extension://' + extId + '/settings.html');
  await page.waitForTimeout(3000);

  // Check console errors
  const errors = consoleMsgs.filter(m => m.type === 'error' || m.type === 'pageerror');
  console.log('Console errors after load:', errors.length > 0 ? JSON.stringify(errors) : 'none');

  // Force expand ALL sections via JS
  await page.evaluate(() => {
    document.querySelectorAll('.section').forEach(s => s.classList.add('expanded'));
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(screenshotDir, 'settings-all-expanded.png'), fullPage: true });

  // Check break lists master content
  const masterHTML = await page.locator('#breakListsMaster').evaluate(el => el.innerHTML);
  console.log('Break lists master innerHTML:', masterHTML.substring(0, 300) || '(empty)');

  const activeHTML = await page.locator('#activeBreakLists').evaluate(el => el.innerHTML);
  console.log('Active break lists innerHTML:', activeHTML.substring(0, 300) || '(empty)');

  // Check productive lists
  const prodMasterHTML = await page.locator('#productiveListsMaster').evaluate(el => el.innerHTML);
  console.log('Productive lists master innerHTML:', prodMasterHTML.substring(0, 300) || '(empty)');

  // Check productive mode radio
  const prodMode = await page.evaluate(() => {
    const checked = document.querySelector('input[name="productiveMode"]:checked');
    return checked ? checked.value : 'not found';
  });
  console.log('Productive mode:', prodMode);

  // Check storage to see what data exists
  const storageData = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.storage.local.get(['breakLists', 'productiveLists', 'productiveMode'], resolve);
    });
  });
  console.log('Storage breakLists count:', storageData.breakLists ? storageData.breakLists.length : 'undefined');
  console.log('Storage productiveLists count:', storageData.productiveLists ? storageData.productiveLists.length : 'undefined');
  console.log('Storage productiveMode:', storageData.productiveMode || 'undefined');

  // Take a screenshot scrolled to Break Lists section
  await page.evaluate(() => {
    document.getElementById('breakListsMaster').scrollIntoView();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotDir, 'settings-break-lists.png') });

  // Test popup
  const popupPage = await browser.newPage();
  popupPage.on('console', msg => consoleMsgs.push({ type: 'popup-' + msg.type(), text: msg.text() }));
  popupPage.on('pageerror', err => consoleMsgs.push({ type: 'popup-pageerror', text: err.message }));

  await popupPage.goto('chrome-extension://' + extId + '/popup.html');
  await popupPage.waitForTimeout(2500);
  await popupPage.screenshot({ path: path.join(screenshotDir, 'popup.png') });

  const popupErrors = consoleMsgs.filter(m => m.type.startsWith('popup-') && (m.type.includes('error') || m.type.includes('pageerror')));
  console.log('Popup errors:', popupErrors.length > 0 ? JSON.stringify(popupErrors) : 'none');

  const listsHTML = await popupPage.locator('#active-lists-content').evaluate(el => el.innerHTML);
  console.log('Popup active lists innerHTML:', listsHTML.substring(0, 300) || '(empty)');

  await browser.close();
  console.log('TEST COMPLETE');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
