// TTHalfSheet Component (Reusable)
// HalfSheet wrapper component with drag-to-dismiss, keyboard handling, and animations

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTHalfSheet) {
  
  // Height constant (82% of viewport height)
  const INPUT_SHEET_HEIGHT_VH = 82;
  
  const TTHalfSheet = ({ isOpen, onClose, title, titleElement, rightAction, children, contentKey, fixedHeight, accentColor }) => {
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
      const heightVH = fixedHeight || 70; // Default to 70vh
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
    }, [present, isOpen, children, contentKey]);

    // Helper to check if tray is open (reads directly from window for latest value)
    const checkTrayOpen = () => {
      return !!(typeof window !== 'undefined' && window.TT?.shared?.pickers?.isTrayOpen);
    };

    // Helper to check if touch target is within a picker tray
    const isTouchInPickerTray = (e) => {
      if (!e.target) return false;
      // Check if the touch target or any parent is within a picker tray
      // Picker trays are rendered as children of the HalfSheet, so we check for wheel picker elements
      const target = e.target;
      let element = target;
      while (element && element !== sheetRef.current) {
        // Check for wheel picker container (has touchAction: 'none' style)
        if (element.style && element.style.touchAction === 'none') {
          return true;
        }
        // Check for picker-related classes or data attributes
        if (element.classList && (
          element.classList.contains('wheel-picker') ||
          element.getAttribute('data-picker-tray') === 'true'
        )) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    // Drag handlers
    const canDrag = React.useCallback(() => {
      if (checkTrayOpen()) return false;
      if (!contentRef.current) return false;
      const scrollTop = contentRef.current.scrollTop;
      return scrollTop === 0;
    }, []);

    // Touch handlers stored in refs to access latest state values
    const handleTouchStartRef = React.useRef((e) => {
      // Early return if tray is open or touch is within picker tray
      if (checkTrayOpen() || isTouchInPickerTray(e)) {
        isDraggingRef.current = false;
        return;
      }
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
      // Early return if tray is open or touch is within picker tray
      if (checkTrayOpen() || isTouchInPickerTray(e)) {
        isDraggingRef.current = false;
        return;
      }
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
      // Early return if tray is open or touch is within picker tray
      if (checkTrayOpen() || isTouchInPickerTray(e)) {
        isDraggingRef.current = false;
        return;
      }
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
          // Header (part of HalfSheet chrome) - fixed 60px height
          React.createElement('div', {
            ref: headerRef,
            className: accentColor ? "" : "bg-black",
            style: { 
              backgroundColor: accentColor || 'var(--tt-primary-brand)',
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
            // ChevronDown button (close)
            React.createElement('button', {
              onClick: onClose,
              className: "w-6 h-6 flex items-center justify-center hover:opacity-70 active:opacity-50 transition-opacity",
              style: { color: 'var(--tt-text-tertiary)' }
            }, React.createElement(
              window.TT?.shared?.icons?.ChevronDownIcon || 
              window.ChevronDown || 
              window.XIcon, // fallback
              { className: "w-5 h-5", style: { transform: 'translateY(1px)' } }
            )),
            
            // Centered title or custom title element
            titleElement ? (
              React.createElement('div', { className: "flex-1 flex justify-center" }, titleElement)
            ) : (
              React.createElement('h2', {
                className: "text-base font-semibold flex-1 text-center",
                style: { color: 'var(--tt-primary-action-text)' }
              }, title || '')
            ),
            
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

  // Expose to global namespace (backward compat + new namespace)
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTHalfSheet = TTHalfSheet;

  // Temporary backward compatibility (will remove later)
  window.TTHalfSheet = TTHalfSheet;
}
