// Query background for session state to decide what to show
chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
  if (!status) {
    // Fallback: show default shame
    showShameScreen();
    return;
  }

  if (status.sessionCompleted && !status.rewardActive && !status.rewardPaused) {
    // Work done, reward available — show burn button instead of shame
    showRewardBurnScreen(status);
  } else if (status.rewardPaused) {
    // Reward is paused — gentle message, no shame increment
    showRewardPausedScreen(status);
  } else if (status.sessionActive || (!status.rewardActive && !status.sessionCompleted)) {
    // Active work session or just blocked — show shame
    showShameScreen();
  } else {
    showShameScreen();
  }
});

function showRewardBurnScreen(status) {
  const container = document.querySelector('.container');
  document.body.classList.add('complete-bg');
  document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';

  container.innerHTML = `
    <h1 class="complete-title fade-in">Session Complete!</h1>
    <p class="complete-subtitle fade-in">You earned ${status.rewardMinutes || 10} reward minutes.</p>
    <div class="reward-burn-container fade-in">
      <button class="btn-burn-reward" id="btn-burn-blocked">Burn Reward Minutes</button>
    </div>
  `;

  document.getElementById('btn-burn-blocked').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'useReward' }, (response) => {
      if (response && response.success) {
        // Reload to access the site now that it's unblocked
        window.location.reload();
      }
    });
  });
}

function showRewardPausedScreen(status) {
  const container = document.querySelector('.container');
  document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';

  const remainMin = Math.ceil((status.rewardRemainingSeconds || 0) / 60);
  container.innerHTML = `
    <h1 class="fade-in" style="font-size: 36px;">Reward Paused</h1>
    <p class="reward-paused-msg fade-in">You have ${remainMin} min saved. Resume from the popup to access this site.</p>
  `;
}

