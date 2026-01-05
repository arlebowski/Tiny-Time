// ========================================
// TINY TRACKER - PART 4  
// Tracker Tab - Main Feeding Interface
// ========================================

const TrackerTab = ({ user, kidId, familyId }) => {
  // Feature flag for new UI - controlled by localStorage (can be toggled from UI Lab)
  const [useNewUI, setUseNewUI] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('tt_use_new_ui');
      return stored !== null ? stored === 'true' : true; // Default to true
    }
    return true;
  });
  
  // Listen for changes to the feature flag
  React.useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('tt_use_new_ui');
        setUseNewUI(stored !== null ? stored === 'true' : true);
      }
    };
    
    // Listen for storage events (when changed from another tab/window)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab changes)
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [ounces, setOunces] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [feedings, setFeedings] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [yesterdayConsumed, setYesterdayConsumed] = useState(0);
  const [yesterdayFeedingCount, setYesterdayFeedingCount] = useState(0);
  const [sleepTodayMs, setSleepTodayMs] = useState(0);
  const [sleepTodayCount, setSleepTodayCount] = useState(0);
  const [sleepYesterdayMs, setSleepYesterdayMs] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  // State for smooth date transitions - preserve previous values while loading
  const [prevFeedingCardData, setPrevFeedingCardData] = useState(null);
  const [prevSleepCardData, setPrevSleepCardData] = useState(null);
  const [isDateTransitioning, setIsDateTransitioning] = useState(false);
  const prevDateRef = React.useRef(currentDate);
  const [editingFeedingId, setEditingFeedingId] = useState(null);
  const [editOunces, setEditOunces] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingSleepId, setEditingSleepId] = useState(null);
  const [sleepEditStartStr, setSleepEditStartStr] = useState('');
  const [sleepEditEndStr, setSleepEditEndStr] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [logMode, setLogMode] = useState('feeding');
  const [cardVisible, setCardVisible] = useState(false);
  const cardRef = React.useRef(null);
  
  // Detail sheet state
  const [showFeedDetailSheet, setShowFeedDetailSheet] = useState(false);
  const [showSleepDetailSheet, setShowSleepDetailSheet] = useState(false);
  const [selectedFeedEntry, setSelectedFeedEntry] = useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = useState(null);
  const [showInputSheet, setShowInputSheet] = useState(false);
  const [inputSheetMode, setInputSheetMode] = useState('feeding');

  // Consistent icon-button styling for edit actions (✓ / ✕) — match Family tab
  const TRACKER_ICON_BTN_BASE =
    "h-10 w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center";
  const TRACKER_ICON_BTN_OK = TRACKER_ICON_BTN_BASE + " text-green-600";
  const TRACKER_ICON_BTN_CANCEL = TRACKER_ICON_BTN_BASE + " text-gray-500";
  const TRACKER_ICON_SIZE = "w-5 h-5";

  // Ensure edit-grid items never overflow/overhang on iOS (time inputs have stubborn intrinsic sizing)
  useEffect(() => {
    try {
      if (document.getElementById('tt-tracker-edit-style')) return;
      const st = document.createElement('style');
      st.id = 'tt-tracker-edit-style';
      st.textContent = `
        .trackerEditCard .trackerEditGrid { width: 100%; }
        .trackerEditCard .trackerEditGrid > * { min-width: 0; }
        .trackerEditCard input { min-width: 0; max-width: 100%; }
        .trackerEditCard input[type="time"] { -webkit-appearance: none; appearance: none; }
      `;
      document.head.appendChild(st);
    } catch (e) {}
  }, []);

  const TrackerEditActions = ({ onSave, onCancel }) =>
    React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
      React.createElement('button', { type: 'button', onClick: onSave, className: TRACKER_ICON_BTN_OK, title: "Save" },
        React.createElement(Check, { className: TRACKER_ICON_SIZE })
      ),
      React.createElement('button', { type: 'button', onClick: onCancel, className: TRACKER_ICON_BTN_CANCEL, title: "Cancel" },
        React.createElement(X, { className: TRACKER_ICON_SIZE })
      )
    );

  // Sleep logging state
  const [activeSleep, setActiveSleep] = useState(null);
  const [sleepElapsedMs, setSleepElapsedMs] = useState(0);
  const [sleepStartStr, setSleepStartStr] = useState('');
  const [sleepEndStr, setSleepEndStr] = useState('');
  const [editingSleepField, setEditingSleepField] = useState(null); // 'start' | 'end' | null
  const sleepIntervalRef = React.useRef(null);
  const [lastActiveSleepId, setLastActiveSleepId] = useState(null);

  useEffect(() => {
    if (!kidId) return;
    return firestoreStorage.subscribeActiveSleep((session) => {
      setActiveSleep(session);
    });
  }, [kidId]);

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

  // Inject a calm zZz keyframe animation (used for the Sleep in-progress indicator)
  useEffect(() => {
    try {
      if (document.getElementById('tt-zzz-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-zzz-style';
      s.textContent = `@keyframes ttZzz{0%{opacity:0;transform:translateY(2px)}20%{opacity:.9}80%{opacity:.9;transform:translateY(-4px)}100%{opacity:0;transform:translateY(-6px)}}`;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

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
    try {
      const sessions = await firestoreStorage.getSleepSessionsLastNDays(8);
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
      setIsDateTransitioning(false); // Clear transitioning state after data loads
    } catch (err) {
      console.error("Failed to load sleep sessions", err);
      setIsDateTransitioning(false);
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
    try {
      const allFeedings = await firestoreStorage.getFeedingsLastNDays(8);
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

      const yFeedings = allFeedings.filter(f => f.timestamp >= yStart.getTime() && f.timestamp <= yEnd.getTime());
      const yConsumed = yFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
      setYesterdayConsumed(yConsumed);
      setYesterdayFeedingCount(yFeedings.length);

      const dayFeedings = allFeedings.filter(f =>
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
      setIsDateTransitioning(false); // Clear transitioning state after data loads
    } catch (error) {
      console.error('Error loading feedings:', error);
      setIsDateTransitioning(false);
    }
  };

  const loadData = async () => {
    if (!kidId) return;
    try {
      const settings = await firestoreStorage.getSettings();
      if (settings) {
        if (settings.babyWeight) setBabyWeight(settings.babyWeight);
        if (settings.multiplier) setMultiplier(settings.multiplier);
      }
      const ss = await firestoreStorage.getSleepSettings();
      setSleepSettings(ss || null);
      await loadFeedings();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const handleStartEdit = (feeding) => {
    setEditingFeedingId(feeding.id);
    setEditOunces(feeding.ounces.toString());
    const date = new Date(feeding.timestamp);
    setEditTime(date.toTimeString().slice(0, 5));
  };

  const handleSaveEdit = async () => {
    const amount = parseFloat(editOunces);
    if (!amount || amount <= 0) return;

    const [hours, minutes] = editTime.split(':');
    const feedingTime = new Date(currentDate);
    feedingTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await firestoreStorage.updateFeeding(editingFeedingId, amount, feedingTime.getTime());
      setEditingFeedingId(null);
      await loadFeedings(); // Refresh immediately
    } catch (error) {
      console.error('Error updating feeding:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingFeedingId(null);
  };

  const handleDeleteFeeding = async (feedingId) => {
    if (!confirm('Delete this feeding?')) return;
    try {
      await firestoreStorage.deleteFeeding(feedingId);
      await loadFeedings(); // Refresh immediately
    } catch (error) {
      console.error('Error deleting feeding:', error);
    }
  };

  const handleStartEditSleep = (session) => {
    setEditingSleepId(session.id);
    setSleepEditStartStr(_toHHMM(session.startTime));
    setSleepEditEndStr(_toHHMM(session.endTime));
  };

  const handleSaveSleepEdit = async () => {
    if (!editingSleepId) return;
    const session = sleepSessions.find((sess) => sess.id === editingSleepId);
    const baseDate = session?.startTime || currentDate;
    let startMs = _hhmmToMsForDate(sleepEditStartStr, baseDate);
    let endMs = _hhmmToMsForDate(sleepEditEndStr, baseDate);
    if (!startMs || !endMs) return;
    // If the user edits a sleep that crosses midnight (11pm → 1am), interpret end as next day.
    if (typeof session?.endTime === 'number' && Number.isFinite(session.endTime) && startMs > session.endTime) {
      startMs -= 86400000;
    }
    if (endMs < startMs) {
      endMs += 86400000;
    }
    try {
      await firestoreStorage.updateSleepSession(editingSleepId, { startTime: startMs, endTime: endMs });
      setEditingSleepId(null);
      setSleepEditStartStr('');
      setSleepEditEndStr('');
      await loadSleepSessions();
    } catch (err) {
      console.error('Error updating sleep session:', err);
    }
  };

  const handleCancelSleepEdit = () => {
    setEditingSleepId(null);
    setSleepEditStartStr('');
    setSleepEditEndStr('');
  };

  const handleDeleteSleepSession = async (sleepId) => {
    if (!confirm('Delete this sleep entry?')) return;
    try {
      await firestoreStorage.deleteSleepSession(sleepId);
      await loadSleepSessions();
    } catch (err) {
      console.error('Error deleting sleep session:', err);
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
    setIsDateTransitioning(true);
    setCurrentDate(newDate);
    prevDateRef.current = newDate;
  };

  const isToday = () => {
    return currentDate.toDateString() === new Date().toDateString();
  };

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
    
    // Filter to today only (sessions that start or end today)
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todaySessions = sessions.filter(s => {
      const startTime = s.startTime || 0;
      const endTime = s.endTime || 0;
      // Only include completed sessions that start or end today
      // OR if it's the active session
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      return ((startTime >= startOfDay.getTime() && startTime <= endOfDay.getTime()) ||
              (endTime >= startOfDay.getTime() && endTime <= endOfDay.getTime())) &&
             (endTime || isActive); // Must have endTime OR be the active session
    });
    
    // Calculate total hours (only completed sessions + active if exists)
    const completedSessions = todaySessions.filter(s => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      return s.endTime && !isActive; // Only completed, non-active sessions
    });
    let totalMs = completedSessions.reduce((sum, s) => {
      const start = s.startTime || 0;
      const end = s.endTime || 0;
      return sum + Math.max(0, end - start);
    }, 0);
    
    // Add active sleep if it exists and is today
    if (activeSleepSession && activeSleepSession.startTime >= startOfDay.getTime()) {
      totalMs += Math.max(0, Date.now() - activeSleepSession.startTime);
    }
    
    const total = totalMs / (1000 * 60 * 60); // Convert to hours
    const target = targetHours || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    
    // Format timeline items (newest first by start time)
    const timelineItems = todaySessions
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
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
    if (activeSleepSession && activeSleepSession.startTime >= startOfDay.getTime()) {
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
      setInputSheetMode('sleep');
      setShowInputSheet(true);
      return;
    }
    setSelectedSleepEntry(entry);
    setShowSleepDetailSheet(true);
  };

  if (loading) {
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

  return React.createElement('div', { className: "space-y-4" },
    // Date Navigation (moved outside Today Card)
    React.createElement('div', { 
      className: "date-nav-container",
      style: {
        backgroundColor: 'var(--tt-app-bg)', // Match header background
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.1)',
        margin: '0 -1rem 1rem -1rem'
      }
    },
      React.createElement('div', { 
        className: "date-nav",
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: 'rgba(0, 0, 0, 0.05)', // Matches bg-black/5 pattern from design system
          padding: '8px 16px',
          borderRadius: '12px' // rounded-xl (matches toggle)
        }
      },
        React.createElement('div', {
          onClick: goToPreviousDay,
          className: "nav-arrow",
          style: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent'
          },
          onMouseDown: (e) => { e.currentTarget.style.opacity = '0.4'; },
          onMouseUp: (e) => { e.currentTarget.style.opacity = '1'; },
          onMouseLeave: (e) => { e.currentTarget.style.opacity = '1'; }
        }, React.createElement(ChevronLeft, { className: "w-5 h-5", style: { color: '#6B7280', strokeWidth: '2' } })),
        React.createElement('div', { 
          className: "date-text",
          style: {
            fontSize: '17px',
            fontWeight: 600,
            color: '#000',
            flex: 1,
            textAlign: 'center'
          }
        }, formatDate(currentDate)),
        React.createElement('div', {
          onClick: isToday() ? null : goToNextDay,
          className: "nav-arrow",
          style: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isToday() ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent'
          },
          onMouseDown: (e) => { if (!isToday()) e.currentTarget.style.opacity = '0.4'; },
          onMouseUp: (e) => { if (!isToday()) e.currentTarget.style.opacity = '1'; },
          onMouseLeave: (e) => { if (!isToday()) e.currentTarget.style.opacity = '1'; }
        }, React.createElement(ChevronRight, { className: "w-5 h-5", style: { color: isToday() ? '#E5E7EB' : '#6B7280', strokeWidth: '2' } }))
      )
    ),

    // New TrackerCard Components (when useNewUI is true)
    useNewUI && window.TrackerCard && React.createElement(React.Fragment, null,
      React.createElement(window.TrackerCard, {
        mode: 'feeding',
        total: feedingCardData.total,
        target: feedingCardData.target,
        timelineItems: feedingCardData.timelineItems,
        lastEntryTime: feedingCardData.lastEntryTime,
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
        lastEntryTime: sleepCardData.lastEntryTime,
        onItemClick: handleSleepItemClick,
        onDelete: async () => {
          // Small delay for animation
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadSleepSessions();
        }
      }),
      
      // Old Today Card (copied for reference - shows smooth transitions)
      React.createElement('div', { 
        ref: cardRefCallback, 
        className: "rounded-2xl shadow-sm p-6",
        style: { backgroundColor: 'var(--tt-card-bg)' }
      },
        // Feeding Progress
        React.createElement('div', { className: "mb-8" },
          React.createElement('div', { className: "flex items-center justify-between mb-2" },
            React.createElement('div', { 
              className: "text-sm font-medium",
              style: { color: 'var(--tt-text-secondary)' }
            }, "Feeding"),
            React.createElement('div', { 
              className: "text-xs",
              style: { color: 'var(--tt-text-tertiary)' }
            },
              lastFeeding 
                ? `Last fed at ${formatTime12Hour(lastFeedingTime)} (${lastFeedingAmount.toFixed(1)} oz)`
                : "No feedings yet"
            )
          ),
          
          // Progress Bar
          React.createElement('div', { 
            className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
            style: { backgroundColor: 'var(--tt-input-bg)' }
          },
            React.createElement('div', {
              className: "absolute left-0 top-0 h-full rounded-2xl",
              style: {
                width: cardVisible ? `${Math.min(100, feedingPercent)}%` : '0%',
                background: 'var(--tt-feed)',
                transition: 'width 0.6s ease-out',
                transitionDelay: '0s'
              }
            })
          ),

          // Stats
          React.createElement('div', { className: "flex items-baseline justify-between" },
            React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-feed)' } },
              `${totalConsumed.toFixed(1)} `,
              React.createElement('span', { 
                className: "text-base font-normal",
                style: { color: 'var(--tt-text-secondary)' }
              },
                `of ${targetOunces.toFixed(1)} oz`
              )
            )
          )
        ),

        // Sleep Progress
        React.createElement('div', {},
          React.createElement('div', { className: "flex items-center justify-between mb-2" },
            React.createElement('div', { 
              className: "text-sm font-medium",
              style: { color: 'var(--tt-text-secondary)' }
            }, "Sleep"),
            React.createElement('div', { 
              className: "text-xs",
              style: { color: 'var(--tt-text-tertiary)' }
            },
              isCurrentlySleeping
                ? `Sleeping now (${formatSleepDuration(Math.floor(sleepElapsedMs / 60000))})`
                : lastSleep
                  ? `Last slept at ${formatTime12Hour(lastSleepTime)} (${formatSleepDuration(lastSleepDuration)})`
                  : "No sleep sessions yet"
            )
          ),
          
          // Progress Bar
          React.createElement('div', { 
            className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
            style: { backgroundColor: 'var(--tt-input-bg)' }
          },
            React.createElement('div', {
              className: "absolute left-0 top-0 h-full rounded-2xl",
              style: {
                width: cardVisible ? `${Math.min(100, sleepPercent)}%` : '0%',
                background: 'var(--tt-sleep)',
                transition: 'width 0.6s ease-out',
                transitionDelay: '0.05s'
              }
            })
          ),

          // Stats
          React.createElement('div', { className: "flex items-baseline justify-between" },
            React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-sleep)' } },
              `${sleepTotalHours.toFixed(1)} `,
              React.createElement('span', { 
                className: "text-base font-normal",
                style: { color: 'var(--tt-text-secondary)' }
              },
                `of ${sleepTargetHours.toFixed(1)} hrs`
              )
            )
          )
        )
      )
    ),

    // Old UI (only show when useNewUI is false)
    !useNewUI && React.createElement(React.Fragment, null,
    // Today Card (duplicate for editing - new design)
    React.createElement('div', { 
      ref: cardRefCallback, 
      className: "rounded-2xl shadow-sm p-6",
      style: { backgroundColor: 'var(--tt-card-bg)' }
    },
      // Feeding Progress
      React.createElement('div', { className: "mb-8" },
        React.createElement('div', { className: "flex items-center justify-between mb-2" },
          React.createElement('div', { 
            className: "text-sm font-medium",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Feeding"),
          React.createElement('div', { 
            className: "text-xs",
            style: { color: 'var(--tt-text-tertiary)' }
          },
            lastFeeding 
              ? `Last fed at ${formatTime12Hour(lastFeedingTime)} (${lastFeedingAmount.toFixed(1)} oz)`
              : "No feedings yet"
          )
        ),
        
        // Progress Bar
        React.createElement('div', { 
          className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
          style: { backgroundColor: 'var(--tt-input-bg)' }
        },
          React.createElement('div', {
            className: "absolute left-0 top-0 h-full rounded-2xl",
            style: {
              width: cardVisible ? `${Math.min(100, feedingPercent)}%` : '0%',
              background: 'var(--tt-feed)',
              transition: 'width 0.6s ease-out',
              transitionDelay: '0s'
            }
          })
        ),

        // Stats
        React.createElement('div', { className: "flex items-baseline justify-between" },
          React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-feed)' } },
            `${totalConsumed.toFixed(1)} `,
            React.createElement('span', { 
              className: "text-base font-normal",
              style: { color: 'var(--tt-text-secondary)' }
            },
              `of ${targetOunces.toFixed(1)} oz`
            )
          )
        )
      ),

      // Sleep Progress
      React.createElement('div', {},
        React.createElement('div', { className: "flex items-center justify-between mb-2" },
          React.createElement('div', { 
            className: "text-sm font-medium",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Sleep"),
          React.createElement('div', { 
            className: "text-xs",
            style: { color: 'var(--tt-text-tertiary)' }
          },
            isCurrentlySleeping
              ? `Sleeping now (${formatSleepDuration(Math.floor(sleepElapsedMs / 60000))})`
              : lastSleep
                ? `Last slept at ${formatTime12Hour(lastSleepTime)} (${formatSleepDuration(lastSleepDuration)})`
                : "No sleep sessions yet"
          )
        ),
        
        // Progress Bar
        React.createElement('div', { 
          className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
          style: { backgroundColor: 'var(--tt-input-bg)' }
        },
          React.createElement('div', {
            className: "absolute left-0 top-0 h-full rounded-2xl",
            style: {
              width: cardVisible ? `${Math.min(100, sleepPercent)}%` : '0%',
              background: 'var(--tt-sleep)',
              transition: 'width 0.6s ease-out',
              transitionDelay: '0.05s'
            }
          })
        ),

        // Stats
        React.createElement('div', { className: "flex items-baseline justify-between" },
          React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-sleep)' } },
            `${sleepTotalHours.toFixed(1)} `,
            React.createElement('span', { 
              className: "text-base font-normal",
              style: { color: 'var(--tt-text-secondary)' }
            },
              `of ${sleepTargetHours.toFixed(1)} hrs`
            )
          )
        )
      )
    ),
    
    // Log Feeding Card
    React.createElement('div', { 
      className: "rounded-2xl shadow-lg p-6",
      style: { backgroundColor: 'var(--tt-card-bg)' }
    },
      null,
      React.createElement('div', { 
        className: "mt-3 mb-4 inline-flex w-full rounded-xl p-1",
        style: { backgroundColor: 'var(--tt-input-bg)' }
      },
        React.createElement('button', {
          onClick: () => setLogMode('feeding'),
          className: logMode === 'feeding'
            ? "flex-1 py-2 rounded-lg shadow font-semibold"
            : "flex-1 py-2 rounded-lg",
          style: logMode === 'feeding'
            ? { backgroundColor: 'var(--tt-card-bg)', color: 'var(--tt-text-primary)' }
            : { color: 'var(--tt-text-secondary)' }
        }, 'Feed'),
        React.createElement('button', {
          onClick: () => setLogMode('sleep'),
          className: logMode === 'sleep'
            ? "flex-1 py-2 rounded-lg shadow font-semibold"
            : "flex-1 py-2 rounded-lg",
          style: logMode === 'sleep'
            ? { backgroundColor: 'var(--tt-card-bg)', color: 'var(--tt-text-primary)' }
            : { color: 'var(--tt-text-secondary)' }
        },
          React.createElement(
            "span",
            { className: "inline-flex items-center gap-2" },
            "Sleep",
            activeSleep &&
              React.createElement(
                "span",
                { className: "inline-flex items-center", title: "Sleep in progress", 'aria-label': "Sleep in progress" },
                React.createElement(
                  "span",
                  { className: "text-xs font-bold select-none", style: { color: 'var(--tt-sleep)', animation: "ttZzz 2.4s ease-in-out infinite" } },
                  "zZz"
                )
              )
          )
        )
      ),

      // Feeding form
      (logMode === 'feeding') &&
      React.createElement('div', { className: "space-y-3" },
        React.createElement('div', { className: "flex gap-3 min-w-0" },
          React.createElement('input', {
            type: "number",
            inputMode: "decimal",
            step: "0.25",
            placeholder: "Ounces",
            value: ounces,
            onChange: (e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setOunces(value);
            },
            onKeyPress: (e) => e.key === 'Enter' && !showCustomTime && handleAddFeeding(),
            className: "min-w-0 flex-1 px-4 py-2.5 text-base border-2 rounded-xl focus:outline-none",
            style: { 
              borderColor: 'var(--tt-card-border)',
              backgroundColor: 'var(--tt-input-bg)',
              color: 'var(--tt-text-primary)'
            },
            onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed)',
            onBlur: (e) => e.target.style.borderColor = 'var(--tt-card-border)'
          }),
          React.createElement('button', {
            onClick: () => {
              setShowCustomTime((prev) => {
                const next = !prev;
                if (next) {
                  setCustomTime((t) => {
                    if (t && String(t).trim()) return t;
                    const d = new Date();
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    return `${hh}:${mm}`;
                  });
                }
                return next;
              });
            },
            className: "shrink-0 px-4 py-2.5 rounded-xl transition",
            style: showCustomTime
              ? { backgroundColor: 'var(--tt-feed-soft)', color: 'var(--tt-feed)' }
              : { backgroundColor: 'var(--tt-input-bg)', color: 'var(--tt-text-secondary)' }
          }, React.createElement(Clock, { className: "w-5 h-5", style: { strokeWidth: '3' } }))
        ),

        showCustomTime && React.createElement('input', {
          type: "time",
          value: customTime,
          onChange: (e) => setCustomTime(e.target.value),
          className: "block w-full min-w-0 max-w-full appearance-none box-border px-4 py-3 text-base border-2 rounded-xl focus:outline-none",
          style: { 
            borderColor: 'var(--tt-card-border)',
            backgroundColor: 'var(--tt-input-bg)',
            color: 'var(--tt-text-primary)'
          },
          onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed)',
          onBlur: (e) => e.target.style.borderColor = 'var(--tt-card-border)'
        }),

        React.createElement('button', {
          onClick: handleAddFeeding,
          className: "w-full text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2",
          style: { backgroundColor: 'var(--tt-feed)' }
        },
          React.createElement(Plus, { className: "w-5 h-5", style: { strokeWidth: '3' } }),
          'Add Feeding'
        )
      ),

      // Sleep form
      (logMode === 'sleep') &&
        React.createElement('div', { className: "space-y-4" },

          activeSleep &&
            React.createElement(
              'div',
              { className: "grid grid-cols-2 gap-4 text-center" },

              React.createElement(
                'div',
                null,
                React.createElement('div', { 
                  className: "text-sm mb-1",
                  style: { color: 'var(--tt-text-secondary)' }
                }, 'Start'),
                editingSleepField === 'start'
                  ? React.createElement('input', {
                      type: 'time',
                      autoFocus: true,
                      defaultValue: _toHHMM(activeSleep.startTime),
                      onBlur: async (e) => {
                        setEditingSleepField(null);
                        const ms = _hhmmToMsNearNowSmart(e.target.value);
                        if (!ms) return;
                        try {
                          await firestoreStorage.updateSleepSession(activeSleep.id, { startTime: ms });
                        } catch (err) {
                          console.error(err);
                        }
                      },
                      className: "font-semibold bg-transparent text-center",
                      style: { color: 'var(--tt-sleep)' }
                    })
                  : React.createElement(
                      'div',
                      {
                        className: "inline-block px-3 py-2 rounded-lg font-semibold text-lg cursor-pointer",
                        style: { 
                          backgroundColor: 'var(--tt-input-bg)',
                          color: 'var(--tt-sleep)'
                        },
                        onClick: () => setEditingSleepField('start')
                      },
                      _toHHMMNoZero(activeSleep.startTime)
                    )
              ),

              React.createElement(
                'div',
                null,
                React.createElement('div', { 
                  className: "text-sm mb-1",
                  style: { color: 'var(--tt-text-secondary)' }
                }, 'End'),
                editingSleepField === 'end'
                  ? React.createElement('input', {
                      type: 'time',
                      autoFocus: true,
                      defaultValue: sleepEndStr
                        ? _toHHMM(_hhmmToMsNearNowSmart(sleepEndStr))
                        : _toHHMM(Date.now()),
                      onBlur: async (e) => {
                        setEditingSleepField(null);
                        const ms = _hhmmToSleepEndMs(e.target.value, activeSleep.startTime);
                        if (!ms) return;
                        try {
                          await firestoreStorage.updateSleepSession(activeSleep.id, { endTime: ms });
                          setSleepEndStr(_toHHMMNoZero(ms));
                        } catch (err) {
                          console.error(err);
                        }
                      },
                      className: "font-semibold bg-transparent text-center",
                      style: { color: 'var(--tt-sleep)' }
                    })
                  : React.createElement(
                      'div',
                      {
                        className: "inline-block px-3 py-2 rounded-lg font-semibold text-lg cursor-pointer",
                        style: { 
                          backgroundColor: 'var(--tt-input-bg)',
                          color: 'var(--tt-sleep)'
                        },
                        onClick: () => setEditingSleepField('end')
                      },
                      sleepEndStr || '--:--'
                    )
              )
            ),

          activeSleep &&
            React.createElement(
              'div',
              { className: "text-center text-4xl font-semibold my-2" },
              _formatMMSS(sleepElapsedMs)
            ),

          !activeSleep &&
            React.createElement(
              'button',
              {
                className: "w-full text-white py-3 rounded-xl font-semibold",
                style: { backgroundColor: 'var(--tt-sleep)' },
                onClick: async () => await firestoreStorage.startSleep(Date.now())
              },
              'Start Sleep'
            ),

          activeSleep &&
            React.createElement(
              'button',
              {
                className: "w-full text-white py-3 rounded-xl font-semibold",
                style: { backgroundColor: 'var(--tt-sleep)' },
                onClick: async () => {
                  await firestoreStorage.endSleep(activeSleep.id, Date.now());
                  setActiveSleep(null);
                  setSleepElapsedMs(0);
                }
              },
              'End Sleep'
            )
        )
    ),

    // -----------------------
    // SLEEP LOG (TODAY)
    // -----------------------
    (logMode === 'sleep') && React.createElement(
      'div',
      { 
        className: "rounded-2xl shadow-lg p-6 mt-6",
        style: { backgroundColor: 'var(--tt-card-bg)' }
      },
      React.createElement(
        'h2',
        { 
          className: "text-lg font-semibold mb-4",
          style: { color: 'var(--tt-text-primary)' }
        },
        `Sleep · ${sleepSessions.length}`
      ),
      sleepSessions.length === 0
        ?           React.createElement(
            'div',
            { 
              className: "text-center py-6",
              style: { color: 'var(--tt-text-tertiary)' }
            },
            'No sleep logged yet'
          )
        : React.createElement(
            'div',
            { className: "space-y-3" },
            sleepSessions.map((s) => {
              const _normalizeSleepIntervalForUI = (startMs, endMs, nowMs = Date.now()) => {
                let sMs = Number(startMs);
                let eMs = Number(endMs);
                if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
                if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
                if (eMs < sMs) sMs -= 86400000;
                if (eMs < sMs) return null;
                return { startMs: sMs, endMs: eMs };
              };

              const norm = _normalizeSleepIntervalForUI(s.startTime, s.endTime);
              const ns = norm ? norm.startMs : s.startTime;
              const ne = norm ? norm.endMs : s.endTime;
              const durMs = Math.max(0, (ne || 0) - (ns || 0));
              const mins = Math.round(durMs / 60000);
              const hrs = Math.floor(mins / 60);
              const rem = mins % 60;
              const durLabel =
                hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
              const startLabel = new Date(ns).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const endLabel = new Date(ne).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const sleepEmoji = _sleepTypeForSession(s) === 'day' ? '😴' : '🌙';

                return React.createElement(
                  'div',
                  { key: s.id },
                  editingSleepId === s.id
                    ? React.createElement('div', { 
                        className: "trackerEditCard p-4 rounded-xl",
                        style: { backgroundColor: 'var(--tt-sleep-soft)' }
                      },
                        React.createElement('div', { className: "trackerEditBlock space-y-3 w-full max-w-[520px] mx-auto" },
                          React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
                            React.createElement('div', { className: "editField min-w-0" },
                              React.createElement('div', { 
                                className: "editFieldLabel text-xs font-semibold mb-1",
                                style: { color: 'var(--tt-text-secondary)' }
                              }, 'Start'),
                              React.createElement('input', {
                                type: 'time',
                                value: sleepEditStartStr,
                                onChange: (e) => setSleepEditStartStr(e.target.value),
                                className: "w-full h-11 min-w-0 appearance-none px-3 border-2 rounded-lg focus:outline-none",
                                style: {
                                  backgroundColor: 'var(--tt-input-bg)',
                                  borderColor: 'var(--tt-sleep)',
                                  color: 'var(--tt-text-primary)'
                                },
                                onFocus: (e) => e.target.style.borderColor = 'var(--tt-sleep-strong)',
                                onBlur: (e) => e.target.style.borderColor = 'var(--tt-sleep)'
                              })
                            ),
                            React.createElement('div', { className: "editField min-w-0" },
                              React.createElement('div', { 
                                className: "editFieldLabel text-xs font-semibold mb-1",
                                style: { color: 'var(--tt-text-secondary)' }
                              }, 'End'),
                              React.createElement('input', {
                                type: 'time',
                                value: sleepEditEndStr,
                                onChange: (e) => setSleepEditEndStr(e.target.value),
                                className: "w-full h-11 min-w-0 appearance-none px-3 border-2 rounded-lg focus:outline-none",
                                style: {
                                  backgroundColor: 'var(--tt-input-bg)',
                                  borderColor: 'var(--tt-sleep)',
                                  color: 'var(--tt-text-primary)'
                                },
                                onFocus: (e) => e.target.style.borderColor = 'var(--tt-sleep-strong)',
                                onBlur: (e) => e.target.style.borderColor = 'var(--tt-sleep)'
                              })
                            )
                          ),
                            React.createElement(TrackerEditActions, { onSave: handleSaveSleepEdit, onCancel: handleCancelSleepEdit })
                          )
                        )
                      : React.createElement('div', { 
                          className: "flex justify-between items-center p-4 rounded-xl",
                          style: { backgroundColor: 'var(--tt-input-bg)' }
                        },
                      React.createElement('div', { className: "flex items-center gap-3" },
                        React.createElement(
                          'div',
                          {
                            className: "rounded-full flex items-center justify-center",
                            style: { 
                              width: '48px', 
                              height: '48px',
                              backgroundColor: 'var(--tt-sleep-soft)'
                            }
                          },
                          React.createElement('span', { className: "text-xl" }, sleepEmoji)
                        ),
                        React.createElement(
                          'div',
                          {},
                          React.createElement('div', { 
                            className: "font-semibold",
                            style: { color: 'var(--tt-text-primary)' }
                          }, durLabel),
                          React.createElement(
                            'div',
                            { 
                              className: "text-sm",
                              style: { color: 'var(--tt-text-secondary)' }
                            },
                            `${startLabel} – ${endLabel}`
                          )
                        )
                      ),
                      React.createElement('div', { className: "flex gap-2" },
                        React.createElement('button', {
                          onClick: () => handleStartEditSleep(s),
                          className: "transition",
                          style: { color: 'var(--tt-sleep)' }
                        }, React.createElement(Edit2, { className: "w-5 h-5", style: { strokeWidth: '3' } })),
                        React.createElement('button', {
                          onClick: () => handleDeleteSleepSession(s.id),
                          className: "text-red-400 hover:text-red-600 transition"
                        }, React.createElement(X, { className: "w-5 h-5", style: { strokeWidth: '3' } }))
                      )
                    )
              );
            })
          )
    ),
    // Feedings List
    (logMode === 'feeding') && React.createElement('div', { 
      className: "rounded-2xl shadow-lg p-6",
      style: { backgroundColor: 'var(--tt-card-bg)' }
    },
      React.createElement('h2', { 
        className: "text-lg font-semibold mb-4",
        style: { color: 'var(--tt-text-primary)' }
      }, `Feedings · ${feedings.length}`),
      feedings.length === 0 ?
        React.createElement('p', { 
          className: "text-center py-8",
          style: { color: 'var(--tt-text-tertiary)' }
        }, 'No feedings logged for this day')
      :
        React.createElement('div', { className: "space-y-3" },
          feedings.map((feeding) =>
            React.createElement('div', { key: feeding.id },
              editingFeedingId === feeding.id ?
                React.createElement('div', { 
                  className: "trackerEditCard p-4 rounded-xl",
                  style: { backgroundColor: 'var(--tt-feed-soft)' }
                },
                  React.createElement('div', { className: "trackerEditBlock space-y-3 w-full max-w-[520px] mx-auto" },
                    React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
                      React.createElement('div', { className: "feedingAmountField relative w-full min-w-0" },
                        React.createElement('input', {
                          type: "number",
                          inputMode: "decimal",
                          step: "0.25",
                          value: editOunces,
                          onChange: (e) => {
                            // Only allow numbers and decimal point
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setEditOunces(value);
                          },
                          placeholder: "Ounces",
                          className: "feedingAmountInput w-full h-11 min-w-0 appearance-none px-3 pr-10 border-2 rounded-lg focus:outline-none",
                          style: {
                            backgroundColor: 'var(--tt-input-bg)',
                            borderColor: 'var(--tt-feed)',
                            color: 'var(--tt-text-primary)'
                          },
                          onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed-strong)',
                          onBlur: (e) => e.target.style.borderColor = 'var(--tt-feed)'
                        }),
                        React.createElement('span', { 
                          className: "feedingAmountUnit absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none",
                          style: { color: 'var(--tt-text-secondary)' }
                        }, 'oz')
                      ),
                      React.createElement('input', {
                        type: "time",
                        value: editTime,
                        onChange: (e) => setEditTime(e.target.value),
                        className: "w-full h-11 min-w-0 appearance-none px-3 border-2 rounded-lg focus:outline-none",
                        style: {
                          backgroundColor: 'var(--tt-input-bg)',
                          borderColor: 'var(--tt-feed)',
                          color: 'var(--tt-text-primary)'
                        },
                        onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed-strong)',
                        onBlur: (e) => e.target.style.borderColor = 'var(--tt-feed)'
                      })
                    ),
                    React.createElement(TrackerEditActions, { onSave: handleSaveEdit, onCancel: handleCancelEdit })
                  )
                )
              :
                React.createElement('div', { 
                  className: "flex justify-between items-center p-4 rounded-lg",
                  style: { backgroundColor: 'var(--tt-input-bg)' }
                },
                  React.createElement('div', { className: "flex items-center gap-3" },
                    React.createElement('div', { 
                      className: "rounded-full flex items-center justify-center",
                      style: { 
                        width: '48px', 
                        height: '48px',
                        backgroundColor: 'var(--tt-feed-soft)'
                      }
                    },
                      React.createElement('span', { className: "text-xl" }, '🍼')
                    ),
                    React.createElement('div', {},
                      React.createElement('div', { 
                        className: "font-semibold",
                        style: { color: 'var(--tt-text-primary)' }
                      }, `${feeding.ounces} oz`),
                      React.createElement('div', { 
                        className: "text-sm",
                        style: { color: 'var(--tt-text-secondary)' }
                      }, feeding.time)
                    )
                  ),
                  React.createElement('div', { className: "flex gap-2" },
                    React.createElement('button', {
                      onClick: () => handleStartEdit(feeding),
                      className: "transition",
                      style: { color: 'var(--tt-feed)' }
                    }, React.createElement(Edit2, { className: "w-5 h-5" })),
                    React.createElement('button', {
                      onClick: () => handleDeleteFeeding(feeding.id),
                      className: "text-red-400 hover:text-red-600 transition"
                    }, React.createElement(X, { className: "w-5 h-5" }))
                  )
                )
            )
          )
        )
    )
    ), // End of old UI section

    // Today Card (original - moved to bottom for testing)
    // COMMENTED OUT - Old design kept for reference
    /*
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "flex items-center justify-between mb-4" },
        React.createElement('button', {
          onClick: goToPreviousDay,
          className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
        }, React.createElement(ChevronLeft, { className: "w-5 h-5" })),
        React.createElement('h2', { className: "text-lg font-semibold text-gray-800" }, formatDate(currentDate)),
        React.createElement('button', {
          onClick: goToNextDay,
          disabled: isToday(),
          className: `p-2 rounded-lg transition ${isToday() ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`
        }, React.createElement(ChevronRight, { className: "w-5 h-5" }))
      ),

      // Stacked progress bars (current Today-card design)
      React.createElement(ProgressBarRow, {
        label: "Feeding",
        value: Number(totalConsumed.toFixed(1)),
        target: Number(targetOunces.toFixed(1)),
        unit: "oz",
        deltaLabel: feedingDeltaLabel,
        deltaIsGood: feedingDeltaIsGood
      }),

      React.createElement(ProgressBarRow, {
        label: "Sleep",
        value: Number(sleepTotalHours.toFixed(1)),
        target: Number(sleepTargetHours.toFixed(1)),
        unit: "hrs",
        deltaLabel: sleepDeltaLabel,
        deltaIsGood: sleepDeltaIsGood
      })
    )
    */

    // Floating Create Button (above nav bar)
    React.createElement('button', {
      onClick: () => {
        setInputSheetMode('feeding');
        setShowInputSheet(true);
      },
      className: "fixed right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:opacity-80 transition-opacity",
      style: {
        backgroundColor: 'var(--tt-feed)',
        bottom: '100px', // 80px nav bar + 20px spacing = 100px
        zIndex: 9999
      }
    },
      window.PlusIcon ? React.createElement(window.PlusIcon, { 
        className: "w-6 h-6 text-white",
        style: { strokeWidth: '3' }
      }) : React.createElement('span', { className: "text-white text-2xl font-bold" }, '+')
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
      }
    }),
    window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet, {
      isOpen: showInputSheet,
      onClose: () => setShowInputSheet(false),
      kidId: kidId,
      initialMode: inputSheetMode,
      onAdd: async (mode) => {
        // Delay refresh until after sheet closes (200ms for close animation)
        await new Promise(resolve => setTimeout(resolve, 250));
        if (mode === 'feeding') {
          await loadFeedings();
        } else {
          await loadSleepSessions();
        }
      }
    })
  );
};

