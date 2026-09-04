/**
 * RemoveAdsSheet — one-time Remove Ads purchase half-sheet (iOS-only).
 * Opened from Settings, ad cards, or automatic post-log prompts.
 * Does not import useAds (avoids circular dependency with AdsContext).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  markAutoPromptDismissed,
  markAutoPromptPresented,
  markAutoPromptPurchased,
} from '../../services/removeAdsPromptService';
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
  'No banners or full-screen ads',
  'One payment. Ads removed forever.',
  'Tied to your account — on every device you sign in',
];

const PENDING_CONFIRM_MS = 10000;

function analyticsProps(presentation) {
  if (!presentation) return {};
  return {
    source: presentation.source || 'manual',
    ...(presentation.trigger ? { trigger: presentation.trigger } : {}),
    ...(presentation.logCount != null
      ? { lifetime_log_count: presentation.logCount }
      : {}),
    ...(presentation.appAgeHours != null
      ? { app_age_hours: presentation.appAgeHours }
      : {}),
    ...(presentation.accountAgeHours != null
      ? { account_age_hours: presentation.accountAgeHours }
      : {}),
  };
}

export default function RemoveAdsSheet({
  sheetRef,
  entitlement,
  onEntitlementChange,
  getPresentation,
  uid,
}) {
  const { colors, radius, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  // Empty until StoreKit/RC resolves — avoid a fake $9.99 that masks load failures.
  const [priceString, setPriceString] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const pendingWaitRef = useRef(false);
  const pendingTimerRef = useRef(null);
  const sessionRef = useRef({
    source: 'manual',
    trigger: null,
    logCount: null,
    appAgeHours: null,
    accountAgeHours: null,
    purchased: false,
  });

  const clearPendingWait = useCallback(() => {
    pendingWaitRef.current = false;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  const loadPrice = useCallback(async () => {
    const pkg = await getRemoveAdsPackage();
    const next = pkg?.product?.priceString;
    setPriceString(typeof next === 'string' && next.trim() ? next.trim() : '');
  }, []);

  const trackPurchased = useCallback(() => {
    const session = sessionRef.current;
    session.purchased = true;
    capture('remove_ads_purchased', analyticsProps(session));
    if (session.source === 'auto') {
      void markAutoPromptPurchased(uid);
    }
  }, [uid]);

  const handleOpen = useCallback(() => {
    clearPendingWait();
    setErrorMessage(null);
    setBusy(false);
    const presentation = getPresentation?.() || { source: 'manual' };
    sessionRef.current = {
      source: presentation.source || 'manual',
      trigger: presentation.trigger || null,
      logCount: presentation.logCount ?? null,
      appAgeHours: presentation.appAgeHours ?? null,
      accountAgeHours: presentation.accountAgeHours ?? null,
      purchased: false,
    };
    capture('remove_ads_viewed', analyticsProps(sessionRef.current));
    if (sessionRef.current.source === 'auto' && sessionRef.current.trigger) {
      capture('remove_ads_auto_prompt_viewed', analyticsProps(sessionRef.current));
      void markAutoPromptPresented(uid, sessionRef.current.trigger);
    }
    loadPrice();
  }, [loadPrice, clearPendingWait, getPresentation, uid]);

  const handleClose = useCallback(() => {
    const session = sessionRef.current;
    if (session.source !== 'auto' || !session.trigger || session.purchased) return;
    capture('remove_ads_auto_prompt_dismissed', analyticsProps(session));
    void markAutoPromptDismissed(uid, session.trigger);
  }, [uid]);

  useEffect(() => {
    loadPrice();
  }, [loadPrice]);

  useEffect(() => {
    return () => clearPendingWait();
  }, [clearPendingWait]);

  useEffect(() => {
    if (!pendingWaitRef.current) return;
    if (entitlement !== 'entitled') return;
    clearPendingWait();
    trackPurchased();
    onEntitlementChange?.('entitled');
    sheetRef?.current?.dismiss?.();
    setBusy(false);
  }, [entitlement, clearPendingWait, onEntitlementChange, sheetRef, trackPurchased]);

  const handlePurchase = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    const result = await purchaseRemoveAds();
    if (result.status === 'cancelled') {
      setBusy(false);
      return;
    }
    if (result.status === 'purchased') {
      trackPurchased();
      onEntitlementChange?.('entitled');
      sheetRef?.current?.dismiss?.();
      setBusy(false);
      return;
    }
    if (result.status === 'pending') {
      pendingWaitRef.current = true;
      if (entitlement === 'entitled') {
        clearPendingWait();
        trackPurchased();
        onEntitlementChange?.('entitled');
        sheetRef?.current?.dismiss?.();
        setBusy(false);
        return;
      }
      pendingTimerRef.current = setTimeout(() => {
        pendingWaitRef.current = false;
        pendingTimerRef.current = null;
        setBusy(false);
        setErrorMessage('Purchase is still confirming. Check back shortly.');
      }, PENDING_CONFIRM_MS);
      return;
    }
    setBusy(false);
    if (result.status === 'no_package') {
      setErrorMessage('Purchase unavailable right now. Try again later.');
      return;
    }
    setErrorMessage('Something went wrong. Please try again.');
  }, [busy, entitlement, clearPendingWait, onEntitlementChange, sheetRef, trackPurchased]);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    const result = await restorePurchases();
    setBusy(false);
    if (result.status === 'restored') {
      sessionRef.current.purchased = true;
      if (sessionRef.current.source === 'auto') {
        void markAutoPromptPurchased(uid);
      }
      capture('remove_ads_restored', analyticsProps(sessionRef.current));
      onEntitlementChange?.('entitled');
      sheetRef?.current?.dismiss?.();
      return;
    }
    if (result.status === 'none') {
      setErrorMessage('No previous purchase found for this account.');
      return;
    }
    setErrorMessage('Restore failed. Please try again.');
  }, [busy, onEntitlementChange, sheetRef, uid]);

  const cardRadius = radius?.['2xl'] ?? 18;
  const ctaBg = colors.primaryActionBg || '#1A1A1A';
  const ctaText = colors.primaryActionText || '#FFFFFF';
  const glyphTint = isDark ? 'rgba(245,102,125,0.22)' : 'rgba(245,102,125,0.16)';

  return (
    <HalfSheet
      sheetRef={sheetRef}
      headerMode="plain"
      showBackdrop
      enableDynamicSizing
      scrollable={false}
      onOpen={handleOpen}
      onClose={handleClose}
      useFullWindowOverlay={false}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.glyph,
            { backgroundColor: glyphTint, borderRadius: cardRadius },
          ]}
        >
          <Text style={styles.glyphText}>AD</Text>
          <View style={styles.glyphStrike} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: FRAUNCES }]}>
          Remove ads forever
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          One payment. Keep every screen clean — no banners, no interstitials,
          ever.
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

        <Pressable
          onPress={handlePurchase}
          disabled={busy}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: ctaBg,
              borderRadius: radius?.xl ?? 16,
              opacity: busy ? 0.7 : pressed ? 0.92 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={ctaText} />
          ) : (
            <Text style={[styles.ctaText, { color: ctaText }]}>
              {priceString ? `Remove Ads · ${priceString}` : 'Remove Ads'}
            </Text>
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

        {errorMessage ? (
          <Text
            style={[
              styles.error,
              { color: colors.error || colors.bottle?.primary || '#f5667d' },
            ]}
          >
            {errorMessage}
          </Text>
        ) : null}

        <View style={{ height: Math.max(insets?.bottom || 0, 16) + 16 }} />
      </View>
    </HalfSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    paddingTop: 12,
  },
  glyph: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  glyphText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5667d',
    letterSpacing: 0.5,
    fontFamily: FWB.bold,
  },
  glyphStrike: {
    position: 'absolute',
    width: 58,
    height: 3,
    backgroundColor: '#f5667d',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 23,
    fontFamily: FWB.normal,
  },
  benefits: {
    marginTop: 36,
    gap: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52,199,89,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    fontFamily: FWB.normal,
  },
  cta: {
    marginTop: 36,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FWB.bold,
  },
  restore: {
    marginTop: 20,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 15,
    fontFamily: FWB.normal,
  },
  error: {
    marginTop: 12,
    paddingHorizontal: 16,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FWB.normal,
  },
});
