document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('leaderboard-body');
  const emptyState = document.getElementById('empty-state');
  const table = document.getElementById('leaderboard-table');

  try {
    // Load example CSV data
    const exampleEntries = await loadExampleData();

    // Load real leaderboard data from API
    let apiData = [];
    let currentUserId = null;
    try {
      const token = await Auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${CONFIG.API_BASE_URL}/leaderboard`, { headers });
      apiData = await res.json();

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.sub;
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Could not fetch API leaderboard, using example data only:', e);
    }

    // Merge real users + example data, sort by totalMinutes descending
    const allEntries = [
      ...apiData.map(e => ({ ...e, isReal: true })),
      ...exampleEntries.map(e => ({ ...e, isReal: false }))
    ].sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (!allEntries.length) {
      table.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    allEntries.forEach((entry, i) => {
      const tr = document.createElement('tr');
      if (entry.isReal && entry.userId === currentUserId) tr.className = 'current-user';

      const rankClass = i < 3 ? ` rank-${i + 1}` : '';
      const rankText = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
      const avatarSrc = entry.pictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.displayName)}&background=random&size=32`;

      const rankTd = document.createElement('td');
      rankTd.className = `rank${rankClass}`;
      rankTd.innerHTML = rankText;

      const playerTd = document.createElement('td');
      const playerCell = document.createElement('div');
      playerCell.className = 'player-cell';
      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.alt = '';
      avatar.src = avatarSrc;
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = entry.displayName;
      playerCell.appendChild(avatar);
      playerCell.appendChild(nameSpan);
      playerTd.appendChild(playerCell);

      const minutesTd = document.createElement('td');
      minutesTd.className = 'minutes';
      minutesTd.textContent = entry.totalMinutes;

      const attemptsTd = document.createElement('td');
      attemptsTd.className = 'attempts';
      attemptsTd.textContent = entry.totalSlackAttempts;

      tr.appendChild(rankTd);
      tr.appendChild(playerTd);
      tr.appendChild(minutesTd);
      tr.appendChild(attemptsTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    table.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.querySelector('h2').textContent = 'Could not load leaderboard';
    emptyState.querySelector('p').textContent = 'Make sure the backend server is running.';
  }
});

async function loadExampleData() {
  try {
    const url = chrome.runtime.getURL('example-leaderboard.csv');
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',');
      return {
        displayName: vals[0].trim(),
        totalMinutes: parseInt(vals[1].trim(), 10),
        totalSlackAttempts: parseInt(vals[2].trim(), 10),
        pictureUrl: null,
        userId: null
      };
    });
  } catch (e) {
    console.warn('Could not load example leaderboard data:', e);
    return [];
  }
}
