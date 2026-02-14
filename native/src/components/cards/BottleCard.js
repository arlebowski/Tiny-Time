import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { BottleIcon } from '../icons';
import { formatRelativeTime, formatVolume, ComparisonChicklet } from './cardUtils';

// ── Mock data — will be replaced with real Firebase data ──
const MOCK = {
  totalOz: 18,
  goal: 24,
  volumeUnit: 'oz',
  lastEntryTime: Date.now() - 3 * 60 * 60 * 1000,  // 3h ago
  comparison: { delta: 2.5, unit: 'oz' },            // +2.5 oz vs avg
};

/**
 * BottleCard — web TrackerCard mode='feeding' with v4 design.
 *
 * Web renderV4Design (TrackerCard.js:900-935):
 *   showProgress: false       — no progress bar
 *   showDotsRow: false        — no dots
 *   bigNumberTargetVariant: 'unit' → shows bare "oz" not "/ 24 oz"
 *   hasComparison: true when comparison.delta != null → chicklet shown
 *   modeColor: var(--tt-feed) = theme.bottle.primary
 */
const BottleCard = ({ onPress }) => {
  const { bottle, colors } = useTheme();
  const { totalOz, volumeUnit, lastEntryTime, comparison } = MOCK;

  const statusText = lastEntryTime
    ? formatRelativeTime(lastEntryTime)
    : 'No feedings yet';

  return (
    <TrackerCard
      title="Bottle"
      icon={<BottleIcon size={22} color={bottle.primary} />}
      value={formatVolume(totalOz, volumeUnit)}
      unit={volumeUnit}
      accentColor={bottle.primary}
      statusText={statusText}
      comparisonElement={
        <ComparisonChicklet
          comparison={comparison}
          volumeUnit={volumeUnit}
          evenTextColor={colors.textTertiary}
          evenBgColor={colors.subtle}
        />
      }
      onPress={onPress}
    />
  );
};

export default BottleCard;
