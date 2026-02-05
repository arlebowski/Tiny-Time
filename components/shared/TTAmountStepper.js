// TTAmountStepper Component
// Large-number amount control with +/- and unit toggle

if (typeof window !== 'undefined' && !window.TT?.shared?.TTAmountStepper) {
  const formatOz = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0';
    const fixed = Math.round(num * 100) / 100;
    return (fixed % 1 === 0) ? String(fixed) : String(fixed).replace(/0+$/,'').replace(/\.$/,'');
  };

  const TTAmountStepper = ({
    label = 'Amount',
    valueOz = 0,
    unit = 'oz',
    onChangeUnit = null,
    onChangeOz = null
  }) => {
    const SegmentedToggle =
      (window.TT && window.TT.shared && window.TT.shared.SegmentedToggle) ||
      window.SegmentedToggle ||
      null;

    const oz = Number(valueOz) || 0;
    const ml = oz * 29.5735;
    const displayValue = unit === 'ml'
      ? String(Math.max(0, Math.round(ml)))
      : formatOz(Math.max(0, oz));

    const step = unit === 'ml' ? 10 : 0.25;

    const handleStep = (delta) => {
      if (typeof onChangeOz !== 'function') return;
      if (unit === 'ml') {
        const nextMl = Math.max(0, ml + (delta * step));
        const nextOz = nextMl / 29.5735;
        onChangeOz(nextOz);
        return;
      }
      onChangeOz(Math.max(0, oz + (delta * step)));
    };

    return React.createElement(
      'div',
      {
        className: "rounded-2xl mb-2",
        style: {
          backgroundColor: 'var(--tt-input-bg)',
          position: 'relative',
          overflow: 'hidden'
        }
      },
      React.createElement(
        'div',
        { className: "flex items-center justify-between px-4 pt-3" },
        React.createElement('div', {
          className: "text-xs",
          style: { color: 'var(--tt-text-secondary)' }
        }, label),
        SegmentedToggle && React.createElement(SegmentedToggle, {
          value: unit,
          options: [
            { value: 'oz', label: 'oz' },
            { value: 'ml', label: 'ml' }
          ],
          onChange: (val) => {
            if (typeof onChangeUnit === 'function') {
              onChangeUnit(val);
            }
          },
          variant: 'body',
          size: 'medium',
          fullWidth: false
        })
      ),
      React.createElement(
        'div',
        { className: "flex items-center justify-between px-12 pb-8 pt-9" },
        React.createElement('button', {
          type: 'button',
          onClick: () => handleStep(-1),
          className: "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
          style: {
            backgroundColor: 'var(--tt-subtle-surface)',
            borderColor: 'var(--tt-card-border)',
            color: 'var(--tt-text-primary)'
          },
          'aria-label': 'Decrease amount'
        }, '–'),
        React.createElement('div', {
          className: "text-[40px] leading-none font-bold flex items-end justify-center",
          style: { color: 'var(--tt-text-primary)' }
        },
          React.createElement('span', null, displayValue),
          React.createElement('span', {
            className: "text-base font-light ml-2",
            style: { color: 'var(--tt-text-secondary)' }
          }, unit)
        ),
        React.createElement('button', {
          type: 'button',
          onClick: () => handleStep(1),
          className: "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
          style: {
            backgroundColor: 'var(--tt-subtle-surface)',
            borderColor: 'var(--tt-card-border)',
            color: 'var(--tt-text-primary)'
          },
          'aria-label': 'Increase amount'
        }, '+')
      )
    );
  };

  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTAmountStepper = TTAmountStepper;
  window.TTAmountStepper = TTAmountStepper;
}
