// TTInputRow — 1:1 from web/components/shared/TTInputRow.js
// Web: rounded-2xl (16), p-4 (16px), label text-xs mb-1, value text-base (16px) font-normal

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, InputAccessoryView, StyleSheet, Platform, Keyboard } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
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
  const accessoryIdRef = useRef(`tt-input-row-${Math.random().toString(36).slice(2)}`);
  const [inputHeight, setInputHeight] = useState(0);

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
    const minInputHeight = Math.max(22, Math.round(valueSize * 1.35));
    const resolvedInputHeight = Math.max(minInputHeight, inputHeight || 0);
    const hasAccessory = Platform.OS === 'ios';
    const accessoryId = hasAccessory ? accessoryIdRef.current : undefined;
    const handleDone = () => {
      inputRef.current?.blur?.();
      Keyboard.dismiss();
    };

    return (
      <View style={[styles.container, enableTapAnimation && styles.tapable]} collapsable={false}>
        <Pressable
          style={[
            styles.row,
            styles.rowText,
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
                <BottomSheetTextInput
                  ref={inputRef}
                  value={displayValue || ''}
                  onChangeText={(text) => {
                    if (onChange) {
                      onChange(text);
                    }
                  }}
                  onContentSizeChange={(e) => {
                    const next = Math.ceil(Number(e?.nativeEvent?.contentSize?.height) || 0);
                    if (!next) return;
                    setInputHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
                  }}
                  onBlur={onBlur}
                  onFocus={onFocus}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={handleDone}
                  inputAccessoryViewID={accessoryId}
                  style={[
                    styles.textInput,
                    {
                      minHeight: minInputHeight,
                      height: resolvedInputHeight,
                    },
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
        {hasAccessory && (
          <InputAccessoryView nativeID={accessoryId}>
            <View style={[styles.keyboardAccessory, { backgroundColor: colors.cardBg, borderTopColor: colors.borderSubtle || colors.cardBorder }]}>
              <View />
              <Pressable onPress={handleDone} style={({ pressed }) => [styles.keyboardDoneBtn, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.keyboardDoneText, { color: colors.primaryBrand }]}>Done</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        )}
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

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
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
  rowText: {
    alignItems: 'flex-start',
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
    fontWeight: FW.normal,
    fontFamily: 'SF-Pro',
  },
  fullWidth: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    padding: 0,
    fontFamily: 'SF-Pro',
    textAlignVertical: 'top',
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
  keyboardAccessory: {
    height: 44,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyboardDoneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  keyboardDoneText: {
    fontSize: 17,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
});
