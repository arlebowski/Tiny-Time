/**
 * DetailSheet — 1:1 port from web/components/tabs/TrackerDetailTab.js
 * Full-screen detail view with calendar, summary cards, and timeline.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import HorizontalCalendar from '../components/shared/HorizontalCalendar';
import SegmentedToggle from '../components/shared/SegmentedToggle';
import Timeline from '../components/Timeline/Timeline';
import { ChevronLeftIcon, BottleIcon, NursingIcon, SolidsIcon, SleepIcon, DiaperIcon, DiaperWetIcon, DiaperPooIcon } from '../components/icons';
import { formatV2Number } from '../components/cards/cardUtils';
import { getMockTimelineItems, getMockDaySummary } from '../utils/mockDetailData';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DETAIL_SECTION_GAP = 12;

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Feed', value: 'feed' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Diaper', value: 'diaper' },
];

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
  comparison,
  subline,
  rotateIcon = false,
  colors,
}) {
  const padding = isCompact ? 10 : 14;
  const valueSize = isCompact ? 22 : 24;
  const unitSize = isCompact ? 15 : 17.6;
  const iconSize = isCompact ? 22 : 24;
  const comparisonDelta = Number(comparison?.delta || 0);
  const comparisonIsZero = Math.abs(comparisonDelta) < 0.05;
  const comparisonText = comparisonIsZero
    ? 'Even'
    : `${formatV2Number(Math.abs(comparisonDelta))}${comparison?.unit ? ` ${comparison.unit}` : ''}`;
  const comparisonColor = comparisonIsZero
    ? colors.textTertiary
    : (comparisonDelta >= 0 ? colors.positive : colors.negative);
  const paceText = comparisonIsZero
    ? 'on pace'
    : (comparisonDelta >= 0 ? 'ahead of pace' : 'behind pace');
  const footerContent = comparison ? (
    <View style={[styles.summaryComparison, isCompact ? styles.summaryComparisonCompact : null]}>
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
    </View>
  ) : subline;

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding }]}>
      <View style={styles.summaryCardInner}>
        {/* Icon + value + unit row */}
        <View style={[styles.summaryValueRow, isCompact ? styles.summaryValueRowCompact : null]}>
          {IconComponent ? (
            <IconComponent
              size={iconSize}
              color={color}
              style={rotateIcon ? styles.summaryIconRotate : styles.summaryIconBase}
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
        </View>

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
  const [summary, setSummary] = useState({
    feedOz: 0,
    nursingMs: 0,
    solidsCount: 0,
    sleepMs: 0,
    diaperCount: 0,
    diaperWetCount: 0,
    diaperPooCount: 0,
  });

  // Load data for selected date
  const loadData = useCallback((date) => {
    const items = getMockTimelineItems(date);
    const sum = getMockDaySummary(date);
    setTimelineItems(items);
    setSummary(sum);
  }, []);

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

  // Computed display values
  const feedDisplay = formatV2Number(summary.feedOz);
  const nursingHours = (summary.nursingMs || 0) / 3600000;
  const nursingDisplay = formatV2Number(nursingHours);
  const solidsCount = Number(summary.solidsCount || 0);
  const solidsDisplay = formatV2Number(solidsCount);
  const sleepHours = (summary.sleepMs || 0) / 3600000;
  const sleepDisplay = formatV2Number(sleepHours);
  const diaperDisplay = formatV2Number(summary.diaperCount || 0);
  const diaperUnit = summaryLayoutMode === 'all' ? '' : 'changes';

  // Mock comparisons (will be replaced with real avg computation)
  const feedComparison = { delta: 2.5, unit: 'oz' };
  const nursingComparison = { delta: 0.7, unit: 'hrs' };
  const solidsComparison = { delta: 0.4, unit: 'foods' };
  const sleepComparison = { delta: -0.8, unit: 'hrs' };
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
          style={isHorizontalScrollMode ? { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth } : styles.summaryGridItem}
        >
          <SummaryCard
            icon={BottleIcon}
            color={bottle.primary}
            value={feedDisplay}
            unit="oz"
            isCompact={isAllCompactMode}
            comparison={feedComparison}
            rotateIcon
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
          style={isHorizontalScrollMode ? { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth } : styles.summaryGridItem}
        >
          <SummaryCard
            icon={NursingIcon}
            color={nursing.primary}
            value={nursingDisplay}
            unit="hrs"
            isCompact={isAllCompactMode}
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
          style={isHorizontalScrollMode ? { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth } : styles.summaryGridItem}
        >
          <SummaryCard
            icon={SolidsIcon}
            color={solids.primary}
            value={solidsDisplay}
            unit="foods"
            isCompact={isAllCompactMode}
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
          style={isHorizontalScrollMode ? { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth } : styles.summaryGridFull}
        >
          <SummaryCard
            icon={SleepIcon}
            color={sleep.primary}
            value={sleepDisplay}
            unit="hrs"
            isCompact={isAllCompactMode}
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
          style={isHorizontalScrollMode ? { width: isFeedThreeMode ? twoColCardWidth : allModeCardWidth } : styles.summaryGridFull}
        >
          <SummaryCard
            icon={DiaperIcon}
            color={diaper.primary}
            value={diaperDisplay}
            unit={diaperUnit}
            isCompact={isAllCompactMode}
            comparison={diaperComparison}
            subline={diaperSubline}
            colors={colors}
          />
        </View>
      );
    }

    return cards;
  }, [
    summaryLayoutMode, isAllCompactMode, isFeedThreeMode, isHorizontalScrollMode, allModeCardWidth, twoColCardWidth,
    bottle.primary, nursing.primary, solids.primary, sleep.primary, diaper.primary,
    feedDisplay, nursingDisplay, solidsDisplay, sleepDisplay, diaperDisplay, diaperUnit,
    hasNursingSummary, hasSolidsSummary, feedComparison, nursingComparison, solidsComparison, sleepComparison, diaperComparison, diaperSubline, colors,
  ]);

  // Back button for calendar header
  const calendarHeaderLeft = useMemo(
    () => (
      <Pressable onPress={onBack} style={styles.backButton}>
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
      handleSummaryToggleChange, isHorizontalScrollMode, feedSummaryCount, appBgTransparent, summaryCards, colors.appBg,
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
        allowItemExpand
        hideFilter
        ListHeaderComponent={listHeader}
      />
    </View>
  );
}

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
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
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
    gap: 12,
    paddingBottom: 4,
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
    fontWeight: '700',
    lineHeight: undefined,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  summaryUnit: {
    fontWeight: '400',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
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
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  summaryComparisonValue: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  summaryComparisonCompact: {
    flexDirection: 'column',
  },
  summaryPaceText: {
    fontSize: 12,
    fontWeight: '400',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
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
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
