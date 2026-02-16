import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { SolidsIcon } from '../icons';
import { formatRelativeTime, formatV2Number, ComparisonChicklet } from './cardUtils';

const SolidsCard = ({ onPress, totalFoods = 0, lastEntryTime = null, comparison = null }) => {
  const { solids, colors } = useTheme();

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
