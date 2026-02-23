/**
 * Pure helper functions for working with unified lists.
 * Each list contains both blocking and productive config.
 * No side effects, no storage access — takes data in, returns data out.
 */

import { randomUUID } from 'node:crypto';
import { BLOCKING_MODES, DEFAULT_PRODUCTIVE_MODE } from './constants.js';

/**
 * @typedef {import('../storage.js').UnifiedList} UnifiedList
 */

/**
 * Find the active list by ID, falling back to the first list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {UnifiedList|null}
 */
export function getActiveList(lists, activeId) {
  if (!lists || lists.length === 0) return null;
  return lists.find((l) => l.id === activeId) || lists[0];
}

/**
 * Get blocked sites from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getBlockedSites(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.blocked?.sites || [];
}

/**
 * Get blocked apps from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getBlockedApps(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.blocked?.apps || [];
}

/**
 * Get allowed paths from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getAllowedPaths(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.blocked?.allowedPaths || [];
}

/**
 * Get blocking mode from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string}
 */
export function getBlockingMode(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.mode || BLOCKING_MODES.MANUAL;
}

/**
 * Get productive mode from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string}
 */
export function getProductiveMode(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.productive?.mode || DEFAULT_PRODUCTIVE_MODE;
}

/**
 * Get productive sites from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getProductiveSites(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.productive?.sites || [];
}

/**
 * Get productive apps from the active list.
 *
 * @param {UnifiedList[]} lists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getProductiveApps(lists, activeId) {
  const list = getActiveList(lists, activeId);
  return list?.productive?.apps || [];
}

/**
 * Create a new empty unified list.
 *
 * @param {string} name
 * @returns {UnifiedList}
 */
export function createList(name) {
  return {
    id: randomUUID(),
    name,
    mode: BLOCKING_MODES.MANUAL,
    blocked: {
      sites: [],
      apps: [],
      allowedPaths: [],
    },
    productive: {
      mode: DEFAULT_PRODUCTIVE_MODE,
      sites: [],
      apps: [],
    },
    schedule: null,
  };
}
