const MIN_PROMPT_GAP_MS = 72 * 60 * 60 * 1000;
const MAX_AUTO_PROMPTS = 3;
const ABANDONED_PROMPT_MS = 60 * 60 * 1000;

const EMPTY_STATE = {
  logCount: 0,
  promptCount: 0,
  lastPromptAt: null,
  lastDismissedAt: null,
  lastInterstitialAt: null,
  purchased: false,
};

function asTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeState(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...EMPTY_STATE };

  if (parsed.promptCount != null || parsed.lastInterstitialAt != null) {
    return {
      logCount: Number(parsed.logCount) || 0,
      promptCount: Math.min(MAX_AUTO_PROMPTS, Math.max(0, Number(parsed.promptCount) || 0)),
      lastPromptAt: asTimestamp(parsed.lastPromptAt),
      lastDismissedAt: asTimestamp(parsed.lastDismissedAt),
      lastInterstitialAt: asTimestamp(parsed.lastInterstitialAt),
      purchased: Boolean(parsed.purchased),
    };
  }

  // Migrate the previous log-6/log-20 state without showing prompts again.
  const firstPromptAt = asTimestamp(parsed.firstPromptAt);
  const secondPromptAt = asTimestamp(parsed.secondPromptAt);
  const promptCount = secondPromptAt ? 2 : firstPromptAt ? 1 : 0;
  const lastPromptAt = secondPromptAt || firstPromptAt;
  const lastDismissedAt = parsed.secondDismissed
    ? secondPromptAt
    : parsed.firstDismissed
      ? firstPromptAt
      : null;

  return {
    ...EMPTY_STATE,
    logCount: Number(parsed.logCount) || 0,
    promptCount,
    lastPromptAt,
    lastDismissedAt,
  };
}

function recoverAbandonedPrompt(state, nowMs) {
  if (
    state.lastPromptAt &&
    (!state.lastDismissedAt || state.lastDismissedAt < state.lastPromptAt) &&
    nowMs - state.lastPromptAt > ABANDONED_PROMPT_MS
  ) {
    return { ...state, lastDismissedAt: state.lastPromptAt };
  }
  return state;
}

function recordInterstitial(state, nowMs) {
  return { ...state, lastInterstitialAt: nowMs };
}

function nextEligiblePromptNumber(state, nowMs, options = {}) {
  if (state.purchased || state.promptCount >= MAX_AUTO_PROMPTS) return null;
  if (!state.lastInterstitialAt) return null;

  if (state.promptCount === 0) return 1;
  if (!state.lastDismissedAt || state.lastDismissedAt < state.lastPromptAt) return null;
  if (state.lastInterstitialAt <= state.lastDismissedAt) return null;
  if (
    !options.ignorePromptGap &&
    nowMs - state.lastDismissedAt < MIN_PROMPT_GAP_MS
  ) {
    return null;
  }

  return state.promptCount + 1;
}

function applyPresented(state, promptNumber, nowMs) {
  if (promptNumber !== state.promptCount + 1 || promptNumber > MAX_AUTO_PROMPTS) {
    return state;
  }
  return {
    ...state,
    promptCount: promptNumber,
    lastPromptAt: nowMs,
  };
}

function applyDismissed(state, promptNumber, nowMs) {
  if (promptNumber !== state.promptCount) return state;
  return { ...state, lastDismissedAt: nowMs };
}

module.exports = {
  MIN_PROMPT_GAP_MS,
  MAX_AUTO_PROMPTS,
  ABANDONED_PROMPT_MS,
  EMPTY_STATE,
  normalizeState,
  recoverAbandonedPrompt,
  recordInterstitial,
  nextEligiblePromptNumber,
  applyPresented,
  applyDismissed,
};
