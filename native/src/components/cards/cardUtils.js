import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  formatRelativeTime,
  formatRelativeTimeNoAgo,
  formatVolume,
  formatV2Number,
  formatElapsedHmsTT,
} from '../../../../shared/utils/formatters';
import { THEME_TOKENS } from '../../../../shared/config/theme';

// Re-export formatters from shared (for components that import from cardUtils)
export { formatRelativeTime, formatRelativeTimeNoAgo, formatVolume, formatV2Number, formatElapsedHmsTT };

// ── Comparison chicklet colors ──
// From web/theme/tokens.js LIGHT_MODE_TOKENS (lines 198-203)
export const CHICKLET_COLORS = {
  positive: '#34C759',
  positiveSoft: 'rgba(52, 199, 89, 0.15)',
  negative: '#FF2D55',
  negativeSoft: 'rgba(255, 45, 85, 0.15)',
};

/**
 * ComparisonChicklet — exact port of web TrackerCard.js:503-543.
 *
 * Web layout: inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
 *             text-[13px] font-semibold tabular-nums flex-shrink-0
 * Web colors: positive (#34C759) / positiveSoft for positive delta
 *             negative (#FF2D55) / negativeSoft for negative delta
 *             textTertiary / subtle for even
 */
export const ComparisonChicklet = ({ comparison, volumeUnit, evenTextColor, evenBgColor, formatValue }) => {
  if (comparison?.state === 'no_comparison_yet') {
    const label = comparison?.label || 'No avg';
    return (
      <View style={[chipStyles.chip, { backgroundColor: evenBgColor }]}>
        <Text style={[chipStyles.label, { color: evenTextColor }]}>{label}</Text>
      </View>
    );
  }

  if (!comparison || comparison.delta == null) return null;

  const rawDelta = Number(comparison.delta || 0);
  const absDelta = Math.abs(rawDelta);
  const epsilon = Number.isFinite(comparison.evenEpsilon) ? comparison.evenEpsilon : 0.05;
  const isEven = absDelta < epsilon;
  const unitSuffix = comparison.unit ? ` ${comparison.unit}` : '';

  const formattedValue = formatValue
    ? formatValue(absDelta)
    : formatV2Number(absDelta);
  const label = isEven ? 'Even' : `${formattedValue}${unitSuffix}`;

  const chipColor = isEven
    ? evenTextColor
    : (rawDelta >= 0 ? CHICKLET_COLORS.positive : CHICKLET_COLORS.negative);
  const chipBg = isEven
    ? evenBgColor
    : (rawDelta >= 0 ? CHICKLET_COLORS.positiveSoft : CHICKLET_COLORS.negativeSoft);
  const arrow = rawDelta >= 0 ? '↑' : '↓';

  return (
    <View style={[chipStyles.chip, { backgroundColor: chipBg }]}>
      {!isEven ? (
        <Text style={[chipStyles.arrow, { color: chipColor }]}>{arrow}</Text>
      ) : null}
      <Text style={[chipStyles.label, { color: chipColor }]}>{label}</Text>
    </View>
  );
};

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const chipStyles = StyleSheet.create({
  // Web: inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,                       // gap-1.5
    paddingHorizontal: 10,        // px-2.5
    paddingVertical: 4,           // py-1
    borderRadius: 8,              // rounded-lg
    flexShrink: 0,                // flex-shrink-0
  },
  // Web: UpArrowIcon/DownArrowIcon w-4 h-4
  arrow: {
    fontSize: 14,                 // w-4 h-4
    fontWeight: FW.semibold,
  },
  // Web: text-[13px] font-semibold tabular-nums
  label: {
    fontSize: 13,                 // text-[13px]
    fontWeight: FW.semibold,            // font-semibold
    fontVariant: ['tabular-nums'],
  },
});
