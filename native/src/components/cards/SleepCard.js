import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { SleepIcon } from '../icons';
import { formatRelativeTimeNoAgo, formatV2Number, ComparisonChicklet } from './cardUtils';

const SleepCard = ({ onPress, totalHours = 0, lastSleepEndTime = null, isActive = false, comparison = null }) => {
  const { sleep, colors } = useTheme();

  // Web TrackerCard.js:788-809 — sleep status text logic
  const statusText = (() => {
    if (isActive) {
      return 'Sleeping...';  // Simplified; web uses ActiveSleepTimer + zzz animation
    }
    if (lastSleepEndTime) {
      return `Awake ${formatRelativeTimeNoAgo(lastSleepEndTime)}`;
    }
    return 'No sleep logged';
  })();

  return (
    <TrackerCard
      title="Sleep"
      icon={<SleepIcon size={22} color={sleep.primary} />}
      value={formatV2Number(totalHours)}
      unit="hrs"
      accentColor={sleep.primary}
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

export default SleepCard;
