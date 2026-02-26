/**
 * Domain and process name normalization utilities.
 * Centralizes the www-stripping and case-folding patterns
 * used across the proxy, session engine, and API routes.
 */

/**
 * Normalize a domain by stripping www. prefix and lowercasing.
 * @param {string} domain
 * @returns {string}
 */
export function normalizeDomain(domain) {
  return domain.replace(/^www\./, '').toLowerCase();
}

/**
 * Check if a domain matches a pattern (exact or subdomain match).
 * @param {string} domain - Domain to test
 * @param {string} pattern - Pattern to match against
 * @returns {boolean}
 */
export function domainMatches(domain, pattern) {
  const d = normalizeDomain(domain);
  const p = normalizeDomain(pattern);
  return d === p || d.endsWith('.' + p);
}

/**
 * Normalize a process name by lowercasing and stripping .exe suffix.
 * @param {string} name
 * @returns {string}
 */
export function normalizeProcessName(name) {
  return name.toLowerCase().replace(/\.exe$/, '');
}

/**
 * Check if a process name matches a pattern.
 * @param {string} name - Process name to test
 * @param {string} pattern - Pattern to match against
 * @returns {boolean}
 */
export function processMatches(name, pattern) {
  return normalizeProcessName(name) === normalizeProcessName(pattern);
}
