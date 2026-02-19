import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import TrackerScreen from '../../screens/TrackerScreen';
import DetailScreen from '../../screens/DetailScreen';

const OPEN_DURATION_MS = 340;
const CLOSE_DURATION_MS = 280;
const SWIPE_CLOSE_THRESHOLD = 0.33;
const SWIPE_VELOCITY_THRESHOLD = 950;

const TrackerDetailFlow = forwardRef(function TrackerDetailFlow({
  onOpenSheet,
  onRequestToggleActivitySheet,
  activityVisibility,
  activityOrder,
  onEditCard,
  onDeleteCard,
  timelineRefreshRef,
  onDetailOpenChange,
  entranceSeed = 0,
}, ref) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(screenWidth || 0, 1);
  const progress = useSharedValue(0); // 0 = tracker, 1 = detail
  const [detailFilter, setDetailFilter] = useState(null);
  const [detailMounted, setDetailMounted] = useState(false);
  const [detailInteractive, setDetailInteractive] = useState(false);
  const [trackerEntranceToken, setTrackerEntranceToken] = useState(0);

  const mergedEntranceToken = `${entranceSeed}-${trackerEntranceToken}`;

  const finishClose = useCallback(() => {
    setDetailMounted(false);
    setDetailInteractive(false);
    setDetailFilter(null);
  }, []);

  const triggerTrackerEntrance = useCallback(() => {
    setTrackerEntranceToken((token) => token + 1);
  }, []);

  const markDetailOpen = useCallback(() => {
    onDetailOpenChange?.(true);
  }, [onDetailOpenChange]);

  const markDetailClosed = useCallback(() => {
    onDetailOpenChange?.(false);
  }, [onDetailOpenChange]);

  const animateToOpen = useCallback(() => {
    progress.value = withTiming(1, {
      duration: OPEN_DURATION_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [progress]);

  const animateToClose = useCallback(() => {
    setDetailInteractive(false);
    markDetailClosed();
    triggerTrackerEntrance();
    progress.value = withTiming(0, {
      duration: CLOSE_DURATION_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    }, (finished) => {
      if (finished) {
        runOnJS(finishClose)();
      }
    });
  }, [finishClose, markDetailClosed, progress, triggerTrackerEntrance]);

  const handleCardTap = useCallback((filterType) => {
    setDetailFilter(filterType || 'all');
    setDetailMounted(true);
    setDetailInteractive(true);
    markDetailOpen();
    progress.value = 0;
    animateToOpen();
  }, [animateToOpen, markDetailOpen, progress]);

  const handleDetailBack = useCallback(() => {
    if (!detailMounted) return;
    animateToClose();
  }, [animateToClose, detailMounted]);

  useImperativeHandle(ref, () => ({
    closeDetail: () => {
      if (!detailMounted) return false;
      handleDetailBack();
      return true;
    },
  }), [detailMounted, handleDetailBack]);

  const edgeSwipeGesture = useMemo(() => Gesture.Pan()
    .enabled(detailMounted)
    .hitSlop({ left: 0, width: 32 })
    .activeOffsetX(10)
    .failOffsetY([-12, 12])
    .onBegin(() => {
      runOnJS(markDetailClosed)();
    })
    .onUpdate((event) => {
      const t = Math.max(0, event.translationX);
      progress.value = Math.max(0, Math.min(1, 1 - (t / width)));
    })
    .onEnd((event) => {
      const shouldClose =
        event.translationX > width * SWIPE_CLOSE_THRESHOLD
        || event.velocityX > SWIPE_VELOCITY_THRESHOLD;
      if (shouldClose) {
        runOnJS(setDetailInteractive)(false);
        progress.value = withTiming(0, {
          duration: CLOSE_DURATION_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        }, (finished) => {
          if (finished) runOnJS(finishClose)();
        });
      } else {
        runOnJS(markDetailOpen)();
        runOnJS(setDetailInteractive)(true);
        progress.value = withTiming(1, {
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
      }
    }), [detailMounted, finishClose, markDetailClosed, markDetailOpen, progress, width]);

  const trackerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [0, -width * 0.22], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(progress.value, [0, 1], [1, 0.985], Extrapolation.CLAMP),
      },
    ],
  }), [width]);

  const trackerScrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.08], Extrapolation.CLAMP),
  }));

  const detailStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [width, 0], Extrapolation.CLAMP),
      },
    ],
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.16], Extrapolation.CLAMP),
  }), [width]);

  useEffect(() => () => {
    onDetailOpenChange?.(false);
  }, [onDetailOpenChange]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.trackerLayer, trackerStyle]}>
        <TrackerScreen
          entranceToken={mergedEntranceToken}
          onOpenSheet={onOpenSheet}
          onCardTap={handleCardTap}
          onRequestToggleActivitySheet={onRequestToggleActivitySheet}
          activityVisibility={activityVisibility}
          activityOrder={activityOrder}
          onEditCard={onEditCard}
          onDeleteCard={onDeleteCard}
          timelineRefreshRef={timelineRefreshRef}
        />
      </Animated.View>

      {detailMounted ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.scrim, trackerScrimStyle]} />
          <Animated.View pointerEvents={detailInteractive ? 'auto' : 'none'} style={[styles.detailLayer, detailStyle]}>
            <DetailScreen
              initialFilter={detailFilter || 'all'}
              onBack={handleDetailBack}
              onOpenSheet={onOpenSheet}
              onEditCard={onEditCard}
              onDeleteCard={onDeleteCard}
              timelineRefreshRef={timelineRefreshRef}
              activityVisibility={activityVisibility}
            />
            <View pointerEvents="box-none" style={styles.gestureOverlayContainer}>
              <GestureDetector gesture={edgeSwipeGesture}>
                <View style={styles.edgeSwipeZone} />
              </GestureDetector>
            </View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
});

export default TrackerDetailFlow;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  trackerLayer: {
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
