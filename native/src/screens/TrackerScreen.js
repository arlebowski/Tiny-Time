import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import BottleCard from '../components/cards/BottleCard';
import NursingCard from '../components/cards/NursingCard';
import SolidsCard from '../components/cards/SolidsCard';
import SleepCard from '../components/cards/SleepCard';
import DiaperCard from '../components/cards/DiaperCard';

// ── GearIcon SVG (web TrackerTab.js:1963-1976) ──
// Outline weight (default state, isActivitySheetOpen = false)
const GearIconOutline = ({ size = 26, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
  </Svg>
);

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

export default function TrackerScreen() {
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
      style={styles.scroll}
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
        {/* bg var(--tt-seg-track), border var(--tt-card-border), color var(--tt-text-primary) */}
        <Pressable
          style={({ pressed }) => [
            styles.gearButton,
            { backgroundColor: colors.track, borderColor: colors.borderSubtle },
            pressed && styles.gearButtonPressed,
          ]}
          onPress={() => console.log('Gear pressed')}
        >
          <GearIconOutline size={26} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* ── Tracker cards ── */}
      <BottleCard onPress={() => console.log('Bottle card tapped')} />
      <NursingCard onPress={() => console.log('Nursing card tapped')} />
      <SolidsCard onPress={() => console.log('Solids card tapped')} />
      <SleepCard onPress={() => console.log('Sleep card tapped')} />
      <DiaperCard onPress={() => console.log('Diaper card tapped')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Web content area: px-4 pb-5 on appBg (#FAF6EB)
  scroll: {
    flex: 1,
    backgroundColor: '#FAF6EB',
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
