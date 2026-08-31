/**
 * NativeAdSlot — gated native ad loader.
 * Loads only when monetization, entitlement, consent, focus, tab, and
 * PostHog flag all allow it. Returns null otherwise (no layout shift).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useFeatureFlag } from 'posthog-react-native';
import { useAds } from '../../context/AdsContext';
import { useTrackerStack } from '../navigation/TrackerStack';
import { MONETIZATION_SUPPORTED } from '../../services/monetization';
import {
  getAdUnitId,
  trackAdImpression,
  trackAdLoadFailure,
  trackAdRevenue,
} from '../../services/adsService';
import NativeAdCard from './NativeAdCard';

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

export default function NativeAdSlot({ placement = 'home' }) {
  const { adsEnabled, openRemoveAds } = useAds();
  const isFocused = useIsFocused();
  const trackerStack = useTrackerStack();
  const isTabActive = trackerStack?.isTabActive ?? true;
  const flag = useFeatureFlag(FLAG_BY_PLACEMENT[placement]);

  const enabled =
    MONETIZATION_SUPPORTED &&
    adsEnabled &&
    isFocused &&
    isTabActive &&
    flag === true;

  const [nativeAd, setNativeAd] = useState(null);
  const adRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (adRef.current) {
        try {
          adRef.current.destroy();
        } catch {
          /* ignore */
        }
        adRef.current = null;
      }
      setNativeAd(null);
      return undefined;
    }

    const ads = getAdsModule();
    const unitId = getAdUnitId(placement);
    if (!ads?.NativeAd || !unitId) return undefined;

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    ads.NativeAd.createForAdRequest(unitId)
      .then((ad) => {
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
      })
      .catch((error) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        trackAdLoadFailure(placement, error);
        setNativeAd(null);
      });

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
  }, [enabled, placement]);

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

  if (!enabled || !nativeAd) return null;

  return (
    <NativeAdCard
      nativeAd={nativeAd}
      variant={placement}
      onRemoveAdsPress={openRemoveAds}
    />
  );
}
