/**
 * InputRow — 1:1 from web TTInputRow.js
 * Web: rounded-2xl (16), p-4 (16px), label text-xs mb-1, value text-base (16px) font-normal
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import { EditIcon } from '../icons';

export default function InputRow({
  label,
  value,
  onChange,
  icon,
  type = 'text',
  placeholder = '',
  onPress,
  onOpenPicker,
  formatDateTime,
  valueClassName,
}) {
  const { colors } = useTheme();
  const displayValue = type === 'datetime' && formatDateTime ? formatDateTime(value) : value;

  const handlePress = () => {
    if (type === 'datetime' && onOpenPicker) {
      onOpenPicker();
      return;
    }
    if (onPress) onPress();
  };

  const IconComponent = icon || EditIcon;

  if (type === 'text') {
    return (
      <View style={styles.container}>
        {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
        <View style={[styles.row, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle }]}>
          <IconComponent size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={value || ''}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.7 },
      ]}
      onPress={handlePress}
    >
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View style={[styles.row, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle }]}>
        <IconComponent size={20} color={colors.textSecondary} />
        <Text
          style={[
            styles.value,
            { color: (displayValue || placeholder) ? colors.textPrimary : colors.textTertiary },
          ]}
        >
          {displayValue || placeholder || ''}
        </Text>
      </View>
    </Pressable>
  );
}

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const styles = StyleSheet.create({
  // Web: rounded-2xl mb-2
  container: {
    marginBottom: 8,
  },
  // Web: text-xs mb-1
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  // Web: p-4, rounded-2xl (16)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: FW.normal,
    fontFamily: 'SF-Pro',
  },
  value: {
    flex: 1,
    fontSize: 16,
    fontWeight: FW.normal,
    fontFamily: 'SF-Pro',
  },
});
