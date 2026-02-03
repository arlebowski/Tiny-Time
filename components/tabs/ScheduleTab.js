// ScheduleTab Component
// Displays schedule and routine management for v4

const ScheduleTab = ({ user, kidId, familyId }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const HorizontalCalendar = window.TT?.shared?.HorizontalCalendar;
  const [selectedSummary, setSelectedSummary] = React.useState({ feedOz: 0, sleepMs: 0 });
  const [selectedSummaryKey, setSelectedSummaryKey] = React.useState('initial');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [loggedTimelineItems, setLoggedTimelineItems] = React.useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = React.useState(false);
  const [showInputSheet, setShowInputSheet] = React.useState(false);
  const [inputSheetMode, setInputSheetMode] = React.useState('sleep');
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
      time: formatTime12Hour(f.timestamp),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'feed',
      amount: f.ounces || 0,
      unit: 'oz',
      note: f.notes || null,
      notes: f.notes || null,
      photoURLs: f.photoURLs || null
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
    let displayHour, displayMinute, displayTime;

    if (crossesFromYesterday) {
      // Sleep started yesterday - on current day view, show as starting at midnight
      displayHour = 0;
      displayMinute = 0;
      // Format: "YD [start time] – [end time]"
      displayTime = `YD ${formatTime12Hour(s.startTime)}`;
    } else {
      const d = new Date(s.startTime);
      displayHour = d.getHours();
      displayMinute = d.getMinutes();
      displayTime = formatTime12Hour(s.startTime);
    }

    // Calculate duration - only the portion within the day if boundaries provided
    const durationHours = calculateSleepDurationHours(s.startTime, endCandidate, dayStartMs, dayEndMs);

    return {
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime || null,
      isActive,
      time: displayTime,
      hour: displayHour,
      minute: displayMinute,
      variant: 'logged',
      type: 'sleep',
      amount: durationHours,
      unit: 'hrs',
      note: s.notes || null,
      notes: s.notes || null,
      photoURLs: s.photoURLs || null,
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
        if (!s.startTime) return false;
        const endCandidate = s.endTime || (s.isActive ? Date.now() : null);
        if (!endCandidate) return false;
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
  const scheduleDateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const Timeline = window.TT?.shared?.ScheduleTimeline || window.TT?.shared?.Timeline || null;

  return React.createElement('div', {
    className: "space-y-4 pb-24 px-4"
  },
    React.createElement('div', {
      className: "mb-1 -mx-4 pl-3 pr-4",
      style: {
        color: 'var(--tt-text-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, \"SF Pro Display\", \"SF Pro Text\", system-ui, sans-serif'
      }
    },
      React.createElement('div', {
        className: "text-[15.4px] font-normal",
        style: { color: 'var(--tt-text-secondary)' }
      }, scheduleDateLabel),
      React.createElement('div', {
        className: "text-[24px] font-semibold",
        style: { color: 'var(--tt-text-primary)', marginBottom: '16px' }
      }, 'Plan your day')
    ),
    // HorizontalCalendar + summary cards hidden for ScheduleTab redesign.
    // HorizontalCalendar
    //   ? React.createElement(HorizontalCalendar, {
    //       onDateSelect: (payload) => {
    //         if (!payload) return;
    //         setSelectedSummary({
    //           feedOz: payload.feedOz || 0,
    //           sleepMs: payload.sleepMs || 0
    //         });
    //         if (payload.date) {
    //           try {
    //             const newDate = new Date(payload.date);
    //             setSelectedSummaryKey(newDate.toDateString());
    //             setSelectedDate(newDate);
    //           } catch (e) {
    //             setSelectedSummaryKey(String(Date.now()));
    //           }
    //         } else {
    //           setSelectedSummaryKey(String(Date.now()));
    //         }
    //       }
    //     })
    //   : null,
    // React.createElement('div', { className: "grid grid-cols-2 gap-4 -mt-2" },
    //   renderSummaryCard({
    //     icon: bottleIcon,
    //     color: 'var(--tt-feed)',
    //     value: feedDisplay,
    //     unit: 'oz',
    //     rotateIcon: true
    //   }),
    //   renderSummaryCard({
    //     icon: moonIcon,
    //     color: 'var(--tt-sleep)',
    //     value: sleepDisplay,
    //     unit: 'hrs',
    //     rotateIcon: false
    //   })
    // ),
    React.createElement('div', {
      className: "min-h-0 overflow-y-auto mt-4 -mx-4",
      style: { WebkitOverflowScrolling: 'touch' }
    },
      Timeline ? React.createElement(Timeline, {
        key: selectedDate.toDateString(),
        initialLoggedItems: loggedTimelineItems,
        useSchedBot: true,
        scheduleDate: selectedDate,
        initialSortOrder: 'asc',
        hideLoggedItems: true,
        onActiveSleepClick: handleActiveSleepClick
      }) : null
    ),
    window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet, {
      isOpen: showInputSheet,
      onClose: () => setShowInputSheet(false),
      kidId,
      initialMode: inputSheetMode,
      __ttUseV4Sheet: true,
      onAdd: async () => {
        await loadTimelineData(selectedDate);
      }
    })
  );
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.tabs = window.TT.tabs || {};
  window.TT.tabs.ScheduleTab = ScheduleTab;
}
