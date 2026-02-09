// FeedSheet Component
// Unified feed input + feed detail sheet

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.FeedSheet) {
  
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
    const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');
    if (h > 0) {
      const hStr = h >= 10 ? pad2(h) : String(h);
      const mStr = pad2(m);
      const sStr = pad2(s);
      return { h, m, s, str: `${hStr}h ${mStr}m ${sStr}s` };
    }
    if (m > 0) {
      const mStr = m >= 10 ? pad2(m) : String(m);
      const sStr = pad2(s);
      return { h: 0, m, s, str: `${mStr}m ${sStr}s` };
    }
    const sStr = s < 10 ? String(s) : pad2(s);
    return { h: 0, m: 0, s, str: `${sStr}s` };
  });
  
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

  var __ttNormalizePhotoUrls = (typeof window !== 'undefined' && window.__ttNormalizePhotoUrls)
    ? window.__ttNormalizePhotoUrls
    : (input) => {
        if (!input) return [];
        const items = Array.isArray(input) ? input : [input];
        const urls = [];
        for (const item of items) {
          if (typeof item === 'string' && item.trim()) {
            urls.push(item);
            continue;
          }
          if (item && typeof item === 'object') {
            const maybe =
              item.url ||
              item.publicUrl ||
              item.publicURL ||
              item.downloadURL ||
              item.downloadUrl ||
              item.src ||
              item.uri;
            if (typeof maybe === 'string' && maybe.trim()) {
              urls.push(maybe);
            }
          }
        }
        return urls;
      };

  if (typeof window !== 'undefined' && !window.__ttNormalizePhotoUrls) {
    window.__ttNormalizePhotoUrls = __ttNormalizePhotoUrls;
  }



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
    // Fallback to basic input if TTInputRow not available
    return React.createElement('input', props);
  };
  
  const PenIcon = window.PenIcon;
  const XIcon = window.XIcon;
  const ChevronDown = window.ChevronDown;
  const TTAmountStepper = window.TT?.shared?.TTAmountStepper || window.TTAmountStepper;
  const BottleV2 = window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"] || null;
  const NursingIcon = window.TT?.shared?.icons?.NursingIcon || null;
  const SearchIcon = window.TT?.shared?.icons?.SearchIcon || null;
  const SolidsIcon = window.TT?.shared?.icons?.SolidsIcon || null;
  const PlayIcon = (props) => React.createElement(
    'svg',
    { ...props, xmlns: "http://www.w3.org/2000/svg", width: "32", height: "32", viewBox: "0 0 256 256", fill: "currentColor" },
    React.createElement('path', { d: "M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" })
  );
  const PauseIcon = (props) => React.createElement(
    'svg',
    { ...props, xmlns: "http://www.w3.org/2000/svg", width: "32", height: "32", viewBox: "0 0 256 256", fill: "currentColor" },
    React.createElement('path', { d: "M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z" })
  );

  const FeedSheet = ({
    variant = 'input', // 'input' | 'detail'
    isOpen,
    onClose,
    entry = null,
    onDelete = null,
    onSave = null,
    onAdd = null,
    preferredVolumeUnit = null,
    activityVisibility = null
  }) => {
    const isInputVariant = variant !== 'detail';
    const effectiveEntry = isInputVariant ? null : entry;
    const effectiveOnSave = isInputVariant ? onAdd : onSave;
    const dragControls = __ttV4UseDragControls ? __ttV4UseDragControls() : null;
    const _normalizeActivityVisibility = (value) => {
      const base = { bottle: true, nursing: true, solids: true };
      if (!value || typeof value !== 'object') return base;
      return {
        bottle: typeof value.bottle === 'boolean' ? value.bottle : base.bottle,
        nursing: typeof value.nursing === 'boolean' ? value.nursing : base.nursing,
        solids: typeof value.solids === 'boolean' ? value.solids : base.solids
      };
    };
    const feedVisibility = _normalizeActivityVisibility(activityVisibility);
    const initialFeedType = feedVisibility.bottle
      ? 'bottle'
      : (feedVisibility.nursing ? 'nursing' : 'bottle');
    const [ounces, setOunces] = React.useState('');
    const [dateTime, setDateTime] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const dateTimeTouchedRef = React.useRef(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [feedType, setFeedType] = React.useState(initialFeedType); // 'bottle' | 'nursing' | 'solids'
    const isNursing = feedType === 'nursing';
    const isSolids = feedType === 'solids';

    const [leftElapsedMs, setLeftElapsedMs] = React.useState(0);
    const [rightElapsedMs, setRightElapsedMs] = React.useState(0);
    const [activeSide, setActiveSide] = React.useState(null); // 'left' | 'right' | null
    const [lastSide, setLastSide] = React.useState(null); // 'left' | 'right' | null
    const activeSideRef = React.useRef(null);
    const activeSideStartRef = React.useRef(null);
    const [timerTick, setTimerTick] = React.useState(0);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    const ctaFooterRef = React.useRef(null);
    // Track original photo URLs to detect deletions
    const originalPhotoURLsRef = React.useRef([]);
    
    // Collapsible Notes/Photos state
    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);
    const inputValueClassName = 'text-[18px]';
    const notesInputRef = React.useRef(null);
    const [notesWrappedLines, setNotesWrappedLines] = React.useState(1);

    // Solids-specific state
    const [addedFoods, setAddedFoods] = React.useState([]);
    const [detailFoodId, setDetailFoodId] = React.useState(null);
    const detailFoodCache = React.useRef(null);
    const [solidsStep, setSolidsStep] = React.useState(1); // 1: entry, 2: browse, 3: review
    const [solidsSearch, setSolidsSearch] = React.useState('');
    const [recentFoods, setRecentFoods] = React.useState([]);
    const [customFoods, setCustomFoods] = React.useState([]);
    const solidsSheetRef = React.useRef(null);
    const solidsHeaderRef = React.useRef(null);
    const solidsContentRef = React.useRef(null);
    const solidsStepTwoMotionRef = React.useRef(null);
    const [solidsSheetBaseHeight, setSolidsSheetBaseHeight] = React.useState(null);
    const [solidsHeaderHeight, setSolidsHeaderHeight] = React.useState(0);
    const [solidsFooterHeight, setSolidsFooterHeight] = React.useState(0);
    const [solidsStep2Pad, setSolidsStep2Pad] = React.useState(0);

    // Wheel picker trays (feature flagged)
    const _pickers = (typeof window !== 'undefined' && window.TT?.shared?.pickers) ? window.TT.shared.pickers : {};
    const TTPickerTray = _pickers.TTPickerTray;
    const AmountPickerLabSection = _pickers.AmountPickerLabSection;
    const WheelPicker = _pickers.WheelPicker;
    const wheelStyles = _pickers.wheelStyles || {};
    const TTPhotoRow = _pickers.TTPhotoRow || window.TT?.shared?.TTPhotoRow || window.TTPhotoRow;

    const resolveFeedType = (entryItem) => {
      if (!entryItem) return 'bottle';
      if (entryItem.feedType === 'nursing' || entryItem.type === 'nursing') return 'nursing';
      if (entryItem.feedType === 'solids' || entryItem.type === 'solids') return 'solids';
      if (entryItem.leftDurationSec != null || entryItem.rightDurationSec != null) return 'nursing';
      if (entryItem.foods && Array.isArray(entryItem.foods)) return 'solids';
      return 'bottle';
    };

    React.useEffect(() => {
      activeSideRef.current = activeSide;
    }, [activeSide]);

    React.useEffect(() => {
      if (!isInputVariant) return;
      const visibleTypes = [
        feedVisibility.bottle ? 'bottle' : null,
        feedVisibility.nursing ? 'nursing' : null,
        feedVisibility.solids ? 'solids' : null
      ].filter(Boolean);
      if (visibleTypes.length === 0) return;
      if (visibleTypes.includes(feedType)) return;
      setFeedType(visibleTypes[0]);
    }, [feedVisibility.bottle, feedVisibility.nursing, feedVisibility.solids, isInputVariant, feedType]);

    React.useEffect(() => {
      if (!isOpen || !activeSideRef.current) return undefined;
      const tick = () => setTimerTick(Date.now());
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }, [isOpen, activeSide]);

    const stopActiveSide = React.useCallback(() => {
      const runningSide = activeSideRef.current;
      const startedAt = activeSideStartRef.current;
      if (!runningSide || !startedAt) return;
      const delta = Math.max(0, Date.now() - startedAt);
      if (runningSide === 'left') {
        setLeftElapsedMs((prev) => prev + delta);
      } else if (runningSide === 'right') {
        setRightElapsedMs((prev) => prev + delta);
      }
      activeSideStartRef.current = null;
      activeSideRef.current = null;
      setActiveSide(null);
    }, []);

    const handleToggleSide = React.useCallback((side) => {
      if (!side) return;
      if (activeSideRef.current === side) {
        stopActiveSide();
        return;
      }
      if (activeSideRef.current) {
        stopActiveSide();
      }
      if (!dateTime) {
        setDateTimeProgrammatic(new Date().toISOString());
      }
      activeSideStartRef.current = Date.now();
      activeSideRef.current = side;
      setActiveSide(side);
      setLastSide(side);
    }, [dateTime, stopActiveSide]);

    const _resolveVolumeUnit = (value) => (value === 'ml' || value === 'oz') ? value : null;
    const _getStoredVolumeUnit = () => {
      try {
        const stored = localStorage.getItem('tt_volume_unit');
        return (stored === 'ml' || stored === 'oz') ? stored : null;
      } catch (e) {
        return null;
      }
    };
    const _persistVolumeUnit = (unit) => {
      try { localStorage.setItem('tt_volume_unit', unit); } catch (e) {}
      if (typeof firestoreStorage !== 'undefined' && firestoreStorage.saveSettings) {
        firestoreStorage.saveSettings({ preferredVolumeUnit: unit }).catch(() => {});
      }
      try {
        const event = new CustomEvent('tt:volume-unit-changed', { detail: { unit } });
        window.dispatchEvent(event);
      } catch (e) {}
    };
    const initialVolumeUnit = _resolveVolumeUnit(preferredVolumeUnit) || _getStoredVolumeUnit() || 'oz';

    const [showAmountTray, setShowAmountTray] = React.useState(false);
    const [amountPickerUnitLocal, setAmountPickerUnitLocal] = React.useState(initialVolumeUnit);
    const [amountPickerAmountLocal, setAmountPickerAmountLocal] = React.useState(initialVolumeUnit === 'ml' ? 120 : 4);
    const [amountDisplayUnit, setAmountDisplayUnit] = React.useState(initialVolumeUnit);
    const [amountDisplayInput, setAmountDisplayInput] = React.useState('');

    const [showDateTimeTray, setShowDateTimeTray] = React.useState(false);
    const [dtTarget, setDtTarget] = React.useState('feeding'); // 'feeding'
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
        if (nextTray === 'datetime_feeding') {
          setShowDateTimeTray(true);
        }
      }, TRAY_SWITCH_DELAY_MS);
      return () => clearTimeout(timer);
    }, [pendingTray, showAmountTray, showDateTimeTray]);

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
    }, [isOpen, preferredVolumeUnit]);

    const _formatOz = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return '';
      const fixed = (Math.round(num * 100) / 100);
      return (fixed % 1 === 0) ? String(fixed) : String(fixed).replace(/0+$/,'').replace(/\.$/,'');
    };

    const _formatMl = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return '';
      return String(Math.max(0, Math.round(num)));
    };

    const _ozToMl = (oz) => Number(oz) * 29.5735;
    const _mlToOz = (ml) => Number(ml) / 29.5735;

    const _snapToStep = (val, step) => {
      const n = Number(val) || 0;
      const s = Number(step) || 1;
      const snapped = Math.round(n / s) * s;
      return s < 1 ? parseFloat(snapped.toFixed(2)) : snapped;
    };

    const _syncDisplayInputForUnit = (nextUnit, sourceOz = ounces) => {
      if (nextUnit === 'ml') {
        const ozVal = Number(sourceOz);
        if (!Number.isFinite(ozVal)) {
          setAmountDisplayInput('');
          return;
        }
        setAmountDisplayInput(_formatMl(_ozToMl(ozVal)));
        return;
      }
      setAmountDisplayInput(sourceOz || '');
    };

    const _setDisplayUnit = (nextUnit, { persist = false } = {}) => {
      if (!nextUnit || nextUnit === amountDisplayUnit) return;
      userEditedUnitRef.current = true;
      setAmountDisplayUnit(nextUnit);
      _syncDisplayInputForUnit(nextUnit);
      if (persist) _persistVolumeUnit(nextUnit);
    };

    const setAmountUnitWithConversion = (nextUnit) => {
      if (!nextUnit || nextUnit === amountPickerUnitLocal) return;
      if (nextUnit === 'ml') {
        const ml = _snapToStep(amountPickerAmountLocal * 29.5735, 10);
        setAmountPickerUnitLocal('ml');
        setAmountPickerAmountLocal(ml);
        _setDisplayUnit('ml', { persist: true });
      } else {
        const oz = _snapToStep(amountPickerAmountLocal / 29.5735, 0.25);
        setAmountPickerUnitLocal('oz');
        setAmountPickerAmountLocal(oz);
        _setDisplayUnit('oz', { persist: true });
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
      const wantsDateTime = mode === 'datetime_feeding';

      if (wantsAmount) {
        const currentOz = parseFloat(ounces);
        const unit = amountDisplayUnit === 'ml' ? 'ml' : 'oz';
        setAmountPickerUnitLocal(unit);
        if (unit === 'ml') {
          const ml = Number.isFinite(currentOz) ? _snapToStep(_ozToMl(currentOz), 10) : 120;
          setAmountPickerAmountLocal(ml);
        } else {
          setAmountPickerAmountLocal(Number.isFinite(currentOz) ? currentOz : 4);
        }
      }
      if (wantsDateTime) {
        setDtTarget('feeding');
        const parts = _isoToDateParts(dateTime || new Date().toISOString());
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

    const handleDateTimeChange = (nextValue) => {
      dateTimeTouchedRef.current = true;
      setDateTime(nextValue);
    };

    const setDateTimeProgrammatic = (nextValue) => {
      dateTimeTouchedRef.current = false;
      setDateTime(nextValue);
    };

    const userEditedAmountRef = React.useRef(false);
    const userEditedUnitRef = React.useRef(false);

    const handleOuncesChange = (nextValue) => {
      userEditedAmountRef.current = true;
      if (amountDisplayUnit === 'ml') {
        setAmountDisplayInput(nextValue);
        const ml = parseFloat(nextValue);
        if (!Number.isFinite(ml)) {
          setOunces('');
          return;
        }
        setOunces(_formatOz(_mlToOz(ml)));
        return;
      }
      setAmountDisplayInput(nextValue);
      setOunces(nextValue);
    };

    const handleOuncesChangeFromStepper = (nextOz) => {
      userEditedAmountRef.current = true;
      const formattedOz = _formatOz(nextOz);
      setOunces(formattedOz);
      if (amountDisplayUnit === 'ml') {
        setAmountDisplayInput(_formatMl(_ozToMl(nextOz)));
      } else {
        setAmountDisplayInput(formattedOz);
      }
    };

    // Populate form from entry when it exists
    React.useEffect(() => {
      if (effectiveEntry && isOpen) {
        const nextFeedType = resolveFeedType(effectiveEntry);
        setFeedType(nextFeedType);
        setActiveSide(null);
        activeSideRef.current = null;
        activeSideStartRef.current = null;

        const normalizedExisting = __ttNormalizePhotoUrls(effectiveEntry.photoURLs);
        setExistingPhotoURLs(normalizedExisting);
        originalPhotoURLsRef.current = normalizedExisting;
        setPhotos([]);
        setNotes(effectiveEntry.notes || '');
        setNotesExpanded(!!effectiveEntry.notes);
        setPhotosExpanded(normalizedExisting.length > 0);

        if (nextFeedType === 'nursing') {
          const startMs = effectiveEntry.startTime || effectiveEntry.timestamp;
          setDateTimeProgrammatic(startMs ? new Date(startMs).toISOString() : '');
          setLeftElapsedMs(Math.max(0, Number(effectiveEntry.leftDurationSec || 0) * 1000));
          setRightElapsedMs(Math.max(0, Number(effectiveEntry.rightDurationSec || 0) * 1000));
          setLastSide(effectiveEntry.lastSide || null);
          userEditedAmountRef.current = false;
          setOunces('');
          _syncDisplayInputForUnit(amountDisplayUnit, '');
        } else {
          const nextOz = effectiveEntry.ounces ? effectiveEntry.ounces.toString() : '';
          setOunces(nextOz);
          _syncDisplayInputForUnit(amountDisplayUnit, nextOz);
          setDateTimeProgrammatic(effectiveEntry.timestamp ? new Date(effectiveEntry.timestamp).toISOString() : new Date().toISOString());
          setLeftElapsedMs(0);
          setRightElapsedMs(0);
          setLastSide(null);
        }
      } else if (!effectiveEntry && isOpen) {
        // Create mode - reset to defaults
        setFeedType('bottle');
        userEditedAmountRef.current = false;
        setOunces('');
        _syncDisplayInputForUnit(amountDisplayUnit, '');
        setDateTimeProgrammatic(new Date().toISOString());
        setNotes('');
        setExistingPhotoURLs([]);
        originalPhotoURLsRef.current = [];
        setPhotos([]);
        setNotesExpanded(false);
        setPhotosExpanded(false);
        setLeftElapsedMs(0);
        setRightElapsedMs(0);
        setLastSide(null);
        setActiveSide(null);
        activeSideRef.current = null;
        activeSideStartRef.current = null;
      }
    }, [effectiveEntry, isOpen, amountDisplayUnit]);

    React.useEffect(() => {
      let cancelled = false;
      const maybePrefillFromServer = async () => {
        if (!isOpen || effectiveEntry) return;
        if (userEditedAmountRef.current) return;
        if (typeof firestoreStorage === 'undefined' || !firestoreStorage.getAllFeedings) return;
        try {
          const all = await firestoreStorage.getAllFeedings();
          if (cancelled) return;
          if (userEditedAmountRef.current) return;
          if (!Array.isArray(all) || all.length === 0) return;
          const last = all.reduce((acc, cur) => {
            if (!cur) return acc;
            const t = Number(cur.timestamp || cur.time || cur.createdAt || 0);
            if (!acc) return cur;
            const accT = Number(acc.timestamp || acc.time || acc.createdAt || 0);
            return t > accT ? cur : acc;
          }, null);
          const lastOz = Number(last?.ounces ?? last?.amountOz ?? last?.amount ?? last?.volumeOz ?? last?.volume);
          if (!Number.isFinite(lastOz) || lastOz <= 0) return;
          const unit = userEditedUnitRef.current
            ? (amountDisplayUnit === 'ml' ? 'ml' : 'oz')
            : (_resolveVolumeUnit(preferredVolumeUnit) || _getStoredVolumeUnit() || 'oz');
          setOunces(String(lastOz));
          _syncDisplayInputForUnit(unit, String(lastOz));
          setAmountPickerUnitLocal(unit);
          if (unit === 'ml') {
            setAmountPickerAmountLocal(_snapToStep(_ozToMl(lastOz), 10));
          } else {
            setAmountPickerAmountLocal(lastOz);
          }
          setAmountDisplayUnit(unit);
        } catch (e) {
          // non-fatal
        }
      };
      maybePrefillFromServer();
      return () => {
        cancelled = true;
      };
    }, [isOpen, effectiveEntry]);

    // Reset expand state when sheet closes
    React.useEffect(() => {
      if (!isOpen) {
        setNotesExpanded(false);
        setPhotosExpanded(false);
        userEditedUnitRef.current = false;
        setActiveSide(null);
        activeSideRef.current = null;
        activeSideStartRef.current = null;
        setDetailFoodId(null);
        setSolidsStep(1);
        return;
      }
      const preferred = _resolveVolumeUnit(preferredVolumeUnit) || _getStoredVolumeUnit();
      if (preferred && !userEditedUnitRef.current) {
        setAmountDisplayUnit(preferred);
        _syncDisplayInputForUnit(preferred);
      }
      if (!preferred && typeof firestoreStorage !== 'undefined' && firestoreStorage.getSettings) {
        let cancelled = false;
        firestoreStorage.getSettings().then((settings) => {
          if (cancelled) return;
          if (userEditedUnitRef.current) return;
          const unit = (settings?.preferredVolumeUnit === 'ml') ? 'ml' : 'oz';
          setAmountDisplayUnit(unit);
          _syncDisplayInputForUnit(unit);
          try { localStorage.setItem('tt_volume_unit', unit); } catch (e) {}
        }).catch(() => {});
        return () => { cancelled = true; };
      }
    }, [isOpen]);

    React.useEffect(() => {
      if (!notesExpanded) {
        setNotesWrappedLines(1);
        return;
      }
      const host = notesInputRef.current;
      if (!host) return;
      const textarea = host.querySelector('textarea');
      if (!textarea) return;
      const styles = window.getComputedStyle(textarea);
      let lineHeight = parseFloat(styles.lineHeight);
      if (!Number.isFinite(lineHeight)) {
        const fontSize = parseFloat(styles.fontSize) || 16;
        lineHeight = fontSize * 1.2;
      }
      const lines = Math.max(1, Math.ceil(textarea.scrollHeight / lineHeight));
      setNotesWrappedLines(lines);
    }, [notes, notesExpanded]);

    React.useEffect(() => {
      if (feedType !== 'nursing') {
        stopActiveSide();
      }
    }, [feedType, stopActiveSide]);

    React.useEffect(() => {
      if (!isOpen || effectiveEntry) return;
      if (feedType === 'nursing') {
        if (!dateTimeTouchedRef.current) {
          setDateTimeProgrammatic('');
        }
        return;
      }
      if (!dateTimeTouchedRef.current) {
        setDateTimeProgrammatic(new Date().toISOString());
      }
    }, [feedType, isOpen, effectiveEntry]);

    // Load recent foods and custom foods for solids mode
    React.useEffect(() => {
      if (!isOpen || feedType !== 'solids') return;
      const loadSolidsData = async () => {
        try {
          if (window.firestoreStorage) {
            const [recent, custom] = await Promise.all([
              window.firestoreStorage.getRecentFoods?.() || Promise.resolve([]),
              window.firestoreStorage.getCustomFoods?.() || Promise.resolve([])
            ]);
            setRecentFoods(Array.isArray(recent) ? recent : []);
            setCustomFoods(Array.isArray(custom) ? custom : []);
          }
          if (!effectiveEntry) {
            setSolidsStep(1);
          }
        } catch (err) {
          console.error('[FeedSheet] Failed to load solids data:', err);
        }
      };
      loadSolidsData();
    }, [isOpen, feedType]);

    // Load existing solids entry data when editing
    React.useEffect(() => {
      if (!isOpen || !effectiveEntry || feedType !== 'solids') return;
      if (effectiveEntry.foods && Array.isArray(effectiveEntry.foods)) {
        const slugify = (value) => String(value || '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        const loadedFoods = effectiveEntry.foods.map((f, idx) => {
          const name = f.name || '';
          const id = f.id || slugify(name || `food-${idx}`);
          return {
            id,
            name,
            icon: f.icon || null,
            category: f.category || 'Custom',
            amount: f.amount || null,
            reaction: f.reaction || null,
            preparation: f.preparation || null,
            notes: f.notes || ''
          };
        });
        setAddedFoods(loadedFoods);
        setSolidsStep(1);
      }
    }, [isOpen, effectiveEntry, feedType]);

    // Reset solids state when switching modes
    React.useEffect(() => {
      setAddedFoods([]);
      setDetailFoodId(null);
      setSolidsStep(1);
      setSolidsSearch('');
    }, [feedType]);

    React.useEffect(() => {
      if (!isSolids || solidsStep !== 1) return;
      const node = solidsSheetRef.current;
      if (!node) return;
      const update = () => {
        const rect = node.getBoundingClientRect();
        if (rect && rect.height) {
          setSolidsSheetBaseHeight(rect.height);
        }
      };
      update();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => update());
      ro.observe(node);
      return () => ro.disconnect();
    }, [isSolids, solidsStep, addedFoods.length, notesExpanded, photosExpanded, notesWrappedLines]);

    React.useEffect(() => {
      if (!isSolids) return;
      const headerEl = solidsHeaderRef.current;
      if (!headerEl) return;
      const update = () => {
        const rect = headerEl.getBoundingClientRect();
        setSolidsHeaderHeight(rect && rect.height ? Math.round(rect.height) : 0);
      };
      update();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => update());
      ro.observe(headerEl);
      return () => ro.disconnect();
    }, [isSolids]);

    React.useEffect(() => {
      if (!isSolids) return;
      if (solidsStep === 2) {
        setSolidsFooterHeight(0);
        return;
      }
      const footerEl = ctaFooterRef.current;
      if (!footerEl || isKeyboardOpen) {
        setSolidsFooterHeight(0);
        return;
      }
      const update = () => {
        const rect = footerEl.getBoundingClientRect();
        setSolidsFooterHeight(rect && rect.height ? Math.round(rect.height) : 0);
      };
      update();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => update());
      ro.observe(footerEl);
      return () => ro.disconnect();
    }, [isSolids, isKeyboardOpen, solidsStep]);

    React.useEffect(() => {
      if (!isSolids) return;
      const sheetEl = solidsSheetRef.current;
      const wrapperEl = solidsContentRef.current;
      const step2MotionEl = solidsStepTwoMotionRef.current;
      const footerEl = ctaFooterRef.current;
      const log = (label) => {
        if (!sheetEl) return;
        const sheetRect = sheetEl.getBoundingClientRect();
        const wrapperRect = wrapperEl ? wrapperEl.getBoundingClientRect() : null;
        const step2Rect = step2MotionEl ? step2MotionEl.getBoundingClientRect() : null;
        const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;
        console.log('[SolidsHeightDebug]', {
          label,
          solidsStep,
          sheetHeight: Math.round(sheetRect.height),
          wrapperHeight: wrapperRect ? Math.round(wrapperRect.height) : null,
          step2MotionHeight: step2Rect ? Math.round(step2Rect.height) : null,
          step2MotionScrollHeight: step2MotionEl ? step2MotionEl.scrollHeight : null,
          step2MotionClientHeight: step2MotionEl ? step2MotionEl.clientHeight : null,
          footerHeight: footerRect ? Math.round(footerRect.height) : null,
          viewportHeight: window.innerHeight
        });
      };
      log('effect');
      window.requestAnimationFrame(() => log('raf'));
    }, [isSolids, solidsStep, solidsSheetBaseHeight]);


    React.useEffect(() => {
      if (!isSolids) return;
      const footerEl = ctaFooterRef.current;
      if (!footerEl || isKeyboardOpen) {
        setSolidsStep2Pad(0);
        return;
      }
      const update = () => {
        const rect = footerEl.getBoundingClientRect();
        const nextPad = rect && rect.height ? Math.round(rect.height) + 24 : 0;
        setSolidsStep2Pad(nextPad);
      };
      update();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => update());
      ro.observe(footerEl);
      return () => ro.disconnect();
    }, [isSolids, isKeyboardOpen, solidsStep]);


    const handleSave = async () => {
      if (feedType === 'nursing') {
        const runningSide = activeSideRef.current;
        const startedAt = activeSideStartRef.current;
        const liveDelta = runningSide && startedAt ? Math.max(0, Date.now() - startedAt) : 0;
        const leftMs = leftElapsedMs + (runningSide === 'left' ? liveDelta : 0);
        const rightMs = rightElapsedMs + (runningSide === 'right' ? liveDelta : 0);
        const totalMs = leftMs + rightMs;
        if (!dateTime || totalMs <= 0) return;

        setActiveSide(null);
        activeSideRef.current = null;
        activeSideStartRef.current = null;
        setLeftElapsedMs(leftMs);
        setRightElapsedMs(rightMs);

        setSaving(true);
        try {
          const timestamp = new Date(dateTime).getTime();

          const newPhotoURLs = [];
          if (photos && photos.length > 0) {
            for (let i = 0; i < photos.length; i++) {
              const photoBase64 = photos[i];
              try {
                const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
                newPhotoURLs.push(downloadURL);
              } catch (error) {
                console.error(`[FeedSheet] Failed to upload photo ${i + 1}:`, error);
                console.error('[FeedSheet] Photo upload error details:', {
                  message: error.message,
                  stack: error.stack,
                  name: error.name
                });
              }
            }
          }

          const allPhotoURLs = __ttNormalizePhotoUrls([...existingPhotoURLs, ...newPhotoURLs]);
          const leftSec = Math.round(leftMs / 1000);
          const rightSec = Math.round(rightMs / 1000);

          if (effectiveEntry && effectiveEntry.id) {
            await firestoreStorage.updateNursingSessionWithNotes(
              effectiveEntry.id,
              timestamp,
              leftSec,
              rightSec,
              lastSide || null,
              notes || null,
              allPhotoURLs.length > 0 ? allPhotoURLs : []
            );
          } else {
            await firestoreStorage.addNursingSessionWithNotes(
              timestamp,
              leftSec,
              rightSec,
              lastSide || null,
              notes || null,
              allPhotoURLs.length > 0 ? allPhotoURLs : []
            );
          }

          try {
            const hasNote = !!(notes && String(notes).trim().length > 0);
            const hasPhotos = Array.isArray(allPhotoURLs) && allPhotoURLs.length > 0;
            if ((hasNote || hasPhotos) && firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
              const eventTime = new Date(timestamp);
              const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const contentParts = [];
              if (hasNote) contentParts.push(String(notes).trim());
              if (!hasNote && hasPhotos) contentParts.push('Photo update');
              const chatMsg = {
                role: 'assistant',
                content: `@tinytracker: Nursing • ${timeLabel}${hasNote ? `\n${contentParts.join('\n')}` : ''}`,
                timestamp: Date.now(),
                source: 'log',
                logType: 'nursing',
                logTimestamp: timestamp,
                photoURLs: hasPhotos ? allPhotoURLs : []
              };
              await firestoreStorage.saveMessage(chatMsg);
            }
          } catch (e) {}

          handleClose();
          if (effectiveOnSave) {
            await effectiveOnSave();
          }
        } catch (error) {
          console.error('[FeedSheet] Failed to save nursing session:', error);
          console.error('[FeedSheet] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
          });
          alert(`Failed to save nursing session: ${error.message || 'Please try again.'}`);
        } finally {
          setSaving(false);
        }
        return;
      }

      // Solids handling
      if (feedType === 'solids') {
        if (!dateTime || addedFoods.length === 0) return;

        setSaving(true);
        try {
          const timestamp = new Date(dateTime).getTime();

          // Upload photos
          const newPhotoURLs = [];
          if (photos && photos.length > 0) {
            for (let i = 0; i < photos.length; i++) {
              const photoBase64 = photos[i];
              try {
                const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
                newPhotoURLs.push(downloadURL);
              } catch (error) {
                console.error(`[FeedSheet] Failed to upload photo ${i + 1}:`, error);
              }
            }
          }

          const allPhotoURLs = __ttNormalizePhotoUrls([...existingPhotoURLs, ...newPhotoURLs]);

          if (effectiveEntry && effectiveEntry.id) {
            // Update existing solids session
            await firestoreStorage.updateSolidsSession(effectiveEntry.id, {
              timestamp,
              foods: addedFoods.map(f => ({
                name: f.name,
                category: f.category || 'Custom',
                amount: f.amount || null,
                reaction: f.reaction || null,
                preparation: f.preparation || null,
                notes: f.notes || null
              })),
              notes: notes || null,
              photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : null
            });
          } else {
            // Create new solids session
            await firestoreStorage.addSolidsSession({
              timestamp,
              foods: addedFoods.map(f => ({
                name: f.name,
                category: f.category || 'Custom',
                amount: f.amount || null,
                reaction: f.reaction || null,
                preparation: f.preparation || null,
                notes: f.notes || null
              })),
              notes: notes || null,
              photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : null
            });
          }

          // Update recent foods
          try {
            for (const food of addedFoods) {
              await firestoreStorage.updateRecentFoods(food.name);
            }
          } catch (e) {
            console.error('[FeedSheet] Failed to update recent foods:', e);
          }

          // Save to chat if has notes or photos
          try {
            const hasNote = !!(notes && String(notes).trim().length > 0);
            const hasPhotos = Array.isArray(allPhotoURLs) && allPhotoURLs.length > 0;
            if ((hasNote || hasPhotos) && firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
              const eventTime = new Date(timestamp);
              const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const foodNames = addedFoods.map(f => f.name).join(', ');
              const contentParts = [];
              if (hasNote) contentParts.push(String(notes).trim());
              if (!hasNote && hasPhotos) contentParts.push('Photo update');
              const chatMsg = {
                role: 'assistant',
                content: `@tinytracker: Solids • ${timeLabel}\n${foodNames}${hasNote ? `\n${contentParts.join('\n')}` : ''}`,
                timestamp: Date.now(),
                source: 'log',
                logType: 'solids',
                logTimestamp: timestamp,
                photoURLs: hasPhotos ? allPhotoURLs : []
              };
              await firestoreStorage.saveMessage(chatMsg);
            }
          } catch (e) {}

          handleClose();
          if (effectiveOnSave) {
            await effectiveOnSave();
          }
        } catch (error) {
          console.error('[FeedSheet] Failed to save solids session:', error);
          alert(`Failed to save solids session: ${error.message || 'Please try again.'}`);
        } finally {
          setSaving(false);
        }
        return;
      }

      const amount = parseFloat(ounces);
      if (!amount || amount <= 0) {
        return;
      }

      setSaving(true);
      try {
        const timestamp = new Date(dateTime).getTime();

        // Track removed photos for soft delete (optional cleanup later)
        const originalURLs = originalPhotoURLsRef.current || [];
        const removedPhotoURLs = originalURLs.filter(url => !existingPhotoURLs.includes(url));

        if (removedPhotoURLs.length > 0) {
          // Photos are removed from photoURLs array - no Supabase deletion
          // Files remain in Supabase Storage for optional cleanup later
        }

        // Upload new photos to Supabase Storage
        const newPhotoURLs = [];
        if (photos && photos.length > 0) {
          for (let i = 0; i < photos.length; i++) {
            const photoBase64 = photos[i];
            try {
              const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
              newPhotoURLs.push(downloadURL);
            } catch (error) {
              console.error(`[FeedSheet] Failed to upload photo ${i + 1}:`, error);
              console.error('[FeedSheet] Photo upload error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
              });
              // Continue with other photos even if one fails
            }
          }
        }

        // Combine existing and new photo URLs
        const allPhotoURLs = __ttNormalizePhotoUrls([...existingPhotoURLs, ...newPhotoURLs]);

        if (effectiveEntry && effectiveEntry.id) {
          // Update existing feeding
          await firestoreStorage.updateFeedingWithNotes(
            effectiveEntry.id,
            amount,
            timestamp,
            notes || null,
            allPhotoURLs.length > 0 ? allPhotoURLs : []
          );
        } else {
          // Create new feeding
          await firestoreStorage.addFeedingWithNotes(
            amount,
            timestamp,
            notes || null,
            allPhotoURLs.length > 0 ? allPhotoURLs : []
          );
        }

        // If this feeding has notes or photos, also post it into the family chat "from @tinytracker"
        try {
          const hasNote = !!(notes && String(notes).trim().length > 0);
          const hasPhotos = Array.isArray(allPhotoURLs) && allPhotoURLs.length > 0;
          if ((hasNote || hasPhotos) && firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
            const eventTime = new Date(timestamp);
            const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const contentParts = [];
            if (hasNote) contentParts.push(String(notes).trim());
            if (!hasNote && hasPhotos) contentParts.push('Photo update');
            const chatMsg = {
              role: 'assistant',
              content: `@tinytracker: Feeding • ${timeLabel}${hasNote ? `\n${contentParts.join('\n')}` : ''}`,
              timestamp: Date.now(),
              source: 'log',
              logType: 'feeding',
              logTimestamp: timestamp,
              photoURLs: hasPhotos ? allPhotoURLs : []
            };
            await firestoreStorage.saveMessage(chatMsg);
          }
        } catch (e) {}

        // Close the sheet first
        handleClose();
        // Then refresh timeline after sheet closes (onSave callback handles the delay)
        if (effectiveOnSave) {
          await effectiveOnSave();
        }
      } catch (error) {
        console.error('[FeedSheet] Failed to save feeding:', error);
        console.error('[FeedSheet] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        alert(`Failed to save feeding: ${error.message || 'Please try again.'}`);
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!effectiveEntry || !effectiveEntry.id) return;
      
      setSaving(true);
      try {
        const entryFeedType = resolveFeedType(effectiveEntry);
        if (entryFeedType === 'nursing') {
          await firestoreStorage.deleteNursingSession(effectiveEntry.id);
        } else {
          await firestoreStorage.deleteFeeding(effectiveEntry.id);
        }
        // Close the sheet first
        handleClose();
        // Then refresh timeline after sheet closes (onDelete callback handles the delay)
        if (onDelete) {
          await onDelete();
        }
      } catch (error) {
        console.error('Failed to delete feeding:', error);
        alert('Failed to delete feeding. Please try again.');
      } finally {
        setSaving(false);
        setShowDeleteConfirm(false);
      }
    };

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
      // iOS Safari/PWA: input needs to be in the DOM to reliably open the picker.
      try { document.body.appendChild(input); } catch {}
      input.click();
    };

    const handleRemovePhoto = (index, isExisting = false) => {
      if (isExisting) {
        // Remove from existing photos
        const newExisting = existingPhotoURLs.filter((_, i) => i !== index);
        setExistingPhotoURLs(newExisting);
      } else {
        // Remove from new photos
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
      }
    };

    const handleClose = () => {
      if (onClose) {
        onClose();
      }
    };

    const isEditingEntry = effectiveEntry && effectiveEntry.id;
    const solidsHeaderTitle = solidsStep === 2 ? 'Browse foods' : (solidsStep === 3 ? 'Review' : 'Solids');
    const headerTitle = isEditingEntry
      ? (feedType === 'nursing' ? 'Nursing' : feedType === 'solids' ? solidsHeaderTitle : 'Feed')
      : (feedType === 'nursing' ? 'Nursing' : feedType === 'solids' ? solidsHeaderTitle : 'Feeding');
    const saveButtonLabel = isEditingEntry ? 'Save' : 'Add';

    const accentColor = isSolids ? 'var(--tt-solids)' : (isNursing ? 'var(--tt-nursing)' : 'var(--tt-feed)');
    const accentSoft = isSolids ? 'var(--tt-solids-soft)' : (isNursing ? 'var(--tt-nursing-soft)' : 'var(--tt-feed-soft)');
    const accentStrong = isSolids ? 'var(--tt-solids-strong)' : (isNursing ? 'var(--tt-nursing-strong)' : 'var(--tt-feed-strong)');
    const runningSide = activeSideRef.current;
    const startedAt = activeSideStartRef.current;
    const liveDelta = runningSide && startedAt ? Math.max(0, Date.now() - startedAt) : 0;
    const leftDisplayMs = leftElapsedMs + (runningSide === 'left' ? liveDelta : 0);
    const rightDisplayMs = rightElapsedMs + (runningSide === 'right' ? liveDelta : 0);
    const totalDisplayMs = leftDisplayMs + rightDisplayMs;
    const nursingCanSave = !!dateTime && (totalDisplayMs > 0 || dateTimeTouchedRef.current);
    const shouldAllowScroll = isSolids ? true : (notesExpanded && photosExpanded && notesWrappedLines >= 3);

    const handleEditSideDuration = (side) => {
      stopActiveSide();
      const currentMs = side === 'left' ? leftElapsedMs : rightElapsedMs;
      const currentSec = Math.round(currentMs / 1000);
      const mm = Math.floor(currentSec / 60);
      const ss = currentSec % 60;
      const defaultValue = `${mm}:${String(ss).padStart(2, '0')}`;
      const input = window.prompt('Enter minutes and seconds (mm:ss)', defaultValue);
      if (input == null) return;
      const raw = String(input).trim();
      if (!raw) return;
      const parts = raw.split(':');
      let minutes = 0;
      let seconds = 0;
      if (parts.length === 1) {
        minutes = parseInt(parts[0], 10);
      } else {
        minutes = parseInt(parts[0], 10);
        seconds = parseInt(parts[1], 10);
      }
      if (!Number.isFinite(minutes)) minutes = 0;
      if (!Number.isFinite(seconds)) seconds = 0;
      minutes = Math.max(0, minutes);
      seconds = Math.max(0, Math.min(59, seconds));
      const nextMs = (minutes * 60 + seconds) * 1000;
      if (side === 'left') {
        setLeftElapsedMs(nextMs);
      } else {
        setRightElapsedMs(nextMs);
      }
    };

    const handleNursingReset = () => {
      stopActiveSide();
      setLeftElapsedMs(0);
      setRightElapsedMs(0);
      setLastSide(null);
    };

    const nursingTotalParts = formatElapsedHmsTT(totalDisplayMs);

    const TypeButton = ({ label, icon: Icon, selected, accent, onClick }) => {
      const bg = selected ? `color-mix(in srgb, ${accent} 16%, var(--tt-input-bg))` : 'var(--tt-input-bg)';
      const border = selected ? accent : 'var(--tt-card-border)';
      const color = selected ? accent : 'var(--tt-text-tertiary)';
      const isFilledIcon = Icon === NursingIcon;
      return React.createElement('button', {
        type: 'button',
        onClick: (e) => {
          e.preventDefault();
          onClick();
        },
        'aria-pressed': !!selected,
        className: "flex flex-col items-center justify-center gap-1 rounded-2xl transition",
        style: {
          width: '100%',
          height: 60,
          border: `1.5px solid ${border}`,
          backgroundColor: bg,
          opacity: selected ? 1 : 0.5
        }
      },
        Icon ? React.createElement(Icon, { style: { width: 28, height: 28, color, strokeWidth: '1.5', fill: isFilledIcon ? 'currentColor' : 'none' } }) : null,
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color } }, label)
      );
    };

    const showFeedTypePicker = isInputVariant && (feedVisibility.bottle || feedVisibility.nursing || feedVisibility.solids);
    const visibleFeedTypeCount = [feedVisibility.bottle, feedVisibility.nursing, feedVisibility.solids].filter(Boolean).length;
    const shouldShowFeedTypePicker = !(isSolids && solidsStep >= 2);
    const feedTypePicker = shouldShowFeedTypePicker && showFeedTypePicker && visibleFeedTypeCount > 1 ? React.createElement('div', { 
      className: visibleFeedTypeCount === 3 ? "grid grid-cols-3 gap-3 pb-3" : "grid grid-cols-2 gap-3 pb-3"
    },
      feedVisibility.bottle && React.createElement(TypeButton, {
        label: 'Bottle',
        icon: BottleV2,
        selected: feedType === 'bottle',
        accent: 'var(--tt-feed)',
        onClick: () => setFeedType('bottle')
      }),
      feedVisibility.nursing && React.createElement(TypeButton, {
        label: 'Nursing',
        icon: NursingIcon,
        selected: feedType === 'nursing',
        accent: 'var(--tt-nursing)',
        onClick: () => setFeedType('nursing')
      }),
      feedVisibility.solids && React.createElement(TypeButton, {
        label: 'Solids',
        icon: SolidsIcon,
        selected: feedType === 'solids',
        accent: 'var(--tt-solids)',
        onClick: () => setFeedType('solids')
      })
    ) : null;

    const notesPhotosBlock = React.createElement(
      React.Fragment,
      null,
      (!notesExpanded && !photosExpanded) && React.createElement('div', { className: "grid grid-cols-2 gap-3" },
        React.createElement('div', {
          onClick: () => setNotesExpanded(true),
          className: "py-1 cursor-pointer active:opacity-70 transition-opacity",
          style: { color: 'var(--tt-text-tertiary)' }
        }, '+ Add notes'),
        TTPhotoRow && React.createElement('div', {
          onClick: () => setPhotosExpanded(true),
          className: "py-1 cursor-pointer active:opacity-70 transition-opacity",
          style: { color: 'var(--tt-text-tertiary)' }
        }, '+ Add photos')
      ),
      notesExpanded
        ? React.createElement(__ttV4Motion.div, {
            initial: { opacity: 0, y: 6, scale: 0.98 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { type: "spring", damping: 25, stiffness: 300 }
          },
          React.createElement('div', { ref: notesInputRef },
            React.createElement(InputRow, {
              label: 'Notes',
              value: notes,
              onChange: setNotes,
              icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
              valueClassName: inputValueClassName,
              type: 'text',
              placeholder: 'Add a note...'
            })
          )
        )
        : photosExpanded ? React.createElement('div', {
            onClick: () => setNotesExpanded(true),
            className: "py-1 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add notes') : null,
      TTPhotoRow && photosExpanded && React.createElement(__ttV4Motion.div, {
        initial: { opacity: 0, y: 6, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { type: "spring", damping: 25, stiffness: 300 }
      },
        React.createElement(TTPhotoRow, {
          expanded: photosExpanded,
          onExpand: () => setPhotosExpanded(true),
          existingPhotos: existingPhotoURLs,
          newPhotos: photos,
          onAddPhoto: handleAddPhoto,
          onRemovePhoto: handleRemovePhoto,
          onPreviewPhoto: setFullSizePhoto
        })
      ),
      TTPhotoRow && !photosExpanded && notesExpanded && React.createElement('div', {
        onClick: () => setPhotosExpanded(true),
        className: "py-1 cursor-pointer active:opacity-70 transition-opacity",
        style: { color: 'var(--tt-text-tertiary)' }
      }, '+ Add photos')
    );

    const bottleContent = React.createElement('div', { className: "space-y-2" },
      React.createElement(InputRow, {
        label: 'Start time',
        value: dateTime ? formatDateTime(dateTime) : 'Add...',
        rawValue: dateTime,
        onChange: handleDateTimeChange,
        icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
        valueClassName: inputValueClassName,
        type: 'datetime',
        pickerMode: 'datetime_feeding',
        onOpenPicker: openTrayPicker,
        placeholder: 'Add...'
      }),
      (_ttUseAmountStepper() && TTAmountStepper)
        ? React.createElement(TTAmountStepper, {
            label: 'Amount',
            valueOz: parseFloat(ounces) || 0,
            unit: amountDisplayUnit,
            onChangeUnit: (nextUnit) => _setDisplayUnit(nextUnit, { persist: true }),
            onChangeOz: handleOuncesChangeFromStepper
          })
        : React.createElement(InputRow, {
            label: 'Amount',
            value: amountDisplayInput,
            onChange: handleOuncesChange,
            icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
            valueClassName: inputValueClassName,
            type: 'number',
            placeholder: '0',
            suffix: amountDisplayUnit,
            inlineSuffix: true,
            pickerMode: 'amount',
            onOpenPicker: openTrayPicker
          }),
      notesPhotosBlock
    );

    const SideTimerButton = ({ label, side, isActive, isLast, displayMs }) => {
      const bg = isActive ? `color-mix(in srgb, ${accentColor} 16%, var(--tt-input-bg))` : 'var(--tt-input-bg)';
      const border = isActive ? accentColor : 'var(--tt-card-border)';
      const color = isActive
        ? accentColor
        : (runningSide ? 'var(--tt-text-tertiary)' : 'var(--tt-text-secondary)');
      const timeLabel = formatElapsedHmsTT(displayMs).str;
      return React.createElement(
        'div',
        { className: "relative flex flex-col items-center" },
        isLast && React.createElement('div', {
          className: "absolute -top-3 px-2.5 py-1 rounded-lg text-[13px] font-semibold shadow-sm text-center leading-[1.05]",
          style: {
            backgroundColor: isNursing ? 'var(--tt-nursing-soft)' : 'var(--tt-feed-soft)',
            color: accentColor,
            left: side === 'left' ? '-4px' : 'auto',
            right: side === 'right' ? '-4px' : 'auto'
          }
        },
          React.createElement('div', null, 'Last'),
          React.createElement('div', null, 'side')
        ),
        React.createElement('button', {
          type: 'button',
          onClick: () => handleToggleSide(side),
          className: "flex flex-col items-center justify-center gap-2 rounded-full transition",
          style: {
            width: 120,
            height: 120,
            border: `1.5px solid ${border}`,
            backgroundColor: bg
          }
        },
          isActive
            ? React.createElement(PauseIcon, { className: "w-7 h-7", style: { color } })
            : React.createElement(PlayIcon, { className: "w-7 h-7", style: { color } }),
          React.createElement('span', {
            className: "tabular-nums",
            style: { fontSize: 18, fontWeight: 600, color },
            onClick: (e) => {
              e.stopPropagation();
              handleEditSideDuration(side);
            }
          }, timeLabel)
        )
      );
    };

    const nursingContent = React.createElement('div', { className: "space-y-2" },
      React.createElement(InputRow, {
        label: 'Start time',
        value: dateTime ? formatDateTime(dateTime) : 'Add...',
        rawValue: dateTime,
        onChange: handleDateTimeChange,
        icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
        valueClassName: inputValueClassName,
        type: 'datetime',
        pickerMode: 'datetime_feeding',
        onOpenPicker: openTrayPicker,
        placeholder: 'Add...'
      }),
      React.createElement('div', { className: "text-center pt-2 pb-1" },
        React.createElement('div', { className: "text-[38px] leading-none font-bold flex items-end justify-center tabular-nums", style: { color: 'var(--tt-text-primary)' } },
          nursingTotalParts.showH && React.createElement(React.Fragment, null,
            React.createElement('span', null, nursingTotalParts.hStr),
            React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'h'),
            React.createElement('span', { className: "ml-2" })
          ),
          nursingTotalParts.showM && React.createElement(React.Fragment, null,
            React.createElement('span', null, nursingTotalParts.mStr),
            React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'm'),
            React.createElement('span', { className: "ml-2" })
          ),
          React.createElement('span', null, nursingTotalParts.sStr),
          React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 's')
        )
      ),
      React.createElement('div', { className: "grid grid-cols-2 place-items-center gap-14 pt-2 pb-1" },
        React.createElement(SideTimerButton, {
          label: 'Left',
          side: 'left',
          isActive: runningSide === 'left',
          isLast: lastSide === 'left',
          displayMs: leftDisplayMs
        }),
        React.createElement(SideTimerButton, {
          label: 'Right',
          side: 'right',
          isActive: runningSide === 'right',
          isLast: lastSide === 'right',
          displayMs: rightDisplayMs
        })
      ),
      notesPhotosBlock
    );

    // Solids content
    const COMMON_FOODS = window.TT?.constants?.COMMON_FOODS || [];
    const FOOD_MAP = window.TT?.constants?.FOOD_MAP || {};
    const slugifyFoodId = (value) => {
      return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    };

    const solidsAllFoods = React.useMemo(() => {
      const commonNames = new Set(
        COMMON_FOODS.map((food) => String(food?.name || '').toLowerCase()).filter(Boolean)
      );
      const customMap = new Map();
      const addCustom = (food) => {
        if (!food || !food.name) return;
        const name = String(food.name).trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (commonNames.has(key)) return;
        if (!customMap.has(key)) {
          customMap.set(key, {
            id: food.id || slugifyFoodId(name),
            name,
            category: food.category || 'Custom',
            icon: food.icon || 'SolidsIcon',
            emoji: food.emoji || null,
            isCustom: true
          });
        }
      };
      customFoods.forEach(addCustom);
      (addedFoods || []).forEach(addCustom);
      (recentFoods || []).forEach((item) => {
        if (typeof item === 'string') {
          addCustom({ name: item });
          return;
        }
        if (item && typeof item === 'object') addCustom(item);
      });
      const merged = [...COMMON_FOODS, ...Array.from(customMap.values())];
      return merged.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [COMMON_FOODS, customFoods, addedFoods, recentFoods]);

    const solidsFoodByName = React.useMemo(() => {
      const map = new Map();
      solidsAllFoods.forEach((food) => {
        if (food?.name) map.set(String(food.name).toLowerCase(), food);
      });
      return map;
    }, [solidsAllFoods]);

    const solidsFilteredFoods = React.useMemo(() => {
      const query = solidsSearch.trim().toLowerCase();
      if (!query) return solidsAllFoods;
      return solidsAllFoods.filter((food) => food.name.toLowerCase().includes(query));
    }, [solidsAllFoods, solidsSearch]);

    const solidsRecentFoods = React.useMemo(() => {
      const fallbackNames = ['Avocado', 'Banana', 'Apple', 'Carrot'];
      const fallback = fallbackNames.map((name) => (
        solidsFoodByName.get(name.toLowerCase()) || { id: slugifyFoodId(name), name }
      ));
      if (!Array.isArray(recentFoods) || recentFoods.length === 0) return fallback;
      const normalized = recentFoods
        .map((item) => (typeof item === 'string' ? item : item?.name))
        .filter(Boolean);
      const resolved = normalized.map((name) => (
        solidsFoodByName.get(String(name).toLowerCase()) || { id: slugifyFoodId(name), name }
      ));
      return resolved.slice(0, 6);
    }, [recentFoods, solidsFoodByName]);

    const addFoodToList = (food) => {
      if (!food) return;
      const name = food.name || food.label || '';
      if (!name) return;
      const id = food.id || slugifyFoodId(name);
      if (!id || isFoodSelected(id)) return;
      const newFood = {
        id,
        name: name,
        category: food.category || 'Custom',
        icon: food.icon || null,
        emoji: food.emoji || null,
        amount: null,
        reaction: null,
        preparation: null,
        notes: ''
      };
      setAddedFoods((prev) => [...prev, newFood]);
    };

    const removeFoodById = (foodId) => {
      if (!foodId) return;
      setAddedFoods((prev) => prev.filter((f) => f.id !== foodId));
    };

    const isFoodSelected = (foodId) => {
      return addedFoods.some((f) => f.id === foodId);
    };

    // Solids detail constants
    const SOLIDS_PREP_METHODS = ['Raw', 'Mashed', 'Steamed', 'Pur\u00e9ed', 'Boiled'];
    const SOLIDS_AMOUNTS = ['All', 'Most', 'Some', 'A little'];
    const SOLIDS_REACTIONS = [
      { label: 'Loved', emoji: '\u{1F60D}' },
      { label: 'Liked', emoji: '\u{1F642}' },
      { label: 'Neutral', emoji: '\u{1F610}' },
      { label: 'Disliked', emoji: '\u{1F616}' }
    ];

    const FoodTile = ({ food, selected, onClick, dashed = false, labelOverride }) => {
      if (!food) return null;
      const iconKey = typeof food.icon === 'string' ? food.icon : null;
      const IconComp = iconKey ? (window.TT?.shared?.icons?.[iconKey] || null) : null;
      const emoji = food.emoji || (!IconComp ? '🍽️' : null);
      const bg = selected
        ? 'color-mix(in srgb, var(--tt-solids) 16%, var(--tt-input-bg))'
        : 'var(--tt-input-bg)';
      const border = selected ? 'var(--tt-solids)' : 'var(--tt-card-border)';
      const labelColor = selected ? 'var(--tt-solids)' : 'var(--tt-text-secondary)';
      return React.createElement('button', {
        key: food.id || food.name,
        type: 'button',
        onClick,
        className: "flex flex-col items-center justify-center gap-2 rounded-full transition",
        style: {
          width: '100%',
          aspectRatio: '1',
          border: dashed ? '1.5px dashed var(--tt-border-subtle)' : `1.5px solid ${border}`,
          backgroundColor: bg,
          color: 'var(--tt-text-primary)',
          opacity: selected ? 1 : 0.6
        }
      },
        React.createElement('div', {
          className: "flex items-center justify-center rounded-full",
          style: {
            width: 28,
            height: 28,
            fontSize: 28,
            lineHeight: '28px',
            color: selected ? 'var(--tt-solids)' : 'var(--tt-text-secondary)'
          }
        }, IconComp
          ? React.createElement(IconComp, { width: 28, height: 28, color: 'currentColor' })
          : emoji),
        React.createElement('span', {
          className: "text-center leading-tight",
          style: { fontSize: 13, fontWeight: 600, color: labelColor, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
        }, labelOverride || food.name)
      );
    };

    // Solids uses a sliding track (all 3 steps rendered, motion.div slides between them)

    // Merge selected foods + recent foods into 4 visible tiles.
    // Selected foods take priority; remaining slots filled with unselected recents.
    const solidsTileFoods = React.useMemo(() => {
      const selectedIds = new Set(addedFoods.map((f) => f.id));
      // Resolve added foods to full definitions (with icons)
      const selected = addedFoods.map((f) => {
        const def = FOOD_MAP[f.id] || f;
        return { ...def, ...f };
      });
      // Fill remaining slots with recents not already selected
      const remaining = 4 - selected.length;
      const fillers = [];
      if (remaining > 0) {
        for (const food of solidsRecentFoods) {
          if (fillers.length >= remaining) break;
          const foodDef = FOOD_MAP[food.id] || food;
          const resolvedId = foodDef.id || slugifyFoodId(foodDef.name);
          if (!selectedIds.has(resolvedId)) {
            fillers.push({ ...foodDef, id: resolvedId });
          }
        }
      }
      return [...selected, ...fillers].slice(0, 4);
    }, [addedFoods, solidsRecentFoods, FOOD_MAP]);

    const solidsTileLabel = addedFoods.length === 0
      ? 'Add foods'
      : `${addedFoods.length} food${addedFoods.length !== 1 ? 's' : ''} added`;

    const solidsStepOne = React.createElement('div', { className: "space-y-4" },
      React.createElement(InputRow, {
        label: 'Start time',
        value: dateTime ? formatDateTime(dateTime) : 'Add...',
        rawValue: dateTime,
        onChange: handleDateTimeChange,
        icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
        valueClassName: inputValueClassName,
        type: 'datetime',
        pickerMode: 'datetime_feeding',
        onOpenPicker: openTrayPicker,
        placeholder: 'Add...'
      }),
      React.createElement('div', { className: "space-y-2" },
        React.createElement('div', {
          className: "text-xs mb-1",
          style: { color: 'var(--tt-text-secondary)' }
        }, solidsTileLabel),
        React.createElement('div', { className: "grid grid-cols-4 gap-3" },
          solidsTileFoods.map((food) => {
            const resolvedId = food.id || slugifyFoodId(food.name);
            const selected = isFoodSelected(resolvedId);
            return React.createElement(FoodTile, {
              key: resolvedId || food.name,
              food: { ...food, id: resolvedId },
              selected,
              onClick: () => (selected ? removeFoodById(resolvedId) : addFoodToList({ ...food, id: resolvedId }))
            });
          })
        )
      ),
      React.createElement('button', {
        type: 'button',
        onClick: () => setSolidsStep(2),
        className: "w-full rounded-2xl px-5 py-4 text-left flex items-center justify-between",
        style: {
          backgroundColor: 'var(--tt-input-bg)',
          border: '1px solid var(--tt-card-border)'
        }
      },
        React.createElement('span', { style: { color: 'var(--tt-text-primary)' } }, 'Browse all foods'),
        React.createElement('svg', {
          className: "w-5 h-5",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          style: { color: 'var(--tt-text-tertiary)' }
        }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }))
      )
    );

    const solidsStepTwo = React.createElement('div', { className: "space-y-4" },
      React.createElement('div', {
        style: {
          position: 'sticky',
          top: 0,
          zIndex: 5,
          backgroundColor: 'var(--tt-halfsheet-bg)',
          paddingTop: 4,
          paddingBottom: 8
        }
      },
      React.createElement('div', {
        className: "flex items-center gap-3 px-4 py-3 rounded-2xl",
        style: { backgroundColor: 'var(--tt-input-bg)' }
      },
        SearchIcon && React.createElement(SearchIcon, {
          className: "w-5 h-5",
          style: { color: 'var(--tt-text-tertiary)' }
        }),
        React.createElement('input', {
          value: solidsSearch,
          onChange: (e) => setSolidsSearch(e.target.value),
          placeholder: 'Search...',
          className: "flex-1 bg-transparent outline-none text-sm",
          style: { color: 'var(--tt-text-primary)' }
        })
      )),
      React.createElement('div', { className: "grid grid-cols-3 gap-3" },
        solidsFilteredFoods.map((food) => {
          const selected = isFoodSelected(food.id);
          return React.createElement(FoodTile, {
            key: food.id,
            food,
            selected,

            onClick: () => (selected ? removeFoodById(food.id) : addFoodToList(food))
          });
        }),
        solidsSearch.trim() && solidsFilteredFoods.length === 0 && React.createElement(FoodTile, {
          key: 'add-custom',
          food: { id: 'add-custom', name: solidsSearch.trim(), icon: 'SolidsIcon', emoji: null, isCustom: true },
          size: 72,
          dashed: true,
          labelOverride: `Add "${solidsSearch.slice(0, 12)}${solidsSearch.length > 12 ? '…' : ''}"`,
          onClick: async () => {
            const customFood = {
              id: `custom-${Date.now()}`,
              name: solidsSearch.trim(),
              category: 'Custom',
              icon: 'SolidsIcon',
              emoji: null,
              isCustom: true
            };
            if (window.firestoreStorage && window.firestoreStorage.addCustomFood) {
              const saved = await window.firestoreStorage.addCustomFood(customFood);
              setCustomFoods((prev) => [...prev, saved]);
              addFoodToList(saved);
            } else {
              setCustomFoods((prev) => [...prev, customFood]);
              addFoodToList(customFood);
            }
            setSolidsSearch('');
          }
        })
      )
    );

    const detailFood = detailFoodId
      ? addedFoods.find((f) => String(f.id) === String(detailFoodId)) || null
      : null;
    
    const updateFoodDetail = (foodId, field, value) => {
      setAddedFoods((prev) => prev.map((f) => {
        if (f.id !== foodId) return f;
        const current = f[field];
        return { ...f, [field]: current === value ? null : value };
      }));
    };

    const SolidsDetailChip = ({ label, selected, onClick }) => {
      return React.createElement('button', {
        type: 'button',
        onClick,
        className: "px-4 py-2 rounded-full text-sm font-medium transition-all",
        style: {
          backgroundColor: selected ? 'var(--tt-solids)' : 'var(--tt-input-bg)',
          color: selected ? '#fff' : 'var(--tt-text-secondary)',
          border: selected ? '1px solid var(--tt-solids)' : '1px solid var(--tt-card-border)'
        }
      }, label);
    };

    const SolidsReactionButton = ({ reaction, selected, onClick }) => {
      return React.createElement('button', {
        type: 'button',
        onClick,
        className: "flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all",
        style: {
          backgroundColor: selected ? 'var(--tt-solids)' : 'var(--tt-input-bg)',
          border: selected ? '1px solid var(--tt-solids)' : '1px solid var(--tt-card-border)'
        }
      },
        React.createElement('div', { className: "text-2xl" }, reaction.emoji),
        React.createElement('div', {
          className: "text-xs",
          style: { color: selected ? '#fff' : 'var(--tt-text-tertiary)', fontWeight: selected ? 600 : 400 }
        }, reaction.label)
      );
    };

    // Cache detailFood for TTPickerTray close animation (content stays visible while sliding out)
    if (detailFood) detailFoodCache.current = detailFood;
    const displayFood = detailFood || detailFoodCache.current;

    const solidsDetailSheet = TTPickerTray && React.createElement(TTPickerTray, {
      isOpen: !!detailFoodId,
      onClose: () => setDetailFoodId(null),
      height: '52vh',
      header: displayFood && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: "flex items-center gap-2", style: { justifySelf: 'start' } },
          (() => {
            const headerIconKey = displayFood?.icon || null;
            const HeaderIconComp = headerIconKey ? (window.TT?.shared?.icons?.[headerIconKey] || null) : null;
            return React.createElement('div', {
              className: "flex items-center justify-center rounded-full",
              style: {
                width: 28,
                height: 28,
                backgroundColor: 'color-mix(in srgb, var(--tt-solids) 16%, var(--tt-input-bg))',
                fontSize: 16,
                lineHeight: '16px',
                color: 'var(--tt-solids)'
              }
            }, HeaderIconComp
              ? React.createElement(HeaderIconComp, { width: 16, height: 16, color: 'currentColor' })
              : (displayFood.emoji || '🍽️'));
          })(),
          React.createElement('div', { className: "font-semibold", style: { color: 'var(--tt-text-primary)', fontSize: 17 } }, displayFood.name)
        ),
        React.createElement('div'),
        React.createElement('button', {
          type: 'button',
          onClick: () => setDetailFoodId(null),
          style: { justifySelf: 'end', fontWeight: 600, color: 'var(--tt-solids)', background: 'transparent', border: 'none', fontSize: 17 }
        }, 'Done')
      )
    },
      displayFood && React.createElement('div', { style: { padding: '0 16px' } },
        React.createElement('div', null,
          React.createElement('div', { className: "text-sm mb-3", style: { color: 'var(--tt-text-tertiary)' } }, 'Preparation'),
          React.createElement('div', { className: "flex flex-wrap gap-2" },
            SOLIDS_PREP_METHODS.map((method) =>
              React.createElement(SolidsDetailChip, { key: method, label: method, selected: displayFood.preparation === method, onClick: () => updateFoodDetail(displayFood.id, 'preparation', method) })
            )
          )
        ),
        React.createElement('div', { className: "mt-6" },
          React.createElement('div', { className: "text-sm mb-3", style: { color: 'var(--tt-text-tertiary)' } }, 'Amount'),
          React.createElement('div', { className: "flex flex-wrap gap-2" },
            SOLIDS_AMOUNTS.map((amount) =>
              React.createElement(SolidsDetailChip, { key: amount, label: amount, selected: displayFood.amount === amount, onClick: () => updateFoodDetail(displayFood.id, 'amount', amount) })
            )
          )
        ),
        React.createElement('div', { className: "mt-6" },
          React.createElement('div', { className: "text-sm mb-3", style: { color: 'var(--tt-text-tertiary)' } }, 'Reaction'),
          React.createElement('div', { className: "flex gap-3" },
            SOLIDS_REACTIONS.map((reaction) =>
              React.createElement(SolidsReactionButton, { key: reaction.label, reaction, selected: displayFood.reaction === reaction.label, onClick: () => updateFoodDetail(displayFood.id, 'reaction', reaction.label) })
            )
          )
        )
      )
    );

    const solidsStepThree = React.createElement('div', { className: "space-y-4" },
      React.createElement('div', { className: "flex flex-col gap-2" },
        addedFoods.map((food) => {
          const hasSummary = food.preparation || food.amount || food.reaction;
          const foodDef = FOOD_MAP[food.id] || food;
          const iconKey = foodDef?.icon || food?.icon || null;
          const IconComp = iconKey ? (window.TT?.shared?.icons?.[iconKey] || null) : null;
          const emoji = foodDef?.emoji || food?.emoji || (!IconComp ? '🍽️' : null);
          return React.createElement('button', {
            key: food.id,
            type: 'button',
            onClick: () => setDetailFoodId(String(food.id)),
            className: "w-full rounded-2xl px-5 py-4 text-left",
            style: {
              backgroundColor: 'var(--tt-input-bg)',
              border: '1px solid var(--tt-card-border)'
            }
          },
            React.createElement('div', { className: "flex items-center justify-between" },
              React.createElement('div', { className: "flex items-center gap-3" },
                React.createElement('div', {
                  className: "w-10 h-10 rounded-full flex items-center justify-center shadow-inner relative flex-shrink-0",
                  style: {
                    backgroundColor: 'color-mix(in srgb, var(--tt-solids) 20%, transparent)',
                    fontSize: 20,
                    lineHeight: '20px',
                    color: 'var(--tt-solids)'
                  }
                }, IconComp
                  ? React.createElement(IconComp, { width: 20, height: 20, color: 'currentColor' })
                  : emoji),
                React.createElement('div', null,
                  React.createElement('div', {
                    className: "font-medium",
                    style: { color: 'var(--tt-text-primary)' }
                  }, food.name),
                  hasSummary && React.createElement('div', {
                    className: "text-sm mt-1",
                    style: { color: 'var(--tt-text-tertiary)' }
                  },
                    [food.preparation, food.amount, food.reaction].filter(Boolean).join(' \u00B7 ')
                  )
                )
              ),
              React.createElement('svg', {
                className: "w-5 h-5",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                style: { color: 'var(--tt-text-tertiary)' }
              }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }))
            )
          );
        })
      ),
      notesPhotosBlock
    );

    const solidsSlideProps = (stepNum) => {
      const offset = `${(stepNum - solidsStep) * 100}%`;
      const transition = { type: "spring", stiffness: 300, damping: 30 };

      // Step 1: always in grid flow — sets baseline height
      if (stepNum === 1) {
        return { initial: false, animate: { x: offset }, transition, style: { gridRow: 1, gridColumn: 1, width: '100%' } };
      }
      // Step 2: always absolute, scrolls within container
      if (stepNum === 2) {
        return {
          initial: false,
          animate: { x: offset },
          transition,
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            boxSizing: 'border-box',
            paddingBottom: `calc(env(safe-area-inset-bottom, 0) + ${solidsFooterHeight || 0}px)`
          }
        };
      }
      // Step 3: in grid when active (can expand), absolute when not
      return {
        initial: false,
        animate: { x: offset }, transition,
        style: solidsStep === 3
          ? { gridRow: 1, gridColumn: 1, width: '100%' }
          : { position: 'absolute', top: 0, left: 0, width: '100%' }
      };
    };

    const solidsContainerStyle = {
      display: 'grid',
      gridTemplateRows: '1fr',
      overflow: 'hidden',
      position: 'relative',
      flex: 1,
      minHeight: 0,
      height: '100%'
    };

    const solidsContent = React.createElement(
      'div',
      { style: solidsContainerStyle },
      React.createElement(__ttV4Motion.div, solidsSlideProps(1), solidsStepOne),
      React.createElement(__ttV4Motion.div, { ...solidsSlideProps(2), ref: solidsStepTwoMotionRef }, solidsStepTwo),
      React.createElement(__ttV4Motion.div, solidsSlideProps(3), solidsStepThree)
    );

    const solidsContentWrapperHeight = (solidsSheetBaseHeight && solidsHeaderHeight >= 0)
      ? Math.max(0, solidsSheetBaseHeight - solidsHeaderHeight - (solidsFooterHeight || 0))
      : null;
    const solidsContentWrapper = React.createElement('div', {
      ref: solidsContentRef,
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        height: solidsContentWrapperHeight ? `${solidsContentWrapperHeight}px` : undefined
      }
    }, solidsContent);

    // Body content (used in both static and overlay modes)
    const contentBlock = React.createElement(
      React.Fragment,
      null,
      feedTypePicker,
      isSolids ? solidsContentWrapper : (isNursing ? nursingContent : bottleContent),
      isSolids && solidsDetailSheet
    );

    const solidsCanSave = !!dateTime && addedFoods.length > 0;
    const solidsCanNext = addedFoods.length > 0;

    // Determine CTA behavior based on feed type and solids step
    const getSolidsCta = () => {
      if (solidsStep === 2) return null; // No CTA in browse step
      if (solidsStep === 3) return { label: saving ? 'Saving...' : saveButtonLabel, onClick: handleSave, disabled: saving || !solidsCanSave };
      // Step 1: "Next" button
      return { label: 'Next', onClick: () => setSolidsStep(3), disabled: !solidsCanNext };
    };

    const solidsCta = isSolids ? getSolidsCta() : null;

    const isCtaDisabled = isSolids
      ? (solidsCta ? solidsCta.disabled : true)
      : (saving || (isNursing && !nursingCanSave));

    const ctaButton = (isSolids && !solidsCta) ? null : React.createElement('button', {
      type: 'button',
      onClick: isSolids ? (solidsCta ? solidsCta.onClick : undefined) : handleSave,
      disabled: isCtaDisabled,
      onTouchStart: (e) => {
        e.stopPropagation();
      },
      className: "w-full text-white py-3 rounded-2xl font-semibold transition",
      style: {
        backgroundColor: saving ? accentStrong : accentColor,
        touchAction: 'manipulation',
        opacity: isCtaDisabled ? 0.5 : 1,
        cursor: isCtaDisabled ? 'not-allowed' : 'pointer',
        pointerEvents: isCtaDisabled ? 'none' : 'auto'
      },
      onMouseEnter: (e) => {
        if (!isCtaDisabled) {
          e.target.style.backgroundColor = accentStrong;
        }
      },
      onMouseLeave: (e) => {
        if (!isCtaDisabled) {
          e.target.style.backgroundColor = accentColor;
        }
      }
    }, saving ? 'Saving...' : (isSolids && solidsCta ? solidsCta.label : saveButtonLabel));

    const shouldShowCtaFooter = !!ctaButton;
    const ctaFooterContent = ctaButton;

    const solidsSheetHeightStyle = (isSolids && solidsSheetBaseHeight)
      ? (solidsStep === 2
          ? { height: `${Math.round(solidsSheetBaseHeight)}px`, maxHeight: `${Math.round(solidsSheetBaseHeight)}px` }
          : (solidsStep === 3 ? { minHeight: `${Math.round(solidsSheetBaseHeight)}px` } : {}))
      : {};

    const overlayContent = React.createElement(
      React.Fragment,
      null,
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
                const formattedOz = _formatOz(oz);
                setOunces(formattedOz);
                _syncDisplayInputForUnit(amountDisplayUnit, formattedOz);
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
      TTPickerTray && WheelPicker && _ttUseWheelPickers() && React.createElement(TTPickerTray, {
        isOpen: showDateTimeTray,
        onClose: () => setShowDateTimeTray(false),
        header: React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: () => setShowDateTimeTray(false),
            style: { justifySelf: 'start', background: 'none', border: 'none', padding: 0, color: 'var(--tt-text-secondary)', fontSize: 17 }
          }, 'Cancel'),
          React.createElement('div', { style: { justifySelf: 'center', fontWeight: 600, fontSize: 17, color: 'var(--tt-text-primary)' } }, 'Time'),
          React.createElement('button', {
            onClick: () => {
              const nextISO = _partsToISO({ dayISO: dtSelectedDate, hour: dtHour, minute: dtMinute, ampm: dtAmpm });
              handleDateTimeChange(nextISO);
              setShowDateTimeTray(false);
            },
            style: { justifySelf: 'end', background: 'none', border: 'none', padding: 0, color: accentColor, fontSize: 17, fontWeight: 600 }
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
              fill: "var(--tt-text-on-accent)",
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

    const animatedContent = React.createElement(__ttV4Motion.div, {
      layout: true,
      transition: { type: "spring", damping: 25, stiffness: 300 },
      style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }
    }, contentBlock);

    const bodyContent = React.createElement(
      React.Fragment,
      null,
      React.createElement('div', {
        className: "flex-1 px-6 pt-3 pb-2",
        style: {
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: shouldAllowScroll ? 'auto' : 'hidden',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: shouldAllowScroll ? 'touch' : 'auto'
        }
      }, animatedContent),
      shouldShowCtaFooter && React.createElement('div', {
        ref: ctaFooterRef,
        className: "px-6 pt-3 pb-1",
        style: {
          backgroundColor: 'var(--tt-halfsheet-bg)',
          display: isKeyboardOpen ? 'none' : 'block',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 80px)',
          flexShrink: 0
        }
      }, ctaFooterContent),
      overlayContent
    );

    // If overlay mode (isOpen provided), render v4 sheet overlay
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
                  backgroundColor: 'var(--tt-overlay-scrim-strong)',
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
                ref: solidsSheetRef,
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
                  maxHeight: '100vh',
                  height: 'auto',
                  minHeight: '60vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  touchAction: 'pan-y',
                  overscrollBehavior: 'contain',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  zIndex: 10001,
                  ...solidsSheetHeightStyle
                }
              },
              React.createElement('div', {
                ref: solidsHeaderRef,
                className: "",
                style: {
                  backgroundColor: accentColor,
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
                  onClick: (isSolids && solidsStep >= 2)
                    ? () => setSolidsStep(1)
                    : handleClose,
                  className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
                }, React.createElement(
                  (isSolids && solidsStep >= 2)
                    ? (window.TT?.shared?.icons?.ChevronLeftIcon || window.ChevronLeft || window.ChevronDown || window.XIcon)
                    : (window.TT?.shared?.icons?.ChevronDownIcon || window.ChevronDown || window.XIcon),
                  { className: "w-5 h-5", style: { transform: 'translateY(1px)' } }
                )),
                React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, headerTitle),
                (isSolids && solidsStep === 2)
                  ? React.createElement('button', {
                      type: 'button',
                      onClick: () => setSolidsStep(3),
                      className: "text-sm font-semibold",
                      style: { color: addedFoods.length > 0 ? '#fff' : 'rgba(255,255,255,0.5)' }
                    }, 'Done')
                  : isNursing
                  ? React.createElement('button', {
                      type: 'button',
                      onClick: handleNursingReset,
                      className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity",
                      title: 'Reset'
                    }, React.createElement(
                      'svg',
                      { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 256 256", fill: "currentColor" },
                      React.createElement('path', { d: "M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L60.63,81.29l17,17A8,8,0,0,1,72,112H24a8,8,0,0,1-8-8V56A8,8,0,0,1,29.66,50.3L49.31,70,60.25,60A96,96,0,0,1,224,128Z" })
                    ))
                  : React.createElement('div', { className: "w-6" })
              ),
              bodyContent
            )
          : null
      );
      return ReactDOM.createPortal(v4Overlay, document.body);
    }

    return null;
  };

  // Expose component globally
  if (typeof window !== 'undefined') {
    window.FeedSheet = FeedSheet;
  }
}
