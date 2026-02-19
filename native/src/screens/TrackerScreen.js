import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SettingsIcon, SpinnerIcon } from '../components/icons';
import BottleCard from '../components/cards/BottleCard';
import NursingCard from '../components/cards/NursingCard';
import SolidsCard from '../components/cards/SolidsCard';
import SleepCard from '../components/cards/SleepCard';
import DiaperCard from '../components/cards/DiaperCard';
import ActiveSleepCard from '../components/shared/ActiveSleepCard';
import {
  normalizeActivityVisibility,
  normalizeActivityOrder,
} from '../constants/activityVisibility';

const TT_AVG_BUCKET_MINUTES = 15;
const TT_AVG_BUCKET_MS = TT_AVG_BUCKET_MINUTES * 60000;
const TT_AVG_BUCKETS = 96;
const TT_AVG_DAYS = 7;
const TT_AVG_EVEN_EPSILON = 0.05;
const NURSING_NO_AVG_COMPARISON = { state: 'no_comparison_yet', label: 'No avg' };
const PTR_MIN_VISIBLE_MS = 600;
const PTR_IOS_OFFSET = 88;

// ── Date formatting (web: __ttHorizontalFormat(selectedDate, "EEEE, MMM d")) ──
function formatDateLabel(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

// ── Greeting (web HorizontalCalendar.js:192-197) ──
function getGreeting(now) {
  const hours = now.getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  return 'Good evening';
}

function toLocalDateKey(dateLike = Date.now()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSnapshotForToday(snapshot, todayKey) {
  if (!snapshot) return false;
  if (snapshot.dateKey === todayKey) return true;
  if (snapshot.savedAt) return toLocalDateKey(snapshot.savedAt) === todayKey;
  return false;
}

function startOfDayMsLocal(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketIndexCeilFromMinutes(mins) {
  const clamped = Math.max(
    0,
    Math.min(1440, Math.ceil(mins / TT_AVG_BUCKET_MINUTES) * TT_AVG_BUCKET_MINUTES)
  );
  return Math.min(TT_AVG_BUCKETS - 1, Math.floor(clamped / TT_AVG_BUCKET_MINUTES));
}

function bucketIndexCeilFromMs(ts) {
  const d = new Date(ts);
  return bucketIndexCeilFromMinutes(d.getHours() * 60 + d.getMinutes());
}

function normalizeSleepIntervalForAvg(startMs, endMs, nowMs = Date.now()) {
  let sMs = Number(startMs);
  let eMs = Number(endMs);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
  if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
  if (eMs < sMs) sMs -= 86400000;
  if (eMs < sMs) return null;
  return { startMs: sMs, endMs: eMs };
}

function addSleepOverlapToBuckets(startMs, endMs, dayStartMs, increments) {
  const dayEndMs = dayStartMs + 86400000;
  const overlapStart = Math.max(startMs, dayStartMs);
  const overlapEnd = Math.min(endMs, dayEndMs);
  if (overlapEnd <= overlapStart) return;

  const startBucket = Math.max(0, Math.floor((overlapStart - dayStartMs) / TT_AVG_BUCKET_MS));
  const endBucket = Math.min(
    TT_AVG_BUCKETS - 1,
    Math.floor((overlapEnd - dayStartMs - 1) / TT_AVG_BUCKET_MS)
  );

  for (let i = startBucket; i <= endBucket; i += 1) {
    const bucketStart = dayStartMs + i * TT_AVG_BUCKET_MS;
    const bucketEnd = bucketStart + TT_AVG_BUCKET_MS;
    const overlap = Math.max(0, Math.min(overlapEnd, bucketEnd) - Math.max(overlapStart, bucketStart));
    if (overlap > 0) increments[i] += overlap;
  }
}

function buildFeedAvgBuckets(allFeedings, todayStartMs) {
  if (!Array.isArray(allFeedings) || allFeedings.length === 0) return null;
  const dayMap = new Map();
  allFeedings.forEach((f) => {
    const ts = Number(f?.timestamp || 0);
    if (!Number.isFinite(ts) || ts >= todayStartMs) return;
    const dayStartMs = startOfDayMsLocal(ts);
    const list = dayMap.get(dayStartMs) || [];
    list.push(f);
    dayMap.set(dayStartMs, list);
  });
  const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
  if (dayStarts.length === 0) return null;

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  dayStarts.forEach((dayStartMs) => {
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    const dayFeedings = dayMap.get(dayStartMs) || [];
    dayFeedings.forEach((f) => {
      const ts = Number(f?.timestamp || 0);
      const oz = Number(f?.ounces || 0);
      if (!Number.isFinite(ts) || !Number.isFinite(oz) || oz <= 0) return;
      const idx = bucketIndexCeilFromMs(ts);
      increments[idx] += oz;
    });
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => v / dayStarts.length),
    daysUsed: dayStarts.length,
  };
}

function buildNursingAvgBuckets(allNursingSessions, todayStartMs) {
  if (!Array.isArray(allNursingSessions) || allNursingSessions.length === 0) return null;
  const dayMap = new Map();
  allNursingSessions.forEach((s) => {
    const ts = Number(s?.timestamp || s?.startTime || 0);
    if (!Number.isFinite(ts) || ts >= todayStartMs) return;
    const dayStartMs = startOfDayMsLocal(ts);
    const list = dayMap.get(dayStartMs) || [];
    list.push(s);
    dayMap.set(dayStartMs, list);
  });
  const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
  if (dayStarts.length === 0) return null;

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  dayStarts.forEach((dayStartMs) => {
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    const daySessions = dayMap.get(dayStartMs) || [];
    daySessions.forEach((s) => {
      const ts = Number(s?.timestamp || s?.startTime || 0);
      const left = Number(s?.leftDurationSec || 0);
      const right = Number(s?.rightDurationSec || 0);
      const totalSec = Math.max(0, left + right);
      if (!Number.isFinite(ts) || totalSec <= 0) return;
      const idx = bucketIndexCeilFromMs(ts);
      increments[idx] += totalSec / 3600;
    });
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => v / dayStarts.length),
    daysUsed: dayStarts.length,
  };
}

function buildSolidsAvgBuckets(allSolidsSessions, todayStartMs) {
  if (!Array.isArray(allSolidsSessions) || allSolidsSessions.length === 0) return null;
  const dayMap = new Map();
  allSolidsSessions.forEach((s) => {
    const ts = Number(s?.timestamp || 0);
    if (!Number.isFinite(ts) || ts >= todayStartMs) return;
    const dayStartMs = startOfDayMsLocal(ts);
    const list = dayMap.get(dayStartMs) || [];
    list.push(s);
    dayMap.set(dayStartMs, list);
  });
  const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
  if (dayStarts.length === 0) return null;

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  dayStarts.forEach((dayStartMs) => {
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    const daySessions = dayMap.get(dayStartMs) || [];
    daySessions.forEach((s) => {
      const ts = Number(s?.timestamp || 0);
      const foods = Array.isArray(s?.foods) ? s.foods.length : 0;
      if (!Number.isFinite(ts) || foods <= 0) return;
      const idx = bucketIndexCeilFromMs(ts);
      increments[idx] += foods;
    });
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => v / dayStarts.length),
    daysUsed: dayStarts.length,
  };
}

function buildSleepAvgBuckets(allSleepSessions, todayStartMs) {
  if (!Array.isArray(allSleepSessions) || allSleepSessions.length === 0) return null;

  const normalized = allSleepSessions
    .map((s) => {
      if (!s?.startTime || !s?.endTime) return null;
      const norm = normalizeSleepIntervalForAvg(s.startTime, s.endTime);
      return norm ? { startMs: norm.startMs, endMs: norm.endMs } : null;
    })
    .filter(Boolean);
  if (normalized.length === 0) return null;

  const daySet = new Set();
  normalized.forEach((s) => {
    const endDayStart = startOfDayMsLocal(s.endMs);
    for (let ds = startOfDayMsLocal(s.startMs); ds <= endDayStart; ds += 86400000) {
      if (ds < todayStartMs) daySet.add(ds);
    }
  });

  const dayStarts = Array.from(daySet).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
  if (dayStarts.length === 0) return null;

  const dayIndex = new Map(dayStarts.map((d, i) => [d, i]));
  const perDayIncrements = dayStarts.map(() => Array(TT_AVG_BUCKETS).fill(0));

  normalized.forEach((s) => {
    const endDayStart = startOfDayMsLocal(s.endMs);
    for (let ds = startOfDayMsLocal(s.startMs); ds <= endDayStart; ds += 86400000) {
      const idx = dayIndex.get(ds);
      if (idx == null) continue;
      addSleepOverlapToBuckets(s.startMs, s.endMs, ds, perDayIncrements[idx]);
    }
  });

  const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
  perDayIncrements.forEach((increments) => {
    let running = 0;
    for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
      sumBuckets[i] += running;
    }
  });

  return {
    buckets: sumBuckets.map((v) => (v / dayStarts.length) / 3600000),
    daysUsed: dayStarts.length,
  };
}

function calcFeedCumulativeAtBucket(entries, bucketIdx, dayStartMs, dayEndMs) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  entries.forEach((f) => {
    const ts = Number(f?.timestamp || 0);
    const oz = Number(f?.ounces || 0);
    if (!Number.isFinite(ts) || ts < dayStartMs || ts >= dayEndMs) return;
    if (!Number.isFinite(oz) || oz <= 0) return;
    const idx = bucketIndexCeilFromMs(ts);
    increments[idx] += oz;
  });
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running;
}

function calcNursingCumulativeAtBucket(entries, bucketIdx, dayStartMs, dayEndMs) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  entries.forEach((s) => {
    const ts = Number(s?.timestamp || s?.startTime || 0);
    if (!Number.isFinite(ts) || ts < dayStartMs || ts >= dayEndMs) return;
    const left = Number(s?.leftDurationSec || 0);
    const right = Number(s?.rightDurationSec || 0);
    const totalSec = Math.max(0, left + right);
    if (totalSec <= 0) return;
    const idx = bucketIndexCeilFromMs(ts);
    increments[idx] += totalSec / 3600;
  });
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running;
}

