// TrackerDetailTab Component
// Detail view for tracker cards (v4)

const TrackerDetailTab = ({ user, kidId, familyId, setActiveTab, activeTab = null, activityVisibility = null }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const HorizontalCalendar = window.TT?.shared?.HorizontalCalendarCompact || window.TT?.shared?.HorizontalCalendar;
  const ChevronLeftIcon = window.TT?.shared?.icons?.ChevronLeftIcon || null;
  const [selectedSummary, setSelectedSummary] = React.useState({ feedOz: 0, nursingMs: 0, solidsCount: 0, sleepMs: 0, diaperCount: 0, diaperWetCount: 0, diaperPooCount: 0, feedPct: 0, sleepPct: 0 });
  const [selectedSummaryKey, setSelectedSummaryKey] = React.useState('initial');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [loggedTimelineItems, setLoggedTimelineItems] = React.useState([]);
  const [allFeedings, setAllFeedings] = React.useState([]);
  const [allNursingSessions, setAllNursingSessions] = React.useState([]);
  const [allSleepSessions, setAllSleepSessions] = React.useState([]);
  const [allDiaperChanges, setAllDiaperChanges] = React.useState([]);
  const [allSolidsSessions, setAllSolidsSessions] = React.useState([]);
  const [babyWeight, setBabyWeight] = React.useState(null);
  const [multiplier, setMultiplier] = React.useState(2.5);
  const [preferredVolumeUnit, setPreferredVolumeUnit] = React.useState(() => {
    try {
      const stored = localStorage.getItem('tt_volume_unit');
      if (stored === 'ml' || stored === 'oz') return stored;
    } catch (e) {}
    return 'oz';
  });
  const [sleepSettings, setSleepSettings] = React.useState(null);
  const [showInputSheet, setShowInputSheet] = React.useState(false);
  const [inputSheetMode, setInputSheetMode] = React.useState('feeding');
  const [isLoadingTimeline, setIsLoadingTimeline] = React.useState(false);
  const [showFeedDetailSheet, setShowFeedDetailSheet] = React.useState(false);
  const [showSleepDetailSheet, setShowSleepDetailSheet] = React.useState(false);
  const [showDiaperDetailSheet, setShowDiaperDetailSheet] = React.useState(false);
  const [selectedFeedEntry, setSelectedFeedEntry] = React.useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = React.useState(null);
  const [selectedDiaperEntry, setSelectedDiaperEntry] = React.useState(null);
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
  const [summaryAnimationEpoch, setSummaryAnimationEpoch] = React.useState(0);
  const [summaryCardsEpoch, setSummaryCardsEpoch] = React.useState(0);
  const summaryAnimationMountRef = React.useRef(false);
  const summaryAnimationPrevRef = React.useRef(summaryLayoutMode);
  const __ttMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion)
    ? window.Motion.motion
    : null;
  const __ttAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence)
    ? window.Motion.AnimatePresence
    : null;
  const trackerComparisons = window.TT?.utils?.trackerComparisons || null;

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
  const handleScheduledAdd = React.useCallback((card) => {
    const mode = card?.type === 'sleep' ? 'sleep' : (card?.type === 'diaper' ? 'diaper' : 'feeding');
    setInputSheetMode(mode);
    setShowInputSheet(true);
  }, []);

  const handleActiveSleepClick = React.useCallback(() => {
    setInputSheetMode('sleep');
    setShowInputSheet(true);
  }, []);

  const loadSettings = React.useCallback(async () => {
    try {
      if (typeof firestoreStorage === 'undefined') return;
      const settings = await firestoreStorage.getSettings();
      if (settings) {
        if (settings.babyWeight) setBabyWeight(settings.babyWeight);
        if (settings.multiplier) setMultiplier(settings.multiplier);
        if (settings.preferredVolumeUnit === 'ml' || settings.preferredVolumeUnit === 'oz') {
          setPreferredVolumeUnit(settings.preferredVolumeUnit);
          try {
            localStorage.setItem('tt_volume_unit', settings.preferredVolumeUnit);
          } catch (e) {}
        }
      }
      const ss = await firestoreStorage.getSleepSettings();
      setSleepSettings(ss || null);
    } catch (error) {
      console.error('[TrackerDetailTab] Error loading settings:', error);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  React.useEffect(() => {
    const handleUnitChanged = (event) => {
      const nextUnit = event?.detail?.unit;
      if (nextUnit === 'ml' || nextUnit === 'oz') {
        setPreferredVolumeUnit(nextUnit);
      }
    };
    window.addEventListener('tt:volume-unit-changed', handleUnitChanged);
    return () => window.removeEventListener('tt:volume-unit-changed', handleUnitChanged);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab === 'tracker-detail') {
      window.scrollTo(0, 0);
    }
  }, [activeTab]);

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
      feedType: 'bottle',
      amount: f.ounces || 0,
      unit: 'oz',
      note: f.notes || null
    };
  };

  const nursingToCard = (s) => {
    const ts = s.timestamp || s.startTime;
    const d = new Date(ts);
    return {
      id: s.id,
      timestamp: ts,
      startTime: s.startTime || ts,
      leftDurationSec: Number(s.leftDurationSec || 0),
      rightDurationSec: Number(s.rightDurationSec || 0),
      lastSide: s.lastSide || null,
      notes: s.notes || null,
      photoURLs: s.photoURLs || null,
      time: formatTime12Hour(ts),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'feed',
      feedType: 'nursing',
      amount: Number(s.leftDurationSec || 0) + Number(s.rightDurationSec || 0),
      unit: 'sec',
      note: s.notes || null
    };
  };

  const solidsToCard = (s) => {
    const d = new Date(s.timestamp);
    const foodsArray = Array.isArray(s.foods) ? s.foods : [];
    const foodNames = foodsArray.map(f => f.name).filter(Boolean);
    const displayLabel = foodNames.length <= 2 
      ? foodNames.join(', ')
      : `${foodNames[0]}, ${foodNames[1]} +${foodNames.length - 2}`;
    
    return {
      id: s.id,
      timestamp: s.timestamp,
      foods: foodsArray,
      notes: s.notes || null,
      photoURLs: s.photoURLs || null,
      time: formatTime12Hour(s.timestamp),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'feed',
      feedType: 'solids',
      label: displayLabel || 'Solids',
      amount: foodsArray.length,
      unit: 'foods',
      note: s.notes || null
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

  const diaperToCard = (c) => {
    const d = new Date(c.timestamp);
    const isWet = !!c.isWet;
    const isDry = !!c.isDry;
    const isPoo = !!c.isPoo;
    const diaperType = isDry ? 'Dry' : (isWet && isPoo ? 'Wet + Poop' : (isPoo ? 'Poop' : 'Wet'));
    return {
      id: c.id,
      timestamp: c.timestamp,
      isWet,
      isDry,
      isPoo,
      diaperType,
      notes: c.notes || null,
      photoURLs: c.photoURLs || null,
      time: formatTime12Hour(c.timestamp),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'diaper',
      amount: diaperType,
      unit: '',
      note: c.notes || null
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
      const [allFeedings, allNursingSessions, allSleepSessions, allDiaperChanges, allSolidsSessions] = await Promise.all([
        firestoreStorage.getAllFeedings(),
        firestoreStorage.getAllNursingSessions(),
        firestoreStorage.getAllSleepSessions(),
        firestoreStorage.getAllDiaperChanges(),
        firestoreStorage.getAllSolidsSessions()
      ]);
      setAllFeedings(allFeedings || []);
      setAllNursingSessions(allNursingSessions || []);
      setAllSleepSessions(allSleepSessions || []);
      setAllDiaperChanges(allDiaperChanges || []);
      setAllSolidsSessions(allSolidsSessions || []);

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

      const dayNursingSessions = (allNursingSessions || []).filter(s => {
        const ts = s.timestamp || s.startTime || 0;
        return ts >= dayStartMs && ts <= dayEndMs;
      });

      const dayDiaperChanges = (allDiaperChanges || []).filter(c => {
        const ts = c.timestamp || 0;
        return ts >= dayStartMs && ts <= dayEndMs;
      });

      const daySolidsSessions = (allSolidsSessions || []).filter(s => {
        const ts = s.timestamp || 0;
        return ts >= dayStartMs && ts <= dayEndMs;
      });

      // Transform to Timeline card format
      const feedingCards = dayFeedings.map(feedingToCard);
      const nursingCards = dayNursingSessions.map(nursingToCard);
      const solidsCards = daySolidsSessions.map(solidsToCard);
      // Pass day boundaries to sleepToCard for cross-day handling
      const sleepCards = daySleepSessions
        .map(s => sleepToCard(s, dayStartMs, dayEndMs))
        .filter(Boolean); // Filter out any null results
      const diaperCards = dayDiaperChanges.map(diaperToCard);
      const activeSleepCard = sleepCards.find(card => card && card.isActive) || null;
      const visibleSleepCards = sleepCards.filter(card => !card.isActive);

      // Combine and sort by time (hour * 60 + minute)
      // Cross-day sleeps will naturally sort first (hour=0, minute=0)
      const allCards = [...feedingCards, ...nursingCards, ...solidsCards, ...visibleSleepCards, ...diaperCards].sort((a, b) => {
        const aMinutes = a.hour * 60 + a.minute;
        const bMinutes = b.hour * 60 + b.minute;
        return aMinutes - bMinutes;
      });

      if (activeSleepCard) {
        setLoggedTimelineItems([activeSleepCard, ...allCards]);
      } else {
        setLoggedTimelineItems(allCards);
      }
      const feedTotal = dayFeedings.reduce((sum, f) => {
        const amount = f.ounces ?? f.amountOz ?? f.amount ?? f.volumeOz ?? f.volume ?? 0;
        const n = Number(amount);
        return Number.isFinite(n) ? sum + n : sum;
      }, 0);
      const nursingTotalMs = dayNursingSessions.reduce((sum, s) => {
        const left = Number(s.leftDurationSec || 0);
        const right = Number(s.rightDurationSec || 0);
        return sum + Math.max(0, left + right) * 1000;
      }, 0);
      const solidsTotalFoods = daySolidsSessions.reduce((sum, s) => {
        return sum + (Array.isArray(s.foods) ? s.foods.length : 0);
      }, 0);
      const sleepTotalMs = daySleepSessions.reduce((sum, s) => {
        const endCandidate = s.endTime || (s.isActive ? Date.now() : null);
        if (!endCandidate) return sum;
        const norm = normalizeSleepInterval(s.startTime, endCandidate);
        if (!norm) return sum;
        return sum + overlapMs(norm.startMs, norm.endMs, dayStartMs, dayEndMs);
      }, 0);
      const diaperWetCount = dayDiaperChanges.filter((c) => !!c.isWet).length;
      const diaperPooCount = dayDiaperChanges.filter((c) => !!c.isPoo).length;
      setSelectedSummary({
        feedOz: Math.round(feedTotal * 10) / 10,
        nursingMs: nursingTotalMs,
        solidsCount: solidsTotalFoods,
        sleepMs: sleepTotalMs,
        diaperCount: dayDiaperChanges.length,
        diaperWetCount,
        diaperPooCount,
        feedPct: 0,
        sleepPct: 0
      });
    } catch (error) {
      console.error('[TrackerDetailTab] Error loading timeline data:', error);
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

  const buildAvgComparison = (comparison) => {
    if (!comparison || comparison.delta == null) return null;
    const safeDelta = Number(comparison.delta || 0);
    const epsilon = Number.isFinite(comparison.evenEpsilon) ? comparison.evenEpsilon : 0.05;
    const isZero = Math.abs(safeDelta) < epsilon;
    const isPositive = safeDelta >= 0;
    return {
      isZero,
      isPositive,
      color: isZero ? 'var(--tt-text-tertiary)' : (isPositive ? 'var(--tt-positive)' : 'var(--tt-negative)'),
      bg: isZero ? 'var(--tt-subtle-surface)' : (isPositive ? 'var(--tt-positive-soft)' : 'var(--tt-negative-soft)'),
      text: isZero ? 'Even' : `${formatV2NumberSafe(Math.abs(safeDelta))}${comparison.unit ? ` ${comparison.unit}` : ''}`
    };
  };

  const UpArrowIcon = (props) => React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 256 256",
      fill: "currentColor"
    },
    React.createElement('path', { d: "M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z" })
  );

  const DownArrowIcon = (props) => React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 256 256",
      fill: "currentColor"
    },
    React.createElement('path', { d: "M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z" })
  );

  const bottleIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) ||
    null;
  const nursingIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.NursingIcon) ||
    null;
  const solidsIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.SolidsIcon) ||
    null;
  const moonIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) ||
    null;
  const diaperIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.DiaperIcon) ||
    null;
  const diaperWetIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.DiaperWetIcon) ||
    null;
  const diaperPoopIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.DiaperPooIcon) ||
    null;

  const renderSummaryCard = ({ icon, color, value, unit, rotateIcon, progressPercent = 0, progressKey = 'default', comparison = null, subline = null, compactMode = false }) => {
    const Card = TTCard || 'div';
    const cardProps = TTCard
      ? {
          variant: "tracker",
          className: `min-h-[56px] h-full ${compactMode ? 'p-[10px]' : 'p-[14px]'}`,
          style: { backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-card-border)" }
        }
      : {
          className: "rounded-2xl shadow-sm min-h-[60px] p-5",
          style: { backgroundColor: "var(--tt-tracker-card-bg)", borderColor: "var(--tt-card-border)" }
        };

    const isAllSummary = compactMode;
    const iconSize = isAllSummary ? '22px' : '1.5rem';
    const valueClassAnimated = isAllSummary ? "text-[22px]" : "text-[25px]";
    const unitClassAnimated = isAllSummary ? "text-[15px]" : "text-[17.5px]";
    const valueClassStatic = isAllSummary ? "text-[22px]" : "text-[24px]";
    const unitClassStatic = isAllSummary ? "text-[15px]" : "text-[17.6px]";
    const comparisonContent = comparison
      ? React.createElement('div', {
          className: `flex ${isAllSummary ? 'flex-col' : 'flex-row'} items-center justify-center gap-2`
        },
          React.createElement(
            'div',
            {
              className: "inline-flex items-center gap-1.5 text-[12px] font-semibold tabular-nums",
              style: { color: comparison.color }
            },
            comparison.isZero ? null : React.createElement(
              comparison.isPositive ? UpArrowIcon : DownArrowIcon,
              { className: "w-3.5 h-3.5", style: { color: comparison.color } }
            ),
            React.createElement('span', null, comparison.text)
            ),
          (!isAllSummary) && React.createElement('span', {
            className: "text-[12px] font-normal leading-none",
            style: { color: 'var(--tt-text-tertiary)' }
          }, comparison.isZero ? 'on pace' : (comparison.isPositive ? 'ahead of pace' : 'behind pace'))
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
    const footerContent = animatedComparison || subline;

    return React.createElement(
      Card,
      cardProps,
      React.createElement('div', { className: "flex flex-col gap-2" },
        React.createElement('div', { className: "flex items-center justify-center" },
          __ttMotion && __ttAnimatePresence
            ? React.createElement(__ttAnimatePresence, { mode: "wait" },
                React.createElement(__ttMotion.div, {
                  key: selectedSummaryKey,
                  className: `flex items-baseline ${isAllSummary ? 'gap-1' : 'gap-2'} min-w-0`,
                  initial: { opacity: 0, y: -10, scale: 0.95 },
                  animate: { opacity: 1, y: 0, scale: 1 },
                  exit: { opacity: 0, y: 10, scale: 0.95 },
                  transition: { type: "spring", stiffness: 400, damping: 30 }
                },
                  icon
                    ? React.createElement(icon, {
                        style: {
                          color,
                          width: iconSize,
                          height: iconSize,
                          strokeWidth: rotateIcon ? '1.5' : undefined,
                          fill: rotateIcon ? 'none' : undefined,
                          transform: rotateIcon ? 'translateY(3px) rotate(20deg)' : 'translateY(3px)'
                        }
                      })
                    : React.createElement('div', {
                        style: {
                          width: iconSize,
                          height: iconSize,
                          borderRadius: '1rem',
                          backgroundColor: 'var(--tt-progress-track)',
                          transform: 'translateY(3px)'
                        }
                      }),
                  React.createElement('div', {
                    className: `${valueClassAnimated} font-bold leading-none whitespace-nowrap`,
                    style: { color }
                  }, value),
                  unit ? React.createElement('div', {
                    className: `${unitClassAnimated} font-normal leading-none whitespace-nowrap`,
                    style: { color: 'var(--tt-text-tertiary)' }
                  }, unit) : null
                )
              )
            : React.createElement('div', { 
                key: selectedSummaryKey,
                className: `flex items-baseline ${isAllSummary ? 'gap-1' : 'gap-2'} min-w-0`
              },
                icon
                  ? React.createElement(icon, {
                      style: {
                        color,
                        width: iconSize,
                        height: iconSize,
                        strokeWidth: rotateIcon ? '1.5' : undefined,
                        fill: rotateIcon ? 'none' : undefined,
                        transform: rotateIcon ? 'translateY(3px) rotate(20deg)' : 'translateY(3px)'
                      }
                    })
                  : React.createElement('div', {
                      style: {
                        width: iconSize,
                        height: iconSize,
                        borderRadius: '1rem',
                        backgroundColor: 'var(--tt-progress-track)',
                        transform: 'translateY(3px)'
                      }
                    }),
                React.createElement('div', {
                  className: `${valueClassStatic} font-bold leading-none whitespace-nowrap`,
                  style: { color }
                }, value),
                unit ? React.createElement('div', {
                  className: `${unitClassStatic} font-normal leading-none whitespace-nowrap`,
                  style: { color: 'var(--tt-text-secondary)' }
                }, unit) : null
              )
        ),
        footerContent
      )
    );
  };

  const feedDisplay = formatV2NumberSafe(selectedSummary.feedOz);
  const nursingHours = Number(selectedSummary.nursingMs || 0) / 3600000;
  const solidsCount = Number(selectedSummary.solidsCount || 0);
  const sleepHours = Number(selectedSummary.sleepMs || 0) / 3600000;
  const nursingDisplay = formatV2NumberSafe(nursingHours);
  const solidsDisplay = formatV2NumberSafe(solidsCount);
  const sleepDisplay = formatV2NumberSafe(sleepHours);
  const diaperDisplay = formatV2NumberSafe(Number(selectedSummary.diaperCount || 0));
  const diaperUnit = summaryLayoutMode === 'all' ? '' : 'changes';
  const diaperTally = (() => {
    const wet = Number(selectedSummary.diaperWetCount || 0);
    const poop = Number(selectedSummary.diaperPooCount || 0);
    const parts = [];
    if (wet > 0) {
      parts.push(React.createElement(
        'span',
        { key: 'wet', className: "inline-flex items-center gap-1" },
        diaperWetIcon ? React.createElement(diaperWetIcon, {
          className: "w-3.5 h-3.5",
          style: { color: 'var(--tt-diaper-strong)', fill: 'var(--tt-diaper-strong)' }
        }) : React.createElement('span', null, '💧'),
        React.createElement('span', null, `×${wet}`)
      ));
    }
    if (poop > 0) {
      parts.push(React.createElement(
        'span',
        { key: 'poop', className: "inline-flex items-center gap-1" },
        diaperPoopIcon ? React.createElement(diaperPoopIcon, {
          className: "w-3.5 h-3.5",
          style: { color: 'var(--tt-diaper)', fill: 'var(--tt-diaper)' }
        }) : React.createElement('span', null, '💩'),
        React.createElement('span', null, `×${poop}`)
      ));
    }
    return parts.length > 0 ? parts : null;
  })();
  const diaperSubline = diaperTally
    ? React.createElement(
        'div',
        { className: "flex items-center justify-center gap-2 text-[12px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } },
        ...diaperTally
      )
    : null;
  const feedTarget = babyWeight ? babyWeight * multiplier : 0;
  const sleepTargetHours = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number")
    ? sleepSettings.sleepTargetHours
    : 14;
  const feedPercentBase = feedTarget > 0
    ? Math.min(100, (Number(selectedSummary.feedOz) / feedTarget) * 100)
    : 0;
  const sleepPercentBase = sleepTargetHours > 0
    ? Math.min(100, (sleepHours / sleepTargetHours) * 100)
    : 0;
  const feedPercent = (feedPercentBase <= 0 && Number(selectedSummary.feedOz) <= 0) ? 2 : feedPercentBase;
  const sleepPercent = (sleepPercentBase <= 0 && sleepHours <= 0) ? 2 : sleepPercentBase;
  const diaperPercent = Number(selectedSummary.diaperCount || 0) > 0 ? 100 : 2;
  const _normalizeActivityVisibility = (value) => {
    const base = { bottle: true, nursing: true, sleep: true, diaper: true };
    if (!value || typeof value !== 'object') return base;
    return {
      bottle: typeof value.bottle === 'boolean' ? value.bottle : base.bottle,
      nursing: typeof value.nursing === 'boolean' ? value.nursing : base.nursing,
      sleep: typeof value.sleep === 'boolean' ? value.sleep : base.sleep,
      diaper: typeof value.diaper === 'boolean' ? value.diaper : base.diaper
    };
  };
  const activityVisibilitySafe = _normalizeActivityVisibility(activityVisibility);
  const hasNursingSummary = activityVisibilitySafe.nursing;
  const hasSolidsSummary = solidsCount > 0;

  const isViewingToday = React.useMemo(() => {
    const today = new Date();
    const viewing = new Date(selectedDate);
    return (
      today.getFullYear() === viewing.getFullYear()
      && today.getMonth() === viewing.getMonth()
      && today.getDate() === viewing.getDate()
    );
  }, [selectedDate]);

  const AVG_BUCKET_MINUTES = 15;
  const AVG_BUCKET_MS = AVG_BUCKET_MINUTES * 60000;
  const AVG_BUCKETS = 96;
  const AVG_DAYS = 7;

  const startOfDayMsLocal = (ts) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const bucketIndexCeilFromMs = (ts) => {
    const d = new Date(ts);
    const mins = d.getHours() * 60 + d.getMinutes();
    const clamped = Math.max(0, Math.min(1440, Math.ceil(mins / AVG_BUCKET_MINUTES) * AVG_BUCKET_MINUTES));
    return Math.min(AVG_BUCKETS - 1, Math.floor(clamped / AVG_BUCKET_MINUTES));
  };

  const buildFeedAvgBuckets = (all) => {
    if (!Array.isArray(all) || all.length === 0) return null;
    const todayStartMs = startOfDayMsLocal(Date.now());
    const dayMap = new Map();
    all.forEach((f) => {
      const ts = Number(f?.timestamp || 0);
      if (!Number.isFinite(ts) || ts >= todayStartMs) return;
      const dayStartMs = startOfDayMsLocal(ts);
      const list = dayMap.get(dayStartMs) || [];
      list.push(f);
      dayMap.set(dayStartMs, list);
    });
    const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const sumBuckets = Array(AVG_BUCKETS).fill(0);
    dayStarts.forEach((dayStartMs) => {
      const increments = Array(AVG_BUCKETS).fill(0);
      const dayFeedings = dayMap.get(dayStartMs) || [];
      dayFeedings.forEach((f) => {
        const ts = Number(f?.timestamp || 0);
        const oz = Number(f?.ounces || 0);
        if (!Number.isFinite(ts) || !Number.isFinite(oz) || oz <= 0) return;
        const idx = bucketIndexCeilFromMs(ts);
        increments[idx] += oz;
      });
      let running = 0;
      for (let i = 0; i < AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => v / dayStarts.length),
      daysUsed: dayStarts.length
    };
  };

  const buildNursingAvgBuckets = (all) => {
    if (!Array.isArray(all) || all.length === 0) return null;
    const todayStartMs = startOfDayMsLocal(Date.now());
    const dayMap = new Map();
    all.forEach((s) => {
      const ts = Number(s?.timestamp || s?.startTime || 0);
      if (!Number.isFinite(ts) || ts >= todayStartMs) return;
      const dayStartMs = startOfDayMsLocal(ts);
      const list = dayMap.get(dayStartMs) || [];
      list.push(s);
      dayMap.set(dayStartMs, list);
    });
    const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const sumBuckets = Array(AVG_BUCKETS).fill(0);
    dayStarts.forEach((dayStartMs) => {
      const increments = Array(AVG_BUCKETS).fill(0);
      const daySessions = dayMap.get(dayStartMs) || [];
      daySessions.forEach((s) => {
        const ts = Number(s?.timestamp || s?.startTime || 0);
        const left = Number(s?.leftDurationSec || 0);
        const right = Number(s?.rightDurationSec || 0);
        const totalSec = Math.max(0, left + right);
        if (!Number.isFinite(ts) || totalSec <= 0) return;
        const idx = bucketIndexCeilFromMs(ts);
        increments[idx] += totalSec / 3600;
      });
      let running = 0;
      for (let i = 0; i < AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => v / dayStarts.length),
      daysUsed: dayStarts.length
    };
  };

  const normalizeSleepIntervalForAvg = (startMs, endMs, nowMs = Date.now()) => {
    let sMs = Number(startMs);
    let eMs = Number(endMs);
    if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
    if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
    if (eMs < sMs) sMs -= 86400000;
    if (eMs < sMs) return null;
    return { startMs: sMs, endMs: eMs };
  };

  const addSleepOverlapToBuckets = (startMs, endMs, dayStartMs, increments) => {
    const dayEndMs = dayStartMs + 86400000;
    const overlapStart = Math.max(startMs, dayStartMs);
    const overlapEnd = Math.min(endMs, dayEndMs);
    if (overlapEnd <= overlapStart) return;
    const startBucket = Math.max(0, Math.floor((overlapStart - dayStartMs) / AVG_BUCKET_MS));
    const endBucket = Math.min(AVG_BUCKETS - 1, Math.floor((overlapEnd - dayStartMs - 1) / AVG_BUCKET_MS));
    for (let i = startBucket; i <= endBucket; i += 1) {
      const bucketStart = dayStartMs + i * AVG_BUCKET_MS;
      const bucketEnd = bucketStart + AVG_BUCKET_MS;
      const overlap = Math.max(0, Math.min(overlapEnd, bucketEnd) - Math.max(overlapStart, bucketStart));
      if (overlap > 0) increments[i] += overlap;
    }
  };

  const buildSleepAvgBuckets = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;
    const todayStartMs = startOfDayMsLocal(Date.now());
    const normalized = sessions.map((s) => {
      if (!s?.startTime || !s?.endTime) return null;
      const norm = normalizeSleepIntervalForAvg(s.startTime, s.endTime);
      return norm ? { startMs: norm.startMs, endMs: norm.endMs } : null;
    }).filter(Boolean);
    if (normalized.length === 0) return null;
    const daySet = new Set();
    normalized.forEach((s) => {
      let dayStart = startOfDayMsLocal(s.startMs);
      const endDayStart = startOfDayMsLocal(s.endMs);
      for (let ds = dayStart; ds <= endDayStart; ds += 86400000) {
        if (ds < todayStartMs) daySet.add(ds);
      }
    });
    const dayStarts = Array.from(daySet).sort((a, b) => b - a).slice(0, AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const dayIndex = new Map(dayStarts.map((d, i) => [d, i]));
    const perDayIncrements = dayStarts.map(() => Array(AVG_BUCKETS).fill(0));
    normalized.forEach((s) => {
      let dayStart = startOfDayMsLocal(s.startMs);
      const endDayStart = startOfDayMsLocal(s.endMs);
      for (let ds = dayStart; ds <= endDayStart; ds += 86400000) {
        const idx = dayIndex.get(ds);
        if (idx == null) continue;
        addSleepOverlapToBuckets(s.startMs, s.endMs, ds, perDayIncrements[idx]);
      }
    });
    const sumBuckets = Array(AVG_BUCKETS).fill(0);
    perDayIncrements.forEach((increments) => {
      let running = 0;
      for (let i = 0; i < AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => (v / dayStarts.length) / 3600000),
      daysUsed: dayStarts.length
    };
  };

  const buildDiaperAvgBuckets = (all) => {
    if (!Array.isArray(all) || all.length === 0) return null;
    const todayStartMs = startOfDayMsLocal(Date.now());
    const dayMap = new Map();
    all.forEach((c) => {
      const ts = Number(c?.timestamp || 0);
      if (!Number.isFinite(ts) || ts >= todayStartMs) return;
      const dayStartMs = startOfDayMsLocal(ts);
      const list = dayMap.get(dayStartMs) || [];
      list.push(c);
      dayMap.set(dayStartMs, list);
    });
    const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const sumBuckets = Array(AVG_BUCKETS).fill(0);
    dayStarts.forEach((dayStartMs) => {
      const increments = Array(AVG_BUCKETS).fill(0);
      const dayChanges = dayMap.get(dayStartMs) || [];
      dayChanges.forEach((c) => {
        const ts = Number(c?.timestamp || 0);
        if (!Number.isFinite(ts)) return;
        const idx = bucketIndexCeilFromMs(ts);
        increments[idx] += 1;
      });
      let running = 0;
      for (let i = 0; i < AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => v / dayStarts.length),
      daysUsed: dayStarts.length
    };
  };

  const nowMs = Date.now();
  const startOfDay = trackerComparisons?.startOfDayMsLocal || startOfDayMsLocal;
  const bucketAtNow = trackerComparisons?.bucketIndexCeilFromMs || bucketIndexCeilFromMs;
  const buildFeedAvg = trackerComparisons?.buildFeedAvgBuckets || buildFeedAvgBuckets;
  const buildNursingAvg = trackerComparisons?.buildNursingAvgBuckets || buildNursingAvgBuckets;
  const buildSolidsAvg = trackerComparisons?.buildSolidsAvgBuckets || buildSolidsAvgBuckets;
  const buildSleepAvg = trackerComparisons?.buildSleepAvgBuckets || buildSleepAvgBuckets;
  const calcFeedAtBucket = trackerComparisons?.calcFeedCumulativeAtBucket;
  const calcNursingAtBucket = trackerComparisons?.calcNursingCumulativeAtBucket;
  const calcSolidsAtBucket = trackerComparisons?.calcSolidsCumulativeAtBucket;
  const calcSleepAtBucket = trackerComparisons?.calcSleepCumulativeAtBucket;
  const nowBucketIndex = bucketAtNow(nowMs);
  const avgTodayStartMs = startOfDay(nowMs);
  const avgTodayEndMs = avgTodayStartMs + 86400000;
  const feedAvg = buildFeedAvg(allFeedings, avgTodayStartMs);
  const nursingAvg = buildNursingAvg(allNursingSessions, avgTodayStartMs);
  const solidsAvg = buildSolidsAvg(allSolidsSessions, avgTodayStartMs);
  const sleepAvg = buildSleepAvg(allSleepSessions, avgTodayStartMs);
  const diaperAvg = buildDiaperAvgBuckets(allDiaperChanges);

  const feedAvgValue = feedAvg?.buckets?.[nowBucketIndex];
  const nursingAvgValue = nursingAvg?.buckets?.[nowBucketIndex];
  const solidsAvgValue = solidsAvg?.buckets?.[nowBucketIndex];
  const sleepAvgValue = sleepAvg?.buckets?.[nowBucketIndex];
  const diaperAvgValue = diaperAvg?.buckets?.[nowBucketIndex];
  const todayFeedValue = calcFeedAtBucket
    ? calcFeedAtBucket(allFeedings, nowBucketIndex, avgTodayStartMs, avgTodayEndMs)
    : Number(selectedSummary.feedOz || 0);
  const todayNursingValue = calcNursingAtBucket
    ? calcNursingAtBucket(allNursingSessions, nowBucketIndex, avgTodayStartMs, avgTodayEndMs)
    : (Number(selectedSummary.nursingMs || 0) / 3600000);
  const todaySolidsValue = calcSolidsAtBucket
    ? calcSolidsAtBucket(allSolidsSessions, nowBucketIndex, avgTodayStartMs, avgTodayEndMs)
    : solidsCount;
  const todaySleepValue = calcSleepAtBucket
    ? calcSleepAtBucket(allSleepSessions, nowBucketIndex, avgTodayStartMs, null, nowMs)
    : sleepHours;

  const feedComparison = isViewingToday && Number.isFinite(feedAvgValue) && (feedAvg?.daysUsed || 0) > 0
    ? buildAvgComparison({ delta: todayFeedValue - feedAvgValue, unit: 'oz', evenEpsilon: 0.05 })
    : null;
  const nursingComparison = isViewingToday && Number.isFinite(nursingAvgValue) && (nursingAvg?.daysUsed || 0) > 0
    ? buildAvgComparison({ delta: todayNursingValue - nursingAvgValue, unit: 'hrs', evenEpsilon: 0.05 })
    : null;
  const solidsComparison = isViewingToday && Number.isFinite(solidsAvgValue) && (solidsAvg?.daysUsed || 0) > 0
    ? buildAvgComparison({ delta: todaySolidsValue - solidsAvgValue, unit: 'foods', evenEpsilon: 0.05 })
    : null;
  const sleepComparison = isViewingToday && Number.isFinite(sleepAvgValue) && (sleepAvg?.daysUsed || 0) > 0
    ? buildAvgComparison({ delta: todaySleepValue - sleepAvgValue, unit: 'hrs', evenEpsilon: 0.05 })
    : null;
  const diaperComparison = null;

  const Timeline = window.TT?.shared?.Timeline || null;
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
      return;
    }
    if (card.type === 'diaper') {
      setSelectedDiaperEntry(card);
      setShowDiaperDetailSheet(true);
    }
  }, []);
  const handleTimelineDeleteCard = React.useCallback(async (card) => {
    if (!card || !card.id) return;
    try {
      if (card.type === 'feed') {
        if (card.feedType === 'nursing') {
          await firestoreStorage.deleteNursingSession(card.id);
        } else if (card.feedType === 'solids') {
          await firestoreStorage.deleteSolidsSession(card.id);
        } else {
          await firestoreStorage.deleteFeeding(card.id);
        }
      } else if (card.type === 'sleep') {
        await firestoreStorage.deleteSleepSession(card.id);
      } else if (card.type === 'diaper') {
        await firestoreStorage.deleteDiaperChange(card.id);
      }
      await loadTimelineData(selectedDate);
    } catch (error) {
      console.error('[TrackerDetailTab] Failed to delete timeline entry:', error);
      alert('Failed to delete. Please try again.');
    }
  }, [selectedDate, loadTimelineData]);

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

  const SegmentedToggle = (window.TT?.shared?.SegmentedToggle || window.SegmentedToggle) || null;
  const handleSummaryToggleChange = React.useCallback((nextFilter) => {
    if (!nextFilter) return;
    setInitialTimelineFilter(nextFilter);
    setSummaryLayoutMode(nextFilter);
    setFilterEpoch((prev) => prev + 1);
  }, []);

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
    className: "pt-4 flex flex-col h-full",
    style: { minHeight: 0 }
  },
    React.createElement('div', { className: "flex-none space-y-4" },
      React.createElement('div', { 
        className: "tt-tracker-detail-calendar"
      },
        HorizontalCalendar
          ? React.createElement(HorizontalCalendar, {
              key: `calendar-${calendarMountKey}`,
              headerLeft: React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    if (typeof setActiveTab === 'function') {
                      setActiveTab('tracker');
                    }
                  },
                  className: "inline-flex items-center gap-1 text-[15px] font-medium",
                  style: { color: 'var(--tt-text-secondary)' }
                },
                ChevronLeftIcon && React.createElement(ChevronLeftIcon, {
                  className: "w-5 h-5",
                  style: { color: 'var(--tt-text-secondary)', transform: 'translateY(1px)' }
                }),
                "Back"
              ),
              onDateSelect: (payload) => {
                if (!payload) return;
                setSelectedSummary({
                  feedOz: payload.feedOz || 0,
                  nursingMs: payload.nursingMs || 0,
                  sleepMs: payload.sleepMs || 0,
                  diaperCount: payload.diaperCount || 0,
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
      ),
      SegmentedToggle && React.createElement(
        SegmentedToggle,
        {
          value: summaryLayoutMode,
          options: [
            { label: 'All', value: 'all' },
            { label: 'Feed', value: 'feed' },
            { label: 'Sleep', value: 'sleep' },
            { label: 'Diaper', value: 'diaper' }
          ],
          onChange: handleSummaryToggleChange,
          variant: 'body',
          size: 'medium',
          fullWidth: true
        }
      ),
      (() => {
        const isFirst = !summaryAnimationMountRef.current;
        const feedInitialX = -8;
        const sleepInitialX = isFirst ? -8 : 8;
        const nursingInitialX = isFirst ? 8 : 8;
        const feedSummaryCount = 1 + (hasNursingSummary ? 1 : 0) + (hasSolidsSummary ? 1 : 0);
        const useCompactSummaryCards = summaryLayoutMode === 'all' || (summaryLayoutMode === 'feed' && feedSummaryCount >= 3);
        const summaryGridCols = useCompactSummaryCards
          ? ''
          : (summaryLayoutMode === 'feed'
            ? (feedSummaryCount >= 3 ? 'grid-cols-3' : (feedSummaryCount === 2 ? 'grid-cols-2' : 'grid-cols-1'))
            : 'grid-cols-1');
        const isAllMode = useCompactSummaryCards;
        const allModeCardStyle = { flex: '0 0 auto', width: 'calc((100vw - 48px) / 3)' };

        return React.createElement(
          'div',
          {
            className: isAllMode
              ? 'flex gap-3 -mt-2 items-stretch overflow-x-auto pb-1'
              : `grid gap-3 -mt-2 items-stretch ${summaryGridCols}`,
            style: isAllMode ? { WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined
          },
          summaryLayoutMode !== 'sleep' && summaryLayoutMode !== 'diaper' && React.createElement(
            'div',
            {
              key: `summary-feed-${summaryCardsEpoch}`,
              style: isAllMode ? allModeCardStyle : undefined
            },
            renderSummaryCard({
              icon: bottleIcon,
              color: 'var(--tt-feed)',
              value: feedDisplay,
              unit: 'oz',
              rotateIcon: true,
              progressPercent: feedPercent,
              progressKey: `feed-${summaryAnimationEpoch}-${selectedSummaryKey}`,
              comparison: feedComparison,
              compactMode: useCompactSummaryCards
            })
          ),
          summaryLayoutMode !== 'sleep' && summaryLayoutMode !== 'diaper' && hasNursingSummary && React.createElement(
            'div',
            {
              key: `summary-nursing-${summaryCardsEpoch}`,
              style: isAllMode ? allModeCardStyle : undefined
            },
            renderSummaryCard({
              icon: nursingIcon,
              color: 'var(--tt-nursing)',
              value: nursingDisplay,
              unit: 'hrs',
              rotateIcon: false,
              progressPercent: 0,
              progressKey: `nursing-${summaryAnimationEpoch}-${selectedSummaryKey}`,
              comparison: nursingComparison,
              compactMode: useCompactSummaryCards
            })
          ),
          summaryLayoutMode === 'feed' && hasSolidsSummary && React.createElement(
            'div',
            {
              key: `summary-solids-${summaryCardsEpoch}`,
              style: isAllMode ? allModeCardStyle : undefined
            },
            renderSummaryCard({
              icon: solidsIcon,
              color: 'var(--tt-solids)',
              value: solidsDisplay,
              unit: 'foods',
              rotateIcon: false,
              progressPercent: 0,
              progressKey: `solids-${summaryAnimationEpoch}-${selectedSummaryKey}`,
              comparison: solidsComparison,
              compactMode: useCompactSummaryCards
            })
          ),
          summaryLayoutMode !== 'feed' && summaryLayoutMode !== 'diaper' && React.createElement(
            'div',
            {
              key: `summary-sleep-${summaryCardsEpoch}`,
              style: isAllMode ? allModeCardStyle : undefined
            },
            renderSummaryCard({
              icon: moonIcon,
              color: 'var(--tt-sleep)',
              value: sleepDisplay,
              unit: 'hrs',
              rotateIcon: false,
              progressPercent: sleepPercent,
              progressKey: `sleep-${summaryAnimationEpoch}-${selectedSummaryKey}`,
              comparison: sleepComparison,
              compactMode: useCompactSummaryCards
            })
          ),
          summaryLayoutMode !== 'feed' && summaryLayoutMode !== 'sleep' && React.createElement(
            'div',
            {
              key: `summary-diaper-${summaryCardsEpoch}`,
              style: isAllMode ? allModeCardStyle : undefined
            },
            renderSummaryCard({
              icon: diaperIcon,
              color: 'var(--tt-diaper)',
              value: diaperDisplay,
              unit: diaperUnit,
              rotateIcon: false,
              progressPercent: diaperPercent,
              progressKey: `diaper-${summaryAnimationEpoch}-${selectedSummaryKey}`,
              comparison: diaperComparison,
              subline: diaperSubline,
              compactMode: useCompactSummaryCards
            })
          )
        );
      })()
    ),
    React.createElement('div', {
      className: "flex-1 min-h-0 overflow-y-auto mt-4",
      style: { WebkitOverflowScrolling: 'touch' }
    },
      Timeline ? React.createElement(Timeline, {
        key: `tracker-detail-timeline-${filterEpoch}`,
        initialLoggedItems: loggedTimelineItems,
        initialScheduledItems: [],
        disableExpanded: true,
        allowItemExpand: true,
        initialFilter: initialTimelineFilter,
        onFilterChange: handleTimelineFilterChange,
        onEditCard: handleTimelineEditCard,
        onDeleteCard: handleTimelineDeleteCard,
        onScheduledAdd: handleScheduledAdd,
        onActiveSleepClick: handleActiveSleepClick
      }) : null
    ),
    React.createElement('div', {
      className: "tt-nav-fade fixed left-0 right-0 pointer-events-none",
      style: {
        bottom: 'calc(env(safe-area-inset-bottom) + 65px)',
        height: '100px',
        background: 'var(--tt-nav-fade-gradient)',
        zIndex: 40
      }
    }),
    (window.FeedSheet || window.SleepSheet || window.DiaperSheet) && React.createElement(
      (inputSheetMode === 'diaper'
        ? window.DiaperSheet
        : (inputSheetMode === 'sleep' ? window.SleepSheet : window.FeedSheet)),
      (inputSheetMode === 'diaper'
        ? {
            isOpen: showInputSheet,
            onClose: () => setShowInputSheet(false),
            entry: null,
            onSave: async () => {
              await loadTimelineData(selectedDate);
            }
          }
        : {
            variant: 'input',
            isOpen: showInputSheet,
            onClose: () => setShowInputSheet(false),
            kidId,
            preferredVolumeUnit,
            onAdd: async () => {
              await loadTimelineData(selectedDate);
            }
          })
    ),
    window.FeedSheet && React.createElement(window.FeedSheet, {
      variant: 'detail',
      isOpen: showFeedDetailSheet,
      onClose: () => {
        setShowFeedDetailSheet(false);
        setSelectedFeedEntry(null);
      },
      preferredVolumeUnit,
      entry: selectedFeedEntry,
      onDelete: async () => {
        await loadTimelineData(selectedDate);
      },
      onSave: async () => {
        await loadTimelineData(selectedDate);
      }
    }),
    window.SleepSheet && React.createElement(window.SleepSheet, {
      variant: 'detail',
      isOpen: showSleepDetailSheet,
      onClose: () => {
        setShowSleepDetailSheet(false);
        setSelectedSleepEntry(null);
      },
      entry: selectedSleepEntry,
      onDelete: async () => {
        await loadTimelineData(selectedDate);
      },
      onSave: async () => {
        await loadTimelineData(selectedDate);
      }
    }),
    window.DiaperSheet && React.createElement(window.DiaperSheet, {
      isOpen: showDiaperDetailSheet,
      onClose: () => {
        setShowDiaperDetailSheet(false);
        setSelectedDiaperEntry(null);
      },
      entry: selectedDiaperEntry,
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
