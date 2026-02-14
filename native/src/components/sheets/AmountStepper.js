/**
 * AmountStepper — 1:1 from web TTAmountStepper
 * Large +/- with oz/ml unit toggle
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { formatOz, formatMl, ozToMl, mlToOz } from '../../utils/amountStepper';

export default function AmountStepper({
  label = 'Amount',
  valueOz = 0,
  unit = 'oz',
  onChangeUnit,
  onChangeOz,
}) {
  const { colors, bottle } = useTheme();
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

  return (
    <View style={[styles.container, { backgroundColor: colors.inputBg }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.unitToggle}>
          <Pressable
            style={[
              styles.unitBtn,
              { backgroundColor: unit === 'oz' ? colors.segPill || '#fff' : 'transparent' },
              unit === 'oz' && { borderColor: colors.cardBorder },
            ]}
            onPress={() => onChangeUnit?.('oz')}
          >
            <Text style={[styles.unitText, { color: unit === 'oz' ? colors.textPrimary : colors.textSecondary }]}>oz</Text>
          </Pressable>
          <Pressable
            style={[
              styles.unitBtn,
              { backgroundColor: unit === 'ml' ? colors.segPill || '#fff' : 'transparent' },
              unit === 'ml' && { borderColor: colors.cardBorder },
            ]}
            onPress={() => onChangeUnit?.('ml')}
          >
            <Text style={[styles.unitText, { color: unit === 'ml' ? colors.textPrimary : colors.textSecondary }]}>ml</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.stepper}>
        <Pressable
          style={({ pressed }) => [styles.btn, { borderColor: bottle.primary }, pressed && { opacity: 0.7 }]}
          onPress={() => handleStep(-1)}
        >
          <Text style={[styles.btnText, { color: bottle.primary }]}>−</Text>
        </Pressable>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{displayValue}</Text>
        <Pressable
          style={({ pressed }) => [styles.btn, { borderColor: bottle.primary }, pressed && { opacity: 0.7 }]}
          onPress={() => handleStep(1)}
        >
          <Text style={[styles.btnText, { color: bottle.primary }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
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
  unitToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 24,
    fontWeight: '600',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
