// DiaperSheet Component
// Unified diaper input + edit sheet

if (typeof window !== 'undefined' && !window.DiaperSheet) {
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
    return React.createElement('input', props);
  };

  const PenIcon = window.PenIcon;
  const XIcon = window.XIcon;

  const DiaperWetIcon = window.TT?.shared?.icons?.DiaperWetIcon || null;
  const DiaperDryIcon = window.TT?.shared?.icons?.DiaperDryIcon || null;
  const DiaperPooIcon = window.TT?.shared?.icons?.DiaperPooIcon || null;

  const DiaperSheet = ({ isOpen, onClose, entry = null, onSave = null }) => {
    const dragControls = __ttV4UseDragControls ? __ttV4UseDragControls() : null;
    const [dateTime, setDateTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]);
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [saving, setSaving] = React.useState(false);

    const [isWet, setIsWet] = React.useState(false);
    const [isDry, setIsDry] = React.useState(true);
    const [isPoo, setIsPoo] = React.useState(false);

    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);
    const inputValueClassName = 'text-[18px]';

    const _pickers = (typeof window !== 'undefined' && window.TT?.shared?.pickers) ? window.TT.shared.pickers : {};
    const TTPickerTray = _pickers.TTPickerTray;
    const WheelPicker = _pickers.WheelPicker;
    const wheelStyles = _pickers.wheelStyles || {};
    const TTPhotoRow = _pickers.TTPhotoRow || window.TT?.shared?.TTPhotoRow || window.TTPhotoRow;

    const [showDateTimeTray, setShowDateTimeTray] = React.useState(false);
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
      if (mode !== 'datetime_diaper') return;
      const parts = _isoToDateParts(dateTime || new Date().toISOString());
      setDtSelectedDate(parts.dayISO);
      setDtHour(parts.hour);
      setDtMinute(parts.minute);
      setDtAmpm(parts.ampm);
      setShowDateTimeTray(true);
    };

    React.useEffect(() => {
      if (!isOpen) return;
      if (entry && entry.timestamp) {
        setDateTime(new Date(entry.timestamp).toISOString());
        setNotes(entry.notes || '');
        const normalizedExisting = __ttNormalizePhotoUrls(entry.photoURLs);
        setExistingPhotoURLs(normalizedExisting);
        setIsWet(!!entry.isWet);
        setIsDry(!!entry.isDry);
        setIsPoo(!!entry.isPoo);
      } else {
        setDateTime(new Date().toISOString());
        setNotes('');
        setExistingPhotoURLs([]);
        setIsWet(false);
        setIsDry(true);
        setIsPoo(false);
      }
      setPhotos([]);
      setNotesExpanded(false);
      setPhotosExpanded(false);
    }, [entry, isOpen]);

    const handleClose = () => {
      if (onClose) onClose();
    };

    const hasSelection = isDry || isWet || isPoo;

    const handleToggleDry = () => {
      const next = !isDry;
      if (next) {
        setIsWet(false);
        setIsPoo(false);
      }
      setIsDry(next);
    };

    const handleToggleWet = () => {
      const next = !isWet;
      if (next && isDry) setIsDry(false);
      setIsWet(next);
    };

    const handleTogglePoo = () => {
      const next = !isPoo;
      if (next && isDry) setIsDry(false);
      setIsPoo(next);
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
        const newExisting = existingPhotoURLs.filter((_, i) => i !== index);
        setExistingPhotoURLs(newExisting);
      } else {
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
      }
    };

    const handleSave = async () => {
      if (saving) return;
      if (!hasSelection) {
        alert('Select dry, wet, or poop.');
        return;
      }
      setSaving(true);
      try {
        const timestamp = new Date(dateTime).getTime();
        let uploadedURLs = [];
        for (let i = 0; i < photos.length; i++) {
          try {
            const url = await firestoreStorage.uploadDiaperPhoto(photos[i]);
            uploadedURLs.push(url);
          } catch (error) {
            console.error(`[DiaperSheet] Failed to upload photo ${i + 1}:`, error);
          }
        }
        const mergedPhotos = __ttNormalizePhotoUrls([...(existingPhotoURLs || []), ...uploadedURLs]);
        const payload = {
          timestamp,
          isWet: !!isWet,
          isDry: !!isDry,
          isPoo: !!isPoo,
          notes: (notes && String(notes).trim().length > 0) ? notes : null,
          photoURLs: mergedPhotos
        };

        if (entry && entry.id) {
          await firestoreStorage.updateDiaperChange(entry.id, payload);
        } else {
          await firestoreStorage.addDiaperChange(payload);
        }

        if (typeof onSave === 'function') {
          await onSave();
        }
        handleClose();
      } catch (error) {
        console.error('[DiaperSheet] Failed to save diaper change:', error);
        alert('Failed to save diaper change. Please try again.');
      } finally {
        setSaving(false);
      }
    };


    const TypeButton = ({ label, icon: Icon, selected, dim, onClick }) => {
      const bg = selected ? 'color-mix(in srgb, var(--tt-diaper) 16%, var(--tt-input-bg))' : 'var(--tt-input-bg)';
      const border = selected ? 'var(--tt-diaper)' : 'var(--tt-card-border)';
      const color = selected ? 'var(--tt-diaper)' : 'var(--tt-text-secondary)';
      return React.createElement('button', {
        type: 'button',
        onClick: (e) => {
          e.preventDefault();
          onClick();
        },
        'aria-pressed': !!selected,
        'aria-disabled': false,
        className: "flex flex-col items-center justify-center gap-2 rounded-full transition",
        style: {
          width: 92,
          height: 92,
          border: `1.5px solid ${border}`,
          backgroundColor: bg,
          opacity: dim ? 0.35 : 1
        }
      },
        Icon ? React.createElement(Icon, { style: { width: 28, height: 28, color } }) : null,
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color } }, label)
      );
    };

    const typePicker = React.createElement('div', { className: "grid grid-cols-3 gap-3" },
      React.createElement(TypeButton, {
        label: 'Dry',
        icon: DiaperDryIcon,
        selected: isDry,
        dim: isWet || isPoo,
        onClick: handleToggleDry
      }),
      React.createElement(TypeButton, {
        label: 'Wet',
        icon: DiaperWetIcon,
        selected: isWet,
        dim: isDry,
        onClick: handleToggleWet
      }),
      React.createElement(TypeButton, {
        label: 'Poop',
        icon: DiaperPooIcon,
        selected: isPoo,
        dim: isDry,
        onClick: handleTogglePoo
      })
    );

    const contentBlock = React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { className: "space-y-2" },
        React.createElement(InputRow, {
          label: 'Time',
          value: formatDateTime(dateTime),
          rawValue: dateTime,
          onChange: setDateTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          valueClassName: inputValueClassName,
          type: 'datetime',
          pickerMode: 'datetime_diaper',
          onOpenPicker: openTrayPicker
        }),
        React.createElement('div', { className: "pt-2" }, typePicker),
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

    const ctaButton = React.createElement('button', {
      type: 'button',
      onClick: handleSave,
      disabled: saving,
      onTouchStart: (e) => {
        e.stopPropagation();
      },
      className: "w-full text-white py-3 rounded-2xl font-semibold transition",
      style: {
        backgroundColor: saving ? 'var(--tt-diaper-strong)' : 'var(--tt-diaper)',
        touchAction: 'manipulation',
        opacity: saving ? 0.7 : 1,
        cursor: saving ? 'not-allowed' : 'pointer'
      },
      onMouseEnter: (e) => {
        if (!saving) {
          e.target.style.backgroundColor = 'var(--tt-diaper-strong)';
        }
      },
      onMouseLeave: (e) => {
        if (!saving) {
          e.target.style.backgroundColor = 'var(--tt-diaper)';
        }
      }
    }, saving ? 'Saving...' : (entry && entry.id ? 'Save' : 'Add'));

    const overlayContent = React.createElement(
      React.Fragment,
      null,
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
            style: { justifySelf: 'end', background: 'none', border: 'none', padding: 0, color: 'var(--tt-diaper)', fontSize: 17, fontWeight: 600 }
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
        className: "px-6 pt-3 pb-1",
        style: {
          backgroundColor: 'var(--tt-halfsheet-bg)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 80px)',
          flexShrink: 0
        }
      }, ctaButton),
      overlayContent
    );

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
                  backgroundColor: 'var(--tt-diaper)',
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
                React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, 'Diaper'),
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

  window.DiaperSheet = DiaperSheet;
}
