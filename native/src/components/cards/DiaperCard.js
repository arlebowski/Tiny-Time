import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { DiaperIcon } from '../icons';
import { formatRelativeTime, formatV2Number } from './cardUtils';

const DiaperCard = ({ onPress, totalChanges = 0, lastEntryTime = null }) => {
  const { diaper } = useTheme();

  const statusText = lastEntryTime
    ? formatRelativeTime(lastEntryTime)
    : 'No changes yet';

  return (
    <TrackerCard
      title="Diaper"
      icon={<DiaperIcon size={22} color={diaper.primary} />}
      value={formatV2Number(totalChanges)}
      unit="changes"
      accentColor={diaper.primary}
      statusText={statusText}
      onPress={onPress}
    />
  );
};

export default DiaperCard;
