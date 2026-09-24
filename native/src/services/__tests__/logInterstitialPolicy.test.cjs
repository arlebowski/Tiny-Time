const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LOG_INTERVAL,
  MAX_PER_DAY,
  COOLDOWN_MS,
  EMPTY_STATE,
  localDayKey,
  isCadenceLog,
  isWithinFrequencyLimits,
  isEligibleToShow,
  applyShown,
  withCurrentDay,
} = require('../logInterstitialPolicy.cjs');

test('cadence is every 4 logs starting at 4', () => {
  assert.equal(LOG_INTERVAL, 4);
  assert.equal(isCadenceLog(0), false);
  assert.equal(isCadenceLog(3), false);
  assert.equal(isCadenceLog(4), true);
  assert.equal(isCadenceLog(5), false);
  assert.equal(isCadenceLog(8), true);
  assert.equal(isCadenceLog(12), true);
});

test('first cadence log is eligible with empty state', () => {
  const now = new Date(2026, 8, 5, 16, 0).getTime();
  const state = { ...EMPTY_STATE, logCount: 4 };
  assert.equal(isEligibleToShow(state, now), true);
});

test('non-cadence logs are never eligible even with no caps', () => {
  const now = Date.now();
  assert.equal(isEligibleToShow({ ...EMPTY_STATE, logCount: 5 }, now), false);
});

test('non-log opportunities use the shared frequency limits without requiring cadence', () => {
  const now = new Date(2026, 8, 5, 16, 0).getTime();
  assert.equal(
    isWithinFrequencyLimits({ ...EMPTY_STATE, logCount: 5 }, now),
    true
  );
  assert.equal(
    isWithinFrequencyLimits({
      ...EMPTY_STATE,
      logCount: 5,
      lastShownAt: now - 1,
      dayKey: localDayKey(now),
      showsOnDay: 1,
    }, now),
    false
  );
});

test('caps at three shows per local calendar day', () => {
  const now = new Date(2026, 8, 5, 18, 0).getTime();
  const dayKey = localDayKey(now);
  assert.equal(MAX_PER_DAY, 3);
  const state = {
    logCount: 16,
    lastShownAt: now - COOLDOWN_MS,
    dayKey,
    showsOnDay: MAX_PER_DAY,
  };
  assert.equal(isEligibleToShow(state, now), false);
  assert.equal(isEligibleToShow(state, now, { ignoreDayCap: true }), true);
  assert.equal(
    isEligibleToShow({ ...state, showsOnDay: MAX_PER_DAY - 1 }, now),
    true
  );
});

test('day cap resets on a new local calendar day', () => {
  const morning = new Date(2026, 8, 6, 8, 0).getTime();
  const yesterday = localDayKey(new Date(2026, 8, 5, 22, 0).getTime());
  const state = {
    logCount: 8,
    lastShownAt: morning - COOLDOWN_MS,
    dayKey: yesterday,
    showsOnDay: MAX_PER_DAY,
  };
  assert.equal(isEligibleToShow(state, morning), true);
});

test('enforces a 4-hour cooldown', () => {
  const now = new Date(2026, 8, 5, 16, 0).getTime();
  assert.equal(COOLDOWN_MS, 4 * 60 * 60 * 1000);
  const state = {
    logCount: 8,
    lastShownAt: now - (COOLDOWN_MS - 1),
    dayKey: localDayKey(now),
    showsOnDay: 1,
  };
  assert.equal(isEligibleToShow(state, now), false);
  assert.equal(
    isEligibleToShow({ ...state, lastShownAt: now - COOLDOWN_MS }, now),
    true
  );
  assert.equal(isEligibleToShow(state, now, { ignoreCooldown: true }), true);
});

test('applyShown increments the local-day counter', () => {
  const now = new Date(2026, 8, 5, 16, 0).getTime();
  const next = applyShown({ ...EMPTY_STATE, logCount: 4 }, now);
  assert.equal(next.lastShownAt, now);
  assert.equal(next.showsOnDay, 1);
  assert.equal(next.dayKey, localDayKey(now));
  const again = applyShown(next, now);
  assert.equal(again.showsOnDay, 2);
});

test('withCurrentDay resets showsOnDay across midnight', () => {
  const now = new Date(2026, 8, 6, 0, 1).getTime();
  const rolled = withCurrentDay(
    { ...EMPTY_STATE, dayKey: '2026-09-05', showsOnDay: 3, logCount: 8 },
    now
  );
  assert.equal(rolled.showsOnDay, 0);
  assert.equal(rolled.dayKey, localDayKey(now));
});
