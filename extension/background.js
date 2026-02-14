// FocusContract Background Service Worker
const API_BASE_URL = 'http://localhost:3000';

let sessionActive = false;
let sessionId = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startSession') {
    handleStartSession().then(sendResponse);
    return true; // keep message channel open for async response
  }

  if (message.action === 'endSession') {
    handleEndSession().then(sendResponse);
    return true;
  }

  if (message.action === 'getStatus') {
    sendResponse({ sessionActive, sessionId });
    return false;
  }
});

async function handleStartSession() {
  sessionId = crypto.randomUUID();
  sessionActive = true;

  await blockSites();

  // Try to notify backend (fire-and-forget)
  try {
    const token = await getToken();
    if (token) {
      await fetch(`${API_BASE_URL}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    }
  } catch (err) {
    console.log('Backend notification failed (continuing):', err.message);
  }

  return { success: true, sessionId };
}

async function handleEndSession() {
  sessionActive = false;

  await unblockSites();

  // Try to notify backend
  try {
    const token = await getToken();
    if (token) {
      await fetch(`${API_BASE_URL}/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          minutes_completed: 0,
          ended_early: true,
        }),
      });
    }
  } catch (err) {
    console.log('Backend notification failed (continuing):', err.message);
  }

  sessionId = null;
  return { success: true };
}

async function blockSites() {
  // Tracer bullet: hardcode blocking youtube.com
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { extensionPath: '/blocked.html' },
      },
      condition: {
        urlFilter: '||youtube.com',
        resourceTypes: ['main_frame'],
      },
    }],
  });
}

async function unblockSites() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [],
  });
}

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('access_token', (result) => {
      resolve(result.access_token || null);
    });
  });
}
