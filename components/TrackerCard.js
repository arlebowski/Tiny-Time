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

const PlusIcon = (props) => React.createElement(
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
  window.PlusIcon = PlusIcon;
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

// Ensure tap animation styles are injected
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
  `;
  document.head.appendChild(style);
}

const TimelineItem = ({ entry, mode = 'sleep', onClick = null, onActiveSleepClick = null, onDelete = null }) => {
  if (!entry) return null;
  
  const isSleep = mode === 'sleep';
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const timelineBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  
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

  // Format duration with seconds for active sleep
  const formatDurationWithSeconds = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
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
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
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
          ? `${formatTime12Hour(entry.startTime)} – in progress`
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
        style: { ...iconStyle, width: '2.25rem', height: '2.25rem', strokeWidth: '3' } // 20% bigger (1.875rem * 1.2 = 2.25rem = 36px) + 0.5 stroke
      }) : React.createElement('div', { style: { width: '2.25rem', height: '2.25rem', borderRadius: '1rem', backgroundColor: 'var(--tt-input-bg)' } });
    } else {
      const Bottle2Icon = window.TT?.shared?.icons?.Bottle2 || null;
      const accentColor = 'var(--tt-feed)';
      return Bottle2Icon ? React.createElement(Bottle2Icon, {
        style: { color: accentColor, width: '2.25rem', height: '2.25rem', strokeWidth: '3' } // 20% bigger (1.875rem * 1.2 = 2.25rem = 36px) + 0.5 stroke
      }) : React.createElement('div', { style: { width: '2.25rem', height: '2.25rem', borderRadius: '1rem', backgroundColor: 'var(--tt-input-bg)' } });
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
              React.createElement('div', { className: "text-sm", style: { color: 'var(--tt-text-secondary)' } }, 
                secondaryText
              )
            )
          ),
          // Hide chevron when swiped
          swipeOffset >= -SWIPE_THRESHOLD && React.createElement(ChevronDown, { 
            className: "rotate-[-90deg]", 
            style: { color: 'var(--tt-text-secondary)', strokeWidth: '3' } 
          })
        ),
        (hasNote || hasPhotos) && React.createElement(
          React.Fragment,
          null,
          hasNote && React.createElement(
            'div',
            { className: "italic text-sm mb-3", style: { color: 'var(--tt-text-secondary)' } },
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

const TrackerCard = ({ 
  mode = 'sleep',
  total = null,           // e.g., 14.5 (oz or hrs)
  target = null,           // e.g., 14.5 (oz or hrs)
  timelineItems = [],     // Array of log entries
  lastEntryTime = null,   // For status text (timestamp in ms)
  onItemClick = null,     // Callback when timeline item clicked
  onActiveSleepClick = null, // Callback when active sleep entry clicked (opens input sheet)
  onDelete = null         // Callback when item is deleted (for data refresh)
}) => {
  ensureZzzStyles();
  ensureTapAnimationStyles();
  const [expanded, setExpanded] = React.useState(false);
  
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
            opacity: 0.8;
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
            rgba(255, 255, 255, 0.5),
            transparent
          );
          animation: ttSleepPulse 2.5s ease-in-out infinite;
          border-radius: inherit;
          pointer-events: none;
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
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };
    
    // Only return the timer text - zZz animation is rendered separately
    return React.createElement('span', { className: "font-semibold", style: { color: 'var(--tt-text-primary)' } }, 
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
            React.Fragment,
            null,
            React.createElement(ActiveSleepTimer, { startTime: activeEntry.startTime }),
            React.createElement('span', { className: "font-light", style: { color: 'var(--tt-text-primary)' } },
              ' ',
              zzzElementMemo
            )
          );
        } else if (lastEntryTime) {
          return React.createElement(
            React.Fragment,
            null,
            React.createElement('span', { className: "font-semibold", style: { color: 'var(--tt-text-primary)' } }, 
              formatDuration(lastEntryTime, null)
            ),
            React.createElement('span', { className: "font-light", style: { color: 'var(--tt-text-primary)' } },
              ' ',
              zzzElementMemo
            )
          );
        } else {
          return 'No sleep logged';
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

  // Get the appropriate icon for the header
  const HeaderIcon = mode === 'feeding' 
    ? (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Bottle1) || null
    : (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Moon2) || null;

  return React.createElement(
    'div',
    { 
      className: "rounded-2xl p-5 shadow-sm",
      style: {
        backgroundColor: "var(--tt-card-bg)",
        borderColor: "var(--tt-card-border)"
      }
    },
    React.createElement(
      'div',
      { className: "flex items-center gap-2 mb-6 h-6" },
      HeaderIcon ? React.createElement(HeaderIcon, { 
        className: "h-8 w-8", // 15% bigger (28px * 1.15 = 32.2px ≈ 32px = h-8 w-8)
        style: { 
          color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
          transform: mode === 'feeding' ? 'translateY(-2px)' : 'none',
          strokeWidth: '3' // Add 0.5 stroke (base 2.5 + 0.5 = 3)
        }
      }) : React.createElement('div', { className: "h-6 w-6 rounded-2xl", style: { backgroundColor: 'var(--tt-input-bg)' } }),
      React.createElement('div', { 
        className: "text-base font-semibold",
        style: { color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)' }
      }, mode === 'feeding' ? 'Feed' : 'Sleep')
    ),
    React.createElement(
      'div',
      { className: "flex items-baseline gap-1 mb-3" },
      React.createElement('div', { 
        className: "text-[40px] leading-none font-bold",
        style: { 
          color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
          transition: 'opacity 0.4s ease-out, transform 0.4s ease-out'
        }
      }, 
        total !== null ? total.toFixed(1) : (mode === 'sleep' ? '0.0' : '0.0')
      ),
      React.createElement('div', { className: "relative -top-[1px] text-[16px] leading-none", style: { color: 'var(--tt-text-secondary)' } }, 
        target !== null 
          ? (mode === 'sleep' ? `of ${target.toFixed(1)} hrs` : `of ${target.toFixed(1)} oz`)
          : (mode === 'sleep' ? 'of 0.0 hrs' : 'of 0.0 oz')
      )
    ),
    
    // Animated Progress Bar (production-style)
    // Direct percentage calculation like old ProgressBarRow - smooth transitions without resetting
    React.createElement('div', { className: "relative w-full h-6 rounded-2xl overflow-hidden mb-3", style: { backgroundColor: 'var(--tt-input-bg)' } },
      React.createElement('div', {
        className: `absolute left-0 top-0 h-full rounded-2xl ${isSleepActive ? 'tt-sleep-progress-pulse' : ''}`,
        style: {
          width: `${calculatedPercent}%`,
          backgroundColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transitionDelay: '0s',
          minWidth: '0%', // Ensure smooth animation to 0
          position: 'relative' // Ensure ::after pseudo-element positions correctly
        }
      })
    ),
    React.createElement(
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
    React.createElement('div', { 
      className: "border-t my-4",
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
        style: { color: 'var(--tt-text-secondary)' }
      },
      React.createElement('span', null, timelineLabel),
      expanded ? React.createElement(ChevronUp, { style: { strokeWidth: '3' } }) : React.createElement(ChevronDown, { style: { strokeWidth: '3' } })
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
                  onClick: onItemClick,
                  onDelete: onDelete
                })
              );
            });
          })()
        : React.createElement('div', { 
            className: "text-sm text-center py-4",
            style: { color: 'var(--tt-text-secondary)' }
          }, 'No entries yet')
    )
  );
};

// Detail Sheet Components
// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTFeedDetailSheet && !window.TTSleepDetailSheet) {
  
  // HalfSheet wrapper component (UI Lab only)
  const HalfSheet = ({ isOpen, onClose, title, rightAction, children, accentColor }) => {
    const sheetRef = React.useRef(null);
    const backdropRef = React.useRef(null);
    const headerRef = React.useRef(null);
    const contentRef = React.useRef(null);
    const [sheetHeight, setSheetHeight] = React.useState('auto');
    const [present, setPresent] = React.useState(false); // Controls rendering
    const [keyboardOffset, setKeyboardOffset] = React.useState(0);
    const scrollYRef = React.useRef(0);
    
    // Drag state
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStartY, setDragStartY] = React.useState(0);
    const [dragCurrentY, setDragCurrentY] = React.useState(0);
    const [dragStartTime, setDragStartTime] = React.useState(0);

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

    // Compute keyboard offset (px) from visualViewport.
    // In iOS PWA, documentElement.clientHeight is often more stable than window.innerHeight.
    const computeKeyboardOffset = React.useCallback(() => {
      const vv = window.visualViewport;
      if (!vv) return 0;
      const layoutH = document.documentElement?.clientHeight || window.innerHeight;
      return Math.max(0, layoutH - vv.height - vv.offsetTop);
    }, []);

    // Measure content and set dynamic height
    React.useEffect(() => {
      if (isOpen && present && contentRef.current && sheetRef.current) {
        const measureHeight = () => {
          if (contentRef.current && sheetRef.current && headerRef.current) {
            const contentHeight = contentRef.current.scrollHeight; // Already includes py-8 padding
            // Use visualViewport if available (more accurate for mobile keyboards)
            const vv = window.visualViewport;
            const fallbackH = document.documentElement?.clientHeight || window.innerHeight;
            const viewportHeight = vv ? vv.height : fallbackH;
            
            // Measure actual header height instead of hardcoding
            const headerHeight = headerRef.current.offsetHeight;
            
            // Get safe-area-inset-bottom - try to read computed style, fallback to 0
            let bottomPad = 0;
            try {
              const cs = window.getComputedStyle(sheetRef.current);
              const pb = cs.paddingBottom;
              // If it's a pixel value, parse it; otherwise it's likely env() and we'll use 0
              if (pb && pb.includes('px')) {
                bottomPad = parseFloat(pb) || 0;
              }
            } catch (e) {
              // Fallback to 0 if measurement fails
              bottomPad = 0;
            }
            
            const totalNeeded = contentHeight + headerHeight + bottomPad;
            // If content fits within 90% of viewport, use exact height to prevent scrolling
            // Otherwise, cap at 90% to leave some space at top
            const maxHeight = totalNeeded <= viewportHeight * 0.9 
              ? totalNeeded 
              : Math.min(viewportHeight * 0.9, totalNeeded);
            setSheetHeight(`${maxHeight}px`);
          }
        };

        // Measure after render with multiple attempts
        requestAnimationFrame(() => {
          measureHeight();
          setTimeout(measureHeight, 50);
          setTimeout(measureHeight, 200); // Extra delay for async content
        });
      }
    }, [isOpen, present, children]);

    // Ensure transition is set when sheet is open (for keyboard adjustments)
    React.useEffect(() => {
      if (!present || !isOpen || !sheetRef.current) return;
      // Set combined transition so height changes animate smoothly
      sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1), height 200ms ease-out, bottom 200ms ease-out';
    }, [isOpen, present]);

    // Listen to visualViewport resize/scroll for keyboard changes (PWA-safe)
    React.useEffect(() => {
      if (!present || !isOpen) return;
      
      const vv = window.visualViewport;
      if (!vv) return;
      
      const handleResize = () => {
        // Smoothly raise/lower the sheet above the keyboard.
        setKeyboardOffset(computeKeyboardOffset());
        if (contentRef.current && sheetRef.current && headerRef.current) {
          const contentHeight = contentRef.current.scrollHeight;
          const viewportHeight = vv.height;
          
          // Measure actual header height instead of hardcoding
          const headerHeight = headerRef.current.offsetHeight;
          
          // Get safe-area-inset-bottom - try to read computed style, fallback to 0
          let bottomPad = 0;
          try {
            const cs = window.getComputedStyle(sheetRef.current);
            const pb = cs.paddingBottom;
            // If it's a pixel value, parse it; otherwise it's likely env() and we'll use 0
            if (pb && pb.includes('px')) {
              bottomPad = parseFloat(pb) || 0;
            }
          } catch (e) {
            // Fallback to 0 if measurement fails
            bottomPad = 0;
          }
          
          const totalNeeded = contentHeight + headerHeight + bottomPad;
          // If content fits within 90% of viewport, use exact height to prevent scrolling
          // Otherwise, cap at 90% to leave some space at top
          const maxHeight = totalNeeded <= viewportHeight * 0.9 
            ? totalNeeded 
            : Math.min(viewportHeight * 0.9, totalNeeded);
          setSheetHeight(`${maxHeight}px`);
        }
      };
      
      vv.addEventListener('resize', handleResize);
      vv.addEventListener('scroll', handleResize);
      // Initial sync (covers keyboard already open / first focus)
      handleResize();
      return () => {
        vv.removeEventListener('resize', handleResize);
        vv.removeEventListener('scroll', handleResize);
      };
    }, [isOpen, present, computeKeyboardOffset]);

    // Animation: Open and Close
    React.useEffect(() => {
      if (!present || !sheetRef.current || !backdropRef.current) return;
      
      if (isOpen) {
        // Open animation
        sheetRef.current.style.transition = 'none';
        sheetRef.current.style.transform = 'translateY(100%)';
        backdropRef.current.style.transition = 'none';
        backdropRef.current.style.opacity = '0';
        
        requestAnimationFrame(() => {
          if (sheetRef.current && backdropRef.current) {
            // Combine transform and height transitions
            sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1), height 200ms ease-out, bottom 200ms ease-out';
            sheetRef.current.style.transform = 'translateY(0)';
            backdropRef.current.style.transition = 'opacity 250ms ease-out';
            backdropRef.current.style.opacity = '0.4';
          }
        });
      } else {
        // Close animation
        void sheetRef.current.offsetHeight; // Force reflow
        
        requestAnimationFrame(() => {
          if (sheetRef.current && backdropRef.current) {
            // Combine transform and height transitions
            sheetRef.current.style.transition = 'transform 200ms ease-in, height 200ms ease-out, bottom 200ms ease-out';
            sheetRef.current.style.transform = 'translateY(100%)';
            backdropRef.current.style.transition = 'opacity 200ms ease-in';
            backdropRef.current.style.opacity = '0';
          }
        });
        
        // Unmount after animation completes
        setTimeout(() => {
          setPresent(false);
        }, 200);
      }
    }, [isOpen, present]);

    // Drag handlers
    // NOTE: When the keyboard is open, dragging feels glitchy on iOS PWAs.
    // Disable drag-to-dismiss while a field is focused / keyboard is up.
    const canDrag = () => {
      if (keyboardOffset > 0) return false;
      const ae = document.activeElement;
      if (!ae) return true;
      const tag = (ae.tagName || '').toUpperCase();
      return !(tag === 'INPUT' || tag === 'TEXTAREA' || ae.isContentEditable);
    };

    const handleTouchStart = (e) => {
      if (!canDrag()) return;
      if (!sheetRef.current) return;
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStartY(touch.clientY);
      setDragCurrentY(touch.clientY);
      setDragStartTime(Date.now());
      // Only disable transform transition, keep height transition
      sheetRef.current.style.transition = 'height 200ms ease-out';
    };

    const handleTouchMove = (e) => {
      if (!canDrag()) return;
      if (!isDragging || !sheetRef.current || !backdropRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartY;
      
      // Only allow downward drag
      if (deltaY > 0) {
        setDragCurrentY(touch.clientY);
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
        
        // Reduce backdrop opacity as you drag down
        const maxDrag = 300; // Max drag distance for full fade
        const backdropOpacity = Math.max(0, 0.4 - (deltaY / maxDrag) * 0.4);
        backdropRef.current.style.opacity = backdropOpacity.toString();
      }
    };

    const handleTouchEnd = () => {
      if (!canDrag()) return;
      if (!isDragging || !sheetRef.current || !backdropRef.current) return;
      
      const deltaY = dragCurrentY - dragStartY;
      const dragDuration = Date.now() - dragStartTime;
      const velocity = deltaY / dragDuration; // pixels per ms
      const threshold = 0.3; // 30% of sheet height
      const sheetHeightPx = sheetRef.current.offsetHeight;
      const dismissThreshold = sheetHeightPx * threshold;
      const velocityThreshold = 0.5; // pixels per ms
      
      setIsDragging(false);
      // Restore both transitions
      sheetRef.current.style.transition = 'transform 200ms ease-in, height 200ms ease-out, bottom 200ms ease-out';
      backdropRef.current.style.transition = 'opacity 200ms ease-in';
      
      // Dismiss if past threshold or fast velocity
      if (deltaY > dismissThreshold || velocity > velocityThreshold) {
        if (onClose) onClose();
      } else {
        // Snap back
        sheetRef.current.style.transform = 'translateY(0)';
        backdropRef.current.style.opacity = '0.4';
      }
    };

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
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          style: {
            backgroundColor: "var(--tt-card-bg)",
            transform: 'translateY(100%)',
            willChange: 'transform',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
            // Avoid vh-based snapping in iOS PWAs when the keyboard opens/closes.
            maxHeight: '100%',
            height: sheetHeight,
            // When keyboard is open, lift the whole sheet above it (smoothly via transition).
            bottom: `${keyboardOffset}px`,
            // Transition is set dynamically in useEffect to combine transform and height
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
            // X button (close)
            React.createElement('button', {
              onClick: onClose,
              className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
            }, React.createElement(XIcon, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
            
            // Centered title
            React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, title || ''),
            
            // Right action (Save button)
            rightAction || React.createElement('div', { className: "w-6" })
          ),
          // Body area (scrollable)
          React.createElement('div', {
            ref: contentRef,
            className: "flex-1 overflow-y-auto px-6 pt-8 pb-[42px]",
            style: {
              WebkitOverflowScrolling: 'touch',
              minHeight: 0,
              overscrollBehavior: 'contain'
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
      // Don't focus if clicking the icon button (it has its own handler)
      if (e.target.closest('button')) {
        return;
      }
      // For datetime fields, open the picker when clicking the row
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
        className: "flex items-center justify-between rounded-2xl p-4 cursor-pointer transition-colors duration-150 mb-2 tt-tapable",
        style: { backgroundColor: 'var(--tt-input-bg)', position: 'relative' },
        onClick: handleRowClick
      },
      React.createElement('div', { className: "flex-1" },
        React.createElement('div', { className: "text-xs mb-1", style: { color: 'var(--tt-text-secondary)' } }, label),
        type === 'text' 
          ? React.createElement('textarea',
              {
                ref: inputRef,
                value: displayValue || '',
                onChange: (e) => {
                  if (onChange) {
                    onChange(e.target.value);
                    // Auto-growing height logic (same as AI chat tab)
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                },
                placeholder: placeholder,
                rows: 1,
                className: "text-base font-normal w-full outline-none resize-none",
                style: { background: 'transparent', maxHeight: '4.5rem', overflowY: 'auto', color: 'var(--tt-text-primary)' }
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
                      // Only allow numbers and decimal point
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      onChange(value);
                    } else {
                      onChange(e.target.value);
                    }
                  }
                },
                placeholder: placeholder,
                className: `text-base font-normal w-full outline-none ${invalid ? 'text-red-600' : ''}`,
                style: { 
                  background: 'transparent', 
                  color: invalid 
                    ? undefined 
                    : (type === 'datetime' && !rawValue && placeholder ? 'var(--tt-text-secondary)' : 'var(--tt-text-primary)')
                },
                readOnly: type === 'datetime'
              }
            )
      ),
      icon && React.createElement('button', {
        onClick: handleIconClick,
        className: "ml-4",
        style: { marginLeft: '17px' } // ml-4 (16px) + 1px inward = 17px
      }, icon)
    );
  };

  // TTFeedDetailSheet Component
  const TTFeedDetailSheet = ({ isOpen, onClose, entry = null, onDelete = null }) => {
    const [ounces, setOunces] = React.useState('');
    const [dateTime, setDateTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    // Populate form from entry when it exists
    React.useEffect(() => {
      if (entry && isOpen) {
        setOunces(entry.ounces ? entry.ounces.toString() : '');
        setDateTime(entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString());
        setNotes(entry.notes || '');
        setExistingPhotoURLs(entry.photoURLs || []);
        setPhotos([]); // Reset new photos
      } else if (!entry && isOpen) {
        // Create mode - reset to defaults
        setOunces('');
        setDateTime(new Date().toISOString());
        setNotes('');
        setExistingPhotoURLs([]);
        setPhotos([]);
      }
    }, [entry, isOpen]);

    const handleSave = async () => {
      const amount = parseFloat(ounces);
      if (!amount || amount <= 0) return;
      
      setSaving(true);
      try {
        const timestamp = new Date(dateTime).getTime();
        
        // Upload new photos to Firebase Storage
        const newPhotoURLs = [];
        for (const photoBase64 of photos) {
          try {
            const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
            newPhotoURLs.push(downloadURL);
          } catch (error) {
            console.error('Failed to upload photo:', error);
            // Continue with other photos even if one fails
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
            allPhotoURLs.length > 0 ? allPhotoURLs : null
          );
        } else {
          // Create new feeding
          await firestoreStorage.addFeedingWithNotes(
            amount,
            timestamp,
            notes || null,
            allPhotoURLs.length > 0 ? allPhotoURLs : null
          );
        }
        
        handleClose();
      } catch (error) {
        console.error('Failed to save feeding:', error);
        alert('Failed to save feeding. Please try again.');
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
            setPhotos([...photos, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      };
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
    const bodyContent = React.createElement(
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

        // Date & Time
        React.createElement(InputRow, {
          label: 'Date & Time',
          value: formatDateTime(dateTime), // This won't be used for datetime type
          rawValue: dateTime, // Pass the raw ISO string
          onChange: setDateTime,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'datetime'
        }),

        // Notes
        React.createElement(InputRow, {
          label: 'Notes',
          value: notes,
          onChange: setNotes,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'text',
          placeholder: 'Add a note...'
        })
      ),

      // Photos
      React.createElement('div', { className: "py-3" },
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
            React.createElement(PlusIcon, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      ),

      // Delete Button (only show if editing existing entry)
      entry && entry.id && React.createElement('button', {
        onClick: () => setShowDeleteConfirm(true),
        disabled: saving,
        className: "w-full text-red-600 py-2 text-center font-normal active:opacity-70 transition-opacity duration-100",
        style: { marginTop: '30px' }
      }, 'Delete'),

      // Delete confirmation dialog
      showDeleteConfirm && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setShowDeleteConfirm(false),
          className: "fixed inset-0 bg-black bg-opacity-50 z-[103] flex items-center justify-center p-4"
        },
          React.createElement('div', {
            onClick: (e) => e.stopPropagation(),
            className: "rounded-2xl p-4 max-w-xs w-full",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
            React.createElement('div', { className: "text-base font-semibold mb-4 text-center", style: { color: 'var(--tt-text-primary)' } }, 'Delete feeding?'),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('button', {
                onClick: () => setShowDeleteConfirm(false),
                className: "flex-1 py-2.5 rounded-xl border font-semibold transition text-sm",
                style: { 
                  borderColor: 'var(--tt-card-border)', 
                  color: 'var(--tt-text-secondary)',
                  backgroundColor: 'var(--tt-card-bg)'
                }
              }, 'Cancel'),
              React.createElement('button', {
                onClick: handleDelete,
                className: "flex-1 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition text-sm"
              }, 'Delete')
            )
          )
        )
      ),

      // Full-size photo modal
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-[102] flex items-center justify-center p-4"
        },
          React.createElement('img', {
            src: fullSizePhoto,
            alt: "Full size photo",
            className: "max-w-full max-h-full object-contain",
            onClick: (e) => e.stopPropagation()
          })
        )
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
          rightAction: React.createElement('button', {
            onClick: handleSave,
            disabled: saving,
            className: `text-base font-normal transition-opacity ${
              saving 
                ? 'text-white/50 cursor-not-allowed' 
                : 'text-white hover:opacity-70 active:opacity-50'
            }`
          }, saving ? 'Saving...' : 'Save')
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
  const TTSleepDetailSheet = ({ isOpen, onClose, entry = null, onDelete = null }) => {
    const [startTime, setStartTime] = React.useState(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    const [endTime, setEndTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState('');
    const [photos, setPhotos] = React.useState([]); // Array of base64 data URLs for new photos
    const [existingPhotoURLs, setExistingPhotoURLs] = React.useState([]); // Array of Firebase Storage URLs
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [lastValidDuration, setLastValidDuration] = React.useState({ hours: 0, minutes: 0, seconds: 0 });
    const [saving, setSaving] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    // Populate form from entry when it exists
    React.useEffect(() => {
      if (entry && isOpen) {
        setStartTime(entry.startTime ? new Date(entry.startTime).toISOString() : new Date().toISOString());
        setEndTime(entry.endTime ? new Date(entry.endTime).toISOString() : new Date().toISOString());
        setNotes(entry.notes || '');
        setExistingPhotoURLs(entry.photoURLs || []);
        setPhotos([]); // Reset new photos
      } else if (!entry && isOpen) {
        // Create mode - reset to defaults
        setStartTime(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
        setEndTime(new Date().toISOString());
        setNotes('');
        setExistingPhotoURLs([]);
        setPhotos([]);
      }
    }, [entry, isOpen]);

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

    const handleSave = async () => {
      if (!isValid) return; // Don't save if invalid
      
      setSaving(true);
      try {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        
        // Upload new photos to Firebase Storage
        const newPhotoURLs = [];
        for (const photoBase64 of photos) {
          try {
            const downloadURL = await firestoreStorage.uploadSleepPhoto(photoBase64);
            newPhotoURLs.push(downloadURL);
          } catch (error) {
            console.error('Failed to upload photo:', error);
            // Continue with other photos even if one fails
          }
        }
        
        // Combine existing and new photo URLs
        const allPhotoURLs = [...existingPhotoURLs, ...newPhotoURLs];
        
        if (entry && entry.id) {
          // Update existing sleep session
          await firestoreStorage.updateSleepSession(entry.id, {
            startTime: startMs,
            endTime: endMs,
            isActive: false,
            notes: notes || null,
            photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : null
          });
        } else {
          // Create new sleep session (shouldn't happen from detail sheet, but handle it)
          const session = await firestoreStorage.startSleep(startMs);
          await firestoreStorage.endSleep(session.id, endMs);
          if (notes || allPhotoURLs.length > 0) {
            await firestoreStorage.updateSleepSession(session.id, {
              notes: notes || null,
              photoURLs: allPhotoURLs.length > 0 ? allPhotoURLs : null
            });
          }
        }
        
        handleClose();
      } catch (error) {
        console.error('Failed to save sleep session:', error);
        alert('Failed to save sleep session. Please try again.');
      } finally {
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
            setPhotos([...photos, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      };
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
    const bodyContent = React.createElement(
      React.Fragment,
      null,

      // Timer Display
      React.createElement('div', { className: "text-center mb-6" },
        React.createElement('div', { className: "text-[40px] leading-none font-bold", style: { color: 'var(--tt-text-primary)' } },
          React.createElement('span', null, `${String(duration.hours).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base font-normal ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'h'),
          React.createElement('span', { className: "ml-2" }, `${String(duration.minutes).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base font-normal ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'm'),
          React.createElement('span', { className: "ml-2" }, `${String(duration.seconds).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base font-normal ml-1", style: { color: 'var(--tt-text-secondary)' } }, 's')
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
          type: 'datetime'
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

        // Notes
        React.createElement(InputRow, {
          label: 'Notes',
          value: notes,
          onChange: setNotes,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'text',
          placeholder: 'Add a note...'
        })
      ),

      // Photos
      React.createElement('div', { className: "py-3" },
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
            React.createElement(PlusIcon, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      ),

      // Delete Button (only show if editing existing entry)
      entry && entry.id && React.createElement('button', {
        onClick: () => setShowDeleteConfirm(true),
        disabled: saving,
        className: "w-full text-red-600 py-2 text-center font-normal active:opacity-70 transition-opacity duration-100",
        style: { marginTop: '30px' }
      }, 'Delete'),

      // Delete confirmation dialog
      showDeleteConfirm && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setShowDeleteConfirm(false),
          className: "fixed inset-0 bg-black bg-opacity-50 z-[103] flex items-center justify-center p-4"
        },
          React.createElement('div', {
            onClick: (e) => e.stopPropagation(),
            className: "rounded-2xl p-4 max-w-xs w-full",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
            React.createElement('div', { className: "text-base font-semibold mb-4 text-center", style: { color: 'var(--tt-text-primary)' } }, 'Delete sleep session?'),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('button', {
                onClick: () => setShowDeleteConfirm(false),
                className: "flex-1 py-2.5 rounded-xl border font-semibold transition text-sm",
                style: { 
                  borderColor: 'var(--tt-card-border)', 
                  color: 'var(--tt-text-secondary)',
                  backgroundColor: 'var(--tt-card-bg)'
                }
              }, 'Cancel'),
              React.createElement('button', {
                onClick: handleDelete,
                className: "flex-1 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition text-sm"
              }, 'Delete')
            )
          )
        )
      ),

      // Full-size photo modal
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-[102] flex items-center justify-center p-4"
        },
          React.createElement('img', {
            src: fullSizePhoto,
            alt: "Full size photo",
            className: "max-w-full max-h-full object-contain",
            onClick: (e) => e.stopPropagation()
          })
        )
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
          rightAction: React.createElement('button', {
            onClick: handleSave,
            disabled: !isValid || saving,
            className: `text-base font-normal transition-opacity ${
              (isValid && !saving)
                ? 'text-white hover:opacity-70 active:opacity-50' 
                : 'cursor-not-allowed'
            }`,
            style: (!isValid || saving) ? { color: 'rgba(255,255,255,0.4)' } : undefined
          }, saving ? 'Saving...' : 'Save')
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
      // Header: [X] [Sleep] [Save]
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 py-4 mb-6 flex items-center justify-between" },
        // X button (close)
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, React.createElement(XIcon, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
        
        // Centered title
        React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, 'Sleep'),
        
        // Save button
        React.createElement('button', {
          onClick: handleSave,
          disabled: !isValid,
          className: `text-base font-normal transition-opacity ${
            isValid 
              ? 'text-white hover:opacity-70 active:opacity-50' 
              : 'cursor-not-allowed'
          }`,
          style: !isValid ? { color: 'var(--tt-text-tertiary)' } : undefined
        }, 'Save')
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
      return null;
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
    const [sleepState, setSleepState] = React.useState(getInitialSleepState()); // 'idle' | 'idle_with_times' | 'running' | 'completed'
    const [startTime, setStartTime] = React.useState(getInitialStartTime()); // ISO string
    const [endTime, setEndTime] = React.useState(null); // ISO string
    const [sleepNotes, setSleepNotes] = React.useState('');
    const [sleepElapsedMs, setSleepElapsedMs] = React.useState(0);
    const [activeSleepSessionId, setActiveSleepSessionId] = React.useState(null); // Firebase session ID when running
    const sleepIntervalRef = React.useRef(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    
    // Shared photos state
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    
    // Track keyboard state to hide sticky button when keyboard is open
    const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
    
    // Refs for measuring both content heights
    const feedingContentRef = React.useRef(null);
    const sleepContentRef = React.useRef(null);
    const [resolvedSheetHeight, setResolvedSheetHeight] = React.useState(null);
    
    // Reserve space so the bottom CTA button stays in the same visual spot across modes
    const CTA_SPACER_PX = 86; // button height (py-3 = 12px top + 12px bottom + text line height ~20px) + mt-4 (16px) + padding
    
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
      if (mode === 'sleep') {
        // If in idle state with no start time, populate it
        if (!startTime && sleepState === 'idle') {
          setStartTime(new Date().toISOString());
        }
        // If not running and not idle_with_times (both times entered), clear end time
        const hasBothTimes = startTime && endTime;
        if (sleepState === 'idle' && !hasBothTimes) {
          setEndTime(null);
        }
      }
    }, [mode, sleepState, startTime, endTime]);
    
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
            setPhotos([...photos, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      };
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
    
    // Determine if we're in idle_with_times state (both times entered but not running/completed)
    const isIdleWithTimes = sleepState === 'idle' && startTime && endTime;
    
    // Handle close with state-based logic
    const handleClose = () => {
      if (mode === 'feeding') {
        // Feeding mode: always close immediately
        if (onClose) onClose();
        return;
      }
      
      // Sleep mode: state-based dismissal
      if (sleepState === 'idle' && !isIdleWithTimes) {
        // IDLE (no times): Close immediately
        if (onClose) onClose();
      } else if (sleepState === 'running') {
        // RUNNING: Close sheet, timer continues in background
        if (onClose) onClose();
      } else if (sleepState === 'completed' || isIdleWithTimes) {
        // COMPLETED or IDLE_WITH_TIMES: Show confirmation dialog
        setShowDeleteConfirm(true);
      }
    };
    
    // Handle delete confirmation
    const handleDeleteConfirm = () => {
      // Reset to IDLE and close
      setSleepState('idle');
      setStartTime(null);
      setEndTime(null);
      setSleepNotes('');
      setPhotos([]);
      setSleepElapsedMs(0);
      setShowDeleteConfirm(false);
      if (onClose) onClose();
    };
    
    // Handle delete cancel
    const handleDeleteCancel = () => {
      setShowDeleteConfirm(false);
    };

    // Handle add feeding - save to Firebase
    const handleAddFeeding = async () => {
      const amount = parseFloat(ounces);
      if (!amount || amount <= 0) return;
      
      try {
        const timestamp = new Date(feedingDateTime).getTime();
        
        // Upload photos to Firebase Storage
        const photoURLs = [];
        for (const photoBase64 of photos) {
          try {
            const downloadURL = await firestoreStorage.uploadFeedingPhoto(photoBase64);
            photoURLs.push(downloadURL);
          } catch (error) {
            console.error('Failed to upload photo:', error);
            // Continue with other photos even if one fails
          }
        }
        
        // Save to Firebase
        await firestoreStorage.addFeedingWithNotes(
          amount,
          timestamp,
          feedingNotes || null,
          photoURLs.length > 0 ? photoURLs : null
        );
        
        // Reset form
        setOunces('');
        setFeedingNotes('');
        setPhotos([]);
        setFeedingDateTime(new Date().toISOString());
        // Close the sheet first
        if (onClose) onClose();
        // Then refresh timeline after sheet closes (onAdd callback handles the delay)
        if (onAdd) {
          await onAdd('feeding');
        }
      } catch (error) {
        console.error('Failed to add feeding:', error);
        alert('Failed to add feeding. Please try again.');
      }
    };

    // Handle start sleep: IDLE/IDLE_WITH_TIMES/COMPLETED → RUNNING
    const handleStartSleep = async () => {
      try {
        let sessionId = activeSleepSessionId;
        let startMs;
        
        if (sleepState === 'completed') {
          // COMPLETED → RUNNING: Keep existing start time, clear end time
          startMs = new Date(startTime).getTime();
          setEndTime(null);
        } else {
          // IDLE/IDLE_WITH_TIMES → RUNNING: Update start time to now, clear end time
          const now = new Date().toISOString();
          setStartTime(now);
          startMs = Date.now();
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

    // Handle end sleep: RUNNING → COMPLETED
    const handleEndSleep = async () => {
      if (sleepState !== 'running') return;
      
      try {
        const now = new Date().toISOString();
        const endMs = Date.now();
        setEndTime(now);
        
        // End Firebase session
        if (activeSleepSessionId) {
          await firestoreStorage.endSleep(activeSleepSessionId, endMs);
          setActiveSleepSessionId(null);
        }
        
        setSleepState('completed');
        // Timer will stop via useEffect when sleepState becomes 'completed'
      } catch (error) {
        console.error('Failed to end sleep:', error);
        alert('Failed to end sleep. Please try again.');
      }
    };
    
    // Handle start time change
    const handleStartTimeChange = (newStartTime) => {
      if (sleepState === 'running') {
        // RUNNING: Recalculate elapsed time from new start time, timer continues
        setStartTime(newStartTime);
        // Timer will recalculate via useEffect dependency on startTime
      } else {
        // Other states: Just update start time
        setStartTime(newStartTime);
      }
    };
    
    // Handle end time change
    const handleEndTimeChange = (newEndTime) => {
      if (sleepState === 'running') {
        // RUNNING: Editing end time stops timer and enters idle_with_times
        setEndTime(newEndTime);
        setSleepState('idle'); // Will become idle_with_times if startTime exists
      } else {
        // Other states: Just update end time
        setEndTime(newEndTime);
      }
    };

    // Validation
    const isValid = () => {
      if (mode === 'feeding') {
        const amount = parseFloat(ounces);
        return amount > 0;
      } else {
        // Sleep: valid in COMPLETED state or IDLE_WITH_TIMES with valid duration
        return (sleepState === 'completed' || isIdleWithTimes) && isSleepValid;
      }
    };

    const handleSave = async () => {
      if (!isValid()) return; // Don't save if invalid
      
      if (mode === 'feeding') {
        // Feeding save is handled by handleAddFeeding
        await handleAddFeeding();
      } else {
        // Sleep: saveable in COMPLETED or IDLE_WITH_TIMES state
        if (sleepState !== 'completed' && !isIdleWithTimes) return;
        
        try {
          const startMs = new Date(startTime).getTime();
          const endMs = new Date(endTime).getTime();
          
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
          type: 'datetime'
        }),

        // Notes
        React.createElement(InputRow, {
          label: 'Notes',
          value: feedingNotes,
          onChange: setFeedingNotes,
          icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
          type: 'text',
          placeholder: 'Add a note...'
        })
      ),

      // Photos
      React.createElement('div', { className: "py-3" },
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
            React.createElement(PlusIcon, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      ),

      // Reserve space for sticky footer CTA
      React.createElement('div', { style: { height: `${CTA_SPACER_PX}px` } })
    );

    // Helper function to render sleep content
    const renderSleepContent = () => {
      // Calculate timer display: elapsed time when RUNNING, duration when COMPLETED/IDLE
      let hours, minutes, seconds;
      if (sleepState === 'running') {
        // Show elapsed time from timer
        hours = Math.floor(sleepElapsedMs / 3600000);
        minutes = Math.floor((sleepElapsedMs % 3600000) / 60000);
        seconds = Math.floor((sleepElapsedMs % 60000) / 1000);
      } else {
        // Show calculated duration
        hours = duration.hours;
        minutes = duration.minutes;
        seconds = duration.seconds;
      }
      
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
              // Only show hours if > 0
              hours > 0 && React.createElement(React.Fragment, null,
                React.createElement('span', null, `${hours}`),
                React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'h'),
                React.createElement('span', { className: "ml-2" })
              ),
              // Minutes: single/double digit when no hours, always 2 digits when hours present
              React.createElement('span', null, hours > 0 ? `${String(minutes).padStart(2, '0')}` : `${minutes}`),
              React.createElement('span', { className: "text-base font-light ml-1", style: { color: 'var(--tt-text-secondary)' } }, 'm'),
              React.createElement('span', { className: "ml-2" }, `${String(seconds).padStart(2, '0')}`),
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
            invalid: !isSleepValid && (sleepState === 'completed' || isIdleWithTimes)
          }),

          // Notes
          React.createElement(InputRow, {
            label: 'Notes',
            value: sleepNotes,
            onChange: setSleepNotes,
            icon: React.createElement(PenIcon, { className: "", style: { color: 'var(--tt-text-secondary)' } }),
            type: 'text',
            placeholder: 'Add a note...'
          })
        ),

      // Photos
      React.createElement('div', { className: "py-3" },
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
            React.createElement(PlusIcon, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } })
          )
        )
      ),

      // Reserve space for sticky footer CTA
      React.createElement('div', { style: { height: `${CTA_SPACER_PX}px` } })
      );
    };

    // Measure both contents when sheet opens to determine max height
    React.useEffect(() => {
      if (!isOpen) {
        setResolvedSheetHeight(null);
        return;
      }

      const measureBoth = () => {
        if (feedingContentRef.current && sleepContentRef.current) {
          // Measure content heights (scrollHeight includes all content)
          const feedingHeight = feedingContentRef.current.scrollHeight;
          const sleepHeight = sleepContentRef.current.scrollHeight;
          const maxContentHeight = Math.max(feedingHeight, sleepHeight);
          
          // Get viewport height for capping
          const vv = window.visualViewport;
          const fallbackH = document.documentElement?.clientHeight || window.innerHeight;
          const viewportHeight = vv ? vv.height : fallbackH;
          
          // Calculate total height: content + header (60px) + content padding
          // TTHalfSheet adds px-6 pt-8 pb-[42px] to content area
          // pt-8 = 32px, pb-[42px] = 42px, total = 74px
          const headerHeight = 60; // Fixed header height
          const contentPadding = 74; // pt-8 (32px) + pb-[42px] (42px)
          
          const totalNeeded = maxContentHeight + contentPadding + headerHeight;
          
          // Cap at 90% of viewport (same as TTHalfSheet logic)
          const maxHeight = totalNeeded <= viewportHeight * 0.9 
            ? totalNeeded 
            : Math.min(viewportHeight * 0.9, totalNeeded);
          
          setResolvedSheetHeight(`${maxHeight}px`);
        }
      };

      // Measure after render with multiple attempts
      requestAnimationFrame(() => {
        measureBoth();
        setTimeout(measureBoth, 50);
        setTimeout(measureBoth, 200); // Extra delay for async content
      });
    }, [isOpen, ounces, feedingNotes, photos, startTime, endTime, sleepNotes, sleepState]);

    // Body content - render both for measurement, show one based on mode
    const bodyContent = React.createElement(
      React.Fragment,
      null,
      // Wrapper to ensure proper clipping of absolutely positioned children
      React.createElement('div', {
        style: { position: 'relative', overflow: 'hidden', width: '100%' }
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
            pointerEvents: 'none',
            zIndex: -1,
            height: 'auto',
            overflow: 'hidden'
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
            pointerEvents: 'none',
            zIndex: -1,
            height: 'auto',
            overflow: 'hidden'
          }
        }, renderSleepContent())
      ),

      // Sticky bottom CTA (keeps primary action in the same spot across Feed/Sleep)
      // Hide when keyboard is open to prevent overlap with keyboard
      React.createElement('div', {
        className: "sticky bottom-0 left-0 right-0 pt-3 pb-1",
        style: { 
          zIndex: 10,
          backgroundColor: 'var(--tt-card-bg)',
          display: isKeyboardOpen ? 'none' : 'block'
        }
      },
        mode === 'feeding'
          ? React.createElement('button', {
              onClick: handleAddFeeding,
              className: "w-full text-white py-3 rounded-2xl font-semibold transition",
              style: {
                backgroundColor: 'var(--tt-feed)'
              },
              onMouseEnter: (e) => {
                e.target.style.backgroundColor = 'var(--tt-feed-strong)';
              },
              onMouseLeave: (e) => {
                e.target.style.backgroundColor = 'var(--tt-feed)';
              }
            }, 'Add Feed')
          : (sleepState === 'idle' || sleepState === 'running' || isIdleWithTimes || sleepState === 'completed') && React.createElement('button', {
              onClick: sleepState === 'running' ? handleEndSleep : handleStartSleep,
              className: "w-full text-white py-3 rounded-2xl font-semibold transition",
              style: {
                backgroundColor: 'var(--tt-sleep)'
              },
              onMouseEnter: (e) => {
                e.target.style.backgroundColor = 'var(--tt-sleep-strong)';
              },
              onMouseLeave: (e) => {
                e.target.style.backgroundColor = 'var(--tt-sleep)';
              }
            }, sleepState === 'running' ? 'End Sleep' : 'Start Sleep')
      ),

      // Full-size photo modal (shared for both modes)
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-[102] flex items-center justify-center p-4"
        },
          React.createElement('img', {
            src: fullSizePhoto,
            alt: "Full size photo",
            className: "max-w-full max-h-full object-contain",
            onClick: (e) => e.stopPropagation()
          })
        )
      ),
      
      // Delete confirmation dialog (simplified)
      showDeleteConfirm && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: handleDeleteCancel,
          className: "fixed inset-0 bg-black bg-opacity-50 z-[103] flex items-center justify-center p-4"
        },
          React.createElement('div', {
            onClick: (e) => e.stopPropagation(),
            className: "rounded-2xl p-4 max-w-xs w-full",
            style: { 
              backgroundColor: document.documentElement.classList.contains('dark') 
                ? '#2C2C2E'  // Lighter than card-bg in dark mode
                : 'var(--tt-card-bg)'
            }
          },
            React.createElement('div', { className: "text-base font-semibold mb-4 text-center", style: { color: 'var(--tt-text-primary)' } }, 'Delete entry?'),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('button', {
                onClick: handleDeleteCancel,
                className: "flex-1 py-2.5 rounded-xl border font-semibold transition text-sm",
                style: { 
                  borderColor: 'var(--tt-card-border)', 
                  color: 'var(--tt-text-secondary)',
                  backgroundColor: document.documentElement.classList.contains('dark') 
                    ? '#2C2C2E'
                    : 'var(--tt-card-bg)'
                }
              }, 'Cancel'),
              React.createElement('button', {
                onClick: handleDeleteConfirm,
                className: "flex-1 py-2.5 rounded-xl text-white font-semibold transition text-sm",
                style: { 
                  backgroundColor: document.documentElement.classList.contains('dark') 
                    ? '#dc2626'  // Red-600 for dark mode
                    : '#ef4444'  // Red-500 for light mode
                },
                onMouseEnter: (e) => {
                  e.target.style.backgroundColor = document.documentElement.classList.contains('dark')
                    ? '#b91c1c'  // Red-700 for dark mode hover
                    : '#dc2626'; // Red-600 for light mode hover
                },
                onMouseLeave: (e) => {
                  e.target.style.backgroundColor = document.documentElement.classList.contains('dark')
                    ? '#dc2626'
                    : '#ef4444';
                }
              }, 'Delete')
            )
          )
        )
      )
    );

    // If overlay mode (isOpen provided), wrap in HalfSheet
    if (isOpen !== undefined) {
      return React.createElement(
        window.TTHalfSheet,
        {
          isOpen: isOpen || false,
          onClose: handleClose,
          fixedHeight: resolvedSheetHeight,
          accentColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
          titleElement: React.createElement(HeaderSegmentedToggle, {
            value: mode,
            options: [
              { value: 'feeding', label: 'Feed' },
              { value: 'sleep', label: 'Sleep' }
            ],
            onChange: setMode
          }),
          rightAction: (mode === 'sleep' && (sleepState === 'completed' || isIdleWithTimes)) ? React.createElement('button', {
            onClick: handleSave,
            disabled: !isValid(),
            className: `text-base font-normal transition-opacity ${
              isValid() 
                ? 'text-white hover:opacity-70 active:opacity-50' 
                : 'cursor-not-allowed'
            }`,
            style: !isValid() ? { color: 'rgba(255,255,255,0.4)' } : undefined
          }, 'Save') : null
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
      // Header: [X] [Toggle] [Save] - fixed 60px height
      React.createElement('div', { className: "bg-black rounded-t-2xl -mx-6 -mt-6 px-6 h-[60px] mb-6 flex items-center justify-between" },
        React.createElement('button', {
          onClick: handleClose,
          className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
        }, React.createElement(XIcon, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
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
        (mode === 'sleep' && (sleepState === 'completed' || isIdleWithTimes)) ? React.createElement('button', {
          onClick: handleSave,
          disabled: !isValid(),
          className: `text-base font-normal transition-opacity ${
            isValid() 
              ? 'text-white hover:opacity-70 active:opacity-50' 
              : 'cursor-not-allowed'
          }`,
          style: !isValid() ? { color: 'rgba(255,255,255,0.4)' } : undefined
        }, 'Save') : React.createElement('div', { className: "w-6" })
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
