import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { capture } from './posthogService';

const {
  beginPresentation,
  endPresentation,
  runSerializedPresentationWhenIdle,
} = require('./presentationActivityService.cjs');

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const REVIEW_PRESENTATION_GUARD_MS = 30_000;

function getReviewPromptKey(uid) {
  return `tt_review_prompt_requested:${uid}`;
}

function isAccountAgeEligible(creationTimeRaw) {
  if (!creationTimeRaw) return false;
  const createdAtMs = Date.parse(creationTimeRaw);
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs >= THREE_DAYS_MS;
}

export async function maybeRequestAppReview({
  uid,
  creationTime,
  reviewPromptEnabled,
  activityType,
}) {
  if (reviewPromptEnabled !== true) return;
  if (Platform.OS !== 'ios') return;
  if (!uid) return;
  if (!isAccountAgeEligible(creationTime)) return;

  const key = getReviewPromptKey(uid);
  try {
    const alreadyRequested = await AsyncStorage.getItem(key);
    if (alreadyRequested === '1') return;

    if (!requireOptionalNativeModule('ExpoStoreReview')) return;

    const StoreReview = require('expo-store-review');
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) return;

    await runSerializedPresentationWhenIdle('app-review', async () => {
      await StoreReview.requestReview();

      // StoreKit does not report when its review controller closes. Start the
      // fallback guard before releasing the serialized presentation so there
      // is never a window in which an ad can cover the review prompt.
      const reviewGuard = beginPresentation('app-review-guard');
      setTimeout(() => endPresentation(reviewGuard), REVIEW_PRESENTATION_GUARD_MS);
    });

    const createdAtMs = Date.parse(creationTime);
    const accountAgeDays = Number.isFinite(createdAtMs)
      ? Math.floor((Date.now() - createdAtMs) / (24 * 60 * 60 * 1000))
      : null;

    capture('review_prompt_requested', {
      activity_type: activityType,
      ...(accountAgeDays !== null ? { account_age_days: accountAgeDays } : {}),
    });

    await AsyncStorage.setItem(key, '1');
  } catch {
    // Never block the caller
  }
}
