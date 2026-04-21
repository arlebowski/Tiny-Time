import { NativeModules, Platform } from 'react-native';

let hasInitialized = false;

const getStringEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

export async function initializeAppsFlyer() {
  if (hasInitialized) return;

  // In Expo Go / stale dev clients the native bridge may be missing.
  if (!NativeModules?.RNAppsFlyer) {
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
    const appsFlyer = require('react-native-appsflyer').default;
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
