// Timer utilities — extract the time-flushing pattern duplicated 9x in background.js

// Flush elapsed time since last tick into an accumulator (mutating pattern).
// Returns { seconds, lastTick } with updated values.
function flushElapsed(isActive, lastTick, accumulatedSeconds) {
  if (!isActive || !lastTick) return { seconds: accumulatedSeconds, lastTick };
  const now = Date.now();
  const elapsed = Math.floor((now - lastTick) / 1000);
  return {
    seconds: accumulatedSeconds + Math.max(0, elapsed),
    lastTick: now,
  };
}

// Read-only snapshot of accumulated seconds (non-mutating, for status reporting).
function snapshotSeconds(isActive, lastTick, accumulatedSeconds) {
  if (!isActive || !lastTick) return accumulatedSeconds;
  return accumulatedSeconds + Math.max(0, Math.floor((Date.now() - lastTick) / 1000));
}
