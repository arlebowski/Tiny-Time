import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { BottleIcon } from '../icons';
import { formatRelativeTime, formatVolume, ComparisonChicklet } from './cardUtils';

const BottleCard = ({ onPress, totalOz = 0, volumeUnit = 'oz', lastEntryTime = null, comparison = null }) => {
  const { bottle, colors } = useTheme();

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
