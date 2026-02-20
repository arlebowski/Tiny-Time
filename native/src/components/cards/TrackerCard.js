import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import { ChevronRightIcon } from '../icons';

const SHOW_COMPARISON_ALIGNMENT_GUIDE = false;
// Plain English: move the comparison chicklet up/down to visually match text baseline.
// Negative = up, positive = down.
const CHICKLET_BASELINE_OFFSET = 0;
// Plain English: nudge the chevron visual edge right/left for exact alignment with chicklet.
// Positive = right, negative = left.
const CHEVRON_RIGHT_NUDGE = 0;
// Plain English: change this one number to move ONLY the big value text on every card.
// This does NOT change card height. Example: 10 moves down 10px, -10 moves up 10px.
const BIG_VALUE_TRANSLATE_Y = 10;
// Plain English: change this one number to move the big value text left/right on every card.
// Positive = move right, negative = move left.
const BIG_VALUE_TRANSLATE_X = 0;
// Plain English: change this one number to make every tracker card taller/shorter.
// Positive = taller, negative = shorter.
const CARD_HEIGHT_ADJUST = 2;
// Plain English: change this one number to control the gap between header row and value row.
// Positive = bigger gap, negative = tighter gap.
const HEADER_FOOTER_GAP = 36;

/**
 * TrackerCard — base card matching web TrackerCard v4 layout.
 *
 * Web source: rounded-2xl p-5 shadow-sm, var(--tt-card-bg)
 * Header:  flex items-center justify-between mb-[36px] h-6
 *   Left:  text-[18px] font-semibold inline-flex items-center gap-[5px]
 *   Right: inline-flex items-center gap-2, text-[15px] font-normal, var(--tt-text-tertiary)
 * Value:   text-[48px] leading-none font-bold
 * Unit:    text-[28px] leading-none font-normal, var(--tt-text-tertiary)
 */
const TrackerCard = ({
  // Header left
  title,
  icon,
  accentColor,
  // Header right
  statusText,
  // Big number — either pass `value`+`unit` or `valueElement` for custom layout (nursing)
  value,
  unit,
  valueElement,
  // Comparison chicklet (rendered to the right of value row)
  comparisonElement,
  // Optional right-side element (used by diaper icon matrix)
  rightElement,
  // Extra content below value row
  children,
  onPress,
}) => {
  const { colors, radius } = useTheme();
  const hasComparison = !!comparisonElement;
  const hasRightElement = !!rightElement;
  const hasTrailingElement = hasComparison || hasRightElement;
  const shouldRotateBottleIcon = title === 'Bottle';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderRadius: radius?.['2xl'] ?? 16,
          paddingBottom: 20 + CARD_HEIGHT_ADJUST,
        },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {icon ? (
            typeof icon === 'string' ? (
              <Text
                style={[
                  styles.headerIcon,
                  { color: accentColor },
                  shouldRotateBottleIcon && styles.bottleIconRotate,
                ]}
              >
                {icon}
              </Text>
            ) : (
              <View style={[styles.headerIconWrap, shouldRotateBottleIcon && styles.bottleIconRotate]}>{icon}</View>
            )
          ) : null}
          <Text style={[styles.headerLabel, { color: accentColor }]}>{title}</Text>
        </View>
        {statusText ? (
          <View style={styles.headerRight}>
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>{statusText}</Text>
            <View style={styles.chevronWrap}>
              <ChevronRightIcon size={20} color={colors.textTertiary} />
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Big number row ── */}
      <View style={[
        styles.valueRow,
        hasTrailingElement ? styles.valueRowWithComparison : styles.valueRowNoComparison,
      ]}>
        {hasTrailingElement && SHOW_COMPARISON_ALIGNMENT_GUIDE ? (
          <View style={styles.comparisonGuideLine} pointerEvents="none" />
        ) : null}
        <View style={styles.valueContentOffset}>
          {valueElement ? (
            valueElement
          ) : (
            <View style={styles.valueLeft}>
              <Text style={[styles.value, { color: accentColor }]}>
                {value ?? '0'}
              </Text>
              {unit ? (
                <Text style={[styles.unit, { color: colors.textTertiary }]}>{unit}</Text>
              ) : null}
            </View>
          )}
        </View>
        {rightElement ? (
          <View style={styles.comparisonWrap}>
            {rightElement}
          </View>
        ) : comparisonElement ? (
          <View style={styles.comparisonWrap}>
            {comparisonElement}
          </View>
        ) : null}
      </View>

      {children}
    </Pressable>
  );
};

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const styles = StyleSheet.create({
  // Web: rounded-2xl p-5 shadow-sm
  card: {
    padding: 20,                      // p-5
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],   // web whileTap scale
  },

  // Web: flex items-center justify-between mb-[36px]
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
    marginBottom: HEADER_FOOTER_GAP,
  },

  // Web: text-[18px] font-semibold inline-flex items-center gap-[5px]
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,                           // gap-[5px]
  },
  headerIcon: {
    fontSize: 22,                     // w-[22px] h-[22px] — emoji stand-in
  },
  headerIconWrap: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleIconRotate: {
    transform: [{ rotate: '20deg' }],
  },
  headerLabel: {
    fontSize: 18,                     // text-[18px]
    fontWeight: FW.semibold,                // font-semibold
  },

  // Web: inline-flex items-center gap-2
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,                           // gap-2
  },
  // Web: text-[15px] font-normal leading-none
  statusText: {
    fontSize: 15,                     // text-[15px]
    fontWeight: FW.normal,                // font-normal
  },
  chevronWrap: {
    marginRight: CHEVRON_RIGHT_NUDGE,
  },
  // Big-number row base: flex
  valueRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  // Web with comparison: flex items-end justify-between gap-3 mb-0
  valueRowWithComparison: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,                          // gap-3
    marginBottom: 0,
  },
  // Keep no-comparison cards on the same edge anchoring as comparison cards.
  valueRowNoComparison: {
    alignItems: 'baseline',
    gap: 6,                           // gap-1.5
    marginBottom: 0,
  },

  // Keep text-baseline alignment for the value + unit pair.
  valueLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,                           // gap-[4px]
  },
  valueContentOffset: {
    transform: [
      { translateX: BIG_VALUE_TRANSLATE_X },
      { translateY: BIG_VALUE_TRANSLATE_Y },
    ],
  },
  comparisonWrap: {
    // Chicklet visual baseline tuning knob.
    marginBottom: CHICKLET_BASELINE_OFFSET,
  },
  comparisonGuideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: CHICKLET_BASELINE_OFFSET,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 59, 48, 0.65)',
  },

  // Web: text-[48px] leading-none font-bold
  value: {
    fontSize: 48,                     // text-[48px]
    fontWeight: FW.bold,                // font-bold
    lineHeight: 48,                   // leading-none
    includeFontPadding: false,
  },

  // Web: text-[28px] leading-none font-normal
  unit: {
    fontSize: 28,                     // text-[28px]
    fontWeight: FW.normal,                // font-normal
    lineHeight: 28,                   // leading-none
    includeFontPadding: false,
  },
});

export default TrackerCard;
