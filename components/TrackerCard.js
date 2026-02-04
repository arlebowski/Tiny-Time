// TrackerCard Component (UI Lab version)
// Copied from inline implementation in script.js

// Icon components (needed before script.js loads)
const ChevronDown = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "6 9 12 15 18 9" })
);

const ChevronUp = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "18 15 12 9 6 15" })
);

// Additional icons for detail sheets
const EditIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('path', { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
  React.createElement('path', { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
);

const PenIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.25",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('path', { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
);

const CalendarIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('rect', { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
  React.createElement('line', { x1: "16", y1: "2", x2: "16", y2: "6" }),
  React.createElement('line', { x1: "8", y1: "2", x2: "8", y2: "6" }),
  React.createElement('line', { x1: "3", y1: "10", x2: "21", y2: "10" })
);

const PlusIconLocal = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
  React.createElement('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
);

const CheckIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "20 6 9 17 4 12" })
);

const ClockIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
  React.createElement('polyline', { points: "12 6 12 12 16 14" })
);

const XIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('path', { d: "M18 6 6 18" }),
  React.createElement('path', { d: "m6 6 12 12" })
);

// Expose icons globally so script.js can use them
if (typeof window !== 'undefined') {
  window.ChevronDown = ChevronDown;
  window.ChevronUp = ChevronUp;
  window.EditIcon = EditIcon;
  window.CalendarIcon = CalendarIcon;
  window.PlusIconLocal = PlusIconLocal;
  window.CheckIcon = CheckIcon;
  window.ClockIcon = ClockIcon;
  window.XIcon = XIcon;
  window.PenIcon = PenIcon;
}

// Ensure zZz animation styles are injected
function ensureZzzStyles() {
  if (document.getElementById('tt-zzz-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-zzz-anim';
  style.textContent = `
    @keyframes floatingZs {
      0% {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      50% {
        transform: translateY(-4px) scale(1.1);
        opacity: 0.7;
      }
      100% {
        transform: translateY(-8px) scale(1);
        opacity: 0;
      }
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }
    .zzz {
      display: inline-block;
    }
    .zzz > span {
      display: inline-block;
      animation: floatingZs 2s ease-in-out infinite;
    }
    .zzz > span:nth-child(1) { animation-delay: 0s; }
    .zzz > span:nth-child(2) { animation-delay: 0.3s; }
    .zzz > span:nth-child(3) { animation-delay: 0.6s; }
  `;
  document.head.appendChild(style);
}

// ========================================
// ELAPSED TIME FORMATTER (Shared)
// Rules:
// - < 1 minute: show seconds only; <10s => "Xs", otherwise "XXs"
// - < 1 hour: show minutes + seconds; minutes <10 => "Xm", else "XXm"; seconds always "XXs"
// - >= 1 hour: show hours + minutes + seconds; hours <10 => "Xh" else "XXh"; minutes/seconds always 2 digits
// ========================================
function formatElapsedHmsTT(ms) {
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
    const sStr = pad2(s); // minutes present => seconds always 2 digits
    return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
  }

  // seconds only
  const sStr = s < 10 ? String(s) : pad2(s);
  return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
}

// Expose formatElapsedHmsTT globally for extracted components
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.utils = window.TT.utils || {};
  window.TT.utils.formatElapsedHmsTT = formatElapsedHmsTT;
}

// Number formatting:
// - whole numbers: "7"
// - non-whole: "7.3" (one decimal)
function formatV2Number(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return String(rounded);
  return x.toFixed(1);
}

// Ensure tap animation styles are injected
// Helper function to check if a sleep session overlaps with existing ones
const checkSleepOverlap = async (startMs, endMs, excludeId = null) => {
  try {
    const allSessions = await firestoreStorage.getAllSleepSessions();
    const nowMs = Date.now();
    
    // Normalize the new sleep interval
    const normalizeInterval = (sMs, eMs) => {
      let s = Number(sMs);
      let e = Number(eMs);
      if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
      if (s > nowMs + 3 * 3600000) s -= 86400000;
      if (e < s) s -= 86400000;
      if (e < s) return null;
      return { startMs: s, endMs: e };
    };
    
    const newNorm = normalizeInterval(startMs, endMs);
    if (!newNorm) return false; // Invalid interval, let other validation catch it
    
    // Check each existing session for overlap
    for (const session of allSessions) {
      // Skip the session being edited
      if (excludeId && session.id === excludeId) continue;
      
      // For active sleeps, use current time as end
      const existingEnd = session.isActive ? nowMs : (session.endTime || null);
      if (!session.startTime || !existingEnd) continue;
      
      const existingNorm = normalizeInterval(session.startTime, existingEnd);
      if (!existingNorm) continue;
      
      // Check if ranges overlap: (start1 < end2) && (start2 < end1)
      if (newNorm.startMs < existingNorm.endMs && existingNorm.startMs < newNorm.endMs) {
        return true; // Overlap found
      }
    }
    
    return false; // No overlap
  } catch (error) {
    console.error('Error checking sleep overlap:', error);
    // On error, allow the save (fail open) - user can manually check
    return false;
  }
};

// Expose checkSleepOverlap globally for extracted components
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.utils = window.TT.utils || {};
  window.TT.utils.checkSleepOverlap = checkSleepOverlap;
}

