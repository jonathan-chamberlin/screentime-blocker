// Auth0 authentication for Chrome Extension
window.Auth = {
  login() {
    return new Promise((resolve, reject) => {
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      const nonce = Math.random().toString(36).substring(2);

      const authUrl = `https://${CONFIG.AUTH0_DOMAIN}/authorize?` +
        `client_id=${encodeURIComponent(CONFIG.AUTH0_CLIENT_ID)}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&audience=${encodeURIComponent(CONFIG.AUTH0_AUDIENCE)}` +
        `&nonce=${nonce}`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const hashFragment = redirectUrl.split('#')[1];
          if (!hashFragment) {
            reject(new Error('No token in response'));
            return;
          }

          const params = new URLSearchParams(hashFragment);
          const accessToken = params.get('access_token');

          if (!accessToken) {
            reject(new Error('No access_token found'));
            return;
          }

          chrome.storage.local.set({ access_token: accessToken }, () => {
            resolve(accessToken);
          });
        }
      );
    });
  },

  logout() {
    return new Promise((resolve) => {
      chrome.storage.local.remove('access_token', () => {
        resolve();
      });
    });
  },

  getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get('access_token', (result) => {
        resolve(result.access_token || null);
      });
    });
  },
};
