/**
 * DetailSheet — 1:1 port from web/components/tabs/TrackerDetailTab.js
 * Full-screen detail view with calendar, summary cards, and timeline.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import HorizontalCalendar from '../components/shared/HorizontalCalendar';
import SegmentedToggle from '../components/shared/SegmentedToggle';
import Timeline from '../components/Timeline/Timeline';
import { ChevronLeftIcon, BottleIcon, NursingIcon, SolidsIcon, SleepIcon, DiaperIcon, DiaperWetIcon, DiaperPooIcon } from '../components/icons';
import { formatV2Number, formatVolume } from '../components/cards/cardUtils';
import { useData } from '../context/DataContext';
import {
  TT_AVG_EVEN_EPSILON,
  startOfDayMsLocal,
  bucketIndexCeilFromMs,
  buildFeedAvgBuckets,
  buildNursingAvgBuckets,
  buildSolidsAvgBuckets,
  buildSleepAvgBuckets,
  calcFeedCumulativeAtBucket,
  calcNursingCumulativeAtBucket,
  calcSolidsCumulativeAtBucket,
  calcSleepCumulativeAtBucket,
} from '../../../shared/utils/trackerComparisons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DETAIL_SECTION_GAP = 12;

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Feed', value: 'feed' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Diaper', value: 'diaper' },
];
const PTR_MIN_VISIBLE_MS = 600;
const PTR_IOS_OFFSET = 88;

// expo-linear-gradient treats "transparent" as rgba(0,0,0,0), which can tint dark.
function hexToTransparentRgba(hex) {
  const h = (hex || '#FFFFFF').replace('#', '').slice(0, 6);
  if (h.length !== 6) return 'rgba(255,255,255,0)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 'rgba(255,255,255,0)';
  return `rgba(${r},${g},${b},0)`;
}

// ── Summary card (inline, matches web renderSummaryCard) ──
function SummaryCard({
  icon: IconComponent,
  color,
  value,
  unit,
  isCompact,
  fillHeight = false,
  comparison,
  subline,
  rotateIcon = false,
  iconAdjustments,
  colors,
}) {
  const valueAnim = React.useRef(new Animated.Value(1)).current;
  const comparisonAnim = React.useRef(new Animated.Value(1)).current;
  const lastComparisonAnimRef = React.useRef({ sig: '', at: 0 });
  const padding = isCompact ? 10 : 14;
  const valueSize = isCompact ? 22 : 24;
  const unitSize = isCompact ? 15 : 17.6;
  const iconSize = isCompact ? 22 : 24;
  const comparisonHasDelta = comparison?.delta != null;
  const comparisonDelta = Number(comparison?.delta || 0);
  const comparisonEpsilon = Number.isFinite(comparison?.evenEpsilon) ? comparison.evenEpsilon : 0.05;
  const comparisonIsZero = comparisonHasDelta ? Math.abs(comparisonDelta) < comparisonEpsilon : true;
  const comparisonText = comparisonIsZero
    ? 'Even'
    : `${formatV2Number(Math.abs(comparisonDelta))}${comparison?.unit ? ` ${comparison.unit}` : ''}`;
  const comparisonColor = comparisonIsZero
    ? colors.textTertiary
    : (comparisonDelta >= 0 ? colors.positive : colors.negative);
  const paceText = comparisonIsZero
    ? 'on pace'
    : (comparisonDelta >= 0 ? 'ahead of pace' : 'behind pace');

  useEffect(() => {
    valueAnim.setValue(0);
    Animated.timing(valueAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [valueAnim, value, unit, color, isCompact, rotateIcon, IconComponent]);

  useEffect(() => {
    const sig = `${comparisonText}|${paceText}|${comparisonColor}|${comparisonIsZero ? 1 : 0}`;
    const now = Date.now();
    if (
      lastComparisonAnimRef.current.sig === sig
      && now - lastComparisonAnimRef.current.at < 180
    ) {
      return;
    }
    lastComparisonAnimRef.current = { sig, at: now };
    comparisonAnim.setValue(0);
    Animated.timing(comparisonAnim, {
      toValue: 1,
      duration: 220,
      delay: 30,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [comparisonAnim, comparisonText, paceText, comparisonColor, comparisonIsZero]);

  const valueRowAnimatedStyle = {
    opacity: valueAnim,
    transform: [
      {
        translateY: valueAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        }),
      },
      {
        scale: valueAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };
  const comparisonAnimatedStyle = {
    opacity: comparisonAnim,
    transform: [
      {
        translateY: comparisonAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-5, 0],
        }),
      },
      {
        scale: comparisonAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  const footerContent = comparisonHasDelta ? (
    <Animated.View style={[styles.summaryComparison, isCompact ? styles.summaryComparisonCompact : null, comparisonAnimatedStyle]}>
      <View style={styles.summaryComparisonValueRow}>
        {!comparisonIsZero && (
          <Text style={[styles.summaryComparisonArrow, { color: comparisonColor }]}>
            {comparisonDelta >= 0 ? '↑' : '↓'}
          </Text>
        )}
        <Text style={[styles.summaryComparisonValue, { color: comparisonColor }]}>
          {comparisonText}
        </Text>
      </View>
      {!isCompact && (
        <Text style={[styles.summaryPaceText, { color: colors.textTertiary }]}>
          {paceText}
        </Text>
      )}
    </Animated.View>
  ) : subline;

  return (
    <View style={[styles.summaryCard, fillHeight ? styles.summaryCardFillHeight : null, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding }]}>
      <View style={styles.summaryCardInner}>
        {/* Icon + value + unit row */}
        <Animated.View style={[styles.summaryValueRow, isCompact ? styles.summaryValueRowCompact : null, valueRowAnimatedStyle]}>
          {IconComponent ? (
            <IconComponent
              size={iconSize}
              color={color}
              style={[
                rotateIcon ? styles.summaryIconRotate : styles.summaryIconBase,
                iconAdjustments,
              ]}
            />
          ) : (
            <View style={[styles.summaryIconPlaceholder, { width: iconSize, height: iconSize, backgroundColor: colors.segTrack }]} />
          )}
          <Text style={[styles.summaryValue, { color, fontSize: valueSize }]}>
            {value}
          </Text>
          {unit ? (
            <Text style={[styles.summaryUnit, { color: colors.textTertiary, fontSize: unitSize }]}>
              {unit}
            </Text>
          ) : null}
        </Animated.View>

        {/* Comparison or subline */}
        {footerContent}
      </View>
    </View>
  );
}

