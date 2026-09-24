/**
 * Automatic Remove Ads paywall prompts (iOS).
 *
 * Rules:
 * - First prompt: after an actual interstitial, following the next successful log
 * - Reminders: at least 72 hours after dismissal, after another actual
 *   interstitial and then another successful log
 * - Maximum three automatic prompts; purchases stop the sequence permanently
 * - Manual entry points (ad card / Settings) are unaffected
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MONETIZATION_SUPPORTED } from './monetization';

const {
  EMPTY_STATE,
  normalizeState,
  recoverAbandonedPrompt,
  recordInterstitial,
  nextEligiblePromptNumber,
  applyPresented,
  applyDismissed,
} = require('./removeAdsPromptPolicy.cjs');

const FIRST_OPEN_AT_KEY = 'tt_first_open_at';
const FIRST_OPEN_DATE_KEY = 'tt_first_open_date';
const stateLocks = new Map();

function stateKey(uid) {
  return `tt_remove_ads_auto:${uid}`;
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

async function withStateLock(uid, task) {
  const previous = stateLocks.get(uid) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  stateLocks.set(uid, current);
  try {
    return await current;
  } finally {
    if (stateLocks.get(uid) === current) stateLocks.delete(uid);
  }
}

function promptNumberFromTrigger(trigger) {
  const match = /^post_interstitial_(\d)$/.exec(String(trigger || ''));
  return match ? Number(match[1]) : null;
}

/** Ensure a precise first-open timestamp exists (ms since epoch). */
export async function ensureFirstOpenAt() {
  try {
    const existing = await AsyncStorage.getItem(FIRST_OPEN_AT_KEY);
    if (existing) {
      const ms = Date.parse(existing);
      if (Number.isFinite(ms)) return ms;
    }
    const day = await AsyncStorage.getItem(FIRST_OPEN_DATE_KEY);
    if (day) {
      const ms = Date.parse(`${day}T12:00:00.000Z`);
      if (Number.isFinite(ms)) {
        await AsyncStorage.setItem(FIRST_OPEN_AT_KEY, new Date(ms).toISOString());
        return ms;
      }
    }
    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(FIRST_OPEN_AT_KEY, nowIso);
    if (!day) {
      await AsyncStorage.setItem(FIRST_OPEN_DATE_KEY, nowIso.slice(0, 10));
    }
    return Date.parse(nowIso);
  } catch {
    return Date.now();
  }
}

function hoursSince(ms, nowMs) {
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, (nowMs - ms) / (60 * 60 * 1000));
}

/** Record a successfully displayed interstitial for the prompt sequence. */
export async function recordRemoveAdsInterstitialShown(uid, nowMs = Date.now()) {
  if (!uid || uid === 'local-user') return;
  await withStateLock(uid, async () => {
    const state = await readState(uid);
    if (state.purchased || state.promptCount >= 3) return;
    await writeState(uid, recordInterstitial(state, nowMs));
  });
}

export async function hasSeenRemoveAdsInterstitial(uid) {
  if (!uid || uid === 'local-user') return false;
  return withStateLock(uid, async () => {
    const state = await readState(uid);
    return Boolean(state.lastInterstitialAt);
  });
}

/** Record a successful activity and return the next eligible automatic prompt. */
export async function recordSuccessfulLogAndEvaluate({
  uid,
  entitlement,
  flagEnabled,
  accountCreationTime,
  nowMs = Date.now(),
}) {
  if (!MONETIZATION_SUPPORTED || Platform.OS !== 'ios') return null;
  if (flagEnabled !== true && !(__DEV__ && flagEnabled !== false)) return null;
  if (!uid || uid === 'local-user') return null;
  if (entitlement === 'entitled' || entitlement === 'unknown') return null;

  const { state, promptNumber } = await withStateLock(uid, async () => {
    const nextState = recoverAbandonedPrompt(await readState(uid), nowMs);
    nextState.logCount += 1;
    await writeState(uid, nextState);
    return {
      state: nextState,
      promptNumber: nextEligiblePromptNumber(nextState, nowMs, {
        // Simulator verification still requires another real ad and activity.
        ignorePromptGap: __DEV__,
      }),
    };
  });
  if (!promptNumber) return null;

  const firstOpenAt = await ensureFirstOpenAt();
  const accountCreatedMs = accountCreationTime
    ? Date.parse(accountCreationTime)
    : NaN;
  const appAgeHours = hoursSince(firstOpenAt, nowMs);
  const accountAgeHours = Number.isFinite(accountCreatedMs)
    ? hoursSince(accountCreatedMs, nowMs)
    : null;

  return {
    trigger: `post_interstitial_${promptNumber}`,
    promptNumber,
    logCount: state.logCount,
    appAgeHours:
      appAgeHours !== null ? Math.round(appAgeHours * 10) / 10 : null,
    accountAgeHours:
      accountAgeHours !== null ? Math.round(accountAgeHours * 10) / 10 : null,
  };
}

export async function markAutoPromptPresented(uid, trigger, nowMs = Date.now()) {
  if (!uid) return;
  const promptNumber = promptNumberFromTrigger(trigger);
  if (!promptNumber) return;
  await withStateLock(uid, async () => {
    const state = await readState(uid);
    await writeState(uid, applyPresented(state, promptNumber, nowMs));
  });
}

export async function markAutoPromptDismissed(uid, trigger, nowMs = Date.now()) {
  if (!uid) return;
  const promptNumber = promptNumberFromTrigger(trigger);
  if (!promptNumber) return;
  await withStateLock(uid, async () => {
    const state = await readState(uid);
    await writeState(uid, applyDismissed(state, promptNumber, nowMs));
  });
}

/** Purchase from an auto prompt permanently stops future automatic prompts. */
export async function markAutoPromptPurchased(uid) {
  if (!uid) return;
  await withStateLock(uid, async () => {
    const state = await readState(uid);
    state.purchased = true;
    await writeState(uid, state);
  });
}
