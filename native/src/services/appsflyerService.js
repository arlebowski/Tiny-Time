import { NativeModules, Platform } from 'react-native';

let lastCustomerUserId = null;
const APPSFLYER_DEV_KEY_FALLBACK = 'bC2Rii2ThnbfWgTeGgHN6X';
const APPSFLYER_IOS_APP_ID_FALLBACK = '6759471392';

// Resolved once initSdk succeeds; null if the native module is unavailable.
// All callers await this before calling SDK methods to avoid a race condition
// between initSdk completing and the first logEvent / setCustomerUserId call.
let initPromise = null;

const getStringEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const getAppsFlyerModule = () => {
  if (!NativeModules?.RNAppsFlyer) return null;
  return require('react-native-appsflyer').default;
};

const waitForInit = () => initPromise ?? Promise.resolve();

const logAppsFlyerEvent = async (eventName, values = {}) => {
  const appsFlyer = getAppsFlyerModule();
  if (!appsFlyer) return;
  await waitForInit();
  try {
    await appsFlyer.logEvent(eventName, values);
  } catch (error) {
    console.warn(`[AppsFlyer] logEvent failed for ${eventName}:`, error);
  }
};

export function initializeAppsFlyer() {
  if (initPromise) return initPromise;

  // In Expo Go / stale dev clients the native bridge may be missing.
  if (!getAppsFlyerModule()) {
    console.warn('[AppsFlyer] RNAppsFlyer native module not found; initialization skipped.');
    return Promise.resolve();
  }

  const devKey = getStringEnv('EXPO_PUBLIC_APPSFLYER_DEV_KEY') || APPSFLYER_DEV_KEY_FALLBACK;
  const appId = getStringEnv('EXPO_PUBLIC_APPSFLYER_APP_ID') || APPSFLYER_IOS_APP_ID_FALLBACK;

  if (!devKey) {
    console.error('[AppsFlyer] Missing dev key; initialization skipped.');
    return Promise.resolve();
  }

  const appsFlyer = getAppsFlyerModule();

  initPromise = appsFlyer.initSdk({
    devKey,
    appId: Platform.OS === 'ios' ? appId || undefined : undefined,
    isDebug: __DEV__,
    onInstallConversionDataListener: true,
    onDeepLinkListener: true,
    timeToWaitForATTUserAuthorization: 60,
  }).catch((error) => {
    console.error('[AppsFlyer] initSdk failed:', error);
    // Reset so a retry is possible if the caller invokes initializeAppsFlyer again.
    initPromise = null;
  });

  return initPromise;
}

export async function setAppsFlyerCustomerUserId(customerUserId) {
  const normalizedId = typeof customerUserId === 'string' ? customerUserId.trim() : '';
  if (!normalizedId || normalizedId === lastCustomerUserId) return;

  const appsFlyer = getAppsFlyerModule();
  if (!appsFlyer) return;

  await waitForInit();

  try {
    await appsFlyer.setCustomerUserId(normalizedId);
    lastCustomerUserId = normalizedId;
  } catch (error) {
    console.warn('[AppsFlyer] setCustomerUserId failed:', error);
  }
}

// 1. Account created (brand new account, first user in a family)
export const trackAccountCreated = () => {
  return logAppsFlyerEvent('account_created', {});
};

// 2. Family joined (user joined via invite link)
export const trackFamilyJoined = () => {
  return logAppsFlyerEvent('family_joined', {});
};

// 3. Onboarding completed (baby profile created)
export const trackOnboardingCompleted = () => {
  return logAppsFlyerEvent('af_complete_registration', {});
};

// 4. First feed logged
export const trackFirstFeedLogged = () => {
  return logAppsFlyerEvent('first_feed_logged', {});
};

// 5. First sleep logged
export const trackFirstSleepLogged = () => {
  return logAppsFlyerEvent('first_sleep_logged', {});
};

// 6. Partner invited
export const trackPartnerInvited = () => {
  return logAppsFlyerEvent('partner_invited', {});
};

// 7. Day 7 retention
export const trackRetained7Days = () => {
  return logAppsFlyerEvent('user_retained_7d', {});
};

// 8. App open (manual visibility event)
export const trackAppOpen = () => {
  return logAppsFlyerEvent('app_open', {});
};
