// TrackerDetailTab Component
// Detail view for tracker cards (v4)

const TrackerDetailTab = ({ user, kidId, familyId, setActiveTab, activeTab = null }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const HorizontalCalendar = window.TT?.shared?.HorizontalCalendar;
  const ChevronLeftIcon = window.TT?.shared?.icons?.ChevronLeftIcon || null;
  const [selectedSummary, setSelectedSummary] = React.useState({ feedOz: 0, sleepMs: 0, feedPct: 0, sleepPct: 0 });
  const [selectedSummaryKey, setSelectedSummaryKey] = React.useState('initial');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [loggedTimelineItems, setLoggedTimelineItems] = React.useState([]);
  const [allFeedings, setAllFeedings] = React.useState([]);
  const [allSleepSessions, setAllSleepSessions] = React.useState([]);
  const [scheduledTimelineItems, setScheduledTimelineItems] = React.useState(null);
  const [showInputSheet, setShowInputSheet] = React.useState(false);
  const [inputSheetMode, setInputSheetMode] = React.useState('feeding');
  const projectedScheduleRef = React.useRef(null);
  const latestActualEventsRef = React.useRef({ dateKey: null, feedings: [], sleeps: [], activeSleep: null });
  const [isLoadingTimeline, setIsLoadingTimeline] = React.useState(false);
  const calendarContainerRef = React.useRef(null);
  const weekToggleHostRef = React.useRef(null);
  const [calendarSideWidth, setCalendarSideWidth] = React.useState(null);
  const [timelineEditMode, setTimelineEditMode] = React.useState(false);
  const [showFeedDetailSheet, setShowFeedDetailSheet] = React.useState(false);
  const [showSleepDetailSheet, setShowSleepDetailSheet] = React.useState(false);
  const [selectedFeedEntry, setSelectedFeedEntry] = React.useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = React.useState(null);
  const [calendarMountKey, setCalendarMountKey] = React.useState(0);
  const prevActiveTabRef = React.useRef(activeTab);
  const __ttInitialFilter = (() => {
    if (typeof window === 'undefined') return null;
    const nextFilter = window.TT?.shared?.trackerDetailFilter || null;
    if (nextFilter && window.TT?.shared) {
      delete window.TT.shared.trackerDetailFilter;
    }
    return nextFilter;
  })();
  const [initialTimelineFilter, setInitialTimelineFilter] = React.useState(__ttInitialFilter);
  const [summaryLayoutMode, setSummaryLayoutMode] = React.useState(__ttInitialFilter || 'all');
  const [filterEpoch, setFilterEpoch] = React.useState(0);
  const [projectedTargets, setProjectedTargets] = React.useState({ feedTarget: 0, sleepTarget: 0 });
  const [summaryAnimationEpoch, setSummaryAnimationEpoch] = React.useState(0);
  const [summaryCardsEpoch, setSummaryCardsEpoch] = React.useState(0);
  const summaryAnimationMountRef = React.useRef(false);
  const summaryAnimationPrevRef = React.useRef(summaryLayoutMode);
  const [comparisonTick, setComparisonTick] = React.useState(0);
  const __ttMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion)
    ? window.Motion.motion
    : null;
  const __ttAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence)
    ? window.Motion.AnimatePresence
    : null;
  const shouldAnimateSummary = !summaryAnimationMountRef.current
    || summaryAnimationPrevRef.current === 'all'
    || summaryLayoutMode === 'all';
  const canAnimateSummary = Boolean(__ttMotion && __ttAnimatePresence && shouldAnimateSummary);

  // Helper: format timestamp to 12-hour time string (e.g., "4:23 AM")
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

  const scheduleStorageKey = 'tt_daily_projection_schedule_v1';
  const getScheduleDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildScheduledCard = (item, dateKey, index) => {
    const timeMs = Number(item?.timeMs);
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
      id: `sched-${dateKey}-${item.type}-${index}`,
      time: formatTime12Hour(timeMs),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'scheduled',
      type: item.type,
      amount: Number.isFinite(amount) ? amount : null,
      unit: isFeed ? 'oz' : 'hrs',
      timeMs
    };
  };


  const updateNextScheduledItem = (date, projectedItems, dayFeedings, daySleepSessions, activeSleepSession = null, filterMode = 'all') => {
    const dateKey = getScheduleDateKey(date);
    const todayKey = getScheduleDateKey(new Date());
    if (dateKey !== todayKey || !Array.isArray(projectedItems) || projectedItems.length === 0) {
      setScheduledTimelineItems([]);
      return;
    }

    const completionWindowMs = 45 * 60 * 1000;
    const nowMs = Date.now();
    const upcomingFloorMs = nowMs - completionWindowMs;

    const scheduledCards = projectedItems
      .map((item, idx) => buildScheduledCard(item, dateKey, idx))
      .filter(Boolean);
    const augmentedSleeps = [...(daySleepSessions || [])];
    if (activeSleepSession && activeSleepSession.startTime) {
      const activeExists = augmentedSleeps.some((s) => s && s.id === activeSleepSession.id);
      if (!activeExists) augmentedSleeps.push(activeSleepSession);
    }
    const scheduleMatcher = window.TT?.utils?.scheduleUtils?.matchScheduleToActualEvents;
    const matchedSchedule = typeof scheduleMatcher === 'function'
      ? scheduleMatcher(scheduledCards, dayFeedings, augmentedSleeps, completionWindowMs)
      : scheduledCards;
    const sortedProjected = matchedSchedule
      .filter((card) => {
        if (filterMode === 'feed') return card.type === 'feed';
        if (filterMode === 'sleep') return card.type === 'sleep';
        return true;
      })
      .map((card) => ({ card, isCompleted: !!card.isCompleted }))
      .sort((a, b) => a.card.timeMs - b.card.timeMs);

    const graceWindowMs = 2 * 60 * 60 * 1000;
    const nextItem = sortedProjected.find(({ card, isCompleted }) => {
      if (isCompleted) return false;
      if (card.timeMs >= upcomingFloorMs) return true;
      return nowMs - card.timeMs <= graceWindowMs;
    });

    if (nextItem) {
      setScheduledTimelineItems([nextItem.card]);
      return;
    }

    // Special case: if it's late, show the first scheduled item for the next day.
    const lateHourThreshold = 21; // 9pm
    if (nowMs >= new Date(new Date(nowMs).setHours(lateHourThreshold, 0, 0, 0)).getTime()) {
      const first = sortedProjected[0]?.card;
      if (first && Number.isFinite(first.timeMs)) {
        const nextDayTimeMs = first.timeMs + 24 * 60 * 60 * 1000;
        const nextDayCard = buildScheduledCard(
          { ...projectedItems[0], timeMs: nextDayTimeMs },
          dateKey,
          0
        );
        if (nextDayCard) {
          nextDayCard.id = `${nextDayCard.id}-nextday`;
          setScheduledTimelineItems([nextDayCard]);
          return;
        }
      }
    }

    setScheduledTimelineItems([]);
  };

  const loadProjectedSchedule = React.useCallback((date) => {
    const dateKey = getScheduleDateKey(date);
    const todayKey = getScheduleDateKey(new Date());
    if (dateKey !== todayKey) {
      projectedScheduleRef.current = null;
      setScheduledTimelineItems([]);
      setProjectedTargets({ feedTarget: 0, sleepTarget: 0 });
      return;
    }
    try {
      const raw = localStorage.getItem(scheduleStorageKey);
      if (!raw) {
        projectedScheduleRef.current = null;
        setScheduledTimelineItems([]);
        setProjectedTargets({ feedTarget: 0, sleepTarget: 0 });
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.dateKey !== dateKey || !Array.isArray(parsed.items)) {
        projectedScheduleRef.current = null;
        setScheduledTimelineItems([]);
        setProjectedTargets({ feedTarget: 0, sleepTarget: 0 });
        return;
      }
      projectedScheduleRef.current = parsed.items;
      const targets = parsed.items.reduce((acc, item) => {
        if (item?.type === 'feed') {
          const oz = Number(item?.targetOz);
          if (Number.isFinite(oz)) {
            acc.feedTarget += oz;
          } else if (Array.isArray(item?.targetOzRange)) {
            const [low, high] = item.targetOzRange;
            if (Number.isFinite(low) && Number.isFinite(high)) {
              acc.feedTarget += (low + high) / 2;
            }
          }
        }
        if (item?.type === 'sleep') {
          const hrs = Number(item?.avgDurationHours);
          if (Number.isFinite(hrs)) acc.sleepTarget += hrs;
        }
        return acc;
      }, { feedTarget: 0, sleepTarget: 0 });
      setProjectedTargets(targets);
      const latest = latestActualEventsRef.current;
      const feedings = latest && latest.dateKey === dateKey ? latest.feedings : [];
      const sleeps = latest && latest.dateKey === dateKey ? latest.sleeps : [];
      const activeSleep = latest && latest.dateKey === dateKey ? latest.activeSleep : null;
        updateNextScheduledItem(date, parsed.items, feedings, sleeps, activeSleep, summaryLayoutMode);
    } catch (error) {
      projectedScheduleRef.current = null;
      setScheduledTimelineItems([]);
      setProjectedTargets({ feedTarget: 0, sleepTarget: 0 });
    }
  }, []);

  const handleScheduledAdd = React.useCallback((card) => {
    const mode = card?.type === 'sleep' ? 'sleep' : 'feeding';
    setInputSheetMode(mode);
    setShowInputSheet(true);
  }, []);

  const handleActiveSleepClick = React.useCallback(() => {
    setInputSheetMode('sleep');
    setShowInputSheet(true);
  }, []);

  // Helper: normalize sleep interval to handle midnight crossing
  // Same logic as TrackerTab.js _normalizeSleepInterval
  const normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
    let sMs = Number(startMs);
    let eMs = Number(endMs);
    if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
    // If start time accidentally landed in the future (common around midnight), pull it back one day
    if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
    // If end < start, assume the sleep crossed midnight and the start belongs to the previous day
    if (eMs < sMs) sMs -= 86400000;
    if (eMs < sMs) return null; // still invalid
    return { startMs: sMs, endMs: eMs };
  };

  // Helper: calculate overlap between two time ranges in milliseconds
  // Same logic as TrackerTab.js _overlapMs
  const overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
    const a = Math.max(rangeStartMs, winStartMs);
    const b = Math.min(rangeEndMs, winEndMs);
    return Math.max(0, b - a);
  };

  // Helper: calculate sleep duration in hours (only for the portion within a day window)
  const calculateSleepDurationHours = (startTime, endTime, dayStartMs = null, dayEndMs = null) => {
    if (!startTime || !endTime) return 0;

    // If day boundaries provided, calculate overlap only
    if (dayStartMs !== null && dayEndMs !== null) {
      const norm = normalizeSleepInterval(startTime, endTime);
      if (!norm) return 0;
      const overlap = overlapMs(norm.startMs, norm.endMs, dayStartMs, dayEndMs);
      return Math.round((overlap / 3600000) * 10) / 10; // Round to 1 decimal
    }

    // Otherwise, calculate full duration
    const diffMs = endTime - startTime;
    if (diffMs <= 0) return 0;
    return Math.round((diffMs / 3600000) * 10) / 10; // Round to 1 decimal
  };

  // Transform Firebase feeding to Timeline card format
  const feedingToCard = (f) => {
    const d = new Date(f.timestamp);
    return {
      id: f.id,
      timestamp: f.timestamp,
      ounces: f.ounces ?? f.amountOz ?? f.amount ?? f.volumeOz ?? f.volume ?? 0,
      notes: f.notes || null,
      photoURLs: f.photoURLs || null,
      time: formatTime12Hour(f.timestamp),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'feed',
      amount: f.ounces || 0,
      unit: 'oz',
      note: f.notes || null
    };
  };

  // Transform Firebase sleep session to Timeline card format
  // Accepts optional day boundaries for cross-day handling
  const sleepToCard = (s, dayStartMs = null, dayEndMs = null) => {
    const isActive = Boolean(s.isActive || !s.endTime);
    const endCandidate = isActive ? Date.now() : s.endTime;
    const norm = normalizeSleepInterval(s.startTime, endCandidate);
    if (!norm) return null;

    // Check if this sleep crosses from yesterday into the selected day
    const crossesFromYesterday = dayStartMs !== null && norm.startMs < dayStartMs && norm.endMs > dayStartMs;

    // For cross-day sleeps on the current day, position at start of day (00:00)
    // For normal sleeps, use actual start time
    let displayHour, displayMinute, displayTime, endDisplayTime;

    if (crossesFromYesterday) {
      // Sleep started yesterday - on current day view, show as starting at midnight
      displayHour = 0;
      displayMinute = 0;
      // Format: "YD [start time] – [end time]"
      displayTime = `YD ${formatTime12Hour(s.startTime)}`;
      endDisplayTime = isActive ? null : formatTime12Hour(s.endTime);
    } else {
      const d = new Date(s.startTime);
      displayHour = d.getHours();
      displayMinute = d.getMinutes();
      displayTime = formatTime12Hour(s.startTime);
      endDisplayTime = isActive ? null : formatTime12Hour(s.endTime);
    }

    // Calculate duration - only the portion within the day if boundaries provided
    const durationHours = calculateSleepDurationHours(s.startTime, endCandidate, dayStartMs, dayEndMs);

    return {
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime || null,
      isActive,
      notes: s.notes || null,
      photoURLs: s.photoURLs || null,
      sleepType: s.sleepType || null,
      time: displayTime,
      endTimeDisplay: endDisplayTime,
      hour: displayHour,
      minute: displayMinute,
      variant: 'logged',
      type: 'sleep',
      amount: durationHours,
      unit: 'hrs',
      note: s.notes || null,
      crossesFromYesterday: crossesFromYesterday,
      // Store original timestamps for reference
      originalStartTime: s.startTime,
      originalEndTime: s.endTime
    };
  };

  // Load timeline data for selected date
  const loadTimelineData = React.useCallback(async (date) => {
    if (!firestoreStorage || !firestoreStorage.currentFamilyId || !firestoreStorage.currentKidId) {
      return;
    }

    setIsLoadingTimeline(true);
    try {
      // Get start and end of the selected day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const dayStartMs = startOfDay.getTime();
      const dayEndMs = endOfDay.getTime() + 1; // +1 to make end inclusive (same as TrackerTab)

      // Fetch all feedings and sleep sessions
      const [allFeedings, allSleepSessions] = await Promise.all([
        firestoreStorage.getAllFeedings(),
        firestoreStorage.getAllSleepSessions()
      ]);
      setAllFeedings(allFeedings || []);
      setAllSleepSessions(allSleepSessions || []);

      // Filter feedings for the selected day
      const dayFeedings = (allFeedings || []).filter(f => {
        const ts = f.timestamp || 0;
        return ts >= dayStartMs && ts <= dayEndMs;
      });

      // Filter sleep sessions that overlap with the selected day using normalization
      // This properly handles cross-day sleep sessions
      const daySleepSessions = (allSleepSessions || []).filter(s => {
        if (!s.startTime) return false; // Skip invalid
        const endCandidate = s.endTime || (s.isActive ? Date.now() : null);
        const norm = normalizeSleepInterval(s.startTime, endCandidate);
        if (!norm) return false;
        // Check if normalized session overlaps with the day
        return overlapMs(norm.startMs, norm.endMs, dayStartMs, dayEndMs) > 0;
      });

      // Transform to Timeline card format
      const feedingCards = dayFeedings.map(feedingToCard);
      // Pass day boundaries to sleepToCard for cross-day handling
      const sleepCards = daySleepSessions
        .map(s => sleepToCard(s, dayStartMs, dayEndMs))
        .filter(Boolean); // Filter out any null results

      // Combine and sort by time (hour * 60 + minute)
      // Cross-day sleeps will naturally sort first (hour=0, minute=0)
      const allCards = [...feedingCards, ...sleepCards].sort((a, b) => {
        const aMinutes = a.hour * 60 + a.minute;
        const bMinutes = b.hour * 60 + b.minute;
        return aMinutes - bMinutes;
      });

      setLoggedTimelineItems(allCards);
      const activeSleepSession = (allSleepSessions || []).find(s => s && s.startTime && (s.isActive || !s.endTime)) || null;
      const dateKey = getScheduleDateKey(date);
      latestActualEventsRef.current = {
        dateKey,
        feedings: dayFeedings,
        sleeps: daySleepSessions,
        activeSleep: activeSleepSession
      };
      updateNextScheduledItem(date, projectedScheduleRef.current, dayFeedings, daySleepSessions, activeSleepSession, summaryLayoutMode);
    } catch (error) {
      console.error('[ScheduleTab] Error loading timeline data:', error);
      setLoggedTimelineItems([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  }, []);

  // Load timeline data when date changes
  React.useEffect(() => {
    loadTimelineData(selectedDate);
  }, [selectedDate, loadTimelineData]);

  React.useEffect(() => {
    loadProjectedSchedule(selectedDate);
  }, [selectedDate, loadProjectedSchedule]);

  React.useEffect(() => {
    const handleAdded = () => {
      loadTimelineData(selectedDate);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tt-input-sheet-added', handleAdded);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tt-input-sheet-added', handleAdded);
      }
    };
  }, [selectedDate, loadTimelineData]);

  React.useEffect(() => {
    const onProjectionUpdate = (event) => {
      const dateKey = event?.detail?.dateKey;
      const selectedKey = getScheduleDateKey(selectedDate);
      if (dateKey && dateKey === selectedKey) {
        loadProjectedSchedule(selectedDate);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tt:projection-schedule-updated', onProjectionUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tt:projection-schedule-updated', onProjectionUpdate);
      }
    };
  }, [selectedDate, loadProjectedSchedule]);

  const formatV2NumberSafe = (n) => {
    try {
      if (typeof formatV2Number === 'function') return formatV2Number(n);
    } catch (e) {}
    const x = Number(n);
    if (!Number.isFinite(x)) return '0';
    const rounded = Math.round(x);
    if (Math.abs(x - rounded) < 1e-9) return String(rounded);
    return x.toFixed(1);
  };

  const buildComparison = (delta, unit, stacked = false) => {
    const raw = Number(delta);
    const normalized = Number.isFinite(raw) ? raw : 0;
    const roundedDelta = Math.round(normalized * 10) / 10;
    const safeDelta = Math.abs(roundedDelta) < 1e-6 ? 0 : roundedDelta;
    const isZero = safeDelta === 0;
    const isPositive = safeDelta >= 0;
    return {
      isZero,
      isPositive,
      color: isZero ? 'var(--tt-text-tertiary)' : (isPositive ? '#00BE68' : '#FF6037'),
      stacked,
      text: `${isZero ? '' : (isPositive ? '+' : '-')}${formatV2NumberSafe(Math.abs(safeDelta))} ${unit}`
    };
  };

  const bottleIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["bottle-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Bottle2) ||
    null;
  const moonIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["moon-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Moon2) ||
    null;

  const renderSummaryCard = ({ icon, color, value, unit, rotateIcon, progressPercent = 0, progressKey = 'default', comparison = null }) => {
    const Card = TTCard || 'div';
    const cardProps = TTCard
      ? { variant: "tracker", className: "min-h-[56px] p-[14px]" }
      : {
          className: "rounded-2xl shadow-sm min-h-[60px] p-5",
          style: { backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-card-border)" }
        };

    const clampedPercent = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    const progressWidth = clampedPercent > 0 ? Math.max(4, clampedPercent) : 0;

    const comparisonContent = comparison
      ? React.createElement('div', {
          className: `flex ${comparison.stacked ? 'flex-col' : 'flex-row'} items-center justify-center gap-2`
        },
          comparison.isZero
            ? React.createElement('span', {
                className: "text-[12px] font-normal leading-none",
                style: { color: 'var(--tt-text-tertiary)' }
              }, 'Same as yesterday')
            : React.createElement(
                React.Fragment,
                null,
                React.createElement('div', {
                  className: "flex items-center gap-1.5 text-[12px] font-semibold leading-none",
                  style: { color: comparison.color }
                },
                  React.createElement('svg', {
                    width: 10,
                    height: 8,
                    viewBox: "0 0 10 8",
                    fill: "currentColor",
                    'aria-hidden': true,
                    style: comparison.isPositive ? undefined : { transform: 'rotate(180deg)' }
                  },
                    React.createElement('path', { d: "M5 0L10 8H0L5 0Z" })
                  ),
                  React.createElement('span', null, comparison.text)
                ),
                React.createElement('span', {
                  className: "text-[12px] font-normal leading-none",
                  style: { color: 'var(--tt-text-tertiary)' }
                }, 'vs this time yesterday')
              )
        )
      : null;

    const animatedComparison = comparisonContent && __ttMotion && __ttAnimatePresence
      ? React.createElement(__ttAnimatePresence, { mode: "wait" },
          React.createElement(__ttMotion.div, {
            key: `comparison-${selectedSummaryKey}`,
            initial: { opacity: 0, y: -10, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 10, scale: 0.95 },
            transition: { type: "spring", stiffness: 400, damping: 30 }
          }, comparisonContent)
        )
      : comparisonContent;

    return React.createElement(
      Card,
      cardProps,
      React.createElement('div', { className: "flex flex-col gap-2" },
        React.createElement('div', { className: "flex items-center justify-center" },
          __ttMotion && __ttAnimatePresence
            ? React.createElement(__ttAnimatePresence, { mode: "wait" },
                React.createElement(__ttMotion.div, {
                  key: selectedSummaryKey,
                  className: "flex items-baseline gap-2 min-w-0",
                  initial: { opacity: 0, y: -10, scale: 0.95 },
                  animate: { opacity: 1, y: 0, scale: 1 },
                  exit: { opacity: 0, y: 10, scale: 0.95 },
                  transition: { type: "spring", stiffness: 400, damping: 30 }
                },
                  icon
                    ? React.createElement(icon, {
                        style: {
                          color,
                          width: '1.5rem',
                          height: '1.5rem',
                          strokeWidth: rotateIcon ? '1.5' : undefined,
                          fill: rotateIcon ? 'none' : undefined,
                          transform: rotateIcon ? 'translateY(3px) rotate(20deg)' : 'translateY(3px)'
                        }
                      })
                    : React.createElement('div', {
                        style: {
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '1rem',
                          backgroundColor: 'var(--tt-input-bg)',
                          transform: 'translateY(3px)'
                        }
                      }),
                  React.createElement('div', {
                    className: "text-[25px] font-bold leading-none whitespace-nowrap",
                    style: { color }
                  }, value),
                  React.createElement('div', {
                    className: "text-[17.5px] font-normal leading-none whitespace-nowrap",
                    style: { color: 'var(--tt-text-tertiary)' }
                  }, unit)
                )
              )
            : React.createElement('div', { 
                key: selectedSummaryKey,
                className: "flex items-baseline gap-2 min-w-0"
              },
                icon
                  ? React.createElement(icon, {
                      style: {
                        color,
                        width: '1.5rem',
                        height: '1.5rem',
                        strokeWidth: rotateIcon ? '1.5' : undefined,
                        fill: rotateIcon ? 'none' : undefined,
                        transform: rotateIcon ? 'translateY(3px) rotate(20deg)' : 'translateY(3px)'
                      }
                    })
                  : React.createElement('div', {
                      style: {
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '1rem',
                        backgroundColor: 'var(--tt-input-bg)',
                        transform: 'translateY(3px)'
                      }
                    }),
                React.createElement('div', {
                  className: "text-[24px] font-bold leading-none whitespace-nowrap",
                  style: { color }
                }, value),
                React.createElement('div', {
                  className: "text-[17.6px] font-normal leading-none whitespace-nowrap",
                  style: { color: 'var(--tt-text-secondary)' }
                }, unit)
              )
        ),
        React.createElement('div', {
          className: "w-full rounded-full overflow-hidden",
          style: {
            height: '6px',
            backgroundColor: 'var(--tt-input-bg)'
          }
        },
          __ttMotion
            ? React.createElement(__ttMotion.div, {
                key: `progress-${progressKey}`,
                className: "h-full rounded-full",
                initial: { width: 0 },
                animate: { width: `${progressWidth}%` },
                transition: { type: "spring", stiffness: 220, damping: 24 },
                style: { backgroundColor: color }
              })
            : React.createElement('div', {
                className: "h-full rounded-full transition-all duration-500",
                style: {
                  width: `${progressWidth}%`,
                  backgroundColor: color
                }
              })
        ),
        animatedComparison
      )
    );
  };

  const feedDisplay = formatV2NumberSafe(selectedSummary.feedOz);
  const sleepHours = Number(selectedSummary.sleepMs || 0) / 3600000;
  const sleepDisplay = formatV2NumberSafe(sleepHours);
  const feedPercent = Number.isFinite(Number(selectedSummary.feedPct)) && Number(selectedSummary.feedPct) > 0
    ? Number(selectedSummary.feedPct)
    : (projectedTargets.feedTarget > 0
        ? Math.min(100, (Number(selectedSummary.feedOz) / projectedTargets.feedTarget) * 100)
        : 0);
  const sleepPercent = Number.isFinite(Number(selectedSummary.sleepPct)) && Number(selectedSummary.sleepPct) > 0
    ? Number(selectedSummary.sleepPct)
    : (projectedTargets.sleepTarget > 0
        ? Math.min(100, (sleepHours / projectedTargets.sleepTarget) * 100)
        : 0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setComparisonTick((tick) => tick + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getYesterdayCutoffInfo = (nowDate) => {
    const currentHour = nowDate.getHours();
    const currentMinute = nowDate.getMinutes();
    const roundedMinutes = Math.round(currentMinute / 30) * 30;
    let roundedHour = roundedMinutes === 60 ? currentHour + 1 : currentHour;
    let finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    if (roundedHour >= 24) {
      roundedHour = 23;
      finalMinutes = 30;
    }

    const yesterday = new Date(nowDate);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStart = yesterday.getTime();

    const feedCutoffDate = new Date(yesterday);
    feedCutoffDate.setHours(roundedHour, finalMinutes, 59, 999);
    const sleepCutoffDate = new Date(yesterday);
    sleepCutoffDate.setHours(roundedHour, finalMinutes, 0, 0);

    return {
      yesterdayStart,
      feedCutoffMs: feedCutoffDate.getTime(),
      sleepCutoffMs: sleepCutoffDate.getTime() + 1
    };
  };

  const isViewingToday = React.useMemo(() => {
    const today = new Date();
    const viewing = new Date(selectedDate);
    return (
      today.getFullYear() === viewing.getFullYear()
      && today.getMonth() === viewing.getMonth()
      && today.getDate() === viewing.getDate()
    );
  }, [selectedDate]);

  const comparisonNow = React.useMemo(() => {
    const now = new Date();
    const base = new Date(selectedDate);
    base.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return base;
  }, [comparisonTick, selectedDate]);

  const yesterdayFeedTotal = React.useMemo(() => {
    if (!Array.isArray(allFeedings)) return 0;
    const { yesterdayStart, feedCutoffMs } = getYesterdayCutoffInfo(comparisonNow);
    const total = allFeedings
      .filter((f) => {
        const timestamp = f.timestamp || 0;
        return timestamp >= yesterdayStart && timestamp <= feedCutoffMs;
      })
      .reduce((sum, f) => sum + (f.ounces || 0), 0);
    return total;
  }, [allFeedings, comparisonNow]);

  const yesterdaySleepTotal = React.useMemo(() => {
    if (!Array.isArray(allSleepSessions)) return 0;
    const { yesterdayStart, sleepCutoffMs } = getYesterdayCutoffInfo(comparisonNow);
    const dayStartMs = yesterdayStart;
    const dayEndMs = sleepCutoffMs;

    const normSessions = allSleepSessions.map((s) => {
      if (!s || !s.endTime) return null;
      const norm = normalizeSleepInterval(s.startTime, s.endTime);
      return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
    }).filter(Boolean);

    const yesterdaySessions = normSessions.filter((s) => (
      overlapMs(s._normStartTime || s.startTime, s._normEndTime || s.endTime, dayStartMs, dayEndMs) > 0
    ));

    const totalMs = yesterdaySessions.reduce((sum, s) => (
      sum + overlapMs(s._normStartTime, s._normEndTime, dayStartMs, dayEndMs)
    ), 0);

    return totalMs / 3600000;
  }, [allSleepSessions, comparisonNow]);

  const feedComparison = isViewingToday
    ? buildComparison(
        Number(selectedSummary.feedOz || 0) - Number(yesterdayFeedTotal || 0),
        'oz',
        summaryLayoutMode === 'all'
      )
    : null;
  const sleepComparison = isViewingToday
    ? buildComparison(
        sleepHours - Number(yesterdaySleepTotal || 0),
        'hrs',
        summaryLayoutMode === 'all'
      )
    : null;

  const Timeline = window.TT?.shared?.Timeline || null;
  const formatMonthYear = (date) => {
    try {
      const fmt = window.dateFns?.format;
      if (typeof fmt === 'function') return fmt(date, 'MMMM yyyy');
    } catch (e) {}
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };
  const handleTimelineEditCard = React.useCallback((card) => {
    if (!card || card.variant !== 'logged') return;
    if (card.type === 'feed') {
      setSelectedFeedEntry(card);
      setShowFeedDetailSheet(true);
      return;
    }
    if (card.type === 'sleep') {
      setSelectedSleepEntry(card);
      setShowSleepDetailSheet(true);
    }
  }, []);
  const handleTimelineDeleteCard = React.useCallback(async (card) => {
    if (!card || !card.id) return;
    try {
      if (card.type === 'feed') {
        await firestoreStorage.deleteFeeding(card.id);
      } else if (card.type === 'sleep') {
        await firestoreStorage.deleteSleepSession(card.id);
      }
      await loadTimelineData(selectedDate);
    } catch (error) {
      console.error('[TrackerDetailTab] Failed to delete timeline entry:', error);
      alert('Failed to delete. Please try again.');
    }
  }, [selectedDate, loadTimelineData]);

  React.useEffect(() => {
    if (!calendarContainerRef.current || !weekToggleHostRef.current) return;
    let raf = 0;
    const moveRightSlot = () => {
      const header = calendarContainerRef.current.querySelector('header');
      const rightSlot = header ? header.querySelector('div') : null;
      const host = weekToggleHostRef.current;
      if (host && host.firstChild && host.firstChild !== rightSlot) {
        while (host.firstChild) host.removeChild(host.firstChild);
      }
      if (rightSlot && rightSlot.parentElement !== host) {
        host.appendChild(rightSlot);
      }
      const width = rightSlot ? rightSlot.offsetWidth : 0;
      setCalendarSideWidth(width > 0 ? width : null);
    };
    raf = window.requestAnimationFrame(moveRightSlot);
    window.addEventListener('resize', moveRightSlot);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', moveRightSlot);
    };
  }, [HorizontalCalendar, calendarMountKey]);

  React.useEffect(() => {
    if (!activeTab) return;
    const prev = prevActiveTabRef.current;
    if (activeTab === 'tracker-detail' && prev !== 'tracker-detail') {
      setCalendarMountKey((k) => k + 1);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (__ttInitialFilter) return;
    const nextFilter = window.TT?.shared?.trackerDetailFilter;
    if (nextFilter) {
      setInitialTimelineFilter(nextFilter);
      setSummaryLayoutMode(nextFilter);
      setFilterEpoch((prev) => prev + 1);
      delete window.TT.shared.trackerDetailFilter;
    }
  }, [__ttInitialFilter]);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFilterEvent = (event) => {
      const nextFilter = event?.detail?.filter;
      if (!nextFilter) return;
      setInitialTimelineFilter(nextFilter);
      setSummaryLayoutMode(nextFilter);
      setFilterEpoch((prev) => prev + 1);
      if (window.TT?.shared?.trackerDetailFilter === nextFilter) {
        delete window.TT.shared.trackerDetailFilter;
      }
    };
    window.addEventListener('tt:tracker-detail-filter', handleFilterEvent);
    return () => window.removeEventListener('tt:tracker-detail-filter', handleFilterEvent);
  }, []);

  const handleTimelineFilterChange = React.useCallback((nextFilter) => {
    if (!nextFilter) return;
    setSummaryLayoutMode(nextFilter);
  }, []);

  React.useEffect(() => {
    const dateKey = getScheduleDateKey(selectedDate);
    const todayKey = getScheduleDateKey(new Date());
    if (dateKey !== todayKey) {
      setScheduledTimelineItems([]);
      return;
    }
    const latest = latestActualEventsRef.current;
    const feedings = latest && latest.dateKey === dateKey ? latest.feedings : [];
    const sleeps = latest && latest.dateKey === dateKey ? latest.sleeps : [];
    const activeSleep = latest && latest.dateKey === dateKey ? latest.activeSleep : null;
    updateNextScheduledItem(
      selectedDate,
      projectedScheduleRef.current,
      feedings,
      sleeps,
      activeSleep,
      summaryLayoutMode
    );
  }, [summaryLayoutMode, selectedDate]);

  React.useEffect(() => {
    const isFirst = !summaryAnimationMountRef.current;
    const prevMode = summaryAnimationPrevRef.current;
    const shouldAnimateTransition = isFirst
      || prevMode === 'all'
      || summaryLayoutMode === 'all';
    if (shouldAnimateTransition && !isFirst) {
      setSummaryAnimationEpoch((prev) => prev + 1);
      setSummaryCardsEpoch((prev) => prev + 1);
    }
    if (isFirst) {
      setSummaryCardsEpoch((prev) => prev + 1);
    }
    summaryAnimationMountRef.current = true;
    summaryAnimationPrevRef.current = summaryLayoutMode;
  }, [summaryLayoutMode]);

  return React.createElement('div', {
    className: "space-y-4 pb-24"
  },
    React.createElement('style', {
      dangerouslySetInnerHTML: {
        __html: `
          .tt-tracker-detail-header {
            display: grid;
            grid-template-columns: var(--tt-tracker-detail-side, 72px) auto var(--tt-tracker-detail-side, 72px);
            align-items: center;
            padding-left: 12px;
            padding-right: 16px;
          }
          .tt-tracker-detail-header-title {
            justify-self: center;
            margin: 0;
            line-height: 1;
            font-size: 1rem;
            font-weight: 600;
            color: var(--tt-text-primary);
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif;
          }
          .tt-tracker-detail-back {
            justify-self: start;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--tt-text-secondary);
            font-size: 0.875rem;
            font-weight: 600;
          }
          .tt-tracker-detail-header-spacer {
            justify-self: end;
            width: 100%;
          }
          .tt-tracker-detail-calendar header h1 {
            visibility: hidden;
          }
          .tt-tracker-detail-calendar header {
            display: none;
          }
        `
      }
    }),
    React.createElement('div', { className: "space-y-1" },
      React.createElement('div', { 
        className: "tt-tracker-detail-header",
        style: calendarSideWidth ? { '--tt-tracker-detail-side': `${calendarSideWidth}px` } : undefined
      },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => {
              if (typeof setActiveTab === 'function') {
                setActiveTab('tracker');
              }
            },
            className: "tt-tracker-detail-back"
          },
          ChevronLeftIcon && React.createElement(ChevronLeftIcon, {
            className: "w-5 h-5",
            style: { color: 'var(--tt-text-secondary)' }
          }),
          "Back"
        ),
        React.createElement('div', { className: "tt-tracker-detail-header-title" }, formatMonthYear(selectedDate)),
        React.createElement('div', { className: "tt-tracker-detail-header-spacer", ref: weekToggleHostRef })
      ),
      React.createElement('div', { 
        className: "tt-tracker-detail-calendar", 
        ref: calendarContainerRef,
        style: calendarSideWidth ? { '--tt-tracker-detail-side': `${calendarSideWidth}px` } : undefined
      },
        HorizontalCalendar
          ? React.createElement(HorizontalCalendar, {
              key: `calendar-${calendarMountKey}`,
              onDateSelect: (payload) => {
                if (!payload) return;
                setSelectedSummary({
                  feedOz: payload.feedOz || 0,
                  sleepMs: payload.sleepMs || 0,
                  feedPct: payload.feedPct || 0,
                  sleepPct: payload.sleepPct || 0
                });
                if (payload.date) {
                  try {
                    const newDate = new Date(payload.date);
                    setSelectedSummaryKey(newDate.toDateString());
                    setSelectedDate(newDate);
                  } catch (e) {
                    setSelectedSummaryKey(String(Date.now()));
                  }
                } else {
                  setSelectedSummaryKey(String(Date.now()));
                }
              }
            })
          : null
      )
    ),
    (() => {
      const prevMode = summaryAnimationPrevRef.current;
      const isFirst = !summaryAnimationMountRef.current;
      const shouldAnimateCards = Boolean(__ttMotion && __ttAnimatePresence)
        && (isFirst || prevMode === 'all' || summaryLayoutMode === 'all');
      const container = shouldAnimateCards ? __ttMotion.div : 'div';
      const feedInitialX = -8;
      const sleepInitialX = isFirst ? -8 : 8;

      return React.createElement(
        container,
        {
          className: `grid gap-4 -mt-2 ${summaryLayoutMode === 'all' ? 'grid-cols-2' : 'grid-cols-1'}`,
          layout: shouldAnimateCards ? true : undefined,
          transition: shouldAnimateCards
            ? { type: "spring", stiffness: 180, damping: 24 }
            : undefined
        },
        shouldAnimateCards
          ? React.createElement(__ttAnimatePresence, { mode: "popLayout", initial: true },
              summaryLayoutMode !== 'sleep' && React.createElement(
                __ttMotion.div,
                {
                  key: `summary-feed-${summaryCardsEpoch}`,
                  layout: true,
                  initial: { opacity: 0, x: feedInitialX },
                  animate: { opacity: 1, x: 0 },
                  exit: { opacity: 0, x: feedInitialX },
                  transition: { type: "spring", stiffness: 220, damping: 26 }
                },
                renderSummaryCard({
                  icon: bottleIcon,
                  color: 'var(--tt-feed)',
                  value: feedDisplay,
                  unit: 'oz',
                  rotateIcon: true,
                  progressPercent: feedPercent,
                  progressKey: `feed-${summaryAnimationEpoch}-${selectedSummaryKey}`,
                  comparison: feedComparison
                })
              ),
              summaryLayoutMode !== 'feed' && React.createElement(
                __ttMotion.div,
                {
                  key: `summary-sleep-${summaryCardsEpoch}`,
                  layout: true,
                  initial: { opacity: 0, x: sleepInitialX },
                  animate: { opacity: 1, x: 0 },
                  exit: { opacity: 0, x: sleepInitialX },
                  transition: { type: "spring", stiffness: 220, damping: 26 }
                },
                renderSummaryCard({
                  icon: moonIcon,
                  color: 'var(--tt-sleep)',
                  value: sleepDisplay,
                  unit: 'hrs',
                  rotateIcon: false,
                  progressPercent: sleepPercent,
                  progressKey: `sleep-${summaryAnimationEpoch}-${selectedSummaryKey}`,
                  comparison: sleepComparison
                })
              )
            )
          : React.createElement(
              React.Fragment,
              null,
              summaryLayoutMode !== 'sleep' && renderSummaryCard({
                icon: bottleIcon,
                color: 'var(--tt-feed)',
                value: feedDisplay,
                unit: 'oz',
                rotateIcon: true,
                progressPercent: feedPercent,
                progressKey: `feed-${summaryAnimationEpoch}-${selectedSummaryKey}`,
                comparison: feedComparison
              }),
              summaryLayoutMode !== 'feed' && renderSummaryCard({
                icon: moonIcon,
                color: 'var(--tt-sleep)',
                value: sleepDisplay,
                unit: 'hrs',
                rotateIcon: false,
                progressPercent: sleepPercent,
                progressKey: `sleep-${summaryAnimationEpoch}-${selectedSummaryKey}`,
                comparison: sleepComparison
              })
            )
      );
    })(),
    Timeline ? React.createElement(Timeline, {
      key: `tracker-detail-timeline-${filterEpoch}`,
      initialLoggedItems: loggedTimelineItems,
      initialScheduledItems: Array.isArray(scheduledTimelineItems) ? scheduledTimelineItems : [],
      disableExpanded: true,
      allowItemExpand: true,
      initialFilter: initialTimelineFilter,
      onFilterChange: handleTimelineFilterChange,
      editMode: timelineEditMode,
      onEditModeChange: setTimelineEditMode,
      onEditCard: handleTimelineEditCard,
      onDeleteCard: handleTimelineDeleteCard,
      onScheduledAdd: handleScheduledAdd,
      onActiveSleepClick: handleActiveSleepClick
    }) : null,
    window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet, {
      isOpen: showInputSheet,
      onClose: () => setShowInputSheet(false),
      kidId,
      initialMode: inputSheetMode,
      __ttUseV4Sheet: true,
      onAdd: async () => {
        await loadTimelineData(selectedDate);
      }
    }),
    window.TTFeedDetailSheet && React.createElement(window.TTFeedDetailSheet, {
      isOpen: showFeedDetailSheet,
      onClose: () => {
        setShowFeedDetailSheet(false);
        setSelectedFeedEntry(null);
      },
      entry: selectedFeedEntry,
      __ttUseV4Sheet: true,
      onDelete: async () => {
        await loadTimelineData(selectedDate);
      },
      onSave: async () => {
        await loadTimelineData(selectedDate);
      }
    }),
    window.TTSleepDetailSheet && React.createElement(window.TTSleepDetailSheet, {
      isOpen: showSleepDetailSheet,
      onClose: () => {
        setShowSleepDetailSheet(false);
        setSelectedSleepEntry(null);
      },
      entry: selectedSleepEntry,
      __ttUseV4Sheet: true,
      onDelete: async () => {
        await loadTimelineData(selectedDate);
      },
      onSave: async () => {
        await loadTimelineData(selectedDate);
      }
    })
  );
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.tabs = window.TT.tabs || {};
  window.TT.tabs.TrackerDetailTab = TrackerDetailTab;
}
