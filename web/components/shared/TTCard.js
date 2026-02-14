const TTCard = ({
  variant = "default",
  className = "",
  onClick,
  children,
  as: Component = 'div',
  style = {},
  ...rest
}) => {
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('tt-card-label-styles')) return;
    const style = document.createElement('style');
    style.id = 'tt-card-label-styles';
    style.textContent = `
      .tt-card-label {
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.75rem;
        line-height: 1rem;
        font-weight: 400;
        color: var(--tt-text-secondary);
      }
    `;
    document.head.appendChild(style);
  }, []);

  const baseClasses = "rounded-2xl";
  
  const variantClasses = {
    default: "shadow-sm p-5 transition-all duration-300 ease-out",
    inset: "shadow-sm overflow-hidden flex flex-col", // No padding for chart-like content
    pressable: "shadow-sm p-6 cursor-pointer transition-shadow transition-colors hover:shadow-xl hover:bg-black/5 active:shadow-lg",
    tracker: "shadow-sm p-5 transition-all duration-300 ease-out"
  };
  
  const clickableClass = onClick ? "cursor-pointer" : "";
  const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${clickableClass} ${className}`.trim();
  const isTrackerStyle = variant === 'tracker' || variant === 'default';
  
  // Keyboard support for clickable cards
  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      if (e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
      }
      onClick(e);
    }
  };
  
  const props = {
    className: combinedClassName,
    style: {
      backgroundColor: isTrackerStyle ? "var(--tt-tracker-card-bg)" : "var(--tt-card-bg)",
      borderColor: "var(--tt-card-border)",
      ...style
    },
    ...rest,
    ...(onClick && {
      onClick: onClick,
      onKeyDown: handleKeyDown,
      role: 'button',
      tabIndex: 0
    })
  };
  
  return React.createElement(Component, props, children);
};

// Expose to global namespace (backward compat + new namespace)
window.TT = window.TT || {};
window.TT.shared = window.TT.shared || {};
window.TT.shared.TTCard = TTCard;

// Temporary backward compatibility (will remove later)
window.TTCard = TTCard;
