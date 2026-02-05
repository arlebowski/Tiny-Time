// Shared analytics helpers (used by AnalyticsTab and SleepAnalyticsTab)
const _dateKeyLocal = (ms) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const _minutesSinceMidnightLocal = (ms) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

// Returns true if "startMin" is within [winStart, winEnd) where window may wrap over midnight.
const _isWithinWindow = (startMin, winStart, winEnd) => {
  const s = Number(winStart);
  const e = Number(winEnd);
  if (isNaN(s) || isNaN(e)) return false;
  if (s == e) return false;
  if (s < e) return startMin >= s && startMin < e;
  // wraps midnight
  return startMin >= s || startMin < e;
};

const _getDayWindow = (sleepSettings) => {
  // Prefer current fields; fall back to legacy if present.
  const dayStart = sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 7 * 60;
  const dayEnd = sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 19 * 60;
  return { dayStart: Number(dayStart), dayEnd: Number(dayEnd) };
};

// Aggregate by local day, splitting sessions that cross midnight.
const aggregateSleepByDay = (sleepSessions, sleepSettings) => {
  const { dayStart, dayEnd } = _getDayWindow(sleepSettings);
  const map = {}; // dateKey -> { totalHrs, dayHrs, nightHrs, count }
  (sleepSessions || []).forEach((s) => {
    const startRaw = Number(s?.startTime);
    const endRaw = Number(s?.endTime);
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) return;
    let start = startRaw;
    let end = endRaw;
    const nowMs = Date.now();
    if (start > nowMs + 3 * 3600000) start -= 86400000;
    if (end < start) start -= 86400000;
    if (end <= start) return;

    const startMin = _minutesSinceMidnightLocal(start);
    const isDay = _isWithinWindow(startMin, dayStart, dayEnd);

    // Walk across midnights and allocate hours to each local day.
    let cursor = start;
    while (cursor < end) {
      const dayStartDate = new Date(cursor);
      dayStartDate.setHours(0, 0, 0, 0);
      const nextMidnight = dayStartDate.getTime() + 86400000;
      const segEnd = Math.min(end, nextMidnight);
      const key = _dateKeyLocal(cursor);
      const hrs = (segEnd - cursor) / (1000 * 60 * 60);
      if (!map[key]) map[key] = { totalHrs: 0, dayHrs: 0, nightHrs: 0, count: 0 };
      map[key].totalHrs += hrs;
      if (isDay) map[key].dayHrs += hrs;
      else map[key].nightHrs += hrs;
      // Count session once, on the day it started (not on every split day).
      if (cursor === start) map[key].count += 1;
      cursor = segEnd;
    }
  });
  return map;
};

const _avg = (arr) => {
  if (!arr || !arr.length) return 0;
  const s = arr.reduce((a, b) => a + (Number(b) || 0), 0);
  return s / arr.length;
};
