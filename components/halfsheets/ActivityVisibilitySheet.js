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
      solids: true,
      sleep: true,
      diaper: true
    };

    const normalizeVisibility = (input) => {
      const base = { ...DEFAULT_VISIBILITY };
      if (!input || typeof input !== 'object') return base;
      return {
        bottle: typeof input.bottle === 'boolean' ? input.bottle : base.bottle,
        nursing: typeof input.nursing === 'boolean' ? input.nursing : base.nursing,
        solids: typeof input.solids === 'boolean' ? input.solids : base.solids,
        sleep: typeof input.sleep === 'boolean' ? input.sleep : base.sleep,
        diaper: typeof input.diaper === 'boolean' ? input.diaper : base.diaper
      };
    };

    const __ttResolveFramer = () => {
      if (typeof global === 'undefined') return {};
      const candidates = [
        global.FramerMotion,
        global.framerMotion,
        global['framer-motion'],
        global.Motion,
        global.motion
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (candidate.Reorder || candidate.useDragControls) return candidate;
        if (candidate.default && (candidate.default.Reorder || candidate.default.useDragControls)) {
          return candidate.default;
        }
      }
      return {};
    };

    const framer = __ttResolveFramer();
    const Reorder = framer.Reorder || null;
    const useDragControls = framer.useDragControls || null;

    // ToggleRow defined outside ActivityVisibilitySheet to maintain stable reference
    const ToggleRow = ({ labelKey, value, onToggle, disabled, iconLabel, SegmentedToggle, onOffOptions, debug }) => {
      const toggleValue = value ? 'on' : 'off';
      const dragControls = useDragControls ? useDragControls() : null;
      const sheetRef = React.useRef(null);
      const findSheetContainer = (startEl) => {
        let el = startEl;
        while (el && el !== document.body) {
          try {
            const ta = window.getComputedStyle(el).touchAction;
            if (ta === 'pan-y') return el;
          } catch (e) {}
          el = el.parentElement;
        }
        return null;
      };
      const setSheetTouchAction = (value) => {
        const sheetEl = sheetRef.current;
        if (!sheetEl) return;
        if (value == null) {
          if (sheetEl.__ttPrevTouchAction != null) {
            sheetEl.style.touchAction = sheetEl.__ttPrevTouchAction;
            delete sheetEl.__ttPrevTouchAction;
          }
          return;
        }
        if (sheetEl.__ttPrevTouchAction == null) {
          sheetEl.__ttPrevTouchAction = sheetEl.style.touchAction;
        }
        sheetEl.style.touchAction = value;
      };
      const rowProps = {
        className: "w-full flex items-center justify-between rounded-2xl px-4 py-3",
        style: {
          backgroundColor: 'var(--tt-card-bg)',
          border: '1px solid var(--tt-card-border)',
          opacity: disabled ? 0.5 : 1
        },
        'data-activity-row': labelKey
      };
      const reorderProps = (Reorder && Reorder.Item) ? {
        value: labelKey,
        drag: 'y',
        dragListener: false,
        dragControls: dragControls || undefined,
        layout: true,
        dragSnapToOrigin: false,
        dragMomentum: false,
        whileDrag: {
          scale: 1.02,
          boxShadow: 'var(--tt-shadow-floating)',
          backgroundColor: 'var(--tt-card-bg)',
          zIndex: 2
        },
        dragTransition: { bounceStiffness: 600, bounceDamping: 35 },
        transition: { type: "spring", stiffness: 500, damping: 40 },
        onDragStart: () => setSheetTouchAction('none'),
        onDragEnd: () => setSheetTouchAction(null)
      } : {};
      return React.createElement(
        (Reorder && Reorder.Item) ? Reorder.Item : 'div',
        {
          as: 'div',
          ...rowProps,
          ...reorderProps
        },
        React.createElement(
          'div',
          {
            className: "flex items-center gap-3",
            style: { cursor: 'grab', touchAction: 'none' },
            onPointerDown: (e) => {
              if (debug) {
                console.log('[TT][ActivityReorder] drag start', { key: labelKey });
              }
              e.preventDefault();
              if (!sheetRef.current) {
                sheetRef.current = findSheetContainer(e.currentTarget);
              }
              setSheetTouchAction('none');
              if (dragControls && dragControls.start) {
                dragControls.start(e);
              }
            }
          },
          React.createElement('span', {
            className: "w-6 h-6 flex items-center justify-center",
            style: { color: 'var(--tt-text-tertiary)' },
            'aria-hidden': 'true'
          }, React.createElement(
            'svg',
            { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 256 256", fill: "currentColor" },
            React.createElement('path', { d: "M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" })
          )),
          iconLabel
        ),
        SegmentedToggle
          ? React.createElement(SegmentedToggle, {
              value: toggleValue,
              options: onOffOptions,
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

    const ActivityVisibilitySheet = ({
      isOpen,
      onClose,
      visibility,
      order,
      onChange
    }) => {
      const debug = typeof window !== 'undefined' && window.__ttActivityReorderDebug;
      const SegmentedToggle = global.TT?.shared?.SegmentedToggle || global.SegmentedToggle || null;
      const BottleIcon = global.TT?.shared?.icons?.BottleV2 || global.TT?.shared?.icons?.["bottle-v2"] || null;
      const NursingIcon = global.TT?.shared?.icons?.NursingIcon || null;
      const SolidsIcon = (props) => React.createElement(
        'svg',
        { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", strokeWidth: "1.5" },
        React.createElement('path', { d: "M3.76,22.751 C3.131,22.751 2.544,22.506 2.103,22.06 C1.655,21.614 1.41,21.015 1.418,20.376 C1.426,19.735 1.686,19.138 2.15,18.697 L11.633,9.792 C12.224,9.235 12.17,8.2 12.02,7.43 C11.83,6.456 11.908,4.988 13.366,3.53 C14.751,2.145 16.878,1.25 18.784,1.25 L18.789,1.25 C20.031,1.251 21.07,1.637 21.797,2.365 C22.527,3.094 22.914,4.138 22.915,5.382 C22.916,7.289 22.022,9.417 20.637,10.802 C19.487,11.952 18.138,12.416 16.734,12.144 C15.967,11.995 14.935,11.942 14.371,12.537 L5.473,22.011 C5.029,22.481 4.43,22.743 3.786,22.75 C3.777,22.75 3.768,22.75 3.759,22.75 L3.76,22.751 Z" })
      );
      const MoonIcon = global.TT?.shared?.icons?.MoonV2 || global.TT?.shared?.icons?.["moon-v2"] || null;
      const DiaperIcon = global.TT?.shared?.icons?.DiaperIcon || null;
      const defaultOrder = ['bottle', 'nursing', 'solids', 'sleep', 'diaper'];
      const normalizeOrder = (value) => {
        if (!Array.isArray(value)) return defaultOrder.slice();
        const next = [];
        value.forEach((item) => {
          if (defaultOrder.includes(item) && !next.includes(item)) next.push(item);
        });
        defaultOrder.forEach((item) => {
          if (!next.includes(item)) next.push(item);
        });
        return next;
      };
      const [draft, setDraft] = React.useState(() => normalizeVisibility(visibility));
      const [draftOrder, setDraftOrder] = React.useState(() => normalizeOrder(order));
      const listRef = React.useRef(null);
      const onOffOptions = React.useMemo(() => ([
        { value: 'on', label: React.createElement('span', { style: { minWidth: 26, display: 'inline-flex', justifyContent: 'center' } }, 'On') },
        { value: 'off', label: React.createElement('span', { style: { minWidth: 26, display: 'inline-flex', justifyContent: 'center' } }, 'Off') }
      ]), []);

      React.useEffect(() => {
        if (!isOpen) return;
        setDraft(normalizeVisibility(visibility));
        setDraftOrder(normalizeOrder(order));
      }, [isOpen, visibility, order]);

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
          onChange({ visibility: draft, order: draftOrder });
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      };

      const createIconLabel = (key) => {
        const isFeed = key === 'bottle';
        const isNursing = key === 'nursing';
        const isSolids = key === 'solids';
        const isSleep = key === 'sleep';
        const Icon = isFeed ? BottleIcon : (isNursing ? NursingIcon : (isSolids ? SolidsIcon : (isSleep ? MoonIcon : DiaperIcon)));
        const color = isNursing ? 'var(--tt-nursing)' : (isFeed ? 'var(--tt-feed)' : (isSolids ? 'var(--tt-solids)' : (isSleep ? 'var(--tt-sleep)' : 'var(--tt-diaper)')));
        const label = isFeed ? 'Bottle' : (isNursing ? 'Nursing' : (isSolids ? 'Solids' : (isSleep ? 'Sleep' : 'Diaper')));
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
        React.createElement('div', { className: (Reorder && Reorder.Group) ? "" : "space-y-3" },
          (Reorder && Reorder.Group)
            ? React.createElement(
                Reorder.Group,
                {
                  ref: listRef,
                  axis: 'y',
                  values: draftOrder,
                  onReorder: (nextOrder) => {
                    if (debug) {
                      console.log('[TT][ActivityReorder] onReorder', { nextOrder });
                    }
                    setDraftOrder(nextOrder);
                  },
                  layout: true,
                  layoutScroll: true,
                  as: 'div',
                  style: { display: 'flex', flexDirection: 'column', gap: 12 },
                  'data-activity-reorder': 'group'
                },
                draftOrder.map((key) => {
                  const isLastEnabled = enabledCount === 1 && draft[key];
                  return React.createElement(ToggleRow, {
                    key: key,
                    labelKey: key,
                    value: draft[key],
                    disabled: isLastEnabled,
                    onToggle: () => handleToggle(key),
                    iconLabel: createIconLabel(key),
                    SegmentedToggle,
                    onOffOptions,
                    debug
                  });
                })
              )
            : draftOrder.map((key) => {
                const isLastEnabled = enabledCount === 1 && draft[key];
                return React.createElement(ToggleRow, {
                  key: key,
                  labelKey: key,
                  value: draft[key],
                  disabled: isLastEnabled,
                  onToggle: () => handleToggle(key),
                  iconLabel: createIconLabel(key),
                  SegmentedToggle,
                  onOffOptions,
                  debug
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
