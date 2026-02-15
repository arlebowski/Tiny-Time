// ========================================
// WHEEL PICKERS — Premium iOS-style picker
// Reanimated + Gesture Handler for native-thread 60fps, spring physics, haptics
// ========================================

import React, { useState, useRef, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Premium spring: responsive, slight overshoot for tactile feel
const SNAP_SPRING = { damping: 22, stiffness: 280, mass: 0.8 };

// Context so WheelPicker overlay uses the exact tray background (avoids theme/portal mismatches)
const PickerTrayBgContext = createContext(null);

// expo-linear-gradient treats 'transparent' as rgba(0,0,0,0) which tints dark. Use same color at 0 alpha.
function hexToTransparentRgba(hex) {
  const h = (hex || '#FFFFFF').replace('#', '').slice(0, 6);
  if (h.length !== 6) return 'rgba(255,255,255,0)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 'rgba(255,255,255,0)';
  return `rgba(${r},${g},${b},0)`;
}

const ITEM_HEIGHT = 40;

// Helper to generate date options (7 days back from today)
const generateDateOptions = () => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysBack = 7;
  for (let i = daysBack; i > 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString());
  }
  dates.push(today.toISOString());
  return dates;
};

const formatDateDisplay = (isoString) => {
  const date = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dateOnly - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  return `${dayName} ${day}`;
};

export const wheelStyles = {
  section: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    margin: 0,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    height: 20,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    maxWidth: 260,
    height: 200,
    overflow: 'hidden',
  },
  pickerCompact: { width: 50, height: 180 },
  pickerDateCompact: { width: 65, height: 180 },
  selection: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 40,
    marginTop: -20,
    borderRadius: 8,
    zIndex: 1,
  },
};

const overlayBase = {
  position: 'absolute',
  left: 0,
  right: 0,
  pointerEvents: 'none',
  zIndex: 3,
};

// WheelPickerItem — per-item animated scale/opacity from offset (runs on UI thread)
function WheelPickerItem({ option, index, offsetY, itemHeight, dateCompact, textColor }) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const offset = offsetY.value;
    const distancePx = Math.abs(offset + index * itemHeight);
    const distance = distancePx / itemHeight;
    const scale = Math.max(0.88, 1 - distance * 0.06);
    const opacity = Math.max(0.4, 1 - distance * 0.25);
    return {
      transform: [{ scale }],
      opacity,
    };
  });
  return (
    <Animated.View style={[styles.item, { height: itemHeight }, animatedStyle]}>
      <Text
        style={[
          styles.itemText,
          { color: textColor },
          dateCompact && { fontSize: 16 },
        ]}
      >
        {option.display}
      </Text>
    </Animated.View>
  );
}

