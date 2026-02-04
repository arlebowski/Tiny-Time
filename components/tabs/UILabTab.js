// ========================================
// UI LAB TAB (feature flags only)
// ========================================

const UILabTab = ({ onClose }) => {
  const wheelPickersOn =
    typeof window !== 'undefined' &&
    window.TT?.shared?.flags?.useWheelPickers?.get
      ? !!window.TT.shared.flags.useWheelPickers.get()
      : true;

  return React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
      React.createElement('button', {
        onClick: () => onClose && onClose(),
        className: 'p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition'
      }, React.createElement(ChevronLeft, { className: 'w-5 h-5' })),
      React.createElement('h1', { className: 'text-xl font-semibold text-gray-800' }, 'UI Lab')
    ),

    React.createElement('div', { className: 'mb-2 text-sm', style: { color: 'var(--tt-text-secondary)' } }, 'Feature Flags'),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('label', { className: 'tt-card-label' }, 'Wheel Pickers in Trays'),
      window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
        value: wheelPickersOn ? 'on' : 'off',
        options: [
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' }
        ],
        onChange: () => {}
      })
    )
  );
};

// Export
window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.UILabTab = UILabTab;
