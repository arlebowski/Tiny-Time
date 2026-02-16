export const dateKeyLocal = (ms) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const minutesSinceMidnightLocal = (ms) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

// Returns true if startMin is in [winStart, winEnd), with midnight-wrap support.
export const isWithinWindow = (startMin, winStart, winEnd) => {
  const s = Number(winStart);
  const e = Number(winEnd);
  if (Number.isNaN(s) || Number.isNaN(e) || s === e) return false;
  if (s < e) return startMin >= s && startMin < e;
  return startMin >= s || startMin < e;
};

export const getDayWindow = (sleepSettings) => {
  const dayStart = sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 7 * 60;
  const dayEnd = sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 19 * 60;
  return { dayStart: Number(dayStart), dayEnd: Number(dayEnd) };
};

// Aggregate by local day, splitting sessions that cross midnight.
export const aggregateSleepByDay = (sleepSessions, sleepSettings) => {
  const { dayStart, dayEnd } = getDayWindow(sleepSettings);
  const map = {};
  (sleepSessions || []).forEach((s) => {
    const startRaw = Number(s?.startTime);
    const endRaw = Number(s?.endTime);
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) return;

    let start = startRaw;
    const end = endRaw;
    const nowMs = Date.now();
    if (start > nowMs + 3 * 3600000) start -= 86400000;
    if (end < start) start -= 86400000;
    if (end <= start) return;

    const startMin = minutesSinceMidnightLocal(start);
    const isDay = isWithinWindow(startMin, dayStart, dayEnd);

    let cursor = start;
    while (cursor < end) {
      const dayStartDate = new Date(cursor);
      dayStartDate.setHours(0, 0, 0, 0);
      const nextMidnight = dayStartDate.getTime() + 86400000;
      const segEnd = Math.min(end, nextMidnight);
      const key = dateKeyLocal(cursor);
      const hrs = (segEnd - cursor) / 3600000;
      if (!map[key]) map[key] = { totalHrs: 0, dayHrs: 0, nightHrs: 0, count: 0 };
      map[key].totalHrs += hrs;
      if (isDay) map[key].dayHrs += hrs;
      else map[key].nightHrs += hrs;
      if (cursor === start) map[key].count += 1;
      cursor = segEnd;
    }
  });
  return map;
};

export const avg = (arr) => {
  if (!arr || !arr.length) return 0;
  const sum = arr.reduce((a, b) => a + (Number(b) || 0), 0);
  return sum / arr.length;
};

export const formatV2Number = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  const fixed = num.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};
