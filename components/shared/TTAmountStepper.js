// TTAmountStepper Component
// Large-number amount control with +/- and unit toggle

if (typeof window !== 'undefined' && !window.TT?.shared?.TTAmountStepper) {
  const __ttResolveFramer = () => {
    if (typeof window === 'undefined') return {};
    const candidates = [
      window.FramerMotion,
      window.framerMotion,
      window['framer-motion'],
      window.Motion,
      window.motion
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (candidate.motion || candidate.AnimatePresence) return candidate;
      if (candidate.default && (candidate.default.motion || candidate.default.AnimatePresence)) {
        return candidate.default;
      }
    }
    return {};
  };
  const __ttGetMotion = () => {
    const framer = __ttResolveFramer();
    const motion = framer.motion || null;
    return motion;
  };
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

    const Motion = __ttGetMotion();
    const MotionButton = Motion
      ? (Motion.button || (typeof Motion === 'function' ? Motion('button') : null))
      : null;
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
        { className: "flex items-center justify-between px-12 pb-9 pt-9" },
        React.createElement(MotionButton || 'button', {
          type: 'button',
          onClick: () => handleStep(-1),
          className: "w-[52px] h-[52px] flex items-center justify-center rounded-xl border transition-all",
          style: {
            backgroundColor: 'var(--tt-subtle-surface)',
            borderColor: 'var(--tt-card-border)',
            color: 'var(--tt-text-primary)',
            touchAction: 'manipulation'
          },
          'aria-label': 'Decrease amount',
          ...( MotionButton ? {
            whileTap: { scale: 0.86 },
            transition: { type: 'spring', stiffness: 650, damping: 24 }
          } : {})
        }, React.createElement(
          'svg',
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: "24",
            height: "24",
            viewBox: "0 0 256 256",
            style: { display: 'block', fill: 'var(--tt-text-primary)' },
            'aria-hidden': 'true'
          },
          React.createElement('path', {
            d: "M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"
          })
        )),
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
        React.createElement(MotionButton || 'button', {
          type: 'button',
          onClick: () => handleStep(1),
          className: "w-[52px] h-[52px] flex items-center justify-center rounded-xl border transition-all",
          style: {
            backgroundColor: 'var(--tt-subtle-surface)',
            borderColor: 'var(--tt-card-border)',
            color: 'var(--tt-text-primary)',
            touchAction: 'manipulation'
          },
          'aria-label': 'Increase amount',
          ...( MotionButton ? {
            whileTap: { scale: 0.86 },
            transition: { type: 'spring', stiffness: 650, damping: 24 }
          } : {})
        }, React.createElement(
          'svg',
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: "24",
            height: "24",
            viewBox: "0 0 256 256",
            style: { display: 'block', fill: 'var(--tt-text-primary)' },
            'aria-hidden': 'true'
          },
          React.createElement('path', {
            d: "M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
          })
        ))
      )
    );
  };

  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTAmountStepper = TTAmountStepper;
  window.TTAmountStepper = TTAmountStepper;
}
