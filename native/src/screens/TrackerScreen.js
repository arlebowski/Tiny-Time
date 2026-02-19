import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SettingsIcon } from '../components/icons';
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

export default function TrackerScreen({
  onOpenSheet,
  onCardTap,
  onRequestToggleActivitySheet,
  activityVisibility,
  activityOrder,
}) {
  const { colors } = useTheme();
  const { getDaySummary, activeSleep, trackerBootstrapReady, trackerSnapshot } = useData();
  const [now, setNow] = useState(new Date());

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

  const renderCardByKey = useMemo(() => {
    if (!summary) return {};
    return {
    bottle: (
      <BottleCard
        key="bottle"
        onPress={() => onCardTap?.('feed')}
        totalOz={summary.feedOz}
        lastEntryTime={summary.lastBottleTime}
      />
    ),
    nursing: (
      <NursingCard
        key="nursing"
        onPress={() => onCardTap?.('feed')}
        totalMs={summary.nursingMs}
        lastEntryTime={summary.lastNursingTime}
      />
    ),
    solids: (
      <SolidsCard
        key="solids"
        onPress={() => onCardTap?.('feed')}
        totalFoods={summary.solidsCount}
        lastEntryTime={summary.lastSolidsTime}
      />
    ),
    sleep: (
      <SleepCard
        key="sleep"
        onPress={() => onCardTap?.('sleep')}
        totalHours={Math.round((summary.sleepMs / 3600000) * 10) / 10}
        lastSleepEndTime={summary.lastSleepTime}
        isActive={!!activeSleepForUi}
      />
    ),
    diaper: (
      <DiaperCard
        key="diaper"
        onPress={() => onCardTap?.('diaper')}
        totalChanges={summary.diaperCount}
        lastEntryTime={summary.lastDiaperTime}
      />
    ),
  };
  }, [
    onCardTap,
    summary?.feedOz,
    summary?.lastBottleTime,
    summary?.nursingMs,
    summary?.lastNursingTime,
    summary?.solidsCount,
    summary?.lastSolidsTime,
    summary?.sleepMs,
    summary?.lastSleepTime,
    activeSleepForUi,
    summary?.diaperCount,
    summary?.lastDiaperTime,
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

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.appBg }]}
      contentContainerStyle={styles.content}
    >
      {/* ── Greeting header (web HorizontalCalendar.js v4 header, lines 424-474) ── */}
      {/* Web: header.mb-1, display flex, alignItems flex-end, justifyContent space-between */}
      <Animated.View
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
        <Animated.View entering={FadeInDown.duration(220).delay(CARD_BASE_DELAY_MS)}>
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
            key={card.key}
            entering={FadeInDown
              .duration(220)
              .delay(CARD_BASE_DELAY_MS + sequenceIndex * CARD_STAGGER_MS)}
          >
            {card.element}
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
