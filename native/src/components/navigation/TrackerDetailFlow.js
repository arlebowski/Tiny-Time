import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import TrackerScreen from '../../screens/TrackerScreen';
import DetailScreen from '../../screens/DetailScreen';
import LayeredSubpageContainer from './LayeredSubpageContainer';
import {
  SUBPAGE_CANCEL_DURATION_MS,
  SUBPAGE_CLOSE_DURATION_MS,
  SUBPAGE_EASING,
  SUBPAGE_OPEN_DURATION_MS,
  SUBPAGE_SWIPE_CLOSE_THRESHOLD,
  SUBPAGE_SWIPE_VELOCITY_THRESHOLD,
} from '../../constants/subpageMotion';

const TrackerDetailFlow = forwardRef(function TrackerDetailFlow({
  onOpenSheet,
  header = null,
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
      duration: SUBPAGE_OPEN_DURATION_MS,
      easing: SUBPAGE_EASING,
    });
  }, [progress]);

  const animateToClose = useCallback(() => {
    setDetailInteractive(false);
    markDetailClosed();
    triggerTrackerEntrance();
    progress.value = withTiming(0, {
      duration: SUBPAGE_CLOSE_DURATION_MS,
      easing: SUBPAGE_EASING,
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
        event.translationX > width * SUBPAGE_SWIPE_CLOSE_THRESHOLD
        || event.velocityX > SUBPAGE_SWIPE_VELOCITY_THRESHOLD;
      if (shouldClose) {
        runOnJS(setDetailInteractive)(false);
        progress.value = withTiming(0, {
          duration: SUBPAGE_CLOSE_DURATION_MS,
          easing: SUBPAGE_EASING,
        }, (finished) => {
          if (finished) runOnJS(finishClose)();
        });
      } else {
        runOnJS(markDetailOpen)();
        runOnJS(setDetailInteractive)(true);
        progress.value = withTiming(1, {
          duration: SUBPAGE_CANCEL_DURATION_MS,
          easing: SUBPAGE_EASING,
        });
      }
    }), [detailMounted, finishClose, markDetailClosed, markDetailOpen, progress, width]);

  useEffect(() => () => {
    onDetailOpenChange?.(false);
  }, [onDetailOpenChange]);

  const baseContent = (
    <>
      {header}
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
    </>
  );

  const overlayContent = (
    <DetailScreen
      initialFilter={detailFilter || 'all'}
      onBack={handleDetailBack}
      onOpenSheet={onOpenSheet}
      onEditCard={onEditCard}
      onDeleteCard={onDeleteCard}
      timelineRefreshRef={timelineRefreshRef}
      activityVisibility={activityVisibility}
    />
  );

  return (
    <LayeredSubpageContainer
      progress={progress}
      width={width}
      overlayMounted={detailMounted}
      overlayInteractive={detailInteractive}
      edgeSwipeGesture={edgeSwipeGesture}
      baseContent={baseContent}
      overlayContent={overlayContent}
    />
  );
});

export default TrackerDetailFlow;
