// Usage page — loads data once on page open, renders charts and metrics

document.addEventListener('DOMContentLoaded', async () => {
  const result = await getStorage(['sessionHistory', 'dailySummaries', 'streakData']);
  const history = result.sessionHistory || [];
  const summaries = result.dailySummaries || {};
  const streakData = result.streakData || { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

  const content = document.getElementById('content');

  if (history.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>No usage data yet. Complete your first session to start tracking!</p>
      </div>`;
    return;
  }

  // Adjust current streak if it's stale (last active date is older than yesterday)
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  let displayStreak = streakData.currentStreak;
  if (streakData.lastActiveDate && streakData.lastActiveDate !== today && streakData.lastActiveDate !== yesterday) {
    displayStreak = 0;
  }

  // Compute all metrics
  const metrics = computeMetrics(history, summaries, streakData, displayStreak);

  content.innerHTML = '';
  content.appendChild(renderStreakBanner(displayStreak, streakData.longestStreak));
  content.appendChild(renderWeekComparison(metrics));
  content.appendChild(renderBlockedTrend(summaries));
  content.appendChild(renderTopBlockedSites(history));
  content.appendChild(renderDailyMinutes(summaries));
  content.appendChild(renderStatsGrid(metrics));
  content.appendChild(renderDayOfWeek(summaries));
  content.appendChild(renderAvgSession(metrics));
});

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
