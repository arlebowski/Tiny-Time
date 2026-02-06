const TTInputRow = ({
  label,
  value,
  onChange,
  icon,
  showIcon = true,
  showChevron = false,
  chevronDirection = 'right',
  enableTapAnimation = true,
  showLabel = true,
  renderValue = null,
  size = 'default',
  type = 'text',
  placeholder = '',
  rawValue,
  invalid = false,
  pickerMode = null,
  onOpenPicker = null,
  formatDateTime = null,
  useWheelPickers = null,
  openAnchoredTimePicker = null,
  onBlur = null,
  onFocus = null,
  onKeyDown = null,
  valueClassName = '',
  suffix = null,
  suffixClassName = '',
  inlineSuffix = false
}) => {
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('tt-tap-anim')) return;
    const style = document.createElement('style');
    style.id = 'tt-tap-anim';
    style.textContent = `
      .tt-tapable {
        position: relative;
        overflow: hidden;
      }
      .tt-tapable::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--tt-tapable-bg);
        opacity: 0;
        transition: opacity 0.1s ease-out;
        pointer-events: none;
        border-radius: inherit;
        z-index: 1;
      }
      .tt-tapable:active::before {
        opacity: 1;
      }
      .dark .tt-tapable::before {
        background: var(--tt-tapable-bg);
      }
    `;
    document.head.appendChild(style);
  }, []);
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

  const defaultIcon =
    (typeof window !== 'undefined' && window.PenIcon) ||
    (typeof window !== 'undefined' && window.TT?.shared?.icons?.Edit2) ||
    (typeof window !== 'undefined' && window.Edit2) ||
    null;
  const chevronRight =
    (typeof window !== 'undefined' && (window.TT?.shared?.icons?.ChevronRightIcon || window.ChevronRightIcon)) ||
    null;
  const chevronDown =
    (typeof window !== 'undefined' && (window.TT?.shared?.icons?.ChevronDownIcon || window.ChevronDownIcon)) ||
    null;
  const resolvedIcon = icon === undefined ? defaultIcon : icon;
  const iconElement = React.isValidElement(resolvedIcon)
    ? resolvedIcon
    : (resolvedIcon ? React.createElement(resolvedIcon, {
        className: "w-4 h-4",
        style: { color: 'var(--tt-text-secondary)' }
      }) : null);

  const chevronIcon = chevronDirection === 'down' ? chevronDown : chevronRight;

  const isCompact = size === 'compact';
  const paddingClass = isCompact ? 'p-3' : 'p-4';
  const labelClass = isCompact ? 'text-[11px] mb-0.5' : 'text-xs mb-1';
  const valueClass = isCompact ? 'text-[15px]' : 'text-base';
  const valueClassCombined = valueClassName
    ? `${valueClass} ${valueClassName}`
    : valueClass;
  const suffixClassCombined = suffixClassName
    ? suffixClassName
    : (inlineSuffix ? `${valueClassCombined} font-normal text-[var(--tt-text-primary)]` : 'text-xs text-[var(--tt-text-secondary)]');
  const showInlineSuffix = !!(suffix && inlineSuffix);
  const showTrailingSuffix = !!(suffix && !inlineSuffix);
  const inlineValue = displayValue || '';
  const inlineWidthCh = Math.max(String(inlineValue || placeholder || '').length, 1);

  return React.createElement(
    'div',
    {
      className: `rounded-2xl mb-2 transition-all duration-200${enableTapAnimation ? ' tt-tapable' : ''}`,
      style: {
        backgroundColor: 'var(--tt-input-bg)',
        position: 'relative',
        overflow: 'hidden'
      }
    },
    React.createElement(
      'div',
      {
        className: `flex items-center justify-between cursor-pointer ${paddingClass}`,
        onClick: handleRowClick
      },
      React.createElement('div', { className: "flex-1" },
        showLabel && React.createElement('div', {
          className: labelClass,
          style: { color: 'var(--tt-text-secondary)' }
        }, React.createElement('span', {}, label)),
        (typeof renderValue === 'function')
          ? React.createElement(
              'div',
              {
                className: (suffix || showInlineSuffix) ? "inline-flex items-baseline gap-1 w-full" : `${valueClassCombined} font-normal w-full`,
                style: {
                  color: invalid
                    ? 'var(--tt-error)'
                    : (type === 'datetime' && !rawValue && placeholder ? 'var(--tt-text-tertiary)' : 'var(--tt-text-primary)')
                }
              },
              React.createElement('span', { className: `${valueClassCombined} font-normal` }, renderValue(displayValue, { rawValue, placeholder })),
              showInlineSuffix && React.createElement('span', { className: suffixClassCombined, style: { marginLeft: 2 } }, suffix)
            )
          : (type === 'text'
              ? React.createElement(
                  'div',
                  { className: suffix ? "flex items-center gap-1 w-full" : undefined },
                  React.createElement('textarea', {
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
                    onBlur,
                    onFocus,
                    onKeyDown,
                    placeholder: placeholder,
                    rows: 1,
                    className: `tt-placeholder-tertiary ${valueClassCombined} font-normal outline-none resize-none ${suffix ? 'flex-1' : 'w-full'}`,
                    style: {
                      background: 'transparent',
                      maxHeight: '4.5rem',
                      overflowY: 'auto',
                      color: invalid ? 'var(--tt-error)' : 'var(--tt-text-primary)'
                    }
                  }),
                  suffix && React.createElement('span', { className: suffixClassCombined }, suffix)
                )
              : React.createElement(
                  'div',
                  {
                    className: (suffix || showInlineSuffix) ? "inline-flex items-baseline w-full" : undefined,
                    style: { minWidth: 0 }
                  },
                  React.createElement('input', {
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
                    onBlur,
                    onFocus,
                    onKeyDown,
                    className: `tt-placeholder-tertiary ${valueClassCombined} font-normal outline-none ${(suffix && !showInlineSuffix) ? 'flex-1' : 'w-full'}`,
                    style: {
                      background: 'transparent',
                      width: showInlineSuffix ? `${inlineWidthCh}ch` : undefined,
                      minWidth: showInlineSuffix ? '2ch' : undefined,
                      minWidth: 0,
                      color: invalid
                        ? 'var(--tt-error)'
                        : (type === 'datetime' && !rawValue && placeholder ? 'var(--tt-text-tertiary)' : 'var(--tt-text-primary)')
                    },
                    readOnly: (type === 'datetime') || (shouldUseWheelPickers() && pickerMode === 'amount')
                  }),
                  showInlineSuffix && React.createElement('span', { className: suffixClassCombined, style: { marginLeft: 2 } }, suffix)
                ))
      ),
      showTrailingSuffix && React.createElement('span', {
        className: suffixClassCombined
      }, suffix),
      showIcon && iconElement && React.createElement('button', {
        onClick: handleIconClick,
        className: "ml-4",
        style: { marginLeft: '17px' }
      }, iconElement),
      showChevron && chevronIcon && React.createElement(chevronIcon, {
        className: "w-4 h-4 ml-2",
        style: { color: 'var(--tt-text-secondary)' }
      })
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTInputRow = TTInputRow;
  window.TTInputRow = TTInputRow;
}
