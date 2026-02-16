/**
 * Data calculation utilities — shared between web and native.
 * Extracted from web/script.js: feeding patterns, sleep analysis, age, sorting
 */

import { getHour, getMinutesOfDay, getSleepDayKey, formatDurationHMS } from './dateTime';

/**
 * Safe number coercion (null if invalid)
 */
export const safeNumber = (v) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : null;

/**
 * Linear regression slope for trend analysis
 */
export const trendSlope = (arr) => {
  if (!arr || arr.length < 3) return 0;
  const n = arr.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += arr[i];
    sumXY += i * arr[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
};

/**
 * Check if minutes-of-day is within window (handles midnight wrap)
 */
export const isWithinWindowLocal = (mins, startMins, endMins) => {
  const s = Number(startMins);
  const e = Number(endMins);
  const m = Number(mins);
  if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
  if (s === e) return false;
  if (s < e) return m >= s && m <= e;
  return m >= s || m <= e;
};

/**
 * Normalize sleep day window (default 6:30–19:30)
 */
export const normalizeSleepWindowMins = (startMins, endMins) => {
  const start = Number(startMins);
  const end = Number(endMins);
  if (Number.isFinite(start) && Number.isFinite(end)) {
    return { start, end };
  }
  return { start: 390, end: 1170 };
};

/**
 * Classify sleep session as NAP or OVERNIGHT based on start time
 */
export const classifyNapOvernight = (startTs, dayStartMins, dayEndMins) => {
  const mins = getMinutesOfDay(startTs);
  const { start, end } = normalizeSleepWindowMins(dayStartMins, dayEndMins);
  const isNap = isWithinWindowLocal(mins, start, end);
  return isNap ? 'NAP' : 'OVERNIGHT';
};

/**
 * Analyze feeding patterns (advanced stats)
 */
export const analyzeAdvancedFeedingPatterns = (feedings) => {
  if (!feedings || feedings.length === 0) {
    return {
      daysTracked: 0,
      totalFeedings: 0,
      avgDailyIntake: 0,
      avgIntervalHours: 0,
      morningPercent: 0,
      afternoonPercent: 0,
      eveningPercent: 0,
      nightPercent: 0,
      midDayDriftDirection: 'unknown',
      midDayDriftMinutesPerDay: 0,
      last3DailyAvg: null,
      prev7DailyAvg: null,
      intakeSlope: 0,
    };
  }

  const sorted = [...feedings].sort((a, b) => a.timestamp - b.timestamp);
  const timestamps = sorted.map((f) => f.timestamp);

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const daysTracked = Math.max(1, Math.ceil((last - first) / (1000 * 60 * 60 * 24)));

  const dailyTotals = {};
  sorted.forEach((f) => {
    const d = new Date(f.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    dailyTotals[key] = (dailyTotals[key] || 0) + f.ounces;
  });
  const dayKeys = Object.keys(dailyTotals).sort();
  const dailyArray = dayKeys.map((k) => dailyTotals[k]);
  const totalIntake = dailyArray.reduce((a, b) => a + b, 0);
  const avgDailyIntake = totalIntake / dailyArray.length;

  const intakeSlope = trendSlope(dailyArray);

  let last3DailyAvg = null;
  let prev7DailyAvg = null;
  if (dailyArray.length >= 3) {
    const last3 = dailyArray.slice(-3);
    last3DailyAvg = last3.reduce((a, b) => a + b, 0) / last3.length;
  }
  if (dailyArray.length >= 10) {
    const prev7 = dailyArray.slice(-10, -3);
    prev7DailyAvg = prev7.reduce((a, b) => a + b, 0) / prev7.length;
  }

  let intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffHours = (sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60);
    intervals.push(diffHours);
  }
  const avgIntervalHours =
    intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

  let morning = 0, afternoon = 0, evening = 0, night = 0;
  sorted.forEach((f) => {
    const h = getHour(f.timestamp);
    if (h >= 6 && h < 12) morning += f.ounces;
    else if (h >= 12 && h < 18) afternoon += f.ounces;
    else if (h >= 18 && h < 22) evening += f.ounces;
    else night += f.ounces;
  });
  const totalOz = morning + afternoon + evening + night || 1;
  const morningPercent = (morning / totalOz) * 100;
  const afternoonPercent = (afternoon / totalOz) * 100;
  const eveningPercent = (evening / totalOz) * 100;
  const nightPercent = (night / totalOz) * 100;

  const midDayFeeds = sorted.filter((f) => {
    const h = getHour(f.timestamp);
    return h >= 11 && h <= 15;
  });

  let midDayDriftDirection = 'unknown';
  let midDayDriftMinutesPerDay = 0;

  if (midDayFeeds.length > 3) {
    const perDay = {};
    midDayFeeds.forEach((f) => {
      const d = new Date(f.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!perDay[key]) perDay[key] = [];
      perDay[key].push(getMinutesOfDay(f.timestamp));
    });
    const perDayKeys = Object.keys(perDay).sort();
    const avgMinutesSeries = perDayKeys.map((k) => {
      const arr = perDay[k];
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    });
    const slope = trendSlope(avgMinutesSeries);
    midDayDriftMinutesPerDay = slope;
    if (slope > 2) midDayDriftDirection = 'later';
    else if (slope < -2) midDayDriftDirection = 'earlier';
    else midDayDriftDirection = 'stable';
  }

  return {
    daysTracked,
    totalFeedings: sorted.length,
    avgDailyIntake,
    avgIntervalHours,
    morningPercent,
    afternoonPercent,
    eveningPercent,
    nightPercent,
    midDayDriftDirection,
    midDayDriftMinutesPerDay,
    last3DailyAvg,
    prev7DailyAvg,
    intakeSlope,
  };
};

/**
 * Analyze sleep sessions (nap vs overnight, averages)
 */
export const analyzeSleepSessions = (sessions, dayStartMins = 390, dayEndMins = 1170) => {
  if (!sessions || sessions.length === 0) {
    return {
      daysTracked: 0,
      totalSessions: 0,
      avgTotalSleepHours: 0,
      avgOvernightSleepHours: 0,
      avgNapSleepHours: 0,
    };
  }

  const { start: windowStart, end: windowEnd } = normalizeSleepWindowMins(dayStartMins, dayEndMins);

  const cleaned = sessions
    .map((s) => {
      const start = safeNumber(s.startTime);
      const end = safeNumber(s.endTime);
      const isActive = !!s.isActive;
      const label = start ? classifyNapOvernight(start, windowStart, windowEnd) : 'OVERNIGHT';
      return { ...s, startTime: start, endTime: end, isActive, _aiSleepLabel: label };
    })
    .filter(
      (s) =>
        s.startTime &&
        s.endTime &&
        s.endTime > s.startTime &&
        !s.isActive
    );

  if (cleaned.length === 0) {
    return {
      daysTracked: 0,
      totalSessions: 0,
      avgTotalSleepHours: 0,
      avgOvernightSleepHours: 0,
      avgNapSleepHours: 0,
    };
  }

  const daily = {};
  cleaned.forEach((s) => {
    const key = getSleepDayKey(s.startTime);
    const durMs = s.endTime - s.startTime;
    if (!daily[key]) daily[key] = { totalMs: 0, napMs: 0, overnightMs: 0 };
    daily[key].totalMs += durMs;
    if (s._aiSleepLabel === 'NAP') daily[key].napMs += durMs;
    else daily[key].overnightMs += durMs;
  });

  const keys = Object.keys(daily).sort();
  const daysTracked = keys.length;
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    daysTracked,
    totalSessions: cleaned.length,
    avgTotalSleepHours: avg(keys.map((k) => daily[k].totalMs)) / 3600000,
    avgOvernightSleepHours: avg(keys.map((k) => daily[k].overnightMs)) / 3600000,
    avgNapSleepHours: avg(keys.map((k) => daily[k].napMs)) / 3600000,
  };
};

/**
 * Calculate age in months from birth date (timestamp or Date)
 */
export const calculateAgeInMonths = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
};

/**
 * Sort helpers for tracker data (used by cache/storage layer)
 */
export const sortFeedingsAsc = (list) =>
  [...(list || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

export const sortNursingAsc = (list) =>
  [...(list || [])].sort((a, b) => (a.timestamp || a.startTime || 0) - (b.timestamp || b.startTime || 0));

export const sortSleepAsc = (list) =>
  [...(list || [])].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

export const sortDiaperAsc = (list) =>
  [...(list || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

export const sortSolidsAsc = (list) =>
  [...(list || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
