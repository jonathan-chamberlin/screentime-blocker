# Demo Video Script (5 minutes)

## HOOK (0:00–0:20)

"You ever sit down at your laptop, ready to lock in and get a lot of work done — and then three hours later you realize you've wasted it doomscrolling youtube?"

Pause. Let it land.

"That was me last Tuesday. I had my assignments open, my notes ready, everything. And then I opened one video. And it was over."

"YouTube was my problem. Have you ever had that problem?"

---

## THE PROBLEM (0:20–1:00)

"I can do the work. I sit down at my laptop and I actually get stuff done — for a while. But the second I need a quick break, I open a new tab. YouTube. Reddit. Instagram. And the algorithm takes over."

"One video turns into ten. A five-minute break turns into an hour. You look up and it's 11 PM and you haven't touched your assignment."

"So let's do the math. Two hours a day — that's 700 hours a year. 18 full weeks of full-time work. Gone. Not on your phone — on your laptop, the thing you actually do your work on."

"I tried site blockers. Cold Turkey. StayFocusd. They pop up a little message that says 'this site is blocked.' I toggled it off in three seconds and went right back to the video. No friction. No consequence."

---

## THE SOLUTION (1:00–1:15)

"So I built Brainrot Blocker — a site blocker that actually fights back."

"It blocks your distracting sites, shames you when you try to cheat, rewards you when you actually work, and puts your focus on a public leaderboard so your friends can see exactly how disciplined you are — or aren't."

---

## LIVE DEMO (1:15–3:00)

### Default State
"So here's the extension. Dark UI, super clean — I built this from scratch, no frameworks, just vanilla JavaScript and CSS. You set your ratio — say 50 minutes of work earns you 10 minutes of reward time. Then you lock in."

> [Show the extension in default state]

### Work Mode
"Now I'm locked in. Timer's running. But watch this — if I switch to Slack, the timer pauses. Can't cheat by opening docs in the background and scrolling Reddit. It actually tracks which tab you're on."

> [Show the extension in work mode, timer counting. Optionally show timer pausing on a non-productive tab.]

"And look — the button says 'Quit Early (Coward)' instead of 'End Session.' Yeah. Shameless design choice."

### Shame Escalation
"Now watch what happens when I try to open YouTube."

> [Navigate to YouTube — get redirected to shame screen]

"Level 1. 'Hey. Focus. Your future self is counting on you.' Okay, gentle enough. Let me try again."

> [Try again — Level 2]

"'Your plants are judging you. Even they have more discipline. They literally just sit there.' Yeah, now it's personal."

> [Try again — Level 3]

"'THE CROWD WATCHES IN HORROR. Everyone can see your browser history.' Ouch."

> [Try again — Level 4]

"And then... 'ABSOLUTE MAXIMUM SHAME ACHIEVED. There is nothing left. Only disappointment. Forever.' Nuclear explosion GIF and all. Every attempt is logged. It's all there."

### Earning and Burning Rewards
"But it's not all punishment. When you finish your work block, you get confetti, and your reward minutes bank up."

> [Show the reward earned state with confetti]

"Then you can burn those minutes on your reward sites. The countdown only ticks while you're actually on YouTube. You can pause it, save it, come back later. You earned that break."

> [Show reward burn mode — timer counting down on YouTube]

### Leaderboard
"Then there's the leaderboard. It ranks you by total productive minutes and how many times you tried to cheat. So you're competing with your friends on two fronts — who works more and who actually has discipline."

> [Show leaderboard]

---

## HOW I BUILT IT (3:00–3:45)

"This runs on Chrome's Manifest V3. A background service worker manages all the session state, timers, and blocking rules. I used the declarativeNetRequest API to redirect blocked sites to the shame pages — with rule priorities so I can allow specific channels like Veritasium through while still blocking the rest of YouTube."

"The timers are tab-dependent. The background worker tracks which tab is active and only accumulates seconds when you're on the right kind of site. Every tab switch flushes the elapsed time and snapshots the new state — that's how the timer stays accurate even if Chrome kills the service worker."

"The backend is Node.js and Express with Auth0 for Google OAuth. The leaderboard API is JWT-secured. Data lives in a simple JSON file — I know that doesn't scale and concurrent requests could corrupt it. For a solo 36-hour hackathon it works, but a production version would use a real database. Right now the extension sends productive-minute counts to the backend and the server trusts the client — for a real product I'd add server-side validation, but for a hackathon MVP the leaderboard's value is in honest self-reporting."

> [Optionally show a brief architecture diagram: Extension <-> Background Service Worker <-> Backend API <-> JSON DB]

---

## WHAT I LEARNED (3:45–4:15)

"This was my first Chrome extension. I went in cold on Manifest V3 and hit a wall immediately — service workers kill themselves at random, and any unsaved state is gone. I had to rebuild the session logic three times before I understood that every piece of state needed to live in chrome.storage. That meant converting over 20 callback-based storage operations to async/await wrappers. It was brutal, but it forced me to actually understand the platform instead of just copying from StackOverflow."

"I also had a bug where reward time was stored in minutes, so pausing at 1:30 and resuming gave you 2:00. I switched everything to seconds-based storage. Small bug, but it taught me to question unit assumptions early."

"By the end I had timer-flushing logic duplicated across five files. Things started breaking each other. So I refactored everything into shared modules — constants, storage utilities, timer logic — and after that, changes stopped cascading."

---

## WHY IT MATTERS + CLOSE (4:15–5:00)

"The reason I built this instead of using an existing blocker is that a polite popup saying 'site blocked' has zero emotional weight. You dismiss it and move on. But when a nuclear explosion GIF tells you you've achieved maximum shame — you actually stop and laugh at yourself. That moment of self-awareness is what gets you to close the tab."

"The leaderboard adds real accountability. When your friends can see you tried to open Reddit six times during a study session, you think twice next time."

"If I can get back even one hour a day, that's 365 hours a year. That's enough time to build a whole side project, or just sleep more. Either way, I'm not losing it to the YouTube algorithm anymore."

"Brainrot Blocker. Lock in, earn your breaks, and get roasted if you don't."

"I built this solo in 36 hours because I was tired of losing to my own attention span. And honestly — I could have used it while building it."

"So if you've ever looked up from your laptop at midnight and wondered where the day went — this is for you."
