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
    
  const btnOn = variant === 'header'
    ? "bg-white text-gray-900 shadow-sm"  // HeaderSegmentedToggle EXACT
    : "bg-white dark:bg-[rgba(255,255,255,0.12)] shadow-sm"; // Body: white in light mode, semi-transparent in dark mode
    
  const btnOff = variant === 'header'
    ? "bg-transparent text-white/80"  // HeaderSegmentedToggle EXACT
    : "bg-transparent text-gray-600 dark:text-[var(--tt-text-secondary)]"; // Body: gray-600 in light mode, CSS var in dark mode

  // Body variant: use CSS variable for text color (adapts to light/dark mode)
  const btnOnStyle = variant === 'body'
    ? { 
        color: 'var(--tt-text-primary)',
      }
    : undefined;
    
  const btnOffStyle = undefined;

  return React.createElement(
    'div',
    { 
      className: `${containerClass} ${tokens.containerPadding}`,
      style: containerStyle
    },
    (options || []).map((opt) =>
      React.createElement('button', {
        key: opt.value,
        type: 'button',
        onClick: () => onChange && onChange(opt.value),
        className: `${btnBase} ${tokens.textSize} ${tokens.buttonPadding} ${value === opt.value ? btnOn : btnOff}`,
        style: value === opt.value ? btnOnStyle : btnOffStyle,
        'aria-pressed': value === opt.value
      }, opt.label)
    )
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

