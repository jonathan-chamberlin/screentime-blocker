// Timer utilities — extract the time-flushing pattern duplicated 9x in background.js

// Flush elapsed time since last tick into an accumulator (mutating pattern).
// Returns { millis, lastTick } with updated values.
// Now tracks milliseconds instead of seconds to prevent drift from Math.floor().
function flushElapsed(isActive, lastTick, accumulatedMillis) {
  if (!isActive || !lastTick) return { millis: accumulatedMillis, lastTick };
  const now = Date.now();
  const elapsed = now - lastTick;

  // Handle clock skew: if lastTick is in the future, reset it
  if (elapsed < 0) {
    return { millis: accumulatedMillis, lastTick: now };
  }

  return {
    millis: accumulatedMillis + elapsed,
    lastTick: now,
  };
}

// Read-only snapshot of accumulated seconds (non-mutating, for status reporting).
// Converts milliseconds to seconds for display.
function snapshotSeconds(isActive, lastTick, accumulatedMillis) {
  if (!isActive || !lastTick) return Math.floor(accumulatedMillis / 1000);
  const totalMillis = accumulatedMillis + Math.max(0, Date.now() - lastTick);
  return Math.floor(totalMillis / 1000);
}
