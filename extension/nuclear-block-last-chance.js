// Nuclear Block last-chance page — shown when both cooldowns have expired
// User must actively choose to unblock (with typing confirmation) or block again

const LAST_CHANCE_QUOTES = [
  { text: 'The person you are becoming is worth more than the comfort you are giving up.', author: 'Unknown' },
  { text: 'You did not come this far to only come this far.', author: 'Unknown' },
  { text: 'Every moment of resistance is a vote for the person you want to become.', author: 'James Clear' },
  { text: 'Freedom is not the absence of commitments, but the ability to choose yours.', author: 'Paulo Coelho' },
  { text: 'The chains of habit are too light to be felt until they are too heavy to be broken.', author: 'Warren Buffett' },
  { text: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott' },
  { text: 'What you resist, persists. What you let go of, lets go of you.', author: 'Unknown' },
  { text: 'You are not a finished product. You are a work in progress, and that is okay.', author: 'Unknown' },
  { text: 'Between stimulus and response there is a space. In that space is our power to choose.', author: 'Viktor Frankl' },
  { text: 'The first and greatest victory is to conquer yourself.', author: 'Plato' },
  { text: 'Nothing worth having comes easy.', author: 'Theodore Roosevelt' },
  { text: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
  { text: 'You are one decision away from a completely different life.', author: 'Unknown' },
  { text: 'The temptation to quit will be greatest just before you are about to succeed.', author: 'Chinese Proverb' },
  { text: 'Comfort is the enemy of progress.', author: 'P.T. Barnum' },
  { text: 'How you do anything is how you do everything.', author: 'Martha Beck' },
  { text: 'Sacrifice is giving up something good for something better.', author: 'Unknown' },
  { text: 'When you feel like quitting, remember why you started.', author: 'Unknown' },
  { text: 'Your brain is a suggestion engine. Not every thought deserves action.', author: 'Unknown' },
  { text: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Unknown' },
  { text: 'Temporary discomfort or permanent regret. Your call.', author: 'Unknown' },
  { text: 'You will never regret choosing the harder right over the easier wrong.', author: 'Unknown' },
];

const CONFIRM_PHRASE = 'You can change. I love you.';

function pickQuote() {
  return LAST_CHANCE_QUOTES[Math.floor(Math.random() * LAST_CHANCE_QUOTES.length)];
}

function getNuclearSiteStage(site) {
  const now = Date.now();
  if (now - site.addedAt < site.cooldown1Ms) return 'locked';
  if (!site.unblockClickedAt) return 'ready';
  if (now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
  return 'confirm';
}

function findMatchingSite(sites, hostname) {
  const host = hostname.replace(/^www\./, '');
  return sites.find(site => {
    const domains = site.domains || (site.domain ? [site.domain] : []);
    return domains.some(d => d.replace(/^www\./, '') === host);
  });
}

function findConfirmSite(sites) {
  // Fallback: find first site in confirm stage
  return sites.find(site => getNuclearSiteStage(site) === 'confirm');
}

(function init() {
  const quote = pickQuote();
  document.getElementById('quote-text').textContent = '"' + quote.text + '"';
  document.getElementById('quote-author').textContent = '— ' + quote.author;

  const hostname = window.location.hostname;

  chrome.storage.local.get(['nbData'], (result) => {
    const data = result.nbData || { sites: [] };
    // Try to match by hostname first, fall back to first confirm-stage site
    const site = findMatchingSite(data.sites, hostname) || findConfirmSite(data.sites);

    if (!site) return;

    const typingLabel = document.getElementById('typing-label');
    typingLabel.textContent = 'Type "' + CONFIRM_PHRASE + '" to confirm:';
    // Make phrase non-copyable
    typingLabel.addEventListener('copy', e => e.preventDefault());
    typingLabel.addEventListener('contextmenu', e => e.preventDefault());

    // Unblock Now — reveal typing confirmation
    document.getElementById('btn-unblock-now').addEventListener('click', () => {
      document.getElementById('typing-confirm-area').classList.add('visible');
      document.getElementById('typing-input').focus();
    });

    // Typing validation
    const typingInput = document.getElementById('typing-input');
    const confirmBtn = document.getElementById('btn-confirm-final');
    typingInput.placeholder = 'Type the phrase here...';
    // Block pasting
    typingInput.addEventListener('paste', e => e.preventDefault());

    typingInput.addEventListener('input', () => {
      const match = typingInput.value === CONFIRM_PHRASE;
      confirmBtn.classList.toggle('enabled', match);
    });

    // Final confirm
    confirmBtn.addEventListener('click', () => {
      if (typingInput.value !== CONFIRM_PHRASE) return;
      const domains = site.domains || (site.domain ? [site.domain] : []);
      chrome.runtime.sendMessage({ action: 'confirmUnblockNuclear', id: site.id }, () => {
        const params = new URLSearchParams({ domains: domains.join(',') });
        window.location.href = chrome.runtime.getURL('nuclear-block-choice.html') + '?' + params;
      });
    });

    // Block Again
    document.getElementById('btn-block-again').addEventListener('click', () => {
      const cooldownMs = parseInt(document.getElementById('block-again-cooldown').value, 10);
      chrome.runtime.sendMessage({ action: 'blockAgainNuclear', id: site.id, cooldown1Ms: cooldownMs }, () => {
        window.location.href = chrome.runtime.getURL('nuclear-block-stayed-strong.html');
      });
    });
  });

  // Open settings
  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSettings' }).catch(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });
  });
})();