// ========================================
// TINY TRACKER - PART 5
// Analytics Tab
// ========================================

// ========================================
// SLEEP ANALYTICS HELPERS
// ========================================
const _dateKeyLocal = (ms) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const _minutesSinceMidnightLocal = (ms) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

// Returns true if "startMin" is within [winStart, winEnd) where window may wrap over midnight.
const _isWithinWindow = (startMin, winStart, winEnd) => {
  const s = Number(winStart);
  const e = Number(winEnd);
  if (isNaN(s) || isNaN(e)) return false;
  if (s === e) return false;
  if (s < e) return startMin >= s && startMin < e;
  // wraps midnight
  return startMin >= s || startMin < e;
};

const _getDayWindow = (sleepSettings) => {
  // Prefer current fields; fall back to legacy if present.
  const dayStart = sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 7 * 60;
  const dayEnd = sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 19 * 60;
  return { dayStart: Number(dayStart), dayEnd: Number(dayEnd) };
};

const _sleepDurationHours = (sess) => {
  const start = Number(sess?.startTime);
  const end = Number(sess?.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  let s = start;
  let e = end;
  const nowMs = Date.now();
  // If start time accidentally landed in the future (common around midnight), pull it back one day.
  if (s > nowMs + 3 * 3600000) s -= 86400000;
  // If end < start, assume the sleep crossed midnight and the start belongs to the previous day.
  if (e < s) s -= 86400000;
  const ms = e - s;
  if (!isFinite(ms) || ms <= 0) return 0;
  return ms / (1000 * 60 * 60);
};

// Aggregate by local day, splitting sessions that cross midnight.
const aggregateSleepByDay = (sleepSessions, sleepSettings) => {
  const { dayStart, dayEnd } = _getDayWindow(sleepSettings);
  const map = {}; // dateKey -> { totalHrs, dayHrs, nightHrs, count }
  (sleepSessions || []).forEach((s) => {
    const startRaw = Number(s?.startTime);
    const endRaw = Number(s?.endTime);
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) return;
    let start = startRaw;
    let end = endRaw;
    const nowMs = Date.now();
    if (start > nowMs + 3 * 3600000) start -= 86400000;
    if (end < start) start -= 86400000;
    if (end <= start) return;

    const startMin = _minutesSinceMidnightLocal(start);
    const isDay = _isWithinWindow(startMin, dayStart, dayEnd);

    // Walk across midnights and allocate hours to each local day.
    let cursor = start;
    while (cursor < end) {
      const dayStartDate = new Date(cursor);
      dayStartDate.setHours(0, 0, 0, 0);
      const nextMidnight = dayStartDate.getTime() + 86400000;
      const segEnd = Math.min(end, nextMidnight);
      const key = _dateKeyLocal(cursor);
      const hrs = (segEnd - cursor) / (1000 * 60 * 60);
      if (!map[key]) map[key] = { totalHrs: 0, dayHrs: 0, nightHrs: 0, count: 0 };
      map[key].totalHrs += hrs;
      if (isDay) map[key].dayHrs += hrs;
      else map[key].nightHrs += hrs;
      // Count session once, on the day it started (not on every split day).
      if (cursor === start) map[key].count += 1;
      cursor = segEnd;
    }
  });
  return map;
};

