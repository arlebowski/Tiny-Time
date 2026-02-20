import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  SUBPAGE_BASE_SCALE,
  SUBPAGE_BASE_SHIFT_FACTOR,
  SUBPAGE_DETAIL_SHADOW_OPACITY,
  SUBPAGE_DETAIL_START_X_FACTOR,
  SUBPAGE_SCRIM_OPACITY,
} from '../../constants/subpageMotion';

export default function LayeredSubpageContainer({
  progress,
  width,
  overlayMounted,
  overlayInteractive,
  basePointerEvents = 'auto',
  edgeSwipeTop = 0,
  edgeSwipeWidth = 32,
  edgeSwipeGesture = null,
  baseContent,
  overlayContent,
}) {
  const safeWidth = Math.max(width || 0, 1);

  const baseStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [0, -safeWidth * SUBPAGE_BASE_SHIFT_FACTOR],
          Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(progress.value, [0, 1], [1, SUBPAGE_BASE_SCALE], Extrapolation.CLAMP),
      },
    ],
  }), [progress, safeWidth]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, SUBPAGE_SCRIM_OPACITY], Extrapolation.CLAMP),
  }), [progress]);

  const detailStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [safeWidth * SUBPAGE_DETAIL_START_X_FACTOR, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
    shadowOpacity: interpolate(progress.value, [0, 1], [0, SUBPAGE_DETAIL_SHADOW_OPACITY], Extrapolation.CLAMP),
  }), [progress, safeWidth]);

  return (
    <View style={styles.container}>
      <Animated.View pointerEvents={basePointerEvents} style={[styles.baseLayer, baseStyle]}>
        {baseContent}
      </Animated.View>

      {overlayMounted ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
          <Animated.View pointerEvents={overlayInteractive ? 'auto' : 'none'} style={[styles.detailLayer, detailStyle]}>
            {overlayContent}
            {edgeSwipeGesture ? (
              <View pointerEvents="box-none" style={styles.gestureOverlayContainer}>
                <GestureDetector gesture={edgeSwipeGesture}>
                  <View style={[styles.edgeSwipeZone, { top: edgeSwipeTop, width: edgeSwipeWidth }]} />
                </GestureDetector>
              </View>
            ) : null}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  baseLayer: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  detailLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowRadius: 20,
    shadowOffset: { width: -8, height: 0 },
    elevation: 18,
  },
  gestureOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  edgeSwipeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },
});
