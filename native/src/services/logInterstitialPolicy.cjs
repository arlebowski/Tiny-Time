/**
 * Cadence / cap rules for the post-log interstitial (pure).
 *
 * - Eligible on log 4, 8, 12, ...
 * - Max 3 shows per local calendar day
 * - Minimum 4-hour cooldown between shows
 * - If the ad is not loaded at the eligible log, skip; do not show on the next log
 */

const LOG_INTERVAL = 4;
const MAX_PER_DAY = 3;
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

const EMPTY_STATE = {
  logCount: 0,
  lastShownAt: null,
  dayKey: null,
  showsOnDay: 0,
};

function localDayKey(nowMs) {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeState(parsed) {
  return {
    logCount: Number(parsed?.logCount) || 0,
    lastShownAt: Number(parsed?.lastShownAt) || null,
    dayKey: typeof parsed?.dayKey === 'string' ? parsed.dayKey : null,
    showsOnDay: Number(parsed?.showsOnDay) || 0,
  };
}

function withCurrentDay(state, nowMs) {
  const dayKey = localDayKey(nowMs);
  if (state.dayKey !== dayKey) {
    return { ...state, dayKey, showsOnDay: 0 };
  }
  return state;
}

function isCadenceLog(logCount) {
  return logCount > 0 && logCount % LOG_INTERVAL === 0;
}

function isWithinFrequencyLimits(state, nowMs, options = {}) {
  const next = withCurrentDay(state, nowMs);
  if (!options.ignoreDayCap && next.showsOnDay >= MAX_PER_DAY) return false;
  if (
    !options.ignoreCooldown &&
    next.lastShownAt &&
    nowMs - next.lastShownAt < COOLDOWN_MS
  ) {
    return false;
  }
  return true;
}

function isEligibleToShow(state, nowMs, options = {}) {
  if (!isCadenceLog(state.logCount)) return false;
  return isWithinFrequencyLimits(state, nowMs, options);
}

function applyShown(state, nowMs) {
  const next = withCurrentDay(state, nowMs);
  return {
    ...next,
    lastShownAt: nowMs,
    showsOnDay: next.showsOnDay + 1,
    dayKey: localDayKey(nowMs),
  };
}

module.exports = {
  LOG_INTERVAL,
  MAX_PER_DAY,
  COOLDOWN_MS,
  EMPTY_STATE,
  localDayKey,
  normalizeState,
  withCurrentDay,
  isCadenceLog,
  isWithinFrequencyLimits,
  isEligibleToShow,
  applyShown,
};
