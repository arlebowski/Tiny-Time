/**
 * HalfSheet — 1:1 from web halfsheet structure
 * Web: minHeight 60vh, borderTopRadius 20px, header 60px accent, content px-6 pt-10 pb-2, footer with safe area
 * Uses FullWindowOverlay on iOS so sheet opens OVER bottom nav
 */
import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetView, BottomSheetFooter } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ChevronDownIcon, ChevronLeftIcon } from '../icons';

function HeaderHandle({ style, onClose, onHeaderBackPress, title, headerRight, headerBg }) {
  return (
    <View style={[styles.handleWithHeader, style, { backgroundColor: headerBg }]}>
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={onHeaderBackPress || onClose}
        >
          {onHeaderBackPress ? (
            <ChevronLeftIcon size={20} color="#fff" />
          ) : (
            <ChevronDownIcon size={20} color="#fff" />
          )}
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : <View style={styles.spacer} />}
      </View>
    </View>
  );
}

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
  onHeaderBackPress,
  headerRight,
  contentPaddingTop = 12,
  scrollable = true,
  enableDynamicSizing = false,
  maxDynamicContentSize,
  contentMinHeight,
  initialSnapIndex = 0,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const prevIndexRef = useRef(-1);
  const headerBg = accentColor || colors.primaryBrand;

  // Web: paddingBottom: calc(env(safe-area-inset-bottom) + 80px) for footer
  const footerPaddingBottom = Math.max(insets.bottom, 20) + 24;

  const handleComponent = useCallback(
    (props) => (
      <HeaderHandle
        {...props}
        onClose={onClose}
        onHeaderBackPress={onHeaderBackPress}
        title={title}
        headerRight={headerRight}
        headerBg={headerBg}
      />
    ),
    [onClose, onHeaderBackPress, title, headerRight, headerBg]
  );

  const footerComponent = useCallback(
    (props) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <View style={[styles.footer, { backgroundColor: colors.halfsheetBg || colors.cardBg, paddingBottom: footerPaddingBottom }]}>
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, colors.halfsheetBg, colors.cardBg, footerPaddingBottom, insets.bottom]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={initialSnapIndex}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      maxDynamicContentSize={maxDynamicContentSize}
      enablePanDownToClose={enablePanDownToClose}
      enableOverDrag={true}
      onClose={onClose}
      onChange={(index) => {
        const prev = prevIndexRef.current;
        prevIndexRef.current = index;
        if (prev < 0 && index >= 0 && onOpen) onOpen();
      }}
      backgroundStyle={{ backgroundColor: colors.halfsheetBg || colors.cardBg }}
      handleComponent={handleComponent}
      footerComponent={footerComponent}
      style={styles.modal}
      containerComponent={Platform.OS === 'ios' ? FullWindowOverlay : undefined}
    >
      {scrollable ? (
        <BottomSheetScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: contentPaddingTop },
            contentMinHeight != null && { minHeight: contentMinHeight },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.scroll} enableFooterMarginAdjustment={!!footer}>
          <View
            style={[
              styles.scrollContent,
              { paddingTop: contentPaddingTop },
              contentMinHeight != null && { minHeight: contentMinHeight, flex: 0 },
            ]}
          >
            {children}
          </View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleWithHeader: {
    paddingBottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 60,
  },
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
  headerRight: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
  scroll: {
    flex: 1,
  },
  // Web: px-6 pb-2; FeedSheet pt-3 (12), DiaperSheet/SleepSheet pt-10 (40)
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  // Web: px-6 pt-3 pb-1 + safe area; flexShrink: 0 so CTA stays fixed at bottom
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    flexShrink: 0,
  },
});
