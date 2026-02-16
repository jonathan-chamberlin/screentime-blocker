// Safe defaults used when local config.js is missing.
// Keep auth disabled by default so the extension still runs in store review.
window.CONFIG = window.CONFIG || {
  AUTH0_DOMAIN: '',
  AUTH0_CLIENT_ID: '',
  AUTH0_AUDIENCE: '',
  API_BASE_URL: '',
};

