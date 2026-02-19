// Usage page — loads data once on page open, renders charts and metrics

document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');
  const realData = await loadRealData();
  let showingTest = false;

  const onToggle = () => {
    showingTest = !showingTest;
    renderPage(content, showingTest ? generateTestData() : realData, onToggle);
  };

  renderPage(content, realData, onToggle);
});

async function loadRealData() {
  const result = await getStorage(['sessionHistory', 'dailySummaries', 'streakData']);
  return {
    history: result.sessionHistory || [],
    summaries: result.dailySummaries || {},
    streakData: result.streakData || { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  };
}

function renderPage(content, { history, summaries, streakData }, onToggleTest) {
  content.innerHTML = '';

  // Test data toggle button
  const toggle = document.createElement('button');
  toggle.textContent = history.length > 0 && history[0].sessionId?.startsWith('test-') ? 'Show Real Data' : 'Show Test Data';
  toggle.style.cssText = 'background: rgba(255,255,255,0.06); color: #888; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 16px; font-size: 12px; cursor: pointer; font-family: inherit; margin-bottom: 16px;';
  toggle.addEventListener('click', onToggleTest);
  content.appendChild(toggle);

  if (history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="empty-icon">📊</div><p>No usage data yet. Complete your first session to start tracking!</p>`;
    content.appendChild(empty);
    return;
  }

  const displayStreak = computeDisplayStreak(streakData);
  const metrics = computeMetrics(history, summaries, streakData, displayStreak);

  content.appendChild(renderStreakBanner(displayStreak, streakData.longestStreak));
  content.appendChild(renderWeekComparison(metrics));
  content.appendChild(renderProductiveHeatmap(summaries));
  content.appendChild(renderBlockedHeatmap(summaries));
  content.appendChild(renderBlockedTrend(summaries));
  content.appendChild(renderTopBlockedSites(history));
  content.appendChild(renderDailyMinutes(summaries));
  content.appendChild(renderStatsGrid(metrics));
  content.appendChild(renderDayOfWeek(summaries));
  content.appendChild(renderAvgSession(metrics));
}

function computeDisplayStreak(streakData) {
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  if (streakData.lastActiveDate && streakData.lastActiveDate !== today && streakData.lastActiveDate !== yesterday) {
    return 0;
  }
  return streakData.currentStreak;
}

function computeMetrics(history, summaries, streakData, displayStreak) {
  const totalSessions = history.length;
  const totalProductiveMs = history.reduce((sum, s) => sum + s.productiveMillis, 0);
  const totalHours = totalProductiveMs / 1000 / 60 / 60;
  const completedSessions = history.filter(s => !s.endedEarly).length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalProductiveMs / 1000 / 60 / totalSessions) : 0;

  // Weekly comparison
  const now = new Date();
  const startOfThisWeek = getStartOfWeek(now);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400000);

  let thisWeekMinutes = 0;
  let lastWeekMinutes = 0;

  for (const [dateStr, day] of Object.entries(summaries)) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d >= startOfThisWeek) {
      thisWeekMinutes += day.totalProductiveMinutes;
    } else if (d >= startOfLastWeek && d < startOfThisWeek) {
      lastWeekMinutes += day.totalProductiveMinutes;
    }
  }

  return {
    totalSessions,
    totalHours,
    completionRate,
    avgSessionMinutes,
    thisWeekMinutes,
    lastWeekMinutes,
  };
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start of week
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Test data generator (pure) ---

function generateTestData() {
  const domains = ['youtube.com', 'reddit.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'netflix.com', 'twitch.tv', 'facebook.com'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Seed-able pseudo-random for consistent test data
  const seed = 42;
  const rand = mulberry32(seed);

  const history = [];
  const summaries = {};

  // Generate 6 months of daily data
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString('en-CA');

    // ~70% chance of having a session on any given day
    if (rand() > 0.7) continue;

    const sessionsToday = rand() > 0.7 ? 2 : 1;
    let dayMinutes = 0;
    let dayBlocked = 0;
    const dayBlockedDomains = {};

    for (let s = 0; s < sessionsToday; s++) {
      const productiveMinutes = Math.floor(rand() * 90) + 10; // 10–100 min
      const blockedAttempts = rand() > 0.4 ? Math.floor(rand() * 15) : 0;
      const endedEarly = rand() > 0.8;

      // Pick 1-3 random domains for blocked attempts
      const sessionBlockedDomains = {};
      let remaining = blockedAttempts;
      const shuffled = [...domains].sort(() => rand() - 0.5).slice(0, Math.ceil(rand() * 3));
      shuffled.forEach((domain, idx) => {
        const count = idx === shuffled.length - 1 ? remaining : Math.floor(rand() * remaining);
        if (count > 0) {
          sessionBlockedDomains[domain] = count;
          dayBlockedDomains[domain] = (dayBlockedDomains[domain] || 0) + count;
          remaining -= count;
        }
      });

      dayMinutes += productiveMinutes;
      dayBlocked += blockedAttempts;

      const endTime = date.getTime() + 8 * 3600000 + s * 3600000 + productiveMinutes * 60000;
      history.push({
        sessionId: `test-${dateStr}-${s}`,
        startTime: endTime - productiveMinutes * 60000,
        endTime,
        workMinutes: Math.ceil(productiveMinutes / 5) * 5,
        rewardMinutes: 5,
        productiveMillis: productiveMinutes * 60 * 1000,
        blockedAttempts,
        blockedDomains: sessionBlockedDomains,
        rewardGrantCount: endedEarly ? 0 : 1,
        endedEarly,
      });
    }

    summaries[dateStr] = {
      date: dateStr,
      totalProductiveMinutes: dayMinutes,
      sessionsCompleted: sessionsToday,
      sessionsEndedEarly: history.filter(s => s.endTime >= date.getTime() && s.endTime < date.getTime() + 86400000 && s.endedEarly).length,
      totalBlockedAttempts: dayBlocked,
      blockedDomains: dayBlockedDomains,
    };
  }

  const todayStr = today.toLocaleDateString('en-CA');
  return {
    history,
    summaries,
    streakData: {
      currentStreak: 5,
      longestStreak: 14,
      lastActiveDate: todayStr,
    },
  };
}

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// --- Render functions ---

function renderStreakBanner(current, longest) {
  const el = document.createElement('div');
  el.className = 'streak-banner';
  const fireCount = Math.min(current, 5);
  const fires = fireCount > 0 ? '🔥'.repeat(fireCount) : '💤';
  el.innerHTML = `
    <div class="streak-item">
      <div class="streak-fire">${fires}</div>
    </div>
    <div class="streak-item">
      <div class="streak-number">${current}</div>
      <div class="streak-label">day streak</div>
    </div>
    <div class="streak-divider"></div>
    <div class="streak-item">
      <div class="streak-number" style="font-size: 32px; background: linear-gradient(135deg, #888, #ccc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${longest}</div>
      <div class="streak-label">longest streak</div>
    </div>`;
  return el;
}

function renderWeekComparison(metrics) {
  const frag = document.createDocumentFragment();

  const cards = document.createElement('div');
  cards.className = 'week-compare';
  const thisWeekHrs = (metrics.thisWeekMinutes / 60).toFixed(1);
  const lastWeekHrs = (metrics.lastWeekMinutes / 60).toFixed(1);
  cards.innerHTML = `
    <div class="week-card">
      <div class="week-card-label">This Week</div>
      <div class="week-card-value">${thisWeekHrs} <span class="week-card-unit">hrs</span></div>
    </div>
    <div class="week-card">
      <div class="week-card-label">Last Week</div>
      <div class="week-card-value" style="color: #888;">${lastWeekHrs} <span class="week-card-unit">hrs</span></div>
    </div>`;
  frag.appendChild(cards);

  const change = document.createElement('div');
  change.className = 'week-change';
  if (metrics.lastWeekMinutes === 0 && metrics.thisWeekMinutes > 0) {
    change.innerHTML = `<span class="change-up">↑ Great start this week!</span>`;
  } else if (metrics.lastWeekMinutes === 0) {
    change.innerHTML = `<span class="change-neutral">No data from last week yet</span>`;
  } else {
    const pct = Math.round(((metrics.thisWeekMinutes - metrics.lastWeekMinutes) / metrics.lastWeekMinutes) * 100);
    if (pct > 0) {
      change.innerHTML = `<span class="change-up">↑ ${pct}% more productive than last week</span>`;
    } else if (pct < 0) {
      change.innerHTML = `<span class="change-down">↓ ${Math.abs(pct)}% less than last week</span>`;
    } else {
      change.innerHTML = `<span class="change-neutral">→ Same as last week</span>`;
    }
  }
  frag.appendChild(change);

  return frag;
}

function renderBlockedTrend(summaries) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<h2>Blocked Attempts (Last 14 Days)</h2>`;

  const days = getLast14Days();
  const values = days.map(d => (summaries[d] || {}).totalBlockedAttempts || 0);
  const max = Math.max(...values, 1);

  // Trend indicator
  const firstHalf = values.slice(0, 7).reduce((a, b) => a + b, 0);
  const secondHalf = values.slice(7).reduce((a, b) => a + b, 0);
  let trendText = '';
  if (firstHalf + secondHalf === 0) {
    trendText = '<span class="change-neutral">No blocked attempts recorded</span>';
  } else if (secondHalf < firstHalf) {
    trendText = '<span class="change-up">↓ Declining — your self-control is improving!</span>';
  } else if (secondHalf > firstHalf) {
    trendText = '<span class="change-down">↑ Increasing — stay focused!</span>';
  } else {
    trendText = '<span class="change-neutral">→ Holding steady</span>';
  }

  const chart = document.createElement('div');
  chart.className = 'chart-container';
  for (let i = 0; i < days.length; i++) {
    const pct = max > 0 ? (values[i] / max) * 100 : 0;
    const label = formatShortDate(days[i]);
    chart.innerHTML += `
      <div class="chart-col">
        <div class="chart-value">${values[i] || ''}</div>
        <div class="chart-bar chart-bar-red" style="height: ${Math.max(pct, values[i] > 0 ? 3 : 0)}%"></div>
        <div class="chart-label">${label}</div>
      </div>`;
  }
  section.appendChild(chart);

  const trend = document.createElement('div');
  trend.style.cssText = 'text-align: center; margin-top: 12px; font-size: 14px;';
  trend.innerHTML = trendText;
  section.appendChild(trend);

  return section;
}

function renderTopBlockedSites(history) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<h2>Most Blocked Sites</h2>`;

  // Aggregate across all sessions
  const domainCounts = {};
  for (const session of history) {
    for (const [domain, count] of Object.entries(session.blockedDomains || {})) {
      if (domain === 'unknown') continue;
      domainCounts[domain] = (domainCounts[domain] || 0) + count;
    }
  }

  const sorted = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sorted.length === 0) {
    section.innerHTML += `<p style="color: #666; font-size: 14px;">No blocked site data recorded yet.</p>`;
    return section;
  }

  const maxCount = sorted[0][1];
  for (const [domain, count] of sorted) {
    const pct = (count / maxCount) * 100;
    const displayDomain = domain.startsWith('app:') ? domain.slice(4) + ' (app)' : domain;
    section.innerHTML += `
      <div class="h-bar-row">
        <div class="h-bar-domain" title="${displayDomain}">${displayDomain}</div>
        <div class="h-bar-track">
          <div class="h-bar-fill" style="width: ${pct}%"></div>
        </div>
        <div class="h-bar-count">${count}</div>
      </div>`;
  }

  return section;
}

function renderDailyMinutes(summaries) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<h2>Daily Productive Minutes (Last 30 Days)</h2>`;

  const days = getLast30Days();
  const values = days.map(d => (summaries[d] || {}).totalProductiveMinutes || 0);
  const max = Math.max(...values, 1);

  const chart = document.createElement('div');
  chart.className = 'chart-container';
  chart.style.height = '160px';
  for (let i = 0; i < days.length; i++) {
    const pct = max > 0 ? (values[i] / max) * 100 : 0;
    // Show label every 5th day to avoid crowding
    const label = i % 5 === 0 ? formatShortDate(days[i]) : '';
    chart.innerHTML += `
      <div class="chart-col">
        ${values[i] > 0 ? `<div class="chart-value">${values[i]}</div>` : ''}
        <div class="chart-bar chart-bar-green" style="height: ${Math.max(pct, values[i] > 0 ? 2 : 0)}%"></div>
        <div class="chart-label">${label}</div>
      </div>`;
  }
  section.appendChild(chart);

  return section;
}

function renderStatsGrid(metrics) {
  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-value stat-value-green">${metrics.totalSessions}</div>
      <div class="stat-label">Total Sessions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value stat-value-orange">${metrics.totalHours.toFixed(1)}</div>
      <div class="stat-label">Productive Hours</div>
    </div>
    <div class="stat-card">
      <div class="stat-value stat-value-pink">${metrics.completionRate}%</div>
      <div class="stat-label">Completion Rate</div>
    </div>`;
  return grid;
}

function renderDayOfWeek(summaries) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<h2>Average Minutes by Day of Week</h2>`;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const [dateStr, day] of Object.entries(summaries)) {
    const d = new Date(dateStr + 'T00:00:00');
    let dow = d.getDay() - 1; // 0=Mon
    if (dow < 0) dow = 6; // Sunday
    dayTotals[dow] += day.totalProductiveMinutes;
    dayCounts[dow]++;
  }

  const avgs = dayTotals.map((total, i) => dayCounts[i] > 0 ? Math.round(total / dayCounts[i]) : 0);
  const max = Math.max(...avgs, 1);

  const chart = document.createElement('div');
  chart.className = 'dow-chart';
  for (let i = 0; i < 7; i++) {
    const pct = (avgs[i] / max) * 100;
    chart.innerHTML += `
      <div class="dow-col">
        <div class="dow-value">${avgs[i] > 0 ? avgs[i] + 'm' : ''}</div>
        <div class="dow-bar" style="height: ${Math.max(pct, avgs[i] > 0 ? 3 : 0)}%"></div>
        <div class="dow-label">${dayNames[i]}</div>
      </div>`;
  }
  section.appendChild(chart);

  return section;
}

