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
  interstitial: 'ca-app-pub-3734956448133132/7482389794',
};

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
    if (placement === 'interstitial' && testIds?.INTERSTITIAL) {
      return testIds.INTERSTITIAL;
    }
    if (placement !== 'interstitial' && testIds?.NATIVE) {
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

const INTERSTITIAL_PLACEMENT = 'interstitial';

let interstitialAd = null;
let interstitialUnsubs = [];
let interstitialRetryTimer = null;
let finishActiveInterstitial = null;
let interstitialLoadingEnabled = false;

function clearInterstitialRetry() {
  if (interstitialRetryTimer) {
    clearTimeout(interstitialRetryTimer);
    interstitialRetryTimer = null;
  }
}

function clearInterstitialListeners() {
  interstitialUnsubs.forEach((unsub) => {
    try {
      unsub?.();
    } catch {
      /* ignore */
    }
  });
  interstitialUnsubs = [];
}

function tearDownInterstitial() {
  clearInterstitialListeners();
  if (interstitialAd) {
    try {
      interstitialAd.removeAllListeners?.();
    } catch {
      /* ignore */
    }
  }
  interstitialAd = null;
}

function bindInterstitialListeners(ad, ads) {
  const { AdEventType } = ads;
  interstitialUnsubs.push(
    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      finishActiveInterstitial?.(false);
      capture('interstitial_ad_load_failed', {
        placement: INTERSTITIAL_PLACEMENT,
        error_code: error?.code ?? null,
        error_message: typeof error?.message === 'string' ? error.message : null,
      });
      if (!interstitialLoadingEnabled) {
        tearDownInterstitial();
      } else {
        scheduleInterstitialRetry();
      }
    })
  );
  interstitialUnsubs.push(
    ad.addAdEventListener(AdEventType.OPENED, () => {
      capture('interstitial_ad_impression', { placement: INTERSTITIAL_PLACEMENT });
    })
  );
  interstitialUnsubs.push(
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      finishActiveInterstitial?.(true);
      if (!interstitialLoadingEnabled) {
        tearDownInterstitial();
      } else {
        preloadLogInterstitial();
      }
    })
  );
  interstitialUnsubs.push(
    ad.addAdEventListener(AdEventType.PAID, (event) => {
      capture('interstitial_ad_revenue', {
        placement: INTERSTITIAL_PLACEMENT,
        value: event?.value ?? null,
        currency: event?.currency ?? null,
        precision: event?.precision ?? null,
      });
    })
  );
}

function scheduleInterstitialRetry() {
  if (!MONETIZATION_SUPPORTED || !interstitialLoadingEnabled) return;
  clearInterstitialRetry();
  interstitialRetryTimer = setTimeout(() => {
    interstitialRetryTimer = null;
    preloadLogInterstitial();
  }, INTERSTITIAL_RETRY_MS);
}

export function isLogInterstitialLoaded() {
  return Boolean(interstitialAd?.loaded);
}

/** Tear down preload when ads are gated off (purchase, consent, Android). */
export function stopLogInterstitial() {
  clearInterstitialRetry();
  interstitialLoadingEnabled = false;
  if (finishActiveInterstitial) {
    // GMA cannot dismiss an onscreen interstitial programmatically. Keep the
    // close/error listeners and presentation reservation alive until iOS
    // actually removes it; only future loading is disabled.
    return;
  }
  tearDownInterstitial();
}

/**
 * Preload a single interstitial so cadence logs can show immediately.
 * No-ops on Android (SDK is not linked).
 */
export function preloadLogInterstitial() {
  if (!MONETIZATION_SUPPORTED) return;
  interstitialLoadingEnabled = true;
  if (finishActiveInterstitial) {
    // A later re-enable supersedes a stop requested while the current ad was
    // onscreen; CLOSED will then preload the next ad normally.
    return;
  }
  const ads = getAdsModule();
  const unitId = getAdUnitId(INTERSTITIAL_PLACEMENT);
  if (!ads?.InterstitialAd || !unitId) return;

  if (interstitialAd?.loaded) return;

  if (!interstitialAd) {
    try {
      interstitialAd = ads.InterstitialAd.createForAdRequest(unitId);
    } catch (error) {
      console.warn('[Ads] interstitial create failed:', error);
      capture('interstitial_ad_load_failed', {
        placement: INTERSTITIAL_PLACEMENT,
        error_code: error?.code ?? null,
        error_message: typeof error?.message === 'string' ? error.message : null,
      });
      return;
    }
    clearInterstitialListeners();
    bindInterstitialListeners(interstitialAd, ads);
  }

  try {
    interstitialAd.load();
  } catch (error) {
    console.warn('[Ads] interstitial load failed:', error);
    capture('interstitial_ad_load_failed', {
      placement: INTERSTITIAL_PLACEMENT,
      error_code: error?.code ?? null,
      error_message: typeof error?.message === 'string' ? error.message : null,
    });
  }
}

/** Present a loaded interstitial. Returns false if nothing was ready. */
export async function showLogInterstitial() {
  if (!MONETIZATION_SUPPORTED) return false;
  if (!interstitialAd?.loaded) return false;
  const reservation = beginSerializedPresentationIfIdle('interstitial-ad');
  if (!reservation) return false;

  const ad = interstitialAd;
  if (!ad?.loaded) {
    reservation.end();
    return false;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (finishActiveInterstitial === finish) {
      finishActiveInterstitial = null;
    }
    reservation.end();
  };
  finishActiveInterstitial = finish;

  try {
    // GMA resolves show() once presentation starts. Return that result so the
    // cadence is recorded immediately, while the reservation remains held
    // until CLOSED/ERROR calls finish().
    await ad.show();
    return true;
  } catch (error) {
    console.warn('[Ads] interstitial show failed:', error);
    finish();
    if (interstitialLoadingEnabled) {
      preloadLogInterstitial();
    } else {
      tearDownInterstitial();
    }
    return false;
  }
}

/** Dev helper: wait for a loaded test interstitial, then show it. */
export async function showLogInterstitialWhenReady(timeoutMs = 10000) {
  if (!MONETIZATION_SUPPORTED) return false;
  preloadLogInterstitial();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isLogInterstitialLoaded()) {
      return showLogInterstitial();
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.warn('[Ads] interstitial not ready within timeout');
  return false;
}