// ── Main DetailSheet ──
export default function DetailSheet({
  initialFilter = 'all',
  onBack,
  onOpenSheet,
  onEditCard,
  onDeleteCard,
  timelineRefreshRef,
  activityVisibility = null,
}) {
  const { colors, bottle, nursing, solids, sleep, diaper } = useTheme();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summaryLayoutMode, setSummaryLayoutMode] = useState(initialFilter || 'all');
  const [timelineFilter, setTimelineFilter] = useState(initialFilter || 'all');
  const [timelineItems, setTimelineItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    feedOz: 0,
    nursingMs: 0,
    solidsCount: 0,
    sleepMs: 0,
    diaperCount: 0,
    diaperWetCount: 0,
    diaperPooCount: 0,
  });

  const {
    getTimelineItems,
    getDaySummary,
    kidSettings,
    dataLoading,
    refresh,
    feedings,
    nursingSessions,
    solidsSessions,
    sleepSessions,
    activeSleep,
  } = useData();
  const preferredVolumeUnit = kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';

  // Load data for selected date
  const loadData = useCallback((date) => {
    const items = getTimelineItems(date);
    const sum = getDaySummary(date);
    setTimelineItems(items);
    setSummary(sum);
  }, [getTimelineItems, getDaySummary]);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  // Wire refresh ref so input sheets can trigger reload
  useEffect(() => {
    if (timelineRefreshRef) {
      timelineRefreshRef.current = () => loadData(selectedDate);
    }
    return () => {
      if (timelineRefreshRef) {
        timelineRefreshRef.current = null;
      }
    };
  }, [timelineRefreshRef, selectedDate, loadData]);

  // Calendar date selection
  const handleDateSelect = useCallback((payload) => {
    if (payload?.date) {
      setSelectedDate(payload.date);
    }
  }, []);

  // Outer toggle changes → update summary mode + sync Timeline filter
  const handleSummaryToggleChange = useCallback((nextFilter) => {
    if (!nextFilter) return;
    setSummaryLayoutMode(nextFilter);
    setTimelineFilter(nextFilter);
  }, []);

  // Timeline internal toggle changes → sync outer state
  const handleTimelineFilterChange = useCallback((nextFilter) => {
    if (!nextFilter) return;
    setSummaryLayoutMode(nextFilter);
  }, []);

  // Open input sheet for adding entries
  const handleActiveSleepClick = useCallback(() => {
    onOpenSheet?.('sleep');
  }, [onOpenSheet]);
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const refreshStartedAt = Date.now();
    try {
      await refresh?.();
    } finally {
      const elapsedMs = Date.now() - refreshStartedAt;
      const remainingMs = PTR_MIN_VISIBLE_MS - elapsedMs;
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
      }
      setRefreshing(false);
    }
  }, [refresh, refreshing]);

  // Computed display values
  const feedDisplay = formatVolume(summary.feedOz, preferredVolumeUnit);
  const nursingHours = (summary.nursingMs || 0) / 3600000;
  const nursingDisplay = formatV2Number(nursingHours);
  const solidsCount = Number(summary.solidsCount || 0);
  const solidsDisplay = formatV2Number(solidsCount);
  const sleepHours = (summary.sleepMs || 0) / 3600000;
  const sleepDisplay = formatV2Number(sleepHours);
  const diaperDisplay = formatV2Number(summary.diaperCount || 0);
  const diaperUnit = summaryLayoutMode === 'all' ? '' : 'changes';

  const nowMs = Date.now();
  const nowBucketIndex = bucketIndexCeilFromMs(nowMs);
  const avgTodayStartMs = startOfDayMsLocal(nowMs);
  const avgTodayEndMs = avgTodayStartMs + 86400000;
  const selectedStartMs = startOfDayMsLocal(selectedDate.getTime());
  const isViewingToday = selectedStartMs === avgTodayStartMs;
  const feedAvg = useMemo(
    () => buildFeedAvgBuckets(feedings, avgTodayStartMs),
    [feedings, avgTodayStartMs]
  );
  const nursingAvg = useMemo(
    () => buildNursingAvgBuckets(nursingSessions, avgTodayStartMs),
    [nursingSessions, avgTodayStartMs]
  );
  const solidsAvg = useMemo(
    () => buildSolidsAvgBuckets(solidsSessions, avgTodayStartMs),
    [solidsSessions, avgTodayStartMs]
  );
  const sleepAvg = useMemo(
    () => buildSleepAvgBuckets(sleepSessions, avgTodayStartMs),
    [sleepSessions, avgTodayStartMs]
  );
  const feedAvgValue = feedAvg?.buckets?.[nowBucketIndex];
  const nursingAvgValue = nursingAvg?.buckets?.[nowBucketIndex];
  const solidsAvgValue = solidsAvg?.buckets?.[nowBucketIndex];
  const sleepAvgValue = sleepAvg?.buckets?.[nowBucketIndex];
  const todayFeedValue = useMemo(
    () => calcFeedCumulativeAtBucket(feedings, nowBucketIndex, avgTodayStartMs, avgTodayEndMs),
    [feedings, nowBucketIndex, avgTodayStartMs, avgTodayEndMs]
  );
  const todayNursingValue = useMemo(
    () => calcNursingCumulativeAtBucket(nursingSessions, nowBucketIndex, avgTodayStartMs, avgTodayEndMs),
    [nursingSessions, nowBucketIndex, avgTodayStartMs, avgTodayEndMs]
  );
  const todaySolidsValue = useMemo(
    () => calcSolidsCumulativeAtBucket(solidsSessions, nowBucketIndex, avgTodayStartMs, avgTodayEndMs),
    [solidsSessions, nowBucketIndex, avgTodayStartMs, avgTodayEndMs]
  );
  const todaySleepValue = useMemo(
    () => calcSleepCumulativeAtBucket(sleepSessions, nowBucketIndex, avgTodayStartMs, activeSleep, nowMs),
    [sleepSessions, nowBucketIndex, avgTodayStartMs, activeSleep, nowMs]
  );
  const feedComparison = isViewingToday && Number.isFinite(feedAvgValue) && (feedAvg?.daysUsed || 0) > 0
    ? { delta: todayFeedValue - feedAvgValue, unit: 'oz', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;
  const nursingComparison = isViewingToday && Number.isFinite(nursingAvgValue) && (nursingAvg?.daysUsed || 0) > 0
    ? { delta: todayNursingValue - nursingAvgValue, unit: 'hrs', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;
  const solidsComparison = isViewingToday && Number.isFinite(solidsAvgValue) && (solidsAvg?.daysUsed || 0) > 0
    ? { delta: todaySolidsValue - solidsAvgValue, unit: 'foods', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;
  const sleepComparison = isViewingToday && Number.isFinite(sleepAvgValue) && (sleepAvg?.daysUsed || 0) > 0
    ? { delta: todaySleepValue - sleepAvgValue, unit: 'hrs', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;
  const diaperComparison = null;

  const activityVisibilitySafe = useMemo(() => {
    const base = { bottle: true, nursing: true, sleep: true, diaper: true };
    if (!activityVisibility || typeof activityVisibility !== 'object') return base;
    return {
      bottle: typeof activityVisibility.bottle === 'boolean' ? activityVisibility.bottle : base.bottle,
      nursing: typeof activityVisibility.nursing === 'boolean' ? activityVisibility.nursing : base.nursing,
      sleep: typeof activityVisibility.sleep === 'boolean' ? activityVisibility.sleep : base.sleep,
      diaper: typeof activityVisibility.diaper === 'boolean' ? activityVisibility.diaper : base.diaper,
    };
  }, [activityVisibility]);
  const hasNursingSummary = activityVisibilitySafe.nursing;
  const hasSolidsSummary = solidsCount > 0;

  // Diaper wet/poo tally subline
  const diaperSubline = useMemo(() => {
    const wet = summary.diaperWetCount || 0;
    const poo = summary.diaperPooCount || 0;
    if (wet === 0 && poo === 0) return null;
    return (
      <View style={styles.diaperTally}>
        {wet > 0 && (
          <View style={styles.diaperTallyItem}>
            <DiaperWetIcon size={14} color={diaper.dark || diaper.primary} />
            <Text style={[styles.diaperTallyText, { color: colors.textTertiary }]}>
              x{wet}
            </Text>
          </View>
        )}
        {poo > 0 && (
          <View style={styles.diaperTallyItem}>
            <DiaperPooIcon size={14} color={diaper.primary} />
            <Text style={[styles.diaperTallyText, { color: colors.textTertiary }]}>
              x{poo}
            </Text>
          </View>
        )}
      </View>
    );
  }, [summary.diaperWetCount, summary.diaperPooCount, diaper.primary, diaper.dark, colors.textTertiary]);

  const feedSummaryCount = 1 + (hasNursingSummary ? 1 : 0) + (hasSolidsSummary ? 1 : 0);
  const isAllCompactMode = summaryLayoutMode === 'all';
  const isFeedThreeMode = summaryLayoutMode === 'feed' && feedSummaryCount >= 3;
  const isFeedTwoColMode = summaryLayoutMode === 'feed' && feedSummaryCount === 2;
  const isHorizontalScrollMode = isAllCompactMode || isFeedThreeMode;
  const allModeCardWidth = (SCREEN_WIDTH - 48) / 3;
  const twoColCardWidth = (SCREEN_WIDTH - 48) / 2;
  const appBgTransparent = useMemo(() => hexToTransparentRgba(colors.appBg), [colors.appBg]);

  // Summary cards section
  const summaryCards = useMemo(() => {
    const cards = [];

    // Feed card — visible when mode is 'all' or 'feed'
    if (summaryLayoutMode !== 'sleep' && summaryLayoutMode !== 'diaper') {
      cards.push(
        <View
          key="feed"
          style={isHorizontalScrollMode ? [styles.summaryScrollItem, { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth }] : styles.summaryGridItem}
        >
          <SummaryCard
            icon={BottleIcon}
            color={bottle.primary}
            value={feedDisplay}
            unit={preferredVolumeUnit}
            isCompact={isAllCompactMode}
            fillHeight={isHorizontalScrollMode || isFeedTwoColMode}
            comparison={feedComparison}
            rotateIcon
            iconAdjustments={{ marginTop: -1, marginRight: -2 }}
            colors={colors}
          />
        </View>
      );
    }

    // Nursing card — visible when mode is 'all' or 'feed'
    if (summaryLayoutMode !== 'sleep' && summaryLayoutMode !== 'diaper' && hasNursingSummary) {
      cards.push(
        <View
          key="nursing"
          style={isHorizontalScrollMode ? [styles.summaryScrollItem, { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth }] : styles.summaryGridItem}
        >
          <SummaryCard
            icon={NursingIcon}
            color={nursing.primary}
            value={nursingDisplay}
            unit="hrs"
            isCompact={isAllCompactMode}
            fillHeight={isHorizontalScrollMode || isFeedTwoColMode}
            comparison={nursingComparison}
            colors={colors}
          />
        </View>
      );
    }

    // Solids card — visible in feed mode when solids are logged
    if (summaryLayoutMode === 'feed' && hasSolidsSummary) {
      cards.push(
        <View
          key="solids"
          style={isHorizontalScrollMode ? [styles.summaryScrollItem, { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth }] : styles.summaryGridItem}
        >
          <SummaryCard
            icon={SolidsIcon}
            color={solids.primary}
            value={solidsDisplay}
            unit="foods"
            isCompact={isAllCompactMode}
            fillHeight={isHorizontalScrollMode || isFeedTwoColMode}
            comparison={solidsComparison}
            colors={colors}
          />
        </View>
      );
    }

    // Sleep card — visible when mode is 'all' or 'sleep'
    if (summaryLayoutMode !== 'feed' && summaryLayoutMode !== 'diaper') {
      cards.push(
        <View
          key="sleep"
          style={isHorizontalScrollMode ? [styles.summaryScrollItem, { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth }] : styles.summaryGridFull}
        >
          <SummaryCard
            icon={SleepIcon}
            color={sleep.primary}
            value={sleepDisplay}
            unit="hrs"
            isCompact={isAllCompactMode}
            fillHeight={isHorizontalScrollMode}
            comparison={sleepComparison}
            colors={colors}
          />
        </View>
      );
    }

    // Diaper card — visible when mode is 'all' or 'diaper'
    if (summaryLayoutMode !== 'feed' && summaryLayoutMode !== 'sleep') {
      cards.push(
        <View
          key="diaper"
          style={isHorizontalScrollMode ? [styles.summaryScrollItem, { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth }] : styles.summaryGridFull}
        >
          <SummaryCard
            icon={DiaperIcon}
            color={diaper.primary}
            value={diaperDisplay}
            unit={diaperUnit}
            isCompact={isAllCompactMode}
            fillHeight={isHorizontalScrollMode}
            comparison={diaperComparison}
            subline={diaperSubline}
            colors={colors}
          />
        </View>
      );
    }

    return cards;
  }, [
    summaryLayoutMode, isAllCompactMode, isFeedThreeMode, isFeedTwoColMode, isHorizontalScrollMode, allModeCardWidth, twoColCardWidth,
    bottle.primary, nursing.primary, solids.primary, sleep.primary, diaper.primary,
    feedDisplay, nursingDisplay, solidsDisplay, sleepDisplay, diaperDisplay, diaperUnit,
    hasNursingSummary, hasSolidsSummary, feedComparison, nursingComparison, solidsComparison, sleepComparison, diaperComparison, diaperSubline, colors,
  ]);

  // Back button for calendar header
  const calendarHeaderLeft = useMemo(
    () => (
      <Pressable onPressIn={onBack} style={styles.backButton}>
        <ChevronLeftIcon size={20} color={colors.textSecondary} />
        <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
      </Pressable>
    ),
    [onBack, colors.textSecondary]
  );

  // Build ListHeaderComponent for Timeline (calendar + toggle + summary)
  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {refreshing ? (
          <View style={[styles.refreshIndicator, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ActivityIndicator size="small" color={colors.brandIcon} />
            <Text style={[styles.refreshIndicatorText, { color: colors.textSecondary }]}>Refreshing...</Text>
          </View>
        ) : null}
        <HorizontalCalendar
          onDateSelect={handleDateSelect}
          headerLeft={calendarHeaderLeft}
        />
        <View style={styles.toggleWrap}>
          <SegmentedToggle
            value={summaryLayoutMode}
            options={FILTER_OPTIONS}
            onChange={handleSummaryToggleChange}
            variant="body"
            size="medium"
            fullWidth
          />
        </View>
        {isHorizontalScrollMode ? (
          <View style={styles.summaryScrollWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryScrollRow}
              style={styles.summaryScroll}
            >
              {summaryCards}
            </ScrollView>
            <LinearGradient
              colors={[appBgTransparent, colors.appBg]}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.summaryScrollFade}
              pointerEvents="none"
            />
          </View>
        ) : (
          <View
            style={[
              styles.summaryGrid,
              summaryLayoutMode === 'feed' && feedSummaryCount === 2 && styles.summaryGridTwoCols,
            ]}
          >
            {summaryCards}
          </View>
        )}
      </View>
    ),
    [
      handleDateSelect, calendarHeaderLeft, summaryLayoutMode,
      handleSummaryToggleChange, isHorizontalScrollMode, feedSummaryCount, appBgTransparent,
      summaryCards, refreshing, colors.appBg, colors.cardBg, colors.cardBorder, colors.textPrimary, colors.textSecondary,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <Timeline
        items={timelineItems}
        initialFilter={timelineFilter}
        onFilterChange={handleTimelineFilterChange}
        onEditCard={onEditCard}
        onDeleteCard={onDeleteCard}
        onActiveSleepClick={handleActiveSleepClick}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        refreshProgressOffset={Platform.OS === 'ios' ? PTR_IOS_OFFSET : 0}
        allowItemExpand
        hideFilter
        suppressEmptyState={dataLoading}
        ListHeaderComponent={listHeader}
      />
    </View>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // List header (above Timeline items)
  listHeader: {
    paddingTop: 4,
    gap: DETAIL_SECTION_GAP,
    marginBottom: DETAIL_SECTION_GAP,
  },
  refreshIndicator: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshIndicatorText: {
    fontSize: 14,
    fontFamily: FWB.medium,
  },
  toggleWrap: {
    marginTop: 0,
    marginBottom: 0,
  },
  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 15,
    fontFamily: FWB.medium,
  },
  // Summary cards — horizontal scroll for 'all' mode
  summaryScrollWrap: {
    marginTop: 0,
    position: 'relative',
  },
  summaryScroll: {
    marginTop: 0,
  },
  summaryScrollRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingBottom: 4,
  },
  summaryScrollItem: {
    alignSelf: 'stretch',
  },
  summaryScrollFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
  // Summary cards — grid for filtered modes
  summaryGrid: {
    marginTop: 0,
    gap: 12,
  },
  summaryGridTwoCols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  summaryGridItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryGridFull: {
    width: '100%',
  },
  // Individual summary card
  summaryCard: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryCardFillHeight: {
    flex: 1,
  },
  summaryCardInner: {
    gap: 8,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    justifyContent: 'center',
  },
  summaryIconBase: {
    marginBottom: 1,
  },
  summaryIconRotate: {
    marginBottom: 1,
    transform: [{ rotate: '20deg' }],
  },
  summaryValueRowCompact: {
    gap: 4,
  },
  summaryValue: {
    fontFamily: FWB.bold,
    lineHeight: undefined,
  },
  summaryUnit: {
    fontFamily: FWB.normal,
  },
  summaryIconPlaceholder: {
    borderRadius: 16,
  },
  // Comparison row
  summaryComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  summaryComparisonValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryComparisonArrow: {
    fontSize: 14,
    fontFamily: FWB.semibold,
  },
  summaryComparisonValue: {
    fontSize: 12,
    fontFamily: FWB.semibold,
    fontVariant: ['tabular-nums'],
  },
  summaryComparisonCompact: {
    flexDirection: 'column',
  },
  summaryPaceText: {
    fontSize: 12,
    fontFamily: FWB.normal,
  },
  // Diaper tally subline
  diaperTally: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  diaperTallyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diaperTallyText: {
    fontSize: 12,
    fontFamily: FWB.normal,
    fontVariant: ['tabular-nums'],
  },
});
