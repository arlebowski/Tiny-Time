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

// v3 number formatting:
// - whole numbers: "7"
// - non-whole: "7.3" (one decimal)
function formatV3Number(n) {
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
  `;
  document.head.appendChild(style);
}

const TimelineItem = ({ entry, mode = 'sleep', mirrorFeedingIcon = false, iconOverride = null, onClick = null, onActiveSleepClick = null, onDelete = null }) => {
  if (!entry) return null;
  
  const isSleep = mode === 'sleep';
  const timelineBg = 'var(--tt-subtle-surface)';
  
  // Swipe state
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const touchStartRef = React.useRef({ x: 0, y: 0 });
  const itemRef = React.useRef(null);
  
  const SWIPE_THRESHOLD = 80; // pixels to reveal delete button
  const DELETE_BUTTON_WIDTH = 80; // base width of delete button (matches Apple Messages)
  const DELETE_BUTTON_MAX_WIDTH = 100; // elastic max width (~25% more, like Apple)
  
  // Real-time timer state for active sleep
  const [elapsedTime, setElapsedTime] = React.useState(() => {
    if (entry.isActive && entry.startTime) {
      return Date.now() - entry.startTime;
    }
    return 0;
  });
  
  // Update timer every second for active sleep
  React.useEffect(() => {
    if (!entry.isActive || !entry.startTime) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - entry.startTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [entry.isActive, entry.startTime]);
  
  // Format time for display
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

  const isSameLocalDay = (a, b) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isYesterdayLocal = (timestamp) => {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const now = new Date();
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return isSameLocalDay(d, y);
  };

  // Format duration with seconds for active sleep
  const formatDurationWithSeconds = (ms) => {
    return formatElapsedHmsTT(ms).str;
  };

  // Format duration for sleep (with seconds for in-progress)
  const formatDuration = (startTime, endTime, isActive = false) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    if (diffMs < 0) return '';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    // For in-progress, show seconds with smart formatting
    if (isActive) {
      return formatElapsedHmsTT(diffMs).str;
    }
    
    // For completed, show hours and minutes only
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get display values based on mode
  const primaryText = isSleep 
    ? (entry.isActive && entry.startTime
        ? formatDurationWithSeconds(elapsedTime)
        : formatDuration(entry.startTime, entry.endTime, entry.isActive))
    : `${entry.ounces || 0}oz`;
  
  const secondaryText = isSleep
    ? (entry.startTime && entry.endTime 
        ? `${formatTime12Hour(entry.startTime)} – ${formatTime12Hour(entry.endTime)}`
        : entry.startTime 
          ? `${(entry.isActive && isYesterdayLocal(entry.startTime)) ? 'YD ' : ''}${formatTime12Hour(entry.startTime)} – in progress`
          : '')
    : (entry.timestamp ? formatTime12Hour(entry.timestamp) : '');

  const hasNote = entry.notes && entry.notes.trim() !== '';
  const hasPhotos = entry.photoURLs && Array.isArray(entry.photoURLs) && entry.photoURLs.length > 0;
  
  // Get icon based on mode and sleep type (25% larger: 6 * 1.25 = 7.5)
  const getIcon = () => {
    if (isSleep) {
      const sleepType = entry.sleepType || 'night';
      const DaySleepIcon = window.TT?.shared?.icons?.DaySleep || null;
      const NightSleepIcon = window.TT?.shared?.icons?.NightSleep || null;
      const Icon = sleepType === 'day' ? DaySleepIcon : NightSleepIcon;
      const accentColor = 'var(--tt-sleep)';
      
      // Add animated pulsing effect for active sleep
      const iconStyle = entry.isActive 
        ? { 
            color: accentColor,
            animation: 'pulse 2s ease-in-out infinite'
          }
        : { color: accentColor };
      
      return Icon ? React.createElement(Icon, {
        style: { ...iconStyle, width: '2.475rem', height: '2.475rem', strokeWidth: '3' } // 20% bigger (1.875rem * 1.2 = 2.25rem = 36px), +10% = 2.475rem = 39.6px + 0.5 stroke
      }) : React.createElement('div', { style: { width: '2.475rem', height: '2.475rem', borderRadius: '1rem', backgroundColor: 'var(--tt-input-bg)' } });
    } else {
      // In v3 we override the feeding icon with the masked PNG bottle (already mirrored to point right).
      const OverrideIcon = iconOverride || null;
      // Always use BottleV2 for feed timeline items (both variants)
      const BottleIcon = (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"] || null);
      const accentColor = 'var(--tt-feed)';
      // 15% larger than card header: 1.25rem * 1.15 = 1.4375rem (23px)
      const iconSize = '1.4375rem';
      if (OverrideIcon) {
        return React.createElement(OverrideIcon, {
          style: {
            color: accentColor,
            width: iconSize,
            height: iconSize,
            transform: 'rotate(20deg)'
          }
        });
      }
      // If we're using the SVG bottle, mirror it with an outer wrapper so it works reliably everywhere.
      const bottleEl = BottleIcon ? React.createElement(BottleIcon, {
        style: {
          color: accentColor,
          width: iconSize,
          height: iconSize,
          strokeWidth: '1.5',
          fill: 'none',
          transform: 'rotate(20deg)'
        } // Rotated 20 degrees to the right
      }) : null;
      if (bottleEl) {
        return mirrorFeedingIcon
          ? React.createElement('span', { style: { display: 'inline-block', transform: 'scaleX(-1) rotate(20deg)', transformOrigin: 'center' } }, bottleEl)
          : bottleEl;
      }
      return React.createElement('div', { style: { width: iconSize, height: iconSize, borderRadius: '1rem', backgroundColor: 'var(--tt-input-bg)' } });
    }
  };
  
  // Touch handlers for swipe - use refs to add non-passive listeners
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
  };
  
  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Only handle horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      setIsSwiping(true);
      // Allow swiping beyond delete button for full-swipe delete
      const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX); // Allow 2x width for full swipe
      setSwipeOffset(newOffset);
    }
  };
  
  const handleTouchEnd = (finalOffset = null) => {
    if (!isSwiping) return;
    
    // Use provided offset or current swipeOffset state
    const currentOffset = finalOffset !== null ? finalOffset : swipeOffset;
    
    // Full swipe delete (swiped past delete button width) - delete directly
    if (currentOffset < -DELETE_BUTTON_WIDTH * 1.5) {
      // Haptic feedback (if available)
      if (navigator.vibrate) {
        navigator.vibrate(10); // Short vibration
      }
      // Delete directly without confirmation
      if (onDelete && entry?.id) {
        // Reset swipe position first
        setSwipeOffset(0);
        // Call delete handler
        handleDeleteDirect();
      }
    } else if (currentOffset < -SWIPE_THRESHOLD) {
      // Haptic feedback for reveal
      if (navigator.vibrate) {
        navigator.vibrate(5); // Very short vibration
      }
      // Partial swipe - reveal delete button
      setSwipeOffset(-DELETE_BUTTON_WIDTH);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
    setIsSwiping(false);
    touchStartRef.current = null;
  };
  
  // Add non-passive touch listeners using useEffect
  React.useEffect(() => {
    const element = itemRef.current;
    if (!element) return;
    
    const swipeableElement = element.querySelector('.swipeable-content');
    if (!swipeableElement) return;
    
    let currentSwipeOffset = swipeOffset;
    
    const touchMoveHandler = (e) => {
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // Only handle horizontal swipes (more horizontal than vertical)
      if (Math.abs(deltaX) > deltaY && deltaX < 0) {
        setIsSwiping(true);
        e.preventDefault(); // Now we can preventDefault since listener is non-passive
        // Allow swiping beyond delete button for full-swipe delete
        const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX); // Allow 2x width for full swipe
        currentSwipeOffset = newOffset;
        setSwipeOffset(newOffset);
      }
    };
    
    const touchEndHandler = () => {
      handleTouchEnd(currentSwipeOffset);
    };
    
    // Add listeners with passive: false for touchmove so we can preventDefault
    swipeableElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    swipeableElement.addEventListener('touchmove', touchMoveHandler, { passive: false });
    swipeableElement.addEventListener('touchend', touchEndHandler, { passive: true });
    
    return () => {
      swipeableElement.removeEventListener('touchstart', handleTouchStart);
      swipeableElement.removeEventListener('touchmove', touchMoveHandler);
      swipeableElement.removeEventListener('touchend', touchEndHandler);
    };
  }, [swipeOffset, isSwiping, onDelete, entry]);
  
  const handleDeleteDirect = async () => {
    if (!entry || !entry.id || !onDelete) return;
    
    try {
      // firestoreStorage is a global constant, access it directly
      if (typeof firestoreStorage === 'undefined') {
        console.error('firestoreStorage not available');
        alert('Unable to delete. Please try again.');
        return;
      }
      
      if (mode === 'sleep') {
        await firestoreStorage.deleteSleepSession(entry.id);
      } else {
        await firestoreStorage.deleteFeeding(entry.id);
      }
      
      // Reset swipe position
      setSwipeOffset(0);
      
      // Call onDelete callback for data refresh
      if (onDelete) {
        await onDelete();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete. Please try again.');
    }
  };
  
  // Reset swipe when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemRef.current && !itemRef.current.contains(e.target) && swipeOffset < 0) {
        setSwipeOffset(0);
      }
    };
    if (swipeOffset < 0) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [swipeOffset]);
  
  const handleClick = (e) => {
    // Don't trigger onClick if swiping or delete button is visible
    if (isSwiping || swipeOffset < 0) {
      e.stopPropagation();
      return;
    }
    if (onClick && entry) {
      onClick(entry);
    }
  };
  
  return React.createElement(
    'div',
    {
      ref: itemRef,
      className: "relative overflow-hidden rounded-2xl", // Add rounded-2xl to parent for clipping
      style: { touchAction: 'pan-y' } // Allow vertical scroll, handle horizontal swipe
    },
    // Swipeable content wrapper - container stays fixed, right edge doesn't move
    React.createElement(
      'div',
      { 
        className: "swipeable-content rounded-2xl cursor-pointer transition-colors duration-150 tt-tapable",
        style: {
          backgroundColor: timelineBg,
          position: 'relative',
          // Remove translateX from container - it stays fixed
          transition: isSwiping 
            ? 'none' 
            : 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)', // iOS-style spring curve
          zIndex: 1,
          overflow: 'hidden' // Clip delete button when not expanded
        },
        onClick: handleClick
      },
      // Main content wrapper - translates fully left (like Apple Messages)
      React.createElement(
        'div',
        {
          className: "p-4", // Padding for content
          style: { 
            transform: swipeOffset < 0 
              ? `translateX(${swipeOffset}px)` // Full translation, not capped
              : 'translateX(0px)',
            transition: isSwiping 
              ? 'none' 
              : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' // Apple's spring curve
          }
        },
        React.createElement(
          'div',
          { className: "flex items-center justify-between mb-2" },
          React.createElement(
            'div',
            { className: "flex items-center gap-3" },
            getIcon(),
            React.createElement(
              'div',
              null,
              React.createElement('div', { className: "font-semibold", style: { color: 'var(--tt-text-secondary)' } }, 
                primaryText
              ),
              React.createElement('div', { className: "text-[15.4px]", style: { color: 'var(--tt-text-secondary)' } }, 
                secondaryText
              )
            )
          ),
          // Hide chevron when swiped
          swipeOffset >= -SWIPE_THRESHOLD && React.createElement(window.TT?.shared?.icons?.ChevronRightIcon || ChevronDown, { 
            className: "w-5 h-5",
            isTapped: false,
            selectedWeight: 'bold',
            style: { color: 'var(--tt-text-secondary)' } 
          })
        ),
        (hasNote || hasPhotos) && React.createElement(
          React.Fragment,
          null,
          hasNote && React.createElement(
            'div',
            { className: "italic text-[15.4px] mb-3", style: { color: 'var(--tt-text-secondary)' } },
            `Note: ${entry.notes}`
          ),
          hasPhotos && React.createElement(
            'div',
            { className: "grid grid-cols-2 gap-2" },
            entry.photoURLs.slice(0, 4).map((photoUrl, i) =>
              React.createElement(
                'img',
                {
                  key: i,
                  src: photoUrl,
                  alt: `Photo ${i + 1}`,
                  className: "aspect-square rounded-2xl object-cover",
                  style: { backgroundColor: 'var(--tt-input-bg)' }
                }
              )
            )
          )
        )
      ),
      // Delete button - absolutely positioned on right, expands inward from right edge (Apple Messages style)
      onDelete && React.createElement(
        'div',
        {
          className: "absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-r-2xl", // Match rounded corners on right side
          style: {
            width: swipeOffset < 0 
              ? (() => {
                  const absOffset = Math.abs(swipeOffset);
                  // Grow to base width quickly, then expand elastically
                  if (absOffset <= DELETE_BUTTON_WIDTH) {
                    return `${absOffset}px`; // 1:1 growth to base width
                  } else {
                    // Elastic expansion beyond base width (slower growth)
                    const extra = absOffset - DELETE_BUTTON_WIDTH;
                    return `${Math.min(DELETE_BUTTON_MAX_WIDTH, DELETE_BUTTON_WIDTH + extra * 0.3)}px`;
                  }
                })()
              : '0px',
            backgroundColor: '#ef4444',
            transition: isSwiping 
              ? 'none' 
              : 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', // Apple's spring curve
            opacity: swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / 60) : 0,
            overflow: 'hidden' // Hide text when width is 0
          }
        },
        React.createElement(
          'button',
          {
            onClick: handleDeleteDirect,
            className: "text-white font-semibold text-sm px-4 whitespace-nowrap",
            style: { touchAction: 'manipulation' }
          },
          'Delete'
        )
      )
    )
  );
};

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
        if (cardDesign === 'new') return 'v3';
        return 'v2'; // default
      }
      return 'v2';
    },
    shouldUseNewUI: (version) => version !== 'v1',
    getCardDesign: (version) => version === 'v3' ? 'new' : 'current',
    getV3Variant: () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const variant = window.localStorage.getItem('tt_v3_card_variant');
        if (variant && ['variant1', 'variant2'].includes(variant)) {
          return variant;
        }
        return 'variant1'; // default: big icon inline
      }
      return 'variant1';
    }
  };
}

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
  rawFeedings = [],       // All feedings (for yesterday comparison)
  rawSleepSessions = [],  // All sleep sessions (for yesterday comparison)
  currentDate = new Date() // Current date being viewed
}) => {
  ensureZzzStyles();
  ensureTapAnimationStyles();
  
  // UI Version - single source of truth (v1, v2, or v3)
  // Part of UI Version system:
  // - v1: Old UI (not used here, TrackerCard only shows in v2/v3)
  // - v2: useNewUI = true, cardDesign = 'current'
  // - v3: useNewUI = true, cardDesign = 'new'
  const [uiVersion, setUiVersion] = React.useState(() => {
    return (window.TT?.shared?.uiVersion?.getUIVersion || (() => 'v2'))();
  });
  const cardDesign = (window.TT?.shared?.uiVersion?.getCardDesign || ((v) => v === 'v3' ? 'new' : 'current'))(uiVersion);
  
  // V3 Variant - variant1 (big icon inline) or variant2 (small icon + label in header)
  const [v3Variant, setV3Variant] = React.useState(() => {
    return (window.TT?.shared?.uiVersion?.getV3Variant || (() => 'variant1'))();
  });
  
  // Listen for changes to the feature flags
  React.useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const version = (window.TT?.shared?.uiVersion?.getUIVersion || (() => 'v2'))();
        setUiVersion(version);
        const variant = (window.TT?.shared?.uiVersion?.getV3Variant || (() => 'variant1'))();
        setV3Variant(variant);
      }
    };
    
    // Listen for storage events (when changed from another tab/window)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab changes)
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const [expanded, setExpanded] = React.useState(false);
  
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
    return formatV3Number(yesterdayTotal.total);
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
      
      console.log('Yesterday calculation debug:', {
        mode,
        currentDate: currentDate?.toString(),
        currentDateType: typeof currentDate,
        currentTime: `${currentHour}:${currentMinute}`,
        roundedTime: `${roundedHour}:${finalMinutes}`,
        yesterdayStart: new Date(yesterdayStart).toLocaleString(),
        yesterdayStartMs: yesterdayStart,
        yesterdayCutoff: new Date(yesterdayCutoff).toLocaleString(),
        yesterdayCutoffMs: yesterdayCutoff,
        yesterdayTotal,
        yesterdayPercent,
        formattedYesterdayTotal,
        target,
        rawFeedingsCount: rawFeedings?.length,
        rawSleepSessionsCount: rawSleepSessions?.length,
        filteredCount,
        sampleData
      });
    } else if (!showYesterdayComparison) {
      hasLoggedRef.current = false;
    }
  }, [showYesterdayComparison, yesterdayTotal, yesterdayPercent, formattedYesterdayTotal, mode, target, rawFeedings, rawSleepSessions, currentDate]);
  
  // Get the icon for yesterday comparison
  const YesterdayIcon = mode === 'feeding' 
    ? (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["bottle-main"] || window.TT.shared.icons.Bottle2)) || null
    : (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["moon-main"] || window.TT.shared.icons.Moon2)) || null;
  
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
  const ActiveSleepTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = React.useState(() => {
      return Date.now() - startTime;
    });
    
    React.useEffect(() => {
      const interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(interval);
    }, [startTime]);
    
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
            React.createElement(ActiveSleepTimer, { startTime: activeEntry.startTime }),
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
  const timelineSubtleBg = 'var(--tt-subtle-surface)';

  // Get the appropriate icon for the header - use BottleV2 and MoonV2 for both variants
  const HeaderIcon = mode === 'feeding' 
    ? (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) || null
    : (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) || null;

  // v3 "main" icons - use BottleV2 and MoonV2 for both variants
  const BottleMainIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["bottle-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Bottle2) ||
    HeaderIcon ||
    null;
  const MoonMainIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["moon-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Moon2) ||
    HeaderIcon ||
    null;

  // Shared renderer: v2 ("current") and v3 ("new") can vary styling without duplicating markup.
  const renderDesign = ({
    showHeaderRow = true,                   // show the old header row (icon + Feed/Sleep + headerRight)
    iconOverride = null,                    // override icon component (v3 uses bottle-main/moon-main)
    headerGapClass = 'gap-2',                 // icon ↔ label spacing
    headerBottomMarginClass = 'mb-6',         // header ↔ big number spacing
    headerLabelClassName = 'text-base font-semibold',
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
    bigNumberIconValueGapClassName = "gap-[6px]", // spacing between icon and big-number value (v3)
    bigNumberValueClassName = "text-[40px] leading-none font-bold",
    bigNumberTargetClassName = "relative -top-[1px] text-[16px] leading-none",
    bigNumberTargetColor = 'var(--tt-text-secondary)',
    bigNumberTargetVariant = 'target',        // 'target' | 'unit' (v3 uses 'unit')
    bigNumberTopLabel = null,                 // optional icon + label above big number (for v3 feeding)
    progressTrackHeightClass = 'h-6',         // progress track (fill uses h-full)
    progressTrackBg = 'var(--tt-input-bg)',   // progress track background
    statusRow = null,                         // optional row below progress bar (v3)
    statusRowClassName = '',                  // spacing wrapper for statusRow
    showDotsRow = true,                       // dots row under progress bar
    progressBottomMarginClass = 'mb-1',       // spacing after progress bar
    dividerMarginClass = 'my-4',              // divider spacing
    timelineTextColor = 'var(--tt-text-secondary)',
    timelineVariant = 'v2',                   // 'v2' | 'v3' (v3 uses pill + no bullet)
    timelineCountPill = null                 // optional v3 pill shown inline next to "Timeline"
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
    'div',
    { 
      className: "rounded-2xl p-5 shadow-sm",
      style: {
        backgroundColor: "var(--tt-card-bg)",
        borderColor: "var(--tt-card-border)",
        cursor: 'pointer',
        transition: 'all 0.3s ease-out'
      },
      onClick: handleCardTap
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
            ? headerLabel  // variant 2: show icon + label in header
            : React.createElement('div', { 
                className: headerLabelClassName,
                style: { color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)' }
              }, mode === 'feeding' ? 'Feed' : 'Sleep')
        ) : null
      ) : null,
      headerRight
    ) : null,

    // Optional icon + label above big number (for v3 feeding)
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
        total !== null ? formatV3Number(total) : '0'
      );

      const targetEl = React.createElement('div', { 
        className: bigNumberTargetClassName,
        style: { color: bigNumberTargetColor } 
      }, 
        bigNumberTargetVariant === 'unit'
          ? (mode === 'sleep' ? 'hrs' : 'oz')
          : (target !== null 
              ? (mode === 'sleep' ? `/ ${formatV3Number(target)} hrs` : `/ ${formatV3Number(target)} oz`)
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

      // Default (v2): number + target only.
      if (!showBigNumberIcon && !bigNumberRight) {
        return React.createElement(
          'div',
          { className: bigNumberRowClassName },
          valueEl,
          targetEl
        );
      }

      // v3: icon + number (left) and optional right content (status pill)
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
    
    // Animated Progress Bar (production-style)
    // Direct percentage calculation like old ProgressBarRow - smooth transitions without resetting
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
          minWidth: '0%', // Ensure smooth animation to 0
          position: 'relative' // Ensure ::after pseudo-element positions correctly
        }
      })
    ),
    // Yesterday comparison section (insert after main progress bar, before status/dots)
    // Only show when viewing today AND comparison is toggled on
    (showYesterdayComparison && isViewingToday) && React.createElement(
      React.Fragment,
      null,
      // Number + label inline, then progress bar below
      React.createElement('div', {
        className: "mb-8 mt-3"
      },
        // Number + "as of" text inline
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
        // Progress bar with track (40% height of main bar - doubled for visibility)
        React.createElement('div', {
          className: "relative w-full rounded-2xl overflow-hidden",
          style: {
            height: progressTrackHeightClass === 'h-6' 
              ? '9.6px'  // 40% of 24px (doubled from 20%)
              : '6.336px', // 40% of 15.84px (doubled from 20%)
            backgroundColor: 'var(--tt-subtle-surface)', // Dark mode compatible track
            minHeight: '4px' // Ensure track is always visible (doubled)
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
              minWidth: yesterdayPercent > 0 ? '2px' : '0px' // Ensure fill is visible if there's data (doubled)
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
    // Divider - always show
    React.createElement('div', { 
      className: `border-t ${dividerMarginClass}`,
      style: { 
        borderColor: document.documentElement.classList.contains('dark') 
          ? 'rgba(255,255,255,0.06)'  // More subtle in dark mode
          : 'rgb(243, 244, 246)'  // border-gray-100 equivalent for light mode
      }
    }),
    React.createElement(
      'button',
      {
        onClick: () => setExpanded(!expanded),
        className: "flex w-full items-center justify-between",
        style: { color: timelineTextColor }
      },
      React.createElement(
        'span',
        null,
        timelineVariant === 'v3'
          ? (timelineCountPill 
              ? timelineCountPill  // Feeding: replace "Timeline" with pills
              : React.createElement(  // Sleep: show "Timeline" text
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
    expanded && React.createElement(
      'div',
      { className: "mt-4" },
      ((localTimelineItems && localTimelineItems.length > 0) || exitingIds.size > 0)
        ? (() => {
            return localTimelineItems.map((entry, index) => {
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
                  mirrorFeedingIcon: timelineVariant === 'v3',
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

  // v2: current design (production)
  const renderCurrentDesign = () => renderDesign();

  // v3: new design (experimental) — ONLY change styling here
  const renderNewDesign = () => {
    // Prefer PNG icons (if present) with SVG fallback.
    // Drop these files in the project root:
    // - assets/ui-icons/inv bottle-main-right-v3@3x.png.png
    // - assets/ui-icons/inv moon-main@3x.png
    //
    // NOTE: This component must be stable across renders to avoid image flicker
    // (active sleep re-renders every second).
    // Use BottleV2 and MoonV2 directly for both variants
    const v3IconSvg = mode === 'feeding'
      ? (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"] || BottleMainIcon)
      : (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"] || MoonMainIcon);
    const v3IconSrc = (mode === 'feeding')
      ? 'assets/ui-icons/inv bottle-main-right-v3@3x.png.png'
      : 'assets/ui-icons/inv moon-main@3x.png';

    const V3Icon = React.useMemo(() => {
      const currentMode = mode; // Capture mode in closure
      const currentVariant = (window.TT?.shared?.uiVersion?.getV3Variant || (() => 'variant1'))();
      const isVariant2 = currentVariant === 'variant2';
      // For variant 2, skip PNG and use SVG directly for feeding mode
      const skipPNG = isVariant2 && currentMode === 'feeding';
      
      return function V3IconComponent(props) {
        const [failed, setFailed] = React.useState(skipPNG ? true : false);
        // Prefer CSS mask tinting (works great for silhouette PNGs) so icons can use accent tokens.
        // Fall back to SVG if mask isn't supported or if PNG fails to load.
        const canMask = (() => {
          try {
            if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
            // Safari uses -webkit-mask-image; other browsers support mask-image.
            return CSS.supports('(-webkit-mask-image: url("x"))') || CSS.supports('(mask-image: url("x"))');
          } catch {
            return false;
          }
        })();

        // Preload the PNG so we can fall back cleanly if the file is missing.
        // Skip PNG loading for variant 2 feeding mode
        React.useEffect(() => {
          if (skipPNG) return; // Skip PNG loading for variant 2 feeding
          
          let cancelled = false;
          try { setFailed(false); } catch {}
          try {
            const img = new Image();
            img.onload = () => { /* noop */ };
            img.onerror = () => { if (!cancelled) setFailed(true); };
            img.src = v3IconSrc;
          } catch {
            if (!cancelled) setFailed(true);
          }
          return () => { cancelled = true; };
        }, [v3IconSrc, skipPNG]);

        if (failed || !v3IconSrc || skipPNG) {
          // When using SVG fallback, ensure correct styling for BottleV2/MoonV2
          const svgProps = {
            ...props,
            style: {
              ...(props?.style || {}),
              strokeWidth: currentMode === 'feeding' ? '1.5' : undefined,
              fill: currentMode === 'feeding' ? 'none' : (currentMode === 'sleep' ? (props?.style?.color || 'var(--tt-sleep)') : undefined)
            }
          };
          return v3IconSvg ? React.createElement(v3IconSvg, svgProps) : null;
        }
        const { style, alt, ...rest } = props || {};
        const baseStyle = { ...(style || {}) };
        // Bottle PNG is stored already mirrored (points right), so no runtime flip needed here.

        const tintColor = baseStyle.color || 'currentColor';

        if (canMask) {
          // Safari can be finicky about transforms on elements that also have -webkit-mask-image.
          // To make mirroring 100% reliable, apply transforms on an outer wrapper and keep the mask on an inner span.
          const { transform, WebkitTransform, transformOrigin, WebkitTransformOrigin, ...innerBase } = baseStyle;

          const outerStyle = {
            ...innerBase,
            display: 'inline-block',
            // keep transforms only on outer wrapper
            ...(transform ? { transform } : null),
            ...(WebkitTransform ? { WebkitTransform } : null),
            ...(transformOrigin ? { transformOrigin } : null),
            ...(WebkitTransformOrigin ? { WebkitTransformOrigin } : null)
          };

          const innerStyle = {
            width: '100%',
            height: '100%',
            display: 'block',
            backgroundColor: tintColor,
            // CSS mask (tints the silhouette)
            WebkitMaskImage: `url("${v3IconSrc}")`,
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskImage: `url("${v3IconSrc}")`,
            maskRepeat: 'no-repeat',
            maskSize: 'contain',
            maskPosition: 'center'
          };

          return React.createElement(
            'span',
            {
              ...rest,
              'aria-hidden': alt ? undefined : true,
              role: alt ? 'img' : undefined,
              'aria-label': alt || undefined,
              style: outerStyle
            },
            React.createElement('span', { style: innerStyle })
          );
        }

        // No mask support: fall back to SVG (keeps accent colors via currentColor).
        return v3IconSvg ? React.createElement(v3IconSvg, props) : null;
      };
    }, [mode, v3IconSrc, v3IconSvg]);

    const v3StatusText = mode === 'feeding'
      ? (lastEntryTime ? `Last ate at ${formatTime12Hour(lastEntryTime)}` : 'No feedings yet')
      : (() => {
          const activeEntry = localTimelineItems.find(item => item.isActive && item.startTime);
          if (activeEntry) {
            return React.createElement(
              'span',
              { className: "inline-flex items-center gap-2" },
              React.createElement(ActiveSleepTimer, { startTime: activeEntry.startTime }),
              React.createElement(
                'span',
                { className: "inline-flex items-center font-light", style: { color: 'currentColor' } },
                zzzElementMemo
              )
            );
          }
          const lastCompletedSleep = localTimelineItems.find(item => item.endTime && !item.isActive);
          if (lastCompletedSleep && lastCompletedSleep.endTime) {
            return `Last woke at ${formatTime12Hour(lastCompletedSleep.endTime)}`;
          }
          return 'No sleep logged';
        })();

    // Get variant state (will be defined later, but we need it here)
    const currentVariant = (window.TT?.shared?.uiVersion?.getV3Variant || (() => 'variant1'))();
    const isVariant2ForStatus = currentVariant === 'variant2';
    
    const v3HeaderRight = (() => {
      // Active sleep: special tappable/pulsing pill that opens sleep controls.
      const isActiveSleepPill = (mode === 'sleep' && isSleepActive);
      
      // Variant 2: only show pill if there's an active sleep, otherwise plain text
      if (isVariant2ForStatus && !isActiveSleepPill) {
        return React.createElement(
          'span',
          {
            className: "text-[15.4px] font-normal leading-none",
            style: { color: 'var(--tt-text-tertiary)' }
          },
          v3StatusText
        );
      }
      
      // v3 pills: keep a single source of truth so height/radius stays consistent.
      // Fixed height avoids subtle font/animation differences changing pill size.
      const v3PillBaseClass =
        "inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg whitespace-nowrap text-[15.4px] font-normal leading-none";

      const pillInner = React.createElement(
        'span',
        { className: "inline-flex items-center" },
        React.createElement('span', null, v3StatusText)
      );

      // Active sleep: special tappable/pulsing pill that opens sleep controls.
      if (isActiveSleepPill && typeof onActiveSleepClick === 'function') {
        return React.createElement(
          'button',
          {
            type: 'button',
            onClick: (e) => {
              try { e.preventDefault(); e.stopPropagation(); } catch {}
              try { onActiveSleepClick(); } catch {}
            },
            className: `${v3PillBaseClass} gap-1 tt-tapable tt-sleep-progress-pulse`,
            style: {
              backgroundColor: 'var(--tt-sleep-softer, var(--tt-sleep-soft))',
              color: 'var(--tt-sleep)'
            },
            title: "Sleep controls",
            'aria-label': "Sleep controls"
          },
          pillInner
        );
      }

      // Default v3 status pill (non-interactive)
      return React.createElement(
        'span',
        {
          className: `${v3PillBaseClass} gap-1`,
          style: { backgroundColor: 'var(--tt-subtle-surface)', color: 'var(--tt-text-tertiary)' }
        },
        pillInner
      );
    })();

    // Variant 1: Big icon inline with big number (default)
    // Variant 2: Small icon + label in header
    const isVariant1 = v3Variant === 'variant1';
    const isVariant2 = v3Variant === 'variant2';

    const v3CountPill = (() => {
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

    // v3 pills: keep a single source of truth so height/radius stays consistent.
    const v3PillBaseClass =
      "inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg whitespace-nowrap text-[15.4px] font-normal leading-none";

    // For feeding: pills go in timeline (count only for variant 2, count + status for variant 1)
    const v3FeedingTimelinePills = mode === 'feeding' ? React.createElement(
      'span',
      { className: "flex items-center gap-3" },
      v3CountPill,
      isVariant1 ? v3HeaderRight : null  // Status pill moved to header for variant 2
    ) : null;

    // For sleep: pills go in timeline (count only for variant 2, count + status for variant 1)
    const v3SleepTimelinePills = mode === 'sleep' ? React.createElement(
      'span',
      { className: "flex items-center gap-3" },
      v3CountPill,
      isVariant1 ? v3HeaderRight : null  // Status pill moved to header for variant 2
    ) : null;

    // Helper function to create icon + label component (for variant 2)
    const createIconLabel = (m) => {
      const isFeed = m === 'feeding';
      // Variant 2 uses new SVG icons (BottleV2 and MoonV2)
      const v3Svg = isFeed
        ? ((window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.BottleV2) ||
           (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["bottle-v2"]) ||
           null)
        : ((window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.MoonV2) ||
           (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["moon-v2"]) ||
           null);
      const color = isFeed ? 'var(--tt-feed)' : 'var(--tt-sleep)';
      const label = isFeed ? 'Feeding' : 'Sleep';
      
      // Variant 2 uses SVG icons directly (no PNG mask needed)
      return React.createElement(
        'div',
        { 
          className: "text-[17.6px] font-semibold inline-flex items-center gap-1",
          style: { color }
        },
        v3Svg ? React.createElement(v3Svg, { 
          className: "w-5 h-5", 
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

    const v3HeaderLabel = isVariant2 ? createIconLabel(mode) : null;
    const v3TopLabel = isVariant2 ? createIconLabel(mode) : null;

    return renderDesign({
      showHeaderRow: isVariant2,                    // show header row for variant 2 (with icon + label)
      headerGapClass: 'gap-2',
      headerBottomMarginClass: 'mb-8',
      headerLabelClassName: 'text-[15.4px] font-medium',
      iconOverride: V3Icon,
      feedingIconTransform: 'none',                        // bottle PNG is pre-flipped to point right
      sleepIconTransform: 'translateY(2px)',                // nudge moon down 2px
      mirrorFeedingIcon: false,
      showHeaderIcon: false,
      headerRight: isVariant2 ? v3HeaderRight : null,  // variant 2: status pill in header, variant 1: in timeline
      headerLabel: isVariant2 ? v3HeaderLabel : null,  // variant 2: icon + label in header
      showBigNumberIcon: isVariant1,                // show big icon inline for variant 1
      bigNumberTopLabel: null,                      // not used in header (use headerLabel instead)
      // Per-mode sizing: 5% smaller than current (bottle 34.2px -> 32.49px, moon 32.4px -> 30.78px), +10% = 35.739px / 33.858px
      bigNumberIconClassName: mode === 'feeding' ? 'h-[35.739px] w-[35.739px]' : 'h-[33.858px] w-[33.858px]',
      // v3: big-number row is just icon + number + target (left-aligned)
      bigNumberRight: null,
      bigNumberRowClassName: isVariant1 
        ? "flex items-baseline gap-1 mb-[13px]"  // Consistent alignment for both feeding and sleep
        : "flex items-baseline gap-1 mb-[13px]",  // Consistent alignment for both feeding and sleep
      // Icons were matched; add +1px only for sleep (moon) per request.
      bigNumberIconValueGapClassName: mode === 'sleep' ? 'gap-[8px]' : 'gap-[6px]',
      bigNumberValueClassName: "text-[39.6px] leading-none font-bold",
      bigNumberTargetClassName: isVariant1 
        ? "relative -top-[2px] text-[17.6px] leading-none font-normal"  // variant 1: consistent for both feeding and sleep
        : "relative -top-[1px] text-[17.6px] leading-none font-normal",  // variant 2: consistent for both feeding and sleep
      bigNumberTargetColor: 'var(--tt-text-secondary)',
      bigNumberTargetVariant: 'target',
      // 12px * 1.2 = 14.4px, +10% = 15.84px
      progressTrackHeightClass: 'h-[15.84px]',
      progressTrackBg: 'var(--tt-subtle-surface)',
      // v3: no status row below progress bar (pills moved to timeline/header)
      statusRow: null,
      statusRowClassName: "",
      showDotsRow: false,
      progressBottomMarginClass: 'mb-0',
      dividerMarginClass: 'my-4',
      timelineTextColor: 'var(--tt-text-tertiary)',
      timelineVariant: 'v3',
      timelineCountPill: mode === 'feeding' ? v3FeedingTimelinePills : v3SleepTimelinePills  // pills replace "Timeline" for both modes
    });
  };

  // Conditional render based on feature flag
  return cardDesign === 'new' ? renderNewDesign() : renderCurrentDesign();
};

// Detail Sheet Components
// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTFeedDetailSheet && !window.TTSleepDetailSheet) {
  
  // Height constants (82% of viewport height)
  const DETAIL_SHEET_HEIGHT_VH = 82;
  const SLEEP_DETAIL_SHEET_HEIGHT_VH = 82;
  const INPUT_SHEET_HEIGHT_VH = 82;
  
  // HalfSheet wrapper component (UI Lab only)
  const HalfSheet = ({ isOpen, onClose, title, rightAction, children, accentColor, fixedHeight }) => {
    const sheetRef = React.useRef(null);
    const backdropRef = React.useRef(null);
    const headerRef = React.useRef(null);
    const contentRef = React.useRef(null);
    const [present, setPresent] = React.useState(false); // Controls rendering
    const scrollYRef = React.useRef(0);
    const [needsScroll, setNeedsScroll] = React.useState(false);
    
    // Drag state
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStartY, setDragStartY] = React.useState(0);
    const [dragCurrentY, setDragCurrentY] = React.useState(0);
    const [dragStartTime, setDragStartTime] = React.useState(0);
    
    // Refs for drag state to access latest values in event handlers
    const isDraggingRef = React.useRef(false);
    const dragStartYRef = React.useRef(0);
    const dragCurrentYRef = React.useRef(0);
    const dragStartTimeRef = React.useRef(0);
    
    // Keep refs in sync with state
    React.useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);
    
    React.useEffect(() => {
      dragStartYRef.current = dragStartY;
    }, [dragStartY]);
    
    React.useEffect(() => {
      dragCurrentYRef.current = dragCurrentY;
    }, [dragCurrentY]);
    
    React.useEffect(() => {
      dragStartTimeRef.current = dragStartTime;
    }, [dragStartTime]);

    // Set present when isOpen becomes true
    React.useEffect(() => {
      if (isOpen) {
        setPresent(true);
      }
    }, [isOpen]);

    // Lock/unlock body scroll while present
    React.useEffect(() => {
      if (!present) return;
      // iOS Safari/PWA: overflow:hidden is not a reliable scroll lock once the keyboard shows.
      // Use position:fixed lock pattern to prevent the underlying page from scrolling.
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

    // Calculate viewport-based height
    const getViewportHeight = React.useCallback(() => {
      const vv = window.visualViewport;
      const fallbackH = document.documentElement?.clientHeight || window.innerHeight;
      return vv ? vv.height : fallbackH;
    }, []);

    const [sheetHeight, setSheetHeight] = React.useState(() => {
      const vh = getViewportHeight();
      const heightVH = fixedHeight || DETAIL_SHEET_HEIGHT_VH;
      return `${(vh * heightVH) / 100}px`;
    });
    
    // Update height when viewport changes or fixedHeight changes
    React.useEffect(() => {
      if (!isOpen || !present) return;
      
      const updateHeight = () => {
        const vh = getViewportHeight();
        const heightVH = fixedHeight || 70; // Default to 70vh
        setSheetHeight(`${(vh * heightVH) / 100}px`);
      };
      
      updateHeight(); // Update immediately when fixedHeight changes
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, [isOpen, present, fixedHeight, getViewportHeight]);

    // Update transition - include both transform and height
    React.useEffect(() => {
      if (!present || !isOpen || !sheetRef.current) return;
      sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1), height 300ms cubic-bezier(0.2, 0, 0, 1)';
    }, [isOpen, present]);

    // Animation: Open and Close
    React.useEffect(() => {
      if (!present || !sheetRef.current) return;
      
      if (isOpen) {
        // Open: slide up
        requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transform = 'translateY(0)';
          }
        });
      } else {
        // Close: slide down
            sheetRef.current.style.transform = 'translateY(100%)';
        // After animation, unmount
        const timer = setTimeout(() => {
          setPresent(false);
        }, 250);
        return () => clearTimeout(timer);
      }
    }, [isOpen, present]);

    // Check if content overflows and needs scrolling
    React.useEffect(() => {
      if (!present || !isOpen || !contentRef.current) {
        setNeedsScroll(false);
        return;
      }
      // Check after a brief delay to allow content to render
      const checkOverflow = () => {
        if (contentRef.current) {
          const needs = contentRef.current.scrollHeight > contentRef.current.clientHeight;
          setNeedsScroll(needs);
        }
      };
      // Initial check
      setTimeout(checkOverflow, 50);
      // Recheck on resize or content changes
      const resizeObserver = new ResizeObserver(checkOverflow);
      if (contentRef.current) resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }, [present, isOpen, children]);

    // Drag handlers
    const canDrag = React.useCallback(() => {
      if (!contentRef.current) return false;
      const scrollTop = contentRef.current.scrollTop;
      return scrollTop === 0;
    }, []);

    // Touch handlers stored in refs to access latest state values
    const handleTouchStartRef = React.useRef((e) => {
      if (!canDrag()) return;
      const touch = e.touches[0];
      isDraggingRef.current = true;
      dragStartYRef.current = touch.clientY;
      dragCurrentYRef.current = touch.clientY;
      dragStartTimeRef.current = Date.now();
      if (sheetRef.current) {
      // Only disable transform transition, keep height transition
        sheetRef.current.style.transition = 'height 300ms cubic-bezier(0.2, 0, 0, 1)';
      }
    });

    const handleTouchMoveRef = React.useRef((e) => {
      if (!isDraggingRef.current) return;
      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartYRef.current;
      
      if (deltaY > 0 && sheetRef.current) {
        e.preventDefault();
        dragCurrentYRef.current = touch.clientY;
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    });

    const handleTouchEndRef = React.useRef((e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      
      const deltaY = dragCurrentYRef.current - dragStartYRef.current;
      const deltaTime = Date.now() - dragStartTimeRef.current;
      const velocity = deltaY / deltaTime;
      
      if (sheetRef.current) {
      // Restore both transitions
        sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1), height 300ms cubic-bezier(0.2, 0, 0, 1)';
      
        if (deltaY > 100 || velocity > 0.3) {
        if (onClose) onClose();
      } else {
        sheetRef.current.style.transform = 'translateY(0)';
        }
      }
    });

    // Attach touch event listeners directly to DOM with passive: false
    // This allows preventDefault() to work properly
    React.useEffect(() => {
      if (!present || !isOpen || !sheetRef.current) return;
      
      const sheetEl = sheetRef.current;
      
      sheetEl.addEventListener('touchstart', handleTouchStartRef.current, { passive: false });
      sheetEl.addEventListener('touchmove', handleTouchMoveRef.current, { passive: false });
      sheetEl.addEventListener('touchend', handleTouchEndRef.current, { passive: false });
      
      return () => {
        sheetEl.removeEventListener('touchstart', handleTouchStartRef.current);
        sheetEl.removeEventListener('touchmove', handleTouchMoveRef.current);
        sheetEl.removeEventListener('touchend', handleTouchEndRef.current);
      };
    }, [isOpen, present]);

    // Escape closes
    React.useEffect(() => {
      if (!present || !isOpen) return;
      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (onClose) onClose();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, present, onClose]);

    // Only render if present
    if (!present) return null;

    // Use portal to render to document.body, bypassing any transformed ancestors
    // This ensures position: fixed works relative to the viewport, not a transformed parent
    return ReactDOM.createPortal(
      React.createElement(
        React.Fragment,
        null,
        // Backdrop
        React.createElement('div', {
          ref: backdropRef,
          className: "fixed inset-0 bg-black",
          onClick: () => { if (onClose && !isDragging) onClose(); },
          style: { 
            opacity: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }
        }),
        // Sheet Panel
        React.createElement('div', {
          ref: sheetRef,
          className: "fixed left-0 right-0 bottom-0 shadow-2xl",
          onClick: (e) => e.stopPropagation(),
          style: {
            backgroundColor: "var(--tt-card-bg)",
            transform: 'translateY(100%)',
            willChange: 'transform',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
            maxHeight: '100%',
            height: sheetHeight,
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
          // Header (part of HalfSheet chrome)
          React.createElement('div', {
            ref: headerRef,
            className: accentColor ? "" : "bg-black",
            style: { 
              backgroundColor: accentColor || '#000000',
              borderTopLeftRadius: '20px', 
              borderTopRightRadius: '20px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }
          },
            // ChevronDown button (close)
            React.createElement('button', {
              onClick: onClose,
              className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
            }, React.createElement(ChevronDown, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
            
            // Centered title
            React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, title || ''),
            
            // Right action (Save button)
            rightAction || React.createElement('div', { className: "w-6" })
          ),
          // Body area (scrollable)
          React.createElement('div', {
            ref: contentRef,
            className: `flex-1 px-6 pt-8 pb-[42px] ${needsScroll ? 'overflow-y-auto' : 'overflow-y-hidden'}`,
            style: {
              WebkitOverflowScrolling: needsScroll ? 'touch' : 'auto',
              minHeight: 0,
              overscrollBehavior: 'none',
              touchAction: needsScroll ? 'pan-y' : 'none'
            }
          }, children)
        )
      ),
      document.body
    );
  };

  // Helper function to format date/time for display
  const formatDateTime = (date) => {
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
  };

  // Input Field Row Component
  const InputRow = ({ label, value, onChange, icon, type = 'text', placeholder = '', rawValue, invalid = false }) => {
    
    // For datetime fields, use rawValue (ISO string) for the picker, but display formatted value
    // If rawValue is null/empty and placeholder exists, show placeholder as the value
    const displayValue = type === 'datetime' 
      ? (rawValue ? formatDateTime(rawValue) : (placeholder || ''))
      : value;
    const inputRef = React.useRef(null);
    const timeAnchorRef = React.useRef(null);
    
    const handleRowClick = (e) => {
      // Don't focus if clicking the icon button or done button
      if (e.target.closest('button')) {
        return;
      }
      // For datetime fields, use old picker
      if (type === 'datetime' || type === 'datetime-local' || type === 'date' || type === 'time') {
        e.preventDefault();
        if (window.TT && window.TT.ui && window.TT.ui.openAnchoredTimePicker) {
          window.TT.ui.openAnchoredTimePicker({
            anchorEl: timeAnchorRef.current,
            rawValue,
            onChange
          });
        }
      } else if (inputRef.current) {
        // For other types, focus the input
        inputRef.current.focus();
      }
    };
    
    const handleIconClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (type === 'datetime' || type === 'datetime-local' || type === 'date' || type === 'time') {
        // Use old picker
        if (window.TT && window.TT.ui && window.TT.ui.openAnchoredTimePicker) {
          window.TT.ui.openAnchoredTimePicker({
            anchorEl: timeAnchorRef.current,
            rawValue,
            onChange
          });
        }
      } else {
        // For non-datetime types, focus the input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    return React.createElement(
      'div',
      { 
        className: "rounded-2xl mb-2 transition-all duration-200",
        style: { 
          backgroundColor: 'var(--tt-input-bg)', 
          position: 'relative',
          overflow: 'hidden'
        }
      },
      // Header row with label
      React.createElement(
        'div',
        {
          className: "flex items-center justify-between p-4 cursor-pointer",
          onClick: handleRowClick
        },
        React.createElement('div', { className: "flex-1" },
          React.createElement('div', { 
            className: "text-xs mb-1",
            style: { color: 'var(--tt-text-secondary)' } 
          },
            React.createElement('span', {}, label)
          ),
          type === 'text' 
            ? React.createElement('textarea',
                {
                  ref: inputRef,
                  value: displayValue || '',
                  onChange: (e) => {
                    if (onChange) {
                      onChange(e.target.value);
                      const el = e.target;
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  },
                  placeholder: placeholder,
                  rows: 1,
                  className: "tt-placeholder-tertiary text-base font-normal w-full outline-none resize-none",
                  style: { background: 'transparent', maxHeight: '4.5rem', overflowY: 'auto', color: invalid ? '#ef4444' : 'var(--tt-text-primary)' }
                }
              )
            : React.createElement('input',
                {
                  ref: type === 'datetime' ? timeAnchorRef : inputRef,
                  type: type === 'datetime' ? 'text' : type,
                  inputMode: type === 'number' ? 'decimal' : undefined,
                  step: type === 'number' ? '0.25' : undefined,
                  value: displayValue || '',
                  onChange: (e) => {
                    if (type !== 'datetime' && onChange) {
                      if (type === 'number') {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        onChange(value);
                      } else {
                        onChange(e.target.value);
                      }
                    }
                  },
                  placeholder: placeholder,
                  className: `tt-placeholder-tertiary text-base font-normal w-full outline-none ${invalid ? 'text-red-600' : ''}`,
                  style: { 
                    background: 'transparent', 
                    color: invalid 
                      ? '#ef4444'
                      : (type === 'datetime' && !rawValue && placeholder ? 'var(--tt-text-tertiary)' : 'var(--tt-text-primary)')
                  },
                  readOnly: type === 'datetime'
                }
              )
        ),
        icon && React.createElement('button', {
          onClick: handleIconClick,
          className: "ml-4",
          style: { marginLeft: '17px' }
        }, icon)
      )
    );
  };

  // TTFeedDetailSheet Component
  const TTFeedDetailSheet = ({ isOpen, onClose, entry = null, onDelete = null, onSave = null }) => {
    const [ounces, setOunces] = React.useState('');
    const [dateTime, setDateTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    const ctaFooterRef = React.useRef(null);
    const CTA_BOTTOM_OFFSET_PX = 30;
    
    // Track original photo URLs to detect deletions
    const originalPhotoURLsRef = React.useRef([]);
    
    // Collapsible Notes/Photos state
    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);

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
        console.log('[TTFeedDetailSheet] Save blocked: invalid amount', amount);
        return;
      }
      
      console.log('[TTFeedDetailSheet] Starting save...', { amount, photosCount: photos?.length || 0, existingPhotosCount: existingPhotoURLs?.length || 0 });
      setSaving(true);
      try {
        const timestamp = new Date(dateTime).getTime();
        console.log('[TTFeedDetailSheet] Timestamp:', timestamp);
        
        // Track removed photos for soft delete (optional cleanup later)
        const originalURLs = originalPhotoURLsRef.current || [];
        const removedPhotoURLs = originalURLs.filter(url => !existingPhotoURLs.includes(url));
        
        if (removedPhotoURLs.length > 0) {
          console.log('[TTFeedDetailSheet] Photos removed (soft delete):', removedPhotoURLs.length);
          // Photos are removed from photoURLs array - no Supabase deletion
          // Files remain in Supabase Storage for optional cleanup later
        }
        
        // Upload new photos to Supabase Storage
        const newPhotoURLs = [];
        if (photos && photos.length > 0) {
          console.log('[TTFeedDetailSheet] Starting photo uploads...', photos.length);
          for (let i = 0; i < photos.length; i++) {
            const photoBase64 = photos[i];
          try {
              console.log(`[TTFeedDetailSheet] Uploading photo ${i + 1}/${photos.length}...`);
            const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
              console.log(`[TTFeedDetailSheet] Photo ${i + 1} uploaded successfully:`, downloadURL);
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
          console.log('[TTFeedDetailSheet] Photo uploads complete. Success:', newPhotoURLs.length, 'Failed:', photos.length - newPhotoURLs.length);
        } else {
          console.log('[TTFeedDetailSheet] No photos to upload');
        }
        
        // Combine existing and new photo URLs
        const allPhotoURLs = [...existingPhotoURLs, ...newPhotoURLs];
        console.log('[TTFeedDetailSheet] Photo URL arrays:', {
          originalCount: originalURLs.length,
          originalURLs: originalURLs,
          existingCount: existingPhotoURLs.length,
          existingURLs: existingPhotoURLs,
          newCount: newPhotoURLs.length,
          newURLs: newPhotoURLs,
          allCount: allPhotoURLs.length,
          allURLs: allPhotoURLs,
          removedCount: removedPhotoURLs.length,
          removedURLs: removedPhotoURLs
        });
        console.log('[TTFeedDetailSheet] Total photo URLs:', allPhotoURLs.length, { existing: existingPhotoURLs.length, new: newPhotoURLs.length });
        
        if (entry && entry.id) {
          // Update existing feeding
          console.log('[TTFeedDetailSheet] Updating existing feeding:', entry.id);
          console.log('[TTFeedDetailSheet] Saving photoURLs to Firestore:', allPhotoURLs.length > 0 ? allPhotoURLs : []);
          await firestoreStorage.updateFeedingWithNotes(
            entry.id,
            amount,
            timestamp,
            notes || null,
            allPhotoURLs.length > 0 ? allPhotoURLs : []
          );
          console.log('[TTFeedDetailSheet] Feeding updated successfully');
        } else {
          // Create new feeding
          console.log('[TTFeedDetailSheet] Creating new feeding');
          await firestoreStorage.addFeedingWithNotes(
            amount,
            timestamp,
            notes || null,
            allPhotoURLs.length > 0 ? allPhotoURLs : []
          );
          console.log('[TTFeedDetailSheet] Feeding created successfully');
        }
        
        // Close the sheet first
        console.log('[TTFeedDetailSheet] Closing sheet...');
        handleClose();
        // Then refresh timeline after sheet closes (onSave callback handles the delay)
        if (onSave) {
          console.log('[TTFeedDetailSheet] Calling onSave callback...');
          await onSave();
          console.log('[TTFeedDetailSheet] onSave callback complete');
        }
        console.log('[TTFeedDetailSheet] Save completed successfully');
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
        console.log('[TTFeedDetailSheet] Setting saving to false');
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
      } else {
        console.log('Close clicked');
      }
    };

    // Body content (used in both static and overlay modes)
    // IMPORTANT: Make the body a full-height flex column so the CTA stays locked to the bottom
    const bodyContent = React.createElement(
      'div',
      { style: { minHeight: '100%', display: 'flex', flexDirection: 'column' } },
      // Content wrapper
      React.createElement('div', {
        style: { position: 'relative', overflow: 'hidden', width: '100%', flex: 1, minHeight: 0 }
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
          placeholder: '0'
        }),

        // Start time
        React.createElement(InputRow, {
          label: 'Start time',
          value: formatDateTime(dateTime), // This won't be used for datetime type
          rawValue: dateTime, // Pass the raw ISO string
          onChange: setDateTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'datetime',
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

      // Photos - conditionally render based on expanded state
      photosExpanded 
        ? React.createElement('div', { className: "py-3" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render existing photos (from Firebase Storage)
          existingPhotoURLs.map((photoUrl, i) =>
            React.createElement('div', {
              key: `existing-${i}`,
              className: "aspect-square rounded-2xl border relative",
              style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photoUrl, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photoUrl)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i, true);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render new photos (base64, not yet uploaded)
          photos.map((photo, i) =>
            React.createElement('div', {
              key: `new-${i}`,
              className: "aspect-square rounded-2xl border relative",
              style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photo, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photo)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i, false);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render placeholder (only one, always at the end)
          React.createElement('div', {
            onClick: handleAddPhoto,
            className: "aspect-square rounded-2xl flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { backgroundColor: 'var(--tt-input-bg)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIconLocal, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      )
        : React.createElement('div', {
            onClick: () => setPhotosExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add photos')
      ),

      // Sticky bottom CTA (Save button)
      // Hide when keyboard is open to prevent overlap with keyboard
        React.createElement('div', {
        ref: ctaFooterRef,
        className: "sticky bottom-0 left-0 right-0 pt-3 pb-1",
        style: { 
          zIndex: 10,
          backgroundColor: 'var(--tt-card-bg)',
          display: isKeyboardOpen ? 'none' : 'block',
          bottom: `${CTA_BOTTOM_OFFSET_PX}px`
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
            className: "absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors",
            style: { zIndex: 20001 },
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

    // If overlay mode (isOpen provided), wrap in HalfSheet
    if (isOpen !== undefined) {
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
          backgroundColor: "var(--tt-card-bg)",
          borderColor: "var(--tt-card-border)"
        }
      },
      // Header: [X] [Feeding] [Save]
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 py-4 mb-6 flex items-center justify-between" },
        // X button (close)
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, React.createElement(XIcon, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
        
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

  // TTSleepDetailSheet Component
  const TTSleepDetailSheet = ({ isOpen, onClose, entry = null, onDelete = null, onSave = null }) => {
    const [startTime, setStartTime] = React.useState(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    const [endTime, setEndTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [lastValidDuration, setLastValidDuration] = React.useState({ hours: 0, minutes: 0, seconds: 0 });
    const [saving, setSaving] = React.useState(false);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    const ctaFooterRef = React.useRef(null);
    const CTA_BOTTOM_OFFSET_PX = 30;
    
    // Track original photo URLs to detect deletions
    const originalPhotoURLsRef = React.useRef([]);
    
    // Collapsible Notes/Photos state
    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);

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
        setStartTime(entry.startTime ? new Date(entry.startTime).toISOString() : new Date().toISOString());
        setEndTime(entry.endTime ? new Date(entry.endTime).toISOString() : new Date().toISOString());
        setNotes(entry.notes || '');
        setExistingPhotoURLs(entry.photoURLs || []);
        originalPhotoURLsRef.current = entry.photoURLs || []; // Track original URLs
        setPhotos([]); // Reset new photos
        // Auto-expand if there's existing content
        setNotesExpanded(!!entry.notes);
        setPhotosExpanded(!!(entry.photoURLs && entry.photoURLs.length > 0));
      } else if (!entry && isOpen) {
        // Create mode - reset to defaults
        setStartTime(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
        setEndTime(new Date().toISOString());
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
        console.log('[TTSleepDetailSheet] Save blocked: invalid times');
        return; // Don't save if invalid
      }
      
      console.log('[TTSleepDetailSheet] Starting save...', { startTime, endTime, photosCount: photos?.length || 0, existingPhotosCount: existingPhotoURLs?.length || 0 });
      setSaving(true);
      try {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        console.log('[TTSleepDetailSheet] Times:', { startMs, endMs });
        
        // Check for overlaps (exclude current entry if editing)
        const excludeId = entry && entry.id ? entry.id : null;
        console.log('[TTSleepDetailSheet] Checking for overlaps...', { excludeId });
        const hasOverlap = await checkSleepOverlap(startMs, endMs, excludeId);
        if (hasOverlap) {
          console.log('[TTSleepDetailSheet] Overlap detected, aborting save');
          alert('This sleep session overlaps with an existing sleep session. Please adjust the times.');
          setSaving(false);
          return;
        }
        console.log('[TTSleepDetailSheet] No overlap detected');
        
        // Track removed photos for soft delete (optional cleanup later)
        const originalURLs = originalPhotoURLsRef.current || [];
        const removedPhotoURLs = originalURLs.filter(url => !existingPhotoURLs.includes(url));
        
        if (removedPhotoURLs.length > 0) {
          console.log('[TTSleepDetailSheet] Photos removed (soft delete):', removedPhotoURLs.length);
          // Photos are removed from photoURLs array - no Supabase deletion
          // Files remain in Supabase Storage for optional cleanup later
        }
        
        // Upload new photos to Supabase Storage
        const newPhotoURLs = [];
        if (photos && photos.length > 0) {
          console.log('[TTSleepDetailSheet] Starting photo uploads...', photos.length);
          for (let i = 0; i < photos.length; i++) {
            const photoBase64 = photos[i];
          try {
              console.log(`[TTSleepDetailSheet] Uploading photo ${i + 1}/${photos.length}...`);
            const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
              console.log(`[TTSleepDetailSheet] Photo ${i + 1} uploaded successfully:`, downloadURL);
            newPhotoURLs.push(downloadURL);
          } catch (error) {
              console.error(`[TTSleepDetailSheet] Failed to upload photo ${i + 1}:`, error);
              console.error('[TTSleepDetailSheet] Photo upload error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
              });
            // Continue with other photos even if one fails
          }
          }
          console.log('[TTSleepDetailSheet] Photo uploads complete. Success:', newPhotoURLs.length, 'Failed:', photos.length - newPhotoURLs.length);
        } else {
          console.log('[TTSleepDetailSheet] No photos to upload');
        }
        
        // Combine existing and new photo URLs
        const allPhotoURLs = [...existingPhotoURLs, ...newPhotoURLs];
        console.log('[TTSleepDetailSheet] Total photo URLs:', allPhotoURLs.length, { existing: existingPhotoURLs.length, new: newPhotoURLs.length });
        
        if (entry && entry.id) {
          // Update existing sleep session
          console.log('[TTSleepDetailSheet] Updating existing sleep session:', entry.id);
          await firestoreStorage.updateSleepSession(entry.id, {
            startTime: startMs,
            endTime: endMs,
            isActive: false,
            notes: notes || null,
            photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : []
          });
          console.log('[TTSleepDetailSheet] Sleep session updated successfully');
        } else {
          // Create new sleep session (shouldn't happen from detail sheet, but handle it)
          console.log('[TTSleepDetailSheet] Creating new sleep session');
          const session = await firestoreStorage.startSleep(startMs);
          await firestoreStorage.endSleep(session.id, endMs);
          if (notes || allPhotoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(session.id, {
              notes: notes || null,
              photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : []
            });
          }
          console.log('[TTSleepDetailSheet] Sleep session created successfully');
        }
        
        // Close the sheet first
        console.log('[TTSleepDetailSheet] Closing sheet...');
        handleClose();
        // Then refresh timeline after sheet closes (onSave callback handles the delay)
        if (onSave) {
          console.log('[TTSleepDetailSheet] Calling onSave callback...');
          await onSave();
          console.log('[TTSleepDetailSheet] onSave callback complete');
        }
        console.log('[TTSleepDetailSheet] Save completed successfully');
      } catch (error) {
        console.error('[TTSleepDetailSheet] Failed to save sleep session:', error);
        console.error('[TTSleepDetailSheet] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        alert(`Failed to save sleep session: ${error.message || 'Please try again.'}`);
      } finally {
        console.log('[TTSleepDetailSheet] Setting saving to false');
        setSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!entry || !entry.id) return;
      
      setSaving(true);
      try {
        await firestoreStorage.deleteSleepSession(entry.id);
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
      } else {
        console.log('Close clicked');
      }
    };

    // Timer display (apply shared formatting rules)
    const durationMs = (Number(duration.hours || 0) * 3600000) + (Number(duration.minutes || 0) * 60000) + (Number(duration.seconds || 0) * 1000);
    const tParts = formatElapsedHmsTT(durationMs);

    // Body content (used in both static and overlay modes)
    // IMPORTANT: Make the body a full-height flex column so the CTA stays locked to the bottom
    const bodyContent = React.createElement(
      'div',
      { style: { minHeight: '100%', display: 'flex', flexDirection: 'column' } },
      // Content wrapper
      React.createElement('div', {
        style: { position: 'relative', overflow: 'hidden', width: '100%', flex: 1, minHeight: 0 }
      },
      // Timer Display
      React.createElement('div', { className: "text-center mb-6" },
        React.createElement('div', { className: "text-[40px] leading-none font-bold", style: { color: 'var(--tt-text-primary)' } },
          React.createElement(React.Fragment, null,
            tParts.showH && React.createElement(React.Fragment, null,
              React.createElement('span', null, tParts.hStr),
              React.createElement('span', { className: "text-base font-normal ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'h'),
              React.createElement('span', { className: "ml-2" })
            ),
            tParts.showM && React.createElement(React.Fragment, null,
              React.createElement('span', null, tParts.mStr),
              React.createElement('span', { className: "text-base font-normal ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'm'),
              React.createElement('span', { className: "ml-2" })
            ),
            React.createElement('span', null, tParts.sStr),
            React.createElement('span', { className: "text-base font-normal ml-1", style: { color: 'var(--tt-text-secondary)' } }, 's')
          )
        )
      ),

      // Input rows wrapped in spacing container
      React.createElement('div', { className: "space-y-2" },
        // Start time
        React.createElement(InputRow, {
          label: 'Start time',
          value: formatDateTime(startTime), // This won't be used for datetime type
          rawValue: startTime, // Pass the raw ISO string
          onChange: setStartTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'datetime',
        }),

        // End time
        React.createElement(InputRow, {
          label: 'End time',
          value: formatDateTime(endTime), // This won't be used for datetime type
          rawValue: endTime, // Pass the raw ISO string
          onChange: setEndTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'datetime',
          invalid: !isValid // Pass invalid flag when end time is before start time
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

      // Photos - conditionally render based on expanded state
      photosExpanded 
        ? React.createElement('div', { className: "py-3" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render existing photos (from Firebase Storage)
          existingPhotoURLs.map((photoUrl, i) =>
            React.createElement('div', {
              key: `existing-${i}`,
              className: "aspect-square rounded-2xl border relative",
              style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photoUrl, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photoUrl)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i, true);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render new photos (base64, not yet uploaded)
          photos.map((photo, i) =>
            React.createElement('div', {
              key: `new-${i}`,
              className: "aspect-square rounded-2xl border relative",
              style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photo, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photo)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i, false);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render placeholder (only one, always at the end)
          React.createElement('div', {
            onClick: handleAddPhoto,
            className: "aspect-square rounded-2xl flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { backgroundColor: 'var(--tt-input-bg)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIconLocal, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      )
        : React.createElement('div', {
            onClick: () => setPhotosExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add photos')
      ),

      // Sticky bottom CTA (Save button)
      // Hide when keyboard is open to prevent overlap with keyboard
        React.createElement('div', {
        ref: ctaFooterRef,
        className: "sticky bottom-0 left-0 right-0 pt-3 pb-1",
        style: { 
          zIndex: 10,
          backgroundColor: 'var(--tt-card-bg)',
          display: isKeyboardOpen ? 'none' : 'block',
          bottom: `${CTA_BOTTOM_OFFSET_PX}px`
        }
      },
              React.createElement('button', {
          type: 'button',
          onClick: handleSave,
          disabled: saving || !isValid,
          onTouchStart: (e) => {
            // Prevent scroll container from capturing touch
            e.stopPropagation();
          },
          className: "w-full py-3 rounded-2xl font-semibold transition",
                style: { 
            backgroundColor: (saving || !isValid) ? 'transparent' : 'var(--tt-sleep)',
            color: (saving || !isValid) ? '#ef4444' : 'white',
            border: (saving || !isValid) ? '1px solid #ef4444' : 'none',
            touchAction: 'manipulation', // Prevent scroll interference on mobile
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
        }, saving ? 'Saving...' : 'Save')
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
            className: "absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors",
            style: { zIndex: 20001 },
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

    // If overlay mode (isOpen provided), wrap in HalfSheet
    if (isOpen !== undefined) {
      return React.createElement(
        HalfSheet,
        {
          isOpen: isOpen || false,
          onClose: handleClose,
          title: 'Sleep',
          accentColor: 'var(--tt-sleep)',
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
          backgroundColor: "var(--tt-card-bg)",
          borderColor: "var(--tt-card-border)"
        }
      },
      // Header: [ChevronDown] [Sleep] [empty]
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 h-[60px] mb-6 flex items-center justify-between" },
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, React.createElement(ChevronDown, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
        React.createElement('div', { className: "flex-1 flex justify-center" },
          React.createElement('h2', { className: "text-base font-semibold text-white" }, 'Sleep')
        ),
        React.createElement('div', { className: "w-6" })
      ),
      bodyContent
    );
  };

  // HeaderSegmentedToggle Component (for dark headers)
  // Based on SegmentedToggle but adapted for black header background
  const HeaderSegmentedToggle = ({ value, options, onChange }) => {
    const btnBase = "rounded-lg transition text-[13px] font-semibold";
    const btnOn = "bg-white text-gray-900 shadow-sm";
    const btnOff = "bg-transparent text-white/80";
    const btnSize = "px-3 py-[6px]";

    return React.createElement(
      'div',
      { className: "inline-flex rounded-xl px-1 py-[3px] bg-white/20" },
      (options || []).map((opt) =>
        React.createElement(
          'button',
          {
            key: opt.value,
            type: 'button',
            onClick: () => onChange && onChange(opt.value),
            className: btnBase + " " + btnSize + " " + (value === opt.value ? btnOn : btnOff),
            'aria-pressed': value === opt.value
          },
          opt.label
        )
      )
    );
  };

  // TTInputHalfSheet Component
  const TTInputHalfSheet = ({ isOpen, onClose, kidId, initialMode = 'feeding', onAdd = null }) => {
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
    
    const getInitialStartTime = () => {
      try {
        const activeSleep = localStorage.getItem('tt_active_sleep');
        if (activeSleep) {
          const parsed = JSON.parse(activeSleep);
          if (parsed.startTime) {
            return parsed.startTime;
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
    const sleepIntervalRef = React.useRef(null);
    const [endTimeManuallyEdited, setEndTimeManuallyEdited] = React.useState(false);
    
    // Shared photos state
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    
    // Collapsible Notes/Photos state (for input half sheet)
    const [notesExpanded, setNotesExpanded] = React.useState(false);
    const [photosExpanded, setPhotosExpanded] = React.useState(false);
    
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
    const ctaFooterRef = React.useRef(null);
    
    // Reserve space so the bottom CTA button stays in the same visual spot across modes.
    // Also keep content scrolled above the CTA when it is offset upward.
    const CTA_BOTTOM_OFFSET_PX = 30;
    const CTA_SPACER_PX = 86 + CTA_BOTTOM_OFFSET_PX; // base + offset
    
    const _normalizeSleepStartMs = (startMs, nowMs = Date.now()) => {
      if (!startMs) return null;
      return (startMs > nowMs + 3 * 3600000) ? (startMs - 86400000) : startMs;
    };
    
    // Sync active sleep with Firebase and localStorage
    React.useEffect(() => {
      if (!kidId || typeof firestoreStorage === 'undefined') return;
      
      // Subscribe to active sleep from Firebase
      const unsubscribe = firestoreStorage.subscribeActiveSleep((session) => {
        if (session && session.id) {
          // There's an active sleep in Firebase
          setActiveSleepSessionId(session.id);
          if (session.startTime) {
            setStartTime(new Date(session.startTime).toISOString());
          }
          if (sleepState !== 'running') {
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
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [kidId]);
    
    // Persist running state to localStorage (for sheet state persistence)
    React.useEffect(() => {
      if (sleepState === 'running' && startTime) {
        try {
          localStorage.setItem('tt_active_sleep', JSON.stringify({
            startTime: startTime,
            endTime: null
          }));
        } catch (e) {
          // Ignore errors
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
          setEndTime(null);
          setSleepNotes('');
          setPhotos([]);
          setSleepElapsedMs(0);
          // Don't reset startTime or sleepState here - they're managed by other logic
        } else {
          // Timer is running - only reset manual edit flag
          setEndTimeManuallyEdited(false);
        }
        // Reset feeding state when closing
        setFeedingDateTime(new Date().toISOString());
        // Reset expand state when closing
        setNotesExpanded(false);
        setPhotosExpanded(false);
      } else {
        // When sheet opens in sleep mode, set startTime to NOW
        // UNLESS sleep is currently running (don't override active sleep)
        if (mode === 'sleep' && sleepState !== 'running' && !activeSleepSessionId) {
          setStartTime(new Date().toISOString());
        }
        // When sheet opens in feeding mode, set feedingDateTime to NOW
        if (mode === 'feeding') {
          setFeedingDateTime(new Date().toISOString());
        }
      }
    }, [isOpen, mode, sleepState, activeSleepSessionId]);
    
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
    
    // Auto-populate start time when toggle switches to Sleep
    React.useEffect(() => {
      if (mode === 'sleep' && isOpen) {
        // Always set startTime to NOW when sleep mode is selected
        // UNLESS sleep is currently running (don't override active sleep)
        if (sleepState !== 'running' && !activeSleepSessionId) {
          setStartTime(new Date().toISOString());
        }
        // If not running and not idle_with_times (both times entered), clear end time
        const hasBothTimes = startTime && endTime;
        if (sleepState === 'idle' && !hasBothTimes) {
          setEndTime(null);
        }
      }
    }, [mode, isOpen, sleepState, activeSleepSessionId, startTime, endTime]);
    
    // Auto-populate start time when toggle switches to Feeding
    React.useEffect(() => {
      if (mode === 'feeding' && isOpen) {
        // Always set feedingDateTime to NOW when feeding mode is selected
        setFeedingDateTime(new Date().toISOString());
      }
    }, [mode, isOpen]);
    
    // Reset expand state when mode changes
    React.useEffect(() => {
      if (isOpen) {
        setNotesExpanded(false);
        setPhotosExpanded(false);
      }
    }, [mode, isOpen]);
    
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
      if (onClose) onClose();
    };

    // Handle add feeding - save to Firebase
    const handleAddFeeding = async () => {
      const amount = parseFloat(ounces);
      if (!amount || amount <= 0) {
        console.log('[TTInputHalfSheet] Add feeding blocked: invalid amount', amount);
        return;
      }
      
      console.log('[TTInputHalfSheet] Starting add feeding...', { amount, photosCount: photos?.length || 0 });
      try {
        const timestamp = new Date(feedingDateTime).getTime();
        console.log('[TTInputHalfSheet] Timestamp:', timestamp);
        
        // Upload photos to Firebase Storage
        const photoURLs = [];
        if (photos && photos.length > 0) {
          console.log('[TTInputHalfSheet] Starting photo uploads...', photos.length);
          for (let i = 0; i < photos.length; i++) {
            const photoBase64 = photos[i];
          try {
              console.log(`[TTInputHalfSheet] Uploading photo ${i + 1}/${photos.length}...`);
            const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
              console.log(`[TTInputHalfSheet] Photo ${i + 1} uploaded successfully:`, downloadURL);
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
          console.log('[TTInputHalfSheet] Photo uploads complete. Success:', photoURLs.length, 'Failed:', photos.length - photoURLs.length);
        } else {
          console.log('[TTInputHalfSheet] No photos to upload');
        }
        
        // Save to Firebase
        console.log('[TTInputHalfSheet] Saving to Firestore...', { photoURLsCount: photoURLs.length });
        await firestoreStorage.addFeedingWithNotes(
          amount,
          timestamp,
          feedingNotes || null,
          photoURLs.length > 0 ? photoURLs : null
        );
        console.log('[TTInputHalfSheet] Feeding saved successfully to Firestore');
        
        // Reset form
        setOunces('');
        setFeedingNotes('');
        setPhotos([]);
        setFeedingDateTime(new Date().toISOString());
        // Close the sheet first
        console.log('[TTInputHalfSheet] Closing sheet...');
        if (onClose) onClose();
        // Then refresh timeline after sheet closes (onAdd callback handles the delay)
        if (onAdd) {
          console.log('[TTInputHalfSheet] Calling onAdd callback...');
          await onAdd('feeding');
          console.log('[TTInputHalfSheet] onAdd callback complete');
        }
        console.log('[TTInputHalfSheet] Add feeding completed successfully');
      } catch (error) {
        console.error('[TTInputHalfSheet] Failed to add feeding:', error);
        console.error('[TTInputHalfSheet] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        alert(`Failed to add feeding: ${error.message || 'Please try again.'}`);
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
            startMs = parsed;
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
      if (sleepState !== 'running') return;
      
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
        
        // Close the sheet first
        if (onClose) onClose();
        
        // Then refresh timeline and open accordion (onAdd callback handles this)
        if (onAdd) {
          await onAdd('sleep');
        }
      } catch (error) {
        console.error('Failed to end sleep:', error);
        alert('Failed to end sleep. Please try again.');
      }
    };
    
    // Handle start time change
    const handleStartTimeChange = async (newStartTime) => {
      setStartTime(newStartTime);
      
      if (sleepState === 'running') {
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
      
      if (sleepState === 'running') {
        // RUNNING: Editing end time stops timer
        setSleepState('idle');
      }
    };
    
    // Handle save sleep when end time is manually edited
    const handleSaveSleep = async () => {
      if (!isSleepValid) return; // Prevent saving if invalid
      
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
        
        // Auto-close after save
        if (onClose) onClose();
        // Then refresh timeline and open accordion (onAdd callback handles this)
        if (onAdd) {
          await onAdd('sleep');
        }
      } catch (error) {
        console.error('Failed to save sleep session:', error);
        alert('Failed to save sleep session. Please try again.');
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
        // Ounces
        React.createElement(InputRow, {
          label: 'Ounces',
          value: ounces,
          onChange: setOunces,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'number',
          placeholder: '0'
        }),

        // Start time
        React.createElement(InputRow, {
          label: 'Start time',
          value: formatDateTime(feedingDateTime),
          rawValue: feedingDateTime,
          onChange: setFeedingDateTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'datetime',
        }),

        // Notes - conditionally render based on expanded state
        notesExpanded 
          ? React.createElement(InputRow, {
          label: 'Notes',
          value: feedingNotes,
          onChange: setFeedingNotes,
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

      // Photos - conditionally render based on expanded state
      photosExpanded 
        ? React.createElement('div', { className: "py-3" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render photos
          photos.map((photo, i) =>
            React.createElement('div', {
              key: i,
              className: "aspect-square rounded-2xl border relative",
              style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photo, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photo)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render placeholder (only one, always at the end)
          React.createElement('div', {
            onClick: handleAddPhoto,
            className: "aspect-square rounded-2xl flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { backgroundColor: 'var(--tt-input-bg)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIconLocal, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      )
        : React.createElement('div', {
            onClick: () => setPhotosExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add photos'),

      // Reserve space for sticky footer CTA
      React.createElement('div', { style: { height: `${CTA_SPACER_PX}px` } })
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
        React.createElement('div', { className: "text-center mb-6" },
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
          // Start time
          React.createElement(InputRow, {
            label: 'Start time',
            value: startTime ? formatDateTime(startTime) : '--:--',
            rawValue: startTime,
            onChange: handleStartTimeChange,
            icon: timeIcon,
            type: 'datetime',
            readOnly: false // Always editable
          }),

          // End time
          React.createElement(InputRow, {
            label: 'End time',
            value: endTime ? formatDateTime(endTime) : 'Add...',
            rawValue: endTime,
            onChange: handleEndTimeChange,
            icon: timeIcon,
            type: 'datetime',
            placeholder: 'Add...',
            readOnly: false, // Always editable
            invalid: !isSleepValid && isIdleWithTimes
          }),

          // Notes - conditionally render based on expanded state
          notesExpanded 
            ? React.createElement(InputRow, {
            label: 'Notes',
            value: sleepNotes,
            onChange: setSleepNotes,
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

      // Photos - conditionally render based on expanded state
      photosExpanded 
        ? React.createElement('div', { className: "py-3" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render photos
          photos.map((photo, i) =>
            React.createElement('div', {
              key: i,
              className: "aspect-square rounded-2xl border relative",
              style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photo, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photo)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render placeholder (only one, always at the end)
          React.createElement('div', {
            onClick: handleAddPhoto,
            className: "aspect-square rounded-2xl flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { backgroundColor: 'var(--tt-input-bg)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIconLocal, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      )
        : React.createElement('div', {
            onClick: () => setPhotosExpanded(true),
            className: "py-3 cursor-pointer active:opacity-70 transition-opacity",
            style: { color: 'var(--tt-text-tertiary)' }
          }, '+ Add photos'),

      // Reserve space for sticky footer CTA
      React.createElement('div', { style: { height: `${CTA_SPACER_PX}px` } })
      );
    };


    // Body content - render both for measurement, show one based on mode
    // IMPORTANT: Make the body a full-height flex column so the CTA stays locked to the bottom
    // even when one mode's content is shorter.
    const bodyContent = React.createElement(
      'div',
      { style: { minHeight: '100%', display: 'flex', flexDirection: 'column' } },
      // Wrapper to ensure proper clipping of absolutely positioned children
      React.createElement('div', {
        style: { position: 'relative', overflow: 'hidden', width: '100%', flex: 1, minHeight: 0 }
      },
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
      ),

      // Sticky bottom CTA (keeps primary action in the same spot across Feed/Sleep)
      // Hide when keyboard is open to prevent overlap with keyboard
      React.createElement('div', {
      ref: ctaFooterRef,
        className: "sticky bottom-0 left-0 right-0 pt-3 pb-1",
        style: { 
          zIndex: 10,
          backgroundColor: 'var(--tt-card-bg)',
          display: isKeyboardOpen ? 'none' : 'block',
          bottom: `${CTA_BOTTOM_OFFSET_PX}px`
        }
      },
        mode === 'feeding'
          ? React.createElement('button', {
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
            }, 'Add Feed')
          : (() => {
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
              } else if (endTimeManuallyEdited) {
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
              } else {
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
              }
            })()
      ),

      // Full-size photo modal (shared for both modes) (PORTAL to body so it isn't trapped inside HalfSheet transform/stacking)
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
            className: "absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors",
            style: { zIndex: 20001 },
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

    // If overlay mode (isOpen provided), wrap in HalfSheet
    if (isOpen !== undefined) {
      return React.createElement(
        window.TTHalfSheet,
        {
          isOpen: isOpen || false,
          onClose: handleClose,
          fixedHeight: calculateHeight,
          accentColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
          titleElement: React.createElement(HeaderSegmentedToggle, {
            value: mode,
            options: [
              { value: 'feeding', label: 'Feed' },
              { value: 'sleep', label: 'Sleep' }
            ],
            onChange: setMode
          }),
          rightAction: null
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
          backgroundColor: "var(--tt-card-bg)",
          borderColor: "var(--tt-card-border)"
        }
      },
      // Header: [ChevronDown] [Toggle] [empty] - fixed 60px height
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 h-[60px] mb-6 flex items-center justify-between" },
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, React.createElement(ChevronDown, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
        React.createElement('div', { className: "flex-1 flex justify-center" },
          React.createElement(HeaderSegmentedToggle, {
            value: mode,
            options: [
              { value: 'feeding', label: 'Feed' },
              { value: 'sleep', label: 'Sleep' }
            ],
            onChange: setMode
          })
        ),
        React.createElement('div', { className: "w-6" })
      ),
      bodyContent
    );
  };

  // Expose components globally
  if (typeof window !== 'undefined') {
    window.TTFeedDetailSheet = TTFeedDetailSheet;
    window.TTSleepDetailSheet = TTSleepDetailSheet;
    window.TTInputHalfSheet = TTInputHalfSheet;
  }
}

// Make available globally for script.js
if (typeof window !== 'undefined') {
  window.TrackerCard = TrackerCard;
}
