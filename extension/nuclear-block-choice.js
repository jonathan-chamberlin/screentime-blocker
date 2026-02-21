// Good choice page — shown after user successfully unblocks a nuclear-blocked site
// Offers a "Block Again" option in case the user regrets unblocking

const GOOD_CHOICE_QUOTES = [
  { text: 'The measure of intelligence is the ability to change.', author: 'Albert Einstein' },
  { text: 'You are the author of your own story. Make it a good one.', author: 'Unknown' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'Be yourself. Everyone else is already taken.', author: 'Oscar Wilde' },
  { text: 'Life is 10% what happens to you and 90% how you react to it.', author: 'Charles R. Swindoll' },
  { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.', author: 'Ralph Waldo Emerson' },
  { text: 'Knowing yourself is the beginning of all wisdom.', author: 'Aristotle' },
  { text: 'The privilege of a lifetime is to become who you truly are.', author: 'Carl Jung' },
  { text: 'It is never too late to be what you might have been.', author: 'George Eliot' },
  { text: 'Happiness is not something ready-made. It comes from your own actions.', author: 'Dalai Lama' },
  { text: 'The only real failure is the failure to try.', author: 'Unknown' },
  { text: 'Every saint has a past, and every sinner has a future.', author: 'Oscar Wilde' },
  { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
  { text: 'Growth is uncomfortable. You have to embrace being uncomfortable if you want to grow.', author: 'Unknown' },
  { text: 'What you get by achieving your goals is not as important as what you become by achieving them.', author: 'Zig Ziglar' },
];

(function init() {
  const quote = GOOD_CHOICE_QUOTES[Math.floor(Math.random() * GOOD_CHOICE_QUOTES.length)];
  document.getElementById('quote-text').textContent = '"' + quote.text + '"';
  document.getElementById('quote-author').textContent = '— ' + quote.author;

  // Parse domains from URL params (passed by last-chance page)
  const params = new URLSearchParams(window.location.search);
  const domainsStr = params.get('domains');
  const domains = domainsStr ? domainsStr.split(',').filter(Boolean) : [];

  // Hide block-again if we don't know what domains to re-block
  if (domains.length === 0) {
    document.getElementById('block-again-box').style.display = 'none';
    return;
  }

  document.getElementById('btn-block-again').addEventListener('click', () => {
    const cooldownMs = parseInt(document.getElementById('block-again-cooldown').value, 10);
    const entry = {
      id: 'nuclear-' + Date.now(),
      domains: domains,
      addedAt: Date.now(),
      cooldown1Ms: cooldownMs,
      cooldown2Ms: 64800000, // 18 hours default
      unblockClickedAt: null,
    };
    chrome.runtime.sendMessage({ action: 'addNuclearSite', entry }, () => {
      document.getElementById('btn-block-again').disabled = true;
      document.getElementById('btn-block-again').style.opacity = '0.4';
      document.getElementById('block-again-cooldown').disabled = true;
      document.getElementById('block-again-success').style.display = 'block';
    });
  });
})();
