const test = require('node:test');
const assert = require('node:assert/strict');
const {
  beginPresentation,
  endPresentation,
  isPresentationActive,
  subscribeToPresentationActivity,
  runWithPresentation,
  runSerializedPresentation,
  runSerializedPresentationWhenIdle,
  beginSerializedPresentationIfIdle,
  PRESENTATION_CANCELLED,
} = require('../presentationActivityService.cjs');

test('presentation activity stays blocked until every overlapping UI closes', () => {
  const updates = [];
  const unsubscribe = subscribeToPresentationActivity((count) => updates.push(count));
  const sheet = beginPresentation('sheet');
  const modal = beginPresentation('modal');
  assert.equal(isPresentationActive(), true);
  endPresentation(sheet);
  assert.equal(isPresentationActive(), true);
  endPresentation(modal);
  assert.equal(isPresentationActive(), false);
  unsubscribe();
  assert.deepEqual(updates, [1, 2, 1, 0]);
});

test('async system presentations always release their blocker', async () => {
  await assert.rejects(
    runWithPresentation('system-form', async () => {
      assert.equal(isPresentationActive(), true);
      throw new Error('cancelled');
    }),
    /cancelled/
  );
  assert.equal(isPresentationActive(), false);
});

test('native system presentations run one at a time in request order', async () => {
  const events = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = runSerializedPresentation('first', async () => {
    events.push('first-start');
    await firstGate;
    events.push('first-end');
  });
  const second = runSerializedPresentation('second', async () => {
    events.push('second-start');
    events.push('second-end');
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['first-start']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, [
    'first-start',
    'first-end',
    'second-start',
    'second-end',
  ]);
  assert.equal(isPresentationActive(), false);
});

test('a failed native presentation does not block the queue', async () => {
  await assert.rejects(
    runSerializedPresentation('failed', async () => {
      throw new Error('failed');
    }),
    /failed/
  );

  let didRun = false;
  await runSerializedPresentation('next', async () => {
    didRun = true;
  });
  assert.equal(didRun, true);
  assert.equal(isPresentationActive(), false);
});

test('automatic prompts wait outside the queue while user actions remain usable', async () => {
  const events = [];
  const sheet = beginPresentation('sheet');
  const automatic = runSerializedPresentationWhenIdle('automatic', async () => {
    events.push('automatic');
  });
  const picker = runSerializedPresentation('picker', async () => {
    events.push('picker');
  });

  await picker;
  assert.deepEqual(events, ['picker']);
  endPresentation(sheet);
  await automatic;
  assert.deepEqual(events, ['picker', 'automatic']);
  assert.equal(isPresentationActive(), false);
});

test('automatic prompts recheck idle across a replacement-modal handoff', async () => {
  const events = [];
  const oldModal = beginPresentation('old-modal');
  const automatic = runSerializedPresentationWhenIdle('automatic', async () => {
    events.push('automatic');
  });

  endPresentation(oldModal);
  const replacementModal = beginPresentation('replacement-modal');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, []);

  endPresentation(replacementModal);
  await automatic;
  assert.deepEqual(events, ['automatic']);
  assert.equal(isPresentationActive(), false);
});

test('stale automatic prompts are cancelled at final queue admission', async () => {
  let eligible = true;
  let didPresent = false;
  const sheet = beginPresentation('purchase-sheet');
  const automatic = runSerializedPresentationWhenIdle(
    'ads-consent',
    async () => {
      didPresent = true;
    },
    { canStart: () => eligible }
  );

  eligible = false;
  endPresentation(sheet);
  const result = await automatic;
  assert.equal(result, PRESENTATION_CANCELLED);
  assert.equal(didPresent, false);
  assert.equal(isPresentationActive(), false);
});

test('an SDK reservation remains exclusive until its real close event', async () => {
  const events = [];
  const interstitial = beginSerializedPresentationIfIdle('interstitial');
  assert.ok(interstitial);
  assert.equal(isPresentationActive(), true);
  assert.equal(beginSerializedPresentationIfIdle('second'), null);

  const queued = runSerializedPresentation('queued-controller', async () => {
    events.push('queued');
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, []);

  interstitial.end();
  await queued;
  assert.deepEqual(events, ['queued']);
  assert.equal(isPresentationActive(), false);
});
