/* TrackerTab.js */
// Debug toggle:
// In console run: window.__ttDebugCards = true
// Disable: window.__ttDebugCards = false
const __ttDebugCardsOn = () => {
  try { return typeof window !== 'undefined' && !!window.__ttDebugCards; } catch (e) { return false; }
};
const __ttDebugCardsLog = (...args) => {
  try {
    if (__ttDebugCardsOn()) console.log('[TT][Cards]', ...args);
  } catch (e) {}
};
// ========================================
// TINY TRACKER - PART 4  
// Tracker Tab - Main Feeding Interface
// ========================================

// ========================================
// UI VERSION HELPERS (Single Source of Truth)
// ========================================
// Initialize shared UI version helpers (only once)
// Note: This is initialized in SettingsTab.js with Firestore support
// This check ensures it exists, but won't re-initialize if already set
const TrackerTab = ({
  user,
  kidId,
  familyId,
  onRequestOpenInputSheet = null,
  onRequestToggleActivitySheet = null,
  isActivitySheetOpen = false,
  activityVisibility = null,
  activityOrder = null,
  activeTab = null
}) => {
  // UI Version (v4-only)

  React.useEffect(() => {
    if (!activeTab) return;
    const prev = prevActiveTabRef.current;
    if (activeTab === 'tracker' && prev !== 'tracker') {
      setCalendarMountKey((k) => k + 1);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);
  
  const [babyWeight, setBabyWeight] = React.useState(null);
  const [multiplier, setMultiplier] = React.useState(2.5);
  const [preferredVolumeUnit, setPreferredVolumeUnit] = React.useState(() => {
    try {
      const stored = localStorage.getItem('tt_volume_unit');
      if (stored === 'ml' || stored === 'oz') return stored;
    } catch (e) {}
    return 'oz';
  });
  const [ounces, setOunces] = React.useState('');
  const [customTime, setCustomTime] = React.useState('');
  const [feedings, setFeedings] = React.useState([]);
  const [allFeedings, setAllFeedings] = React.useState([]);
  const [nursingSessions, setNursingSessions] = React.useState([]);
  const [allNursingSessions, setAllNursingSessions] = React.useState([]);
  const [solidsSessions, setSolidsSessions] = React.useState([]);
  const [allSolidsSessions, setAllSolidsSessions] = React.useState([]);
  const [sleepSessions, setSleepSessions] = React.useState([]);
  const [allSleepSessions, setAllSleepSessions] = React.useState([]);
  const [diaperChanges, setDiaperChanges] = React.useState([]);
  const [allDiaperChanges, setAllDiaperChanges] = React.useState([]);
  const [sleepSettings, setSleepSettings] = React.useState(null);
  const [yesterdayConsumed, setYesterdayConsumed] = React.useState(0);
  const [yesterdayFeedingCount, setYesterdayFeedingCount] = React.useState(0);
  const [sleepTodayMs, setSleepTodayMs] = React.useState(0);
  const [sleepTodayCount, setSleepTodayCount] = React.useState(0);
  const [sleepYesterdayMs, setSleepYesterdayMs] = React.useState(0);
  const [diaperTodayCount, setDiaperTodayCount] = React.useState(0);
  const [diaperYesterdayCount, setDiaperYesterdayCount] = React.useState(0);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [kidPhotoUrl, setKidPhotoUrl] = React.useState(null);
  const [kidDisplayName, setKidDisplayName] = React.useState(null);
  const [kidBirthDate, setKidBirthDate] = React.useState(null);
  const [kidDataState, setKidDataState] = React.useState(null);
  const [avgByTimeCache, setAvgByTimeCache] = React.useState(null);
  const [calendarMountKey, setCalendarMountKey] = React.useState(0);
  const prevActiveTabRef = React.useRef(activeTab);
  // State for smooth date transitions - preserve previous values while loading
  const [prevFeedingCardData, setPrevFeedingCardData] = React.useState(null);
  const [prevNursingCardData, setPrevNursingCardData] = React.useState(null);
  const [prevSolidsCardData, setPrevSolidsCardData] = React.useState(null);
  const [prevSleepCardData, setPrevSleepCardData] = React.useState(null);
  const [prevDiaperCardData, setPrevDiaperCardData] = React.useState(null);
  const [isDateTransitioning, setIsDateTransitioning] = React.useState(false);
  const transitionIdRef = React.useRef(0);
  const [transitionPending, setTransitionPending] = React.useState(0);
  const prevDateRef = React.useRef(currentDate);
  const [loading, setLoading] = React.useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [whatsNextCardAnimating, setWhatsNextCardAnimating] = React.useState(null); // 'entering' | 'exiting' | null
  const [showCustomTime, setShowCustomTime] = React.useState(false);
  const [logMode, setLogMode] = React.useState('feeding');
  const [cardVisible, setCardVisible] = React.useState(false);
  const cardRef = React.useRef(null);
  const avgByTimeCacheRef = React.useRef(null);
  const lastAvgByTimeWriteRef = React.useRef(0);
  const avgCacheKey = React.useMemo(() => {
    if (!familyId || !kidId) return null;
    return `tt_avg_by_time:${familyId}:${kidId}`;
  }, [familyId, kidId]);
  const _normalizeActivityVisibility = (value) => {
    const base = { bottle: true, nursing: true, solids: true, sleep: true, diaper: true };
    if (!value || typeof value !== 'object') return base;
    return {
      bottle: typeof value.bottle === 'boolean' ? value.bottle : base.bottle,
      nursing: typeof value.nursing === 'boolean' ? value.nursing : base.nursing,
      solids: typeof value.solids === 'boolean' ? value.solids : base.solids,
      sleep: typeof value.sleep === 'boolean' ? value.sleep : base.sleep,
      diaper: typeof value.diaper === 'boolean' ? value.diaper : base.diaper
    };
  };
  const _normalizeActivityOrder = (value) => {
    const base = ['bottle', 'nursing', 'solids', 'sleep', 'diaper'];
    if (!Array.isArray(value)) return base.slice();
    const next = [];
    value.forEach((item) => {
      if (base.includes(item) && !next.includes(item)) next.push(item);
    });
    if (!next.includes('solids')) {
      const nursingIdx = next.indexOf('nursing');
      if (nursingIdx >= 0) {
        next.splice(nursingIdx + 1, 0, 'solids');
      }
    }
    base.forEach((item) => {
      if (!next.includes(item)) next.push(item);
    });
    return next;
  };
  const activityVisibilitySafe = _normalizeActivityVisibility(activityVisibility);
  const activityOrderSafe = _normalizeActivityOrder(activityOrder);
  const canOpenInputSheet = React.useCallback((mode) => {
    if (mode === 'sleep') return activityVisibilitySafe.sleep;
    if (mode === 'diaper') return activityVisibilitySafe.diaper;
    if (mode === 'feeding' || mode === 'nursing') {
      return activityVisibilitySafe.bottle || activityVisibilitySafe.nursing;
    }
    return true;
  }, [activityVisibilitySafe]);

  const requestInputSheetOpen = React.useCallback((mode = 'feeding') => {
    if (!canOpenInputSheet(mode)) return;
    if (typeof onRequestOpenInputSheet === 'function') {
      onRequestOpenInputSheet(mode);
    }
  }, [canOpenInputSheet, onRequestOpenInputSheet]);
  const handleV4CardTap = React.useCallback((e, payload) => {
    if (typeof window === 'undefined') return;
    const nextFilter = payload?.mode === 'feeding' || payload?.mode === 'nursing' || payload?.mode === 'solids'
      ? 'feed'
      : (payload?.mode === 'sleep'
          ? 'sleep'
          : (payload?.mode === 'diaper' ? 'diaper' : payload?.mode || null));
    window.TT = window.TT || {};
    window.TT.shared = window.TT.shared || {};
    if (nextFilter) {
      window.TT.shared.trackerDetailFilter = nextFilter;
      window.dispatchEvent(new CustomEvent('tt:tracker-detail-filter', { detail: { filter: nextFilter } }));
    }
    const setActiveTab = window.TT?.actions?.setActiveTab;
    if (typeof setActiveTab === 'function') {
      setActiveTab('tracker-detail');
    }
  }, []);
  
  // Detail sheet state
  const [showFeedDetailSheet, setShowFeedDetailSheet] = React.useState(false);
  const [showSleepDetailSheet, setShowSleepDetailSheet] = React.useState(false);
  const [showDiaperDetailSheet, setShowDiaperDetailSheet] = React.useState(false);
  const [selectedFeedEntry, setSelectedFeedEntry] = React.useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = React.useState(null);
  const [selectedDiaperEntry, setSelectedDiaperEntry] = React.useState(null);

  // Sleep logging state
  const useActiveSleep = (typeof window !== 'undefined' && window.TT?.shared?.useActiveSleep)
    ? window.TT.shared.useActiveSleep
    : (() => ({ activeSleep: null, activeSleepLoaded: true }));
  const { activeSleep, activeSleepLoaded } = useActiveSleep(kidId);
  const [sleepElapsedMs, setSleepElapsedMs] = React.useState(0);
  const [sleepStartStr, setSleepStartStr] = React.useState('');
  const [sleepEndStr, setSleepEndStr] = React.useState('');
  const sleepIntervalRef = React.useRef(null);
  const [lastActiveSleepId, setLastActiveSleepId] = React.useState(null);

  useEffect(() => {
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }

    if (!activeSleep) {
      setSleepElapsedMs(0);
      setSleepStartStr('');
      setSleepEndStr('');
      return;
    }

    const start = _normalizeSleepStartMs(activeSleep.startTime);
    if (!start) { setSleepElapsedMs(0); return; }
    const tick = () => setSleepElapsedMs(Date.now() - start);
    tick();
    sleepIntervalRef.current = setInterval(tick, 1000);

    return () => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }
    };
  }, [activeSleep]);

  useEffect(() => {
    if (!activeSleep) {
      setSleepElapsedMs(0);
      setSleepEndStr('');
      setLastActiveSleepId(null);
    }
  }, [activeSleep]);

  // Ensure zzz animation styles from TrackerCard are available (for What's Next timer)
  useEffect(() => {
    try {
      if (document.getElementById('tt-zzz-anim')) return;
      const style = document.createElement('style');
      style.id = 'tt-zzz-anim';
      style.textContent = `
        @keyframes floatingZs {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-4px) scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-8px) scale(1);
            opacity: 0;
          }
        }
        .zzz {
          display: inline-block;
        }
        .zzz > span {
          display: inline-block;
          animation: floatingZs 2s ease-in-out infinite;
        }
        .zzz > span:nth-child(1) { animation-delay: 0s; }
        .zzz > span:nth-child(2) { animation-delay: 0.3s; }
        .zzz > span:nth-child(3) { animation-delay: 0.6s; }
      `;
      document.head.appendChild(style);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Format elapsed time for timer display (borrowed from TrackerCard)
  const formatElapsedHmsTT = (ms) => {
    const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

    if (h > 0) {
      const hStr = h >= 10 ? pad2(h) : String(h);
      const mStr = pad2(m);
      const sStr = pad2(s);
      return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: `${hStr}h ${mStr}m ${sStr}s` };
    }

    if (m > 0) {
      const mStr = m >= 10 ? pad2(m) : String(m);
      const sStr = pad2(s);
      return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
    }

    const sStr = s < 10 ? String(s) : pad2(s);
    return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
  };

  // Inject BMW-style charging pulse animation for active sleep progress bar
  useEffect(() => {
    try {
      if (document.getElementById('tt-sleep-pulse-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-sleep-pulse-style';
      s.textContent = `
        @keyframes ttSleepPulse {
          0% {
            transform: translateX(-100%) skewX(-20deg);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(200%) skewX(-20deg);
            opacity: 0;
          }
        }
        .tt-sleep-progress-pulse {
          position: relative;
          overflow: hidden;
        }
        .tt-sleep-progress-pulse::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            var(--tt-pulse-highlight),
            transparent
          );
          animation: ttSleepPulse 2.5s ease-in-out infinite;
          border-radius: inherit;
          pointer-events: none;
        }
      `;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Helper function to check if a sleep session overlaps with existing ones
  const checkSleepOverlap = async (startMs, endMs, excludeId = null) => {
    try {
      const allSessions = await firestoreStorage.getAllSleepSessions();
      const nowMs = Date.now();
      
      // Normalize the new sleep interval
      const normalizeInterval = (sMs, eMs) => {
        let s = Number(sMs);
        let e = Number(eMs);
        if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
        if (s > nowMs + 3 * 3600000) s -= 86400000;
        if (e < s) s -= 86400000;
        if (e < s) return null;
        return { startMs: s, endMs: e };
      };
      
      const newNorm = normalizeInterval(startMs, endMs);
      if (!newNorm) return false; // Invalid interval, let other validation catch it
      
      // Check each existing session for overlap
      for (const session of allSessions) {
        // Skip the session being edited
        if (excludeId && session.id === excludeId) continue;
        
        // For active sleeps, use current time as end
        const existingEnd = session.isActive ? nowMs : (session.endTime || null);
        if (!session.startTime || !existingEnd) continue;
        
        const existingNorm = normalizeInterval(session.startTime, existingEnd);
        if (!existingNorm) continue;
        
        // Check if ranges overlap: (start1 < end2) && (start2 < end1)
        if (newNorm.startMs < existingNorm.endMs && existingNorm.startMs < newNorm.endMs) {
          return true; // Overlap found
        }
      }
      
      return false; // No overlap
    } catch (error) {
      console.error('Error checking sleep overlap:', error);
      // On error, allow the save (fail open) - user can manually check
      return false;
    }
  };

  const _pad2 = (n) => String(n).padStart(2, '0');
  const _toHHMM = (ms) => {
    try {
      const d = new Date(ms);
      return _pad2(d.getHours()) + ':' + _pad2(d.getMinutes());
    } catch (e) {
      return '';
    }
  };
  const _toHHMMNoZero = (ms) => {
    try {
      const d = new Date(ms);
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h === 0 ? 12 : h;
      return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch {
      return '';
    }
  };
  const _hhmmToMsToday = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string' || hhmm.indexOf(':') === -1) return null;
    const parts = hhmm.split(':');
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const d = new Date();
    d.setHours(hh);
    d.setMinutes(mm);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d.getTime();
  };
  const _hhmmToMsForDate = (hhmm, baseDate) => {
    if (!hhmm || typeof hhmm !== 'string' || hhmm.indexOf(':') === -1) return null;
    const parts = hhmm.split(':');
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const d = new Date(baseDate || Date.now());
    d.setHours(hh);
    d.setMinutes(mm);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d.getTime();
  };

  // Sleep-specific time parsing helpers:
  // - If it's after midnight and the user picks a late-night time (e.g. 23:00 at 01:00), assume they mean the previous day.
  // - For end times, if the chosen time-of-day is earlier than the start time-of-day, assume the sleep crossed midnight and add a day.
  const _hhmmToMsNearNowSmart = (hhmm, nowMs = Date.now(), futureCutoffHours = 3) => {
    const ms = _hhmmToMsForDate(hhmm, nowMs);
    if (!ms) return null;
    const cutoff = futureCutoffHours * 3600000;
    return (ms > (nowMs + cutoff)) ? (ms - 86400000) : ms;
  };
  const _normalizeSleepStartMs = (startMs, nowMs = Date.now()) => {
    if (!startMs) return null;
    // If start is wildly in the future (due to day ambiguity), pull it back 1 day.
    return (startMs > nowMs + 3 * 3600000) ? (startMs - 86400000) : startMs;
  };
  const _hhmmToSleepEndMs = (hhmm, startMs, nowMs = Date.now()) => {
    const base = (typeof startMs === 'number' && Number.isFinite(startMs)) ? startMs : nowMs;
    let endMs = _hhmmToMsForDate(hhmm, base);
    if (!endMs) return null;
    // If end looks earlier than start, assume it rolled past midnight.
    if (typeof startMs === 'number' && Number.isFinite(startMs) && endMs < startMs) {
      endMs += 86400000;
    }
    // Also guard against accidentally selecting an end time that's a full day ahead.
    if (endMs > nowMs + 6 * 3600000) {
      endMs -= 86400000;
    }
    return endMs;
  };
  const _formatMMSS = (ms) => {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const hh = Math.floor(total / 3600);
    const rem = total % 3600;
    const mm = Math.floor(rem / 60);
    const ss = rem % 60;
    // < 1 hour: MM:SS  |  >= 1 hour: H:MM:SS
    return hh > 0
      ? (hh + ':' + _pad2(mm) + ':' + _pad2(ss))
      : (mm + ':' + _pad2(ss));
  };

  // ========================================
  // ADDITIVE: Today Progress Bars (Experiment)
  // ========================================

  const ProgressBarRow = ({
    label,
    value,
    target,
    unit,
    deltaLabel,
    deltaIsGood
  }) => {
    const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

    return React.createElement(
      'div',
      { className: "mt-5" },
      React.createElement(
        'div',
        { className: "text-sm font-medium text-gray-700 mb-1" },
        label
      ),
      React.createElement(
        'div',
        { className: "relative w-full h-4 bg-gray-200 rounded-full overflow-hidden" },
        React.createElement('div', {
          className: "absolute left-0 top-0 h-full bg-indigo-600 rounded-full",
          style: {
            width: `${pct}%`,
            transition: "width 300ms ease-out"
          }
        })
      ),
      React.createElement(
        'div',
        { className: "mt-1 flex items-baseline justify-between" },
        React.createElement(
          'div',
          { className: "text-base font-semibold text-indigo-600" },
          `${value} ${unit} `,
          React.createElement(
            'span',
            { className: "text-sm font-normal text-gray-500" },
            `of ${target} ${unit}`
          )
        ),
        React.createElement(
          'div',
          { className: "text-xs font-medium" },
          React.createElement(
            'span',
            { className: deltaIsGood ? "text-green-600 font-semibold" : "text-red-600 font-semibold" },
            deltaLabel
          ),
          React.createElement(
            'span',
            { className: "text-gray-400 font-normal ml-1" },
            "vs yday"
          )
        )
      )
    );
  };

  // Keep time inputs in sync with active sleep state
  useEffect(() => {
    if (activeSleep && activeSleep.startTime) {
      setSleepStartStr(_toHHMM(activeSleep.startTime));
      if (activeSleep.id && activeSleep.id !== lastActiveSleepId) {
        setSleepEndStr('');
        setLastActiveSleepId(activeSleep.id);
      }
      return;
    }
    if (logMode === 'sleep') {
      setSleepStartStr(_toHHMM(Date.now()));
      setSleepEndStr('');
    }
  }, [logMode, activeSleep]);

  useEffect(() => {
    loadData();
  }, [kidId]);

  useEffect(() => {
    if (!kidId) return;
    loadSleepSessions();
  }, [kidId, activeSleep, currentDate]);

  // Intersection Observer to detect when card scrolls into view (matches analytics page animation)
  // Use callback ref to set up observer when element is attached to DOM
  const cardRefCallback = React.useCallback((element) => {
    if (!element) {
      cardRef.current = null;
      return;
    }
    
    cardRef.current = element;
    
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: animate immediately if IntersectionObserver not available
      setCardVisible(true);
      return;
    }
    
    // Check if element is already visible (in case it's visible on mount)
    const checkInitialVisibility = () => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
      if (isVisible) {
        setCardVisible(true);
        return true;
      }
      return false;
    };
    
    // If already visible, animate immediately
    if (checkInitialVisibility()) {
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCardVisible(true);
            observer.disconnect(); // Disconnect after first trigger
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    // Store observer cleanup on element for later cleanup if needed
    element._observer = observer;
  }, []);

  // Log render state after DOM updates (moved after calculations to avoid TDZ issues)

  const loadSleepSessions = async () => {
    const myTransitionId = transitionIdRef.current; // Capture transition ID
    try {
      const sessions = await firestoreStorage.getAllSleepSessions();
      setAllSleepSessions(sessions || []); // Store all sleep sessions for yesterday calculation
      const ended = (sessions || []).filter(s => s && s.endTime);
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      const yDate = new Date(currentDate);
      yDate.setDate(yDate.getDate() - 1);
      const yStart = new Date(yDate);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yDate);
      yEnd.setHours(23, 59, 59, 999);
      const dayStartMs = startOfDay.getTime();
      const dayEndMs = endOfDay.getTime() + 1; // make end inclusive
      const yDayStartMs = yStart.getTime();
      const yDayEndMs = yEnd.getTime() + 1;

      const _normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
        let sMs = Number(startMs);
        let eMs = Number(endMs);
        if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
        // If start time accidentally landed in the future (common around midnight), pull it back one day.
        if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
        // If end < start, assume the sleep crossed midnight and the start belongs to the previous day.
        if (eMs < sMs) sMs -= 86400000;
        if (eMs < sMs) return null; // still invalid
        return { startMs: sMs, endMs: eMs };
      };

      const _overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
        const a = Math.max(rangeStartMs, winStartMs);
        const b = Math.min(rangeEndMs, winEndMs);
        return Math.max(0, b - a);
      };

      const normEnded = ended.map((s) => {
        const norm = _normalizeSleepInterval(s.startTime, s.endTime);
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      }).filter(Boolean);

      const todaySessions = normEnded.filter(s => _overlapMs(s._normStartTime, s._normEndTime, dayStartMs, dayEndMs) > 0);
      const ySessions = normEnded.filter(s => _overlapMs(s._normStartTime, s._normEndTime, yDayStartMs, yDayEndMs) > 0);
      const todayMs = todaySessions.reduce((sum, ss) => sum + _overlapMs(ss._normStartTime, ss._normEndTime, dayStartMs, dayEndMs), 0);
      const yMs = ySessions.reduce((sum, ss) => sum + _overlapMs(ss._normStartTime, ss._normEndTime, yDayStartMs, yDayEndMs), 0);
      setSleepSessions(todaySessions.sort((a, b) => (b._normStartTime || 0) - (a._normStartTime || 0)));
      setSleepTodayMs(todayMs);
      setSleepTodayCount(todaySessions.length);
      setSleepYesterdayMs(yMs);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (err) {
      console.error("Failed to load sleep sessions", err);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  useEffect(() => {
    if (!loading && kidId) {
      loadFeedings();
      loadNursingSessions();
      loadSolidsSessions();
      loadDiaperChanges();
      const interval = setInterval(() => {
        loadFeedings();
        loadNursingSessions();
        loadSolidsSessions();
        loadDiaperChanges();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentDate, loading, kidId]);

  const loadFeedings = async () => {
    const myTransitionId = transitionIdRef.current; // Capture transition ID
    try {
      const allFeedingsData = await firestoreStorage.getAllFeedings();
      setAllFeedings(allFeedingsData); // Store all feedings for yesterday calculation
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const yDate = new Date(currentDate);
      yDate.setDate(yDate.getDate() - 1);
      const yStart = new Date(yDate);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yDate);
      yEnd.setHours(23, 59, 59, 999);

      const yFeedings = allFeedingsData.filter(f => f.timestamp >= yStart.getTime() && f.timestamp <= yEnd.getTime());
      const yConsumed = yFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
      setYesterdayConsumed(yConsumed);
      setYesterdayFeedingCount(yFeedings.length);

      const dayFeedings = allFeedingsData.filter(f =>
        f.timestamp >= startOfDay.getTime() &&
        f.timestamp <= endOfDay.getTime()
      ).map(f => ({
        ...f,
        time: new Date(f.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      })).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
      
      setFeedings(dayFeedings);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (error) {
      console.error('Error loading feedings:', error);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  const loadNursingSessions = async () => {
    const myTransitionId = transitionIdRef.current;
    try {
      const allNursingData = await firestoreStorage.getAllNursingSessions();
      setAllNursingSessions(allNursingData || []);

      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const daySessions = (allNursingData || []).filter(s => {
        const ts = s.timestamp || s.startTime || 0;
        return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
      }).map(s => ({
        ...s,
        time: new Date(s.timestamp || s.startTime || Date.now()).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      })).sort((a, b) => (b.timestamp || b.startTime || 0) - (a.timestamp || a.startTime || 0));

      setNursingSessions(daySessions);
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (error) {
      console.error('Error loading nursing sessions:', error);
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  const loadSolidsSessions = async () => {
    const myTransitionId = transitionIdRef.current;
    try {
      const allSolidsData = await firestoreStorage.getAllSolidsSessions();
      setAllSolidsSessions(allSolidsData || []);

      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const daySessions = (allSolidsData || []).filter(s => {
        const ts = s.timestamp || 0;
        return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
      }).map(s => ({
        ...s,
        time: new Date(s.timestamp || Date.now()).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setSolidsSessions(daySessions);
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (error) {
      console.error('Error loading solids sessions:', error);
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  const loadDiaperChanges = async () => {
    const myTransitionId = transitionIdRef.current; // Capture transition ID
    try {
      const allChanges = await firestoreStorage.getAllDiaperChanges();
      setAllDiaperChanges(allChanges || []);
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const yDate = new Date(currentDate);
      yDate.setDate(yDate.getDate() - 1);
      const yStart = new Date(yDate);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yDate);
      yEnd.setHours(23, 59, 59, 999);

      const yChanges = (allChanges || []).filter(c => {
        const ts = c.timestamp || 0;
        return ts >= yStart.getTime() && ts <= yEnd.getTime();
      });
      setDiaperYesterdayCount(yChanges.length);

      const dayChanges = (allChanges || []).filter(c => {
        const ts = c.timestamp || 0;
        return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
      }).map(c => ({
        ...c,
        time: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setDiaperChanges(dayChanges);
      setDiaperTodayCount(dayChanges.length);

      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (error) {
      console.error('Error loading diaper changes:', error);
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  React.useEffect(() => {
    const handleInputSheetAdded = (event) => {
      const mode = event?.detail?.mode;
      // Always refresh all tracker datasets on add to keep UI snappy.
      loadFeedings();
      loadNursingSessions();
      loadSolidsSessions();
      loadSleepSessions();
      loadDiaperChanges();
      if (mode === 'feeding' || mode === 'nursing' || mode === 'solids' || mode === 'sleep' || mode === 'diaper') {
        return;
      }
    };
    window.addEventListener('tt-input-sheet-added', handleInputSheetAdded);
    return () => window.removeEventListener('tt-input-sheet-added', handleInputSheetAdded);
  }, [loadFeedings, loadNursingSessions, loadSleepSessions, loadDiaperChanges]);

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

  const loadData = async () => {
    // Never leave the tab stuck in "Loading..." if kidId isn't ready yet.
    setLoading(true);
    if (!kidId) {
      setLoading(false);
      return;
    }
    try {
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
      const kidData = await firestoreStorage.getKidData();
      setKidDataState(kidData || null);
      setKidPhotoUrl(kidData?.photoURL || null);
      setKidDisplayName(kidData?.name || null);
      setKidBirthDate(kidData?.birthDate || null);
      await loadFeedings();
      await loadNursingSessions();
      await loadDiaperChanges();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  };

  const handleAddFeeding = async () => {
    const amount = parseFloat(ounces);
    if (!amount || amount <= 0) return;

    let feedingTime;
    if (customTime) {
      const [hours, minutes] = customTime.split(':');
      feedingTime = new Date(currentDate);
      feedingTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      feedingTime = new Date();
    }

    try {
      await firestoreStorage.addFeeding(amount, feedingTime.getTime());
      setOunces('');
      setCustomTime('');
      setShowCustomTime(false);
      await loadFeedings(); // Refresh immediately
    } catch (error) {
      console.error('Error adding feeding:', error);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    // Save current card data before changing date for smooth transition
    // Calculate target values inline since they're not available yet
    const targetOz = babyWeight ? babyWeight * multiplier : 0;
    const targetHrs = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number") ? sleepSettings.sleepTargetHours : 14;
    const currentFeedingData = formatFeedingsForCard(feedings, targetOz, currentDate);
    const currentNursingData = formatNursingSessionsForCard(nursingSessions, currentDate);
    const currentSolidsData = formatSolidsSessionsForCard(solidsSessions, currentDate);
    const currentSleepData = formatSleepSessionsForCard(sleepSessions, targetHrs, currentDate, activeSleep);
    const currentDiaperData = formatDiaperChangesForCard(diaperChanges, currentDate);
    setPrevFeedingCardData(currentFeedingData);
    setPrevNursingCardData(currentNursingData);
    setPrevSolidsCardData(currentSolidsData);
    setPrevSleepCardData(currentSleepData);
    setPrevDiaperCardData(currentDiaperData);
    // Start new transition and expect 5 completions
    transitionIdRef.current += 1;
    setTransitionPending(5);
    setIsDateTransitioning(true);
    setCurrentDate(newDate);
    prevDateRef.current = newDate;
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    // Save current card data before changing date for smooth transition
    // Calculate target values inline since they're not available yet
    const targetOz = babyWeight ? babyWeight * multiplier : 0;
    const targetHrs = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number") ? sleepSettings.sleepTargetHours : 14;
    const currentFeedingData = formatFeedingsForCard(feedings, targetOz, currentDate);
    const currentNursingData = formatNursingSessionsForCard(nursingSessions, currentDate);
    const currentSolidsData = formatSolidsSessionsForCard(solidsSessions, currentDate);
    const currentSleepData = formatSleepSessionsForCard(sleepSessions, targetHrs, currentDate, activeSleep);
    const currentDiaperData = formatDiaperChangesForCard(diaperChanges, currentDate);
    setPrevFeedingCardData(currentFeedingData);
    setPrevNursingCardData(currentNursingData);
    setPrevSolidsCardData(currentSolidsData);
    setPrevSleepCardData(currentSleepData);
    setPrevDiaperCardData(currentDiaperData);
    // Start new transition and expect 5 completions
    transitionIdRef.current += 1;
    setTransitionPending(5);
    setIsDateTransitioning(true);
    setCurrentDate(newDate);
    prevDateRef.current = newDate;
  };

  const isToday = () => {
    return currentDate.toDateString() === new Date().toDateString();
  };

  const handleDateSelectFromCalendar = React.useCallback((metrics) => {
    if (metrics && metrics.date) {
      setCurrentDate(metrics.date);
    }
  }, []);

  // What's Next card animation state (v4)
  const prevIsTodayRef = React.useRef(isToday());
  React.useEffect(() => {
    
    const currentlyToday = isToday();
    const wasToday = prevIsTodayRef.current;
    
    if (currentlyToday && !wasToday) {
      // Entering: show card with enter animation
      setWhatsNextCardAnimating('entering');
      setTimeout(() => {
        setWhatsNextCardAnimating(null);
      }, 400);
    } else if (!currentlyToday && wasToday) {
      // Exiting: start exit animation, then hide
      setWhatsNextCardAnimating('exiting');
      setTimeout(() => {
        setWhatsNextCardAnimating(null);
      }, 400);
    }
    
    prevIsTodayRef.current = currentlyToday;
  }, [currentDate]);

  const formatDate = (date) => {
    if (isToday()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime12Hour = (date) => {
    if (!date || !(date instanceof Date)) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).toLowerCase();
  };

  const getLastFeeding = () => {
    if (!feedings || feedings.length === 0) return null;
    return feedings[0];
  };

  const getLastSleep = () => {
    if (!sleepSessions || sleepSessions.length === 0) return null;
    // Filter out active sessions (those without endTime or with isActive flag)
    const completed = sleepSessions.filter(s => s.endTime && !s.isActive);
    return completed.length > 0 ? completed[0] : null;
  };

  // Data transformation helpers for new TrackerCard components
  // Helper function to determine sleep type (must be defined before formatSleepSessionsForCard)
  const _sleepTypeForSession = (session) => {
    if (!session) return 'night';
    if (session.sleepType === 'day' || session.sleepType === 'night') return session.sleepType;
    if (typeof session.isDaySleep === 'boolean') return session.isDaySleep ? 'day' : 'night';
    const start = session.startTime;
    if (!start) return 'night';
    const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
    const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);
    const mins = (() => {
      try {
        const d = new Date(start);
        return d.getHours() * 60 + d.getMinutes();
      } catch {
        return 0;
      }
    })();
    const within = dayStart <= dayEnd
      ? (mins >= dayStart && mins <= dayEnd)
      : (mins >= dayStart || mins <= dayEnd);
    return within ? 'day' : 'night';
  };

  const formatFeedingsForCard = (feedings, targetOunces, currentDate) => {
    if (!feedings || !Array.isArray(feedings)) return { total: 0, target: targetOunces || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    
    // Filter to today only
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayFeedings = feedings.filter(f => {
      const timestamp = f.timestamp || 0;
      return timestamp >= startOfDay.getTime() && timestamp <= endOfDay.getTime();
    });
    
    // Calculate total
    const total = todayFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
    const target = targetOunces || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    
    // Format timeline items (newest first)
    const timelineItems = todayFeedings
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .map(f => ({
        id: f.id,
        ounces: f.ounces,
        timestamp: f.timestamp,
        notes: f.notes || null,
        photoURLs: f.photoURLs || null
      }));
    
    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].timestamp : null;
    
    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const formatNursingSessionsForCard = (sessions, currentDate) => {
    if (!sessions || !Array.isArray(sessions)) return { total: 0, target: null, percent: 0, timelineItems: [], lastEntryTime: null };

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const todaySessions = sessions.filter(s => {
      const ts = s.timestamp || s.startTime || 0;
      return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
    });

    const totalMs = todaySessions.reduce((sum, s) => {
      const left = Number(s.leftDurationSec || 0);
      const right = Number(s.rightDurationSec || 0);
      return sum + Math.max(0, left + right) * 1000;
    }, 0);

    const timelineItems = todaySessions
      .sort((a, b) => ((b.timestamp || b.startTime || 0) - (a.timestamp || a.startTime || 0)))
      .map(s => ({
        id: s.id,
        timestamp: s.timestamp || s.startTime || 0,
        startTime: s.startTime || s.timestamp || 0,
        leftDurationSec: Number(s.leftDurationSec || 0),
        rightDurationSec: Number(s.rightDurationSec || 0),
        lastSide: s.lastSide || null,
        notes: s.notes || null,
        photoURLs: s.photoURLs || null,
        feedType: 'nursing'
      }));

    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].timestamp : null;

    return { total: totalMs, target: null, percent: 0, timelineItems, lastEntryTime };
  };

  const formatSolidsSessionsForCard = (sessions, currentDate) => {
    if (!sessions || !Array.isArray(sessions)) return { total: 0, target: null, percent: 0, timelineItems: [], lastEntryTime: null, comparison: null };

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const todaySessions = sessions.filter(s => {
      const ts = s.timestamp || 0;
      return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
    });

    // Count total foods (not sessions)
    const totalFoods = todaySessions.reduce((sum, s) => {
      return sum + (Array.isArray(s.foods) ? s.foods.length : 0);
    }, 0);

    // Calculate yesterday's food count for comparison
    const yDate = new Date(currentDate);
    yDate.setDate(yDate.getDate() - 1);
    const yStart = new Date(yDate);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yDate);
    yEnd.setHours(23, 59, 59, 999);

    const allSessions = allSolidsSessions || sessions;
    const yesterdaySessions = allSessions.filter(s => {
      const ts = s.timestamp || 0;
      return ts >= yStart.getTime() && ts <= yEnd.getTime();
    });

    const yesterdayFoods = yesterdaySessions.reduce((sum, s) => {
      return sum + (Array.isArray(s.foods) ? s.foods.length : 0);
    }, 0);

    const delta = totalFoods - yesterdayFoods;
    const comparison = { delta, unit: 'food' };

    const timelineItems = todaySessions
      .sort((a, b) => ((b.timestamp || 0) - (a.timestamp || 0)))
      .map(s => ({
        id: s.id,
        timestamp: s.timestamp || 0,
        foods: s.foods || [],
        notes: s.notes || null,
        photoURLs: s.photoURLs || null,
        feedType: 'solids'
      }));

    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].timestamp : null;

    return { total: totalFoods, target: null, percent: 0, timelineItems, lastEntryTime, comparison };
  };

  const formatSleepSessionsForCard = (sessions, targetHours, currentDate, activeSleepSession = null) => {
    if (!sessions || !Array.isArray(sessions)) return { total: 0, target: targetHours || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    const dayStartMs = startOfDay.getTime();
    const dayEndMs = endOfDay.getTime() + 1; // make end inclusive

    // Use the same normalization and overlap helpers as loadSleepSessions
    const _normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
      let sMs = Number(startMs);
      let eMs = Number(endMs);
      if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
      // If start time accidentally landed in the future (common around midnight), pull it back one day.
      if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
      // If end < start, assume the sleep crossed midnight and the start belongs to the previous day.
      if (eMs < sMs) sMs -= 86400000;
      if (eMs < sMs) return null; // still invalid
      return { startMs: sMs, endMs: eMs };
    };

    const _overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
      const a = Math.max(rangeStartMs, winStartMs);
      const b = Math.min(rangeEndMs, winEndMs);
      return Math.max(0, b - a);
    };

    // Normalize all sessions (including active sleep)
    const normSessions = sessions.map((s) => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      if (isActive) {
        // Active sleep - use current time as end
        const norm = _normalizeSleepInterval(s.startTime, Date.now());
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      }
      if (!s.endTime) return null; // Skip incomplete sessions (except active)
      const norm = _normalizeSleepInterval(s.startTime, s.endTime);
      return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
    }).filter(Boolean);

    // Filter to sessions that overlap with current day (using overlap, not just start/end check)
    const todaySessions = normSessions.filter(s => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      const endTime = isActive ? Date.now() : (s._normEndTime || s.endTime);
      return _overlapMs(s._normStartTime || s.startTime, endTime, dayStartMs, dayEndMs) > 0;
    });

    // Calculate total using overlap (like loadSleepSessions does) - only counts portion in current day
    const completedSessions = todaySessions.filter(s => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      return s.endTime && !isActive; // Only completed, non-active sessions
    });
    
    let totalMs = completedSessions.reduce((sum, s) => {
      return sum + _overlapMs(s._normStartTime, s._normEndTime, dayStartMs, dayEndMs);
    }, 0);

    // Add active sleep if it exists and overlaps with today
    if (activeSleepSession && activeSleepSession.startTime) {
      const activeNorm = _normalizeSleepInterval(activeSleepSession.startTime, Date.now());
      if (activeNorm) {
        const activeOverlap = _overlapMs(activeNorm.startMs, activeNorm.endMs, dayStartMs, dayEndMs);
        if (activeOverlap > 0) {
          totalMs += activeOverlap;
        }
      }
    }

    const total = totalMs / (1000 * 60 * 60); // Convert to hours
    const target = targetHours || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;

    // Format timeline items (newest first by start time)
    const timelineItems = todaySessions
      .sort((a, b) => (b._normStartTime || b.startTime || 0) - (a._normStartTime || a.startTime || 0))
      .map(s => {
        const isActive = activeSleepSession && s.id === activeSleepSession.id;
        return {
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: isActive || false,
          notes: s.notes || null,
          photoURLs: s.photoURLs || null,
          sleepType: _sleepTypeForSession(s) // Add sleep type
        };
      });

    // Add active sleep to timeline if not already included
    if (activeSleepSession && activeSleepSession.startTime) {
      const activeNorm = _normalizeSleepInterval(activeSleepSession.startTime, Date.now());
      if (activeNorm && _overlapMs(activeNorm.startMs, activeNorm.endMs, dayStartMs, dayEndMs) > 0) {
        const activeInTimeline = timelineItems.find(item => item.id === activeSleepSession.id);
        if (!activeInTimeline) {
          timelineItems.unshift({
            id: activeSleepSession.id,
            startTime: activeSleepSession.startTime,
            endTime: null,
            isActive: true,
            notes: activeSleepSession.notes || null,
            photoURLs: activeSleepSession.photoURLs || null,
            sleepType: _sleepTypeForSession(activeSleepSession)
          });
        }
      }
    }

    // Get last entry time (most recent start time)
    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].startTime : null;

    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const formatDiaperChangesForCard = (changes, currentDate) => {
    if (!changes || !Array.isArray(changes)) return { total: 0, target: null, percent: 0, timelineItems: [], lastEntryTime: null };

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const todayChanges = changes.filter(c => {
      const ts = c.timestamp || 0;
      return ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
    });

    const total = todayChanges.length;

    const timelineItems = todayChanges
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        notes: c.notes || null,
        photoURLs: c.photoURLs || null,
        isWet: !!c.isWet,
        isDry: !!c.isDry,
        isPoo: !!c.isPoo
      }));

    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].timestamp : null;

    return { total, target: null, percent: 0, timelineItems, lastEntryTime };
  };

  const formatTimelineItem = (entry, mode) => {
    // This is handled by TimelineItem component itself
    // Just return the entry as-is
    return entry;
  };

  const calculateSleepDurationMinutes = (session) => {
    if (!session || !session.startTime || !session.endTime) return 0;
    const _normalizeSleepIntervalForUI = (startMs, endMs, nowMs = Date.now()) => {
      let sMs = Number(startMs);
      let eMs = Number(endMs);
      if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
      if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
      if (eMs < sMs) sMs -= 86400000;
      if (eMs < sMs) return null;
      return { startMs: sMs, endMs: eMs };
    };
    const norm = _normalizeSleepIntervalForUI(session.startTime, session.endTime);
    const ns = norm ? norm.startMs : session.startTime;
    const ne = norm ? norm.endMs : session.endTime;
    const durMs = Math.max(0, (ne || 0) - (ns || 0));
    return Math.round(durMs / 60000);
  };

  const formatSleepDuration = (minutes) => {
    if (!minutes || minutes < 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const TT_AVG_BUCKET_MINUTES = 15;
  const TT_AVG_BUCKET_MS = TT_AVG_BUCKET_MINUTES * 60000;
  const TT_AVG_BUCKETS = 96;
  const TT_AVG_DAYS = 7;
  const TT_AVG_EVEN_EPSILON = 0.05;

  const _startOfDayMsLocal = (ts) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const _bucketIndexCeilFromMinutes = (mins) => {
    const clamped = Math.max(0, Math.min(1440, Math.ceil(mins / TT_AVG_BUCKET_MINUTES) * TT_AVG_BUCKET_MINUTES));
    return Math.min(TT_AVG_BUCKETS - 1, Math.floor(clamped / TT_AVG_BUCKET_MINUTES));
  };

  const _bucketIndexCeilFromMs = (ts) => {
    const d = new Date(ts);
    const mins = d.getHours() * 60 + d.getMinutes();
    return _bucketIndexCeilFromMinutes(mins);
  };

  const _avgCacheEqual = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const sectionEqual = (x, y) => {
      if (!x && !y) return true;
      if (!x || !y) return false;
      if (x.daysUsed !== y.daysUsed) return false;
      if (!Array.isArray(x.buckets) || !Array.isArray(y.buckets)) return false;
      if (x.buckets.length !== y.buckets.length) return false;
      for (let i = 0; i < x.buckets.length; i += 1) {
        if (Math.abs((x.buckets[i] || 0) - (y.buckets[i] || 0)) > 1e-6) return false;
      }
      return true;
    };
    return sectionEqual(a.feed, b.feed) && sectionEqual(a.nursing, b.nursing) && sectionEqual(a.sleep, b.sleep);
  };

  const _pickLatestAvgCache = (local, remote) => {
    if (!local) return remote || null;
    if (!remote) return local;
    const localAt = Number(local.computedAt || 0);
    const remoteAt = Number(remote.computedAt || 0);
    return localAt >= remoteAt ? local : remote;
  };

  const _readAvgCacheLocal = () => {
    if (!avgCacheKey) return null;
    try {
      const raw = localStorage.getItem(avgCacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const _writeAvgCacheLocal = (value) => {
    if (!avgCacheKey) return;
    try {
      if (!value) {
        localStorage.removeItem(avgCacheKey);
        return;
      }
      localStorage.setItem(avgCacheKey, JSON.stringify(value));
    } catch {
      // ignore cache write errors
    }
  };

  const _buildFeedAvgBuckets = (all) => {
    if (!Array.isArray(all) || all.length === 0) return null;
    const todayStartMs = _startOfDayMsLocal(Date.now());
    const dayMap = new Map();
    all.forEach((f) => {
      const ts = Number(f?.timestamp || 0);
      if (!Number.isFinite(ts) || ts >= todayStartMs) return;
      const dayStartMs = _startOfDayMsLocal(ts);
      const list = dayMap.get(dayStartMs) || [];
      list.push(f);
      dayMap.set(dayStartMs, list);
    });
    const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
    dayStarts.forEach((dayStartMs) => {
      const increments = Array(TT_AVG_BUCKETS).fill(0);
      const dayFeedings = dayMap.get(dayStartMs) || [];
      dayFeedings.forEach((f) => {
        const ts = Number(f?.timestamp || 0);
        const oz = Number(f?.ounces || 0);
        if (!Number.isFinite(ts) || !Number.isFinite(oz) || oz <= 0) return;
        const idx = _bucketIndexCeilFromMs(ts);
        increments[idx] += oz;
      });
      let running = 0;
      for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => v / dayStarts.length),
      daysUsed: dayStarts.length,
      dayStarts
    };
  };

  const _buildNursingAvgBuckets = (all) => {
    if (!Array.isArray(all) || all.length === 0) return null;
    const todayStartMs = _startOfDayMsLocal(Date.now());
    const dayMap = new Map();
    all.forEach((s) => {
      const ts = Number(s?.timestamp || s?.startTime || 0);
      if (!Number.isFinite(ts) || ts >= todayStartMs) return;
      const dayStartMs = _startOfDayMsLocal(ts);
      const list = dayMap.get(dayStartMs) || [];
      list.push(s);
      dayMap.set(dayStartMs, list);
    });
    const dayStarts = Array.from(dayMap.keys()).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
    dayStarts.forEach((dayStartMs) => {
      const increments = Array(TT_AVG_BUCKETS).fill(0);
      const daySessions = dayMap.get(dayStartMs) || [];
      daySessions.forEach((s) => {
        const ts = Number(s?.timestamp || s?.startTime || 0);
        const left = Number(s?.leftDurationSec || 0);
        const right = Number(s?.rightDurationSec || 0);
        const totalSec = Math.max(0, left + right);
        if (!Number.isFinite(ts) || totalSec <= 0) return;
        const idx = _bucketIndexCeilFromMs(ts);
        increments[idx] += totalSec / 3600;
      });
      let running = 0;
      for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => v / dayStarts.length),
      daysUsed: dayStarts.length,
      dayStarts
    };
  };

  const _normalizeSleepIntervalForAvg = (startMs, endMs, nowMs = Date.now()) => {
    let sMs = Number(startMs);
    let eMs = Number(endMs);
    if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
    if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
    if (eMs < sMs) sMs -= 86400000;
    if (eMs < sMs) return null;
    return { startMs: sMs, endMs: eMs };
  };

  const _addSleepOverlapToBuckets = (startMs, endMs, dayStartMs, increments) => {
    const dayEndMs = dayStartMs + 86400000;
    const overlapStart = Math.max(startMs, dayStartMs);
    const overlapEnd = Math.min(endMs, dayEndMs);
    if (overlapEnd <= overlapStart) return;
    const startBucket = Math.max(0, Math.floor((overlapStart - dayStartMs) / TT_AVG_BUCKET_MS));
    const endBucket = Math.min(TT_AVG_BUCKETS - 1, Math.floor((overlapEnd - dayStartMs - 1) / TT_AVG_BUCKET_MS));
    for (let i = startBucket; i <= endBucket; i += 1) {
      const bucketStart = dayStartMs + i * TT_AVG_BUCKET_MS;
      const bucketEnd = bucketStart + TT_AVG_BUCKET_MS;
      const overlap = Math.max(0, Math.min(overlapEnd, bucketEnd) - Math.max(overlapStart, bucketStart));
      if (overlap > 0) increments[i] += overlap;
    }
  };

  const _buildSleepAvgBuckets = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;
    const todayStartMs = _startOfDayMsLocal(Date.now());
    const normalized = sessions.map((s) => {
      if (!s?.startTime || !s?.endTime) return null;
      const norm = _normalizeSleepIntervalForAvg(s.startTime, s.endTime);
      return norm ? { startMs: norm.startMs, endMs: norm.endMs } : null;
    }).filter(Boolean);
    if (normalized.length === 0) return null;
    const daySet = new Set();
    normalized.forEach((s) => {
      let dayStart = _startOfDayMsLocal(s.startMs);
      const endDayStart = _startOfDayMsLocal(s.endMs);
      for (let ds = dayStart; ds <= endDayStart; ds += 86400000) {
        if (ds < todayStartMs) daySet.add(ds);
      }
    });
    const dayStarts = Array.from(daySet).sort((a, b) => b - a).slice(0, TT_AVG_DAYS);
    if (dayStarts.length === 0) return null;
    const dayIndex = new Map(dayStarts.map((d, i) => [d, i]));
    const perDayIncrements = dayStarts.map(() => Array(TT_AVG_BUCKETS).fill(0));
    normalized.forEach((s) => {
      let dayStart = _startOfDayMsLocal(s.startMs);
      const endDayStart = _startOfDayMsLocal(s.endMs);
      for (let ds = dayStart; ds <= endDayStart; ds += 86400000) {
        const idx = dayIndex.get(ds);
        if (idx == null) continue;
        _addSleepOverlapToBuckets(s.startMs, s.endMs, ds, perDayIncrements[idx]);
      }
    });
    const sumBuckets = Array(TT_AVG_BUCKETS).fill(0);
    perDayIncrements.forEach((increments) => {
      let running = 0;
      for (let i = 0; i < TT_AVG_BUCKETS; i += 1) {
        running += increments[i];
        sumBuckets[i] += running;
      }
    });
    return {
      buckets: sumBuckets.map((v) => (v / dayStarts.length) / 3600000),
      daysUsed: dayStarts.length,
      dayStarts
    };
  };

  const _calcFeedCumulativeAtBucket = (entries, bucketIdx) => {
    if (!Array.isArray(entries) || entries.length === 0) return 0;
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    entries.forEach((f) => {
      const ts = Number(f?.timestamp || 0);
      const oz = Number(f?.ounces || 0);
      if (!Number.isFinite(ts) || !Number.isFinite(oz) || oz <= 0) return;
      const idx = _bucketIndexCeilFromMs(ts);
      increments[idx] += oz;
    });
    let running = 0;
    for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
    }
    return running;
  };

  const _calcNursingCumulativeAtBucket = (entries, bucketIdx) => {
    if (!Array.isArray(entries) || entries.length === 0) return 0;
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    entries.forEach((s) => {
      const ts = Number(s?.timestamp || s?.startTime || 0);
      const left = Number(s?.leftDurationSec || 0);
      const right = Number(s?.rightDurationSec || 0);
      const totalSec = Math.max(0, left + right);
      if (!Number.isFinite(ts) || totalSec <= 0) return;
      const idx = _bucketIndexCeilFromMs(ts);
      increments[idx] += totalSec / 3600;
    });
    let running = 0;
    for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
    }
    return running;
  };

  const _calcSleepCumulativeAtBucket = (entries, bucketIdx, activeSleepSession = null) => {
    if ((!Array.isArray(entries) || entries.length === 0) && !(activeSleepSession && activeSleepSession.startTime)) return 0;
    const nowMs = Date.now();
    const dayStartMs = _startOfDayMsLocal(nowMs);
    const increments = Array(TT_AVG_BUCKETS).fill(0);
    (entries || []).forEach((s) => {
      const startMs = Number(s?._normStartTime || s?.startTime || 0);
      const endMs = Number(s?._normEndTime || s?.endTime || 0);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
      _addSleepOverlapToBuckets(startMs, endMs, dayStartMs, increments);
    });
    if (activeSleepSession && activeSleepSession.startTime) {
      const startMs = _normalizeSleepStartMs(activeSleepSession.startTime, nowMs);
      if (startMs) {
        _addSleepOverlapToBuckets(startMs, nowMs, dayStartMs, increments);
      }
    }
    let running = 0;
    for (let i = 0; i <= bucketIdx && i < TT_AVG_BUCKETS; i += 1) {
      running += increments[i];
    }
    return running / 3600000;
  };

  const totalConsumed = feedings.reduce((sum, f) => sum + f.ounces, 0);
  const targetOunces = babyWeight ? babyWeight * multiplier : 0;
  const remaining = Math.max(0, targetOunces - totalConsumed);
  const percentComplete = (totalConsumed / targetOunces) * 100;
  const sleepTargetHours = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number") ? sleepSettings.sleepTargetHours : 14;
  const sleepTargetMs = sleepTargetHours * 3600000;
  const activeExtraMs = activeSleep && activeSleep.startTime ? Math.max(0, Date.now() - _normalizeSleepStartMs(activeSleep.startTime)) : 0;
  const sleepTotalMsLive = sleepTodayMs + activeExtraMs;
  const sleepPercent = sleepTargetMs > 0 ? (sleepTotalMsLive / sleepTargetMs) * 100 : 0;
  const sleepTotalHours = sleepTotalMsLive / 3600000;
  const sleepRemainingHours = Math.max(0, sleepTargetHours - sleepTotalHours);
  const sleepDeltaHours = (sleepTotalMsLive - sleepYesterdayMs) / 3600000;
  const feedingDeltaOz = totalConsumed - yesterdayConsumed;

  const _fmtDelta = (n) => {
    const s = Math.abs(Number(n || 0)).toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };

  const feedingDeltaLabel = `${feedingDeltaOz >= 0 ? '+' : '-'}${_fmtDelta(feedingDeltaOz)} oz`;
  const feedingDeltaIsGood = feedingDeltaOz >= 0;
  const sleepDeltaLabel = `${sleepDeltaHours >= 0 ? '+' : '-'}${_fmtDelta(sleepDeltaHours)} hrs`;
  const sleepDeltaIsGood = sleepDeltaHours >= 0;

  React.useEffect(() => {
    if (!avgCacheKey) return;
    const local = _readAvgCacheLocal();
    const remote = kidDataState?.avgByTime || null;
    const chosen = _pickLatestAvgCache(local, remote);
    if (chosen && !_avgCacheEqual(chosen, avgByTimeCacheRef.current)) {
      avgByTimeCacheRef.current = chosen;
      setAvgByTimeCache(chosen);
      _writeAvgCacheLocal(chosen);
    } else if (!chosen) {
      avgByTimeCacheRef.current = null;
      setAvgByTimeCache(null);
    }
  }, [avgCacheKey, kidDataState]);

  React.useEffect(() => {
    if (!avgCacheKey || !hasLoadedOnce) return;
    const nextFeed = _buildFeedAvgBuckets(allFeedings);
    const nextNursing = _buildNursingAvgBuckets(allNursingSessions);
    const nextSleep = _buildSleepAvgBuckets(allSleepSessions);
    if (!nextFeed && !nextNursing && !nextSleep) {
      avgByTimeCacheRef.current = null;
      setAvgByTimeCache(null);
      _writeAvgCacheLocal(null);
      const now = Date.now();
      if (now - lastAvgByTimeWriteRef.current > 60000) {
        lastAvgByTimeWriteRef.current = now;
        firestoreStorage.updateKidData({ avgByTime: null });
        setKidDataState((prev) => {
          if (!prev) return prev;
          const nextState = { ...prev };
          delete nextState.avgByTime;
          return nextState;
        });
      }
      return;
    }
    const next = {
      version: 1,
      computedAt: Date.now(),
      feed: nextFeed,
      nursing: nextNursing,
      sleep: nextSleep
    };
    if (_avgCacheEqual(next, avgByTimeCacheRef.current)) return;
    avgByTimeCacheRef.current = next;
    setAvgByTimeCache(next);
    _writeAvgCacheLocal(next);
    const now = Date.now();
    if (now - lastAvgByTimeWriteRef.current > 60000) {
      lastAvgByTimeWriteRef.current = now;
      firestoreStorage.updateKidData({ avgByTime: next });
      setKidDataState((prev) => ({ ...(prev || {}), avgByTime: next }));
    }
  }, [avgCacheKey, allFeedings, allNursingSessions, allSleepSessions, hasLoadedOnce]);

  const nowBucketIndex = _bucketIndexCeilFromMs(Date.now());
  const feedAvgValue = avgByTimeCache?.feed?.buckets?.[nowBucketIndex];
  const nursingAvgValue = avgByTimeCache?.nursing?.buckets?.[nowBucketIndex];
  const sleepAvgValue = avgByTimeCache?.sleep?.buckets?.[nowBucketIndex];
  const feedDaysUsed = avgByTimeCache?.feed?.daysUsed || 0;
  const nursingDaysUsed = avgByTimeCache?.nursing?.daysUsed || 0;
  const sleepDaysUsed = avgByTimeCache?.sleep?.daysUsed || 0;
  const todayFeedValue = _calcFeedCumulativeAtBucket(feedings, nowBucketIndex);
  const todayNursingValue = _calcNursingCumulativeAtBucket(nursingSessions, nowBucketIndex);
  const todaySleepValue = _calcSleepCumulativeAtBucket(sleepSessions, nowBucketIndex, activeSleep);
  const feedingComparison = isToday() && Number.isFinite(feedAvgValue) && feedDaysUsed > 0
    ? { delta: todayFeedValue - feedAvgValue, unit: 'oz', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;
  const nursingComparison = isToday() && Number.isFinite(nursingAvgValue) && nursingDaysUsed > 0
    ? { delta: todayNursingValue - nursingAvgValue, unit: 'hrs', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;
  const sleepComparison = isToday() && Number.isFinite(sleepAvgValue) && sleepDaysUsed > 0
    ? { delta: todaySleepValue - sleepAvgValue, unit: 'hrs', evenEpsilon: TT_AVG_EVEN_EPSILON }
    : null;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__ttAvgByTimeDebug = () => {
      const bucketMinutes = nowBucketIndex * TT_AVG_BUCKET_MINUTES;
      const bucketLabel = (() => {
        const now = new Date();
        const hh = Math.min(23, Math.floor(bucketMinutes / 60));
        const mm = Math.min(59, bucketMinutes % 60);
        const d = new Date(now);
        d.setHours(hh, mm, 0, 0);
        return formatTime12Hour(d);
      })();
      return {
        bucketIndex: nowBucketIndex,
        bucketMinutes,
        bucketLabel,
        feedDaysUsed,
        nursingDaysUsed,
        sleepDaysUsed,
        feedAvgValue,
        nursingAvgValue,
        sleepAvgValue,
        todayFeedValue,
        todayNursingValue,
        todaySleepValue,
        feedingDelta: feedingComparison ? feedingComparison.delta : null,
        nursingDelta: nursingComparison ? nursingComparison.delta : null,
        sleepDelta: sleepComparison ? sleepComparison.delta : null
      };
    };
    return () => {
      if (window.__ttAvgByTimeDebug) delete window.__ttAvgByTimeDebug;
    };
  }, [
    nowBucketIndex,
    feedDaysUsed,
    nursingDaysUsed,
    sleepDaysUsed,
    feedAvgValue,
    nursingAvgValue,
    sleepAvgValue,
    todayFeedValue,
    todayNursingValue,
    todaySleepValue,
    feedingComparison,
    nursingComparison,
    sleepComparison,
    formatTime12Hour
  ]);

  // Format data for new TrackerCard components
  // Use previous data during date transitions to prevent showing zeros
  const currentFeedingData = formatFeedingsForCard(feedings, targetOunces, currentDate);
  const currentNursingData = formatNursingSessionsForCard(nursingSessions, currentDate);
  const currentSolidsData = formatSolidsSessionsForCard(solidsSessions, currentDate);
  const currentSleepData = formatSleepSessionsForCard(sleepSessions, sleepTargetHours, currentDate, activeSleep);
  const currentDiaperData = formatDiaperChangesForCard(diaperChanges, currentDate);
  
  const feedingCardData = isDateTransitioning && prevFeedingCardData 
    ? prevFeedingCardData 
    : currentFeedingData;
    
  const nursingCardData = isDateTransitioning && prevNursingCardData
    ? prevNursingCardData
    : currentNursingData;

  const solidsCardData = isDateTransitioning && prevSolidsCardData
    ? prevSolidsCardData
    : currentSolidsData;

  const sleepCardData = isDateTransitioning && prevSleepCardData 
    ? prevSleepCardData 
    : currentSleepData;

  const diaperCardData = isDateTransitioning && prevDiaperCardData
    ? prevDiaperCardData
    : currentDiaperData;
  
  // End transition when both loaders complete
  React.useEffect(() => {
    if (isDateTransitioning && transitionPending === 0) {
      setIsDateTransitioning(false);
    }
  }, [isDateTransitioning, transitionPending]);

  // Clear previous data when transition completes
  React.useEffect(() => {
    if (!isDateTransitioning && (prevFeedingCardData || prevNursingCardData || prevSolidsCardData || prevSleepCardData || prevDiaperCardData)) {
      setPrevFeedingCardData(null);
      setPrevNursingCardData(null);
      setPrevSolidsCardData(null);
      setPrevSleepCardData(null);
      setPrevDiaperCardData(null);
    }
  }, [isDateTransitioning, prevFeedingCardData, prevNursingCardData, prevSolidsCardData, prevSleepCardData, prevDiaperCardData]);

  // Handlers for timeline item clicks
  const handleFeedItemClick = (entry) => {
    setSelectedFeedEntry(entry);
    setShowFeedDetailSheet(true);
  };

  const handleSleepItemClick = (entry) => {
    // If it's an active sleep entry, open input sheet in sleep mode
    if (entry && entry.isActive) {
      if (typeof onRequestOpenInputSheet === 'function') {
        onRequestOpenInputSheet('sleep');
      }
      return;
    }
    setSelectedSleepEntry(entry);
    setShowSleepDetailSheet(true);
  };

  const handleDiaperItemClick = (entry) => {
    setSelectedDiaperEntry(entry);
    setShowDiaperDetailSheet(true);
  };

  // Calculate data for new card
  const lastFeeding = getLastFeeding();
  const lastFeedingTime = lastFeeding ? new Date(lastFeeding.timestamp) : new Date();
  const lastFeedingAmount = lastFeeding ? lastFeeding.ounces : 0;
  const lastSleep = getLastSleep();
  const lastSleepTime = lastSleep ? new Date(lastSleep.startTime) : new Date();
  const lastSleepDuration = lastSleep ? calculateSleepDurationMinutes(lastSleep) : 0;
  const isCurrentlySleeping = !!activeSleep;
  const feedingPercent = targetOunces > 0 ? Math.min(100, (totalConsumed / targetOunces) * 100) : 0;
  // sleepPercent is already calculated above (line 2795)

  const chevronColor = 'var(--tt-text-tertiary)'; // match TrackerCard timeline chevron token
  // Disabled but still visible against the track (esp. in dark mode)
  const chevronDisabledColor = 'var(--tt-nav-disabled)';
  const dateNavTrackBg = 'var(--tt-subtle-surface)';
  const dateNavDividerColor = 'var(--tt-nav-divider)';
  const isCardSyncing = loading || (isDateTransitioning && transitionPending > 0);

  // Add a little bottom padding so the last card isn't obscured by mobile safe-area / nav.
  const HorizontalCalendar = (window.TT && window.TT.shared && window.TT.shared.HorizontalCalendar) || null;
  const NextUpCard = (window.TT && window.TT.shared && window.TT.shared.NextUpCard) || null;
  const nextUpEvent = null;
  const allowSleepCard = !!activityVisibilitySafe.sleep;
  const allowFeedingCard = !!activityVisibilitySafe.bottle;
  const allowNursingCard = !!activityVisibilitySafe.nursing;
  const allowSolidsCard = !!activityVisibilitySafe.solids;
  const allowDiaperCard = !!activityVisibilitySafe.diaper;
  const activeSleepForUi = allowSleepCard ? activeSleep : null;
  const nextUpBabyState = activeSleepForUi && activeSleepForUi.startTime ? 'sleeping' : 'awake';
  const nextUpSleepStart = activeSleepForUi && activeSleepForUi.startTime ? activeSleepForUi.startTime : null;
  const handleToggleActivitySheet = () => {
    if (typeof onRequestToggleActivitySheet === 'function') {
      onRequestToggleActivitySheet();
    }
  };
  const GearIcon = (props) => React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 256 256",
      fill: "currentColor"
    },
    React.createElement('path', {
      d: isActivitySheetOpen
        ? "M216,130.16q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.6,107.6,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.29,107.29,0,0,0-26.25-10.86,8,8,0,0,0-7.06,1.48L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.6,107.6,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"
        : "M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"
    })
  );
  const gearButton = React.createElement('button', {
    type: 'button',
    onClick: handleToggleActivitySheet,
    className: "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
    style: {
      backgroundColor: 'var(--tt-subtle-surface)',
      borderColor: 'var(--tt-card-border)',
      color: 'var(--tt-text-primary)'
    },
    'aria-label': 'Show & hide activities',
    'aria-pressed': !!isActivitySheetOpen
  }, React.createElement(GearIcon, { width: 26, height: 26, style: { display: 'block' } }));
  
  return React.createElement('div', { className: "space-y-4" },

    // New TrackerCard Components (v4)
    window.TrackerCard && React.createElement(React.Fragment, null,
      // DEBUG: a visible marker that proves we entered the tracker-cards block.
      __ttDebugCardsOn() && React.createElement(
        'div',
        {
          id: 'tt-debug-cards-marker',
          style: {
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid var(--tt-nav-pill-border)',
            fontSize: 12,
            opacity: 0.9,
            marginBottom: 12
          }
        },
        `DEBUG cards block: ui=v4 hasTrackerCard=${!!window.TrackerCard} feedings=${Array.isArray(feedings) ? feedings.length : '?'} sleepSessions=${Array.isArray(sleepSessions) ? sleepSessions.length : '?'} loading=${!!loading}`
      ),
      // HorizontalCalendar in v4 (moved to body, above What's Next card)
      HorizontalCalendar && React.createElement('div', { 
        style: { marginBottom: '16px' }
      },
        React.createElement(HorizontalCalendar, {
          key: `calendar-${calendarMountKey}`,
          initialDate: currentDate,
          onDateSelect: handleDateSelectFromCalendar,
          headerVariant: 'v4',
          hideBody: true,
          hideNav: true,
          headerRight: gearButton,
          // headerPhotoUrl: kidPhotoUrl (v4 only)
          // headerPhotoAlt: kidDisplayName || 'Baby' (v4 only)
        })
      ),
      // What's Next Card - only show v4 NextUpCard while sleep is active
      // Show card if it's today OR if it's animating out
      allowSleepCard && (isToday() || whatsNextCardAnimating === 'exiting') && (
        (NextUpCard && activeSleepForUi && activeSleepForUi.startTime) ? React.createElement(NextUpCard, {
          babyState: nextUpBabyState,
          sleepStartTime: nextUpSleepStart,
          nextEvent: nextUpEvent,
          onWakeUp: () => requestInputSheetOpen('sleep'),
          onLogFeed: () => requestInputSheetOpen('feeding'),
          onStartSleep: () => requestInputSheetOpen('sleep'),
          className: `${whatsNextCardAnimating === 'entering' ? 'timeline-item-enter' : whatsNextCardAnimating === 'exiting' ? 'timeline-item-exit' : ''}`,
          style: {
            overflow: whatsNextCardAnimating === 'exiting' ? 'hidden' : 'visible',
            marginBottom: whatsNextCardAnimating === 'exiting' ? '1rem' : '16px'
          }
        }) : null
      ),

      activityOrderSafe.map((key) => {
        if (key === 'bottle') {
          if (!allowFeedingCard) return null;
          return React.createElement(window.TrackerCard, {
            key: 'bottle',
            mode: 'feeding',
            total: feedingCardData.total,
            target: feedingCardData.target,
            volumeUnit: preferredVolumeUnit,
            timelineItems: feedingCardData.timelineItems,
            entriesTodayCount: Array.isArray(feedingCardData.timelineItems) ? feedingCardData.timelineItems.length : 0,
            lastEntryTime: feedingCardData.lastEntryTime,
            comparison: feedingComparison,
            rawFeedings: allFeedings,
            rawSleepSessions: [],
            currentDate: currentDate,
            syncing: isCardSyncing,
            disableAccordion: true,
            onCardTap: handleV4CardTap,
            onItemClick: handleFeedItemClick,
            onDelete: async () => {
              // Small delay for animation
              await new Promise(resolve => setTimeout(resolve, 200));
              await loadFeedings();
            }
          });
        }
        if (key === 'nursing') {
          if (!allowNursingCard) return null;
          return React.createElement(window.TrackerCard, {
            key: 'nursing',
            mode: 'nursing',
            total: nursingCardData.total,
            target: null,
            volumeUnit: preferredVolumeUnit,
            timelineItems: nursingCardData.timelineItems,
            entriesTodayCount: Array.isArray(nursingCardData.timelineItems) ? nursingCardData.timelineItems.length : 0,
            lastEntryTime: nursingCardData.lastEntryTime,
            comparison: nursingComparison,
            rawFeedings: [],
            rawSleepSessions: [],
            currentDate: currentDate,
            syncing: isCardSyncing,
            disableAccordion: true,
            onCardTap: handleV4CardTap,
            onItemClick: handleFeedItemClick,
            onDelete: async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              await loadNursingSessions();
            }
          });
        }
        if (key === 'solids') {
          if (!allowSolidsCard) return null;
          return React.createElement(window.TrackerCard, {
            key: 'solids',
            mode: 'solids',
            total: solidsCardData.total,
            target: null,
            volumeUnit: null,
            timelineItems: solidsCardData.timelineItems,
            entriesTodayCount: Array.isArray(solidsCardData.timelineItems) ? solidsCardData.timelineItems.length : 0,
            lastEntryTime: solidsCardData.lastEntryTime,
            comparison: solidsCardData.comparison,
            rawFeedings: [],
            rawSleepSessions: [],
            currentDate: currentDate,
            syncing: isCardSyncing,
            disableAccordion: true,
            onCardTap: handleV4CardTap,
            onItemClick: handleFeedItemClick,
            onDelete: async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              await loadSolidsSessions();
            }
          });
        }
        if (key === 'sleep') {
          if (!allowSleepCard) return null;
          return React.createElement(window.TrackerCard, {
            key: 'sleep',
            mode: 'sleep',
            total: sleepCardData.total,
            target: sleepCardData.target,
            volumeUnit: preferredVolumeUnit,
            timelineItems: sleepCardData.timelineItems,
            entriesTodayCount: sleepTodayCount,
            lastEntryTime: sleepCardData.lastEntryTime,
            comparison: sleepComparison,
            rawFeedings: [],
            rawSleepSessions: allSleepSessions,
            currentDate: currentDate,
            syncing: isCardSyncing,
            disableAccordion: true,
            onCardTap: handleV4CardTap,
            onItemClick: handleSleepItemClick,
            onActiveSleepClick: () => requestInputSheetOpen('sleep'),
            onDelete: async () => {
              // Small delay for animation
              await new Promise(resolve => setTimeout(resolve, 200));
              await loadSleepSessions();
            }
          });
        }
        if (key === 'diaper') {
          if (!allowDiaperCard) return null;
          return React.createElement(window.TrackerCard, {
            key: 'diaper',
            mode: 'diaper',
            total: diaperCardData.total,
            target: null,
            volumeUnit: preferredVolumeUnit,
            timelineItems: diaperCardData.timelineItems,
            lastEntryTime: diaperCardData.lastEntryTime,
            rawFeedings: [],
            rawSleepSessions: [],
            currentDate: currentDate,
            syncing: isCardSyncing,
            disableAccordion: true,
            onCardTap: handleV4CardTap,
            onItemClick: handleDiaperItemClick,
            onDelete: async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              await loadDiaperChanges();
            }
          });
        }
        return null;
      }),
    ),

    // Detail Sheet Instances
    window.TTFeedDetailSheet && React.createElement(window.TTFeedDetailSheet, {
      isOpen: showFeedDetailSheet,
      onClose: () => {
        setShowFeedDetailSheet(false);
        setSelectedFeedEntry(null);
      },
      entry: selectedFeedEntry,
      onDelete: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadFeedings();
      },
      onSave: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadFeedings();
      }
    }),
    window.TTSleepDetailSheet && React.createElement(window.TTSleepDetailSheet, {
      isOpen: showSleepDetailSheet,
      onClose: () => {
        setShowSleepDetailSheet(false);
        setSelectedSleepEntry(null);
      },
      entry: selectedSleepEntry,
      onDelete: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadSleepSessions();
      },
      onSave: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadSleepSessions();
      }
    }),
    window.TTDiaperDetailSheet && React.createElement(window.TTDiaperDetailSheet, {
      isOpen: showDiaperDetailSheet,
      onClose: () => {
        setShowDiaperDetailSheet(false);
        setSelectedDiaperEntry(null);
      },
      entry: selectedDiaperEntry,
      onDelete: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadDiaperChanges();
      },
      onSave: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadDiaperChanges();
      }
    })
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.TrackerTab = TrackerTab;
// DEBUG helper you can run manually in console:
// window.__ttDumpCardsDom()
if (typeof window !== 'undefined' && !window.__ttDumpCardsDom) {
  window.__ttDumpCardsDom = () => {
    const marker = document.getElementById('tt-debug-cards-marker');
    const divs = document.querySelectorAll('#tt-debug-cards-marker, [data-tt-card], .tt-tracker-card, .rounded-2xl');
    console.log('[TT][Cards][DOM]', {
      hasMarker: !!marker,
      count: divs ? divs.length : 0
    });
    return { hasMarker: !!marker, count: divs ? divs.length : 0 };
  };
}
// Helper: is there already a sleep event near a given time?
const hasNearbySleep = (events, t, windowMin = 45) => {
  const tMs = t.getTime();
  const wMs = windowMin * 60 * 1000;
  return (events || []).some(e =>
    e?.type === 'sleep' &&
    e?.time instanceof Date &&
    Math.abs(e.time.getTime() - tMs) <= wMs
  );
};
