import PostHog from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const POSTHOG_API_KEY_FALLBACK = 'phc_qpb8iLUtHKhMmdpirmMAQJUuccNb9drLCvzkrcce63mV';
const POSTHOG_HOST_FALLBACK = 'https://us.i.posthog.com';

const getStringEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const apiKey = getStringEnv('EXPO_PUBLIC_POSTHOG_API_KEY') || POSTHOG_API_KEY_FALLBACK;
const host = getStringEnv('EXPO_PUBLIC_POSTHOG_HOST') || POSTHOG_HOST_FALLBACK;

// Initialized at module load — PostHog is pure JS (no native module), no ATT dependency.
export const posthogInstance = new PostHog(apiKey, {
  host,
  autocapture: false,
  enableSessionReplay: false,
});

export function capture(event, properties = {}) {
  try {
    posthogInstance.capture(event, properties);
  } catch (error) {
    console.warn(`[PostHog] capture failed for ${event}:`, error);
  }
}

export function identifyUser(uid, { email, name, family_id } = {}) {
  if (!uid) return;
  try {
    posthogInstance.identify(uid, {
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      ...(family_id != null ? { family_id } : {}),
    });
  } catch (error) {
    console.warn('[PostHog] identify failed:', error);
  }
}

export function groupFamily(familyId, { name, memberCount } = {}) {
  if (!familyId) return;
  try {
    posthogInstance.group('family', familyId, {
      ...(name ? { name } : {}),
      ...(memberCount != null ? { member_count: memberCount } : {}),
    });
  } catch (error) {
    console.warn('[PostHog] group failed:', error);
  }
}

export function resetUser() {
  try {
    posthogInstance.reset();
  } catch (error) {
    console.warn('[PostHog] reset failed:', error);
  }
}

// Fires an event exactly once per user, gated by AsyncStorage.
export async function captureOnce(uid, flagName, event, properties = {}) {
  if (!uid) return;
  const key = `tt_ph_${flagName}:${uid}`;
  try {
    const hasTracked = await AsyncStorage.getItem(key);
    if (hasTracked === '1') return;
    capture(event, properties);
    await AsyncStorage.setItem(key, '1');
  } catch {
    // Never block the caller
  }
}

// Fires first_activity_logged once per user, including time-since-setup.
// Setup timestamp is written to AsyncStorage by AuthContext when onboarding completes.
export async function captureFirstActivity(uid, properties = {}) {
  if (!uid) return;
  const flagKey = `tt_ph_first_activity:${uid}`;
  try {
    const hasTracked = await AsyncStorage.getItem(flagKey);
    if (hasTracked === '1') return;
    let minutesSinceSetup = null;
    try {
      const setupAt = await AsyncStorage.getItem('tt_setup_completed_at');
      if (setupAt) {
        const ms = Date.now() - parseInt(setupAt, 10);
        minutesSinceSetup = Math.max(0, Math.round(ms / 60000));
      }
    } catch {}
    capture('first_activity_logged', {
      ...properties,
      ...(minutesSinceSetup !== null ? { minutes_since_setup: minutesSinceSetup } : {}),
    });
    await AsyncStorage.setItem(flagKey, '1');
  } catch {}
}
