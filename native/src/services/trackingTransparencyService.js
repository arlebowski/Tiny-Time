import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

const {
  runSerializedPresentationWhenIdle,
} = require('./presentationActivityService.cjs');

let trackingPermissionPromise = null;

/** A shared one-shot barrier so ATT and UMP can never present together. */
export function requestTrackingPermissionOnce() {
  if (trackingPermissionPromise) return trackingPermissionPromise;

  trackingPermissionPromise = runSerializedPresentationWhenIdle('tracking-transparency', async () => {
    if (
      Platform.OS !== 'ios' ||
      !requireOptionalNativeModule('ExpoTrackingTransparency')
    ) {
      return null;
    }
    try {
      const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
      return await requestTrackingPermissionsAsync();
    } catch (error) {
      console.warn('[ATT] request failed:', error);
      return null;
    }
  });

  return trackingPermissionPromise;
}
