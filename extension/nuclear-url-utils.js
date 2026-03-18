// Shared Nuclear Block URL helpers — used by background, extension pages, and content scripts

function normalizeDomain(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const prefixed = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(prefixed);
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeException(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const prefixed = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(prefixed);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const path = url.pathname || '/';
    const search = url.search || '';
    return `${host}${path}${search}`;
  } catch {
    return '';
  }
}

function getExceptionHost(normalizedException) {
  if (!normalizedException || typeof normalizedException !== 'string') return '';
  const slashIdx = normalizedException.indexOf('/');
  return slashIdx === -1 ? normalizedException : normalizedException.slice(0, slashIdx);
}

function getEntryDomains(site) {
  const rawDomains = site && site.domains
    ? site.domains
    : (site && site.domain ? [site.domain] : []);
  const normalized = rawDomains
    .map(normalizeDomain)
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function exceptionBelongsToEntry(normalizedException, site) {
  const exceptionHost = getExceptionHost(normalizedException);
  if (!exceptionHost) return false;
  const domains = getEntryDomains(site);
  if (domains.length === 0) return false;
  return domains.some(domain => exceptionHost === domain || exceptionHost.endsWith(`.${domain}`));
}

function normalizeSiteEntry(entry) {
  const domains = getEntryDomains(entry);
  const normalizedExceptions = Array.isArray(entry.exceptions) ? entry.exceptions : [];
  const keptExceptions = [];
  const seen = new Set();
  for (const value of normalizedExceptions) {
    const normalized = normalizeException(value);
    if (!normalized) continue;
    if (!domains.some(domain => {
      const host = getExceptionHost(normalized);
      return host === domain || host.endsWith(`.${domain}`);
    })) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    keptExceptions.push(normalized);
  }

  const base = { ...entry, exceptions: keptExceptions };
  if (domains.length === 0) {
    delete base.domain;
    delete base.domains;
    return base;
  }
  if (domains.length === 1) {
    base.domain = domains[0];
    delete base.domains;
  } else {
    base.domains = domains;
    delete base.domain;
  }
  return base;
}

function getNuclearSiteStage(site) {
  const now = Date.now();
  if (now - site.addedAt < site.cooldown1Ms) return 'locked';
  if (!site.unblockClickedAt) return 'ready';
  if (now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
  return 'confirm';
}

function parseNormalizedException(normalizedException) {
  const normalized = normalizeException(normalizedException);
  if (!normalized) return null;
  try {
    const url = new URL(`https://${normalized}`);
    return {
      host: url.hostname.replace(/^www\./i, '').toLowerCase(),
      path: url.pathname || '/',
      params: Array.from(url.searchParams.entries()),
    };
  } catch {
    return null;
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getNuclearParamPattern(name, value) {
  const escapedName = escapeRegex(name);
  if (value === '') {
    return `${escapedName}(?:=)?`;
  }
  return `${escapedName}=${escapeRegex(value)}`;
}

function getNuclearExtraParamPattern() {
  return '[^#&=]+(?:=[^#&]*)?';
}

function getNuclearParamPermutations(entries) {
  if (entries.length <= 1) return [entries.slice()];
  const permutations = [];
  const used = new Array(entries.length).fill(false);
  const current = [];

  function backtrack() {
    if (current.length === entries.length) {
      permutations.push(current.slice());
      return;
    }
    for (let i = 0; i < entries.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(entries[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  }

  backtrack();
  return permutations;
}

function buildNuclearExceptionRegex(normalizedException) {
  const parsed = parseNormalizedException(normalizedException);
  if (!parsed) return '';

  const hostPattern = `(?:www\\.)?${escapeRegex(parsed.host)}`;
  const pathPattern = escapeRegex(parsed.path);
  let queryPattern = '(?:\\?[^#]*)?';

  if (parsed.params.length > 0) {
    const extra = getNuclearExtraParamPattern();
    const permutations = getNuclearParamPermutations(parsed.params);
    const orderedPatterns = permutations.map(order => {
      let pattern = `${extra}&`;
      pattern = `(?:${pattern})*`;
      order.forEach((entry, index) => {
        if (index > 0) {
          pattern += '&';
        }
        pattern += getNuclearParamPattern(entry[0], entry[1]);
        pattern += `(?:&${extra})*`;
      });
      return pattern;
    });
    queryPattern = `\\?(?:${orderedPatterns.join('|')})`;
  }

  return `^https?:\\/\\/${hostPattern}${pathPattern}${queryPattern}(?:#.*)?$`;
}

function urlMatchesNuclearException(url, normalizedException) {
  const parsedException = parseNormalizedException(normalizedException);
  if (!parsedException) return false;

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== parsedException.host) return false;
    if ((urlObj.pathname || '/') !== parsedException.path) return false;

    if (parsedException.params.length === 0) return true;

    const actualParams = Array.from(urlObj.searchParams.entries());
    const remaining = actualParams.slice();

    for (const [requiredName, requiredValue] of parsedException.params) {
      const idx = remaining.findIndex(([name, value]) => name === requiredName && value === requiredValue);
      if (idx === -1) return false;
      remaining.splice(idx, 1);
    }
    return true;
  } catch {
    return false;
  }
}

function urlMatchesAnyNuclearException(url, site) {
  const exceptions = Array.isArray(site && site.exceptions) ? site.exceptions : [];
  return exceptions.some(exception => urlMatchesNuclearException(url, exception));
}

function findNuclearSiteById(sites, siteId) {
  if (!siteId) return null;
  return (sites || []).find(site => site.id === siteId) || null;
}

function findNuclearSiteForUrl(url, sites) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    let bestMatch = null;
    let bestLength = -1;

    for (const site of sites || []) {
      const domains = getEntryDomains(site);
      for (const domain of domains) {
        if (host === domain || host.endsWith(`.${domain}`)) {
          if (domain.length > bestLength) {
            bestMatch = site;
            bestLength = domain.length;
          }
        }
      }
    }

    return bestMatch;
  } catch {
    return null;
  }
}

function getNuclearRedirectPath(site) {
  const stage = getNuclearSiteStage(site);
  return stage === 'confirm' ? '/nuclear-block-last-chance.html' : '/nuclear-blocked.html';
}

function getNuclearRedirectUrl(site) {
  const path = getNuclearRedirectPath(site);
  const suffix = `?siteId=${encodeURIComponent(site.id)}`;
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path.replace(/^\//, '')) + suffix;
  }
  return path + suffix;
}

function getNuclearNavigationDecision(url, sites) {
  const site = findNuclearSiteForUrl(url, sites);
  if (!site) {
    return { shouldRedirect: false, site: null, redirectUrl: null };
  }

  if (urlMatchesAnyNuclearException(url, site)) {
    return { shouldRedirect: false, site, redirectUrl: null };
  }

  return {
    shouldRedirect: true,
    site,
    redirectUrl: getNuclearRedirectUrl(site),
  };
}

function resolveNuclearSiteFromPage(sites, pageUrl, fallbackHostname) {
  try {
    const url = new URL(pageUrl);
    const siteId = url.searchParams.get('siteId');
    const byId = findNuclearSiteById(sites, siteId);
    if (byId) return byId;
  } catch {
    // Ignore malformed page URLs and fall back below.
  }

  if (!fallbackHostname) return null;
  const pseudoUrl = `https://${fallbackHostname.replace(/^www\./i, '')}/`;
  return findNuclearSiteForUrl(pseudoUrl, sites);
}
