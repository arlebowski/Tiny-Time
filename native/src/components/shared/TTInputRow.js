// TTInputRow — 1:1 from web/components/shared/TTInputRow.js
// Web: rounded-2xl (16), p-4 (16px), label text-xs mb-1, value text-base (16px) font-normal

import React, { useRef } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EditIcon, ChevronRightIcon, ChevronDownIcon } from '../icons';

export default function TTInputRow({
  label,
  value,
  onChange,
  icon,
  showIcon = true,
  showChevron = false,
  chevronDirection = 'right',
  enableTapAnimation = true,
  showLabel = true,
  renderValue = null,
  size = 'default',
  type = 'text',
  placeholder = '',
  rawValue,
  invalid = false,
  pickerMode = null,
  onOpenPicker = null,
  formatDateTime = null,
  useWheelPickers = null,
  openAnchoredTimePicker = null,
  onBlur = null,
  onFocus = null,
  onKeyDown = null,
  valueClassName = '',
  suffix = null,
  suffixClassName = '',
  inlineSuffix = false,
}) {
  const { colors } = useTheme();
  const inputRef = useRef(null);

  const formatValue = (v) => {
    if (typeof formatDateTime === 'function') return formatDateTime(v);
    if (!v) return '';
    try {
      return new Date(v).toLocaleString();
    } catch {
      return String(v);
    }
  };

  const effectiveRawValue = type === 'datetime' ? (rawValue ?? value) : null;
  const displayValue = type === 'datetime'
    ? (effectiveRawValue ? formatValue(effectiveRawValue) : (placeholder || ''))
    : value;

  const shouldUseWheelPickers = () => {
    if (typeof useWheelPickers === 'function') return !!useWheelPickers();
    return !!useWheelPickers;
  };

  const openPicker = () => {
    if (type === 'datetime') {
      if (shouldUseWheelPickers() && typeof onOpenPicker === 'function' && pickerMode) {
        onOpenPicker(pickerMode);
        return;
      }
      if (typeof openAnchoredTimePicker === 'function') {
        openAnchoredTimePicker({
          anchorEl: null,
          rawValue: effectiveRawValue,
          onChange
        });
        return;
      }
      if (typeof onOpenPicker === 'function') {
        onOpenPicker();
      }
      return;
    }

    if (inputRef.current) {
      if (shouldUseWheelPickers() && pickerMode === 'amount' && typeof onOpenPicker === 'function') {
        onOpenPicker('amount');
        return;
      }
      inputRef.current.focus();
    }
  };

  const handleRowPress = () => {
    openPicker();
  };

  const handleIconPress = () => {
    openPicker();
  };

  const IconComponent = icon === undefined ? EditIcon : icon;
  const ChevronIcon = chevronDirection === 'down' ? ChevronDownIcon : ChevronRightIcon;

  const isCompact = size === 'compact';
  const paddingH = isCompact ? 12 : 16;
  const paddingV = isCompact ? 12 : 16;
  const labelSize = isCompact ? 11 : 12;
  const valueSize = isCompact ? 15 : 16;

  const valueColor = invalid
    ? colors.error
    : (type === 'datetime' && !effectiveRawValue && placeholder ? colors.textTertiary : colors.textPrimary);

  const showInlineSuffix = !!(suffix && inlineSuffix);
  const showTrailingSuffix = !!(suffix && !inlineSuffix);

  if (type === 'text') {
    return (
      <View style={[styles.container, enableTapAnimation && styles.tapable]}>
        <Pressable
          style={[
            styles.row,
            {
              backgroundColor: colors.inputBg,
              paddingHorizontal: paddingH,
              paddingVertical: paddingV,
            },
          ]}
          onPress={handleRowPress}
        >
          <View style={styles.flex1}>
            {showLabel && label && (
              <Text style={[styles.label, { fontSize: labelSize, color: colors.textSecondary }]}>{label}</Text>
            )}
            {typeof renderValue === 'function' ? (
              <View style={[styles.valueRow, (suffix || showInlineSuffix) && styles.inlineRow]}>
                <Text style={[styles.value, { fontSize: valueSize, color: valueColor }]}>
                  {renderValue(displayValue, { rawValue: effectiveRawValue, placeholder })}
                </Text>
                {showInlineSuffix && <Text style={[styles.suffix, { color: colors.textPrimary }]}>{suffix}</Text>}
              </View>
            ) : (
              <View style={[styles.valueRow, suffix && styles.flexRow]}>
                <TextInput
                  ref={inputRef}
                  value={displayValue || ''}
                  onChangeText={(text) => {
                    if (onChange) {
                      onChange(text);
                    }
                  }}
                  onBlur={onBlur}
                  onFocus={onFocus}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  style={[
                    styles.textInput,
                    { fontSize: valueSize, color: invalid ? colors.error : colors.textPrimary },
                    suffix ? styles.flex1 : styles.fullWidth,
                  ]}
                  editable={true}
                />
                {suffix && <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>}
              </View>
            )}
          </View>
          {showTrailingSuffix && <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>}
          {showIcon && IconComponent && (
            <Pressable onPress={handleIconPress} style={styles.iconBtn}>
              <IconComponent size={16} color={colors.textSecondary} />
            </Pressable>
          )}
          {showChevron && ChevronIcon && (
            <View style={styles.chevronWrap}>
              <ChevronIcon size={16} color={colors.textSecondary} />
            </View>
          )}
        </Pressable>
      </View>
    );
  }

  // datetime or other types — pressable row
  return (
    <View style={[styles.container, enableTapAnimation && styles.tapable]}>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.inputBg,
            paddingHorizontal: paddingH,
            paddingVertical: paddingV,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleRowPress}
      >
        <View style={styles.flex1}>
          {showLabel && label && (
            <Text style={[styles.label, { fontSize: labelSize, color: colors.textSecondary }]}>{label}</Text>
          )}
          {typeof renderValue === 'function' ? (
            <View style={[styles.valueRow, (suffix || showInlineSuffix) && styles.inlineRow]}>
              <Text style={[styles.value, { fontSize: valueSize, color: valueColor }]}>
                {renderValue(displayValue, { rawValue: effectiveRawValue, placeholder })}
              </Text>
              {showInlineSuffix && <Text style={[styles.suffix, { color: colors.textPrimary }]}>{suffix}</Text>}
            </View>
          ) : (
            <View style={[styles.valueRow, (suffix || showInlineSuffix) && styles.inlineRow]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.value,
                  { fontSize: valueSize, color: valueColor },
                  (suffix && !showInlineSuffix) ? styles.flex1 : styles.fullWidth,
                ]}
              >
                {displayValue || placeholder || ''}
              </Text>
              {showInlineSuffix && <Text style={[styles.suffix, { color: colors.textPrimary }]}>{suffix}</Text>}
            </View>
          )}
        </View>
        {showTrailingSuffix && <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>}
        {showIcon && IconComponent && (
          <Pressable onPress={handleIconPress} style={styles.iconBtn}>
            <IconComponent size={16} color={colors.textSecondary} />
          </Pressable>
        )}
        {showChevron && ChevronIcon && (
          <View style={styles.chevronWrap}>
            <ChevronIcon size={16} color={colors.textSecondary} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tapable: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    marginBottom: 4,
    fontFamily: 'SF-Pro',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontWeight: '400',
    fontFamily: 'SF-Pro',
  },
  fullWidth: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    padding: 0,
    fontFamily: 'SF-Pro',
  },
  suffix: {
    fontSize: 12,
    fontFamily: 'SF-Pro',
  },
  iconBtn: {
    marginLeft: 17,
    padding: 4,
  },
  chevronWrap: {
    marginLeft: 8,
  },
});
