// ScheduleTab Component
// Displays schedule and routine management for v4

const cn = (...classes) => classes.filter(Boolean).join(' ');

const __ttDateFns = (typeof window !== 'undefined' && window.dateFns) || {};
const format = __ttDateFns.format || ((date, fmt) => {
  if (fmt === "MMMM yyyy") {
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  if (fmt === "EEE") {
    return date.toLocaleString('en-US', { weekday: 'short' });
  }
  if (fmt === "d") {
    return String(date.getDate());
  }
  return date.toLocaleDateString();
});
const isSameDay = __ttDateFns.isSameDay || ((a, b) => {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
});
const subDays = __ttDateFns.subDays || ((date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
});
const startOfDay = __ttDateFns.startOfDay || ((date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
});

const __ttDateKeyLocal = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const __ttNormalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
  let sMs = Number(startMs);
  let eMs = Number(endMs);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
  if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
  if (eMs < sMs) sMs -= 86400000;
  if (eMs < sMs) return null;
  return { startMs: sMs, endMs: eMs };
};

const __ttOverlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
  const a = Math.max(rangeStartMs, winStartMs);
  const b = Math.min(rangeEndMs, winEndMs);
  return Math.max(0, b - a);
};

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
const __ttFramer = __ttResolveFramer();
const motion = __ttFramer.motion || new Proxy({}, {
  get: () => (props) => React.createElement('div', props)
});
const AnimatePresence = __ttFramer.AnimatePresence || (({ children }) => children);

const __ttChevronLeft = (props) => (
  React.createElement('svg', {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props
  },
    React.createElement('polyline', { points: "15 18 9 12 15 6" })
  )
);

const __ttChevronRight = (props) => (
  React.createElement('svg', {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props
  },
    React.createElement('polyline', { points: "9 18 15 12 9 6" })
  )
);

const __ttChevronLeftIcon =
  (typeof window !== 'undefined' && (window.TT?.shared?.icons?.ChevronLeftIcon || window.ChevronLeftIcon)) ||
  __ttChevronLeft;
const __ttChevronRightIcon =
  (typeof window !== 'undefined' && (window.TT?.shared?.icons?.ChevronRightIcon || window.ChevronRightIcon)) ||
  __ttChevronRight;

