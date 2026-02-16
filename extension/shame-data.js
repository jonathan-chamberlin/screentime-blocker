// Shame screen data — extracted from blocked.js for maintainability
// Modify screens/quotes here without touching rendering logic

const SHAME_SCREENS = {
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
      gifUrl: "https://media.giphy.com/media/uEyF6LYS00kjuctIR7/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
      animClass: 'fade-in'
    },
    {
      title: "Your grandmother is disappointed.",
      subtitle: "She bragged about you to her friends...",
      gifUrl: "https://media.giphy.com/media/JxETDJzJlrUoMnKPmv/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #6c3483 0%, #5b2c6f 100%)',
      animClass: 'fade-in'
    },
    {
      title: "Even this puppy can't believe it.",
      subtitle: "Look what your procrastination did.",
      gifUrl: "https://media.giphy.com/media/Ci3nCVx952lfG/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      animClass: 'fade-in'
    },
    {
      title: "Your plants are judging you.",
      subtitle: "Even they have more discipline. They literally just sit there.",
      gifUrl: "https://media.giphy.com/media/vvCyAToak6KIzg93P9/giphy.gif",
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
      animClass: 'fade-in'
    },
    {
      title: "DROP AND GIVE ME 50 MINUTES!",
      subtitle: "Did I say you could take a break, recruit?!",
      gifUrl: "https://media.giphy.com/media/eSQiwbVrb7Nmg/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #1a5276 0%, #154360 100%)',
      animClass: 'fade-in'
    },
    {
      title: "THE CROWD WATCHES IN HORROR",
      subtitle: "Everyone can see your browser history.",
      gifUrl: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #7b241c 0%, #641e16 100%)',
      animClass: 'fade-in'
    },
    {
      title: "YOUR PRODUCTIVITY, LITERALLY",
      subtitle: "This is your potential going up in flames.",
      gifUrl: "https://media.giphy.com/media/YJjvTqoRFgZaM/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #b7950b 0%, #7d6608 100%)',
      animClass: 'fade-in'
    }
  ],
  4: [
    {
      title: "DEFCON 1: TOTAL SHAME MELTDOWN",
      subtitle: "All shame levels activated. There is no recovery.",
      gifUrl: "https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #8b0000 0%, #4a0000 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "ELMO HAS SEEN WHAT YOU'VE DONE",
      subtitle: "He will never be the same. Look at him. LOOK.",
      gifUrl: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #cc0000 0%, #4a0000 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "YOUR PRODUCTIVITY: A LIVE REENACTMENT",
      subtitle: "Directed by you. Starring your wasted potential.",
      gifUrl: "https://media.giphy.com/media/yr7n0u3qzO9nG/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #5c0000 0%, #2a0000 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "LITERAL DUMPSTER FIRE ACHIEVED",
      subtitle: "Your work session has been formally classified as a dumpster fire.",
      gifUrl: "https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #6e2c00 0%, #3c1800 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "AN ASTEROID JUST HIT YOUR FOCUS",
      subtitle: "Extinction-level procrastination event detected.",
      gifUrl: "https://media.giphy.com/media/YQPVI7u1Cue1W/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #17202a 0%, #0a0a0a 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "TWO PLANETS COLLIDED",
      subtitle: "And they still got more done than you today.",
      gifUrl: "https://media.giphy.com/media/ydMNTWYVjSEFi/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #4a235a 0%, #1a0a2e 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "DRAMATIC CHIPMUNK JUDGES YOU",
      subtitle: "He turned around. He saw your screen time. He will never recover.",
      gifUrl: "https://media.giphy.com/media/kKdgdeuO2M08M/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #1b2631 0%, #0b0f14 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "YOUR WORKFLOW STRUCTURAL INTEGRITY: ZERO",
      subtitle: "Controlled demolition would have been more graceful than this.",
      gifUrl: "https://media.giphy.com/media/nGDij7nz84qFQL3xtU/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #7b241c 0%, #641e16 100%)',
      animClass: 'fade-in flash'
    },
    {
      title: "ROCK BOTTOM HAS A BASEMENT",
      subtitle: "And you just found the elevator.",
      gifUrl: "https://media.giphy.com/media/3sAW43kLFbCVl2Pgpx/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #1b2631 0%, #0b0f14 100%)',
      animClass: 'fade-in'
    },
    {
      title: "ABSOLUTE MAXIMUM SHAME ACHIEVED",
      subtitle: "There is nothing left. Only disappointment. Forever.",
      gifUrl: "https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif",
      bgGradient: 'linear-gradient(135deg, #8b0000 0%, #000000 100%)',
      animClass: 'fade-in flash'
    }
  ]
};

const GUILT_QUOTES = [
  { text: "Get back to work.", source: "Sun Tzu, probably" },
  { text: "YouTube will still be there later. Your deadline won't.", source: "Abraham Lincoln, allegedly" },
  { text: "Every minute on Reddit is a minute your future self hates you for.", source: "NASA Mission Control" },
  { text: "Your work session called. It misses you.", source: "Ancient Proverb" },
  { text: "Procrastination is the thief of time.", source: "Some guy on Twitter, 2018" },
  { text: "Focus is a superpower.", source: "Your bank account" },
];

const SHAME_LEVEL_LABELS = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH', 4: 'MAXIMUM' };
const SHAME_LEVEL_COLORS = { 1: '#667eea', 2: '#f093fb', 3: '#ff4757', 4: '#ff0000' };

const SHAME_THRESHOLDS = { LOW: 2, MEDIUM: 4, HIGH: 6 };

function getShameLevel(attempts) {
  if (attempts <= SHAME_THRESHOLDS.LOW) return 1;
  if (attempts <= SHAME_THRESHOLDS.MEDIUM) return 2;
  if (attempts <= SHAME_THRESHOLDS.HIGH) return 3;
  return 4;
}
