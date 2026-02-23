/**
 * Tests for src/shared/list-utils.js — pure list helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getActiveBreakList, getActiveProductiveList,
  getBlockedSites, getAllowedPaths, getBlockingMode,
  getProductiveSites, getProductiveApps,
  createBreakList, createProductiveList,
} from '../src/shared/list-utils.js';

const BREAK_LISTS = [
  {
    id: 'bl-1', name: 'Social Media', isActive: true, mode: 'manual',
    sites: ['youtube.com', 'reddit.com'], apps: ['discord.exe'],
    allowedPaths: ['youtube.com/veritasium'], schedule: null,
  },
  {
    id: 'bl-2', name: 'Gaming', isActive: false, mode: 'always-on',
    sites: ['twitch.tv'], apps: ['steam.exe'],
    allowedPaths: [], schedule: null,
  },
];

const PRODUCTIVE_LISTS = [
  {
    id: 'pl-1', name: 'Work', isActive: true,
    sites: ['github.com', 'docs.google.com'], apps: ['Code.exe'],
  },
  {
    id: 'pl-2', name: 'Study', isActive: false,
    sites: ['coursera.org'], apps: ['Notion.exe'],
  },
];

describe('list-utils: getActiveBreakList', () => {
  it('returns the list matching the active ID', () => {
    const list = getActiveBreakList(BREAK_LISTS, 'bl-2');
    expect(list.name).toBe('Gaming');
  });

  it('falls back to the first list if ID not found', () => {
    const list = getActiveBreakList(BREAK_LISTS, 'nonexistent');
    expect(list.name).toBe('Social Media');
  });

  it('returns null for empty array', () => {
    expect(getActiveBreakList([], 'bl-1')).toBeNull();
  });
});

describe('list-utils: getActiveProductiveList', () => {
  it('returns the list matching the active ID', () => {
    const list = getActiveProductiveList(PRODUCTIVE_LISTS, 'pl-2');
    expect(list.name).toBe('Study');
  });

  it('falls back to the first list if ID not found', () => {
    const list = getActiveProductiveList(PRODUCTIVE_LISTS, 'nonexistent');
    expect(list.name).toBe('Work');
  });
});

describe('list-utils: getBlockedSites', () => {
  it('returns sites from the active break list', () => {
    const sites = getBlockedSites(BREAK_LISTS, 'bl-1');
    expect(sites).toEqual(['youtube.com', 'reddit.com']);
  });

  it('returns different sites for different active ID', () => {
    const sites = getBlockedSites(BREAK_LISTS, 'bl-2');
    expect(sites).toEqual(['twitch.tv']);
  });

  it('returns empty array for empty lists', () => {
    expect(getBlockedSites([], 'bl-1')).toEqual([]);
  });
});

describe('list-utils: getAllowedPaths', () => {
  it('returns allowed paths from the active break list', () => {
    const paths = getAllowedPaths(BREAK_LISTS, 'bl-1');
    expect(paths).toEqual(['youtube.com/veritasium']);
  });

  it('returns empty for list with no allowed paths', () => {
    const paths = getAllowedPaths(BREAK_LISTS, 'bl-2');
    expect(paths).toEqual([]);
  });
});

describe('list-utils: getBlockingMode', () => {
  it('returns mode from the active break list', () => {
    expect(getBlockingMode(BREAK_LISTS, 'bl-1')).toBe('manual');
    expect(getBlockingMode(BREAK_LISTS, 'bl-2')).toBe('always-on');
  });
});

describe('list-utils: getProductiveSites', () => {
  it('returns sites from the active productive list', () => {
    const sites = getProductiveSites(PRODUCTIVE_LISTS, 'pl-1');
    expect(sites).toEqual(['github.com', 'docs.google.com']);
  });

  it('returns different sites for different active ID', () => {
    const sites = getProductiveSites(PRODUCTIVE_LISTS, 'pl-2');
    expect(sites).toEqual(['coursera.org']);
  });
});

describe('list-utils: getProductiveApps', () => {
  it('returns apps from the active productive list', () => {
    expect(getProductiveApps(PRODUCTIVE_LISTS, 'pl-1')).toEqual(['Code.exe']);
    expect(getProductiveApps(PRODUCTIVE_LISTS, 'pl-2')).toEqual(['Notion.exe']);
  });
});

describe('list-utils: createBreakList', () => {
  it('returns a valid break list shape', () => {
    const list = createBreakList('Test List');
    expect(list.name).toBe('Test List');
    expect(list.id).toBeTruthy();
    expect(list.isActive).toBe(false);
    expect(list.mode).toBe('manual');
    expect(list.sites).toEqual([]);
    expect(list.apps).toEqual([]);
    expect(list.allowedPaths).toEqual([]);
    expect(list.schedule).toBeNull();
  });

  it('generates unique IDs', () => {
    const a = createBreakList('A');
    const b = createBreakList('B');
    expect(a.id).not.toBe(b.id);
  });
});

describe('list-utils: createProductiveList', () => {
  it('returns a valid productive list shape', () => {
    const list = createProductiveList('Work');
    expect(list.name).toBe('Work');
    expect(list.id).toBeTruthy();
    expect(list.isActive).toBe(false);
    expect(list.sites).toEqual([]);
    expect(list.apps).toEqual([]);
  });
});
