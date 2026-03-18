// Nuclear navigation guard — closes SPA loopholes for allowed exception pages

(function() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

  let nuclearSites = [];
  let pollTimer = null;
  let lastHref = window.location.href;

  function getNormalizedSites(data) {
    const rawSites = data && Array.isArray(data.sites) ? data.sites : [];
    return rawSites.map(site => normalizeSiteEntry(site));
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function evaluateCurrentUrl() {
    const href = window.location.href;
    lastHref = href;

    const decision = getNuclearNavigationDecision(href, nuclearSites);
    if (decision.shouldRedirect && decision.redirectUrl && href !== decision.redirectUrl) {
      window.location.replace(decision.redirectUrl);
      return;
    }

    if (decision.site) {
      if (!pollTimer) {
        pollTimer = setInterval(() => {
          if (window.location.href !== lastHref) {
            evaluateCurrentUrl();
          }
        }, 500);
      }
    } else {
      stopPolling();
    }
  }

  function refreshSites(nextValue) {
    if (nextValue) {
      nuclearSites = getNormalizedSites(nextValue);
      evaluateCurrentUrl();
      return;
    }

    chrome.storage.local.get(['nbData'], (result) => {
      nuclearSites = getNormalizedSites(result.nbData || { sites: [] });
      evaluateCurrentUrl();
    });
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];
    if (typeof original !== 'function') return;

    history[methodName] = function() {
      const result = original.apply(this, arguments);
      setTimeout(evaluateCurrentUrl, 0);
      return result;
    };
  }

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', evaluateCurrentUrl);
  window.addEventListener('hashchange', evaluateCurrentUrl);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.nbData) {
      refreshSites(changes.nbData.newValue || { sites: [] });
    }
  });

  refreshSites();
})();
