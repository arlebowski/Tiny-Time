const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PRESENTATION_DECISION,
  shouldDiscardPendingPresentations,
  getPresentationDecision,
  consumeAutoPrompt,
  consentResultFromInfo,
  getAdsGate,
} = require('../adsGatePolicy.cjs');

const READY = {
  appState: 'active',
  blocked: false,
  inFlight: null,
  pendingAutoPrompt: false,
  pendingInterstitial: false,
  entitlement: 'notEntitled',
  adsEnabled: true,
};

test('presentation waits while user work or another presentation is active', () => {
  assert.equal(
    getPresentationDecision({ ...READY, blocked: true, pendingInterstitial: true }),
    PRESENTATION_DECISION.WAIT
  );
  assert.equal(
    getPresentationDecision({ ...READY, inFlight: 'autoPrompt', pendingInterstitial: true }),
    PRESENTATION_DECISION.WAIT
  );
});

test('automatic prompt wins when both presentations are pending', () => {
  assert.equal(
    getPresentationDecision({
      ...READY,
      pendingAutoPrompt: true,
      pendingInterstitial: true,
    }),
    PRESENTATION_DECISION.AUTO_PROMPT
  );

  const consumed = consumeAutoPrompt({ trigger: 'log' });
  assert.deepEqual(consumed, {
    selectedAutoPrompt: { trigger: 'log' },
    pendingAutoPrompt: null,
    pendingInterstitial: false,
  });
  assert.equal(
    getPresentationDecision({
      ...READY,
      pendingAutoPrompt: Boolean(consumed.pendingAutoPrompt),
      pendingInterstitial: consumed.pendingInterstitial,
    }),
    PRESENTATION_DECISION.NONE
  );
});

test('backgrounding discards pending presentations instead of restoring them', () => {
  assert.equal(shouldDiscardPendingPresentations('inactive'), true);
  assert.equal(shouldDiscardPendingPresentations('background'), true);
  assert.equal(shouldDiscardPendingPresentations('active'), false);
  assert.equal(
    getPresentationDecision({
      ...READY,
      appState: 'background',
      pendingInterstitial: true,
    }),
    PRESENTATION_DECISION.WAIT
  );
});

test('paid users drop prompts and never enable ads', () => {
  assert.equal(
    getPresentationDecision({
      ...READY,
      entitlement: 'entitled',
      pendingAutoPrompt: true,
    }),
    PRESENTATION_DECISION.DROP_AUTO_PROMPT
  );
  assert.deepEqual(
    getAdsGate({
      monetizationSupported: true,
      entitlement: 'entitled',
      consentReady: true,
      canRequestAds: true,
      adsInitialized: true,
      resolutionTimedOut: false,
    }),
    { adsEnabled: false, adsPending: false }
  );
});

test('cached consent remains usable when a fresh consent request fails', () => {
  assert.deepEqual(
    consentResultFromInfo(
      { canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' },
      true
    ),
    { canRequestAds: true, privacyOptionsRequired: true, hadError: true }
  );
});

test('resolution timeout removes shimmer without enabling ads', () => {
  assert.deepEqual(
    getAdsGate({
      monetizationSupported: true,
      entitlement: 'unknown',
      consentReady: false,
      canRequestAds: false,
      adsInitialized: false,
      resolutionTimedOut: true,
    }),
    { adsEnabled: false, adsPending: false }
  );
});

test('only resolved free users with consent can receive ads', () => {
  assert.deepEqual(
    getAdsGate({
      monetizationSupported: true,
      entitlement: 'notEntitled',
      consentReady: true,
      canRequestAds: true,
      adsInitialized: true,
      resolutionTimedOut: false,
    }),
    { adsEnabled: true, adsPending: false }
  );
});

test('consent alone keeps ads gated and pending until initialization finishes', () => {
  assert.deepEqual(
    getAdsGate({
      monetizationSupported: true,
      entitlement: 'notEntitled',
      consentReady: true,
      canRequestAds: true,
      adsInitialized: false,
      resolutionTimedOut: false,
    }),
    { adsEnabled: false, adsPending: true }
  );
});
