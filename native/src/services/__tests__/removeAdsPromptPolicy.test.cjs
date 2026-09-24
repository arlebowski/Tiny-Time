const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MIN_PROMPT_GAP_MS,
  EMPTY_STATE,
  normalizeState,
  recordInterstitial,
  nextEligiblePromptNumber,
  applyPresented,
  applyDismissed,
} = require('../removeAdsPromptPolicy.cjs');

test('first prompt requires an actual interstitial', () => {
  assert.equal(nextEligiblePromptNumber(EMPTY_STATE, 100), null);
  const afterAd = recordInterstitial(EMPTY_STATE, 100);
  assert.equal(nextEligiblePromptNumber(afterAd, 101), 1);
});

test('reminders require dismissal, 72 hours, and another interstitial', () => {
  let state = recordInterstitial(EMPTY_STATE, 100);
  state = applyPresented(state, 1, 200);
  state = applyDismissed(state, 1, 300);

  assert.equal(nextEligiblePromptNumber(state, 300 + MIN_PROMPT_GAP_MS), null);
  state = recordInterstitial(state, 400);
  assert.equal(nextEligiblePromptNumber(state, 300 + MIN_PROMPT_GAP_MS - 1), null);
  assert.equal(nextEligiblePromptNumber(state, 300 + MIN_PROMPT_GAP_MS), 2);
});

test('automatic prompts stop permanently after three presentations', () => {
  const state = {
    ...EMPTY_STATE,
    promptCount: 3,
    lastPromptAt: 500,
    lastDismissedAt: 600,
    lastInterstitialAt: 700,
  };
  assert.equal(nextEligiblePromptNumber(state, 700 + MIN_PROMPT_GAP_MS), null);
});

test('development can skip time without skipping the next-interstitial requirement', () => {
  let state = recordInterstitial(EMPTY_STATE, 100);
  state = applyPresented(state, 1, 200);
  state = applyDismissed(state, 1, 300);
  assert.equal(
    nextEligiblePromptNumber(state, 301, { ignorePromptGap: true }),
    null
  );
  state = recordInterstitial(state, 400);
  assert.equal(nextEligiblePromptNumber(state, 401, { ignorePromptGap: true }), 2);
});

test('legacy log-based state preserves presentation history', () => {
  const migrated = normalizeState({
    logCount: 24,
    firstPromptAt: 100,
    firstDismissed: true,
    secondPromptAt: 200,
    secondDismissed: true,
  });
  assert.equal(migrated.logCount, 24);
  assert.equal(migrated.promptCount, 2);
  assert.equal(migrated.lastPromptAt, 200);
  assert.equal(migrated.lastDismissedAt, 200);
});
