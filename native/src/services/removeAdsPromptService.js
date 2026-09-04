/**
 * Automatic Remove Ads paywall prompts (iOS).
 *
 * Rules:
 * - 1st auto prompt after the 6th successful new tracker log (once logging UI closes)
 * - 2nd auto prompt after the 20th log, ≥48h after the first auto prompt was shown,
 *   and only if the first was dismissed without purchasing
 * - After 2nd dismissal: never auto-prompt again
 * - Manual entry points (ad card / Settings) are unaffected
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MONETIZATION_SUPPORTED } from './monetization';

const FIRST_PROMPT_LOG = 6;
const SECOND_PROMPT_LOG = 20;
const MIN_GAP_AFTER_FIRST_MS = 48 * 60 * 60 * 1000;

const FIRST_OPEN_AT_KEY = 'tt_first_open_at';
const FIRST_OPEN_DATE_KEY = 'tt_first_open_date';

function stateKey(uid) {
  return `tt_remove_ads_auto:${uid}`;
}

const EMPTY_STATE = {
  logCount: 0,
  firstPromptAt: null,
  firstDismissed: false,
  secondPromptAt: null,
  secondDismissed: false,
};

async function readState(uid) {
  try {
    const raw = await AsyncStorage.getItem(stateKey(uid));
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return {
      logCount: Number(parsed?.logCount) || 0,
      firstPromptAt: Number(parsed?.firstPromptAt) || null,
      firstDismissed: Boolean(parsed?.firstDismissed),
      secondPromptAt: Number(parsed?.secondPromptAt) || null,
      secondDismissed: Boolean(parsed?.secondDismissed),
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(uid, state) {
  await AsyncStorage.setItem(stateKey(uid), JSON.stringify(state));
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

function hoursSince(ms) {
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, (Date.now() - ms) / (60 * 60 * 1000));
}

/**
 * Increment lifetime successful-log count and decide whether an auto prompt
 * should be presented after the user returns to normal UI.
 *
 * @returns {Promise<null | {
 *   trigger: 'log_6' | 'log_20',
 *   logCount: number,
 *   appAgeHours: number | null,
 *   accountAgeHours: number | null,
 * }>}
 */
export async function recordSuccessfulLogAndEvaluate({
  uid,
  entitlement,
  flagEnabled,
  accountCreationTime,
}) {
  if (!MONETIZATION_SUPPORTED || Platform.OS !== 'ios') return null;
  if (flagEnabled !== true && !(__DEV__ && flagEnabled !== false)) return null;
  if (!uid || uid === 'local-user') return null;
  if (entitlement === 'entitled' || entitlement === 'unknown') return null;

  const state = await readState(uid);
  if (state.secondDismissed) return null;

  // Recover abandoned auto-prompt sessions (force-quit while sheet open).
  const ONE_HOUR_MS = 60 * 60 * 1000;
  if (
    state.firstPromptAt &&
    !state.firstDismissed &&
    Date.now() - state.firstPromptAt > ONE_HOUR_MS
  ) {
    state.firstDismissed = true;
  }
  if (
    state.secondPromptAt &&
    !state.secondDismissed &&
    Date.now() - state.secondPromptAt > ONE_HOUR_MS
  ) {
    state.secondDismissed = true;
  }

  state.logCount += 1;
  await writeState(uid, state);

  const firstOpenAt = await ensureFirstOpenAt();
  const accountCreatedMs = accountCreationTime
    ? Date.parse(accountCreationTime)
    : NaN;
  const appAgeHours = hoursSince(firstOpenAt);
  const accountAgeHours = Number.isFinite(accountCreatedMs)
    ? hoursSince(accountCreatedMs)
    : null;

  const base = {
    logCount: state.logCount,
    appAgeHours:
      appAgeHours !== null ? Math.round(appAgeHours * 10) / 10 : null,
    accountAgeHours:
      accountAgeHours !== null ? Math.round(accountAgeHours * 10) / 10 : null,
  };

  // First auto prompt
  if (!state.firstPromptAt && state.logCount >= FIRST_PROMPT_LOG) {
    return { trigger: 'log_6', ...base };
  }

  // Second auto prompt
  if (
    state.firstPromptAt &&
    state.firstDismissed &&
    !state.secondPromptAt &&
    !state.secondDismissed &&
    state.logCount >= SECOND_PROMPT_LOG &&
    Date.now() - state.firstPromptAt >= MIN_GAP_AFTER_FIRST_MS
  ) {
    return { trigger: 'log_20', ...base };
  }

  return null;
}

export async function markAutoPromptPresented(uid, trigger) {
  if (!uid) return;
  const state = await readState(uid);
  const now = Date.now();
  if (trigger === 'log_6' && !state.firstPromptAt) {
    state.firstPromptAt = now;
  } else if (trigger === 'log_20' && !state.secondPromptAt) {
    state.secondPromptAt = now;
  }
  await writeState(uid, state);
}

/** Dismiss without purchase — advances / exhausts the auto-prompt ladder. */
export async function markAutoPromptDismissed(uid, trigger) {
  if (!uid) return;
  const state = await readState(uid);
  if (trigger === 'log_6') {
    state.firstDismissed = true;
    if (!state.firstPromptAt) state.firstPromptAt = Date.now();
  } else if (trigger === 'log_20') {
    state.secondDismissed = true;
    if (!state.secondPromptAt) state.secondPromptAt = Date.now();
  }
  await writeState(uid, state);
}

/** Purchase from an auto prompt — stop all future auto prompts. */
export async function markAutoPromptPurchased(uid) {
  if (!uid) return;
  const state = await readState(uid);
  state.secondDismissed = true;
  await writeState(uid, state);
}
