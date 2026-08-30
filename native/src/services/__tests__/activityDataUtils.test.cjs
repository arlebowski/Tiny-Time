const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACTIVITY_SPECS,
  DAY_CACHE_LIMIT,
  SLEEP_LOOKBACK_MS,
  buildCacheScopeKey,
  filterActivityItemsForWindow,
  getDayBounds,
  getDayBoundsFromKey,
  getQueryBounds,
  getRecentStartMs,
  isDateInRecentWindow,
  pruneDayCacheIndex,
  preserveSavedItemsUntilServerConfirms,
} = require('../activityDataUtils.cjs');

test('recent bounds include today and the previous 30 local calendar days', () => {
  const now = new Date(2026, 7, 16, 14, 30).getTime();
  const start = new Date(getRecentStartMs(now));
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 6);
  assert.equal(start.getDate(), 17);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
});

test('sleep queries add a 48-hour lookback without widening other activity queries', () => {
  const now = new Date(2026, 7, 16, 12).getTime();
  const sleepSpec = ACTIVITY_SPECS.find((spec) => spec.sleep);
  const feedingSpec = ACTIVITY_SPECS.find((spec) => spec.key === 'feedings');
  const recentStart = getRecentStartMs(now);
  assert.equal(getQueryBounds(sleepSpec, { mode: 'recent', nowMs: now }).startMs, recentStart - SLEEP_LOOKBACK_MS);
  assert.equal(getQueryBounds(feedingSpec, { mode: 'recent', nowMs: now }).startMs, recentStart);
});

test('all five recent activity queries have a finite lower bound', () => {
  const now = new Date(2026, 7, 16, 12).getTime();
  assert.equal(ACTIVITY_SPECS.length, 5);
  assert.deepEqual(
    ACTIVITY_SPECS.map((spec) => spec.key),
    ['feedings', 'nursingSessions', 'solidsSessions', 'sleepSessions', 'diaperChanges']
  );
  ACTIVITY_SPECS.forEach((spec) => {
    const bounds = getQueryBounds(spec, { mode: 'recent', nowMs: now });
    assert.equal(Number.isFinite(bounds.startMs), true, `${spec.key} must be lower-bounded`);
    assert.equal(bounds.endMs, null, `${spec.key} must continue receiving new activity after midnight`);
  });
});

test('older-day queries are bounded to one local day', () => {
  const date = new Date(2026, 2, 8, 12);
  const spec = ACTIVITY_SPECS.find((item) => item.key === 'feedings');
  const bounds = getQueryBounds(spec, { mode: 'day', dateLike: date });
  const expected = getDayBounds(date);
  assert.deepEqual(bounds, expected);
  assert.equal(new Date(bounds.startMs).getHours(), 0);
  assert.equal(new Date(bounds.endMs).getHours(), 0);
});

test('all five older-day queries stop at the next local midnight', () => {
  const date = new Date(2026, 10, 1, 12);
  const expected = getDayBounds(date);
  ACTIVITY_SPECS.forEach((spec) => {
    const bounds = getQueryBounds(spec, { mode: 'day', dateLike: date });
    assert.equal(bounds.endMs, expected.endMs, `${spec.key} must stop at next midnight`);
    assert.equal(
      bounds.startMs,
      spec.sleep ? expected.startMs - SLEEP_LOOKBACK_MS : expected.startMs,
      `${spec.key} has the wrong historical lower bound`
    );
  });
});

test('stored local date keys resolve without ISO string parsing', () => {
  const bounds = getDayBoundsFromKey('2026-03-08');
  assert.equal(new Date(bounds.startMs).getHours(), 0);
  assert.equal(new Date(bounds.startMs).getDate(), 8);
  assert.equal(new Date(bounds.endMs).getDate(), 9);
});

test('historical sleep keeps only sessions that overlap the selected day', () => {
  const selectedDate = new Date(2026, 7, 16, 12);
  const { startMs } = getDayBounds(selectedDate);
  const sleepSpec = ACTIVITY_SPECS.find((spec) => spec.sleep);
  const items = [
    { id: 'overnight', startTime: startMs - 2 * 60 * 60_000, endTime: startMs + 60 * 60_000 },
    { id: 'ended-yesterday', startTime: startMs - 6 * 60 * 60_000, endTime: startMs - 60_000 },
    { id: 'during-day', startTime: startMs + 2 * 60 * 60_000, endTime: startMs + 3 * 60 * 60_000 },
  ];
  assert.deepEqual(
    filterActivityItemsForWindow(sleepSpec, items, { mode: 'day', dateLike: selectedDate }).map((item) => item.id),
    ['overnight', 'during-day']
  );
});

test('an empty local snapshot cannot erase saved data before the server confirms it', () => {
  const saved = [{ id: 'saved-entry', timestamp: 1 }];
  assert.equal(
    preserveSavedItemsUntilServerConfirms(saved, [], { fromCache: true, hasPendingWrites: false }),
    saved
  );
  assert.deepEqual(
    preserveSavedItemsUntilServerConfirms(saved, [], { fromCache: false, hasPendingWrites: false }),
    []
  );
});

test('recent-window checks use calendar-day boundaries', () => {
  const now = new Date(2026, 7, 16, 22).getTime();
  assert.equal(isDateInRecentWindow(new Date(2026, 6, 17, 1), now), true);
  assert.equal(isDateInRecentWindow(new Date(2026, 6, 16, 23), now), false);
});

test('old-day cache keeps only 14 recent, unexpired, unique dates', () => {
  const now = Date.now();
  const entries = Array.from({ length: 18 }, (_, index) => ({
    dateKey: `2026-07-${String(index + 1).padStart(2, '0')}`,
    lastAccessedAt: now - index * 1000,
  }));
  entries.push({ dateKey: entries[0].dateKey, lastAccessedAt: now - 50_000 });
  entries.push({ dateKey: '2020-01-01', lastAccessedAt: 1 });
  const { kept, removed } = pruneDayCacheIndex(entries, now);
  assert.equal(kept.length, DAY_CACHE_LIMIT);
  assert.equal(new Set(kept.map((entry) => entry.dateKey)).size, DAY_CACHE_LIMIT);
  assert.ok(removed.includes('2020-01-01'));
  assert.equal(kept.some((entry) => removed.includes(entry.dateKey)), false);
});

test('activity cache scopes separate user, family, and child data', () => {
  const original = buildCacheScopeKey('user-a', 'family-a', 'child-a');
  assert.notEqual(original, buildCacheScopeKey('user-b', 'family-a', 'child-a'));
  assert.notEqual(original, buildCacheScopeKey('user-a', 'family-b', 'child-a'));
  assert.notEqual(original, buildCacheScopeKey('user-a', 'family-a', 'child-b'));
  assert.throws(() => buildCacheScopeKey(null, 'family-a', 'child-a'));
});
