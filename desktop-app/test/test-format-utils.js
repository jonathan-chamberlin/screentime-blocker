/**
 * Tests for src/shared/format-utils.js — timer formatting.
 */

import { describe, it, expect } from 'vitest';
import { formatTimer } from '../src/shared/format-utils.js';

describe('formatTimer', () => {
  it('formats zero milliseconds as 00:00', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  it('formats seconds-only durations as MM:SS', () => {
    expect(formatTimer(5_000)).toBe('00:05');
    expect(formatTimer(30_000)).toBe('00:30');
    expect(formatTimer(59_000)).toBe('00:59');
  });

  it('formats minutes as MM:SS when under 60 minutes', () => {
    expect(formatTimer(60_000)).toBe('01:00');
    expect(formatTimer(90_000)).toBe('01:30');
    expect(formatTimer(1_425_000)).toBe('23:45');
    expect(formatTimer(3_540_000)).toBe('59:00');
    expect(formatTimer(3_599_000)).toBe('59:59');
  });

  it('switches to H:MM:SS at exactly 60 minutes', () => {
    expect(formatTimer(3_600_000)).toBe('1:00:00');
  });

  it('formats hours correctly for long sessions', () => {
    expect(formatTimer(5_025_000)).toBe('1:23:45');
    expect(formatTimer(7_200_000)).toBe('2:00:00');
    expect(formatTimer(36_000_000)).toBe('10:00:00');
  });

  it('truncates sub-second precision (floors)', () => {
    expect(formatTimer(999)).toBe('00:00');
    expect(formatTimer(1_500)).toBe('00:01');
  });
});
