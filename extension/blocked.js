// Notify background that blocked page loaded (for tracking blocked attempts in Wave 3)
chrome.runtime.sendMessage({ action: 'blockedPageLoaded' });

// Shame Mode: 10-level escalating guilt-trip system with GIFs
const guiltQuotes = [
  { text: "Get back to work.", source: "Sun Tzu, probably" },
  { text: "YouTube will still be there later. Your deadline won't.", source: "Abraham Lincoln, allegedly" },
  { text: "Every minute on Reddit is a minute your future self hates you for.", source: "NASA Mission Control" },
  { text: "Your work session called. It misses you.", source: "Ancient Proverb" },
  { text: "Procrastination is the thief of time.", source: "Some guy on Twitter, 2018" },
  { text: "Focus is a superpower.", source: "Your bank account" },
];

const shameLevels = [
  {
    title: "You're in a work session.",
    subtitle: null, // Will use random guilt quote
    gifUrl: null,
    bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    animClass: 'fade-in'
  },
  {
    title: "Really? Again?",
    subtitle: "Your teacher expected better.",
    gifUrl: "https://media.giphy.com/media/WoF3yfYupTt8mHc7va/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
    animClass: 'fade-in'
  },
  {
    title: "Your grandmother is disappointed.",
    subtitle: "She bragged about you to her friends...",
    gifUrl: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #6c3483 0%, #5b2c6f 100%)',
    animClass: 'fade-in'
  },
  {
    title: "Even this puppy can't believe it.",
    subtitle: "Look what your procrastination did.",
    gifUrl: "https://media.giphy.com/media/hSQOOBtt9CXGM/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    animClass: 'fade-in'
  },
  {
    title: "THE BETRAYAL",
    subtitle: "You promised yourself. You PROMISED.",
    gifUrl: "https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #c0392b 0%, #922b21 100%)',
    animClass: 'shake'
  },
  {
    title: "DROP AND GIVE ME 50 MINUTES!",
    subtitle: "Did I say you could take a break, recruit?!",
    gifUrl: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #1a5276 0%, #154360 100%)',
    animClass: 'shake'
  },
  {
    title: "THE CROWD WATCHES IN HORROR",
    subtitle: "Everyone can see your browser history.",
    gifUrl: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #7b241c 0%, #641e16 100%)',
    animClass: 'shake'
  },
  {
    title: "YOUR PRODUCTIVITY, LITERALLY",
    subtitle: "This is your potential going up in flames.",
    gifUrl: "https://media.giphy.com/media/YJjvTqoRFgZaM/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #b7950b 0%, #7d6608 100%)',
    animClass: 'shake'
  },
  {
    title: "What are you even doing with your life?",
    subtitle: "The void stares back. The void is disappointed.",
    gifUrl: "https://media.giphy.com/media/l2JehQ2GitHGdVG9Y/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #17202a 0%, #1c2833 100%)',
    animClass: 'fade-in'
  },
  {
    title: "DEFCON 1: TOTAL SHAME MELTDOWN",
    subtitle: "All shame levels activated simultaneously. There is no recovery.",
    gifUrl: "https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif",
    bgGradient: 'linear-gradient(135deg, #8b0000 0%, #4a0000 100%)',
    animClass: 'shake flash'
  }
];

// Get and increment shame level
chrome.storage.local.get(['shameLevel'], (result) => {
  const currentShame = result.shameLevel || 0;
  const newShame = currentShame + 1;
  chrome.storage.local.set({ shameLevel: newShame });
  renderShameLevel(currentShame, newShame);
});

function renderShameLevel(level, visitCount) {
  const container = document.querySelector('.container');
  const cappedLevel = Math.min(level, 9);
  const shameData = shameLevels[cappedLevel];

  // Set background gradient
  document.body.style.background = shameData.bgGradient;

  // Build HTML content
  let html = '';

  // Title
  if (cappedLevel >= 4) {
    html += `<h1 class="impact ${shameData.animClass}">${shameData.title}</h1>`;
  } else {
    html += `<h1 class="dramatic ${shameData.animClass}">${shameData.title}</h1>`;
  }

  // GIF (if present)
  if (shameData.gifUrl) {
    html += `<img src="${shameData.gifUrl}" alt="Shame GIF" class="shame-gif ${shameData.animClass}">`;
  }

  // Subtitle
  if (cappedLevel === 0) {
    // Level 0: Random guilt quote
    const quote = guiltQuotes[Math.floor(Math.random() * guiltQuotes.length)];
    html += `
      <div class="quote ${shameData.animClass}">
        <p class="quote-text">"${quote.text}"</p>
        <p class="quote-source">— ${quote.source}</p>
      </div>
    `;
  } else {
    html += `<p class="subtitle ${shameData.animClass}">${shameData.subtitle}</p>`;
  }

  // Visit count
  html += `<p class="visit-count ${shameData.animClass}">You've tried to slack off ${visitCount} time${visitCount === 1 ? '' : 's'} this session</p>`;

  container.innerHTML = html;

  // Apply flash animation to body for level 9
  if (cappedLevel === 9) {
    document.body.classList.add('flash');
  }
}
