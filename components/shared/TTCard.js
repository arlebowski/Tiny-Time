const TTCard = ({ variant = "default", className = "", onClick, children }) => {
  const baseClasses = "rounded-2xl";
  
  const variantClasses = {
    default: "shadow-sm p-6",
    inset: "shadow-sm overflow-hidden flex flex-col", // No padding for chart-like content
    pressable: "shadow-sm p-6 cursor-pointer transition-shadow transition-colors hover:shadow-xl hover:bg-black/5 active:shadow-lg"
  };
  
  const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
  
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
      backgroundColor: "var(--tt-card-bg)",
      borderColor: "var(--tt-card-border)"
    },
    ...(onClick && {
      onClick: onClick,
      onKeyDown: handleKeyDown,
      role: 'button',
      tabIndex: 0
    })
  };
  
  return React.createElement('div', props, children);
};

// Expose to global namespace (backward compat + new namespace)
window.TT = window.TT || {};
window.TT.shared = window.TT.shared || {};
window.TT.shared.TTCard = TTCard;

// Temporary backward compatibility (will remove later)
window.TTCard = TTCard;

