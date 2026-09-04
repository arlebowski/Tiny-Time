/**
 * adsService — AdMob (iOS-only).
 * Owns all ad unit IDs. Lazy-requires the SDK so Android never loads it.
 */
import { MONETIZATION_SUPPORTED } from './monetization';
import { capture } from './posthogService';

// iOS AdMob units. No Android app or units exist yet; ads are iOS-only.
const IOS_AD_UNITS = {
  home: 'ca-app-pub-3734956448133132/8104891697',
  timeline: 'ca-app-pub-3734956448133132/4293261893',
};

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
    if (testIds?.NATIVE) return testIds.NATIVE;
  }
  return IOS_AD_UNITS[placement] ?? null;
};

export async function gatherAdsConsent() {
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
    return {
      canRequestAds: Boolean(info?.canRequestAds),
      privacyOptionsRequired: info?.privacyOptionsRequirementStatus === 'REQUIRED',
    };
  } catch (error) {
    console.warn('[Ads] gatherConsent failed:', error);
    // Dev: allow test ads when UMP forms are missing/misconfigured.
    if (__DEV__) {
      return { canRequestAds: true, privacyOptionsRequired: false };
    }
    return { canRequestAds: false, privacyOptionsRequired: false };
  }
}

export function initializeAds() {
  if (!MONETIZATION_SUPPORTED) return Promise.resolve();
  if (initPromise) return initPromise;

  const ads = getAdsModule();
  if (!ads) return Promise.resolve();

  initPromise = ads
    .default()
    .initialize()
    .catch((error) => {
      console.error('[Ads] initialize failed:', error);
      initPromise = null;
    });

  return initPromise;
}

export async function showPrivacyOptions() {
  if (!MONETIZATION_SUPPORTED) return;
  const ads = getAdsModule();
  if (!ads) return;
  try {
    await ads.AdsConsent.showPrivacyOptionsForm();
  } catch (error) {
    console.warn('[Ads] showPrivacyOptionsForm failed:', error);
  }
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
