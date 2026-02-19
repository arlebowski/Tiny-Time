import React from 'react';
import { View, StyleSheet } from 'react-native';
import TrackerCard from './TrackerCard';
import { useTheme } from '../../context/ThemeContext';
import { DiaperIcon, DiaperWetIcon, DiaperDryIcon, DiaperPooIcon } from '../icons';
import { formatRelativeTime, formatV2Number, ComparisonChicklet } from './cardUtils';

const DiaperCard = ({
  onPress,
  totalChanges = 0,
  lastEntryTime = null,
  timelineItems = [],
  comparison = null,
}) => {
  const { diaper, colors } = useTheme();

  const statusText = lastEntryTime
    ? formatRelativeTime(lastEntryTime)
    : 'No changes yet';

  const renderDiaperIconRow = () => {
    if (!Array.isArray(timelineItems) || timelineItems.length === 0) return null;

    const maxIcons = 10;
    const perRow = 5;
    const sorted = [...timelineItems].sort((a, b) => {
      const at = Number(a?.timestamp || a?.startTime || 0);
      const bt = Number(b?.timestamp || b?.startTime || 0);
      return at - bt;
    });
    const items = sorted.slice(Math.max(0, sorted.length - maxIcons));
    const bottomStart = Math.max(0, items.length - perRow);
    const topRow = items.slice(0, bottomStart);
    const bottomRow = items.slice(bottomStart);

    const wetColor = diaper.dark || diaper.primary;
    const dryColor = colors.textTertiary;
    const pooColor = diaper.primary;

    const renderIcon = (item, key) => {
      const isWet = !!item?.isWet;
      const isDry = !!item?.isDry;
      const isPoo = !!item?.isPoo;

      if (isDry) {
        return <DiaperDryIcon key={key} size={20} color={dryColor} />;
      }
      if (isPoo && isWet) {
        return (
          <View key={key} style={styles.combinedIconWrap}>
            <DiaperPooIcon size={20} color={pooColor} />
            <View
              style={[
                styles.wetBadge,
                { backgroundColor: colors.cardBg, borderColor: colors.borderSubtle },
              ]}
            >
              <DiaperWetIcon size={10} color={wetColor} />
            </View>
          </View>
        );
      }
      if (isPoo) {
        return <DiaperPooIcon key={key} size={20} color={pooColor} />;
      }
      if (isWet) {
        return <DiaperWetIcon key={key} size={20} color={wetColor} />;
      }
      return null;
    };

    const renderRow = (rowItems, rowKey) => {
      return (
        <View key={rowKey} style={[styles.iconRow, styles.iconRowSlot]}>
          {rowItems.map((item, idx) => renderIcon(item, item?.id || `${rowKey}-${idx}`))}
        </View>
      );
    };

    return (
      <View style={styles.iconMatrix}>
        {renderRow(topRow, 'top')}
        {renderRow(bottomRow, 'bottom')}
      </View>
    );
  };

  return (
    <TrackerCard
      title="Diaper"
      icon={<DiaperIcon size={22} color={diaper.primary} />}
      value={formatV2Number(totalChanges)}
      unit="changes"
      accentColor={diaper.primary}
      statusText={statusText}
      comparisonElement={
        <ComparisonChicklet
          comparison={comparison}
          formatValue={(v) => formatV2Number(v)}
          evenTextColor={colors.textTertiary}
          evenBgColor={colors.subtle}
        />
      }
      rightElement={
        <View style={styles.rightWrap}>
          {renderDiaperIconRow()}
        </View>
      }
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  rightWrap: {
    marginLeft: 12,
    flex: 1,
    alignItems: 'flex-end',
    marginRight: -4,
  },
  iconMatrix: {
    height: 48, // 20 icon + 8 gap + 20 icon (web: two-row matrix, bottom fills first)
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconRowSlot: {
    minHeight: 20,
  },
  combinedIconWrap: {
    position: 'relative',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wetBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 14,
    height: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export default DiaperCard;