const HorizontalCalendar = ({ initialDate = new Date(), onDateSelect }) => {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [weeksOffset, setWeeksOffset] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [allFeedings, setAllFeedings] = React.useState([]);
  const [allSleepSessions, setAllSleepSessions] = React.useState([]);

  const days = React.useMemo(() => {
    const endDate = subDays(today, weeksOffset * 7);
    return Array.from({ length: 7 }, (_, i) => subDays(endDate, 6 - i));
  }, [today, weeksOffset]);
  const monthKey = React.useMemo(
    () => format(days[6], "MMMM yyyy"),
    [days]
  );

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        if (typeof firestoreStorage === 'undefined') return;
        const [feedings, sleeps] = await Promise.all([
          firestoreStorage.getAllFeedings(),
          firestoreStorage.getAllSleepSessions()
        ]);
        if (!isActive) return;
        setAllFeedings(feedings || []);
        setAllSleepSessions(sleeps || []);
      } catch (e) {
        console.error('[ScheduleTab] Failed loading data', e);
      }
    };
    load();
    return () => { isActive = false; };
  }, []);

  const dayMetrics = React.useMemo(() => {
    const metrics = {};
    const dayWindows = days.map((d) => {
      const start = startOfDay(d);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return {
        date: d,
        key: __ttDateKeyLocal(d),
        startMs: start.getTime(),
        endMs: end.getTime() + 1
      };
    });

    dayWindows.forEach(({ key }) => {
      metrics[key] = { feedOz: 0, sleepMs: 0 };
    });

    const getOz = (f) => {
      const oz = Number(f?.ounces ?? f?.amountOz ?? f?.amount ?? f?.volumeOz ?? f?.volume);
      return Number.isFinite(oz) && oz > 0 ? oz : 0;
    };

    (allFeedings || []).forEach((f) => {
      if (!f || !Number.isFinite(Number(f.timestamp))) return;
      const ts = Number(f.timestamp);
      const key = __ttDateKeyLocal(ts);
      if (!metrics[key]) return;
      metrics[key].feedOz += getOz(f);
    });

    const normSleeps = (allSleepSessions || [])
      .map((s) => {
        const end = s?.endTime ? Number(s.endTime) : Date.now();
        const norm = __ttNormalizeSleepInterval(s?.startTime, end);
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      })
      .filter(Boolean);

    dayWindows.forEach(({ key, startMs, endMs }) => {
      const total = normSleeps.reduce(
        (sum, s) => sum + __ttOverlapMs(s._normStartTime, s._normEndTime, startMs, endMs),
        0
      );
      metrics[key].sleepMs = total;
    });

    const feedMax = Math.max(1, ...Object.values(metrics).map(m => m.feedOz || 0));
    const sleepMax = Math.max(1, ...Object.values(metrics).map(m => m.sleepMs || 0));

    dayWindows.forEach(({ key }) => {
      metrics[key].feedPct = Math.min(100, (metrics[key].feedOz / feedMax) * 100);
      metrics[key].sleepPct = Math.min(100, (metrics[key].sleepMs / sleepMax) * 100);
    });

    return metrics;
  }, [days, allFeedings, allSleepSessions]);

  const paginate = (newDirection) => {
    if (newDirection === -1 && weeksOffset === 0) return;
    setDirection(newDirection);
    setWeeksOffset(prev => prev + newDirection);
  };

  const handleDragEnd = (event, info) => {
    const threshold = 30;
    if (info.offset.x > threshold) {
      paginate(1);
    } else if (info.offset.x < -threshold) {
      paginate(-1);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
    exit: (direction) => ({
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    }),
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
  };

  const progressVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    show: {
      scaleX: 1,
      opacity: 1,
      transition: {
        delay: 0.6,
        duration: 0.7,
        ease: [0.34, 1.56, 0.64, 1]
      }
    }
  };

  return (
    React.createElement('div', {
      className: "w-full text-white font-sans select-none overflow-visible"
    },
      React.createElement('header', { className: "mb-1 flex items-center justify-between pl-3 pr-4" },
        React.createElement(motion.h1, {
          key: monthKey,
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
          className: "text-base font-semibold",
          style: {
            color: 'var(--tt-text-primary)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
          }
        }, monthKey),
        React.createElement('div', { className: "flex gap-1" },
          React.createElement('button', {
            onClick: () => paginate(1),
            className: "p-2 rounded-xl transition-colors group active:bg-[var(--tt-selected-surface)]",
            'data-testid': "button-prev"
          },
            React.createElement(__ttChevronLeftIcon, {
              className: "w-5 h-5 transition-colors",
              style: { color: 'var(--tt-text-secondary)' }
            })
          ),
          React.createElement('button', {
            onClick: () => paginate(-1),
            disabled: weeksOffset === 0,
            className: cn(
              "p-2 rounded-xl transition-colors group active:bg-[var(--tt-selected-surface)]",
              weeksOffset === 0 && "opacity-0 pointer-events-none"
            ),
            'data-testid': "button-next"
          },
            React.createElement(__ttChevronRightIcon, {
              className: "w-5 h-5 transition-colors",
              style: { color: 'var(--tt-text-tertiary)' }
            })
          )
        )
      ),
      React.createElement('div', { className: "relative touch-none" },
        React.createElement(AnimatePresence, { mode: "wait", custom: direction },
          React.createElement(motion.div, {
            key: weeksOffset,
            custom: direction,
            variants: containerVariants,
            initial: "hidden",
            animate: "show",
            exit: "exit",
            drag: "x",
            dragConstraints: { left: 0, right: 0 },
            dragElastic: 0.4,
            onDragEnd: handleDragEnd,
            className: "flex justify-between items-center gap-[2px] cursor-grab active:cursor-grabbing"
          },
            days.map((date, index) => {
              const isSelected = isSameDay(date, selectedDate);
              const key = __ttDateKeyLocal(date);
              const metrics = dayMetrics[key] || { feedPct: 0, sleepPct: 0 };

              return (
                React.createElement(motion.button, {
                  key: date.toISOString(),
                  variants: itemVariants,
                  layout: true,
                  onClick: () => {
                    setSelectedDate(date);
                    if (onDateSelect) onDateSelect(date);
                  },
                  className: cn(
                    "relative flex flex-col items-center justify-center flex-1 h-[80px] transition-all duration-300 group focus:outline-none shrink-0",
                    isSelected ? "rounded-xl shadow-sm" : "rounded-2xl hover:bg-white/5"
                  ),
                  style: {
                    backgroundColor: isSelected ? 'var(--tt-selected-surface)' : undefined,
                    paddingLeft: isSelected ? '8px' : undefined,
                    paddingRight: isSelected ? '8px' : undefined
                  },
                  'data-testid': `date-item-${index}`
                },
                  React.createElement('span', {
                    className: cn(
                      "text-xs font-semibold mb-1",
                      isSelected ? "text-white" : "text-white/60"
                    )
                  }, format(date, "EEE")),
                  React.createElement('span', {
                    className: cn(
                      isSelected
                        ? "text-[17.6px] font-bold mb-4 leading-none text-white"
                        : "text-sm font-medium mb-4 leading-none text-white"
                    )
                  }, format(date, "d")),
                  React.createElement('div', { className: "absolute bottom-1 flex flex-col gap-1 w-full px-2" },
                    React.createElement('div', {
                      className: "h-1.5 w-full rounded-full overflow-hidden",
                      style: { backgroundColor: 'var(--tt-subtle-surface)' }
                    },
                      React.createElement(motion.div, {
                        variants: progressVariants,
                        className: "h-full rounded-full origin-left",
                        style: { width: `${metrics.feedPct}%`, backgroundColor: 'var(--tt-feed)' }
                      })
                    ),
                    React.createElement('div', {
                      className: "h-1.5 w-full rounded-full overflow-hidden",
                      style: { backgroundColor: 'var(--tt-subtle-surface)' }
                    },
                      React.createElement(motion.div, {
                        variants: progressVariants,
                        transition: { delay: 0.7 },
                        className: "h-full rounded-full origin-left",
                        style: { width: `${metrics.sleepPct}%`, backgroundColor: 'var(--tt-sleep)' }
                      })
                    )
                  )
                )
              );
            })
          )
        )
      ),
      null
    )
  );
};

const ScheduleTab = ({ user, kidId, familyId }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  return React.createElement('div', {
    className: "space-y-4 pb-24"
  },
    React.createElement(HorizontalCalendar, {
      onDateSelect: () => {}
    }),
    TTCard
      ? React.createElement(TTCard, {
          variant: "tracker",
          className: "min-h-[120px]"
        })
      : React.createElement('div', {
          className: "rounded-2xl shadow-sm min-h-[120px]",
          style: {
            backgroundColor: "var(--tt-card-bg)",
            borderColor: "var(--tt-card-border)"
          }
        })
  );
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.tabs = window.TT.tabs || {};
  window.TT.tabs.ScheduleTab = ScheduleTab;
}