const _fmtHours1 = (hrs) => {
  const n = Number(hrs || 0);
  return `${n.toFixed(1)} hrs`;
};

const _avg = (arr) => {
  if (!arr || !arr.length) return 0;
  const s = arr.reduce((a, b) => a + (Number(b) || 0), 0);
  return s / arr.length;
};

// =====================================================
// DAILY ACTIVITY CHART - Calendar-style like Huckleberry
// X = dates (columns), Y = time of day (rows)
// Sleep = vertical blocks (start->end) per day column
// Feeds = short horizontal ticks at feed start time
// Uses CSS variables: --tt-feed, --tt-sleep, --tt-feed-soft, --tt-sleep-soft
// =====================================================
const DailyActivityChart = ({
  viewMode = 'day', // 'day' | 'week' | 'month'
  feedings = [],
  sleepSessions = [],
  sleepSettings = null,
  suppressNow = false
}) => {
  // ========================================
  // ACTOGRAM: "Apple Health" polish + bulletproofing
  // ========================================
  // Turn on locally if you need it, but keep it off for production.
  const DEBUG_ACTOGRAM = false;
  const dlog = (...args) => { try { if (DEBUG_ACTOGRAM) console.log('[ACTOGRAM]', ...args); } catch {} };

  // Helper to get computed CSS variable values
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '#000000'; // fallback
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#000000';
  };

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Apple Health-ish styling constants (local to this component)
  const TT = {
    cardH: 464,           // restored taller card height (post-revert). grows downward; top/left remain locked
    headerH: 48,          // slightly tighter header for better chart breathing room
    axisW: 44,            // quiet gutter
    gridMajor: 'rgba(17,24,39,0.08)',
    gridMinor: 'rgba(17,24,39,0.04)',
    axisTextClass: 'text-[12px] font-medium text-gray-500',
    nowGreen: '#22C55E',
    // Event colors - computed from CSS variables
    sleepNight: getComputedColor('--tt-sleep'),
    sleepDay: getComputedColor('--tt-sleep-soft'),
    feedPink: getComputedColor('--tt-feed'),
  };

  // Tappable legend toggles (guard: don't allow "all off")
  const [legendOn, setLegendOn] = React.useState({ sleep: true, nap: true, feed: true });
  const toggleLegend = (key) => {
    setLegendOn((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Guard: don't allow turning everything off
      if (!next.sleep && !next.nap && !next.feed) return prev;
      return next;
    });
  };
  const legendBtnClass = (on) =>
    `flex items-center gap-2 px-2 py-1 rounded-md transition ${
      on ? 'opacity-100' : 'opacity-35'
    } hover:bg-gray-50 active:bg-gray-100`;

  // Safe default handling without mutation
  const effectiveViewMode = viewMode || 'day';
  const isMonthView = effectiveViewMode === 'month';
  const days = effectiveViewMode === 'day' ? 1 : 7; // day: 1 column, week: 7 columns (month uses its own grid)
  const [offsetDays, setOffsetDays] = React.useState(0); // 0 = week/day ending today
  const [offsetMonths, setOffsetMonths] = React.useState(0); // 0 = current month

  // Nav step:
  // - Day view should page 1 day at a time
  // - Week/Month should page 7 days at a time
  const stepDays = effectiveViewMode === 'day' ? 1 : 7;

  const clampOffset = (n) => Math.max(0, Math.floor(Number(n) || 0));
  const clampMonths = (n) => Math.max(0, Math.floor(Number(n) || 0));
  const pageBack = () => {
    if (isMonthView) setOffsetMonths((m) => clampMonths(m + 1));
    else setOffsetDays((n) => clampOffset(n + stepDays));
  };
  const pageFwd = () => {
    if (isMonthView) setOffsetMonths((m) => clampMonths(m - 1));
    else setOffsetDays((n) => clampOffset(n - stepDays));
  };
  const scrollRef = React.useRef(null);     // single horizontal scroller (header + plot) - MUST be overflow-x-auto
  const plotScrollRef = React.useRef(null); // day-view vertical scroll container

  // Apple-style current time (axis-owned, not column-owned)
  const nowMs = Date.now();

  // Auto-scroll to the most recent day (ONLY on today; do not fight paging)
  React.useEffect(() => {
    if (offsetDays !== 0) return;
    if (effectiveViewMode === 'day') return;
    if (isMonthView) return;

    const el = scrollRef.current;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let t1 = 0;
    const scrollToRight = () => {
      try {
        // scrollWidth includes the visible area; subtract clientWidth to land at max scroll
        el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      } catch {}
    };

    raf1 = requestAnimationFrame(() => {
      scrollToRight();
      raf2 = requestAnimationFrame(() => {
        scrollToRight();
        t1 = setTimeout(scrollToRight, 50);
      });
    });

    return () => {
      try { if (raf1) cancelAnimationFrame(raf1); } catch {}
      try { if (raf2) cancelAnimationFrame(raf2); } catch {}
      try { if (t1) clearTimeout(t1); } catch {}
    };
  }, [effectiveViewMode, offsetDays]);

  // Day view: auto-scroll vertically to current time (only on today)
  React.useEffect(() => {
    if (effectiveViewMode !== 'day') return;
    if (offsetDays !== 0) return;
    if (isMonthView) return;

    const el = plotScrollRef.current;
    if (!el) return;

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const pct = mins / (24 * 60);

    requestAnimationFrame(() => {
      try {
        const target = (el.scrollHeight * pct) - (el.clientHeight * 0.40);
        el.scrollTop = Math.max(0, target);
      } catch {}
    });
  }, [effectiveViewMode, offsetDays]);

  const toMs = React.useCallback((t) => {
    if (!t) return null;
    // Normalize numeric timestamps:
    // - If stored as Unix seconds (10 digits-ish), convert to ms.
    // - If already ms (13 digits-ish), keep as-is.
    if (typeof t === 'number') {
      // 2025 epoch ms ~ 1.7e12. Anything below 1e11 is definitely not ms.
      if (t > 0 && t < 100000000000) return t * 1000; // seconds -> ms
      return t; // already ms
    }
    if (t?.toMillis) return t.toMillis(); // Firestore Timestamp
    // Handle numeric strings like "1702780000"
    if (typeof t === 'string' && /^[0-9]+$/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      if (n > 0 && n < 100000000000) return n * 1000;
      return n;
    }
    const d = (t instanceof Date) ? t : new Date(t);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }, []);

  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const nowMsLocal = nowMs;

  // Month anchor (local): first day of the visible month
  const monthAnchor0 = React.useMemo(() => {
    // Use local midnight on the 1st of the month, offset backwards by offsetMonths.
    const d = new Date(today.getFullYear(), today.getMonth() - clampMonths(offsetMonths), 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [today.getFullYear(), today.getMonth(), offsetMonths]);

  const monthLabel = React.useMemo(() => {
    return new Date(monthAnchor0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [monthAnchor0]);

  dlog('viewMode', effectiveViewMode, 'days', days, 'offsetDays', offsetDays);

  // End day for the visible range
  const endDay0 = today0 - clampOffset(offsetDays) * 86400000;

  const dayStarts = React.useMemo(() => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) out.push(endDay0 - i * 86400000);
    return out;
  }, [days, endDay0]);

  const hasToday = React.useMemo(() => dayStarts.includes(today0), [dayStarts, today0]);
  const showNow = hasToday && effectiveViewMode !== 'month' && !suppressNow;
  const nowMinutes = React.useMemo(() => {
    const d = new Date(nowMs);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowMs]);
  const nowPct = (nowMinutes / (24 * 60)) * 100;
  const nowLabel = React.useMemo(() => new Date(nowMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }), [nowMs]);

  // Window: midnight to midnight (24 hours)
  const windowStartMs = (day0) => day0;
  const windowEndMs = (day0) => day0 + 86400000; // +24 hours

  // Feedings are stored as point-in-time events (typically { ounces, timestamp }).
  // Use toMs() so we correctly handle Firestore Timestamps, numbers (ms), Dates, and ISO strings.
  const feeds = React.useMemo(() => {
    const raw = Array.isArray(feedings) ? feedings : [];
    const out = [];
    for (const f of raw) {
      const s = toMs(f?.timestamp ?? f?.startTime ?? f?.time ?? f?.startAt ?? f?.start);
      if (s) out.push({ s });
    }
    return out;
  }, [feedings, toMs]);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const yPct = (tMs, day0) => {
    const ws = windowStartMs(day0);
    const we = windowEndMs(day0);
    const x = clamp(tMs, ws, we);
    return ((x - ws) / (we - ws)) * 100;
  };

  const sleeps = React.useMemo(() => {
    const raw = Array.isArray(sleepSessions) ? sleepSessions : [];
    const out = [];
    for (const s of raw) {
      const start = toMs(s?.startTime ?? s?.startAt ?? s?.start);
      const end = toMs(s?.endTime ?? s?.endAt ?? s?.end);
      // Include active sessions (missing end), and completed sessions (need end)
      if (start && (end || s?.isActive)) out.push({ ...s, s: start, e: end || null });
    }
    return out;
  }, [sleepSessions, toMs]);

  dlog('parsed feeds', feeds.length, 'parsed sleeps', sleeps.length);

  // Classify sleep as day/night based on start time
  const _sleepTypeForSession = (session) => {
    if (!session || !session.s) return 'night';
    if (session.sleepType === 'day' || session.sleepType === 'night') return session.sleepType;
    if (typeof session.isDaySleep === 'boolean') return session.isDaySleep ? 'day' : 'night';

    const start = session.s;
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

  // Apple Calendar-like ticks: every 3 hours; show "Noon" at 12 PM
  const majorTicks = React.useMemo(() => [0, 12, 24], []);
  const minorTicks = React.useMemo(() => [3, 6, 9, 15, 18, 21], []);
  const hourLabels = React.useMemo(() => ([
    { i: 0, label: '12 AM' },
    { i: 6, label: '6 AM' },
    { i: 12, label: 'Noon' },
    { i: 18, label: '6 PM' },
    { i: 24, label: '12 AM' }
  ]), []);

  // Match "Daily volume" style: black number + smaller grey AM/PM (and show "Noon" as Noon)
  const renderGutterTime = React.useCallback((label) => {
    const raw = String(label || '');
    // Force 12 PM to show as "Noon" (handles either 'Noon' or '12 PM')
    if (raw === 'Noon' || raw === '12 PM') {
      return React.createElement(
        'span',
        { className: 'inline-flex items-baseline' },
        React.createElement(
          'span',
          { className: 'text-[12px] font-semibold text-gray-900 leading-none' },
          'Noon'
        )
      );
    }

    const parts = raw.split(' ');
    const num = parts[0] || '';
    const mer = (parts[1] || '').toUpperCase();

    // If something unexpected comes through, fall back to plain text
    if (!num) return React.createElement('span', null, label);

    return React.createElement(
      'span',
      { className: 'inline-flex items-baseline gap-1' },
      React.createElement(
        'span',
        { className: 'text-[12px] font-semibold text-gray-900 leading-none' },
        num
      ),
      mer
        ? React.createElement(
            'span',
            { className: 'text-[10px] font-medium text-gray-400 leading-none' },
            mer
          )
        : null
    );
  }, []);

  // Keep the chart area visually consistent across day/week/month.
  // We keep card height fixed (TT.cardH) and use one plot height for all modes.
  // IMPORTANT: Must fit 12a -> 12a with NO vertical scroll inside the fixed card height.
  // This is tuned so: nav + legend + sticky header + plot fits within TT.cardH.
  // If you change TT.cardH/headerH/paddings elsewhere, adjust this first.
  // Give the top 12 AM label box extra headroom (prevents clipping in Day view),
  // while keeping the overall chart height identical.
  const PAD_T = 14;
  const PLOT_H = 260; // +28px: more vertical breathing room for the grid itself
  const PAD_B = 14; // give the bottom "12 AM" label a few extra px so it never clips
  const PLOT_TOTAL_H = PLOT_H + PAD_T + PAD_B;
  const yPxFromPct = (pct) => PAD_T + (pct / 100) * PLOT_H;
  // Exact tick Y used throughout the chart (mins from 0..1440)
  // NOTE: We do NOT change the gridlines here; we only use this to align labels precisely.
  const tickY = React.useCallback((hour) => {
    const mins = Number(hour) * 60;
    return PAD_T + (mins / (24 * 60)) * PLOT_H;
  }, [PAD_T, PLOT_H]);
  // Fixed label box height so all time labels align consistently to gridlines
  // (avoids font-metric differences like "Noon" vs "6 PM")
  const GUTTER_LABEL_H = 16;
  const yPx = (tMs, day0) => yPxFromPct(yPct(tMs, day0));
  const nowY = yPxFromPct(nowPct);
  // Clamp “now” so pill/line never render outside the plot (prevents running off-card)
  const nowYClamped = clamp(nowY, 10, PLOT_TOTAL_H - 10);
  const COL_W = effectiveViewMode === 'day' ? null : 54;
  const contentWidth = effectiveViewMode === 'day' ? '100%' : `${days * COL_W}px`;

  // Bucket feeds by dayStart for O(1) lookup per column
  const feedsByDay = React.useMemo(() => {
    const map = new Map();
    for (const day0 of dayStarts) map.set(day0, []);
    for (const ev of feeds) {
      // Determine which visible day bucket this feed belongs to
      for (const day0 of dayStarts) {
        const ws = windowStartMs(day0);
        const we = windowEndMs(day0);
        if (ev.s >= ws && ev.s < we) {
          map.get(day0).push(ev);
          break;
        }
      }
    }
    return map;
  }, [feeds, dayStarts]);

  // Bucket sleeps by dayStart (include overlaps)
  const sleepsByDay = React.useMemo(() => {
    const map = new Map();
    for (const day0 of dayStarts) map.set(day0, []);
    for (const ev of sleeps) {
      for (const day0 of dayStarts) {
        const ws = windowStartMs(day0);
        const we = windowEndMs(day0);
        if (ev.isActive) {
          // Active sleep: show if it started before window ends
          if (ev.s < we) map.get(day0).push(ev);
        } else if (ev.e) {
          // Completed sleep: show if overlap
          if ((ev.s < we) && (ev.e > ws)) map.get(day0).push(ev);
        }
      }
    }
    return map;
  }, [sleeps, dayStarts]);

  // ===========================
  // MONTH SUMMARY CALENDAR DATA
  // ===========================
  const monthGridDays = React.useMemo(() => {
    if (!isMonthView) return [];

    const start = new Date(monthAnchor0); // first of month
    const monthY = start.getFullYear();
    const monthM = start.getMonth();
    const monthStart0 = new Date(monthY, monthM, 1).getTime();
    const monthEnd0 = new Date(monthY, monthM + 1, 1).getTime();

    // Calendar grid starts on Sunday of the week containing the 1st.
    const firstDow = new Date(monthStart0).getDay(); // 0..6 (Sun..Sat)
    const gridStart0 = monthStart0 - firstDow * 86400000;

    const out = [];
    for (let i = 0; i < 42; i++) {
      const day0 = gridStart0 + i * 86400000;
      const inMonth = day0 >= monthStart0 && day0 < monthEnd0;
      out.push({ day0, inMonth });
    }
    return out;
  }, [isMonthView, monthAnchor0]);

  const feedOzByDayKey = React.useMemo(() => {
    if (!isMonthView) return new Map();
    const map = new Map(); // YYYY-MM-DD -> oz
    const raw = Array.isArray(feedings) ? feedings : [];
    for (const f of raw) {
      const ms = toMs(f?.timestamp ?? f?.startTime ?? f?.time ?? f?.startAt ?? f?.start);
      if (!ms) continue;
      const oz = Number(f?.ounces ?? f?.volume ?? 0);
      if (!Number.isFinite(oz) || oz <= 0) continue;
      const key = _dateKeyLocal(ms);
      map.set(key, (map.get(key) || 0) + oz);
    }
    return map;
  }, [isMonthView, feedings, toMs]);

  const sleepHrsByDayKey = React.useMemo(() => {
    if (!isMonthView) return {};
    // Reuse the same aggregation logic used elsewhere (splits across midnight properly)
    return aggregateSleepByDay(sleepSessions || [], sleepSettings);
  }, [isMonthView, sleepSessions, sleepSettings]);

  const fmtOz0 = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `${Math.round(v)} oz`;
  };

  const fmtHrs1Short = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `${v.toFixed(1)} h`;
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        className: 'bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col',
        style: { height: TT.cardH }
      },

      // Month navigation row (no toggle inside card)
      React.createElement(
        'div',
        { className: 'px-4 pt-4 pb-2 flex items-center justify-between' },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: pageBack,
            className: 'p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition'
          },
          React.createElement(ChevronLeft, { className: 'w-5 h-5', style: { strokeWidth: '3' } })
        ),
        React.createElement(
          'div',
          { className: 'text-[16px] font-semibold text-gray-900' },
          isMonthView
            ? monthLabel
            : new Date(dayStarts[Math.floor(dayStarts.length / 2)]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: pageFwd,
            disabled: isMonthView ? (offsetMonths <= 0) : (offsetDays <= 0),
            className: `p-2 rounded-lg transition ${
              (isMonthView ? (offsetMonths <= 0) : (offsetDays <= 0))
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-indigo-600 hover:bg-indigo-50'
            }`
          },
          React.createElement(ChevronRight, { className: 'w-5 h-5', style: { strokeWidth: '3' } })
        )
      ),

      // Scrollable time-grid (ONE scroll container; header + gutter are sticky)
      React.createElement(
        'div',
        {
          // IMPORTANT: Do NOT let the chart consume all remaining height (or the bottom legend gets clipped).
          // Give it an explicit height so the legend below always has room inside the fixed-height card.
          className: 'pl-2 pr-4 pb-3 flex-none',
          style: {
            overscrollBehavior: 'contain',
            height: TT.headerH + PLOT_TOTAL_H + 6
          }
        },
        React.createElement(
          'div',
          {
            // Preserve the same rounded container + fixed height in all modes
            className: 'w-full overflow-hidden rounded-xl',
            style: {
              display: 'grid',
              gridTemplateRows: `${TT.headerH}px ${PLOT_TOTAL_H}px`,
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              scrollbarGutter: 'stable',
              height: TT.headerH + PLOT_TOTAL_H
            },
            ref: (el) => {
              // Single scroll container for BOTH horizontal + vertical behaviors
              scrollRef.current = el;
              plotScrollRef.current = el;
            }
          },

          // Inner content
          React.createElement(
            'div',
            { className: 'min-w-full', style: { minWidth: '100%', width: '100%' } },
            isMonthView
              ? React.createElement(
                  React.Fragment,
                  null,
                  // Header row: weekday labels (no gutter divider, calm)
                  React.createElement(
                    'div',
                    {
                      className: 'grid',
                      style: {
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        background: 'rgba(255,255,255,0.98)',
                        backdropFilter: 'saturate(180%) blur(10px)',
                        borderBottom: 'none',
                        height: TT.headerH,
                        maxHeight: TT.headerH,
                        overflow: 'hidden',
                        gridTemplateColumns: `${TT.axisW}px repeat(7, 1fr)`
                      }
                    },
                    React.createElement('div', { style: { height: TT.headerH } }),
                    React.createElement(
                      'div',
                      {
                        className: 'grid',
                        style: {
                          gridColumn: '2 / span 7',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          height: TT.headerH,
                          maxHeight: TT.headerH
                        }
                      },
                      ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) =>
                        React.createElement(
                          'div',
                          { key: d, className: 'text-center flex items-center justify-center' },
                          React.createElement('div', { className: 'text-[11px] font-medium tracking-[0.5px] text-gray-400 leading-none' }, d)
                        )
                      )
                    )
                  ),

                  // Body row: 7x6 grid (breathable)
                  React.createElement(
                    'div',
                    {
                      className: 'grid relative',
                      style: {
                        gridTemplateColumns: `${TT.axisW}px repeat(7, 1fr)`,
                        height: PLOT_TOTAL_H,
                        overflow: 'hidden'
                      }
                    },
                    // quiet gutter spacer to align with other modes
                    React.createElement('div', { className: 'relative', style: { background: 'rgba(255,255,255,0.98)' } }),

                    React.createElement(
                      'div',
                      {
                        className: 'grid h-full',
                        style: {
                          gridColumn: '2 / span 7',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gridTemplateRows: 'repeat(6, 1fr)',
                          gap: 6,
                          padding: 6
                        }
                      },
                      monthGridDays.map(({ day0, inMonth }) => {
                        const key = _dateKeyLocal(day0);
                        const isTodayCell = day0 === today0;
                        const oz = feedOzByDayKey.get(key) || 0;
                        const sleepHrs = Number(sleepHrsByDayKey?.[key]?.totalHrs || 0);

                        // If out-of-month, render an empty muted cell to preserve breathing.
                        if (!inMonth) {
                          return React.createElement('div', {
                            key: `mcell-${day0}`,
                            className: 'rounded-lg',
                            style: { background: 'rgba(17,24,39,0.02)' }
                          });
                        }

                        const ozText = fmtOz0(oz);
                        const hrsText = fmtHrs1Short(sleepHrs);

                        return React.createElement(
                          'div',
                          {
                            key: `mcell-${day0}`,
                            className: 'rounded-xl',
                            style: {
                              background: isTodayCell ? hexToRgba(TT.feedPink, 0.08) : 'rgba(255,255,255,1)',
                              border: '1px solid rgba(17,24,39,0.06)',
                              padding: 10,
                              overflow: 'hidden'
                            }
                          },
                          React.createElement(
                            'div',
                            { className: 'text-[11px] font-medium text-gray-500 leading-none' },
                            String(new Date(day0).getDate())
                          ),
                          ozText
                            ? React.createElement(
                                'div',
                                { className: 'mt-2 text-[13px] font-semibold leading-tight', style: { color: TT.feedPink } },
                                ozText
                              )
                            : null,
                          hrsText
                            ? React.createElement(
                                'div',
                                { className: 'mt-1 text-[13px] font-medium leading-tight', style: { color: TT.sleepNight } },
                                hrsText
                              )
                            : null
                        );
                      })
                    )
                  )
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  // Sticky header row (day strip)
                  React.createElement(
                    'div',
                    {
                      className: 'grid',
                      style: {
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        background: 'rgba(255,255,255,0.98)',
                        backdropFilter: 'saturate(180%) blur(10px)',
                        borderBottom: 'none',
                        height: TT.headerH,
                        maxHeight: TT.headerH,
                        overflow: 'hidden',
                        gridTemplateColumns: `${TT.axisW}px ${effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`}`
                      }
                    },
                    React.createElement('div', { style: { height: TT.headerH } }),
                    React.createElement(
                      'div',
                      {
                        className: 'grid',
                        style: {
                          gridColumn: `2 / span ${effectiveViewMode === 'day' ? 1 : days}`,
                          gridTemplateColumns: effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`,
                          height: TT.headerH,
                          maxHeight: TT.headerH
                        }
                      },
                      dayStarts.map((day0) => {
                        const d = new Date(day0);
                        const isToday = day0 === today0;
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                        const dayNum = d.getDate();

                        return React.createElement(
                          'div',
                          {
                            key: `strip-${day0}`,
                            className: 'text-center',
                            style: { height: TT.headerH, maxHeight: TT.headerH }
                          },
                          React.createElement(
                            'div',
                            {
                              className: `h-full flex flex-col justify-center ${isToday ? 'bg-indigo-50' : ''}`,
                              style: isToday ? { borderRadius: 12 } : { overflow: 'hidden' }
                            },
                            React.createElement(
                              React.Fragment,
                              null,
                              React.createElement(
                                'div',
                                { className: 'text-[11px] font-medium tracking-[0.5px] text-gray-400 leading-none' },
                                dayName
                              ),
                              React.createElement(
                                'div',
                                { className: `mt-[2px] text-[16px] font-semibold leading-none ${isToday ? 'text-indigo-600' : 'text-gray-900'}` },
                                String(dayNum)
                              )
                            )
                          )
                        );
                      })
                    )
                  ),

                  // Body row: axis + day columns share ONE coordinate system (existing actogram)
                  React.createElement(
                    'div',
                    {
                      className: 'grid relative',
                      style: {
                        gridTemplateColumns: `${TT.axisW}px ${effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`}`,
                        height: PLOT_TOTAL_H,
                        overflow: 'hidden'
                      }
                    },

                    // AXIS COLUMN (sticky-left, no divider line)
                    React.createElement(
                      'div',
                      {
                        className: 'relative',
                        style: {
                          position: 'sticky',
                          left: 0,
                          zIndex: 30,
                          background: 'rgba(255,255,255,0.98)'
                        }
                      },

                      // Time labels (calm, Apple-like)
                      React.createElement(
                        'div',
                        { className: 'relative', style: { height: PLOT_TOTAL_H } },
                        hourLabels.map((h) =>
                          React.createElement(
                            'div',
                            {
                              key: `ylab-${h.i}`,
                              className: 'absolute right-1 text-right',
                              style: {
                                // Align the CENTER of a fixed-height label box to the gridline
                                top: `${tickY(h.i) - GUTTER_LABEL_H / 2}px`,
                                height: `${GUTTER_LABEL_H}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                              }
                            },
                            renderGutterTime(h.label)
                          )
                        )
                      )
                    ),

                    // BODY ROW "NOW" DOT: sits on the gutter/grid boundary and caps the now line
                    showNow &&
                      React.createElement('div', {
                        className: 'absolute pointer-events-none',
                        style: {
                          top: `${nowYClamped}px`,
                          left: `${TT.axisW}px`, // exact boundary between gutter and grid
                          width: 6,
                          height: 6,
                          background: TT.nowGreen,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: 999,
                          // Keep above chart content but BELOW fullscreen overlays / persistent nav
                          zIndex: 18
                        }
                      }),

                    // DAY COLUMNS WRAPPER (relative so gridlines + now line span fully)
                    React.createElement(
                      'div',
                      {
                        className: 'relative',
                        style: {
                          gridColumn: `2 / span ${effectiveViewMode === 'day' ? 1 : days}`,
                          height: '100%'
                        }
                      },

                      // Global horizontal gridlines (draw ONCE across all columns)
                      React.createElement(
                        'div',
                        { className: 'pointer-events-none absolute inset-0', style: { zIndex: 1 } },
                        // Major lines (align line center to tick: y - 0.5)
                        majorTicks.map((i) =>
                          React.createElement('div', {
                            key: `maj-${i}`,
                            className: 'absolute left-0 right-0',
                            style: {
                              top: `${PAD_T + ((i * 60) / (24 * 60)) * PLOT_H - 0.5}px`,
                              height: 1,
                              background: TT.gridMajor
                            }
                          })
                        ),
                        // Minor lines (every 3h) (align line center to tick: y - 0.5)
                        minorTicks.map((i) =>
                          React.createElement('div', {
                            key: `min-${i}`,
                            className: 'absolute left-0 right-0',
                            style: {
                              top: `${PAD_T + ((i * 60) / (24 * 60)) * PLOT_H - 0.5}px`,
                              height: 1,
                              background: TT.gridMinor
                            }
                          })
                        )
                      ),

                      // NOW LINE: spans the FULL grid width and connects to the dot at the boundary
                      showNow &&
                        React.createElement('div', {
                          className: 'pointer-events-none absolute',
                          style: {
                            top: `${nowYClamped}px`,
                            left: 0, // wrapper already starts AFTER the gutter (gridColumn: 2)
                            right: 0, // extend to the end of the calendar
                            height: 2,
                            background: TT.nowGreen,
                            transform: 'translateY(-50%)',
                            // Below the dot, above gridlines
                            zIndex: 16
                          }
                        }),

                      // Day columns
                      React.createElement(
                        'div',
                        {
                          className: 'grid h-full',
                          style: {
                            gridTemplateColumns: effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`,
                            height: '100%'
                          }
                        },
                        dayStarts.map((day0) => {
                          const isToday = day0 === today0;
                          const daySleeps = sleepsByDay.get(day0) || [];
                          const dayFeeds = feedsByDay.get(day0) || [];

                          return React.createElement(
                            'div',
                            {
                              key: day0,
                              className: '',
                              style: {
                                position: 'relative',
                                height: '100%',
                                // No gutter divider; keep only ultra-subtle column separators
                                borderRight: 'none'
                              }
                            },

                            // Sleep blocks + feed ticks
                            React.createElement(
                              'div',
                              { className: 'relative', style: { height: '100%', zIndex: 10 } },

                              // Today shading: ONLY the 24h grid area (from 12 AM line to 12 AM line)
                              isToday &&
                                React.createElement('div', {
                                  className: 'absolute left-0 right-0 pointer-events-none',
                                  style: {
                                    top: `${PAD_T}px`,
                                    height: `${PLOT_H}px`,
                                    background: hexToRgba(TT.feedPink, 0.06),
                                    borderRadius: 8,
                                    zIndex: 0
                                  }
                                }),

                              // Sleep blocks (wide, clean) - build a single flat children array (more reliable on iOS)
                              (() => {
                                const children = [];
                                for (let idx = 0; idx < daySleeps.length; idx++) {
                                  const ev = daySleeps[idx];
                                  const sleepType = _sleepTypeForSession(ev);
                                  const allow = sleepType === 'night' ? legendOn.sleep : legendOn.nap;
                                  if (!allow) continue;

                                  const isActive = ev.isActive;
                                  const endTime = isActive ? nowMsLocal : ev.e || nowMsLocal;

                                  const topPct = yPct(ev.s, day0);
                                  const bottomPct = yPct(endTime, day0);
                                  const topPx = yPxFromPct(topPct);
                                  const bottomPx = yPxFromPct(bottomPct);
                                  const hPx = Math.max(1, bottomPx - topPx);

                                  const bgColor = sleepType === 'night' ? TT.sleepNight : TT.sleepDay;
                                  const leftMargin = effectiveViewMode === 'day' ? 10 : 6;
                                  const rightMargin = effectiveViewMode === 'day' ? 10 : 6;

                                  const baseKey = ev?.id || `${day0}-${ev.s}-${ev.e || 'active'}-${idx}`;

                                  children.push(
                                    React.createElement('div', {
                                      key: `sleep-block-${baseKey}`,
                                      className: 'absolute rounded-lg',
                                      style: {
                                        top: `${topPx}px`,
                                        height: `${hPx}px`,
                                        left: `${leftMargin}px`,
                                        right: `${rightMargin}px`,
                                        background: bgColor,
                                        opacity: 0.72,
                                        border: '1px solid rgba(255,255,255,0.25)',
                                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)',
                                        zIndex: 10
                                      }
                                    })
                                  );

                                  // Active indicator (day view only; keep quiet)
                                  if (isActive && effectiveViewMode === 'day') {
                                    children.push(
                                      React.createElement(
                                        'div',
                                        {
                                          key: `sleep-active-${baseKey}`,
                                          className:
                                            'absolute left-3 text-[9px] font-semibold bg-white px-1 py-0.5 rounded shadow-sm',
                                          style: {
                                            top: `${Math.min(PLOT_TOTAL_H - 8, bottomPx + 6)}px`,
                                            color: TT.sleepNight,
                                            border: `1px solid ${hexToRgba(TT.sleepNight, 0.2)}`,
                                            zIndex: 15
                                          }
                                        },
                                        ' Active'
                                      )
                                    );
                                  }
                                }
                                return children;
                              })(),

                              // Feed ticks
                              legendOn.feed
                                ? dayFeeds.map((ev, idx) => {
                                    const topPx = yPx(ev.s, day0);
                                    return React.createElement('div', {
                                      key: `${day0}-feed-${idx}`,
                                      className: 'absolute',
                                      style: {
                                        top: `${topPx}px`,
                                        left: effectiveViewMode === 'day' ? '10px' : '8px',
                                        right: effectiveViewMode === 'day' ? '10px' : '8px',
                                        height: '2px',
                                        background: TT.feedPink,
                                        transform: 'translateY(-50%)',
                                        borderRadius: '2px',
                                        zIndex: 20
                                      }
                                    });
                                  })
                                : null
                            )
                          );
                        })
                      )
                    )
                  )
                )
          )
        ),

      // Legend (below chart; push down into any leftover card whitespace)
      React.createElement(
        'div',
        { className: 'pl-2 pr-4 pt-1 pb-2 w-full mt-auto' },
        React.createElement(
          'div',
          {
            className: 'w-full flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-gray-700'
          },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => toggleLegend('sleep'),
              'aria-pressed': !!legendOn.sleep,
              className: legendBtnClass(!!legendOn.sleep)
            },
            React.createElement('span', { className: 'inline-block w-[10px] h-[10px] rounded-sm', style: { background: TT.sleepNight } }),
            'Sleep'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => toggleLegend('nap'),
              'aria-pressed': !!legendOn.nap,
              className: legendBtnClass(!!legendOn.nap)
            },
            React.createElement('span', { className: 'inline-block w-[10px] h-[10px] rounded-sm', style: { background: TT.sleepDay } }),
            'Nap'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => toggleLegend('feed'),
              'aria-pressed': !!legendOn.feed,
              className: legendBtnClass(!!legendOn.feed)
            },
            React.createElement('span', { className: 'inline-block w-[12px] h-[3px] rounded-sm', style: { background: TT.feedPink } }),
            'Feed'
          )
        )
      )
    )
  ));
};

// ========================================
// SHARED SUBPAGE SEGMENTED TOGGLE (matches Part 4 style)
// - Full-width, card-aligned
// - Apple Health–like height
// - Used ONLY on Analytics subpages (modals)
// ========================================
const AnalyticsSubpageToggle = ({
  value,
  options = [], // [{ key, label, mapsTo }]
  onChange,
  ariaLabel = 'Time range'
}) => {
  const opts = Array.isArray(options) ? options.filter(Boolean) : [];
  if (opts.length <= 1) return null;

  return React.createElement(
    'div',
    {
      className: 'px-4 pt-3 pb-2'
    },
    React.createElement(
      'div',
      {
        role: 'tablist',
        'aria-label': ariaLabel,
        className: 'w-full flex h-[30px] p-[2px] rounded-[8px] bg-black/5 dark:bg-white/10'
      },
      opts.flatMap((opt, index) => {
        const selected = value === opt.key;
        const isFirst = index === 0;
        const prevSelected = index > 0 && value === opts[index - 1]?.key;
        const showDivider = !isFirst && !selected && !prevSelected;
        
        const elements = [];
        
        // Add divider before this button (except for first)
        if (!isFirst && !selected && !prevSelected) {
          elements.push(
            React.createElement(
              'div',
              {
                key: `divider-${index}`,
                className: 'w-[1px] my-[2px] bg-gray-400/30 dark:bg-gray-300/25'
              }
            )
          );
        }
        
        // Add the button
        elements.push(
          React.createElement(
            'button',
            {
              key: opt.key,
              type: 'button',
              role: 'tab',
              'aria-selected': selected,
              onClick: () => {
                try {
                  if (typeof onChange === 'function') {
                    onChange(opt.mapsTo || opt.key);
                  }
                } catch {}
              },
              className:
                'flex-1 h-[26px] flex items-center justify-center rounded-[6px] text-[12px] leading-[14px] font-medium transition ' +
                (selected
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600')
            },
            opt.label
          )
        );
        
        return elements;
      })
    )
  );
};

// ========================================
// FULLSCREEN MODAL (for Analytics highlights)
// - iOS-friendly: fixed overlay + safe-area padding
// - Swipe-right to go back (close) with animation (edge swipe)
// ========================================
const FullscreenModal = ({ title, onClose, children }) => {
  const startRef = React.useRef(null);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const bodyRef = React.useRef(null);
  const restoreRef = React.useRef(null);

  // Keep bottom tab bar visible (your app uses ~80px bottom padding)
  const TAB_BAR_H = 80;

  // Match app background by reading what MainApp already applies to <body>
  const bg = React.useMemo(() => {
    try {
      const c = getComputedStyle(document.body).backgroundColor;
      return c || '#F2F2F7';
    } catch {
      return '#F2F2F7';
    }
  }, []);

  // Lock underlying document scrolling while modal is open (prevents “page behind modal” scroll)
  React.useEffect(() => {
    try {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollY = window.scrollY || 0;

      restoreRef.current = {
        scrollY,
        docOverflow: docEl.style.overflow,
        bodyOverflow: body.style.overflow,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyWidth: body.style.width
      };

      docEl.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      // iOS: position fixed prevents rubber-band scroll of the underlying page
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
    } catch {}

    return () => {
      try {
        const docEl = document.documentElement;
        const body = document.body;
        const prev = restoreRef.current;
        if (prev) {
          docEl.style.overflow = prev.docOverflow || '';
          body.style.overflow = prev.bodyOverflow || '';
          body.style.position = prev.bodyPosition || '';
          body.style.top = prev.bodyTop || '';
          body.style.width = prev.bodyWidth || '';
          window.scrollTo(0, prev.scrollY || 0);
        }
      } catch {}
    };
  }, []);

  const closeAnimated = React.useCallback(() => {
    if (closing) return;
    setClosing(true);
    try {
      const w = Math.max(320, (typeof window !== 'undefined' ? window.innerWidth : 375));
      setDragging(false);
      setDragX(w);
      setTimeout(() => {
        try { if (typeof onClose === 'function') onClose(); } catch {}
      }, 220);
    } catch {
      try { if (typeof onClose === 'function') onClose(); } catch {}
    }
  }, [closing, onClose]);

  const onTouchStart = (e) => {
    try {
      const t = e.touches && e.touches[0];
      if (!t) return;
      // Only allow swipe-back if gesture begins near the left edge (iOS back gesture)
      const EDGE_PX = 24;
      const edgeOK = t.clientX <= EDGE_PX;
      startRef.current = { x: t.clientX, y: t.clientY, ts: Date.now(), edgeOK };
      if (edgeOK) {
        setDragging(true);
        setDragX(0);
      }
    } catch {}
  };

  const onTouchMove = (e) => {
    try {
      const s = startRef.current;
      if (!s || !s.edgeOK) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;

      // If user is clearly scrolling vertically, cancel the swipe gesture
      if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
        setDragging(false);
        setDragX(0);
        startRef.current = null;
        return;
      }

      if (dx <= 0) {
        setDragX(0);
        return;
      }

      // Prevent horizontal scroll; keep vertical scrolling working in body
      try { e.preventDefault(); } catch {}

      const w = Math.max(320, (typeof window !== 'undefined' ? window.innerWidth : 375));
      const clamped = Math.max(0, Math.min(dx, w));
      setDragX(clamped);
    } catch {}
  };

  const onTouchEnd = (e) => {
    try {
      const s = startRef.current;
      startRef.current = null;
      if (!s || !s.edgeOK) {
        setDragging(false);
        setDragX(0);
        return;
      }

      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) {
        setDragging(false);
        setDragX(0);
        return;
      }

      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - (s.ts || 0);

      // Complete if it was a deliberate right swipe
      const w = Math.max(320, (typeof window !== 'undefined' ? window.innerWidth : 375));
      const shouldClose =
        dx > Math.min(120, w * 0.33) &&
        Math.abs(dy) < 60 &&
        dt < 900;

      setDragging(false);

      if (shouldClose) {
        closeAnimated();
      } else {
        // snap back
        setDragX(0);
      }
    } catch {
      setDragging(false);
      setDragX(0);
    }
  };

  return React.createElement(
    'div',
    {
      // Overlay: fixed, sized to leave the bottom tab bar visible
      className: 'fixed left-0 right-0 top-0 z-50',
      style: {
        backgroundColor: bg,
        bottom: `${TAB_BAR_H}px`,
        display: 'flex',
        flexDirection: 'column'
      }
    },
    // Sliding SHEET: full viewport height; this is what we translate during swipe
    React.createElement(
      'div',
      {
        className: 'w-full min-h-0',
        style: {
          // Own the overlay’s height (which already excludes the tab bar)
          height: '100%',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 220ms ease',
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: bg
        }
      },
      // Left-edge swipe zone (captures iOS back swipe without hijacking scrolling)
      React.createElement('div', {
        className: 'absolute left-0 top-0 bottom-0 z-50',
        style: { width: 24, background: 'transparent', touchAction: 'none' },
        onTouchStart,
        onTouchMove,
        onTouchEnd
      }),
      // Header: fixed height; whole row is tappable back
      React.createElement(
        'div',
        {
          className: 'flex-none border-b border-gray-100',
          // IMPORTANT: explicit background so underlying page never “peeks through”
          style: { paddingTop: 'env(safe-area-inset-top)', backgroundColor: bg }
        },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => { try { if (typeof onClose === 'function') onClose(); } catch {} },
            className: 'w-full h-12 px-4 flex items-center gap-2 text-left',
            style: { backgroundColor: bg }
          },
          React.createElement(
            'span',
            { className: 'p-2 -ml-2 rounded-lg hover:bg-black/5 active:bg-black/10' },
            React.createElement(ChevronLeft, { className: 'w-5 h-5 text-indigo-600', style: { strokeWidth: '3' } })
          ),
          React.createElement(
            'div',
            { className: 'text-[16px] font-semibold text-gray-900' },
            title || ''
          )
        )
      ),
      // Body: ONLY scroll container (fixes clipped cards + weird scroll indicator)
      React.createElement(
        'div',
        {
          ref: bodyRef,
          className: 'flex-1 min-h-0 overflow-y-auto',
          style: {
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            touchAction: 'pan-y'
          }
        },
        children
      )
    )
  );
};

// =====================================================
// HIGHLIGHT CARD COMPONENT
// Reusable container for Analytics highlight cards
// =====================================================

// =====================================================
// HIGHLIGHT MINI VIZ VIEWPORT (Highlight cards only)
// - Fixed-height viewport (180px default)
// - Inner horizontal scroller (scrollbar visually hidden)
// - Programmatically pinned to the RIGHT (latest bucket fully visible)
// - Non-interactive (no user scrolling)
// =====================================================
let __ttHighlightMiniVizStyleInjected = false;
const _ensureHighlightMiniVizStyles = () => {
  try {
    if (__ttHighlightMiniVizStyleInjected) return;
    __ttHighlightMiniVizStyleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .tt-hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}
      .tt-hide-scrollbar::-webkit-scrollbar{display:none}
    `;
    document.head.appendChild(style);
  } catch {}
};

const HighlightMiniVizViewport = ({ height = 180, children }) => {
  const scrollerRef = React.useRef(null);

  React.useEffect(() => {
    _ensureHighlightMiniVizStyles();
  }, []);

  const childCount = React.Children.count(children);

  // Pin to the right on mount + whenever the child count changes.
  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const pinRight = () => {
      try {
        el.scrollLeft = el.scrollWidth;
      } catch {}
    };

    // Run a few times to survive layout/paint order quirks.
    pinRight();
    const r1 = requestAnimationFrame(pinRight);
    const r2 = requestAnimationFrame(pinRight);
    const t1 = setTimeout(pinRight, 0);

    return () => {
      try { cancelAnimationFrame(r1); } catch {}
      try { cancelAnimationFrame(r2); } catch {}
      try { clearTimeout(t1); } catch {}
    };
  }, [childCount]);

  // NOTE: HighlightCard has 24px padding. We full-bleed by 24px on each side (-mx-6)
  // and then re-add inner padding so bars align to the card edges.
  return React.createElement(
    'div',
    {
      className: 'relative overflow-hidden -mx-6',
      style: { height: `${height}px`, width: 'calc(100% + 48px)' }
    },
    React.createElement(
      'div',
      {
        ref: scrollerRef,
        className: 'tt-hide-scrollbar overflow-x-auto overflow-y-visible',
        style: {
          height: `${height}px`,
          paddingLeft: 24,
          paddingRight: 32, // extra right padding so the last value pill doesn't kiss the edge
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          // Disable all user interaction/scrolling while still allowing programmatic scrollLeft.
          pointerEvents: 'none',
          touchAction: 'none'
        }
      },
      children
    )
  );
};

