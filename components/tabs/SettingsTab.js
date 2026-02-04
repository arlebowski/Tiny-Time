// ========================================
// TINY TRACKER - PART 7
// Settings Tab - Share App, Sign Out, Delete Account
// ========================================

// ========================================
// UI VERSION HELPERS (Single Source of Truth)
// ========================================
// Initialize shared flags (only once)
const readBool = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null || v === undefined) return fallback;
    return v === 'true';
  } catch (e) {
    return fallback;
  }
};

const writeBool = (key, val) => {
  try {
    localStorage.setItem(key, val ? 'true' : 'false');
  } catch (e) {}
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.flags = window.TT.shared.flags || {
    useWheelPickers: {
      get: () => true,
      set: () => {}
    }
  };
}

const SettingsTab = ({ user, kidId }) => {
  const [showUILab, setShowUILab] = useState(false);
  const [showFeedSheet, setShowFeedSheet] = useState(false);
  const [showSleepSheet, setShowSleepSheet] = useState(false);
  const [showInputSheet, setShowInputSheet] = useState(false);
  const [showAmountPickerTray, setShowAmountPickerTray] = useState(false);
  const [showDateTimePickerTray, setShowDateTimePickerTray] = useState(false);
  // Amount picker state
  const [amountPickerAmount, setAmountPickerAmount] = useState(4);
  const [amountPickerUnit, setAmountPickerUnit] = useState('oz');
  
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('tt-picker-flip-styles')) return;
    const style = document.createElement('style');
    style.id = 'tt-picker-flip-styles';
    style.textContent = `
      @keyframes ttPickerFlip {
        0% { opacity: 0.75; transform: rotateX(6deg) translateY(6px); }
        100% { opacity: 1; transform: rotateX(0deg) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);
  
  // UI Version (v4 only)
  const uiVersion = 'v4';
  
  // Wheel pickers feature flag (UI Lab)
  const [useWheelPickers] = useState(() => true);

  
  // Production data for UI Lab
  const [feedings, setFeedings] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [currentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  
  // Bottom sheet state for EditableRow (UI Lab only)
  const [editorState, setEditorState] = useState({
    isOpen: false,
    type: null, // 'datetime' | 'notes'
    initialValue: null,
    onSave: null
  });

  // Example values for EditableRow (UI Lab only)
  const [exampleStartTime, setExampleStartTime] = useState(null);
  const [exampleNotes, setExampleNotes] = useState('');

  // Fetch production data for UI Lab (always fetch when UI Lab is open)
  React.useEffect(() => {
    if (!showUILab || !kidId) return;
    
    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch feedings
        const feedingsData = await firestoreStorage.getFeedings(kidId);
        setFeedings(feedingsData || []);
        
        // Fetch sleep sessions
        const sleepData = await firestoreStorage.getSleepSessions(kidId);
        setSleepSessions(sleepData || []);
        
        // Fetch baby weight and multiplier
        const weightData = await firestoreStorage.getBabyWeight(kidId);
        if (weightData && weightData.weight) {
          setBabyWeight(weightData.weight);
        }
        
        // Fetch sleep settings
        const settings = await firestoreStorage.getSleepSettings(kidId);
        setSleepSettings(settings);
      } catch (error) {
        console.error('Error fetching production data for UI Lab:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [showUILab, kidId]);

  // Data transformation helpers (same as TrackerTab)
  const formatFeedingsForCard = (feedings, targetOunces, currentDate) => {
    if (!feedings || !Array.isArray(feedings)) return { total: 0, target: targetOunces || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayFeedings = feedings.filter(f => {
      const timestamp = f.timestamp || 0;
      return timestamp >= startOfDay.getTime() && timestamp <= endOfDay.getTime();
    });
    
    const total = todayFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
    const target = targetOunces || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    
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

  const formatSleepSessionsForCard = (sessions, targetHours, currentDate) => {
    if (!sessions || !Array.isArray(sessions)) return { total: 0, target: targetHours || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todaySessions = sessions.filter(s => {
      const startTime = s.startTime || 0;
      const endTime = s.endTime || 0;
      return (startTime >= startOfDay.getTime() && startTime <= endOfDay.getTime()) ||
             (endTime >= startOfDay.getTime() && endTime <= endOfDay.getTime()) ||
             (s.isActive && startTime <= endOfDay.getTime());
    });
    
    const totalMs = todaySessions.reduce((sum, s) => {
      if (s.isActive && s.startTime) {
        return sum + Math.max(0, Date.now() - s.startTime);
      }
      const start = s.startTime || 0;
      const end = s.endTime || 0;
      return sum + Math.max(0, end - start);
    }, 0);
    const total = totalMs / (1000 * 60 * 60);
    const target = targetHours || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    
    const timelineItems = todaySessions
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive || false,
        notes: s.notes || null,
        photoURLs: s.photoURLs || null
      }));
    
    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].startTime : null;
    
    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const handleShareApp = async () => {
    const url = window.location.origin + window.location.pathname;
    const text = `Check out Tiny Tracker - track your baby's feedings and get insights! ${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tiny Tracker',
          text: 'Check out Tiny Tracker - track your baby\'s feedings and get insights!',
          url: url
        });
        return;
      } catch (error) {
        // User cancelled or incompatible device
      }
    }
    
    const messengerUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}&app_id=`;
    window.location.href = messengerUrl;
    
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(text);
        alert('Link copied to clipboard! You can paste it anywhere.');
      } catch (error) {
        prompt('Copy this link to share:', url);
      }
    }, 1000);
  };

  // Helper function to format date/time for display (UI Lab)
  const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${month} ${day} @ ${hours}:${mins}${ampm}`;
  };

  // Open editor function (UI Lab)
  const openEditor = ({ type, initialValue, onSave }) => {
    setEditorState({
      isOpen: true,
      type,
      initialValue,
      onSave
    });
    // Lock body scroll
    document.body.style.overflow = 'hidden';
  };

  // Close editor function (UI Lab)
  const closeEditor = () => {
    setEditorState({
      isOpen: false,
      type: null,
      initialValue: null,
      onSave: null
    });
    // Unlock body scroll
    document.body.style.overflow = '';
  };

  // Cleanup: restore body scroll when UI Lab closes
  React.useEffect(() => {
    if (!showUILab) {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUILab]);

  // Auto-focus textarea when notes editor opens
  React.useEffect(() => {
    if (editorState.isOpen && editorState.type === 'notes') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const textarea = document.getElementById('tt-editor-notes-input');
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
  }, [editorState.isOpen, editorState.type]);

  // Handle editor save (UI Lab)
  const handleEditorSave = (value) => {
    if (editorState.onSave) {
      editorState.onSave(value);
    }
    closeEditor();
  };

  // EditableRow Component (UI Lab only)
  const EditableRow = ({ label, value, placeholder, onPress }) => {
    const displayValue = value || '';
    const showPlaceholder = !value;
    
    return React.createElement(
      'div',
      {
        onClick: onPress,
        className: "flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
      },
      React.createElement('div', { className: "flex-1" },
        React.createElement('div', { className: "tt-card-label" }, label),
        React.createElement('div', {
          className: showPlaceholder 
            ? "text-base font-semibold text-gray-400" 
            : "text-base font-semibold text-black"
        }, showPlaceholder ? placeholder : displayValue)
      ),
      React.createElement(ChevronRight, { className: "w-5 h-5 text-gray-400" })
    );
  };

  // TTBottomSheet Component (UI Lab only)
  const TTBottomSheet = ({ isOpen, title, onDone, children }) => {
    const sheetRef = React.useRef(null);

    React.useEffect(() => {
      if (isOpen && sheetRef.current) {
        // Start from off-screen, then animate in
        sheetRef.current.style.transform = 'translateY(100%)';
        requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transform = 'translateY(0)';
            setHasEntered(true);
          }
        });
      } else if (!isOpen && sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(100%)';
      }
    }, [isOpen]);

    if (!isOpen) return null;

    return React.createElement(
      React.Fragment,
      null,
      // Backdrop
      React.createElement('div', {
        className: "fixed inset-0 bg-black bg-opacity-40 z-50",
        style: {
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 220ms ease'
        }
      }),
      // Bottom Sheet
      React.createElement('div', {
        ref: sheetRef,
        className: "fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl",
        style: {
          transform: 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      },
        // Header
        React.createElement('div', {
          className: "flex items-center justify-between px-6 py-4 border-b border-gray-100"
        },
          React.createElement('h2', {
            className: "text-lg font-semibold text-gray-800"
          }, title),
          React.createElement('button', {
            onClick: onDone,
            className: "text-base font-semibold text-indigo-600 active:opacity-70"
          }, 'Done')
        ),
        // Content
        React.createElement('div', {
          className: "flex-1 overflow-y-auto px-6 py-4",
          style: {
            WebkitOverflowScrolling: 'touch'
          }
        }, children)
      )
    );
  };

  // ========================================
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
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: '400',
      color: 'var(--tt-text-secondary)',
      marginBottom: '4px'
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

  const WheelPicker = React.useMemo(() => { return ({
    type = 'number',
    value,
    onChange,
    min = 0,
    max = 32,
    step = 0.25,
    label = '',
    unit = 'oz', // for amount picker
    compact = false, // for time pickers
    showSelection = true,
    showOverlay = true,
    dateCompact = false // for date picker in time row
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [velocity, setVelocity] = useState(0);
    const containerRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const lastY = React.useRef(0);
    const lastTime = React.useRef(Date.now());
    const prevUnitRef = React.useRef(unit);

    const generateOptions = () => {
      if (type === 'date') {
        const options = [];
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Generate dates: 6 previous days, then today (previous dates above)
        const allDates = [];
        // First add previous dates (6 days ago to yesterday)
        for (let i = 6; i >= 1; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          
          const dayName = dayNames[date.getDay()];
          const day = date.getDate();
          
          allDates.push({ display: `${dayName} ${day}`, value: date.toISOString(), fullDate: date });
        }
        // Then add today
        allDates.push({ display: 'Today', value: today.toISOString(), fullDate: today });
        
        return allDates;
      } else if (type === 'hour') {
        const options = [];
        for (let hour = 1; hour <= 12; hour++) {
          options.push({ display: hour.toString(), value: hour });
        }
        return options;
      } else if (type === 'minute') {
        const options = [];
        for (let minute = 0; minute < 60; minute++) {
          options.push({ display: minute.toString().padStart(2, '0'), value: minute });
        }
        return options;
      } else if (type === 'ampm') {
        return [
          { display: 'AM', value: 'AM' },
          { display: 'PM', value: 'PM' }
        ];
      } else {
        const options = [];
        for (let i = min; i <= max; i += step) {
          const displayValue = i % 1 === 0 ? i.toString() : i.toFixed(2);
          options.push({ display: `${displayValue} ${unit}`, value: i });
        }
        return options;
      }
    };

        const options = React.useMemo(() => generateOptions(), [type, min, max, step, unit]);
    const ITEM_HEIGHT = 40;
    // Center the "selected" row (40px) inside the picker height.
    // This fixes the subtle mismatch caused by hard-coded padding.
    const pickerHeight = compact ? 180 : 200; // Reduced to fit within 40vh tray
    const padY = Math.max(0, (pickerHeight - ITEM_HEIGHT) / 2);

    const getCurrentIndex = () => {
      if (type === 'date' && value) {
        // Normalize both values to midnight for comparison
        const valDate = new Date(value);
        valDate.setHours(0, 0, 0, 0);
        const valISO = valDate.toISOString();
        return options.findIndex(opt => {
          const optDate = new Date(opt.value);
          optDate.setHours(0, 0, 0, 0);
          return optDate.toISOString() === valISO;
        });
      }
      return options.findIndex(opt => opt.value === value);
    };

    const initialIndex = Math.max(0, getCurrentIndex());
    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const [currentOffset, setCurrentOffset] = useState(-initialIndex * ITEM_HEIGHT);

    // Keep selection + offset aligned to external value changes
    useEffect(() => {
      const idx = Math.max(0, getCurrentIndex());
      const unitChanged = prevUnitRef.current !== unit;
      prevUnitRef.current = unit;
      
      // If unit changed and we're not dragging, smoothly animate the transition
      if (unitChanged && !isDragging) {
        // Use requestAnimationFrame to ensure smooth transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSelectedIndex(idx);
            setCurrentOffset(-idx * ITEM_HEIGHT);
          });
        });
      } else {
        setSelectedIndex(idx);
        setCurrentOffset(-idx * ITEM_HEIGHT);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, type, min, max, step, unit]);

    const snapToNearest = (offset) => {
      const index = Math.round(-offset / ITEM_HEIGHT);
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

      const maxOffset = 0;
      const minOffset = -(options.length - 1) * ITEM_HEIGHT;
      finalOffset = Math.max(minOffset, Math.min(maxOffset, finalOffset));

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

    // Touch event handlers (using native listeners with passive: false to allow preventDefault)
    const handleTouchStart = (e) => {
      e.preventDefault(); // Prevent page scroll
      handleStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      e.preventDefault(); // Prevent page scroll
      handleMove(e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
      e.preventDefault(); // Prevent page scroll
      handleEnd();
    };

    // Add non-passive touch event listeners to allow preventDefault
    useEffect(() => {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, currentOffset]);

    useEffect(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
      label ? React.createElement('div', { style: wheelStyles.label }, label) : null,
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
                  ...getItemStyle(index)
                }
              },
              option.display
            )
          )
        )
      )
    );
  }; }, []);

  // Amount Picker Lab Section
  const AmountPickerLabSection = React.useMemo(() => { return ({ unit, setUnit, amount, setAmount }) => {
    const [flipKey, setFlipKey] = useState(0);

    React.useEffect(() => {
      setFlipKey((prev) => prev + 1);
    }, [unit]);

    const snapToStep = (val, step) => {
      const n = Number(val) || 0;
      const s = Number(step) || 1;
      const snapped = Math.round(n / s) * s;
      // Normalize float noise for 0.25 step
      return s < 1 ? parseFloat(snapped.toFixed(2)) : snapped;
    };

    const setUnitWithConversion = (nextUnit) => {
      if (!nextUnit || nextUnit === unit) return;
      if (nextUnit === 'ml') {
        const ml = snapToStep(amount * 29.5735, 10);
        setUnit('ml');
        setAmount(ml);
      } else {
        const oz = snapToStep(amount / 29.5735, 0.25);
        setUnit('oz');
        setAmount(oz);
      }
    };

    const getAmountRange = () => {
      if (unit === 'oz') {
        return { min: 0, max: 12, step: 0.25 };
      } else {
        return { min: 0, max: 360, step: 10 };
      }
    };

    const range = getAmountRange();

    return React.createElement(
      'div',
      { style: wheelStyles.section },
      React.createElement(
        'div',
        {
          key: flipKey,
          style: {
            animation: 'ttPickerFlip 180ms ease',
            transformOrigin: 'center top'
          }
        },
        React.createElement(WheelPicker, {
          type: 'number',
          value: amount,
          onChange: setAmount,
          min: range.min,
          max: range.max,
          step: range.step,
          unit: unit
        })
      )
    );
  }; }, []);

  // Date/Time Picker Lab Section
  const DateTimePickerLabSection = React.useMemo(() => { return () => {
    const [selectedDate, setSelectedDate] = useState(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.toISOString();
    });
    const [hour, setHour] = useState(2);
    const [minute, setMinute] = useState(30);
    const [ampm, setAmpm] = useState('PM');

    return React.createElement(
      'div',
      { style: wheelStyles.section },
      React.createElement(
        'div',
        { style: { position: 'relative' } },
        // Single iOS-style selection bar spanning the whole time row
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
        React.createElement(
          'div',
          {
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
          React.createElement(WheelPicker, { 
            type: 'date', 
            value: selectedDate, 
            onChange: setSelectedDate, 
            compact: true,
            dateCompact: true,
            showSelection: false 
          }),
          React.createElement(WheelPicker, { type: 'hour', value: hour, onChange: setHour, compact: true, showSelection: false }),
          React.createElement(
            'div',
            {
              style: {
                ...wheelStyles.timeColon,
                width: '8px',
                fontSize: '20px',
                height: '40px',
                lineHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                transform: 'translateY(-2.5px)' // Nudge colon up 2.5px for alignment (moved down 1px)
              }
            },
            ':'
          ),
          React.createElement(WheelPicker, { type: 'minute', value: minute, onChange: setMinute, compact: true, showSelection: false }),
          React.createElement(WheelPicker, { type: 'ampm', value: ampm, onChange: setAmpm, compact: true, showSelection: false })
        )
      )
    );
  }; }, []);

  // TTPickerTray Component - Native keyboard-style tray
  const TTPickerTray = React.useMemo(() => { return ({ children, isOpen = false, onClose = null, header = null }) => {
    const [present, setPresent] = React.useState(false);
    const [hasEntered, setHasEntered] = React.useState(false);
    const sheetRef = React.useRef(null);
    const backdropRef = React.useRef(null);
    const scrollYRef = React.useRef(0);

    // Set present when isOpen becomes true
    React.useEffect(() => {
      if (isOpen) {
        setPresent(true);
      }
    }, [isOpen]);
    
    React.useEffect(() => {
      if (!present) {
        setHasEntered(false);
      }
    }, [present]);

    // Expose tray open state so other sheets can lock drag when the tray is active
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      window.TT = window.TT || {};
      window.TT.shared = window.TT.shared || {};
      window.TT.shared.pickers = window.TT.shared.pickers || {};
      window.TT.shared.pickers.isTrayOpen = !!(present && isOpen);
      return () => {
        if (window.TT?.shared?.pickers) {
          window.TT.shared.pickers.isTrayOpen = false;
        }
      };
    }, [present, isOpen]);

    // Lock/unlock body scroll while present
    React.useEffect(() => {
      if (!present) return;
      const body = document.body;
      const prev = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
      };
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
      body.style.position = 'fixed';
      body.style.top = `-${scrollYRef.current}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      return () => {
        body.style.position = prev.position || '';
        body.style.top = prev.top || '';
        body.style.left = prev.left || '';
        body.style.right = prev.right || '';
        body.style.width = prev.width || '';
        body.style.overflow = prev.overflow || '';
        window.scrollTo(0, scrollYRef.current || 0);
      };
    }, [present]);

    // Update transition (set before any transform changes)
    React.useEffect(() => {
      if (!present || !sheetRef.current) return;
      sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1)';
    }, [present]);

    // Animation: Open and Close (same as half sheets)
    React.useEffect(() => {
      if (!present || !sheetRef.current) return;
      
      if (isOpen) {
        // Open: slide up
        requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transform = 'translateY(0)';
            setHasEntered(true);
          }
        });
      } else {
        // Close: slide down - ensure transition is set first
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1)';
          sheetRef.current.style.transform = 'translateY(100%)';
        }
        // After animation, unmount
        const timer = setTimeout(() => {
          setPresent(false);
        }, 250);
        return () => clearTimeout(timer);
      }
    }, [isOpen, present]);

    // Backdrop animation
    React.useEffect(() => {
      if (!present || !backdropRef.current) return;
      if (isOpen) {
        requestAnimationFrame(() => {
          if (backdropRef.current) {
            backdropRef.current.style.opacity = '1';
          }
        });
      } else {
        backdropRef.current.style.opacity = '0';
      }
    }, [isOpen, present]);

    // Maintain transform when hasEntered is true (prevents reset during re-renders)
    React.useEffect(() => {
      if (hasEntered && sheetRef.current && isOpen) {
        // Ensure transform stays at translateY(0) even during re-renders
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }, [hasEntered, isOpen]);

    if (!present) return null;
    
    return React.createElement(
      React.Fragment,
      null,
      // Backdrop
      React.createElement('div', {
        ref: backdropRef,
        onClick: onClose || (() => {}),
        style: {
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
          opacity: 0,
          transition: 'opacity 250ms ease'
        }
      }),
      // Tray
      React.createElement(
        'div',
        {
          ref: sheetRef,
          style: {
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--tt-card-bg)',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            height: '40vh',
            paddingTop: '0px',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            transform: isOpen && hasEntered ? 'translateY(0)' : 'translateY(100%)',
            willChange: 'transform',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        },
        // Header row (3 columns)
        header && React.createElement('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            alignItems: 'center',
            padding: '10px 16px 10px', // Top padding matches bottom padding below toggle
            borderBottom: '1px solid var(--tt-card-border)'
          }
        }, header),
        // Content
        React.createElement('div', {
          style: {
            paddingTop: '8px',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '12px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            minHeight: 0
          }
        }, children)
      )
    );
  }; }, []);

  // Expose wheel picker components for reuse in TrackerCard (so we don't duplicate the implementation)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.TT = window.TT || {};
    window.TT.shared = window.TT.shared || {};
    window.TT.shared.pickers = window.TT.shared.pickers || {};

    window.TT.shared.pickers.wheelStyles = wheelStyles;
    window.TT.shared.pickers.WheelPicker = WheelPicker;
    window.TT.shared.pickers.AmountPickerLabSection = AmountPickerLabSection;
    window.TT.shared.pickers.TTPickerTray = TTPickerTray;
  }, [WheelPicker, AmountPickerLabSection, TTPickerTray]);

  // UI Lab page
  if (showUILab) {
    const wheelPickersOn =
      typeof window !== 'undefined' &&
      window.TT?.shared?.flags?.useWheelPickers?.get
        ? !!window.TT.shared.flags.useWheelPickers.get()
        : true;

    return React.createElement('div', { className: "space-y-4" },
      React.createElement('div', { className: "flex items-center gap-3 mb-4" },
        React.createElement('button', {
          onClick: () => setShowUILab(false),
          className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
        },
          React.createElement(ChevronLeft, { className: "w-5 h-5" })
        ),
        React.createElement('h1', { className: "text-xl font-semibold text-gray-800" }, 'UI Lab')
      ),

      React.createElement('div', { className: "mb-2 text-sm", style: { color: 'var(--tt-text-secondary)' } }, 'Feature Flags'),

      React.createElement('div', { className: "mb-4" },
        React.createElement('label', { className: "tt-card-label" }, 'Wheel Pickers in Trays'),
        window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
          value: wheelPickersOn ? 'on' : 'off',
          options: [
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' }
          ],
          onChange: () => {}
        })
      )
    );
  }


  // Main Settings page
  return React.createElement('div', { className: "space-y-4" },

    // Share & Support Card
    React.createElement('div', { className: "rounded-2xl shadow-lg p-6", style: { backgroundColor: 'var(--tt-card-bg)' } },
      React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Share & Support'),
      React.createElement('button', {
        onClick: handleShareApp,
        className: "w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2",
        style: {
          backgroundColor: 'var(--tt-feed-soft)',
          color: 'var(--tt-feed)'
        }
      },
        React.createElement('span', { className: "text-xl" }, '📱'),
        'Share Tiny Tracker'
      ),
      React.createElement('p', { className: "text-xs mt-2 text-center", style: { color: 'var(--tt-text-secondary)' } }, 
        'Tell other parents about Tiny Tracker!'
      )
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.SettingsTab = SettingsTab;
