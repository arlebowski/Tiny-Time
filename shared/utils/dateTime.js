/**
 * Date/time utilities — shared between web and native.
 * Extracted from web/script.js
 */

/**
 * Get hour (0-23) from timestamp
 */
export const getHour = (ts) => new Date(ts).getHours();

/**
 * Get minutes-of-day (0-1439) from timestamp, local timezone
 */
export const getMinutesOfDay = (ts) => {
  try {
    const d = new Date(ts);
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return 0;
  }
};

/**
 * Get local date key YYYY-M-D for a timestamp
 */
export const getSleepDayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * Format duration in ms as H:MM:SS
 */
export const formatDurationHMS = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
};

/**
 * Get today's local date string (YYYY-MM-DD)
 */
export const getTodayLocalDateString = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
};
