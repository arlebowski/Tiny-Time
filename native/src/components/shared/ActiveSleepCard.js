// ActiveSleepCard Component (v4)
// Sleep-only native port of web NextUpCard sleep state + alignment

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import { SleepIcon } from '../icons';

const __ttNextUpToDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const __ttNextUpFormatSleepTimer = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

export default function ActiveSleepCard({
  sleepStartTime = null,
  onWakeUp = () => {},
  style = null,
}) {
  const { colors, radius, sleep } = useTheme();
  const [nowMs, setNowMs] = useState(() => Date.now());

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(6)).current;
  const z1 = useRef(new Animated.Value(0)).current;
  const z2 = useRef(new Animated.Value(0)).current;
  const z3 = useRef(new Animated.Value(0)).current;
  const zLoopsRef = useRef([]);
  const zTimeoutsRef = useRef([]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    enterOpacity.setValue(0);
    enterY.setValue(6);
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterY, sleepStartTime]);

  useEffect(() => {
    zTimeoutsRef.current.forEach(clearTimeout);
    zTimeoutsRef.current = [];
    zLoopsRef.current.forEach((loop) => loop.stop());
    zLoopsRef.current = [];
    [z1, z2, z3].forEach((value) => value.setValue(0));

    const startLoop = (value, delayMs) => {
      const timeoutId = setTimeout(() => {
        const loop = Animated.loop(
          Animated.timing(value, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        );
        zLoopsRef.current.push(loop);
        loop.start();
      }, delayMs);
      zTimeoutsRef.current.push(timeoutId);
    };

    startLoop(z1, 0);
    startLoop(z2, 300);
    startLoop(z3, 600);

    return () => {
      zTimeoutsRef.current.forEach(clearTimeout);
      zTimeoutsRef.current = [];
      zLoopsRef.current.forEach((loop) => loop.stop());
      zLoopsRef.current = [];
      [z1, z2, z3].forEach((value) => value.setValue(0));
    };
  }, [z1, z2, z3]);

  const resolvedSleepStart = __ttNextUpToDate(sleepStartTime) || new Date(nowMs);
  const sleepDuration = Math.max(0, nowMs - resolvedSleepStart);
  const durationText = __ttNextUpFormatSleepTimer(sleepDuration);

  const sleepColor = sleep?.primary || '#277dc4';
  const textOnAccent = colors.textOnAccent || '#FFFFFF';

  const zAnimStyle = (value) => ({
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -4, -8],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.1, 1],
        }),
      },
    ],
    opacity: value.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.7, 0],
    }),
  });

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: sleepColor, borderRadius: radius?.xl ?? 16 },
        style,
        {
          opacity: enterOpacity,
          transform: [{ translateY: enterY }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.durationRow}>
            <View style={[styles.sleepIconWrap, { borderRadius: radius?.full ?? 9999 }]}>
              <SleepIcon
                size={24}
                color={textOnAccent}
                strokeWidth={1.5}
                style={styles.sleepIconSvg}
              />
            </View>
            <Text numberOfLines={1} style={[styles.duration, { color: textOnAccent }]}>
              {durationText}
            </Text>
            <View style={styles.zzz}>
              <Animated.Text style={[styles.zzzText, { color: textOnAccent }, zAnimStyle(z1)]}>z</Animated.Text>
              <Animated.Text style={[styles.zzzText, { color: textOnAccent }, zAnimStyle(z2)]}>Z</Animated.Text>
              <Animated.Text style={[styles.zzzText, { color: textOnAccent }, zAnimStyle(z3)]}>z</Animated.Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.cta, { backgroundColor: textOnAccent, borderRadius: radius?.full ?? 9999 }, pressed && styles.ctaPressed]}
            onPress={onWakeUp}
            accessibilityLabel="Wake Up"
          >
            <Text style={[styles.ctaText, { color: sleepColor }]}>Wake Up</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const styles = StyleSheet.create({
  root: {
    padding: 20,
  },
  content: {
    rowGap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    position: 'relative',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  sleepIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -1 }],
  },
  sleepIconSvg: {
    transform: [{ translateY: 0 }],
  },
  duration: {
    fontSize: 30,
    fontFamily: FWB.light,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    fontFamily: FWB.normal,
  },
  cta: {
    alignSelf: 'center',
    minHeight: 24,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    transform: [{ translateY: -1 }],
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: FWB.semibold,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontFamily: FWB.normal,
  },
  zzz: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  zzzText: {
    fontSize: 17.6,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: FWB.normal,
  },
});
