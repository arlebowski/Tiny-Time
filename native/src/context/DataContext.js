/**
 * DataContext — provides real Firestore data to the app,
 * replacing all mock data sources.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestoreService from '../services/firestoreService';
import { useAuth } from './AuthContext';
import {
  feedingDocToCard,
  nursingDocToCard,
  solidsDocToCard,
  diaperDocToCard,
} from '../../../shared/firebase/transforms';

const DataContext = createContext(null);
const KID_HEADER_CACHE_PREFIX = 'tt_kid_header_v1';
const TRACKER_BOOTSTRAP_CACHE_PREFIX = 'tt_tracker_bootstrap_v2';
const FREEZE_DEBUG = false;
const debugLog = (...args) => {
  if (FREEZE_DEBUG) console.log('[FreezeDebug][DataContext]', ...args);
};

const DAY_MS = 24 * 60 * 60 * 1000;

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

function kidHeaderCacheKey(familyId, kidId) {
  if (!familyId || !kidId) return null;
  return `${KID_HEADER_CACHE_PREFIX}:${familyId}:${kidId}`;
}

function trackerBootstrapCacheKey(familyId, kidId) {
  if (!familyId || !kidId) return null;
  return `${TRACKER_BOOTSTRAP_CACHE_PREFIX}:${familyId}:${kidId}`;
}

function toLocalDateKey(dateLike = Date.now()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayBounds(date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return {
    startMs: dayStart.getTime(),
    endMs: dayEnd.getTime(),
  };
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
    if (f.timestamp >= startMs && f.timestamp <= endMs) {
      feedOz += Number(f.ounces) || 0;
      if (!lastBottleTime || f.timestamp > lastBottleTime) lastBottleTime = f.timestamp;
    }
  });

  nursingSessions.forEach((s) => {
    const ts = s.timestamp || s.startTime || 0;
    if (ts >= startMs && ts <= endMs) {
      const left = (Number(s.leftDurationSec) || 0) * 1000;
      const right = (Number(s.rightDurationSec) || 0) * 1000;
      nursingMs += left + right;
      if (!lastNursingTime || ts > lastNursingTime) lastNursingTime = ts;
    }
  });

  solidsSessions.forEach((s) => {
    if (s.timestamp >= startMs && s.timestamp <= endMs) {
      solidsCount += Array.isArray(s.foods) ? s.foods.length : 1;
      if (!lastSolidsTime || s.timestamp > lastSolidsTime) lastSolidsTime = s.timestamp;
    }
  });

  sleepSessions.forEach((s) => {
    const endCandidate = s.endTime || (s.isActive ? Date.now() : null);
    const norm = normalizeSleepInterval(s.startTime, endCandidate);
    if (!norm) return;
    const overlap = overlapMs(norm.startMs, norm.endMs, startMs, endMs + 1);
    if (overlap > 0) sleepMs += overlap;
    if (s.endTime && s.endTime >= startMs && s.endTime <= endMs) {
      if (!lastSleepTime || s.endTime > lastSleepTime) lastSleepTime = s.endTime;
    }
  });

  diaperChanges.forEach((c) => {
    if (c.timestamp >= startMs && c.timestamp <= endMs) {
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
  const { familyId, kidId } = useAuth();

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

  const unsubActiveSleepRef = useRef(null);
  const unsubFeedingsRef = useRef(null);
  const unsubNursingRef = useRef(null);
  const unsubSolidsRef = useRef(null);
  const unsubSleepRef = useRef(null);
  const unsubDiapersRef = useRef(null);
  const bootstrapWriteTimerRef = useRef(null);
  const didHydrateBootstrapRef = useRef(false);
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

  // Initialize service and load data when family/kid changes
  useEffect(() => {
    didHydrateBootstrapRef.current = false;
    setTrackerBootstrapReady(false);
    setTrackerSnapshot(null);
    if (usingMockData) {
      setDataLoading(false);
      setTrackerBootstrapReady(true);
      return;
    }
    if (!familyId || !kidId) {
      setKids([]);
      setDataLoading(false);
      setTrackerBootstrapReady(true);
      return;
    }

    let cancelled = false;

    const cacheKey = kidHeaderCacheKey(familyId, kidId);
    const bootstrapKey = trackerBootstrapCacheKey(familyId, kidId);

    const init = async () => {
      const initStart = Date.now();
      setDataLoading(true);
      debugLog('init:start', { familyId, kidId });
      firestoreService.initialize(familyId, kidId);
      const bootstrapHydrated = {
        feedings: false,
        nursingSessions: false,
        solidsSessions: false,
        sleepSessions: false,
        diaperChanges: false,
        activeSleep: false,
        trackerSnapshot: false,
      };

      try {
        if (bootstrapKey) {
          const bootstrapReadStart = Date.now();
          const cachedBootstrap = await AsyncStorage.getItem(bootstrapKey);
          debugLog('bootstrap:read', {
            ms: Date.now() - bootstrapReadStart,
            bytes: cachedBootstrap ? cachedBootstrap.length : 0,
            hasData: !!cachedBootstrap,
          });
          if (!cancelled && cachedBootstrap) {
            try {
              const parseStart = Date.now();
              const parsed = JSON.parse(cachedBootstrap);
              debugLog('bootstrap:parse', { ms: Date.now() - parseStart });
              if (Array.isArray(parsed?.feedings)) {
                setFeedings(parsed.feedings);
                bootstrapHydrated.feedings = true;
              }
              if (Array.isArray(parsed?.nursingSessions)) {
                setNursingSessions(parsed.nursingSessions);
                bootstrapHydrated.nursingSessions = true;
              }
              if (Array.isArray(parsed?.solidsSessions)) {
                setSolidsSessions(parsed.solidsSessions);
                bootstrapHydrated.solidsSessions = true;
              }
              if (Array.isArray(parsed?.sleepSessions)) {
                setSleepSessions(parsed.sleepSessions);
                bootstrapHydrated.sleepSessions = true;
              }
              if (Array.isArray(parsed?.diaperChanges)) {
                setDiaperChanges(parsed.diaperChanges);
                bootstrapHydrated.diaperChanges = true;
              }
              if (parsed?.kidSettings && typeof parsed.kidSettings === 'object') setKidSettings(parsed.kidSettings);
              if (parsed?.kidData) setKidData(parsed.kidData);
              if (Array.isArray(parsed?.kids)) setKids(parsed.kids);
              if (Array.isArray(parsed?.familyMembers)) setFamilyMembers(parsed.familyMembers);
              if (parsed?.activeSleep) {
                setActiveSleep(parsed.activeSleep);
                bootstrapHydrated.activeSleep = true;
              } else if (Array.isArray(parsed?.sleepSessions)) {
                const cachedActive = parsed.sleepSessions
                  .filter((s) => s?.isActive && s?.startTime)
                  .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0];
                if (cachedActive) {
                  setActiveSleep(cachedActive);
                  bootstrapHydrated.activeSleep = true;
                }
              }
              if (parsed?.trackerSnapshot) {
                setTrackerSnapshot(parsed.trackerSnapshot);
                bootstrapHydrated.trackerSnapshot = true;
              } else {
                setTrackerSnapshot({
                  dateKey: toLocalDateKey(),
                  summary: summarizeForDay({
                    feedings: parsed?.feedings || [],
                    nursingSessions: parsed?.nursingSessions || [],
                    solidsSessions: parsed?.solidsSessions || [],
                    sleepSessions: parsed?.sleepSessions || [],
                    diaperChanges: parsed?.diaperChanges || [],
                  }),
                  activeSleep: parsed?.activeSleep || null,
                  savedAt: parsed?.savedAt || Date.now(),
                });
                bootstrapHydrated.trackerSnapshot = true;
              }
            } catch {}
          }
        }

        await firestoreService._loadCache();
        debugLog('cache:load:done');
        if (!cancelled) {
          debugLog('cache:apply:start');
          const cachedFeeds = Array.isArray(firestoreService?._cache?.feedings)
            ? [...firestoreService._cache.feedings].reverse()
            : null;
          const cachedNursing = Array.isArray(firestoreService?._cache?.nursingSessions)
            ? [...firestoreService._cache.nursingSessions].reverse()
            : null;
          const cachedSolids = Array.isArray(firestoreService?._cache?.solidsSessions)
            ? [...firestoreService._cache.solidsSessions].reverse()
            : null;
          const cachedSleep = Array.isArray(firestoreService?._cache?.sleepSessions)
            ? [...firestoreService._cache.sleepSessions].reverse()
            : null;
          const cachedDiapers = Array.isArray(firestoreService?._cache?.diaperChanges)
            ? [...firestoreService._cache.diaperChanges].reverse()
            : null;
          debugLog('cache:apply:sizes', {
            feedings: cachedFeeds?.length || 0,
            nursing: cachedNursing?.length || 0,
            solids: cachedSolids?.length || 0,
            sleep: cachedSleep?.length || 0,
            diapers: cachedDiapers?.length || 0,
          });
          if (Array.isArray(cachedFeeds) && (cachedFeeds.length > 0 || !bootstrapHydrated.feedings)) {
            setFeedings(cachedFeeds);
          }
          if (Array.isArray(cachedNursing) && (cachedNursing.length > 0 || !bootstrapHydrated.nursingSessions)) {
            setNursingSessions(cachedNursing);
          }
          if (Array.isArray(cachedSolids) && (cachedSolids.length > 0 || !bootstrapHydrated.solidsSessions)) {
            setSolidsSessions(cachedSolids);
          }
          if (Array.isArray(cachedSleep) && (cachedSleep.length > 0 || !bootstrapHydrated.sleepSessions)) {
            setSleepSessions(cachedSleep);
            const cachedActive = cachedSleep.find((s) => s?.isActive && s?.startTime) || null;
            if (cachedActive || !bootstrapHydrated.activeSleep) setActiveSleep(cachedActive);
          }
          if (Array.isArray(cachedDiapers) && (cachedDiapers.length > 0 || !bootstrapHydrated.diaperChanges)) {
            setDiaperChanges(cachedDiapers);
          }
          if (
            !bootstrapHydrated.trackerSnapshot
            && (
              (Array.isArray(cachedFeeds) && cachedFeeds.length > 0)
              || (Array.isArray(cachedNursing) && cachedNursing.length > 0)
              || (Array.isArray(cachedSolids) && cachedSolids.length > 0)
              || (Array.isArray(cachedSleep) && cachedSleep.length > 0)
              || (Array.isArray(cachedDiapers) && cachedDiapers.length > 0)
            )
          ) {
            setTrackerSnapshot({
              dateKey: toLocalDateKey(),
              summary: summarizeForDay({
                feedings: cachedFeeds || [],
                nursingSessions: cachedNursing || [],
                solidsSessions: cachedSolids || [],
                sleepSessions: cachedSleep || [],
                diaperChanges: cachedDiapers || [],
              }),
              activeSleep: (cachedSleep || []).find((s) => s?.isActive && s?.startTime) || null,
              savedAt: Date.now(),
            });
          }
          debugLog('cache:apply:done');
        }

        if (cacheKey) {
          const headerReadStart = Date.now();
          const cachedHeader = await AsyncStorage.getItem(cacheKey);
          debugLog('header:read', {
            ms: Date.now() - headerReadStart,
            bytes: cachedHeader ? cachedHeader.length : 0,
            hasData: !!cachedHeader,
          });
          if (!cancelled && cachedHeader) {
            try {
              const parsed = JSON.parse(cachedHeader);
              if (parsed?.kidData) setKidData(parsed.kidData);
              if (Array.isArray(parsed?.kids)) setKids(parsed.kids);
            } catch {}
          }
        }

        if (!cancelled) setTrackerBootstrapReady(true);
        didHydrateBootstrapRef.current = true;

        debugLog('refresh:force:start');
        await firestoreService._refreshCache({ force: true });
        debugLog('cache:refresh:done');

        if (cancelled) return;

        const [feeds, nursing, solids, sleep, diapers, kd, familyKids, ks, members] = await Promise.all([
          firestoreService.getFeedings(),
          firestoreService.getNursingSessions(),
          firestoreService.getSolidsSessions(),
          firestoreService.getSleepSessions(),
          firestoreService.getDiaperChanges(),
          firestoreService.getKidData(),
          firestoreService.getKids(),
          firestoreService.getKidSettings(),
          firestoreService.getFamilyMembers(),
        ]);

        if (cancelled) return;

        setFeedings(feeds);
        setNursingSessions(nursing);
        setSolidsSessions(solids);
        setSleepSessions(sleep);
        setDiaperChanges(diapers);
        setKidData(kd);
        const nextKids =
          Array.isArray(familyKids) && familyKids.length
            ? familyKids
            : (kd ? [{ id: kd.id, name: kd.name, photoURL: kd.photoURL || null }] : []);
        setKids(nextKids);
        setKidSettings(ks);
        setFamilyMembers(members);
        const freshTrackerSnapshot = {
          dateKey: toLocalDateKey(),
          summary: summarizeForDay({
            feedings: feeds,
            nursingSessions: nursing,
            solidsSessions: solids,
            sleepSessions: sleep,
            diaperChanges: diapers,
          }),
          activeSleep: sleep.find((s) => s?.isActive && s?.startTime) || null,
          savedAt: Date.now(),
        };
        setTrackerSnapshot(freshTrackerSnapshot);

        if (cacheKey) {
          AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({
              kidData: kd || null,
              kids: nextKids,
            })
          ).catch(() => {});
        }

        if (bootstrapKey) {
          const serializeStart = Date.now();
          const serialized = JSON.stringify(
            buildTrackerBootstrapPayload({
              activeSleep: sleep.find((s) => s?.isActive && s?.startTime) || null,
              kidData: kd,
              kids: nextKids,
              kidSettings: ks,
              familyMembers: members,
              trackerSnapshot: freshTrackerSnapshot,
            })
          );
          AsyncStorage.setItem(
            bootstrapKey,
            serialized
          ).catch(() => {});
          debugLog('bootstrap:initialWrite', {
            ms: Date.now() - serializeStart,
            bytes: serialized.length,
          });
        }
      } catch (e) {
        console.warn('Data init failed:', e);
        if (!cancelled) setTrackerBootstrapReady(true);
      }

      // Subscribe to active sleep
      if (unsubActiveSleepRef.current) {
        unsubActiveSleepRef.current();
      }
      unsubActiveSleepRef.current = firestoreService.subscribeActiveSleep((session) => {
        if (!cancelled) setActiveSleep(session);
      });

      // Subscribe to live collection updates so UI reflects writes immediately.
      if (unsubFeedingsRef.current) unsubFeedingsRef.current();
      if (unsubNursingRef.current) unsubNursingRef.current();
      if (unsubSolidsRef.current) unsubSolidsRef.current();
      if (unsubSleepRef.current) unsubSleepRef.current();
      if (unsubDiapersRef.current) unsubDiapersRef.current();

      unsubFeedingsRef.current = firestoreService.subscribeFeedings((items) => {
        if (cancelled || !Array.isArray(items)) return;
        setFeedings(items);
      });
      unsubNursingRef.current = firestoreService.subscribeNursingSessions((items) => {
        if (cancelled || !Array.isArray(items)) return;
        setNursingSessions(items);
      });
      unsubSolidsRef.current = firestoreService.subscribeSolidsSessions((items) => {
        if (cancelled || !Array.isArray(items)) return;
        setSolidsSessions(items);
      });
      unsubSleepRef.current = firestoreService.subscribeSleepSessions((items) => {
        if (cancelled || !Array.isArray(items)) return;
        setSleepSessions(items);
        const active = items.find((s) => s?.isActive && s?.startTime) || null;
        setActiveSleep(active);
      });
      unsubDiapersRef.current = firestoreService.subscribeDiaperChanges((items) => {
        if (cancelled || !Array.isArray(items)) return;
        setDiaperChanges(items);
      });

      if (!cancelled) setDataLoading(false);
      debugLog('init:done', { ms: Date.now() - initStart });
    };

    init();

    return () => {
      cancelled = true;
      if (unsubActiveSleepRef.current) {
        unsubActiveSleepRef.current();
        unsubActiveSleepRef.current = null;
      }
      if (unsubFeedingsRef.current) {
        unsubFeedingsRef.current();
        unsubFeedingsRef.current = null;
      }
      if (unsubNursingRef.current) {
        unsubNursingRef.current();
        unsubNursingRef.current = null;
      }
      if (unsubSolidsRef.current) {
        unsubSolidsRef.current();
        unsubSolidsRef.current = null;
      }
      if (unsubSleepRef.current) {
        unsubSleepRef.current();
        unsubSleepRef.current = null;
      }
      if (unsubDiapersRef.current) {
        unsubDiapersRef.current();
        unsubDiapersRef.current = null;
      }
      if (bootstrapWriteTimerRef.current) {
        clearTimeout(bootstrapWriteTimerRef.current);
        bootstrapWriteTimerRef.current = null;
      }
    };
  }, [familyId, kidId, usingMockData]);

  useEffect(() => {
    if (usingMockData) return;
    if (!familyId || !kidId) return;
    if (!didHydrateBootstrapRef.current) return;
    const bootstrapKey = trackerBootstrapCacheKey(familyId, kidId);
    if (!bootstrapKey) return;
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
      AsyncStorage.setItem(bootstrapKey, serialized).catch(() => {});
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

  /** Refresh all data from Firestore */
  const refresh = useCallback(async () => {
    if (usingMockData) return;
    if (!familyId || !kidId) return;
    try {
      await firestoreService._refreshCache({ force: true });
      const [feeds, nursing, solids, sleep, diapers, kd, familyKids] = await Promise.all([
        firestoreService.getFeedings(),
        firestoreService.getNursingSessions(),
        firestoreService.getSolidsSessions(),
        firestoreService.getSleepSessions(),
        firestoreService.getDiaperChanges(),
        firestoreService.getKidData(),
        firestoreService.getKids(),
      ]);
      setFeedings(feeds);
      setNursingSessions(nursing);
      setSolidsSessions(solids);
      setSleepSessions(sleep);
      setDiaperChanges(diapers);
      setKidData(kd);
      setKids(
        Array.isArray(familyKids) && familyKids.length
          ? familyKids
          : (kd ? [{ id: kd.id, name: kd.name, photoURL: kd.photoURL || null }] : [])
      );
    } catch (e) {
      console.warn('Data refresh failed:', e);
    }
  }, [familyId, kidId, usingMockData]);

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

    if (type === 'bottle' || type === 'feed') {
      const timestamp = Number(entry.timestamp) || now;
      const doc = {
        id: resolvedId,
        ounces: Number(entry.ounces) || 0,
        timestamp,
        notes: entry.notes || null,
        photoURLs: Array.isArray(entry.photoURLs) ? entry.photoURLs : null,
      };
      setFeedings((prev) => [doc, ...(Array.isArray(prev) ? prev.filter((p) => p?.id !== resolvedId) : [])]);
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
      setNursingSessions((prev) => [doc, ...(Array.isArray(prev) ? prev.filter((p) => p?.id !== resolvedId) : [])]);
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
      setSolidsSessions((prev) => [doc, ...(Array.isArray(prev) ? prev.filter((p) => p?.id !== resolvedId) : [])]);
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
      setSleepSessions((prev) => [doc, ...(Array.isArray(prev) ? prev.filter((p) => p?.id !== resolvedId) : [])]);
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
      setDiaperChanges((prev) => [doc, ...(Array.isArray(prev) ? prev.filter((p) => p?.id !== resolvedId) : [])]);
    }
  }, []);

  /** Get timeline items for a specific date (replaces getMockTimelineItems) */
  const getTimelineItems = useCallback((date, filter = null) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const startMs = dayStart.getTime();
    const endMs = dayEnd.getTime();

    const items = [];

    // Bottle feedings
    if (!filter || filter === 'feed' || filter === 'bottle') {
      feedings.forEach((doc) => {
        if (doc.timestamp >= startMs && doc.timestamp <= endMs) {
          const volumeUnit = kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';
          items.push(feedingDocToCard(doc, volumeUnit));
        }
      });
    }

    // Nursing sessions
    if (!filter || filter === 'feed' || filter === 'nursing') {
      nursingSessions.forEach((doc) => {
        const ts = doc.timestamp || doc.startTime || 0;
        if (ts >= startMs && ts <= endMs) {
          items.push(nursingDocToCard(doc));
        }
      });
    }

    // Solids sessions
    if (!filter || filter === 'feed' || filter === 'solids') {
      solidsSessions.forEach((doc) => {
        if (doc.timestamp >= startMs && doc.timestamp <= endMs) {
          items.push(solidsDocToCard(doc));
        }
      });
    }

    const sleepDocToDayCard = (doc) => {
      const isActive = Boolean(doc?.isActive || !doc?.endTime);
      const endCandidate = isActive ? Date.now() : doc?.endTime;
      const norm = normalizeSleepInterval(doc?.startTime, endCandidate);
      if (!norm) return null;
      if (overlapMs(norm.startMs, norm.endMs, startMs, endMs + 1) <= 0) return null;

      const crossesFromYesterday = norm.startMs < startMs && norm.endMs > startMs;
      const crossesToTomorrow = norm.startMs < (endMs + 1) && norm.endMs > (endMs + 1);
      const overlap = overlapMs(norm.startMs, norm.endMs, startMs, endMs + 1);
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
      sleepSessions.forEach((doc) => {
        const card = sleepDocToDayCard(doc);
        if (card) items.push(card);
      });
    }

    // Diaper changes
    if (!filter || filter === 'diaper') {
      diaperChanges.forEach((doc) => {
        if (doc.timestamp >= startMs && doc.timestamp <= endMs) {
          items.push(diaperDocToCard(doc));
        }
      });
    }

    // Sort by time
    items.sort((a, b) => (a.timestamp || a.startTime || 0) - (b.timestamp || b.startTime || 0));
    return items;
  }, [feedings, nursingSessions, solidsSessions, sleepSessions, diaperChanges, kidSettings?.preferredVolumeUnit]);

  /** Get summary totals for a date (replaces getMockDaySummary) */
  const getDaySummary = useCallback((date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const startMs = dayStart.getTime();
    const endMs = dayEnd.getTime();

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
      if (f.timestamp >= startMs && f.timestamp <= endMs) {
        feedOz += Number(f.ounces) || 0;
        if (!lastBottleTime || f.timestamp > lastBottleTime) lastBottleTime = f.timestamp;
      }
    });

    nursingSessions.forEach((s) => {
      const ts = s.timestamp || s.startTime || 0;
      if (ts >= startMs && ts <= endMs) {
        const left = (Number(s.leftDurationSec) || 0) * 1000;
        const right = (Number(s.rightDurationSec) || 0) * 1000;
        nursingMs += left + right;
        if (!lastNursingTime || ts > lastNursingTime) lastNursingTime = ts;
      }
    });

    solidsSessions.forEach((s) => {
      if (s.timestamp >= startMs && s.timestamp <= endMs) {
        solidsCount += Array.isArray(s.foods) ? s.foods.length : 1;
        if (!lastSolidsTime || s.timestamp > lastSolidsTime) lastSolidsTime = s.timestamp;
      }
    });

    sleepSessions.forEach((s) => {
      const endCandidate = s.endTime || (s.isActive ? Date.now() : null);
      const norm = normalizeSleepInterval(s.startTime, endCandidate);
      if (!norm) return;
      const overlap = overlapMs(norm.startMs, norm.endMs, startMs, endMs + 1);
      if (overlap > 0) sleepMs += overlap;
      if (s.endTime && s.endTime >= startMs && s.endTime <= endMs) {
        if (!lastSleepTime || s.endTime > lastSleepTime) lastSleepTime = s.endTime;
      }
    });

    diaperChanges.forEach((c) => {
      if (c.timestamp >= startMs && c.timestamp <= endMs) {
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
  }, [feedings, nursingSessions, solidsSessions, sleepSessions, diaperChanges]);

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

  const value = {
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
    lastBottleAmountOz,
    refresh,
    applyOptimisticEntry,
    updateKidSettings,
    getTimelineItems,
    getDaySummary,
    firestoreService,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
