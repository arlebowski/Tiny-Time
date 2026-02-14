/**
 * Display formatters — shared between web and native.
 * Extracted from web/script.js and web/components/TrackerCard.js
 */

import { formatDurationHMS } from './dateTime';
import { safeNumber, normalizeSleepWindowMins, classifyNapOvernight } from './calculations';

/**
 * formatV2Number — format number for display (integers as bare, decimals with 1 place)
 */
export const formatV2Number = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return String(rounded);
  return x.toFixed(1);
};

/**
 * formatVolume — format volume value (oz or ml)
 */
export const formatVolume = (valueOz, unit) => {
  const v = Number(valueOz);
  if (!Number.isFinite(v)) return '0';
  if (unit === 'ml') return String(Math.round(v * 29.5735));
  const rounded = Math.round(v);
  if (Math.abs(v - rounded) < 1e-9) return String(rounded);
  return v.toFixed(1);
};

/**
 * formatElapsedHmsTT — format elapsed ms as { h, m, s, showH, showM, showS, hStr, mStr, sStr, str }
 */
export const formatElapsedHmsTT = (ms) => {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

  if (h > 0) {
    const hStr = h >= 10 ? pad2(h) : String(h);
    const mStr = pad2(m);
    const sStr = pad2(s);
    return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: `${hStr}h ${mStr}m ${sStr}s` };
  }

  if (m > 0) {
    const mStr = m >= 10 ? pad2(m) : String(m);
    const sStr = pad2(s);
    return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
  }

  const sStr = s < 10 ? String(s) : pad2(s);
  return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
};

/**
 * formatRelativeTime — "Xm ago", "Xh Ym ago", "Just now"
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (remainingMinutes === 0) return `${hours}h ago`;
  return `${hours}h ${remainingMinutes}m ago`;
};

/**
 * formatRelativeTimeNoAgo — "Xm", "Xh Ym" (no "ago") for sleep "Awake Xh Ym"
 */
export const formatRelativeTimeNoAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * formatRecentFeedingLog — compact log for AI context (last 7 days)
 */
export const formatRecentFeedingLog = (feedings) => {
  if (!feedings || feedings.length === 0) return 'No recent feedings logged.';

  const sorted = [...feedings].sort((a, b) => a.timestamp - b.timestamp);

  const lines = sorted.map((f) => {
    const d = new Date(f.timestamp);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} ${timeStr} — ${f.ounces.toFixed(1)} oz`;
  });

  return lines.join('\n');
};

/**
 * formatRecentSleepLog — compact sleep log for AI context
 */
export const formatRecentSleepLog = (sessions, dayStartMins = 390, dayEndMins = 1170) => {
  if (!sessions || sessions.length === 0) return 'No recent sleep sessions logged.';

  const sorted = [...sessions].sort(
    (a, b) => (safeNumber(a.startTime) || 0) - (safeNumber(b.startTime) || 0)
  );

  const { start: windowStart, end: windowEnd } = normalizeSleepWindowMins(dayStartMins, dayEndMins);

  const lines = sorted
    .map((s) => {
      const start = safeNumber(s.startTime);
      if (!start) return null;

      const end = safeNumber(s.endTime);
      const isActive = !!s.isActive;
      const label = classifyNapOvernight(start, windowStart, windowEnd);

      const d = new Date(start);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const startStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      if (isActive || !end) {
        return `${dateStr} ${startStr} → in progress (${label})`;
      }

      const endStr = new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const durStr = formatDurationHMS(end - start);

      return `${dateStr} ${startStr} → ${endStr} — ${durStr} (${label})`;
    })
    .filter(Boolean);

  return lines.join('\n');
};
