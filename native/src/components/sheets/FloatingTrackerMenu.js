/**
 * FloatingTrackerMenu — 1:1 from web FloatingTrackerMenu.js
 * + button expands to show Feed/Sleep/Diaper options
 */
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BottleIcon, NursingIcon, SolidsIcon, SleepIcon, DiaperIcon } from '../icons';

const OPTIONS = [
  { id: 'bottle', label: 'Bottle', Icon: BottleIcon, accent: 'bottle' },
  { id: 'nursing', label: 'Nursing', Icon: NursingIcon, accent: 'nursing' },
  { id: 'solids', label: 'Solids', Icon: SolidsIcon, accent: 'solids' },
  { id: 'sleep', label: 'Sleep', Icon: SleepIcon, accent: 'sleep' },
  { id: 'diaper', label: 'Diaper', Icon: DiaperIcon, accent: 'diaper' },
];

export default function FloatingTrackerMenu({ isOpen, onClose, onSelect }) {
  const { colors, bottle, nursing, solids, sleep, diaper } = useTheme();
  const accentMap = { bottle, nursing, solids, sleep, diaper };

  const handleSelect = useCallback((id) => {
    onSelect?.(id);
    onClose?.();
  }, [onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.menu, { backgroundColor: colors.cardBg }]}>
          {OPTIONS.map((opt) => {
            const Icon = opt.Icon;
            const accent = accentMap[opt.accent]?.primary || colors.textPrimary;
            return (
              <Pressable
                key={opt.id}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: colors.cardBorder },
                  pressed && { backgroundColor: colors.segTrack },
                ]}
                onPress={() => handleSelect(opt.id)}
              >
                <Icon size={24} color={accent} />
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 100,
  },
  menu: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
