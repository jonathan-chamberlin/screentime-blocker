/**
 * Tests for src/shared/list-utils.js — pure unified list helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getActiveList, getBlockedSites, getBlockedApps,
  getAllowedPaths, getBlockingMode, getProductiveMode,
  getProductiveSites, getProductiveApps, createList,
} from '../src/shared/list-utils.js';

const LISTS = [
  {
    id: 'list-1', name: 'Social Media', mode: 'manual',
    blocked: {
      sites: ['youtube.com', 'reddit.com'],
      apps: ['discord.exe'],
      allowedPaths: ['youtube.com/veritasium'],
    },
    productive: {
      mode: 'all-except-blocked',
      sites: ['github.com', 'docs.google.com'],
      apps: ['Code.exe'],
    },
    schedule: null,
  },
  {
    id: 'list-2', name: 'Gaming', mode: 'always-on',
    blocked: {
      sites: ['twitch.tv'],
      apps: ['steam.exe'],
      allowedPaths: [],
    },
    productive: {
      mode: 'whitelist',
      sites: ['coursera.org'],
      apps: ['Notion.exe'],
    },
    schedule: null,
  },
];

describe('list-utils: getActiveList', () => {
  it('returns the list matching the active ID', () => {
    const list = getActiveList(LISTS, 'list-2');
    expect(list.name).toBe('Gaming');
  });

  it('falls back to the first list if ID not found', () => {
    const list = getActiveList(LISTS, 'nonexistent');
    expect(list.name).toBe('Social Media');
  });

  it('returns null for empty array', () => {
    expect(getActiveList([], 'list-1')).toBeNull();
  });
});

describe('list-utils: getBlockedSites', () => {
  it('returns blocked sites from the active list', () => {
    const sites = getBlockedSites(LISTS, 'list-1');
    expect(sites).toEqual(['youtube.com', 'reddit.com']);
  });

  it('returns different sites for different active ID', () => {
    const sites = getBlockedSites(LISTS, 'list-2');
    expect(sites).toEqual(['twitch.tv']);
  });

  it('returns empty array for empty lists', () => {
    expect(getBlockedSites([], 'list-1')).toEqual([]);
  });
});

describe('list-utils: getBlockedApps', () => {
  it('returns blocked apps from the active list', () => {
    expect(getBlockedApps(LISTS, 'list-1')).toEqual(['discord.exe']);
    expect(getBlockedApps(LISTS, 'list-2')).toEqual(['steam.exe']);
  });

  it('returns empty array for empty lists', () => {
    expect(getBlockedApps([], 'list-1')).toEqual([]);
  });
});

describe('list-utils: getAllowedPaths', () => {
  it('returns allowed paths from the active list', () => {
    const paths = getAllowedPaths(LISTS, 'list-1');
    expect(paths).toEqual(['youtube.com/veritasium']);
  });

  it('returns empty for list with no allowed paths', () => {
    const paths = getAllowedPaths(LISTS, 'list-2');
    expect(paths).toEqual([]);
  });
});

describe('list-utils: getBlockingMode', () => {
  it('returns mode from the active list', () => {
    expect(getBlockingMode(LISTS, 'list-1')).toBe('manual');
    expect(getBlockingMode(LISTS, 'list-2')).toBe('always-on');
  });
});

describe('list-utils: getProductiveMode', () => {
  it('returns productive mode from the active list', () => {
    expect(getProductiveMode(LISTS, 'list-1')).toBe('all-except-blocked');
    expect(getProductiveMode(LISTS, 'list-2')).toBe('whitelist');
  });

  it('returns default for empty lists', () => {
    expect(getProductiveMode([], 'list-1')).toBe('all-except-blocked');
  });
});

describe('list-utils: getProductiveSites', () => {
  it('returns productive sites from the active list', () => {
    const sites = getProductiveSites(LISTS, 'list-1');
    expect(sites).toEqual(['github.com', 'docs.google.com']);
  });

  it('returns different sites for different active ID', () => {
    const sites = getProductiveSites(LISTS, 'list-2');
    expect(sites).toEqual(['coursera.org']);
  });
});

describe('list-utils: getProductiveApps', () => {
  it('returns productive apps from the active list', () => {
    expect(getProductiveApps(LISTS, 'list-1')).toEqual(['Code.exe']);
    expect(getProductiveApps(LISTS, 'list-2')).toEqual(['Notion.exe']);
  });
});

describe('list-utils: createList', () => {
  it('returns a valid unified list shape', () => {
    const list = createList('Test List');
    expect(list.name).toBe('Test List');
    expect(list.id).toBeTruthy();
    expect(list.mode).toBe('manual');
    expect(list.blocked.sites).toEqual([]);
    expect(list.blocked.apps).toEqual([]);
    expect(list.blocked.allowedPaths).toEqual([]);
    expect(list.productive.mode).toBe('all-except-blocked');
    expect(list.productive.sites).toEqual([]);
    expect(list.productive.apps).toEqual([]);
    expect(list.schedule).toBeNull();
  });

  it('generates unique IDs', () => {
    const a = createList('A');
    const b = createList('B');
    expect(a.id).not.toBe(b.id);
  });
});