function ensureTapAnimationStyles() {
  if (document.getElementById('tt-tap-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-tap-anim';
  style.textContent = `
    .tt-tapable {
      position: relative;
      overflow: hidden;
    }
    
    .tt-tapable::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.05);
      opacity: 0;
      transition: opacity 0.1s ease-out;
      pointer-events: none;
      border-radius: inherit;
      z-index: 1;
    }
    
    .tt-tapable:active::before {
      opacity: 1;
    }
    
    /* Dark mode: use white overlay instead of black */
    .dark .tt-tapable::before {
      background: rgba(255, 255, 255, 0.1);
    }

    .tt-card-tap {
      position: relative;
      overflow: hidden;
    }

    .tt-card-tap::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.03);
      opacity: 0;
      transition: opacity 0.1s ease-out;
      pointer-events: none;
      border-radius: inherit;
      z-index: 1;
    }

    .tt-card-tap:active::before {
      opacity: 1;
    }

    .dark .tt-card-tap::before {
      background: rgba(255, 255, 255, 0.08);
    }

    /* Consistent placeholder color across inputs/textareas */
    .tt-placeholder-tertiary::placeholder { color: var(--tt-text-tertiary); }
    .tt-placeholder-tertiary::-webkit-input-placeholder { color: var(--tt-text-tertiary); }
    .tt-placeholder-tertiary::-ms-input-placeholder { color: var(--tt-text-tertiary); }
    
    /* Timeline item animations */
    @keyframes slideInDown {
      0% {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
        max-height: 0;
      }
      50% {
        opacity: 1;
        max-height: 100px;
      }
      70% {
        transform: translateY(2px) scale(1.01);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        max-height: 100px;
      }
    }
    
    @keyframes slideOutUp {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
        max-height: 100px;
        margin-bottom: 1rem;
      }
      100% {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
        max-height: 0;
        margin-bottom: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
    }
    
    .timeline-item-enter {
      animation: slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .timeline-item-exit {
      animation: slideOutUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    
    @keyframes slideDown {
      0% {
        opacity: 0;
        transform: translateY(-10px);
        max-height: 0;
      }
      100% {
        opacity: 1;
        transform: translateY(0);
        max-height: 200px;
      }
    }
    
    @keyframes accordionExpand {
      0% {
        opacity: 0;
        transform: translateY(-4px);
        max-height: 0;
      }
      100% {
        opacity: 1;
        transform: translateY(0);
        max-height: 2000px;
      }
    }
    
    @keyframes accordionCollapse {
      0% {
        opacity: 1;
        transform: translateY(0);
        max-height: 2000px;
      }
      100% {
        opacity: 0;
        transform: translateY(-4px);
        max-height: 0;
      }
    }
    
    .accordion-expand {
      animation: accordionExpand 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      overflow: hidden;
    }
    
    .accordion-collapse {
      animation: accordionCollapse 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      overflow: hidden;
    }
    
    .chevron-rotate {
      transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
  `;
  document.head.appendChild(style);
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

const TrackerCard = ({ 
  mode = 'sleep',
  total = null,           // e.g., 14.5 (oz or hrs)
  target = null,           // e.g., 14.5 (oz or hrs)
  timelineItems = [],     // Array of log entries
  entriesTodayCount = null, // Number of entries today (computed upstream in TrackerTab)
  lastEntryTime = null,   // For status text (timestamp in ms)
  onItemClick = null,     // Callback when timeline item clicked
  onActiveSleepClick = null, // Callback when active sleep entry clicked (opens input sheet)
  onDelete = null,        // Callback when item is deleted (for data refresh)
  disableAccordion = false, // When true, disables accordion/timeline expansion
  onCardTap = null,       // Optional tap handler when accordion is disabled
  rawFeedings = [],       // All feedings (for yesterday comparison)
  rawSleepSessions = [],  // All sleep sessions (for yesterday comparison)
  currentDate = new Date() // Current date being viewed
}) => {
  ensureZzzStyles();
  ensureTapAnimationStyles();

  // UI Version (v4-only)
  const __ttV4Framer = __ttV4ResolveFramer();
  const __ttV4Motion = __ttV4Framer.motion || null;
  const isV4CardMotion = !!__ttV4Motion;
  const CardWrapper = isV4CardMotion ? __ttV4Motion.div : 'div';
  const cardClassName = `rounded-2xl p-5 shadow-sm tt-card-tap`;
  const cardMotionProps = isV4CardMotion ? {
    whileTap: {
      scale: 0.992,
      transition: { duration: 0.08, ease: [0.16, 1, 0.3, 1] }
    },
    transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] }
  } : {};
  
  const [expanded, setExpanded] = React.useState(false);
  const [hasInteracted, setHasInteracted] = React.useState(false); // Track if user has clicked expand/collapse
  const isInitialMountRef = React.useRef(true);
  const prevDateRef = React.useRef(currentDate);
  
  // Track when component has truly mounted (after first paint)
  React.useEffect(() => {
    // Use requestAnimationFrame to ensure we're past the initial paint
    const rafId = requestAnimationFrame(() => {
      isInitialMountRef.current = false;
    });
    return () => cancelAnimationFrame(rafId);
  }, []);
  
  // Reset expanded state when date changes (without animation)
  React.useEffect(() => {
    if (prevDateRef.current !== currentDate) {
      prevDateRef.current = currentDate;
      setHasInteracted(false); // Reset interaction tracking
      setExpanded(false);
    }
  }, [currentDate]);
  
  // Check if currentDate is today
  const isViewingToday = React.useMemo(() => {
    const today = new Date();
    const viewing = new Date(currentDate);
    return (
      today.getFullYear() === viewing.getFullYear() &&
      today.getMonth() === viewing.getMonth() &&
      today.getDate() === viewing.getDate()
    );
  }, [currentDate]);
  
  const [showYesterdayComparison, setShowYesterdayComparison] = React.useState(false);
  
  // Calculate yesterday's total as of current time of day (rounded to nearest half-hour)
  // Uses EXACT same logic as formatFeedingsForCard/formatSleepSessionsForCard but for yesterday
  const yesterdayTotal = React.useMemo(() => {
    // Helper to format time (defined here since formatTime12Hour is defined later)
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const d = new Date(timestamp);
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const mins = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${mins}${ampm}`;
    };
    
    const now = new Date(currentDate);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Round to nearest half-hour increment
    const roundedMinutes = Math.round(currentMinute / 30) * 30;
    let roundedHour = roundedMinutes === 60 ? currentHour + 1 : currentHour;
    let finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    
    // Cap at 23:30 if rounding would exceed 24 hours
    if (roundedHour >= 24) {
      roundedHour = 23;
      finalMinutes = 30;
    }
    
    // Calculate yesterday's boundaries (exactly like formatFeedingsForCard/formatSleepSessionsForCard)
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStart = yesterday.getTime();
    
    // Format the display time (before modifying cutoffDate)
    const displayCutoffDate = new Date(yesterday);
    displayCutoffDate.setHours(roundedHour, finalMinutes, 0, 0);
    const displayTime = formatTime(displayCutoffDate.getTime());
    
    if (mode === 'feeding') {
      // EXACTLY like formatFeedingsForCard, but for yesterday with cutoff
      if (!rawFeedings || !Array.isArray(rawFeedings)) {
        return { total: 0, displayTime: displayTime };
      }
      
      // For feeding: match formatFeedingsForCard pattern (endOfDay.setHours(23, 59, 59, 999))
      const cutoffDate = new Date(yesterday);
      cutoffDate.setHours(roundedHour, finalMinutes, 59, 999); // End of the minute
      const yesterdayCutoff = cutoffDate.getTime();
      
      const yesterdayFeedings = rawFeedings.filter(f => {
        const timestamp = f.timestamp || 0;
        return timestamp >= yesterdayStart && timestamp <= yesterdayCutoff;
      });
      
      const total = yesterdayFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
      
      return { total: total, displayTime: displayTime };
    } else {
      // EXACTLY like formatSleepSessionsForCard, but for yesterday with cutoff
      if (!rawSleepSessions || !Array.isArray(rawSleepSessions)) {
        return { total: 0, displayTime: displayTime };
      }
      
      // For sleep: match formatSleepSessionsForCard pattern (dayEndMs = endOfDay.getTime() + 1)
      const cutoffDate = new Date(yesterday);
      cutoffDate.setHours(roundedHour, finalMinutes, 0, 0);
      const dayStartMs = yesterdayStart;
      const dayEndMs = cutoffDate.getTime() + 1; // +1 pattern like formatSleepSessionsForCard
      
      // Use the same normalization and overlap helpers
      const _normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
        let sMs = Number(startMs);
        let eMs = Number(endMs);
        if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
        if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
        if (eMs < sMs) sMs -= 86400000;
        if (eMs < sMs) return null;
        return { startMs: sMs, endMs: eMs };
      };
      
      const _overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
        const a = Math.max(rangeStartMs, winStartMs);
        const b = Math.min(rangeEndMs, winEndMs);
        return Math.max(0, b - a);
      };
      
      // Normalize all sessions (but skip active - they're today's)
      // Sessions without endTime are active/incomplete and belong to today
      const normSessions = rawSleepSessions.map((s) => {
        // Skip sessions without endTime (these are active/incomplete and belong to today)
        if (!s.endTime) return null;
        const norm = _normalizeSleepInterval(s.startTime, s.endTime);
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      }).filter(Boolean);
      
      // Filter to sessions that overlap with yesterday window
      const yesterdaySessions = normSessions.filter(s => {
        return _overlapMs(s._normStartTime || s.startTime, s._normEndTime || s.endTime, dayStartMs, dayEndMs) > 0;
      });
      
      // Calculate total using overlap (exactly like formatSleepSessionsForCard)
      let totalMs = yesterdaySessions.reduce((sum, s) => {
        return sum + _overlapMs(s._normStartTime, s._normEndTime, dayStartMs, dayEndMs);
      }, 0);
      
      const total = totalMs / (1000 * 60 * 60); // Convert to hours
      
      return { total: total, displayTime: displayTime };
    }
  }, [mode, rawFeedings, rawSleepSessions, currentDate]);
  
  // Format yesterday's total for display
  const formattedYesterdayTotal = React.useMemo(() => {
    if (!yesterdayTotal || typeof yesterdayTotal.total !== 'number') return '0';
    return formatV2Number(yesterdayTotal.total);
  }, [yesterdayTotal]);
  
  // Calculate yesterday's progress percent
  const yesterdayPercent = React.useMemo(() => {
    if (!target || target <= 0) return 0;
    if (!yesterdayTotal || typeof yesterdayTotal.total !== 'number') return 0;
    const percent = Math.min(100, (yesterdayTotal.total / target) * 100);
    // Show at least 2% if there's any data (like displayPercent does)
    return (yesterdayTotal.total > 0 && percent === 0) ? 2 : percent;
  }, [yesterdayTotal, target]);
  
  // Debug logging (temporary) - only log once when first shown
  const hasLoggedRef = React.useRef(false);
  React.useEffect(() => {
    if (showYesterdayComparison && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      
      // Recalculate inline to see actual values
      const now = new Date(currentDate);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const roundedMinutes = Math.round(currentMinute / 30) * 30;
      let roundedHour = roundedMinutes === 60 ? currentHour + 1 : currentHour;
      let finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
      if (roundedHour >= 24) {
        roundedHour = 23;
        finalMinutes = 30;
      }
      
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStart = yesterday.getTime();
      
      let yesterdayCutoff, sampleData, filteredCount;
      if (mode === 'feeding') {
        const cutoffDate = new Date(yesterday);
        cutoffDate.setHours(roundedHour, finalMinutes, 59, 999);
        yesterdayCutoff = cutoffDate.getTime();
        
        // Show sample of what we're checking
        sampleData = (rawFeedings || []).slice(0, 5).map(f => ({
          timestamp: f.timestamp,
          timestampDate: f.timestamp ? new Date(f.timestamp).toLocaleString() : 'null',
          ounces: f.ounces,
          inRange: f.timestamp >= yesterdayStart && f.timestamp <= yesterdayCutoff,
          beforeStart: f.timestamp < yesterdayStart,
          afterCutoff: f.timestamp > yesterdayCutoff
        }));
        
        filteredCount = (rawFeedings || []).filter(f => {
          const timestamp = f.timestamp || 0;
          return timestamp >= yesterdayStart && timestamp <= yesterdayCutoff;
        }).length;
      } else {
        const cutoffDate = new Date(yesterday);
        cutoffDate.setHours(roundedHour, finalMinutes, 0, 0);
        yesterdayCutoff = cutoffDate.getTime() + 1;
        
        sampleData = (rawSleepSessions || []).slice(0, 5).map(s => ({
          startTime: s.startTime,
          startTimeDate: s.startTime ? new Date(s.startTime).toLocaleString() : 'null',
          endTime: s.endTime,
          endTimeDate: s.endTime ? new Date(s.endTime).toLocaleString() : 'null',
          hasEndTime: !!s.endTime
        }));
        
        filteredCount = (rawSleepSessions || []).filter(s => s.endTime).length;
      }
    } else if (!showYesterdayComparison) {
      hasLoggedRef.current = false;
    }
  }, [showYesterdayComparison, yesterdayTotal, yesterdayPercent, formattedYesterdayTotal, mode, target, rawFeedings, rawSleepSessions, currentDate]);
  
  // Get the icon for yesterday comparison
  const YesterdayIcon = mode === 'feeding' 
    ? (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) || null
    : (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) || null;
  
  // Handle card tap (not timeline button or interactive elements)
  const handleCardTap = (e) => {
    // Don't trigger if clicking:
    // - Any button (including timeline toggle button)
    // - Timeline items (swipeable content)
    // - Progress bar fill (the colored portion)
    const target = e.target;
    if (target.closest('button') || 
        target.closest('[class*="swipeable-content"]') ||
        target.closest('.tt-sleep-progress-pulse')) {
      return;
    }
    if (disableAccordion) {
      if (typeof onCardTap === 'function') {
        onCardTap(e, { mode });
      }
      return;
    }
    setHasInteracted(true);
    setExpanded(!expanded);
    // Also show yesterday comparison when expanded
    if (!expanded && isViewingToday) {
      setShowYesterdayComparison(true);
    }
    return;
    // Only trigger on direct card area clicks (header, numbers, progress track, etc.)
    // Only allow toggling when viewing today
    if (isViewingToday) {
      setShowYesterdayComparison(!showYesterdayComparison);
    }
  };
  
  // Shared memoized zZz element - created once and reused to prevent animation restart
  const zzzElementMemo = React.useMemo(() => 
    React.createElement('span', { className: "zzz" },
      React.createElement('span', null, 'z'),
      React.createElement('span', null, 'Z'),
      React.createElement('span', null, 'z')
    ), []
  );
  
  // Animation state - using local array pattern
  const [localTimelineItems, setLocalTimelineItems] = React.useState(timelineItems);
  const [enteringIds, setEnteringIds] = React.useState(new Set());
  const [exitingIds, setExitingIds] = React.useState(new Set());
  const exitTimeoutRefs = React.useRef({});
  
  // Smooth transition state - preserve last valid percent (like old UI's cardVisible)
  // Once card has been shown, never reset to 0% - ensures smooth transitions between dates
  const [cardHasBeenShown, setCardHasBeenShown] = React.useState(false);
  const lastValidPercentRef = React.useRef(0);

  // Stable ID extraction - always returns string for consistent Set/Map lookups
  const getStableItemId = React.useCallback((item) => {
    if (!item) return null;
    const id = item.id || item.timestamp || item.startTime;
    return id ? String(id) : null;
  }, []);

  // Sync localTimelineItems with prop, handling additions and removals with animations
  React.useEffect(() => {
    const currentIds = new Set(
      timelineItems.map(item => getStableItemId(item)).filter(Boolean)
    );
    const localIds = new Set(
      localTimelineItems.map(item => getStableItemId(item)).filter(Boolean)
    );
    
    // Find new items (enter animation)
    const newIds = new Set();
    currentIds.forEach(id => {
      if (!localIds.has(id)) {
        newIds.add(id);
      }
    });
    
    // Find removed items (exit animation)
    const removedIds = new Set();
    localIds.forEach(id => {
      if (!currentIds.has(id)) {
        removedIds.add(id);
      }
    });
    
    // Handle additions - add immediately and mark as entering
    if (newIds.size > 0) {
      // Preserve order from prop: add new items in their correct positions
      setLocalTimelineItems(prev => {
        const result = [];
        timelineItems.forEach(propItem => {
          result.push(propItem);
        });
        // Add exiting items that aren't in prop (at the end)
        prev.forEach(localItem => {
          const id = getStableItemId(localItem);
          if (removedIds.has(id)) {
            result.push(localItem);
          }
        });
        return result;
      });
      setEnteringIds(newIds);
      // Clear enter animation class after animation completes
      setTimeout(() => {
        setEnteringIds(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 400);
    }
    
    // Handle removals - mark as exiting, remove after animation
    if (removedIds.size > 0) {
      setExitingIds(removedIds);
      // Remove from local array after animation completes
      removedIds.forEach(id => {
        if (exitTimeoutRefs.current[id]) {
          clearTimeout(exitTimeoutRefs.current[id]);
        }
        exitTimeoutRefs.current[id] = setTimeout(() => {
          setLocalTimelineItems(prev => prev.filter(item => getStableItemId(item) !== id));
          setExitingIds(prev => {
            const updated = new Set(prev);
            updated.delete(id);
            return updated;
          });
          delete exitTimeoutRefs.current[id];
        }, 400);
      });
    }
    
    // If no changes, sync order from prop (handles reordering)
    if (newIds.size === 0 && removedIds.size === 0) {
      setLocalTimelineItems(prev => {
        // Reorder to match prop, but keep exiting items
        const result = [];
        timelineItems.forEach(propItem => {
          result.push(propItem);
        });
        prev.forEach(localItem => {
          const id = getStableItemId(localItem);
          if (!currentIds.has(id)) {
            result.push(localItem); // Keep exiting items
          }
        });
        return result;
      });
    }
  }, [timelineItems, getStableItemId]);
  
  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      Object.values(exitTimeoutRefs.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Inject a calm zZz keyframe animation (UI Lab version - unique to avoid conflicts)
  React.useEffect(() => {
    try {
      if (document.getElementById('tt-zzz-ui-lab-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-zzz-ui-lab-style';
      s.textContent = `@keyframes ttZzzUILab{0%{opacity:1;transform:translateY(4px)}30%{opacity:1;transform:translateY(0px)}70%{opacity:1;transform:translateY(-4px)}100%{opacity:0;transform:translateY(-8px)}}`;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Inject BMW-style charging pulse animation for active sleep progress bar
  React.useEffect(() => {
    try {
      if (document.getElementById('tt-sleep-pulse-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-sleep-pulse-style';
      s.textContent = `
        @keyframes ttSleepPulse {
          0% {
            transform: translateX(-100%) skewX(-20deg);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(200%) skewX(-20deg);
            opacity: 0;
          }
        }
        .tt-sleep-progress-pulse {
          position: relative;
          overflow: hidden;
        }
        .tt-sleep-progress-pulse::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: ttSleepPulse 3.5s ease-in-out infinite;
          border-radius: inherit;
          pointer-events: none;
        }
        /* Dark-mode tuning: keep the sheen visible but not blown out */
        .dark .tt-sleep-progress-pulse::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
        }
        /* Active sleep pill (button) - border animation that travels around */
        @keyframes ttSleepPulsePillBorder {
          0% {
            transform: rotate(0deg);
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: rotate(360deg);
            opacity: 0.3;
          }
        }
        /* Light mode pill - border animation */
        button.tt-sleep-progress-pulse {
          position: relative;
        }
        button.tt-sleep-progress-pulse::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 240deg,
            rgba(255, 255, 255, 0.15) 270deg,
            rgba(255, 255, 255, 0.15) 300deg,
            transparent 330deg,
            transparent 360deg
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          padding: 1px;
          animation: ttSleepPulsePillBorder 4.5s linear infinite;
          pointer-events: none;
        }
        /* Dark mode pill - even more subtle border animation */
        .dark button.tt-sleep-progress-pulse::after {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 240deg,
            rgba(255, 255, 255, 0.08) 270deg,
            rgba(255, 255, 255, 0.08) 300deg,
            transparent 330deg,
            transparent 360deg
          );
          animation: ttSleepPulsePillBorder 5.0s linear infinite;
        }
      `;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Check if sleep is currently active
  const isSleepActive = React.useMemo(() => {
    if (mode !== 'sleep') return false;
    return localTimelineItems.some(item => item.isActive && item.startTime);
  }, [mode, localTimelineItems]);

  // Calculate current percent from total/target
  const currentPercent = (total !== null && target !== null && target > 0) 
    ? Math.min(100, (total / target) * 100) 
    : 0;
  
  // Once card has been shown, preserve last valid value during transitions
  // This matches the old UI behavior - cardVisible stays true once set
  React.useEffect(() => {
    if (currentPercent > 0 || (total !== null && target !== null)) {
      // Card has valid data - mark as shown and update last valid percent
      if (!cardHasBeenShown) {
        setCardHasBeenShown(true);
      }
      lastValidPercentRef.current = currentPercent;
    }
  }, [currentPercent, total, target, cardHasBeenShown]);
  
  // Use last valid percent if card hasn't been shown yet, otherwise use current (smooth transition)
  // Once shown, preserve value during transitions to prevent jitter
  const calculatedPercent = cardHasBeenShown 
    ? (currentPercent > 0 || (total !== null && target !== null) ? currentPercent : lastValidPercentRef.current)
    : currentPercent; // First render - can start at 0

  // If there's truly no progress yet, show a tiny stub so the UI doesn't look "broken"/empty.
  // (Requested: ~1–2%)
  const displayPercent = (calculatedPercent <= 0 && (!total || total <= 0)) ? 2 : calculatedPercent;
  
  // Format time for status text
  const formatTime12Hour = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${mins}${ampm}`;
  };

  // Format duration for sleep status
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    if (diffMs < 0) return '';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Real-time timer for active sleep in timeline status
  // Only returns timer text - zZz animation is rendered separately to prevent restart
  const ActiveSleepTimer = ({ startTime, sessionId }) => {
    // Use a ref to store the initial startTime to prevent timer resets on server refreshes
    const startTimeRef = React.useRef(startTime);
    const sessionIdRef = React.useRef(sessionId);
    
    // Update refs only when session changes (not on every startTime update)
    if (sessionIdRef.current !== sessionId) {
      startTimeRef.current = startTime;
      sessionIdRef.current = sessionId;
    }
    
    const [elapsed, setElapsed] = React.useState(() => {
      return Date.now() - startTimeRef.current;
    });
    
    React.useEffect(() => {
      // Only reset timer if session actually changed
      if (sessionIdRef.current !== sessionId) {
        startTimeRef.current = startTime;
        sessionIdRef.current = sessionId;
        setElapsed(Date.now() - startTimeRef.current);
      }
      
      const interval = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 1000);
      return () => clearInterval(interval);
    }, [sessionId]); // Use sessionId instead of startTime to prevent resets on server refreshes
    
    const formatWithSeconds = (ms) => {
      return formatElapsedHmsTT(ms).str;
    };
    
    // Only return the timer text - zZz animation is rendered separately
    // Use tabular numbers + no-wrap so the pill can naturally size to content.
    return React.createElement('span', { className: "font-semibold tabular-nums whitespace-nowrap inline-block text-right", style: { color: 'currentColor' } }, 
      formatWithSeconds(elapsed)
    );
  };

  // Status text based on mode for Timeline row
  const timelineStatusText = mode === 'feeding' 
    ? (lastEntryTime ? `Last fed ${formatTime12Hour(lastEntryTime)}` : 'No feedings yet')
    : (() => {
        // Check if there's an active sleep entry
        const activeEntry = localTimelineItems.find(item => item.isActive && item.startTime);
        if (activeEntry) {
          // Render timer and zZz as siblings - timer updates won't affect animation
          return React.createElement(
            'span',
            { className: "inline-flex items-baseline gap-2 whitespace-nowrap" },
            React.createElement(ActiveSleepTimer, { startTime: activeEntry.startTime, sessionId: activeEntry.id }),
            React.createElement(
              'span',
              { className: "inline-flex w-[28px] justify-start font-light leading-none", style: { color: 'currentColor' } },
              zzzElementMemo
            )
          );
        } else {
          // Find the last completed sleep entry (has endTime and is not active)
          const lastCompletedSleep = localTimelineItems.find(item => 
            item.endTime && !item.isActive
          );
          if (lastCompletedSleep && lastCompletedSleep.endTime) {
            return `Woke at ${formatTime12Hour(lastCompletedSleep.endTime)}`;
          } else {
            return 'No sleep logged';
          }
        }
      })();

  const timelineLabel = mode === 'feeding'
    ? `Timeline • ${timelineStatusText}`
    : React.createElement(
        React.Fragment,
        null,
        'Timeline • ',
        timelineStatusText
      );

  const entriesTodayLabel = (() => {
    const n = Number(entriesTodayCount);
    if (!Number.isFinite(n)) return null;
    const abs = Math.max(0, Math.floor(n));
    const nounBase = (mode === 'feeding') ? 'feed' : 'sleep';
    const noun = abs === 1 ? nounBase : `${nounBase}s`;
    return `• ${abs} ${noun} today`;
  })();

  // Match the subtle background used by TimelineItem rows
  const timelineSubtleBg = 'var(--tt-timeline-track-bg)';

  // Get the appropriate icon for the header (v4)
  const HeaderIcon = mode === 'feeding'
    ? (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"]) || null
    : (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"]) || null;
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const TTCardHeader = window.TT?.shared?.TTCardHeader || window.TTCardHeader;

  // Main icons (v4)
  const BottleMainIcon =
    window.TT?.shared?.icons?.BottleV2 ||
    window.TT?.shared?.icons?.["bottle-v2"] ||
    HeaderIcon ||
    null;
  const MoonMainIcon =
    window.TT?.shared?.icons?.MoonV2 ||
    window.TT?.shared?.icons?.["moon-v2"] ||
    HeaderIcon ||
    null;

  // Shared renderer for v4 card layout.
  const renderDesign = ({
    showHeaderRow = true,                   // show the old header row (icon + Feed/Sleep + headerRight)
    iconOverride = null,                    // override icon component
    headerGapClass = 'gap-2',                 // icon ↔ label spacing
    headerBottomMarginClass = 'mb-6',         // header ↔ big number spacing
    headerLabelClassName = 'text-[18px] font-semibold',
    headerIconClassName = 'h-8 w-8',
    feedingIconTransform = 'translateY(-2px)',
    sleepIconTransform = 'none',
    mirrorFeedingIcon = false,
    showHeaderIcon = true,                   // show icon in header left
    headerRight = null,                      // optional right-side content in header row
    headerLabel = null,                      // optional custom label for header (variant 2)
    showBigNumberIcon = false,               // show icon inline with the big number row
    bigNumberIconClassName = null,           // icon size for big number row (defaults to headerIconClassName)
    bigNumberRight = null,                   // optional right-side content in big number row (e.g. status pill)
    bigNumberRowClassName = "flex items-baseline gap-1 mb-1",
    bigNumberIconValueGapClassName = "gap-[6px]", // spacing between icon and big-number value
    bigNumberValueClassName = "text-[40px] leading-none font-bold",
    bigNumberTargetClassName = "relative -top-[1px] text-[16px] leading-none",
    bigNumberTargetColor = 'var(--tt-text-secondary)',
    bigNumberTargetVariant = 'target',        // 'target' | 'unit'
    bigNumberTopLabel = null,                 // optional icon + label above big number
    progressTrackHeightClass = 'h-6',         // progress track (fill uses h-full)
    progressTrackBg = 'var(--tt-progress-track)',   // progress track background
    progressBarGoalText = null,               // Goal text below progress bar
    progressBarGoalTextClassName = "text-[15.4px] font-normal leading-none",
    statusRow = null,                         // optional row below progress bar
    statusRowClassName = '',                  // spacing wrapper for statusRow
    showDotsRow = true,                       // dots row under progress bar
    progressBottomMarginClass = 'mb-1',       // spacing after progress bar
    dividerMarginClass = 'my-4',              // divider spacing
    timelineTextColor = 'var(--tt-text-secondary)',
    timelineVariant = 'v4',                   // 'v4' uses pill + no bullet
    timelineCountPill = null,                 // optional pill shown inline next to "Timeline"
    hideTimelineBar = false,                   // Hide timeline bar button
    accordionCountPill = null                 // Count pill to show in accordion
  } = {}) => {
    const IconComp = iconOverride || HeaderIcon;
    const withFeedingMirror = (t) => {
      const s = (t || '').trim();
      if (s.includes('scaleX(-1)')) return s;
      if (!s || s === 'none') return 'scaleX(-1)';
      return `scaleX(-1) ${s}`;
    };
    const effectiveFeedingTransform = mirrorFeedingIcon ? withFeedingMirror(feedingIconTransform) : feedingIconTransform;
    return React.createElement(
      CardWrapper,
      { 
        className: cardClassName,
        style: {
          backgroundColor: "var(--tt-card-bg)",
          borderColor: "var(--tt-card-border)",
          cursor: 'pointer',
          transition: 'all 0.3s ease-out'
        },
        onClick: handleCardTap,
        ...cardMotionProps
      },
      showHeaderRow ? React.createElement(
        'div',
        { 
          className: `flex items-center w-full ${(headerRight && !showHeaderIcon && !headerLabel) ? 'justify-end' : 'justify-between'} ${headerBottomMarginClass} ${(headerRight && !showHeaderIcon && !headerLabel) ? '' : 'h-6'}`,
          style: (headerRight && !showHeaderIcon && !headerLabel) ? { 
            width: '100%',
            marginLeft: 0,
            marginRight: 0,
            paddingLeft: 0,
            paddingRight: 0,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end'
          } : {}
        },
        (showHeaderIcon || headerLabel || (!headerRight)) ? React.createElement(
          'div',
          { className: `flex items-center ${headerGapClass}` },
          showHeaderIcon
            ? (IconComp ? React.createElement(IconComp, { 
                className: headerIconClassName,
                style: { 
                  color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
                  transform: mode === 'feeding' ? effectiveFeedingTransform : sleepIconTransform,
                  strokeWidth: mode === 'feeding' ? '1.5' : undefined,
                  fill: mode === 'feeding' ? 'none' : (mode === 'sleep' ? 'var(--tt-sleep)' : undefined)
                }
              }) : React.createElement('div', { className: "h-6 w-6 rounded-2xl", style: { backgroundColor: 'var(--tt-input-bg)' } }))
            : null,
          (headerLabel || (!headerRight || showHeaderIcon)) ? (
            headerLabel 
              ? headerLabel
              : React.createElement('div', { 
                  className: headerLabelClassName,
                  style: { color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)' }
                }, mode === 'feeding' ? 'Feed' : 'Sleep')
          ) : null
        ) : null,
        headerRight
      ) : null,

      bigNumberTopLabel ? React.createElement(
        'div',
        { className: "flex items-center mb-4" },
        bigNumberTopLabel
      ) : null,

      (() => {
        const valueEl = React.createElement('div', { 
          className: bigNumberValueClassName,
          style: { 
            color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
            transition: 'opacity 0.4s ease-out, transform 0.4s ease-out'
          }
        }, 
          total !== null ? formatV2Number(total) : '0'
        );

        const targetEl = React.createElement('div', { 
          className: bigNumberTargetClassName,
          style: { color: bigNumberTargetColor } 
        }, 
          bigNumberTargetVariant === 'unit'
            ? (mode === 'sleep' ? 'hrs' : 'oz')
            : (target !== null 
                ? (mode === 'sleep' ? `/ ${formatV2Number(target)} hrs` : `/ ${formatV2Number(target)} oz`)
                : (mode === 'sleep' ? '/ 0 hrs' : '/ 0 oz'))
        );

        const iconEl = (showBigNumberIcon && IconComp)
          ? React.createElement(IconComp, { 
              className: bigNumberIconClassName || headerIconClassName,
              style: { 
                color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
                transform: mode === 'feeding' ? effectiveFeedingTransform : sleepIconTransform,
                strokeWidth: mode === 'feeding' ? '1.5' : undefined,
                fill: mode === 'feeding' ? 'none' : (mode === 'sleep' ? 'var(--tt-sleep)' : undefined)
              }
            })
          : null;

        if (!showBigNumberIcon && !bigNumberRight) {
          return React.createElement(
            'div',
            { className: bigNumberRowClassName },
            valueEl,
            targetEl
          );
        }

        return React.createElement(
          'div',
          { className: bigNumberRowClassName },
          React.createElement(
            'div',
            { className: `flex items-center ${bigNumberIconValueGapClassName} min-w-0` },
            iconEl,
            React.createElement(
              'div',
              { className: "flex items-baseline gap-[2px] min-w-0" },
              valueEl,
              targetEl
            )
          ),
          bigNumberRight
        );
      })(),
      
      React.createElement('div', { 
        className: `relative w-full ${progressTrackHeightClass} rounded-2xl overflow-hidden ${progressBottomMarginClass}`, 
        style: { 
          backgroundColor: progressTrackBg,
          marginLeft: 0,
          marginRight: 0,
          paddingLeft: 0,
          paddingRight: 0,
          width: '100%',
          boxSizing: 'border-box'
        } 
      },
        React.createElement('div', {
          className: `absolute left-0 top-0 h-full rounded-2xl ${isSleepActive ? 'tt-sleep-progress-pulse' : ''}`,
          style: {
            width: `${displayPercent}%`,
            backgroundColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: '0s',
            minWidth: '0%',
            position: 'relative'
          }
        })
      ),
      progressBarGoalText && React.createElement(
        'div',
        {
          className: `flex justify-end ${expanded ? '' : 'mt-[4px]'}`,
          style: { 
            width: '100%',
            display: expanded ? 'none' : 'flex',
            opacity: expanded ? 0 : 0.7,
            transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }
        },
        React.createElement('span', {
          className: "text-[15.4px] font-normal leading-none",
          style: { color: 'var(--tt-text-tertiary)' }
        }, progressBarGoalText)
      ),
      (showYesterdayComparison && isViewingToday && !hideTimelineBar) && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          className: "mb-8 mt-3"
        },
          React.createElement('div', {
            className: "flex items-center gap-2 mb-2"
          },
            React.createElement('span', {
              className: "text-[15.4px] font-bold leading-none",
              style: {
                color: mode === 'feeding' ? 'var(--tt-feed-soft, var(--tt-feed))' : 'var(--tt-sleep-soft, var(--tt-sleep))',
                opacity: 0.7
              }
            }, `${formattedYesterdayTotal}${mode === 'feeding' ? ' oz' : ' hrs'}`),
            React.createElement('span', {
              className: "text-[15.4px] font-normal leading-none",
              style: { color: 'var(--tt-text-tertiary)', opacity: 0.6 }
            }, `as of ${yesterdayTotal.displayTime} yesterday`)
          ),
          React.createElement('div', {
            className: "relative w-full rounded-2xl overflow-hidden",
            style: {
              height: progressTrackHeightClass === 'h-6' 
                ? '9.6px'
                : '6.336px',
              backgroundColor: 'var(--tt-subtle-surface)',
              minHeight: '4px'
            }
          },
            React.createElement('div', {
              className: "absolute left-0 top-0 h-full rounded-2xl",
              style: {
                width: `${Math.max(0, yesterdayPercent)}%`,
                backgroundColor: mode === 'feeding' 
                  ? 'var(--tt-feed-soft, var(--tt-feed))'
                  : 'var(--tt-sleep-soft, var(--tt-sleep))',
                opacity: 0.6,
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                minWidth: yesterdayPercent > 0 ? '2px' : '0px'
              }
            })
          )
        )
      ),
      statusRow ? React.createElement('div', { className: statusRowClassName }, statusRow) : null,
      showDotsRow && React.createElement(
        'div',
        { className: "flex gap-1.5 pl-1 mb-2" },
        Array.from({ length: Math.min(timelineItems.length, 10) }, (_, i) =>
          React.createElement('div', { 
            key: i, 
            className: "h-3.5 w-3.5 rounded-full",
            style: { backgroundColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)' }
          })
        )
      ),
      !disableAccordion && !hideTimelineBar && React.createElement('div', { 
        className: `border-t ${dividerMarginClass}`,
        style: { 
          borderColor: document.documentElement.classList.contains('dark') 
            ? 'rgba(255,255,255,0.06)'
            : 'rgb(243, 244, 246)'
        }
      }),
      !disableAccordion && !hideTimelineBar && React.createElement(
        'button',
        {
          onClick: () => setExpanded(!expanded),
          className: "flex w-full items-center justify-between",
          style: { color: timelineTextColor }
        },
        React.createElement(
          'span',
          null,
          timelineVariant === 'v4'
            ? (timelineCountPill 
                ? timelineCountPill
                : React.createElement(
                    'span',
                    { className: "font-normal", style: { color: timelineTextColor } },
                    'Timeline'
                  ))
            : timelineLabel
        ),
        expanded
          ? React.createElement(window.TT?.shared?.icons?.ChevronUpIcon || ChevronUp, { 
              className: "w-5 h-5",
              isTapped: true,
              selectedWeight: 'bold',
              style: { color: timelineTextColor } 
            })
          : React.createElement(window.TT?.shared?.icons?.ChevronDownIcon || ChevronDown, { 
              className: "w-5 h-5",
              isTapped: false,
              selectedWeight: 'bold',
              style: { color: timelineTextColor } 
            })
      ),
      !disableAccordion && React.createElement(
        'div',
        { 
          className: `mt-2 ${expanded ? 'accordion-expand' : 'accordion-collapse'}`,
          style: { overflow: 'hidden' }
        },
        (showYesterdayComparison && isViewingToday && hideTimelineBar) && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', {
            className: "mb-8 mt-1.5"
          },
            React.createElement('div', {
              className: "flex items-center gap-2 mb-2"
            },
              React.createElement('span', {
                className: "text-[15.4px] font-bold leading-none",
                style: {
                  color: mode === 'feeding' ? 'var(--tt-feed-soft, var(--tt-feed))' : 'var(--tt-sleep-soft, var(--tt-sleep))',
                  opacity: 0.85
                }
              }, `${formattedYesterdayTotal}${mode === 'feeding' ? ' oz' : ' hrs'}`),
              React.createElement('span', {
                className: "text-[15.4px] font-normal leading-none",
                style: { color: 'var(--tt-text-tertiary)', opacity: 0.6 }
              }, `as of ${yesterdayTotal.displayTime} yesterday`)
            ),
            React.createElement('div', {
              className: "relative w-full rounded-2xl overflow-hidden",
              style: {
                height: progressTrackHeightClass === 'h-6' 
                  ? '9.6px'
                  : '6.336px',
                backgroundColor: 'var(--tt-subtle-surface)',
                minHeight: '4px'
              }
            },
              React.createElement('div', {
                className: "absolute left-0 top-0 h-full rounded-2xl",
                style: {
                  width: `${Math.max(0, yesterdayPercent)}%`,
                  backgroundColor: mode === 'feeding' 
                    ? 'var(--tt-feed-soft, var(--tt-feed))'
                    : 'var(--tt-sleep-soft, var(--tt-sleep))',
                  opacity: 0.6,
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: yesterdayPercent > 0 ? '2px' : '0px'
                }
              })
            )
          )
        ),
        accordionCountPill && React.createElement(
          'div',
          { className: "mb-4" },
          accordionCountPill
        ),
        ((localTimelineItems && localTimelineItems.length > 0) || exitingIds.size > 0)
          ? (() => {
              return localTimelineItems.map((entry) => {
                const itemId = getStableItemId(entry);
                const isEntering = enteringIds.has(itemId);
                const isExiting = exitingIds.has(itemId);
                
                const animationClass = isExiting 
                  ? 'timeline-item-exit' 
                  : isEntering 
                    ? 'timeline-item-enter' 
                    : '';
                
                return React.createElement(
                  'div',
                  {
                    key: itemId,
                    className: `mb-4 ${animationClass || ''}`.trim()
                  },
                  React.createElement(TimelineItem, { 
                    entry,
                    mode,
                    mirrorFeedingIcon: timelineVariant === 'v4',
                    iconOverride: iconOverride,
                    onClick: onItemClick,
                    onDelete: onDelete
                  })
                );
              });
            })()
          : React.createElement('div', { 
              className: "text-[15.4px] font-normal text-center py-4",
              style: { color: 'var(--tt-text-tertiary)' }
            }, mode === 'feeding' ? 'No feedings yet' : 'No sleeps yet')
      )
    );
  };

  // v4: design (v4-only)
  const renderV4Design = () => {
    // Helper function to format relative time with "ago" (e.g., "1h 12m ago")
    const formatRelativeTime = (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (remainingMinutes === 0) return `${hours}h ago`;
      return `${hours}h ${remainingMinutes}m ago`;
    };
    
    // Helper function to format relative time without "ago" (e.g., "1h 12m")
    const formatRelativeTimeNoAgo = (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (minutes < 1) return '0m';
      if (minutes < 60) return `${minutes}m`;
      if (remainingMinutes === 0) return `${hours}h`;
      return `${hours}h ${remainingMinutes}m`;
    };
    
    const v4IconSvg = mode === 'feeding'
      ? (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"] || BottleMainIcon)
      : (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"] || MoonMainIcon);

    // Always use variant2 (small icon + label in header)
    const isVariant1 = false;
    const isVariant2 = true;

    const isV4Sizing = true;
    const v4StatusTextClassName = isV4Sizing
      ? "text-[16px] font-normal leading-none"
      : "text-[16px] font-normal leading-none";
    const v4GoalTextClassName = isV4Sizing
      ? "text-[16px] font-normal leading-none"
      : "text-[16px] font-normal leading-none";
    const v4TargetClassName = isVariant1
      ? (isV4Sizing
          ? "relative -top-[2px] text-[20px] leading-none font-normal"
          : "relative -top-[2px] text-[20px] leading-none font-normal")
      : (isV4Sizing
          ? "relative -top-[1px] text-[20px] leading-none font-normal"
          : "relative -top-[1px] text-[20px] leading-none font-normal");

    const v4StatusText = mode === 'feeding'
      ? (lastEntryTime ? formatRelativeTime(lastEntryTime) : 'No feedings yet')
      : (() => {
          const activeEntry = localTimelineItems.find(item => item.isActive && item.startTime);
          if (activeEntry) {
            return React.createElement(
              'span',
              { className: "inline-flex items-center gap-2" },
              React.createElement(ActiveSleepTimer, { startTime: activeEntry.startTime, sessionId: activeEntry.id }),
              React.createElement(
                'span',
                { className: "inline-flex items-center font-light", style: { color: 'currentColor' } },
                zzzElementMemo
              )
            );
          }
          const lastCompletedSleep = localTimelineItems.find(item => item.endTime && !item.isActive);
          if (lastCompletedSleep && lastCompletedSleep.endTime) {
            return `Awake ${formatRelativeTimeNoAgo(lastCompletedSleep.endTime)}`;
          }
          return 'No sleep logged';
        })();

    // Always use variant2 behavior
    const isVariant2ForStatus = true;
    
    const v4HeaderRight = (() => {
      // Active sleep: special tappable/pulsing pill that opens sleep controls.
      const isActiveSleepPill = (mode === 'sleep' && isSleepActive);
      
      // Create chevron element
      const chevronEl = React.createElement(
        'svg',
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 256 256",
          className: "w-5 h-5",
          style: { color: 'var(--tt-text-tertiary)' }
        },
        React.createElement('path', {
          d: "M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z",
          fill: "currentColor"
        })
      );
      
      // Show "Sleeping now" when sleep timer is running, otherwise show typical text
      if (isActiveSleepPill) {
        return React.createElement(
          'span',
          {
            className: "inline-flex items-center gap-2",
            style: { color: 'var(--tt-text-tertiary)' }
          },
          React.createElement('span', { className: v4StatusTextClassName }, "Sleeping now"),
          chevronEl
        );
      }
      
      // Typical text when sleep timer is not running
      return React.createElement(
        'span',
        {
          className: "inline-flex items-center gap-2",
          style: { color: 'var(--tt-text-tertiary)' }
        },
        React.createElement('span', { className: v4StatusTextClassName }, v4StatusText),
        chevronEl
      );
    })();

    const v4CountPill = (() => {
      const n = Number(entriesTodayCount);
      const abs = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      const nounBase = (mode === 'feeding') ? 'feed' : 'sleep';
      const noun = abs === 1 ? nounBase : `${nounBase}s`;
      return React.createElement(
        'span',
        {
          className:
            "inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg whitespace-nowrap text-[15.4px] font-normal leading-none",
          style: { backgroundColor: 'var(--tt-subtle-surface)', color: 'var(--tt-text-tertiary)' }
        },
        `${abs} ${noun} today`
      );
    })();

    // Pills: keep a single source of truth so height/radius stays consistent.
    const v4PillBaseClass =
      "inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg whitespace-nowrap text-[15.4px] font-normal leading-none";

    // For feeding: pills go in timeline (count only for variant 2, count + status for variant 1)
    const v4FeedingTimelinePills = mode === 'feeding' ? React.createElement(
      'span',
      { className: "flex items-center gap-3" },
      v4CountPill,
      isVariant1 ? v4HeaderRight : null  // Status pill moved to header for variant 2
    ) : null;

    // For sleep: pills go in timeline (count only for variant 2, count + status for variant 1)
    const v4SleepTimelinePills = mode === 'sleep' ? React.createElement(
      'span',
      { className: "flex items-center gap-3" },
      v4CountPill,
      isVariant1 ? v4HeaderRight : null  // Status pill moved to header for variant 2
    ) : null;

    // Helper function to create icon + label component (for variant 2)
    const createIconLabel = (m) => {
      const isFeed = m === 'feeding';
      const v4Svg = isFeed
        ? ((window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.BottleV2) ||
           (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["bottle-v2"]) ||
           null)
        : ((window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.MoonV2) ||
           (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["moon-v2"]) ||
           null);
      const color = isFeed ? 'var(--tt-feed)' : 'var(--tt-sleep)';
      const label = isFeed ? 'Feed' : 'Sleep';
      
      return React.createElement(
        'div',
        { 
          className: "text-[18px] font-semibold inline-flex items-center gap-[5px]",
          style: { color }
        },
        v4Svg ? React.createElement(v4Svg, { 
          className: "w-[22px] h-[22px]", 
          style: { 
            color, 
            strokeWidth: isFeed ? '1.5' : undefined,
            fill: isFeed ? 'none' : color,
            transform: isFeed ? 'rotate(20deg)' : undefined
          } 
        }) : null,
        React.createElement('span', null, label)
      );
    };

    const v4HeaderLabel = isVariant2 ? createIconLabel(mode) : null;
    const v4TopLabel = isVariant2 ? createIconLabel(mode) : null;

    return renderDesign({
      showHeaderRow: isVariant2,                    // show header row for variant 2 (with icon + label)
      headerGapClass: 'gap-2',
      headerBottomMarginClass: 'mb-[36px]',
      headerLabelClassName: 'text-[15.4px] font-medium',
      iconOverride: v4IconSvg,
      feedingIconTransform: 'none',                        // bottle PNG is pre-flipped to point right
      sleepIconTransform: 'translateY(2px)',                // nudge moon down 2px
      mirrorFeedingIcon: false,
      showHeaderIcon: false,
      headerRight: isVariant2 ? v4HeaderRight : null,  // variant 2: status pill in header, variant 1: in timeline
      headerLabel: isVariant2 ? v4HeaderLabel : null,  // variant 2: icon + label in header
      showBigNumberIcon: isVariant1,                // show big icon inline for variant 1
      bigNumberTopLabel: null,                      // not used in header (use headerLabel instead)
      // Per-mode sizing: 5% smaller than current (bottle 34.2px -> 32.49px, moon 32.4px -> 30.78px), +10% = 35.739px / 33.858px
      bigNumberIconClassName: mode === 'feeding' ? 'h-[35.739px] w-[35.739px]' : 'h-[33.858px] w-[33.858px]',
      // Big-number row is just icon + number + target (left-aligned)
      bigNumberRight: null,
      bigNumberRowClassName: isVariant1 
        ? "flex items-baseline gap-1 mb-[13px]"  // Consistent alignment for both feeding and sleep
        : "flex items-baseline gap-1 mb-[13px]",  // Consistent alignment for both feeding and sleep
      // Icons were matched; add +1px only for sleep (moon) per request.
      bigNumberIconValueGapClassName: mode === 'sleep' ? 'gap-[8px]' : 'gap-[6px]',
      bigNumberValueClassName: isV4Sizing ? "text-[40px] leading-none font-bold" : "text-[39.6px] leading-none font-bold",
      bigNumberTargetClassName: v4TargetClassName,
      bigNumberTargetColor: 'var(--tt-text-tertiary)',  // match tertiary text color
      bigNumberTargetVariant: 'unit',  // show just "oz" or "hrs" next to big number
      // 12px * 1.2 = 14.4px, +10% = 15.84px
      progressTrackHeightClass: 'h-[15.84px]',
      progressTrackBg: 'var(--tt-progress-track)',
      progressBarGoalText: target !== null 
        ? (mode === 'sleep' ? `${formatV2Number(target)} hrs goal` : `${formatV2Number(target)} oz goal`)
        : (mode === 'sleep' ? '0 hrs goal' : '0 oz goal'),  // Goal text below progress bar
      progressBarGoalTextClassName: v4GoalTextClassName,
      // No status row below progress bar (pills moved to timeline/header)
      statusRow: null,
      statusRowClassName: "",
      showDotsRow: false,
      progressBottomMarginClass: 'mb-0',
      dividerMarginClass: 'my-4',
      timelineTextColor: 'var(--tt-text-tertiary)',
      timelineVariant: 'v4',
      hideTimelineBar: true,  // Hide the timeline bar button
      accordionCountPill: v4CountPill  // Pass count pill to show in accordion
    });
  };

  // Render (v4-only)
  return React.createElement(React.Fragment, null,
    renderV4Design()
  );
};

// Make available globally for script.js
if (typeof window !== 'undefined') {
  // Debug proof this file executed
  window.__ttTrackerCardLoadedAt = Date.now();
  window.TrackerCard = TrackerCard;
}
