/**
 * SegmentedToggle — 1:1 port from web/components/shared/SegmentedToggle.js
 * Unified segmented control with sliding pill animation.
 * Web: Framer Motion spring (stiffness 320, damping 30, mass 1)
 * Reanimated: mass 1 to match Framer; web animates x + width only
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';

// Web: transition: { type: "spring", stiffness: 320, damping: 30 }
// Framer Motion default mass=1; Reanimated default mass=4 — use 1 for exact match
const SPRING_CONFIG = { stiffness: 320, damping: 30, mass: 1 };

const SIZE_TOKENS = {
  small: {
    containerPaddingH: 4,
    containerPaddingV: 2,
    buttonPaddingH: 8,
    buttonPaddingV: 4,
    fontSize: 11,
  },
  medium: {
    containerPaddingH: 4,
    containerPaddingV: 3,
    buttonPaddingH: 12,
    buttonPaddingV: 6,
    fontSize: 13,
  },
  large: {
    containerPaddingH: 6,
    containerPaddingV: 4,
    buttonPaddingH: 16,
    buttonPaddingV: 8,
    fontSize: 16,
  },
};

export default function SegmentedToggle({
  value,
  options,
  onChange,
  variant = 'body',
  size = 'medium',
  fullWidth = false,
  trackColor,
  pillColor,
}) {
  const { colors, shadows, radius } = useTheme();
  const containerRef = useRef(null);
  const optionLayouts = useRef({});
  const [pillRect, setPillRect] = useState(null);
  const pillInitialized = useRef(false);

  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillHeight = useSharedValue(0);
  const pillY = useSharedValue(0);

  const tokens = SIZE_TOKENS[size] || SIZE_TOKENS.medium;

  const trackBg = trackColor ?? (variant === 'header' ? colors.segmentedTrackBg : colors.segTrack);
  const containerRadius = radius?.lg ?? 8;  // Web: rounded-xl
  const pillRadius = radius?.md ?? 6;       // Web: rounded-lg (pill + buttons)
  const pillBg = pillColor ?? (variant === 'header' ? colors.segmentedOnBg : colors.segPill);
  const pillShadow = shadows?.segmented ?? {};
  const activeTextColor = variant === 'header' ? colors.segmentedOnText : colors.textPrimary;
  const inactiveTextColor = variant === 'header' ? colors.segmentedOffText : colors.textSecondary;

  // Set pill position — immediate on first layout, spring on subsequent
  const setPillPosition = useCallback((layout, animate) => {
    setPillRect(layout);
    if (animate) {
      pillX.value = withSpring(layout.x, SPRING_CONFIG);
      pillY.value = withSpring(layout.y, SPRING_CONFIG);
      pillWidth.value = withSpring(layout.width, SPRING_CONFIG);
      pillHeight.value = withSpring(layout.height, SPRING_CONFIG);
    } else {
      pillX.value = layout.x;
      pillY.value = layout.y;
      pillWidth.value = layout.width;
      pillHeight.value = layout.height;
    }
  }, [pillX, pillY, pillWidth, pillHeight]);

  const updatePillRect = useCallback(() => {
    const layout = optionLayouts.current[value];
    if (!layout) return;
    setPillPosition(layout, pillInitialized.current);
    pillInitialized.current = true;
  }, [value, setPillPosition]);

  const handleOptionLayout = useCallback((optValue, event) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    optionLayouts.current[optValue] = { x, y, width, height };
    if (optValue === value) {
      const shouldAnimate = pillInitialized.current;
      setPillPosition({ x, y, width, height }, shouldAnimate);
      pillInitialized.current = true;
    }
  }, [value, setPillPosition]);

  useLayoutEffect(() => {
    updatePillRect();
  }, [updatePillRect, value, options?.map((o) => o?.value).join('|')]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    transform: [
      { translateX: pillX.value },
      { translateY: pillY.value },
    ],
    width: pillWidth.value,
    height: pillHeight.value,
    borderRadius: pillRadius,
    backgroundColor: pillBg,
    ...(variant === 'header' ? pillShadow : {}),
  }));

  const opts = options || [];

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          backgroundColor: trackBg,
          borderRadius: containerRadius,
          paddingHorizontal: tokens.containerPaddingH,
          paddingVertical: tokens.containerPaddingV,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        fullWidth && styles.containerFull,
      ]}
    >
      {pillRect && (
        <Animated.View
          style={[pillAnimatedStyle]}
          pointerEvents="none"
        />
      )}
      {opts.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onLayout={(e) => handleOptionLayout(opt.value, e)}
            onPressIn={() => {
              const layout = optionLayouts.current[opt.value];
              if (!layout) return;
              setPillPosition(layout, true);
            }}
            onPress={() => onChange?.(opt.value)}
            style={[
              styles.option,
              {
                paddingHorizontal: tokens.buttonPaddingH,
                paddingVertical: tokens.buttonPaddingV,
                borderRadius: pillRadius,
              },
              fullWidth && styles.optionFull,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.optionText,
                { fontSize: tokens.fontSize },
                { color: isActive ? activeTextColor : inactiveTextColor },
              ]}
            >
              {React.isValidElement(opt.label) ? opt.label : String(opt.label ?? '')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
  },
  containerFull: {
    width: '100%',
  },
  option: {
    // borderRadius set per-option via pillRadius (radius.lg = 8)
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'SF-Pro',
  },
  optionFull: {
    flex: 1,
  },
  optionText: {
    fontWeight: FW.semibold,
  },
});
