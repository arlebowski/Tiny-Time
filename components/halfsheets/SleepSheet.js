// SleepSheet Component
// Unified sleep input + sleep detail sheet

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.SleepSheet) {
  
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
      return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: `${hStr}h ${mStr}m ${sStr}s` };
    }

    if (m > 0) {
      const mStr = m >= 10 ? pad2(m) : String(m);
      const sStr = pad2(s);
      return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
    }

    const sStr = s < 10 ? String(s) : pad2(s);
    return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
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
  const ChevronDown = window.ChevronDown;

  const SleepSheet = ({
    variant = 'input', // 'input' | 'detail'
    isOpen,
    onClose,
    kidId = null,
    entry = null,
    onDelete = null,
    onSave = null,
    onAdd = null
  }) => {
    const isInputVariant = variant !== 'detail';
    const effectiveEntry = isInputVariant ? null : entry;
    const effectiveOnSave = isInputVariant ? onAdd : onSave;
    const dragControls = __ttV4UseDragControls ? __ttV4UseDragControls() : null;
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

    const getInitialSleepState = () => {
      if (!isInputVariant) return 'idle';
      try {
        const activeSleepLocal = localStorage.getItem('tt_active_sleep');
        if (activeSleepLocal) {
          const parsed = JSON.parse(activeSleepLocal);
          if (parsed.startTime && !parsed.endTime) {
            return 'running';
          }
        }
      } catch (e) {}
      return 'idle';
    };

    const getInitialStartTime = () => {
      if (!isInputVariant) return new Date().toISOString();
      try {
        const activeSleepLocal = localStorage.getItem('tt_active_sleep');
        if (activeSleepLocal) {
          const parsed = JSON.parse(activeSleepLocal);
          if (parsed.startTime) {
            return normalizeIsoTime(parsed.startTime);
          }
        }
      } catch (e) {}
      return null;
    };

    const [sleepState, setSleepState] = React.useState(getInitialSleepState());
    const [startTime, setStartTime] = React.useState(getInitialStartTime());
    const [endTime, setEndTime] = React.useState(null);
    const [sleepElapsedMs, setSleepElapsedMs] = React.useState(0);
    const sleepIntervalRef = React.useRef(null);
    const [endTimeManuallyEdited, setEndTimeManuallyEdited] = React.useState(false);
    const endTimeManuallyEditedRef = React.useRef(false);
    const [activeSleepSessionId, setActiveSleepSessionId] = React.useState(null);
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [lastValidDuration, setLastValidDuration] = React.useState({ hours: 0, minutes: 0, seconds: 0 });
    const [saving, setSaving] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    const ctaFooterRef = React.useRef(null);
    // Track original photo URLs to detect deletions
    const originalPhotoURLsRef = React.useRef([]);
    
    // Collapsible Notes/Photos state
    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);
    const inputValueClassName = 'text-[18px]';
    const draftCache = (typeof window !== 'undefined' && window.TT?.shared?.dataCache)
      ? window.TT.shared.dataCache
      : null;

    // Wheel picker trays (feature flagged)
    const _pickers = (typeof window !== 'undefined' && window.TT?.shared?.pickers) ? window.TT.shared.pickers : {};
    const TTPickerTray = _pickers.TTPickerTray;
    const WheelPicker = _pickers.WheelPicker;
    const wheelStyles = _pickers.wheelStyles || {};
    const TTPhotoRow = _pickers.TTPhotoRow || window.TT?.shared?.TTPhotoRow || window.TTPhotoRow;

    const [showDateTimeTray, setShowDateTimeTray] = React.useState(false);
    const [dtTarget, setDtTarget] = React.useState('sleep_start'); // 'sleep_start' | 'sleep_end'
    const [dtSelectedDate, setDtSelectedDate] = React.useState(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.toISOString();
    });
    const [dtHour, setDtHour] = React.useState(12);
    const [dtMinute, setDtMinute] = React.useState(0);
    const [dtAmpm, setDtAmpm] = React.useState('AM');

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
      if (mode === 'datetime_sleep_start' || mode === 'datetime_sleep_end') {
        const target = (mode === 'datetime_sleep_end') ? 'sleep_end' : 'sleep_start';
        setDtTarget(target);
        const iso = (target === 'sleep_end' ? (endTime || new Date().toISOString()) : (startTime || new Date().toISOString()));
        const parts = _isoToDateParts(iso);
        setDtSelectedDate(parts.dayISO);
        setDtHour(parts.hour);
        setDtMinute(parts.minute);
        setDtAmpm(parts.ampm);
        setShowDateTimeTray(true);
      }
    };

    // Calculate height based on expanded fields
    const useActiveSleep = (typeof window !== 'undefined' && window.TT?.shared?.useActiveSleep)
      ? window.TT.shared.useActiveSleep
      : (() => ({ activeSleep: null, activeSleepLoaded: true }));
    const { activeSleep, activeSleepLoaded } = useActiveSleep(kidId);
    const activeSleepId = activeSleep && activeSleep.id ? activeSleep.id : null;
    const hasActiveSleep = !!(activeSleepId && activeSleep && activeSleep.startTime);

    // Populate form from entry when it exists
    React.useEffect(() => {
      if (effectiveEntry && isOpen) {
        setStartTime(effectiveEntry.startTime ? new Date(effectiveEntry.startTime).toISOString() : new Date().toISOString());
        setEndTime(effectiveEntry.endTime ? new Date(effectiveEntry.endTime).toISOString() : null);
        setNotes(effectiveEntry.notes || '');
        const normalizedExisting = __ttNormalizePhotoUrls(effectiveEntry.photoURLs);
        setExistingPhotoURLs(normalizedExisting);
        originalPhotoURLsRef.current = normalizedExisting; // Track original URLs
        setPhotos([]); // Reset new photos
        // Auto-expand if there's existing content
        setNotesExpanded(!!effectiveEntry.notes);
        setPhotosExpanded(normalizedExisting.length > 0);
      } else if (!effectiveEntry && isOpen) {
        // Create mode - reset to defaults
        const activeStartIso = (isInputVariant && activeSleep && activeSleep.startTime)
          ? new Date(activeSleep.startTime).toISOString()
          : null;
        setStartTime(activeStartIso || getInitialStartTime());
        setEndTime(null);
        if (isInputVariant && !activeSleepId) {
          setSleepState('idle');
          setSleepElapsedMs(0);
          setEndTimeManuallyEdited(false);
          endTimeManuallyEditedRef.current = false;
        }
        setNotes('');
        setExistingPhotoURLs([]);
        originalPhotoURLsRef.current = []; // Reset
        setPhotos([]);
        setNotesExpanded(false);
        setPhotosExpanded(false);
      }
    }, [effectiveEntry, isOpen, activeSleep, activeSleepId, isInputVariant]);

    const _normalizeSleepStartMs = (startMs, nowMs = Date.now()) => {
      if (!startMs) return null;
      return (startMs > nowMs + 3 * 3600000) ? (startMs - 86400000) : startMs;
    };

    // Sync active sleep with Firebase-backed hook (input variant only)
    React.useEffect(() => {
      if (!isInputVariant || !activeSleepLoaded) return;
      if (activeSleep && activeSleep.id) {
        if (!activeSleepSessionId || activeSleepSessionId !== activeSleep.id) {
          setActiveSleepSessionId(activeSleep.id);
        }
        if (activeSleep.startTime) {
          const serverStartIso = new Date(activeSleep.startTime).toISOString();
          setStartTime(serverStartIso);
          const normalizedStart = _normalizeSleepStartMs(activeSleep.startTime);
          if (normalizedStart) {
            setSleepElapsedMs(Date.now() - normalizedStart);
          }
        }
        if (!endTimeManuallyEditedRef.current) {
          setEndTime(null);
          setEndTimeManuallyEdited(false);
        }
        if (sleepState !== 'running' && !endTimeManuallyEditedRef.current) {
          setSleepState('running');
        }
      } else {
        if (sleepState === 'running') {
          setSleepState('idle');
        }
        // No active sleep: blank out times for input variant
        setStartTime(null);
        setEndTime(null);
        setSleepElapsedMs(0);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
        try {
          localStorage.removeItem('tt_active_sleep');
        } catch (e) {}
        if (activeSleepSessionId) {
          setActiveSleepSessionId(null);
        }
      }
    }, [isInputVariant, activeSleep, activeSleepLoaded, sleepState, activeSleepSessionId]);

    const getDraftKey = () => {
      const sleepId = activeSleepSessionId || activeSleepId;
      if (!sleepId || !kidId) return null;
      return `tt_sleep_draft:${kidId}:${sleepId}`;
    };

    React.useEffect(() => {
      let cancelled = false;
      const loadDraft = async () => {
        if (!draftCache || !isInputVariant) return;
        const key = getDraftKey();
        if (!key) return;
        const draft = await draftCache.get(key);
        if (cancelled || !draft) return;
        if (draft.notes != null) setNotes(draft.notes);
        if (Array.isArray(draft.photos)) setPhotos(draft.photos);
      };
      loadDraft();
      return () => {
        cancelled = true;
      };
    }, [draftCache, isInputVariant, activeSleepSessionId, activeSleepId, kidId]);

    React.useEffect(() => {
      if (!draftCache || !isInputVariant) return;
      if (sleepState !== 'running') return;
      const key = getDraftKey();
      if (!key) return;
      const timeout = setTimeout(() => {
        draftCache.set(key, {
          notes: notes || '',
          photos: Array.isArray(photos) ? photos : [],
          updatedAt: Date.now()
        });
      }, 250);
      return () => clearTimeout(timeout);
    }, [draftCache, isInputVariant, sleepState, notes, photos, activeSleepSessionId, activeSleepId, kidId]);

    const clearDraft = async () => {
      if (!draftCache) return;
      const key = getDraftKey();
      if (!key) return;
      await draftCache.remove(key);
    };

    React.useEffect(() => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }
      if (!isInputVariant || sleepState !== 'running' || endTimeManuallyEditedRef.current) return;
      if (!startTime) return;
      const startMs = _normalizeSleepStartMs(new Date(startTime).getTime());
      if (!startMs) return;
      const tick = () => setSleepElapsedMs(Math.max(0, Date.now() - startMs));
      tick();
      sleepIntervalRef.current = setInterval(tick, 1000);
      return () => {
        if (sleepIntervalRef.current) {
          clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
        }
      };
    }, [isInputVariant, sleepState, startTime]);

    // Reset expand state when sheet closes
    React.useEffect(() => {
      if (!isOpen) {
        setNotesExpanded(false);
        setPhotosExpanded(false);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
      }
    }, [isOpen]);

    React.useEffect(() => {
      if (!isInputVariant) return;
      if (!activeSleep || !activeSleep.id) {
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
      }
    }, [activeSleep, isInputVariant]);

    // Calculate duration with validation
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
    const isValid = durationResult !== null;
    const duration = isValid ? durationResult : lastValidDuration;
    
    // Update last valid duration when valid
    React.useEffect(() => {
      if (isValid) {
        setLastValidDuration(duration);
      }
    }, [isValid, duration.hours, duration.minutes, duration.seconds]);

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


    const handleSave = async () => {
      if (!isValid) {
        return; // Don't save if invalid
      }
      
      setSaving(true);
      try {
        const startMs = new Date(startTime).getTime();
        const endMs = endTime ? new Date(endTime).getTime() : Date.now();
        
        // Check for overlaps (exclude current entry if editing)
        const excludeId = effectiveEntry && effectiveEntry.id
          ? effectiveEntry.id
          : (isInputVariant && activeSleepId ? activeSleepId : null);
        const hasOverlap = await checkSleepOverlap(startMs, endMs, excludeId);
        if (hasOverlap) {
          alert('This sleep session overlaps with an existing sleep session. Please adjust the times.');
          setSaving(false);
          return;
        }
        
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
            const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
            newPhotoURLs.push(downloadURL);
          } catch (error) {
              console.error(`[SleepSheet] Failed to upload photo ${i + 1}:`, error);
              console.error('[SleepSheet] Photo upload error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
              });
            // Continue with other photos even if one fails
          }
          }
        }
        
        // Combine existing and new photo URLs
        const allPhotoURLs = __ttNormalizePhotoUrls([...existingPhotoURLs, ...newPhotoURLs]);
        
        if (effectiveEntry && effectiveEntry.id) {
          // Update existing sleep session
          await firestoreStorage.updateSleepSession(effectiveEntry.id, {
            startTime: startMs,
            endTime: endMs,
            isActive: false,
            notes: notes || null,
            photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : []
          });
        } else if (isInputVariant && activeSleepId) {
          // End currently running sleep session
          await firestoreStorage.endSleep(activeSleepId, endMs);
          await firestoreStorage.updateSleepSession(activeSleepId, {
            startTime: startMs,
            endTime: endMs,
            isActive: false,
            notes: notes || null,
            photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : []
          });
        } else {
          // Create new sleep session (shouldn't happen from detail sheet, but handle it)
          const session = await firestoreStorage.startSleep(startMs);
          await firestoreStorage.endSleep(session.id, endMs);
          if (notes || allPhotoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(session.id, {
              notes: notes || null,
              photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : []
            });
          }
        }

        // If this sleep has notes or photos, also post it into the family chat "from @tinytracker"
        try {
          const hasNote = !!(notes && String(notes).trim().length > 0);
          const hasPhotos = Array.isArray(allPhotoURLs) && allPhotoURLs.length > 0;
          if ((hasNote || hasPhotos) && firestoreStorage && typeof firestoreStorage.saveMessage === 'function') {
            const eventTime = new Date(startMs);
            const timeLabel = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const chatMsg = {
              role: 'assistant',
              content: `@tinytracker: Sleep • ${timeLabel}${hasNote ? `\n${String(notes).trim()}` : ''}`,
              timestamp: Date.now(),
              source: 'log',
              logType: 'sleep',
              logTimestamp: startMs,
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
        console.error('[SleepSheet] Failed to save sleep session:', error);
        console.error('[SleepSheet] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        alert(`Failed to save sleep session: ${error.message || 'Please try again.'}`);
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!effectiveEntry || !effectiveEntry.id) return;
      
      setSaving(true);
      try {
        await firestoreStorage.deleteSleepSession(effectiveEntry.id);
        // Close the sheet first
        handleClose();
        // Then refresh timeline after sheet closes (onDelete callback handles the delay)
        if (onDelete) {
          await onDelete();
        }
      } catch (error) {
        console.error('Failed to delete sleep session:', error);
        alert('Failed to delete sleep session. Please try again.');
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

    const handleStartTimeChange = (nextValue) => {
      const clamped = clampStartIsoToNow(nextValue);
      setStartTime(clamped);
      if (isInputVariant && sleepState === 'running') {
        setEndTime(null);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
      }
    };

    const handleEndTimeChange = (nextValue) => {
      setEndTime(nextValue);
      setEndTimeManuallyEdited(true);
      endTimeManuallyEditedRef.current = true;
      if (isInputVariant && sleepState === 'running') {
        setSleepState('idle');
      }
    };

    const isIdleWithTimes = sleepState === 'idle' && startTime && endTime;

    const handleStartSleep = async () => {
      if (!isInputVariant || saving) return;
      try {
        let sessionId = activeSleepSessionId || activeSleepId;
        let startMs;
        let effectiveStartIso = startTime;

        if (isIdleWithTimes) {
          startMs = new Date(startTime).getTime();
          setEndTime(null);
        } else {
          const parsed = effectiveStartIso ? new Date(effectiveStartIso).getTime() : NaN;
          if (!effectiveStartIso || !Number.isFinite(parsed)) {
            effectiveStartIso = new Date().toISOString();
            setStartTime(effectiveStartIso);
            startMs = new Date(effectiveStartIso).getTime();
          } else {
            const clamped = clampStartIsoToNow(effectiveStartIso);
            if (clamped !== effectiveStartIso) {
              effectiveStartIso = clamped;
              setStartTime(effectiveStartIso);
            }
            startMs = new Date(effectiveStartIso).getTime();
          }
          setEndTime(null);
        }

        if (!sessionId) {
          const session = await firestoreStorage.startSleep(startMs);
          sessionId = session.id;
          setActiveSleepSessionId(sessionId);
        } else {
          await firestoreStorage.updateSleepSession(sessionId, {
            startTime: startMs,
            endTime: null,
            isActive: true
          });
        }

        setSleepState('running');
      } catch (error) {
        console.error('Failed to start sleep:', error);
        alert('Failed to start sleep. Please try again.');
      }
    };

    const handleEndSleep = async () => {
      if (!isInputVariant || sleepState !== 'running' || saving) return;
      setSaving(true);
      try {
        const nowIso = new Date().toISOString();
        const endMs = Date.now();
        setEndTime(nowIso);

        const sessionId = activeSleepSessionId || activeSleepId;
        if (sessionId) {
          await firestoreStorage.endSleep(sessionId, endMs);
          const photoURLs = [];
          for (const photoBase64 of photos) {
            try {
              const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
              photoURLs.push(downloadURL);
            } catch (error) {
              console.error('Failed to upload photo:', error);
            }
          }

          if (notes || photoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(sessionId, {
              notes: notes || null,
              photoURLs: photoURLs.length > 0 ? photoURLs : []
            });
          }
          setActiveSleepSessionId(null);
        }

        setSleepState('idle');
        setStartTime(new Date().toISOString());
        setEndTime(null);
        setNotes('');
        setPhotos([]);
        setSleepElapsedMs(0);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;

        if (onClose) onClose();
        if (onAdd) {
          await onAdd('sleep');
        }
        await clearDraft();
      } catch (error) {
        console.error('Failed to end sleep:', error);
        alert('Failed to end sleep. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    const handleSaveSleep = async () => {
      if (!isInputVariant || saving) return;
      if (!isValid) return;
      setSaving(true);
      try {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        const excludeId = activeSleepSessionId || null;
        const hasOverlap = await checkSleepOverlap(startMs, endMs, excludeId);
        if (hasOverlap) {
          alert('This sleep session overlaps with an existing sleep session. Please adjust the times.');
          setSaving(false);
          return;
        }

        const photoURLs = [];
        for (const photoBase64 of photos) {
          try {
            const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
            photoURLs.push(downloadURL);
          } catch (error) {
            console.error('Failed to upload photo:', error);
          }
        }

        if (activeSleepSessionId) {
          await firestoreStorage.endSleep(activeSleepSessionId, endMs);
          if (notes || photoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(activeSleepSessionId, {
              notes: notes || null,
              photoURLs: photoURLs.length > 0 ? photoURLs : []
            });
          }
          setActiveSleepSessionId(null);
        } else {
          const session = await firestoreStorage.startSleep(startMs);
          await firestoreStorage.endSleep(session.id, endMs);
          if (notes || photoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(session.id, {
              notes: notes || null,
              photoURLs: photoURLs.length > 0 ? photoURLs : []
            });
          }
        }

        setSleepState('idle');
        setStartTime(new Date().toISOString());
        setEndTime(null);
        setNotes('');
        setPhotos([]);
        setSleepElapsedMs(0);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;

        if (onClose) onClose();
        if (onAdd) {
          await onAdd('sleep');
        }
        await clearDraft();
      } catch (error) {
        console.error('Failed to save sleep session:', error);
        alert('Failed to save sleep session. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    // Timer display (apply shared formatting rules)
    const displayMs = (() => {
      if (isInputVariant && sleepState === 'running' && !endTimeManuallyEditedRef.current) {
        return sleepElapsedMs;
      }
      if (!startTime || !endTime) return 0;
      return (Number(duration.hours || 0) * 3600000) +
        (Number(duration.minutes || 0) * 60000) +
        (Number(duration.seconds || 0) * 1000);
    })();
    const tParts = formatElapsedHmsTT(displayMs);

    // Body content (used in both static and overlay modes)
    const contentBlock = React.createElement(
      React.Fragment,
      null,
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
      React.createElement('div', { className: "space-y-2" },
        React.createElement('div', { className: "grid grid-cols-2 gap-3" },
          React.createElement(InputRow, {
            label: 'Start time',
            value: startTime ? formatDateTime(startTime) : 'Add...',
            rawValue: startTime,
            onChange: handleStartTimeChange,
            icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
            valueClassName: inputValueClassName,
            type: 'datetime',
            pickerMode: 'datetime_sleep_start',
            onOpenPicker: openTrayPicker,
            placeholder: 'Add...'
          }),
            React.createElement(InputRow, {
              label: 'End time',
              value: endTime ? formatDateTime(endTime) : 'Add...',
              rawValue: endTime,
              onChange: handleEndTimeChange,
              icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
              valueClassName: inputValueClassName,
              type: 'datetime',
              pickerMode: 'datetime_sleep_end',
              onOpenPicker: openTrayPicker,
              placeholder: 'Add...',
              invalid: !saving && !isValid
            })
          ),
        (!notesExpanded && !photosExpanded) && React.createElement('div', { className: "grid grid-cols-2 gap-3" },
          React.createElement('div', {
            onClick: () => setNotesExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add notes'),
          TTPhotoRow && React.createElement('div', {
            onClick: () => setPhotosExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add photos')
        ),
        notesExpanded
          ? React.createElement(__ttV4Motion.div, {
              initial: { opacity: 0, y: 6, scale: 0.98 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { type: "spring", damping: 25, stiffness: 300 }
            },
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
          : photosExpanded ? React.createElement('div', {
              onClick: () => setNotesExpanded(true),
              className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, '+ Add notes') : null
      ),
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
        className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
        style: { color: 'var(--tt-text-tertiary)' }
      }, '+ Add photos')
    );

    const ctaButton = (() => {
      if (saving) {
        return React.createElement('button', {
          type: 'button',
          disabled: true,
          onTouchStart: (e) => e.stopPropagation(),
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-sleep-strong)',
            touchAction: 'manipulation',
            opacity: 0.7,
            cursor: 'not-allowed'
          }
        }, 'Saving...');
      }

      if (isInputVariant && sleepState === 'running') {
        return React.createElement('button', {
          type: 'button',
          onClick: handleEndSleep,
          onTouchStart: (e) => e.stopPropagation(),
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-sleep)',
            touchAction: 'manipulation'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = 'var(--tt-sleep)';
          }
        }, 'Stop timer');
      }

      if (isInputVariant && endTimeManuallyEdited) {
        const canSave = isValid;
        return React.createElement('button', {
          type: 'button',
          onClick: canSave ? handleSaveSleep : undefined,
          onTouchStart: (e) => e.stopPropagation(),
          disabled: !canSave,
          className: "w-full py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: canSave ? 'var(--tt-sleep)' : 'transparent',
            color: canSave ? 'var(--tt-text-on-accent)' : 'var(--tt-error)',
            border: canSave ? 'none' : '1px solid var(--tt-error)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.7,
            touchAction: 'manipulation'
          },
          onMouseEnter: (e) => {
            if (canSave) {
              e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
            }
          },
          onMouseLeave: (e) => {
            if (canSave) {
              e.target.style.backgroundColor = 'var(--tt-sleep)';
            }
          }
        }, 'Save');
      }

      if (isInputVariant) {
        return React.createElement('button', {
          type: 'button',
          onClick: handleStartSleep,
          onTouchStart: (e) => e.stopPropagation(),
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-sleep)',
            touchAction: 'manipulation'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = 'var(--tt-sleep)';
          }
        }, 'Start Sleep');
      }

      return React.createElement('button', {
        type: 'button',
        onClick: handleSave,
        disabled: saving || !isValid,
        onTouchStart: (e) => e.stopPropagation(),
        className: "w-full py-3 rounded-2xl font-semibold transition",
        style: {
          backgroundColor: saving ? 'var(--tt-sleep-strong)' : (isValid ? 'var(--tt-sleep)' : 'transparent'),
          color: saving ? 'var(--tt-text-on-accent)' : (isValid ? 'var(--tt-text-on-accent)' : 'var(--tt-error)'),
          border: (!saving && !isValid) ? '1px solid var(--tt-error)' : 'none',
          touchAction: 'manipulation',
          opacity: (saving || !isValid) ? 0.7 : 1,
          cursor: (saving || !isValid) ? 'not-allowed' : 'pointer'
        },
        onMouseEnter: (e) => {
          if (!saving && isValid) {
            e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
          }
        },
        onMouseLeave: (e) => {
          if (!saving && isValid) {
            e.target.style.backgroundColor = 'var(--tt-sleep)';
          }
        }
      }, 'Save');
    })();

    const overlayContent = React.createElement(
      React.Fragment,
      null,
      // Wheel date/time tray (feature flagged)
      TTPickerTray && WheelPicker && React.createElement(TTPickerTray, {
        isOpen: showDateTimeTray,
        onClose: () => setShowDateTimeTray(false),
        header: React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: () => setShowDateTimeTray(false),
            style: { justifySelf: 'start', background: 'none', border: 'none', padding: 0, color: 'var(--tt-text-secondary)', fontSize: 17 }
          }, 'Cancel'),
          React.createElement('div', { style: { justifySelf: 'center', fontWeight: 600, fontSize: 17, color: 'var(--tt-text-primary)' } }, dtTarget === 'sleep_end' ? 'End time' : 'Start time'),
          React.createElement('button', {
            onClick: () => {
              const nextISO = _partsToISO({ dayISO: dtSelectedDate, hour: dtHour, minute: dtMinute, ampm: dtAmpm });
              if (dtTarget === 'sleep_end') handleEndTimeChange(nextISO);
              else handleStartTimeChange(nextISO);
              setShowDateTimeTray(false);
            },
            style: { justifySelf: 'end', background: 'none', border: 'none', padding: 0, color: 'var(--tt-sleep)', fontSize: 17, fontWeight: 600 }
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

      // Full-size photo modal (PORTAL to body so it isn't trapped inside sheet overlay stacking)
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
      transition: { type: "spring", damping: 25, stiffness: 300 }
    }, contentBlock);

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
      }, animatedContent),
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
                  maxHeight: '90vh',
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
                  backgroundColor: 'var(--tt-sleep)',
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
                React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, 'Sleep'),
                React.createElement('div', { className: "w-6" })
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
    window.SleepSheet = SleepSheet;
  }
}
