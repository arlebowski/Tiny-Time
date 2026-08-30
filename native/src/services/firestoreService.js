/**
 * firestoreService — Firestore CRUD for React Native
 * Port of web/script.js firestoreStorage using @react-native-firebase/firestore.
 *
 * Activity reads flow through the recent/day bundle APIs below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLLECTIONS } from '../../../shared/firebase/collections';
const {
  ACTIVITY_SPECS,
  DAY_CACHE_MAX_AGE_MS,
  createEmptyActivityBundle,
  getRecentStartMs,
  getDayBoundsFromKey,
  toLocalDateKey,
  getQueryBounds,
  filterActivityItemsForWindow,
  preserveSavedItemsUntilServerConfirms,
  pruneDayCacheIndex,
  buildCacheScopeKey,
} = require('./activityDataUtils.cjs');

let firestore = null;
let auth = null;
try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {}
try {
  auth = require('@react-native-firebase/auth').default;
} catch {}
const FIREBASE_AVAILABLE = typeof firestore === 'function' && typeof auth === 'function';

// ── Helpers ──

const sortDesc = (list, field = 'timestamp') =>
  [...(list || [])].sort((a, b) => (b[field] || b.startTime || 0) - (a[field] || a.startTime || 0));

const bundleHasItems = (bundle) =>
  ACTIVITY_SPECS.some(({ key }) => Array.isArray(bundle?.[key]) && bundle[key].length > 0);

const RECENT_CACHE_PREFIX = 'tt_activity_recent_v2';
const DAY_CACHE_PREFIX = 'tt_activity_day_v1';
const DAY_CACHE_INDEX_PREFIX = 'tt_activity_day_index_v1';
const LEGACY_CACHE_PREFIX = 'tt_cache_v1';
const CACHE_MAX_AGE_MS = 5 * 60_000;
const CACHE_WRITE_DEBOUNCE_MS = 750;
const FUTURE_TOLERANCE_MS = 60_000;
const FREEZE_DEBUG = false;
const debugLog = (...args) => {
  if (FREEZE_DEBUG) console.log('[FreezeDebug][FirestoreService]', ...args);
};
const FIRESTORE_QUERY_TIMEOUT_MS = 12000;

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

const clampFutureTimestamp = (value, nowMs = Date.now()) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return nowMs;
  return n > nowMs + FUTURE_TOLERANCE_MS ? nowMs : n;
};

// ── Service singleton ──

const firestoreService = {
  isAvailable: FIREBASE_AVAILABLE,
  currentUserId: null,
  currentFamilyId: null,
  currentKidId: null,
  _cache: {
    ...createEmptyActivityBundle(),
    lastSyncMs: 0,
  },
  _dayCache: new Map(),
  _dayCacheLastSync: new Map(),
  _refreshPromise: null,
  _recentCacheWritePromise: Promise.resolve(),
  _dayCacheWritePromise: Promise.resolve(),
  _recentCacheWriteTimer: null,
  _recentCacheDirty: false,
  _dayCacheWriteTimers: new Map(),
  _legacyCacheCleanupDone: false,
  _scopeToken: 0,
  hasHydratedRecentCache: false,

  // ─── Init ───

  initialize(userId, familyId, kidId) {
    if (this._recentCacheWriteTimer) clearTimeout(this._recentCacheWriteTimer);
    this._dayCacheWriteTimers.forEach((timer) => clearTimeout(timer));
    this._scopeToken += 1;
    this.currentUserId = userId || auth?.()?.currentUser?.uid || null;
    this.currentFamilyId = familyId;
    this.currentKidId = kidId;
    this._cache = {
      ...createEmptyActivityBundle(),
      lastSyncMs: 0,
    };
    this._dayCache = new Map();
    this._dayCacheLastSync = new Map();
    this._refreshPromise = null;
    this._recentCacheWritePromise = Promise.resolve();
    this._dayCacheWritePromise = Promise.resolve();
    this._recentCacheWriteTimer = null;
    this._recentCacheDirty = false;
    this._dayCacheWriteTimers = new Map();
    this._legacyCacheCleanupDone = false;
    this.hasHydratedRecentCache = false;
  },

  _kidRef() {
    if (!this.currentFamilyId || !this.currentKidId) {
      throw new Error('firestoreService not initialized');
    }
    return firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .collection('kids')
      .doc(this.currentKidId);
  },

  _scopeKey() {
    return buildCacheScopeKey(this.currentUserId, this.currentFamilyId, this.currentKidId);
  },

  _recentCacheKey() {
    return `${RECENT_CACHE_PREFIX}:${this._scopeKey()}`;
  },

  _dayCacheKey(dateKey) {
    return `${DAY_CACHE_PREFIX}:${this._scopeKey()}:${dateKey}`;
  },

  _dayCacheIndexKey() {
    return `${DAY_CACHE_INDEX_PREFIX}:${this._scopeKey()}`;
  },

  _legacyCacheKeys() {
    if (!this.currentFamilyId || !this.currentKidId) return [];
    return ACTIVITY_SPECS.map(
      ({ key }) => `${LEGACY_CACHE_PREFIX}:${this.currentFamilyId}:${this.currentKidId}:${key}`
    );
  },

  async loadRecentCache() {
    const start = Date.now();
    const scopeToken = this._scopeToken;
    try {
      const cacheKey = this._recentCacheKey();
      const value = await AsyncStorage.getItem(cacheKey);
      if (scopeToken !== this._scopeToken) return createEmptyActivityBundle();
      const parsed = value ? JSON.parse(value) : null;
      this.hasHydratedRecentCache = Boolean(parsed?.data);
      ACTIVITY_SPECS.forEach(({ key, timestampField }) => {
        const spec = ACTIVITY_SPECS.find((item) => item.key === key);
        const items = filterActivityItemsForWindow(spec, parsed?.data?.[key], { mode: 'recent' });
        this._cache[key] = sortDesc(items, timestampField);
      });
      this._cache.lastSyncMs = Number(parsed?.lastSuccessfulSyncAt || 0);
      if (this.hasHydratedRecentCache) this._cleanupLegacyCachesOnce().catch(() => {});
      debugLog('loadRecentCache:done', { ms: Date.now() - start });
    } catch {}
    return this.getCachedRecentActivities();
  },

  getCachedRecentActivities() {
    const bundle = createEmptyActivityBundle();
    ACTIVITY_SPECS.forEach(({ key }) => {
      bundle[key] = [...(this._cache[key] || [])];
    });
    return bundle;
  },

  async _cleanupLegacyCachesOnce(scopeToken = this._scopeToken) {
    if (scopeToken !== this._scopeToken || this._legacyCacheCleanupDone) return;
    this._legacyCacheCleanupDone = true;
    const legacyKeys = this._legacyCacheKeys();
    if (legacyKeys.length) await AsyncStorage.multiRemove(legacyKeys);
  },

  _scheduleRecentCacheSave() {
    this._recentCacheDirty = true;
    if (this._recentCacheWriteTimer) return;
    this._recentCacheWriteTimer = setTimeout(() => {
      this._recentCacheWriteTimer = null;
      this._flushRecentCache().catch(() => {});
    }, CACHE_WRITE_DEBOUNCE_MS);
  },

  async _flushRecentCache() {
    if (this._recentCacheWriteTimer) {
      clearTimeout(this._recentCacheWriteTimer);
      this._recentCacheWriteTimer = null;
    }
    if (!this._recentCacheDirty) return this._recentCacheWritePromise;
    this._recentCacheDirty = false;
    const start = Date.now();
    try {
      const scopeToken = this._scopeToken;
      const cacheKey = this._recentCacheKey();
      const data = createEmptyActivityBundle();
      ACTIVITY_SPECS.forEach(({ key }) => {
        data[key] = this._cache[key] || [];
      });
      const serialized = JSON.stringify({
        version: 2,
        windowStartMs: getRecentStartMs(),
        lastSuccessfulSyncAt: this._cache.lastSyncMs || 0,
        data,
      });
      this._recentCacheWritePromise = this._recentCacheWritePromise
        .catch(() => {})
        .then(async () => {
          if (scopeToken !== this._scopeToken) return;
          await AsyncStorage.setItem(cacheKey, serialized);
          await this._cleanupLegacyCachesOnce(scopeToken);
          debugLog('_flushRecentCache:done', { ms: Date.now() - start, bytes: serialized.length });
        });
      await this._recentCacheWritePromise;
    } catch {}
  },

  _activityQuery(spec, { mode = 'recent', dateLike = Date.now() } = {}) {
    const bounds = getQueryBounds(spec, { mode, dateLike });
    let query = this._kidRef()
      .collection(COLLECTIONS[spec.collectionKey])
      .where(spec.timestampField, '>=', bounds.startMs);
    if (Number.isFinite(bounds.endMs)) {
      query = query.where(spec.timestampField, '<', bounds.endMs);
    }
    return query.orderBy(spec.timestampField, 'desc');
  },

  async refreshRecentActivities({ force = false, source = 'default' } = {}) {
    if (!force && Date.now() - this._cache.lastSyncMs < CACHE_MAX_AGE_MS) {
      return this.getCachedRecentActivities();
    }
    if (this._refreshPromise) return this._refreshPromise;

    const scopeToken = this._scopeToken;
    const refreshPromise = (async () => {
      const bundle = await this._fetchActivityBundle({ mode: 'recent', source });
      if (scopeToken !== this._scopeToken) return bundle;
      ACTIVITY_SPECS.forEach((spec) => {
        this._cache[spec.key] = sortDesc(bundle[spec.key], spec.timestampField);
      });
      this._cache.lastSyncMs = Date.now();
      this._recentCacheDirty = true;
      await this._flushRecentCache();
      return this.getCachedRecentActivities();
    })();
    this._refreshPromise = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      if (this._refreshPromise === refreshPromise) this._refreshPromise = null;
    }
  },

  async _fetchActivityBundle({ mode, dateLike = Date.now(), source = 'default' }) {
    const snapshots = await Promise.all(ACTIVITY_SPECS.map(async (spec) => {
      const query = this._activityQuery(spec, { mode, dateLike });
      const options = source === 'server' ? { source: 'server' } : undefined;
      const request = options ? query.get(options) : query.get();
      return withTimeout(request, FIRESTORE_QUERY_TIMEOUT_MS, `${mode}Activities:${spec.key}`);
    }));
    const bundle = createEmptyActivityBundle();
    snapshots.forEach((snap, index) => {
      const spec = ACTIVITY_SPECS[index];
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      bundle[spec.key] = filterActivityItemsForWindow(spec, items, { mode, dateLike });
    });
    return bundle;
  },

  async refreshDayActivities(dateLike, { source = 'server' } = {}) {
    const scopeToken = this._scopeToken;
    const bundle = await this._fetchActivityBundle({ mode: 'day', dateLike, source });
    if (scopeToken !== this._scopeToken) return bundle;
    const dateKey = toLocalDateKey(dateLike);
    this._dayCache.set(dateKey, bundle);
    this._dayCacheLastSync.set(dateKey, Date.now());
    await this._persistDayCache(dateKey, bundle);
    return bundle;
  },

  async _getLatestCollection(cacheKey, limit = 100) {
    const spec = ACTIVITY_SPECS.find((item) => item.key === cacheKey);
    if (!spec) return [];
    const cached = this._cache[cacheKey] || [];
    if (cached.length > 0) return [...cached].slice(0, limit);
    const snap = await this._kidRef()
      .collection(COLLECTIONS[spec.collectionKey])
      .orderBy(spec.timestampField, 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  _activityTimestamp(cacheKey, item) {
    return Number(cacheKey === 'sleepSessions' ? item?.startTime : item?.timestamp);
  },

  _itemBelongsToDay(cacheKey, item, dateKey) {
    const { startMs, endMs } = getDayBoundsFromKey(dateKey);
    if (cacheKey !== 'sleepSessions') {
      const timestamp = this._activityTimestamp(cacheKey, item);
      return Number.isFinite(timestamp) && timestamp >= startMs && timestamp < endMs;
    }
    const sleepStart = Number(item?.startTime);
    const sleepEnd = Number(item?.endTime || (item?.isActive ? Date.now() : sleepStart));
    return Number.isFinite(sleepStart) && Number.isFinite(sleepEnd) && sleepStart < endMs && sleepEnd >= startMs;
  },

  _findCachedActivity(cacheKey, id) {
    const recent = (this._cache[cacheKey] || []).find((item) => item?.id === id);
    if (recent) return recent;
    for (const bundle of this._dayCache.values()) {
      const item = (bundle?.[cacheKey] || []).find((entry) => entry?.id === id);
      if (item) return item;
    }
    return null;
  },

  async _storeCachedActivity(cacheKey, item) {
    if (!item?.id) return;
    const spec = ACTIVITY_SPECS.find(({ key }) => key === cacheKey);
    if (!spec) return;
    const existing = this._findCachedActivity(cacheKey, item.id) || {};
    const merged = { ...existing, ...item };
    const withoutItem = (this._cache[cacheKey] || []).filter((entry) => entry?.id !== item.id);
    const timestamp = this._activityTimestamp(cacheKey, merged);
    const belongsToRecentWindow = filterActivityItemsForWindow(spec, [merged], { mode: 'recent' }).length > 0;
    this._cache[cacheKey] = Number.isFinite(timestamp) && belongsToRecentWindow
      ? sortDesc([...withoutItem, merged], spec.timestampField)
      : withoutItem;

    const dayWrites = [];
    this._dayCache.forEach((bundle, dateKey) => {
      const nextItems = (bundle[cacheKey] || []).filter((entry) => entry?.id !== item.id);
      if (this._itemBelongsToDay(cacheKey, merged, dateKey)) nextItems.push(merged);
      bundle[cacheKey] = sortDesc(nextItems, spec.timestampField);
      dayWrites.push(this._persistDayCache(dateKey, bundle));
    });
    this._recentCacheDirty = true;
    await Promise.all([this._flushRecentCache(), ...dayWrites]);
  },

  async _deleteCachedActivity(cacheKey, id) {
    this._cache[cacheKey] = (this._cache[cacheKey] || []).filter((item) => item?.id !== id);
    const dayWrites = [];
    this._dayCache.forEach((bundle, dateKey) => {
      bundle[cacheKey] = (bundle[cacheKey] || []).filter((item) => item?.id !== id);
      dayWrites.push(this._persistDayCache(dateKey, bundle));
    });
    this._recentCacheDirty = true;
    await Promise.all([this._flushRecentCache(), ...dayWrites]);
  },

  // ─── FEEDINGS ───

  async addFeeding({ ounces, timestamp, notes = null, photoURLs = null }) {
    const scopeToken = this._scopeToken;
    const nowMs = Date.now();
    const uid = auth?.()?.currentUser?.uid || null;
    const data = { ounces, timestamp: clampFutureTimestamp(timestamp, nowMs) };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;
    if (uid) data.createdByUid = uid;

    const ref = await this._kidRef().collection(COLLECTIONS.feedings).add(data);
    const item = { id: ref.id, ...data };
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('feedings', item);
    return item;
  },

  async updateFeeding(id, data) {
    const scopeToken = this._scopeToken;
    const updateData = { ...data };
    if (Object.prototype.hasOwnProperty.call(updateData, 'timestamp')) {
      updateData.timestamp = clampFutureTimestamp(updateData.timestamp);
    }
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.feedings).doc(id).update(updateData);
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('feedings', { id, ...data });
  },

  async deleteFeeding(id) {
    const scopeToken = this._scopeToken;
    await this._kidRef().collection(COLLECTIONS.feedings).doc(id).delete();
    if (scopeToken === this._scopeToken) await this._deleteCachedActivity('feedings', id);
  },

  async getAllFeedings() {
    return this._getLatestCollection('feedings', 100);
  },

  // ─── NURSING SESSIONS ───

  async addNursingSession({ startTime, leftDurationSec, rightDurationSec, lastSide = null, notes = null, photoURLs = null }) {
    const scopeToken = this._scopeToken;
    const timestamp = Number.isFinite(startTime) ? startTime : Date.now();
    const uid = auth?.()?.currentUser?.uid || null;
    const data = {
      startTime: timestamp,
      timestamp,
      leftDurationSec: Number(leftDurationSec) || 0,
      rightDurationSec: Number(rightDurationSec) || 0,
    };
    if (lastSide) data.lastSide = lastSide;
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;
    if (uid) data.createdByUid = uid;

    const ref = await this._kidRef().collection(COLLECTIONS.nursingSessions).add(data);
    const item = { id: ref.id, ...data };
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('nursingSessions', item);
    return item;
  },

  async updateNursingSession(id, data) {
    const scopeToken = this._scopeToken;
    const updateData = { ...data };
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.nursingSessions).doc(id).update(updateData);
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('nursingSessions', { id, ...data });
  },

  async deleteNursingSession(id) {
    const scopeToken = this._scopeToken;
    await this._kidRef().collection(COLLECTIONS.nursingSessions).doc(id).delete();
    if (scopeToken === this._scopeToken) await this._deleteCachedActivity('nursingSessions', id);
  },

  // ─── SOLIDS SESSIONS ───

  async addSolidsSession({ timestamp, foods, notes = null, photoURLs = null }) {
    const scopeToken = this._scopeToken;
    const uid = auth?.()?.currentUser?.uid || null;
    const data = {
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      foods: Array.isArray(foods) ? foods : [],
    };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;
    if (uid) data.createdByUid = uid;

    const ref = await this._kidRef().collection(COLLECTIONS.solidsSessions).add(data);
    const item = { id: ref.id, ...data };
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('solidsSessions', item);
    return item;
  },

  async updateSolidsSession(id, data) {
    const scopeToken = this._scopeToken;
    const updateData = { ...data };
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.solidsSessions).doc(id).update(updateData);
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('solidsSessions', { id, ...data });
  },

  async deleteSolidsSession(id) {
    const scopeToken = this._scopeToken;
    await this._kidRef().collection(COLLECTIONS.solidsSessions).doc(id).delete();
    if (scopeToken === this._scopeToken) await this._deleteCachedActivity('solidsSessions', id);
  },

  async getAllSolidsSessions() {
    return this._getLatestCollection('solidsSessions', 100);
  },

  // ─── DIAPER CHANGES ───

  async addDiaperChange({ timestamp, isWet = false, isDry = false, isPoo = false, notes = null, photoURLs = null }) {
    const scopeToken = this._scopeToken;
    const start = Date.now();
    debugLog('addDiaperChange:start', {
      hasPhotos: Array.isArray(photoURLs) && photoURLs.length > 0,
      hasNotes: !!notes,
    });
    const nowMs = Date.now();
    const uid = auth?.()?.currentUser?.uid || null;
    const data = {
      timestamp: clampFutureTimestamp(timestamp, nowMs),
      isWet: !!isWet,
      isDry: !!isDry,
      isPoo: !!isPoo,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;
    if (uid) data.createdByUid = uid;

    const ref = await withTimeout(
      this._kidRef().collection(COLLECTIONS.diaperChanges).add(data),
      FIRESTORE_QUERY_TIMEOUT_MS,
      'addDiaperChange:add'
    );
    const item = { id: ref.id, ...data };
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('diaperChanges', item);
    debugLog('addDiaperChange:done', { id: item?.id || null, ms: Date.now() - start });
    return item;
  },

  async updateDiaperChange(id, data) {
    const scopeToken = this._scopeToken;
    const start = Date.now();
    debugLog('updateDiaperChange:start', {
      id: id || null,
      hasPhotos: Array.isArray(data?.photoURLs),
      hasNotes: !!data?.notes,
    });
    const updateData = { ...data };
    if (Object.prototype.hasOwnProperty.call(updateData, 'timestamp')) {
      updateData.timestamp = clampFutureTimestamp(updateData.timestamp);
    }
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await withTimeout(
      this._kidRef().collection(COLLECTIONS.diaperChanges).doc(id).update(updateData),
      FIRESTORE_QUERY_TIMEOUT_MS,
      'updateDiaperChange:update'
    );
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('diaperChanges', { id, ...data });
    debugLog('updateDiaperChange:done', { id, ms: Date.now() - start });
  },

  async deleteDiaperChange(id) {
    const scopeToken = this._scopeToken;
    await this._kidRef().collection(COLLECTIONS.diaperChanges).doc(id).delete();
    if (scopeToken === this._scopeToken) await this._deleteCachedActivity('diaperChanges', id);
  },

  // ─── SLEEP SESSIONS ───

  async startSleep(startTime = null) {
    const scopeToken = this._scopeToken;
    const kidRef = this._kidRef();
    const start = Date.now();
    debugLog('startSleep:start', { hasStartTime: typeof startTime === 'number' });
    const user = auth().currentUser;
    const uid = user ? user.uid : null;

    // Ensure only one active sleep per kid
    const activeSnap = await withTimeout(
      kidRef.collection(COLLECTIONS.sleepSessions)
        .where('isActive', '==', true)
        .limit(1)
        .get(),
      FIRESTORE_QUERY_TIMEOUT_MS,
      'startSleep:activeCheck'
    );

    if (!activeSnap.empty) {
      const d = activeSnap.docs[0];
      return { id: d.id, ...d.data() };
    }

    const startMs = clampFutureTimestamp(startTime);
    const sleepType = await this._classifySleepType(startMs, kidRef);

    const data = {
      startTime: startMs,
      endTime: null,
      isActive: true,
      sleepType,
      startedByUid: uid,
      endedByUid: null,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    const ref = await withTimeout(
      kidRef.collection(COLLECTIONS.sleepSessions).add(data),
      FIRESTORE_QUERY_TIMEOUT_MS,
      'startSleep:add'
    );
    const item = { id: ref.id, ...data };
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('sleepSessions', item);
    debugLog('startSleep:done', { ms: Date.now() - start, id: item?.id || null });
    return item;
  },

  async endSleep(sessionId, endTime = null) {
    const scopeToken = this._scopeToken;
    const kidRef = this._kidRef();
    const start = Date.now();
    debugLog('endSleep:start', { sessionId: sessionId || null });
    if (!sessionId) throw new Error('Missing sleep session id');
    const user = auth().currentUser;
    const uid = user ? user.uid : null;
    const endMs = clampFutureTimestamp(endTime);

    // Classify sleep type based on start time
    let sleepType = 'night';
    const cachedSession = this._findCachedActivity('sleepSessions', sessionId);
    if (cachedSession?.startTime) {
      sleepType = await this._classifySleepType(cachedSession.startTime, kidRef);
    } else {
      try {
        const sessDoc = await withTimeout(
          kidRef.collection(COLLECTIONS.sleepSessions).doc(sessionId).get(),
          FIRESTORE_QUERY_TIMEOUT_MS,
          'endSleep:getSession'
        );
        if (sessDoc.exists) sleepType = await this._classifySleepType(sessDoc.data()?.startTime, kidRef);
      } catch {}
    }

    const isDaySleep = sleepType === 'day';
    await withTimeout(
      kidRef.collection(COLLECTIONS.sleepSessions)
        .doc(sessionId)
        .update({
          endTime: endMs,
          isActive: false,
          endedByUid: uid,
          isDaySleep,
          sleepType: isDaySleep ? 'day' : 'night',
        }),
      FIRESTORE_QUERY_TIMEOUT_MS,
      'endSleep:update'
    );

    if (scopeToken === this._scopeToken) {
      await this._storeCachedActivity('sleepSessions', {
        id: sessionId,
        endTime: endMs,
        isActive: false,
        endedByUid: uid,
        isDaySleep,
        sleepType: isDaySleep ? 'day' : 'night',
      });
    }
    debugLog('endSleep:done', { sessionId, ms: Date.now() - start });
  },

  /** Add a completed sleep session (with both start and end) */
  async addSleepSession({ startTime, endTime, notes = null, photoURLs = null, sleepType = null }) {
    const scopeToken = this._scopeToken;
    const kidRef = this._kidRef();
    const nowMs = Date.now();
    const uid = auth?.()?.currentUser?.uid || null;
    const safeStartTime = clampFutureTimestamp(startTime, nowMs);
    const safeEndTime = endTime == null ? null : clampFutureTimestamp(endTime, nowMs);
    const data = {
      startTime: safeStartTime,
      endTime: safeEndTime,
      isActive: !safeEndTime,
      sleepType: sleepType || (await this._classifySleepType(safeStartTime, kidRef)),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;
    if (uid) data.createdByUid = uid;

    const ref = await kidRef.collection(COLLECTIONS.sleepSessions).add(data);
    const item = { id: ref.id, ...data };
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('sleepSessions', item);
    return item;
  },

  /** Subscribe to active sleep session — returns unsubscribe function */
  subscribeActiveSleep(callback) {
    if (!this.currentFamilyId || !this.currentKidId) {
      callback(null);
      return () => {};
    }

    const scopeToken = this._scopeToken;
    try {
      return this._kidRef()
        .collection(COLLECTIONS.sleepSessions)
        .where('isActive', '==', true)
        .limit(1)
        .onSnapshot(
          (snap) => {
            if (scopeToken !== this._scopeToken) return;
            if (snap.empty) {
              callback(null);
              return;
            }
            const d = snap.docs[0];
            callback({ id: d.id, ...d.data() });
          },
          (err) => {
            if (scopeToken !== this._scopeToken) return;
            console.error('Active sleep subscription error:', err);
          }
        );
    } catch (err) {
      console.warn('Could not create active sleep listener:', err);
      return () => {};
    }
  },

  _subscribeCollection({ spec, mode = 'recent', dateLike = Date.now(), callback, onStatus }) {
    if (typeof callback !== 'function') throw new Error('Missing callback');
    if (!this.currentFamilyId || !this.currentKidId) {
      callback([]);
      return () => {};
    }

    const scopeToken = this._scopeToken;
    try {
      return this._activityQuery(spec, { mode, dateLike })
        .onSnapshot(
          { includeMetadataChanges: true },
          (snap) => {
            if (scopeToken !== this._scopeToken) return;
            const rawData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            const data = filterActivityItemsForWindow(spec, rawData, { mode, dateLike });
            callback(data, {
              fromCache: Boolean(snap.metadata?.fromCache),
              hasPendingWrites: Boolean(snap.metadata?.hasPendingWrites),
            });
          },
          (err) => {
            if (scopeToken !== this._scopeToken) return;
            console.error(`[firestoreService] ${COLLECTIONS[spec.collectionKey]} subscription error:`, err);
            onStatus?.({
              status: String(err?.code || '').endsWith('unavailable') ? 'offline' : 'error',
              errorCode: err?.code || 'unknown',
            });
          }
        );
    } catch (err) {
      console.warn(`[firestoreService] Could not subscribe to ${COLLECTIONS[spec.collectionKey]}:`, err);
      onStatus?.({ status: 'error', errorCode: err?.code || 'listener-setup-failed' });
      return () => {};
    }
  },

  subscribeRecentActivities(callback, onStatus) {
    if (typeof callback !== 'function') throw new Error('Missing callback');
    const bundle = this.getCachedRecentActivities();
    const ready = new Set();
    const pendingByKey = new Map();
    const fromCacheByKey = new Map();
    let stopped = false;
    let unsubs = [];
    let midnightTimer = null;
    onStatus?.({
      status: 'syncing',
      lastSuccessfulSyncAt: this._cache.lastSyncMs || 0,
      hasPendingWrites: false,
    });

    const publishStatus = () => {
      const allReady = ready.size === ACTIVITY_SPECS.length;
      const allServer = allReady && [...fromCacheByKey.values()].every((value) => !value);
      const hasPendingWrites = [...pendingByKey.values()].some(Boolean);
      if (allServer) this._cache.lastSyncMs = Date.now();
      onStatus?.({
        status: allServer ? 'synced' : 'syncing',
        lastSuccessfulSyncAt: this._cache.lastSyncMs || 0,
        hasPendingWrites,
      });
    };

    const pruneAtMidnight = () => {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 100);
      midnightTimer = setTimeout(() => {
        if (stopped) return;
        ACTIVITY_SPECS.forEach((spec) => {
          const items = filterActivityItemsForWindow(spec, bundle[spec.key], { mode: 'recent' });
          bundle[spec.key] = items;
          this._cache[spec.key] = items;
        });
        if (this._cache.lastSyncMs > 0 || bundleHasItems(bundle)) this._scheduleRecentCacheSave();
        callback({ ...bundle }, { source: 'cache' });
        pruneAtMidnight();
      }, Math.max(1000, nextMidnight.getTime() - Date.now()));
    };

    unsubs = ACTIVITY_SPECS.map((spec) => this._subscribeCollection({
      spec,
      mode: 'recent',
      callback: (rawItems, metadata) => {
        if (stopped) return;
        const filteredItems = filterActivityItemsForWindow(spec, rawItems, { mode: 'recent' });
        const items = preserveSavedItemsUntilServerConfirms(bundle[spec.key], filteredItems, metadata);
        bundle[spec.key] = items;
        this._cache[spec.key] = sortDesc(items, spec.timestampField);
        ready.add(spec.key);
        pendingByKey.set(spec.key, Boolean(metadata?.hasPendingWrites));
        fromCacheByKey.set(spec.key, Boolean(metadata?.fromCache));
        publishStatus();
        if (this._cache.lastSyncMs > 0 || metadata?.hasPendingWrites || items.length > 0) {
          this._scheduleRecentCacheSave();
        }
        callback({ ...bundle }, { source: metadata?.fromCache ? 'cache' : 'server' });
      },
      onStatus,
    }));
    pruneAtMidnight();

    return () => {
      stopped = true;
      if (midnightTimer) clearTimeout(midnightTimer);
      unsubs.forEach((unsubscribe) => unsubscribe?.());
    };
  },

  async loadDayActivities(dateLike) {
    const dateKey = toLocalDateKey(dateLike);
    if (this._dayCache.has(dateKey)) {
      return {
        data: this._dayCache.get(dateKey),
        lastSuccessfulSyncAt: this._dayCacheLastSync.get(dateKey) || 0,
      };
    }
    const scopeToken = this._scopeToken;
    const cacheKey = this._dayCacheKey(dateKey);
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (scopeToken !== this._scopeToken) return null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.data) return null;
      const lastAccessedAt = Number(parsed.lastAccessedAt || 0);
      if (!lastAccessedAt || Date.now() - lastAccessedAt > DAY_CACHE_MAX_AGE_MS) {
        await this._removeDayCacheEntry(dateKey);
        return null;
      }
      const bundle = createEmptyActivityBundle();
      ACTIVITY_SPECS.forEach((spec) => {
        bundle[spec.key] = filterActivityItemsForWindow(spec, parsed.data[spec.key], {
          mode: 'day',
          dateLike,
        });
      });
      this._dayCache.set(dateKey, bundle);
      this._dayCacheLastSync.set(dateKey, Number(parsed.lastSuccessfulSyncAt || 0));
      await this._persistDayCache(dateKey, bundle);
      return {
        data: bundle,
        lastSuccessfulSyncAt: this._dayCacheLastSync.get(dateKey) || 0,
      };
    } catch {
      return null;
    }
  },

  _scheduleDayCacheSave(dateKey, bundle) {
    if (this._dayCacheWriteTimers.has(dateKey)) return;
    const timer = setTimeout(() => {
      this._dayCacheWriteTimers.delete(dateKey);
      this._persistDayCache(dateKey, bundle).catch(() => {});
    }, CACHE_WRITE_DEBOUNCE_MS);
    this._dayCacheWriteTimers.set(dateKey, timer);
  },

  async _removeDayCacheEntry(dateKey) {
    const scopeToken = this._scopeToken;
    const indexKey = this._dayCacheIndexKey();
    const cacheKey = this._dayCacheKey(dateKey);
    this._dayCacheWritePromise = this._dayCacheWritePromise
      .catch(() => {})
      .then(async () => {
        if (scopeToken !== this._scopeToken) return;
        let index = [];
        try {
          const raw = await AsyncStorage.getItem(indexKey);
          const parsed = JSON.parse(raw || '[]');
          index = Array.isArray(parsed) ? parsed : [];
        } catch {}
        await AsyncStorage.setItem(
          indexKey,
          JSON.stringify(index.filter((entry) => entry?.dateKey !== dateKey))
        );
        await AsyncStorage.removeItem(cacheKey);
        this._dayCache.delete(dateKey);
        this._dayCacheLastSync.delete(dateKey);
      });
    return this._dayCacheWritePromise;
  },

  async _persistDayCache(dateKey, bundle) {
    const pendingTimer = this._dayCacheWriteTimers.get(dateKey);
    if (pendingTimer) clearTimeout(pendingTimer);
    this._dayCacheWriteTimers.delete(dateKey);
    const scopeToken = this._scopeToken;
    const snapshot = JSON.parse(JSON.stringify(bundle));
    const scopeKey = this._scopeKey();
    const indexKey = `${DAY_CACHE_INDEX_PREFIX}:${scopeKey}`;
    const cacheKeyForDate = (key) => `${DAY_CACHE_PREFIX}:${scopeKey}:${key}`;
    const dayCache = this._dayCache;
    this._dayCacheWritePromise = this._dayCacheWritePromise
      .catch(() => {})
      .then(async () => {
        if (scopeToken !== this._scopeToken) return;
        const nowMs = Date.now();
        let existing = [];
        try {
          const raw = await AsyncStorage.getItem(indexKey);
          const parsed = JSON.parse(raw || '[]');
          existing = Array.isArray(parsed) ? parsed : [];
        } catch {}
        const next = [
          { dateKey, lastAccessedAt: nowMs },
          ...existing.filter((entry) => entry?.dateKey !== dateKey),
        ];
        const { kept, removed } = pruneDayCacheIndex(next, nowMs);
        await AsyncStorage.multiSet([
          [indexKey, JSON.stringify(kept)],
          [cacheKeyForDate(dateKey), JSON.stringify({
            version: 1,
            dateKey,
            lastAccessedAt: nowMs,
            lastSuccessfulSyncAt: this._dayCacheLastSync.get(dateKey) || 0,
            data: snapshot,
          })],
        ]);
        if (removed.length) {
          await AsyncStorage.multiRemove(removed.map(cacheKeyForDate));
          removed.forEach((key) => {
            dayCache.delete(key);
            this._dayCacheLastSync.delete(key);
          });
        }
      });
    return this._dayCacheWritePromise;
  },

  subscribeDayActivities(dateLike, callback, onStatus) {
    if (typeof callback !== 'function') throw new Error('Missing callback');
    const dateKey = toLocalDateKey(dateLike);
    const bundle = this._dayCache.get(dateKey) || createEmptyActivityBundle();
    const ready = new Set();
    const pendingByKey = new Map();
    const fromCacheByKey = new Map();
    let stopped = false;
    onStatus?.({
      status: 'syncing',
      lastSuccessfulSyncAt: this._dayCacheLastSync.get(dateKey) || 0,
      hasPendingWrites: false,
    });

    const unsubs = ACTIVITY_SPECS.map((spec) => this._subscribeCollection({
      spec,
      mode: 'day',
      dateLike,
      callback: (incomingItems, metadata) => {
        if (stopped) return;
        const items = preserveSavedItemsUntilServerConfirms(bundle[spec.key], incomingItems, metadata);
        bundle[spec.key] = items;
        ready.add(spec.key);
        pendingByKey.set(spec.key, Boolean(metadata?.hasPendingWrites));
        fromCacheByKey.set(spec.key, Boolean(metadata?.fromCache));
        const allReady = ready.size === ACTIVITY_SPECS.length;
        const allServer = allReady && [...fromCacheByKey.values()].every((value) => !value);
        const lastSuccessfulSyncAt = allServer
          ? Date.now()
          : (this._dayCacheLastSync.get(dateKey) || 0);
        if (allServer) this._dayCacheLastSync.set(dateKey, lastSuccessfulSyncAt);
        this._dayCache.set(dateKey, { ...bundle });
        if (allServer || lastSuccessfulSyncAt > 0 || metadata?.hasPendingWrites || bundleHasItems(bundle)) {
          this._scheduleDayCacheSave(dateKey, bundle);
        }
        callback({ ...bundle }, { source: metadata?.fromCache ? 'cache' : 'server' });
        onStatus?.({
          status: allServer ? 'synced' : 'syncing',
          lastSuccessfulSyncAt,
          hasPendingWrites: [...pendingByKey.values()].some(Boolean),
        });
      },
      onStatus,
    }));

    return () => {
      stopped = true;
      unsubs.forEach((unsubscribe) => unsubscribe?.());
    };
  },

  subscribeFamilyMembers(callback) {
    if (typeof callback !== 'function') throw new Error('Missing callback');
    if (!this.currentFamilyId) {
      callback([]);
      return () => {};
    }

    let requestToken = 0;
    const scopeToken = this._scopeToken;
    try {
      return firestore()
        .collection('families')
        .doc(this.currentFamilyId)
        .onSnapshot(
          (famDoc) => {
            if (scopeToken !== this._scopeToken) return;
            const familyExists = typeof famDoc?.exists === 'function'
              ? famDoc.exists()
              : Boolean(famDoc?.exists);
            if (!familyExists) {
              callback([]);
              return;
            }

            const famData = famDoc.data?.() || {};
            const memberIds = Array.isArray(famData.members)
              ? famData.members.filter((uid) => typeof uid === 'string' && uid.trim())
              : [];

            if (memberIds.length === 0) {
              callback([]);
              return;
            }

            const token = ++requestToken;
            Promise.all(memberIds.map((uid) => firestore().collection('users').doc(uid).get()))
              .then((userDocs) => {
                if (scopeToken !== this._scopeToken || token !== requestToken) return;
                const members = userDocs.map((doc) => {
                  const userExists = typeof doc?.exists === 'function'
                    ? doc.exists()
                    : Boolean(doc?.exists);
                  return {
                    uid: doc.id,
                    ...(userExists ? (doc.data?.() || {}) : {}),
                  };
                });
                callback(members);
              })
              .catch((err) => {
                if (scopeToken !== this._scopeToken) return;
                console.error('[firestoreService] family members subscription error:', err);
              });
          },
          (err) => {
            if (scopeToken !== this._scopeToken) return;
            console.error('[firestoreService] family subscription error:', err);
          }
        );
    } catch (err) {
      console.warn('[firestoreService] Could not subscribe to family members:', err);
      return () => {};
    }
  },

  async updateSleepSession(id, data) {
    const scopeToken = this._scopeToken;
    const start = Date.now();
    debugLog('updateSleepSession:start', { id: id || null, hasPhotoURLs: Array.isArray(data?.photoURLs), hasNotes: !!data?.notes });
    const updateData = { ...data };
    if (Object.prototype.hasOwnProperty.call(updateData, 'startTime')) {
      updateData.startTime = clampFutureTimestamp(updateData.startTime);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'endTime') && updateData.endTime != null) {
      updateData.endTime = clampFutureTimestamp(updateData.endTime);
    }
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    await withTimeout(
      this._kidRef().collection(COLLECTIONS.sleepSessions).doc(id).update(updateData),
      FIRESTORE_QUERY_TIMEOUT_MS,
      'updateSleepSession:update'
    );
    if (scopeToken === this._scopeToken) await this._storeCachedActivity('sleepSessions', { id, ...data });
    debugLog('updateSleepSession:done', { id, ms: Date.now() - start });
  },

  async deleteSleepSession(id) {
    const scopeToken = this._scopeToken;
    await this._kidRef().collection(COLLECTIONS.sleepSessions).doc(id).delete();
    if (scopeToken === this._scopeToken) await this._deleteCachedActivity('sleepSessions', id);
  },

  async _classifySleepType(startMs, kidRef = null) {
    try {
      const settingsDoc = kidRef ? await kidRef.get() : null;
      const settings = settingsDoc?.exists ? (settingsDoc.data() || {}) : await this.getKidSettings();
      const dayStart = Number(settings?.sleepDayStart ?? settings?.daySleepStartMinutes ?? 390);
      const dayEnd = Number(settings?.sleepDayEnd ?? settings?.daySleepEndMinutes ?? 1170);
      const d = new Date(startMs);
      const mins = d.getHours() * 60 + d.getMinutes();
      if (dayStart <= dayEnd) {
        return (mins >= dayStart && mins <= dayEnd) ? 'day' : 'night';
      }
      return (mins >= dayStart || mins <= dayEnd) ? 'day' : 'night';
    } catch {
      return 'night';
    }
  },

  // ─── SETTINGS ───

  async getKidSettings() {
    try {
      const snap = await this._kidRef().collection('settings').doc('default').get();
      return snap.exists ? snap.data() : {};
    } catch {
      return {};
    }
  },

  async updateKidSettings(settings) {
    await this._kidRef()
      .collection('settings')
      .doc('default')
      .set(settings, { merge: true });
  },

  // ─── KID DATA ───

  async getKidData() {
    try {
      const snap = await this._kidRef().get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  },

  async getKids() {
    if (!this.currentFamilyId) return [];
    try {
      const snap = await firestore()
        .collection('families')
        .doc(this.currentFamilyId)
        .collection('kids')
        .get();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((kid) => !kid?.isDeleted);
    } catch {
      return [];
    }
  },

  async updateKidData(data) {
    await this._kidRef().set(data, { merge: true });
  },

  async getRecentFoods(options = {}) {
    const forceServer = !!options?.forceServer;
    if (forceServer) {
      const snap = await this._kidRef().get();
      const remote = snap.exists ? snap.data() : {};
      return Array.isArray(remote?.recentSolidFoods) ? remote.recentSolidFoods : [];
    }
    const kidData = await this.getKidData();
    return Array.isArray(kidData?.recentSolidFoods) ? kidData.recentSolidFoods : [];
  },

  async updateRecentFoods(foodName) {
    if (!foodName || typeof foodName !== 'string') return;
    const currentRaw = await this.getRecentFoods();
    const current = Array.isArray(currentRaw)
      ? currentRaw.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
      : [];
    const filtered = current.filter((f) => String(f).toLowerCase() !== String(foodName).toLowerCase());
    const updated = [foodName, ...filtered].slice(0, 20);
    await this._kidRef().set({ recentSolidFoods: updated }, { merge: true });
  },

  async addCustomFood({ name, category, icon, emoji }) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const data = {
      name,
      category: category || 'Custom',
      icon: icon || null,
      emoji: emoji || null,
      isDeleted: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    const ref = await familyRef.collection('customFoods').add(data);
    return { id: ref.id, ...data };
  },

  async getCustomFoods() {
    if (!this.currentFamilyId) return [];
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const snap = await familyRef.collection('customFoods').get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => !item?.isDeleted);
  },

  async updateCustomFood(foodId, patch = {}) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    if (!foodId) throw new Error('No custom food ID');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const update = { ...patch };
    if (Object.prototype.hasOwnProperty.call(update, 'name') && typeof update.name === 'string') {
      update.name = update.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(update, 'emoji')) update.emoji = update.emoji || null;
    if (Object.prototype.hasOwnProperty.call(update, 'icon')) update.icon = update.icon || null;
    update.updatedAt = firestore.FieldValue.serverTimestamp();
    await familyRef.collection('customFoods').doc(foodId).set(update, { merge: true });
  },

  async deleteCustomFood(foodId) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    if (!foodId) throw new Error('No custom food ID');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    await familyRef.collection('customFoods').doc(foodId).set(
      {
        isDeleted: true,
        deletedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  },

  async updateKidDataById(kidId, data) {
    if (!kidId || !this.currentFamilyId) return;
    if (!FIREBASE_AVAILABLE) return;
    await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .collection('kids')
      .doc(kidId)
      .set(data, { merge: true });
  },

  async softDeleteKidById(kidId, deletedBy = null) {
    if (!kidId || !this.currentFamilyId) return;
    if (!FIREBASE_AVAILABLE) return;

    await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .collection('kids')
      .doc(kidId)
      .set(
        {
          isDeleted: true,
          deletedAt: firestore.FieldValue.serverTimestamp(),
          deletedBy: deletedBy || auth()?.currentUser?.uid || null,
        },
        { merge: true }
      );
  },

  // ─── FAMILY ───

  async getFamilyMembers() {
    if (!this.currentFamilyId) return [];
    const famDoc = await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .get();
    if (!famDoc.exists) return [];

    const { members = [] } = famDoc.data();
    const userDocs = await Promise.all(
      members.map((uid) => firestore().collection('users').doc(uid).get())
    );
    return userDocs.map((doc) => ({
      uid: doc.id,
      ...(doc.exists ? doc.data() : {}),
    }));
  },

  async getFamilyInfo() {
    if (!this.currentFamilyId) return null;
    const famRef = firestore().collection('families').doc(this.currentFamilyId);
    const famDoc = await famRef.get();
    if (!famDoc.exists) return null;
    const data = famDoc.data() || {};

    // Backfill ownerId for legacy families that were created before we
    // started persisting it. Use members[0] as the inferred owner.
    if (!data.ownerId) {
      const inferredOwner = data.createdBy
        || (Array.isArray(data.members) ? data.members[0] : null)
        || null;
      if (inferredOwner) {
        try {
          await famRef.set({ ownerId: inferredOwner }, { merge: true });
          data.ownerId = inferredOwner;
        } catch (error) {
          console.warn('Failed to backfill family ownerId:', error);
        }
      }
    }

    return { id: famDoc.id, ...data };
  },

  async softDeleteFamily(uid, familyId) {
    const targetId = familyId || this.currentFamilyId;
    if (!targetId) throw new Error('Missing family id');
    await firestore()
      .collection('families')
      .doc(targetId)
      .set(
        {
          isDeleted: true,
          deletedAt: firestore.FieldValue.serverTimestamp(),
          deletedBy: uid || auth()?.currentUser?.uid || null,
        },
        { merge: true }
      );
  },

  async undoDeleteFamily(familyId) {
    if (!familyId) throw new Error('Missing family id');
    await firestore()
      .collection('families')
      .doc(familyId)
      .set(
        { isDeleted: false, deletedAt: null, deletedBy: null },
        { merge: true }
      );
  },

  async updateFamilyData(patch = {}) {
    if (!this.currentFamilyId) throw new Error('Missing family id');
    const update = { ...patch };
    if (Object.prototype.hasOwnProperty.call(update, 'name') && typeof update.name === 'string') {
      update.name = update.name.trim();
    }
    update.updatedAt = firestore.FieldValue.serverTimestamp();
    await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .set(update, { merge: true });
  },

  async createChild({
    name,
    birthDate,
    babyWeight = null,
    ownerId = null,
    photoURL = null,
    preferredVolumeUnit = 'oz',
    themeKey = null,
  }) {
    if (!name || !this.currentFamilyId) throw new Error('Missing child fields');
    if (!FIREBASE_AVAILABLE) return `local-kid-${Date.now()}`;

    const uid = ownerId || auth()?.currentUser?.uid || null;
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const famDoc = await familyRef.get();
    const famMembers =
      famDoc.exists && Array.isArray(famDoc.data()?.members)
        ? famDoc.data().members
        : (uid ? [uid] : []);

    const parsedBabyWeight = Number.parseFloat(String(babyWeight ?? '').trim());
    const normalizedBabyWeight = Number.isFinite(parsedBabyWeight) && parsedBabyWeight > 0
      ? parsedBabyWeight
      : null;

    const kidRef = await familyRef.collection('kids').add({
      name: String(name).trim(),
      ownerId: uid,
      birthDate,
      babyWeight: normalizedBabyWeight,
      members: famMembers,
      photoURL: photoURL || null,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    const settingsPayload = {
      preferredVolumeUnit: preferredVolumeUnit === 'ml' ? 'ml' : 'oz',
      ...(normalizedBabyWeight != null ? { babyWeight: normalizedBabyWeight } : {}),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (themeKey) settingsPayload.themeKey = themeKey;

    await kidRef
      .collection('settings')
      .doc('default')
      .set(settingsPayload, { merge: true });

    return kidRef.id;
  },

  async createInvite(kidId = null) {
    const user = auth().currentUser;
    if (!user) throw new Error('Not signed in');
    const INVITE_CODE_LENGTH = 6;
    const MAX_ATTEMPTS = 3;

    const buildInviteCode = () => {
      let code = '';
      while (code.length < INVITE_CODE_LENGTH) {
        code += Math.random().toString(36).slice(2).toUpperCase();
      }
      return code.slice(0, INVITE_CODE_LENGTH);
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const code = buildInviteCode();
      const inviteRef = firestore().collection('invites').doc(code);
      try {
        await inviteRef.set({
          familyId: this.currentFamilyId,
          kidId: kidId || this.currentKidId,
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          used: false,
        });
        return code;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS - 1) throw error;
      }
    }

    throw new Error('Failed to generate unique invite code');
  },

  async removeMember(memberId) {
    if (!this.currentFamilyId || !memberId) throw new Error('Missing ids');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);

    await familyRef.update({
      members: firestore.FieldValue.arrayRemove(memberId),
    });

    // Remove from all kids
    const kidsSnap = await familyRef.collection('kids').get();
    await Promise.all(
      kidsSnap.docs.map((kidDoc) =>
        kidDoc.ref.update({
          members: firestore.FieldValue.arrayRemove(memberId),
        })
      )
    );
  },

  async getConversation() {
    const doc = await this._kidRef().collection('conversations').doc('default').get();
    return doc.exists ? doc.data() : { messages: [] };
  },

  async saveMessage(message) {
    const ref = this._kidRef().collection('conversations').doc('default');
    const doc = await ref.get();
    const messages = doc.exists ? doc.data()?.messages || [] : [];
    messages.push(message);
    await ref.set({ messages }, { merge: true });
  },

  async clearConversation() {
    await this._kidRef().collection('conversations').doc('default').delete();
  },

  // ─── SLEEP SETTINGS (convenience) ───

  async getSleepSettings() {
    try {
      const kidDoc = await this._kidRef().get();
      if (!kidDoc.exists) return {};
      const kd = kidDoc.data();
      return {
        sleepDayStart: kd.sleepDayStart ?? kd.daySleepStartMinutes ?? 390,
        sleepDayEnd: kd.sleepDayEnd ?? kd.daySleepEndMinutes ?? 1170,
      };
    } catch {
      return { sleepDayStart: 390, sleepDayEnd: 1170 };
    }
  },
};

export default firestoreService;
