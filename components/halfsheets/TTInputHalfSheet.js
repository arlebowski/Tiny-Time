// TTInputHalfSheet Component
// Extracted from TrackerCard.js for better organization

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTInputHalfSheet) {
  
  // Get utilities from window (exposed by TrackerCard.js)
  const formatDateTime = window.TT?.utils?.formatDateTime || ((date) => {
    if (!date) return '';
    const d = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[d.getDay()];
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${day} ${hours}:${mins} ${ampm}`;
  });
  
  const formatElapsedHmsTT = window.TT?.utils?.formatElapsedHmsTT || ((ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const showH = hours > 0;
    const showM = showH || minutes > 0;
    return {
      hStr: String(hours),
      mStr: String(minutes).padStart(2, '0'),
      sStr: String(seconds).padStart(2, '0'),
      showH,
      showM
    };
  });
  
  const checkSleepOverlap = window.TT?.utils?.checkSleepOverlap || (async () => false);
  
  const _ttUseWheelPickers = window.TT?.utils?.useWheelPickers || (() => {
    try {
      if (typeof window !== 'undefined' && window.TT?.shared?.flags?.useWheelPickers?.get) {
        return !!window.TT.shared.flags.useWheelPickers.get();
      }
      return localStorage.getItem('tt_use_wheel_pickers') === 'true';
    } catch (e) {
      return false;
    }
  });
  
  const _ttUseAmountStepper = () => {
    try {
      if (typeof window !== 'undefined' && window.TT?.shared?.flags?.useAmountStepper?.get) {
        return !!window.TT.shared.flags.useAmountStepper.get();
      }
      return localStorage.getItem('tt_use_amount_stepper') === 'true';
    } catch (e) {
      return false;
    }
  };


  const __ttV4ResolveFramer = () => {
    if (typeof window === 'undefined') return {};
    const candidates = [
      window.FramerMotion,
      window.framerMotion,
      window['framer-motion'],
      window.Motion,
      window.motion
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (candidate.motion || candidate.AnimatePresence) return candidate;
      if (candidate.default && (candidate.default.motion || candidate.default.AnimatePresence)) {
        return candidate.default;
      }
    }
    return {};
  };
  const __ttV4Framer = __ttV4ResolveFramer();
  const __ttV4Motion = __ttV4Framer.motion || new Proxy({}, {
    get: () => (props) => React.createElement('div', props)
  });
  const __ttV4AnimatePresence = __ttV4Framer.AnimatePresence || (({ children }) => children);
  const __ttV4UseDragControls = __ttV4Framer.useDragControls;

  const InputRow = (props) => {
    const TTInputRow = window.TT?.shared?.TTInputRow || window.TTInputRow;
    if (TTInputRow) {
      return React.createElement(TTInputRow, {
        ...props,
        formatDateTime: formatDateTime,
        useWheelPickers: _ttUseWheelPickers
      });
    }
    console.warn('[TTInputHalfSheet] InputRow not found, using fallback');
    return React.createElement('div', null, 'InputRow fallback');
  };
  
  const PenIcon = window.PenIcon;
  const ChevronDown = window.ChevronDown;
  
  // Wheel picker components
  const _pickers = (typeof window !== 'undefined' && window.TT?.shared?.pickers) ? window.TT.shared.pickers : {};
  const TTPhotoRow = _pickers.TTPhotoRow || window.TT?.shared?.TTPhotoRow || window.TTPhotoRow;
  const TTAmountStepper = window.TT?.shared?.TTAmountStepper || window.TTAmountStepper;
  
  // TTInputHalfSheet Component
  const TTInputHalfSheetLegacy = ({ isOpen, onClose, kidId, initialMode = 'feeding', onAdd = null }) => {
    const __ttUseV4Sheet = true;
    const useActiveSleep = (typeof window !== 'undefined' && window.TT?.shared?.useActiveSleep)
      ? window.TT.shared.useActiveSleep
      : (() => ({ activeSleep: null, activeSleepLoaded: true }));
    const useNewInputFlow = true;
    const dragControls = __ttV4UseDragControls ? __ttV4UseDragControls() : null;
    // Check localStorage for active sleep on mount to determine initial mode
    const getInitialMode = () => {
      // Use prop if provided, otherwise check localStorage
      if (initialMode) return initialMode;
      try {
        const activeSleep = localStorage.getItem('tt_active_sleep');
        if (activeSleep) {
          const parsed = JSON.parse(activeSleep);
          if (parsed.startTime) {
            return 'sleep';
          }
        }
      } catch (e) {
        // Ignore errors
      }
      return 'feeding';
    };
    
    const getInitialSleepState = () => {
      try {
        const activeSleep = localStorage.getItem('tt_active_sleep');
        if (activeSleep) {
          const parsed = JSON.parse(activeSleep);
          if (parsed.startTime && !parsed.endTime) {
            return 'running';
          }
        }
      } catch (e) {
        // Ignore errors
      }
      return 'idle';
    };
    
    const normalizeIsoTime = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.toISOString();
    };

    const clampStartIsoToNow = (value) => {
      const normalized = normalizeIsoTime(value);
      const now = Date.now();
      if (!normalized) return new Date(now).toISOString();
      const startMs = new Date(normalized).getTime();
      return startMs > now ? new Date(now).toISOString() : normalized;
    };
    
    const getInitialStartTime = () => {
      try {
        const activeSleep = localStorage.getItem('tt_active_sleep');
        if (activeSleep) {
          const parsed = JSON.parse(activeSleep);
          if (parsed.startTime) {
            return normalizeIsoTime(parsed.startTime);
          }
        }
      } catch (e) {
        // Ignore errors
      }
      // Default to "now" so the sleep sheet has a valid, editable start time
      // before the user taps Start Sleep. This also makes the sheet height measurement
      // stable across Feed/Sleep toggles (no surprise growth on first toggle).
      return new Date().toISOString();
    };

    // Wheel picker trays (feature flagged)
    const _pickers = (typeof window !== 'undefined' && window.TT?.shared?.pickers) ? window.TT.shared.pickers : {};
    const TTPickerTray = _pickers.TTPickerTray;
    const AmountPickerLabSection = _pickers.AmountPickerLabSection;
    const WheelPicker = _pickers.WheelPicker;
    const wheelStyles = _pickers.wheelStyles || {};

    const [showAmountTray, setShowAmountTray] = React.useState(false);
    const [amountPickerUnitLocal, setAmountPickerUnitLocal] = React.useState('oz');
    const [amountPickerAmountLocal, setAmountPickerAmountLocal] = React.useState(4);
    const [amountDisplayUnit, setAmountDisplayUnit] = React.useState('oz');

    const [showDateTimeTray, setShowDateTimeTray] = React.useState(false);
    const [dtTarget, setDtTarget] = React.useState('feeding'); // 'feeding' | 'sleep_start' | 'sleep_end'
    const [dtSelectedDate, setDtSelectedDate] = React.useState(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.toISOString();
    });
    const [dtHour, setDtHour] = React.useState(12);
    const [dtMinute, setDtMinute] = React.useState(0);
    const [dtAmpm, setDtAmpm] = React.useState('AM');

    // Tray coordination: close current tray before opening another
    const [pendingTray, setPendingTray] = React.useState(null);
    const TRAY_SWITCH_DELAY_MS = 260;

    React.useEffect(() => {
      if (!pendingTray) return;
      if (showAmountTray || showDateTimeTray) return;
      const timer = setTimeout(() => {
        const nextTray = pendingTray;
        setPendingTray(null);
        if (nextTray === 'amount') {
          setShowAmountTray(true);
          return;
        }
        if (nextTray === 'datetime_feeding' || nextTray === 'datetime_sleep_start' || nextTray === 'datetime_sleep_end') {
          setShowDateTimeTray(true);
        }
      }, TRAY_SWITCH_DELAY_MS);
      return () => clearTimeout(timer);
    }, [pendingTray, showAmountTray, showDateTimeTray]);

    const _formatOz = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return '';
      const fixed = (Math.round(num * 100) / 100);
      return (fixed % 1 === 0) ? String(fixed) : String(fixed).replace(/0+$/,'').replace(/\.$/,'');
    };

    const _snapToStep = (val, step) => {
      const n = Number(val) || 0;
      const s = Number(step) || 1;
      const snapped = Math.round(n / s) * s;
      return s < 1 ? parseFloat(snapped.toFixed(2)) : snapped;
    };

    const setAmountUnitWithConversion = (nextUnit) => {
      if (!nextUnit || nextUnit === amountPickerUnitLocal) return;
      if (nextUnit === 'ml') {
        const ml = _snapToStep(amountPickerAmountLocal * 29.5735, 10);
        setAmountPickerUnitLocal('ml');
        setAmountPickerAmountLocal(ml);
      } else {
        const oz = _snapToStep(amountPickerAmountLocal / 29.5735, 0.25);
        setAmountPickerUnitLocal('oz');
        setAmountPickerAmountLocal(oz);
      }
    };

    const _isoToDateParts = (iso) => {
      const d = new Date(iso);
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      let h24 = d.getHours();
      const minutes = d.getMinutes();
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      h12 = h12 ? h12 : 12;
      return { dayISO: day.toISOString(), hour: h12, minute: minutes, ampm };
    };

    const _partsToISO = ({ dayISO, hour, minute, ampm }) => {
      const base = new Date(dayISO);
      const h12 = Number(hour) || 12;
      const m = Number(minute) || 0;
      const h24 = (ampm === 'PM') ? ((h12 % 12) + 12) : (h12 % 12);
      base.setHours(h24, m, 0, 0);
      return base.toISOString();
    };

    const openTrayPicker = (mode) => {
      if (!_ttUseWheelPickers()) return;
      const wantsAmount = mode === 'amount';
      const wantsDateTime = mode === 'datetime_feeding' || mode === 'datetime_sleep_start' || mode === 'datetime_sleep_end';

      if (wantsAmount) {
        const currentOz = parseFloat(ounces);
        setAmountPickerUnitLocal('oz');
        setAmountPickerAmountLocal(Number.isFinite(currentOz) ? currentOz : 4);
      }

      if (wantsDateTime) {
        const target = mode === 'datetime_sleep_start' ? 'sleep_start' : (mode === 'datetime_sleep_end' ? 'sleep_end' : 'feeding');
        setDtTarget(target);
        const iso = target === 'feeding'
          ? (feedingDateTime || new Date().toISOString())
          : (target === 'sleep_end'
              ? ((endTime || new Date().toISOString()))
              : ((startTime || new Date().toISOString())));
        const parts = _isoToDateParts(iso);
        setDtSelectedDate(parts.dayISO);
        setDtHour(parts.hour);
        setDtMinute(parts.minute);
        setDtAmpm(parts.ampm);
      }

      if (wantsAmount && showAmountTray && !showDateTimeTray) return;
      if (wantsDateTime && showDateTimeTray && !showAmountTray) return;

      if (showAmountTray || showDateTimeTray) {
        setPendingTray(mode);
        if (showAmountTray) setShowAmountTray(false);
        if (showDateTimeTray) setShowDateTimeTray(false);
        return;
      }

      if (wantsAmount) {
        setShowAmountTray(true);
        return;
      }
      if (wantsDateTime) {
        setShowDateTimeTray(true);
      }
    };
    
    const [mode, setMode] = React.useState(getInitialMode()); // 'feeding' | 'sleep'
    
    // Update mode when initialMode prop changes (e.g., when opened from active sleep)
    React.useEffect(() => {
      if (initialMode && isOpen) {
        setMode(initialMode);
      }
    }, [initialMode, isOpen]);
    
    // Feeding state
    const [ounces, setOunces] = React.useState('');
    const [feedingDateTime, setFeedingDateTime] = React.useState(new Date().toISOString());
    const [feedingNotes, setFeedingNotes] = React.useState('');
    
    // Sleep state
    const [sleepState, setSleepState] = React.useState(getInitialSleepState()); // 'idle' | 'idle_with_times' | 'running'
    const [startTime, setStartTime] = React.useState(getInitialStartTime()); // ISO string
    const [endTime, setEndTime] = React.useState(null); // ISO string
    const [sleepNotes, setSleepNotes] = React.useState('');
    const [sleepElapsedMs, setSleepElapsedMs] = React.useState(0);
    const [activeSleepSessionId, setActiveSleepSessionId] = React.useState(null); // Firebase session ID when running
    const { activeSleep, activeSleepLoaded } = useActiveSleep(kidId);
    const sleepIntervalRef = React.useRef(null);
    const [endTimeManuallyEdited, setEndTimeManuallyEdited] = React.useState(false);
    const endTimeManuallyEditedRef = React.useRef(false); // Track manual edits in ref for Firebase subscription
    const prevModeRef = React.useRef(mode); // Track previous mode to detect actual mode changes
    const forcedSleepOnOpenRef = React.useRef(false);
    
    // Shared photos state
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    
    // Collapsible Notes/Photos state (per mode)
    const [feedingNotesExpanded, setFeedingNotesExpanded] = React.useState(false);
    const [feedingPhotosExpanded, setFeedingPhotosExpanded] = React.useState(false);
    const [sleepNotesExpanded, setSleepNotesExpanded] = React.useState(false);
    const [sleepPhotosExpanded, setSleepPhotosExpanded] = React.useState(false);
    const notesExpanded = mode === 'feeding' ? feedingNotesExpanded : sleepNotesExpanded;
    const photosExpanded = mode === 'feeding' ? feedingPhotosExpanded : sleepPhotosExpanded;
    const inputValueClassName = 'text-[18px]';
    
    // Calculate height based on expanded fields
    const calculateHeight = React.useMemo(() => {
      const expandedCount = (notesExpanded ? 1 : 0) + (photosExpanded ? 1 : 0);
      if (expandedCount === 0) return 70;
      if (expandedCount === 1) return 78;
      return 83; // expandedCount === 2
    }, [notesExpanded, photosExpanded]);
    
    // Refs for measuring both content heights
    const feedingContentRef = React.useRef(null);
    const sleepContentRef = React.useRef(null);
    const feedMeasureRef = React.useRef(null);
    const sleepMeasureRef = React.useRef(null);
    const ctaFooterRef = React.useRef(null);
    const [measuredHeightPx, setMeasuredHeightPx] = React.useState(null);
    
    // Reserve space so the bottom CTA button stays in the same visual spot across modes.
    // Also keep content scrolled above the CTA when it is offset upward.
    const CTA_BOTTOM_OFFSET_PX = 30;
    const CTA_SPACER_PX = 86 + CTA_BOTTOM_OFFSET_PX; // base + offset
    const [ctaHeightPx, setCtaHeightPx] = React.useState(CTA_SPACER_PX);
    const ctaPaddingPx = Math.max(ctaHeightPx || 0, CTA_SPACER_PX) + CTA_BOTTOM_OFFSET_PX + 24;
    const HEADER_HEIGHT_PX = 60;
    const CONTENT_PADDING_PX = 32 + 8; // pt-8 + pb-2
    
    const _normalizeSleepStartMs = (startMs, nowMs = Date.now()) => {
      if (!startMs) return null;
      return (startMs > nowMs + 3 * 3600000) ? (startMs - 86400000) : startMs;
    };
    
    // Sync active sleep with Firebase-backed hook
    React.useEffect(() => {
      if (!activeSleepLoaded) return;
      if (activeSleep && activeSleep.id) {
        // There's an active sleep in Firebase
        setActiveSleepSessionId(activeSleep.id);
        if (activeSleep.startTime) {
          const serverStartIso = new Date(activeSleep.startTime).toISOString();
          setStartTime(serverStartIso);
          const normalizedStart = _normalizeSleepStartMs(activeSleep.startTime);
          if (normalizedStart) {
            setSleepElapsedMs(Date.now() - normalizedStart);
          }
        }
        // Don't clear end time if user has manually edited it
        if (!endTimeManuallyEditedRef.current) {
          setEndTime(null);
          setEndTimeManuallyEdited(false);
        }
        // Don't reset to running if user has manually edited end time (which stops the timer)
        if (sleepState !== 'running' && !endTimeManuallyEditedRef.current) {
          setSleepState('running');
        }
      } else {
        // No active sleep in Firebase
        if (sleepState === 'running' && !activeSleepSessionId) {
          // Local state says running but Firebase says no - sync to idle
          setSleepState('idle');
        }
        setActiveSleepSessionId(null);
      }
    }, [activeSleep, activeSleepLoaded, sleepState, activeSleepSessionId]);

    React.useEffect(() => {
      if (!isOpen) {
        forcedSleepOnOpenRef.current = false;
        return;
      }
      if (activeSleepSessionId && !forcedSleepOnOpenRef.current) {
        forcedSleepOnOpenRef.current = true;
      }
    }, [isOpen, activeSleepSessionId, mode]);

    React.useEffect(() => {
      if (!__ttUseV4Sheet || !isOpen) return;
      const measure = () => {
        const feedEl = feedMeasureRef.current;
        const sleepEl = sleepMeasureRef.current;
        const feedHeight = feedEl ? (feedEl.scrollHeight || feedEl.getBoundingClientRect().height || 0) : 0;
        const sleepHeight = sleepEl ? (sleepEl.scrollHeight || sleepEl.getBoundingClientRect().height || 0) : 0;
        const contentHeight = Math.max(feedHeight, sleepHeight);
        const footerHeight = ctaFooterRef.current?.getBoundingClientRect().height || 0;
        const total = Math.ceil(contentHeight + CONTENT_PADDING_PX + HEADER_HEIGHT_PX + footerHeight);
        if (Number.isFinite(total) && total > 0) {
          setMeasuredHeightPx(total);
        }
      };
      const raf = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(raf);
    }, [
      __ttUseV4Sheet,
      isOpen,
      sleepState,
      mode,
      ounces,
      feedingDateTime,
      feedingNotes,
      sleepNotesExpanded,
      sleepPhotosExpanded,
      feedingNotesExpanded,
      feedingPhotosExpanded,
      endTimeManuallyEdited,
      isKeyboardOpen,
      startTime,
      endTime,
      sleepNotes,
      photos.length,
      saving
    ]);
    
    // Persist running state to localStorage (for sheet state persistence)
    React.useEffect(() => {
      if (sleepState === 'running' && startTime) {
        const normalizedStartTime = normalizeIsoTime(startTime);
        if (normalizedStartTime) {
          try {
            localStorage.setItem('tt_active_sleep', JSON.stringify({
              startTime: normalizedStartTime,
              endTime: null
            }));
          } catch (e) {
            // Ignore errors
          }
        }
      } else {
        try {
          localStorage.removeItem('tt_active_sleep');
        } catch (e) {
          // Ignore errors
        }
      }
    }, [sleepState, startTime]);
    
    // Reset state when sheet closes (clean slate on reopen)
    React.useEffect(() => {
      if (!isOpen) {
        // Reset all sleep-related state when closing (except if timer is running)
        if (sleepState !== 'running') {
          setEndTimeManuallyEdited(false);
          endTimeManuallyEditedRef.current = false;
          setStartTime(new Date().toISOString());
          setEndTime(null);
          setSleepNotes('');
          setPhotos([]);
          setSleepElapsedMs(0);
          // Leave sleepState alone; start time resets to a clean default on reopen.
        } else {
          // Timer is running - only reset manual edit flag
          setEndTimeManuallyEdited(false);
          endTimeManuallyEditedRef.current = false;
        }
        // Reset feeding state when closing
        setFeedingDateTime(new Date().toISOString());
        // Reset expand state when closing
        setFeedingNotesExpanded(false);
        setFeedingPhotosExpanded(false);
        setSleepNotesExpanded(false);
        setSleepPhotosExpanded(false);
        setMeasuredHeightPx(null);
      } else {
        // When sheet opens in sleep mode, set startTime to NOW
        // UNLESS sleep is currently running (don't override active sleep)
        if (mode === 'sleep' && sleepState !== 'running' && !activeSleepSessionId) {
          if (activeSleepLoaded) {
            setStartTime(new Date().toISOString());
          }
        }
        // When sheet opens in feeding mode, set feedingDateTime to NOW
        if (mode === 'feeding') {
          setFeedingDateTime(new Date().toISOString());
        }
      }
    }, [isOpen, mode, sleepState, activeSleepSessionId, activeSleepLoaded]);
    
    // Update timer when sleepState is 'running' (timer continues even when sheet closes)
    React.useEffect(() => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }

      if (sleepState !== 'running' || !startTime) {
        if (sleepState !== 'running') {
          setSleepElapsedMs(0);
        }
        return;
      }

      const startMs = new Date(startTime).getTime();
      const start = _normalizeSleepStartMs(startMs);
      if (!start) { 
        setSleepElapsedMs(0); 
        return; 
      }
      
      const tick = () => setSleepElapsedMs(Date.now() - start);
      tick(); // Update immediately - this is the key for snappy response!
      sleepIntervalRef.current = setInterval(tick, 1000);

      return () => {
        if (sleepIntervalRef.current) {
          clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
        }
      };
    }, [sleepState, startTime]);

    
    // Detect keyboard state using visualViewport to hide sticky button when keyboard is open
    React.useEffect(() => {
      if (!isOpen) {
        setIsKeyboardOpen(false);
        return;
      }
      
      const vv = window.visualViewport;
      if (!vv) return;
      
      const checkKeyboard = () => {
        const layoutH = document.documentElement?.clientHeight || window.innerHeight;
        const keyboardHeight = layoutH - vv.height - vv.offsetTop;
        setIsKeyboardOpen(keyboardHeight > 50); // Threshold: 50px means keyboard is likely open
      };
      
      vv.addEventListener('resize', checkKeyboard);
      vv.addEventListener('scroll', checkKeyboard);
      checkKeyboard(); // Initial check
      
      return () => {
        vv.removeEventListener('resize', checkKeyboard);
        vv.removeEventListener('scroll', checkKeyboard);
      };
    }, [isOpen]);

    React.useEffect(() => {
      if (!__ttUseV4Sheet) return;
      const measure = () => {
        const el = ctaFooterRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect && rect.height) {
          setCtaHeightPx(rect.height);
        }
      };
      measure();
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, [__ttUseV4Sheet, mode, sleepState, endTimeManuallyEdited, isKeyboardOpen, saving]);
    
    // Auto-populate start time when toggle switches to Sleep
    React.useEffect(() => {
      const prevMode = prevModeRef.current;
      const modeChanged = prevMode !== mode;
      const modeChangedToSleep = modeChanged && mode === 'sleep';
      prevModeRef.current = mode;
      if (modeChanged && isOpen) {
        setFeedingNotesExpanded(false);
        setFeedingPhotosExpanded(false);
        setSleepNotesExpanded(false);
        setSleepPhotosExpanded(false);
        setMeasuredHeightPx(null);
      }
      
      if (modeChangedToSleep && isOpen) {
        // Mode just switched to sleep - set startTime to NOW
        // UNLESS sleep is currently running (don't override active sleep)
        if (sleepState !== 'running' && !activeSleepSessionId && activeSleepLoaded) {
          setStartTime(new Date().toISOString());
        }
      }
      
      // Clear end time when in idle state and not in idle_with_times
      // This runs whenever relevant state changes, but only clears if needed
      if (mode === 'sleep' && isOpen && sleepState === 'idle') {
        const hasBothTimes = startTime && endTime;
        if (!hasBothTimes && activeSleepLoaded && !activeSleepSessionId) {
          setEndTime(null);
        }
      }
    }, [mode, isOpen, sleepState, activeSleepSessionId, activeSleepLoaded]); // Removed startTime and endTime from deps to fix bug
    
    // Auto-populate start time when toggle switches to Feeding
    React.useEffect(() => {
      if (mode === 'feeding' && isOpen) {
        // Always set feedingDateTime to NOW when feeding mode is selected
        setFeedingDateTime(new Date().toISOString());
      }
    }, [mode, isOpen]);
    
    // Preserve expand state per mode; reset happens on close.
    
    // Load most recent feed ounces when switching to feeding mode
    React.useEffect(() => {
      if (mode === 'feeding' && kidId && !ounces && typeof firestoreStorage !== 'undefined') {
        const loadMostRecentOunces = async () => {
          try {
            const feedings = await firestoreStorage.getFeedingsLastNDays(30);
            if (feedings && feedings.length > 0) {
              // Sort by timestamp descending to get most recent
              const sorted = feedings.sort((a, b) => b.timestamp - a.timestamp);
              const mostRecent = sorted[0];
              if (mostRecent && mostRecent.ounces) {
                setOunces(String(mostRecent.ounces));
              }
            }
          } catch (e) {
            // Ignore errors
          }
        };
        loadMostRecentOunces();
      }
    }, [mode, kidId]);
    
    // Photo handling functions
    const handleAddPhoto = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setPhotos((prev) => [...(prev || []), event.target.result]);
            try { document.body.removeChild(input); } catch {}
          };
          reader.readAsDataURL(file);
        } else {
          try { document.body.removeChild(input); } catch {}
        }
      };
      try { document.body.appendChild(input); } catch {}
      input.click();
    };

    const handleRemovePhoto = (index) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
    };
    
    // Calculate duration for sleep mode
    const calculateDuration = () => {
      if (!startTime || !endTime) return { hours: 0, minutes: 0, seconds: 0 };
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diff = end - start;
      
      // If end is before start, return null to indicate invalid
      if (diff < 0) {
        return null; // Invalid - end before start
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds };
    };
    
    const durationResult = calculateDuration();
    const isSleepValid = durationResult !== null;
    const duration = isSleepValid ? durationResult : { hours: 0, minutes: 0, seconds: 0 };
    
    // Determine if we're in idle_with_times state (both times entered but not running)
    const isIdleWithTimes = sleepState === 'idle' && startTime && endTime;
    
    // Handle close - always close immediately (state reset happens in useEffect)
    const handleClose = () => {
      // Prevent closing half sheet if any tray is open
      if (showAmountTray || showDateTimeTray) {
        return;
      }
      if (onClose) onClose();
    };

    // Handle add feeding - save to Firebase
    const handleAddFeeding = async () => {
      const amount = parseFloat(ounces);
      if (!amount || amount <= 0 || saving) {
        return;
      }
      setSaving(true);
      try {
        const timestamp = new Date(feedingDateTime).getTime();
        
        // Upload photos to Firebase Storage
        const photoURLs = [];
        if (photos && photos.length > 0) {
          for (let i = 0; i < photos.length; i++) {
            const photoBase64 = photos[i];
          try {
            const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
            photoURLs.push(downloadURL);
          } catch (error) {
              console.error(`[TTInputHalfSheet] Failed to upload photo ${i + 1}:`, error);
              console.error('[TTInputHalfSheet] Photo upload error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
              });
            // Continue with other photos even if one fails
          }
          }
        }
        
        // Save to Firebase
        await firestoreStorage.addFeedingWithNotes(
          amount,
          timestamp,
          feedingNotes || null,
          photoURLs.length > 0 ? photoURLs : null
        );

        // If this feeding has notes or photos, also post it into the family chat "from @tinytracker"
        try {
          const hasNote = !!(feedingNotes && String(feedingNotes).trim().length > 0);
          const hasPhotos = Array.isArray(photoURLs) && photoURLs.length > 0;
          if ((hasNote || hasPhotos) && firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
            const eventTime = new Date(timestamp);
            const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const chatMsg = {
              role: 'assistant',
              content: `@tinytracker: Feeding • ${timeLabel}${hasNote ? `\n${String(feedingNotes).trim()}` : ''}`,
              timestamp: Date.now(),
              source: 'log',
              logType: 'feeding',
              logTimestamp: timestamp,
              photoURLs: hasPhotos ? photoURLs : []
            };
            await firestoreStorage.saveMessage(chatMsg);
          }
        } catch (e) {}
        
        // Reset form
        setOunces('');
        setFeedingNotes('');
        setPhotos([]);
        setFeedingDateTime(new Date().toISOString());
        // Close the sheet first
        if (onClose) onClose();
        // Then refresh timeline after sheet closes (onAdd callback handles the delay)
        if (onAdd) {
          await onAdd('feeding');
        }
      } catch (error) {
        console.error('[TTInputHalfSheet] Failed to add feeding:', error);
        console.error('[TTInputHalfSheet] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        alert(`Failed to add feeding: ${error.message || 'Please try again.'}`);
      } finally {
        setSaving(false);
      }
    };

    // Handle start sleep: IDLE/IDLE_WITH_TIMES/COMPLETED → RUNNING
    const handleStartSleep = async () => {
      try {
        let sessionId = activeSleepSessionId;
        let startMs;
        let effectiveStartIso = startTime;
        
        if (isIdleWithTimes) {
          // IDLE_WITH_TIMES → RUNNING: Keep existing start time, clear end time
          startMs = new Date(startTime).getTime();
          setEndTime(null);
        } else {
          // IDLE/IDLE_WITH_TIMES → RUNNING:
          // Use the user-selected startTime if present; otherwise default to now.
          const parsed = effectiveStartIso ? new Date(effectiveStartIso).getTime() : NaN;
          if (!effectiveStartIso || !Number.isFinite(parsed)) {
            effectiveStartIso = new Date().toISOString();
            setStartTime(effectiveStartIso);
            startMs = new Date(effectiveStartIso).getTime();
          } else {
            const clampedStartIso = clampStartIsoToNow(effectiveStartIso);
            if (clampedStartIso !== effectiveStartIso) {
              effectiveStartIso = clampedStartIso;
              setStartTime(effectiveStartIso);
            }
            startMs = new Date(effectiveStartIso).getTime();
          }
          // Clear any end time when starting a running timer.
          setEndTime(null);
        }
        
        // Create/update Firebase session
        if (!sessionId) {
          const session = await firestoreStorage.startSleep(startMs);
          sessionId = session.id;
          setActiveSleepSessionId(sessionId);
        } else {
          // Update existing session
          await firestoreStorage.updateSleepSession(sessionId, {
            startTime: startMs,
            endTime: null,
            isActive: true
          });
        }
        
        setSleepState('running');
        // Timer will start via useEffect when sleepState becomes 'running'
      } catch (error) {
        console.error('Failed to start sleep:', error);
        alert('Failed to start sleep. Please try again.');
      }
    };

    // Handle end sleep: RUNNING → saves sleep (with photos!), closes sheet, opens timeline
    const handleEndSleep = async () => {
      if (sleepState !== 'running' || saving) return;
      setSaving(true);
      try {
        const now = new Date().toISOString();
        const endMs = Date.now();
        setEndTime(now);
        
        // End Firebase session
        if (activeSleepSessionId) {
          await firestoreStorage.endSleep(activeSleepSessionId, endMs);
          
          // Upload photos to Firebase Storage (IMPORTANT: save photos!)
          const photoURLs = [];
          for (const photoBase64 of photos) {
            try {
              const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
              photoURLs.push(downloadURL);
            } catch (error) {
              console.error('Failed to upload photo:', error);
            }
          }
          
          // Update with notes/photos if provided
          if (sleepNotes || photoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(activeSleepSessionId, {
              notes: sleepNotes || null,
              photoURLs: photoURLs.length > 0 ? photoURLs : null
            });

            // Also post to family chat "from @tinytracker"
            try {
              if (firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
                const eventTime = new Date(startTime);
                const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const hasNote = !!(sleepNotes && String(sleepNotes).trim().length > 0);
                const chatMsg = {
                  role: 'assistant',
                  content: `@tinytracker: Sleep • ${timeLabel}${hasNote ? `\n${String(sleepNotes).trim()}` : ''}`,
                  timestamp: Date.now(),
                  source: 'log',
                  logType: 'sleep',
                  logTimestamp: new Date(startTime).getTime(),
                  photoURLs: (photoURLs && photoURLs.length > 0) ? photoURLs : []
                };
                await firestoreStorage.saveMessage(chatMsg);
              }
            } catch (e) {}
          }
          
          setActiveSleepSessionId(null);
        }
        
        // Reset state
        setSleepState('idle');
        setStartTime(new Date().toISOString());
        setEndTime(null);
        setSleepNotes('');
        setPhotos([]);
        setSleepElapsedMs(0);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
        
        // Close the sheet first
        if (onClose) onClose();
        
        // Then refresh timeline and open accordion (onAdd callback handles this)
        if (onAdd) {
          await onAdd('sleep');
        }
      } catch (error) {
        console.error('Failed to end sleep:', error);
        alert('Failed to end sleep. Please try again.');
      } finally {
        setSaving(false);
      }
    };
    
    // Handle start time change
    const handleStartTimeChange = async (newStartTime) => {
      const clampedStartTime = clampStartIsoToNow(newStartTime);
      setStartTime(clampedStartTime);
      
      if (sleepState === 'running') {
        setEndTime(null);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
        const normalizedStartTime = normalizeIsoTime(clampedStartTime);
        if (normalizedStartTime) {
          try {
            localStorage.setItem('tt_active_sleep', JSON.stringify({
              startTime: normalizedStartTime,
              endTime: null
            }));
          } catch (e) {
            // Ignore errors
          }
        }
        // RUNNING: Update Firebase immediately so card timer reflects the change
        // Timer will recalculate via useEffect dependency on startTime
        if (activeSleepSessionId && typeof firestoreStorage !== 'undefined') {
          try {
            const startMs = new Date(newStartTime).getTime();
            await firestoreStorage.updateSleepSession(activeSleepSessionId, {
              startTime: startMs
            });
          } catch (error) {
            console.error('Failed to update start time in Firebase:', error);
          }
        }
      }
      // IDLE: No Firebase update needed - start time is saved when "Start Sleep" is pressed
    };
    
    // Handle end time change - shows Save button when edited, makes text red if invalid
    const handleEndTimeChange = (newEndTime) => {
        setEndTime(newEndTime);
      setEndTimeManuallyEdited(true);
      endTimeManuallyEditedRef.current = true; // Update ref
      
      if (sleepState === 'running') {
        // RUNNING: Editing end time stops timer
        setSleepState('idle');
      }
    };
    
    // Handle save sleep when end time is manually edited
    const handleSaveSleep = async () => {
      if (!isSleepValid || saving) return; // Prevent saving if invalid
      setSaving(true);
      try {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        
        // Check for overlaps (exclude active session if ending it)
        const excludeId = activeSleepSessionId || null;
        const hasOverlap = await checkSleepOverlap(startMs, endMs, excludeId);
        if (hasOverlap) {
          alert('This sleep session overlaps with an existing sleep session. Please adjust the times.');
          return;
        }
        
        // Upload photos to Firebase Storage (IMPORTANT: save photos!)
        const photoURLs = [];
        for (const photoBase64 of photos) {
          try {
            const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
            photoURLs.push(downloadURL);
          } catch (error) {
            console.error('Failed to upload photo:', error);
          }
        }
        
        // If we have an active session, end it and update
        if (activeSleepSessionId) {
          await firestoreStorage.endSleep(activeSleepSessionId, endMs);
          if (sleepNotes || photoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(activeSleepSessionId, {
              notes: sleepNotes || null,
              photoURLs: photoURLs.length > 0 ? photoURLs : null
            });
          }
          setActiveSleepSessionId(null);
      } else {
          // Create new session
          const session = await firestoreStorage.startSleep(startMs);
          await firestoreStorage.endSleep(session.id, endMs);
          if (sleepNotes || photoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(session.id, {
              notes: sleepNotes || null,
              photoURLs: photoURLs.length > 0 ? photoURLs : null
            });
          }
        }
        
        // Reset to IDLE and close
        setSleepState('idle');
        setStartTime(new Date().toISOString());
        setEndTime(null);
        setSleepNotes('');
        setPhotos([]);
        setSleepElapsedMs(0);
        setActiveSleepSessionId(null);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false; // Reset ref
        
        // Auto-close after save
        if (onClose) onClose();
        // Then refresh timeline and open accordion (onAdd callback handles this)
        if (onAdd) {
          await onAdd('sleep');
        }
      } catch (error) {
        console.error('Failed to save sleep session:', error);
        alert('Failed to save sleep session. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    // Validation
    const isValid = () => {
      if (mode === 'feeding') {
        const amount = parseFloat(ounces);
        return amount > 0;
      } else {
        // Sleep: valid in COMPLETED state or IDLE_WITH_TIMES with valid duration
        return isIdleWithTimes && isSleepValid;
      }
    };

    const handleSave = async () => {
      if (!isValid()) return; // Don't save if invalid
      
      if (mode === 'feeding') {
        // Feeding save is handled by handleAddFeeding
        await handleAddFeeding();
      } else {
        // Sleep: saveable in COMPLETED or IDLE_WITH_TIMES state
        if (!isIdleWithTimes) return;
        
        try {
          const startMs = new Date(startTime).getTime();
          const endMs = new Date(endTime).getTime();
          
          // Check for overlaps (exclude active session if ending it)
          const excludeId = activeSleepSessionId || null;
          const hasOverlap = await checkSleepOverlap(startMs, endMs, excludeId);
          if (hasOverlap) {
            alert('This sleep session overlaps with an existing sleep session. Please adjust the times.');
            return;
          }
          
          // Upload photos to Firebase Storage
          const photoURLs = [];
          for (const photoBase64 of photos) {
            try {
              const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
              photoURLs.push(downloadURL);
            } catch (error) {
              console.error('Failed to upload photo:', error);
              // Continue with other photos even if one fails
            }
          }
          
          // If we have an active session, end it and update
          if (activeSleepSessionId) {
            await firestoreStorage.endSleep(activeSleepSessionId, endMs);
            if (sleepNotes || photoURLs.length > 0) {
              await firestoreStorage.updateSleepSession(activeSleepSessionId, {
                notes: sleepNotes || null,
                photoURLs: photoURLs.length > 0 ? photoURLs : null
              });

              // Also post to family chat "from @tinytracker"
              try {
                if (firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
                  const eventTime = new Date(startMs);
                  const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const hasNote = !!(sleepNotes && String(sleepNotes).trim().length > 0);
                  const chatMsg = {
                    role: 'assistant',
                    content: `@tinytracker: Sleep • ${timeLabel}${hasNote ? `\n${String(sleepNotes).trim()}` : ''}`,
                    timestamp: Date.now(),
                    source: 'log',
                    logType: 'sleep',
                    logTimestamp: startMs,
                    photoURLs: (photoURLs && photoURLs.length > 0) ? photoURLs : []
                  };
                  await firestoreStorage.saveMessage(chatMsg);
                }
              } catch (e) {}
            }
            setActiveSleepSessionId(null);
          } else {
            // Create new session (IDLE_WITH_TIMES case)
            const session = await firestoreStorage.startSleep(startMs);
            await firestoreStorage.endSleep(session.id, endMs);
            if (sleepNotes || photoURLs.length > 0) {
              await firestoreStorage.updateSleepSession(session.id, {
                notes: sleepNotes || null,
                photoURLs: photoURLs.length > 0 ? photoURLs : null
              });

              // Also post to family chat "from @tinytracker"
              try {
                if (firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
                  const eventTime = new Date(startMs);
                  const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const hasNote = !!(sleepNotes && String(sleepNotes).trim().length > 0);
                  const chatMsg = {
                    role: 'assistant',
                    content: `@tinytracker: Sleep • ${timeLabel}${hasNote ? `\n${String(sleepNotes).trim()}` : ''}`,
                    timestamp: Date.now(),
                    source: 'log',
                    logType: 'sleep',
                    logTimestamp: startMs,
                    photoURLs: (photoURLs && photoURLs.length > 0) ? photoURLs : []
                  };
                  await firestoreStorage.saveMessage(chatMsg);
                }
              } catch (e) {}
            }
          }
          
          // Reset to IDLE and close
          setSleepState('idle');
          setStartTime(null);
          setEndTime(null);
          setSleepNotes('');
          setPhotos([]);
          setSleepElapsedMs(0);
          setActiveSleepSessionId(null);
          
          // Auto-close after save
          if (onClose) onClose();
          // Then refresh timeline after sheet closes (onAdd callback handles the delay)
          if (onAdd) {
            await onAdd('sleep');
          }
        } catch (error) {
          console.error('Failed to save sleep session:', error);
          alert('Failed to save sleep session. Please try again.');
        }
      }
    };

    // Helper function to render feeding content
    const renderFeedingContent = () => React.createElement(
      React.Fragment,
      null,
      // Input rows wrapped in spacing container
      React.createElement('div', { className: "space-y-2" },
        React.createElement(InputRow, {
          label: 'Start time',
          value: formatDateTime(feedingDateTime),
          rawValue: feedingDateTime,
          onChange: setFeedingDateTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          valueClassName: inputValueClassName,
          type: 'datetime',
          pickerMode: 'datetime_feeding',
          onOpenPicker: openTrayPicker,
        }),
        
        // Ounces
        (_ttUseAmountStepper() && TTAmountStepper)
          ? React.createElement(TTAmountStepper, {
              label: 'Amount',
              valueOz: parseFloat(ounces) || 0,
              unit: amountDisplayUnit,
              onChangeUnit: setAmountDisplayUnit,
              onChangeOz: (nextOz) => setOunces(_formatOz(nextOz))
            })
          : React.createElement(InputRow, {
              label: 'Amount',
              value: ounces,
              onChange: setOunces,
              icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
              valueClassName: inputValueClassName,
              type: 'number',
              placeholder: '0',
              suffix: 'oz',
              inlineSuffix: true,
              pickerMode: 'amount',
              onOpenPicker: openTrayPicker
            }),

        // Notes/photos compact toggles (side-by-side when both collapsed)
        (!feedingNotesExpanded && !feedingPhotosExpanded) && React.createElement('div', { className: "grid grid-cols-2 gap-3" },
          React.createElement('div', {
            onClick: () => setFeedingNotesExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add notes'),
          TTPhotoRow && React.createElement('div', {
            onClick: () => setFeedingPhotosExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add photos')
        ),

        // Notes - conditionally render based on expanded state
        feedingNotesExpanded 
          ? (__ttUseV4Sheet
              ? React.createElement(__ttV4Motion.div, {
                  initial: { opacity: 0, y: 6, scale: 0.98 },
                  animate: { opacity: 1, y: 0, scale: 1 },
                  transition: { type: "spring", damping: 25, stiffness: 300 }
                },
                React.createElement(InputRow, {
                  label: 'Notes',
                  value: feedingNotes,
                  onChange: setFeedingNotes,
                  icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
                  valueClassName: inputValueClassName,
                  type: 'text',
                  placeholder: 'Add a note...'
                })
              )
              : React.createElement(InputRow, {
                  label: 'Notes',
                  value: feedingNotes,
                  onChange: setFeedingNotes,
                  icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
                  valueClassName: inputValueClassName,
                  type: 'text',
                  placeholder: 'Add a note...'
                })
            )
          : feedingPhotosExpanded ? React.createElement('div', {
              onClick: () => setFeedingNotesExpanded(true),
              className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, '+ Add notes') : null
      ),

      TTPhotoRow && feedingPhotosExpanded && (__ttUseV4Sheet
        ? React.createElement(__ttV4Motion.div, {
            initial: { opacity: 0, y: 6, scale: 0.98 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { type: "spring", damping: 25, stiffness: 300 }
          },
          React.createElement(TTPhotoRow, {
            expanded: feedingPhotosExpanded,
            onExpand: () => setFeedingPhotosExpanded(true),
            existingPhotos: [],
            newPhotos: photos,
            onAddPhoto: handleAddPhoto,
            onRemovePhoto: (index) => handleRemovePhoto(index),
            onPreviewPhoto: setFullSizePhoto
          })
        )
        : React.createElement(TTPhotoRow, {
            expanded: feedingPhotosExpanded,
            onExpand: () => setFeedingPhotosExpanded(true),
            existingPhotos: [],
            newPhotos: photos,
            onAddPhoto: handleAddPhoto,
            onRemovePhoto: (index) => handleRemovePhoto(index),
            onPreviewPhoto: setFullSizePhoto
          })
      ),

      TTPhotoRow && !feedingPhotosExpanded && feedingNotesExpanded && React.createElement('div', {
        onClick: () => setFeedingPhotosExpanded(true),
        className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
        style: { color: 'var(--tt-text-tertiary)' }
      }, '+ Add photos'),

      // Reserve space for sticky footer CTA (legacy only)
      !__ttUseV4Sheet && React.createElement('div', { style: { height: `${CTA_SPACER_PX}px` } })
    );

    // Helper function to render sleep content
    const renderSleepContent = () => {
      // Calculate timer display (apply shared formatting rules)
      const displayMs = (() => {
        if (sleepState === 'running') return sleepElapsedMs;

        // Only show duration if both start and end times are set
        // Otherwise show 0 (no timer running)
        if (!startTime || !endTime) {
          return 0;
        }

        // Completed / idle-with-times: show duration from start/end
        return (
          (Number(duration.hours || 0) * 3600000) +
          (Number(duration.minutes || 0) * 60000) +
          (Number(duration.seconds || 0) * 1000)
        );
      })();
      const tParts = formatElapsedHmsTT(displayMs);
      
      // Time fields are always editable (even in RUNNING state)
      // Show icon always
      const timeIcon = React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } });
      
      return React.createElement(
        React.Fragment,
        null,
        // Timer Display
        React.createElement('div', { className: "text-center mb-10" },
          React.createElement('div', { className: "text-[40px] leading-none font-bold flex items-end justify-center", style: { color: 'var(--tt-text-primary)' } },
            React.createElement(React.Fragment, null,
              tParts.showH && React.createElement(React.Fragment, null,
                React.createElement('span', null, tParts.hStr),
                React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'h'),
                React.createElement('span', { className: "ml-2" })
              ),
              tParts.showM && React.createElement(React.Fragment, null,
                React.createElement('span', null, tParts.mStr),
                React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'm'),
                React.createElement('span', { className: "ml-2" })
              ),
              React.createElement('span', null, tParts.sStr),
              React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 's')
            )
          )
        ),

        // Input rows wrapped in spacing container
        React.createElement('div', { className: "space-y-2" },
          React.createElement('div', { className: "grid grid-cols-2 gap-3" },
            // Start time
            React.createElement(InputRow, {
              label: 'Start time',
              value: startTime ? formatDateTime(startTime) : '--:--',
              rawValue: startTime,
              onChange: handleStartTimeChange,
              icon: timeIcon,
              valueClassName: inputValueClassName,
              type: 'datetime',
              pickerMode: 'datetime_sleep_start',
              onOpenPicker: openTrayPicker,
              readOnly: false // Always editable
            }),

            // End time
            React.createElement(InputRow, {
              label: 'End time',
              value: endTime ? formatDateTime(endTime) : 'Add...',
              rawValue: endTime,
              onChange: handleEndTimeChange,
              icon: timeIcon,
              valueClassName: inputValueClassName,
              type: 'datetime',
              pickerMode: 'datetime_sleep_end',
              onOpenPicker: openTrayPicker,
              placeholder: 'Add...',
              readOnly: false, // Always editable
              invalid: !saving && !isSleepValid && isIdleWithTimes
            })
          ),

          // Notes/photos compact toggles (side-by-side when both collapsed)
          (!sleepNotesExpanded && !sleepPhotosExpanded) && React.createElement('div', { className: "grid grid-cols-2 gap-3" },
            React.createElement('div', {
              onClick: () => setSleepNotesExpanded(true),
              className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, '+ Add notes'),
            TTPhotoRow && React.createElement('div', {
              onClick: () => setSleepPhotosExpanded(true),
              className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, '+ Add photos')
          ),

          // Notes - conditionally render based on expanded state
          sleepNotesExpanded 
            ? (__ttUseV4Sheet
                ? React.createElement(__ttV4Motion.div, {
                    initial: { opacity: 0, y: 6, scale: 0.98 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    transition: { type: "spring", damping: 25, stiffness: 300 }
                  },
                  React.createElement(InputRow, {
                    label: 'Notes',
                    value: sleepNotes,
                    onChange: setSleepNotes,
                    icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
                    valueClassName: inputValueClassName,
                    type: 'text',
                    placeholder: 'Add a note...'
                  })
                )
                : React.createElement(InputRow, {
                    label: 'Notes',
                    value: sleepNotes,
                    onChange: setSleepNotes,
                    icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
                    valueClassName: inputValueClassName,
                    type: 'text',
                    placeholder: 'Add a note...'
                  })
              )
          : sleepPhotosExpanded ? React.createElement('div', {
              onClick: () => setSleepNotesExpanded(true),
              className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, '+ Add notes') : null
        ),

        TTPhotoRow && sleepPhotosExpanded && (__ttUseV4Sheet
          ? React.createElement(__ttV4Motion.div, {
              initial: { opacity: 0, y: 6, scale: 0.98 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { type: "spring", damping: 25, stiffness: 300 }
            },
            React.createElement(TTPhotoRow, {
              expanded: sleepPhotosExpanded,
              onExpand: () => setSleepPhotosExpanded(true),
              existingPhotos: [],
              newPhotos: photos,
              onAddPhoto: handleAddPhoto,
              onRemovePhoto: (index) => handleRemovePhoto(index),
              onPreviewPhoto: setFullSizePhoto
            })
          )
          : React.createElement(TTPhotoRow, {
              expanded: sleepPhotosExpanded,
              onExpand: () => setSleepPhotosExpanded(true),
              existingPhotos: [],
              newPhotos: photos,
              onAddPhoto: handleAddPhoto,
              onRemovePhoto: (index) => handleRemovePhoto(index),
              onPreviewPhoto: setFullSizePhoto
            })
        ),

        TTPhotoRow && !sleepPhotosExpanded && sleepNotesExpanded && React.createElement('div', {
          onClick: () => setSleepPhotosExpanded(true),
          className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
          style: { color: 'var(--tt-text-tertiary)' }
        }, '+ Add photos'),

        // Reserve space for sticky footer CTA (legacy only)
        !__ttUseV4Sheet && React.createElement('div', { style: { height: `${CTA_SPACER_PX}px` } })
      );
    };


    // Body content - render both for measurement, show one based on mode
    // IMPORTANT: Make the body a full-height flex column so the CTA stays locked to the bottom
    // even when one mode's content is shorter.
    const animatedContent = __ttUseV4Sheet
      ? React.createElement(
          __ttV4Motion.div,
          {
            layout: true,
            transition: { type: "spring", damping: 25, stiffness: 300 }
          },
          mode === 'feeding' ? renderFeedingContent() : renderSleepContent()
        )
      : React.createElement(
          React.Fragment,
          null,
          // Feeding content (hidden when not active, but rendered for measurement)
          React.createElement('div', {
            ref: feedingContentRef,
            style: mode === 'feeding' ? {
              position: 'relative',
              opacity: 1
            } : { 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
              height: 'auto'
            }
          }, renderFeedingContent()),
          
          // Sleep content (hidden when not active, but rendered for measurement)
          React.createElement('div', {
            ref: sleepContentRef,
            style: mode === 'sleep' ? {
              position: 'relative',
              opacity: 1
            } : { 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
              height: 'auto'
            }
          }, renderSleepContent())
        );

    const ctaButton = (() => {
      if (saving) {
        const savingColor = mode === 'feeding' ? 'var(--tt-feed-strong)' : 'var(--tt-sleep-strong)';
        return React.createElement('button', {
          type: 'button',
          disabled: true,
          onTouchStart: (e) => {
            // Prevent scroll container from capturing touch
            e.stopPropagation();
          },
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: savingColor,
            touchAction: 'manipulation',
            opacity: 0.7,
            cursor: 'not-allowed'
          }
        }, 'Saving...');
      }

      if (mode === 'feeding') {
        return React.createElement('button', {
          type: 'button',
          onClick: handleAddFeeding,
          onTouchStart: (e) => {
            // Prevent scroll container from capturing touch
            e.stopPropagation();
          },
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-feed)',
            touchAction: 'manipulation' // Prevent scroll interference on mobile
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = 'var(--tt-feed-strong)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = 'var(--tt-feed)';
          }
        }, 'Add Feed');
      }

      // Sleep CTA button logic
      if (sleepState === 'running') {
        return React.createElement('button', {
          type: 'button',
          onClick: handleEndSleep,
          onTouchStart: (e) => {
            // Prevent scroll container from capturing touch
            e.stopPropagation();
          },
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-sleep)',
            touchAction: 'manipulation' // Prevent scroll interference on mobile
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = 'var(--tt-sleep)';
          }
        }, 'Stop timer');
      }

      if (endTimeManuallyEdited) {
        // Show Save button when end time is edited
        // Disabled and red text if invalid
        const isValid = isSleepValid;
        return React.createElement('button', {
          type: 'button',
          onClick: isValid ? handleSaveSleep : undefined,
          onTouchStart: (e) => {
            // Prevent scroll container from capturing touch
            e.stopPropagation();
          },
          disabled: !isValid,
          className: "w-full py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: isValid ? 'var(--tt-sleep)' : 'transparent',
            color: isValid ? 'white' : '#ef4444', // Red text when invalid
            border: isValid ? 'none' : '1px solid #ef4444',
            cursor: isValid ? 'pointer' : 'not-allowed',
            opacity: isValid ? 1 : 0.7,
            touchAction: 'manipulation' // Prevent scroll interference on mobile
          },
          onMouseEnter: (e) => {
            if (isValid) {
              e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
            }
          },
          onMouseLeave: (e) => {
            if (isValid) {
              e.target.style.backgroundColor = 'var(--tt-sleep)';
            }
          }
        }, 'Save');
      }

      // Show Start Sleep button when idle
      return React.createElement('button', {
        type: 'button',
        onClick: handleStartSleep,
        onTouchStart: (e) => {
          // Prevent scroll container from capturing touch
          e.stopPropagation();
        },
        className: "w-full text-white py-3 rounded-2xl font-semibold transition",
        style: {
          backgroundColor: 'var(--tt-sleep)',
          touchAction: 'manipulation' // Prevent scroll interference on mobile
        },
        onMouseEnter: (e) => {
          e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
        },
        onMouseLeave: (e) => {
          e.target.style.backgroundColor = 'var(--tt-sleep)';
        }
      }, 'Start Sleep');
    })();

    const contentWrapper = React.createElement('div', {
      style: {
        position: 'relative',
        overflow: __ttUseV4Sheet ? 'visible' : 'hidden',
        width: '100%',
        flex: __ttUseV4Sheet ? undefined : 1,
        minHeight: 0,
        paddingBottom: __ttUseV4Sheet ? undefined : `${ctaPaddingPx}px`
      }
    },
      animatedContent,
      __ttUseV4Sheet && React.createElement('div', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1
        }
      },
        React.createElement('div', { ref: feedMeasureRef }, renderFeedingContent()),
        React.createElement('div', { ref: sleepMeasureRef }, renderSleepContent())
      )
    );

    const overlayContent = React.createElement(
      React.Fragment,
      null,
      // Wheel amount tray (feature flagged)
      TTPickerTray && AmountPickerLabSection && _ttUseWheelPickers() && React.createElement(TTPickerTray, {
        isOpen: showAmountTray,
        onClose: () => setShowAmountTray(false),
        header: React.createElement(React.Fragment, null,
          React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center' } },
            window.TT?.shared?.SegmentedToggle && React.createElement(window.TT.shared.SegmentedToggle, {
              value: amountPickerUnitLocal,
              options: [
                { value: 'oz', label: 'oz' },
                { value: 'ml', label: 'ml' }
              ],
              onChange: (val) => setAmountUnitWithConversion(val),
              variant: 'body',
              size: 'medium'
            })
          ),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center' } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 17, color: 'var(--tt-text-primary)' } }, 'Amount')
          ),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' } },
            React.createElement('button', {
              onClick: () => {
                const oz = (amountPickerUnitLocal === 'ml') ? (amountPickerAmountLocal / 29.5735) : amountPickerAmountLocal;
                setOunces(_formatOz(oz));
                setShowAmountTray(false);
              },
              style: { background: 'none', border: 'none', padding: 0, color: 'var(--tt-feed)', fontSize: 17, fontWeight: 600 }
            }, 'Done')
          )
        )
      },
        React.createElement(AmountPickerLabSection, {
          unit: amountPickerUnitLocal,
          setUnit: setAmountUnitWithConversion,
          amount: amountPickerAmountLocal,
          setAmount: setAmountPickerAmountLocal,
          showHeader: false
        })
      ),

      // Wheel date/time tray (feature flagged)
      TTPickerTray && WheelPicker && _ttUseWheelPickers() && React.createElement(TTPickerTray, {
        isOpen: showDateTimeTray,
        onClose: () => setShowDateTimeTray(false),
        header: React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: () => setShowDateTimeTray(false),
            style: { justifySelf: 'start', background: 'none', border: 'none', padding: 0, color: 'var(--tt-text-secondary)', fontSize: 17 }
          }, 'Cancel'),
          React.createElement('div', { style: { justifySelf: 'center', fontWeight: 600, fontSize: 17, color: 'var(--tt-text-primary)' } },
            dtTarget === 'sleep_end' ? 'End time' : (dtTarget === 'sleep_start' ? 'Start time' : 'Time')
          ),
          React.createElement('button', {
            onClick: () => {
              const nextISO = _partsToISO({ dayISO: dtSelectedDate, hour: dtHour, minute: dtMinute, ampm: dtAmpm });
              if (dtTarget === 'sleep_end') handleEndTimeChange(nextISO);
              else if (dtTarget === 'sleep_start') handleStartTimeChange(nextISO);
              else setFeedingDateTime(nextISO);
              setShowDateTimeTray(false);
            },
            style: { justifySelf: 'end', background: 'none', border: 'none', padding: 0, color: (mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)'), fontSize: 17, fontWeight: 600 }
          }, 'Done')
        )
      },
        React.createElement('div', { style: wheelStyles.section || {} },
          React.createElement('div', { style: { position: 'relative' } },
            React.createElement('div', {
              style: {
                position: 'absolute',
                left: 8,
                right: 8,
                top: '50%',
                height: 40,
                transform: 'translateY(-50%)',
                background: 'var(--tt-subtle-surface)',
                borderRadius: 8,
                zIndex: 0,
                pointerEvents: 'none'
              }
            }),
            React.createElement('div', {
              style: {
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: 'min(65px, 16vw) min(50px, 12vw) 8px min(50px, 12vw) min(50px, 12vw)',
                justifyContent: 'center',
                alignItems: 'center',
                columnGap: '0px',
                padding: '0',
                maxWidth: '100%'
              }
            },
              React.createElement(WheelPicker, { type: 'date', value: dtSelectedDate, onChange: setDtSelectedDate, compact: true, dateCompact: true, showSelection: false }),
              React.createElement(WheelPicker, { type: 'hour', value: dtHour, onChange: setDtHour, compact: true, showSelection: false }),
              React.createElement('div', { style: { ...(wheelStyles.timeColon || {}), width: '8px', fontSize: '20px', height: '40px', lineHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: 'translateY(-2.5px)' } }, ':'),
              React.createElement(WheelPicker, { type: 'minute', value: dtMinute, onChange: setDtMinute, compact: true, showSelection: false }),
              React.createElement(WheelPicker, { type: 'ampm', value: dtAmpm, onChange: setDtAmpm, compact: true, showSelection: false })
            )
          )
        )
      ),

    // Full-size photo modal (shared for both modes) (PORTAL to body so it isn't trapped inside sheet transforms)
      fullSizePhoto && ReactDOM.createPortal(
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black/75 flex items-center justify-center p-4",
          style: { zIndex: 20000 }
        },
          React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              setFullSizePhoto(null);
            },
            className: "absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors z-[103]",
            'aria-label': 'Close'
          },
            React.createElement('svg', {
              xmlns: "http://www.w3.org/2000/svg",
              width: "32",
              height: "32",
              fill: "#ffffff",
              viewBox: "0 0 256 256",
              className: "w-5 h-5"
            },
              React.createElement('path', {
                d: "M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
              })
            )
          ),
          React.createElement('img', {
            src: fullSizePhoto,
            alt: "Full size photo",
            className: "max-w-full max-h-full object-contain",
            onClick: (e) => e.stopPropagation()
          })
        ),
        document.body
      )
    );

    const bodyContent = React.createElement(
      React.Fragment,
      null,
      React.createElement('div', {
        className: "flex-1 px-6 pt-10 pb-2",
        style: {
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'visible',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'auto'
        }
      }, contentWrapper),
      React.createElement('div', {
        ref: ctaFooterRef,
        className: "px-6 pt-3 pb-1",
        style: {
          backgroundColor: 'var(--tt-halfsheet-bg)',
          display: isKeyboardOpen ? 'none' : 'block',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 80px)',
          flexShrink: 0
        }
      }, ctaButton),
      overlayContent
    );

    // If overlay mode (isOpen provided), render v4 overlay
    if (isOpen !== undefined) {
      const v4Overlay = React.createElement(
        __ttV4AnimatePresence,
        null,
        isOpen
          ? React.createElement(
              __ttV4Motion.div,
              {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                className: "fixed",
                style: {
                  zIndex: 10000,
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)'
                },
                onClick: handleClose
              }
            )
          : null,
        isOpen
          ? React.createElement(
              __ttV4Motion.div,
              {
                initial: { y: "100%" },
                animate: { y: 0 },
                exit: { y: "100%" },
                transition: { type: "spring", damping: 35, stiffness: 400 },
                drag: "y",
                dragControls: dragControls || undefined,
                dragListener: !dragControls,
                dragConstraints: { top: 0, bottom: 0 },
                dragElastic: { top: 0, bottom: 0.7 },
                dragMomentum: true,
                onDragEnd: (e, info) => {
                  if (info.offset.y > 60 || info.velocity.y > 500) {
                    handleClose();
                  }
                },
                className: "fixed left-0 right-0 bottom-0 shadow-2xl",
                onClick: (e) => e.stopPropagation(),
                style: {
                  backgroundColor: "var(--tt-halfsheet-bg)",
                  willChange: 'transform',
                  paddingBottom: 'env(safe-area-inset-bottom, 0)',
                  maxHeight: '83vh',
                  height: 'auto',
                  minHeight: '60vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  touchAction: 'pan-y',
                  overscrollBehavior: 'contain',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  zIndex: 10001
                }
              },
              React.createElement('div', {
                className: "",
                style: {
                  backgroundColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  padding: '0 1.5rem',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  touchAction: 'none'
                },
                onPointerDown: (e) => {
                  if (dragControls && dragControls.start) {
                    dragControls.start(e);
                  }
                }
              },
                React.createElement('button', {
                  onClick: handleClose,
                  className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
                }, React.createElement(
                  window.TT?.shared?.icons?.ChevronDownIcon ||
                  window.ChevronDown ||
                  window.XIcon,
                  { className: "w-5 h-5", style: { transform: 'translateY(1px)' } }
                )),
                React.createElement('div', { className: "flex-1 flex justify-center" },
                  React.createElement('h2', { className: "text-base font-semibold text-white" }, mode === 'feeding' ? 'Feeding' : 'Sleep')
                ),
                React.createElement('div', { className: "w-6" })
              ),
              React.createElement('div', {
                className: "flex-1",
                style: {
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }
              }, bodyContent)
            )
          : null
      );
      return ReactDOM.createPortal(v4Overlay, document.body);
    }

    // Static preview mode (for UI Lab inline display)
    return React.createElement(
      'div',
      { 
        className: "rounded-2xl shadow-sm p-6 space-y-0",
        style: {
          backgroundColor: "var(--tt-halfsheet-bg, var(--tt-subtle-surface, rgba(0,0,0,0.04)))",
          border: "1px solid var(--tt-card-border, rgba(0,0,0,0.06))"
        }
      },
      // Header: [ChevronDown] [Toggle] [empty] - fixed 60px height
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 h-[60px] mb-6 flex items-center justify-between" },
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, React.createElement(ChevronDown, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
        React.createElement('div', { className: "flex-1 flex justify-center" },
          React.createElement('h2', { className: "text-base font-semibold text-white" }, mode === 'feeding' ? 'Feeding' : 'Sleep')
        ),
        React.createElement('div', { className: "w-6" })
      ),
      bodyContent
    );
  };

  const TTInputHalfSheetV4 = (props) => React.createElement(TTInputHalfSheetLegacy, {
    ...props,
    __ttUseV4Sheet: true
  });

  const TTInputHalfSheet = (props) => React.createElement(TTInputHalfSheetV4, props);

  // Expose component globally
  if (typeof window !== 'undefined') {
    window.TTInputHalfSheet = TTInputHalfSheet;
  }
}
