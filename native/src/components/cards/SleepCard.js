import React from 'react';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { formatRelativeTimeNoAgo, formatV2Number, ComparisonChicklet } from './cardUtils';

// ── Mock data — will be replaced with real Firebase data ──
// total is hours (converted from ms in formatSleepSessionsForCard line 1314)
// Sleep status text has special handling (TrackerCard.js:788-809):
//   - active sleep → shows timer + zzz
//   - last completed sleep → "Awake Xh Ym"
//   - no sleep → "No sleep logged"
const MOCK = {
  totalHours: 6.5,
  target: 14,
  lastSleepEndTime: Date.now() - 45 * 60 * 1000,  // woke up 45m ago
  isActive: false,
  comparison: { delta: -1.2, unit: 'hrs' },         // -1.2 hrs vs avg
};

/**
 * SleepCard — web TrackerCard mode='sleep' with v4 design.
 *
 * Web renderV4Design (TrackerCard.js:900-935):
 *   bigNumberTargetVariant: 'unit' → shows bare "hrs"
 *   hasComparison: true when comparison.delta != null
 *   modeColor: var(--tt-sleep) = theme.sleep.primary
 *   total: hours (float)
 *   target: target hours from settings
 *   unit text: 'hrs' (TrackerCard.js:649)
 *
 * Status text (TrackerCard.js:788-809):
 *   Active sleep → ActiveSleepTimer + zzz (not implemented in mock)
 *   Last completed sleep → "Awake Xh Ym" via formatRelativeTimeNoAgo
 *   No sleep → "No sleep logged"
 */
const SleepCard = ({ onPress }) => {
  const { sleep, colors } = useTheme();
  const { totalHours, lastSleepEndTime, isActive, comparison } = MOCK;

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
      icon="🌙"
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