function renderAvgSession(metrics) {
  const section = document.createElement('div');
  section.className = 'section';
  section.style.textAlign = 'center';
  section.innerHTML = `
    <h2>Average Session Duration</h2>
    <div class="stat-value" style="font-size: 36px; margin-top: 8px;">${metrics.avgSessionMinutes} <span style="font-size: 18px; color: #888;">min</span></div>`;
  return section;
}

// --- Heatmap ---

function renderHeatmap(summaries, { title, colorPrefix, valueKey, unitLabel }) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<h2>${title}</h2>`;

  // Build date range: ~26 weeks ending on today's week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0=Sun
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - dayOfWeek)); // Saturday end
  const totalWeeks = 26;
  const startDate = new Date(endOfWeek);
  startDate.setDate(endOfWeek.getDate() - (totalWeeks * 7 - 1));

  // Collect values for the range
  const dayValues = [];
  const allValues = [];
  const cursor = new Date(startDate);
  while (cursor <= endOfWeek) {
    const dateStr = cursor.toLocaleDateString('en-CA');
    const val = (summaries[dateStr] || {})[valueKey] || 0;
    dayValues.push({ date: new Date(cursor), dateStr, value: val });
    if (val > 0) allValues.push(val);
    cursor.setDate(cursor.getDate() + 1);
  }

  // Compute quartile thresholds from non-zero values
  let thresholds;
  if (allValues.length === 0) {
    thresholds = [1, 2, 3, 4];
  } else {
    allValues.sort((a, b) => a - b);
    const q1 = allValues[Math.floor(allValues.length * 0.25)] || 1;
    const q2 = allValues[Math.floor(allValues.length * 0.5)] || q1;
    const q3 = allValues[Math.floor(allValues.length * 0.75)] || q2;
    thresholds = [q1, q2, q3, q3 + 1];
  }

  function getLevel(val) {
    if (val <= 0) return 0;
    if (val <= thresholds[0]) return 1;
    if (val <= thresholds[1]) return 2;
    if (val <= thresholds[2]) return 3;
    return 4;
  }

  // Group into weeks (columns), each week is Sun–Sat
  const weeks = [];
  let currentWeek = [];
  for (const dv of dayValues) {
    if (dv.date.getDay() === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(dv);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // Scroll wrapper
  const scroll = document.createElement('div');
  scroll.className = 'heatmap-scroll';

  const outer = document.createElement('div');
  outer.className = 'heatmap-outer';

  // Day labels (Sun, Mon, ..., Sat — show Mon, Wed, Fri)
  const dayLabels = document.createElement('div');
  dayLabels.className = 'heatmap-day-labels';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-day-label';
    lbl.textContent = (i === 1 || i === 3 || i === 5) ? dayNames[i] : '';
    dayLabels.appendChild(lbl);
  }
  outer.appendChild(dayLabels);

  // Main area (month labels + grid)
  const main = document.createElement('div');
  main.className = 'heatmap-main';

  // Month labels
  const monthRow = document.createElement('div');
  monthRow.className = 'heatmap-months';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w][0].date;
    const month = firstDay.getMonth();
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-month-label';
    lbl.style.width = '14px'; // 12px cell + 2px gap
    if (month !== lastMonth) {
      lbl.textContent = monthNames[month];
      lastMonth = month;
    }
    monthRow.appendChild(lbl);
  }
  main.appendChild(monthRow);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';
  for (const week of weeks) {
    const col = document.createElement('div');
    col.className = 'heatmap-week';
    // Pad first week if it doesn't start on Sunday
    if (week === weeks[0]) {
      const firstDow = week[0].date.getDay();
      for (let p = 0; p < firstDow; p++) {
        const empty = document.createElement('div');
        empty.className = 'heatmap-cell';
        empty.style.visibility = 'hidden';
        col.appendChild(empty);
      }
    }
    for (const dv of week) {
      const cell = document.createElement('div');
      const level = getLevel(dv.value);
      cell.className = `heatmap-cell${level > 0 ? ` ${colorPrefix}-${level}` : ''}`;
      const d = dv.date;
      const dateLabel = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      cell.setAttribute('data-tip', dv.value > 0 ? `${dv.value} ${unitLabel} on ${dateLabel}` : `No ${unitLabel} on ${dateLabel}`);
      col.appendChild(cell);
    }
    // Pad last week if it doesn't end on Saturday
    if (week === weeks[weeks.length - 1]) {
      const lastDow = week[week.length - 1].date.getDay();
      for (let p = lastDow + 1; p <= 6; p++) {
        const empty = document.createElement('div');
        empty.className = 'heatmap-cell';
        empty.style.visibility = 'hidden';
        col.appendChild(empty);
      }
    }
    grid.appendChild(col);
  }
  main.appendChild(grid);
  outer.appendChild(main);
  scroll.appendChild(outer);
  section.appendChild(scroll);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  legend.innerHTML = `<span>Less</span>`;
  for (let i = 0; i <= 4; i++) {
    legend.innerHTML += `<div class="heatmap-legend-cell ${i > 0 ? `${colorPrefix}-${i}` : ''}" style="${i === 0 ? 'background:#161b22' : ''}"></div>`;
  }
  legend.innerHTML += `<span>More</span>`;
  section.appendChild(legend);

  return section;
}

function renderProductiveHeatmap(summaries) {
  return renderHeatmap(summaries, {
    title: 'Lock-in Activity',
    colorPrefix: 'heatmap-green',
    valueKey: 'totalProductiveMinutes',
    unitLabel: 'min',
  });
}

function renderBlockedHeatmap(summaries) {
  return renderHeatmap(summaries, {
    title: 'Blocked Attempts',
    colorPrefix: 'heatmap-red',
    valueKey: 'totalBlockedAttempts',
    unitLabel: 'blocked',
  });
}

// --- Helpers ---

function getLast14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA'));
  }
  return days;
}

function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA'));
  }
  return days;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
