document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const btnLogin = document.getElementById('btn-login');
  const btnStart = document.getElementById('btn-start');
  const btnEnd = document.getElementById('btn-end');
  const authStatusDiv = document.getElementById('auth-status');
  const statsDiv = document.getElementById('stats');

  // Check authentication status
  async function updateAuthUI() {
    const token = await Auth.getToken();
    if (token) {
      btnLogin.textContent = 'Sign Out';
      authStatusDiv.textContent = 'Authenticated';
      authStatusDiv.style.background = '#d4edda';
      authStatusDiv.style.color = '#155724';
    } else {
      btnLogin.textContent = 'Sign In';
      authStatusDiv.textContent = 'Not authenticated';
      authStatusDiv.style.background = '#fff3cd';
      authStatusDiv.style.color = '#856404';
    }
  }

  // Check session status
  async function updateSessionUI() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response && response.sessionActive) {
        statusDiv.textContent = 'Work session active';
        statusDiv.style.background = '#c8e6c9';
        statusDiv.style.color = '#2e7d32';
        btnStart.style.display = 'none';
        btnEnd.style.display = 'block';
      } else {
        statusDiv.textContent = 'No active session';
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.color = '#1976d2';
        btnStart.style.display = 'block';
        btnEnd.style.display = 'none';
      }
    });
  }

  // Fetch and display stats from backend
  async function fetchStats() {
    const token = await Auth.getToken();
    if (!token) {
      statsDiv.textContent = 'Sign in to see stats';
      return;
    }
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/stats/today`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      statsDiv.innerHTML =
        `<strong>Today</strong><br>` +
        `Sessions: ${data.session_count}<br>` +
        `Minutes worked: ${data.total_minutes}`;
    } catch (err) {
      statsDiv.textContent = 'Could not load stats';
    }
  }

  // Wire up login button
  btnLogin.addEventListener('click', async () => {
    const token = await Auth.getToken();
    if (token) {
      await Auth.logout();
    } else {
      await Auth.login();
    }
    await updateAuthUI();
  });

  // Wire up start session button
  btnStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startSession' }, (response) => {
      if (response && response.success) {
        updateSessionUI();
        fetchStats();
      }
    });
  });

  // Wire up end session button
  btnEnd.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
      if (response && response.success) {
        updateSessionUI();
        fetchStats();
      }
    });
  });

  // Initialize UI
  await updateAuthUI();
  await updateSessionUI();
  fetchStats();
});