function calcSolidsCumulativeAtBucket(entries, bucketIdx, dayStartMs, dayEndMs) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  entries.forEach((s) => {
    const ts = Number(s?.timestamp || 0);
    if (!Number.isFinite(ts) || ts < dayStartMs || ts >= dayEndMs) return;
    const foods = Array.isArray(s?.foods) ? s.foods.length : 0;
    if (foods <= 0) return;
    const idx = bucketIndexCeilFromMs(ts);
    increments[idx] += foods;
  });
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running;
}

function normalizeSleepStartMs(startMs, nowMs = Date.now()) {
  let s = Number(startMs);
  if (!Number.isFinite(s)) return null;
  if (s > nowMs + 3 * 3600000) s -= 86400000;
  return s;
}

function calcSleepCumulativeAtBucket(entries, bucketIdx, dayStartMs, activeSleepSession = null, nowMs = Date.now()) {
  const increments = Array(TT_AVG_BUCKETS).fill(0);
  (entries || []).forEach((s) => {
    const startMs = Number(s?._normStartTime || s?.startTime || 0);
    const endMs = Number(s?._normEndTime || s?.endTime || 0);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
    addSleepOverlapToBuckets(startMs, endMs, dayStartMs, increments);
  });
  if (activeSleepSession?.startTime) {
    const startMs = normalizeSleepStartMs(activeSleepSession.startTime, nowMs);
    if (startMs) addSleepOverlapToBuckets(startMs, nowMs, dayStartMs, increments);
  }
  let running = 0;
  for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
    running += increments[i];
  }
  return running / 3600000;
}

