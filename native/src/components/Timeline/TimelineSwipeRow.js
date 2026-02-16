/**
 * TimelineSwipeRow — Swipe left to reveal Edit + Delete actions
 * Migrated from web Timeline.js TimelineSwipeRow (Framer Motion → Reanimated)
 */
import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';
import { EditIcon } from '../icons';

const SPRING = { stiffness: 420, damping: 55 };

function rubberband(value, min, max, constant = 0.55) {
  'worklet';
  if (value < min) {
    const diff = min - value;
    return min - (diff * constant / (diff + 200)) * 200;
  }
  if (value > max) {
    const diff = value - max;
    return max + (diff * constant / (diff + 200)) * 200;
  }
  return value;
}

function DeleteIconSvg({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
    </Svg>
  );
}

function ActionLabel({ progress, primary = false, icon, label, color = '#fff' }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(
      p,
      [-1, -0.8, -0.5, -0.25, 0.25, 0.5, 0.8, 1],
      [primary ? 1 : 0, 1, 1, 0, 0, 1, 1, primary ? 1 : 0],
      Extrapolation.CLAMP
    );
    const xShift = interpolate(
      p,
      [-1, -0.8, -0.5, 0.5, 0.8, 1],
      [0, 16, 0, 0, -16, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(p, [-1, -0.8, 0, 0.8, 1], [1, 0.8, 1, 0.8, 1], Extrapolation.CLAMP);
    return {
      opacity: withSpring(opacity, SPRING),
      transform: [{ translateX: withSpring(xShift, SPRING) }, { scale: withSpring(scale, SPRING) }],
    };
  });

  return (
    <Animated.View style={[styles.actionLabelWrap, style]}>
      {icon}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Animated.View>
  );
}

