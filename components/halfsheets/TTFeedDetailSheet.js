// TTFeedDetailSheet Component
// Extracted from TrackerCard.js for better organization

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTFeedDetailSheet) {
  
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

  const _getUiVersion = () => {
    try {
      if (window.TT?.shared?.uiVersion?.getUIVersion) {
        return window.TT.shared.uiVersion.getUIVersion();
      }
      const v = window.localStorage?.getItem('tt_ui_version');
      return v || null;
    } catch (e) {
      return null;
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
  
  const HalfSheet = window.TT?.shared?.TTHalfSheet || window.TTHalfSheet || window.TT?.utils?.HalfSheet;
  const PenIcon = window.PenIcon;
  const XIcon = window.XIcon;
  const ChevronDown = window.ChevronDown;

  const TTFeedDetailSheetLegacy = ({ isOpen, onClose, entry = null, onDelete = null, onSave = null, __ttUseV4Sheet = false }) => {
    const [ounces, setOunces] = React.useState('');
    const [dateTime, setDateTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    const ctaFooterRef = React.useRef(null);
    const CTA_BOTTOM_OFFSET_PX = 30;
    const CTA_SPACER_PX = 86 + CTA_BOTTOM_OFFSET_PX;
    const [ctaHeightPx, setCtaHeightPx] = React.useState(CTA_SPACER_PX);
    
    // Track original photo URLs to detect deletions
    const originalPhotoURLsRef = React.useRef([]);
    
    // Collapsible Notes/Photos state
    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);

    // Wheel picker trays (feature flagged)
    const _pickers = (typeof window !== 'undefined' && window.TT?.shared?.pickers) ? window.TT.shared.pickers : {};
    const TTPickerTray = _pickers.TTPickerTray;
    const AmountPickerLabSection = _pickers.AmountPickerLabSection;
    const WheelPicker = _pickers.WheelPicker;
    const wheelStyles = _pickers.wheelStyles || {};
    const TTPhotoRow = _pickers.TTPhotoRow || window.TT?.shared?.TTPhotoRow || window.TTPhotoRow;

    const [showAmountTray, setShowAmountTray] = React.useState(false);
    const [amountPickerUnitLocal, setAmountPickerUnitLocal] = React.useState('oz');
    const [amountPickerAmountLocal, setAmountPickerAmountLocal] = React.useState(4);

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
    }, [__ttUseV4Sheet, isKeyboardOpen, saving]);

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
      const wantsDateTime = mode === 'datetime_feeding';

      if (wantsAmount) {
        const currentOz = parseFloat(ounces);
        setAmountPickerUnitLocal('oz');
        setAmountPickerAmountLocal(Number.isFinite(currentOz) ? currentOz : 4);
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

    // Calculate height based on expanded fields
    const calculateHeight = React.useMemo(() => {
      const expandedCount = (notesExpanded ? 1 : 0) + (photosExpanded ? 1 : 0);
      if (expandedCount === 0) return 70;
      if (expandedCount === 1) return 78;
      return 83; // expandedCount === 2
    }, [notesExpanded, photosExpanded]);

    // Populate form from entry when it exists
    React.useEffect(() => {
      if (entry && isOpen) {
        setOunces(entry.ounces ? entry.ounces.toString() : '');
        setDateTime(entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString());
        setNotes(entry.notes || '');
        setExistingPhotoURLs(entry.photoURLs || []);
        originalPhotoURLsRef.current = entry.photoURLs || []; // Track original URLs
        setPhotos([]); // Reset new photos
        // Auto-expand if there's existing content
        setNotesExpanded(!!entry.notes);
        setPhotosExpanded(!!(entry.photoURLs && entry.photoURLs.length > 0));
      } else if (!entry && isOpen) {
        // Create mode - reset to defaults
        setOunces('');
        setDateTime(new Date().toISOString());
        setNotes('');
        setExistingPhotoURLs([]);
        originalPhotoURLsRef.current = []; // Reset
        setPhotos([]);
        setNotesExpanded(false);
        setPhotosExpanded(false);
      }
    }, [entry, isOpen]);

    // Reset expand state when sheet closes
    React.useEffect(() => {
      if (!isOpen) {
        setNotesExpanded(false);
        setPhotosExpanded(false);
      }
    }, [isOpen]);

    const handleSave = async () => {
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
              console.error(`[TTFeedDetailSheet] Failed to upload photo ${i + 1}:`, error);
              console.error('[TTFeedDetailSheet] Photo upload error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
              });
            // Continue with other photos even if one fails
          }
          }
        }
        
        // Combine existing and new photo URLs
        const allPhotoURLs = [...existingPhotoURLs, ...newPhotoURLs];
        
        if (entry && entry.id) {
          // Update existing feeding
          await firestoreStorage.updateFeedingWithNotes(
            entry.id,
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
        if (onSave) {
          await onSave();
        }
      } catch (error) {
        console.error('[TTFeedDetailSheet] Failed to save feeding:', error);
        console.error('[TTFeedDetailSheet] Error details:', {
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
      if (!entry || !entry.id) return;
      
      setSaving(true);
      try {
        await firestoreStorage.deleteFeeding(entry.id);
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

    // Body content (used in both static and overlay modes)
    // IMPORTANT: Make the body a full-height flex column so the CTA stays locked to the bottom
    const bodyContent = React.createElement(
      'div',
      { style: { minHeight: __ttUseV4Sheet ? undefined : '100%', display: 'flex', flexDirection: 'column', position: __ttUseV4Sheet ? 'relative' : undefined } },
      // Content wrapper
      React.createElement('div', {
        style: {
          position: 'relative',
          overflow: __ttUseV4Sheet ? 'visible' : 'hidden',
          width: '100%',
          flex: __ttUseV4Sheet ? undefined : 1,
          minHeight: 0,
          paddingBottom: __ttUseV4Sheet ? `${Math.max(ctaHeightPx || 0, CTA_SPACER_PX) + CTA_BOTTOM_OFFSET_PX + 24}px` : undefined
        }
      },
      // Input rows wrapped in spacing container
      React.createElement('div', { className: "space-y-2" },
        // Ounces
        React.createElement(InputRow, {
          label: 'Ounces',
          value: ounces,
          onChange: setOunces,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'number',
          placeholder: '0',
          pickerMode: 'amount',
          onOpenPicker: openTrayPicker
        }),

        // Start time
        React.createElement(InputRow, {
          label: 'Start time',
          value: formatDateTime(dateTime), // This won't be used for datetime type
          rawValue: dateTime, // Pass the raw ISO string
          onChange: setDateTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'datetime',
          pickerMode: 'datetime_feeding',
          onOpenPicker: openTrayPicker,
        }),

        // Notes - conditionally render based on expanded state
        notesExpanded 
          ? React.createElement(InputRow, {
          label: 'Notes',
          value: notes,
          onChange: setNotes,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'text',
          placeholder: 'Add a note...'
        })
          : React.createElement('div', {
              onClick: () => setNotesExpanded(true),
              className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, '+ Add notes')
      ),

      TTPhotoRow && React.createElement(TTPhotoRow, {
        expanded: photosExpanded,
        onExpand: () => setPhotosExpanded(true),
        existingPhotos: existingPhotoURLs,
        newPhotos: photos,
        onAddPhoto: handleAddPhoto,
        onRemovePhoto: handleRemovePhoto,
        onPreviewPhoto: setFullSizePhoto
      }),

      // Sticky bottom CTA (Save button)
      // Hide when keyboard is open to prevent overlap with keyboard
      React.createElement('div', {
        ref: ctaFooterRef,
        className: __ttUseV4Sheet ? "left-0 right-0 pt-3 pb-1" : "sticky bottom-0 left-0 right-0 pt-3 pb-1",
        style: { 
          zIndex: 10,
          backgroundColor: 'var(--tt-card-bg)',
          display: isKeyboardOpen ? 'none' : 'block',
          bottom: `${CTA_BOTTOM_OFFSET_PX}px`,
          left: 0,
          right: 0,
          position: __ttUseV4Sheet ? 'absolute' : 'sticky'
        }
      },
              React.createElement('button', {
          type: 'button',
          onClick: handleSave,
          disabled: saving,
          onTouchStart: (e) => {
            // Prevent scroll container from capturing touch
            e.stopPropagation();
          },
          className: "w-full text-white py-3 rounded-2xl font-semibold transition",
                style: { 
            backgroundColor: saving ? 'var(--tt-feed-strong)' : 'var(--tt-feed)',
            touchAction: 'manipulation', // Prevent scroll interference on mobile
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          },
          onMouseEnter: (e) => {
            if (!saving) {
              e.target.style.backgroundColor = 'var(--tt-feed-strong)';
            }
          },
          onMouseLeave: (e) => {
            if (!saving) {
              e.target.style.backgroundColor = 'var(--tt-feed)';
            }
          }
        }, saving ? 'Saving...' : 'Save')
      ),

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
          React.createElement('div', { style: { justifySelf: 'center', fontWeight: 600, fontSize: 17, color: 'var(--tt-text-primary)' } }, 'Time'),
          React.createElement('button', {
            onClick: () => {
              const nextISO = _partsToISO({ dayISO: dtSelectedDate, hour: dtHour, minute: dtMinute, ampm: dtAmpm });
              setDateTime(nextISO);
              setShowDateTimeTray(false);
            },
            style: { justifySelf: 'end', background: 'none', border: 'none', padding: 0, color: 'var(--tt-feed)', fontSize: 17, fontWeight: 600 }
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

      // Full-size photo modal (PORTAL to body so it isn't trapped inside HalfSheet transform/stacking)
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
    )
  );

    // If overlay mode (isOpen provided), wrap in HalfSheet
    if (isOpen !== undefined) {
      if (__ttUseV4Sheet) {
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
                  className: "fixed inset-0 bg-black/60 backdrop-blur-sm",
                  style: { zIndex: 10000 },
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
                  transition: { type: "spring", damping: 25, stiffness: 300 },
                  className: "fixed left-0 right-0 bottom-0 shadow-2xl",
                  onClick: (e) => e.stopPropagation(),
                  style: {
                    backgroundColor: "var(--tt-card-bg)",
                    willChange: 'transform',
                    paddingBottom: 'env(safe-area-inset-bottom, 0)',
                    maxHeight: '100%',
                    height: 'auto',
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
                  className: "bg-black",
                  style: {
                    backgroundColor: 'var(--tt-feed)',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                    padding: '0 1.5rem',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
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
                  React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, 'Feeding'),
                  React.createElement('div', { className: "w-6" })
                ),
                React.createElement('div', {
                  className: "flex-1 px-6 pt-8 pb-[42px]",
                  style: {
                    minHeight: 0,
                    overscrollBehavior: 'none'
                  }
                }, bodyContent)
              )
            : null
        );
        return ReactDOM.createPortal(v4Overlay, document.body);
      }

      if (!HalfSheet) {
        console.warn('[TTFeedDetailSheet] HalfSheet not available');
        return null;
      }
      return React.createElement(
        HalfSheet,
        {
          isOpen: isOpen || false,
          onClose: handleClose,
          title: 'Feeding',
          accentColor: 'var(--tt-feed)',
          rightAction: null,
          fixedHeight: calculateHeight
        },
        bodyContent
      );
    }

    // Static preview mode (for UI Lab inline display)
    return React.createElement(
      'div',
      { 
        className: "rounded-2xl shadow-sm p-6 space-y-0",
        style: {
          backgroundColor: "var(--tt-card-bg, var(--tt-subtle-surface, rgba(0,0,0,0.04)))",
          border: "1px solid var(--tt-card-border, rgba(0,0,0,0.06))"
        }
      },
      // Header: [X] [Feeding] [Save]
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 py-4 mb-6 flex items-center justify-between" },
        // X button (close)
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, XIcon ? React.createElement(XIcon, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } }) : '×'),
        
        // Centered title
        React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, 'Feeding'),
        
        // Save button
        React.createElement('button', {
          onClick: handleSave,
          className: "text-base font-normal text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, 'Save')
      ),
      bodyContent
    );
  };

  const TTFeedDetailSheetV4 = (props) => React.createElement(TTFeedDetailSheetLegacy, {
    ...props,
    __ttUseV4Sheet: true
  });

  const TTFeedDetailSheet = (props) => {
    const uiVersion = _getUiVersion();
    if (uiVersion === 'v4') {
      return React.createElement(TTFeedDetailSheetV4, props);
    }
    return React.createElement(TTFeedDetailSheetLegacy, props);
  };

  // Expose component globally
  if (typeof window !== 'undefined') {
    window.TTFeedDetailSheet = TTFeedDetailSheet;
  }
}
