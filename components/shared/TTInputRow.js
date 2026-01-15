const TTInputRow = ({
  label,
  value,
  onChange,
  icon,
  type = 'text',
  placeholder = '',
  rawValue,
  invalid = false,
  pickerMode = null,
  onOpenPicker = null,
  formatDateTime = null,
  useWheelPickers = null,
  openAnchoredTimePicker = null
}) => {
  const formatValue = (v) => {
    if (typeof formatDateTime === 'function') return formatDateTime(v);
    if (!v) return '';
    try {
      return new Date(v).toLocaleString();
    } catch {
      return String(v);
    }
  };

  const displayValue = type === 'datetime'
    ? (rawValue ? formatValue(rawValue) : (placeholder || ''))
    : value;

  const inputRef = React.useRef(null);
  const timeAnchorRef = React.useRef(null);

  const shouldUseWheelPickers = () => {
    if (typeof useWheelPickers === 'function') return !!useWheelPickers();
    return !!useWheelPickers;
  };

  const openPicker = () => {
    if (type === 'datetime') {
      if (shouldUseWheelPickers() && typeof onOpenPicker === 'function' && pickerMode) {
        onOpenPicker(pickerMode);
        return;
      }
      if (typeof openAnchoredTimePicker === 'function') {
        openAnchoredTimePicker({
          anchorEl: timeAnchorRef.current,
          rawValue,
          onChange
        });
      }
      return;
    }

    if (inputRef.current) {
      if (shouldUseWheelPickers() && pickerMode === 'amount' && typeof onOpenPicker === 'function') {
        onOpenPicker('amount');
        return;
      }
      inputRef.current.focus();
    }
  };

  const handleRowClick = (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    openPicker();
  };

  const handleIconClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    openPicker();
  };

  return React.createElement(
    'div',
    {
      className: "rounded-2xl mb-2 transition-all duration-200",
      style: {
        backgroundColor: 'var(--tt-input-bg)',
        position: 'relative',
        overflow: 'hidden'
      }
    },
    React.createElement(
      'div',
      {
        className: "flex items-center justify-between p-4 cursor-pointer",
        onClick: handleRowClick
      },
      React.createElement('div', { className: "flex-1" },
        React.createElement('div', {
          className: "text-xs mb-1",
          style: { color: 'var(--tt-text-secondary)' }
        }, React.createElement('span', {}, label)),
        type === 'text'
          ? React.createElement('textarea', {
              ref: inputRef,
              value: displayValue || '',
              onChange: (e) => {
                if (onChange) {
                  onChange(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              },
              placeholder: placeholder,
              rows: 1,
              className: "tt-placeholder-tertiary text-base font-normal w-full outline-none resize-none",
              style: {
                background: 'transparent',
                maxHeight: '4.5rem',
                overflowY: 'auto',
                color: invalid ? '#ef4444' : 'var(--tt-text-primary)'
              }
            })
          : React.createElement('input', {
              ref: type === 'datetime' ? timeAnchorRef : inputRef,
              type: (type === 'datetime' || (shouldUseWheelPickers() && pickerMode === 'amount')) ? 'text' : type,
              inputMode: type === 'number' ? 'decimal' : undefined,
              step: type === 'number' ? '0.25' : undefined,
              value: displayValue || '',
              placeholder: placeholder,
              onChange: (e) => {
                if (type !== 'datetime' && onChange) {
                  if (type === 'number') {
                    const nextValue = e.target.value.replace(/[^0-9.]/g, '');
                    onChange(nextValue);
                  } else {
                    onChange(e.target.value);
                  }
                }
              },
              className: `tt-placeholder-tertiary text-base font-normal w-full outline-none ${invalid ? 'text-red-600' : ''}`,
              style: {
                background: 'transparent',
                color: invalid
                  ? '#ef4444'
                  : (type === 'datetime' && !rawValue && placeholder ? 'var(--tt-text-tertiary)' : 'var(--tt-text-primary)')
              },
              readOnly: (type === 'datetime') || (shouldUseWheelPickers() && pickerMode === 'amount')
            })
      ),
      icon && React.createElement('button', {
        onClick: handleIconClick,
        className: "ml-4",
        style: { marginLeft: '17px' }
      }, icon)
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTInputRow = TTInputRow;
  window.TTInputRow = TTInputRow;
}
