// ScheduleTab Component
// Displays schedule and routine management for v4

const ScheduleTab = ({ user, kidId, familyId }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const HorizontalCalendar = window.TT?.shared?.HorizontalCalendar;
  const [selectedSummary, setSelectedSummary] = React.useState({ feedOz: 0, sleepMs: 0 });
  const [selectedSummaryKey, setSelectedSummaryKey] = React.useState('initial');
  const __ttMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion)
    ? window.Motion.motion
    : null;
  const __ttAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence)
    ? window.Motion.AnimatePresence
    : null;

  const formatV2NumberSafe = (n) => {
    try {
      if (typeof formatV2Number === 'function') return formatV2Number(n);
    } catch (e) {}
    const x = Number(n);
    if (!Number.isFinite(x)) return '0';
    const rounded = Math.round(x);
    if (Math.abs(x - rounded) < 1e-9) return String(rounded);
    return x.toFixed(1);
  };

  const bottleIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["bottle-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Bottle2) ||
    null;
  const moonIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["moon-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Moon2) ||
    null;

  const renderSummaryCard = ({ icon, color, value, unit, rotateIcon }) => {
    const Card = TTCard || 'div';
    const cardProps = TTCard
      ? { variant: "tracker", className: "min-h-[56px] p-[14px]" }
      : {
          className: "rounded-2xl shadow-sm min-h-[60px] p-5",
          style: { backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-card-border)" }
        };

    return React.createElement(
      Card,
      cardProps,
      React.createElement('div', { className: "flex items-center justify-center" },
        __ttMotion && __ttAnimatePresence
          ? React.createElement(__ttAnimatePresence, { mode: "wait" },
              React.createElement(__ttMotion.div, {
                key: selectedSummaryKey,
                className: "flex items-baseline gap-2 min-w-0",
                initial: { opacity: 0, y: -10, scale: 0.95 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, y: 10, scale: 0.95 },
                transition: { type: "spring", stiffness: 400, damping: 30 }
              },
                icon
                  ? React.createElement(icon, {
                      style: {
                        color,
                        width: '1.5rem',
                        height: '1.5rem',
                        strokeWidth: rotateIcon ? '1.5' : undefined,
                        fill: rotateIcon ? 'none' : undefined,
                        transform: rotateIcon ? 'translateY(3px) rotate(20deg)' : 'translateY(3px)'
                      }
                    })
                  : React.createElement('div', {
                      style: {
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '1rem',
                        backgroundColor: 'var(--tt-input-bg)',
                        transform: 'translateY(3px)'
                      }
                    }),
                React.createElement('div', {
                  className: "text-[24px] font-bold leading-none whitespace-nowrap",
                  style: { color }
                }, value),
                React.createElement('div', {
                  className: "text-[17.6px] font-normal leading-none whitespace-nowrap",
                  style: { color: 'var(--tt-text-secondary)' }
                }, unit)
              )
            )
          : React.createElement('div', { 
              key: selectedSummaryKey,
              className: "flex items-baseline gap-2 min-w-0"
            },
              icon
                ? React.createElement(icon, {
                    style: {
                      color,
                      width: '1.5rem',
                      height: '1.5rem',
                      strokeWidth: rotateIcon ? '1.5' : undefined,
                      fill: rotateIcon ? 'none' : undefined,
                      transform: rotateIcon ? 'translateY(3px) rotate(20deg)' : 'translateY(3px)'
                    }
                  })
                : React.createElement('div', {
                    style: {
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '1rem',
                      backgroundColor: 'var(--tt-input-bg)',
                      transform: 'translateY(3px)'
                    }
                  }),
              React.createElement('div', {
                className: "text-[24px] font-bold leading-none whitespace-nowrap",
                style: { color }
              }, value),
              React.createElement('div', {
                className: "text-[17.6px] font-normal leading-none whitespace-nowrap",
                style: { color: 'var(--tt-text-secondary)' }
              }, unit)
            )
      )
    );
  };

  const feedDisplay = formatV2NumberSafe(selectedSummary.feedOz);
  const sleepHours = Number(selectedSummary.sleepMs || 0) / 3600000;
  const sleepDisplay = formatV2NumberSafe(sleepHours);

  return React.createElement('div', {
    className: "space-y-4 pb-24"
  },
    HorizontalCalendar
      ? React.createElement(HorizontalCalendar, {
          onDateSelect: (payload) => {
            if (!payload) return;
            setSelectedSummary({
              feedOz: payload.feedOz || 0,
              sleepMs: payload.sleepMs || 0
            });
            if (payload.date) {
              try {
                setSelectedSummaryKey(new Date(payload.date).toDateString());
              } catch (e) {
                setSelectedSummaryKey(String(Date.now()));
              }
            } else {
              setSelectedSummaryKey(String(Date.now()));
            }
          }
        })
      : null,
    React.createElement('div', { className: "grid grid-cols-2 gap-4 -mt-2" },
      renderSummaryCard({
        icon: bottleIcon,
        color: 'var(--tt-feed)',
        value: feedDisplay,
        unit: 'oz',
        rotateIcon: true
      }),
      renderSummaryCard({
        icon: moonIcon,
        color: 'var(--tt-sleep)',
        value: sleepDisplay,
        unit: 'hrs',
        rotateIcon: false
      })
    )
  );
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.tabs = window.TT.tabs || {};
  window.TT.tabs.ScheduleTab = ScheduleTab;
}
