/**
 * Explosion-style confetti burst. Particles radiate outward from screen center,
 * slow down, and fade in place. Calls onComplete after the animation window.
 */
import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const ACCENT_COLORS = ['#277DC4', '#4BAB51', '#C99C4F', '#8259CF'];

// Total animation window (ms)
const BURST_DURATION = 900;
const MAX_DELAY = 300;
const TOTAL_MS = MAX_DELAY + BURST_DURATION + 200;

function ConfettiPiece({ originX, originY, angle, distance, delay, size, isRect, color }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Flash in instantly, then fade out across the full burst
    opacity.value = withDelay(delay, withTiming(1, { duration: 40 }, () => {
      opacity.value = withTiming(0, { duration: BURST_DURATION * 0.85, easing: Easing.in(Easing.quad) });
    }));
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, opacity, progress]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value;
    return {
      transform: [
        { translateX: originX + dx - size / 2 },
        { translateY: originY + dy - size / 2 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: isRect ? size * 0.55 : size,
          height: isRect ? size * 1.6 : size,
          borderRadius: isRect ? 2 : size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export default function ConfettiOverlay({ onComplete }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { colors } = useTheme();

  // Burst origin: center of screen, slightly above middle
  const originX = screenW / 2;
  const originY = screenH * 0.42;

  const particles = useMemo(() => {
    const list = [];
    // Three waves: initial burst, secondary spray, final scatter
    const waves = [
      { count: 40, delayBase: 0,   distMult: 1.0 },
      { count: 35, delayBase: 80,  distMult: 1.3 },
      { count: 30, delayBase: 170, distMult: 0.7 },
    ];
    const palette = [colors.brandIcon, ...ACCENT_COLORS];
    let key = 0;
    const maxReach = Math.min(screenW, screenH) * 0.52;

    waves.forEach(({ count, delayBase, distMult }) => {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = (60 + Math.random() * maxReach) * distMult;
        list.push({
          key: key++,
          angle,
          distance,
          delay: delayBase + Math.floor(Math.random() * 80),
          size: 4 + Math.floor(Math.random() * 7),
          isRect: Math.random() > 0.55,
          color: palette[key % palette.length],
        });
      }
    });
    return list;
  }, [colors.brandIcon, screenW, screenH]);

  useEffect(() => {
    const id = setTimeout(() => {
      onComplete?.();
    }, TOTAL_MS);
    return () => clearTimeout(id);
  }, [onComplete]);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.root} pointerEvents="none">
        {particles.map((p) => (
          <ConfettiPiece
            key={p.key}
            originX={originX}
            originY={originY}
            angle={p.angle}
            distance={p.distance}
            delay={p.delay}
            size={p.size}
            isRect={p.isRect}
            color={p.color}
          />
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
