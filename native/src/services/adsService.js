/**
 * adsService — AdMob (iOS-only).
 * Owns all ad unit IDs. Lazy-requires the SDK so Android never loads it.
 *
 * Close delay on interstitials is AdMob's (SDK close button), not app-owned.
 */
import { Platform } from 'react-native';
import { MONETIZATION_SUPPORTED } from './monetization';
import { capture } from './posthogService';

const { consentResultFromInfo } = require('./adsGatePolicy.cjs');
const {
  PRESENTATION_CANCELLED,
  beginSerializedPresentationIfIdle,
  runSerializedPresentation,
  runSerializedPresentationWhenIdle,
} = require('./presentationActivityService.cjs');

// iOS AdMob units. No Android app or units exist yet; ads are iOS-only.
const IOS_AD_UNITS = {
  home: 'ca-app-pub-3734956448133132/8104891697',
  timeline: 'ca-app-pub-3734956448133132/4293261893',
  trends: 'ca-app-pub-3734956448133132/7317586887',
  interstitial: 'ca-app-pub-3734956448133132/7482389794',
  trendsDetailExitInterstitial: 'ca-app-pub-3734956448133132/2596577394',
};

const INTERSTITIAL_UNIT_PLACEMENTS = new Set([
  'interstitial',
  'trendsDetailExitInterstitial',
]);

const INTERSTITIAL_RETRY_MS = 15_000;

let initPromise = null;

function getAdsModule() {
  if (!MONETIZATION_SUPPORTED) return null;
  try {
    return require('react-native-google-mobile-ads');
  } catch (error) {
    console.warn('[Ads] native module unavailable:', error);
    return null;
  }
}

function getTestIds() {
  return getAdsModule()?.TestIds ?? null;
}

export const getAdUnitId = (placement) => {
  if (__DEV__) {
    const testIds = getTestIds();
    if (INTERSTITIAL_UNIT_PLACEMENTS.has(placement) && testIds?.INTERSTITIAL) {
      return testIds.INTERSTITIAL;
    }
    if (!INTERSTITIAL_UNIT_PLACEMENTS.has(placement) && testIds?.NATIVE) {
      return testIds.NATIVE;
    }
  }
  return IOS_AD_UNITS[placement] ?? null;
};

export async function gatherAdsConsent({ canPresent } = {}) {
  const result = await runSerializedPresentationWhenIdle('ads-consent', async () => {
    if (!MONETIZATION_SUPPORTED) {
      return { canRequestAds: false, privacyOptionsRequired: false };
    }

    const ads = getAdsModule();
    if (!ads) {
      return { canRequestAds: false, privacyOptionsRequired: false };
    }

    const { AdsConsent, AdsConsentDebugGeography } = ads;
    try {
      // EEA debug only when explicitly requested — forcing EEA with no UMP
      // form configured makes gatherConsent fail and blocks all ads in Simulator.
      const debugEea =
        __DEV__ && process.env.EXPO_PUBLIC_ADS_DEBUG_EEA === '1';
      const options = __DEV__
        ? {
            ...(debugEea
              ? { debugGeography: AdsConsentDebugGeography.EEA }
              : null),
            testDeviceIdentifiers: ['EMULATOR'],
          }
        : undefined;

      await AdsConsent.gatherConsent(options);
      const info = await AdsConsent.getConsentInfo();
      return consentResultFromInfo(info);
    } catch (error) {
      console.warn('[Ads] gatherConsent failed:', error);
      // UMP may still have valid consent from an earlier session. Google
      // recommends checking canRequestAds even when this launch's update fails.
      try {
        const cachedInfo = await AdsConsent.getConsentInfo();
        return consentResultFromInfo(cachedInfo, true);
      } catch (cachedError) {
        console.warn('[Ads] cached consent unavailable:', cachedError);
        return {
          canRequestAds: false,
          privacyOptionsRequired: false,
          hadError: true,
        };
      }
    }
  }, { canStart: canPresent });

  if (result === PRESENTATION_CANCELLED) {
    return {
      canRequestAds: false,
      privacyOptionsRequired: false,
      cancelled: true,
    };
  }
  return result;
}

export function initializeAds() {
  if (!MONETIZATION_SUPPORTED) return Promise.resolve(false);
  if (initPromise) return initPromise;

  const ads = getAdsModule();
  if (!ads) return Promise.resolve(false);

  initPromise = ads
    .default()
    .initialize()
    .then(() => true)
    .catch((error) => {
      console.error('[Ads] initialize failed:', error);
      initPromise = null;
      return false;
    });

  return initPromise;
}

export async function showPrivacyOptions() {
  if (!MONETIZATION_SUPPORTED) return;
  const ads = getAdsModule();
  if (!ads) return;
  return runSerializedPresentation('ads-privacy-options', async () => {
    try {
      await ads.AdsConsent.showPrivacyOptionsForm();
    } catch (error) {
      console.warn('[Ads] showPrivacyOptionsForm failed:', error);
    }
  });
}

export async function resetConsent() {
  if (!MONETIZATION_SUPPORTED || !__DEV__) return;
  const ads = getAdsModule();
  if (!ads) return;
  try {
    await ads.AdsConsent.reset();
  } catch (error) {
    console.warn('[Ads] resetConsent failed:', error);
  }
}

export const trackAdImpression = (placement) =>
  capture('ad_impression', { placement });

export const trackAdLoadFailure = (placement, error) =>
  capture('ad_load_failed', {
    placement,
    error_code: error?.code ?? null,
    error_message: typeof error?.message === 'string' ? error.message : null,
  });

