// ========================================
// WHEEL PICKERS (UPDATED)
// Reusable wheel-style picker components for iOS-like input
// CHANGES:
// 1. Hour and minute pickers now loop infinitely
// 2. Date picker now goes back 7 days from today
// 3. Tray locking already handled via isTrayOpen flag
// ========================================

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TT?.shared?.pickers?.WheelPicker) {

  // WHEEL PICKERS (ported from TinyTrackerDemo.jsx for UI Lab)
  // ========================================
  const wheelStyles = {
    section: {
      padding: '8px 16px 12px 16px', // Reduced padding to fit within 40vh tray
      background: 'transparent', // Transparent for use in half sheets
      borderRadius: '16px',
      overflow: 'hidden'
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    sectionTitle: { 
      fontSize: '16px', 
      fontWeight: '600', 
      color: 'var(--tt-text-primary)', 
      margin: 0 
    },
    unitToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'var(--tt-input-bg)',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    },
    unitActive: { color: 'var(--tt-text-primary)' },
    unitInactive: { color: 'var(--tt-text-secondary)' },
    unitDivider: { color: 'var(--tt-card-border)' },
  
    timePicker: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '0 4px' },
    timeColon: { 
      fontSize: '20px', 
      fontWeight: '600', 
      color: 'var(--tt-text-primary)' 
    },
  
    pickerContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--tt-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      textAlign: 'center',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },

    picker: {
      position: 'relative',
      width: '100%',
      maxWidth: '260px',
      height: '200px', // Reduced to fit within 40vh tray
      overflow: 'hidden',
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none' // Prevent page scrolling when scrolling the wheel
    },
    // Fixed width ensures hour / minute / ampm + ":" can be perfectly centered as a group.
    pickerCompact: { width: 'min(50px, 12vw)', height: '180px' }, // Reduced to fit within 40vh tray
    pickerDateCompact: { width: 'min(65px, 16vw)', height: '180px' }, // Reduced to fit within 40vh tray
    items: { position: 'relative', height: '100%', zIndex: 2 },
    item: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      lineHeight: '40px',
      fontWeight: '400',
      color: 'var(--tt-text-primary)',
      transformOrigin: 'center center',
      willChange: 'transform, opacity'
    },
    itemSelected: { 
      color: 'var(--tt-text-primary)', 
      fontWeight: '400' 
    },
    // iOS-style selection bar (behind content)
    selection: {
      position: 'absolute',
      top: '50%',
      left: '10px',
      right: '10px',
      height: '40px',
      transform: 'translateY(-50%)',
      background: 'var(--tt-subtle-surface)',
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: 1
    },
    // iOS-style fades - transparent gradients that work with any background
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      pointerEvents: 'none',
      zIndex: 3
    },
    overlayTop: {
      top: 0,
      background: 'linear-gradient(to bottom, var(--tt-card-bg) 0%, var(--tt-card-bg) 55%, transparent 100%)'
    },
    overlayBottom: {
      bottom: 0,
      background: 'linear-gradient(to top, var(--tt-card-bg) 0%, var(--tt-card-bg) 55%, transparent 100%)'
    }
  };
  
  // NEW: Helper to generate date options (7 days back from today)
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysBack = 7;
    
    // 7 days back
    for (let i = daysBack; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString());
    }
    
    // Today
    dates.push(today.toISOString());
    
    return dates;
  };
  
  // NEW: Format date for display
  const formatDateDisplay = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((dateOnly - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    
    // Format as "Mon 8"
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    return `${dayName} ${day}`;
  };
  
  // WheelPicker Component (UPDATED to use absolute positioning like SettingsTab)
  const WheelPicker = React.memo(({ type, value, onChange, compact = false, showSelection = true, dateCompact = false, showOverlay = true }) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [startY, setStartY] = React.useState(0);
    const [velocity, setVelocity] = React.useState(0);
    const containerRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const lastY = React.useRef(0);
    const lastTime = React.useRef(Date.now());

    // Convert getOptions to return {display, value} format like SettingsTab
    const generateOptions = () => {
      if (type === 'date') {
        const dates = generateDateOptions();
        return dates.map(date => ({
          display: formatDateDisplay(date),
          value: date
        }));
      } else if (type === 'hour') {
        return Array.from({ length: 12 }, (_, i) => ({
          display: (i + 1).toString(),
          value: i + 1
        }));
      } else if (type === 'minute') {
        return Array.from({ length: 60 }, (_, i) => ({
          display: i.toString().padStart(2, '0'),
          value: i
        }));
      } else if (type === 'ampm') {
        return [
          { display: 'AM', value: 'AM' },
          { display: 'PM', value: 'PM' }
        ];
      } else if (type === 'ounce') {
        return Array.from({ length: 101 }, (_, i) => {
          const val = i * 0.25;
          return {
            display: val.toFixed(2) + ' oz',
            value: val
          };
        });
      } else if (type === 'ml') {
        return Array.from({ length: 751 }, (_, i) => ({
          display: i.toString() + ' ml',
          value: i
        }));
      } else if (type === 'month') {
        return Array.from({ length: 12 }, (_, i) => ({
          display: (i + 1).toString(),
          value: i + 1
        }));
      } else if (type === 'day') {
        return Array.from({ length: 31 }, (_, i) => ({
          display: (i + 1).toString(),
          value: i + 1
        }));
      } else if (type === 'year') {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 11 }, (_, i) => ({
          display: (currentYear - 5 + i).toString(),
          value: currentYear - 5 + i
        }));
      }
      return [];
    };

    const shouldLoop = type === 'hour' || type === 'minute';
    const baseOptions = React.useMemo(() => generateOptions(), [type]);
    const options = React.useMemo(() => {
      if (!shouldLoop) return baseOptions;
      return [...baseOptions, ...baseOptions, ...baseOptions];
    }, [baseOptions, shouldLoop]);
    const baseLength = baseOptions.length;
    const ITEM_HEIGHT = 40;
    const pickerHeight = compact ? 180 : 200;
    const padY = Math.max(0, (pickerHeight - ITEM_HEIGHT) / 2);

    const getBaseIndex = () => {
      if (type === 'date' && value) {
        const valDate = new Date(value);
        valDate.setHours(0, 0, 0, 0);
        const valISO = valDate.toISOString();
        return baseOptions.findIndex(opt => {
          const optDate = new Date(opt.value);
          optDate.setHours(0, 0, 0, 0);
          return optDate.toISOString() === valISO;
        });
      }
      if (type === 'date') {
        return baseOptions.findIndex(opt => opt.display === 'Today');
      }
      return baseOptions.findIndex(opt => opt.value === value);
    };

    const baseIndex = Math.max(0, getBaseIndex());
    const initialIndex = shouldLoop ? baseIndex + baseLength : baseIndex;
    const [selectedIndex, setSelectedIndex] = React.useState(initialIndex);
    const [currentOffset, setCurrentOffset] = React.useState(-initialIndex * ITEM_HEIGHT);

    // Keep selection + offset aligned to external value changes
    React.useEffect(() => {
      const idx = Math.max(0, getBaseIndex());
      const nextIndex = shouldLoop ? idx + baseLength : idx;
      setSelectedIndex(nextIndex);
      setCurrentOffset(-nextIndex * ITEM_HEIGHT);
    }, [value, type]);

    const snapToNearest = (offset) => {
      const index = Math.round(-offset / ITEM_HEIGHT);
      if (shouldLoop) {
        let adjustedIndex = index;
        if (adjustedIndex < baseLength) {
          adjustedIndex += baseLength;
        } else if (adjustedIndex >= baseLength * 2) {
          adjustedIndex -= baseLength;
        }
        const baseIndexForValue = ((adjustedIndex % baseLength) + baseLength) % baseLength;
        const snappedOffset = -adjustedIndex * ITEM_HEIGHT;

        setCurrentOffset(snappedOffset);
        setSelectedIndex(adjustedIndex);
        if (typeof onChange === 'function') {
          onChange(baseOptions[baseIndexForValue].value);
        }
        return;
      }

      const clampedIndex = Math.max(0, Math.min(options.length - 1, index));
      const snappedOffset = -clampedIndex * ITEM_HEIGHT;

      setCurrentOffset(snappedOffset);
      setSelectedIndex(clampedIndex);
      if (typeof onChange === 'function') {
        onChange(options[clampedIndex].value);
      }
    };

    const handleStart = (clientY) => {
      setIsDragging(true);
      setStartY(clientY);
      lastY.current = clientY;
      lastTime.current = Date.now();
      setVelocity(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handleMove = (clientY) => {
      if (!isDragging) return;

      const deltaY = clientY - startY;
      const newOffset = selectedIndex * -ITEM_HEIGHT + deltaY;

      const now = Date.now();
      const timeDelta = now - lastTime.current;
      const yDelta = clientY - lastY.current;

      if (timeDelta > 0) {
        setVelocity(yDelta / timeDelta);
      }

      lastY.current = clientY;
      lastTime.current = now;

      if (shouldLoop) {
        const cycleHeight = baseLength * ITEM_HEIGHT;
        const maxLoopOffset = -baseLength * ITEM_HEIGHT;
        const minLoopOffset = -(baseLength * 2 - 1) * ITEM_HEIGHT;
        let adjustedOffset = newOffset;
        if (adjustedOffset > maxLoopOffset) {
          adjustedOffset -= cycleHeight;
        } else if (adjustedOffset < minLoopOffset) {
          adjustedOffset += cycleHeight;
        }
        setCurrentOffset(adjustedOffset);
        return;
      }

      const maxOffset = 0;
      const minOffset = -(options.length - 1) * ITEM_HEIGHT;

      let constrainedOffset = newOffset;
      if (newOffset > maxOffset) {
        constrainedOffset = maxOffset + (newOffset - maxOffset) * 0.3;
      } else if (newOffset < minOffset) {
        constrainedOffset = minOffset + (newOffset - minOffset) * 0.3;
      }

      setCurrentOffset(constrainedOffset);
    };

    const handleEnd = () => {
      setIsDragging(false);

      let finalOffset = currentOffset + velocity * 200;

      if (shouldLoop) {
        const cycleHeight = baseLength * ITEM_HEIGHT;
        const maxLoopOffset = -baseLength * ITEM_HEIGHT;
        const minLoopOffset = -(baseLength * 2 - 1) * ITEM_HEIGHT;
        while (finalOffset > maxLoopOffset) finalOffset -= cycleHeight;
        while (finalOffset < minLoopOffset) finalOffset += cycleHeight;
      } else {
        const maxOffset = 0;
        const minOffset = -(options.length - 1) * ITEM_HEIGHT;
        finalOffset = Math.max(minOffset, Math.min(maxOffset, finalOffset));
      }

      snapToNearest(finalOffset);
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      handleStart(e.clientY);
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        handleMove(e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      handleStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      handleEnd();
    };

    // Add non-passive touch event listeners
    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }, [isDragging, currentOffset]);

    React.useEffect(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, currentOffset]);

    const getItemStyle = (index) => {
      const offset = currentOffset + index * ITEM_HEIGHT;
      const distance = Math.abs(offset / ITEM_HEIGHT);

      const scale = Math.max(0.85, 1 - distance * 0.08);
      const opacity = Math.max(0.25, 1 - distance * 0.35);

      return {
        transform: `translateY(${offset}px) scale(${scale})`,
        opacity: opacity,
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      };
    };

    return React.createElement(
      'div',
      { style: wheelStyles.pickerContainer },
      !compact && React.createElement('div', { style: wheelStyles.label }, type.toUpperCase()),
      React.createElement(
        'div',
        {
          style: { 
            ...wheelStyles.picker, 
            ...(compact && dateCompact ? wheelStyles.pickerDateCompact : compact ? wheelStyles.pickerCompact : {}) 
          },
          ref: containerRef,
          onMouseDown: handleMouseDown
        },
        showSelection ? React.createElement('div', { style: wheelStyles.selection }) : null,
        showOverlay ? React.createElement('div', { style: { ...wheelStyles.overlay, height: `${padY}px`, ...wheelStyles.overlayTop } }) : null,
        showOverlay ? React.createElement('div', { style: { ...wheelStyles.overlay, height: `${padY}px`, ...wheelStyles.overlayBottom } }) : null,
        React.createElement(
          'div',
          { style: { ...wheelStyles.items, padding: `${padY}px 0` } },
          options.map((option, index) =>
            React.createElement(
              'div',
              {
                key: index,
                style: {
                  ...wheelStyles.item,
                  ...(index === selectedIndex && !isDragging ? wheelStyles.itemSelected : {}),
                  ...getItemStyle(index),
                  ...(dateCompact ? { fontSize: '16px' } : {})
                }
              },
              option.display
            )
          )
        )
      )
    );
  });
  
  // AmountPickerLabSection Component (unchanged)
  const AmountPickerLabSection = ({ unit, setUnit, amount, setAmount }) => {
    return React.createElement(
      'div',
      { style: wheelStyles.section },
      React.createElement(
        'div',
        { style: wheelStyles.sectionHeader },
        React.createElement('h3', { style: wheelStyles.sectionTitle }, 'Amount'),
        window.SegmentedToggle
          ? React.createElement(window.SegmentedToggle, {
              value: unit,
              options: [
                { value: 'oz', label: 'oz' },
                { value: 'ml', label: 'ml' }
              ],
              onChange: (v) => {
                const snapToStep = (val, step) => {
                  const n = Number(val) || 0;
                  const s = Number(step) || 1;
                  const snapped = Math.round(n / s) * s;
                  return s < 1 ? parseFloat(snapped.toFixed(2)) : snapped;
                };
                if (v === 'ml') {
                  const ml = snapToStep(amount * 29.5735, 10);
                  setUnit('ml');
                  setAmount(ml);
                } else {
                  const oz = snapToStep(amount / 29.5735, 0.25);
                  setUnit('oz');
                  setAmount(oz);
                }
              },
              variant: 'body',
              size: 'medium'
            })
          : React.createElement(
              'button',
              { 
                style: wheelStyles.unitToggle, 
                onClick: () => {
                  const snapToStep = (val, step) => {
                    const n = Number(val) || 0;
                    const s = Number(step) || 1;
                    const snapped = Math.round(n / s) * s;
                    return s < 1 ? parseFloat(snapped.toFixed(2)) : snapped;
                  };
                  if (unit === 'ml') {
                    const oz = snapToStep(amount / 29.5735, 0.25);
                    setUnit('oz');
                    setAmount(oz);
                  } else {
                    const ml = snapToStep(amount * 29.5735, 10);
                    setUnit('ml');
                    setAmount(ml);
                  }
                }, 
                type: 'button' 
              },
              React.createElement('span', { style: unit === 'oz' ? wheelStyles.unitActive : wheelStyles.unitInactive }, 'oz'),
              React.createElement('span', { style: wheelStyles.unitDivider }, '|'),
              React.createElement('span', { style: unit === 'ml' ? wheelStyles.unitActive : wheelStyles.unitInactive }, 'ml')
            )
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '8px' } },
        React.createElement(WheelPicker, {
          type: unit,
          value: amount,
          onChange: setAmount,
          compact: true,
          showSelection: false
        })
      )
    );
  };
  
  // DateTimePickerLabSection Component (unchanged)
  const DateTimePickerLabSection = () => {
    const [month, setMonth] = React.useState(new Date().getMonth() + 1);
    const [day, setDay] = React.useState(new Date().getDate());
    const [year, setYear] = React.useState(new Date().getFullYear());
    const [hour, setHour] = React.useState(12);
    const [minute, setMinute] = React.useState(0);
    const [ampm, setAmpm] = React.useState('PM');
  
    return React.createElement(
      'div',
      { style: wheelStyles.section },
      React.createElement(
        'div',
        { style: wheelStyles.sectionHeader },
        React.createElement('h3', { style: wheelStyles.sectionTitle }, 'Date & Time')
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px' } },
        React.createElement(WheelPicker, { type: 'month', value: month, onChange: setMonth, compact: true, showSelection: false }),
        React.createElement(WheelPicker, { type: 'day', value: day, onChange: setDay, compact: true, showSelection: false }),
        React.createElement(WheelPicker, { type: 'year', value: year, onChange: setYear, compact: true, showSelection: false })
      ),
      React.createElement(
        'div',
        { style: { ...wheelStyles.timePicker, marginTop: '16px' } },
        React.createElement(WheelPicker, { type: 'hour', value: hour, onChange: setHour, compact: true, showSelection: false }),
        React.createElement('span', { style: wheelStyles.timeColon }, ':'),
        React.createElement(WheelPicker, { type: 'minute', value: minute, onChange: setMinute, compact: true, showSelection: false }),
        React.createElement(WheelPicker, { type: 'ampm', value: ampm, onChange: setAmpm, compact: true, showSelection: false })
      )
    );
  };
  
  // TTPickerTray Component - Native keyboard-style tray (unchanged - already sets isTrayOpen flag)
  const TTPickerTray = ({ children, isOpen = false, onClose = null, header = null }) => {
    const backdropRef = React.useRef(null);
    const trayRef = React.useRef(null);
    const [present, setPresent] = React.useState(false);
  
    React.useEffect(() => {
      if (isOpen) {
        setPresent(true);
        // Set global flag when tray opens - THIS LOCKS THE HALF SHEET
        if (typeof window !== 'undefined') {
          window.TT = window.TT || {};
          window.TT.shared = window.TT.shared || {};
          window.TT.shared.pickers = window.TT.shared.pickers || {};
          window.TT.shared.pickers.isTrayOpen = true;
        }
      } else if (present) {
        // Clear global flag when tray closes
        if (typeof window !== 'undefined' && window.TT?.shared?.pickers) {
          window.TT.shared.pickers.isTrayOpen = false;
        }
      }
    }, [isOpen, present]);
  
    React.useEffect(() => {
      if (!present || !trayRef.current) return;
      
      if (isOpen) {
        requestAnimationFrame(() => {
          if (trayRef.current) {
            trayRef.current.style.transform = 'translateY(0)';
          }
          if (backdropRef.current) {
            backdropRef.current.style.opacity = '0.4';
          }
        });
      } else {
        if (trayRef.current) {
          trayRef.current.style.transform = 'translateY(100%)';
        }
        if (backdropRef.current) {
          backdropRef.current.style.opacity = '0';
        }
        const timer = setTimeout(() => {
          setPresent(false);
        }, 250);
        return () => clearTimeout(timer);
      }
    }, [isOpen, present]);
  
    React.useEffect(() => {
      if (!present || !isOpen) return;
      const onKeyDown = (e) => {
        if (e.key === 'Escape' && onClose) {
          onClose();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, present, onClose]);
  
    if (!present) return null;
  
    return ReactDOM.createPortal(
      React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          ref: backdropRef,
          className: "fixed inset-0 bg-black",
          onClick: () => { if (onClose) onClose(); },
          style: { opacity: 0, transition: 'opacity 250ms ease', zIndex: 10000 }
        }),
        React.createElement(
          'div',
          {
            ref: trayRef,
            className: "fixed left-0 right-0 bottom-0 shadow-2xl",
            onClick: (e) => e.stopPropagation(),
            style: {
              backgroundColor: 'var(--tt-card-bg)',
              transform: 'translateY(100%)',
              transition: 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
              willChange: 'transform',
              paddingBottom: 'env(safe-area-inset-bottom, 0)',
              maxHeight: '40vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              zIndex: 10001
            }
          },
          header && React.createElement(
            'div',
            {
              style: {
                padding: '16px',
                borderBottom: '1px solid var(--tt-card-border)',
                flexShrink: 0,
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '8px'
              }
            },
            header
          ),
          React.createElement(
            'div',
            {
              style: {
                paddingTop: '12px',
                paddingBottom: '12px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                flex: 1,
                minHeight: 0
              }
            },
            children
          )
        )
      ),
      document.body
    );
  };
  
  // Expose to global namespace
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.pickers = window.TT.shared.pickers || {};
  
  window.TT.shared.pickers.wheelStyles = wheelStyles;
  window.TT.shared.pickers.WheelPicker = WheelPicker;
  window.TT.shared.pickers.AmountPickerLabSection = AmountPickerLabSection;
  window.TT.shared.pickers.DateTimePickerLabSection = DateTimePickerLabSection;
  window.TT.shared.pickers.TTPickerTray = TTPickerTray;
  
  } // End guard
