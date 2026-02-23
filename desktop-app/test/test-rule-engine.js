/**
 * Tests for src/proxy/rule-engine.js — URL evaluation and path exceptions.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateUrl,
  extractDomain,
  extractPath,
  matchesAllowedPath,
  isDomainBlocked,
} from '../src/proxy/rule-engine.js';

/** @returns {import('../src/proxy/rule-engine.js').BlockingState} */
function makeState(overrides = {}) {
  return {
    sessionActive: true,
    rewardActive: false,
    blockedSites: ['youtube.com', 'reddit.com', 'instagram.com'],
    allowedPaths: ['youtube.com/veritasium'],
    nuclearSites: [],
    blockingMode: 'manual',
    ...overrides,
  };
}

describe('extractDomain', () => {
  it('extracts domain from full URL', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
  });

  it('strips www prefix', () => {
    expect(extractDomain('www.reddit.com')).toBe('reddit.com');
  });

  it('handles bare domain', () => {
    expect(extractDomain('github.com')).toBe('github.com');
  });
});

describe('matchesAllowedPath', () => {
  const paths = ['youtube.com/veritasium'];

  it('matches exact path', () => {
    expect(matchesAllowedPath('https://youtube.com/veritasium', paths)).toBe(true);
  });

  it('matches sub-path', () => {
    expect(matchesAllowedPath('https://youtube.com/veritasium/videos', paths)).toBe(true);
  });

  it('does not match different path on same domain', () => {
    expect(matchesAllowedPath('https://youtube.com/watch?v=abc', paths)).toBe(false);
  });

  it('does not match different domain', () => {
    expect(matchesAllowedPath('https://reddit.com/veritasium', paths)).toBe(false);
  });
});

describe('evaluateUrl', () => {
  it('blocks youtube.com when session active', () => {
    const result = evaluateUrl('https://youtube.com/', makeState());
    expect(result.action).toBe('block');
    expect(result.redirectUrl).toContain('domain=youtube.com');
  });

  it('blocks youtube.com/watch?v=abc', () => {
    const result = evaluateUrl('https://youtube.com/watch?v=abc', makeState());
    expect(result.action).toBe('block');
  });

  it('allows youtube.com/veritasium (path exception)', () => {
    const result = evaluateUrl('https://youtube.com/veritasium', makeState());
    expect(result.action).toBe('allow');
    expect(result.reason).toBe('Allowed path exception');
  });

  it('allows youtube.com/veritasium/videos (sub-path exception)', () => {
    const result = evaluateUrl('https://youtube.com/veritasium/videos', makeState());
    expect(result.action).toBe('allow');
  });

  it('allows github.com (not on block list)', () => {
    const result = evaluateUrl('https://github.com/anything', makeState());
    expect(result.action).toBe('allow');
  });

  it('blocks reddit.com when session active', () => {
    const result = evaluateUrl('https://reddit.com', makeState());
    expect(result.action).toBe('block');
  });

  it('allows reddit.com when session NOT active', () => {
    const result = evaluateUrl('https://reddit.com', makeState({ sessionActive: false }));
    expect(result.action).toBe('allow');
  });

  it('blocks instagram.com when session active', () => {
    const result = evaluateUrl('https://instagram.com', makeState());
    expect(result.action).toBe('block');
  });

  it('allows unknown domain', () => {
    const result = evaluateUrl('https://example.org', makeState());
    expect(result.action).toBe('allow');
  });

  it('allows blocked sites when reward is active', () => {
    const result = evaluateUrl('https://youtube.com', makeState({ rewardActive: true }));
    expect(result.action).toBe('allow');
    expect(result.reason).toBe('Reward active');
  });

  it('nuclear block overrides everything', () => {
    const result = evaluateUrl('https://onlyfans.com', makeState({
      nuclearSites: [{ domain: 'onlyfans.com', stage: 'locked' }],
    }));
    expect(result.action).toBe('nuclear-block');
    expect(result.redirectUrl).toContain('nuclear-blocked');
  });

  it('nuclear block overrides reward active', () => {
    const result = evaluateUrl('https://onlyfans.com', makeState({
      rewardActive: true,
      nuclearSites: [{ domain: 'onlyfans.com', stage: 'locked' }],
    }));
    expect(result.action).toBe('nuclear-block');
  });

  it('nuclear block overrides allowed paths', () => {
    const result = evaluateUrl('https://onlyfans.com/some/path', makeState({
      allowedPaths: ['onlyfans.com/some/path'],
      nuclearSites: [{ domain: 'onlyfans.com', stage: 'locked' }],
    }));
    expect(result.action).toBe('nuclear-block');
  });

  it('allows when blocking mode is off', () => {
    const result = evaluateUrl('https://youtube.com', makeState({ blockingMode: 'off' }));
    expect(result.action).toBe('allow');
  });

  it('blocks in always-on mode even without session', () => {
    const result = evaluateUrl('https://youtube.com', makeState({
      sessionActive: false,
      blockingMode: 'always-on',
    }));
    expect(result.action).toBe('block');
  });
});
