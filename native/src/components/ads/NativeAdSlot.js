/**
 * NativeAdSlot — gated native ad loader.
 * Reserves card chrome (shimmer skeleton) as soon as ads may show, then
 * fills when AdMob returns creative. Returns null when gated off.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useFeatureFlag } from 'posthog-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAds } from '../../context/AdsContext';
import { useTrackerStack } from '../navigation/TrackerStack';
import { MONETIZATION_SUPPORTED } from '../../services/monetization';
import {
  getAdUnitId,
  initializeAds,
  trackAdImpression,
  trackAdLoadFailure,
  trackAdRevenue,
} from '../../services/adsService';
import NativeAdCard from './NativeAdCard';

const IS_ANDROID = Platform.OS === 'android';

const FLAG_BY_PLACEMENT = {
  home: 'home_native_ad_enabled',
  timeline: 'timeline_native_ad_enabled',
};

function getAdsModule() {
  if (!MONETIZATION_SUPPORTED) return null;
  try {
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

function NativeAdSkeleton({ variant = 'home' }) {
  const { colors, radius, shadows } = useTheme();
  const pulse = useSharedValue(0.45);
  const isTimeline = variant === 'timeline';

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const boneStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const bone = colors.segTrack || colors.track || 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[
        isTimeline ? styles.skeletonTimeline : styles.skeletonHome,
        {
          backgroundColor: colors.cardBg,
          borderRadius: isTimeline
            ? radius?.xl ?? 16
            : radius?.['2xl'] ?? 18,
          ...(shadows?.card || null),
        },
      ]}
    >
      <View
        style={[
          styles.skeletonTopRow,
          isTimeline && styles.skeletonTopRowTimeline,
        ]}
      >
        <Animated.View
          style={[
            isTimeline ? styles.skeletonBadgeTimeline : styles.skeletonBadge,
            { backgroundColor: bone },
            boneStyle,
          ]}
        />
        <Animated.View
          style={[
            isTimeline ? styles.skeletonRemoveTimeline : styles.skeletonRemove,
            { backgroundColor: bone },
            boneStyle,
          ]}
        />
      </View>
      <View style={styles.skeletonBody}>
        <Animated.View
          style={[styles.skeletonIcon, { backgroundColor: bone }, boneStyle]}
        />
        <View style={styles.skeletonCopy}>
          <Animated.View
            style={[styles.skeletonLineWide, { backgroundColor: bone }, boneStyle]}
          />
          <Animated.View
            style={[styles.skeletonLineNarrow, { backgroundColor: bone }, boneStyle]}
          />
        </View>
        <Animated.View
          style={[styles.skeletonCta, { backgroundColor: bone }, boneStyle]}
        />
      </View>
    </View>
  );
}

export default function NativeAdSlot({ placement = 'home', entrance = null }) {
  const { adsEnabled, adsPending, openRemoveAds } = useAds();
  const isFocused = useIsFocused();
  const trackerStack = useTrackerStack();
  const isTabActive = trackerStack?.isTabActive ?? true;
  const flag = useFeatureFlag(FLAG_BY_PLACEMENT[placement]);
  // Prod: fail closed until PostHog returns true. Dev: allow while the flag
  // is still loading (undefined) so layout/fill can be verified.
  const flagAllows = __DEV__ ? flag !== false : flag === true;

  // Reserve the slot while gates resolve, or once ads are allowed.
  const shouldReserve =
    MONETIZATION_SUPPORTED &&
    (adsEnabled || adsPending) &&
    isFocused &&
    isTabActive &&
    flagAllows;

  const [nativeAd, setNativeAd] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const adRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!adsEnabled || !shouldReserve) {
      if (adRef.current) {
        try {
          adRef.current.destroy();
        } catch {
          /* ignore */
        }
        adRef.current = null;
      }
      setNativeAd(null);
      setLoadFailed(false);
      return undefined;
    }

    const ads = getAdsModule();
    const unitId = getAdUnitId(placement);
    if (!ads?.NativeAd || !unitId) {
      setLoadFailed(true);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setLoadFailed(false);

    (async () => {
      await initializeAds();
      if (cancelled || requestId !== requestIdRef.current) return;
      try {
        const ad = await ads.NativeAd.createForAdRequest(unitId);
        if (cancelled || requestId !== requestIdRef.current) {
          try {
            ad.destroy();
          } catch {
            /* ignore */
          }
          return;
        }
        adRef.current = ad;
        setNativeAd(ad);
        setLoadFailed(false);
      } catch (error) {
        if (cancelled || requestId !== requestIdRef.current) return;
        trackAdLoadFailure(placement, error);
        setNativeAd(null);
        setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (adRef.current) {
        try {
          adRef.current.destroy();
        } catch {
          /* ignore */
        }
        adRef.current = null;
      }
      setNativeAd(null);
    };
  }, [adsEnabled, shouldReserve, placement]);

  useEffect(() => {
    if (!nativeAd) return undefined;
    const ads = getAdsModule();
    if (!ads?.NativeAdEventType) return undefined;

    const { NativeAdEventType } = ads;
    const impression = nativeAd.addAdEventListener(
      NativeAdEventType.IMPRESSION,
      () => trackAdImpression(placement)
    );
    const paid = nativeAd.addAdEventListener(
      NativeAdEventType.PAID,
      (event) => trackAdRevenue(placement, event)
    );

    return () => {
      try {
        impression?.remove?.();
        paid?.remove?.();
      } catch {
        /* ignore */
      }
    };
  }, [nativeAd, placement]);

  if (!shouldReserve || loadFailed) return null;

  const content = nativeAd ? (
    <NativeAdCard
      nativeAd={nativeAd}
      variant={placement}
      onRemoveAdsPress={openRemoveAds}
    />
  ) : (
    <NativeAdSkeleton variant={placement} />
  );

  if (!entrance) return content;

  return (
    <Animated.View
      entering={entrance}
      renderToHardwareTextureAndroid={IS_ANDROID}
      collapsable={IS_ANDROID ? false : undefined}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeletonHome: {
    padding: 20,
  },
  skeletonTimeline: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  skeletonTopRowTimeline: {
    marginBottom: 10,
  },
  skeletonBadge: {
    width: 72,
    height: 18,
    borderRadius: 5,
  },
  skeletonBadgeTimeline: {
    width: 28,
    height: 16,
    borderRadius: 4,
  },
  skeletonRemove: {
    width: 88,
    height: 14,
    borderRadius: 4,
  },
  skeletonRemoveTimeline: {
    width: 78,
    height: 12,
    borderRadius: 4,
  },
  skeletonBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonLineWide: {
    height: 14,
    width: '88%',
    borderRadius: 4,
  },
  skeletonLineNarrow: {
    height: 12,
    width: '52%',
    borderRadius: 4,
  },
  skeletonCta: {
    width: 72,
    height: 34,
    borderRadius: 10,
  },
});
