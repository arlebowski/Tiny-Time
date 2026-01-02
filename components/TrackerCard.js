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
    strokeWidth: "2",
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
    strokeWidth: "2",
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
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('path', { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
  React.createElement('path', { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
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
    strokeWidth: "2",
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
    strokeWidth: "2",
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
    strokeWidth: "2",
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
    strokeWidth: "2",
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
    strokeWidth: "2",
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
    .zzz {
      display: inline-block;
      animation: floatingZs 2s ease-in-out infinite;
    }
    .zzz :nth-child(1) { animation-delay: 0s; }
    .zzz :nth-child(2) { animation-delay: 0.3s; }
    .zzz :nth-child(3) { animation-delay: 0.6s; }
  `;
  document.head.appendChild(style);
}

const TimelineItem = ({ withNote, mode = 'sleep' }) => {
  const isSleep = mode === 'sleep';
  
  return React.createElement(
    'div',
    { className: "rounded-2xl bg-gray-50 p-4" },
    React.createElement(
      'div',
      { className: "flex items-center justify-between mb-2" },
      React.createElement(
        'div',
        { className: "flex items-center gap-3" },
        React.createElement('div', { className: "h-6 w-6 rounded-2xl bg-gray-100" }),
        React.createElement(
          'div',
          null,
          React.createElement('div', { className: "font-semibold text-gray-500" }, 
            isSleep ? '2h 20m' : '4oz'
          ),
          React.createElement('div', { className: "text-sm text-gray-500" }, 
            isSleep ? '6:07pm – 8:27pm' : '8:27pm'
          )
        )
      ),
      React.createElement(ChevronDown, { className: "rotate-[-90deg] text-gray-500" })
    ),
    withNote && React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'div',
        { className: "italic text-sm text-gray-500 mb-3" },
        isSleep ? 'Note: had to hold him forever' : 'Note: kid didn\'t burp dammit!'
      ),
      React.createElement(
        'div',
        { className: "grid grid-cols-2 gap-2" },
        [0, 1, 2, 3].map(i =>
          React.createElement(
            'div',
            {
              key: i,
              className: "aspect-square rounded-2xl bg-gray-100"
            }
          )
        )
      )
    )
  );
};

const TrackerCard = ({ mode = 'sleep' }) => {
  ensureZzzStyles();
  const [expanded, setExpanded] = React.useState(false);
  const [cardVisible, setCardVisible] = React.useState(false);

  // Animation trigger - set visible after mount
  React.useEffect(() => {
    setCardVisible(true);
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

  // Demo percent for animation (66% = 2/3)
  const demoPercent = 66;
  
  // Status text based on mode for Timeline row
  const timelineStatusText = mode === 'feeding' 
    ? 'Last fed 4:02pm'
    : React.createElement(
        React.Fragment,
        null,
        React.createElement('span', { className: "text-black font-semibold" }, '1h 20m'),
        React.createElement('span', { className: "text-black font-light" },
          ' ',
          React.createElement('span', { className: "zzz" },
            React.createElement('span', null, 'z'),
            React.createElement('span', null, 'Z'),
            React.createElement('span', null, 'z')
          )
        )
      );

  const timelineLabel = mode === 'feeding'
    ? `Timeline • ${timelineStatusText}`
    : React.createElement(
        React.Fragment,
        null,
        'Timeline • ',
        timelineStatusText
      );

  return React.createElement(
    'div',
    { className: "rounded-2xl bg-white p-5 shadow-sm" },
    React.createElement(
      'div',
      { className: "flex items-center gap-3 mb-4" },
      React.createElement('div', { className: "h-6 w-6 rounded-2xl bg-gray-100" }),
      React.createElement('div', { className: "text-base font-semibold" }, 'Header')
    ),
    React.createElement(
      'div',
      { className: "flex items-baseline gap-1 mb-2" },
      React.createElement('div', { className: "text-[40px] leading-none font-bold" }, 
        mode === 'sleep' ? '14.5' : '22.5'
      ),
      React.createElement('div', { className: "relative -top-[1px] text-[16px] leading-none text-gray-500" }, 
        mode === 'sleep' ? 'of 14.5 hrs' : 'of 25.5 oz'
      )
    ),
    
    // Animated Progress Bar (production-style)
    React.createElement('div', { className: "relative w-full h-6 bg-gray-100 rounded-2xl overflow-hidden mb-2" },
      React.createElement('div', {
        className: "absolute left-0 top-0 h-full rounded-2xl bg-gray-500",
        style: {
          width: cardVisible ? `${Math.min(100, demoPercent)}%` : '0%',
          transition: 'width 0.6s ease-out',
          transitionDelay: '0s'
        }
      })
    ),
    React.createElement(
      'div',
      { className: "flex gap-1.5 pl-1" },
      [0, 1, 2, 3, 4].map(i =>
        React.createElement('div', { key: i, className: "h-3.5 w-3.5 rounded-full bg-gray-500" })
      )
    ),
    React.createElement('div', { className: "border-t border-gray-100 my-4" }),
    React.createElement(
      'button',
      {
        onClick: () => setExpanded(!expanded),
        className: "flex w-full items-center justify-between text-gray-500"
      },
      React.createElement('span', null, timelineLabel),
      expanded ? React.createElement(ChevronUp) : React.createElement(ChevronDown)
    ),
    expanded && React.createElement(
      'div',
      { className: "mt-4 space-y-4" },
      React.createElement(TimelineItem, { mode }),
      React.createElement(TimelineItem, { withNote: true, mode })
    )
  );
};

// Detail Sheet Components
// Guard to prevent redeclaration
// NOTE: UI Lab HalfSheet improvements: smooth keyboard open/close on iOS via visualViewport offset
if (typeof window !== 'undefined' && !window.TTFeedDetailSheet && !window.TTSleepDetailSheet) {
  
  // HalfSheet wrapper component (UI Lab only)
  const HalfSheet = ({ isOpen, onClose, title, rightAction, children }) => {
    const sheetRef = React.useRef(null);
    const backdropRef = React.useRef(null);
    const contentRef = React.useRef(null);
    const innerRef = React.useRef(null);
    const [sheetHeight, setSheetHeight] = React.useState('auto');
    const [present, setPresent] = React.useState(false); // Controls rendering
    const [keyboardOffset, setKeyboardOffset] = React.useState(0);
    
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
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow || '';
      };
    }, [present]);

    // Apply keyboard offset smoothly (separate from open/close transform)
    React.useEffect(() => {
      if (!present || !isOpen || !innerRef.current) return;
      // Keep this transition stable so visualViewport-driven shifts animate smoothly.
      innerRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1)';
    }, [present, isOpen]);

    React.useEffect(() => {
      if (!present || !isOpen || !innerRef.current) return;
      // Move the sheet content up by the keyboard height (iOS visual viewport).
      // This avoids the "snap back" when the keyboard closes.
      innerRef.current.style.transform = `translateY(${-keyboardOffset}px)`;
    }, [present, isOpen, keyboardOffset]);

    // Calculate initial keyboard offset when sheet opens
    React.useEffect(() => {
      if (!present || !isOpen) return;
      
      const vv = window.visualViewport;
      if (vv) {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setKeyboardOffset(kb);
      }
    }, [isOpen, present]);

    // Measure content and set dynamic height
    React.useEffect(() => {
      if (isOpen && present && contentRef.current && sheetRef.current) {
        const measureHeight = () => {
          if (contentRef.current && sheetRef.current) {
            const contentHeight = contentRef.current.scrollHeight; // Already includes py-6 padding
            // Use visualViewport if available (more accurate for mobile keyboards)
            const vv = window.visualViewport;
            const viewportHeight = vv ? vv.height : window.innerHeight;
            const vvOffsetTop = vv ? vv.offsetTop : 0;
            // Keyboard height approximation: layout viewport minus visual viewport (minus offsetTop)
            const kb = vv ? Math.max(0, window.innerHeight - vv.height - vvOffsetTop) : 0;
            setKeyboardOffset(kb);
            const headerHeight = 56; // Approximate header height (py-4 = 16px top + 16px bottom + ~24px content)
            const totalNeeded = contentHeight + headerHeight; // contentHeight already includes padding
            const maxHeight = Math.min(viewportHeight * 0.9, totalNeeded);
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
      sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1), height 200ms ease-out';
    }, [isOpen, present]);

    // Listen to visualViewport resize for keyboard changes
    React.useEffect(() => {
      if (!present || !isOpen) return;
      
      const vv = window.visualViewport;
      if (!vv) return;
      
      const handleResize = () => {
        if (contentRef.current && sheetRef.current) {
          const contentHeight = contentRef.current.scrollHeight;
          const viewportHeight = vv.height;
          const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
          setKeyboardOffset(kb);
          const headerHeight = 56;
          const totalNeeded = contentHeight + headerHeight;
          const maxHeight = Math.min(viewportHeight * 0.9, totalNeeded);
          setSheetHeight(`${maxHeight}px`);
        }
      };
      
      vv.addEventListener('resize', handleResize);
      vv.addEventListener('scroll', handleResize);
      return () => {
        vv.removeEventListener('resize', handleResize);
        vv.removeEventListener('scroll', handleResize);
      };
    }, [isOpen, present]);

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
            sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1), height 200ms ease-out';
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
            sheetRef.current.style.transition = 'transform 200ms ease-in, height 200ms ease-out';
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
    const handleTouchStart = (e) => {
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
      sheetRef.current.style.transition = 'transform 200ms ease-in, height 200ms ease-out';
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

    return React.createElement(
      React.Fragment,
      null,
      // Backdrop
      React.createElement('div', {
        ref: backdropRef,
        className: "fixed inset-0 bg-black z-40",
        onClick: () => { if (onClose && !isDragging) onClose(); },
        style: { opacity: 0 }
      }),
      // Sheet Panel
      React.createElement('div', {
        ref: sheetRef,
        className: "fixed left-0 right-0 bottom-0 z-[60] bg-white rounded-t-2xl shadow-2xl",
        onClick: (e) => e.stopPropagation(),
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
          style: {
            transform: 'translateY(100%)',
            willChange: 'transform',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
            // Avoid vh snapping on iOS when the keyboard opens/closes.
            maxHeight: '100%',
            height: sheetHeight,
            // Transition is set dynamically in useEffect to combine transform and height
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            touchAction: 'pan-y'
          }
        },
        // Inner wrapper: this is what we shift up/down with the keyboard smoothly.
        React.createElement('div', {
          ref: innerRef,
          style: {
            transform: 'translateY(0)',
            willChange: 'transform',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }
        },
          // Header (part of HalfSheet chrome)
          React.createElement('div', {
            className: "bg-black rounded-t-2xl px-6 py-4 flex items-center justify-between flex-none"
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
            className: "flex-1 overflow-y-auto px-6 py-6",
            style: {
              WebkitOverflowScrolling: 'touch',
              minHeight: 0
            }
          }, children)
        )
      )
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
    const displayValue = type === 'datetime' ? (rawValue ? formatDateTime(rawValue) : '') : value;
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
        className: "flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer active:bg-gray-100 active:rounded-2xl active:-mx-3 active:px-3 transition-all duration-150",
        onClick: handleRowClick
      },
      React.createElement('div', { className: "flex-1" },
        React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, label),
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
                className: "text-base font-normal text-black w-full outline-none resize-none",
                style: { background: 'transparent', maxHeight: '4.5rem', overflowY: 'auto' }
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
                className: `text-base font-normal w-full outline-none ${invalid ? 'text-red-600' : 'text-black'}`,
                style: { background: 'transparent' },
                readOnly: type === 'datetime'
              }
            )
      ),
      icon && React.createElement('button', {
        onClick: handleIconClick,
        className: "ml-4 text-black"
      }, icon)
    );
  };

  // TTFeedDetailSheet Component
  const TTFeedDetailSheet = ({ isOpen, onClose }) => {
    const [ounces, setOunces] = React.useState('6');
    const [dateTime, setDateTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState("kid didn't burp dammit!");
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);

    const handleSave = () => {
      console.log('Feed save:', { ounces, dateTime, notes, photos });
      // UI-only, no production behavior
      handleClose(); // Close the sheet after saving
    };

    const handleDelete = () => {
      console.log('Feed delete');
      // UI-only, no production behavior
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

    const handleRemovePhoto = (index) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
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

      // Ounces
      React.createElement(InputRow, {
        label: 'Ounces',
        value: ounces,
        onChange: setOunces,
        icon: React.createElement(EditIcon),
        type: 'number',
        placeholder: '0'
      }),

      // Date & Time
      React.createElement(InputRow, {
        label: 'Date & Time',
        value: formatDateTime(dateTime), // This won't be used for datetime type
        rawValue: dateTime, // Pass the raw ISO string
        onChange: setDateTime,
        icon: React.createElement(ClockIcon),
        type: 'datetime'
      }),

      // Notes
      React.createElement(InputRow, {
        label: 'Notes',
        value: notes,
        onChange: setNotes,
        icon: React.createElement(EditIcon),
        type: 'text',
        placeholder: 'Add a note...'
      }),

      // Photos
      React.createElement('div', { className: "py-3 border-b border-gray-100" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs text-gray-500" }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render photos
          photos.map((photo, i) =>
            React.createElement('div', {
              key: i,
              className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 relative",
              style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
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
            className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIcon, { className: "w-6 h-6 text-gray-400" })
          )
        )
      ),

      // Delete Button
      React.createElement('button', {
        onClick: handleDelete,
        className: "w-full text-red-600 py-2 text-center font-normal active:opacity-70 transition-opacity duration-100"
      }, 'Delete'),

      // Full-size photo modal
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4"
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
          rightAction: React.createElement('button', {
            onClick: handleSave,
            className: "text-base font-normal text-white hover:opacity-70 active:opacity-50 transition-opacity"
          }, 'Save')
        },
        bodyContent
      );
    }

    // Static preview mode (for UI Lab inline display)
    return React.createElement(
      'div',
      { className: "bg-white rounded-2xl shadow-sm p-6 space-y-0" },
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
  const TTSleepDetailSheet = ({ isOpen, onClose }) => {
    const [startTime, setStartTime] = React.useState(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    const [endTime, setEndTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState("kid didn't burp dammit!");
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [lastValidDuration, setLastValidDuration] = React.useState({ hours: 2, minutes: 0, seconds: 0 });

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

    const handleSave = () => {
      if (!isValid) return; // Don't save if invalid
      console.log('Sleep save:', { startTime, endTime, notes, photos, duration });
      // UI-only, no production behavior
      handleClose(); // Close the sheet after saving
    };

    const handleDelete = () => {
      console.log('Sleep delete');
      // UI-only, no production behavior
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

    const handleRemovePhoto = (index) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
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
      React.createElement('div', { className: "text-center -mt-2 mb-6" },
        React.createElement('div', { className: "text-[40px] leading-none font-bold text-black" },
          React.createElement('span', null, `${String(duration.hours).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base text-gray-500 font-normal ml-1" }, 'h'),
          React.createElement('span', { className: "ml-2" }, `${String(duration.minutes).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base text-gray-500 font-normal ml-1" }, 'm'),
          React.createElement('span', { className: "ml-2" }, `${String(duration.seconds).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base text-gray-500 font-normal ml-1" }, 's')
        )
      ),

      // Start time
      React.createElement(InputRow, {
        label: 'Start time',
        value: formatDateTime(startTime), // This won't be used for datetime type
        rawValue: startTime, // Pass the raw ISO string
        onChange: setStartTime,
        icon: React.createElement(ClockIcon),
        type: 'datetime'
      }),

      // End time
      React.createElement(InputRow, {
        label: 'End time',
        value: formatDateTime(endTime), // This won't be used for datetime type
        rawValue: endTime, // Pass the raw ISO string
        onChange: setEndTime,
        icon: React.createElement(ClockIcon),
        type: 'datetime',
        invalid: !isValid // Pass invalid flag when end time is before start time
      }),

      // Notes
      React.createElement(InputRow, {
        label: 'Notes',
        value: notes,
        onChange: setNotes,
        icon: React.createElement(EditIcon),
        type: 'text',
        placeholder: 'Add a note...'
      }),

      // Photos
      React.createElement('div', { className: "py-3 border-b border-gray-100" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs text-gray-500" }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render photos
          photos.map((photo, i) =>
            React.createElement('div', {
              key: i,
              className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 relative",
              style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
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
            className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIcon, { className: "w-6 h-6 text-gray-400" })
          )
        )
      ),

      // Delete Button
      React.createElement('button', {
        onClick: handleDelete,
        className: "w-full text-red-600 py-2 text-center font-normal active:opacity-70 transition-opacity duration-100"
      }, 'Delete'),

      // Full-size photo modal
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4"
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
          rightAction: React.createElement('button', {
            onClick: handleSave,
            disabled: !isValid,
            className: `text-base font-normal transition-opacity ${
              isValid 
                ? 'text-white hover:opacity-70 active:opacity-50' 
                : 'text-gray-400 cursor-not-allowed'
            }`
          }, 'Save')
        },
        bodyContent
      );
    }

    // Static preview mode (for UI Lab inline display)
    return React.createElement(
      'div',
      { className: "bg-white rounded-2xl shadow-sm p-6 space-y-0" },
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
              : 'text-gray-400 cursor-not-allowed'
          }`
        }, 'Save')
      ),
      bodyContent
    );
  };

  // Expose components globally
  if (typeof window !== 'undefined') {
    window.TTFeedDetailSheet = TTFeedDetailSheet;
    window.TTSleepDetailSheet = TTSleepDetailSheet;
  }
}

// Make available globally for script.js
if (typeof window !== 'undefined') {
  window.TrackerCard = TrackerCard;
}
