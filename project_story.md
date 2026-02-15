# Assignment

Project Story
* About the project
Be sure to write what inspired you, what you learned, how you built your project, and the challenges you faced.

# Response below

## Inspiration

This started with a simple, uncomfortable realization: I don't have a motivation problem — I have a YouTube problem.

I'd sit down to work with full intention to focus, open one "quick" video, and lose 30–60 minutes without noticing. Twice a day, that adds up to roughly 2 hours lost. Over a year, that's over 700 hours — the equivalent of 18 full-time workweeks gone to distraction.

Most site blockers are passive. They quietly block a page and hope willpower does the rest. But I've toggled those off within seconds. I wanted something that actually enforces commitment, escalates emotionally when you try to cheat, and makes focus measurable and competitive.

So I built Brainrot Blocker, a site blocker that fights back.

---

## What it does

Brainrot Blocker is a Chrome extension that turns focus into a structured contract with escalating consequences.

* Click **"Lock In"** to start a timed work session — reward sites (YouTube, Reddit, Instagram, etc.) instantly block
* The work timer only counts when you're on a productive tab — switching to Slack or email pauses it
* Every 50 minutes of real productive work earns 10 minutes of reward time (configurable)
* Reward time can be "burned" with a countdown that only ticks on reward sites — you can pause it, bank it, and use it later
* If you try to visit a blocked site, the extension escalates through 4 levels of shame — from "Hey. Focus." to "DEFCON 1: TOTAL SHAME MELTDOWN" with GIFs of dramatic chipmunks, Elmo screaming, and asteroids hitting Earth
* A competitive leaderboard ranks users by total productive minutes and how many times they tried to slack off
* Strict Mode locks you in — you literally can't end your session until you hit the work threshold

The net effect is that a 4-hour work session actually yields 4 hours of focused output, with earned break time you can spend guilt-free.

---

## How we built it

I built Brainrot Blocker solo during HackBeanpot, a 36-hour hackathon at Northeastern.

The extension runs on Chrome's Manifest V3 architecture with a background service worker managing all session state, timers, and blocking rules. I used the `declarativeNetRequest` API to dynamically redirect blocked sites to a custom shame page, with rule priorities handling allowed exceptions (like letting `youtube.com/@Veritasium` through while blocking the rest of YouTube).

The timers are tab-dependent: the background worker monitors which tab is active and only accumulates seconds when the user is actually on the right kind of site. This required a flush-and-snapshot pattern to avoid drift between the popup UI and background state.

The backend is Node.js + Express with Auth0 for Google OAuth and a JWT-secured leaderboard API. The backend API is functional but was not fully integrated with the extension frontend within the hackathon timeframe.

I built the UI entirely from scratch in vanilla JavaScript and CSS: dark theme, Space Grotesk font, neon green and orange accents, animated confetti when you earn rewards, and a settings page that locks itself during active sessions so you can't cheat.

---

## Challenges we ran into

**Manifest V3 service workers are stateless.** Unlike background pages in MV2, service workers can be killed at any time. Every piece of session state had to be persisted to `chrome.storage.local` and restored on wake, which meant converting 20+ callback-based storage operations to async/await wrappers.

**Tab-dependent timers are harder than they sound.** The work timer should only count productive time, and the reward timer should only count time on reward sites. Getting this right meant tracking the active tab, flushing elapsed seconds on every tab switch, and handling edge cases like the user closing Chrome mid-session. I ended up with 9 duplicated timer-flushing patterns before refactoring them into a shared utility.

**The popup and background fight over state.** The popup polls the background every second for fresh status, but if the popup sends a command (like "start session") and immediately polls, the state might not have updated yet. I had to carefully sequence message handlers to ensure the response reflects the action that was just taken.

**Preventing mid-session cheating required locking everything.** Users could change their blocked sites list, lower the work threshold, or toggle strict mode off during a session. I had to add `data-lockable` attributes to settings sections and disable all inputs when a session is active.

---

## Accomplishments that we're proud of

Multiple hackathon mentors loved the shame screens that appear when you try to visit a blocked site during a work session. That reaction confirmed that the emotional escalation concept works — people genuinely laughed and then immediately asked if they could install it.

This was my first Chrome extension. Getting a background service worker, popup UI, settings page, leaderboard, and dynamic site blocking all working together in a single hackathon was a personal milestone. I also discovered and fixed a rounding bug in the reward banking system during testing — reward time was stored in minutes, which meant pausing with 1:30 left and resuming gave you 2:00. I switched everything to seconds-based storage, which taught me to question unit assumptions early.

The UI was designed and built entirely from scratch with no frameworks — just vanilla JavaScript and CSS with a cohesive dark theme.

---

## What we learned

**Distraction is behavioral, not technical.** A simple popup saying "this site is blocked" doesn't work because there's no emotional cost to dismissing it. Escalating shame — especially humor-based shame — creates a genuine moment of self-awareness that a static message can't.

**Public accountability changes behavior.** Adding a leaderboard that tracks both productive minutes *and* slack attempts means users aren't just competing to work more — they're competing to resist temptation. That dual metric makes the competition feel honest.

**Building solo forces ruthless prioritization.** I chose to go deep on two differentiating features — shame escalation and competitive leaderboards — rather than building a broader but shallower product. That tradeoff was the right one.

**I'd architect the timer system differently next time.** I ended up with duplicated timer-flushing logic scattered across the codebase before refactoring it into shared utilities. Starting with that abstraction layer would have saved hours of debugging.

---

## What's next for Brainrot Blocker

* Connect the frontend leaderboard to the backend API that was built during the hackathon
* Add streak tracking — consecutive days of hitting your work target
* Add team-based competitions so friend groups can shame each other
* Deploy publicly on the Chrome Web Store and measure retention
* Explore a behavioral analytics dashboard showing distraction patterns over time

The goal is to make Brainrot Blocker something people actually keep installed after the hackathon.