// Sleep Chart Component - matches SleepCard.tsx design
const SleepChart = ({ data = [], average = 0 }) => {
  // Helper to get computed CSS variable values
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '#4a8ac2'; // fallback to default sleep
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#4a8ac2';
  };

  const sleepColor = getComputedColor('--tt-sleep');

  // Convert date to day of week abbreviation
  const getDayAbbrev = (date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return abbrevs[day];
  };
  
  // Get today's date key for highlighting
  const todayKey = _dateKeyLocal(Date.now());
  
  // Process data: map to chart format (data should already have 7 days, oldest to newest)
  const chartData = data.map((entry, index) => {
    const hours = entry.totalHrs || 0;
    const dayAbbrev = entry.date ? getDayAbbrev(entry.date) : '';
    const isToday = entry.key === todayKey;
    return {
      day: dayAbbrev,
      hours: hours,
      isHighlighted: isToday,
      isToday: isToday
    };
  });
  
  // Ensure we have exactly 7 days (data should already be 7, but handle edge cases)
  if (chartData.length === 0) {
    // No data: create 7 empty days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: i === 0
      });
    }
  } else if (chartData.length < 7) {
    // Pad missing days with zeros (shouldn't happen, but handle gracefully)
    const now = new Date();
    while (chartData.length < 7) {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - chartData.length - 1));
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: chartData.length === 6 // Last one added is today
      });
    }
  }
  
  // Calculate max hours for scaling (include average in max calculation)
  const maxHours = Math.max(
    ...chartData.map(d => d.hours),
    average,
    1 // Minimum of 1 to avoid division by zero
  );
  
  const chartHeight = 130; // Increased from 100 to make bars taller
  const barWidth = 32;
  const barGap = 16; // gap between bars
  const chartWidth = barWidth + barGap; // per bar area
  const totalWidth = (chartData.length - 1) * chartWidth + barWidth;
  
  // Calculate bar heights and positions
  const bars = chartData.map((entry, index) => {
    const x = index * chartWidth;
    const height = (entry.hours / maxHours) * chartHeight;
    const y = chartHeight - height;
    return { ...entry, x, y, height };
  });
  
  // Reference line position (average sleep)
  const refLineY = chartHeight - (average / maxHours) * chartHeight;
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = React.useRef(null);
  
  // Intersection Observer to detect when card scrolls into view
  useEffect(() => {
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: animate immediately if IntersectionObserver not available
      setIsVisible(true);
      return;
    }
    
    const element = chartRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);
  
  return React.createElement(
    'div',
    { 
      className: 'flex flex-col h-full justify-between',
      ref: chartRef
    },
    // Average Sleep section
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
      React.createElement(
        'span',
        { className: 'text-xs font-medium text-gray-400 tracking-wider mb-1' },
        'Average sleep'
      ),
      React.createElement(
        'div',
        { className: 'flex items-baseline space-x-1' },
        React.createElement(
          'span',
          { className: 'text-[2.25rem] font-bold text-indigo-700 leading-none' },
          average.toFixed(1)
        ),
        React.createElement(
          'span',
          { className: 'text-sm font-medium text-gray-400' },
          'hrs'
        )
      )
    ),
    // Chart section
    React.createElement(
      'div',
      { className: 'w-full mt-2 -mx-1 relative', style: { height: '150px' } },
      React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
          preserveAspectRatio: 'xMidYMax meet',
          style: { overflow: 'visible' }
        },
        // Bars with animation
        bars.map((bar, index) =>
          React.createElement(
            'rect',
            {
              key: `bar-${index}`,
              x: bar.x,
              y: isVisible ? bar.y : chartHeight, // Start at bottom, animate to position
              width: barWidth,
              height: isVisible ? bar.height : 0, // Start with 0 height, animate to full height
              fill: bar.isToday ? sleepColor : '#e5e7eb',
              rx: 6,
              ry: 6,
              style: {
                transition: 'height 0.6s ease-out, y 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`
              }
            }
          )
        ),
        // Day labels
        bars.map((bar, index) =>
          React.createElement(
            'text',
            {
              key: `label-${index}`,
              x: bar.x + barWidth / 2,
              y: chartHeight + 18,
              textAnchor: 'middle',
              fill: '#9ca3af',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            bar.day
          )
        ),
        // Reference line (rendered after bars so it appears on top)
        React.createElement(
          'line',
          {
            x1: 0,
            y1: refLineY,
            x2: totalWidth,
            y2: refLineY,
            stroke: sleepColor,
            strokeWidth: 3,
            opacity: 0.85
          }
        )
      )
    )
  );
};

