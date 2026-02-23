/**
 * Shared formatting utilities.
 * Used by all UI timer displays.
 */

/**
 * Format milliseconds into a human-readable timer string.
 * - Under 60 minutes: MM:SS (e.g., "23:45")
 * - 60 minutes or more: H:MM:SS (e.g., "1:23:45")
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted timer string
 */
export function formatTimer(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
