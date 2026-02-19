/**
 * Tracker comparison math — canonical implementation used by tracker/detail surfaces.
 */

export const TT_AVG_BUCKET_MINUTES = 15;
export const TT_AVG_BUCKET_MS = TT_AVG_BUCKET_MINUTES * 60000;
export const TT_AVG_BUCKETS = 96;
export const TT_AVG_DAYS = 7;
export const TT_AVG_EVEN_EPSILON = 0.05;

export function startOfDayMsLocal(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function bucketIndexCeilFromMinutes(mins) {
  const clamped = Math.max(
    0,
    Math.min(1440, Math.ceil(mins / TT_AVG_BUCKET_MINUTES) * TT_AVG_BUCKET_MINUTES)
  );
  return Math.min(TT_AVG_BUCKETS - 1, Math.floor(clamped / TT_AVG_BUCKET_MINUTES));
}

export function bucketIndexCeilFromMs(ts) {
  const d = new Date(ts);
  return bucketIndexCeilFromMinutes(d.getHours() * 60 + d.getMinutes());
}

export function normalizeSleepIntervalForAvg(startMs, endMs, nowMs = Date.now()) {
  let sMs = Number(startMs);
  let eMs = Number(endMs);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
  if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
  if (eMs < sMs) sMs -= 86400000;
  if (eMs < sMs) return null;
  return { startMs: sMs, endMs: eMs };
}

export function normalizeSleepStartMs(startMs, nowMs = Date.now()) {
  let s = Number(startMs);
  if (!Number.isFinite(s)) return null;
  if (s > nowMs + 3 * 3600000) s -= 86400000;
  return s;
}

export function addSleepOverlapToBuckets(startMs, endMs, dayStartMs, increments) {
  const dayEndMs = dayStartMs + 86400000;
  const overlapStart = Math.max(startMs, dayStartMs);
  const overlapEnd = Math.min(endMs, dayEndMs);
  if (overlapEnd <= overlapStart) return;

  const startBucket = Math.max(0, Math.floor((overlapStart - dayStartMs) / TT_AVG_BUCKET_MS));
  const endBucket = Math.min(
    TT_AVG_BUCKETS - 1,
    Math.floor((overlapEnd - dayStartMs - 1) / TT_AVG_BUCKET_MS)
  );

  for (let i = startBucket; i <= endBucket; i += 1) {
    const bucketStart = dayStartMs + i * TT_AVG_BUCKET_MS;
    const bucketEnd = bucketStart + TT_AVG_BUCKET_MS;
    const overlap = Math.max(0, Math.min(overlapEnd, bucketEnd) - Math.max(overlapStart, bucketStart));
    if (overlap > 0) increments[i] += overlap;
  }
}

function buildDayMap(entries, getTs, todayStartMs) {
  const dayMap = new Map();
  entries.forEach((entry) => {
    const ts = Number(getTs(entry));
    if (!Number.isFinite(ts) || ts >= todayStartMs) return;
    const dayStartMs = startOfDayMsLocal(ts);
    const list = dayMap.get(dayStartMs) || [];
    list.push(entry);
    dayMap.set(dayStartMs, list);
  });
  return dayMap;
}

function pickRecentDayStarts(dayMap) {
  return Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
}

export function buildFeedAvgBuckets(allFeedings, todayStartMs) {
  if (!Array.isArray(allFeedings) || allFeedings.length === 0) return null;
  const dayMap = buildDayMap(allFeedings, (f) => f?.timestamp || 0, todayStartMs);
  const dayStarts = pickRecentDayStarts(dayMap);
  if (dayStarts.length === 0) return null;

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  dayStarts.forEach((dayStartMs) => {
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    const dayFeedings = dayMap.get(dayStartMs) || [];
    dayFeedings.forEach((f) => {
      const ts = Number(f?.timestamp || 0);
      const oz = Number(f?.ounces || 0);
      if (!Number.isFinite(ts) || !Number.isFinite(oz) || oz <= 0) return;
      const idx = bucketIndexCeilFromMs(ts);
      increments[idx] += oz;
    });
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => v / dayStarts.length),
    daysUsed: dayStarts.length,
  };
}

export function buildNursingAvgBuckets(allNursingSessions, todayStartMs) {
  if (!Array.isArray(allNursingSessions) || allNursingSessions.length === 0) return null;
  const dayMap = buildDayMap(allNursingSessions, (s) => s?.timestamp || s?.startTime || 0, todayStartMs);
  const dayStarts = pickRecentDayStarts(dayMap);
  if (dayStarts.length === 0) return null;

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  dayStarts.forEach((dayStartMs) => {
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    const daySessions = dayMap.get(dayStartMs) || [];
    daySessions.forEach((s) => {
      const ts = Number(s?.timestamp || s?.startTime || 0);
      const left = Number(s?.leftDurationSec || 0);
      const right = Number(s?.rightDurationSec || 0);
      const totalSec = Math.max(0, left + right);
      if (!Number.isFinite(ts) || totalSec <= 0) return;
      const idx = bucketIndexCeilFromMs(ts);
      increments[idx] += totalSec / 3600;
    });
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => v / dayStarts.length),
    daysUsed: dayStarts.length,
  };
}

export function buildSolidsAvgBuckets(allSolidsSessions, todayStartMs) {
  if (!Array.isArray(allSolidsSessions) || allSolidsSessions.length === 0) return null;
  const dayMap = buildDayMap(allSolidsSessions, (s) => s?.timestamp || 0, todayStartMs);
  const dayStarts = pickRecentDayStarts(dayMap);
  if (dayStarts.length === 0) return null;

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  dayStarts.forEach((dayStartMs) => {
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    const daySessions = dayMap.get(dayStartMs) || [];
    daySessions.forEach((s) => {
      const ts = Number(s?.timestamp || 0);
      const foods = Array.isArray(s?.foods) ? s.foods.length : 0;
      if (!Number.isFinite(ts) || foods <= 0) return;
      const idx = bucketIndexCeilFromMs(ts);
      increments[idx] += foods;
    });
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => v / dayStarts.length),
    daysUsed: dayStarts.length,
  };
}

export function buildSleepAvgBuckets(allSleepSessions, todayStartMs) {
  if (!Array.isArray(allSleepSessions) || allSleepSessions.length === 0) return null;

  const normalized = allSleepSessions
    .map((s) => {
      if (!s?.startTime || !s?.endTime) return null;
      const norm = normalizeSleepIntervalForAvg(s.startTime, s.endTime);
      return norm ? { startMs: norm.startMs, endMs: norm.endMs } : null;
    })
    .filter(Boolean);
  if (normalized.length === 0) return null;

  const daySet = new Set();
  normalized.forEach((s) => {
    const endDayStart = startOfDayMsLocal(s.endMs);
    for (let ds = startOfDayMsLocal(s.startMs); ds <= endDayStart; ds += 86400000) {
      if (ds < todayStartMs) daySet.add(ds);
    }
  });

  const dayStarts = Array.from(daySet).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
  if (dayStarts.length === 0) return null;

  const dayIndex = new Map(dayStarts.map((d, i) => [d, i]));
  const perDayIncrements = dayStarts.map(() => Array(TT_AVG_BUCKETS).fill(0));
  normalized.forEach((s) => {
    const endDayStart = startOfDayMsLocal(s.endMs);
    for (let ds = startOfDayMsLocal(s.startMs); ds <= endDayStart; ds += 86400000) {
      const idx = dayIndex.get(ds);
      if (idx == null) continue;
      addSleepOverlapToBuckets(s.startMs, s.endMs, ds, perDayIncrements[idx]);
    }
  });

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  perDayIncrements.forEach((increments) => {
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => (v / dayStarts.length) / 3600000),
    daysUsed: dayStarts.length,
  };
}

export function calcFeedCumulativeAtBucket(entries, bucketIdx, dayStartMs, dayEndMs) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  entries.forEach((f) => {
    const ts = Number(f?.timestamp || 0);
    const oz = Number(f?.ounces || 0);
    if (!Number.isFinite(ts) || ts < dayStartMs || ts >= dayEndMs) return;
    if (!Number.isFinite(oz) || oz <= 0) return;
    const idx = bucketIndexCeilFromMs(ts);
    increments[idx] += oz;
  });
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running;
}

