1. starting a manual session with a break list that has all sites/apps set to productive -> the work timer increments.
2. Stop session, both timers pause
3. If you go to settings and create a list, it should have a section to add break sites and break apps, and productive sites and productive apps. If you add an item to each, the ui should change to inidicated that that site is selected/added.
4. starting a manual session with a break list that has certain sites set to productive -> the work timer increments, but the productivty timer increments only when the user is focused on a tab set to productive, or a app set to productive.
5. In a work session, if you try to visit a break site, you get a shame screen. If you reload that page then the number of break attempts should go up, and the shame level should go up too.
6. In a work session, if you try to visit a break app, it should not open.
7. For nuclear block, if you add youtube.com for first cooldown = 10s AND second cooldown = 5s, then for add exception you add 'https://www.youtube.com/@javascriptmastery' and click 'add' the ui should change to indicate that site was added as an exception. Then if you click 'add to nuclear block' the ui should change and the countdown should begin.
8. During that nuclear block if the user trys visiting the site, the user should be redirectd to the nuclear block page.
9. Once the first cooldown is done, the settings page > nuclear block section should change where there is now an 'unlock' button as well as a 'block again' button and a dropdown for how long you would block it again for if you wanted to.
10. If the user clicks sets it to 10s, and clicks 'block again' then the first cooldown restarts.
11. visit youtube.com and it should redirect to the nuclear block screen
12. Visit https://www.youtube.com/@javascriptmastery and it should be allowed
13. Visit 'https://www.youtube.com/watch?v=I1V9YWqRIeI&t=1195s' which is a video by @javascriptmastery, and it should be allowed.
14. Wait for that 10s to finish, then the unlock button and block again button with the dropdown should appear. If you click 'unlock' then the second cooldown begins and the ui changes indiciating how long until it can be unlocked. In this case it should be 5s
15. Once the second cooldown is up, the user should be redirected to the last change screen. The dropdown to block again should have a test option for 10 seconds, and once the user selects that option and clicks 'block again' they should be redirected to the page that encourages them.
16. In settings wait for the first cooldown of 10s to finish, click unblock, then wait 5s.
17. visit youtube.com and you should be on the last change page. Click 'unblock now' and it should make you type in that phrase. Once you click submit, it should take you to the nuclear-block-choice page.
18. In a new tab, open youtube, it should not be blocked.
19. Go to settings > nuclear block. Youtube should not be a selected anymore.
20. go back to the nuclear-block-choice page. Under the 'was this a mistake' section click 'block again'. This should redirect you to the encouraging page.
21. Try opening youtube. it should redirect you to the nuclear block page.
22. go back to settings. nuclear block should still be there.
23. On settings, create a list with break-sites='draftkings.com', break-apps='steam', productive-sites-apps are all. Save list.
24. Still on settings, set it for 1 min of productive time equals one min of break time, and turn strict mode on.
25. On the homepage, select that list and start a work session. Since you're in strict mode. The end session button should be unclickable.
26. after 1 min, confetti should appear and the break time should increment by 1 minute.
27. There should be a button that is now clickable which says 'take a break'
28. Open a break site like draftkings.com. It should redirect to a shame screen.
29. Go back to the brainrot blocker homepage and click 'take a break'. The ui of the break minutes should change and say something like 'Switch to a break site to use your break minutes.'
30. then switch to a break site like draftkings.com. Wait 10 seconds. Go back to the homepage and the reward should have counted down by about 10 seconds and paused (since you are no longer on a break site).
31. try opening a blocked application like steam. when focused on it, the timer should be counting down.
32. Go back to draftkings.com and wait 55 seconds. Once the break time is up, the page should redirect to a 'break time up' screen without the page even having to reload. And steam should be closed automatically too.
