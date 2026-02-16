// Auth0 authentication for Chrome Extension
window.Auth = {
  isConfigured() {
    return Boolean(CONFIG && CONFIG.AUTH0_DOMAIN && CONFIG.AUTH0_CLIENT_ID);
  },

  login() {
    return new Promise((resolve, reject) => {
      if (!this.isConfigured()) {
        reject(new Error('Leaderboard sign-in is not configured for this build.'));
        return;
      }

      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      const nonce = Math.random().toString(36).substring(2);

      // Build auth URL — audience is only included if an API is configured in Auth0
      let authUrl = `https://${CONFIG.AUTH0_DOMAIN}/authorize?` +
        `client_id=${encodeURIComponent(CONFIG.AUTH0_CLIENT_ID)}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&nonce=${nonce}`;
      if (CONFIG.AUTH0_AUDIENCE) {
        authUrl += `&audience=${encodeURIComponent(CONFIG.AUTH0_AUDIENCE)}`;
      }

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!redirectUrl) {
            reject(new Error('No redirect URL received'));
            return;
          }

          // Try hash fragment first (implicit flow)
          const hashFragment = redirectUrl.split('#')[1];
          // Also check query params (some flows return via query)
          const queryString = redirectUrl.split('?')[1];

          let accessToken = null;

          if (hashFragment) {
            const params = new URLSearchParams(hashFragment);
            accessToken = params.get('access_token');
            if (!accessToken) {
              // Log what Auth0 actually returned for debugging
              const error = params.get('error');
              const errorDesc = params.get('error_description');
              if (error) {
                reject(new Error(`Auth0 error: ${error} - ${errorDesc}`));
                return;
              }
              reject(new Error(`No access_token in hash. Got: ${hashFragment.substring(0, 200)}`));
              return;
            }
          } else if (queryString) {
            const params = new URLSearchParams(queryString);
            const error = params.get('error');
            const errorDesc = params.get('error_description');
            if (error) {
              reject(new Error(`Auth0 error: ${error} - ${errorDesc}`));
              return;
            }
            reject(new Error(`No hash fragment. Query: ${queryString.substring(0, 200)}`));
            return;
          } else {
            reject(new Error(`No token in response. URL: ${redirectUrl.substring(0, 200)}`));
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
