/**
 * Nuclear block utilities — stage computation and exception collection.
 * Shared between main.js (blocking state) and API routes.
 */

/**
 * Derive the current stage of a nuclear-blocked site from its timing fields.
 * Stages: locked → ready → unblocking → confirm
 *
 * @param {{ addedAt: number, cooldown1Ms: number, unblockClickedAt?: number, cooldown2Ms: number }} site
 * @returns {'locked' | 'ready' | 'unblocking' | 'confirm'}
 */
export function computeNuclearStage(site) {
  const now = Date.now();
  if (now - site.addedAt < site.cooldown1Ms) return 'locked';
  if (!site.unblockClickedAt) return 'ready';
  if (now - site.unblockClickedAt < site.cooldown2Ms) return 'unblocking';
  return 'confirm';
}

/**
 * Collect all exception paths from nuclear-blocked sites.
 * Used to generate allow rules that override nuclear blocks.
 *
 * @param {Array<{ exceptions?: string[] }>} sites
 * @returns {string[]}
 */
export function collectNuclearExceptions(sites) {
  const exceptions = [];
  for (const site of sites) {
    if (site.exceptions && site.exceptions.length > 0) {
      exceptions.push(...site.exceptions);
    }
  }
  return exceptions;
}

/**
 * Get all domains from a nuclear site entry (handles both domain and domains fields).
 *
 * @param {{ domain?: string, domains?: string[] }} site
 * @returns {string[]}
 */
export function getNuclearSiteDomains(site) {
  if (site.domains && site.domains.length > 0) return site.domains;
  if (site.domain) return [site.domain];
  return [];
}
