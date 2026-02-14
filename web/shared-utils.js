/**
 * Shared utilities for web — loaded before script.js.
 * Attaches to window.TT.utils. Source of truth: shared/utils/
 * Run `node scripts/build-web-shared-utils.js` to regenerate from shared/utils.
 */
(function () {
  'use strict';

  const dateTime = {
    getHour: (ts) => new Date(ts).getHours(),
    getMinutesOfDay: (ts) => {
      try {
        const d = new Date(ts);
        return d.getHours() * 60 + d.getMinutes();
      } catch {
        return 0;
      }
    },
    getSleepDayKey: (ts) => {
      const d = new Date(ts);
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    },
    formatDurationHMS: (ms) => {
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad = (n) => String(n).padStart(2, '0');
      return h + ':' + pad(m) + ':' + pad(s);
    },
    getTodayLocalDateString: () => {
      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
    },
  };

  const calculations = {
    safeNumber: (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null),
    trendSlope: (arr) => {
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
    },
    isWithinWindowLocal: (mins, startMins, endMins) => {
      const s = Number(startMins);
      const e = Number(endMins);
      const m = Number(mins);
      if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
      if (s === e) return false;
      if (s < e) return m >= s && m <= e;
      return m >= s || m <= e;
    },
    normalizeSleepWindowMins: (startMins, endMins) => {
      const start = Number(startMins);
      const end = Number(endMins);
      if (Number.isFinite(start) && Number.isFinite(end)) return { start, end };
      return { start: 390, end: 1170 };
    },
    classifyNapOvernight: (startTs, dayStartMins, dayEndMins) => {
      const mins = dateTime.getMinutesOfDay(startTs);
      const norm = calculations.normalizeSleepWindowMins(dayStartMins, dayEndMins);
      return calculations.isWithinWindowLocal(mins, norm.start, norm.end) ? 'NAP' : 'OVERNIGHT';
    },
    analyzeAdvancedFeedingPatterns: (feedings) => {
      if (!feedings || feedings.length === 0) {
        return { daysTracked: 0, totalFeedings: 0, avgDailyIntake: 0, avgIntervalHours: 0, morningPercent: 0, afternoonPercent: 0, eveningPercent: 0, nightPercent: 0, midDayDriftDirection: 'unknown', midDayDriftMinutesPerDay: 0, last3DailyAvg: null, prev7DailyAvg: null, intakeSlope: 0 };
      }
      const sorted = feedings.slice().sort((a, b) => a.timestamp - b.timestamp);
      const first = sorted[0].timestamp;
      const last = sorted[sorted.length - 1].timestamp;
      const daysTracked = Math.max(1, Math.ceil((last - first) / 86400000));
      const dailyTotals = {};
      sorted.forEach((f) => {
        const d = new Date(f.timestamp);
        const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        dailyTotals[key] = (dailyTotals[key] || 0) + f.ounces;
      });
      const dayKeys = Object.keys(dailyTotals).sort();
      const dailyArray = dayKeys.map((k) => dailyTotals[k]);
      const totalIntake = dailyArray.reduce((a, b) => a + b, 0);
      const avgDailyIntake = totalIntake / dailyArray.length;
      const intakeSlope = calculations.trendSlope(dailyArray);
      let last3DailyAvg = null, prev7DailyAvg = null;
      if (dailyArray.length >= 3) last3DailyAvg = dailyArray.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (dailyArray.length >= 10) prev7DailyAvg = dailyArray.slice(-10, -3).reduce((a, b) => a + b, 0) / 7;
      let intervals = [];
      for (let i = 1; i < sorted.length; i++) intervals.push((sorted[i].timestamp - sorted[i - 1].timestamp) / 3600000);
      const avgIntervalHours = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
      let morning = 0, afternoon = 0, evening = 0, night = 0;
      sorted.forEach((f) => {
        const h = dateTime.getHour(f.timestamp);
        if (h >= 6 && h < 12) morning += f.ounces;
        else if (h >= 12 && h < 18) afternoon += f.ounces;
        else if (h >= 18 && h < 22) evening += f.ounces;
        else night += f.ounces;
      });
      const totalOz = morning + afternoon + evening + night || 1;
      let midDayDriftDirection = 'unknown', midDayDriftMinutesPerDay = 0;
      const midDayFeeds = sorted.filter((f) => { const h = dateTime.getHour(f.timestamp); return h >= 11 && h <= 15; });
      if (midDayFeeds.length > 3) {
        const perDay = {};
        midDayFeeds.forEach((f) => {
          const d = new Date(f.timestamp);
          const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
          if (!perDay[key]) perDay[key] = [];
          perDay[key].push(dateTime.getMinutesOfDay(f.timestamp));
        });
        const perDayKeys = Object.keys(perDay).sort();
        const avgMinutesSeries = perDayKeys.map((k) => perDay[k].reduce((a, b) => a + b, 0) / perDay[k].length);
        const slope = calculations.trendSlope(avgMinutesSeries);
        midDayDriftMinutesPerDay = slope;
        if (slope > 2) midDayDriftDirection = 'later';
        else if (slope < -2) midDayDriftDirection = 'earlier';
        else midDayDriftDirection = 'stable';
      }
      return { daysTracked, totalFeedings: sorted.length, avgDailyIntake, avgIntervalHours, morningPercent: (morning / totalOz) * 100, afternoonPercent: (afternoon / totalOz) * 100, eveningPercent: (evening / totalOz) * 100, nightPercent: (night / totalOz) * 100, midDayDriftDirection, midDayDriftMinutesPerDay, last3DailyAvg, prev7DailyAvg, intakeSlope };
    },
    analyzeSleepSessions: (sessions, dayStartMins, dayEndMins) => {
      if (!sessions || sessions.length === 0) return { daysTracked: 0, totalSessions: 0, avgTotalSleepHours: 0, avgOvernightSleepHours: 0, avgNapSleepHours: 0 };
      dayStartMins = dayStartMins ?? 390;
      dayEndMins = dayEndMins ?? 1170;
      const norm = calculations.normalizeSleepWindowMins(dayStartMins, dayEndMins);
      const cleaned = sessions.map((s) => {
        const start = calculations.safeNumber(s.startTime);
        const end = calculations.safeNumber(s.endTime);
        const label = start ? calculations.classifyNapOvernight(start, norm.start, norm.end) : 'OVERNIGHT';
        return { ...s, startTime: start, endTime: end, _aiSleepLabel: label };
      }).filter((s) => s.startTime && s.endTime && s.endTime > s.startTime && !s.isActive);
      if (cleaned.length === 0) return { daysTracked: 0, totalSessions: 0, avgTotalSleepHours: 0, avgOvernightSleepHours: 0, avgNapSleepHours: 0 };
      const daily = {};
      cleaned.forEach((s) => {
        const key = dateTime.getSleepDayKey(s.startTime);
        const durMs = s.endTime - s.startTime;
        if (!daily[key]) daily[key] = { totalMs: 0, napMs: 0, overnightMs: 0 };
        daily[key].totalMs += durMs;
        if (s._aiSleepLabel === 'NAP') daily[key].napMs += durMs;
        else daily[key].overnightMs += durMs;
      });
      const keys = Object.keys(daily).sort();
      const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return { daysTracked: keys.length, totalSessions: cleaned.length, avgTotalSleepHours: avg(keys.map((k) => daily[k].totalMs)) / 3600000, avgOvernightSleepHours: avg(keys.map((k) => daily[k].overnightMs)) / 3600000, avgNapSleepHours: avg(keys.map((k) => daily[k].napMs)) / 3600000 };
    },
    calculateAgeInMonths: (birthDate) => {
      if (!birthDate) return 0;
      const birth = new Date(birthDate);
      const now = new Date();
      return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    },
    sortFeedingsAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    sortNursingAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || a.startTime || 0) - (b.timestamp || b.startTime || 0)),
    sortSleepAsc: (list) => (list || []).slice().sort((a, b) => (a.startTime || 0) - (b.startTime || 0)),
    sortDiaperAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    sortSolidsAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
  };

  const formatters = {
    formatV2Number: (n) => {
      const x = Number(n);
      if (!Number.isFinite(x)) return '0';
      const rounded = Math.round(x);
      if (Math.abs(x - rounded) < 1e-9) return String(rounded);
      return x.toFixed(1);
    },
    formatVolume: (valueOz, unit) => {
      const v = Number(valueOz);
      if (!Number.isFinite(v)) return '0';
      if (unit === 'ml') return String(Math.round(v * 29.5735));
      const rounded = Math.round(v);
      if (Math.abs(v - rounded) < 1e-9) return String(rounded);
      return v.toFixed(1);
    },
    formatElapsedHmsTT: (ms) => {
      const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');
      if (h > 0) {
        const hStr = h >= 10 ? pad2(h) : String(h);
        const mStr = pad2(m);
        const sStr = pad2(s);
        return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: hStr + 'h ' + mStr + 'm ' + sStr + 's' };
      }
      if (m > 0) {
        const mStr = m >= 10 ? pad2(m) : String(m);
        const sStr = pad2(s);
        return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: mStr + 'm ' + sStr + 's' };
      }
      const sStr = s < 10 ? String(s) : pad2(s);
      return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: sStr + 's' };
    },
    formatRelativeTime: (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return minutes + 'm ago';
      if (remainingMinutes === 0) return hours + 'h ago';
      return hours + 'h ' + remainingMinutes + 'm ago';
    },
    formatRelativeTimeNoAgo: (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (minutes < 1) return 'just now';
      if (minutes < 60) return minutes + 'm';
      if (remainingMinutes === 0) return hours + 'h';
      return hours + 'h ' + remainingMinutes + 'm';
    },
    formatRecentFeedingLog: (feedings) => {
      if (!feedings || feedings.length === 0) return 'No recent feedings logged.';
      const sorted = feedings.slice().sort((a, b) => a.timestamp - b.timestamp);
      return sorted.map((f) => {
        const d = new Date(f.timestamp);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return dateStr + ' ' + timeStr + ' — ' + f.ounces.toFixed(1) + ' oz';
      }).join('\n');
    },
    formatRecentSleepLog: (sessions, dayStartMins, dayEndMins) => {
      if (!sessions || sessions.length === 0) return 'No recent sleep sessions logged.';
      dayStartMins = dayStartMins ?? 390;
      dayEndMins = dayEndMins ?? 1170;
      const calc = calculations;
      const sorted = sessions.slice().sort((a, b) => (calc.safeNumber(a.startTime) || 0) - (calc.safeNumber(b.startTime) || 0));
      const norm = calc.normalizeSleepWindowMins(dayStartMins, dayEndMins);
      return sorted.map((s) => {
        const start = calc.safeNumber(s.startTime);
        if (!start) return null;
        const end = calc.safeNumber(s.endTime);
        const isActive = !!s.isActive;
        const label = calc.classifyNapOvernight(start, norm.start, norm.end);
        const d = new Date(start);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const startStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        if (isActive || !end) return dateStr + ' ' + startStr + ' → in progress (' + label + ')';
        const endStr = new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const durStr = dateTime.formatDurationHMS(end - start);
        return dateStr + ' ' + startStr + ' → ' + endStr + ' — ' + durStr + ' (' + label + ')';
      }).filter(Boolean).join('\n');
    },
  };

  const calculations = {
    safeNumber: (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null),
    trendSlope: (arr) => {
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
    },
    isWithinWindowLocal: (mins, startMins, endMins) => {
      const s = Number(startMins);
      const e = Number(endMins);
      const m = Number(mins);
      if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
      if (s === e) return false;
      if (s < e) return m >= s && m <= e;
      return m >= s || m <= e;
    },
    normalizeSleepWindowMins: (startMins, endMins) => {
      const start = Number(startMins);
      const end = Number(endMins);
      if (Number.isFinite(start) && Number.isFinite(end)) return { start, end };
      return { start: 390, end: 1170 };
    },
    classifyNapOvernight: (startTs, dayStartMins, dayEndMins) => {
      const mins = dateTime.getMinutesOfDay(startTs);
      const norm = calculations.normalizeSleepWindowMins(dayStartMins, dayEndMins);
      return calculations.isWithinWindowLocal(mins, norm.start, norm.end) ? 'NAP' : 'OVERNIGHT';
    },
    analyzeAdvancedFeedingPatterns: (feedings) => {
      if (!feedings || feedings.length === 0) {
        return { daysTracked: 0, totalFeedings: 0, avgDailyIntake: 0, avgIntervalHours: 0, morningPercent: 0, afternoonPercent: 0, eveningPercent: 0, nightPercent: 0, midDayDriftDirection: 'unknown', midDayDriftMinutesPerDay: 0, last3DailyAvg: null, prev7DailyAvg: null, intakeSlope: 0 };
      }
      const sorted = feedings.slice().sort((a, b) => a.timestamp - b.timestamp);
      const first = sorted[0].timestamp;
      const last = sorted[sorted.length - 1].timestamp;
      const daysTracked = Math.max(1, Math.ceil((last - first) / 86400000));
      const dailyTotals = {};
      sorted.forEach((f) => {
        const d = new Date(f.timestamp);
        const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        dailyTotals[key] = (dailyTotals[key] || 0) + f.ounces;
      });
      const dayKeys = Object.keys(dailyTotals).sort();
      const dailyArray = dayKeys.map((k) => dailyTotals[k]);
      const totalIntake = dailyArray.reduce((a, b) => a + b, 0);
      const avgDailyIntake = totalIntake / dailyArray.length;
      const intakeSlope = calculations.trendSlope(dailyArray);
      let last3DailyAvg = null, prev7DailyAvg = null;
      if (dailyArray.length >= 3) last3DailyAvg = dailyArray.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (dailyArray.length >= 10) prev7DailyAvg = dailyArray.slice(-10, -3).reduce((a, b) => a + b, 0) / 7;
      let intervals = [];
      for (let i = 1; i < sorted.length; i++) intervals.push((sorted[i].timestamp - sorted[i - 1].timestamp) / 3600000);
      const avgIntervalHours = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
      let morning = 0, afternoon = 0, evening = 0, night = 0;
      sorted.forEach((f) => {
        const h = dateTime.getHour(f.timestamp);
        if (h >= 6 && h < 12) morning += f.ounces;
        else if (h >= 12 && h < 18) afternoon += f.ounces;
        else if (h >= 18 && h < 22) evening += f.ounces;
        else night += f.ounces;
      });
      const totalOz = morning + afternoon + evening + night || 1;
      let midDayDriftDirection = 'unknown', midDayDriftMinutesPerDay = 0;
      const midDayFeeds = sorted.filter((f) => { const h = dateTime.getHour(f.timestamp); return h >= 11 && h <= 15; });
      if (midDayFeeds.length > 3) {
        const perDay = {};
        midDayFeeds.forEach((f) => {
          const d = new Date(f.timestamp);
          const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
          if (!perDay[key]) perDay[key] = [];
          perDay[key].push(dateTime.getMinutesOfDay(f.timestamp));
        });
        const perDayKeys = Object.keys(perDay).sort();
        const avgMinutesSeries = perDayKeys.map((k) => perDay[k].reduce((a, b) => a + b, 0) / perDay[k].length);
        const slope = calculations.trendSlope(avgMinutesSeries);
        midDayDriftMinutesPerDay = slope;
        if (slope > 2) midDayDriftDirection = 'later';
        else if (slope < -2) midDayDriftDirection = 'earlier';
        else midDayDriftDirection = 'stable';
      }
      return { daysTracked, totalFeedings: sorted.length, avgDailyIntake, avgIntervalHours, morningPercent: (morning / totalOz) * 100, afternoonPercent: (afternoon / totalOz) * 100, eveningPercent: (evening / totalOz) * 100, nightPercent: (night / totalOz) * 100, midDayDriftDirection, midDayDriftMinutesPerDay, last3DailyAvg, prev7DailyAvg, intakeSlope };
    },
    analyzeSleepSessions: (sessions, dayStartMins, dayEndMins) => {
      if (!sessions || sessions.length === 0) return { daysTracked: 0, totalSessions: 0, avgTotalSleepHours: 0, avgOvernightSleepHours: 0, avgNapSleepHours: 0 };
      dayStartMins = dayStartMins ?? 390;
      dayEndMins = dayEndMins ?? 1170;
      const norm = calculations.normalizeSleepWindowMins(dayStartMins, dayEndMins);
      const cleaned = sessions.map((s) => {
        const start = calculations.safeNumber(s.startTime);
        const end = calculations.safeNumber(s.endTime);
        const label = start ? calculations.classifyNapOvernight(start, norm.start, norm.end) : 'OVERNIGHT';
        return { ...s, startTime: start, endTime: end, _aiSleepLabel: label };
      }).filter((s) => s.startTime && s.endTime && s.endTime > s.startTime && !s.isActive);
      if (cleaned.length === 0) return { daysTracked: 0, totalSessions: 0, avgTotalSleepHours: 0, avgOvernightSleepHours: 0, avgNapSleepHours: 0 };
      const daily = {};
      cleaned.forEach((s) => {
        const key = dateTime.getSleepDayKey(s.startTime);
        const durMs = s.endTime - s.startTime;
        if (!daily[key]) daily[key] = { totalMs: 0, napMs: 0, overnightMs: 0 };
        daily[key].totalMs += durMs;
        if (s._aiSleepLabel === 'NAP') daily[key].napMs += durMs;
        else daily[key].overnightMs += durMs;
      });
      const keys = Object.keys(daily).sort();
      const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return { daysTracked: keys.length, totalSessions: cleaned.length, avgTotalSleepHours: avg(keys.map((k) => daily[k].totalMs)) / 3600000, avgOvernightSleepHours: avg(keys.map((k) => daily[k].overnightMs)) / 3600000, avgNapSleepHours: avg(keys.map((k) => daily[k].napMs)) / 3600000 };
    },
    calculateAgeInMonths: (birthDate) => {
      if (!birthDate) return 0;
      const birth = new Date(birthDate);
      const now = new Date();
      return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    },
    sortFeedingsAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    sortNursingAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || a.startTime || 0) - (b.timestamp || b.startTime || 0)),
    sortSleepAsc: (list) => (list || []).slice().sort((a, b) => (a.startTime || 0) - (b.startTime || 0)),
    sortDiaperAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    sortSolidsAsc: (list) => (list || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
  };

  const validation = {
    isValidHex: (hex) => typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex),
  };

  window.TT = window.TT || {};
  window.TT.utils = window.TT.utils || {};
  Object.assign(window.TT.utils, dateTime, formatters, calculations, validation);
  window.TT.utils.dateTime = dateTime;
  window.TT.utils.formatters = formatters;
  window.TT.utils.calculations = calculations;
  window.TT.utils.validation = validation;
})();
