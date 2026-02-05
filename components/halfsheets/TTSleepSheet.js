// TTSleepSheet Component
// Consolidated entry point for sleep input + sleep detail variants

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTSleepSheet) {
  const TTSleepSheet = ({
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
      const Detail = window.TTSleepDetailSheet;
      if (!Detail) {
        console.warn('[TTSleepSheet] TTSleepDetailSheet not available');
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
      console.warn('[TTSleepSheet] TTInputHalfSheet not available');
      return null;
    }
    return React.createElement(Input, {
      isOpen,
      onClose,
      kidId,
      initialMode: 'sleep',
      onAdd
    });
  };

  // Expose component globally
  window.TTSleepSheet = TTSleepSheet;
}
