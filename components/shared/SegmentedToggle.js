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

  return React.createElement(
    'div',
    { 
      className: `${containerClass} ${tokens.containerPadding}`,
      style: containerStyle
    },
    (options || []).map((opt) => {
      const ButtonEl = __ttMotion ? __ttMotion.button : 'button';
      return React.createElement(ButtonEl, {
        key: opt.value,
        type: 'button',
        onClick: () => onChange && onChange(opt.value),
        layout: __ttMotion ? true : undefined,
        className: `${btnBase} ${tokens.textSize} ${tokens.buttonPadding} ${value === opt.value ? btnOn : btnOff} ${__ttMotion ? 'relative overflow-hidden' : ''}`,
        style: value === opt.value ? btnOnStyle : btnOffStyle,
        'aria-pressed': value === opt.value
      },
        __ttMotion && value === opt.value
          ? React.createElement(__ttMotion.span, {
              layoutId: "tt-seg-toggle-pill",
              className: "absolute inset-0 rounded-lg",
              style: btnOnStyle,
              transition: { type: "spring", stiffness: 320, damping: 30 }
            })
          : null,
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
