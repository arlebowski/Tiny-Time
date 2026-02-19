/**
 * HalfSheet — cleaned + standardized
 * - Lower CTA (no artificial lift)
 * - Consistent snap model
 * - Safe area respected
 * - No double bottom insets
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ChevronDownIcon, ChevronLeftIcon } from '../icons';

function HeaderHandle({
  style,
  onClosePress,
  onHeaderBackPress,
  title,
  headerRight,
  headerBg,
  topRadius,
  headerTitleColor,
  headerIconColor,
}) {
  const { colors } = useTheme();
  const resolvedTitleColor = headerTitleColor || colors.textOnAccent || '#fff';
  const resolvedIconColor = headerIconColor || resolvedTitleColor;
  return (
    <View
      style={[
        styles.handleWithHeader,
        style,
        {
          backgroundColor: headerBg,
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={onHeaderBackPress || onClosePress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={onHeaderBackPress ? 'Go back' : 'Close sheet'}
        >
          {onHeaderBackPress ? (
            <ChevronLeftIcon size={20} color={resolvedIconColor} />
          ) : (
            <ChevronDownIcon size={20} color={resolvedIconColor} />
          )}
        </Pressable>

        <Text style={[styles.title, { color: resolvedTitleColor }]} numberOfLines={1}>
          {title}
        </Text>

        {headerRight ? (
          <View style={styles.headerRight}>{headerRight}</View>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

export default function HalfSheet({
  sheetRef,
  snapPoints = ['85%', '90%'],
  title,
  accentColor,
  onClose,
  onOpen,
  children,
  footer,
  enablePanDownToClose = true,
  enableContentPanningGesture = true,
  enableHandlePanningGesture = true,
  onHeaderBackPress,
  headerRight,
  headerTitleColor,
  headerIconColor,
  contentPaddingTop = 16,
  scrollable = false,
  enableDynamicSizing = true,
  initialSnapIndex = 0,
}) {
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const prevIndexRef = useRef(-1);
  const headerBg = accentColor || colors.primaryBrand;
  const topRadius = radius?.['3xl'] ?? 20;

  const handleComponent = useCallback(
    (props) => (
      <HeaderHandle
        {...props}
        onClosePress={() => {
          if (sheetRef?.current?.dismiss) {
            sheetRef.current.dismiss();
            return;
          }
          onClose?.();
        }}
        onHeaderBackPress={onHeaderBackPress}
        title={title}
        headerRight={headerRight}
        headerBg={headerBg}
        topRadius={topRadius}
        headerTitleColor={headerTitleColor}
        headerIconColor={headerIconColor}
      />
    ),
    [
      sheetRef,
      onClose,
      onHeaderBackPress,
      title,
      headerRight,
      headerBg,
      topRadius,
      headerTitleColor,
      headerIconColor,
    ]
  );

  const footerComponent = useCallback(
    (props) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.halfsheetBg || colors.cardBg,
                paddingBottom: insets.bottom + 50, // only safe area, no artificial lift
              },
            ]}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, colors.halfsheetBg, colors.cardBg, insets.bottom]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={initialSnapIndex}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      enableContentPanningGesture={enableContentPanningGesture}
      enableHandlePanningGesture={enableHandlePanningGesture}
      enableOverDrag
      onClose={onClose}
      onChange={(index) => {
        const prev = prevIndexRef.current;
        prevIndexRef.current = index;
        if (prev < 0 && index >= 0 && onOpen) onOpen();
      }}
      backgroundStyle={{
        backgroundColor: colors.halfsheetBg || colors.cardBg,
        borderTopLeftRadius: topRadius,
        borderTopRightRadius: topRadius,
      }}
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
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.scroll} enableFooterMarginAdjustment={!!footer}>
          <View
            style={[
              styles.scrollContent,
              { paddingTop: contentPaddingTop },
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
    overflow: 'hidden',
  },

  handleWithHeader: {
    overflow: 'hidden',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 60,
  },

  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  spacer: {
    width: 24,
  },

  headerRight: {
    minWidth: 24,
    alignItems: 'flex-end',
  },

  scroll: {},

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
