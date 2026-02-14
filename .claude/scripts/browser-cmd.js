// Browser command runner — connects to running Chromium via CDP
// Usage: node browser-cmd.js <command> [args...]
//
// Commands:
//   screenshot [filename]        — Take screenshot, save to .screenshots/
//   snapshot                     — Get accessibility tree (JSON)
//   navigate <url>               — Navigate to URL
//   popup                        — Navigate to extension popup page
//   click <selector>             — Click element by CSS selector
//   click-role <role> <name>     — Click element by accessibility role
//   fill <selector> <text>       — Fill input field
//   text [selector]              — Get text content (page or element)
//   eval <js>                    — Evaluate JavaScript on page
//   pages                        — List all open pages
//   switch <index>               — Switch to page by index
//   url                          — Get current URL
//   wait <ms>                    — Wait milliseconds
//   close-page                   — Close current page

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const STATE_FILE = path.resolve(__dirname, '../../.browser-state.json');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../.screenshots');
const PORT = 9222;

async function getState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { port: PORT, extensionId: 'unknown' };
}

async function connect() {
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${PORT}`);
    return browser;
  } catch (err) {
    console.error('Failed to connect. Is the browser running? Launch with: node .claude/scripts/browser-launch.js');
    process.exit(1);
  }
}

async function getActivePage(browser) {
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    console.error('No browser contexts found');
    process.exit(1);
  }
  const pages = contexts[0].pages();
  if (pages.length === 0) {
    return await contexts[0].newPage();
  }
  // Return last non-blank page, or last page
  for (let i = pages.length - 1; i >= 0; i--) {
    const url = pages[i].url();
    if (url !== 'about:blank' && !url.startsWith('chrome://')) {
      return pages[i];
    }
  }
  return pages[pages.length - 1];
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`Usage: node browser-cmd.js <command> [args...]

Commands:
  screenshot [filename]      Take screenshot
  snapshot                   Accessibility tree (JSON)
  navigate <url>             Go to URL
  popup                      Open extension popup
  click <selector>           Click by CSS selector
  click-role <role> <name>   Click by role
  fill <selector> <text>     Fill input
  text [selector]            Get text content
  eval <js>                  Run JavaScript
  pages                      List open pages
  switch <index>             Switch to page
  url                        Current URL
  wait <ms>                  Wait
  close-page                 Close current page`);
    return;
  }

  const browser = await connect();
  const state = await getState();

  try {
    let page = await getActivePage(browser);

    switch (command) {
      case 'screenshot': {
        if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        const filename = args[1] || `screenshot-${Date.now()}.png`;
        const filepath = path.resolve(SCREENSHOTS_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        console.log(filepath);
        break;
      }

      case 'snapshot': {
        const snapshot = await page.accessibility.snapshot({ interestingOnly: true });
        console.log(JSON.stringify(snapshot, null, 2));
        break;
      }

      case 'navigate': {
        const url = args[1];
        if (!url) { console.error('Usage: navigate <url>'); break; }
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        console.log(`Navigated to: ${page.url()}`);
        break;
      }

      case 'popup': {
        const extId = state.extensionId;
        const url = `chrome-extension://${extId}/popup.html`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        console.log(`Opened popup: ${url}`);
        break;
      }

      case 'click': {
        const selector = args[1];
        if (!selector) { console.error('Usage: click <selector>'); break; }
        await page.locator(selector).click({ timeout: 5000 });
        console.log(`Clicked: ${selector}`);
        break;
      }

      case 'click-role': {
        const role = args[1];
        const name = args.slice(2).join(' ');
        if (!role) { console.error('Usage: click-role <role> <name>'); break; }
        await page.getByRole(role, { name }).click({ timeout: 5000 });
        console.log(`Clicked role=${role} name="${name}"`);
        break;
      }

      case 'fill': {
        const selector = args[1];
        const text = args.slice(2).join(' ');
        if (!selector || !text) { console.error('Usage: fill <selector> <text>'); break; }
        await page.locator(selector).fill(text, { timeout: 5000 });
        console.log(`Filled ${selector} with: ${text}`);
        break;
      }

      case 'text': {
        const selector = args[1];
        let text;
        if (selector) {
          text = await page.locator(selector).textContent({ timeout: 5000 });
        } else {
          text = await page.locator('body').textContent({ timeout: 5000 });
        }
        console.log(text);
        break;
      }

      case 'eval': {
        const js = args.slice(1).join(' ');
        if (!js) { console.error('Usage: eval <javascript>'); break; }
        const result = await page.evaluate(js);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'pages': {
        const contexts = browser.contexts();
        for (const ctx of contexts) {
          for (const [i, p] of ctx.pages().entries()) {
            const current = p === page ? ' (active)' : '';
            console.log(`[${i}] ${p.url()}${current}`);
          }
        }
        break;
      }

      case 'switch': {
        const idx = parseInt(args[1], 10);
        const contexts = browser.contexts();
        const pages = contexts[0].pages();
        if (idx >= 0 && idx < pages.length) {
          page = pages[idx];
          await page.bringToFront();
          console.log(`Switched to [${idx}]: ${page.url()}`);
        } else {
          console.error(`Invalid index. Have ${pages.length} pages.`);
        }
        break;
      }

      case 'url': {
        console.log(page.url());
        break;
      }

      case 'wait': {
        const ms = parseInt(args[1], 10) || 1000;
        await new Promise(r => setTimeout(r, ms));
        console.log(`Waited ${ms}ms`);
        break;
      }

      case 'close-page': {
        await page.close();
        console.log('Page closed');
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
    }
  } finally {
    await browser.close(); // Disconnects only, doesn't kill browser
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
