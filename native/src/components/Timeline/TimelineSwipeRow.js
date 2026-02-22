import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import { EditIcon } from '../icons';

const SPRING = { stiffness: 900, damping: 80 };

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

function ActionColumn({ progress, width, primary, bgColor, icon, label, onPress, textColor }) {
  const actionStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const offset = primary
      ? Math.abs(p) >= 0.8
        ? 0
        : -(p * width * 0.5)
      : 0;

    return {
      transform: [{ translateX: withSpring(offset, SPRING) }],
    };
  }, [primary, width]);

  return (
    <Animated.View style={[styles.actionLayer, { backgroundColor: bgColor }, actionStyle]}>
      <View style={styles.actionButtonWrap}>
        <Pressable style={styles.actionTouch} onPress={onPress}>
          <ActionLabel
            progress={progress}
            primary={primary}
            icon={icon}
            label={label}
            color={textColor}
          />
        </Pressable>
      </View>
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
  const [width, setWidth] = useState(Dimensions.get('window').width - 32);

  const translateX = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const progress = useSharedValue(0);
  const lockState = useSharedValue(0); // 0 none, 1 locked delete

  const containerScaleX = useSharedValue(1);
  const containerScaleY = useSharedValue(1);
  const containerY = useSharedValue(0);

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
      startOffset.value = translateX.value;
      lockState.value = 0;
      if (onSwipeStart) runOnJS(onSwipeStart)(card?.id);
    })
    .onUpdate((e) => {
      const raw = startOffset.value + e.translationX;
      const threshold = 0.8 * width;
      const abs = Math.abs(raw);

      if (lockState.value === 1) {
        if (abs < threshold) {
          lockState.value = 0;
          const rb = rubberband(raw, -width, 0);
          translateX.value = rb;
          progress.value = rb / Math.max(1, width);
        } else {
          translateX.value = -width;
          progress.value = -1;
        }
        return;
      }

      if (abs > threshold) {
        lockState.value = 1;
        translateX.value = -width;
        progress.value = -1;
        return;
      }

      const clamped = Math.max(-width, Math.min(0, raw));
      const rb = rubberband(clamped, -width, 0);
      translateX.value = rb;
      progress.value = rb / Math.max(1, width);
    })
    .onEnd((e) => {
      if (lockState.value === 1) {
        if (onDelete) runOnJS(onDelete)(card);
        // Keep row pinned in delete state; Timeline handles the only exit animation.
        translateX.value = -width;
        progress.value = -1;
        lockState.value = 0;

        if (setOpenSwipeId) runOnJS(setOpenSwipeId)(null);
        if (onSwipeEnd) runOnJS(onSwipeEnd)(card?.id);
        return;
      }

      const current = translateX.value;
      const vx = e.velocityX;
      let target = 0;

      if (vx < -500) {
        target = -width * 0.50;
      } else if (vx > 500) {
        target = 0;
      } else if (Math.abs(current) > width * 0.18) {
        target = current < 0 ? -width * 0.50 : 0;
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

  const actionsTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleEdit = useCallback(() => {
    closeSwipe();
    onEdit?.(card);
  }, [card, closeSwipe, onEdit]);

  const handleDelete = useCallback(() => {
    closeSwipe();
    onDelete?.(card);
  }, [card, closeSwipe, onDelete]);

  const handleRowPress = useCallback(() => {
    if (openSwipeId === card?.id) {
      closeSwipe();
      return;
    }
    onRowPress?.();
  }, [card?.id, closeSwipe, onRowPress, openSwipeId]);

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
        style={[styles.row, { backgroundColor: colors.swipeRowBg || '#F7F7F7' }, containerStyle]}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.width;
          if (next > 0 && Math.abs(next - width) > 1) setWidth(next);
        }}
      >
        <Animated.View style={[styles.actionsTrack, actionsTrackStyle]} pointerEvents="box-none">
          <ActionColumn
            progress={progress}
            width={width}
            primary={false}
            bgColor={colors.positiveBg}
            icon={<EditIcon size={24} color={colors.textOnAccent} />}
            label="Edit"
            textColor={colors.textOnAccent}
            onPress={handleEdit}
          />
          <ActionColumn
            progress={progress}
            width={width}
            primary
            bgColor={colors.negativeBg}
            icon={<DeleteIconSvg size={24} color={colors.textOnAccent} />}
            label="Delete"
            textColor={colors.textOnAccent}
            onPress={handleDelete}
          />
        </Animated.View>

        <Animated.View style={[styles.content, contentStyle]}>
          <Pressable onPress={handleRowPress} style={styles.contentPressable}>
            {children}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actionsTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '100%',
    width: '100%',
  },
  actionLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  actionButtonWrap: {
    width: '25%',
    minWidth: 72,
    height: '100%',
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
    fontFamily: FWB.semibold,
  },
  content: {
    zIndex: 10,
  },
  contentPressable: {
    width: '100%',
  },
});
