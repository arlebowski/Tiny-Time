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
  const __ttV4UseMotionValue = __ttV4Framer.useMotionValue || null;
  const __ttV4UseSpring = __ttV4Framer.useSpring || null;
  const __ttV4UseTransform = __ttV4Framer.useTransform || null;
  const __ttV4Animate = __ttV4Framer.animate || null;
  
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
    const [openSwipeFoodId, setOpenSwipeFoodId] = React.useState(null);
    const [solidsStep, setSolidsStep] = React.useState(1); // 1: entry, 2: browse, 3: review
    const [solidsSearch, setSolidsSearch] = React.useState('');
    const [recentFoods, setRecentFoods] = React.useState([]);
    const [customFoods, setCustomFoods] = React.useState([]);
    const [customFoodDraft, setCustomFoodDraft] = React.useState(null);
    const solidsTrayOpen = !!detailFoodId || !!customFoodDraft;
    const [customFoodTrayMode, setCustomFoodTrayMode] = React.useState('create'); // 'create' | 'edit'
    const [customFoodSaving, setCustomFoodSaving] = React.useState(false);
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
    const getStorage = () => {
      if (typeof firestoreStorage !== 'undefined' && firestoreStorage) return firestoreStorage;
      if (typeof window !== 'undefined' && window.firestoreStorage) return window.firestoreStorage;
      return null;
    };

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
          const storage = getStorage();
          if (storage) {
            const [recent, custom] = await Promise.all([
              storage.getRecentFoods?.({ forceServer: true }) || Promise.resolve([]),
              storage.getCustomFoods?.() || Promise.resolve([])
            ]);
            let resolvedRecent = Array.isArray(recent) ? recent : [];
            // Fallback: derive recents from saved solids sessions when recentSolidFoods is empty/stale.
            if (resolvedRecent.length === 0 && typeof storage.getAllSolidsSessions === 'function') {
              try {
                const sessions = await storage.getAllSolidsSessions();
                const sorted = Array.isArray(sessions)
                  ? sessions.slice().sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
                  : [];
                const names = [];
                for (const session of sorted) {
                  const foods = Array.isArray(session?.foods) ? session.foods : [];
                  for (const food of foods) {
                    const name = String(food?.name || '').trim();
                    if (!name) continue;
                    if (names.some((existing) => existing.toLowerCase() === name.toLowerCase())) continue;
                    names.push(name);
                    if (names.length >= 20) break;
                  }
                  if (names.length >= 20) break;
                }
                resolvedRecent = names;
              } catch (fallbackErr) {
                console.error('[FeedSheet] Failed to derive solids recents fallback:', fallbackErr);
              }
            }
            setRecentFoods(resolvedRecent);
            setCustomFoods(
              (Array.isArray(custom) ? custom : [])
                .slice()
                .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
            );
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
            emoji: f.emoji || null,
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
      setCustomFoodDraft(null);
      setCustomFoodTrayMode('create');
      setCustomFoodSaving(false);
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
                id: f.id || slugifyFoodId(f.name || ''),
                name: f.name,
                icon: f.icon || null,
                emoji: f.emoji || null,
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
                id: f.id || slugifyFoodId(f.name || ''),
                name: f.name,
                icon: f.icon || null,
                emoji: f.emoji || null,
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

          // Update recent foods in one write to avoid cache/race issues.
          try {
            const storage = getStorage();
            const currentRecentRaw = await storage?.getRecentFoods?.({ forceServer: true });
            const currentRecent = Array.isArray(currentRecentRaw)
              ? currentRecentRaw
                .map((item) => (typeof item === 'string' ? { name: item } : item))
                .filter((item) => item && item.name)
              : [];
            let updatedRecent = [...currentRecent];
            addedFoods.forEach((food) => {
              const name = String(food?.name || '').trim();
              if (!name) return;
              const nextItem = {
                name,
                icon: food?.icon || null,
                emoji: food?.emoji || null,
                category: food?.category || 'Custom'
              };
              updatedRecent = [nextItem, ...updatedRecent.filter((existing) => String(existing?.name || '').toLowerCase() !== name.toLowerCase())];
            });
            updatedRecent = updatedRecent.slice(0, 20);
            if (typeof storage?.updateKidData === 'function') {
              await storage.updateKidData({ recentSolidFoods: updatedRecent });
            } else {
              for (const item of updatedRecent.slice().reverse()) {
                await storage?.updateRecentFoods?.(item?.name);
              }
            }
            setRecentFoods(updatedRecent);
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
      const addCustom = (food, source = 'unknown') => {
        if (!food || !food.name) return;
        const name = String(food.name).trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (commonNames.has(key)) return;
        const customFoodId = food.customFoodId || food.custom_food_id || food.customFoodID || null;
        const isEditableCustom = true;
        if (!customMap.has(key)) {
          const icon = food.icon || (food.emoji ? null : 'SolidsIcon');
          customMap.set(key, {
            id: food.id || customFoodId || slugifyFoodId(name),
            name,
            category: food.category || 'Custom',
            icon,
            emoji: food.emoji || null,
            isCustom: true,
            isEditableCustom,
            customFoodId: customFoodId || food.id || null
          });
        }
      };
      customFoods.forEach((food) => addCustom(food, 'customFoods'));
      (addedFoods || []).forEach((food) => addCustom(food, 'added'));
      (recentFoods || []).forEach((item) => {
        if (typeof item === 'string') {
          addCustom({ name: item }, 'recent');
          return;
        }
        if (item && typeof item === 'object') addCustom(item, 'recent');
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
        .map((item) => (typeof item === 'string' ? { name: item } : item))
        .filter((item) => item && item.name);
      const resolved = normalized.map((item) => {
        const name = String(item.name);
        const mapped = solidsFoodByName.get(name.toLowerCase());
        if (!mapped) {
          const customFoodId = item.customFoodId || item.custom_food_id || item.customFoodID || null;
          return {
            id: item.id || customFoodId || slugifyFoodId(name),
            name,
            icon: item.icon || null,
            emoji: item.emoji || null,
            category: item.category || 'Custom',
            isCustom: true,
            isEditableCustom: !!customFoodId,
            customFoodId: customFoodId || item.id || null
          };
        }
        const customFoodId = mapped.customFoodId || item.customFoodId || item.custom_food_id || item.customFoodID || null;
        const isEditableCustom = !!(mapped.isEditableCustom || customFoodId);
        return {
          ...mapped,
          emoji: mapped.emoji || item.emoji || null,
          icon: mapped.icon || item.icon || null,
          isEditableCustom,
          customFoodId: customFoodId || mapped.id || null
        };
      });
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
        customFoodId: food.customFoodId || food.custom_food_id || food.customFoodID || null,
        isEditableCustom: !!(food.isEditableCustom || food.customFoodId || food.custom_food_id || food.customFoodID),
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

    React.useEffect(() => {
      // Close any open swipe row when leaving review only.
      if (solidsStep !== 3) setOpenSwipeFoodId(null);
    }, [solidsStep]);

    const isFoodSelected = (foodId) => {
      return addedFoods.some((f) => f.id === foodId);
    };

    // Solids detail constants
    const SOLIDS_PREP_METHODS = ['Raw', 'Mashed', 'Steamed', 'Pur\u00e9ed', 'Boiled'];
    const SOLIDS_AMOUNTS = ['All', 'Most', 'Some', 'A little'];
    const SOLIDS_REACTIONS = [
      { label: 'Loved', emoji: '\u{1F60D}' },
      { label: 'Liked', emoji: '\u{1F60A}' },
      { label: 'Neutral', emoji: '\u{1F610}' },
      { label: 'Disliked', emoji: '\u{1F616}' }
    ];
    const PrepRawIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
      React.createElement('path', { d: "M20.724,2.805 C22.503,9.413 21.794,13.677 19.924,16.309 C18.055,18.94 15.162,19.75 13,19.75 C11.772,19.75 10.618,19.421 9.624,18.847 C9.266,18.639 9.143,18.18 9.351,17.822 C9.558,17.463 10.017,17.341 10.375,17.548 C11.147,17.994 12.042,18.25 13,18.25 C14.838,18.25 17.195,17.56 18.701,15.441 C20.101,13.47 20.883,10.098 19.598,4.488 C18.377,5.701 16.466,7.262 13.106,7.742 C9.861,8.206 7.75,10.264 7.75,13 C7.75,13.629 7.86,14.231 8.062,14.789 C8.607,14.6 9.192,14.429 9.818,14.272 C12.815,13.523 14.926,11.643 16.392,9.615 C16.635,9.28 17.104,9.204 17.44,9.447 C17.775,9.69 17.851,10.159 17.608,10.494 C16.001,12.715 13.619,14.868 10.182,15.727 C7.969,16.281 6.473,16.992 5.479,17.864 C4.506,18.719 3.965,19.771 3.74,21.123 C3.672,21.532 3.285,21.808 2.877,21.74 C2.468,21.671 2.192,21.285 2.26,20.876 C2.535,19.229 3.223,17.849 4.49,16.737 C5.094,16.206 5.818,15.747 6.67,15.349 C6.398,14.617 6.25,13.825 6.25,13 C6.25,9.306 9.139,6.794 12.894,6.258 C16.289,5.773 17.914,4.082 19.075,2.875 C19.212,2.732 19.343,2.596 19.47,2.47 C19.659,2.28 19.935,2.206 20.194,2.275 C20.452,2.345 20.655,2.546 20.724,2.805 Z" })
    );
    const PrepMashedIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
      React.createElement('path', { d: "M18.011,2.53 L14.385,6.156 L15.668,7.439 L18.638,4.47 C18.931,4.177 19.405,4.177 19.698,4.47 C19.991,4.763 19.991,5.237 19.698,5.53 L16.729,8.5 L18.011,9.783 L21.638,6.157 C21.931,5.864 22.405,5.864 22.698,6.157 C22.991,6.45 22.991,6.925 22.698,7.218 L18.495,11.42 C17.546,12.37 16.264,12.913 14.921,12.934 L14.578,12.939 C14.178,12.945 13.798,13.114 13.525,13.406 L5.488,22.004 C4.58,22.976 3.047,23.002 2.107,22.061 C1.166,21.121 1.192,19.589 2.164,18.681 L10.762,10.642 C11.054,10.369 11.222,9.989 11.228,9.59 L11.234,9.247 C11.255,7.904 11.797,6.622 12.747,5.672 L16.95,1.47 C17.243,1.177 17.718,1.177 18.011,1.47 C18.304,1.763 18.304,2.237 18.011,2.53 Z M13.37,7.262 C12.969,7.851 12.745,8.548 12.733,9.27 L12.728,9.613 C12.716,10.42 12.376,11.187 11.786,11.738 L3.188,19.777 C2.836,20.105 2.827,20.66 3.167,21.001 C3.508,21.341 4.063,21.332 4.392,20.98 L12.429,12.381 C12.98,11.792 13.748,11.452 14.554,11.439 L14.897,11.434 C15.619,11.422 16.316,11.199 16.905,10.798 Z" })
    );
    const PrepSteamedIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 256 256", fill: "currentColor" },
      React.createElement('path', { d: "M224,112H32a8,8,0,0,0-8,8,104.35,104.35,0,0,0,56,92.28V216a16,16,0,0,0,16,16h64a16,16,0,0,0,16-16v-3.72A104.35,104.35,0,0,0,232,120,8,8,0,0,0,224,112Zm-59.34,88a8,8,0,0,0-4.66,7.27V216H96v-8.71A8,8,0,0,0,91.34,200a88.29,88.29,0,0,1-51-72H215.63A88.29,88.29,0,0,1,164.66,200ZM81.77,55c5.35-6.66,6.67-11.16,6.12-13.14-.42-1.49-2.41-2.26-2.43-2.26A8,8,0,0,1,88,24a8.11,8.11,0,0,1,2.38.36c1,.31,9.91,3.33,12.79,12.76,2.46,8.07-.55,17.45-8.94,27.89-5.35,6.66-6.67,11.16-6.12,13.14.42,1.49,2.37,2.24,2.39,2.25A8,8,0,0,1,88,96a8.11,8.11,0,0,1-2.38-.36c-1-.31-9.91-3.33-12.79-12.76C70.37,74.81,73.38,65.43,81.77,55Zm40,0c5.35-6.66,6.67-11.16,6.12-13.14-.42-1.49-2.41-2.26-2.43-2.26A8,8,0,0,1,128,24a8.11,8.11,0,0,1,2.38.36c1,.31,9.91,3.33,12.79,12.76,2.46,8.07-.55,17.45-8.94,27.89-5.35,6.66-6.67,11.16-6.12,13.14.42,1.49,2.37,2.24,2.39,2.25A8,8,0,0,1,128,96a8.11,8.11,0,0,1-2.38-.36c-1-.31-9.91-3.33-12.79-12.76C110.37,74.81,113.38,65.43,121.77,55Zm40,0c5.35-6.66,6.67-11.16,6.12-13.14-.42-1.49-2.41-2.26-2.43-2.26A8,8,0,0,1,168,24a8.11,8.11,0,0,1,2.38.36c1,.31,9.91,3.33,12.79,12.76,2.46,8.07-.55,17.45-8.94,27.89-5.35,6.66-6.67,11.16-6.12,13.14.42,1.49,2.37,2.24,2.39,2.25A8,8,0,0,1,168,96a8.11,8.11,0,0,1-2.38-.36c-1-.31-9.91-3.33-12.79-12.76C150.37,74.81,153.38,65.43,161.77,55Z" })
    );
    const PrepPureedIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
      React.createElement('path', { d: "M6.524,3.25 L20.168,3.25 C20.582,3.25 20.918,3.586 20.918,4 C20.918,4.414 20.582,4.75 20.168,4.75 L19.324,4.75 L18.373,16.809 C18.443,16.954 18.537,17.133 18.65,17.35 L18.651,17.351 C18.697,17.44 18.747,17.535 18.8,17.638 C19.008,18.038 19.247,18.511 19.448,18.992 C19.646,19.467 19.824,19.99 19.89,20.489 C19.955,20.974 19.93,21.573 19.55,22.059 C19.215,22.487 18.74,22.632 18.3,22.692 C17.886,22.75 17.357,22.75 16.755,22.75 L10.469,22.75 C9.918,22.75 9.431,22.75 9.044,22.697 C8.63,22.641 8.187,22.508 7.856,22.124 C7.472,21.679 7.403,21.103 7.42,20.633 C7.438,20.144 7.554,19.62 7.692,19.138 C7.831,18.65 8.005,18.167 8.157,17.756 L8.236,17.54 L8.236,17.54 C8.308,17.347 8.37,17.181 8.419,17.04 L8.419,17.034 L8.163,11.452 L6.363,10.448 L6.26,10.39 C5.659,10.056 5.186,9.793 4.848,9.378 C4.508,8.961 4.351,8.448 4.153,7.801 L4.119,7.69 L3.844,6.795 L3.828,6.744 C3.66,6.198 3.51,5.711 3.45,5.31 C3.384,4.876 3.396,4.384 3.728,3.948 C4.056,3.518 4.526,3.37 4.96,3.308 C5.368,3.25 5.886,3.25 6.472,3.25 Z M16.912,16.25 L17.031,14.75 L15.668,14.75 C15.254,14.75 14.918,14.414 14.918,14 C14.918,13.586 15.254,13.25 15.668,13.25 L17.149,13.25 L17.267,11.75 L15.668,11.75 C15.254,11.75 14.918,11.414 14.918,11 C14.918,10.586 15.254,10.25 15.668,10.25 L17.385,10.25 L17.504,8.75 L15.668,8.75 C15.254,8.75 14.918,8.414 14.918,8 C14.918,7.586 15.254,7.25 15.668,7.25 L17.622,7.25 L17.819,4.75 L9.188,4.75 L9.642,10.945 L9.643,10.966 L9.884,16.25 Z M9.636,18.081 L9.564,18.275 C9.414,18.682 9.257,19.121 9.134,19.551 C9.009,19.987 8.931,20.376 8.919,20.687 C8.907,21.016 8.975,21.125 8.991,21.144 C8.992,21.145 8.992,21.145 8.993,21.146 C8.994,21.146 9.001,21.151 9.016,21.158 C9.05,21.172 9.118,21.194 9.246,21.211 C9.52,21.248 9.905,21.25 10.521,21.25 L16.701,21.25 C17.371,21.25 17.795,21.248 18.094,21.207 C18.236,21.187 18.31,21.163 18.346,21.147 C18.361,21.14 18.367,21.135 18.369,21.134 C18.385,21.114 18.446,21.006 18.403,20.686 C18.363,20.379 18.242,19.997 18.063,19.57 C17.888,19.149 17.673,18.722 17.469,18.329 C17.426,18.246 17.383,18.164 17.34,18.082 C17.281,17.968 17.222,17.857 17.167,17.75 L9.758,17.75 C9.719,17.857 9.678,17.969 9.636,18.081 Z M7.094,9.138 L8.044,9.668 L7.684,4.75 L6.524,4.75 C5.87,4.75 5.46,4.752 5.172,4.793 C5.036,4.812 4.968,4.836 4.936,4.85 C4.93,4.853 4.925,4.856 4.922,4.857 L4.921,4.864 C4.917,4.891 4.913,4.957 4.933,5.086 C4.975,5.362 5.089,5.741 5.277,6.354 L5.553,7.249 C5.802,8.061 5.879,8.269 6.011,8.431 C6.145,8.594 6.339,8.717 7.094,9.138 Z M15.168,1.25 C15.582,1.25 15.918,1.586 15.918,2 C15.918,2.414 15.582,2.75 15.168,2.75 L12.168,2.75 C11.754,2.75 11.418,2.414 11.418,2 C11.418,1.586 11.754,1.25 12.168,1.25 Z" })
    );
    const PrepBoiledIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 256 256", fill: "currentColor" },
      React.createElement('path', { d: "M88,48V16a8,8,0,0,1,16,0V48a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V16a8,8,0,0,0-16,0V48A8,8,0,0,0,128,56Zm32,0a8,8,0,0,0,8-8V16a8,8,0,0,0-16,0V48A8,8,0,0,0,160,56Zm92.8,46.4L224,124v60a32,32,0,0,1-32,32H64a32,32,0,0,1-32-32V124L3.2,102.4a8,8,0,0,1,9.6-12.8L32,104V80a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8v24l19.2-14.4a8,8,0,0,1,9.6,12.8ZM208,88H48v96a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16Z" })
    );
    const AmountNoneIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" },
      React.createElement('circle', { cx: "12", cy: "12", r: "9", stroke: "currentColor", strokeWidth: "1.5", fill: "none" })
    );
    const AmountSomeIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" },
      React.createElement('circle', { cx: "12", cy: "12", r: "9", stroke: "currentColor", strokeWidth: "1.5", fill: "none" }),
      React.createElement('path', { d: "M 12,3 A 9,9 0 0,1 21,12 L 12,12 Z", fill: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })
    );
    const AmountMostIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" },
      React.createElement('circle', { cx: "12", cy: "12", r: "9", stroke: "currentColor", strokeWidth: "1.5", fill: "none" }),
      React.createElement('path', { d: "M 12,3 A 9,9 0 1,1 3,12 L 12,12 Z", fill: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })
    );
    const AmountAllIcon = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" },
      React.createElement('circle', { cx: "12", cy: "12", r: "9", fill: "currentColor" })
    );
    const PREP_ICON_BY_LABEL = {
      Raw: PrepRawIcon,
      Mashed: PrepMashedIcon,
      Steamed: PrepSteamedIcon,
      'Pur\u00e9ed': PrepPureedIcon,
      Boiled: PrepBoiledIcon
    };
    const PREP_LABEL_BY_TOKEN = {
      raw: 'Raw',
      mashed: 'Mashed',
      steamed: 'Steamed',
      'puréed': 'Puréed',
      pureed: 'Puréed',
      boiled: 'Boiled'
    };
    const AMOUNT_ICON_BY_LABEL = {
      'A little': AmountNoneIcon,
      Some: AmountSomeIcon,
      Most: AmountMostIcon,
      All: AmountAllIcon
    };
    const CUSTOM_FOOD_EMOJI_SOURCE = [
      { icon: 'HummusIcon', label: 'Hummus' },
      { emoji: '🥑', label: 'Avocado' },
      { emoji: '🧈', label: 'Butter' },
      { emoji: '🍌', label: 'Banana' },
      { emoji: '🫘', label: 'Beans' },
      { emoji: '🥯', label: 'Bagel' },
      { emoji: '🥓', label: 'Bacon' },
      { emoji: '🍞', label: 'Bread' },
      { emoji: '🥐', label: 'Croissant' },
      { emoji: '🥦', label: 'Broccoli' },
      { emoji: '🥬', label: 'Leafy greens' },
      { emoji: '🥒', label: 'Cucumber' },
      { emoji: '🥕', label: 'Carrot' },
      { emoji: '🌽', label: 'Corn' },
      { emoji: '🧄', label: 'Garlic' },
      { emoji: '🧅', label: 'Onion' },
      { emoji: '🍄', label: 'Mushroom' },
      { emoji: '🍅', label: 'Tomato' },
      { emoji: '🫒', label: 'Olives' },
      { emoji: '🥥', label: 'Coconut' },
      { emoji: '🍆', label: 'Eggplant' },
      { emoji: '🥔', label: 'Potato' },
      { emoji: '🌶️', label: 'Hot pepper' },
      { emoji: '🫑', label: 'Bell pepper' },
      { emoji: '🍇', label: 'Grapes' },
      { emoji: '🍈', label: 'Melon' },
      { emoji: '🍉', label: 'Watermelon' },
      { emoji: '🍊', label: 'Orange' },
      { emoji: '🍋', label: 'Lemon' },
      { emoji: '🍍', label: 'Pineapple' },
      { emoji: '🥭', label: 'Mango' },
      { emoji: '🍎', label: 'Red apple' },
      { emoji: '🍏', label: 'Green apple' },
      { emoji: '🍐', label: 'Pear' },
      { emoji: '🍑', label: 'Peach' },
      { emoji: '🍒', label: 'Cherries' },
      { emoji: '🍓', label: 'Strawberry' },
      { emoji: '🫐', label: 'Blueberries' },
      { emoji: '🥝', label: 'Kiwi' },
      { emoji: '🥜', label: 'Peanuts' },
      { emoji: '🌰', label: 'Chestnut' },
      { emoji: '🥖', label: 'Baguette' },
      { emoji: '🫓', label: 'Flatbread' },
      { emoji: '🥨', label: 'Pretzel' },
      { emoji: '🥞', label: 'Pancakes' },
      { emoji: '🧇', label: 'Waffle' },
      { emoji: '🍚', label: 'Rice' },
      { emoji: '🍙', label: 'Rice ball' },
      { emoji: '🍘', label: 'Rice cracker' },
      { emoji: '🍝', label: 'Spaghetti' },
      { emoji: '🍜', label: 'Noodles' },
      { emoji: '🍲', label: 'Pot of food' },
      { emoji: '🫕', label: 'Fondue' },
      { emoji: '🍗', label: 'Poultry leg' },
      { emoji: '🍖', label: 'Meat on bone' },
      { emoji: '🍔', label: 'Burger' },
      { emoji: '🌭', label: 'Hot dog' },
      { emoji: '🥩', label: 'Steak' },
      { emoji: '🍤', label: 'Fried shrimp' },
      { emoji: '🦐', label: 'Shrimp' },
      { emoji: '🦑', label: 'Squid' },
      { emoji: '🦞', label: 'Lobster' },
      { emoji: '🦀', label: 'Crab' },
      { emoji: '🐟', label: 'Fish' },
      { emoji: '🐠', label: 'Tropical fish' },
      { emoji: '🍣', label: 'Sushi' },
      { emoji: '🍱', label: 'Bento' },
      { emoji: '🥚', label: 'Egg' },
      { emoji: '🧀', label: 'Cheese' },
      { emoji: '🥛', label: 'Milk' },
      { emoji: '🍼', label: 'Baby bottle' },
      { emoji: '🍕', label: 'Pizza' },
      { emoji: '🌮', label: 'Taco' },
      { emoji: '🌯', label: 'Burrito' },
      { emoji: '🫔', label: 'Tamale' },
      { emoji: '🥙', label: 'Stuffed flatbread' },
      { emoji: '🧆', label: 'Falafel' },
      { emoji: '🥗', label: 'Green salad' },
      { emoji: '🥘', label: 'Paella' },
      { emoji: '🍿', label: 'Popcorn' },
      { emoji: '🍦', label: 'Soft ice cream' },
      { emoji: '🍧', label: 'Shaved ice' },
      { emoji: '🍨', label: 'Ice cream' },
      { emoji: '🍩', label: 'Donut' },
      { emoji: '🍪', label: 'Cookie' },
      { emoji: '🎂', label: 'Cake' },
      { emoji: '🧁', label: 'Cupcake' },
      { emoji: '🥧', label: 'Pie' },
      { emoji: '🍫', label: 'Chocolate' },
      { emoji: '🍬', label: 'Candy' },
      { emoji: '🍭', label: 'Lollipop' },
      { emoji: '🍮', label: 'Custard' },
      { emoji: '🍯', label: 'Honey' },
      { emoji: '🥣', label: 'Bowl with spoon' },
      { emoji: '🥄', label: 'Spoon' },
      { emoji: '☕', label: 'Coffee' },
      { emoji: '🧃', label: 'Juice box' },
      { emoji: '🧋', label: 'Bubble tea' },
      { emoji: '🥤', label: 'Cup with straw' }
    ];
    const CUSTOM_FOOD_EMOJI_OPTIONS = Array.from(
      new Map(CUSTOM_FOOD_EMOJI_SOURCE.map((item) => [item.emoji || item.icon || item.label, item])).values()
    ).sort((a, b) => a.label.localeCompare(b.label));
    const __normalizeSolidsToken = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    const __resolveSolidsPrep = (value) => {
      const token = __normalizeSolidsToken(value);
      const label = PREP_LABEL_BY_TOKEN[token] || String(value || '').trim();
      const Icon = PREP_ICON_BY_LABEL[label] || null;
      if (!label) return null;
      return { key: `prep-${token || label}`, label, icon: Icon };
    };
    const __resolveSolidsAmount = (value) => {
      const token = __normalizeSolidsToken(value);
      const byToken = {
        all: '● All',
        most: '◕ Most',
        some: '◑ Some',
        'a-little': '◔ A little',
        little: '◔ A little',
        none: '○ None'
      };
      const label = byToken[token] || (value ? `◌ ${value}` : '');
      return label ? { key: `amount-${token || label}`, label } : null;
    };
    const __resolveSolidsReaction = (value) => {
      const token = __normalizeSolidsToken(value);
      const byToken = {
        loved: '😍 Loved',
        liked: '😊 Liked',
        neutral: '😐 Neutral',
        disliked: '😖 Disliked'
      };
      const label = byToken[token] || (value ? `🙂 ${value}` : '');
      return label ? { key: `reaction-${token || label}`, label } : null;
    };
    const __buildSolidsMetaParts = (food) => {
      const parts = [];
      if (food?.preparation) {
        const prep = __resolveSolidsPrep(food.preparation);
        if (prep) parts.push(prep);
      }
      if (food?.amount) {
        const amount = __resolveSolidsAmount(food.amount);
        if (amount) parts.push(amount);
      }
      if (food?.reaction) {
        const reaction = __resolveSolidsReaction(food.reaction);
        if (reaction) parts.push(reaction);
      }
      return parts.filter(Boolean);
    };

    const FoodTile = ({ food, selected, onClick, onLongPress, dashed = false, labelOverride, showEditBadge = false }) => {
      if (!food) return null;
      const longPressTimerRef = React.useRef(null);
      const longPressActiveRef = React.useRef(false);
      const didLongPressRef = React.useRef(false);
      const logLongPress = (phase, details = null) => {
        if (typeof window === 'undefined' || !window.__ttLongPressDebug) return;
        console.log('[FeedSheet][LongPress]', {
          phase,
          id: food?.id || null,
          name: food?.name || null,
          hasLongPress: typeof onLongPress === 'function',
          details
        });
      };
      const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };
      const handlePressStart = (event) => {
        const hasHandler = typeof onLongPress === 'function';
        logLongPress('start', { eventType: event?.type || null, button: event?.button, pointerType: event?.pointerType || null });
        if (!hasHandler) return;
        if (longPressActiveRef.current) return;
        if (event && event.type === 'mousedown' && event.button !== 0) return;
        if (event && event.type === 'pointerdown' && event.button !== 0) return;
        if (event && event.type === 'touchstart' && event.cancelable) {
          event.preventDefault();
        }
        longPressActiveRef.current = true;
        didLongPressRef.current = false;
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          didLongPressRef.current = true;
          logLongPress('trigger');
          onLongPress();
        }, 450);
      };
      const handlePressEnd = (event) => {
        logLongPress('end', { eventType: event?.type || null, pointerType: event?.pointerType || null });
        longPressActiveRef.current = false;
        clearLongPressTimer();
      };
      React.useEffect(() => () => clearLongPressTimer(), []);
      const iconKey = typeof food.icon === 'string' ? food.icon : null;
      const IconComp = iconKey ? (window.TT?.shared?.icons?.[iconKey] || null) : null;
      const EditBadgeIcon = window.TT?.shared?.icons?.Edit2 || PenIcon || null;
      const emoji = food.emoji || (!IconComp ? '🍽️' : null);
      const bg = selected
        ? 'color-mix(in srgb, var(--tt-solids) 16%, var(--tt-input-bg))'
        : 'var(--tt-input-bg)';
      const border = selected ? 'var(--tt-solids)' : 'var(--tt-card-border)';
      const labelColor = selected ? 'var(--tt-solids)' : 'var(--tt-text-secondary)';
      return React.createElement('button', {
        key: food.id || food.name,
        type: 'button',
        onClick: () => {
          if (didLongPressRef.current) {
            logLongPress('click-suppressed-after-long-press');
            didLongPressRef.current = false;
            return;
          }
          logLongPress('click');
          if (typeof onClick === 'function') onClick();
        },
        onContextMenu: (e) => {
          if (typeof onLongPress !== 'function') return;
          e.preventDefault();
          e.stopPropagation();
        },
        onContextMenuCapture: (e) => {
          if (typeof onLongPress !== 'function') return;
          e.preventDefault();
          e.stopPropagation();
        },
        onMouseDown: handlePressStart,
        onMouseUp: handlePressEnd,
        onMouseLeave: handlePressEnd,
        onPointerDown: handlePressStart,
        onPointerUp: handlePressEnd,
        onPointerCancel: handlePressEnd,
        onTouchStart: handlePressStart,
        onTouchEnd: handlePressEnd,
        onTouchCancel: handlePressEnd,
        className: "flex flex-col items-center justify-center gap-2 rounded-full transition",
        style: {
          width: '100%',
          aspectRatio: '1',
          border: dashed ? '1.5px dashed var(--tt-border-subtle)' : `1.5px solid ${border}`,
          backgroundColor: bg,
          color: 'var(--tt-text-primary)',
          opacity: selected ? 1 : 0.6,
          position: 'relative',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }
      },
        showEditBadge && EditBadgeIcon ? React.createElement('div', {
          style: {
            position: 'absolute',
            top: 0,
            right: 0,
            width: 24,
            height: 24,
            borderRadius: 999,
            backgroundColor: 'var(--tt-solids-soft)',
            color: 'var(--tt-solids)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            boxShadow: 'var(--tt-shadow-soft)'
          }
        }, React.createElement(EditBadgeIcon, { width: 12, height: 12, color: 'currentColor' })) : null,
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
      const remaining = 3 - selected.length;
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
      return [...selected, ...fillers].slice(0, 3);
    }, [addedFoods, solidsRecentFoods, FOOD_MAP]);

    const solidsTileLabel = addedFoods.length === 0
      ? 'Add foods'
      : `${addedFoods.length} food${addedFoods.length !== 1 ? 's' : ''} added`;

    const solidsStepOne = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
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
      React.createElement('div', null,
        React.createElement('div', {
          className: "text-xs",
          style: { color: 'var(--tt-text-secondary)', marginBottom: 10 }
        }, solidsTileLabel),
        React.createElement('div', { className: "grid grid-cols-3 gap-3", style: { paddingTop: 6, paddingBottom: 7 } },
          solidsTileFoods.map((food) => {
            const resolvedId = food.id || slugifyFoodId(food.name);
            const selected = isFoodSelected(resolvedId);
            return React.createElement(FoodTile, {
              key: resolvedId || food.name,
              food: { ...food, id: resolvedId },
              selected,
              onClick: () => (selected ? removeFoodById(resolvedId) : addFoodToList({ ...food, id: resolvedId })),
              onLongPress: food?.isEditableCustom ? () => openCustomFoodEditTray({ ...food, id: resolvedId }) : null,
              showEditBadge: !!food?.isEditableCustom
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
          border: '1px solid var(--tt-card-border)',
          marginBottom: 7
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
            onClick: () => (selected ? removeFoodById(food.id) : addFoodToList(food)),
            onLongPress: food?.isEditableCustom ? () => openCustomFoodEditTray(food) : null,
            showEditBadge: !!food?.isEditableCustom
          });
        }),
        solidsSearch.trim() && solidsFilteredFoods.length === 0 && React.createElement(FoodTile, {
          key: 'add-custom',
          food: { id: 'add-custom', name: solidsSearch.trim(), icon: 'SolidsIcon', emoji: null, isCustom: true },
          size: 72,
          dashed: true,
          labelOverride: `Add "${solidsSearch.slice(0, 12)}${solidsSearch.length > 12 ? '…' : ''}"`,
          onClick: () => {
            openCustomFoodCreateTray(solidsSearch.trim());
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
    const openCustomFoodCreateTray = (name) => {
      setCustomFoodTrayMode('create');
      setCustomFoodDraft({ id: null, name: String(name || '').trim(), emoji: null, icon: null, originalName: null });
    };
    const openCustomFoodEditTray = (food) => {
      if (!food) return;
      const resolveId = food.customFoodId || food.custom_food_id || food.customFoodID || food.id;
      const byId = resolveId
        ? customFoods.find((item) => String(item.id) === String(resolveId))
        : null;
      const byName = !byId
        ? customFoods.find((item) => String(item?.name || '').trim().toLowerCase() === String(food?.name || '').trim().toLowerCase())
        : null;
      const target = byId || byName;
      if (!target || !target.id) {
        if (typeof window !== 'undefined' && window.__ttLongPressDebug) {
          console.warn('[FeedSheet][LongPress] custom food target not found', {
            inputFood: food,
            resolveId,
            customFoodsCount: customFoods.length
          });
        }
        setCustomFoodTrayMode('create');
        setCustomFoodDraft({
          id: null,
          name: String(food?.name || '').trim(),
          emoji: food?.emoji || null,
          icon: (food?.icon && food.icon !== 'SolidsIcon') ? food.icon : null,
          originalName: null
        });
        return;
      }
      setCustomFoodTrayMode('edit');
      setCustomFoodDraft({
        id: target.id,
        name: target.name || food.name || '',
        emoji: target.emoji || null,
        icon: (target?.icon && target.icon !== 'SolidsIcon') ? target.icon : null,
        originalName: target.name || food.name || ''
      });
    };
    const saveCustomFoodFromDraft = async () => {
      const draftName = String(customFoodDraft?.name || '').trim();
      if (!draftName || customFoodSaving) return;
      setCustomFoodSaving(true);
      try {
        const storage = getStorage();
        const isEdit = customFoodTrayMode === 'edit' && customFoodDraft?.id;
        const selectedEmoji = customFoodDraft?.emoji || null;
        const selectedIcon = customFoodDraft?.icon || null;
        const baseFood = {
          id: customFoodDraft?.id || `custom-${Date.now()}`,
          name: draftName,
          category: 'Custom',
          icon: selectedIcon || (selectedEmoji ? null : 'SolidsIcon'),
          emoji: selectedEmoji,
          isCustom: true
        };
        let savedFood = baseFood;
        if (isEdit) {
          if (storage && storage.updateCustomFood) {
            await storage.updateCustomFood(customFoodDraft.id, {
              name: draftName,
              icon: selectedIcon || (selectedEmoji ? null : 'SolidsIcon'),
              emoji: selectedEmoji,
              category: 'Custom'
            });
          }
        } else if (storage && storage.addCustomFood) {
          const saved = await storage.addCustomFood(baseFood);
          if (saved && typeof saved === 'object') savedFood = { ...baseFood, ...saved };
        }
        if (isEdit) {
          const oldNameLower = String(customFoodDraft?.originalName || '').toLowerCase();
          setCustomFoods((prev) => prev
            .map((item) => (String(item.id) === String(savedFood.id) ? { ...item, ...savedFood } : item))
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))));
          setAddedFoods((prev) => prev.map((item) => (
            String(item.id) === String(savedFood.id)
              ? { ...item, name: savedFood.name, emoji: savedFood.emoji || null, icon: savedFood.icon || null, category: savedFood.category || item.category }
              : item
          )));
          setRecentFoods((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((item) => {
              if (typeof item === 'string') {
                if (item.toLowerCase() !== oldNameLower && item.toLowerCase() !== String(savedFood.name || '').toLowerCase()) return item;
                return { name: savedFood.name, emoji: savedFood.emoji || null, icon: savedFood.icon || null, category: savedFood.category || 'Custom' };
              }
              if (String(item?.name || '').toLowerCase() !== oldNameLower && String(item?.id || '') !== String(savedFood.id)) return item;
              return { ...item, name: savedFood.name, emoji: savedFood.emoji || null, icon: savedFood.icon || null, category: savedFood.category || 'Custom' };
            });
          });
        } else {
          setCustomFoods((prev) => [...prev, savedFood].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))));
          addFoodToList(savedFood);
        }
        setCustomFoodDraft(null);
        setCustomFoodTrayMode('create');
        setSolidsSearch('');
      } catch (error) {
        console.error('[FeedSheet] Failed to save custom food:', error);
        alert('Failed to save custom food. Please try again.');
      } finally {
        setCustomFoodSaving(false);
      }
    };
    const deleteCustomFoodFromDraft = async () => {
      const id = customFoodDraft?.id;
      if (!id || customFoodSaving) return;
      if (typeof window !== 'undefined' && window.confirm && !window.confirm('Delete this custom food?')) return;
      setCustomFoodSaving(true);
      try {
        const storage = getStorage();
        if (storage && storage.deleteCustomFood) {
          await storage.deleteCustomFood(id);
        }
        const deletedName = String(customFoodDraft?.name || '').trim();
        if (storage && typeof storage.getRecentFoods === 'function' && typeof storage.updateKidData === 'function' && deletedName) {
          try {
            const remoteRecent = await storage.getRecentFoods({ forceServer: true });
            if (Array.isArray(remoteRecent)) {
              const filteredRecent = remoteRecent.filter((item) => {
                const name = typeof item === 'string' ? item : item?.name;
                return String(name || '').toLowerCase() !== deletedName.toLowerCase();
              });
              await storage.updateKidData({ recentSolidFoods: filteredRecent });
            }
          } catch (recentErr) {
            console.error('[FeedSheet] Failed to sync recents after custom delete:', recentErr);
          }
        }
        setCustomFoods((prev) => prev.filter((item) => String(item.id) !== String(id)));
        setAddedFoods((prev) => prev.filter((item) => String(item.id) !== String(id)));
        setRecentFoods((prev) => {
          if (!Array.isArray(prev)) return prev;
          const deletedLower = deletedName.toLowerCase();
          return prev.filter((item) => {
            if (typeof item === 'string') return item.toLowerCase() !== deletedLower;
            if (String(item?.id || '') === String(id)) return false;
            return String(item?.name || '').toLowerCase() !== deletedLower;
          });
        });
        setCustomFoodDraft(null);
        setCustomFoodTrayMode('create');
      } catch (error) {
        console.error('[FeedSheet] Failed to delete custom food:', error);
        alert('Failed to delete custom food. Please try again.');
      } finally {
        setCustomFoodSaving(false);
      }
    };

    const SolidsDetailChip = ({ label, selected, dim, onClick, icon: Icon, iconOnly = false }) => {
      return React.createElement('button', {
        type: 'button',
        onClick,
        className: iconOnly
          ? "rounded-xl transition-all flex items-center justify-center"
          : "rounded-xl transition-all inline-flex flex-col items-center justify-center gap-1.5 whitespace-nowrap",
        style: {
          minWidth: iconOnly ? 52 : 64,
          minHeight: iconOnly ? 52 : 58,
          padding: iconOnly ? '12px' : '12px 8px',
          backgroundColor: selected
            ? (iconOnly ? 'color-mix(in srgb, var(--tt-input-bg) 70%, var(--tt-text-primary))' : 'var(--tt-solids)')
            : 'var(--tt-input-bg)',
          color: selected
            ? (iconOnly ? 'var(--tt-text-primary)' : 'var(--tt-text-on-accent)')
            : 'var(--tt-text-secondary)',
          border: 'none',
          fontSize: iconOnly ? 15 : 13,
          fontWeight: 500,
          flexShrink: 0,
          opacity: dim ? 0.35 : 1
        }
      },
        Icon && React.createElement(Icon, { style: { width: iconOnly ? 28 : 24, height: iconOnly ? 28 : 24, flexShrink: 0, color: 'currentColor' } }),
        !iconOnly && React.createElement('span', { style: { lineHeight: '13px' } }, label)
      );
    };

    const SolidsReactionButton = ({ reaction, selected, dim, onClick }) => {
      return React.createElement('button', {
        type: 'button',
        onClick,
        className: "rounded-xl transition-all flex items-center justify-center",
        style: {
          minWidth: 52,
          minHeight: 52,
          padding: 16,
          backgroundColor: selected ? 'color-mix(in srgb, var(--tt-input-bg) 70%, var(--tt-text-primary))' : 'var(--tt-input-bg)',
          border: 'none',
          flexShrink: 0,
          opacity: dim ? 0.35 : 1
        }
      },
        React.createElement('div', {
          style: { fontSize: 32, lineHeight: '32px' }
        }, reaction.emoji)
      );
    };

    // Cache detailFood for TTPickerTray close animation (content stays visible while sliding out)
    if (detailFood) detailFoodCache.current = detailFood;
    const displayFood = detailFood || detailFoodCache.current;

    const solidsDetailSheet = TTPickerTray && React.createElement(TTPickerTray, {
      isOpen: !!detailFoodId,
      onClose: () => {
        setDetailFoodId(null);
        setOpenSwipeFoodId(null);
      },
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
          onClick: () => {
            setDetailFoodId(null);
            setOpenSwipeFoodId(null);
          },
          style: { justifySelf: 'end', fontWeight: 600, color: 'var(--tt-solids)', background: 'transparent', border: 'none', fontSize: 17 }
        }, 'Done')
      )
    },
      displayFood && React.createElement('div', { style: { padding: '0 16px' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 12, color: 'var(--tt-text-secondary)', marginBottom: 12 } }, 'Preparation'),
          React.createElement('div', { className: "flex overflow-x-auto pb-1", style: { gap: 5 } },
            SOLIDS_PREP_METHODS.map((method) =>
              React.createElement(SolidsDetailChip, {
                key: method,
                label: method,
                icon: PREP_ICON_BY_LABEL[method] || null,
                selected: displayFood.preparation === method,
                dim: !!displayFood.preparation && displayFood.preparation !== method,
                onClick: () => updateFoodDetail(displayFood.id, 'preparation', method)
              })
            )
          )
        ),
        React.createElement('div', { className: "mt-6" },
          React.createElement('div', { style: { fontSize: 12, color: 'var(--tt-text-secondary)', marginBottom: 12 } }, 'Amount'),
          React.createElement('div', { className: "flex overflow-x-auto pb-1", style: { gap: 5 } },
            SOLIDS_AMOUNTS.map((amount) =>
              React.createElement(SolidsDetailChip, {
                key: amount,
                label: amount,
                iconOnly: true,
                icon: AMOUNT_ICON_BY_LABEL[amount] || null,
                selected: displayFood.amount === amount,
                dim: !!displayFood.amount && displayFood.amount !== amount,
                onClick: () => updateFoodDetail(displayFood.id, 'amount', amount)
              })
            )
          )
        ),
        React.createElement('div', { className: "mt-6" },
          React.createElement('div', { style: { fontSize: 12, color: 'var(--tt-text-secondary)', marginBottom: 12 } }, 'Reaction'),
          React.createElement('div', { className: "flex overflow-x-auto pb-1", style: { gap: 5 } },
            SOLIDS_REACTIONS.map((reaction) =>
              React.createElement(SolidsReactionButton, {
                key: reaction.label,
                reaction,
                selected: displayFood.reaction === reaction.label,
                dim: !!displayFood.reaction && displayFood.reaction !== reaction.label,
                onClick: () => updateFoodDetail(displayFood.id, 'reaction', reaction.label)
              })
            )
          )
        )
      )
    );
    const customFoodCreateSheet = TTPickerTray && React.createElement(TTPickerTray, {
      isOpen: !!customFoodDraft,
      onClose: () => {
        if (customFoodSaving) return;
        setCustomFoodDraft(null);
        setCustomFoodTrayMode('create');
      },
      height: '62vh',
      header: React.createElement(
        React.Fragment,
        null,
        React.createElement('button', {
          type: 'button',
          disabled: customFoodSaving,
          onClick: customFoodTrayMode === 'edit'
            ? deleteCustomFoodFromDraft
            : () => {
              setCustomFoodDraft(null);
              setCustomFoodTrayMode('create');
            },
          style: {
            justifySelf: 'start',
            fontWeight: 600,
            color: customFoodTrayMode === 'edit' ? 'var(--tt-negative-warm)' : 'var(--tt-text-secondary)',
            background: 'transparent',
            border: 'none',
            fontSize: 17,
            opacity: customFoodSaving ? 0.5 : 1
          }
        }, customFoodTrayMode === 'edit' ? 'Delete' : 'Cancel'),
        React.createElement('div', {
          className: "font-semibold",
          style: { color: 'var(--tt-text-primary)', fontSize: 17 }
        }, customFoodTrayMode === 'edit' ? 'Edit Food' : 'New Food'),
        React.createElement('button', {
          type: 'button',
          disabled: customFoodSaving || !String(customFoodDraft?.name || '').trim(),
          onClick: saveCustomFoodFromDraft,
          style: {
            justifySelf: 'end',
            fontWeight: 600,
            color: 'var(--tt-solids)',
            background: 'transparent',
            border: 'none',
            fontSize: 17,
            opacity: (customFoodSaving || !String(customFoodDraft?.name || '').trim()) ? 0.5 : 1
          }
        }, customFoodSaving ? 'Saving...' : 'Save')
      )
    },
      React.createElement('div', { style: { padding: '0 16px' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 13, color: 'var(--tt-text-tertiary)', marginBottom: 12, fontWeight: 500 } }, 'Name'),
          React.createElement('input', {
            type: 'text',
            value: customFoodDraft?.name || '',
            onChange: (e) => setCustomFoodDraft((prev) => ({ ...(prev || { emoji: null, icon: null }), name: e.target.value })),
            placeholder: 'Enter food name',
            style: {
              width: '100%',
              background: 'var(--tt-input-bg)',
              border: 'none',
              borderRadius: 12,
              padding: '14px 16px',
              color: 'var(--tt-text-primary)',
              fontSize: 17,
              boxSizing: 'border-box'
            }
          })
        ),
        React.createElement('div', { className: "mt-6" },
          React.createElement('div', { style: { fontSize: 13, color: 'var(--tt-text-tertiary)', marginBottom: 12, fontWeight: 500 } }, 'Icon'),
          React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 8,
              padding: 4
            }
          },
            CUSTOM_FOOD_EMOJI_OPTIONS.map((item) => {
              const optionKey = item.emoji || item.icon;
              const selected = (item.emoji && customFoodDraft?.emoji === item.emoji) || (item.icon && customFoodDraft?.icon === item.icon);
              const IconOptionComp = item.icon ? (window.TT?.shared?.icons?.[item.icon] || null) : null;
              return React.createElement('button', {
                key: optionKey,
                type: 'button',
                title: item.label,
                onClick: () => setCustomFoodDraft((prev) => {
                  const nextSelected = !selected;
                  if (item.emoji) {
                    return { ...(prev || { name: '' }), emoji: nextSelected ? item.emoji : null, icon: null };
                  }
                  return { ...(prev || { name: '' }), icon: nextSelected ? item.icon : null, emoji: null };
                }),
                className: "transition-all",
                style: {
                  background: selected ? 'var(--tt-solids)' : 'var(--tt-input-bg)',
                  border: 'none',
                  borderRadius: 8,
                  padding: 8,
                  fontSize: 28,
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: selected ? 'scale(1.06)' : 'scale(1)'
                }
              }, IconOptionComp
                ? React.createElement(IconOptionComp, { width: 28, height: 28 })
                : item.emoji);
            })
          )
        )
      )
    );

    const solidsSwipeRowRef = React.useRef(null);
    if (!solidsSwipeRowRef.current) {
      solidsSwipeRowRef.current = ({ rowId, onRowClick, onEdit, onDelete, children, openSwipeFoodId, setOpenSwipeFoodId }) => {
      const SPRING = { stiffness: 900, damping: 80 };
      const containerRef = React.useRef(null);
      const contentRef = React.useRef(null);
      const dragState = React.useRef({ pointerId: null, startX: 0, startY: 0, startOffset: 0, lock: null });
      const draggingRef = React.useRef(false);
      const lockedSide = React.useRef(null);
      const widthRef = React.useRef(0);
      const hasSwipedRef = React.useRef(false);
      const lastMoveRef = React.useRef({ x: 0, t: 0, vx: 0 });
      const listenersActiveRef = React.useRef(false);
      const onMoveRef = React.useRef(null);
      const onUpRef = React.useRef(null);

      const x = __ttV4UseMotionValue(0);
      const smoothX = __ttV4UseSpring(x, SPRING);
      const progress = __ttV4UseTransform(x, (value) => {
        const width = widthRef.current || 1;
        return value / width;
      });

      const measure = React.useCallback(() => {
        const width = contentRef.current?.getBoundingClientRect().width;
        if (width) widthRef.current = width;
      }, []);

      React.useEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
      }, [measure]);

      React.useEffect(() => {
        if (openSwipeFoodId && openSwipeFoodId !== rowId) {
          __ttV4Animate(x, 0, SPRING);
        } else if (openSwipeFoodId === rowId) {
          const width = widthRef.current;
          if (width) __ttV4Animate(x, -width * 0.5, SPRING);
        }
      }, [openSwipeFoodId, rowId, x]);

      React.useEffect(() => {
        if (!openSwipeFoodId || openSwipeFoodId !== rowId) return;
        const onOutside = (event) => {
          const node = containerRef.current;
          if (node && node.contains(event.target)) return;
          __ttV4Animate(x, 0, SPRING);
          setOpenSwipeFoodId(null);
        };
        document.addEventListener('pointerdown', onOutside, true);
        return () => document.removeEventListener('pointerdown', onOutside, true);
      }, [openSwipeFoodId, rowId, x]);

      const addDocListeners = React.useCallback(() => {
        if (listenersActiveRef.current) return;
        const onMove = onMoveRef.current;
        const onUp = onUpRef.current;
        if (!onMove || !onUp) return;
        listenersActiveRef.current = true;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      }, []);

      const removeDocListeners = React.useCallback(() => {
        if (!listenersActiveRef.current) return;
        const onMove = onMoveRef.current;
        const onUp = onUpRef.current;
        if (onMove) document.removeEventListener('pointermove', onMove);
        if (onUp) {
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
        }
        listenersActiveRef.current = false;
      }, []);

      React.useEffect(() => {
        const rubberband = (value, min, max, constant = 0.55) => {
          if (value < min) {
            const diff = min - value;
            return min - (diff * constant / (diff + 200)) * 200;
          }
          if (value > max) {
            const diff = value - max;
            return max + (diff * constant / (diff + 200)) * 200;
          }
          return value;
        };

        const onMove = (event) => {
          if (!draggingRef.current) return;
          const state = dragState.current;
          if (!state.pointerId) return;
          const dx = event.clientX - state.startX;
          const dy = event.clientY - state.startY;
          const width = widthRef.current;
          if (!width) return;

          if (!state.lock) {
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (absDx > 6 || absDy > 6) {
              if (absDx > absDy * 1.2) state.lock = 'horizontal';
              else if (absDy > absDx * 1.2) state.lock = 'vertical';
            }
          }

          if (state.lock === 'vertical') {
            draggingRef.current = false;
            dragState.current = { pointerId: null, startX: 0, startY: 0, startOffset: 0, lock: null };
            removeDocListeners();
            return;
          }

          if (event.cancelable) event.preventDefault();
          hasSwipedRef.current = hasSwipedRef.current || Math.abs(dx) > 6;

          const now = event.timeStamp || performance.now();
          const last = lastMoveRef.current;
          const dt = Math.max(1, now - last.t);
          const vx = (event.clientX - last.x) / dt;
          lastMoveRef.current = { x: event.clientX, t: now, vx };

          const raw = state.startOffset + dx;
          const threshold = 0.8 * width;
          const abs = Math.abs(raw);

          if (lockedSide.current) {
            if (abs < threshold) {
              lockedSide.current = null;
              x.set(rubberband(raw, -width, 0));
            } else {
              x.set(-width);
            }
            return;
          }

          if (abs > threshold) {
            lockedSide.current = 'left';
            x.set(-width);
            return;
          }

          const clamped = Math.max(-width, Math.min(0, raw));
          x.set(rubberband(clamped, -width, 0));
        };

        const onUp = () => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          const width = widthRef.current;
          if (!width) {
            lockedSide.current = null;
            x.set(0);
            removeDocListeners();
            return;
          }

          if (lockedSide.current) {
            onDelete();
            __ttV4Animate(x, 0, { duration: 0.5, delay: 0.3 });
            lockedSide.current = null;
            setOpenSwipeFoodId(null);
          } else {
            const current = x.get();
            const vx = lastMoveRef.current.vx || 0;
            let target = 0;

            if (vx < -0.5) target = -width * 0.6;
            else if (vx > 0.5) target = 0;
            else if (Math.abs(current) > width * 0.3) target = current < 0 ? -width * 0.5 : 0;

            if (target < 0) setOpenSwipeFoodId(rowId);
            else setOpenSwipeFoodId(null);
            x.set(target);
          }

          dragState.current = { pointerId: null, startX: 0, startY: 0, startOffset: 0, lock: null };
          removeDocListeners();
        };

        onMoveRef.current = onMove;
        onUpRef.current = onUp;
        return () => {
          removeDocListeners();
        };
      }, [rowId, x, removeDocListeners]);

      const handlePointerDown = (event) => {
        if (dragState.current.pointerId != null) return;
        if (event.target && event.target.closest && event.target.closest('button')) return;
        event.stopPropagation();
        if (event.currentTarget?.setPointerCapture) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        dragState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startOffset: x.get(),
          lock: null
        };
        lastMoveRef.current = { x: event.clientX, t: event.timeStamp || performance.now(), vx: 0 };
        hasSwipedRef.current = false;
        draggingRef.current = true;
        addDocListeners();
      };

      const handleClick = (event) => {
        if (Math.abs(x.get()) > 4 || hasSwipedRef.current) {
          event.stopPropagation();
          return;
        }
        if (typeof onRowClick === 'function') onRowClick(event);
      };

      const actionColRef = React.useRef(null);
      if (!actionColRef.current) {
        actionColRef.current = ({ progressValue, side, bgColor, icon, label, onClick, primary }) => {
          const actionRef = React.useRef(null);
          const actionWidthRef = React.useRef(0);
          const offset = __ttV4UseMotionValue(0);
          const offsetSpring = __ttV4UseSpring(offset, SPRING);

          const computeOffset = React.useCallback((value) => {
            const width = actionWidthRef.current;
            if (!primary) return 0;
            if (Math.abs(value) >= 0.8) return 0;
            return -(value * width * 0.5);
          }, [primary]);

          React.useEffect(() => {
            const update = () => {
              const node = actionRef.current;
              if (!node) return;
              const nextWidth = node.getBoundingClientRect().width;
              if (nextWidth) {
                actionWidthRef.current = nextWidth;
                offset.set(computeOffset(progressValue.get()));
              }
            };
            update();
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
          }, [computeOffset, progressValue, offset]);

          React.useEffect(() => {
            const unsubscribe = progressValue.on('change', (value) => {
              offset.set(computeOffset(value));
            });
            return () => unsubscribe();
          }, [computeOffset, progressValue, offset]);

          const primaryOpacity = primary ? 1 : 0;
          const opacity = __ttV4UseTransform(
            progressValue,
            [-1, -0.8, -0.5, -0.25, 0.25, 0.5, 0.8, 1],
            [primaryOpacity, 1, 1, 0, 0, 1, 1, primaryOpacity]
          );
          const opacitySpring = __ttV4UseSpring(opacity, SPRING);

          const xShift = __ttV4UseTransform(progressValue, [-1, -0.8, -0.5, 0.5, 0.8, 1], [0, 16, 0, 0, -16, 0]);
          const xSpring = __ttV4UseSpring(xShift, SPRING);

          const scale = __ttV4UseTransform(progressValue, [-1, -0.8, 0, 0.8, 1], [1, 0.8, 1, 0.8, 1]);
          const scaleSpring = __ttV4UseSpring(scale, SPRING);

          return React.createElement(
            __ttV4Motion.div,
            {
              ref: actionRef,
              style: {
                position: 'absolute',
                inset: 0,
                display: 'flex',
                justifyContent: side === 'right' ? 'flex-start' : 'flex-end',
                backgroundColor: bgColor,
                x: offsetSpring
              }
            },
            React.createElement(
              __ttV4Motion.div,
              {
                style: {
                  height: '100%',
                  width: '25%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }
              },
              React.createElement(
                __ttV4Motion.button,
                {
                  'data-swipe-action': 'true',
                  type: 'button',
                  onClick,
                  whileTap: { scale: 0.92 },
                  style: {
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 4,
                    color: 'var(--tt-text-primary)',
                    pointerEvents: 'auto'
                  }
                },
                React.createElement(
                  __ttV4Motion.span,
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      opacity: opacitySpring,
                      scale: scaleSpring,
                      x: xSpring,
                      transformOrigin: side === 'right' ? 'right' : 'left',
                      fontSize: 12
                    }
                  },
                  icon,
                  label
                )
              )
            )
          );
        };
      }
      const ActionColumn = actionColRef.current;

      const EditIcon = React.createElement('svg', {
        width: 24,
        height: 24,
        viewBox: '0 0 256 256',
        fill: 'currentColor',
        xmlns: 'http://www.w3.org/2000/svg'
      },
        React.createElement('path', {
          d: 'M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z'
        })
      );
      const DeleteIcon = React.createElement('svg', {
        width: 24,
        height: 24,
        viewBox: '0 0 256 256',
        fill: 'currentColor',
        xmlns: 'http://www.w3.org/2000/svg'
      },
        React.createElement('path', {
          d: 'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z'
        })
      );

      return React.createElement('div', {
        ref: containerRef,
        className: "relative w-full min-h-[72px] rounded-2xl overflow-hidden",
        style: { backgroundColor: 'var(--tt-input-bg)', border: '1px solid var(--tt-card-border)', touchAction: 'pan-y' },
        onPointerDown: handlePointerDown
      },
        React.createElement(__ttV4Motion.div, {
          style: {
            position: 'absolute',
            inset: 0,
            left: '100%',
            display: 'flex',
            width: '100%',
            x: smoothX
          }
        },
          React.createElement(ActionColumn, {
            progressValue: progress,
            side: 'right',
            primary: false,
            bgColor: 'var(--tt-positive-alt)',
            icon: EditIcon,
            label: 'Edit',
            onClick: (e) => {
              e.stopPropagation();
              onEdit();
            }
          }),
          React.createElement(ActionColumn, {
            progressValue: progress,
            side: 'right',
            primary: true,
            bgColor: 'var(--tt-negative-warm)',
            icon: DeleteIcon,
            label: 'Delete',
            onClick: (e) => {
              e.stopPropagation();
              onDelete();
              setOpenSwipeFoodId(null);
              __ttV4Animate(x, 0, SPRING);
            }
          })
        ),
        React.createElement(__ttV4Motion.div, {
          ref: contentRef,
          style: { x: smoothX, position: 'relative', zIndex: 10, touchAction: 'pan-y' },
          onClick: handleClick
        }, children)
      );
      };
    }
    const SolidsSwipeRow = solidsSwipeRowRef.current;

    const solidsStepThree = React.createElement('div', { className: "space-y-4" },
      React.createElement('div', { className: "flex flex-col gap-2" },
        addedFoods.map((food) => {
          const rowId = String(food.id);
          const summaryParts = __buildSolidsMetaParts(food);
          const hasSummary = summaryParts.length > 0;
          const foodDef = FOOD_MAP[food.id] || food;
          const iconKey = foodDef?.icon || food?.icon || null;
          const IconComp = iconKey ? (window.TT?.shared?.icons?.[iconKey] || null) : null;
          const emoji = foodDef?.emoji || food?.emoji || (!IconComp ? '🍽️' : null);
          return React.createElement(SolidsSwipeRow, {
            key: rowId,
            rowId,
            onRowClick: () => setDetailFoodId(rowId),
            onEdit: () => setDetailFoodId(rowId),
            onDelete: () => removeFoodById(food.id),
            openSwipeFoodId,
            setOpenSwipeFoodId
          },
            React.createElement('div', {
              className: "w-full px-5 py-4 text-left",
              style: { backgroundColor: 'var(--tt-input-bg)' }
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
                      summaryParts.map((part, idx) => React.createElement(React.Fragment, { key: part.key || `${rowId}-meta-${idx}` },
                        idx > 0 ? React.createElement('span', { style: { padding: '0 6px' } }, '\u00B7') : null,
                        React.createElement('span', {
                          style: { display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }
                        },
                          part.icon ? React.createElement(part.icon, {
                            width: 14,
                            height: 14,
                            color: 'currentColor',
                            style: { flexShrink: 0 }
                          }) : null,
                          React.createElement('span', null, part.label)
                        )
                      ))
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
      isSolids && solidsDetailSheet,
      isSolids && customFoodCreateSheet
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
      ? (solidsCta ? (solidsCta.disabled || solidsTrayOpen) : true)
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
                onClick: () => { if (!solidsTrayOpen) handleClose(); }
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
                drag: solidsTrayOpen ? false : "y",
                dragControls: dragControls || undefined,
                dragListener: !dragControls,
                dragConstraints: { top: 0, bottom: 0 },
                dragElastic: { top: 0, bottom: 0.7 },
                dragMomentum: true,
                onDragEnd: (e, info) => {
                  if (!solidsTrayOpen && (info.offset.y > 60 || info.velocity.y > 500)) {
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
                  onClick: solidsTrayOpen
                    ? () => { setDetailFoodId(null); setCustomFoodDraft(null); }
                    : ((isSolids && solidsStep >= 2)
                      ? () => setSolidsStep(1)
                      : handleClose),
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
                      onClick: () => { if (!solidsTrayOpen) setSolidsStep(3); },
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
