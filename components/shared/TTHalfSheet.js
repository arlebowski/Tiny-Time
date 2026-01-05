// TTHalfSheet Component (Reusable)
// HalfSheet wrapper component with drag-to-dismiss, keyboard handling, and animations

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTHalfSheet) {
  
  const TTHalfSheet = ({ isOpen, onClose, title, titleElement, rightAction, children, contentKey, fixedHeight, accentColor }) => {
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
    
    // Refs for drag state to access latest values in event handlers
    const isDraggingRef = React.useRef(false);
    const dragStartYRef = React.useRef(0);
    const dragCurrentYRef = React.useRef(0);
    const dragStartTimeRef = React.useRef(0);
    const keyboardOffsetRef = React.useRef(0);
    
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
    
    React.useEffect(() => {
      keyboardOffsetRef.current = keyboardOffset;
    }, [keyboardOffset]);

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
      // Always use dynamic measurement to ensure content fits
      // fixedHeight is used as a minimum/initial value, but we always recalculate
      // This prevents fields from shrinking after keyboard closes when content has changed
      if (isOpen && present && contentRef.current && sheetRef.current) {
        const measureHeight = () => {
          if (contentRef.current && sheetRef.current && headerRef.current) {
            const contentHeight = contentRef.current.scrollHeight; // Already includes py-8 padding
            // Use visualViewport if available (more accurate for mobile keyboards)
            const vv = window.visualViewport;
            const fallbackH = document.documentElement?.clientHeight || window.innerHeight;
            // Use reduced viewport when keyboard is open, full viewport when closed
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
            
            // If fixedHeight is provided and keyboard is closed, use the larger of fixedHeight or calculated height
            // This ensures content always fits, especially after keyboard closes when content may have changed
            if (fixedHeight && keyboardOffset === 0) {
              const fixedHeightPx = parseFloat(fixedHeight) || 0;
              setSheetHeight(`${Math.max(fixedHeightPx, maxHeight)}px`);
            } else {
              setSheetHeight(`${maxHeight}px`);
            }
          }
        };

        // Add extra delay when keyboard closes to let viewport settle and content remeasure
        const delay = keyboardOffset === 0 && fixedHeight ? 150 : 0;
        
        // Measure after render with multiple attempts
        requestAnimationFrame(() => {
          measureHeight();
          setTimeout(measureHeight, 50);
          setTimeout(measureHeight, 200); // Extra delay for async content
          if (delay > 0) {
            setTimeout(measureHeight, delay); // Extra delay when keyboard closes
          }
        });
      }
    }, [isOpen, present, children, contentKey, fixedHeight, keyboardOffset]);

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

      // Throttle visualViewport events to animation frames to avoid choppy re-renders.
      let rafId = null;
      let lastKeyboardOffset = keyboardOffsetRef.current || 0;
      let lastSheetHeight = sheetHeight;

      const handleResize = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        rafId = requestAnimationFrame(() => {
          const newKeyboardOffset = computeKeyboardOffset();

          // Only update when it actually changed (reduces re-renders during keyboard animation).
          if (Math.abs(newKeyboardOffset - lastKeyboardOffset) > 0.5) {
            setKeyboardOffset(newKeyboardOffset);
            keyboardOffsetRef.current = newKeyboardOffset;
            lastKeyboardOffset = newKeyboardOffset;
          }

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
            const newSheetHeight = `${maxHeight}px`;

            if (newSheetHeight !== lastSheetHeight) {
              setSheetHeight(newSheetHeight);
              lastSheetHeight = newSheetHeight;
            }
          }
        });
      };

      vv.addEventListener('resize', handleResize);
      vv.addEventListener('scroll', handleResize);
      // Initial sync (covers keyboard already open / first focus)
      handleResize();
      return () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
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
      if (keyboardOffsetRef.current > 0) return false;
      const ae = document.activeElement;
      if (!ae) return true;
      const tag = (ae.tagName || '').toUpperCase();
      return !(tag === 'INPUT' || tag === 'TEXTAREA' || ae.isContentEditable);
    };

    // Touch handlers stored in refs to access latest state values
    const handleTouchStartRef = React.useRef((e) => {
      if (!canDrag()) return;
      if (!sheetRef.current) return;
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStartY(touch.clientY);
      setDragCurrentY(touch.clientY);
      setDragStartTime(Date.now());
      // Only disable transform transition, keep height transition
      sheetRef.current.style.transition = 'height 200ms ease-out';
    });

    const handleTouchMoveRef = React.useRef((e) => {
      if (!canDrag()) return;
      if (!isDraggingRef.current || !sheetRef.current || !backdropRef.current) return;
      e.preventDefault(); // Now works because listener is non-passive
      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartYRef.current;
      
      // Only allow downward drag
      if (deltaY > 0) {
        setDragCurrentY(touch.clientY);
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
        
        // Reduce backdrop opacity as you drag down
        const maxDrag = 300; // Max drag distance for full fade
        const backdropOpacity = Math.max(0, 0.4 - (deltaY / maxDrag) * 0.4);
        backdropRef.current.style.opacity = backdropOpacity.toString();
      }
    });

    const handleTouchEndRef = React.useRef(() => {
      if (!canDrag()) return;
      if (!isDraggingRef.current || !sheetRef.current || !backdropRef.current) return;
      
      const deltaY = dragCurrentYRef.current - dragStartYRef.current;
      const dragDuration = Date.now() - dragStartTimeRef.current;
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
          // Header (part of HalfSheet chrome) - fixed 60px height
          React.createElement('div', {
            ref: headerRef,
            className: accentColor ? "" : "bg-black",
            style: { 
              backgroundColor: accentColor || '#000000',
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
            // X button (close)
            React.createElement('button', {
              onClick: onClose,
              className: "w-6 h-6 flex items-center justify-center text-white hover:opacity-70 active:opacity-50 transition-opacity"
            }, React.createElement(window.XIcon, { className: "w-5 h-5", style: { transform: 'translateY(1px)' } })),
            
            // Centered title or custom title element
            titleElement ? (
              React.createElement('div', { className: "flex-1 flex justify-center" }, titleElement)
            ) : (
              React.createElement('h2', { className: "text-base font-semibold text-white flex-1 text-center" }, title || '')
            ),
            
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

  // Expose to global namespace (backward compat + new namespace)
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTHalfSheet = TTHalfSheet;

  // Temporary backward compatibility (will remove later)
  window.TTHalfSheet = TTHalfSheet;
}

