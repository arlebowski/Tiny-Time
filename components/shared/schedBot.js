// schedBot: single public API for schedule consumers
(function initSchedBot() {
  if (typeof window === 'undefined') return;
  window.TT = window.TT || {};
  window.TT.store = window.TT.store || {};

  const scheduleStore = window.TT.store.scheduleStore || null;
  const scheduleUtils = window.TT.utils && window.TT.utils.scheduleUtils
    ? window.TT.utils.scheduleUtils
    : null;

  const getScheduleDateKey = (date = new Date()) => {
    if (scheduleStore && typeof scheduleStore.getScheduleDateKey === 'function') {
      return scheduleStore.getScheduleDateKey(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const readSchedule = (dateKey) => {
    if (scheduleStore && typeof scheduleStore.readProjectionSchedule === 'function') {
      return scheduleStore.readProjectionSchedule(dateKey);
    }
    try {
      const storageKey = scheduleStore?.storageKey || 'tt_daily_projection_schedule_v1';
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.dateKey !== dateKey || !Array.isArray(parsed.items)) {
        return null;
      }
      return parsed.items;
    } catch {
      return null;
    }
  };

  const writeSchedule = (dateKey, schedule) => {
    if (scheduleStore && typeof scheduleStore.writeProjectionSchedule === 'function') {
      return scheduleStore.writeProjectionSchedule(dateKey, schedule);
    }
    try {
      const storageKey = scheduleStore?.storageKey || 'tt_daily_projection_schedule_v1';
      const items = Array.isArray(schedule) ? schedule : [];
      localStorage.setItem(storageKey, JSON.stringify({ dateKey, items }));
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('tt:projection-schedule-updated', { detail: { dateKey, items } }));
      }
      return items;
    } catch {
      return null;
    }
  };

  const formatTime12Hour = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${mins} ${ampm}`;
  };

  const buildScheduleTimelineCard = (item, dateKey, index) => {
    if (!item || !item.type) return null;
    const timeMs = Number(item?.timeMs ?? (item?.time instanceof Date ? item.time.getTime() : NaN));
    if (!Number.isFinite(timeMs)) return null;
    const d = new Date(timeMs);
    const isFeed = item.type === 'feed';
    let amount = isFeed ? Number(item?.targetOz) : Number(item?.avgDurationHours);
    if (!Number.isFinite(amount) && isFeed && Array.isArray(item?.targetOzRange)) {
      const [low, high] = item.targetOzRange;
      if (Number.isFinite(low) && Number.isFinite(high)) {
        amount = Math.round(((low + high) / 2) * 10) / 10;
      }
    }
    return {
      id: item?.id || `sched-${dateKey}-${item.type}-${index}`,
      time: formatTime12Hour(timeMs),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'scheduled',
      type: item.type,
      amount: Number.isFinite(amount) ? amount : null,
      unit: isFeed ? 'oz' : 'hrs',
      timeMs,
      isCompleted: !!item?.isCompleted,
      matched: !!item?.matched,
      actual: !!item?.actual
    };
  };

  const getTimelineCards = (date = new Date()) => {
    const dateKey = getScheduleDateKey(date);
    const schedule = readSchedule(dateKey) || [];
    return schedule
      .map((item, idx) => buildScheduleTimelineCard(item, dateKey, idx))
      .filter(Boolean);
  };

  const listeners = new Set();

  const notify = ({ dateKey, schedule }) => {
    const normalized = Array.isArray(schedule) ? schedule : [];
    const cards = normalized
      .map((item, idx) => buildScheduleTimelineCard(item, dateKey, idx))
      .filter(Boolean);
    listeners.forEach((listener) => {
      try {
        listener({ dateKey, schedule: normalized, cards });
      } catch (e) {
        // ignore listener errors
      }
    });
  };

  const refresh = async (date = new Date()) => {
    if (!scheduleStore || typeof scheduleStore.rebuildAndPersist !== 'function' || typeof firestoreStorage === 'undefined') {
      const dateKey = getScheduleDateKey(date);
      const schedule = readSchedule(dateKey) || [];
      notify({ dateKey, schedule });
      return schedule;
    }
    try {
      const [feedings, sleeps, kid, sleepSettings] = await Promise.all([
        firestoreStorage.getAllFeedings(),
        firestoreStorage.getAllSleepSessions(),
        firestoreStorage.getKidData(),
        firestoreStorage.getSleepSettings()
      ]);
      const ageInMonths = kid?.birthDate && window.TT?.shared?.calculateAgeInMonths
        ? window.TT.shared.calculateAgeInMonths(kid.birthDate)
        : 0;
      const dateKey = getScheduleDateKey(date);
      await scheduleStore.rebuildAndPersist({
        feedings,
        sleepSessions: sleeps,
        ageInMonths,
        sleepSettings,
        kidId: firestoreStorage.currentKidId,
        dateKey,
        persistAdjusted: true
      });
      const schedule = readSchedule(dateKey) || [];
      notify({ dateKey, schedule });
      return schedule;
    } catch (e) {
      const dateKey = getScheduleDateKey(date);
      const schedule = readSchedule(dateKey) || [];
      notify({ dateKey, schedule });
      return schedule;
    }
  };

  window.TT.store.schedBot = {
    getScheduleDateKey,
    readSchedule,
    writeSchedule,
    getSchedule: (date = new Date()) => {
      const dateKey = getScheduleDateKey(date);
      return readSchedule(dateKey) || [];
    },
    getTimelineCards,
    subscribe: (listener) => {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    matchScheduleToActualEvents: scheduleUtils?.matchScheduleToActualEvents
      ? scheduleUtils.matchScheduleToActualEvents
      : null
  };

  if (!window.TT.store._schedBotInit) {
    window.TT.store._schedBotInit = true;
    window.addEventListener('tt:projection-schedule-updated', (event) => {
      const dateKey = event?.detail?.dateKey || getScheduleDateKey(new Date());
      const schedule = readSchedule(dateKey) || [];
      notify({ dateKey, schedule });
    });
    try {
      const dateKey = getScheduleDateKey(new Date());
      const schedule = readSchedule(dateKey) || [];
      notify({ dateKey, schedule });
    } catch (e) {
      // ignore init errors
    }
  }
})();
