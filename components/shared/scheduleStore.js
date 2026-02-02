// Shared schedule store (projection-only for now)
(function initScheduleStore() {
  if (typeof window === 'undefined') return;
  window.TT = window.TT || {};
  window.TT.store = window.TT.store || {};

  const scheduleUtils = window.TT.utils && window.TT.utils.scheduleUtils
    ? window.TT.utils.scheduleUtils
    : null;

  const STORAGE_KEY = 'tt_daily_projection_schedule_v1';
  const AI_SCHEDULE_CALL_KEY = 'tt_last_schedule_ai_call';

  const getScheduleDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const _normalizeStoredItems = (items) => {
    const normalized = (items || [])
      .map((item) => {
        const timeMs = Number(item?.timeMs);
        if (!Number.isFinite(timeMs)) return null;
        return {
          ...item,
          timeMs,
          time: new Date(timeMs)
        };
      })
      .filter(Boolean);
    return normalized.length > 0 ? normalized : null;
  };

  const readProjectionSchedule = (dateKey) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.dateKey !== dateKey || !Array.isArray(parsed.items)) return null;
      return _normalizeStoredItems(parsed.items);
    } catch {
      return null;
    }
  };

  const writeProjectionSchedule = (dateKey, schedule) => {
    try {
      const items = (schedule || [])
        .map((item) => {
          const timeMs = item?.time instanceof Date ? item.time.getTime() : Number(item?.timeMs);
          if (!Number.isFinite(timeMs)) return null;
          return {
            type: item.type,
            timeMs,
            patternBased: !!item.patternBased,
            patternCount: item.patternCount || 0,
            targetOz: Number.isFinite(Number(item?.targetOz)) ? Number(item.targetOz) : null,
            targetOzRange: Array.isArray(item?.targetOzRange) ? item.targetOzRange : null,
            avgDurationHours: Number.isFinite(Number(item?.avgDurationHours)) ? Number(item.avgDurationHours) : null,
            intervalBased: !!item.intervalBased,
            adjusted: !!item.adjusted,
            actual: !!item.actual,
            isCompleted: !!item.isCompleted,
            source: item.source || null
          };
        })
        .filter(Boolean);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dateKey, items }));
      if (typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('tt:projection-schedule-updated', { detail: { dateKey, items } }));
        } catch (e) {}
      }
      return items;
    } catch {
      return null;
    }
  };

  const _eventPriority = (e) => {
    if (!e) return 0;
    if (e.actual) return 3;
    if (e.patternBased) return 2;
    if (e.intervalBased) return 1;
    return 0;
  };

  const _eventStrength = (e) => {
    const n = (e && (e.patternCount ?? e.occurrences ?? e.count ?? e.sampleCount)) || 0;
    return Number.isFinite(n) ? n : 0;
  };

  const _normalizeEventTime = (e) => {
    if (!e) return null;
    if (e.time instanceof Date) return e.time;
    const t = Number(e.timeMs);
    if (Number.isFinite(t)) return new Date(t);
    return null;
  };

  const _enforceMinGaps = (schedule, config = {}) => {
    if (!Array.isArray(schedule) || schedule.length < 2) return schedule || [];

    const minSameSleepMinutes = Number.isFinite(Number(config.minSameSleepMinutes))
      ? Number(config.minSameSleepMinutes)
      : 75;
    const minSameFeedMinutes = Number.isFinite(Number(config.minSameFeedMinutes))
      ? Number(config.minSameFeedMinutes)
      : 90;
    const minDiffTypeMinutes = Number.isFinite(Number(config.minDiffTypeMinutes))
      ? Number(config.minDiffTypeMinutes)
      : 20;

    const ordered = schedule
      .map(e => ({ ...e, __time: _normalizeEventTime(e) }))
      .filter(e => e.__time instanceof Date && Number.isFinite(e.__time.getTime()))
      .sort((a, b) => a.__time.getTime() - b.__time.getTime());

    const kept = [];
    for (const cur of ordered) {
      if (kept.length === 0) {
        kept.push(cur);
        continue;
      }

      const prev = kept[kept.length - 1];
      const diffMin = Math.abs(cur.__time.getTime() - prev.__time.getTime()) / (1000 * 60);

      const sameType = cur.type && prev.type && cur.type === prev.type;
      const minGap = sameType
        ? (cur.type === 'sleep' ? minSameSleepMinutes : (cur.type === 'feed' ? minSameFeedMinutes : 0))
        : minDiffTypeMinutes;

      if (minGap > 0 && diffMin < minGap) {
        const pPrev = _eventPriority(prev);
        const pCur = _eventPriority(cur);
        if (pCur > pPrev) {
          kept[kept.length - 1] = cur;
        } else if (pCur === pPrev && _eventStrength(cur) > _eventStrength(prev)) {
          kept[kept.length - 1] = cur;
        }
        continue;
      }

      kept.push(cur);
    }

    return kept.map(({ __time, ...e }) => e);
  };

  const _fallbackFeedIntervalHours = (ageInMonths) => {
    if (ageInMonths < 1) return 2;
    if (ageInMonths < 3) return 2.5;
    if (ageInMonths < 6) return 3;
    return 3.5;
  };

  const formatTimeHmma = (date) => {
    if (!date || !(date instanceof Date)) return '';
    const h = date.getHours();
    const m = date.getMinutes();
    const hour = h % 12 || 12;
    const minute = String(m).padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    return `${hour}:${minute}${ampm}`;
  };

  const getLastScheduleAICallTime = () => {
    try {
      const stored = localStorage.getItem(AI_SCHEDULE_CALL_KEY);
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  };

  const setLastScheduleAICallTime = (timestamp) => {
    try {
      localStorage.setItem(AI_SCHEDULE_CALL_KEY, String(timestamp));
    } catch {
      // ignore
    }
  };

  let lastScheduleAICallRef = getLastScheduleAICallTime();

  // TUNING: adjust these in one place to change schedule behavior app-wide.
  const DEFAULT_SCHEDULE_TUNING = {
    // Pattern discovery
    lookbackDays: 7,                // how many days of history to use
    feedingSessionWindowMinutes: 45,// merge feeds within this window into a session
    clusterWindowMinutes: 60,       // cluster events by time-of-day within this window
    minPatternCount: 3,             // min occurrences to accept a pattern
    minFeedIntervalHours: 0.5,
    maxFeedIntervalHours: 8,

    // Matching actual logs to scheduled items
    matchWindowMinutes: 30,         // how close an actual can be to count as scheduled

    // Gap rules / collision resolution
    minTransitionGapMinutes: 30,    // feed<->sleep minimum spacing
    minSameSleepMinutes: 75,        // minimum sleep-to-sleep spacing
    minSameFeedMinutes: 90,         // minimum feed-to-feed spacing
    minDiffTypeMinutes: 20,         // minimum gap between different types

    // Interval fill rules
    feedSkipWindowMinutes: 45,      // skip interval feed if near a pattern feed
    minNapAfterFeedMinutes: 25,
    napHoursAfterFeed: 1.5,

    // BuildDailySchedule constraints
    minGenericGapMinutes: 10,
    feedDurationMinutes: 20,
    transitionBufferMinutes: 10,
    dedupeWindowMinutes: 5,

    // AI schedule (optional)
    useAIForSchedule: true,
    aiCooldownMinutes: 15,
    aiExtendedCooldownMinutes: 120,
    aiRecentEventWindowMinutes: 30
  };

  const buildAISchedule = async ({ analysis, feedIntervalHours, ageInMonths = 0, kidId, now = new Date(), config }) => {
    if (!analysis || !config?.useAIForSchedule) return null;
    if (typeof window.getAIResponse !== 'function' || !kidId) return null;

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    today.setMilliseconds(0);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const recentWindow = Number(config.aiRecentEventWindowMinutes) || 30;
    const feedPatternsList = (analysis.feedPatterns || [])
      .filter(p => p.avgMinutes >= nowMinutes - recentWindow)
      .map(p => {
        const displayTime = p.hour === 0 ? `12:${String(p.minute).padStart(2, '0')}am` :
                          p.hour < 12 ? `${p.hour}:${String(p.minute).padStart(2, '0')}am` :
                          p.hour === 12 ? `12:${String(p.minute).padStart(2, '0')}pm` :
                          `${p.hour - 12}:${String(p.minute).padStart(2, '0')}pm`;
        return `- ${displayTime} (${p.count} occurrences)`;
      })
      .join('\n');

    const sleepPatternsList = (analysis.sleepPatterns || [])
      .filter(p => p.avgMinutes >= nowMinutes - recentWindow)
      .map(p => {
        const displayTime = p.hour === 0 ? `12:${String(p.minute).padStart(2, '0')}am` :
                          p.hour < 12 ? `${p.hour}:${String(p.minute).padStart(2, '0')}am` :
                          p.hour === 12 ? `12:${String(p.minute).padStart(2, '0')}pm` :
                          `${p.hour - 12}:${String(p.minute).padStart(2, '0')}pm`;
        return `- ${displayTime} (${p.count} occurrences)`;
      })
      .join('\n');

    const currentTime = formatTimeHmma(now);
    const avgInterval = analysis.avgInterval || feedIntervalHours;

    const prompt = `You are a baby care assistant. I need you to create a single optimal timeline for TODAY based on detected patterns.

Current time: ${currentTime}
Baby's age: ${ageInMonths} months
Typical feed interval: ${avgInterval.toFixed(1)} hours

DETECTED FEED PATTERNS (from last ${config.lookbackDays} days):
${feedPatternsList || 'None detected'}

DETECTED SLEEP PATTERNS (from last ${config.lookbackDays} days):
${sleepPatternsList || 'None detected'}

TASK: Create a single, consolidated timeline for TODAY starting from now (${currentTime}).

Rules:
1. Consolidate overlapping patterns (if multiple patterns suggest the same time, pick the most frequent one)
2. Account for typical intervals (${avgInterval.toFixed(1)} hours between feeds)
3. Only include feed and sleep events - DO NOT include wake events
4. Only include events from now onwards (don't include past events)
5. Make it realistic for a ${ageInMonths}-month-old baby
6. Each time should appear only once - consolidate all duplicates

OUTPUT FORMAT (JSON array):
[
  {"type": "feed", "time": "9:30am", "patternCount": 6},
  {"type": "sleep", "time": "11:00am", "patternCount": 5},
  {"type": "feed", "time": "1:00pm", "patternCount": 7}
]

IMPORTANT:
- Output ONLY valid JSON, no other text
- Time format: "h:mma" (e.g., "9:30am", "2:15pm", "12:00pm")
- DO NOT include wake events - only "feed" and "sleep" types
- Don't include events in the past
- Consolidate duplicates - each time should appear only once per event type`;

    try {
      const nowMs = Date.now();
      const cooldownMs = (Number(config.aiCooldownMinutes) || 15) * 60 * 1000;
      const storedLast = getLastScheduleAICallTime();
      const lastCall = lastScheduleAICallRef > storedLast ? lastScheduleAICallRef : storedLast;
      const timeSinceLast = nowMs - lastCall;

      if (timeSinceLast < cooldownMs) return null;

      const aiResponse = await window.getAIResponse(prompt, kidId);
      if (aiResponse) {
        lastScheduleAICallRef = nowMs;
        setLastScheduleAICallTime(nowMs);
      }

      if (!aiResponse) return null;

      let scheduleData = null;
      try {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        scheduleData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
      } catch (e) {
        scheduleData = null;
      }

      if (!Array.isArray(scheduleData)) return null;

      const schedule = [];
      scheduleData.forEach(item => {
        if (!item.type || !item.time) return;
        const timeMatch = item.time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
        if (!timeMatch) return;

        let hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        const isPm = timeMatch[3].toLowerCase() === 'pm';

        if (isPm && hour !== 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;

        const scheduleTime = new Date(today);
        scheduleTime.setHours(hour, minute, 0, 0);
        scheduleTime.setSeconds(0);
        scheduleTime.setMilliseconds(0);

        if (item.type === 'wake') return;

        if (scheduleTime.getTime() >= now.getTime() - (recentWindow * 60 * 1000)) {
          schedule.push({
            type: item.type,
            time: scheduleTime,
            patternBased: true,
            patternCount: item.patternCount || 0
          });
        }
      });

      schedule.sort((a, b) => a.time.getTime() - b.time.getTime());
      const filteredSchedule = schedule.filter(e => e.type !== 'wake');
      return filteredSchedule.length > 0 ? filteredSchedule : null;
    } catch (error) {
      const isQuotaError = error?.status === 429 ||
        error?.quotaExceeded ||
        error?.message?.includes('429') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError) {
        const extendedCooldownMs = (Number(config.aiExtendedCooldownMinutes) || 120) * 60 * 1000;
        const nowMs = Date.now();
        lastScheduleAICallRef = nowMs - extendedCooldownMs + ((Number(config.aiCooldownMinutes) || 15) * 60 * 1000);
        setLastScheduleAICallTime(lastScheduleAICallRef);
      }
      return null;
    }
  };

  const rebuildProjectionSchedule = ({
    feedings = [],
    sleepSessions = [],
    ageInMonths = 0,
    sleepSettings = null,
    feedIntervalHours = null,
    now = new Date(),
    config = {}
  } = {}) => {
    if (!scheduleUtils) return null;
    const mergedConfig = { ...DEFAULT_SCHEDULE_TUNING, ...(config || {}) };
    const analysis = scheduleUtils.analyzeHistoricalIntervals
      ? scheduleUtils.analyzeHistoricalIntervals(feedings, sleepSessions, mergedConfig)
      : null;
    const interval = Number(feedIntervalHours) || Number(analysis?.feedIntervalHours) || Number(analysis?.avgInterval);
    const resolvedInterval = Number.isFinite(interval) && interval > 0
      ? interval
      : _fallbackFeedIntervalHours(ageInMonths);

    const baseSchedule = scheduleUtils.buildDailySchedule
      ? scheduleUtils.buildDailySchedule(analysis || {}, resolvedInterval, ageInMonths, { now, config: mergedConfig })
      : [];
    const adjustedSchedule = scheduleUtils.adjustScheduleForActualEvents
      ? scheduleUtils.adjustScheduleForActualEvents(
          baseSchedule,
          feedings,
          sleepSessions,
          resolvedInterval,
          analysis || {},
          ageInMonths,
          { now, sleepSettings, config: mergedConfig }
        )
      : baseSchedule;

    return {
      analysis,
      feedIntervalHours: resolvedInterval,
      baseSchedule,
      adjustedSchedule,
      config: mergedConfig
    };
  };

  const rebuildProjectionScheduleAsync = async ({
    feedings = [],
    sleepSessions = [],
    ageInMonths = 0,
    sleepSettings = null,
    feedIntervalHours = null,
    now = new Date(),
    config = {},
    kidId = null
  } = {}) => {
    if (!scheduleUtils) return null;
    const mergedConfig = { ...DEFAULT_SCHEDULE_TUNING, ...(config || {}) };
    const analysis = scheduleUtils.analyzeHistoricalIntervals
      ? scheduleUtils.analyzeHistoricalIntervals(feedings, sleepSessions, mergedConfig)
      : null;
    const interval = Number(feedIntervalHours) || Number(analysis?.feedIntervalHours) || Number(analysis?.avgInterval);
    const resolvedInterval = Number.isFinite(interval) && interval > 0
      ? interval
      : _fallbackFeedIntervalHours(ageInMonths);

    let baseSchedule = null;
    if (mergedConfig.useAIForSchedule) {
      baseSchedule = await buildAISchedule({
        analysis,
        feedIntervalHours: resolvedInterval,
        ageInMonths,
        kidId,
        now,
        config: mergedConfig
      });
    }
    if (!Array.isArray(baseSchedule) || baseSchedule.length === 0) {
      baseSchedule = scheduleUtils.buildDailySchedule
        ? scheduleUtils.buildDailySchedule(analysis || {}, resolvedInterval, ageInMonths, { now, config: mergedConfig })
        : [];
    }

    const adjustedSchedule = scheduleUtils.adjustScheduleForActualEvents
      ? scheduleUtils.adjustScheduleForActualEvents(
          baseSchedule,
          feedings,
          sleepSessions,
          resolvedInterval,
          analysis || {},
          ageInMonths,
          { now, sleepSettings, config: mergedConfig }
        )
      : baseSchedule;

    return {
      analysis,
      feedIntervalHours: resolvedInterval,
      baseSchedule,
      adjustedSchedule,
      config: mergedConfig
    };
  };

  const initScheduleRebuildController = () => {
    if (typeof window === 'undefined') return;
    window.TT = window.TT || {};
    window.TT.store = window.TT.store || {};
    if (window.TT.store._scheduleRebuildControllerInit) return;
    window.TT.store._scheduleRebuildControllerInit = true;

    const MIN_INTERVAL_MS = 2000;
    const DEBOUNCE_MS = 250;
    const RETRY_MS = 2000;

    const state = {
      timer: null,
      retryTimer: null,
      midnightTimer: null,
      inFlight: null,
      lastRun: 0
    };

    const isReady = () => {
      if (!scheduleUtils || typeof scheduleUtils.analyzeHistoricalIntervals !== 'function') return false;
      if (typeof firestoreStorage === 'undefined') return false;
      if (!firestoreStorage.currentFamilyId || !firestoreStorage.currentKidId) return false;
      return true;
    };

    const scheduleRetry = () => {
      if (state.retryTimer) return;
      state.retryTimer = setTimeout(() => {
        state.retryTimer = null;
        queueRebuild('retry', 0);
      }, RETRY_MS);
    };

    const rebuildNow = async (reason) => {
      const now = Date.now();
      if (state.inFlight) return state.inFlight;
      if (now - state.lastRun < MIN_INTERVAL_MS) return null;
      if (!isReady()) {
        scheduleRetry();
        return null;
      }

      state.inFlight = (async () => {
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
          const dateKey = getScheduleDateKey(new Date());
          return await window.TT.store.scheduleStore.rebuildAndPersist({
            feedings,
            sleepSessions: sleeps,
            ageInMonths,
            sleepSettings,
            kidId: firestoreStorage.currentKidId,
            dateKey,
            persistAdjusted: true
          });
        } catch (e) {
          return null;
        } finally {
          state.lastRun = Date.now();
          state.inFlight = null;
        }
      })();

      return state.inFlight;
    };

    const queueRebuild = (reason, delay = DEBOUNCE_MS) => {
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => rebuildNow(reason), delay);
    };

    const scheduleMidnight = () => {
      if (state.midnightTimer) clearTimeout(state.midnightTimer);
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const ms = Math.max(0, next.getTime() - now.getTime()) + 50;
      state.midnightTimer = setTimeout(() => {
        queueRebuild('midnight', 0);
        scheduleMidnight();
      }, ms);
    };

    const onInputAdded = () => queueRebuild('input-added', 150);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') queueRebuild('visible', 300);
    };
    const onFocus = () => queueRebuild('focus', 300);

    window.addEventListener('tt-input-sheet-added', onInputAdded);
    window.addEventListener('focus', onFocus);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    queueRebuild('init', 0);
    scheduleMidnight();
  };

  window.TT.store.scheduleStore = {
    storageKey: STORAGE_KEY,
    getScheduleDateKey,
    readProjectionSchedule,
    writeProjectionSchedule,
    rebuildProjectionSchedule,
    rebuildProjectionScheduleAsync,
    initScheduleRebuildController,
    rebuildAndPersist: async ({
      feedings = [],
      sleepSessions = [],
      ageInMonths = 0,
      sleepSettings = null,
      feedIntervalHours = null,
      now = new Date(),
      config = {},
      kidId = null,
      dateKey = null,
      persistAdjusted = true
    } = {}) => {
      const result = await rebuildProjectionScheduleAsync({
        feedings,
        sleepSessions,
        ageInMonths,
        sleepSettings,
        feedIntervalHours,
        now,
        config,
        kidId
      });
      if (!result) return null;
      const resolvedDateKey = dateKey || getScheduleDateKey(now);
      const scheduleToPersist = persistAdjusted
        ? (result.adjustedSchedule || result.baseSchedule)
        : result.baseSchedule;
      if (Array.isArray(scheduleToPersist)) {
        const sanitizedSchedule = _enforceMinGaps(scheduleToPersist, result.config || {});
        writeProjectionSchedule(resolvedDateKey, sanitizedSchedule);
      }
      return result;
    }
  };

  // Single-owner schedule rebuild controller
  initScheduleRebuildController();
})();
