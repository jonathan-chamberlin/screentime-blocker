// Nuclear blocked page — shows fuzzy countdown and motivational content

const MOTIVATIONAL_QUOTES = [
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'Small disciplines repeated with consistency every day lead to great achievements.', author: 'John Maxwell' },
  { text: 'Motivation gets you started. Habit keeps you going.', author: 'Jim Ryun' },
  { text: 'The pain of discipline is far less than the pain of regret.', author: 'Sarah Burgess' },
  { text: 'Every time you resist temptation, you build strength.', author: 'Unknown' },
  { text: 'Your future self is watching you right now through your memories.', author: 'Aubrey de Grey' },
  { text: 'You are braver than you believe, stronger than you seem, and smarter than you think.', author: 'A.A. Milne' },
  { text: 'The only way out is through. Keep going.', author: 'Robert Frost' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'What we fear doing most is usually what we most need to do.', author: 'Tim Ferriss' },
  { text: 'A year from now you will wish you had started today.', author: 'Karen Lamb' },
  { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
  { text: 'Do the hard things. If you only do what is easy, life will be hard.', author: 'Les Brown' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'The difference between who you are and who you want to be is what you do.', author: 'Unknown' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'Obsessed is a word the lazy use to describe the dedicated.', author: 'Unknown' },
  { text: 'If you want something you\'ve never had, you must be willing to do something you\'ve never done.', author: 'Thomas Jefferson' },
];

function fuzzyTimeLeft(ms) {
  const MONTH = 30 * 24 * 60 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  if (ms <= 0) return null; // signal "ready"
  if (ms >= MONTH) return Math.ceil(ms / MONTH) + ' months';
  if (ms >= 2 * DAY) return Math.ceil(ms / DAY) + ' days';
  if (ms >= DAY) return '1 day';
  if (ms >= 2 * HOUR) return Math.floor(ms / HOUR) + ' hours';
  if (ms >= HOUR) return '1 hour';
  return 'Less than 1 hour';
}

function getNuclearSiteStage(site) {
  const now = Date.now();
  if (now - site.addedAt < site.cooldown1Ms) return 'locked';
  if (!site.unblockClickedAt) return 'ready';
  if (now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
  return 'confirm';
}

function getCountdownMs(site) {
  const now = Date.now();
  const stage = getNuclearSiteStage(site);
  if (stage === 'locked') return site.cooldown1Ms - (now - site.addedAt);
  if (stage === 'unblocking') return site.cooldown2Ms - (now - site.unblockClickedAt);
  return 0;
}

function pickQuote() {
  const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[idx];
}

function renderCountdown(site) {
  const countdownEl = document.getElementById('countdown');
  const stage = getNuclearSiteStage(site);

  if (stage === 'ready') {
    countdownEl.textContent = 'Visit Settings to start the unblock process';
    countdownEl.className = 'countdown-value ready';
  } else if (stage === 'unblocking') {
    const ms = getCountdownMs(site);
    const fuzzy = fuzzyTimeLeft(ms);
    countdownEl.textContent = (fuzzy || '1 day') + ' until site is removed';
    countdownEl.className = 'countdown-value';
  } else if (stage === 'confirm') {
    countdownEl.textContent = 'Cooldowns complete — visit Settings to make your final decision';
    countdownEl.className = 'countdown-value ready';
  } else {
    const ms = getCountdownMs(site);
    const fuzzy = fuzzyTimeLeft(ms);
    countdownEl.textContent = (fuzzy || '1 day') + ' until you can request unblock';
    countdownEl.className = 'countdown-value';
  }
}

function findMatchingSite(sites, hostname) {
  const host = hostname.replace(/^www\./, '');
  return sites.find(site => {
    const domains = site.domains || (site.domain ? [site.domain] : []);
    return domains.some(d => d.replace(/^www\./, '') === host);
  });
}

// Render the page
(function init() {
  const quote = pickQuote();
  document.getElementById('quote-text').textContent = '"' + quote.text + '"';
  document.getElementById('quote-author').textContent = '— ' + quote.author;

  const hostname = window.location.hostname;

  chrome.storage.local.get(['nbData'], (result) => {
    const data = result.nbData || { sites: [] };
    const site = findMatchingSite(data.sites, hostname);

    if (site) {
      renderCountdown(site);
    } else {
      document.getElementById('countdown').textContent = 'Permanently blocked';
    }
  });

  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSettings' }).catch(() => {
      // Fallback: open settings page directly
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });
  });

  // Also set document title
  document.title = 'Nuclear Block';
})();
