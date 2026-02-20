/**
 * HorizontalCalendar — 1:1 port from web/components/shared/HorizontalCalendarCompact.js
 * Weekly calendar strip with swipeable weeks and animated selection pill.
 */
import React, { useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
  LinearTransition,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

// Separate springs keep motion snappy while avoiding size overshoot deformation.
const PILL_POSITION_SPRING = {
  stiffness: 900,
  damping: 70,
  mass: 0.45,
  overshootClamping: true,
};
const PILL_SIZE_SPRING = {
  stiffness: 800,
  damping: 75,
  mass: 0.5,
  overshootClamping: true,
};

// Web itemVariants: hidden { opacity: 0, scale: 0.5, y: 20 } → show with staggerChildren: 0.08
const DATE_ENTER_SPRING = { stiffness: 420, damping: 48, mass: 0.8 };
const STAGGER_MS = 55;
const INITIAL_PILL_REVEAL_MS = STAGGER_MS * 6 + 220;

const createDateEntering = (index) => {
  const delay = index * STAGGER_MS;
  return () => {
    'worklet';
    return {
      initialValues: {
        opacity: 0,
        transform: [{ scale: 0.94 }, { translateY: 8 }],
      },
      animations: {
        opacity: withDelay(delay, withSpring(1, DATE_ENTER_SPRING)),
        transform: [
          { scale: withDelay(delay, withSpring(1, DATE_ENTER_SPRING)) },
          { translateY: withDelay(delay, withSpring(0, DATE_ENTER_SPRING)) },
        ],
      },
    };
  };
};

// Layout transition when selection changes: selected expands, others compact

const DATE_LAYOUT = LinearTransition.springify()
  .damping(62)
  .stiffness(520)
  .mass(0.7);

// ── Date helpers (web HorizontalCalendarCompact.js:24-47) ──

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const subDays = (date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const formatMonthYear = (date) =>
  `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export default function HorizontalCalendar({
  initialDate = new Date(),
  onDateSelect,
  headerLeft = null,
}) {
  const { colors } = useTheme();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(initialDate || new Date())
  );
  const [weeksOffset, setWeeksOffset] = useState(0);

  // Pill animation shared values (same pattern as SegmentedToggle)
  const optionLayouts = useRef({});
  const [pillReady, setPillReady] = useState(false);
  const pillInitialized = useRef(false);
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillHeight = useSharedValue(0);
  const pillY = useSharedValue(0);

  // Set pill position — immediate on first layout, spring on subsequent
  const setPillPosition = useCallback(
    (layout, animate) => {
      if (animate) {
        pillX.value = withSpring(layout.x, PILL_POSITION_SPRING);
        pillY.value = withSpring(layout.y, PILL_POSITION_SPRING);
        pillWidth.value = withSpring(layout.width, PILL_SIZE_SPRING);
        pillHeight.value = withSpring(layout.height, PILL_SIZE_SPRING);
      } else {
        pillX.value = layout.x;
        pillY.value = layout.y;
        pillWidth.value = layout.width;
        pillHeight.value = layout.height;
      }
    },
    [pillX, pillY, pillWidth, pillHeight]
  );

  // Keep pill hidden until the initial date stagger-in animation completes.
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPillReady(true);
    }, INITIAL_PILL_REVEAL_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  // Compute 7 days for the current week view
  const days = useMemo(() => {
    const endDate = subDays(today, weeksOffset * 7);
    return Array.from({ length: 7 }, (_, i) => subDays(endDate, 6 - i));
  }, [today, weeksOffset]);

  const monthKey = useMemo(() => formatMonthYear(days[6]), [days]);

  // Auto-select rightmost day on week change
  React.useEffect(() => {
    if (days.length > 0) {
      const rightmost = days[6];
      setSelectedDate(rightmost);
      if (typeof onDateSelect === 'function') {
        onDateSelect({ date: rightmost, feedOz: 0, sleepMs: 0, diaperCount: 0, feedPct: 0, sleepPct: 0 });
      }
    }
  }, [weeksOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update pill position when selected date changes
  const updatePill = useCallback(
    (dateKey) => {
      const layout = optionLayouts.current[dateKey];
      if (!layout) return;
      setPillPosition(layout, pillInitialized.current);
      pillInitialized.current = true;
    },
    [setPillPosition]
  );

  useLayoutEffect(() => {
    updatePill(selectedDate.toISOString());
  }, [selectedDate, updatePill]);

  const handleDayLayout = useCallback(
    (date, event) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      optionLayouts.current[date.toISOString()] = { x, y, width, height };
      if (isSameDay(date, selectedDate)) {
        const shouldAnimate = pillInitialized.current;
        setPillPosition({ x, y, width, height }, shouldAnimate);
        pillInitialized.current = true;
      }
    },
    [selectedDate, setPillPosition]
  );

  const handleDayPress = useCallback(
    (date) => {
      setSelectedDate(date);
      updatePill(date.toISOString());
      if (typeof onDateSelect === 'function') {
        onDateSelect({ date, feedOz: 0, sleepMs: 0, diaperCount: 0, feedPct: 0, sleepPct: 0 });
      }
    },
    [onDateSelect, updatePill]
  );

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    transform: [{ translateX: pillX.value }, { translateY: pillY.value }],
    width: pillWidth.value,
    height: pillHeight.value,
    borderRadius: 12,
    backgroundColor: colors.selectedSurface ?? colors.segTrack,
  }));

  // Swipe gesture for week navigation
  const paginate = useCallback(
    (direction) => {
      // direction: 1 = go back in time, -1 = go forward
      if (direction === -1 && weeksOffset === 0) return;
      setWeeksOffset((prev) => prev + direction);
    },
    [weeksOffset]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((event) => {
      if (event.translationX > 30) {
        paginate(1); // swipe right → go back in time
      } else if (event.translationX < -30) {
        paginate(-1); // swipe left → go forward
      }
    })
    .runOnJS(true);

  return (
    <View style={styles.container}>
      {/* Header: headerLeft | month label | spacer */}
      <View
        style={[
          styles.header,
          headerLeft
            ? styles.headerThreeCol
            : styles.headerTwoCol,
        ]}
      >
        {headerLeft ? (
          <View style={styles.headerLeftSlot}>{headerLeft}</View>
        ) : null}
        <Animated.Text
          entering={FadeIn.duration(200)}
          style={[
            styles.monthLabel,
            { color: colors.textPrimary },
            headerLeft && styles.monthLabelCenter,
          ]}
        >
          {monthKey}
        </Animated.Text>
        {headerLeft ? <View style={styles.headerSpacer} /> : null}
      </View>

      {/* Day cells */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.daysRow}>
          {/* Selection pill */}
          {pillReady && (
            <Animated.View style={pillAnimatedStyle} pointerEvents="none" />
          )}

          {days.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <Animated.View
                key={date.toISOString()}
                entering={createDateEntering(index)}
                layout={DATE_LAYOUT}
                onLayout={(e) => handleDayLayout(date, e)}
                style={[
                  styles.dayCellWrapper,
                  { flex: isSelected ? 1.3 : 0.9 },
                ]}
              >
                <Pressable
                  onPress={() => handleDayPress(date)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                  ]}
                  accessibilityLabel={`${WEEKDAYS[date.getDay()]} ${date.getDate()}`}
                >
                  <Text
                    style={[
                      styles.dayName,
                      {
                        color: isSelected
                          ? colors.textPrimary
                          : colors.textTertiary,
                      },
                    ]}
                  >
                    {WEEKDAYS[date.getDay()]}
                  </Text>
                  <Text
                    style={[
                      isSelected ? styles.dayNumberSelected : styles.dayNumber,
                      {
                        color: isSelected
                          ? colors.textPrimary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  // Header variants
  header: {
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  headerThreeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTwoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftSlot: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerSpacer: {
    flex: 1,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  monthLabelCenter: {
    textAlign: 'center',
  },
  // Day cells row
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
  },
  dayCellWrapper: {
    minWidth: 0,
  },
  dayCell: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    zIndex: 10,
    paddingVertical: 6,
  },
  dayCellSelected: {
    paddingHorizontal: 8,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 14,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  dayNumberSelected: {
    fontSize: 17.6,
    fontWeight: '700',
    lineHeight: 18,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