export default function TrackerScreen({
  entranceToken = 0,
  onOpenSheet,
  onCardTap,
  onRequestToggleActivitySheet,
  activityVisibility,
  activityOrder,
}) {
  const { colors } = useTheme();
  const {
    getDaySummary,
    feedings,
    nursingSessions,
    solidsSessions,
    sleepSessions,
    activeSleep,
    trackerBootstrapReady,
    trackerSnapshot,
    kidSettings,
    diaperChanges,
    refresh,
  } = useData();
  const preferredVolumeUnit = kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const spinnerRotation = useSharedValue(0);

  // Web HorizontalCalendar.js:199-201 — refresh greeting every 60s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = useMemo(() => formatDateLabel(now), [now]);
  const greeting = useMemo(() => getGreeting(now), [now]);
  const liveSummary = useMemo(() => getDaySummary(now), [getDaySummary, now]);
  const todayKey = useMemo(() => toLocalDateKey(now), [now]);
  const snapshotSummary = useMemo(() => {
    if (!trackerSnapshot?.summary) return null;
    if (!isSnapshotForToday(trackerSnapshot, todayKey)) return null;
    return trackerSnapshot.summary;
  }, [trackerSnapshot, todayKey]);
  const summary = trackerBootstrapReady ? liveSummary : snapshotSummary;
  const visibilitySafe = useMemo(
    () => normalizeActivityVisibility(activityVisibility),
    [activityVisibility]
  );
  const orderSafe = useMemo(
    () => normalizeActivityOrder(activityOrder),
    [activityOrder]
  );
  const allowSleepCard = !!visibilitySafe.sleep;
  const snapshotActiveSleep = useMemo(() => {
    if (!trackerSnapshot?.activeSleep?.startTime) return null;
    if (!isSnapshotForToday(trackerSnapshot, todayKey)) return null;
    return trackerSnapshot.activeSleep;
  }, [trackerSnapshot, todayKey]);
  const activeSleepForUi = allowSleepCard ? (activeSleep || snapshotActiveSleep) : null;
  const nowMs = now.getTime();
  const todayStartMs = useMemo(() => startOfDayMsLocal(nowMs), [nowMs]);
  const todayEndMs = useMemo(() => todayStartMs + 86400000, [todayStartMs]);
  const nowBucketIndex = useMemo(() => bucketIndexCeilFromMs(nowMs), [nowMs]);
  const avgByTime = useMemo(() => ({
    feed: buildFeedAvgBuckets(feedings, todayStartMs),
    nursing: buildNursingAvgBuckets(nursingSessions, todayStartMs),
    solids: buildSolidsAvgBuckets(solidsSessions, todayStartMs),
    sleep: buildSleepAvgBuckets(sleepSessions, todayStartMs),
  }), [feedings, nursingSessions, solidsSessions, sleepSessions, todayStartMs]);
  const feedAvgValue = avgByTime.feed?.buckets?.[nowBucketIndex];
  const nursingAvgValue = avgByTime.nursing?.buckets?.[nowBucketIndex];
  const solidsAvgValue = avgByTime.solids?.buckets?.[nowBucketIndex];
  const sleepAvgValue = avgByTime.sleep?.buckets?.[nowBucketIndex];
  const feedDaysUsed = avgByTime.feed?.daysUsed || 0;
  const nursingDaysUsed = avgByTime.nursing?.daysUsed || 0;
  const solidsDaysUsed = avgByTime.solids?.daysUsed || 0;
  const sleepDaysUsed = avgByTime.sleep?.daysUsed || 0;
  const todayFeedValue = useMemo(
    () => calcFeedCumulativeAtBucket(feedings, nowBucketIndex, todayStartMs, todayEndMs),
    [feedings, nowBucketIndex, todayStartMs, todayEndMs]
  );
  const todayNursingValue = useMemo(
    () => calcNursingCumulativeAtBucket(nursingSessions, nowBucketIndex, todayStartMs, todayEndMs),
    [nursingSessions, nowBucketIndex, todayStartMs, todayEndMs]
  );
  const todaySolidsValue = useMemo(
    () => calcSolidsCumulativeAtBucket(solidsSessions, nowBucketIndex, todayStartMs, todayEndMs),
    [solidsSessions, nowBucketIndex, todayStartMs, todayEndMs]
  );
  const todaySleepValue = useMemo(
    () => calcSleepCumulativeAtBucket(sleepSessions, nowBucketIndex, todayStartMs, activeSleepForUi, nowMs),
    [sleepSessions, nowBucketIndex, todayStartMs, activeSleepForUi, nowMs]
  );
  const feedComparison = useMemo(
    () => (Number.isFinite(feedAvgValue) && feedDaysUsed > 0
      ? { delta: todayFeedValue - feedAvgValue, unit: 'oz', evenEpsilon: TT_AVG_EVEN_EPSILON }
      : null),
    [feedAvgValue, feedDaysUsed, todayFeedValue]
  );
  const nursingComparison = useMemo(
    () => (Number.isFinite(nursingAvgValue) && nursingDaysUsed > 0
      ? { delta: todayNursingValue - nursingAvgValue, unit: 'hrs', evenEpsilon: TT_AVG_EVEN_EPSILON }
      : NURSING_NO_AVG_COMPARISON),
    [nursingAvgValue, nursingDaysUsed, todayNursingValue]
  );
  const sleepComparison = useMemo(
    () => (Number.isFinite(sleepAvgValue) && sleepDaysUsed > 0
      ? { delta: todaySleepValue - sleepAvgValue, unit: 'hrs', evenEpsilon: TT_AVG_EVEN_EPSILON }
      : null),
    [sleepAvgValue, sleepDaysUsed, todaySleepValue]
  );
  const solidsComparison = useMemo(
    () => (Number.isFinite(solidsAvgValue) && solidsDaysUsed > 0
      ? { delta: todaySolidsValue - solidsAvgValue, unit: 'foods', evenEpsilon: TT_AVG_EVEN_EPSILON }
      : null),
    [solidsAvgValue, solidsDaysUsed, todaySolidsValue]
  );
  const todayDiaperTimelineItems = useMemo(() => {
    if (!Array.isArray(diaperChanges) || diaperChanges.length === 0) return [];
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const startMs = start.getTime();
    const endMs = end.getTime();
    return diaperChanges.filter((item) => {
      const ts = Number(item?.timestamp || item?.startTime || 0);
      return ts >= startMs && ts <= endMs;
    });
  }, [diaperChanges, now]);

  const renderCardByKey = useMemo(() => {
    if (!summary) return {};
    return {
    bottle: (
      <BottleCard
        key="bottle"
        onPress={() => onCardTap?.('feed')}
        totalOz={summary.feedOz}
        volumeUnit={preferredVolumeUnit}
        lastEntryTime={summary.lastBottleTime}
        comparison={feedComparison}
      />
    ),
    nursing: (
      <NursingCard
        key="nursing"
        onPress={() => onCardTap?.('feed')}
        totalMs={summary.nursingMs}
        lastEntryTime={summary.lastNursingTime}
        comparison={nursingComparison}
      />
    ),
    solids: (
      <SolidsCard
        key="solids"
        onPress={() => onCardTap?.('feed')}
        totalFoods={summary.solidsCount}
        lastEntryTime={summary.lastSolidsTime}
        comparison={solidsComparison}
      />
    ),
    sleep: (
      <SleepCard
        key="sleep"
        onPress={() => onCardTap?.('sleep')}
        totalHours={Math.round((summary.sleepMs / 3600000) * 10) / 10}
        lastSleepEndTime={summary.lastSleepTime}
        isActive={!!activeSleepForUi}
        comparison={sleepComparison}
      />
    ),
    diaper: (
      <DiaperCard
        key="diaper"
        onPress={() => onCardTap?.('diaper')}
        totalChanges={summary.diaperCount}
        lastEntryTime={summary.lastDiaperTime}
        timelineItems={todayDiaperTimelineItems}
      />
    ),
  };
  }, [
    onCardTap,
    summary?.feedOz,
    feedComparison,
    summary?.lastBottleTime,
    summary?.nursingMs,
    summary?.lastNursingTime,
    nursingComparison,
    summary?.solidsCount,
    summary?.lastSolidsTime,
    solidsComparison,
    summary?.sleepMs,
    summary?.lastSleepTime,
    sleepComparison,
    activeSleepForUi,
    summary?.diaperCount,
    summary?.lastDiaperTime,
    todayDiaperTimelineItems,
  ]);

  const orderedVisibleCards = useMemo(
    () => orderSafe
      .filter((key) => visibilitySafe[key])
      .map((key) => ({ key, element: renderCardByKey[key] }))
      .filter((item) => Boolean(item.element)),
    [orderSafe, visibilitySafe, renderCardByKey]
  );
  const nextUpSleepStart = activeSleepForUi?.startTime || null;
  const showNextUp = Boolean(allowSleepCard && activeSleepForUi?.startTime);
  const CARD_BASE_DELAY_MS = 130;
  const CARD_STAGGER_MS = 75;
  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const refreshStartedAt = Date.now();
    try {
      await refresh?.();
    } finally {
      const elapsedMs = Date.now() - refreshStartedAt;
      const remainingMs = PTR_MIN_VISIBLE_MS - elapsedMs;
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
      }
      setRefreshing(false);
    }
  }, [refresh, refreshing]);
  useEffect(() => {
    if (refreshing) {
      spinnerRotation.value = 0;
      spinnerRotation.value = withRepeat(
        withTiming(360, { duration: 850, easing: Easing.linear }),
        -1,
        false
      );
      return;
    }
    cancelAnimation(spinnerRotation);
    spinnerRotation.value = 0;
  }, [refreshing, spinnerRotation]);
  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotation.value}deg` }],
  }));

  return (
    <View style={styles.root}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.appBg }]}
        contentContainerStyle={styles.content}
        alwaysBounceVertical
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            title="Refreshing..."
            titleColor={colors.textSecondary}
            progressViewOffset={Platform.OS === 'ios' ? PTR_IOS_OFFSET : 0}
          />
        )}
      >
      {/* ── Greeting header (web HorizontalCalendar.js v4 header, lines 424-474) ── */}
      {/* Web: header.mb-1, display flex, alignItems flex-end, justifyContent space-between */}
      <Animated.View
        key={`greeting-${entranceToken}`}
        style={styles.greetingHeader}
        entering={FadeInDown.duration(220).delay(0)}
      >
        <View>
          {/* Web: text-[15.4px] font-normal, color var(--tt-text-secondary) */}
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
            {dateLabel}
          </Text>
          {/* Web: text-[24px] font-semibold, color var(--tt-text-primary), marginBottom 0 */}
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {greeting}
          </Text>
        </View>

        {/* Web TrackerTab.js:1977-1988 — gearButton: w-10 h-10 rounded-xl border */}
        {/* bg var(--tt-seg-track), border var(--tt-card-border) which is transparent */}
        <Pressable
          style={({ pressed }) => [
            styles.gearButton,
            { backgroundColor: colors.segTrack || colors.track, borderColor: colors.cardBorder },
            pressed && styles.gearButtonPressed,
          ]}
          onPress={() => onRequestToggleActivitySheet?.()}
        >
          <SettingsIcon size={26} color={colors.textPrimary} />
        </Pressable>
      </Animated.View>

      {/* What's Next Card - mirror web behavior: only while sleep is active */}
      {showNextUp ? (
        <Animated.View
          key={`nextup-${entranceToken}`}
          entering={FadeInDown.duration(220).delay(CARD_BASE_DELAY_MS)}
        >
          <ActiveSleepCard
            sleepStartTime={nextUpSleepStart}
            onWakeUp={() => onOpenSheet?.('sleep')}
          />
        </Animated.View>
      ) : null}

        {/* ── Tracker cards ── */}
        {orderedVisibleCards.map((card, index) => {
          const sequenceIndex = showNextUp ? index + 1 : index;
          return (
            <Animated.View
              key={`${card.key}-${entranceToken}`}
              entering={FadeInDown
                .duration(220)
                .delay(CARD_BASE_DELAY_MS + sequenceIndex * CARD_STAGGER_MS)}
            >
              {card.element}
            </Animated.View>
          );
        })}
      </ScrollView>
      {refreshing ? (
        <View style={styles.spinnerOverlay} pointerEvents="none">
          <Animated.View style={spinnerStyle}>
            <SpinnerIcon size={24} color={colors.brandIcon} />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Web content area: px-4 pb-5, appBg from theme
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16, // px-4
    paddingBottom: 20,     // pb-5
    paddingTop: 4,
    gap: 12,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  // Web HorizontalCalendar.js:424-428 — header mb-1, flex, align flex-end, justify space-between
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,       // mb-1
  },
  // Web: text-[15.4px] font-normal, color var(--tt-text-secondary)
  dateLabel: {
    fontSize: 15.4,
    fontWeight: '400',     // font-normal
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
  },
  // Web: text-[24px] font-semibold, color var(--tt-text-primary), marginBottom 0
  greeting: {
    fontSize: 24,
    fontWeight: '600',     // font-semibold
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
  },
  // Web TrackerTab.js:1977-1988 — w-10 h-10 rounded-xl border, active:scale-95
  gearButton: {
    width: 40,             // w-10
    height: 40,            // h-10
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,      // rounded-xl
    borderWidth: 1,        // border
  },
  gearButtonPressed: {
    transform: [{ scale: 0.95 }],  // active:scale-95
  },
});
