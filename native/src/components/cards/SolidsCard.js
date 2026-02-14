import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { SolidsIcon } from '../icons';
import { formatRelativeTime, formatV2Number, ComparisonChicklet } from './cardUtils';

// ── Mock data — will be replaced with real Firebase data ──
// total is food count (number of individual foods across all sessions today)
// comparison is vs yesterday (not rolling avg — see TrackerTab.js:1225-1226)
const MOCK = {
  totalFoods: 5,
  lastEntryTime: Date.now() - 2 * 60 * 60 * 1000,  // 2h ago
  comparison: { delta: 1, unit: 'food' },             // +1 food vs yesterday
};

/**
 * SolidsCard — web TrackerCard mode='solids' with v4 design.
 *
 * Web renderV4Design (TrackerCard.js:900-935):
 *   bigNumberTargetVariant: 'unit' → shows bare "foods"
 *   hasComparison: true (comparison calculated in formatSolidsSessionsForCard)
 *   modeColor: var(--tt-solids) = theme.solids.primary
 *   target: null, volumeUnit: null (TrackerTab.js:2113)
 *   total: food count (not session count)
 *   unit text: 'foods' (TrackerCard.js:649)
 */
const SolidsCard = ({ onPress }) => {
  const { solids, colors } = useTheme();
  const { totalFoods, lastEntryTime, comparison } = MOCK;

  const statusText = lastEntryTime
    ? formatRelativeTime(lastEntryTime)
    : 'No solids yet';

  return (
    <TrackerCard
      title="Solids"
      icon={<SolidsIcon size={22} color={solids.primary} />}
      value={formatV2Number(totalFoods)}
      unit="foods"
      accentColor={solids.primary}
      statusText={statusText}
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

export default SolidsCard;
