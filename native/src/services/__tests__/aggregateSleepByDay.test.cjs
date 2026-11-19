const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const { test } = require('node:test');

// The old calculation loops synchronously. Run it in a child so a regression
// fails the test instead of freezing the test runner.
if (process.argv[2] === '--calculate') {
  (async () => {
    const { aggregateSleepByDay } = await import('../../components/shared/analyticsHelpers.js');
    Date.now = () => new Date(2026, 10, 18, 12).getTime();
    for (const [month, date, duration] of [[10, 1, 25], [2, 8, 23], [0, 15, 24]]) {
      const startTime = new Date(2026, month, date).getTime();
      const midnight = new Date(2026, month, date + 1).getTime();
      const result = aggregateSleepByDay([{ startTime, endTime: midnight + 1800000 }]);
      const days = Object.values(result);
      assert.equal(days.length, 2);
      assert.deepEqual(days.map(d => d.totalHrs), [duration, 0.5]);
      assert.deepEqual(days.map(d => d.count), [1, 0]);
    }
    // A returning caregiver loads a completed sleep from late on the long day.
    const overnight = aggregateSleepByDay([{
      startTime: new Date(2026, 10, 1, 23, 15).getTime(),
      endTime: new Date(2026, 10, 2, 1, 30).getTime(),
    }]);
    assert.deepEqual(overnight['2026-11-01'], { totalHrs: 0.75, dayHrs: 0, nightHrs: 0.75, count: 1 });
    assert.deepEqual(overnight['2026-11-02'], { totalHrs: 1.5, dayHrs: 0, nightHrs: 1.5, count: 0 });
  })().catch(error => { console.error(error); process.exitCode = 1; });
} else {
  for (const timezone of ['America/Los_Angeles', 'America/New_York']) {
    test('sleep splits at local midnight in ' + timezone, async () => {
      const child = fork(__filename, ['--calculate'], {
        env: { ...process.env, TZ: timezone }, execArgv: [], timeout: 5000,
      });
      const [code, signal] = await once(child, 'exit');
      assert.equal(signal, null, 'sleep calculation timed out');
      assert.equal(code, 0);
    });
  }
}
