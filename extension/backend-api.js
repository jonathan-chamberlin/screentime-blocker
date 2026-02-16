// Backend communication — sends session events to the API server
// Depends on: storage.js (getStorage)

// Backend URL — must match CONFIG.API_BASE_URL in config.js
// Service worker can't load config.js, so this is duplicated here
const BACKEND_URL = 'http://localhost:3000';

async function getToken() {
  const result = await getStorage(['access_token']);
  return result.access_token || null;
}

async function notifyBackend(type, data) {
  try {
    const token = await getToken();
    if (token) {
      const endpoints = {
        'start': '/session/start',
        'end': '/session/end',
        'blocked-attempt': '/session/blocked-attempt',
        'profile': '/auth/profile',
      };
      const endpoint = endpoints[type] || `/session/${type}`;
      await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    }
  } catch (err) {
    console.log(`Backend ${type} notification failed:`, err.message);
  }
}
