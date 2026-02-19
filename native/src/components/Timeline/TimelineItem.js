/**
 * TimelineItem — RN migration from web/components/shared/TimelineItem.js
 * Full migration: animations, icons, solids details, nursing lastSide, Nap vs Sleep.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  Layout,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { colorMix } from '../../utils/colorBlend';
import {
  BottleIcon,
  NursingIcon,
  SolidsIcon,
  SleepIcon,
  DiaperIcon,
  ChevronDownIcon,
} from '../icons';
import { COMMON_FOODS } from '../../constants/foods';

const FOOD_MAP = Object.fromEntries(COMMON_FOODS.map((f) => [f.id, f]));
const TIMELINE_EASE = Easing.bezier(0.16, 0, 0, 1);
const CHEVRON_ROTATE_MS = 260;
const DETAILS_LAYOUT_MS = 300;
const DETAILS_ENTER_MS = 260;
const DETAILS_EXIT_MS = 220;
const DETAILS_MAX_HEIGHT = 600;
const DETAILS_PADDING_TOP = 8;
const DETAILS_PADDING_BOTTOM = 8;

const normalizePhotoUrls = (input) => {
  if (!input) return [];
  const items = Array.isArray(input) ? input : [input];
  const urls = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      urls.push(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const maybe =
        item.url ||
        item.publicUrl ||
        item.publicURL ||
        item.downloadURL ||
        item.downloadUrl ||
        item.src ||
        item.uri;
      if (typeof maybe === 'string' && maybe.trim()) {
        urls.push(maybe);
      }
    }
  }
  return urls;
};

const formatSleepDuration = (ms) => {
  const totalSec = Math.round(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
};

const formatNursingDuration = (totalSec) => {
  const total = Math.max(0, Number(totalSec) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatTime12Hour = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const mins = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${mins} ${ampm}`;
};

// Nap vs Sleep from sleep settings (web getSleepLabel)
const getSleepLabel = (time, sleepSettings) => {
  if (!time || !(time instanceof Date)) return 'Sleep';
  const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
  const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);
  const mins = time.getHours() * 60 + time.getMinutes();
  const isDaySleep =
    dayStart <= dayEnd
      ? mins >= dayStart && mins < dayEnd
      : mins >= dayStart || mins < dayEnd;
  return isDaySleep ? 'Nap' : 'Sleep';
};

// Solids: format prep, amount, reaction (web TimelineItem.js)
const normalizeSolidsToken = (v) =>
  String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
const formatPrep = (value) => {
  const token = normalizeSolidsToken(value);
  const byToken = {
    raw: 'Raw',
    mashed: 'Mashed',
    steamed: 'Steamed',
    'puréed': 'Puréed',
    pureed: 'Puréed',
    boiled: 'Boiled',
  };
  return byToken[token] || (value ? String(value).trim() : null);
};
const formatAmount = (value) => {
  const token = normalizeSolidsToken(value);
  const byToken = {
    all: '● All',
    most: '◕ Most',
    some: '◑ Some',
    'a-little': '◔ A little',
    little: '◔ A little',
    none: '○ None',
  };
  return byToken[token] || (value ? `◌ ${value}` : null);
};
const formatReaction = (value) => {
  const token = normalizeSolidsToken(value);
  const byToken = {
    loved: '😍 Loved',
    liked: '😊 Liked',
    neutral: '😐 Neutral',
    disliked: '😖 Disliked',
  };
  return byToken[token] || (value ? `🙂 ${value}` : null);
};

// Small SVG icons for note/photo indicators (web paths)
const NoteIcon = ({ size = 16, color }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z" />
  </Svg>
);
const PhotoIcon = ({ size = 16, color }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
  </Svg>
);

export default function TimelineItem({
  card,
  isExpanded = false,
  hasDetails: hasDetailsProp,
  onPress,
  onActiveSleepClick,
  onPhotoClick,
  sleepSettings = null,
  iconSize = 24,
  iconWrapSize = 40,
  allowItemExpand = true,
}) {
  const { colors, bottle, nursing, sleep, solids, diaper } = useTheme();

  const isScheduled = card?.variant === 'scheduled';
  const isScheduledGray = isScheduled;
  const isLogged = card?.variant === 'logged';
  const isActiveSleep = Boolean(card?.isActive && card?.type === 'sleep');
  const isNursing = card?.type === 'feed' && card?.feedType === 'nursing';
  const isSolids = card?.type === 'feed' && card?.feedType === 'solids';
  const unitText = (card?.unit || '').toLowerCase();

  const resolveSleepAmountText = () => {
    const raw = Number(card?.amount);
    if (isLogged) {
      const durationMs =
        typeof card?.startTime === 'number' && typeof card?.endTime === 'number'
          ? Math.max(0, card.endTime - card.startTime)
          : Number.isFinite(raw)
            ? Math.round(raw * 3600 * 1000)
            : 0;
      return durationMs > 0 ? formatSleepDuration(durationMs) : '';
    }
    if (!Number.isFinite(raw) || raw <= 0) return '';
    if (raw < 1) return `${Math.round(raw * 60)} min`;
    const totalMins = Math.round(raw * 60);
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const nursingTotalSec = isNursing
    ? Number(card?.leftDurationSec || 0) + Number(card?.rightDurationSec || 0)
    : 0;
  const nursingAmountText =
    isNursing && nursingTotalSec > 0 ? formatNursingDuration(nursingTotalSec) : '';
  const amountText = isNursing
    ? nursingAmountText
    : typeof card?.amount === 'number' || typeof card?.amount === 'string'
      ? card?.type === 'sleep'
        ? resolveSleepAmountText()
        : `${card?.amount} ${unitText}`.trim()
      : '';

  const prefix = isNursing
    ? 'Nursing'
    : card?.type === 'feed'
      ? 'Feed'
      : card?.type === 'sleep'
        ? 'Sleep'
        : 'Diaper';

  const scheduledTimeMs = Number.isFinite(Number(card?.timeMs))
    ? Number(card.timeMs)
    : Number.isFinite(card?.hour)
      ? new Date(new Date().setHours(card.hour, card.minute || 0, 0, 0)).getTime()
      : null;
  const scheduledLabelTimeDate = Number.isFinite(scheduledTimeMs) ? new Date(scheduledTimeMs) : null;

  const [activeElapsedMs, setActiveElapsedMs] = useState(() => {
    if (isActiveSleep && typeof card?.startTime === 'number') {
      return Math.max(0, Date.now() - card.startTime);
    }
    return 0;
  });

  const photoList = card?.photoURLs || card?.photoUrls || card?.photos;
  const photoUrls = normalizePhotoUrls(photoList);
  const hasPhotos = photoUrls.length > 0;
  const hasNote = Boolean(card?.note || card?.notes);
  const hasDetails =
    typeof hasDetailsProp === 'boolean'
      ? hasDetailsProp
      : hasNote || hasPhotos || isNursing || isSolids;
  const showChevron = isLogged && hasDetails && !isActiveSleep && allowItemExpand;
  const noteText = card?.note || card?.notes || '';

  const recentMs = 60 * 1000;
  const startTimestamp =
    typeof card?.timestamp === 'number'
      ? card.timestamp
      : typeof card?.startTime === 'number'
        ? card.startTime
        : null;
  const isJustNow =
    typeof startTimestamp === 'number' &&
    Date.now() - startTimestamp >= 0 &&
    Date.now() - startTimestamp <= recentMs;

  const resolvedEndTime =
    typeof card?.endTime === 'number'
      ? formatTime12Hour(card.endTime)
      : card?.endTime;

  const feedAccent = isNursing
    ? nursing.primary
    : isSolids
      ? solids.primary
      : bottle.primary;

  const scheduledLabel =
    card?.type === 'feed'
      ? 'Feed'
      : card?.type === 'sleep'
        ? getSleepLabel(scheduledLabelTimeDate, sleepSettings)
        : 'Diaper';

  const labelText = isScheduled
    ? scheduledLabel
    : isActiveSleep
      ? formatSleepDuration(activeElapsedMs)
      : isSolids && card?.label
        ? card.label
        : amountText
          ? isLogged
            ? amountText
            : `${prefix} ~${amountText}`
          : isLogged
            ? ''
            : prefix;

  useEffect(() => {
    if (!isActiveSleep) return;
    const startTime = typeof card?.startTime === 'number' ? card.startTime : null;
    if (!startTime) {
      setActiveElapsedMs(0);
      return;
    }
    const tick = () => setActiveElapsedMs(Math.max(0, Date.now() - startTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [card?.startTime, isActiveSleep]);

  const iconBg =
    card?.type === 'feed'
      ? colorMix(feedAccent, colors.inputBg || '#F5F5F7', 20)
      : card?.type === 'sleep'
        ? colorMix(sleep.primary, colors.inputBg || '#F5F5F7', 20)
        : colorMix(diaper.primary, colors.inputBg || '#F5F5F7', 20);

  const IconComponent =
    card?.type === 'feed'
      ? isNursing
        ? NursingIcon
        : isSolids
          ? SolidsIcon
          : BottleIcon
      : card?.type === 'sleep'
        ? SleepIcon
        : DiaperIcon;

  const timeText =
    card?.type === 'sleep' && resolvedEndTime
      ? `${isLogged && isJustNow ? 'Just now' : card?.time} – ${resolvedEndTime}`
      : isLogged && isJustNow
        ? 'Just now'
        : card?.time;

  // Web: sleep-soft-medium for active sleep (color-mix sleep ~20%)
  const activeSleepBg = colorMix(sleep.primary, colors.timelineItemBg || colors.card, 20);

  // Animations
  const chevronRotate = useSharedValue(isExpanded ? 180 : 0);
  const detailsProgress = useSharedValue(isExpanded ? 1 : 0);
  const zzzY = useSharedValue(0);
  const zzzOpacity = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const badgeOpacity = useSharedValue(0.8);

  useEffect(() => {
    chevronRotate.value = withTiming(
      isExpanded ? 180 : 0,
      { duration: CHEVRON_ROTATE_MS, easing: TIMELINE_EASE }
    );
  }, [isExpanded, chevronRotate]);

  useEffect(() => {
    detailsProgress.value = withTiming(isExpanded ? 1 : 0, {
      duration: isExpanded ? DETAILS_ENTER_MS : DETAILS_EXIT_MS,
      easing: TIMELINE_EASE,
    });
  }, [isExpanded, detailsProgress]);

  useEffect(() => {
    if (isActiveSleep) {
      badgeScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      badgeOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.8, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [isActiveSleep, badgeScale, badgeOpacity]);

  useEffect(() => {
    if (isActiveSleep) {
      zzzY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      zzzOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [isActiveSleep, zzzY, zzzOpacity]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value}deg` }],
  }));

  const zzzStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: zzzY.value }],
    opacity: zzzOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const detailsInnerStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      detailsProgress.value,
      [0, 1],
      [0, DETAILS_MAX_HEIGHT],
      Extrapolation.CLAMP
    ),
    opacity: detailsProgress.value,
    paddingTop: interpolate(
      detailsProgress.value,
      [0, 1],
      [0, DETAILS_PADDING_TOP],
      Extrapolation.CLAMP
    ),
    paddingBottom: interpolate(
      detailsProgress.value,
      [0, 1],
      [0, DETAILS_PADDING_BOTTOM],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          detailsProgress.value,
          [0, 1],
          [-2, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const renderSolidsFoodDetails = (food, idx) => {
    const foodDef =
      FOOD_MAP[food.id] ||
      Object.values(FOOD_MAP).find(
        (item) =>
          String(item?.name || '').toLowerCase() === String(food?.name || '').toLowerCase()
      ) ||
      null;
    const foodEmoji = foodDef?.emoji || food.emoji || '🍽️';
    const detailParts = [];
    if (food.preparation) {
      const prep = formatPrep(food.preparation);
      if (prep) detailParts.push(prep);
    }
    if (food.amount) {
      const amount = formatAmount(food.amount);
      if (amount) detailParts.push(amount);
    }
    if (food.reaction) {
      const reaction = formatReaction(food.reaction);
      if (reaction) detailParts.push(reaction);
    }
    return (
      <View key={`${card?.id}-food-${idx}`} style={styles.foodRow}>
        <View style={styles.foodEmojiWrap}>
          <Text style={styles.foodEmoji}>{foodEmoji}</Text>
        </View>
        <View style={styles.foodDetails}>
          <Text style={[styles.foodName, { color: colors.textPrimary }]}>{food.name}</Text>
          {detailParts.length > 0 && (
            <Text style={[styles.foodMeta, { color: colors.textTertiary }]}>
              {detailParts.join(' • ')}
            </Text>
          )}
          {food.notes && (
            <Text style={[styles.foodNotes, { color: colors.textTertiary }]}>{food.notes}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isActiveSleep
            ? activeSleepBg
            : isLogged
              ? colors.timelineItemBg || colors.card
              : colors.appBg,
          borderColor: isActiveSleep
            ? sleep.primary
            : isLogged
              ? colors.cardBorder || colors.borderSubtle
              : colors.textTertiary,
          borderStyle: !isLogged || isActiveSleep ? 'dashed' : 'solid',
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
      <View style={styles.inner}>
        {/* Icon with bottle rotate(20deg) for bottle */}
        <View
          style={[
            styles.iconWrap,
            {
              width: iconWrapSize,
              height: iconWrapSize,
              backgroundColor: iconBg,
              opacity: isScheduledGray ? 0.5 : 1,
            },
          ]}
        >
          <View
            style={
              card?.type === 'feed' && !isNursing
                ? { transform: [{ rotate: '20deg' }] }
                : undefined
            }
          >
            <IconComponent
              size={iconSize}
              color={
                card?.type === 'feed'
                  ? feedAccent
                  : card?.type === 'sleep'
                    ? sleep.primary
                    : diaper.primary
              }
            />
          </View>
          {/* Status badge with pulse for active sleep */}
          <View style={[styles.badge, { backgroundColor: colors.timelineItemBg || colors.card }]}>
            {isActiveSleep ? (
              <Animated.View
                style={[
                  styles.dot,
                  { backgroundColor: sleep.primary },
                  badgeStyle,
                ]}
              />
            ) : isLogged ? (
              <Text style={styles.check}>✓</Text>
            ) : (
              <Text style={[styles.clock, { color: colors.textSecondary }]}>○</Text>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActiveSleep
                      ? sleep.primary
                      : isLogged
                        ? colors.textPrimary
                        : colors.textTertiary,
                    fontWeight: isLogged ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {labelText}
              </Text>
              {isActiveSleep && (
                <Animated.Text style={[styles.zzz, { color: sleep.primary }, zzzStyle]}>
                  z Z z
                </Animated.Text>
              )}
            </View>
            <View style={styles.metaRow}>
              {isLogged && hasDetails && (
                <View style={styles.detailIndicators}>
                  {hasNote && <NoteIcon size={16} color={colors.textTertiary} />}
                  {hasPhotos && <PhotoIcon size={16} color={colors.textTertiary} />}
                </View>
              )}
              <Text
                style={[
                  styles.time,
                  {
                    color: isLogged || isScheduled ? colors.textSecondary : colors.textTertiary,
                  },
                ]}
              >
                {timeText}
              </Text>
              {showChevron && (
                <Animated.View style={[styles.chevronWrap, chevronStyle]}>
                  <ChevronDownIcon size={20} color={colors.textSecondary} />
                </Animated.View>
              )}
              {isActiveSleep && onActiveSleepClick && (
                <Pressable
                  style={({ p }) => [
                    styles.openTimerBtn,
                    { backgroundColor: sleep.primary },
                    p && { opacity: 0.9 },
                  ]}
                  onPress={() => onActiveSleepClick(card)}
                >
                  <Text style={styles.openTimerText}>Open Timer</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Expanded details with layout animation */}
          {hasDetails && (
            <Animated.View
              layout={Layout.duration(DETAILS_LAYOUT_MS).easing(TIMELINE_EASE)}
              style={styles.details}
            >
              <Animated.View
                pointerEvents={isExpanded ? 'auto' : 'none'}
                style={[styles.detailsInner, detailsInnerStyle]}
              >
                  {isNursing && (
                    <View style={styles.nursingDetails}>
                      <Text
                        style={[styles.detailText, { color: colors.textSecondary }]}
                      >{`Left ${formatNursingDuration(Number(card?.leftDurationSec || 0))} • Right ${formatNursingDuration(Number(card?.rightDurationSec || 0))}`}</Text>
                      {card?.lastSide && (
                        <Text
                          style={[styles.detailText, { color: colors.textTertiary }]}
                        >{`Last side: ${String(card.lastSide).charAt(0).toUpperCase()}${String(card.lastSide).slice(1)}`}</Text>
                      )}
                    </View>
                  )}
                  {isSolids &&
                    Array.isArray(card?.foods) &&
                    card.foods.length > 0 &&
                    card.foods.map((food, idx) => renderSolidsFoodDetails(food, idx))}
                  {hasNote && (
                    <Text
                      style={[styles.noteText, { color: colors.textSecondary }]}
                      numberOfLines={4}
                    >
                      {noteText}
                    </Text>
                  )}
                  {hasPhotos && (
                    <View style={styles.photoRow}>
                      {photoUrls.slice(0, 3).map((url, idx) => (
                        <Pressable
                          key={`${card?.id}-photo-${idx}`}
                          onPress={() => onPhotoClick?.(url)}
                        >
                          <Image
                            source={{ uri: url }}
                            style={styles.photoThumb}
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconWrap: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  check: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '700',
  },
  clock: {
    fontSize: 10,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  zzz: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  time: {
    fontSize: 12,
  },
  chevronWrap: {},
  openTimerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  openTimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  details: {
    overflow: 'hidden',
  },
  detailsInner: {
    gap: 12,
  },
  nursingDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  foodEmojiWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodEmoji: {
    fontSize: 14,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
  },
  foodMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  foodNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
});
