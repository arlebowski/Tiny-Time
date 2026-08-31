import { Platform } from 'react-native';

// Ads, consent, and purchases are iOS-only. Both native SDKs are excluded from
// the Android build in package.json; flipping this alone is not sufficient.
export const MONETIZATION_SUPPORTED = Platform.OS === 'ios';
