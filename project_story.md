# Assignment

Project Story
* About the project
Be sure to write what inspired you, what you learned, how you built your project, and the challenges you faced.

# Response below

## Inspiration

This started with a simple, uncomfortable realization. I don't have a motivation problem. I have a YouTube problem.

I'd sit down to work with full intention to focus, open one "quick" video, and lose 30 to 60 minutes without noticing. Twice a day, that adds up to roughly 2 hours lost. Over a year, that's over 700 hours, the equivalent of 18 full-time workweeks gone to distraction.

Most site blockers are passive. They quietly block a page and hope willpower does the rest. But I've toggled those off within seconds. I wanted something that actually enforces commitment, escalates emotionally when you try to cheat, and makes focus measurable and competitive.

That's why I built Brainrot Blocker, a site blocker that fights back.

## What it does

Brainrot Blocker is a Chrome extension that turns focus into a structured contract with escalating consequences.

* Click "Lock In" to start a timed work session. Reward sites (YouTube, Reddit, Instagram, etc.) instantly block.
* The work timer only counts when you're on a productive tab. Switching to Slack or email pauses it.
* Every 50 minutes of real productive work earns 10 minutes of reward time (configurable).
* Reward time can be "burned" with a countdown that only ticks on reward sites. You can pause it, bank it, and use it later.
* If you try to visit a blocked site, the extension escalates through 4 levels of shame, from "Hey. Focus." to "DEFCON 1: TOTAL SHAME MELTDOWN" with GIFs of dramatic chipmunks, Elmo screaming, and asteroids hitting Earth.
* A competitive leaderboard ranks users by total productive minutes and how many times they tried to slack off.
* Strict Mode locks you in. You literally can't end your session until you hit the work threshold.
* If you want to end a work session early, you can configure it so you have to donate to a charity of your choice, or a charity you hate, to motivate you to keep working even more.

## How we built it

I built Brainrot Blocker solo during HackBeanpot, a 36-hour hackathon at Northeastern.

The extension runs on Chrome's Manifest V3 architecture. A background service worker manages all session state, timers, and blocking rules. I used the declarativeNetRequest API to redirect blocked sites to a shame page, with rule priorities handling allowed exceptions (like letting youtube.com/@Veritasium through while blocking the rest of YouTube).

The timers are tab-dependent. The background worker monitors which tab is active and only accumulates seconds when you're on the right kind of site. I used a flush-and-snapshot pattern to avoid drift between the popup UI and background state.

The backend runs Node.js and Express with Auth0 for Google OAuth. The leaderboard API is JWT-secured. The backend API is functional but was not fully integrated with the extension frontend within the hackathon timeframe.

I built the UI from scratch in vanilla JavaScript and CSS. It has a dark theme, Space Grotesk font, neon green and orange accents, animated confetti when you earn rewards, and a settings page that locks itself during active sessions so you can't cheat.

## Challenges we ran into

Manifest V3 service workers are stateless. They can be killed at any time, so every piece of session state had to be persisted to chrome.storage.local and restored on wake. That meant converting 20+ callback-based storage operations to async/await wrappers.

Tab-dependent timers are tricky. I had to make sure the work timer only counted productive time and the reward timer only counted time on reward sites. I tracked the active tab, flushed elapsed seconds on every tab switch, and handled edge cases like the user closing Chrome mid-session. I had 9 duplicated timer-flushing patterns before refactoring them into a shared utility.

As the codebase grew, fixes started breaking other things. I was using Claude Code as my AI coding assistant, and every time I asked it to change one feature, something unrelated would stop working. The root cause was that constants, storage calls, and timer logic were duplicated across four or five files with no shared source of truth. So I had Claude do a full refactor, pulling shared defaults into a constants module, wrapping all chrome.storage calls in async utilities, and centralizing timer-flushing logic. After the refactor, changes stayed contained and stopped cascading.

I also discovered a rounding bug in the reward banking system during testing. Reward time was stored in minutes, which meant pausing with 1:30 left and resuming gave you 2:00. I switched everything to seconds-based storage, which taught me to question unit assumptions early.

Preventing mid-session cheating required locking everything. Users could change their blocked sites list, lower the work threshold, or toggle strict mode off mid-session. I added data-lockable attributes to settings sections and disabled all inputs during active sessions.

## Accomplishments that we're proud of

I built a full stack working app that solves a real problem in a robust and customizable way. The extension, backend, and UI all work together, and the whole system is configurable enough that different people can set it up for how they actually work.

Multiple hackathon mentors loved the shame screens that appear when you try to visit a blocked site during a work session. People genuinely laughed and then immediately asked if they could install it.

Building my first Chrome extension and getting a background service worker, popup UI, settings page, leaderboard, and dynamic site blocking all working together in a single hackathon was a personal milestone.

The UI was designed and built from scratch with no frameworks, just vanilla JavaScript and CSS with a cohesive dark theme.

## What we learned

Distraction is behavioral. A simple popup saying "this site is blocked" doesn't work because there's no emotional cost to dismissing it. Escalating shame, especially humor-based shame, creates a genuine moment of self-awareness that a static message can't.

Public accountability changes behavior. Adding a leaderboard that tracks both productive minutes and slack attempts means users aren't just competing to work more. They're also competing to resist temptation. That dual metric makes the competition feel honest.

Building solo forces ruthless prioritization. I chose to go deep on two differentiating features, shame escalation and competitive leaderboards, rather than building a broader but shallower product. That tradeoff was the right one.

I'd architect the timer system differently next time. I'd have started with an abstraction layer for timer-flushing logic instead of scattering it across the codebase, which cost hours in debugging.

## What's next for Brainrot Blocker

* Connect the frontend leaderboard to the backend API that was built during the hackathon
* Add streak tracking, consecutive days of hitting your work target
* Add team-based competitions so friend groups can shame each other
* Deploy publicly on the Chrome Web Store and measure retention
* Explore a behavioral analytics dashboard showing distraction patterns over time
* Accept and send real payments when you end a session early
