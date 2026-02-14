/**
 * InputRow — 1:1 from web TTInputRow.js
 * Tap-to-open row for datetime or text input
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
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
        <View style={[styles.row, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <IconComponent size={24} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, valueClassName, { color: colors.textPrimary }]}
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
      <View style={[styles.row, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
        <IconComponent size={24} color={colors.textSecondary} />
        <Text style={[styles.value, valueClassName, { color: colors.textPrimary }]}>
          {displayValue || placeholder}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  value: {
    flex: 1,
    fontSize: 18,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