export const trackAdRevenue = (placement, paid) =>
  capture('ad_revenue', {
    placement,
    value: paid?.value ?? null,
    currency: paid?.currency ?? null,
    precision: paid?.precision ?? null,
  });

function createInterstitialController({ unitPlacement, analyticsPlacement }) {
  let ad = null;
  let unsubs = [];
  let retryTimer = null;
  let finishActive = null;
  let loadingEnabled = false;

  const clearRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const clearListeners = () => {
    unsubs.forEach((unsub) => {
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    });
    unsubs = [];
  };

  const tearDown = () => {
    clearListeners();
    if (ad) {
      try {
        ad.removeAllListeners?.();
      } catch {
        /* ignore */
      }
    }
    ad = null;
  };

  const scheduleRetry = () => {
    if (!MONETIZATION_SUPPORTED || !loadingEnabled) return;
    clearRetry();
    retryTimer = setTimeout(() => {
      retryTimer = null;
      preload();
    }, INTERSTITIAL_RETRY_MS);
  };

  const bindListeners = (nextAd, ads) => {
    const { AdEventType } = ads;
    unsubs.push(
      nextAd.addAdEventListener(AdEventType.ERROR, (error) => {
        finishActive?.(false);
        capture('interstitial_ad_load_failed', {
          placement: analyticsPlacement,
          error_code: error?.code ?? null,
          error_message: typeof error?.message === 'string' ? error.message : null,
        });
        if (!loadingEnabled) tearDown();
        else scheduleRetry();
      })
    );
    unsubs.push(
      nextAd.addAdEventListener(AdEventType.OPENED, () => {
        capture('interstitial_ad_impression', { placement: analyticsPlacement });
      })
    );
    unsubs.push(
      nextAd.addAdEventListener(AdEventType.CLOSED, () => {
        finishActive?.(true);
        if (!loadingEnabled) tearDown();
        else preload();
      })
    );
    unsubs.push(
      nextAd.addAdEventListener(AdEventType.PAID, (event) => {
        capture('interstitial_ad_revenue', {
          placement: analyticsPlacement,
          value: event?.value ?? null,
          currency: event?.currency ?? null,
          precision: event?.precision ?? null,
        });
      })
    );
  };

  function isLoaded() {
    return Boolean(ad?.loaded);
  }

  function stop() {
    clearRetry();
    loadingEnabled = false;
    if (finishActive) {
      // GMA cannot dismiss an onscreen interstitial programmatically. Keep the
      // listeners and reservation alive until iOS removes it.
      return;
    }
    tearDown();
  }

  function preload() {
    if (!MONETIZATION_SUPPORTED) return;
    loadingEnabled = true;
    if (finishActive) return;

    const ads = getAdsModule();
    const unitId = getAdUnitId(unitPlacement);
    if (!ads?.InterstitialAd || !unitId || ad?.loaded) return;

    if (!ad) {
      try {
        ad = ads.InterstitialAd.createForAdRequest(unitId);
      } catch (error) {
        console.warn(`[Ads] ${analyticsPlacement} interstitial create failed:`, error);
        capture('interstitial_ad_load_failed', {
          placement: analyticsPlacement,
          error_code: error?.code ?? null,
          error_message: typeof error?.message === 'string' ? error.message : null,
        });
        return;
      }
      clearListeners();
      bindListeners(ad, ads);
    }

    try {
      ad.load();
    } catch (error) {
      console.warn(`[Ads] ${analyticsPlacement} interstitial load failed:`, error);
      capture('interstitial_ad_load_failed', {
        placement: analyticsPlacement,
        error_code: error?.code ?? null,
        error_message: typeof error?.message === 'string' ? error.message : null,
      });
    }
  }

  async function show() {
    if (!MONETIZATION_SUPPORTED || !ad?.loaded) return false;
    const reservation = beginSerializedPresentationIfIdle(
      `interstitial-ad:${analyticsPlacement}`
    );
    if (!reservation) return false;

    const loadedAd = ad;
    if (!loadedAd?.loaded) {
      reservation.end();
      return false;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (finishActive === finish) finishActive = null;
      reservation.end();
    };
    finishActive = finish;

    try {
      await loadedAd.show();
      return true;
    } catch (error) {
      console.warn(`[Ads] ${analyticsPlacement} interstitial show failed:`, error);
      finish();
      if (loadingEnabled) preload();
      else tearDown();
      return false;
    }
  }

  async function showWhenReady(timeoutMs = 10000) {
    if (!MONETIZATION_SUPPORTED) return false;
    preload();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (isLoaded()) return show();
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.warn(`[Ads] ${analyticsPlacement} interstitial not ready within timeout`);
    return false;
  }

  return { isLoaded, stop, preload, show, showWhenReady };
}

const logInterstitial = createInterstitialController({
  unitPlacement: 'interstitial',
  analyticsPlacement: 'log_activity',
});

const trendsDetailExitInterstitial = createInterstitialController({
  unitPlacement: 'trendsDetailExitInterstitial',
  analyticsPlacement: 'trends_detail_exit',
});

export const isLogInterstitialLoaded = logInterstitial.isLoaded;
export const stopLogInterstitial = logInterstitial.stop;
export const preloadLogInterstitial = logInterstitial.preload;
export const showLogInterstitial = logInterstitial.show;
export const showLogInterstitialWhenReady = logInterstitial.showWhenReady;

export const isTrendsDetailExitInterstitialLoaded = trendsDetailExitInterstitial.isLoaded;
export const stopTrendsDetailExitInterstitial = trendsDetailExitInterstitial.stop;
export const preloadTrendsDetailExitInterstitial = trendsDetailExitInterstitial.preload;
export const showTrendsDetailExitInterstitial = trendsDetailExitInterstitial.show;
