import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SettingsIcon } from '../components/icons';
import BottleCard from '../components/cards/BottleCard';
import NursingCard from '../components/cards/NursingCard';
import SolidsCard from '../components/cards/SolidsCard';
import SleepCard from '../components/cards/SleepCard';
import DiaperCard from '../components/cards/DiaperCard';

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

export default function TrackerScreen({ onOpenSheet }) {
  const { colors } = useTheme();
  const [now, setNow] = useState(new Date());

  // Web HorizontalCalendar.js:199-201 — refresh greeting every 60s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = useMemo(() => formatDateLabel(now), [now]);
  const greeting = useMemo(() => getGreeting(now), [now]);

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
          onPress={() => console.log('Gear pressed')}
        >
          <SettingsIcon size={26} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* ── Tracker cards ── */}
      <BottleCard onPress={() => onOpenSheet?.('bottle')} />
      <NursingCard onPress={() => onOpenSheet?.('nursing')} />
      <SolidsCard onPress={() => onOpenSheet?.('solids')} />
      <SleepCard onPress={() => onOpenSheet?.('sleep')} />
      <DiaperCard onPress={() => onOpenSheet?.('diaper')} />
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
