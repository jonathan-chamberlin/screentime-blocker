const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const state = JSON.parse(fs.readFileSync(path.join(__dirname, '../../.browser-state.json'), 'utf8'));

const gifs = [
  { id: 1, url: "https://media.giphy.com/media/WoF3yfYupTt8mHc7va/giphy.gif", label: "L2: Teacher disappointed" },
  { id: 2, url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif", label: "L2: Grandmother disappointed" },
  { id: 3, url: "https://media.giphy.com/media/hSQOOBtt9CXGM/giphy.gif", label: "L2: Puppy can't believe it" },
  { id: 4, url: "https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif", label: "L2: Plants judging you" },
  { id: 5, url: "https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif", label: "L3: The betrayal" },
  { id: 6, url: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif", label: "L3: Drill sergeant" },
  { id: 7, url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif", label: "L3: Crowd watches in horror" },
  { id: 8, url: "https://media.giphy.com/media/YJjvTqoRFgZaM/giphy.gif", label: "L3: Productivity in flames" },
  { id: 9, url: "https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif", label: "L4: DEFCON 1 meltdown" },
  { id: 10, url: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif", label: "L4: Elmo fire" },
  { id: 11, url: "https://media.giphy.com/media/yr7n0u3qzO9nG/giphy.gif", label: "L4: Wasted potential" },
  { id: 12, url: "https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif", label: "L4: Dumpster fire" },
  { id: 13, url: "https://media.giphy.com/media/YQPVI7u1Cue1W/giphy.gif", label: "L4: Asteroid" },
  { id: 14, url: "https://media.giphy.com/media/ydMNTWYVjSEFi/giphy.gif", label: "L4: Planets collide" },
  { id: 15, url: "https://media.giphy.com/media/kKdgdeuO2M08M/giphy.gif", label: "L4: Dramatic chipmunk" },
  { id: 16, url: "https://media.giphy.com/media/nGDij7nz84qFQL3xtU/giphy.gif", label: "L4: Building demolition" },
];

(async () => {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${state.port}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();

  const ssDir = path.join(__dirname, '../../.screenshots');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  const results = [];

  for (const gif of gifs) {
    try {
      const response = await page.goto(gif.url, { waitUntil: 'load', timeout: 15000 });
      const status = response ? response.status() : 'no response';
      const ok = response && response.ok();

      // Check if the page has an image element (GIF loaded as image)
      const hasImage = await page.evaluate(() => {
        const img = document.querySelector('img');
        if (img) return { width: img.naturalWidth, height: img.naturalHeight };
        // Direct GIF view - check if body contains image content
        const contentType = document.contentType;
        return { contentType };
      });

      await page.screenshot({ path: path.join(ssDir, `gif-${String(gif.id).padStart(2, '0')}.png`) });

      results.push({
        id: gif.id,
        label: gif.label,
        url: gif.url,
        status,
        ok,
        details: hasImage,
        result: ok ? 'PASS' : 'FAIL'
      });
      console.log(`${ok ? 'PASS' : 'FAIL'} [${gif.id}] ${gif.label} — HTTP ${status}`);
    } catch (err) {
      results.push({
        id: gif.id,
        label: gif.label,
        url: gif.url,
        status: 'error',
        ok: false,
        details: err.message,
        result: 'FAIL'
      });
      console.log(`FAIL [${gif.id}] ${gif.label} — ${err.message}`);
    }
  }

  await page.close();

  console.log('\n--- SUMMARY ---');
  const passed = results.filter(r => r.result === 'PASS').length;
  const failed = results.filter(r => r.result === 'FAIL');
  console.log(`${passed}/${results.length} passed`);
  if (failed.length > 0) {
    console.log('Failed:');
    failed.forEach(f => console.log(`  [${f.id}] ${f.label}: ${f.status}`));
  }
})();
