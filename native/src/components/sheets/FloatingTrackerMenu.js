/**
 * FloatingTrackerMenu — 1:1 from web/components/shared/FloatingTrackerMenu.js
 * Plus button that expands into 3 split buttons: Feed (left), Diaper (top), Sleep (right)
 * No dimmed overlay; tap outside or center to close (web: document pointerdown)
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { BottleIcon, NursingIcon, SleepIcon, DiaperIcon } from '../icons';
import { PlusIcon } from '../icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Web PlusButton: initial scale 0.2 rotate 180 opacity 0 → animate scale 1 rotate 0 opacity 1
// exit: scale 0.2 rotate 180 opacity 0, duration 0.3 easeInOut
const plusEntering = () => {
  'worklet';
  const easing = Easing.inOut(Easing.ease);
  return {
    initialValues: {
      transform: [{ scale: 0.2 }, { rotate: '180deg' }],
      opacity: 0,
    },
    animations: {
      transform: [
        { scale: withTiming(1, { duration: 300, easing }) },
        { rotate: withTiming('0deg', { duration: 300, easing }) },
      ],
      opacity: withTiming(1, { duration: 300, easing }),
    },
  };
};
const plusExiting = () => {
  'worklet';
  const easing = Easing.inOut(Easing.ease);
  return {
    initialValues: {
      transform: [{ scale: 1 }, { rotate: '0deg' }],
      opacity: 1,
    },
    animations: {
      transform: [
        { scale: withTiming(0.2, { duration: 300, easing }) },
        { rotate: withTiming('180deg', { duration: 300, easing }) },
      ],
      opacity: withTiming(0, { duration: 300, easing }),
    },
  };
};

// Web SplitButton: Feed left (-74, -112), Diaper top (0, -164), Sleep right (74, -112)
const SPLIT_POSITIONS = {
  feed: { x: -74, y: -112 },
  diaper: { x: 0, y: -164 },
  sleep: { x: 74, y: -112 },
};

function SplitButton({ icon: Icon, label, positionKey, onPress, accentColor, shadows, labelColor }) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const pos = SPLIT_POSITIONS[positionKey] || { x: 0, y: 0 };
    scale.value = withSpring(1, { damping: 20, stiffness: 260 });
    opacity.value = withTiming(1, { duration: 200 });
    translateX.value = withSpring(pos.x);
    translateY.value = withSpring(pos.y);
  }, [positionKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      style={[styles.splitButton, animatedStyle]}
      onPress={onPress}
    >
      <View style={[styles.splitCircle, { backgroundColor: accentColor }, shadows?.floating]}>
        <Icon size={32} color="#fff" />
      </View>
      <Text style={[styles.splitLabel, labelColor != null && { color: labelColor }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export default function FloatingTrackerMenu({
  onSelect,
  visibleTypes = { feeding: true, sleep: true, diaper: true },
  lastFeedVariant = 'bottle',
  bottomOffset = 36,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadows, bottle, nursing, sleep, diaper } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const positionBottom = insets.bottom + bottomOffset;

  const handleToggle = useCallback(() => setIsOpen((p) => !p), []);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleSelect = useCallback((type) => {
    onSelect?.(type);
    setIsOpen(false);
  }, [onSelect]);

  const showFeed = visibleTypes?.feeding !== false;
  const showSleep = visibleTypes?.sleep !== false;
  const showDiaper = visibleTypes?.diaper !== false;

  const FeedIcon = lastFeedVariant === 'nursing' ? NursingIcon : BottleIcon;
  const feedAccent = lastFeedVariant === 'nursing' ? nursing.primary : bottle.primary;

  // When selecting Feed, pass bottle or nursing (parent opens FeedSheet with that type)
  const handleFeedPress = useCallback(() => {
    handleSelect(lastFeedVariant === 'nursing' ? 'nursing' : 'bottle');
  }, [handleSelect, lastFeedVariant]);

  return (
    <>
      {/* When open: transparent overlay to close on outside tap (web: document pointerdown) */}
      {isOpen && (
        <Modal visible transparent animationType="none">
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          {/* Split buttons inside Modal so they render above the overlay */}
          <View style={[styles.modalContent, { bottom: positionBottom }]}>
            <Pressable style={styles.centerClose} onPress={handleClose} />
            {showFeed && (
              <SplitButton
                icon={FeedIcon}
                label="Feed"
                positionKey="feed"
                onPress={handleFeedPress}
                accentColor={feedAccent}
                shadows={shadows}
                labelColor={colors.textPrimary}
              />
            )}
            {showDiaper && (
              <SplitButton
                icon={DiaperIcon}
                label="Diaper"
                positionKey="diaper"
                onPress={() => handleSelect('diaper')}
                accentColor={diaper.primary}
                shadows={shadows}
                labelColor={colors.textPrimary}
              />
            )}
            {showSleep && (
              <SplitButton
                icon={SleepIcon}
                label="Sleep"
                positionKey="sleep"
                onPress={() => handleSelect('sleep')}
                accentColor={sleep.primary}
                shadows={shadows}
                labelColor={colors.textPrimary}
              />
            )}
          </View>
        </Modal>
      )}

      {/* Floating plus — web: hides when open (AnimatePresence mode wait), rotate anim on open/close */}
      {!isOpen && (
        <View
          style={[styles.container, { bottom: positionBottom }]}
          pointerEvents="box-none"
        >
          <View style={styles.inner}>
            <Animated.View
              entering={plusEntering}
              exiting={plusExiting}
              style={styles.plusWrapper}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.plusButton,
                  { backgroundColor: colors.plusBg },
                  shadows.floating,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={handleToggle}
              >
                <PlusIcon size={21.6} color={colors.plusFg} />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    zIndex: 1000,
  },
  inner: {
    position: 'relative',
    width: 64,
    height: 64,
    overflow: 'visible',
  },
  plusWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 64,
    height: 64,
  },
  plusButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal content: 64x64 at bottom center, split buttons animate from center
  modalContent: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    overflow: 'visible',
  },
  centerClose: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 10,
  },
  splitButton: {
    position: 'absolute',
    top: 32,
    left: 32,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -32,
    marginTop: -32,
  },
  splitCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  splitLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
