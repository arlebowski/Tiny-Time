import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { NursingIcon } from '../icons';
import { formatRelativeTime, formatElapsedHmsTT, formatV2Number, ComparisonChicklet } from './cardUtils';


/**
 * NursingValueDisplay — renders the Xh Ym Zs big number with inline unit spans.
 *
 * Web TrackerCard.js:617-634:
 *   nursingParts = formatElapsedHmsTT(total)
 *   Renders: <span>hStr</span><span class="unit">h</span> <span>mStr</span><span class="unit">m</span> ...
 *   Value class: text-[48px] leading-none font-bold, color = modeColor
 *   Unit class: text-[28px] leading-none font-normal, color = var(--tt-text-tertiary)
 */
const NursingValueDisplay = ({ totalMs, accentColor, unitColor }) => {
  const parts = formatElapsedHmsTT(totalMs);

  return (
    <View style={valueStyles.container}>
      {parts.showH ? (
        <>
          <Text style={[valueStyles.number, { color: accentColor }]}>{parts.hStr}</Text>
          <Text style={[valueStyles.unit, { color: unitColor }]}>h</Text>
          <View style={valueStyles.spacer} />
        </>
      ) : null}
      {parts.showM ? (
        <>
          <Text style={[valueStyles.number, { color: accentColor }]}>{parts.mStr}</Text>
          <Text style={[valueStyles.unit, { color: unitColor }]}>m</Text>
          <View style={valueStyles.spacer} />
        </>
      ) : null}
      <Text style={[valueStyles.number, { color: accentColor }]}>{parts.sStr}</Text>
      <Text style={[valueStyles.unit, { color: unitColor }]}>s</Text>
    </View>
  );
};

const valueStyles = StyleSheet.create({
  // Web: flex items-baseline gap-[4px]
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // Web: text-[48px] leading-none font-bold
  number: {
    fontSize: 48,                     // text-[48px]
    fontWeight: '700',                // font-bold
    lineHeight: 48,                   // leading-none
  },
  // Web: text-[28px] leading-none font-normal, var(--tt-text-tertiary)
  unit: {
    fontSize: 28,                     // text-[28px]
    fontWeight: '400',                // font-normal
  },
  // Web: ml-2 between h/m/s groups
  spacer: {
    width: 8,                         // ml-2
  },
});

/**
 * NursingCard — web TrackerCard mode='nursing' with v4 design.
 *
 * Web renderV4Design (TrackerCard.js:900-935):
 *   bigNumberTargetVariant: 'unit' → but nursing has no targetEl (line 644)
 *   hasComparison: true when comparison.delta != null
 *   modeColor: var(--tt-nursing) = theme.nursing.primary
 *   total: milliseconds of nursing time today
 *   comparison.unit: 'hrs'
 */
const NursingCard = ({ onPress, totalMs = 0, lastEntryTime = null, comparison = null }) => {
  const { nursing, colors } = useTheme();

  const statusText = lastEntryTime
    ? formatRelativeTime(lastEntryTime)
    : 'No nursing yet';

  return (
    <TrackerCard
      title="Nursing"
      icon={<NursingIcon size={22} color={nursing.primary} />}
      accentColor={nursing.primary}
      statusText={statusText}
      valueElement={
        <NursingValueDisplay
          totalMs={totalMs}
          accentColor={nursing.primary}
          unitColor={colors.textTertiary}
        />
      }
      comparisonElement={
        <ComparisonChicklet
          comparison={comparison}
          formatValue={(v) => formatV2Number(v)}
          evenTextColor={colors.textTertiary}
          evenBgColor={colors.subtle}
        />
      }
      onPress={onPress}
    />
  );
};

export default NursingCard;
