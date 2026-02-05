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
const TrackerTab = ({ user, kidId, familyId, onRequestOpenInputSheet = null, activeTab = null }) => {
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
  const [ounces, setOunces] = React.useState('');
  const [customTime, setCustomTime] = React.useState('');
  const [feedings, setFeedings] = React.useState([]);
  const [allFeedings, setAllFeedings] = React.useState([]);
  const [sleepSessions, setSleepSessions] = React.useState([]);
  const [allSleepSessions, setAllSleepSessions] = React.useState([]);
  const [sleepSettings, setSleepSettings] = React.useState(null);
  const [yesterdayConsumed, setYesterdayConsumed] = React.useState(0);
  const [yesterdayFeedingCount, setYesterdayFeedingCount] = React.useState(0);
  const [sleepTodayMs, setSleepTodayMs] = React.useState(0);
  const [sleepTodayCount, setSleepTodayCount] = React.useState(0);
  const [sleepYesterdayMs, setSleepYesterdayMs] = React.useState(0);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [kidPhotoUrl, setKidPhotoUrl] = React.useState(null);
  const [kidDisplayName, setKidDisplayName] = React.useState(null);
  const [kidBirthDate, setKidBirthDate] = React.useState(null);
  const [calendarMountKey, setCalendarMountKey] = React.useState(0);
  const prevActiveTabRef = React.useRef(activeTab);
  // State for smooth date transitions - preserve previous values while loading
  const [prevFeedingCardData, setPrevFeedingCardData] = React.useState(null);
  const [prevSleepCardData, setPrevSleepCardData] = React.useState(null);
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
  const requestInputSheetOpen = React.useCallback((mode = 'feeding') => {
    if (typeof onRequestOpenInputSheet === 'function') {
      onRequestOpenInputSheet(mode);
    }
  }, [onRequestOpenInputSheet]);
  const handleV4CardTap = React.useCallback((e, payload) => {
    if (typeof window === 'undefined') return;
    const nextFilter = payload?.mode === 'feeding' ? 'feed' : payload?.mode || null;
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
  const [selectedFeedEntry, setSelectedFeedEntry] = React.useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = React.useState(null);

  // One-shot "gates" log whenever key render inputs change.
  React.useEffect(() => {
    if (!__ttDebugCardsOn()) return;
    __ttDebugCardsLog('gates', {
      hasTrackerCard: typeof window !== 'undefined' && !!window.TrackerCard,
      kidId: kidId || null,
      loading,
      // These names should exist in your component; if not, the log will show "undefined".
      feedingsCount: Array.isArray(feedings) ? feedings.length : typeof feedings,
      sleepSessionsCount: Array.isArray(sleepSessions) ? sleepSessions.length : typeof sleepSessions
    });
  }, [
    kidId,
    loading,
    typeof window !== 'undefined' && window.TrackerCard,
    feedings,
    sleepSessions
  ]);

  // Sleep logging state
  const useActiveSleep = (typeof window !== 'undefined' && window.TT?.shared?.useActiveSleep)
    ? window.TT.shared.useActiveSleep
    : (() => ({ activeSleep: null, activeSleepLoaded: true }));
  const { activeSleep } = useActiveSleep(kidId);
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
            rgba(255, 255, 255, 0.5),
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
      const interval = setInterval(loadFeedings, 5000);
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

  React.useEffect(() => {
    const handleInputSheetAdded = (event) => {
      const mode = event?.detail?.mode;
      if (mode === 'feeding') {
        loadFeedings();
        return;
      }
      if (mode === 'sleep') {
        loadSleepSessions();
      }
    };
    window.addEventListener('tt-input-sheet-added', handleInputSheetAdded);
    return () => window.removeEventListener('tt-input-sheet-added', handleInputSheetAdded);
  }, [loadFeedings, loadSleepSessions]);

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
      }
      const ss = await firestoreStorage.getSleepSettings();
      setSleepSettings(ss || null);
      const kidData = await firestoreStorage.getKidData();
      setKidPhotoUrl(kidData?.photoURL || null);
      setKidDisplayName(kidData?.name || null);
      setKidBirthDate(kidData?.birthDate || null);
      await loadFeedings();
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
    const currentSleepData = formatSleepSessionsForCard(sleepSessions, targetHrs, currentDate, activeSleep);
    setPrevFeedingCardData(currentFeedingData);
    setPrevSleepCardData(currentSleepData);
    // Start new transition and expect 2 completions
    transitionIdRef.current += 1;
    setTransitionPending(2);
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
    const currentSleepData = formatSleepSessionsForCard(sleepSessions, targetHrs, currentDate, activeSleep);
    setPrevFeedingCardData(currentFeedingData);
    setPrevSleepCardData(currentSleepData);
    // Start new transition and expect 2 completions
    transitionIdRef.current += 1;
    setTransitionPending(2);
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

  // Format data for new TrackerCard components
  // Use previous data during date transitions to prevent showing zeros
  const currentFeedingData = formatFeedingsForCard(feedings, targetOunces, currentDate);
  const currentSleepData = formatSleepSessionsForCard(sleepSessions, sleepTargetHours, currentDate, activeSleep);
  
  const feedingCardData = isDateTransitioning && prevFeedingCardData 
    ? prevFeedingCardData 
    : currentFeedingData;
    
  const sleepCardData = isDateTransitioning && prevSleepCardData 
    ? prevSleepCardData 
    : currentSleepData;
  
  // End transition when both loaders complete
  React.useEffect(() => {
    if (isDateTransitioning && transitionPending === 0) {
      setIsDateTransitioning(false);
    }
  }, [isDateTransitioning, transitionPending]);

  // Clear previous data when transition completes
  React.useEffect(() => {
    if (!isDateTransitioning && (prevFeedingCardData || prevSleepCardData)) {
      setPrevFeedingCardData(null);
      setPrevSleepCardData(null);
    }
  }, [isDateTransitioning, prevFeedingCardData, prevSleepCardData]);

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

  if (loading && !hasLoadedOnce) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { 
        style: { color: 'var(--tt-text-secondary)' }
      }, 'Loading...')
    );
  }

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

  const isDark = document.documentElement.classList.contains('dark');
  const chevronColor = 'var(--tt-text-tertiary)'; // match TrackerCard timeline chevron token
  // Disabled but still visible against the track (esp. in dark mode)
  const chevronDisabledColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.24)';
  const dateNavTrackBg = 'var(--tt-subtle-surface)';
  const dateNavDividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgb(243, 244, 246)';

  // Add a little bottom padding so the last card isn't obscured by mobile safe-area / nav.
  const HorizontalCalendar = (window.TT && window.TT.shared && window.TT.shared.HorizontalCalendar) || null;
  const NextUpCard = (window.TT && window.TT.shared && window.TT.shared.NextUpCard) || null;
  const nextUpEvent = null;
  const nextUpBabyState = activeSleep && activeSleep.startTime ? 'sleeping' : 'awake';
  const nextUpSleepStart = activeSleep && activeSleep.startTime ? activeSleep.startTime : null;
  
  return React.createElement('div', { className: "space-y-4" },
    (loading && hasLoadedOnce) && React.createElement('div', {
      className: "flex items-center justify-center",
      style: { marginTop: '-6px' }
    },
      React.createElement('div', {
        className: "text-[12px] font-medium px-3 py-1 rounded-full",
        style: {
          backgroundColor: 'var(--tt-subtle-surface)',
          color: 'var(--tt-text-secondary)'
        }
      }, 'Updating…')
    ),

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
            border: '1px solid rgba(255,255,255,0.18)',
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
          // headerPhotoUrl: kidPhotoUrl (v4 only)
          // headerPhotoAlt: kidDisplayName || 'Baby' (v4 only)
        })
      ),
      // What's Next Card - only show v4 NextUpCard while sleep is active
      // Show card if it's today OR if it's animating out
      (isToday() || whatsNextCardAnimating === 'exiting') && (
        (NextUpCard && activeSleep && activeSleep.startTime) ? React.createElement(NextUpCard, {
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

      React.createElement(window.TrackerCard, {
        mode: 'feeding',
        total: feedingCardData.total,
        target: feedingCardData.target,
        timelineItems: feedingCardData.timelineItems,
        entriesTodayCount: Array.isArray(feedingCardData.timelineItems) ? feedingCardData.timelineItems.length : 0,
        lastEntryTime: feedingCardData.lastEntryTime,
        rawFeedings: allFeedings,
        rawSleepSessions: [],
        currentDate: currentDate,
        disableAccordion: true,
        onCardTap: handleV4CardTap,
        onItemClick: handleFeedItemClick,
        onDelete: async () => {
          // Small delay for animation
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadFeedings();
        }
      }),
      React.createElement(window.TrackerCard, {
        mode: 'sleep',
        total: sleepCardData.total,
        target: sleepCardData.target,
        timelineItems: sleepCardData.timelineItems,
        entriesTodayCount: sleepTodayCount,
        lastEntryTime: sleepCardData.lastEntryTime,
        rawFeedings: [],
        rawSleepSessions: allSleepSessions,
        currentDate: currentDate,
        disableAccordion: true,
        onCardTap: handleV4CardTap,
        onItemClick: handleSleepItemClick,
        onActiveSleepClick: () => requestInputSheetOpen('sleep'),
        onDelete: async () => {
          // Small delay for animation
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadSleepSessions();
        }
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
