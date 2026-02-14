document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('leaderboard-body');
  const emptyState = document.getElementById('empty-state');
  const table = document.getElementById('leaderboard-table');

  try {
    const token = await Auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_BASE_URL}/leaderboard`, { headers });
    const data = await res.json();

    if (!data.length) {
      table.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    // Get current user ID from token (decode JWT payload)
    let currentUserId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.sub;
      } catch (e) {}
    }

    data.forEach((entry, i) => {
      const tr = document.createElement('tr');
      if (entry.userId === currentUserId) tr.className = 'current-user';

      const rankClass = i < 3 ? ` rank-${i + 1}` : '';
      const rankText = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
      const avatarSrc = entry.pictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.displayName)}&background=random&size=32`;

      tr.innerHTML = `
        <td class="rank${rankClass}">${rankText}</td>
        <td><div class="player-cell">
          <img src="${avatarSrc}" class="avatar" alt="">
          <span class="player-name">${escapeHtml(entry.displayName)}</span>
        </div></td>
        <td class="minutes">${entry.totalMinutes}</td>
        <td class="attempts">${entry.totalSlackAttempts}</td>
      `;
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
