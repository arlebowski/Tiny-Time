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

  const percentile = (arr, p) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
    return sorted[idx];
  };

  // Combine nearby feeds into a single "session" to avoid top-off noise.
  const buildFeedingSessions = (feedings, windowMinutes = 45) => {
    const getOz = (f) => {
      const oz = Number(f?.ounces ?? f?.amountOz ?? f?.amount ?? f?.volumeOz ?? f?.volume);
      return Number.isFinite(oz) && oz > 0 ? oz : 0;
    };
    const sorted = [...(feedings || [])]
      .filter(f => f && Number.isFinite(Number(f.timestamp)))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const sessions = [];
    const windowMs = windowMinutes * 60 * 1000;
    let cur = null;

    for (const f of sorted) {
      const ts = Number(f.timestamp);
      const oz = getOz(f);
      if (!cur) {
        cur = { startTime: ts, endTime: ts, totalOz: oz, items: [f] };
        continue;
      }
      if (ts - cur.endTime <= windowMs) {
        cur.endTime = ts;
        cur.totalOz += oz;
        cur.items.push(f);
      } else {
        sessions.push(cur);
        cur = { startTime: ts, endTime: ts, totalOz: oz, items: [f] };
      }
    }
    if (cur) sessions.push(cur);

    return sessions.map(s => ({
      timestamp: s.startTime,
      startTime: s.startTime,
      endTime: s.endTime,
      ounces: Math.round(s.totalOz * 10) / 10,
      _sessionCount: s.items.length
    }));
  };

  // Analyze historical intervals from recent history to derive time-of-day patterns.
  const analyzeHistoricalIntervals = (feedings, sleepSessions, options = {}) => {
    const now = Date.now();
    const lookbackDays = Number.isFinite(Number(options.lookbackDays)) ? Number(options.lookbackDays) : 7;
    const feedingSessionWindowMinutes = Number.isFinite(Number(options.feedingSessionWindowMinutes))
      ? Number(options.feedingSessionWindowMinutes)
      : 45;
    const clusterWindowMinutes = Number.isFinite(Number(options.clusterWindowMinutes))
      ? Number(options.clusterWindowMinutes)
      : 60;
    const minPatternCount = Number.isFinite(Number(options.minPatternCount))
      ? Number(options.minPatternCount)
      : 3;
    const minFeedIntervalHours = Number.isFinite(Number(options.minFeedIntervalHours))
      ? Number(options.minFeedIntervalHours)
      : 0.5;
    const maxFeedIntervalHours = Number.isFinite(Number(options.maxFeedIntervalHours))
      ? Number(options.maxFeedIntervalHours)
      : 8;

    const _getOunces = (f) => {
      const v = Number(f?.ounces ?? f?.amountOz ?? f?.amount ?? f?.volumeOz ?? f?.volume);
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const _getSleepDurationHours = (s) => {
      const start = Number(s?.startTime);
      const end = Number(s?.endTime);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return (end - start) / (1000 * 60 * 60);
    };

    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000;
    const recentFeedingsRaw = (feedings || []).filter(f => f && f.timestamp >= now - lookbackMs);
    const recentFeedingSessions = buildFeedingSessions(recentFeedingsRaw, feedingSessionWindowMinutes);

    const recentFeedings = recentFeedingSessions;
    const allSessionOz = recentFeedings.map(f => Number(f.ounces)).filter(v => Number.isFinite(v) && v > 0);
    const overallSessionMedianOz = percentile(allSessionOz, 0.5);

    const recentSleep = (sleepSessions || [])
      .filter(s => s.startTime && s.startTime >= now - lookbackMs && s.endTime && !s.isActive)
      .sort((a, b) => a.startTime - b.startTime);

    // Feeding intervals between sessions.
    const feedingIntervals = [];
    for (let i = 1; i < recentFeedings.length; i++) {
      const intervalHours = (recentFeedings[i].timestamp - recentFeedings[i - 1].timestamp) / (1000 * 60 * 60);
      if (intervalHours > minFeedIntervalHours && intervalHours < maxFeedIntervalHours) {
        feedingIntervals.push(intervalHours);
      }
    }
    const feedIntervalHours = feedingIntervals.length > 0
      ? percentile(feedingIntervals, 0.5)
      : 3.5;

    const minFeedGapHours = Math.max(2.5, feedIntervalHours * 0.75);

    const minutesSinceMidnight = (timestamp) => {
      const date = new Date(timestamp);
      return date.getHours() * 60 + date.getMinutes();
    };

    const getFeedOz = (f) => {
      const oz = Number(f?.ounces ?? f?.volume ?? f?.amount ?? 0);
      return Number.isFinite(oz) && oz > 0 ? oz : null;
    };

    const withinClusterWindow = (time1Minutes, time2Minutes) => {
      const diff1 = Math.abs(time1Minutes - time2Minutes);
      const diff2 = Math.abs(time1Minutes - (time2Minutes + 24 * 60));
      const diff3 = Math.abs((time1Minutes + 24 * 60) - time2Minutes);
      return Math.min(diff1, diff2, diff3) <= clusterWindowMinutes;
    };

    const feedClusters = [];
    recentFeedings.forEach(f => {
      const timeMinutes = minutesSinceMidnight(f.timestamp);
      const oz = getFeedOz(f);
      let foundCluster = null;
      for (const cluster of feedClusters) {
        const isClose = cluster.times.some(t => withinClusterWindow(timeMinutes, t));
        if (isClose) {
          foundCluster = cluster;
          break;
        }
      }
      if (foundCluster) {
        foundCluster.times.push(timeMinutes);
        foundCluster.timestamps.push(f.timestamp);
        if (oz != null) foundCluster.ounces.push(oz);
      } else {
        feedClusters.push({
          times: [timeMinutes],
          timestamps: [f.timestamp],
          ounces: oz != null ? [oz] : []
        });
      }
    });

    const feedPatterns = feedClusters
      .map(cluster => {
        const centerMinutes = percentile(cluster.times, 0.5);
        const windowStartMinutes = percentile(cluster.times, 0.10);
        const windowEndMinutes = percentile(cluster.times, 0.90);
        const avgMinutes = Math.round(centerMinutes);
        const hour = Math.floor(avgMinutes / 60) % 24;
        const minute = avgMinutes % 60;
        const volumeMedianOz = percentile(cluster.ounces || [], 0.5);
        const volumeP10Oz = percentile(cluster.ounces || [], 0.10);
        const volumeP90Oz = percentile(cluster.ounces || [], 0.90);
        const flooredMedian = (overallSessionMedianOz && volumeMedianOz)
          ? Math.max(volumeMedianOz, overallSessionMedianOz * 0.85)
          : (volumeMedianOz ?? overallSessionMedianOz ?? null);
        return {
          hour,
          minute,
          count: cluster.times.length,
          avgMinutes,
          windowStartMinutes,
          windowEndMinutes,
          volumeMedianOz: flooredMedian,
          volumeP10Oz,
          volumeP90Oz
        };
      })
      .filter(pattern => pattern.count >= minPatternCount)
      .sort((a, b) => b.count - a.count);

    let commonTimePattern = null;
    if (feedPatterns.length > 0) {
      const nowObj = new Date();
      const nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
      const upcomingPatterns = feedPatterns.filter(p => p.avgMinutes > nowMinutes);
      if (upcomingPatterns.length > 0) {
        const nextPattern = upcomingPatterns.reduce((closest, current) => {
          return current.avgMinutes < closest.avgMinutes ? current : closest;
        });
        commonTimePattern = {
          hour: nextPattern.hour,
          minute: nextPattern.minute
        };
      } else {
        commonTimePattern = {
          hour: feedPatterns[0].hour,
          minute: feedPatterns[0].minute
        };
      }
    }

    const sleepClusters = [];
    recentSleep.forEach(s => {
      const timeMinutes = minutesSinceMidnight(s.startTime);
      const durHrs = _getSleepDurationHours(s);
      let foundCluster = null;
      for (const cluster of sleepClusters) {
        const isClose = cluster.times.some(t => withinClusterWindow(timeMinutes, t));
        if (isClose) {
          foundCluster = cluster;
          break;
        }
      }
      if (foundCluster) {
        foundCluster.times.push(timeMinutes);
        foundCluster.timestamps.push(s.startTime);
        if (durHrs !== null) foundCluster.durations.push(durHrs);
      } else {
        sleepClusters.push({
          times: [timeMinutes],
          timestamps: [s.startTime],
          durations: durHrs !== null ? [durHrs] : []
        });
      }
    });

    const sleepPatterns = sleepClusters
      .map(cluster => {
        const centerMinutes = percentile(cluster.times, 0.5);
        const windowStartMinutes = percentile(cluster.times, 0.10);
        const windowEndMinutes = percentile(cluster.times, 0.90);
        const avgMinutes = Math.round(centerMinutes);
        const hour = Math.floor(avgMinutes / 60) % 24;
        const minute = avgMinutes % 60;
        const durationMedianHours = percentile(cluster.durations || [], 0.5);
        return {
          hour,
          minute,
          count: cluster.times.length,
          avgMinutes,
          windowStartMinutes,
          windowEndMinutes,
          avgDurationHours: durationMedianHours
        };
      })
      .filter(pattern => pattern.count >= minPatternCount)
      .sort((a, b) => b.count - a.count);

    return {
      avgInterval: feedIntervalHours,
      feedIntervalHours,
      minFeedGapHours,
      lastFeedingTime: recentFeedings.length > 0 ? recentFeedings[recentFeedings.length - 1].timestamp : null,
      commonTimePattern,
      feedIntervals: feedingIntervals.length,
      recentFeedings,
      feedPatterns,
      sleepPatterns,
      feedClusters,
      sleepClusters
    };
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

  const buildDailySchedule = (analysis, feedIntervalHours, ageInMonths = 0, options = {}) => {
    const now = options?.now instanceof Date ? options.now : new Date();
    const config = options?.config || {};
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    today.setMilliseconds(0);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let schedule = [];

    // Enforce minimum feed spacing using analysis.minFeedGapHours
    const minFeedGapMs = (Math.max(analysis?.minFeedGapHours ?? 0, 2.5)) * 60 * 60 * 1000;
    const tooCloseToAnotherFeed = (t) => {
      const tMs = t.getTime();
      return schedule.some(e =>
        e?.type === 'feed' &&
        e?.time instanceof Date &&
        Math.abs(e.time.getTime() - tMs) < minFeedGapMs
      );
    };

    // Add all feed patterns for today
    (analysis?.feedPatterns || []).forEach(pattern => {
      const scheduleTime = new Date(today);
      scheduleTime.setHours(pattern.hour, pattern.minute, 0, 0);
      // Only include if it's in the future or within last 30 minutes (might be happening now)
      if (pattern.avgMinutes >= nowMinutes - 30) {
        // Don’t add a pattern feed if it would create unrealistically short intervals
        if (tooCloseToAnotherFeed(scheduleTime)) return;

        schedule.push({
          type: 'feed',
          time: scheduleTime,
          patternBased: true,
          patternCount: pattern.count,
          avgMinutes: pattern.avgMinutes,
          // Volume guidance for UI (median + typical range)
          targetOz: pattern.volumeMedianOz ?? null,
          targetOzRange: (pattern.volumeP10Oz != null && pattern.volumeP90Oz != null)
            ? [pattern.volumeP10Oz, pattern.volumeP90Oz]
            : null
        });
      }
    });

    // Add all sleep patterns for today
    (analysis?.sleepPatterns || []).forEach(pattern => {
      const scheduleTime = new Date(today);
      scheduleTime.setHours(pattern.hour, pattern.minute, 0, 0);
      // Only include if it's in the future or within last 30 minutes
      if (pattern.avgMinutes >= nowMinutes - 30) {
        schedule.push({
          type: 'sleep',
          time: scheduleTime,
          patternBased: true,
          patternCount: pattern.count,
          avgMinutes: pattern.avgMinutes,
          avgDurationHours: pattern.avgDurationHours ?? null
        });
      }
    });

    // Sort by time
    schedule.sort((a, b) => a.time.getTime() - b.time.getTime());

    // ------------------------------------------------------------
    // Guardrails: prevent impossible back-to-back transitions
    // Example: Feed at 4:20 then Sleep at 4:27 is nonsense.
    // We treat clusters as "soft" and push the later event forward.
    // ------------------------------------------------------------
    const FEED_DURATION_MIN = Number.isFinite(Number(config.feedDurationMinutes))
      ? Number(config.feedDurationMinutes)
      : 20;   // how long a feed typically takes
    const TRANSITION_BUFFER_MIN = Number.isFinite(Number(config.transitionBufferMinutes))
      ? Number(config.transitionBufferMinutes)
      : 10; // diaper/burp/settle
    const FEED_TO_SLEEP_MIN_GAP = FEED_DURATION_MIN + TRANSITION_BUFFER_MIN; // 30 min
    const MIN_GENERIC_GAP_MIN = Number.isFinite(Number(config.minGenericGapMinutes))
      ? Number(config.minGenericGapMinutes)
      : 10; // for any other too-close transitions

    const resolveCollisions = (events) => {
      if (!events || events.length < 2) return events;
      const out = [...events].sort((a, b) => a.time.getTime() - b.time.getTime());

      for (let i = 1; i < out.length; i++) {
        const prev = out[i - 1];
        const cur = out[i];
        if (!prev?.time || !cur?.time) continue;

        const diffMin = (cur.time.getTime() - prev.time.getTime()) / (1000 * 60);
        if (diffMin >= MIN_GENERIC_GAP_MIN) continue;

        // Feed -> Sleep: push sleep later by feed duration + buffer
        if (prev.type === 'feed' && cur.type === 'sleep') {
          const minStart = new Date(prev.time.getTime() + FEED_TO_SLEEP_MIN_GAP * 60 * 1000);
          if (cur.time.getTime() < minStart.getTime()) {
            cur.time = minStart;
            cur.adjusted = true;
            cur.adjustReason = 'feed->sleep gap';
          }
          continue;
        }

        // Sleep -> Feed (or anything else too close): push later event forward by generic gap
        const minStart = new Date(prev.time.getTime() + MIN_GENERIC_GAP_MIN * 60 * 1000);
        if (cur.time.getTime() < minStart.getTime()) {
          cur.time = minStart;
          cur.adjusted = true;
          cur.adjustReason = 'min gap';
        }
      }
      return out;
    };

    schedule = resolveCollisions(schedule);

    // Deduplicate events at the same time (within 5 minutes)
    // Keep the event with the highest pattern count
    const deduplicatedSchedule = [];
    const dedupeWindowMinutes = Number.isFinite(Number(config.dedupeWindowMinutes))
      ? Number(config.dedupeWindowMinutes)
      : 5;
    const timeWindowMs = dedupeWindowMinutes * 60 * 1000;

    schedule.forEach(event => {
      // Find if there's already an event at this time (within 5 min window)
      const existingIndex = deduplicatedSchedule.findIndex(existing => {
        if (existing.type !== event.type) return false;
        const timeDiff = Math.abs(existing.time.getTime() - event.time.getTime());
        return timeDiff <= timeWindowMs;
      });

      if (existingIndex === -1) {
        // No duplicate found, add it
        deduplicatedSchedule.push(event);
      } else {
        // Duplicate found - keep the one with higher pattern count
        const existing = deduplicatedSchedule[existingIndex];
        const existingCount = existing.patternCount || 0;
        const newCount = event.patternCount || 0;

        if (newCount > existingCount) {
          // Replace with the one that has more pattern occurrences
          deduplicatedSchedule[existingIndex] = event;
        } else if (newCount === existingCount && event.patternBased && !existing.patternBased) {
          // Same count, prefer pattern-based over interval-based
          deduplicatedSchedule[existingIndex] = event;
        }
        // Otherwise keep the existing one
      }
    });

    // Re-sort after deduplication
    deduplicatedSchedule.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Filter out any wake events (shouldn't be any, but just in case)
    const finalSchedule = deduplicatedSchedule.filter(e => e.type !== 'wake');

    return finalSchedule;
  };

  const adjustScheduleForActualEvents = (schedule, allFeedings, allSleepSessions, feedIntervalHours, analysis, ageInMonths = 0, options = {}) => {
    const now = options?.now instanceof Date ? options.now : new Date();
    const sleepSettings = options?.sleepSettings || null;
    const config = options?.config || {};
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    today.setMilliseconds(0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get today's actual events
    const todayFeedings = (allFeedings || []).filter(f => {
      const feedTime = new Date(f.timestamp);
      return feedTime >= today && feedTime <= todayEnd;
    }).sort((a, b) => a.timestamp - b.timestamp);

    const todaySleeps = (allSleepSessions || []).filter(s => {
      if (!s.startTime) return false;
      const sleepTime = new Date(s.startTime);
      return sleepTime >= today && sleepTime <= todayEnd;
    }).sort((a, b) => a.startTime - b.startTime);

    // Create adjusted schedule
    const adjustedSchedule = [];
    let lastActualFeedTime = null;
    let lastActualSleepTime = null;

    // Helpers for "re-solve forward"
    const minutesBetween = (a, b) => Math.abs(a.getTime() - b.getTime()) / (1000 * 60);
    const hasNearbyEvent = (events, type, time, windowMins) => {
      return events.some(e => e && e.type === type && e.time && minutesBetween(e.time, time) <= windowMins);
    };
    const hasNearbyAnyEvent = (events, time, windowMins) => {
      return events.some(e => e && e.time && minutesBetween(e.time, time) <= windowMins);
    };
    const clampToTodayEnd = (time, todayEndObj) => {
      if (!time) return null;
      return time.getTime() > todayEndObj.getTime() ? null : time;
    };

    // Day/night window from Settings:
    // day = between sleepDayStart -> sleepDayEnd (minutes since midnight)
    // night = everything outside that window
    const getDayWindow = (settings) => {
      const dayStart = Number(settings?.sleepDayStart ?? settings?.daySleepStartMinutes ?? 390);  // default 6:30am
      const dayEnd   = Number(settings?.sleepDayEnd   ?? settings?.daySleepEndMinutes   ?? 1170); // default 7:30pm
      return { dayStart, dayEnd };
    };
    const isInDayWindow = (mins, dayStart, dayEnd) => {
      // Supports windows that may wrap midnight
      return dayStart <= dayEnd
        ? (mins >= dayStart && mins < dayEnd)
        : (mins >= dayStart || mins < dayEnd);
    };
    const isNightTime = (dateObj, settings) => {
      if (!dateObj) return false;
      const { dayStart, dayEnd } = getDayWindow(settings);
      const mins = dateObj.getHours() * 60 + dateObj.getMinutes();
      return !isInDayWindow(mins, dayStart, dayEnd);
    };

    // Process events chronologically (only feed and sleep - no wake events)
    const allEvents = [
      ...todayFeedings.map(f => ({ type: 'feed', time: new Date(f.timestamp), actual: true, data: f })),
      ...todaySleeps.map(s => ({
        type: 'sleep',
        time: new Date(s.startTime),
        actual: true,
        data: s,
        endTime: s.endTime ? new Date(s.endTime) : null
      }))
    ].sort((a, b) => a.time.getTime() - b.time.getTime());

    // Track which scheduled events have been matched
    const matchedScheduled = new Set();

    // For each actual event, check if it matches a scheduled event (within 30 min)
    const matchWindowMinutes = Number.isFinite(Number(config.matchWindowMinutes))
      ? Number(config.matchWindowMinutes)
      : 30;

    allEvents.forEach(actualEvent => {
      let matched = false;
      schedule.forEach((scheduledEvent, idx) => {
        if (matchedScheduled.has(idx)) return;
        const timeDiff = Math.abs(actualEvent.time.getTime() - scheduledEvent.time.getTime()) / (1000 * 60); // minutes
        if (timeDiff <= matchWindowMinutes && actualEvent.type === scheduledEvent.type) {
          // Event occurred within 30 min of prediction - add the scheduled event to adjustedSchedule with actual flag
          matchedScheduled.add(idx);
          matched = true;

          // Add the matched scheduled event to adjustedSchedule, marking it as actual/completed
          adjustedSchedule.push({
            ...scheduledEvent,
            matched: true,
            actual: true,
            isCompleted: true
          });

          if (actualEvent.type === 'feed') {
            lastActualFeedTime = actualEvent.time;
          } else if (actualEvent.type === 'sleep') {
            lastActualSleepTime = actualEvent.time;
          }
        }
      });

      // If not matched, it's a new/adjusted event - add it and recalculate from here
      if (!matched) {
        adjustedSchedule.push({
          type: actualEvent.type,
          time: actualEvent.time,
          patternBased: false,
          actual: true,
          adjusted: true,
          relatedSleep: actualEvent.relatedSleep || null,
          source: actualEvent.source || null
        });

        if (actualEvent.type === 'feed') {
          lastActualFeedTime = actualEvent.time;
        } else if (actualEvent.type === 'sleep') {
          lastActualSleepTime = actualEvent.time;
        }
      }
    });

    /**
     * RE-SOLVE FORWARD:
     * - Keep actual events (and matched scheduled events marked actual)
     * - Rebuild the rest of the day from "now" using:
     *   1) remaining pattern-based events (ignore old interval-based predictions)
     *   2) interval feed chain anchored to last actual feed
     *   3) optional interval nap fills, but NEVER right after a feed (min gap)
     */

    // Add remaining scheduled events that haven't passed and weren't matched
    // Filter out wake events entirely and drop old interval-based fills
    const remainingPatternScheduled = (schedule || []).filter((event, idx) => {
      if (matchedScheduled.has(idx)) return false;
      if (!event || !event.time) return false;
      if (event.type === 'wake') return false;
      if (event.intervalBased) return false;
      if (typeof event.source === 'string' && event.source.startsWith('interval-based')) return false;
      if (!event.patternBased) return false;
      if (event.time.getTime() < now.getTime() - (30 * 60 * 1000)) return false; // >30min past
      return true;
    });

    const minFeedGapHours = Math.max(analysis?.minFeedGapHours ?? 0, 2.5);
    const minFeedGapMs = minFeedGapHours * 60 * 60 * 1000;

    // Start the forward plan with (a) actuals + (b) remaining pattern-based schedule
    const forwardPlan = [];
    adjustedSchedule.forEach(e => forwardPlan.push(e));
    remainingPatternScheduled.forEach(e => {
      if (!e || !e.time) return;

      // Guard: skip pattern feeds that are too soon after the last ACTUAL feed
      if (e.type === 'feed' && lastActualFeedTime && e.time instanceof Date) {
        const earliestAllowed = lastActualFeedTime.getTime() + minFeedGapMs;
        if (e.time.getTime() < earliestAllowed) {
          return;
        }
      }

      forwardPlan.push({
        ...e,
        actual: false,
        adjusted: true
      });
    });

    // Rebuild interval-based feeds from the last actual feed (fallback only)
    const todayEndObj = todayEnd;
    const feedSkipWindowMins = Number.isFinite(Number(config.feedSkipWindowMinutes))
      ? Number(config.feedSkipWindowMinutes)
      : 45; // if a pattern feed is within 45m, don't add interval feed
    const minNapAfterFeedMins = Number.isFinite(Number(config.minNapAfterFeedMinutes))
      ? Number(config.minNapAfterFeedMinutes)
      : 25; // never suggest sleep immediately after feeding
    const napHoursAfterFeed = Number.isFinite(Number(config.napHoursAfterFeed))
      ? Number(config.napHoursAfterFeed)
      : 1.5;
    const allowNightIntervals = ageInMonths < 1; // newborn exception

    // Forward re-solve rules (to avoid nonsense like two sleeps back-to-back)
    const MIN_SAME_SLEEP_MIN = Number.isFinite(Number(config.minSameSleepMinutes))
      ? Number(config.minSameSleepMinutes)
      : 75; // don't allow two "sleep" events within 75 min
    const MIN_SAME_FEED_MIN = Number.isFinite(Number(config.minSameFeedMinutes))
      ? Number(config.minSameFeedMinutes)
      : 90; // don't allow two "feed" events within 90 min
    const MIN_DIFF_TYPE_MIN = Number.isFinite(Number(config.minDiffTypeMinutes))
      ? Number(config.minDiffTypeMinutes)
      : 20; // keep at least 20 min between feed<->sleep predictions

    const _eventPriority = (e) => {
      if (!e) return 0;
      if (e.actual) return 3;
      if (e.patternBased) return 2;
      if (e.intervalBased) return 1;
      return 0;
    };

    const _eventStrength = (e) => {
      // used to break ties between pattern events
      const n = (e && (e.patternCount ?? e.occurrences ?? e.count ?? e.sampleCount)) || 0;
      return Number.isFinite(n) ? n : 0;
    };

    const _hasNearbySleep = (tMs, withinMin, events) => {
      const w = withinMin * 60 * 1000;
      return (events || []).some(ev => {
        if (!ev || ev.type !== 'sleep' || !ev.time) return false;
        const evMs = ev.time.getTime();
        return Math.abs(evMs - tMs) <= w;
      });
    };

    if (lastActualFeedTime) {
      // Generate feed chain: lastActual + interval, until end of day
      let cursor = new Date(lastActualFeedTime);
      while (true) {
        const nextFeed = new Date(cursor);
        const totalMinutes = nextFeed.getHours() * 60 + nextFeed.getMinutes() + (feedIntervalHours * 60);
        nextFeed.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
        nextFeed.setSeconds(0);
        nextFeed.setMilliseconds(0);

        const clamped = clampToTodayEnd(nextFeed, todayEndObj);
        if (!clamped) break;
        cursor = clamped;

        if (clamped.getTime() <= now.getTime()) continue;

        // No proactive interval feeds overnight (>= 1 month).
        // If next feed time lands in night window, stop generating further feeds.
        if (!allowNightIntervals && isNightTime(clamped, sleepSettings)) {
          break;
        }

        // Skip if near an existing feed (pattern or already-added)
        if (hasNearbyEvent(forwardPlan, 'feed', clamped, feedSkipWindowMins)) continue;

        forwardPlan.push({
          type: 'feed',
          time: clamped,
          patternBased: false,
          intervalBased: true,
          source: 'interval-based (last actual feed + interval)',
          adjusted: true
        });
      }
    }

    // Sort forward plan before adding naps
    forwardPlan.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Add interval nap fills after feeds ONLY if there isn't already a sleep nearby,
    // and never if it would land too close to the feed or another event.
    const planWithNaps = [...forwardPlan];
    for (let i = 0; i < forwardPlan.length; i++) {
      const ev = forwardPlan[i];
      if (!ev || ev.type !== 'feed' || !ev.time) continue;

      const napTime = new Date(ev.time);
      const napTotalMinutes = napTime.getHours() * 60 + napTime.getMinutes() + (napHoursAfterFeed * 60);
      napTime.setHours(Math.floor(napTotalMinutes / 60), napTotalMinutes % 60, 0, 0);
      napTime.setSeconds(0);
      napTime.setMilliseconds(0);

      const clampedNap = clampToTodayEnd(napTime, todayEndObj);
      if (!clampedNap) continue;
      if (clampedNap.getTime() <= now.getTime()) continue;

      // Never suggest a nap too soon after the feed
      if (minutesBetween(ev.time, clampedNap) < minNapAfterFeedMins) continue;

      // If there's already a pattern-based sleep near this nap, skip the interval nap.
      const napMs = clampedNap.getTime();
      const nearPatternSleep =
        _hasNearbySleep(napMs, 60, adjustedSchedule) || _hasNearbySleep(napMs, 60, planWithNaps);
      if (nearPatternSleep) continue;

      // Skip if it would collide with any event (feed or sleep) within 25m
      if (hasNearbyAnyEvent(planWithNaps, clampedNap, 25)) continue;

      planWithNaps.push({
        type: 'sleep',
        time: clampedNap,
        patternBased: false,
        intervalBased: true,
        source: 'interval-based (1.5h after feed)',
        adjusted: true
      });
    }

    // Sort the final schedule candidate
    planWithNaps.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Use the re-solved plan as the final schedule candidate for dedupe logic below
    const finalSchedule = planWithNaps;

    // Re-solve forward (only affects predicted events; keeps actual events fixed)
    finalSchedule.sort((a, b) => a.time.getTime() - b.time.getTime());
    const resolved = [];
    for (let i = 0; i < finalSchedule.length; i++) {
      const ev = finalSchedule[i];
      if (!ev || !ev.time) continue;

      // Always keep the first
      if (resolved.length === 0) {
        resolved.push(ev);
        continue;
      }

      const prev = resolved[resolved.length - 1];
      const evMs = ev.time.getTime();
      const prevMs = prev.time.getTime();
      const diffMin = Math.abs(evMs - prevMs) / (1000 * 60);

      // If same type too close, keep the better one
      if (ev.type === prev.type) {
        const minSame = (ev.type === 'sleep') ? MIN_SAME_SLEEP_MIN : (ev.type === 'feed' ? MIN_SAME_FEED_MIN : 0);
        if (minSame > 0 && diffMin < minSame) {
          const pPrev = _eventPriority(prev);
          const pEv = _eventPriority(ev);
          if (pEv > pPrev) {
            resolved[resolved.length - 1] = ev;
          } else if (pEv === pPrev) {
            // tie-breaker: stronger pattern wins
            if (_eventStrength(ev) > _eventStrength(prev)) {
              resolved[resolved.length - 1] = ev;
            }
          }
          continue;
        }
      } else {
        // If different types too close, push the predicted one later (never move actual)
        if (diffMin < MIN_DIFF_TYPE_MIN) {
          if (!ev.actual) {
            const pushed = new Date(prev.time.getTime() + MIN_DIFF_TYPE_MIN * 60 * 1000);
            ev.time = pushed;
          } else if (!prev.actual) {
            // rare: actual comes after predicted but very close -> drop predicted instead
            resolved.pop();
          }
        }
      }

      resolved.push(ev);
    }

    // Use resolved schedule for downstream logic
    const deduplicatedFinal = resolved;

    // Re-sort after deduplication
    deduplicatedFinal.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Enforce a minimum transition gap between FEED and SLEEP so we don't get impossible back-to-back events.
    // Policy:
    // - Actual events never move.
    // - Between predicted events, FEED wins (SLEEP gets shifted).
    // - If a predicted event collides with an actual event, drop/shift the predicted one.
    const MIN_TRANSITION_GAP_MIN = Number.isFinite(Number(config.minTransitionGapMinutes))
      ? Number(config.minTransitionGapMinutes)
      : 30; // ~20m feed + ~10m settle
    const MIN_TRANSITION_GAP_MS = MIN_TRANSITION_GAP_MIN * 60 * 1000;

    const _normalizeTransitions = (events) => {
      if (!Array.isArray(events) || events.length <= 1) return events || [];
      // Work on a shallow copy so we don't mutate callers unexpectedly
      let out = events.slice();

      const isFeed = (e) => e && e.type === 'feed';
      const isSleep = (e) => e && e.type === 'sleep';

      // Loop until stable (max iterations to avoid infinite loops)
      for (let pass = 0; pass < 8; pass++) {
        out.sort((a, b) => a.time.getTime() - b.time.getTime());
        let changed = false;

        for (let i = 1; i < out.length; i++) {
          const prev = out[i - 1];
          const cur = out[i];
          if (!prev || !cur || !prev.time || !cur.time) continue;

          // Only care about FEED<->SLEEP adjacency
          if (!((isFeed(prev) && isSleep(cur)) || (isSleep(prev) && isFeed(cur)))) continue;

          const gapMs = cur.time.getTime() - prev.time.getTime();
          if (gapMs >= MIN_TRANSITION_GAP_MS) continue;

          // Decide which event to move (or drop): prefer keeping actual, then prefer keeping FEED
          let mover = null;
          let anchor = null;

          if (prev.actual && !cur.actual) {
            mover = cur;
            anchor = prev;
          } else if (!prev.actual && cur.actual) {
            mover = prev;
            anchor = cur;
          } else if (prev.actual && cur.actual) {
            // Can't reconcile two actuals; leave as-is
            continue;
          } else {
            // Both predicted: move SLEEP
            if (isSleep(prev) && isFeed(cur)) {
              mover = prev; // move sleep to after feed
              anchor = cur;
            } else {
              mover = cur; // feed then sleep: move sleep later
              anchor = prev;
            }
          }

          // If the mover is predicted, shift it later to after the anchor
          if (mover && !mover.actual) {
            const newTime = new Date(anchor.time.getTime() + MIN_TRANSITION_GAP_MS);
            // If we push past end-of-day, drop it
            if (newTime.getTime() > todayEnd.getTime()) {
              out.splice(out.indexOf(mover), 1);
            } else {
              mover.time = newTime;
              mover.adjusted = true;
              if (typeof mover.source === 'string' && !mover.source.includes('collision-shifted')) {
                mover.source = mover.source + ' • collision-shifted';
              } else if (!mover.source) {
                mover.source = 'collision-shifted';
              }
            }
            changed = true;
          }
        }

        if (!changed) break;
      }

      out.sort((a, b) => a.time.getTime() - b.time.getTime());
      return out;
    };

    const normalizedFinal = _normalizeTransitions(deduplicatedFinal);

    // V2 fix: ensure we always have remaining FEEDS.
    // If there are no future feed patterns, we generate interval-based future feeds
    // starting from the last actual feed today (or last feed in schedule).
    const ensureFutureFeeds = () => {
      const intervalHrs = Number(feedIntervalHours);
      if (!Number.isFinite(intervalHrs) || intervalHrs <= 0) return;

      const dayEnd = new Date(today);
      dayEnd.setHours(23, 59, 59, 999);

      // Find last feed time we can anchor from: prefer last actual feed today, else last feed in schedule <= now
      let anchor = lastActualFeedTime;
      if (!anchor) {
        for (let i = deduplicatedFinal.length - 1; i >= 0; i--) {
          const ev = deduplicatedFinal[i];
          if (ev?.type === 'feed' && ev?.time instanceof Date && ev.time.getTime() <= now.getTime()) {
            anchor = ev.time;
            break;
          }
        }
      }
      if (!anchor) return;

      const existingFutureFeeds = deduplicatedFinal
        .filter(ev => ev?.type === 'feed' && ev?.time instanceof Date && ev.time.getTime() > now.getTime())
        .map(ev => ev.time.getTime())
        .sort((a, b) => a - b);

      const tooCloseMs = 35 * 60 * 1000; // don't add if within ~35 min of an existing feed
      const intervalMs = intervalHrs * 60 * 60 * 1000;

      // Generate candidate feeds forward until end of day
      let t = new Date(anchor.getTime() + intervalMs);
      t.setSeconds(0);
      t.setMilliseconds(0);

      // If we're already way past the next interval, step forward until it's in the future
      while (t.getTime() <= now.getTime()) {
        t = new Date(t.getTime() + intervalMs);
        t.setSeconds(0);
        t.setMilliseconds(0);
      }

      while (t.getTime() < dayEnd.getTime()) {
        // Skip if close to an existing future feed
        const close = existingFutureFeeds.some(ft => Math.abs(ft - t.getTime()) <= tooCloseMs);
        if (!close) {
          deduplicatedFinal.push({
            type: 'feed',
            time: new Date(t),
            patternBased: false,
            intervalBased: true,
            source: 'interval-based (after last feed)'
          });
          existingFutureFeeds.push(t.getTime());
          existingFutureFeeds.sort((a, b) => a - b);
        }
        t = new Date(t.getTime() + intervalMs);
        t.setSeconds(0);
        t.setMilliseconds(0);
      }
    };

    ensureFutureFeeds();

    // Re-sort after injecting interval feeds
    deduplicatedFinal.sort((a, b) => a.time.getTime() - b.time.getTime());

    // If no events logged yet today, add interval-based predictions for remaining day
    if (allEvents.length === 0 && schedule.length > 0) {
      // Use the schedule as-is but add interval-based fills (filter wakes from schedule too)
      const filteredSchedule = schedule.filter(e => e.type !== 'wake');
      return normalizedFinal.length > 0 ? normalizedFinal : filteredSchedule;
    }

    return normalizedFinal;
  };

  window.TT.utils.scheduleUtils.matchScheduleToActualEvents = matchScheduleToActualEvents;
  window.TT.utils.scheduleUtils.percentile = percentile;
  window.TT.utils.scheduleUtils.buildFeedingSessions = buildFeedingSessions;
  window.TT.utils.scheduleUtils.analyzeHistoricalIntervals = analyzeHistoricalIntervals;
  window.TT.utils.scheduleUtils.buildDailySchedule = buildDailySchedule;
  window.TT.utils.scheduleUtils.adjustScheduleForActualEvents = adjustScheduleForActualEvents;
})();
