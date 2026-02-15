// Blocked page — routes between reward-expired and shame screens
const urlParams = new URLSearchParams(window.location.search);
const reason = urlParams.get('reason');

if (reason === 'reward-expired') {
  showRewardExpiredScreen();
} else {
  showShameScreen();
}

function showRewardExpiredScreen() {
  const container = document.querySelector('.container');
  document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';

  container.innerHTML = `
    <h1 class="fade-in" style="font-size: 42px; color: #ffaa00;">Reward Time's Up!</h1>
    <p class="subtitle fade-in" style="color: rgba(255,255,255,0.7); margin-top: 16px;">
      Break's over. Time to get back to work.
    </p>
    <div class="fade-in" style="margin-top: 40px;">
      <button class="btn-burn-reward" style="background: linear-gradient(135deg, #00ff88, #00cc6a); color: #0a1a0f;" id="btn-got-it">Got It</button>
    </div>
  `;

  document.getElementById('btn-got-it').addEventListener('click', () => {
    chrome.tabs.getCurrent((tab) => {
      if (tab) chrome.tabs.remove(tab.id);
    });
  });
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

  html += `<p class="visit-count ${screen.animClass}">Slack attempts this session: ${attempts}</p>`;

  container.innerHTML = html;

  if (level === 4 && screen.animClass.includes('flash')) {
    document.body.classList.add('flash');
  }
}
