// Good choice page — shown after user successfully unblocks a nuclear-blocked site

const GOOD_CHOICE_QUOTES = [
  { text: 'The measure of intelligence is the ability to change.', author: 'Albert Einstein' },
  { text: 'You are the author of your own story. Make it a good one.', author: 'Unknown' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'Be yourself. Everyone else is already taken.', author: 'Oscar Wilde' },
  { text: 'Life is 10% what happens to you and 90% how you react to it.', author: 'Charles R. Swindoll' },
];

(function init() {
  const quote = GOOD_CHOICE_QUOTES[Math.floor(Math.random() * GOOD_CHOICE_QUOTES.length)];
  document.getElementById('quote-text').textContent = '"' + quote.text + '"';
  document.getElementById('quote-author').textContent = '— ' + quote.author;

  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSettings' }).catch(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });
  });
})();
