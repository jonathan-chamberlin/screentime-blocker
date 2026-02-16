// Blocked page — routes between reward-expired, reward-paused, app blocking, and shame screens
const urlParams = new URLSearchParams(window.location.search);
const reason = urlParams.get('reason');
const blockedApp = urlParams.get('app');

if (reason === 'reward-expired') {
  showInfoScreen("Break Time's Up!", "Your earned break time has run out. Back to work!");
} else if (reason === 'reward-paused') {
  showInfoScreen("Break Ended Early", "Your unused break time has been saved. You can use it later.");
} else if (blockedApp) {
  showAppBlockedScreen(blockedApp);
} else {
  showShameScreen();
}

function showInfoScreen(title, subtitle) {
  const container = document.querySelector('.container');
  document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';

  const h1 = document.createElement('h1');
  h1.className = 'fade-in';
  h1.style.cssText = 'font-size: 42px; color: #ffaa00;';
  h1.textContent = title;

  const p = document.createElement('p');
  p.className = 'subtitle fade-in';
  p.style.cssText = 'color: rgba(255,255,255,0.7); margin-top: 16px;';
  p.textContent = subtitle;

  const btn = document.createElement('button');
  btn.className = 'btn-burn-reward fade-in';
  btn.style.cssText = 'background: linear-gradient(135deg, #00ff88, #00cc6a); color: #0a1a0f; margin-top: 40px;';
  btn.textContent = 'Got It';
  btn.addEventListener('click', () => {
    chrome.tabs.getCurrent((tab) => { if (tab) chrome.tabs.remove(tab.id); });
  });

  container.innerHTML = '';
  container.appendChild(h1);
  container.appendChild(p);
  container.appendChild(btn);
}

function showAppBlockedScreen(appName) {
  chrome.runtime.sendMessage({ action: 'blockedPageLoaded' });

  const container = document.querySelector('.container');
  document.body.style.background = 'linear-gradient(135deg, #2d1b3d 0%, #1a0f29 100%)';

  const h1 = document.createElement('h1');
  h1.className = 'dramatic fade-in';
  h1.style.cssText = 'font-size: 42px; color: #ff4757;';
  h1.textContent = appName + ' was closed';

  const p = document.createElement('p');
  p.className = 'subtitle fade-in';
  p.style.cssText = 'color: rgba(255,255,255,0.7); margin-top: 16px; font-size: 20px;';
  p.textContent = 'Focus on your work! You can use this app during your break.';

  container.innerHTML = '';
  container.appendChild(h1);
  container.appendChild(p);
}

function pickNonRepeating(items, lastIndex, key) {
  const prev = lastIndex[key];
  if (items.length <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * items.length);
  } while (idx === prev);
  return idx;
}

function showShameScreen() {
  chrome.runtime.sendMessage({ action: 'blockedPageLoaded' });

  chrome.storage.local.get(['shameLevel', 'lastShameIndex'], (result) => {
    const attempts = (result.shameLevel || 0) + 1;
    const lastIndex = result.lastShameIndex || {};
    chrome.storage.local.set({ shameLevel: attempts });
    const level = getShameLevel(attempts);
    renderShameScreen(level, attempts, lastIndex);
  });
}

function renderShameScreen(level, attempts, lastIndex) {
  const container = document.querySelector('.container');
  const screens = SHAME_SCREENS[level];
  const idx = pickNonRepeating(screens, lastIndex, level);
  const screen = screens[idx];

  lastIndex[level] = idx;
  chrome.storage.local.set({ lastShameIndex: lastIndex });

  document.body.style.background = screen.bgGradient;

  let html = '';
  html += `<div class="shame-badge ${screen.animClass}" style="color: ${SHAME_LEVEL_COLORS[level]}; border-color: ${SHAME_LEVEL_COLORS[level]}">SHAME LEVEL ${level}: ${SHAME_LEVEL_LABELS[level]}</div>`;

  if (level >= 3) {
    html += `<h1 class="impact ${screen.animClass}">${screen.title}</h1>`;
  } else {
    html += `<h1 class="dramatic ${screen.animClass}">${screen.title}</h1>`;
  }

  if (screen.gifUrl) {
    html += `<img src="${screen.gifUrl}" alt="Shame GIF" class="shame-gif ${screen.animClass}">`;
  }

  if (screen.subtitle === null) {
    const qIdx = pickNonRepeating(GUILT_QUOTES, lastIndex, 'quote');
    lastIndex['quote'] = qIdx;
    chrome.storage.local.set({ lastShameIndex: lastIndex });
    const quote = GUILT_QUOTES[qIdx];
    html += `
      <div class="quote ${screen.animClass}">
        <p class="quote-text">"${quote.text}"</p>
        <p class="quote-source">\u2014 ${quote.source}</p>
      </div>
    `;
  } else {
    html += `<p class="subtitle ${screen.animClass}">${screen.subtitle}</p>`;
  }

  html += `<p class="visit-count ${screen.animClass}">Times you tried to visit blocked sites this session: ${attempts}</p>`;

  container.innerHTML = html;

  if (level === 4 && screen.animClass.includes('flash')) {
    document.body.classList.add('flash');
  }
}
