/**
 * DataContext — provides real Firestore data to the app,
 * replacing all mock data sources.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestoreService from '../services/firestoreService';
import { useAuth } from './AuthContext';
import {
  feedingDocToCard,
  nursingDocToCard,
  solidsDocToCard,
  sleepDocToCard,
  diaperDocToCard,
} from '../../../shared/firebase/transforms';

const DataContext = createContext(null);
const KID_HEADER_CACHE_PREFIX = 'tt_kid_header_v1';

function kidHeaderCacheKey(familyId, kidId) {
  if (!familyId || !kidId) return null;
  return `${KID_HEADER_CACHE_PREFIX}:${familyId}:${kidId}`;
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

  const unsubActiveSleepRef = useRef(null);
  const usingMockData = !firestoreService?.isAvailable;

  useEffect(() => {
    if (!usingMockData) return;
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
    if (usingMockData) {
      setDataLoading(false);
      return;
    }
    if (!familyId || !kidId) {
      setKids([]);
      setDataLoading(false);
      return;
    }

    let cancelled = false;

    const cacheKey = kidHeaderCacheKey(familyId, kidId);

    const init = async () => {
      setDataLoading(true);
      firestoreService.initialize(familyId, kidId);

      try {
        if (cacheKey) {
          const cachedHeader = await AsyncStorage.getItem(cacheKey);
          if (!cancelled && cachedHeader) {
            try {
              const parsed = JSON.parse(cachedHeader);
              if (parsed?.kidData) setKidData(parsed.kidData);
              if (Array.isArray(parsed?.kids)) setKids(parsed.kids);
            } catch {}
          }
        }

        await firestoreService._refreshCache({ force: true });

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

        if (cacheKey) {
          AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({
              kidData: kd || null,
              kids: nextKids,
            })
          ).catch(() => {});
        }
      } catch (e) {
        console.warn('Data init failed:', e);
      }

      // Subscribe to active sleep
      if (unsubActiveSleepRef.current) {
        unsubActiveSleepRef.current();
      }
      unsubActiveSleepRef.current = firestoreService.subscribeActiveSleep((session) => {
        if (!cancelled) setActiveSleep(session);
      });

      if (!cancelled) setDataLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      if (unsubActiveSleepRef.current) {
        unsubActiveSleepRef.current();
        unsubActiveSleepRef.current = null;
      }
    };
  }, [familyId, kidId, usingMockData]);

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
          items.push(feedingDocToCard(doc));
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

    // Sleep sessions (include if start or end falls within day)
    if (!filter || filter === 'sleep') {
      sleepSessions.forEach((doc) => {
        const sTs = doc.startTime || 0;
        const eTs = doc.endTime || Date.now();
        if ((sTs >= startMs && sTs <= endMs) || (eTs >= startMs && eTs <= endMs) || (sTs <= startMs && eTs >= endMs)) {
          items.push(sleepDocToCard(doc));
        }
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
  }, [feedings, nursingSessions, solidsSessions, sleepSessions, diaperChanges]);

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
      const sTs = s.startTime || 0;
      const eTs = s.endTime || (s.isActive ? Date.now() : 0);
      // Clamp to current day
      const clampedStart = Math.max(sTs, startMs);
      const clampedEnd = Math.min(eTs, endMs);
      if (clampedEnd > clampedStart) {
        sleepMs += clampedEnd - clampedStart;
      }
      if (sTs >= startMs && sTs <= endMs) {
        if (!lastSleepTime || sTs > lastSleepTime) lastSleepTime = sTs;
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
    refresh,
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