// WheelPicker — core wheel component (Reanimated + Gesture Handler)
export function WheelPicker({
  type = 'number',
  value,
  onChange,
  min = 0,
  max = 32,
  step = 0.25,
  label = '',
  unit = 'oz',
  compact = false,
  showSelection = true,
  dateCompact = false,
  showOverlay = true,
  containerStyle = null,
  overlayColor = null,
}) {
  const { colors } = useTheme();
  const trayBgFromContext = useContext(PickerTrayBgContext);
  const offsetY = useSharedValue(0);
  const gestureStartOffset = useSharedValue(0);
  const prevUnitRef = useRef(unit);

  const generateOptions = useCallback(() => {
    if (type === 'date') {
      const dates = generateDateOptions();
      return dates.map((date) => ({ display: formatDateDisplay(date), value: date }));
    }
    if (type === 'hour') {
      return Array.from({ length: 12 }, (_, i) => ({ display: (i + 1).toString(), value: i + 1 }));
    }
    if (type === 'minute') {
      return Array.from({ length: 60 }, (_, i) => ({
        display: i.toString().padStart(2, '0'),
        value: i,
      }));
    }
    if (type === 'ampm') {
      return [
        { display: 'AM', value: 'AM' },
        { display: 'PM', value: 'PM' },
      ];
    }
    if (type === 'month') {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return monthNames.map((name, i) => ({ display: name, value: i + 1 }));
    }
    if (type === 'day') {
      return Array.from({ length: 31 }, (_, i) => ({ display: (i + 1).toString(), value: i + 1 }));
    }
    if (type === 'year') {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 11 }, (_, i) => ({
        display: (currentYear - 5 + i).toString(),
        value: currentYear - 5 + i,
      }));
    }
    const options = [];
    for (let i = min; i <= max; i += step) {
      const displayValue = i % 1 === 0 ? i.toString() : i.toFixed(2);
      options.push({ display: `${displayValue} ${unit}`, value: i });
    }
    return options;
  }, [type, min, max, step, unit]);

  const shouldLoop = type === 'hour' || type === 'minute' || type === 'month';
  const baseOptions = useMemo(() => generateOptions(), [generateOptions]);
  const options = useMemo(() => {
    if (!shouldLoop) return baseOptions;
    return [...baseOptions, ...baseOptions, ...baseOptions];
  }, [baseOptions, shouldLoop]);
  const baseLength = baseOptions.length;

  const getBaseIndex = useCallback(() => {
    if (type === 'date' && value) {
      const valDate = new Date(value);
      valDate.setHours(0, 0, 0, 0);
      const valISO = valDate.toISOString();
      return baseOptions.findIndex((opt) => {
        const optDate = new Date(opt.value);
        optDate.setHours(0, 0, 0, 0);
        return optDate.toISOString() === valISO;
      });
    }
    if (type === 'date') return baseOptions.findIndex((opt) => opt.display === 'Today');
    return baseOptions.findIndex((opt) => opt.value === value);
  }, [type, value, baseOptions]);

  const pickerHeight = compact ? 180 : 200;
  const padY = Math.max(0, (pickerHeight - ITEM_HEIGHT) / 2);
  const maxOffset = 0;
  const minOffset = -(options.length - 1) * ITEM_HEIGHT;
  const cycleHeight = baseLength * ITEM_HEIGHT;
  const maxLoopOffset = -baseLength * ITEM_HEIGHT;
  const minLoopOffset = -(baseLength * 2 - 1) * ITEM_HEIGHT;

  const triggerHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, []);

  const notifySnap = useCallback(
    (pickerIndex, isLooping) => {
      triggerHaptic();
      if (isLooping) {
        const b = ((pickerIndex % baseLength) + baseLength) % baseLength;
        if (typeof onChange === 'function') onChange(baseOptions[b].value);
      } else {
        const idx = Math.max(0, Math.min(options.length - 1, pickerIndex));
        if (typeof onChange === 'function') onChange(options[idx].value);
      }
    },
    [baseLength, baseOptions, options, onChange, triggerHaptic]
  );

  useEffect(() => {
    const idx = Math.max(0, getBaseIndex());
    const nextIndex = shouldLoop ? idx + baseLength : idx;
    prevUnitRef.current = unit;
    const snappedOffset = -nextIndex * ITEM_HEIGHT;
    offsetY.value = snappedOffset;
  }, [value, type, min, max, step, unit]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-20, 20])
        .onStart(() => {
          'worklet';
          gestureStartOffset.value = offsetY.value;
        })
        .onUpdate((e) => {
          'worklet';
          let newOffset = gestureStartOffset.value + e.translationY;
          if (shouldLoop) {
            if (newOffset > maxLoopOffset) newOffset -= cycleHeight;
            else if (newOffset < minLoopOffset) newOffset += cycleHeight;
          } else {
            if (newOffset > maxOffset) {
              newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
            } else if (newOffset < minOffset) {
              newOffset = minOffset + (newOffset - minOffset) * 0.3;
            }
          }
          offsetY.value = newOffset;
        })
        .onEnd((e) => {
          'worklet';
          const velocityFactor = 0.12;
          let finalOffset = offsetY.value + e.velocityY * velocityFactor;
          if (shouldLoop) {
            while (finalOffset > maxLoopOffset) finalOffset -= cycleHeight;
            while (finalOffset < minLoopOffset) finalOffset += cycleHeight;
            const index = Math.round(-finalOffset / ITEM_HEIGHT);
            let adjustedIndex = index;
            if (adjustedIndex < baseLength) adjustedIndex += baseLength;
            else if (adjustedIndex >= baseLength * 2) adjustedIndex -= baseLength;
            const snappedOffset = -adjustedIndex * ITEM_HEIGHT;
            offsetY.value = withSpring(snappedOffset, SNAP_SPRING);
            runOnJS(notifySnap)(adjustedIndex, true);
          } else {
            finalOffset = Math.max(minOffset, Math.min(maxOffset, finalOffset));
            const index = Math.round(-finalOffset / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(options.length - 1, index));
            const snappedOffset = -clampedIndex * ITEM_HEIGHT;
            offsetY.value = withSpring(snappedOffset, SNAP_SPRING);
            runOnJS(notifySnap)(clampedIndex, false);
          }
        }),
    [
      shouldLoop,
      baseLength,
      options.length,
      notifySnap,
      offsetY,
      gestureStartOffset,
    ]
  );

  const listAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
  }));

  return (
    <View style={wheelStyles.pickerContainer}>
      {label ? (
        <Text style={[wheelStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <GestureDetector gesture={panGesture}>
        <View
          style={[
            wheelStyles.picker,
            compact && (dateCompact ? wheelStyles.pickerDateCompact : wheelStyles.pickerCompact),
            containerStyle,
            { height: pickerHeight },
          ]}
          collapsable={false}
        >
          {showSelection && (
            <View
              style={[
                wheelStyles.selection,
                { backgroundColor: colors.wheelpickerBar || colors.subtle },
              ]}
            />
          )}
        {showOverlay && padY > 0 && (() => {
          const overlayBg = overlayColor ?? trayBgFromContext ?? colors.halfsheetBg ?? colors.cardBg;
          const transparentEnd = hexToTransparentRgba(overlayBg);
          return (
            <>
              <LinearGradient
                colors={[overlayBg, overlayBg, transparentEnd]}
                locations={[0, 0.35, 1]}
                style={[styles.overlayTop, { height: padY }]}
                pointerEvents="none"
              />
              <LinearGradient
                colors={[transparentEnd, overlayBg, overlayBg]}
                locations={[0, 0.65, 1]}
                style={[styles.overlayBottom, { height: padY }]}
                pointerEvents="none"
              />
            </>
          );
        })()}
          <Animated.View
            style={[
              styles.itemsWrap,
              { paddingVertical: padY },
              listAnimatedStyle,
            ]}
          >
            {options.map((option, index) => (
              <WheelPickerItem
                key={index}
                option={option}
                index={index}
                offsetY={offsetY}
                itemHeight={ITEM_HEIGHT}
                dateCompact={dateCompact}
                textColor={colors.textPrimary}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

// AmountPickerLabSection
export function AmountPickerLabSection({ unit, setUnit, amount, setAmount }) {
  const { colors } = useTheme();
  const snapToStep = (val, step) => {
    const n = Number(val) || 0;
    const s = Number(step) || 1;
    const snapped = Math.round(n / s) * s;
    return s < 1 ? parseFloat(snapped.toFixed(2)) : snapped;
  };
  const getAmountRange = () =>
    unit === 'oz' ? { min: 0, max: 12, step: 0.25 } : { min: 0, max: 360, step: 10 };
  const range = getAmountRange();

  return (
    <View style={[wheelStyles.section, { paddingTop: 0, marginTop: -12 }]}>
      <WheelPicker
        type="number"
        value={amount}
        onChange={setAmount}
        min={range.min}
        max={range.max}
        step={range.step}
        unit={unit}
      />
    </View>
  );
}

// DatePickerSection
export function DatePickerSection({
  value,
  onChange,
  title = 'Date',
  showHeader = true,
  contentStyle = null,
}) {
  const { colors } = useTheme();
  const initialDate = (() => {
    if (!value) return new Date();
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return new Date();
      return d;
    } catch {
      return new Date();
    }
  })();

  const [month, setMonth] = useState(initialDate.getMonth() + 1);
  const [day, setDay] = useState(initialDate.getDate());
  const [year, setYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (!value) return;
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return;
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
      setYear(d.getFullYear());
    } catch {}
  }, [value]);

  const emitChange = (nextMonth, nextDay, nextYear) => {
    const nextDate = new Date(nextYear, nextMonth - 1, nextDay, 0, 0, 0, 0);
    if (typeof onChange === 'function') onChange(nextDate.toISOString());
  };

  const { width } = Dimensions.get('window');
  const colWidth = Math.min(110, width * 0.34);
  const dayWidth = Math.min(48, width * 0.12);
  const yearWidth = Math.min(70, width * 0.18);

  return (
    <View style={wheelStyles.section}>
      {showHeader && (
        <View style={wheelStyles.sectionHeader}>
          <Text style={[wheelStyles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
      )}
      <View style={[styles.dateRow, contentStyle]}>
        <View style={{ width: colWidth }}>
          <WheelPicker
            type="month"
            value={month}
            onChange={(val) => {
              setMonth(val);
              emitChange(val, day, year);
            }}
            compact
            showSelection={false}
            dateCompact
            containerStyle={{ width: '100%' }}
          />
        </View>
        <WheelPicker
          type="day"
          value={day}
          onChange={(val) => {
            setDay(val);
            emitChange(month, val, year);
          }}
          compact
          dateCompact
          showSelection={false}
          containerStyle={{ width: dayWidth }}
        />
        <WheelPicker
          type="year"
          value={year}
          onChange={(val) => {
            setYear(val);
            emitChange(month, day, val);
          }}
          compact
          dateCompact
          showSelection={false}
          containerStyle={{ width: yearWidth }}
        />
      </View>
    </View>
  );
}

// TimePickerSection
export function TimePickerSection({
  value,
  onChange,
  title = 'Time',
  showHeader = true,
  contentStyle = null,
}) {
  const { colors } = useTheme();
  const initialDate = (() => {
    if (!value) return new Date();
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return new Date();
      return d;
    } catch {
      return new Date();
    }
  })();

  const initialHour24 = initialDate.getHours();
  const initialMinute = initialDate.getMinutes();
  const initialAmpm = initialHour24 >= 12 ? 'PM' : 'AM';
  const initialHour = (() => {
    const h = initialHour24 % 12;
    return h === 0 ? 12 : h;
  })();

  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [ampm, setAmpm] = useState(initialAmpm);

  useEffect(() => {
    if (!value) return;
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return;
      const hour24 = d.getHours();
      const nextAmpm = hour24 >= 12 ? 'PM' : 'AM';
      const nextHour = (() => {
        const h = hour24 % 12;
        return h === 0 ? 12 : h;
      })();
      setHour(nextHour);
      setMinute(d.getMinutes());
      setAmpm(nextAmpm);
    } catch {}
  }, [value]);

  const emitChange = (nextHour, nextMinute, nextAmpm) => {
    const base = value ? new Date(value) : new Date();
    let hour24 = Number(nextHour) % 12;
    if (nextAmpm === 'PM') hour24 += 12;
    base.setHours(hour24, Number(nextMinute) || 0, 0, 0);
    if (typeof onChange === 'function') onChange(base.toISOString());
  };

  return (
    <View style={wheelStyles.section}>
      {showHeader && (
        <View style={wheelStyles.sectionHeader}>
          <Text style={[wheelStyles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
      )}
      <View style={[wheelStyles.timePicker, { marginTop: 0 }, contentStyle]}>
        <WheelPicker
          type="hour"
          value={hour}
          onChange={(val) => {
            setHour(val);
            emitChange(val, minute, ampm);
          }}
          compact
          showSelection={false}
        />
        <Text style={[wheelStyles.timeColon, { color: colors.textPrimary, marginTop: -2 }]}>:</Text>
        <WheelPicker
          type="minute"
          value={minute}
          onChange={(val) => {
            setMinute(val);
            emitChange(hour, val, ampm);
          }}
          compact
          showSelection={false}
        />
        <WheelPicker
          type="ampm"
          value={ampm}
          onChange={(val) => {
            setAmpm(val);
            emitChange(hour, minute, val);
          }}
          compact
          showSelection={false}
        />
      </View>
    </View>
  );
}

// TTPickerTray — Modal tray (opens OVER HalfSheet). Reanimated-driven animation for smooth 60fps.
export function TTPickerTray({
  children,
  isOpen = false,
  onClose = null,
  header = null,
  height = '44%',
  scrollEnabled = true,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const backdropOpacity = useSharedValue(0);
  const trayTranslateY = useSharedValue(9999);
  const [closing, setClosing] = useState(false);

  const { height: screenH } = Dimensions.get('window');
  const trayHeight =
    typeof height === 'number'
      ? height
      : (screenH * parseInt(String(height).replace('%', ''), 10)) / 100;

  const finishClose = useCallback(() => {
    if (typeof global !== 'undefined' && global.TT?.shared?.pickers) {
      global.TT.shared.pickers.isTrayOpen = false;
    }
    setClosing(false);
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (typeof global !== 'undefined') {
      global.TT = global.TT || {};
      global.TT.shared = global.TT.shared || {};
      global.TT.shared.pickers = global.TT.shared.pickers || {};
      global.TT.shared.pickers.isTrayOpen = isOpen;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      backdropOpacity.value = 0;
      trayTranslateY.value = trayHeight;
      backdropOpacity.value = withTiming(0.4, { duration: 220 });
      trayTranslateY.value = withSpring(0, SNAP_SPRING);
    } else if (!closing) {
      setClosing(true);
      backdropOpacity.value = withTiming(0, { duration: 180 });
      trayTranslateY.value = withSpring(trayHeight, { ...SNAP_SPRING, damping: 28 }, (finished) => {
        if (finished) runOnJS(finishClose)();
      });
    }
  }, [isOpen]);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    backdropOpacity.value = withTiming(0, { duration: 180 });
    trayTranslateY.value = withSpring(trayHeight, { ...SNAP_SPRING, damping: 28 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [closing, trayHeight, finishClose]);

  const onBackdropPress = useCallback(() => {
    if (!isOpen || closing) return;
    requestClose();
  }, [isOpen, closing, requestClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const trayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: trayTranslateY.value }],
  }));

  const trayBg = colors.halfsheetBg || colors.cardBg;
  const trayContent = (
    <PickerTrayBgContext.Provider value={trayBg}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, backdropStyle]} collapsable={false}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress} />
        </Animated.View>
        <Animated.View
          style={[
            styles.tray,
            {
              backgroundColor: trayBg,
              height: trayHeight,
              paddingBottom: insets.bottom,
            },
            trayStyle,
          ]}
        >
          {header && (
            <View style={[styles.trayHeader, { borderBottomColor: colors.cardBorder || colors.borderSubtle }]}>
              {typeof header === 'function' ? header(requestClose) : header}
            </View>
          )}
          <ScrollView
            style={styles.trayContent}
            contentContainerStyle={{ paddingTop: 22, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </PickerTrayBgContext.Provider>
  );

  const modalVisible = isOpen || closing;
  if (!modalVisible) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={onBackdropPress}
      statusBarTranslucent
    >
      {Platform.OS === 'ios' ? (
        <FullWindowOverlay>{trayContent}</FullWindowOverlay>
      ) : (
        trayContent
      )}
    </Modal>
  );
}

// DatePickerTray
export function DatePickerTray({
  isOpen = false,
  onClose = null,
  value,
  onChange,
  title = 'Date',
}) {
  const { colors, sleep } = useTheme();

  const header = (close) => (
    <View style={styles.trayHeaderGrid}>
      <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Cancel</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={[styles.headerDone, { color: sleep?.primary || colors.textPrimary }]}>Done</Text>
      </Pressable>
    </View>
  );

  return (
    <TTPickerTray isOpen={isOpen} onClose={onClose} header={header}>
      <View style={{ marginTop: -16 }}>
        <DatePickerSection value={value} onChange={onChange} title={title} showHeader={false} />
      </View>
    </TTPickerTray>
  );
}

// DateTimePickerTray — single-row combined date + time (Date | Hour | : | Minute | AM/PM)
export function DateTimePickerTray({
  isOpen = false,
  onClose = null,
  value,
  onChange,
  title = 'Date & Time',
}) {
  const { colors, bottle } = useTheme();
  const base = value ? new Date(value) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;

  const day = new Date(safeBase);
  day.setHours(0, 0, 0, 0);
  const initialDateISO = day.toISOString();
  const initialHour24 = safeBase.getHours();
  const initialMinute = safeBase.getMinutes();
  const initialAmpm = initialHour24 >= 12 ? 'PM' : 'AM';
  const initialHour = (() => {
    const h = initialHour24 % 12;
    return h === 0 ? 12 : h;
  })();

  const [dtDate, setDtDate] = useState(initialDateISO);
  const [dtHour, setDtHour] = useState(initialHour);
  const [dtMinute, setDtMinute] = useState(initialMinute);
  const [dtAmpm, setDtAmpm] = useState(initialAmpm);

  useEffect(() => {
    if (!value) return;
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return;
      const dayOnly = new Date(d);
      dayOnly.setHours(0, 0, 0, 0);
      setDtDate(dayOnly.toISOString());
      const h24 = d.getHours();
      setDtAmpm(h24 >= 12 ? 'PM' : 'AM');
      const h12 = (() => { const x = h24 % 12; return x === 0 ? 12 : x; })();
      setDtHour(h12);
      setDtMinute(d.getMinutes());
    } catch {}
  }, [value]);

  const emitChange = (dateISO, hour, minute, ampm) => {
    const baseDate = new Date(dateISO);
    let hour24 = Number(hour) % 12;
    if (ampm === 'PM') hour24 += 12;
    baseDate.setHours(hour24, Number(minute) || 0, 0, 0);
    if (typeof onChange === 'function') onChange(baseDate.toISOString());
  };

  const header = (close) => (
    <View style={styles.trayHeaderGrid}>
      <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Cancel</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={[styles.headerDone, { color: bottle?.primary || colors.textPrimary }]}>Done</Text>
      </Pressable>
    </View>
  );

  const { width } = Dimensions.get('window');
  const dateWidth = Math.min(65, width * 0.16);
  const timeWidth = Math.min(50, width * 0.12);

  return (
    <TTPickerTray isOpen={isOpen} onClose={onClose} header={header} height="44%" scrollEnabled={false}>
      <View style={[wheelStyles.section, { marginTop: -16 }]}>
        <View style={styles.dateTimeRowContainer}>
          <View
            style={[
              styles.dateTimeSelectionBar,
              { backgroundColor: colors.subtleSurface || colors.subtle || colors.track },
            ]}
          />
          <View style={styles.dateTimeRow}>
        <View style={[styles.dateTimePickerWrap, { width: dateWidth }]}>
          <WheelPicker
            type="date"
            value={dtDate}
            onChange={(val) => {
              setDtDate(val);
              emitChange(val, dtHour, dtMinute, dtAmpm);
            }}
            compact
            dateCompact
            showSelection={false}
            containerStyle={{ width: '100%' }}
          />
        </View>
        <View style={[styles.dateTimePickerWrap, { width: timeWidth }]}>
          <WheelPicker
            type="hour"
            value={dtHour}
            onChange={(val) => {
              setDtHour(val);
              emitChange(dtDate, val, dtMinute, dtAmpm);
            }}
            compact
            showSelection={false}
            containerStyle={{ width: '100%' }}
          />
        </View>
        <View style={styles.colonWrap}>
          <Text style={[wheelStyles.timeColon, { color: colors.textPrimary, fontSize: 20 }]}>:</Text>
        </View>
        <View style={[styles.dateTimePickerWrap, { width: timeWidth }]}>
          <WheelPicker
            type="minute"
            value={dtMinute}
            onChange={(val) => {
              setDtMinute(val);
              emitChange(dtDate, dtHour, val, dtAmpm);
            }}
            compact
            showSelection={false}
            containerStyle={{ width: '100%' }}
          />
        </View>
        <View style={[styles.dateTimePickerWrap, { width: timeWidth }]}>
          <WheelPicker
            type="ampm"
            value={dtAmpm}
            onChange={(val) => {
              setDtAmpm(val);
              emitChange(dtDate, dtHour, dtMinute, val);
            }}
            compact
            showSelection={false}
            containerStyle={{ width: '100%' }}
          />
        </View>
          </View>
        </View>
      </View>
    </TTPickerTray>
  );
}

// TimePickerTray
export function TimePickerTray({
  isOpen = false,
  onClose = null,
  value,
  onChange,
  title = 'Time',
}) {
  const { colors, sleep } = useTheme();

  const header = (close) => (
    <View style={styles.trayHeaderGrid}>
      <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Cancel</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={[styles.headerDone, { color: sleep?.primary || colors.textPrimary }]}>Done</Text>
      </Pressable>
    </View>
  );

  return (
    <TTPickerTray isOpen={isOpen} onClose={onClose} header={header}>
      <View style={{ marginTop: -16 }}>
        <TimePickerSection value={value} onChange={onChange} title={title} showHeader={false} />
      </View>
    </TTPickerTray>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetTray: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  itemsWrap: {
    position: 'relative',
    zIndex: 2,
  },
  overlayTop: {
    ...overlayBase,
    top: 0,
  },
  overlayBottom: {
    ...overlayBase,
    bottom: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '400',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  tray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  trayHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    borderBottomWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
  },
  trayHeaderGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    fontSize: 17,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  headerDone: {
    fontSize: 17,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  trayContent: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    marginTop: 0,
    width: '100%',
  },
  dateTimeRowContainer: {
    position: 'relative',
    width: '100%',
  },
  dateTimeSelectionBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    marginTop: -20,
    height: 40,
    borderRadius: 8,
    zIndex: 0,
  },
  dateTimeRow: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    width: '100%',
  },
  dateTimePickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  colonWrap: {
    width: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
});
