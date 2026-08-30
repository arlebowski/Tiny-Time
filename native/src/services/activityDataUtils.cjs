const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_COMPLETE_DAYS = 30;
const SLEEP_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const DAY_CACHE_LIMIT = 14;
const DAY_CACHE_MAX_AGE_MS = 30 * DAY_MS;

const ACTIVITY_SPECS = Object.freeze([
  { key: 'feedings', collectionKey: 'feedings', timestampField: 'timestamp' },
  { key: 'nursingSessions', collectionKey: 'nursingSessions', timestampField: 'timestamp' },
  { key: 'solidsSessions', collectionKey: 'solidsSessions', timestampField: 'timestamp' },
  { key: 'sleepSessions', collectionKey: 'sleepSessions', timestampField: 'startTime', sleep: true },
  { key: 'diaperChanges', collectionKey: 'diaperChanges', timestampField: 'timestamp' },
]);

function createEmptyActivityBundle() {
  return {
    feedings: [],
    nursingSessions: [],
    solidsSessions: [],
    sleepSessions: [],
    diaperChanges: [],
  };
}

function startOfLocalDayMs(dateLike = Date.now()) {
  const date = dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addLocalDays(startMs, days) {
  const date = new Date(startMs);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function getRecentStartMs(dateLike = Date.now()) {
  return addLocalDays(startOfLocalDayMs(dateLike), -RECENT_COMPLETE_DAYS);
}

function getDayBounds(dateLike) {
  const startMs = startOfLocalDayMs(dateLike);
  return { startMs, endMs: addLocalDays(startMs, 1) };
}

function getDayBoundsFromKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!match) throw new Error(`Invalid local date key: ${dateKey}`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return getDayBounds(date);
}

function toLocalDateKey(dateLike = Date.now()) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateInRecentWindow(dateLike, nowMs = Date.now()) {
  return startOfLocalDayMs(dateLike) >= getRecentStartMs(nowMs);
}

function buildCacheScopeKey(userId, familyId, kidId) {
  if (!userId || !familyId || !kidId) {
    throw new Error('Activity cache scope requires user, family, and child identifiers');
  }
  return `${userId}:${familyId}:${kidId}`;
}

function getQueryBounds(spec, { mode, dateLike = Date.now(), nowMs = Date.now() }) {
  if (mode === 'recent') {
    const recentStartMs = getRecentStartMs(nowMs);
    return {
      startMs: spec.sleep ? recentStartMs - SLEEP_LOOKBACK_MS : recentStartMs,
      endMs: null,
    };
  }

  const { startMs, endMs } = getDayBounds(dateLike);
  return {
    startMs: spec.sleep ? startMs - SLEEP_LOOKBACK_MS : startMs,
    endMs,
  };
}

function filterActivityItemsForWindow(spec, items, { mode, dateLike = Date.now(), nowMs = Date.now() }) {
  const list = Array.isArray(items) ? items : [];
  if (!spec?.sleep) {
    const bounds = getQueryBounds(spec, { mode, dateLike, nowMs });
    return list.filter((item) => {
      const timestamp = Number(item?.[spec.timestampField]);
      return Number.isFinite(timestamp)
        && timestamp >= bounds.startMs
        && (!Number.isFinite(bounds.endMs) || timestamp < bounds.endMs);
    });
  }

  const target = mode === 'recent'
    ? { startMs: getRecentStartMs(nowMs), endMs: null }
    : getDayBounds(dateLike);
  return list.filter((item) => {
    const startMs = Number(item?.startTime);
    const endMs = Number(item?.endTime || (item?.isActive ? nowMs : startMs));
    return Number.isFinite(startMs)
      && Number.isFinite(endMs)
      && (!Number.isFinite(target.endMs) || startMs < target.endMs)
      && endMs >= target.startMs;
  });
}

function preserveSavedItemsUntilServerConfirms(saved, incoming, metadata = {}) {
  return metadata.fromCache
    && !metadata.hasPendingWrites
    && Array.isArray(saved)
    && saved.length > 0
    && (!Array.isArray(incoming) || incoming.length === 0)
      ? saved
      : incoming;
}

function pruneDayCacheIndex(entries, nowMs = Date.now()) {
  const valid = (Array.isArray(entries) ? entries : [])
    .filter((entry) => (
      entry
      && typeof entry.dateKey === 'string'
      && Number.isFinite(Number(entry.lastAccessedAt))
      && nowMs - Number(entry.lastAccessedAt) <= DAY_CACHE_MAX_AGE_MS
    ))
    .sort((a, b) => Number(b.lastAccessedAt) - Number(a.lastAccessedAt));

  const seen = new Set();
  const kept = [];
  const removed = [];
  valid.forEach((entry) => {
    if (seen.has(entry.dateKey)) return;
    seen.add(entry.dateKey);
    if (kept.length >= DAY_CACHE_LIMIT) {
      removed.push(entry.dateKey);
      return;
    }
    kept.push(entry);
  });

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (entry?.dateKey && !seen.has(entry.dateKey) && !removed.includes(entry.dateKey)) {
      removed.push(entry.dateKey);
    }
  });

  return { kept, removed };
}

module.exports = {
  DAY_MS,
  RECENT_COMPLETE_DAYS,
  SLEEP_LOOKBACK_MS,
  DAY_CACHE_LIMIT,
  DAY_CACHE_MAX_AGE_MS,
  ACTIVITY_SPECS,
  createEmptyActivityBundle,
  startOfLocalDayMs,
  getRecentStartMs,
  getDayBounds,
  getDayBoundsFromKey,
  toLocalDateKey,
  isDateInRecentWindow,
  buildCacheScopeKey,
  getQueryBounds,
  filterActivityItemsForWindow,
  preserveSavedItemsUntilServerConfirms,
  pruneDayCacheIndex,
};
