/**
 * DataContext — provides real Firestore data to the app,
 * replacing all mock data sources.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestoreService from '../services/firestoreService';
import { useAuth } from './AuthContext';
import {
  feedingDocToCard,
  nursingDocToCard,
  solidsDocToCard,
  diaperDocToCard,
} from '../../../shared/firebase/transforms';
const {
  DAY_MS,
  createEmptyActivityBundle,
  getDayBounds,
  isDateInRecentWindow,
  toLocalDateKey,
} = require('../services/activityDataUtils.cjs');

const DataContext = createContext(null);
const KID_HEADER_CACHE_PREFIX = 'tt_kid_header_v2';
const TRACKER_BOOTSTRAP_CACHE_PREFIX = 'tt_tracker_bootstrap_v3';
const LEGACY_KID_HEADER_CACHE_PREFIX = 'tt_kid_header_v1';
const LEGACY_TRACKER_BOOTSTRAP_CACHE_PREFIX = 'tt_tracker_bootstrap_v2';
const FOREGROUND_REFRESH_AGE_MS = 5 * 60 * 1000;
const FREEZE_DEBUG = false;
const debugLog = (...args) => {
  if (FREEZE_DEBUG) console.log('[FreezeDebug][DataContext]', ...args);
};

const formatTime12Hour = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mins = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${mins} ${ampm}`;
};

const normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
  let sMs = Number(startMs);
  let eMs = Number(endMs);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
  if (sMs > nowMs + 3 * 3600000) sMs -= DAY_MS;
  if (eMs < sMs) sMs -= DAY_MS;
  if (eMs < sMs) return null;
  return { startMs: sMs, endMs: eMs };
};

const overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
  const a = Math.max(rangeStartMs, winStartMs);
  const b = Math.min(rangeEndMs, winEndMs);
  return Math.max(0, b - a);
};

function kidHeaderCacheKey(userId, familyId, kidId) {
  if (!userId || !familyId || !kidId) return null;
  return `${KID_HEADER_CACHE_PREFIX}:${userId}:${familyId}:${kidId}`;
}

function trackerBootstrapCacheKey(userId, familyId, kidId) {
  if (!userId || !familyId || !kidId) return null;
  return `${TRACKER_BOOTSTRAP_CACHE_PREFIX}:${userId}:${familyId}:${kidId}`;
}

function summarizeForDay({
  feedings = [],
  nursingSessions = [],
  solidsSessions = [],
  sleepSessions = [],
  diaperChanges = [],
}, date = new Date()) {
  const { startMs, endMs } = getDayBounds(date);

  let feedOz = 0;
  let nursingMs = 0;
  let solidsCount = 0;
  let sleepMs = 0;
  let diaperCount = 0;
  let diaperWetCount = 0;
  let diaperPooCount = 0;
  let lastBottleTime = null;
  let lastNursingTime = null;
  let lastSolidsTime = null;
  let lastSleepTime = null;
  let lastDiaperTime = null;

  feedings.forEach((f) => {
    if (f.timestamp >= startMs && f.timestamp < endMs) {
      feedOz += Number(f.ounces) || 0;
      if (!lastBottleTime || f.timestamp > lastBottleTime) lastBottleTime = f.timestamp;
    }
  });

  nursingSessions.forEach((s) => {
    const ts = s.timestamp || s.startTime || 0;
    if (ts >= startMs && ts < endMs) {
      const left = (Number(s.leftDurationSec) || 0) * 1000;
      const right = (Number(s.rightDurationSec) || 0) * 1000;
      nursingMs += left + right;
      if (!lastNursingTime || ts > lastNursingTime) lastNursingTime = ts;
    }
  });

  solidsSessions.forEach((s) => {
    if (s.timestamp >= startMs && s.timestamp < endMs) {
      solidsCount += Array.isArray(s.foods) ? s.foods.length : 1;
      if (!lastSolidsTime || s.timestamp > lastSolidsTime) lastSolidsTime = s.timestamp;
    }
  });

  sleepSessions.forEach((s) => {
    const endCandidate = s.endTime || (s.isActive ? Date.now() : null);
    const norm = normalizeSleepInterval(s.startTime, endCandidate);
    if (!norm) return;
    const overlap = overlapMs(norm.startMs, norm.endMs, startMs, endMs);
    if (overlap > 0) sleepMs += overlap;
    if (s.endTime && s.endTime >= startMs && s.endTime < endMs) {
      if (!lastSleepTime || s.endTime > lastSleepTime) lastSleepTime = s.endTime;
    }
  });

  diaperChanges.forEach((c) => {
    if (c.timestamp >= startMs && c.timestamp < endMs) {
      diaperCount++;
      if (c.isWet) diaperWetCount++;
      if (c.isPoo) diaperPooCount++;
      if (!lastDiaperTime || c.timestamp > lastDiaperTime) lastDiaperTime = c.timestamp;
    }
  });

  return {
    feedOz: Math.round(feedOz * 10) / 10,
    nursingMs,
    solidsCount,
    sleepMs,
    diaperCount,
    diaperWetCount,
    diaperPooCount,
    lastBottleTime,
    lastNursingTime,
    lastSolidsTime,
    lastSleepTime,
    lastDiaperTime,
  };
}

function buildTrackerBootstrapPayload({
  activeSleep = null,
  kidData = null,
  kids = [],
  kidSettings = {},
  familyMembers = [],
  trackerSnapshot = null,
}) {
  return {
    activeSleep: activeSleep || null,
    kidData: kidData || null,
    kids: Array.isArray(kids) ? kids : [],
    kidSettings: kidSettings && typeof kidSettings === 'object' ? kidSettings : {},
    familyMembers: Array.isArray(familyMembers) ? familyMembers : [],
    trackerSnapshot: trackerSnapshot || null,
    savedAt: Date.now(),
  };
}

export function DataProvider({ children }) {
  const { user, familyId, kidId } = useAuth();
  const userId = user?.uid || null;

  const [feedings, setFeedings] = useState([]);
  const [nursingSessions, setNursingSessions] = useState([]);
  const [solidsSessions, setSolidsSessions] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [diaperChanges, setDiaperChanges] = useState([]);
  const [activeSleep, setActiveSleep] = useState(null);
  const [kidData, setKidData] = useState(null);
  const [kids, setKids] = useState([]);
  const [kidSettings, setKidSettings] = useState({});
  const [familyMembers, setFamilyMembers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [trackerBootstrapReady, setTrackerBootstrapReady] = useState(false);
  const [trackerSnapshot, setTrackerSnapshot] = useState(null);
  const [syncState, setSyncState] = useState({
    status: 'idle',
    lastSuccessfulSyncAt: 0,
    hasPendingWrites: false,
    errorCode: null,
  });
  const [historicalDays, setHistoricalDays] = useState({});
  const recentSyncStateRef = useRef({ status: 'idle', lastSuccessfulSyncAt: 0, hasPendingWrites: false, errorCode: null });

  const unsubActiveSleepRef = useRef(null);
  const unsubRecentActivitiesRef = useRef(null);
  const unsubFamilyMembersRef = useRef(null);
  const bootstrapWriteTimerRef = useRef(null);
  const didHydrateBootstrapRef = useRef(false);
  const legacyCleanupRef = useRef({ scope: null, header: false, bootstrap: false });
  const usingMockData = !firestoreService?.isAvailable;

  useEffect(() => {
    if (!usingMockData) return;
    setTrackerBootstrapReady(true);
    setTrackerSnapshot(null);
    setFeedings([]);
    setNursingSessions([]);
    setSolidsSessions([]);
    setSleepSessions([]);
    setDiaperChanges([]);
    setActiveSleep(null);
    setKidData((prev) => prev || { id: 'local-kid', name: 'Levi', photoURL: null });
    setKids((prev) =>
      prev?.length
        ? prev
        : [{ id: 'local-kid', name: 'Levi', photoURL: null }]
    );
    setKidSettings((prev) => ({ preferredVolumeUnit: 'oz', ...(prev || {}) }));
    setFamilyMembers((prev) =>
      prev?.length
        ? prev
        : [
            { uid: '1', displayName: 'Adam', email: 'adam@example.com', photoURL: null },
            { uid: '2', displayName: 'Partner', email: 'partner@example.com', photoURL: null },
          ]
    );
    setDataLoading(false);
  }, [usingMockData]);

  // Hydrate saved data first, then attach one bounded set of recent listeners.
  useEffect(() => {
    didHydrateBootstrapRef.current = false;
    setTrackerBootstrapReady(false);
    setTrackerSnapshot(null);
    setHistoricalDays({});
    setFeedings([]);
    setNursingSessions([]);
    setSolidsSessions([]);
    setSleepSessions([]);
    setDiaperChanges([]);
    setActiveSleep(null);
    setKidData(null);
    setKids([]);
    setKidSettings({});
    setFamilyMembers([]);
    recentSyncStateRef.current = { status: 'idle', lastSuccessfulSyncAt: 0, hasPendingWrites: false, errorCode: null };
    setSyncState(recentSyncStateRef.current);
    if (usingMockData) {
      setDataLoading(false);
      setTrackerBootstrapReady(true);
      return;
    }
    if (!userId || !familyId || !kidId) {
      setKids([]);
      setDataLoading(false);
      setTrackerBootstrapReady(true);
      return;
    }

    let cancelled = false;
    const cacheKey = kidHeaderCacheKey(userId, familyId, kidId);
    const bootstrapKey = trackerBootstrapCacheKey(userId, familyId, kidId);
    const scope = `${userId}:${familyId}:${kidId}`;
    const legacyHeaderKey = `${LEGACY_KID_HEADER_CACHE_PREFIX}:${familyId}:${kidId}`;
    const legacyBootstrapKey = `${LEGACY_TRACKER_BOOTSTRAP_CACHE_PREFIX}:${familyId}:${kidId}`;
    legacyCleanupRef.current = { scope, header: false, bootstrap: false };

    const removeLegacyCache = async (kind, key) => {
      const state = legacyCleanupRef.current;
      if (state.scope !== scope || state[kind]) return;
      await AsyncStorage.removeItem(key);
      if (legacyCleanupRef.current.scope === scope) legacyCleanupRef.current[kind] = true;
    };

    const applyBundle = (bundle) => {
      if (cancelled || !bundle) return;
      setFeedings(bundle.feedings || []);
      setNursingSessions(bundle.nursingSessions || []);
      setSolidsSessions(bundle.solidsSessions || []);
      setSleepSessions(bundle.sleepSessions || []);
      setDiaperChanges(bundle.diaperChanges || []);
    };

    const init = async () => {
      setDataLoading(true);
      firestoreService.initialize(userId, familyId, kidId);

      try {
        const [cachedBootstrapRaw, cachedHeaderRaw, cachedBundle] = await Promise.all([
          AsyncStorage.getItem(bootstrapKey),
          AsyncStorage.getItem(cacheKey),
          firestoreService.loadRecentCache(),
        ]);
        if (cancelled) return;

        if (cachedBootstrapRaw) {
          try {
            const parsed = JSON.parse(cachedBootstrapRaw);
            if (parsed?.kidSettings && typeof parsed.kidSettings === 'object') setKidSettings(parsed.kidSettings);
            if (parsed?.kidData) setKidData(parsed.kidData);
            if (Array.isArray(parsed?.kids)) setKids(parsed.kids);
            if (Array.isArray(parsed?.familyMembers)) setFamilyMembers(parsed.familyMembers);
            if (parsed?.activeSleep) setActiveSleep(parsed.activeSleep);
            if (parsed?.trackerSnapshot) setTrackerSnapshot(parsed.trackerSnapshot);
          } catch {}
        }
        if (cachedHeaderRaw) {
          try {
            const parsed = JSON.parse(cachedHeaderRaw);
            if (parsed?.kidData) setKidData(parsed.kidData);
            if (Array.isArray(parsed?.kids)) setKids(parsed.kids);
          } catch {}
        }
        await Promise.all([
          cachedBootstrapRaw ? removeLegacyCache('bootstrap', legacyBootstrapKey) : null,
          cachedHeaderRaw ? removeLegacyCache('header', legacyHeaderKey) : null,
        ]);
        applyBundle(cachedBundle);
        if (firestoreService.hasHydratedRecentCache || cachedBootstrapRaw) setDataLoading(false);
        setTrackerBootstrapReady(true);
        didHydrateBootstrapRef.current = true;

        unsubRecentActivitiesRef.current?.();
        unsubRecentActivitiesRef.current = firestoreService.subscribeRecentActivities(
          (bundle) => applyBundle(bundle),
          (nextStatus) => {
            if (cancelled) return;
            recentSyncStateRef.current = {
              ...recentSyncStateRef.current,
              ...nextStatus,
              errorCode: nextStatus.errorCode || null,
            };
            setSyncState(recentSyncStateRef.current);
            if (nextStatus.status === 'synced') setDataLoading(false);
          }
        );

        unsubActiveSleepRef.current?.();
        unsubActiveSleepRef.current = firestoreService.subscribeActiveSleep((session) => {
          if (!cancelled) setActiveSleep(session);
        });
        unsubFamilyMembersRef.current?.();
        unsubFamilyMembersRef.current = firestoreService.subscribeFamilyMembers((items) => {
          if (!cancelled && Array.isArray(items)) setFamilyMembers(items);
        });

        const [kd, familyKids, ks] = await Promise.all([
          firestoreService.getKidData(),
          firestoreService.getKids(),
          firestoreService.getKidSettings(),
        ]);
        if (cancelled) return;
        const nextKids = Array.isArray(familyKids) && familyKids.length
          ? familyKids
          : (kd ? [{ id: kd.id, name: kd.name, photoURL: kd.photoURL || null }] : []);
        setKidData(kd);
        setKids(nextKids);
        setKidSettings(ks);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ kidData: kd || null, kids: nextKids }));
        await removeLegacyCache('header', legacyHeaderKey);
      } catch (error) {
        console.warn('Data init failed:', error);
        if (!cancelled) {
          setTrackerBootstrapReady(true);
          setSyncState((prev) => ({ ...prev, status: 'error', errorCode: error?.code || 'init-failed' }));
        }
      }
    };

    init();
    return () => {
      cancelled = true;
      unsubActiveSleepRef.current?.();
      unsubActiveSleepRef.current = null;
      unsubRecentActivitiesRef.current?.();
      unsubRecentActivitiesRef.current = null;
      unsubFamilyMembersRef.current?.();
      unsubFamilyMembersRef.current = null;
      if (bootstrapWriteTimerRef.current) clearTimeout(bootstrapWriteTimerRef.current);
      bootstrapWriteTimerRef.current = null;
    };
  }, [userId, familyId, kidId, usingMockData]);

  useEffect(() => {
    if (usingMockData) return;
    if (!familyId || !kidId) return;
    if (!didHydrateBootstrapRef.current) return;
    const bootstrapKey = trackerBootstrapCacheKey(userId, familyId, kidId);
    if (!bootstrapKey) return;
    const scope = `${userId}:${familyId}:${kidId}`;
    const legacyBootstrapKey = `${LEGACY_TRACKER_BOOTSTRAP_CACHE_PREFIX}:${familyId}:${kidId}`;
    const nextTrackerSnapshot = {
      dateKey: toLocalDateKey(),
      summary: summarizeForDay({
        feedings,
        nursingSessions,
        solidsSessions,
        sleepSessions,
        diaperChanges,
      }),
      activeSleep,
      savedAt: Date.now(),
    };
    setTrackerSnapshot(nextTrackerSnapshot);
    if (bootstrapWriteTimerRef.current) {
      clearTimeout(bootstrapWriteTimerRef.current);
      bootstrapWriteTimerRef.current = null;
    }
    const payload = buildTrackerBootstrapPayload({
      activeSleep,
      kidData,
      kids,
      kidSettings,
      familyMembers,
      trackerSnapshot: nextTrackerSnapshot,
    });
    bootstrapWriteTimerRef.current = setTimeout(() => {
      const serializeStart = Date.now();
      const serialized = JSON.stringify(payload);
      AsyncStorage.setItem(bootstrapKey, serialized)
        .then(async () => {
          const state = legacyCleanupRef.current;
          if (state.scope !== scope || state.bootstrap) return;
          await AsyncStorage.removeItem(legacyBootstrapKey);
          if (legacyCleanupRef.current.scope === scope) legacyCleanupRef.current.bootstrap = true;
        })
        .catch(() => {});
      debugLog('bootstrap:debouncedWrite', {
        ms: Date.now() - serializeStart,
        bytes: serialized.length,
      });
      bootstrapWriteTimerRef.current = null;
    }, 750);
    return () => {
      if (bootstrapWriteTimerRef.current) {
        clearTimeout(bootstrapWriteTimerRef.current);
        bootstrapWriteTimerRef.current = null;
      }
    };
  }, [
    familyId,
    kidId,
    userId,
    usingMockData,
    feedings,
    nursingSessions,
    solidsSessions,
    sleepSessions,
    diaperChanges,
    activeSleep,
    kidData,
    kids,
    kidSettings,
    familyMembers,
  ]);

  /** Refresh only the bounded window needed by the visible screen. */
  const refresh = useCallback(async (dateLike = null) => {
    if (usingMockData) return;
    if (!userId || !familyId || !kidId) return;
    if (dateLike && !isDateInRecentWindow(dateLike)) {
      const dateKey = toLocalDateKey(dateLike);
      setHistoricalDays((prev) => ({
        ...prev,
        [dateKey]: { ...(prev[dateKey] || {}), status: 'syncing', errorCode: null },
      }));
      try {
        const bundle = await firestoreService.refreshDayActivities(dateLike, { source: 'server' });
        setHistoricalDays((prev) => ({
          ...prev,
          [dateKey]: { data: bundle, status: 'synced', lastSuccessfulSyncAt: Date.now() },
        }));
      } catch (error) {
        const status = String(error?.code || '').endsWith('unavailable') ? 'offline' : 'error';
        console.warn('Historical data refresh failed:', error);
        setHistoricalDays((prev) => ({
          ...prev,
          [dateKey]: { ...(prev[dateKey] || {}), status, errorCode: error?.code || 'refresh-failed' },
        }));
      }
      return;
    }

    setSyncState((prev) => ({ ...prev, status: 'syncing', errorCode: null }));
    try {
      const bundle = await firestoreService.refreshRecentActivities({ force: true, source: 'server' });
      setFeedings(bundle.feedings);
      setNursingSessions(bundle.nursingSessions);
      setSolidsSessions(bundle.solidsSessions);
      setSleepSessions(bundle.sleepSessions);
      setDiaperChanges(bundle.diaperChanges);
      recentSyncStateRef.current = {
        ...recentSyncStateRef.current,
        status: 'synced',
        lastSuccessfulSyncAt: Date.now(),
        errorCode: null,
      };
      setSyncState(recentSyncStateRef.current);
    } catch (e) {
      console.warn('Data refresh failed:', e);
      recentSyncStateRef.current = {
        ...recentSyncStateRef.current,
        status: String(e?.code || '').endsWith('unavailable') ? 'offline' : 'error',
        errorCode: e?.code || 'refresh-failed',
      };
      setSyncState(recentSyncStateRef.current);
    }
  }, [userId, familyId, kidId, usingMockData]);

  /** Re-read the child/family profile docs after a metadata edit. */
  const refreshKidProfile = useCallback(async () => {
    if (usingMockData) return;
    if (!userId || !familyId || !kidId) return;
    try {
      const [kd, familyKids] = await Promise.all([
        firestoreService.getKidData(),
        firestoreService.getKids(),
      ]);
      if (!kd || kd.isDeleted) return;
      const nextKids = Array.isArray(familyKids) && familyKids.length
        ? familyKids
        : [{ id: kd.id, name: kd.name, photoURL: kd.photoURL || null }];
      setKidData(kd);
      setKids(nextKids);
      const cacheKey = kidHeaderCacheKey(userId, familyId, kidId);
      if (cacheKey) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ kidData: kd, kids: nextKids }));
      }
    } catch (error) {
      console.warn('Kid profile refresh failed:', error);
    }
  }, [userId, familyId, kidId, usingMockData]);

  // Refresh data when app returns to foreground so stale sleep timers
  // and other logs are caught up after the listeners were paused in background.
  useEffect(() => {
    if (usingMockData || !familyId || !kidId) return;
    const appStateRef = { current: AppState.currentState };
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        const lastSyncAt = Number(recentSyncStateRef.current.lastSuccessfulSyncAt || 0);
        if (Date.now() - lastSyncAt >= FOREGROUND_REFRESH_AGE_MS) refresh();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [usingMockData, familyId, kidId, refresh]);

  const updateKidSettings = useCallback(async (settings) => {
    const nextSettings = (settings && typeof settings === 'object') ? settings : {};
    setKidSettings((prev) => ({ ...(prev || {}), ...nextSettings }));
    if (usingMockData) return;
    if (!familyId || !kidId) return;
    await firestoreService.updateKidSettings(nextSettings);
  }, [familyId, kidId, usingMockData]);

  const applyOptimisticEntry = useCallback((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const now = Date.now();
    const tempId = `optimistic-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const resolvedId = entry.id || tempId;
    const type = entry.type || entry.feedType || null;
    const applyToBundle = (cacheKey, doc, setRecent) => {
      const timestamp = cacheKey === 'sleepSessions' ? doc.startTime : doc.timestamp;
      if (isDateInRecentWindow(timestamp)) {
        setRecent((prev) => [doc, ...(Array.isArray(prev) ? prev.filter((item) => item?.id !== resolvedId) : [])]);
        return;
      }
      const dateKey = toLocalDateKey(timestamp);
      setHistoricalDays((prev) => {
        const current = prev[dateKey] || {};
        const data = current.data || createEmptyActivityBundle();
        return {
          ...prev,
          [dateKey]: {
            ...current,
            data: {
              ...data,
              [cacheKey]: [
                doc,
                ...(data[cacheKey] || []).filter((item) => item?.id !== resolvedId),
              ],
            },
          },
        };
      });
    };

    if (type === 'bottle' || type === 'feed') {
      const timestamp = Number(entry.timestamp) || now;
      const doc = {
        id: resolvedId,
        ounces: Number(entry.ounces) || 0,
        timestamp,
        notes: entry.notes || null,
        photoURLs: Array.isArray(entry.photoURLs) ? entry.photoURLs : null,
      };
      applyToBundle('feedings', doc, setFeedings);
      return;
    }

    if (type === 'nursing') {
      const startTime = Number(entry.startTime || entry.timestamp) || now;
      const doc = {
        id: resolvedId,
        startTime,
        timestamp: startTime,
        leftDurationSec: Number(entry.leftDurationSec) || 0,
        rightDurationSec: Number(entry.rightDurationSec) || 0,
        lastSide: entry.lastSide || null,
        notes: entry.notes || null,
        photoURLs: Array.isArray(entry.photoURLs) ? entry.photoURLs : null,
      };
      applyToBundle('nursingSessions', doc, setNursingSessions);
      return;
    }

    if (type === 'solids') {
      const timestamp = Number(entry.timestamp) || now;
      const doc = {
        id: resolvedId,
        timestamp,
        foods: Array.isArray(entry.foods) ? entry.foods : [],
        notes: entry.notes || null,
        photoURLs: Array.isArray(entry.photoURLs) ? entry.photoURLs : null,
      };
      applyToBundle('solidsSessions', doc, setSolidsSessions);
      return;
    }

    if (type === 'sleep') {
      const startTime = Number(entry.startTime) || now;
      const endTime = Number(entry.endTime) || null;
      const doc = {
        id: resolvedId,
        startTime,
        endTime,
        isActive: !endTime,
        notes: entry.notes || null,
        photoURLs: Array.isArray(entry.photoURLs) ? entry.photoURLs : null,
      };
      applyToBundle('sleepSessions', doc, setSleepSessions);
      if (!endTime) setActiveSleep(doc);
      return;
    }

    if (type === 'diaper') {
      const doc = {
        id: resolvedId,
        timestamp: Number(entry.timestamp) || now,
        isWet: !!entry.isWet,
        isDry: !!entry.isDry,
        isPoo: !!entry.isPoo,
        notes: entry.notes || null,
        photoURLs: Array.isArray(entry.photoURLs) ? entry.photoURLs : null,
      };
      applyToBundle('diaperChanges', doc, setDiaperChanges);
    }
  }, []);

  const recentActivityBundle = useMemo(() => ({
    feedings,
    nursingSessions,
    solidsSessions,
    sleepSessions,
    diaperChanges,
  }), [feedings, nursingSessions, solidsSessions, sleepSessions, diaperChanges]);

  const getActivityBundleForDate = useCallback((date) => {
    if (isDateInRecentWindow(date)) return recentActivityBundle;
    return historicalDays[toLocalDateKey(date)]?.data || createEmptyActivityBundle();
  }, [recentActivityBundle, historicalDays]);

  const subscribeDayActivities = useCallback((date) => {
    if (usingMockData || !userId || !familyId || !kidId || isDateInRecentWindow(date)) {
      return () => {};
    }
    const dateKey = toLocalDateKey(date);
    let cancelled = false;
    let unsubscribe = null;
    setHistoricalDays((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || {}), status: 'loading', errorCode: null },
    }));

    const start = async () => {
      const cached = await firestoreService.loadDayActivities(date);
      if (cancelled) return;
      if (cached) {
        setHistoricalDays((prev) => ({
          ...prev,
          [dateKey]: {
            data: cached.data,
            status: 'syncing',
            lastSuccessfulSyncAt: cached.lastSuccessfulSyncAt || 0,
            errorCode: null,
          },
        }));
      }
      unsubscribe = firestoreService.subscribeDayActivities(
        date,
        (bundle) => {
          if (cancelled) return;
          setHistoricalDays((prev) => ({
            ...prev,
            [dateKey]: { ...(prev[dateKey] || {}), data: bundle },
          }));
        },
        (nextStatus) => {
          if (cancelled) return;
          setHistoricalDays((prev) => ({
            ...prev,
            [dateKey]: { ...(prev[dateKey] || {}), ...nextStatus },
          }));
        }
      );
    };
    start().catch((error) => {
      if (cancelled) return;
      const status = String(error?.code || '').endsWith('unavailable') ? 'offline' : 'error';
      setHistoricalDays((prev) => ({
        ...prev,
        [dateKey]: { ...(prev[dateKey] || {}), status, errorCode: error?.code || 'day-load-failed' },
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [usingMockData, userId, familyId, kidId]);

  const getDayLoadState = useCallback((date) => {
    if (isDateInRecentWindow(date)) return syncState;
    return historicalDays[toLocalDateKey(date)] || {
      status: 'loading',
      lastSuccessfulSyncAt: 0,
      hasPendingWrites: false,
    };
  }, [syncState, historicalDays]);

  /** Get timeline items for a specific date (replaces getMockTimelineItems) */
  const getTimelineItems = useCallback((date, filter = null) => {
    const { startMs, endMs } = getDayBounds(date);
    const dayBundle = getActivityBundleForDate(date);
    const dayFeedings = dayBundle.feedings || [];
    const dayNursing = dayBundle.nursingSessions || [];
    const daySolids = dayBundle.solidsSessions || [];
    const daySleep = dayBundle.sleepSessions || [];
    const dayDiapers = dayBundle.diaperChanges || [];

    const items = [];

    // Bottle feedings
    if (!filter || filter === 'feed' || filter === 'bottle') {
      dayFeedings.forEach((doc) => {
        if (doc.timestamp >= startMs && doc.timestamp < endMs) {
          const volumeUnit = kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';
          items.push(feedingDocToCard(doc, volumeUnit));
        }
      });
    }

    // Nursing sessions
    if (!filter || filter === 'feed' || filter === 'nursing') {
      dayNursing.forEach((doc) => {
        const ts = doc.timestamp || doc.startTime || 0;
        if (ts >= startMs && ts < endMs) {
          items.push(nursingDocToCard(doc));
        }
      });
    }

    // Solids sessions
    if (!filter || filter === 'feed' || filter === 'solids') {
      daySolids.forEach((doc) => {
        if (doc.timestamp >= startMs && doc.timestamp < endMs) {
          items.push(solidsDocToCard(doc));
        }
      });
    }

    const sleepDocToDayCard = (doc) => {
      const isActive = Boolean(doc?.isActive || !doc?.endTime);
      const endCandidate = isActive ? Date.now() : doc?.endTime;
      const norm = normalizeSleepInterval(doc?.startTime, endCandidate);
      if (!norm) return null;
      if (overlapMs(norm.startMs, norm.endMs, startMs, endMs) <= 0) return null;

      const crossesFromYesterday = norm.startMs < startMs && norm.endMs > startMs;
      const crossesToTomorrow = norm.startMs < endMs && norm.endMs > endMs;
      const overlap = overlapMs(norm.startMs, norm.endMs, startMs, endMs);
      const durationHours = Math.round((overlap / 3600000) * 10) / 10;

      const startDisplay = crossesFromYesterday
        ? `YD ${formatTime12Hour(doc.startTime)}`
        : formatTime12Hour(doc.startTime);
      const endDisplay = isActive
        ? null
        : (crossesToTomorrow ? `TM ${formatTime12Hour(doc.endTime)}` : doc.endTime);

      return {
        id: doc.id,
        startTime: doc.startTime,
        endTime: endDisplay,
        isActive,
        notes: doc.notes || null,
        photoURLs: doc.photoURLs || null,
        sleepType: doc.sleepType === 'day' ? 'nap' : 'night',
        time: startDisplay,
        hour: crossesFromYesterday ? 0 : new Date(doc.startTime).getHours(),
        minute: crossesFromYesterday ? 0 : new Date(doc.startTime).getMinutes(),
        variant: 'logged',
        type: 'sleep',
        amount: durationHours,
        unit: 'hrs',
        note: doc.notes || null,
        crossesFromYesterday,
        crossesToTomorrow,
        originalStartTime: doc.startTime,
        originalEndTime: doc.endTime || null,
      };
    };

    // Sleep sessions (include if overlap with day)
    if (!filter || filter === 'sleep') {
      daySleep.forEach((doc) => {
        const card = sleepDocToDayCard(doc);
        if (card) items.push(card);
      });
    }

    // Diaper changes
    if (!filter || filter === 'diaper') {
      dayDiapers.forEach((doc) => {
        if (doc.timestamp >= startMs && doc.timestamp < endMs) {
          items.push(diaperDocToCard(doc));
        }
      });
    }

    // Sort by time
    items.sort((a, b) => (a.timestamp || a.startTime || 0) - (b.timestamp || b.startTime || 0));
    return items;
  }, [getActivityBundleForDate, kidSettings?.preferredVolumeUnit]);

  /** Get summary totals for a date (replaces getMockDaySummary) */
  const getDaySummary = useCallback((date) => {
    return summarizeForDay(getActivityBundleForDate(date), date);
  }, [getActivityBundleForDate]);

  const lastBottleAmountOz = useMemo(() => {
    if (!Array.isArray(feedings) || feedings.length === 0) return null;
    const last = feedings.reduce((acc, cur) => {
      if (!cur) return acc;
      const curTs = Number(cur.timestamp || cur.time || cur.createdAt || 0);
      if (!acc) return cur;
      const accTs = Number(acc.timestamp || acc.time || acc.createdAt || 0);
      return curTs > accTs ? cur : acc;
    }, null);
    const oz = Number(last?.ounces ?? last?.amountOz ?? last?.amount ?? last?.volumeOz ?? last?.volume);
    return Number.isFinite(oz) && oz > 0 ? oz : null;
  }, [feedings]);

  const value = useMemo(() => ({
    feedings,
    nursingSessions,
    solidsSessions,
    sleepSessions,
    diaperChanges,
    activeSleep,
    kidData,
    kids,
    kidSettings,
    familyMembers,
    dataLoading,
    trackerBootstrapReady,
    trackerSnapshot,
    syncState,
    lastBottleAmountOz,
    refresh,
    refreshKidProfile,
    applyOptimisticEntry,
    updateKidSettings,
    getTimelineItems,
    getDaySummary,
    subscribeDayActivities,
    getDayLoadState,
    firestoreService,
  }), [
    feedings,
    nursingSessions,
    solidsSessions,
    sleepSessions,
    diaperChanges,
    activeSleep,
    kidData,
    kids,
    kidSettings,
    familyMembers,
    dataLoading,
    trackerBootstrapReady,
    trackerSnapshot,
    syncState,
    lastBottleAmountOz,
    refresh,
    refreshKidProfile,
    applyOptimisticEntry,
    updateKidSettings,
    getTimelineItems,
    getDaySummary,
    subscribeDayActivities,
    getDayLoadState,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
