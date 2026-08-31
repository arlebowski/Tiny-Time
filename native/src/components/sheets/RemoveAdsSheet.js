/**
 * RemoveAdsSheet — one-time Remove Ads purchase half-sheet (iOS-only).
 * Opened from Settings or the "Remove ads" link on ad cards.
 * Does not import useAds (avoids circular dependency with AdsContext).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import HalfSheet from './HalfSheet';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import {
  getRemoveAdsPackage,
  purchaseRemoveAds,
  restorePurchases,
} from '../../services/purchasesService';
import { capture } from '../../services/posthogService';

const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';
const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

function CheckIcon({ size = 14, color = '#34C759' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
    </Svg>
  );
}

const BENEFITS = [
  'No ads, anywhere',
  'One payment. Ads removed forever.',
  'Tied to your account — on every device you sign in',
];

export default function RemoveAdsSheet({ sheetRef, onEntitlementChange }) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [priceString, setPriceString] = useState('$9.99');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadPrice = useCallback(async () => {
    const pkg = await getRemoveAdsPackage();
    const next = pkg?.product?.priceString;
    if (typeof next === 'string' && next.trim()) {
      setPriceString(next.trim());
    }
  }, []);

  const handleOpen = useCallback(() => {
    setErrorMessage(null);
    setBusy(false);
    capture('remove_ads_viewed');
    loadPrice();
  }, [loadPrice]);

  useEffect(() => {
    loadPrice();
  }, [loadPrice]);

  const handlePurchase = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    const result = await purchaseRemoveAds();
    setBusy(false);
    if (result.status === 'cancelled') return;
    if (result.status === 'purchased') {
      capture('remove_ads_purchased');
      onEntitlementChange?.('entitled');
      sheetRef?.current?.dismiss?.();
      return;
    }
    if (result.status === 'no_package') {
      setErrorMessage('Purchase unavailable right now. Try again later.');
      return;
    }
    setErrorMessage('Something went wrong. Please try again.');
  }, [busy, onEntitlementChange, sheetRef]);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    const result = await restorePurchases();
    setBusy(false);
    if (result.status === 'restored') {
      capture('remove_ads_restored');
      onEntitlementChange?.('entitled');
      sheetRef?.current?.dismiss?.();
      return;
    }
    if (result.status === 'none') {
      setErrorMessage('No previous purchase found for this account.');
      return;
    }
    setErrorMessage('Restore failed. Please try again.');
  }, [busy, onEntitlementChange, sheetRef]);

  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Remove Ads"
      accentColor={colors.primaryActionBg || colors.primaryBrand}
      headerTitleColor={colors.primaryActionText || colors.textOnAccent || '#fff'}
      headerIconColor={colors.primaryActionText || colors.textOnAccent || '#fff'}
      enableDynamicSizing
      scrollable={false}
      contentPaddingTop={8}
      onOpen={handleOpen}
      useFullWindowOverlay={false}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.glyph,
            { backgroundColor: 'rgba(245,102,125,0.18)', borderRadius: radius?.xl ?? 16 },
          ]}
        >
          <Text style={styles.glyphText}>AD</Text>
          <View style={styles.glyphStrike} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: FRAUNCES }]}>
          Remove ads forever
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          One payment. Keep every screen clean — no ads, anywhere.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((line) => (
            <View key={line} style={styles.benefitRow}>
              <View style={styles.checkWrap}>
                <CheckIcon />
              </View>
              <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{line}</Text>
            </View>
          ))}
        </View>

        {errorMessage ? (
          <Text style={[styles.error, { color: colors.bottle?.primary || '#f5667d' }]}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          onPress={handlePurchase}
          disabled={busy}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: '#fff',
              borderRadius: radius?.['2xl'] ?? 16,
              opacity: busy ? 0.7 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaText}>{`Remove Ads · ${priceString}`}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleRestore}
          disabled={busy}
          style={({ pressed }) => [styles.restore, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Restore purchase
          </Text>
        </Pressable>

        <View style={{ height: (insets?.bottom || 0) + 16 }} />
      </View>
    </HalfSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    gap: 0,
  },
  glyph: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  glyphText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f5667d',
    letterSpacing: 0.5,
    fontFamily: FWB.bold,
  },
  glyphStrike: {
    position: 'absolute',
    width: 50,
    height: 3,
    backgroundColor: '#f5667d',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontFamily: FWB.normal,
  },
  benefits: {
    marginTop: 22,
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52,199,89,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FWB.normal,
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: FWB.normal,
  },
  cta: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    fontFamily: FWB.bold,
  },
  restore: {
    marginTop: 16,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    fontFamily: FWB.normal,
  },
});
