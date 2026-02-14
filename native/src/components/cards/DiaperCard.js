import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { DiaperIcon } from '../icons';
import { formatRelativeTime, formatV2Number } from './cardUtils';

// ── Mock data — will be replaced with real Firebase data ──
// total is change count (todayChanges.length — TrackerTab.js:1372)
// Diaper has NO comparison chicklet (no comparison prop passed — TrackerTab.js:2156-2176)
const MOCK = {
  totalChanges: 6,
  lastEntryTime: Date.now() - 30 * 60 * 1000,  // 30m ago
};

/**
 * DiaperCard — web TrackerCard mode='diaper' with v4 design.
 *
 * Web renderV4Design (TrackerCard.js:900-935):
 *   bigNumberTargetVariant: 'unit' → shows bare "changes"
 *   hasComparison: false — no comparison prop passed
 *   modeColor: var(--tt-diaper) = theme.diaper.primary
 *   target: null (TrackerTab.js:2162)
 *   unit text: 'changes' (TrackerCard.js:649)
 *
 * Without comparison, value row uses:
 *   items-baseline gap-1.5 mb-[13px] (TrackerCard.js valueRowNoComparison)
 */
const DiaperCard = ({ onPress }) => {
  const { diaper } = useTheme();
  const { totalChanges, lastEntryTime } = MOCK;

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
