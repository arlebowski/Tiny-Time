import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SettingsIcon } from '../components/icons';
import BottleCard from '../components/cards/BottleCard';
import NursingCard from '../components/cards/NursingCard';
import SolidsCard from '../components/cards/SolidsCard';
import SleepCard from '../components/cards/SleepCard';
import DiaperCard from '../components/cards/DiaperCard';
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

export default function TrackerScreen({
  onOpenSheet,
  onCardTap,
  onRequestToggleActivitySheet,
  activityVisibility,
  activityOrder,
}) {
  const { colors } = useTheme();
  const { getDaySummary, activeSleep } = useData();
  const [now, setNow] = useState(new Date());

  // Web HorizontalCalendar.js:199-201 — refresh greeting every 60s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = useMemo(() => formatDateLabel(now), [now]);
  const greeting = useMemo(() => getGreeting(now), [now]);
  const summary = useMemo(() => getDaySummary(now), [getDaySummary, now]);
  const visibilitySafe = useMemo(
    () => normalizeActivityVisibility(activityVisibility),
    [activityVisibility]
  );
  const orderSafe = useMemo(
    () => normalizeActivityOrder(activityOrder),
    [activityOrder]
  );

  const renderCardByKey = useMemo(() => ({
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
        isActive={!!activeSleep}
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
  }), [
    onCardTap,
    summary.feedOz,
    summary.lastBottleTime,
    summary.nursingMs,
    summary.lastNursingTime,
    summary.solidsCount,
    summary.lastSolidsTime,
    summary.sleepMs,
    summary.lastSleepTime,
    activeSleep,
    summary.diaperCount,
    summary.lastDiaperTime,
  ]);

  const orderedVisibleCards = useMemo(
    () => orderSafe.filter((key) => visibilitySafe[key]).map((key) => renderCardByKey[key]).filter(Boolean),
    [orderSafe, visibilitySafe, renderCardByKey]
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.appBg }]}
      contentContainerStyle={styles.content}
    >
      {/* ── Greeting header (web HorizontalCalendar.js v4 header, lines 424-474) ── */}
      {/* Web: header.mb-1, display flex, alignItems flex-end, justifyContent space-between */}
      <View style={styles.greetingHeader}>
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
      </View>

      {/* ── Tracker cards ── */}
      {orderedVisibleCards}
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
