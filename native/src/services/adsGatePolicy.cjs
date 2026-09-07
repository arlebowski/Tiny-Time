const ACTIVE_APP_STATE = 'active';

const PRESENTATION_DECISION = {
  WAIT: 'wait',
  NONE: 'none',
  AUTO_PROMPT: 'autoPrompt',
  INTERSTITIAL: 'interstitial',
  DROP_AUTO_PROMPT: 'dropAutoPrompt',
  DROP_INTERSTITIAL: 'dropInterstitial',
};

function shouldDiscardPendingPresentations(appState) {
  return appState !== ACTIVE_APP_STATE;
}

function getPresentationDecision({
  appState,
  blocked,
  inFlight,
  pendingAutoPrompt,
  pendingInterstitial,
  entitlement,
  adsEnabled,
}) {
  if (!pendingAutoPrompt && !pendingInterstitial) {
    return PRESENTATION_DECISION.NONE;
  }
  if (appState !== ACTIVE_APP_STATE || blocked || inFlight) {
    return PRESENTATION_DECISION.WAIT;
  }
  if (pendingAutoPrompt) {
    if (entitlement === 'entitled') {
      return PRESENTATION_DECISION.DROP_AUTO_PROMPT;
    }
    if (entitlement !== 'notEntitled') {
      return PRESENTATION_DECISION.WAIT;
    }
    return PRESENTATION_DECISION.AUTO_PROMPT;
  }
  if (!adsEnabled) {
    return PRESENTATION_DECISION.DROP_INTERSTITIAL;
  }
  return PRESENTATION_DECISION.INTERSTITIAL;
}

function consumeAutoPrompt(pendingAutoPrompt) {
  return {
    selectedAutoPrompt: pendingAutoPrompt || null,
    pendingAutoPrompt: null,
    pendingInterstitial: false,
  };
}

function consentResultFromInfo(info, hadError = false) {
  return {
    canRequestAds: Boolean(info?.canRequestAds),
    privacyOptionsRequired:
      info?.privacyOptionsRequirementStatus === 'REQUIRED',
    hadError: Boolean(hadError),
  };
}

function getAdsGate({
  monetizationSupported,
  entitlement,
  consentReady,
  canRequestAds,
  adsInitialized,
  resolutionTimedOut,
}) {
  const supported = Boolean(monetizationSupported);
  return {
    adsEnabled:
      supported &&
      entitlement === 'notEntitled' &&
      Boolean(consentReady) &&
      Boolean(canRequestAds) &&
      Boolean(adsInitialized),
    adsPending:
      supported &&
      !resolutionTimedOut &&
      entitlement !== 'entitled' &&
      (
        !consentReady ||
        entitlement === 'unknown' ||
        (Boolean(canRequestAds) && !adsInitialized)
      ),
  };
}

module.exports = {
  ACTIVE_APP_STATE,
  PRESENTATION_DECISION,
  shouldDiscardPendingPresentations,
  getPresentationDecision,
  consumeAutoPrompt,
  consentResultFromInfo,
  getAdsGate,
};