export function calcNursingCumulativeAtBucket(entries, bucketIdx, dayStartMs, dayEndMs) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  entries.forEach((s) => {
    const ts = Number(s?.timestamp || s?.startTime || 0);
    if (!Number.isFinite(ts) || ts < dayStartMs || ts >= dayEndMs) return;
    const left = Number(s?.leftDurationSec || 0);
    const right = Number(s?.rightDurationSec || 0);
    const totalSec = Math.max(0, left + right);
    if (totalSec <= 0) return;
    const idx = bucketIndexCeilFromMs(ts);
    increments[idx] += totalSec / 3600;
  });
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running;
}

export function calcSolidsCumulativeAtBucket(entries, bucketIdx, dayStartMs, dayEndMs) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  entries.forEach((s) => {
    const ts = Number(s?.timestamp || 0);
    if (!Number.isFinite(ts) || ts < dayStartMs || ts >= dayEndMs) return;
    const foods = Array.isArray(s?.foods) ? s.foods.length : 0;
    if (foods <= 0) return;
    const idx = bucketIndexCeilFromMs(ts);
    increments[idx] += foods;
  });
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running;
}

export function calcSleepCumulativeAtBucket(entries, bucketIdx, dayStartMs, activeSleepSession = null, nowMs = Date.now()) {
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  (entries || []).forEach((s) => {
    const startMs = Number(s?._normStartTime || s?.startTime || 0);
    const endMs = Number(s?._normEndTime || s?.endTime || 0);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
    addSleepOverlapToBuckets(startMs, endMs, dayStartMs, increments);
  });
  if (activeSleepSession?.startTime) {
    const startMs = normalizeSleepStartMs(activeSleepSession.startTime, nowMs);
    if (startMs) addSleepOverlapToBuckets(startMs, nowMs, dayStartMs, increments);
  }
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running / 3600000;
}

export function buildComparison(delta, unit, evenEpsilon = TT_AVG_EVEN_EPSILON) {
  return { delta, unit, evenEpsilon };
}
