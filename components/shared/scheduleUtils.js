// Shared schedule utilities
(function initScheduleUtils() {
  if (typeof window === 'undefined') return;
  window.TT = window.TT || {};
  window.TT.utils = window.TT.utils || {};
  window.TT.utils.scheduleUtils = window.TT.utils.scheduleUtils || {};

  const normalizeTimeMs = (val) => {
    if (!val) return null;
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    if (val instanceof Date) return val.getTime();
    const parsed = new Date(val);
    const ts = parsed.getTime();
    return Number.isFinite(ts) ? ts : null;
  };

  const matchScheduleToActualEvents = (schedule, feedings, sleeps, windowMs = 30 * 60 * 1000) => {
    if (!Array.isArray(schedule)) return [];

    const actualFeedings = (feedings || [])
      .map((f) => ({ type: 'feed', timeMs: normalizeTimeMs(f?.timestamp) }))
      .filter((f) => Number.isFinite(f.timeMs));
    const actualSleeps = (sleeps || [])
      .map((s) => ({ type: 'sleep', timeMs: normalizeTimeMs(s?.startTime) }))
      .filter((s) => Number.isFinite(s.timeMs));
    const actualWakes = (sleeps || [])
      .map((s) => ({ type: 'wake', timeMs: normalizeTimeMs(s?.endTime) }))
      .filter((s) => Number.isFinite(s.timeMs));

    const actualByType = {
      feed: actualFeedings,
      sleep: actualSleeps,
      wake: actualWakes
    };
    const matchedActualEvents = new Set();

    return schedule.map((event) => {
      const scheduleTimeMs = normalizeTimeMs(event?.timeMs ?? event?.time);
      if (!Number.isFinite(scheduleTimeMs) || !event?.type) {
        return { ...event, isCompleted: false, actual: false };
      }
      const candidates = actualByType[event.type] || [];
      let isCompleted = false;
      for (const actualEvent of candidates) {
        const key = `${actualEvent.type}-${actualEvent.timeMs}`;
        if (matchedActualEvents.has(key)) continue;
        if (Math.abs(actualEvent.timeMs - scheduleTimeMs) <= windowMs) {
          matchedActualEvents.add(key);
          isCompleted = true;
          break;
        }
      }
      return {
        ...event,
        isCompleted,
        actual: isCompleted ? true : event?.actual || false
      };
    });
  };

  window.TT.utils.scheduleUtils.matchScheduleToActualEvents = matchScheduleToActualEvents;
})();
