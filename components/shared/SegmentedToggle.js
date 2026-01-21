// ========================================
// SEGMENTED TOGGLE (Unified, Scalable)
// Based on HeaderSegmentedToggle tokens EXACTLY
// Same structure everywhere - only colors and size adapt
// ========================================

const SegmentedToggle = ({ 
  value, 
  options, 
  onChange, 
  variant = 'body', // 'header' | 'body'
  size = 'medium',  // 'small' | 'medium' | 'large'
  fullWidth = false // If true, makes toggle span full width
}) => {
  const __ttMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion)
    ? window.Motion.motion
    : null;
  const useIsomorphicLayoutEffect = typeof window !== 'undefined'
    ? React.useLayoutEffect
    : React.useEffect;
  const containerRef = React.useRef(null);
  const buttonRefs = React.useRef({});
  const [pillRect, setPillRect] = React.useState(null);
  // Size-based tokens (maintains HeaderSegmentedToggle proportions)
  const sizeTokens = {
    small: {
      containerPadding: 'px-1 py-[2px]',  // Scaled down
      buttonPadding: 'px-2 py-[4px]',     // Scaled down
      textSize: 'text-[11px]',             // Scaled down
    },
    medium: {
      containerPadding: 'px-1 py-[3px]',  // HeaderSegmentedToggle EXACT
      buttonPadding: 'px-3 py-[6px]',      // HeaderSegmentedToggle EXACT
      textSize: 'text-[13px]',             // HeaderSegmentedToggle EXACT
    },
    large: {
      containerPadding: 'px-1.5 py-[4px]', // Scaled up
      buttonPadding: 'px-4 py-2',           // Scaled up
      textSize: 'text-base',                 // Scaled up
    }
  };

  const tokens = sizeTokens[size];
  
  // Base classes - HeaderSegmentedToggle tokens EXACTLY
  const btnBase = fullWidth 
    ? "rounded-lg transition font-semibold flex-1" 
    : "rounded-lg transition font-semibold";
  const containerClass = fullWidth ? "flex rounded-xl w-full" : "inline-flex rounded-xl";
  
  // Variant-based colors (structure stays the same)
  const containerStyle = variant === 'header' 
    ? { background: 'rgba(255,255,255,0.2)' }  // HeaderSegmentedToggle EXACT
    : { backgroundColor: 'var(--tt-subtle-surface)' };
  
  // Header variant: use Tailwind classes (unchanged)
  const btnOnHeader = "bg-white text-gray-900 shadow-sm";
  const btnOffHeader = "bg-transparent text-white/80";
  
  // Body variant: use inline styles with CSS that adapts to light/dark mode
  // Light mode: white background (#ffffff)
  // Dark mode: transparent grey (rgba(255,255,255,0.12)) to match other elements
  // We use a combination: white in light mode, transparent white overlay in dark mode
  // Since CSS variables don't support conditional logic, we'll use inline style detection
  const getBodyBtnOnStyle = () => {
    if (variant !== 'body') return undefined;
    
    // Check for dark mode
    const isDark = typeof document !== 'undefined' && 
                   document.documentElement.classList.contains('dark');
    
    return {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#ffffff',
      color: 'var(--tt-text-primary)',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    };
  };
  
  const btnOnStyle = getBodyBtnOnStyle();
    
  const btnOffStyle = variant === 'body'
    ? {
        color: 'var(--tt-text-secondary)'
      }
    : undefined;
  
  // Class names for body variant (no background classes, handled by inline styles)
  const btnOn = variant === 'header'
    ? btnOnHeader
    : "shadow-sm"; // Only shadow class, background via inline style
    
  const btnOff = variant === 'header'
    ? btnOffHeader
    : "bg-transparent"; // Transparent background, text color via inline style

  const getPillStyle = () => {
    if (variant === 'header') {
      return { backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' };
    }
    const base = getBodyBtnOnStyle() || {};
    const { color, ...rest } = base;
    return rest;
  };

  const updatePillRect = React.useCallback(() => {
    if (!__ttMotion) return;
    const containerEl = containerRef.current;
    const activeEl = buttonRefs.current[value];
    if (!containerEl || !activeEl) return;
    const containerBox = containerEl.getBoundingClientRect();
    const activeBox = activeEl.getBoundingClientRect();
    setPillRect({
      x: activeBox.left - containerBox.left,
      y: activeBox.top - containerBox.top,
      width: activeBox.width,
      height: activeBox.height
    });
  }, [__ttMotion, value]);

  useIsomorphicLayoutEffect(() => {
    updatePillRect();
  }, [updatePillRect, options, size, fullWidth, variant]);

  React.useEffect(() => {
    if (!__ttMotion) return undefined;
    const handleResize = () => updatePillRect();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [__ttMotion, updatePillRect]);

  return React.createElement(
    'div',
    { 
      ref: containerRef,
      className: `${containerClass} ${tokens.containerPadding} relative`,
      style: containerStyle
    },
    __ttMotion && React.createElement(__ttMotion.div, {
      className: "absolute rounded-lg pointer-events-none",
      style: {
        top: pillRect ? `${pillRect.y}px` : '0px',
        left: 0,
        width: pillRect ? `${pillRect.width}px` : '0px',
        height: pillRect ? `${pillRect.height}px` : '0px',
        opacity: pillRect ? 1 : 0,
        ...getPillStyle()
      },
      animate: pillRect ? { x: pillRect.x, width: pillRect.width } : undefined,
      transition: { type: "spring", stiffness: 320, damping: 30 }
    }),
    (options || []).map((opt) => {
      const ButtonEl = __ttMotion ? __ttMotion.button : 'button';
      const isActive = value === opt.value;
      const activeStyle = (__ttMotion && isActive)
        ? (variant === 'body' ? { color: 'var(--tt-text-primary)' } : undefined)
        : btnOnStyle;
      return React.createElement(ButtonEl, {
        key: opt.value,
        type: 'button',
        onClick: () => onChange && onChange(opt.value),
        ref: (el) => {
          if (el) buttonRefs.current[opt.value] = el;
        },
        className: `${btnBase} ${tokens.textSize} ${tokens.buttonPadding} ${isActive ? btnOn : btnOff} ${__ttMotion ? 'relative overflow-hidden' : ''}`,
        style: isActive ? activeStyle : btnOffStyle,
        'aria-pressed': isActive
      },
        React.createElement('span', { className: __ttMotion ? "relative z-10" : undefined }, opt.label)
      );
    })
  );
};

// Expose to global namespace
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.SegmentedToggle = SegmentedToggle;
  
  // Temporary backward compatibility
  window.SegmentedToggle = SegmentedToggle;
}
