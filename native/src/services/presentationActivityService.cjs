const activePresentations = new Set();
const listeners = new Set();
let serializedPresentationQueue = Promise.resolve();
let serializedQueueDepth = 0;
let nativeAppState = null;

try {
  nativeAppState = require('react-native').AppState;
} catch {
  // Plain Node policy tests do not load React Native. Treat them as active.
}

const ADMISSION_RETRY = Symbol('presentation-admission-retry');
const PRESENTATION_CANCELLED = Symbol('presentation-cancelled');

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(activePresentations.size);
    } catch {
      /* ignore observer failures */
    }
  });
}

function beginPresentation(label = 'presentation') {
  const token = { label };
  activePresentations.add(token);
  notify();
  return token;
}

function endPresentation(token) {
  if (!token || !activePresentations.delete(token)) return;
  notify();
}

function isPresentationActive() {
  return activePresentations.size > 0;
}

function subscribeToPresentationActivity(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function runWithPresentation(label, callback) {
  const token = beginPresentation(label);
  try {
    return await callback();
  } finally {
    endPresentation(token);
  }
}

/**
 * Serializes native controllers (ATT, UMP, notifications, pickers, etc.) so
 * iOS is never asked to present two system-owned screens at the same time.
 * A failed controller cannot poison the queue for later presentations.
 */
function runSerializedPresentation(label, callback) {
  const result = enqueueSerialized(() => runWithPresentation(label, callback));
  return result;
}

function enqueueSerialized(callback) {
  serializedQueueDepth += 1;
  const run = async () => {
    try {
      return await callback();
    } finally {
      serializedQueueDepth -= 1;
    }
  };
  const result = serializedPresentationQueue.then(run, run);
  serializedPresentationQueue = result.catch(() => undefined);
  return result;
}

function waitForPresentationIdle() {
  if (!isPresentationActive()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = subscribeToPresentationActivity((count) => {
      if (count !== 0) return;
      unsubscribe();
      resolve();
    });
  });
}

function isAppActive() {
  return !nativeAppState || nativeAppState.currentState === 'active';
}

function waitForAppActive() {
  if (isAppActive()) return Promise.resolve();
  return new Promise((resolve) => {
    const subscription = nativeAppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      subscription.remove();
      resolve();
    });
  });
}

/**
 * Automatic system prompts must wait outside the serialized queue until the
 * app's own UI is idle. Waiting outside avoids blocking a user-triggered
 * picker that legitimately needs to open from an already-presented sheet.
 */
async function runSerializedPresentationWhenIdle(label, callback, options = {}) {
  const canStart = typeof options.canStart === 'function'
    ? options.canStart
    : null;
  while (true) {
    await Promise.all([waitForPresentationIdle(), waitForAppActive()]);
    const attempt = await enqueueSerialized(() => {
      // This admission check and beginPresentation() happen synchronously in
      // the same queue turn. If UI changed during either wait, leave the queue
      // immediately and wait outside it again.
      if (isPresentationActive() || !isAppActive()) return ADMISSION_RETRY;
      if (canStart && canStart() !== true) return PRESENTATION_CANCELLED;
      return runWithPresentation(label, callback);
    });
    if (attempt !== ADMISSION_RETRY) return attempt;
  }
}

/**
 * Synchronously reserves the native-presentation lane. This is used by SDKs
 * whose show() promise resolves before their controller actually closes.
 */
function beginSerializedPresentationIfIdle(label) {
  if (isPresentationActive() || !isAppActive() || serializedQueueDepth > 0) {
    return null;
  }

  let releaseQueue;
  let ended = false;
  const held = new Promise((resolve) => {
    releaseQueue = resolve;
  });
  void enqueueSerialized(() => held);
  const token = beginPresentation(label);

  return {
    end() {
      if (ended) return;
      ended = true;
      endPresentation(token);
      releaseQueue();
    },
  };
}

module.exports = {
  beginPresentation,
  endPresentation,
  isPresentationActive,
  subscribeToPresentationActivity,
  runWithPresentation,
  runSerializedPresentation,
  runSerializedPresentationWhenIdle,
  beginSerializedPresentationIfIdle,
  PRESENTATION_CANCELLED,
};
