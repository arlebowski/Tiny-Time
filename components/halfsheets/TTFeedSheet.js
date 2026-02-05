// TTFeedSheet Component
// Consolidated entry point for feed input + feed detail variants

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTFeedSheet) {
  const TTFeedSheet = ({
    variant = 'input', // 'input' | 'detail'
    isOpen,
    onClose,
    kidId,
    onAdd,
    entry = null,
    onSave = null,
    onDelete = null
  }) => {
    if (variant === 'detail') {
      const Detail = window.TTFeedDetailSheet;
      if (!Detail) {
        console.warn('[TTFeedSheet] TTFeedDetailSheet not available');
        return null;
      }
      return React.createElement(Detail, {
        isOpen,
        onClose,
        entry,
        onSave,
        onDelete
      });
    }

    const Input = window.TTInputHalfSheet;
    if (!Input) {
      console.warn('[TTFeedSheet] TTInputHalfSheet not available');
      return null;
    }
    return React.createElement(Input, {
      isOpen,
      onClose,
      kidId,
      initialMode: 'feeding',
      onAdd
    });
  };

  // Expose component globally
  window.TTFeedSheet = TTFeedSheet;
}
