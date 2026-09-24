/**
 * Post-log interstitial frequency (iOS).
 *
 * Count every successful new tracker log. Show only on cadence logs (4, 8, …)
 * after the logging sheet has closed, if an ad is already loaded.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MONETIZATION_SUPPORTED } from './monetization';

const {
  EMPTY_STATE,
  normalizeState,
  isWithinFrequencyLimits,
  isEligibleToShow,
  applyShown,
} = require('./logInterstitialPolicy.cjs');

function stateKey(uid) {
  return `tt_log_interstitial:${uid}`;
}

async function readState(uid) {
  try {
    const raw = await AsyncStorage.getItem(stateKey(uid));
    if (!raw) return { ...EMPTY_STATE };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(uid, state) {
  await AsyncStorage.setItem(stateKey(uid), JSON.stringify(state));
}

function flagAllows(flagEnabled) {
  return flagEnabled === true || (__DEV__ && flagEnabled !== false);
}

/**
 * Increment lifetime successful-log count and decide whether to present
 * the interstitial after the logging sheet closes.
 *
 * If this log is on cadence but the ad is not loaded, skip — do not show
 * on a later non-cadence log.
 *
 * @returns {Promise<boolean>}
 */
export async function recordLogAndEvaluateInterstitial({
  uid,
  entitlement,
  flagEnabled,
  adsEnabled,
  nowMs = Date.now(),
}) {
  if (!MONETIZATION_SUPPORTED || Platform.OS !== 'ios') return false;
  if (!uid || uid === 'local-user') return false;
  if (entitlement === 'entitled' && !adsEnabled) return false;

  const state = await readState(uid);
  state.logCount += 1;
  await writeState(uid, state);

  if (entitlement === 'unknown') {
    if (__DEV__) console.warn('[Ads] interstitial skipped: entitlement unknown');
    return false;
  }
  if (!flagAllows(flagEnabled)) {
    if (__DEV__) console.warn('[Ads] interstitial skipped: flag off');
    return false;
  }
  if (!adsEnabled) {
    if (__DEV__) console.warn('[Ads] interstitial skipped: ads disabled');
    return false;
  }
  // Dev: skip cooldown and the 3/day cap so 4, 8, 12… can be verified.
  // Production still enforces both.
  if (
    !isEligibleToShow(state, nowMs, {
      ignoreCooldown: __DEV__,
      ignoreDayCap: __DEV__,
    })
  ) {
    if (__DEV__) {
      console.log('[Ads] interstitial not cadence', {
        logCount: state.logCount,
        showsOnDay: state.showsOnDay,
      });
    }
    return false;
  }
  if (__DEV__) console.log('[Ads] interstitial queued after log', state.logCount);
  return true;
}

export async function markLogInterstitialShown(uid, nowMs = Date.now()) {
  if (!uid) return;
  const state = await readState(uid);
  await writeState(uid, applyShown(state, nowMs));
}

/**
 * Evaluate the Trends-detail exit opportunity against the same global
 * interstitial cooldown/day cap. This does not change the successful-log
 * count, so the every-fourth-log cadence remains intact.
 */
export async function evaluateTrendsDetailExitInterstitial({
  uid,
  entitlement,
  flagEnabled,
  adsEnabled,
  nowMs = Date.now(),
}) {
  if (!MONETIZATION_SUPPORTED || Platform.OS !== 'ios') return false;
  if (!uid || uid === 'local-user') return false;
  if (entitlement !== 'notEntitled') return false;
  if (!flagAllows(flagEnabled) || !adsEnabled) return false;

  const state = await readState(uid);
  return isWithinFrequencyLimits(state, nowMs, {
    // Keep simulator verification practical; production always enforces both.
    ignoreCooldown: __DEV__,
    ignoreDayCap: __DEV__,
  });
}
