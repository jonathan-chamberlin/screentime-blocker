/**
 * Tests for src/monitor/app-monitor.js — foreground app detection.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { getForegroundProcess, startAppMonitor } from '../src/monitor/app-monitor.js';

/** Helper: wait for ms. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let monitor = null;

afterEach(() => {
  if (monitor) {
    monitor.stop();
    monitor = null;
  }
});

describe('app-monitor', () => {
  it('getForegroundProcess() reports current foreground app name and window title', async () => {
    const result = await getForegroundProcess();
    expect(result).toHaveProperty('processName');
    expect(result).toHaveProperty('windowTitle');
    expect(typeof result.processName).toBe('string');
    expect(result.processName.length).toBeGreaterThan(0);
    expect(typeof result.windowTitle).toBe('string');
  });

  it('startAppMonitor emits app-changed with valid AppFocus shape', async () => {
    const events = [];
    monitor = startAppMonitor({ pollMs: 500 });
    monitor.emitter.on('app-changed', (e) => events.push(e));

    // Wait for at least one poll
    await wait(2000);

    expect(events.length).toBeGreaterThan(0);
    const event = events[0];
    expect(event).toHaveProperty('processName');
    expect(event).toHaveProperty('windowTitle');
    expect(event).toHaveProperty('timestamp');
    expect(typeof event.processName).toBe('string');
    expect(typeof event.windowTitle).toBe('string');
    expect(typeof event.timestamp).toBe('number');
  });

  it('stop() prevents further events', async () => {
    const events = [];
    monitor = startAppMonitor({ pollMs: 200 });
    monitor.emitter.on('app-changed', (e) => events.push(e));

    await wait(500);
    monitor.stop();
    const countAfterStop = events.length;

    await wait(500);
    // No new events after stop
    expect(events.length).toBe(countAfterStop);
    monitor = null; // Already stopped
  });
});