// Feeding Chart Component - duplicate of SleepChart design
const FeedingChart = ({ data = [], average = 0 }) => {
  // Helper to get computed CSS variable values
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '#d45d5c'; // fallback to default feed
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#d45d5c';
  };

  const feedColor = getComputedColor('--tt-feed');

  // Convert date to day of week abbreviation
  const getDayAbbrev = (date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return abbrevs[day];
  };
  
  // Get today's date key for highlighting
  const todayKey = _dateKeyLocal(Date.now());
  
  // Process data: map to chart format (data should already have 7 days, oldest to newest)
  const chartData = data.map((entry, index) => {
    const volume = entry.volume || 0;
    const dayAbbrev = entry.date ? getDayAbbrev(entry.date) : '';
    const isToday = entry.key === todayKey;
    return {
      day: dayAbbrev,
      volume: volume,
      isHighlighted: isToday,
      isToday: isToday
    };
  });
  
  // Ensure we have exactly 7 days (data should already be 7, but handle edge cases)
  if (chartData.length === 0) {
    // No data: create 7 empty days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: i === 0
      });
    }
  } else if (chartData.length < 7) {
    // Pad missing days with zeros (shouldn't happen, but handle gracefully)
    const now = new Date();
    while (chartData.length < 7) {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - chartData.length - 1));
      chartData.push({
        day: getDayAbbrev(d),
        volume: 0,
        isHighlighted: false,
        isToday: chartData.length === 6 // Last one added is today
      });
    }
  }
  
  // Calculate max volume for scaling (include average in max calculation)
  const maxVolume = Math.max(
    ...chartData.map(d => d.volume),
    average,
    1 // Minimum of 1 to avoid division by zero
  );
  
  const chartHeight = 130; // Increased from 100 to make bars taller
  const barWidth = 32;
  const barGap = 16; // gap between bars
  const chartWidth = barWidth + barGap; // per bar area
  const totalWidth = (chartData.length - 1) * chartWidth + barWidth;
  
  // Calculate bar heights and positions
  const bars = chartData.map((entry, index) => {
    const x = index * chartWidth;
    const height = (entry.volume / maxVolume) * chartHeight;
    const y = chartHeight - height;
    return { ...entry, x, y, height };
  });
  
  // Reference line position (average intake)
  const refLineY = chartHeight - (average / maxVolume) * chartHeight;
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = React.useRef(null);
  
  // Intersection Observer to detect when card scrolls into view
  useEffect(() => {
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: animate immediately if IntersectionObserver not available
      setIsVisible(true);
      return;
    }
    
    const element = chartRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);
  
  return React.createElement(
    'div',
    { 
      className: 'flex flex-col h-full justify-between',
      ref: chartRef
    },
    // Average Intake section
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
      React.createElement(
        'span',
        { className: 'text-xs font-medium text-gray-400 tracking-wider mb-1' },
        'Average intake'
      ),
      React.createElement(
        'div',
        { className: 'flex items-baseline space-x-1' },
        React.createElement(
          'span',
          { className: 'text-[2.25rem] font-bold text-pink-600 leading-none' },
          average.toFixed(1)
        ),
        React.createElement(
          'span',
          { className: 'text-sm font-medium text-gray-400' },
          'oz'
        )
      )
    ),
    // Chart section
    React.createElement(
      'div',
      { className: 'w-full mt-2 -mx-1 relative', style: { height: '150px' } },
      React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
          preserveAspectRatio: 'xMidYMax meet',
          style: { overflow: 'visible' }
        },
        // Bars with animation
        bars.map((bar, index) =>
          React.createElement(
            'rect',
            {
              key: `bar-${index}`,
              x: bar.x,
              y: isVisible ? bar.y : chartHeight, // Start at bottom, animate to position
              width: barWidth,
              height: isVisible ? bar.height : 0, // Start with 0 height, animate to full height
              fill: bar.isToday ? feedColor : '#e5e7eb',
              rx: 6,
              ry: 6,
              style: {
                transition: 'height 0.6s ease-out, y 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`
              }
            }
          )
        ),
        // Day labels
        bars.map((bar, index) =>
          React.createElement(
            'text',
            {
              key: `label-${index}`,
              x: bar.x + barWidth / 2,
              y: chartHeight + 18,
              textAnchor: 'middle',
              fill: '#9ca3af',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            bar.day
          )
        ),
        // Reference line (rendered after bars so it appears on top)
        React.createElement(
          'line',
          {
            x1: 0,
            y1: refLineY,
            x2: totalWidth,
            y2: refLineY,
            stroke: feedColor,
            strokeWidth: 3,
            opacity: 0.85
          }
        )
      )
    )
  );
};

