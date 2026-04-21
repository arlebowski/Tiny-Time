import { NativeModules, Platform } from 'react-native';

let hasInitialized = false;
let lastCustomerUserId = null;

const getStringEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const getAppsFlyerModule = () => {
  if (!NativeModules?.RNAppsFlyer) return null;
  return require('react-native-appsflyer').default;
};

export async function initializeAppsFlyer() {
  if (hasInitialized) return;

  // In Expo Go / stale dev clients the native bridge may be missing.
  if (!getAppsFlyerModule()) {
    if (__DEV__) {
      console.warn('[AppsFlyer] RNAppsFlyer native module not found; skipping initialization.');
    }
    return;
  }

  const devKey = getStringEnv('EXPO_PUBLIC_APPSFLYER_DEV_KEY');
  const appId = getStringEnv('EXPO_PUBLIC_APPSFLYER_APP_ID');

  if (!devKey) {
    if (__DEV__) {
      console.warn('[AppsFlyer] Missing EXPO_PUBLIC_APPSFLYER_DEV_KEY; skipping initialization.');
    }
    return;
  }

  try {
    const appsFlyer = getAppsFlyerModule();
    if (!appsFlyer) return;
    await appsFlyer.initSdk({
      devKey,
      appId: Platform.OS === 'ios' ? appId || undefined : undefined,
      isDebug: __DEV__,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
      timeToWaitForATTUserAuthorization: 10,
    });
    hasInitialized = true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[AppsFlyer] initSdk failed:', error);
    }
  }
}

export async function setAppsFlyerCustomerUserId(customerUserId) {
  const normalizedId = typeof customerUserId === 'string' ? customerUserId.trim() : '';
  if (!normalizedId || normalizedId === lastCustomerUserId) return;

  const appsFlyer = getAppsFlyerModule();
  if (!appsFlyer) return;

  try {
    await appsFlyer.setCustomerUserId(normalizedId);
    lastCustomerUserId = normalizedId;
  } catch (error) {
    if (__DEV__) {
      console.warn('[AppsFlyer] setCustomerUserId failed:', error);
    }
  }
}
