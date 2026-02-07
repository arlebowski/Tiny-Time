// ActivityVisibilitySheet Component
// Half sheet to show/hide activity types (per kid)

if (typeof window !== 'undefined' && !window.TT?.shared?.ActivityVisibilitySheet) {
  (function (global) {
    const React = global.React;
    const TTHalfSheet = global.TT?.shared?.TTHalfSheet || global.TTHalfSheet;

    if (!React || !TTHalfSheet) {
      console.error('ActivityVisibilitySheet requires React and TTHalfSheet');
      return;
    }

    const DEFAULT_VISIBILITY = {
      bottle: true,
      nursing: true,
      sleep: true,
      diaper: true
    };

    const normalizeVisibility = (input) => {
      const base = { ...DEFAULT_VISIBILITY };
      if (!input || typeof input !== 'object') return base;
      return {
        bottle: typeof input.bottle === 'boolean' ? input.bottle : base.bottle,
        nursing: typeof input.nursing === 'boolean' ? input.nursing : base.nursing,
        sleep: typeof input.sleep === 'boolean' ? input.sleep : base.sleep,
        diaper: typeof input.diaper === 'boolean' ? input.diaper : base.diaper
      };
    };

    const ActivityVisibilitySheet = ({
      isOpen,
      onClose,
      visibility,
      onChange
    }) => {
      const SegmentedToggle = global.TT?.shared?.SegmentedToggle || global.SegmentedToggle || null;
      const BottleIcon = global.TT?.shared?.icons?.BottleV2 || global.TT?.shared?.icons?.["bottle-v2"] || null;
      const NursingIcon = global.TT?.shared?.icons?.NursingIcon || null;
      const MoonIcon = global.TT?.shared?.icons?.MoonV2 || global.TT?.shared?.icons?.["moon-v2"] || null;
      const DiaperIcon = global.TT?.shared?.icons?.DiaperIcon || null;
      const [draft, setDraft] = React.useState(() => normalizeVisibility(visibility));

      React.useEffect(() => {
        if (!isOpen) return;
        setDraft(normalizeVisibility(visibility));
      }, [isOpen, visibility]);

      const enabledCount = Object.values(draft).filter(Boolean).length;

      const handleToggle = (key) => {
        if (!key) return;
        setDraft((prev) => {
          const next = { ...prev, [key]: !prev[key] };
          const nextEnabled = Object.values(next).filter(Boolean).length;
          return nextEnabled < 1 ? prev : next;
        });
      };
      const handleDone = () => {
        if (typeof onChange === 'function') {
          onChange(draft);
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      };

      const createIconLabel = (key) => {
        const isFeed = key === 'bottle';
        const isNursing = key === 'nursing';
        const isSleep = key === 'sleep';
        const Icon = isFeed ? BottleIcon : (isNursing ? NursingIcon : (isSleep ? MoonIcon : DiaperIcon));
        const color = isNursing ? 'var(--tt-nursing)' : (isFeed ? 'var(--tt-feed)' : (isSleep ? 'var(--tt-sleep)' : 'var(--tt-diaper)'));
        const label = isFeed ? 'Bottle' : (isNursing ? 'Nursing' : (isSleep ? 'Sleep' : 'Diaper'));
        return React.createElement(
          'div',
          {
            className: "text-[18px] font-semibold inline-flex items-center gap-[5px]",
            style: { color }
          },
          Icon ? React.createElement(Icon, {
            className: "w-[22px] h-[22px]",
            style: {
              color,
              strokeWidth: isFeed ? '1.5' : undefined,
              fill: isFeed ? 'none' : color,
              transform: isFeed ? 'rotate(20deg)' : undefined
            }
          }) : null,
          React.createElement('span', null, label)
        );
      };
      const ToggleRow = ({ labelKey, value, onToggle, disabled }) => {
        const toggleValue = value ? 'on' : 'off';
        return React.createElement(
          'div',
          {
            className: "w-full flex items-center justify-between rounded-2xl px-4 py-3",
            style: {
              backgroundColor: 'var(--tt-card-bg)',
              border: '1px solid var(--tt-card-border)',
              opacity: disabled ? 0.5 : 1
            }
          },
          createIconLabel(labelKey),
          SegmentedToggle
            ? React.createElement(SegmentedToggle, {
                value: toggleValue,
                options: [
                  { value: 'on', label: React.createElement('span', { style: { minWidth: 26, display: 'inline-flex', justifyContent: 'center' } }, 'On') },
                  { value: 'off', label: React.createElement('span', { style: { minWidth: 26, display: 'inline-flex', justifyContent: 'center' } }, 'Off') }
                ],
                size: 'medium',
                variant: 'body',
                fullWidth: false,
                onChange: (nextValue) => {
                  if (disabled && nextValue === 'off') return;
                  if ((nextValue === 'on') !== value) {
                    onToggle();
                  }
                }
              })
            : React.createElement('button', {
                type: 'button',
                onClick: () => {
                  if (disabled) return;
                  onToggle();
                },
                className: "text-xs font-semibold px-3 py-1 rounded-lg",
                style: {
                  backgroundColor: value ? 'var(--tt-primary-brand)' : 'var(--tt-subtle-surface)',
                  color: value ? 'var(--tt-text-on-accent)' : 'var(--tt-text-secondary)'
                }
              }, value ? 'On' : 'Off')
        );
      };

      const rows = [
        { key: 'bottle' },
        { key: 'nursing' },
        { key: 'sleep' },
        { key: 'diaper' }
      ];

      const ctaButton = React.createElement('button', {
        type: 'button',
        onClick: handleDone,
        className: "w-full text-white py-3 rounded-2xl font-semibold transition",
        style: {
          backgroundColor: 'var(--tt-text-tertiary)',
          touchAction: 'manipulation'
        }
      }, 'Done');

      return React.createElement(
        TTHalfSheet,
        {
          isOpen,
          onClose,
          title: 'Show & Hide Activities',
          accentColor: 'var(--tt-text-tertiary)'
        },
        React.createElement('div', { className: "space-y-3" },
          rows.map((row) => {
            const isLastEnabled = enabledCount === 1 && draft[row.key];
            return React.createElement(ToggleRow, {
              key: row.key,
              labelKey: row.key,
              value: draft[row.key],
              disabled: isLastEnabled,
              onToggle: () => handleToggle(row.key)
            });
          }),
          React.createElement('div', {
            className: "text-xs pt-1",
            style: { color: 'var(--tt-text-tertiary)' }
          }, 'At least one activity must stay on.'),
          React.createElement('div', {
            className: "px-6 pt-3 pb-1",
            style: {
              backgroundColor: 'var(--tt-halfsheet-bg)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 24px)'
            }
          }, ctaButton)
        )
      );
    };

    global.TT = global.TT || {};
    global.TT.shared = global.TT.shared || {};
    global.TT.shared.ActivityVisibilitySheet = ActivityVisibilitySheet;
    global.ActivityVisibilitySheet = ActivityVisibilitySheet;
  })(window);
}