function showShameScreen() {
  // Notify background that blocked page loaded (for tracking blocked attempts)
  chrome.runtime.sendMessage({ action: 'blockedPageLoaded' });

  // Shame Mode: 4 severity levels with escalating screens
  const shameScreens = {
    1: [
      {
        title: "You're in a work session.",
        subtitle: null,
        gifUrl: null,
        bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        animClass: 'fade-in'
      },
      {
        title: "Hey. Focus.",
        subtitle: "Your future self is counting on you right now.",
        gifUrl: null,
        bgGradient: 'linear-gradient(135deg, #5b6abf 0%, #6a4c93 100%)',
        animClass: 'fade-in'
      },
      {
        title: "Not now, champ.",
        subtitle: "The internet will survive without you for a bit.",
        gifUrl: null,
        bgGradient: 'linear-gradient(135deg, #4a69bd 0%, #6a5acd 100%)',
        animClass: 'fade-in'
      },
      {
        title: "Nope.",
        subtitle: "You literally just started. Come on.",
        gifUrl: null,
        bgGradient: 'linear-gradient(135deg, #546de5 0%, #7c5cbf 100%)',
        animClass: 'fade-in'
      }
    ],
    2: [
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
        title: "Your plants are judging you.",
        subtitle: "Even they have more discipline. They literally just sit there.",
        gifUrl: "https://media.giphy.com/media/l2JehQ2GitHGdVG9Y/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #4a266a 0%, #2d1b69 100%)',
        animClass: 'fade-in'
      }
    ],
    3: [
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
      }
    ],
    4: [
      {
        title: "DEFCON 1: TOTAL SHAME MELTDOWN",
        subtitle: "All shame levels activated. There is no recovery.",
        gifUrl: "https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #8b0000 0%, #4a0000 100%)',
        animClass: 'shake flash'
      },
      {
        title: "THIS IS WHO QUIT",
        subtitle: "Your future self is watching. They're not impressed.",
        gifUrl: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #5c0000 0%, #2a0000 100%)',
        animClass: 'shake flash'
      },
      {
        title: "WHAT ARE YOU EVEN DOING WITH YOUR LIFE?",
        subtitle: "The void stares back. The void is disappointed.",
        gifUrl: "https://media.giphy.com/media/l2JehQ2GitHGdVG9Y/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #17202a 0%, #0a0a0a 100%)',
        animClass: 'shake'
      },
      {
        title: "CONGRATULATIONS, YOU PLAYED YOURSELF",
        subtitle: "Every click was a choice. Every choice was wrong.",
        gifUrl: "https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #78281f 0%, #4a0e0e 100%)',
        animClass: 'shake flash'
      },
      {
        title: "YOUR RESUME JUST CRIED",
        subtitle: "LinkedIn is removing your profile as we speak.",
        gifUrl: "https://media.giphy.com/media/YJjvTqoRFgZaM/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #6e2c00 0%, #3c1800 100%)',
        animClass: 'shake'
      },
      {
        title: "EVEN YOUR WIFI IS ASHAMED",
        subtitle: "It's considering disconnecting itself out of principle.",
        gifUrl: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #4a235a 0%, #1a0a2e 100%)',
        animClass: 'shake flash'
      },
      {
        title: "ROCK BOTTOM HAS A BASEMENT",
        subtitle: "And you just found the elevator.",
        gifUrl: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #1b2631 0%, #0b0f14 100%)',
        animClass: 'shake'
      },
      {
        title: "ABSOLUTE MAXIMUM SHAME ACHIEVED",
        subtitle: "There is nothing left. Only disappointment. Forever.",
        gifUrl: "https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif",
        bgGradient: 'linear-gradient(135deg, #8b0000 0%, #000000 100%)',
        animClass: 'shake flash'
      }
    ]
  };

  const guiltQuotes = [
    { text: "Get back to work.", source: "Sun Tzu, probably" },
    { text: "YouTube will still be there later. Your deadline won't.", source: "Abraham Lincoln, allegedly" },
    { text: "Every minute on Reddit is a minute your future self hates you for.", source: "NASA Mission Control" },
    { text: "Your work session called. It misses you.", source: "Ancient Proverb" },
    { text: "Procrastination is the thief of time.", source: "Some guy on Twitter, 2018" },
    { text: "Focus is a superpower.", source: "Your bank account" },
  ];

  function getShameLevel(attempts) {
    if (attempts <= 2) return 1;
    if (attempts <= 4) return 2;
    if (attempts <= 6) return 3;
    return 4;
  }

  chrome.storage.local.get(['shameLevel', 'lastShameIndex'], (result) => {
    const attempts = (result.shameLevel || 0) + 1;
    const lastIndex = result.lastShameIndex || {};
    chrome.storage.local.set({ shameLevel: attempts });
    const level = getShameLevel(attempts);
    renderShameScreen(level, attempts, lastIndex);
  });

  function pickNonRepeating(screens, lastIndex, level) {
    const prev = lastIndex[level];
    if (screens.length <= 1) return 0;
    let idx;
    do {
      idx = Math.floor(Math.random() * screens.length);
    } while (idx === prev);
    return idx;
  }

  function renderShameScreen(level, attempts, lastIndex) {
    const container = document.querySelector('.container');
    const screens = shameScreens[level];
    const idx = pickNonRepeating(screens, lastIndex, level);
    const screen = screens[idx];

    // Persist which screen we showed so we don't repeat it next time
    lastIndex[level] = idx;
    chrome.storage.local.set({ lastShameIndex: lastIndex });

    document.body.style.background = screen.bgGradient;

    let html = '';
    const levelLabels = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH', 4: 'MAXIMUM' };
    const levelColors = { 1: '#667eea', 2: '#f093fb', 3: '#ff4757', 4: '#ff0000' };
    html += `<div class="shame-badge ${screen.animClass}" style="color: ${levelColors[level]}; border-color: ${levelColors[level]}">SHAME LEVEL ${level}: ${levelLabels[level]}</div>`;

    if (level >= 3) {
      html += `<h1 class="impact ${screen.animClass}">${screen.title}</h1>`;
    } else {
      html += `<h1 class="dramatic ${screen.animClass}">${screen.title}</h1>`;
    }

    if (screen.gifUrl) {
      html += `<img src="${screen.gifUrl}" alt="Shame GIF" class="shame-gif ${screen.animClass}">`;
    }

    if (screen.subtitle === null) {
      // Pick a non-repeating quote too
      const prevQuote = lastIndex['quote'];
      let qIdx;
      do {
        qIdx = Math.floor(Math.random() * guiltQuotes.length);
      } while (qIdx === prevQuote && guiltQuotes.length > 1);
      lastIndex['quote'] = qIdx;
      chrome.storage.local.set({ lastShameIndex: lastIndex });
      const quote = guiltQuotes[qIdx];
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
}
