/**
 * Pure helper functions for working with break lists and productive lists.
 * No side effects, no storage access — takes data in, returns data out.
 *
 * Ported from: extension/list-utils.js (chrome.storage replaced with pure functions)
 */

import { randomUUID } from 'node:crypto';
import { BLOCKING_MODES } from './constants.js';

/**
 * @typedef {Object} BreakList
 * @property {string} id
 * @property {string} name
 * @property {boolean} isActive
 * @property {string} mode - 'off' | 'manual' | 'scheduled' | 'always-on'
 * @property {string[]} sites
 * @property {string[]} apps
 * @property {string[]} allowedPaths
 * @property {Object|null} schedule
 */

/**
 * @typedef {Object} ProductiveList
 * @property {string} id
 * @property {string} name
 * @property {boolean} isActive
 * @property {string[]} sites
 * @property {string[]} apps
 */

/**
 * Find the active break list by ID, falling back to the first list.
 *
 * @param {BreakList[]} breakLists
 * @param {string} activeId
 * @returns {BreakList|null}
 */
export function getActiveBreakList(breakLists, activeId) {
  if (!breakLists || breakLists.length === 0) return null;
  return breakLists.find((l) => l.id === activeId) || breakLists[0];
}

/**
 * Find the active productive list by ID, falling back to the first list.
 *
 * @param {ProductiveList[]} productiveLists
 * @param {string} activeId
 * @returns {ProductiveList|null}
 */
export function getActiveProductiveList(productiveLists, activeId) {
  if (!productiveLists || productiveLists.length === 0) return null;
  return productiveLists.find((l) => l.id === activeId) || productiveLists[0];
}

/**
 * Get blocked sites from the active break list.
 *
 * @param {BreakList[]} breakLists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getBlockedSites(breakLists, activeId) {
  const list = getActiveBreakList(breakLists, activeId);
  return list?.sites || [];
}

/**
 * Get allowed paths from the active break list.
 *
 * @param {BreakList[]} breakLists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getAllowedPaths(breakLists, activeId) {
  const list = getActiveBreakList(breakLists, activeId);
  return list?.allowedPaths || [];
}

/**
 * Get blocking mode from the active break list.
 *
 * @param {BreakList[]} breakLists
 * @param {string} activeId
 * @returns {string}
 */
export function getBlockingMode(breakLists, activeId) {
  const list = getActiveBreakList(breakLists, activeId);
  return list?.mode || BLOCKING_MODES.MANUAL;
}

/**
 * Get productive sites from the active productive list.
 *
 * @param {ProductiveList[]} productiveLists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getProductiveSites(productiveLists, activeId) {
  const list = getActiveProductiveList(productiveLists, activeId);
  return list?.sites || [];
}

/**
 * Get productive apps from the active productive list.
 *
 * @param {ProductiveList[]} productiveLists
 * @param {string} activeId
 * @returns {string[]}
 */
export function getProductiveApps(productiveLists, activeId) {
  const list = getActiveProductiveList(productiveLists, activeId);
  return list?.apps || [];
}

/**
 * Create a new empty productive list.
 *
 * @param {string} name
 * @returns {ProductiveList}
 */
export function createProductiveList(name) {
  return {
    id: randomUUID(),
    name,
    isActive: false,
    sites: [],
    apps: [],
  };
}

/**
 * Create a new empty break list.
 *
 * @param {string} name
 * @returns {BreakList}
 */
export function createBreakList(name) {
  return {
    id: randomUUID(),
    name,
    isActive: false,
    mode: BLOCKING_MODES.MANUAL,
    sites: [],
    apps: [],
    allowedPaths: [],
    schedule: null,
  };
}
