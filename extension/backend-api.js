// Backend communication — sends session events to the API server
// Depends on: storage.js (getStorage)

// Backend URL fallback if no runtime config is present.
// Keep empty by default for store-safe builds.
const BACKEND_URL = '';

async function getToken() {
  const result = await getStorage(['access_token']);
  return result.access_token || null;
}

async function getBackendUrl() {
  const result = await getStorage(['apiBaseUrl']);
  return result.apiBaseUrl || BACKEND_URL;
}

async function notifyBackend(type, data) {
  try {
    const token = await getToken();
    if (token) {
      const backendUrl = await getBackendUrl();
      if (!backendUrl) return;
      const endpoints = {
        'start': '/session/start',
        'end': '/session/end',
        'blocked-attempt': '/session/blocked-attempt',
        'profile': '/auth/profile',
      };
      const endpoint = endpoints[type] || `/session/${type}`;
      await fetch(`${backendUrl}${endpoint}`, {
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

const SYNC_KEYS = [
  'rewardSites',
  'allowedPaths',
  'productiveMode',
  'productiveSites',
  'productiveApps',
  'blockedApps',
  'strictMode',
  'penaltyType',
  'penaltyTarget',
  'penaltyAmount',
  'paymentMethod',
  'workMinutes',
  'rewardMinutes',
  'companionMode',
];

async function pushSettingsToBackend() {
  const token = await getToken();
  if (!token) {
    return { success: false, skipped: true, reason: 'not-authenticated' };
  }

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    return { success: false, skipped: true, reason: 'no-backend-url' };
  }
  const settings = await getStorage(SYNC_KEYS);

  const response = await fetch(`${backendUrl}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ settings }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Settings push failed: ${response.status} ${text}`);
  }

  return { success: true };
}

async function pullSettingsFromBackend() {
  const token = await getToken();
  if (!token) {
    return { success: false, skipped: true, reason: 'not-authenticated' };
  }

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    return { success: false, skipped: true, reason: 'no-backend-url' };
  }
  const response = await fetch(`${backendUrl}/config`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Settings pull failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const remoteSettings = payload.settings || {};
  if (Object.keys(remoteSettings).length > 0) {
    await setStorage(remoteSettings);
  }

  return { success: true, settings: remoteSettings };
}
