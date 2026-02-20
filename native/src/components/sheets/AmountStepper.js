/**
 * AmountStepper — 1:1 from web TTAmountStepper.js
 * Web: rounded-2xl, px-4 pt-3 header, px-12 pb-9 pt-9 stepper, w-52 h-52 buttons (52px), rounded-xl, value text-[40px] font-bold
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { formatOz, formatMl, ozToMl, mlToOz } from '../../utils/amountStepper';
import { MinusIcon, PlusIcon } from '../icons';
import SegmentedToggle from '../shared/SegmentedToggle';

export default function AmountStepper({
  label = 'Amount',
  valueOz = 0,
  unit = 'oz',
  onChangeUnit,
  onChangeOz,
}) {
  const { colors, isDark } = useTheme();
  const oz = Number(valueOz) || 0;
  const ml = ozToMl(oz);
  const displayValue = unit === 'ml' ? formatMl(ml) : formatOz(oz);
  const step = unit === 'ml' ? 10 : 0.25;

  const handleStep = (delta) => {
    if (!onChangeOz) return;
    if (unit === 'ml') {
      const nextMl = Math.max(0, ml + delta * step);
      onChangeOz(mlToOz(nextMl));
    } else {
      onChangeOz(Math.max(0, oz + delta * step));
    }
  };

  // Web TTAmountStepper: light mode overrides --tt-seg-track: #fff, --tt-seg-pill: inputBg
  const segOverrides = !isDark
    ? { trackColor: '#ffffff', pillColor: colors.inputBg }
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.inputBg }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <SegmentedToggle
          value={unit}
          options={[{ value: 'oz', label: 'oz' }, { value: 'ml', label: 'ml' }]}
          onChange={onChangeUnit}
          variant="body"
          size="medium"
          fullWidth={false}
          {...segOverrides}
        />
      </View>
      <View style={styles.stepper}>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.cardBg || '#fff', borderColor: colors.cardBorder || colors.borderSubtle },
            pressed && { opacity: 0.86 },
          ]}
          onPress={() => handleStep(-1)}
        >
          <MinusIcon size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.valueWrap}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{displayValue}</Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.cardBg || '#fff', borderColor: colors.cardBorder || colors.borderSubtle },
            pressed && { opacity: 0.86 },
          ]}
          onPress={() => handleStep(1)}
        >
          <PlusIcon size={24} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Web: rounded-2xl mb-2
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  // Web: px-4 pt-3
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  label: {
    fontSize: 12,
  },
  // Web: px-12 pb-9 pt-9 (36px vertical)
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingVertical: 36,
  },
  // Web: w-[52px] h-[52px] rounded-xl
  btn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  // Web: text-[40px] font-bold
  value: {
    fontSize: 40,
    fontWeight: '700',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-base font-light ml-2
  unit: {
    fontSize: 16,
    fontWeight: '300',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
