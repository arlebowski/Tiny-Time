// TrackerDetailTab Component
// Detail view for tracker cards (v4)

const TrackerDetailTab = ({ user, kidId, familyId, setActiveTab }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const HorizontalCalendar = window.TT?.shared?.HorizontalCalendar;
  const ChevronLeftIcon = window.TT?.shared?.icons?.ChevronLeftIcon || null;
  const [selectedSummary, setSelectedSummary] = React.useState({ feedOz: 0, sleepMs: 0 });
  const [selectedSummaryKey, setSelectedSummaryKey] = React.useState('initial');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [loggedTimelineItems, setLoggedTimelineItems] = React.useState([]);
  const [scheduledTimelineItems, setScheduledTimelineItems] = React.useState(null);
  const projectedScheduleRef = React.useRef(null);
  const latestActualEventsRef = React.useRef({ dateKey: null, feedings: [], sleeps: [] });
  const [isLoadingTimeline, setIsLoadingTimeline] = React.useState(false);
  const calendarContainerRef = React.useRef(null);
  const weekToggleHostRef = React.useRef(null);
  const [calendarSideWidth, setCalendarSideWidth] = React.useState(null);
  const [timelineEditMode, setTimelineEditMode] = React.useState(false);
  const [showFeedDetailSheet, setShowFeedDetailSheet] = React.useState(false);
  const [showSleepDetailSheet, setShowSleepDetailSheet] = React.useState(false);
  const [selectedFeedEntry, setSelectedFeedEntry] = React.useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = React.useState(null);
  const [initialTimelineFilter, setInitialTimelineFilter] = React.useState('all');
  const __ttMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion)
    ? window.Motion.motion
    : null;
  const __ttAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence)
    ? window.Motion.AnimatePresence
    : null;

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

  const updateNextScheduledItem = (date, projectedItems, dayFeedings, daySleepSessions) => {
    const dateKey = getScheduleDateKey(date);
    const todayKey = getScheduleDateKey(new Date());
    if (dateKey !== todayKey || !Array.isArray(projectedItems) || projectedItems.length === 0) {
      setScheduledTimelineItems([]);
      return;
    }

    const actualEvents = [
      ...(dayFeedings || []).map((f) => ({ type: 'feed', timeMs: Number(f.timestamp) })),
      ...(daySleepSessions || []).map((s) => ({ type: 'sleep', timeMs: Number(s.startTime) }))
    ].filter((e) => Number.isFinite(e.timeMs));

    const completionWindowMs = 30 * 60 * 1000;
    const nowMs = Date.now();
    const upcomingFloorMs = nowMs - completionWindowMs;

    const sortedProjected = projectedItems
      .map((item, idx) => {
        const card = buildScheduledCard(item, dateKey, idx);
        if (!card) return null;
        const isCompleted = actualEvents.some((evt) => {
          if (evt.type !== card.type) return false;
          return Math.abs(evt.timeMs - card.timeMs) <= completionWindowMs;
        });
        return { card, isCompleted };
      })
      .filter(Boolean)
      .sort((a, b) => a.card.timeMs - b.card.timeMs);

    const nextItem = sortedProjected.find(({ card, isCompleted }) => {
      if (isCompleted) return false;
      return card.timeMs >= upcomingFloorMs;
    });

    setScheduledTimelineItems(nextItem ? [nextItem.card] : []);
  };

  const loadProjectedSchedule = React.useCallback((date) => {
    const dateKey = getScheduleDateKey(date);
    const todayKey = getScheduleDateKey(new Date());
    if (dateKey !== todayKey) {
      projectedScheduleRef.current = null;
      setScheduledTimelineItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(scheduleStorageKey);
      if (!raw) {
        projectedScheduleRef.current = null;
        setScheduledTimelineItems([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.dateKey !== dateKey || !Array.isArray(parsed.items)) {
        projectedScheduleRef.current = null;
        setScheduledTimelineItems([]);
        return;
      }
      projectedScheduleRef.current = parsed.items;
      const latest = latestActualEventsRef.current;
      const feedings = latest && latest.dateKey === dateKey ? latest.feedings : [];
      const sleeps = latest && latest.dateKey === dateKey ? latest.sleeps : [];
      updateNextScheduledItem(date, parsed.items, feedings, sleeps);
    } catch (error) {
      projectedScheduleRef.current = null;
      setScheduledTimelineItems([]);
    }
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
    const norm = normalizeSleepInterval(s.startTime, s.endTime);
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
      endDisplayTime = formatTime12Hour(s.endTime);
    } else {
      const d = new Date(s.startTime);
      displayHour = d.getHours();
      displayMinute = d.getMinutes();
      displayTime = formatTime12Hour(s.startTime);
      endDisplayTime = formatTime12Hour(s.endTime);
    }

    // Calculate duration - only the portion within the day if boundaries provided
    const durationHours = calculateSleepDurationHours(s.startTime, s.endTime, dayStartMs, dayEndMs);

    return {
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
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

      // Filter feedings for the selected day
      const dayFeedings = (allFeedings || []).filter(f => {
        const ts = f.timestamp || 0;
        return ts >= dayStartMs && ts <= dayEndMs;
      });

      // Filter sleep sessions that overlap with the selected day using normalization
      // This properly handles cross-day sleep sessions
      const daySleepSessions = (allSleepSessions || []).filter(s => {
        if (!s.startTime || !s.endTime) return false; // Skip active/incomplete
        const norm = normalizeSleepInterval(s.startTime, s.endTime);
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
      const dateKey = getScheduleDateKey(date);
      latestActualEventsRef.current = {
        dateKey,
        feedings: dayFeedings,
        sleeps: daySleepSessions
      };
      updateNextScheduledItem(date, projectedScheduleRef.current, dayFeedings, daySleepSessions);
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

  const renderSummaryCard = ({ icon, color, value, unit, rotateIcon }) => {
    const Card = TTCard || 'div';
    const cardProps = TTCard
      ? { variant: "tracker", className: "min-h-[56px] p-[14px]" }
      : {
          className: "rounded-2xl shadow-sm min-h-[60px] p-5",
          style: { backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-card-border)" }
        };

    return React.createElement(
      Card,
      cardProps,
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
                  className: "text-[24px] font-bold leading-none whitespace-nowrap",
                  style: { color }
                }, value),
                React.createElement('div', {
                  className: "text-[17.6px] font-normal leading-none whitespace-nowrap",
                  style: { color: 'var(--tt-text-secondary)' }
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
      )
    );
  };

  const feedDisplay = formatV2NumberSafe(selectedSummary.feedOz);
  const sleepHours = Number(selectedSummary.sleepMs || 0) / 3600000;
  const sleepDisplay = formatV2NumberSafe(sleepHours);

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
    const header = calendarContainerRef.current.querySelector('header');
    const rightSlot = header ? header.querySelector('div') : null;
    if (rightSlot && weekToggleHostRef.current && rightSlot.parentElement !== weekToggleHostRef.current) {
      weekToggleHostRef.current.appendChild(rightSlot);
    }
    const measure = () => {
      const width = rightSlot ? rightSlot.offsetWidth : 0;
      setCalendarSideWidth(width > 0 ? width : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [HorizontalCalendar]);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextFilter = window.TT?.shared?.trackerDetailFilter;
    if (nextFilter) {
      setInitialTimelineFilter(nextFilter);
      delete window.TT.shared.trackerDetailFilter;
    }
  }, []);

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
            onDateSelect: (payload) => {
              if (!payload) return;
              setSelectedSummary({
                feedOz: payload.feedOz || 0,
                sleepMs: payload.sleepMs || 0
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
    ),
    React.createElement('div', { className: "grid grid-cols-2 gap-4 -mt-2" },
      renderSummaryCard({
        icon: bottleIcon,
        color: 'var(--tt-feed)',
        value: feedDisplay,
        unit: 'oz',
        rotateIcon: true
      }),
      renderSummaryCard({
        icon: moonIcon,
        color: 'var(--tt-sleep)',
        value: sleepDisplay,
        unit: 'hrs',
        rotateIcon: false
      })
    ),
    Timeline ? React.createElement(Timeline, {
      key: selectedDate.toDateString(),
      initialLoggedItems: loggedTimelineItems,
      initialScheduledItems: Array.isArray(scheduledTimelineItems) ? scheduledTimelineItems : [],
      disableExpanded: true,
      allowItemExpand: true,
      initialFilter: initialTimelineFilter,
      editMode: timelineEditMode,
      onEditModeChange: setTimelineEditMode,
      onEditCard: handleTimelineEditCard,
      onDeleteCard: handleTimelineDeleteCard
    }) : null,
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
