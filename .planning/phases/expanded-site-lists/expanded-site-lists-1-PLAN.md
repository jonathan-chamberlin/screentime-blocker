---
phase: expanded-site-lists
plan: 1
type: execute
total_waves: 2
total_tasks: 3
requirements_covered: []
files_modified: [extension/constants.js, extension/tests/integration-test.js]
---

# Plan: Expanded Site Lists — Plan 1

## Objective
Add comprehensive default blocked sites across 5 categories (social media, video platforms, news, shopping, gaming) and create a Music & Production category for productive sites to help users quickly configure their work environment.

## Context
- **Project**: Brainrot Blocker Chrome extension with work/reward timer system
- **Phase goals**: Expand default site lists to include 10-15 sites per category; add music production productive sites
- **Prerequisites**: Phase 7 (ai-readability-refactor) complete with modular constants.js
- **Key decisions**:
  - Add 10-15 sites per blocked category
  - Music production includes DAWs, streaming platforms, learning sites
  - All sites use domain-only matching (strip www. prefix)

## Wave 1 — Add Site Data

<task type="auto">
  <name>Add expanded blocked sites to constants.js</name>
  <files>extension/constants.js</files>
  <action>
Add 10-15 sites to each category in DEFAULTS.rewardSites array:

**Social Media**: facebook.com, instagram.com, twitter.com, x.com, tiktok.com, snapchat.com, linkedin.com, pinterest.com, tumblr.com, reddit.com, discord.com, telegram.org, whatsapp.com, messenger.com

**Video Platforms**: youtube.com, twitch.tv, vimeo.com, dailymotion.com, netflix.com, hulu.com, disneyplus.com, primevideo.com, hbomax.com, peacocktv.com, paramountplus.com, crunchyroll.com

**News**: cnn.com, bbc.com, nytimes.com, theguardian.com, washingtonpost.com, foxnews.com, reuters.com, apnews.com, nbcnews.com, bloomberg.com, wsj.com, usatoday.com

**Shopping**: amazon.com, ebay.com, etsy.com, walmart.com, target.com, bestbuy.com, aliexpress.com, wish.com, shein.com, zappos.com, wayfair.com, overstock.com

**Gaming**: steampowered.com, epicgames.com, roblox.com, minecraft.net, twitch.tv, ign.com, gamespot.com, polygon.com, kotaku.com, pcgamer.com, ea.com, ubisoft.com

Keep existing sites (youtube.com, reddit.com, instagram.com already in list). Remove duplicates.
  </action>
  <verify>grep -c "rewardSites" extension/constants.js</verify>
  <done>DEFAULTS.rewardSites contains 50+ domains across all categories, no duplicates</done>
</task>

<task type="auto">
  <name>Add music production productive sites to constants.js</name>
  <files>extension/constants.js</files>
  <action>
Add new music/production category to DEFAULTS.productiveSites array:

**Music & Production**:
- DAWs/Tools: ableton.com, image-line.com (FL Studio), apple.com/logic-pro, native-instruments.com, izotope.com, waves.com, fab-filter.com, arturia.com
- Streaming/Reference: spotify.com, soundcloud.com, bandcamp.com, beatport.com
- Learning: syntorial.com, sonicacademy.com, pointblankmusicschool.com, producertech.com, masterclass.com (music), coursera.org (music production courses)

Format as array of domain strings (no www. prefix). Add clear comment labeling this category.
  </action>
  <verify>grep "Music & Production" extension/constants.js</verify>
  <done>DEFAULTS.productiveSites includes 15+ music/production domains with category comment</done>
</task>

## Wave 2 — Verification

<task type="auto">
  <name>Update tests to handle expanded site lists</name>
  <files>extension/tests/integration-test.js</files>
  <action>
Update integration tests that reference site lists:
- Tests that check DEFAULTS.rewardSites.length should use >= assertions instead of exact counts
- Add a test that verifies no duplicate domains in rewardSites
- Add a test that verifies all domains are formatted correctly (no www., no http://)

Example:
```javascript
// Test: No duplicate blocked sites
const uniqueSites = new Set(DEFAULTS.rewardSites);
assert(uniqueSites.size === DEFAULTS.rewardSites.length, 'No duplicate blocked sites');

// Test: All sites formatted correctly
DEFAULTS.rewardSites.forEach(site => {
  assert(!site.startsWith('www.'), `${site} should not include www.`);
  assert(!site.startsWith('http'), `${site} should not include protocol`);
});
```
  </action>
  <verify>open extension/tests/integration-test.html in Chrome and check console for all passing tests</verify>
  <done>All tests pass, duplicate and format checks added and passing</done>
</task>

## Success Criteria
- DEFAULTS.rewardSites contains 50+ domains across social media, video, news, shopping, gaming
- DEFAULTS.productiveSites includes 15+ music/production domains
- No duplicate domains in any list
- All domains formatted without www. or protocol
- All existing tests still pass
- URL matching logic works for all new sites (manual verification: add a new site, start session, verify blocked)
