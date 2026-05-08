/**
 * FloatingTrackerMenu — 1:1 from web/components/shared/FloatingTrackerMenu.js
 * Plus button that expands into 3 split buttons: Feed (left), Diaper (top), Sleep (right)
 * No dimmed overlay; tap outside or center to close (web: document pointerdown)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Animated } from 'react-native';
import ReanimatedAnimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import { BottleIcon, NursingIcon, SleepIcon, DiaperIcon } from '../icons';
import { PlusIcon } from '../icons';

const TOOLTIP_KEY = 'tt_onboarding_tooltip_shown';

const AnimatedPressable = ReanimatedAnimated.createAnimatedComponent(Pressable);

// Web SplitButton: Feed left (-74, -112), Diaper top (0, -164), Sleep right (74, -112)
const SPLIT_POSITIONS = {
  feed: { x: -80, y: -112 },
  diaper: { x: 0, y: -164 },
  sleep: { x: 80, y: -112 },
};

function SplitButton({ icon: Icon, label, positionKey, onPress, accentColor, shadows, labelColor, active }) {
  const pos = SPLIT_POSITIONS[positionKey] || { x: 0, y: 0 };
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      translateX.value = withSpring(pos.x);
      translateY.value = withSpring(pos.y);
      scale.value = withSpring(1, { damping: 30, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
      return;
    }
    translateX.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(0, { duration: 220 });
    scale.value = withTiming(0.7, { duration: 220 });
    opacity.value = withTiming(0, { duration: 180 });
  }, [active, pos.x, pos.y, opacity, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({ // reanimated
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
      disabled={!active}
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
  forceTooltipPreview = false,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadows, bottle, nursing, sleep, diaper } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isSplitClosing, setIsSplitClosing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;
  const pulseLoop = useRef(null);

  // Check AsyncStorage on mount; dev override skips the check
  useEffect(() => {
    if (forceTooltipPreview) {
      setShowTooltip(true);
      return;
    }
    AsyncStorage.getItem(TOOLTIP_KEY).then((val) => {
      if (!val) setShowTooltip(true);
    }).catch(() => {});
  }, [forceTooltipPreview]);

  // Start/stop pulse loop when tooltip visibility changes
  useEffect(() => {
    if (!showTooltip) {
      pulseLoop.current?.stop();
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.7, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.current = loop;
    loop.start();
    return () => loop.stop();
  }, [showTooltip, pulseScale, pulseOpacity]);

  const dismissTooltip = useCallback(() => {
    if (!forceTooltipPreview) {
      AsyncStorage.setItem(TOOLTIP_KEY, '1').catch(() => {});
    }
    setShowTooltip(false);
  }, [forceTooltipPreview]);

  const positionBottom = insets.bottom + bottomOffset;
  const isSplitLayerVisible = isOpen || isSplitClosing;

  useEffect(() => {
    if (isOpen) {
      setIsSplitClosing(false);
      return;
    }
    if (!isSplitClosing) {
      return;
    }
    const timer = setTimeout(() => setIsSplitClosing(false), 240);
    return () => clearTimeout(timer);
  }, [isOpen, isSplitClosing]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsSplitClosing(true);
  }, []);

  const handleToggle = useCallback(() => {
    if (showTooltip) dismissTooltip();
    if (isOpen) {
      closeMenu();
      return;
    }
    setIsOpen(true);
  }, [isOpen, closeMenu, showTooltip, dismissTooltip]);
  const handleClose = useCallback(() => closeMenu(), [closeMenu]);
  const handleSelect = useCallback((type) => {
    onSelect?.(type);
    closeMenu();
  }, [onSelect, closeMenu]);

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
      {isSplitLayerVisible && (
        <Modal visible transparent animationType="none">
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} disabled={!isOpen} />
          {/* Split buttons inside Modal so they render above the overlay */}
          <View style={[styles.modalContent, { bottom: positionBottom }]}>
            <Pressable style={styles.centerClose} onPress={handleClose} disabled={!isOpen} />
            {showFeed && (
              <SplitButton
                icon={FeedIcon}
                label="Feed"
                positionKey="feed"
                onPress={handleFeedPress}
                accentColor={feedAccent}
                shadows={shadows}
                labelColor={colors.textPrimary}
                active={isOpen}
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
                active={isOpen}
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
                active={isOpen}
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
          {/* Onboarding tooltip card */}
          {showTooltip && (
            <Pressable style={[styles.tooltipCard, { backgroundColor: colors.cardBg }]} onPress={dismissTooltip}>
              <Text style={[styles.tooltipText, { color: colors.textPrimary }]}>
                🎉 Tap + to log your first feed, sleep, or diaper
              </Text>
            </Pressable>
          )}
          <View style={styles.inner}>
            <View style={styles.plusWrapper}>
              {/* Pulse ring */}
              {showTooltip && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      borderColor: colors.plusBg,
                      transform: [{ scale: pulseScale }],
                      opacity: pulseOpacity,
                    },
                  ]}
                  pointerEvents="none"
                />
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.plusButton,
                  { backgroundColor: colors.plusBg },
                  shadows.floating,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={handleToggle}
              >
                <PlusIcon size={22} color={colors.plusFg} />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
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
    fontFamily: FWB.semibold,
    includeFontPadding: false,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
  },
  tooltipCard: {
    position: 'absolute',
    bottom: 76,
    left: '50%',
    width: 220,
    marginLeft: -110,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: FWB.medium,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