export default function TimelineSwipeRow({
  card,
  isSwipeEnabled,
  onEdit,
  onDelete,
  onRowPress,
  openSwipeId,
  setOpenSwipeId,
  onSwipeStart,
  onSwipeEnd,
  children,
}) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const lockState = useSharedValue(0); // 0 none, 1 locked delete
  const [width, setWidth] = React.useState(Dimensions.get('window').width - 32);
  const containerScaleX = useSharedValue(1);
  const containerScaleY = useSharedValue(1);
  const containerY = useSharedValue(0);

  const editBg = colors.positiveAlt || '#00BE68';
  const deleteBg = colors.negativeWarm || '#FF6037';
  const rowBg = colors.swipeRowBg || '#F7F7F7';

  const maxSwipe = width;
  const progress = useSharedValue(0);

  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, SPRING);
    progress.value = withSpring(0, SPRING);
    lockState.value = 0;
    setOpenSwipeId?.(null);
  }, [lockState, progress, setOpenSwipeId, translateX]);

  useEffect(() => {
    if (!openSwipeId || openSwipeId === card?.id) return;
    translateX.value = withSpring(0, SPRING);
    progress.value = withSpring(0, SPRING);
    lockState.value = 0;
  }, [card?.id, lockState, openSwipeId, progress, translateX]);

  const panGesture = Gesture.Pan()
    .enabled(isSwipeEnabled)
    .activeOffsetX([-6, 6])
    .failOffsetY([-15, 15])
    .onStart(() => {
      lockState.value = 0;
      if (onSwipeStart) runOnJS(onSwipeStart)(card?.id);
    })
    .onUpdate((e) => {
      const dx = e.translationX;

      const raw = dx;
      const threshold = 0.8 * maxSwipe;
      const abs = Math.abs(raw);

      if (lockState.value === 1) {
        if (abs < threshold) {
          lockState.value = 0;
          const rb = rubberband(raw, -maxSwipe, 0);
          translateX.value = rb;
          progress.value = rb / Math.max(1, maxSwipe);
        } else {
          translateX.value = -maxSwipe;
          progress.value = -1;
        }
        return;
      }

      if (abs > threshold) {
        lockState.value = 1;
        translateX.value = -maxSwipe;
        progress.value = -1;
        return;
      }

      const clamped = Math.max(-maxSwipe, Math.min(0, raw));
      const rb = rubberband(clamped, -maxSwipe, 0);
      translateX.value = rb;
      progress.value = rb / Math.max(1, maxSwipe);
    })
    .onEnd((e) => {
      if (lockState.value === 1) {
        if (onDelete) runOnJS(onDelete)(card);
        containerScaleY.value = withTiming(1.05, { duration: 100 }, () => {
          containerScaleY.value = withSpring(1, SPRING);
        });
        containerScaleX.value = withTiming(0.95, { duration: 100 }, () => {
          containerScaleX.value = withSpring(1, SPRING);
        });
        containerY.value = withTiming(-24, { duration: 100 }, () => {
          containerY.value = withSpring(0, SPRING);
        });
        translateX.value = withTiming(0, { duration: 500 });
        progress.value = withTiming(0, { duration: 500 });
        lockState.value = 0;
        if (setOpenSwipeId) runOnJS(setOpenSwipeId)(null);
        if (onSwipeEnd) runOnJS(onSwipeEnd)(card?.id);
        return;
      }

      const current = translateX.value;
      const vx = e.velocityX;
      let target = 0;

      if (vx < -500) {
        target = -width * 0.6;
      } else if (vx > 500) {
        target = 0;
      } else if (Math.abs(current) > width * 0.3) {
        target = current < 0 ? -width * 0.5 : 0;
      }

      if (target < 0) {
        if (setOpenSwipeId) runOnJS(setOpenSwipeId)(card?.id);
      } else {
        if (setOpenSwipeId) runOnJS(setOpenSwipeId)(null);
      }

      translateX.value = withSpring(target, SPRING);
      progress.value = withSpring(target / Math.max(1, width), SPRING);
      if (onSwipeEnd) runOnJS(onSwipeEnd)(card?.id);
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: containerScaleX.value },
      { scaleY: containerScaleY.value },
      { translateY: containerY.value },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const primaryActionStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const offset = Math.abs(p) >= 0.8 ? 0 : -(p * width * 0.5);
    return { transform: [{ translateX: withSpring(offset, SPRING) }] };
  });

  const handleEdit = useCallback(() => {
    closeSwipe();
    onEdit?.(card);
  }, [card, closeSwipe, onEdit]);

  const handleDelete = useCallback(() => {
    closeSwipe();
    onDelete?.(card);
  }, [card, closeSwipe, onDelete]);

  const handleRowPress = useCallback(() => {
    if (openSwipeId === card?.id) return;
    onRowPress?.();
  }, [card?.id, onRowPress, openSwipeId]);

  if (!isSwipeEnabled) {
    return (
      <Pressable onPress={onRowPress} style={styles.row}>
        {children}
      </Pressable>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.row, { backgroundColor: rowBg }, containerStyle]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.actions} pointerEvents="box-none">
          <View style={[styles.actionBtn, { backgroundColor: editBg }]}>
            <Pressable style={styles.actionTouch} onPress={handleEdit}>
              <ActionLabel
                progress={progress}
                primary={false}
                icon={<EditIcon size={24} color={colors.textPrimary} />}
                label="Edit"
                color={colors.textPrimary}
              />
            </Pressable>
          </View>
          <Animated.View style={[styles.actionBtn, { backgroundColor: deleteBg }, primaryActionStyle]}>
            <Pressable style={styles.actionTouch} onPress={handleDelete}>
              <ActionLabel
                progress={progress}
                primary
                icon={<DeleteIconSvg size={24} color={colors.textPrimary} />}
                label="Delete"
                color={colors.textPrimary}
              />
            </Pressable>
          </Animated.View>
        </View>
        <Animated.View style={[styles.content, contentStyle]}>
          <Pressable onPress={handleRowPress} style={StyleSheet.absoluteFill}>
            {children}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actions: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: '25%',
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTouch: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
