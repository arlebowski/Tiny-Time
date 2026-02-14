import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * TrackerCard — base card matching web TrackerCard v4 layout.
 *
 * Web source: rounded-2xl p-5 shadow-sm, var(--tt-card-bg)
 * Header:  flex items-center justify-between mb-[36px] h-6
 *   Left:  text-[18px] font-semibold inline-flex items-center gap-[5px]
 *   Right: inline-flex items-center gap-2, text-[15px] font-normal, var(--tt-text-tertiary)
 * Value:   text-[48px] leading-none font-bold
 * Unit:    text-[28px] leading-none font-normal, var(--tt-text-tertiary)
 */
const TrackerCard = ({
  // Header left
  title,
  icon,
  accentColor,
  // Header right
  statusText,
  // Big number — either pass `value`+`unit` or `valueElement` for custom layout (nursing)
  value,
  unit,
  valueElement,
  // Comparison chicklet (rendered to the right of value row)
  comparisonElement,
  // Extra content below value row
  children,
  onPress,
}) => {
  const { colors } = useTheme();
  const hasComparison = !!comparisonElement;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBg },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {icon ? (
            <Text style={[styles.headerIcon, { color: accentColor }]}>{icon}</Text>
          ) : null}
          <Text style={[styles.headerLabel, { color: accentColor }]}>{title}</Text>
        </View>
        {statusText ? (
          <View style={styles.headerRight}>
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>{statusText}</Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </View>
        ) : null}
      </View>

      {/* ── Big number row ── */}
      <View style={[
        styles.valueRow,
        hasComparison ? styles.valueRowWithComparison : styles.valueRowNoComparison,
      ]}>
        {valueElement ? (
          valueElement
        ) : (
          <View style={styles.valueLeft}>
            <Text style={[styles.value, { color: accentColor }]}>
              {value ?? '0'}
            </Text>
            {unit ? (
              <Text style={[styles.unit, { color: colors.textTertiary }]}>{unit}</Text>
            ) : null}
          </View>
        )}
        {comparisonElement}
      </View>

      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Web: rounded-2xl p-5 shadow-sm
  card: {
    borderRadius: 16,                 // rounded-2xl
    padding: 20,                      // p-5
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],   // web whileTap scale
  },

  // Web: flex items-center justify-between mb-[36px] h-6
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,                       // h-6
    marginBottom: 36,                 // mb-[36px]
  },

  // Web: text-[18px] font-semibold inline-flex items-center gap-[5px]
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,                           // gap-[5px]
  },
  headerIcon: {
    fontSize: 22,                     // w-[22px] h-[22px] — emoji stand-in
  },
  headerLabel: {
    fontSize: 18,                     // text-[18px]
    fontWeight: '600',                // font-semibold
  },

  // Web: inline-flex items-center gap-2, marginRight: -4
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,                           // gap-2
    marginRight: -4,                  // marginRight: -4
  },
  // Web: text-[15px] font-normal leading-none
  statusText: {
    fontSize: 15,                     // text-[15px]
    fontWeight: '400',                // font-normal
  },
  // Stand-in for the SVG chevron-right (w-5 h-5)
  chevron: {
    fontSize: 20,                     // w-5 h-5
    marginTop: -2,
  },

  // Big-number row base: flex
  valueRow: {
    flexDirection: 'row',
  },
  // Web with comparison: flex items-end justify-between gap-3 mb-0
  valueRowWithComparison: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,                          // gap-3
    marginBottom: 0,
  },
  // Web without comparison: flex items-baseline gap-1.5 mb-[13px]
  valueRowNoComparison: {
    alignItems: 'baseline',
    gap: 6,                           // gap-1.5
    marginBottom: 13,                 // mb-[13px]
  },

  // Inner wrapper: flex items-baseline gap-[4px]
  valueLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,                           // gap-[4px]
  },

  // Web: text-[48px] leading-none font-bold
  value: {
    fontSize: 48,                     // text-[48px]
    fontWeight: '700',                // font-bold
    lineHeight: 48,                   // leading-none
  },

  // Web: text-[28px] leading-none font-normal
  unit: {
    fontSize: 28,                     // text-[28px]
    fontWeight: '400',                // font-normal
  },
});

export default TrackerCard;
