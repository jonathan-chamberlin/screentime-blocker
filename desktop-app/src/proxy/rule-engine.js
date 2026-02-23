/**
 * Rule Engine — evaluates URLs against block lists, allowed path exceptions,
 * and nuclear block lists to determine proxy action.
 *
 * Ported from: extension/blocking.js + extension/site-utils.js
 * (Chrome declarativeNetRequest replaced with direct URL evaluation)
 */

/**
 * @typedef {Object} BlockingState
 * @property {boolean} sessionActive
 * @property {boolean} rewardActive
 * @property {string[]} blockedSites - domains to block (e.g., "youtube.com")
 * @property {string[]} allowedPaths - domain/path prefixes to allow (e.g., "youtube.com/veritasium")
 * @property {Array<{domain: string, stage: string}>} nuclearSites
 * @property {string} blockingMode - 'off' | 'manual' | 'scheduled' | 'always-on'
 */

/**
 * @typedef {Object} RuleResult
 * @property {'allow' | 'block' | 'nuclear-block'} action
 * @property {string} [reason]
 * @property {string} [redirectUrl]
 */

import { WEB_PORT } from '../shared/constants.js';

/**
 * Extract domain from a URL string.
 * @param {string} url - Full URL or domain string
 * @returns {string} Lowercase domain without www. prefix
 */
export function extractDomain(url) {
  try {
    // Handle bare domains (no protocol)
    const withProto = url.includes('://') ? url : `https://${url}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, '');
  }
}

/**
 * Extract path from a URL string.
 * @param {string} url - Full URL
 * @returns {string} Path portion (e.g., "/watch?v=abc")
 */
export function extractPath(url) {
  try {
    const withProto = url.includes('://') ? url : `https://${url}`;
    return new URL(withProto).pathname;
  } catch {
    return '/';
  }
}

/**
 * Check if a URL matches an allowed path exception.
 * An allowed path like "youtube.com/veritasium" matches:
 * - youtube.com/veritasium
 * - youtube.com/veritasium/videos
 * - youtube.com/veritasium?tab=about
 *
 * @param {string} url - Full URL to check
 * @param {string[]} allowedPaths - Array of "domain/path" prefixes
 * @returns {boolean}
 */
export function matchesAllowedPath(url, allowedPaths) {
  const domain = extractDomain(url);
  const path = extractPath(url);

  for (const entry of allowedPaths) {
    const entryDomain = extractDomain(entry);
    if (domain !== entryDomain) continue;

    // Extract path portion from the allowed entry
    const slashIndex = entry.indexOf('/');
    if (slashIndex === -1) continue;

    // Get everything after the first slash of the domain/path entry
    const domainPart = entry.substring(0, slashIndex);
    const isJustDomain = !domainPart.includes('.');
    // If entry is like "youtube.com/veritasium", extract "/veritasium"
    const entryPath = '/' + entry.substring(
      entry.indexOf('/', entry.indexOf('.')) + 1
    );

    if (path.startsWith(entryPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a domain is in the blocked sites list.
 * @param {string} domain - Domain to check
 * @param {string[]} blockedSites - List of blocked domains
 * @returns {boolean}
 */
export function isDomainBlocked(domain, blockedSites) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  return blockedSites.some(
    (site) => normalized === site.replace(/^www\./, '').toLowerCase()
  );
}

/**
 * Check if a domain is nuclear-blocked.
 * @param {string} domain
 * @param {Array<{domain: string, stage: string}>} nuclearSites
 * @returns {{ isNuclear: boolean, stage?: string }}
 */
export function isNuclearBlocked(domain, nuclearSites) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const entry = nuclearSites.find(
    (s) => normalized === s.domain.replace(/^www\./, '').toLowerCase()
  );
  if (!entry) return { isNuclear: false };

  // Only block if in locked or unblocking stage
  // "ready" still blocks (unblock button visible but site blocked)
  const activeStages = ['locked', 'ready', 'unblocking'];
  if (activeStages.includes(entry.stage)) {
    return { isNuclear: true, stage: entry.stage };
  }
  return { isNuclear: false };
}

/**
 * Evaluate a URL and determine the proxy action.
 *
 * Priority order (highest first):
 * 1. Nuclear block → redirect to nuclear-blocked page
 * 2. Allowed path exceptions → allow through
 * 3. Session active + domain blocked → redirect to blocked page
 * 4. Reward active → allow blocked sites temporarily
 * 5. Everything else → allow through
 *
 * @param {string} url - Full URL being requested
 * @param {BlockingState} state - Current blocking state
 * @returns {RuleResult}
 */
export function evaluateUrl(url, state) {
  const domain = extractDomain(url);

  // 1. Nuclear block (highest priority, always active regardless of session)
  const nuclear = isNuclearBlocked(domain, state.nuclearSites);
  if (nuclear.isNuclear) {
    return {
      action: 'nuclear-block',
      reason: `Nuclear blocked (${nuclear.stage})`,
      redirectUrl: `http://localhost:${WEB_PORT}/nuclear-blocked?domain=${domain}`,
    };
  }

  // 2. Allowed path exceptions — if URL matches, always allow
  if (matchesAllowedPath(url, state.allowedPaths)) {
    return { action: 'allow', reason: 'Allowed path exception' };
  }

  // 3. Check if blocking is active
  const blockingActive = isBlockingActive(state);
  if (!blockingActive) {
    return { action: 'allow', reason: 'Blocking not active' };
  }

  // 4. Reward active → allow blocked sites temporarily
  if (state.rewardActive) {
    return { action: 'allow', reason: 'Reward active' };
  }

  // 5. Domain on block list → block
  if (isDomainBlocked(domain, state.blockedSites)) {
    return {
      action: 'block',
      reason: 'Blocked site',
      redirectUrl: `http://localhost:${WEB_PORT}/blocked?domain=${domain}`,
    };
  }

  // 6. Not blocked → allow
  return { action: 'allow', reason: 'Not on block list' };
}

/**
 * Determine if blocking should be active based on mode and session state.
 * @param {BlockingState} state
 * @returns {boolean}
 */
function isBlockingActive(state) {
  switch (state.blockingMode) {
    case 'off':
      return false;
    case 'manual':
      return state.sessionActive;
    case 'scheduled':
      // Scheduler sets sessionActive when in window
      return state.sessionActive;
    case 'always-on':
      return true;
    default:
      return false;
  }
}
