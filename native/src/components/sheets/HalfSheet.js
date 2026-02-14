/**
 * HalfSheet — shared wrapper for @gorhom/bottom-sheet
 * 1:1 from web halfsheet structure: header bar (accent), content, CTA footer
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../context/ThemeContext';
import { ChevronDownIcon } from '../icons';

export default function HalfSheet({
  sheetRef,
  snapPoints = ['60%'],
  title,
  accentColor,
  onClose,
  onOpen,
  children,
  footer,
  enablePanDownToClose = true,
}) {
  const { colors } = useTheme();
  const headerBg = accentColor || colors.primaryBrand;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      onClose={onClose}
      onChange={(index) => { if (index >= 0 && onOpen) onOpen(); }}
      backgroundStyle={{ backgroundColor: colors.cardBg }}
      handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
    >
      {/* Web: header bar with accent, drag handle, close, title */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={onClose}
        >
          <ChevronDownIcon size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
      </View>

      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </BottomSheetScrollView>

      {footer ? (
        <View style={[styles.footer, { backgroundColor: colors.cardBg }]}>
          {footer}
        </View>
      ) : null}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  spacer: {
    width: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});