const HighlightCard = ({ icon: Icon, label, insightText, categoryColor, onClick, children }) => {
  return React.createElement(
    'div',
    {
      className: 'rounded-2xl shadow-lg p-6 cursor-pointer',
      style: { backgroundColor: 'var(--tt-card-bg)' },
      onClick: onClick
    },
    // Header: icon + label left, chevron right
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-3' },
      React.createElement(
        'div',
        { className: 'flex items-center gap-2' },
        React.createElement(Icon, {
          className: 'w-5 h-5',
          style: { color: categoryColor }
        }),
        React.createElement(
          'span',
          {
            className: 'text-sm font-semibold',
            style: { color: categoryColor }
          },
          label
        )
      ),
      React.createElement(ChevronRight, { 
        className: 'w-5 h-5',
        style: { color: 'var(--tt-text-tertiary)', strokeWidth: '3' }
      })
    ),
    // Insight Text: single block, bold, clamped to 2 lines
    React.createElement(
      'div',
      { className: 'mb-3' },
      React.createElement(
        'div',
        { 
          className: 'text-base font-bold leading-tight insight-text-clamp',
          style: { color: 'var(--tt-text-primary)' }
        },
        insightText.join(' ')
      )
    ),
    // Divider
    React.createElement('div', { 
      className: 'border-t mb-3',
      style: { borderColor: 'var(--tt-card-border)' }
    }),
    // Mini Viz Area: fixed height (240px). Any clipping/scroll pinning is handled
    // by HighlightMiniVizViewport (used only by highlight mini-viz).
    React.createElement(
      'div',
      { style: { height: '240px' } },
      children
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.TrackerTab = TrackerTab;
