// URL matching utilities — used by background.js for site blocking and tab monitoring

function urlMatchesSites(url, sites) {
  if (!url || !sites || sites.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return sites.some(site => {
      const cleanSite = site.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
      return hostname === cleanSite || hostname.endsWith('.' + cleanSite);
    });
  } catch {
    return false;
  }
}

function urlMatchesAllowedPaths(url, allowedPaths) {
  if (!url || !allowedPaths || allowedPaths.length === 0) return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const fullPath = hostname + urlObj.pathname.toLowerCase();
    return allowedPaths.some(path => {
      const clean = path.trim().replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
      return fullPath.startsWith(clean);
    });
  } catch {
    return false;
  }
}

// Combined check — the pattern urlMatchesSites && !urlMatchesAllowedPaths
// appears 4+ times across background.js functions
function isBlockedUrl(url, blockedSites, allowedPaths) {
  return urlMatchesSites(url, blockedSites) && !urlMatchesAllowedPaths(url, allowedPaths);
}
