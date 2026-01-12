// ========================================
// TINY TRACKER - PART 7
// Settings Tab - Share App, Sign Out, Delete Account
// ========================================

// ========================================
// UI VERSION HELPERS (Single Source of Truth)
// ========================================
// Initialize shared UI version helpers (only once)
if (typeof window !== 'undefined' && !window.TT?.shared?.uiVersion) {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  
  // Helper to get UI version (defaults to v2 for backward compatibility)
  window.TT.shared.uiVersion = {
    getUIVersion: () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const version = window.localStorage.getItem('tt_ui_version');
        if (version && ['v1', 'v2', 'v3'].includes(version)) {
          return version;
        }
        // Migration: derive from old flags if version doesn't exist
        const useNewUI = window.localStorage.getItem('tt_use_new_ui');
        const cardDesign = window.localStorage.getItem('tt_tracker_card_design');
        if (useNewUI === 'false') return 'v1';
        if (cardDesign === 'new') return 'v2';
        return 'v2'; // default
      }
      return 'v2';
    },
    shouldUseNewUI: (version) => version !== 'v1',
    getCardDesign: (version) => version === 'v3' ? 'v3' : (version === 'v2' ? 'new' : 'current')
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
  
  // UI Version - single source of truth (v1, v2, or v3)
  const [uiVersion, setUiVersion] = useState(() => {
    return (window.TT?.shared?.uiVersion?.getUIVersion || (() => 'v2'))();
  });
  
  // Today Card toggle state
  const [showTodayCard, setShowTodayCard] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('tt_show_today_card');
      return stored !== null ? stored === 'true' : false;
    }
    return false;
  });
  
  
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

  // Appearance state
  const [appearance, setAppearance] = useState(() => {
    if (typeof window !== 'undefined' && window.TT && window.TT.appearance) {
      return window.TT.appearance.get();
    }
    return { darkMode: false, background: "health-gray", feedAccent: "#d45d5c", sleepAccent: "#4a8ac2" };
  });
  const [showFeedPalette, setShowFeedPalette] = useState(false);
  const [showSleepPalette, setShowSleepPalette] = useState(false);
  const [showFeedColorModal, setShowFeedColorModal] = useState(false);
  const [showSleepColorModal, setShowSleepColorModal] = useState(false);
  const [feedVariant, setFeedVariant] = useState('normal'); // 'normal' | 'soft'
  const [sleepVariant, setSleepVariant] = useState('normal'); // 'normal' | 'soft'

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
  }, [showUILab, uiVersion, kidId]);

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

  // Sync appearance state with TT.appearance
  useEffect(() => {
    if (typeof window !== 'undefined' && window.TT && window.TT.appearance) {
      const current = window.TT.appearance.get();
      setAppearance(current);
    }
  }, []);

  // Color definitions with Normal and Soft variants
  const COLOR_DEFINITIONS = [
    // Blues
    { name: 'Ocean Blue', normal: { light: '#4a8ac2', dark: '#6ba8dc' }, soft: { light: '#6b9dcc', dark: '#88b8e6' } },
    { name: 'Slate Blue', normal: { light: '#6b7c9d', dark: '#8d9dbd' }, soft: { light: '#8595ad', dark: '#a5b3cd' } },
    // Greens
    { name: 'Mint Green', normal: { light: '#3a9679', dark: '#5cb899' }, soft: { light: '#5ca98a', dark: '#7dc9aa' } },
    { name: 'Eucalyptus', normal: { light: '#92ADA4', dark: '#a8c4bb' }, soft: { light: '#a8beb7', dark: '#bdd4cc' } },
    { name: 'Jalapeno', normal: { light: '#758C4F', dark: '#92a96f' }, soft: { light: '#8f9f6a', dark: '#a9bb88' } },
    // Purple
    { name: 'Purple', normal: { light: '#8b6ba8', dark: '#a98cc5' }, soft: { light: '#a085b8', dark: '#bba3d5' } },
    // Reds & Pinks
    { name: 'Coral', normal: { light: '#d45d5c', dark: '#e88378' }, soft: { light: '#dd7978', dark: '#ed9d93' } },
    { name: 'Rose Pink', normal: { light: '#d1547c', dark: '#e5749b' }, soft: { light: '#db7090', dark: '#ec8fac' } },
    { name: 'Cinnabar', normal: { light: '#AE6455', dark: '#c98275' }, soft: { light: '#be8073', dark: '#d69a8e' } },
    // Oranges & Peaches
    { name: 'Warm Orange', normal: { light: '#d4704b', dark: '#e89368' }, soft: { light: '#dd8a6a', dark: '#edaa87' } },
    { name: 'Apricot', normal: { light: '#EF9E70', dark: '#f5b690' }, soft: { light: '#f3b28c', dark: '#f8c7a8' } },
    { name: 'Roasted Peach', normal: { light: '#DAA58F', dark: '#e8bda8' }, soft: { light: '#e4b8a5', dark: '#eeddc2' } },
    // Yellows & Creams
    { name: 'Golden Yellow', normal: { light: '#c9952e', dark: '#e0b04d' }, soft: { light: '#d5a84f', dark: '#e8c26e' } },
    { name: 'Cream', normal: { light: '#FED8A6', dark: '#ffe4be' }, soft: { light: '#fee2ba', dark: '#ffedce' } },
    // Browns
    { name: 'Milky Coffee', normal: { light: '#9B7D61', dark: '#b59881' }, soft: { light: '#af9479', dark: '#c7ad99' } }
  ];

  // Unified palette - extract light colors from normal variant
  const ALL_COLORS = COLOR_DEFINITIONS.map(c => c.normal.light);
  const FEED_PALETTE = ALL_COLORS;
  const SLEEP_PALETTE = ALL_COLORS;

  // Background theme colors (mode-aware)
  // Light mode: health-gray (Gray), eggshell (Coffee)
  // Dark mode: health-gray (existing dark), eggshell (Claude-inspired dark)
  const BACKGROUND_COLORS = {
    light: {
      'health-gray': '#f2f2f7',
      'eggshell': '#FAF7F2'
    },
    dark: {
      'health-gray': '#0F0F10',
      'eggshell': '#1C1C1C'
    }
  };

  // ChevronDown icon
  const ChevronDown = (props) => React.createElement('svg', { 
    ...props, 
    xmlns: "http://www.w3.org/2000/svg", 
    width: "24", 
    height: "24", 
    viewBox: "0 0 24 24", 
    fill: "none", 
    stroke: "currentColor", 
    strokeWidth: "2", 
    strokeLinecap: "round", 
    strokeLinejoin: "round" 
  },
    React.createElement('path', { d: "m6 9 6 6 6-6" })
  );

  // Helper to get color value based on variant and dark mode
  const getColorValue = (colorName, variant, isDark) => {
    const colorDef = COLOR_DEFINITIONS.find(c => c.name === colorName);
    if (!colorDef) return colorName; // Fallback to hex if not found
    const variantColors = colorDef[variant] || colorDef.normal;
    return isDark ? variantColors.dark : variantColors.light;
  };

  // Helper to get current preview color
  const getPreviewColor = (accentColor, variant, isDark) => {
    // Try to find color by hex value first (check all variants)
    const colorDef = COLOR_DEFINITIONS.find(c => 
      c.normal.light === accentColor || 
      c.normal.dark === accentColor ||
      c.soft.light === accentColor ||
      c.soft.dark === accentColor
    );
    if (colorDef) {
      // Use the requested variant
      const variantColors = colorDef[variant] || colorDef.normal;
      return isDark ? variantColors.dark : variantColors.light;
    }
    // Fallback to original color if not found in definitions
    return accentColor;
  };

  // Handle appearance changes
  const handleAppearanceChange = async (partial) => {
    if (typeof window !== 'undefined' && window.TT && window.TT.appearance) {
      await window.TT.appearance.set(partial);
      // Refresh local state
      setAppearance(window.TT.appearance.get());
    }
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

  const handleSignOut = async () => {
    if (confirm('Sign out of Tiny Tracker?')) {
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      "Are you sure you want to delete your account?\n\n" +
      "- You will be removed from the family.\n" +
      "- If you are the owner, ownership will transfer to another member.\n" +
      "- Your baby's data will NOT be deleted.\n\n" +
      "This action cannot be undone."
    );
    
    if (!confirmDelete) return;

    try {
      await deleteCurrentUserAccount();
      alert("Your account has been deleted.");
    } catch (err) {
      console.error("Account deletion failed:", err);
      alert("Something went wrong deleting your account. Please try again.");
    }
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
        React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, label),
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
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--tt-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
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

  const WheelPicker = ({
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
      onChange(options[clampedIndex].value);
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
  };

  // Amount Picker Lab Section
  const AmountPickerLabSection = ({ unit, setUnit, amount, setAmount }) => {
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
  };

  // Date/Time Picker Lab Section
  const DateTimePickerLabSection = () => {
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
  };

  // TTPickerTray Component - Native keyboard-style tray
  const TTPickerTray = ({ children, isOpen = false, onClose = null, header = null }) => {
    const [present, setPresent] = React.useState(false);
    const [hasEntered, setHasEntered] = React.useState(false);
    const sheetRef = React.useRef(null);
    const backdropRef = React.useRef(null);

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
  };

  // UI Lab page
  if (showUILab) {

    return React.createElement('div', { className: "space-y-4" },
      // Back button header
      React.createElement('div', { className: "flex items-center gap-3 mb-4" },
        React.createElement('button', {
          onClick: () => setShowUILab(false),
          className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
        },
          React.createElement(ChevronLeft, { className: "w-5 h-5" })
        ),
        React.createElement('h1', { className: "text-xl font-semibold text-gray-800" }, 'UI Lab')
      ),

      // UI Version Toggle (single source of truth for v1/v2/v3)
      React.createElement('div', { className: "mb-4" },
        React.createElement('label', { 
          className: "block text-sm font-medium text-gray-700 mb-2" 
        }, 'UI Version'),
        window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
          value: uiVersion,
          options: [
            { value: 'v1', label: 'v1' },
            { value: 'v2', label: 'v2' },
            { value: 'v3', label: 'v3' }
          ],
          onChange: (value) => {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('tt_ui_version', value);
              // Force reload to apply changes
              window.location.reload();
            }
          }
        })
      ),

      // Today Card Toggle (controls feature flag)
      React.createElement('div', { className: "mb-4" },
        React.createElement('label', { 
          className: "block text-sm font-medium text-gray-700 mb-2" 
        }, 'Show Today Card'),
        window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
          value: showTodayCard ? 'on' : 'off',
          options: [
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' }
          ],
          onChange: (value) => {
            const isOn = value === 'on';
            setShowTodayCard(isOn);
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('tt_show_today_card', isOn ? 'true' : 'false');
              // Force reload to apply changes
              window.location.reload();
            }
          }
        })
      ),

      // Title and subtitle
      React.createElement('div', { className: "mb-6" },
        React.createElement('h2', { className: "text-2xl font-bold text-gray-900 mb-2" }, 'UI Lab'),
        React.createElement('p', { className: "text-sm text-gray-600" }, 
          uiVersion === 'v1'
            ? 'View old tracker UI with production data (v1)'
            : uiVersion === 'v2'
              ? 'View new tracker card components with current design (v2)'
              : 'View new tracker card components with new design (v3)'
        )
      ),

      // Design Palette Section
      React.createElement('div', { className: "bg-white rounded-2xl shadow-sm p-6 mb-6" },
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Design Palette'),
        
        // Colors
        React.createElement('div', { className: "mb-6" },
          React.createElement('h4', { className: "text-base font-semibold text-black mb-3" }, 'Colors'),
          React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
            // Background colors
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "h-12 rounded-2xl bg-white border border-gray-200" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'bg-white')
            ),
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "h-12 rounded-2xl bg-gray-50" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'bg-gray-50')
            ),
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "h-12 rounded-2xl bg-gray-100" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'bg-gray-100')
            ),
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "h-12 rounded-2xl bg-gray-200" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'bg-gray-200')
            ),
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "h-12 rounded-2xl bg-gray-500" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'bg-gray-500')
            ),
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "h-12 rounded-2xl bg-black" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'bg-black')
            )
          ),
          // Text colors
          React.createElement('div', { className: "mt-4 space-y-2" },
            React.createElement('div', { className: "text-xs text-black" }, 'text-black'),
            React.createElement('div', { className: "text-xs text-gray-500" }, 'text-gray-500'),
            React.createElement('div', { className: "text-xs text-gray-800" }, 'text-gray-800'),
            React.createElement('div', { className: "text-xs text-white" }, 'text-white'),
            React.createElement('div', { className: "text-xs text-red-600" }, 'text-red-600')
          )
        ),

        // Text Hierarchy
        React.createElement('div', { className: "mb-6" },
          React.createElement('h4', { className: "text-base font-semibold text-black mb-3" }, 'Text Hierarchy'),
          React.createElement('div', { className: "space-y-3" },
            React.createElement('div', null,
              React.createElement('div', { className: "text-[40px] leading-none font-bold text-black" }, '40px Bold'),
              React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, 'Display number')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: "text-base font-semibold text-black" }, '16px Semibold'),
              React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, 'Card headers, labels')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: "text-base font-light text-black" }, '16px Light'),
              React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, 'Secondary text')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: "text-base text-black" }, '16px Regular'),
              React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, 'Body text')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: "text-sm text-gray-500" }, '14px Regular'),
              React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, 'Body text, notes')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: "text-xs text-gray-500" }, '12px Regular'),
              React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, 'Labels, metadata')
            )
          )
        ),

        // Corner Radii
        React.createElement('div', { className: "mb-6" },
          React.createElement('h4', { className: "text-base font-semibold text-black mb-3" }, 'Corner Radii'),
          React.createElement('div', { className: "flex items-end gap-4" },
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "w-16 h-16 rounded-2xl bg-gray-100" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'rounded-2xl (16px)')
            ),
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "w-16 h-16 rounded-full bg-gray-100" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'rounded-full')
            )
          )
        ),

        // Spacing
        React.createElement('div', { className: "mb-6" },
          React.createElement('h4', { className: "text-base font-semibold text-black mb-3" }, 'Spacing'),
          React.createElement('div', { className: "space-y-2" },
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-2 h-2 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'gap-1 (4px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-3 h-3 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'gap-1.5 (6px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-4 h-4 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'gap-2 (8px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-6 h-6 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'gap-3 (12px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-8 h-8 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'p-2 (8px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-12 h-12 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'p-3 (12px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-16 h-16 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'p-4 (16px)' )
            ),
            React.createElement('div', { className: "flex items-center gap-3" },
              React.createElement('div', { className: "w-20 h-20 rounded-full bg-gray-400" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'p-5 (20px)' )
            )
          )
        ),

        // Shadows
        React.createElement('div', { className: "mb-6" },
          React.createElement('h4', { className: "text-base font-semibold text-black mb-3" }, 'Shadows'),
          React.createElement('div', { className: "flex gap-4" },
            React.createElement('div', { className: "space-y-1" },
              React.createElement('div', { className: "w-20 h-20 rounded-2xl bg-white shadow-sm" }),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'shadow-sm')
            )
          )
        ),

        // Borders
        React.createElement('div', null,
          React.createElement('h4', { className: "text-base font-semibold text-black mb-3" }, 'Borders'),
          React.createElement('div', { className: "space-y-2" },
            React.createElement('div', { className: "h-12 rounded-2xl border border-gray-100 bg-white" }),
            React.createElement('div', { className: "text-xs text-gray-500" }, 'border-gray-100'),
            React.createElement('div', { className: "h-12 rounded-2xl border border-gray-200 bg-white" }),
            React.createElement('div', { className: "text-xs text-gray-500" }, 'border-gray-200')
          )
        )
      ),

      // New UI - TrackerCard components with production data (v2 and v3)
      (uiVersion === 'v2' || uiVersion === 'v3') && (() => {
        if (loading) {
          return React.createElement('div', { className: "text-center py-8 text-gray-500" }, 'Loading production data...');
        }
        
        const targetOunces = (babyWeight || 0) * multiplier;
        const targetHours = sleepSettings?.sleepTargetHours || 14;
        const feedingCardData = formatFeedingsForCard(feedings, targetOunces, currentDate);
        const sleepCardData = formatSleepSessionsForCard(sleepSessions, targetHours, currentDate, null); // No active sleep in UI Lab
        
        return React.createElement(React.Fragment, null,
          window.TrackerCard && React.createElement(window.TrackerCard, {
            mode: 'feeding',
            total: feedingCardData.total,
            target: feedingCardData.target,
            timelineItems: feedingCardData.timelineItems,
            lastEntryTime: feedingCardData.lastEntryTime,
            onItemClick: () => {} // No-op for UI Lab
          }),
          window.TrackerCard && React.createElement(window.TrackerCard, {
            mode: 'sleep',
            total: sleepCardData.total,
            target: sleepCardData.target,
            timelineItems: sleepCardData.timelineItems,
            lastEntryTime: sleepCardData.lastEntryTime,
            onItemClick: () => {} // No-op for UI Lab
          })
        );
      })(),

      // Old UI Section (v1)
      uiVersion === 'v1' && React.createElement('div', { className: "mt-8" },
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Old UI'),
        React.createElement('div', { className: "text-sm text-gray-600 mb-4" }, 
          'This is the previous tracker interface. Switch to "New UI" to see the updated design.'
        ),
        loading ? React.createElement('div', { className: "text-center py-8 text-gray-500" }, 'Loading production data...') :
        React.createElement('div', { className: "bg-gray-50 rounded-2xl p-6 text-center text-gray-500" },
          'Old UI components will be rendered here with production data'
        )
      ),

      // Detail Sheet previews with launch buttons
      React.createElement('div', { className: "border-t border-gray-100 pt-6" }),
      React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-3" }, 'Detail Sheets'),
      React.createElement('div', { className: "space-y-4" },
        // Feed Detail Sheet
        React.createElement('div', { className: "bg-white rounded-2xl shadow-sm p-4" },
          React.createElement('button', {
            onClick: () => setShowFeedSheet(true),
            className: "w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-semibold active:opacity-80 transition mb-4"
          }, 'Open Feed Sheet'),
          // Static preview (unchanged)
          window.TTFeedDetailSheet && React.createElement(window.TTFeedDetailSheet)
        ),
        
        // Sleep Detail Sheet
        React.createElement('div', { className: "bg-white rounded-2xl shadow-sm p-4" },
          React.createElement('button', {
            onClick: () => setShowSleepSheet(true),
            className: "w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-semibold active:opacity-80 transition mb-4"
          }, 'Open Sleep Sheet'),
          // Static preview (unchanged)
          window.TTSleepDetailSheet && React.createElement(window.TTSleepDetailSheet)
        )
      ),

      // Input Half Sheet section
      React.createElement('div', { className: "border-t border-gray-100 pt-6" }),
      React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-3" }, 'Input Half Sheet'),
      React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-white rounded-2xl shadow-sm p-4" },
          React.createElement('button', {
            onClick: () => setShowInputSheet(true),
            className: "w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-semibold active:opacity-80 transition mb-4"
          }, 'Open Input Sheet'),
          // Static preview
          window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet)
        )
      ),

      // Wheel Pickers section (moved under Input Half Sheet, wrapped in trays)
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-3" }, 'Wheel Pickers'),
        React.createElement('div', { className: "space-y-4" },
          // Amount Picker Tray
          React.createElement('div', { className: "bg-white rounded-2xl shadow-sm p-4" },
            React.createElement('button', {
              onClick: () => setShowAmountPickerTray(true),
              className: "w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-semibold active:opacity-80 transition mb-4"
            }, 'Open Amount Picker'),
            // Static preview
            React.createElement('div', {
              style: {
                position: 'relative',
                backgroundColor: 'var(--tt-card-bg)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                paddingTop: '0px',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }
            },
              // Header row (3 columns)
              React.createElement('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  alignItems: 'center',
                  padding: '10px 16px 10px', // Top padding matches bottom padding below toggle
                  borderBottom: '1px solid var(--tt-card-border)'
                }
              },
                // Left: Unit toggle
                React.createElement('div', {
                  style: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }
                },
                  window.SegmentedToggle
                    ? React.createElement(window.SegmentedToggle, {
                        value: amountPickerUnit,
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
                            const ml = snapToStep(amountPickerAmount * 29.5735, 10);
                            setAmountPickerUnit('ml');
                            setAmountPickerAmount(ml);
                          } else {
                            const oz = snapToStep(amountPickerAmount / 29.5735, 0.25);
                            setAmountPickerUnit('oz');
                            setAmountPickerAmount(oz);
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
                            if (amountPickerUnit === 'ml') {
                              const oz = snapToStep(amountPickerAmount / 29.5735, 0.25);
                              setAmountPickerUnit('oz');
                              setAmountPickerAmount(oz);
                            } else {
                              const ml = snapToStep(amountPickerAmount * 29.5735, 10);
                              setAmountPickerUnit('ml');
                              setAmountPickerAmount(ml);
                            }
                          }, 
                          type: 'button' 
                        },
                        React.createElement('span', { style: amountPickerUnit === 'oz' ? wheelStyles.unitActive : wheelStyles.unitInactive }, 'oz'),
                        React.createElement('span', { style: wheelStyles.unitDivider }, '|'),
                        React.createElement('span', { style: amountPickerUnit === 'ml' ? wheelStyles.unitActive : wheelStyles.unitInactive }, 'ml')
                      )
                ),
                // Center: Title
                React.createElement('div', {
                  style: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
                },
                  React.createElement('h3', { 
                    style: { 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: 'var(--tt-text-primary)', 
                      margin: 0 
                    } 
                  }, 'Amount')
                ),
                // Right: Done button (disabled in preview)
                React.createElement('div', {
                  style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }
                },
                  React.createElement('button', {
                    disabled: true,
                    style: {
                      fontSize: '16px',
                      fontWeight: '400', // Normal text weight per design system
                      color: 'var(--tt-text-secondary)',
                      background: 'none',
                      border: 'none',
                      padding: '8px 16px',
                      cursor: 'not-allowed',
                      borderRadius: '8px',
                      opacity: 0.5
                    }
                  }, 'Done')
                )
              ),
              // Content
              React.createElement('div', {
                style: { 
                  paddingTop: '10px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingBottom: '16px'
                }
              },
                React.createElement(AmountPickerLabSection, {
                  unit: amountPickerUnit,
                  setUnit: setAmountPickerUnit,
                  amount: amountPickerAmount,
                  setAmount: setAmountPickerAmount
                })
              )
            )
          ),
          // Date/Time Picker Tray
          React.createElement('div', { className: "bg-white rounded-2xl shadow-sm p-4" },
            React.createElement('button', {
              onClick: () => setShowDateTimePickerTray(true),
              className: "w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-semibold active:opacity-80 transition mb-4"
            }, 'Open Date/Time Picker'),
            // Static preview
            React.createElement('div', {
              style: {
                position: 'relative',
                backgroundColor: 'var(--tt-card-bg)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                paddingTop: '0px',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }
            },
              // Header row (3 columns)
              React.createElement('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  alignItems: 'center',
                  padding: '10px 16px 10px', // Top padding matches bottom padding below toggle
                  borderBottom: '1px solid var(--tt-card-border)'
                }
              },
                // Left: Empty
                React.createElement('div', {
                  style: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }
                }),
                // Center: Title
                React.createElement('div', {
                  style: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
                },
                  React.createElement('h3', { 
                    style: { 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: 'var(--tt-text-primary)', 
                      margin: 0 
                    } 
                  }, 'Time')
                ),
                // Right: Done button (disabled in preview)
                React.createElement('div', {
                  style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }
                },
                  React.createElement('button', {
                    disabled: true,
                    style: {
                      fontSize: '16px',
                      fontWeight: '400', // Normal text weight per design system
                      color: 'var(--tt-text-secondary)',
                      background: 'none',
                      border: 'none',
                      padding: '8px 16px',
                      cursor: 'not-allowed',
                      borderRadius: '8px',
                      opacity: 0.5
                    }
                  }, 'Done')
                )
              ),
              // Content
              React.createElement('div', {
                style: { 
                  paddingTop: '10px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingBottom: '16px'
                }
              },
                React.createElement(DateTimePickerLabSection)
              )
            )
          )
        )
      ),

      // Overlay half sheets (conditionally rendered)
      window.TTFeedDetailSheet && React.createElement(window.TTFeedDetailSheet, {
        isOpen: showFeedSheet,
        onClose: () => setShowFeedSheet(false)
      }),
      window.TTSleepDetailSheet && React.createElement(window.TTSleepDetailSheet, {
        isOpen: showSleepSheet,
        onClose: () => setShowSleepSheet(false)
      }),
      // Overlay input half sheet
      window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet, {
        isOpen: showInputSheet,
        onClose: () => setShowInputSheet(false)
      }),
      // Overlay amount picker tray
      React.createElement(TTPickerTray, {
        isOpen: showAmountPickerTray,
        onClose: () => setShowAmountPickerTray(false),
        header: React.createElement(
          React.Fragment,
          null,
          // Left: Unit toggle
          React.createElement('div', {
            style: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }
          },
            window.SegmentedToggle
              ? React.createElement(window.SegmentedToggle, {
                  value: amountPickerUnit,
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
                      const ml = snapToStep(amountPickerAmount * 29.5735, 10);
                      setAmountPickerUnit('ml');
                      setAmountPickerAmount(ml);
                    } else {
                      const oz = snapToStep(amountPickerAmount / 29.5735, 0.25);
                      setAmountPickerUnit('oz');
                      setAmountPickerAmount(oz);
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
                      if (amountPickerUnit === 'ml') {
                        const oz = snapToStep(amountPickerAmount / 29.5735, 0.25);
                        setAmountPickerUnit('oz');
                        setAmountPickerAmount(oz);
                      } else {
                        const ml = snapToStep(amountPickerAmount * 29.5735, 10);
                        setAmountPickerUnit('ml');
                        setAmountPickerAmount(ml);
                      }
                    }, 
                    type: 'button' 
                  },
                  React.createElement('span', { style: amountPickerUnit === 'oz' ? wheelStyles.unitActive : wheelStyles.unitInactive }, 'oz'),
                  React.createElement('span', { style: wheelStyles.unitDivider }, '|'),
                  React.createElement('span', { style: amountPickerUnit === 'ml' ? wheelStyles.unitActive : wheelStyles.unitInactive }, 'ml')
                )
          ),
          // Center: Title
          React.createElement('div', {
            style: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
          },
            React.createElement('h3', { 
              style: { 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--tt-text-primary)', 
                margin: 0 
              } 
            }, 'Amount')
          ),
          // Right: Done button
          React.createElement('div', {
            style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }
          },
            React.createElement('button', {
              onClick: () => setShowAmountPickerTray(false),
              style: {
                fontSize: '16px',
                fontWeight: '400', // Normal text weight per design system
                color: 'var(--tt-text-primary)',
                background: 'none',
                border: 'none',
                padding: '8px 16px',
                cursor: 'pointer',
                borderRadius: '8px'
              },
              onMouseEnter: (e) => e.target.style.backgroundColor = 'var(--tt-subtle-surface)',
              onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
            }, 'Done')
          )
        )
      },
        React.createElement(AmountPickerLabSection, {
          unit: amountPickerUnit,
          setUnit: setAmountPickerUnit,
          amount: amountPickerAmount,
          setAmount: setAmountPickerAmount
        })
      ),
      // Overlay date/time picker tray
      React.createElement(TTPickerTray, {
        isOpen: showDateTimePickerTray,
        onClose: () => setShowDateTimePickerTray(false),
        header: React.createElement(
          React.Fragment,
          null,
          // Left: Empty
          React.createElement('div', {
            style: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }
          }),
          // Center: Title
          React.createElement('div', {
            style: { display: 'flex', justifyContent: 'center', alignItems: 'center' }
          },
            React.createElement('h3', { 
              style: { 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--tt-text-primary)', 
                margin: 0 
              } 
            }, 'Time')
          ),
          // Right: Done button
          React.createElement('div', {
            style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }
          },
            React.createElement('button', {
              onClick: () => setShowDateTimePickerTray(false),
              style: {
                fontSize: '16px',
                fontWeight: '400', // Normal text weight per design system
                color: 'var(--tt-text-primary)',
                background: 'none',
                border: 'none',
                padding: '8px 16px',
                cursor: 'pointer',
                borderRadius: '8px'
              },
              onMouseEnter: (e) => e.target.style.backgroundColor = 'var(--tt-subtle-surface)',
              onMouseLeave: (e) => e.target.style.backgroundColor = 'transparent'
            }, 'Done')
          )
        )
      },
        React.createElement(DateTimePickerLabSection)
      ),

      // Icons section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Icons'),
        React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
          React.createElement('div', { className: "grid grid-cols-4 gap-4" },
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Edit2, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Edit2')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Check, { className: "w-6 h-6 text-green-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Check')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(X, { className: "w-6 h-6 text-red-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'X')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Plus, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Plus')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Clock, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Clock')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Milk, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Milk')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Baby, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Baby')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Camera, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Camera')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(UserPlus, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'UserPlus')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(ShareIcon, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'ShareIcon')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(ChevronLeft, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'ChevronLeft')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(ChevronRight, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'ChevronRight')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(BarChart, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'BarChart')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(TrendingUp, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'TrendingUp')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(MessageCircle, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'MessageCircle')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Users, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Users')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Menu, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Menu')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Moon, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Moon')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Kanban, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Kanban')
            ),
            React.createElement('div', { className: "flex flex-col items-center gap-2" },
              React.createElement(Send, { className: "w-6 h-6 text-indigo-600" }),
              React.createElement('span', { className: "text-xs text-gray-600" }, 'Send')
            )
          )
        ),
        React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used throughout the app for actions, navigation, and visual indicators')
      ),

      // Text Hierarchies section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Text Hierarchies'),
        React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
          React.createElement('div', { className: "space-y-6" },
            // Headings
            React.createElement('div', null,
              React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Headings'),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('h1', { className: "text-3xl font-bold text-gray-800 handwriting" }, 'Tiny Tracker'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: LoginScreen (app title)'),
                React.createElement('h2', { className: "text-2xl font-bold text-gray-800" }, 'Heading 2xl'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: BabySetupScreen (page title)'),
                React.createElement('h2', { className: "text-lg font-semibold text-gray-800" }, 'Heading lg'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Card titles, section headers'),
                React.createElement('h3', { className: "text-base font-semibold text-gray-800" }, 'Heading base'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Subsection headers')
              )
            ),
            // Body Text
            React.createElement('div', null,
              React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Body Text'),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('div', { className: "text-base font-normal text-gray-900" }, 'Body text (base)'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Card content, descriptions'),
                React.createElement('div', { className: "text-sm font-normal text-gray-600" }, 'Body text (sm)'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Labels, secondary text'),
                React.createElement('div', { className: "text-xs font-normal text-gray-500" }, 'Body text (xs)'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Metadata, timestamps, helper text')
              )
            ),
            // Emphasis
            React.createElement('div', null,
              React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Emphasis'),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('div', { className: "text-4xl font-semibold text-indigo-600" }, '45:23'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Timer display, large numbers'),
                React.createElement('div', { className: "text-2xl font-semibold text-gray-800" }, '25.0 oz'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Progress values, key metrics'),
                React.createElement('div', { className: "text-base font-semibold text-gray-900" }, 'Semibold text'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Important labels, values'),
                React.createElement('div', { className: "text-sm font-medium text-gray-600" }, 'Medium text'),
                React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Field labels, secondary emphasis')
              )
            )
          )
        ),
        React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Typography system used throughout the app')
      ),

      // Buttons section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Buttons'),
        React.createElement('div', { className: "space-y-6" },
          
          // Primary Buttons
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Primary Buttons'),
        React.createElement('div', { className: "space-y-3" },
              React.createElement('div', { className: "flex flex-wrap gap-3 items-center" },
                React.createElement('button', {
                  className: "bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition"
                }, 'Primary Button'),
                React.createElement('button', {
                  className: "bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                },
                  React.createElement(Plus, { className: "w-5 h-5" }),
                  'With Icon'
                ),
                React.createElement('button', {
                  className: "bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition opacity-50 cursor-not-allowed",
                  disabled: true
                }, 'Disabled')
              )
            )
          ),

          // Secondary Buttons
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Secondary Buttons'),
            React.createElement('div', { className: "space-y-3" },
              React.createElement('div', { className: "flex flex-wrap gap-3 items-center" },
                React.createElement('button', {
                  className: "bg-gray-100 text-gray-600 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition"
                }, 'Secondary Button'),
                React.createElement('button', {
                  className: "bg-gray-100 text-gray-600 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center"
                }, React.createElement(Clock, { className: "w-5 h-5" })),
                React.createElement('button', {
                  className: "bg-gray-100 text-gray-600 py-3 px-6 rounded-lg font-semibold opacity-50 cursor-not-allowed",
                  disabled: true
                }, 'Disabled')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (time picker), various secondary actions')
          ),

          // Destructive Buttons
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Destructive Buttons'),
            React.createElement('div', { className: "space-y-3" },
              React.createElement('div', { className: "flex flex-wrap gap-3 items-center" },
                React.createElement('button', {
                  className: "bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition"
                }, 'Delete Account'),
                React.createElement('button', {
                  className: "bg-red-50 text-red-600 py-3 px-6 rounded-lg font-semibold hover:bg-red-100 transition"
                }, 'Sign Out'),
                React.createElement('button', {
                  className: "bg-red-600 text-white py-3 px-6 rounded-lg font-semibold opacity-50 cursor-not-allowed",
                  disabled: true
                }, 'Disabled')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: SettingsTab (Delete Account, Sign Out)')
          ),

          // Icon Buttons
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Icon Buttons'),
            React.createElement('div', { className: "space-y-3" },
              React.createElement('div', { className: "flex flex-wrap gap-3 items-center" },
                React.createElement('button', {
                  className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                }, React.createElement(Edit2, { className: "w-5 h-5" })),
                React.createElement('button', {
                  className: "p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                }, React.createElement(X, { className: "w-5 h-5" })),
                React.createElement('button', {
                  className: "p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                }, React.createElement(Check, { className: "w-5 h-5" })),
                React.createElement('button', {
                  className: "p-2 text-gray-400 rounded-lg cursor-not-allowed",
                  disabled: true
                }, React.createElement(Edit2, { className: "w-5 h-5" }))
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (edit/delete actions), FamilyTab (edit fields), various cards')
          ),

          // Full Width Buttons
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Full Width Buttons'),
            React.createElement('div', { className: "space-y-3" },
              React.createElement('button', {
                className: "w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              },
                React.createElement(Plus, { className: "w-5 h-5" }),
                'Add Feeding'
              ),
              React.createElement('button', {
                className: "w-full bg-gray-100 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
              }, 'Cancel')
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (Add Feeding), Input Cards, various forms')
          )

        )
      ),

      // Action Buttons section (Save/Cancel)
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Action Buttons (Save/Cancel)'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Tracker Edit Actions'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "grid grid-cols-2 gap-3" },
                React.createElement('button', {
                  type: 'button',
                  className: "h-10 w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-green-600"
                }, React.createElement(Check, { className: "w-5 h-5" })),
                React.createElement('button', {
                  type: 'button',
                  className: "h-10 w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500"
                }, React.createElement(X, { className: "w-5 h-5" }))
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (edit feeding/sleep entries)')
          )
        )
      ),

      // Text Inputs section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Text Inputs'),
        React.createElement('div', { className: "space-y-6" },
          
          // Text Input
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Text Input'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-4" },
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Default'),
                  React.createElement('input', {
                    type: "text",
                    placeholder: "Enter text",
                    className: "w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  })
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Focused'),
                  React.createElement('input', {
                    type: "text",
                    value: "Sample text",
                    className: "w-full px-4 py-2.5 text-base border-2 border-indigo-400 rounded-lg focus:outline-none focus:border-indigo-500"
                  })
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Error'),
                  React.createElement('input', {
                    type: "text",
                    value: "Invalid input",
                    className: "w-full px-4 py-2.5 text-base border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-400"
                  })
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Disabled'),
                  React.createElement('input', {
                    type: "text",
                    value: "Disabled",
                    disabled: true,
                    className: "w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                  })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: LoginScreen, BabySetupScreen, TrackerTab (edit fields)')
          ),

          // Number Input
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Number Input'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-4" },
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Ounces'),
                  React.createElement('div', { className: "relative" },
                    React.createElement('input', {
                      type: "number",
                      inputMode: "decimal",
                      step: "0.25",
                      placeholder: "0.0",
                      className: "w-full px-4 py-2.5 pr-12 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                    }),
                    React.createElement('span', { className: "absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none" }, 'oz')
                  )
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Weight'),
                  React.createElement('div', { className: "relative" },
                    React.createElement('input', {
                      type: "number",
                      inputMode: "decimal",
                      step: "0.1",
                      placeholder: "0.0",
                      className: "w-full px-4 py-2.5 pr-12 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                    }),
                    React.createElement('span', { className: "absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none" }, 'lbs')
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (feeding amount, weight), FamilyTab (weight input)')
          ),

          // Email & Password
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Email & Password'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-4" },
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Email'),
                  React.createElement('input', {
                    type: "email",
                    placeholder: "email@example.com",
                    autoComplete: "email",
                    className: "w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  })
                ),
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Password'),
                  React.createElement('input', {
                    type: "password",
                    placeholder: "Password",
                    autoComplete: "current-password",
                    className: "w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: LoginScreen (email/password authentication)')
          ),

          // Time & Date Inputs
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Time & Date Inputs'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-4" },
                React.createElement('div', null,
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Time'),
                  React.createElement('input', {
                    type: "time",
                    defaultValue: "14:30",
                    className: "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  })
                ),
                React.createElement('div', { className: "min-w-0" },
                  React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 'Birth Date'),
                  React.createElement('input', {
                    type: "date",
                    defaultValue: "2024-01-15",
                    className: "w-full min-w-0 max-w-full appearance-none box-border px-4 py-3 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (time picker), BabySetupScreen (birth date)')
          ),

          // Tappable Text Input Row
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Tappable Text Input Row'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-3" },
                // Display state
                React.createElement('div', {
                  className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition',
                  onClick: () => {}
                },
                  React.createElement('div', { className: 'flex items-center' },
                    React.createElement('div', { className: 'text-xs font-medium text-gray-500' }, 'Target multiplier (oz/lb)'),
                    React.createElement('div', {
                      className: 'ml-2 w-4 h-4 rounded-full bg-gray-400 text-white text-[10px] flex items-center justify-center cursor-help',
                      title: 'Info tooltip'
                    }, 'i')
                  ),
                  React.createElement('div', { className: 'flex items-center justify-between mt-1' },
                    React.createElement('div', { className: 'text-base font-semibold text-gray-900' }, '2.5x'),
                    React.createElement(Edit2, { className: 'w-4 h-4 text-indigo-600' })
                  )
                ),
                // Edit state
                React.createElement('div', {
                  className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3'
                },
                  React.createElement('div', { className: 'flex items-center' },
                    React.createElement('div', { className: 'text-xs font-medium text-gray-500' }, 'Target multiplier (oz/lb)'),
                    React.createElement('div', {
                      className: 'ml-2 w-4 h-4 rounded-full bg-gray-400 text-white text-[10px] flex items-center justify-center cursor-help',
                      title: 'Info tooltip'
                    }, 'i')
                  ),
                  React.createElement('div', { className: 'flex items-center gap-2 mt-2' },
                    React.createElement('input', {
                      type: 'number',
                      step: '0.1',
                      defaultValue: '2.5',
                      className: 'w-28 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:border-indigo-500'
                    }),
                    React.createElement('span', { className: 'text-gray-600' }, 'x'),
                    React.createElement('button', {
                      className: 'h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-green-600'
                    }, React.createElement(Check, { className: 'w-5 h-5' })),
                    React.createElement('button', {
                      className: 'h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500'
                    }, React.createElement(X, { className: 'w-5 h-5' }))
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (Baby Info settings, Sleep settings)')
          ),

          // Textarea
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Textarea (Auto-growing)'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', {
                className: 'flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-gray-200',
                style: { boxShadow: '0 0 0 3px #EEF2FF' }
              },
                React.createElement('textarea', {
                  placeholder: 'Message',
                  rows: 1,
                  className: 'flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-[15px]',
                  style: { maxHeight: '100px' },
                  defaultValue: 'Sample message text',
                  onChange: (e) => {
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }),
                React.createElement('button', {
                  className: 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition',
                  style: { backgroundColor: '#4F46E5' }
                },
                  React.createElement(Send, { className: 'w-4 h-4 text-white' })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AIChatTab (message input)')
          )

        )
      ),

      // Cards section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Cards'),
        React.createElement('div', { className: "space-y-4" },
          // Default variant
          React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
            React.createElement('div', { className: "text-base font-semibold text-gray-800 mb-2" }, 'Default Card'),
            React.createElement('div', { className: "text-sm font-normal text-gray-600 mb-2" }, 'Standard card with shadow-sm and padding. Most common variant.'),
            React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: TrackerTab, AnalyticsTab stat/empty-state cards, FamilyTab, SettingsTab')
          ),
          
          // Inset variant
          React.createElement(TTCard, { variant: "inset", className: "rounded-xl", style: { height: '128px' } },
            React.createElement('div', { className: "p-4" },
              React.createElement('div', { className: "text-base font-semibold text-gray-800 mb-2" }, 'Inset Card'),
              React.createElement('div', { className: "text-sm font-normal text-gray-600 mb-2" }, 'For chart-like content. No default padding, shadow-sm, overflow-hidden.'),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: Daily Activity Chart container')
            )
          ),
          
          // Pressable variant
          React.createElement(TTCard, { 
            variant: "pressable",
            className: "rounded-xl",
            onClick: () => alert('Card clicked!')
          },
            React.createElement('div', { className: "text-base font-semibold text-gray-800 mb-2" }, 'Pressable Card'),
            React.createElement('div', { className: "text-sm font-normal text-gray-600 mb-2" }, 'Interactive card with hover/active states. Click or press Enter/Space.'),
            React.createElement('div', { className: "text-xs text-gray-500" }, 'Used in: (none yet; candidate for highlight tiles)')
          )
        )
      ),

      // Card Formats (Canonical) section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Card Formats (Canonical)'),
        React.createElement('div', { className: "space-y-6" },
          
          // Format 1: Today Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '1. Today Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center justify-between mb-8" },
                React.createElement('button', {
                  className: "p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition"
                }, React.createElement(ChevronLeft, { className: "w-5 h-5" })),
                React.createElement('h2', { className: "text-lg font-semibold text-gray-800" }, 'Today'),
                React.createElement('button', {
                  className: "p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition"
                }, React.createElement(ChevronRight, { className: "w-5 h-5" }))
              ),
              React.createElement('div', { className: "mb-8" },
                React.createElement('div', { className: "flex items-center justify-between mb-2" },
                  React.createElement('div', { className: "text-sm font-medium text-gray-600" }, "Feeding"),
                  React.createElement('div', { className: "text-xs text-gray-400" }, "Last fed at 8:02 am (4.0 oz)")
                ),
                React.createElement('div', { className: "relative w-full h-5 bg-gray-100 rounded-full overflow-hidden mb-2" },
                  React.createElement('div', {
                    className: "absolute left-0 top-0 h-full rounded-full",
                    style: { width: '35%', background: '#EB4899' }
                  })
                ),
                React.createElement('div', { className: "flex items-baseline justify-between" },
                  React.createElement('div', { className: "text-2xl font-semibold", style: { color: '#EB4899' } },
                    '8.0 ',
                    React.createElement('span', { className: "text-base font-normal text-gray-500" }, 'of 23.8 oz')
                  )
                )
              ),
              React.createElement('div', {},
                React.createElement('div', { className: "flex items-center justify-between mb-2" },
                  React.createElement('div', { className: "text-sm font-medium text-gray-600" }, "Sleep"),
                  React.createElement('div', { className: "text-xs text-gray-400" }, "Last slept at 10:15 pm (2.5 hrs)")
                ),
                React.createElement('div', { className: "relative w-full h-5 bg-gray-100 rounded-full overflow-hidden mb-2" },
                  React.createElement('div', {
                    className: "absolute left-0 top-0 h-full rounded-full",
                    style: { width: '42%', background: '#4F47E6' }
                  })
                ),
                React.createElement('div', { className: "flex items-baseline justify-between" },
                  React.createElement('div', { className: "text-2xl font-semibold", style: { color: '#4F47E6' } },
                    '10.1 ',
                    React.createElement('span', { className: "text-base font-normal text-gray-500" }, 'of 24.0 hrs')
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab')
          ),

          // Format 2: Input Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '2. Input Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "mt-3 mb-4 inline-flex w-full bg-gray-100 rounded-xl p-1" },
                React.createElement('button', {
                  className: "flex-1 py-2 rounded-lg bg-white shadow text-gray-900 font-semibold"
                }, 'Feed'),
                React.createElement('button', {
                  className: "flex-1 py-2 rounded-lg text-gray-600"
                }, 'Sleep')
              ),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('div', { className: "flex gap-3 min-w-0" },
                  React.createElement('input', {
                    type: "number",
                    placeholder: "Ounces",
                    className: "min-w-0 flex-1 px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  }),
                  React.createElement('button', {
                    className: "shrink-0 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600"
                  }, React.createElement(Clock, { className: "w-5 h-5" }))
                ),
                React.createElement('button', {
                  className: "w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                },
                  React.createElement(Plus, { className: "w-5 h-5" }),
                  'Add Feeding'
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab')
          ),

          // Format 3: Log Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '3. Log Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Feedings · 2'),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('div', { className: "flex justify-between items-center p-4 bg-gray-50 rounded-lg" },
                  React.createElement('div', { className: "flex items-center gap-3" },
                    React.createElement('div', { 
                      className: "bg-indigo-100 rounded-full flex items-center justify-center",
                      style: { width: '48px', height: '48px' }
                    },
                      React.createElement(Milk, { className: "w-6 h-6 text-indigo-600" })
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { className: "font-semibold text-gray-800" }, '4.0 oz'),
                      React.createElement('div', { className: "text-sm text-gray-500" }, '8:02 AM')
                    )
                  ),
                  React.createElement('div', { className: "flex gap-2" },
                    React.createElement('button', { className: "text-indigo-600 hover:text-indigo-700 transition" },
                      React.createElement(Edit2, { className: "w-5 h-5" })
                    ),
                    React.createElement('button', { className: "text-red-400 hover:text-red-600 transition" },
                      React.createElement(X, { className: "w-5 h-5" })
                    )
                  )
                ),
                React.createElement('div', { className: "flex justify-between items-center p-4 bg-gray-50 rounded-lg" },
                  React.createElement('div', { className: "flex items-center gap-3" },
                    React.createElement('div', { 
                      className: "bg-indigo-100 rounded-full flex items-center justify-center",
                      style: { width: '48px', height: '48px' }
                    },
                      React.createElement(Milk, { className: "w-6 h-6 text-indigo-600" })
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { className: "font-semibold text-gray-800" }, '3.5 oz'),
                      React.createElement('div', { className: "text-sm text-gray-500" }, '4:09 AM')
                    )
                  ),
                  React.createElement('div', { className: "flex gap-2" },
                    React.createElement('button', { className: "text-indigo-600 hover:text-indigo-700 transition" },
                      React.createElement(Edit2, { className: "w-5 h-5" })
                    ),
                    React.createElement('button', { className: "text-red-400 hover:text-red-600 transition" },
                      React.createElement(X, { className: "w-5 h-5" })
                    )
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab, FamilyTab'),
            
            // Format 3a: Log Card (Empty State)
            React.createElement('div', { className: "mt-4" },
              React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '3a. Log Card (Empty State)'),
              React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
                React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Feedings · 0'),
                React.createElement('p', { className: "text-gray-400 text-center py-8" }, 'No feedings logged for this day')
              ),
              React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab')
            )
          ),

          // Format 4: Stat Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '4. Stat Card'),
            React.createElement('div', { className: "grid grid-cols-2 gap-4" },
              React.createElement(TTCard, { variant: "default", className: "rounded-xl flex flex-col items-center justify-center text-center" },
                React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Oz / Feed'),
                React.createElement('div', { className: "text-2xl font-bold text-indigo-600" },
                  '3.6',
                  React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'oz')
                ),
                React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, '3-day avg')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab (2-up grid layout)')
          ),

          // Format 5: Highlight Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '5. Highlight Card'),
            React.createElement(TTCard, { 
              variant: "pressable",
              className: "rounded-xl"
            },
              React.createElement('div', { className: "flex items-center justify-between mb-3" },
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement(Milk, { className: "w-5 h-5", style: { color: '#EC4899' } }),
                  React.createElement('span', { className: "text-sm font-semibold", style: { color: '#EC4899' } }, 'Eating')
                ),
                React.createElement(ChevronRight, { className: "w-5 h-5 text-gray-400" })
              ),
              React.createElement('div', { className: "mb-3" },
                React.createElement('div', { className: "text-base font-bold text-gray-900 leading-tight" }, 
                  'Levi has been eating a bit less in the last three days. But that\'s totally fine!'
                )
              ),
              React.createElement('div', { className: "border-t border-gray-100 mb-3" }),
              // Visualization placeholder - structurally represents chart/actogram
              React.createElement('div', { 
                style: { height: '240px' }, 
                className: "bg-gray-50 rounded overflow-hidden relative"
              },
                // Grid lines to suggest chart structure
                React.createElement('div', { className: "absolute inset-0 flex flex-col justify-between py-4" },
                  React.createElement('div', { className: "border-t border-gray-200" }),
                  React.createElement('div', { className: "border-t border-gray-200" }),
                  React.createElement('div', { className: "border-t border-gray-200" }),
                  React.createElement('div', { className: "border-t border-gray-200" })
                ),
                // Placeholder bars/elements to suggest data visualization
                React.createElement('div', { className: "absolute inset-0 flex items-end justify-center gap-2 px-6 py-4" },
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '60%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '80%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '45%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '70%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '90%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '55%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '75%' } })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab')
          ),

          // Format 6: Chart Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '6. Chart Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2.5 text-center" }, 'Volume History'),
              React.createElement('div', { className: "relative" },
                React.createElement('div', {
                  className: "overflow-x-auto overflow-y-hidden -mx-6 px-6",
                  style: { scrollBehavior: 'smooth' }
                },
                  React.createElement('div', {
                    className: "flex gap-6 pb-2",
                    style: { minWidth: '560px' }
                  },
                    // Static placeholder bars with fixed heights
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '140px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '18.5'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 15'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '5 feeds')
                    ),
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '120px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '15.8'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 16'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '4 feeds')
                    ),
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '160px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '21.2'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 17'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '6 feeds')
                    ),
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '100px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '12.5'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 18'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '3 feeds')
                    ),
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '150px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '19.3'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 19'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '5 feeds')
                    ),
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '130px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '16.7'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 20'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '4 feeds')
                    ),
                    React.createElement('div', { className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                        React.createElement('div', {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2",
                          style: { height: '170px', minHeight: '30px' }
                        },
                          React.createElement('div', { className: "text-white font-semibold" },
                            React.createElement('span', { className: "text-xs" }, '20.1'),
                            React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                          )
                        )
                      ),
                      React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, 'Dec 21'),
                      React.createElement('div', { className: "text-xs text-gray-400" }, '6 feeds')
                    )
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab')
          ),

          // Format 7: Actogram Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '7. Actogram Card'),
            React.createElement(TTCard, { variant: "inset", className: "rounded-xl", style: { height: '464px' } },
              React.createElement('div', { className: "px-4 pt-4 pb-2 flex items-center justify-between" },
                React.createElement('button', { className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" },
                  React.createElement(ChevronLeft, { className: "w-5 h-5" })
                ),
                React.createElement('div', { className: "text-[16px] font-semibold text-gray-900" }, 'December 2024'),
                React.createElement('button', { className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" },
                  React.createElement(ChevronRight, { className: "w-5 h-5" })
                )
              ),
              // Static actogram placeholder
              React.createElement('div', { className: "flex-1 flex flex-col p-4" },
                // Time axis labels (left side)
                React.createElement('div', { className: "flex flex-1" },
                  React.createElement('div', { className: "w-12 flex flex-col justify-between text-xs text-gray-500 pr-2" },
                    React.createElement('div', null, '12 AM'),
                    React.createElement('div', null, '6 AM'),
                    React.createElement('div', null, '12 PM'),
                    React.createElement('div', null, '6 PM'),
                    React.createElement('div', null, '12 AM')
                  ),
                  // Chart area with static blocks
                  React.createElement('div', { className: "flex-1 flex gap-1" },
                    // Day columns
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '40px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '30px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '50px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '35px' } })
                    ),
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '45px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '25px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '55px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '30px' } })
                    ),
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '35px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '40px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '48px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '28px' } })
                    ),
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '42px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '32px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '52px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '33px' } })
                    ),
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '38px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '36px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '50px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '31px' } })
                    ),
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '44px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '29px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '54px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '35px' } })
                    ),
                    React.createElement('div', { className: "flex-1 flex flex-col gap-1" },
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '40px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '34px' } }),
                      React.createElement('div', { className: "flex-1 bg-indigo-200 rounded", style: { minHeight: '49px' } }),
                      React.createElement('div', { className: "flex-1 bg-blue-200 rounded", style: { minHeight: '32px' } })
                    )
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab, Daily Activity Chart')
          ),

          // Format 8: Settings/Form Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '8. Settings/Form Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Baby Info'),
              React.createElement('div', { className: "flex items-start gap-4 mb-6" },
                React.createElement('div', { className: "w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center relative" },
                  React.createElement(Baby, { className: "w-12 h-12 text-indigo-600" }),
                  React.createElement('div', {
                    className: "absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-white"
                  },
                    React.createElement(Camera, { className: "w-4 h-4 text-white" })
                  )
                ),
                React.createElement('div', { className: "flex-1 space-y-2" },
                  React.createElement('div', { className: "text-lg font-semibold text-gray-800" }, 'Levi'),
                  React.createElement('div', { className: "text-sm text-gray-600" }, '2 months old'),
                  React.createElement('div', { className: "text-xs text-gray-500" }, 'Owner: You')
                )
              ),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('div', { className: "flex items-center justify-between" },
                  React.createElement('div', { className: "text-sm text-gray-600" }, 'Birth date: 10/21/2025'),
                  React.createElement('button', { className: "text-indigo-600" },
                    React.createElement(Edit2, { className: "w-5 h-5" })
                  )
                ),
                React.createElement('div', { className: "flex items-center justify-between" },
                  React.createElement('div', { className: "text-sm text-gray-600" }, 'Current weight: 9.5 lbs'),
                  React.createElement('button', { className: "text-indigo-600" },
                    React.createElement(Edit2, { className: "w-5 h-5" })
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (Baby Info, Sleep settings)')
          ),

          // Format 9: Selection List Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '9. Selection List Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center justify-between mb-3" },
                React.createElement('h2', { className: "text-lg font-semibold text-gray-800" }, 'Kids'),
                React.createElement('button', { className: "text-sm font-medium text-indigo-600 hover:text-indigo-700" }, '+ Add Child')
              ),
              React.createElement('div', { className: "space-y-2" },
                React.createElement('button', {
                  className: "w-full px-4 py-3 rounded-lg border border-indigo-500 bg-indigo-50 text-gray-900 flex items-center justify-between text-sm"
                },
                  React.createElement('span', { className: "font-medium" }, 'Levi'),
                  React.createElement('span', { className: "text-xs font-semibold text-indigo-600" }, 'Active')
                ),
                React.createElement('button', {
                  className: "w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 flex items-center justify-between text-sm"
                },
                  React.createElement('span', { className: "font-medium" }, 'Emma')
                )
              ),
              React.createElement('p', { className: "mt-3 text-xs text-gray-500" }, 
                'Active kid controls what you see in Tracker, Analytics, and AI Chat.'
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (Kids card)')
          ),

          // Format 10: Member List Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '10. Member List Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Family Members'),
              React.createElement('div', { className: "space-y-3 mb-4" },
                React.createElement('div', { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg" },
                  React.createElement('div', { className: "w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold" }, 'A'),
                  React.createElement('div', { className: "flex-1 min-w-0" },
                    React.createElement('div', { className: "text-sm font-medium text-gray-800 truncate" }, 'Adam Lebowski'),
                    React.createElement('div', { className: "text-xs text-gray-500 truncate" }, 'adam@example.com')
                  )
                ),
                React.createElement('div', { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg" },
                  React.createElement('div', { className: "w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold" }, 'M'),
                  React.createElement('div', { className: "flex-1 min-w-0" },
                    React.createElement('div', { className: "text-sm font-medium text-gray-800 truncate" }, 'Marlene Bernstein'),
                    React.createElement('div', { className: "text-xs text-gray-500 truncate" }, 'mar@example.com')
                  ),
                  React.createElement('button', { className: "text-xs text-red-500 font-medium hover:text-red-600" }, 'Remove')
                )
              ),
              React.createElement('button', {
                className: "w-full bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 py-3"
              },
                React.createElement(UserPlus, { className: "w-5 h-5" }),
                '+ Invite Partner'
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (Family Members)')
          ),

          // Format 11: Account Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '11. Account Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Account'),
              React.createElement('div', { className: "space-y-3" },
                React.createElement('div', { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg" },
                  React.createElement('div', null,
                    React.createElement('div', { className: "text-sm font-medium text-gray-800" }, 'Adam Lebowski'),
                    React.createElement('div', { className: "text-xs text-gray-500" }, 'adam@example.com')
                  ),
                  React.createElement('div', { className: "w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold" }, 'A')
                ),
                React.createElement('button', {
                  className: "w-full bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 transition"
                }, 'Sign Out'),
                React.createElement('button', {
                  className: "w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                }, 'Delete My Account')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: SettingsTab')
          ),

          // Format 12: Share Card
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, '12. Share Card'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Share & Support'),
              React.createElement('button', {
                className: "w-full bg-indigo-50 text-indigo-600 py-3 rounded-lg font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2"
              },
                React.createElement(ShareIcon, { className: "w-5 h-5" }),
                'Share Tiny Tracker'
              ),
              React.createElement('p', { className: "text-xs text-gray-500 mt-2 text-center" }, 
                'Tell other parents about Tiny Tracker!'
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: SettingsTab')
          )

        )
      ),

      // Toggles section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Toggles'),
        React.createElement('div', { className: "space-y-6" },
          
          // TimeframeToggle (D/W/M)
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Timeframe Toggle (D/W/M)'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement(TimeframeToggle, {
                value: 'week',
                onChange: () => {},
                className: "mb-2"
              }),
              React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab')
            )
          ),

          // SegmentedToggle (Compact)
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Segmented Toggle (Compact)'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex flex-wrap gap-4 items-center" },
                React.createElement(SegmentedToggle, {
                  value: 'feeding',
                  options: [
                    { value: 'feeding', label: 'Feed' },
                    { value: 'sleep', label: 'Sleep' }
                  ],
                  onChange: () => {},
                  variant: 'body',
                  size: 'medium'
                }),
                React.createElement(SegmentedToggle, {
                  value: 'option1',
                  options: [
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' }
                  ],
                  onChange: () => {},
                  variant: 'body',
                  size: 'medium'
                })
              ),
              React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab')
            )
          ),

          // AnalyticsSubpageToggle (Full Width - used on subpages)
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Analytics Subpage Toggle (Full Width)'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement(AnalyticsSubpageToggle, {
                value: 'day',
                options: [
                  { key: 'day', label: 'Day', mapsTo: 'day' },
                  { key: 'week', label: 'Week', mapsTo: 'week' },
                  { key: 'month', label: 'Month', mapsTo: 'month' }
                ],
                onChange: () => {},
                ariaLabel: 'Time range'
              }),
              React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab subpages (modals)')
            )
          )

        )
      ),

      // Timers section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Timers'),
        React.createElement('div', { className: "space-y-6" },
          
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Sleep Timer Display'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-4" },
                // Start/End time inputs (2-column grid)
                React.createElement('div', { className: "grid grid-cols-2 gap-4 text-center" },
                  React.createElement('div', null,
                    React.createElement('div', { className: "text-sm text-gray-500 mb-1" }, 'Start'),
                    React.createElement('div', {
                      className: "inline-block px-3 py-2 rounded-lg bg-gray-50 text-indigo-600 font-semibold text-lg"
                    }, '10:15 PM')
                  ),
                  React.createElement('div', null,
                    React.createElement('div', { className: "text-sm text-gray-500 mb-1" }, 'End'),
                    React.createElement('div', {
                      className: "inline-block px-3 py-2 rounded-lg bg-gray-50 text-indigo-600 font-semibold text-lg"
                    }, '--:--')
                  )
                ),
                // Large elapsed time display
                React.createElement('div', { className: "text-center text-4xl font-semibold my-2" }, '45:23'),
                // End Sleep button
                React.createElement('button', {
                  className: "w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold"
                }, 'End Sleep')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (Sleep logging)')
          )

        )
      ),

      // Analytics Elements section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Analytics Elements'),
        React.createElement('div', { className: "space-y-6" },
          
          // Stat Cards Grid
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Stat Cards (2-up Grid)'),
            React.createElement('div', { className: "grid grid-cols-2 gap-4" },
              React.createElement(TTCard, { variant: "default", className: "rounded-xl flex flex-col items-center justify-center text-center" },
                React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Oz / Feed'),
                React.createElement('div', { className: "text-2xl font-bold text-indigo-600" },
                  '3.6',
                  React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'oz')
                ),
                React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, '3-day avg')
              ),
              React.createElement(TTCard, { variant: "default", className: "rounded-xl flex flex-col items-center justify-center text-center" },
                React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Feeds / Day'),
                React.createElement('div', { className: "text-2xl font-bold text-indigo-600" },
                  '5.2',
                  React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'feeds')
                ),
                React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, '7-day avg')
              ),
              React.createElement(TTCard, { variant: "default", className: "rounded-xl flex flex-col items-center justify-center text-center" },
                React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Sleep / Day'),
                React.createElement('div', { className: "text-2xl font-bold text-indigo-600" },
                  '14.5',
                  React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'hrs')
                ),
                React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, '7-day avg')
              ),
              React.createElement(TTCard, { variant: "default", className: "rounded-xl flex flex-col items-center justify-center text-center" },
                React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Night Sleep'),
                React.createElement('div', { className: "text-2xl font-bold text-indigo-600" },
                  '11.2',
                  React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'hrs')
                ),
                React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, 'Last night')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab')
          ),

          // Highlight Card (simplified)
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Highlight Card'),
            React.createElement(TTCard, { 
              variant: "pressable",
              className: "rounded-xl"
            },
              React.createElement('div', { className: "flex items-center justify-between mb-3" },
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement(Milk, { className: "w-5 h-5", style: { color: '#EC4899' } }),
                  React.createElement('span', { className: "text-sm font-semibold", style: { color: '#EC4899' } }, 'Eating')
                ),
                React.createElement(ChevronRight, { className: "w-5 h-5 text-gray-400" })
              ),
              React.createElement('div', { className: "mb-3" },
                React.createElement('div', { className: "text-base font-bold text-gray-900 leading-tight" }, 
                  'Levi has been eating a bit less in the last three days. But that\'s totally fine!'
                )
              ),
              React.createElement('div', { className: "border-t border-gray-100 mb-3" }),
              React.createElement('div', { 
                style: { height: '240px' }, 
                className: "bg-gray-50 rounded overflow-hidden relative"
              },
                React.createElement('div', { className: "absolute inset-0 flex flex-col justify-between py-4" },
                  React.createElement('div', { className: "border-t border-gray-200" }),
                  React.createElement('div', { className: "border-t border-gray-200" }),
                  React.createElement('div', { className: "border-t border-gray-200" }),
                  React.createElement('div', { className: "border-t border-gray-200" })
                ),
                React.createElement('div', { className: "absolute inset-0 flex items-end justify-center gap-2 px-6 py-4" },
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '60%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '80%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '45%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '70%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '90%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '55%' } }),
                  React.createElement('div', { className: "w-8 bg-gray-300 rounded-t", style: { height: '75%' } })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AnalyticsTab')
          )

        )
      ),

      // Progress Bars section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Progress Bars'),
        React.createElement('div', { className: "space-y-6" },
          
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Progress Bar Row'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-6" },
                // Feeding progress
                React.createElement('div', { className: "mt-5" },
                  React.createElement('div', { className: "text-sm font-medium text-gray-700 mb-1" }, 'Feeding'),
                  React.createElement('div', { className: "relative w-full h-4 bg-gray-200 rounded-full overflow-hidden" },
                    React.createElement('div', {
                      className: "absolute left-0 top-0 h-full bg-indigo-600 rounded-full",
                      style: { width: '35%', transition: "width 300ms ease-out" }
                    })
                  ),
                  React.createElement('div', { className: "mt-1 flex items-baseline justify-between" },
                    React.createElement('div', { className: "text-base font-semibold text-indigo-600" },
                      '8.0 oz ',
                      React.createElement('span', { className: "text-sm font-normal text-gray-500" }, 'of 23.8 oz')
                    ),
                    React.createElement('div', { className: "text-xs font-medium" },
                      React.createElement('span', { className: "text-green-600 font-semibold" }, '+2.5 oz'),
                      React.createElement('span', { className: "text-gray-400 font-normal ml-1" }, "vs yday")
                    )
                  )
                ),
                // Sleep progress
                React.createElement('div', { className: "mt-5" },
                  React.createElement('div', { className: "text-sm font-medium text-gray-700 mb-1" }, 'Sleep'),
                  React.createElement('div', { className: "relative w-full h-4 bg-gray-200 rounded-full overflow-hidden" },
                    React.createElement('div', {
                      className: "absolute left-0 top-0 h-full bg-indigo-600 rounded-full",
                      style: { width: '42%', transition: "width 300ms ease-out" }
                    })
                  ),
                  React.createElement('div', { className: "mt-1 flex items-baseline justify-between" },
                    React.createElement('div', { className: "text-base font-semibold text-indigo-600" },
                      '10.1 hrs ',
                      React.createElement('span', { className: "text-sm font-normal text-gray-500" }, 'of 24.0 hrs')
                    ),
                    React.createElement('div', { className: "text-xs font-medium" },
                      React.createElement('span', { className: "text-red-600 font-semibold" }, '-0.5 hrs'),
                      React.createElement('span', { className: "text-gray-400 font-normal ml-1" }, "vs yday")
                    )
                  )
                ),
                // Complete progress
                React.createElement('div', { className: "mt-5" },
                  React.createElement('div', { className: "text-sm font-medium text-gray-700 mb-1" }, 'Complete'),
                  React.createElement('div', { className: "relative w-full h-4 bg-gray-200 rounded-full overflow-hidden" },
                    React.createElement('div', {
                      className: "absolute left-0 top-0 h-full bg-green-500 rounded-full",
                      style: { width: '100%', transition: "width 300ms ease-out" }
                    })
                  ),
                  React.createElement('div', { className: "mt-1 flex items-baseline justify-between" },
                    React.createElement('div', { className: "text-base font-semibold text-green-600" },
                      '25.0 oz ',
                      React.createElement('span', { className: "text-sm font-normal text-gray-500" }, 'of 25.0 oz')
                    ),
                    React.createElement('div', { className: "text-xs font-medium" },
                      React.createElement('span', { className: "text-green-600 font-semibold" }, '✓ Complete')
                    )
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (Today Card)')
          )

        )
      ),

      // Chat Elements section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Chat Elements'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Message Bubbles'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "space-y-4" },
                // User message
                React.createElement('div', { className: "flex justify-end" },
                  React.createElement('div', {
                    className: "max-w-[75%] rounded-lg px-4 py-3 bg-indigo-600 text-white"
                  },
                    React.createElement('div', { className: "whitespace-pre-wrap text-[15px]" }, 'This is a user message'),
                    React.createElement('div', { className: "text-[11px] mt-1 text-indigo-200" }, '2:30 PM')
                  )
                ),
                // Assistant message
                React.createElement('div', { className: "flex justify-start" },
                  React.createElement('div', {
                    className: "max-w-[75%] rounded-lg px-4 py-3 bg-gray-200 text-gray-900"
                  },
                    React.createElement('div', { className: "font-semibold text-sm text-gray-700 mb-1" }, 'Tiny Tracker'),
                    React.createElement('div', { className: "whitespace-pre-wrap text-[15px]" }, 'This is an assistant message'),
                    React.createElement('div', { className: "text-[11px] mt-1 text-gray-500" }, '2:31 PM')
                  )
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AIChatTab (conversation messages)')
          ),
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Circular Send Button'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center justify-center gap-4" },
                React.createElement('button', {
                  className: "w-8 h-8 rounded-full flex items-center justify-center transition",
                  style: { backgroundColor: '#4F46E5' }
                },
                  React.createElement(Send, { className: "w-4 h-4 text-white" })
                ),
                React.createElement('button', {
                  className: "w-8 h-8 rounded-full flex items-center justify-center transition opacity-30",
                  style: { backgroundColor: '#4F46E5' },
                  disabled: true
                },
                  React.createElement(Send, { className: "w-4 h-4 text-white" })
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: AIChatTab (send button, disabled when empty)')
          )
        )
      ),

      // Navigation Elements section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Navigation Elements'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Bottom Navigation Tab'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center justify-around py-3" },
                React.createElement('button', {
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: { color: '#4F46E5' }
                },
                  React.createElement(BarChart, { className: "w-6 h-6" }),
                  React.createElement('span', { className: "text-xs font-medium" }, 'Tracker')
                ),
                React.createElement('button', {
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: { color: '#9CA3AF' }
                },
                  React.createElement(TrendingUp, { className: "w-6 h-6" }),
                  React.createElement('span', { className: "text-xs font-medium" }, 'Analytics')
                ),
                React.createElement('button', {
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: { color: '#9CA3AF' }
                },
                  React.createElement(MessageCircle, { className: "w-6 h-6" }),
                  React.createElement('span', { className: "text-xs font-medium" }, 'AI Chat')
                ),
                React.createElement('button', {
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: { color: '#9CA3AF' }
                },
                  React.createElement(Users, { className: "w-6 h-6" }),
                  React.createElement('span', { className: "text-xs font-medium" }, 'Family')
                ),
                React.createElement('button', {
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: { color: '#9CA3AF' }
                },
                  React.createElement(Menu, { className: "w-6 h-6" }),
                  React.createElement('span', { className: "text-xs font-medium" }, 'Settings')
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: MainApp (bottom navigation bar)')
          )
        )
      ),

      // Avatar & Profile Elements section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Avatar & Profile Elements'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Initial Circle Avatar'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('div', {
                  className: "w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold"
                }, 'A'),
                React.createElement('div', {
                  className: "w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold"
                }, 'M'),
                React.createElement('div', {
                  className: "w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-2xl"
                }, 'A')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (family members), SettingsTab (account)')
          )
        )
      ),

      // Theme Picker section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Theme Picker'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Color Swatch Selector'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center gap-3" },
                React.createElement('button', {
                  className: "w-9 h-9 rounded-full border-2 border-indigo-600 flex items-center justify-center",
                  style: { backgroundColor: '#E0E7FF' }
                },
                  React.createElement('div', {
                    className: "w-4 h-4 rounded-full",
                    style: { backgroundColor: '#4F46E5' }
                  })
                ),
                React.createElement('button', {
                  className: "w-9 h-9 rounded-full border-2 border-transparent flex items-center justify-center",
                  style: { backgroundColor: '#FCE7F3' }
                }),
                React.createElement('button', {
                  className: "w-9 h-9 rounded-full border-2 border-transparent flex items-center justify-center",
                  style: { backgroundColor: '#D1FAE5' }
                }),
                React.createElement('button', {
                  className: "w-9 h-9 rounded-full border-2 border-transparent flex items-center justify-center",
                  style: { backgroundColor: '#FEF3C7' }
                }),
                React.createElement('button', {
                  className: "w-9 h-9 rounded-full border-2 border-transparent flex items-center justify-center",
                  style: { backgroundColor: '#E0E7FF' }
                })
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (app color picker)')
          )
        )
      ),

      // Info Elements section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Info Elements'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Info Dot'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('span', { className: "text-xs font-medium text-gray-500" }, 'Target multiplier (oz/lb)'),
                  React.createElement('div', {
                    className: "w-4 h-4 rounded-full bg-gray-400 text-white text-[10px] flex items-center justify-center cursor-help",
                    title: 'Info tooltip'
                  }, 'i')
                )
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: FamilyTab (settings with tooltips)')
          )
        )
      ),

      // Loading & Empty States section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Loading & Empty States'),
        React.createElement('div', { className: "space-y-6" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Loading Spinner'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "flex items-center justify-center py-8" },
                React.createElement('div', {
                  className: "animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"
                })
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: App (initial load)')
          ),
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Empty State'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Feedings · 0'),
              React.createElement('p', { className: "text-gray-400 text-center py-8" }, 'No feedings logged for this day')
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: TrackerTab (empty log cards)')
          ),
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Error Message'),
            React.createElement(TTCard, { variant: "default", className: "rounded-xl" },
              React.createElement('div', { className: "bg-red-50 border border-red-200 rounded-lg p-4" },
                React.createElement('div', { className: "text-sm font-medium text-red-800 mb-1" }, 'Error'),
                React.createElement('div', { className: "text-sm text-red-700" }, 'Something went wrong. Please try again.')
              )
            ),
            React.createElement('div', { className: "text-xs text-gray-500 mt-2" }, 'Used in: LoginScreen, various error states')
          )
        )
      ),

      // Pills section
      React.createElement('div', { className: "mb-6" },
        React.createElement('div', { className: "border-t border-gray-100 pt-6 mb-4" }),
        React.createElement('h3', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Pills / Badges'),
        React.createElement('div', { className: "space-y-3" },
          React.createElement('div', { className: "flex flex-wrap gap-2" },
            React.createElement('span', { className: "px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600" }, 'Active'),
            React.createElement('span', { className: "px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" }, 'Inactive'),
            React.createElement('span', { className: "px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600" }, 'Complete'),
            React.createElement('span', { className: "px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600" }, 'Error')
          )
        )
      ),

      // Shared Bottom Sheet for EditableRow
      React.createElement(TTBottomSheet, {
        isOpen: editorState.isOpen,
        title: editorState.type === 'datetime' ? 'Date & Time' : editorState.type === 'notes' ? 'Notes' : 'Edit',
        onDone: () => {
          if (editorState.type === 'datetime') {
            const input = document.getElementById('tt-editor-datetime-input');
            if (input && input.value) {
              const date = new Date(input.value);
              if (!isNaN(date.getTime())) {
                handleEditorSave(date.toISOString());
              } else {
                closeEditor();
              }
            } else {
              closeEditor();
            }
          } else if (editorState.type === 'notes') {
            const textarea = document.getElementById('tt-editor-notes-input');
            if (textarea) {
              handleEditorSave(textarea.value);
            } else {
              closeEditor();
            }
          } else {
            closeEditor();
          }
        }
      },
        editorState.type === 'datetime' && React.createElement('div', { className: "space-y-4" },
          React.createElement('input', {
            id: 'tt-editor-datetime-input',
            type: 'datetime-local',
            defaultValue: editorState.initialValue ? new Date(editorState.initialValue).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            className: "w-full px-4 py-3 text-base border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-400",
            style: { fontSize: '16px' } // Prevent zoom on iOS
          })
        ),
        editorState.type === 'notes' && React.createElement('div', { className: "space-y-4" },
          React.createElement('textarea', {
            id: 'tt-editor-notes-input',
            defaultValue: editorState.initialValue || '',
            placeholder: 'Add notes...',
            rows: 6,
            className: "w-full px-4 py-3 text-base border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-400 resize-none",
            style: { fontSize: '16px' }, // Prevent zoom on iOS
            autoFocus: true
          })
        )
      )
    );
  }

  // Main Settings page
  return React.createElement('div', { className: "space-y-4" },

    // Appearance Card
    React.createElement(TTCard, { variant: "default" },
      React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Appearance'),
      React.createElement('div', { className: "grid grid-cols-2 gap-4" },
        // Top Left: Background Theme
        React.createElement('div', null,
          React.createElement('div', { className: "text-xs mb-1", style: { color: 'var(--tt-text-secondary)' } }, 'Background Theme'),
          React.createElement('div', { className: "flex gap-2" },
            React.createElement('button', {
              type: 'button',
              onClick: async () => {
                await handleAppearanceChange({ background: "health-gray" });
              },
              className: "w-11 h-11 rounded-full border-2 transition-all",
              style: { 
                backgroundColor: (appearance.darkMode ? BACKGROUND_COLORS.dark['health-gray'] : BACKGROUND_COLORS.light['health-gray']),
                borderColor: appearance.background === "health-gray" ? (appearance.darkMode ? 'white' : '#333') : 'transparent',
                boxShadow: appearance.background === "health-gray" 
                  ? (appearance.darkMode 
                      ? '0 0 0 1.5px var(--tt-text-primary)' 
                      : '0 0 0 1.5px var(--tt-card-bg)')
                  : 'none',
                transition: 'all 0.12s ease'
              },
              title: 'Gray'
            }),
            React.createElement('button', {
              type: 'button',
              onClick: async () => {
                await handleAppearanceChange({ background: "eggshell" });
              },
              className: "w-11 h-11 rounded-full border-2 transition-all",
              style: { 
                backgroundColor: (appearance.darkMode ? BACKGROUND_COLORS.dark['eggshell'] : BACKGROUND_COLORS.light['eggshell']),
                borderColor: appearance.background === "eggshell" ? (appearance.darkMode ? 'white' : '#333') : 'transparent',
                boxShadow: appearance.background === "eggshell" 
                  ? (appearance.darkMode 
                      ? '0 0 0 1.5px var(--tt-text-primary)' 
                      : '0 0 0 1.5px var(--tt-card-bg)')
                  : 'none',
                transition: 'all 0.12s ease'
              },
              title: 'Coffee'
            })
          ),
          null
        ),

        // Top Right: Dark Mode
        React.createElement('div', null,
          React.createElement('div', { className: "text-xs mb-1", style: { color: 'var(--tt-text-secondary)' } }, 'Dark Mode'),
          window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
            value: appearance.darkMode ? 'dark' : 'light',
            options: [
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' }
            ],
            onChange: async (value) => {
              await handleAppearanceChange({ darkMode: value === 'dark' });
            },
            variant: 'body',
            size: 'medium'
          })
        ),

        // Bottom Left: Feed Accent
        React.createElement('div', null,
          React.createElement('div', { className: "text-xs mb-1", style: { color: 'var(--tt-text-secondary)' } }, 'Feed Accent'),
          React.createElement('button', {
            type: 'button',
            onClick: () => setShowFeedColorModal(true),
            className: "flex items-center gap-2 py-2 rounded-lg transition w-full justify-start",
            style: {
              backgroundColor: 'var(--tt-card-bg)',
              paddingLeft: '0',
              paddingRight: '12px'
            }
          },
            React.createElement('div', {
              className: "w-11 h-11 rounded-full border-2",
              style: { 
                backgroundColor: getPreviewColor(appearance.feedAccent, feedVariant, appearance.darkMode),
                borderColor: 'var(--tt-card-border)'
              }
            }),
            React.createElement(ChevronDown, { 
              className: "w-4 h-4", 
              style: { color: 'var(--tt-text-secondary)' } 
            })
          )
        ),

        // Bottom Right: Sleep Accent
        React.createElement('div', null,
          React.createElement('div', { className: "text-xs mb-1", style: { color: 'var(--tt-text-secondary)' } }, 'Sleep Accent'),
          React.createElement('button', {
            type: 'button',
            onClick: () => setShowSleepColorModal(true),
            className: "flex items-center gap-2 py-2 rounded-lg transition w-full justify-start",
            style: {
              backgroundColor: 'var(--tt-card-bg)',
              paddingLeft: '0',
              paddingRight: '12px'
            }
          },
            React.createElement('div', {
              className: "w-11 h-11 rounded-full border-2",
              style: { 
                backgroundColor: getPreviewColor(appearance.sleepAccent, sleepVariant, appearance.darkMode),
                borderColor: 'var(--tt-card-border)'
              }
            }),
            React.createElement(ChevronDown, { 
              className: "w-4 h-4", 
              style: { color: 'var(--tt-text-secondary)' } 
            })
          )
        )
      )
    ),

    // Feed Color Modal
    window.TTHalfSheet && React.createElement(window.TTHalfSheet, {
      isOpen: showFeedColorModal,
      onClose: () => setShowFeedColorModal(false),
      title: '',
      accentColor: getPreviewColor(appearance.feedAccent, feedVariant, appearance.darkMode),
      titleElement: window.SegmentedToggle ? React.createElement(window.SegmentedToggle, {
        value: feedVariant,
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'soft', label: 'Soft' }
        ],
        onChange: setFeedVariant,
        variant: 'header',
        size: 'medium'
      }) : null,
      rightAction: React.createElement('div', { className: "w-6" })
    },
      React.createElement('div', { className: "px-6 py-6" },
        // Color Grid (fixed spacing)
        React.createElement('div', { 
          className: "grid grid-cols-5",
          style: { 
            gap: '16px',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            justifyItems: 'center'
          }
        },
          COLOR_DEFINITIONS.map((colorDef) => {
            const variantColors = colorDef[feedVariant] || colorDef.normal;
            const displayColor = appearance.darkMode ? variantColors.dark : variantColors.light;
            const isSelected = appearance.feedAccent === colorDef.normal.light || 
                              appearance.feedAccent === colorDef.normal.dark ||
                              appearance.feedAccent === colorDef.soft.light ||
                              appearance.feedAccent === colorDef.soft.dark;
            return React.createElement('button', {
              key: colorDef.name,
              type: 'button',
              onClick: async () => {
                await handleAppearanceChange({ feedAccent: colorDef.normal.light });
                setShowFeedColorModal(false);
              },
              className: `rounded-full border-2 transition-all`,
              style: { 
                width: '44px',
                height: '44px',
                backgroundColor: displayColor,
                borderColor: isSelected ? (appearance.darkMode ? 'white' : '#333') : 'transparent',
                boxShadow: isSelected 
                  ? (appearance.darkMode 
                      ? '0 0 0 1.5px var(--tt-text-primary)' 
                      : '0 0 0 1.5px var(--tt-card-bg)')
                  : 'none',
                transform: 'scale(1)',
                transition: 'all 0.12s ease',
                position: 'relative'
              },
              onMouseEnter: (e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.zIndex = '10';
                }
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '1';
              },
              title: colorDef.name
            });
          })
        )
      )
    ),

    // Sleep Color Modal
    window.TTHalfSheet && React.createElement(window.TTHalfSheet, {
      isOpen: showSleepColorModal,
      onClose: () => setShowSleepColorModal(false),
      title: '',
      accentColor: getPreviewColor(appearance.sleepAccent, sleepVariant, appearance.darkMode),
      titleElement: window.SegmentedToggle ? React.createElement(window.SegmentedToggle, {
        value: sleepVariant,
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'soft', label: 'Soft' }
        ],
        onChange: setSleepVariant,
        variant: 'header',
        size: 'medium'
      }) : null,
      rightAction: React.createElement('div', { className: "w-6" })
    },
      React.createElement('div', { className: "px-6 py-6" },
        // Color Grid (fixed spacing)
        React.createElement('div', { 
          className: "grid grid-cols-5",
          style: { 
            gap: '16px',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            justifyItems: 'center'
          }
        },
          COLOR_DEFINITIONS.map((colorDef) => {
            const variantColors = colorDef[sleepVariant] || colorDef.normal;
            const displayColor = appearance.darkMode ? variantColors.dark : variantColors.light;
            const isSelected = appearance.sleepAccent === colorDef.normal.light || 
                              appearance.sleepAccent === colorDef.normal.dark ||
                              appearance.sleepAccent === colorDef.soft.light ||
                              appearance.sleepAccent === colorDef.soft.dark;
            return React.createElement('button', {
              key: colorDef.name,
              type: 'button',
              onClick: async () => {
                await handleAppearanceChange({ sleepAccent: colorDef.normal.light });
                setShowSleepColorModal(false);
              },
              className: `rounded-full border-2 transition-all`,
              style: { 
                width: '44px',
                height: '44px',
                backgroundColor: displayColor,
                borderColor: isSelected ? (appearance.darkMode ? 'white' : '#333') : 'transparent',
                boxShadow: isSelected 
                  ? (appearance.darkMode 
                      ? '0 0 0 1.5px var(--tt-text-primary)' 
                      : '0 0 0 1.5px var(--tt-card-bg)')
                  : 'none',
                transform: 'scale(1)',
                transition: 'all 0.12s ease',
                position: 'relative'
              },
              onMouseEnter: (e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.zIndex = '10';
                }
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '1';
              },
              title: colorDef.name
            });
          })
        )
      )
    ),

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
    ),

    // Account Card
    React.createElement('div', { className: "rounded-2xl shadow-lg p-6", style: { backgroundColor: 'var(--tt-card-bg)' } },
      React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Account'),
      React.createElement('div', { className: "space-y-3" },

        // User Profile Display
        React.createElement('div', { className: "flex items-center justify-between p-3 rounded-lg", style: { backgroundColor: 'var(--tt-card-bg)' } },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-medium", style: { color: 'var(--tt-text-primary)' } }, user.displayName || 'User'),
            React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, user.email)
          ),
          user.photoURL &&
            React.createElement('img', {
              src: user.photoURL,
              alt: user.displayName,
              className: "w-10 h-10 rounded-full"
            })
        ),

        // Sign Out Button
        React.createElement('button', {
          onClick: handleSignOut,
          className: "w-full py-3 rounded-xl font-semibold transition",
          style: {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444'
          }
        }, 'Sign Out'),

        // Delete Account Button (Destructive)
        React.createElement('button', {
          onClick: handleDeleteAccount,
          className: "w-full py-3 rounded-xl font-semibold transition",
          style: {
            backgroundColor: '#ef4444',
            color: 'white'
          }
        }, 'Delete My Account')
      )
    ),

    // Internal Card (formerly About)
    React.createElement('div', { className: "rounded-2xl shadow-lg p-6", style: { backgroundColor: 'var(--tt-card-bg)' } },
      React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Internal'),
      React.createElement('button', {
        onClick: () => setShowUILab(true),
        className: "w-full py-3 rounded-xl font-semibold transition",
        style: {
          backgroundColor: 'var(--tt-feed-soft)',
          color: 'var(--tt-feed)'
        }
      }, 'UI Lab')
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.SettingsTab = SettingsTab;
