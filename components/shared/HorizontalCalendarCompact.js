// HorizontalCalendar Component
// Shared weekly calendar with feed/sleep bars (compact fork)
// Wrapped to avoid global collisions.
(function () {

const __ttHorizontalCn = (...classes) => classes.filter(Boolean).join(' ');

const __ttHorizontalDateFns = (typeof window !== 'undefined' && window.dateFns) || {};
const __ttHorizontalFormat = __ttHorizontalDateFns.format || ((date, fmt) => {
  if (fmt === "MMMM yyyy") {
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  if (fmt === "EEEE, MMM d") {
    return date.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  if (fmt === "EEE") {
    return date.toLocaleString('en-US', { weekday: 'short' });
  }
  if (fmt === "d") {
    return String(date.getDate());
  }
  return date.toLocaleDateString();
});
const __ttHorizontalIsSameDay = __ttHorizontalDateFns.isSameDay || ((a, b) => {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
});
const __ttHorizontalSubDays = __ttHorizontalDateFns.subDays || ((date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
});
const __ttHorizontalStartOfDay = __ttHorizontalDateFns.startOfDay || ((date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
});

const __ttHorizontalDateKeyLocal = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const __ttHorizontalNormalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
  let sMs = Number(startMs);
  let eMs = Number(endMs);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
  if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
  if (eMs < sMs) sMs -= 86400000;
  if (eMs < sMs) return null;
  return { startMs: sMs, endMs: eMs };
};

const __ttHorizontalOverlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
  const a = Math.max(rangeStartMs, winStartMs);
  const b = Math.min(rangeEndMs, winEndMs);
  return Math.max(0, b - a);
};

const __ttHorizontalResolveFramer = () => {
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
const __ttHorizontalFramer = __ttHorizontalResolveFramer();
const __ttHorizontalMotion = __ttHorizontalFramer.motion || new Proxy({}, {
  get: () => (props) => React.createElement('div', props)
});
const __ttHorizontalAnimatePresence = __ttHorizontalFramer.AnimatePresence || (({ children }) => children);

const __ttHorizontalChevronLeft = (props) => (
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

const __ttHorizontalChevronRight = (props) => (
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

const __ttHorizontalChevronLeftIcon =
  (typeof window !== 'undefined' && (window.TT?.shared?.icons?.ChevronLeftIcon || window.ChevronLeftIcon)) ||
  __ttHorizontalChevronLeft;
const __ttHorizontalChevronRightIcon =
  (typeof window !== 'undefined' && (window.TT?.shared?.icons?.ChevronRightIcon || window.ChevronRightIcon)) ||
  __ttHorizontalChevronRight;

const HorizontalCalendar = ({
  initialDate = new Date(),
  onDateSelect,
  headerLeft = null,
  headerVariant = 'default',
  hideBody = false,
  hideNav = false,
  headerPhotoUrl = null,
  headerPhotoAlt = 'Baby'
}) => {
  const today = React.useMemo(() => __ttHorizontalStartOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = React.useState(() => __ttHorizontalStartOfDay(initialDate || new Date()));
  const [weeksOffset, setWeeksOffset] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [allFeedings, setAllFeedings] = React.useState([]);
  const [allSleepSessions, setAllSleepSessions] = React.useState([]);
  const [babyWeight, setBabyWeight] = React.useState(null);
  const [multiplier, setMultiplier] = React.useState(2.5);
  const [sleepSettings, setSleepSettings] = React.useState(null);
  const layoutIdRef = React.useRef(`calendar-pill-${Math.random().toString(36).slice(2)}`);
  const [now, setNow] = React.useState(() => new Date());

  // Track the initial date from props to detect intentional external changes
  const initialDateRef = React.useRef(initialDate);

  // Sync selectedDate and weeksOffset with initialDate prop changes
  // Only sync if initialDate was explicitly changed from outside (not just re-renders with default value)
  React.useEffect(() => {
    // Skip if initialDate hasn't meaningfully changed (same day as what we already tracked)
    if (!initialDate) return;

    const normalizedInitial = __ttHorizontalStartOfDay(initialDate);
    const normalizedRef = initialDateRef.current ? __ttHorizontalStartOfDay(initialDateRef.current) : null;

    // Only sync if the initial date actually changed to a different day from what was tracked
    if (normalizedRef && __ttHorizontalIsSameDay(normalizedInitial, normalizedRef)) {
      return; // Same day, no sync needed
    }

    // Update our ref to track this new initial date
    initialDateRef.current = initialDate;

    // Only sync if different from current selection
    if (!__ttHorizontalIsSameDay(selectedDate, normalizedInitial)) {
      setSelectedDate(normalizedInitial);

      // Calculate the week offset to show the correct week
      const daysDiff = Math.floor((today.getTime() - normalizedInitial.getTime()) / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor(daysDiff / 7);
      if (weeksDiff !== weeksOffset && weeksDiff >= 0) {
        setWeeksOffset(weeksDiff);
      }
    }
  }, [initialDate]);

  const days = React.useMemo(() => {
    const endDate = __ttHorizontalSubDays(today, weeksOffset * 7);
    return Array.from({ length: 7 }, (_, i) => __ttHorizontalSubDays(endDate, 6 - i));
  }, [today, weeksOffset]);
  const monthKey = React.useMemo(
    () => __ttHorizontalFormat(days[6], "MMMM yyyy"),
    [days]
  );
  const isV4Header = headerVariant === 'v4';
  const dateLabel = React.useMemo(
    () => __ttHorizontalFormat(selectedDate, "EEEE, MMM d"),
    [selectedDate]
  );

  const greeting = React.useMemo(() => {
    const hours = now.getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  React.useEffect(() => {
    if (!isV4Header) return undefined;
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, [isV4Header]);

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        if (typeof firestoreStorage === 'undefined') return;
        const [feedings, sleeps, settings, sleepSettings] = await Promise.all([
          firestoreStorage.getAllFeedings(),
          firestoreStorage.getAllSleepSessions(),
          firestoreStorage.getSettings(),
          firestoreStorage.getSleepSettings()
        ]);
        if (!isActive) return;
        setAllFeedings(feedings || []);
        setAllSleepSessions(sleeps || []);
        if (settings) {
          if (settings.babyWeight) setBabyWeight(settings.babyWeight);
          if (settings.multiplier) setMultiplier(settings.multiplier);
        }
        setSleepSettings(sleepSettings || null);
      } catch (e) {
        console.error('[HorizontalCalendar] Failed loading data', e);
      }
    };
    const handleInputAdded = () => {
      load();
    };
    load();
    if (typeof window !== 'undefined') {
      window.addEventListener('tt-input-sheet-added', handleInputAdded);
    }
    return () => {
      isActive = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('tt-input-sheet-added', handleInputAdded);
      }
    };
  }, []);

  const dayMetrics = React.useMemo(() => {
    const metrics = {};
    const dayWindows = days.map((d) => {
      const start = __ttHorizontalStartOfDay(d);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return {
        date: d,
        key: __ttHorizontalDateKeyLocal(d),
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
      const key = __ttHorizontalDateKeyLocal(ts);
      if (!metrics[key]) return;
      metrics[key].feedOz += getOz(f);
    });

    const normSleeps = (allSleepSessions || [])
      .map((s) => {
        const end = s?.endTime ? Number(s.endTime) : Date.now();
        const norm = __ttHorizontalNormalizeSleepInterval(s?.startTime, end);
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      })
      .filter(Boolean);

    dayWindows.forEach(({ key, startMs, endMs }) => {
      const total = normSleeps.reduce(
        (sum, s) => sum + __ttHorizontalOverlapMs(s._normStartTime, s._normEndTime, startMs, endMs),
        0
      );
      metrics[key].sleepMs = total;
    });

    const feedTarget = babyWeight ? babyWeight * multiplier : 0;
    const sleepTargetHours = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number")
      ? sleepSettings.sleepTargetHours
      : 14;
    const sleepTargetMs = sleepTargetHours * 3600000;

    dayWindows.forEach(({ key }) => {
      const feedBase = feedTarget > 0
        ? Math.min(100, (metrics[key].feedOz / feedTarget) * 100)
        : 0;
      const sleepBase = sleepTargetMs > 0
        ? Math.min(100, (metrics[key].sleepMs / sleepTargetMs) * 100)
        : 0;
      metrics[key].feedPct = (feedBase <= 0 && (metrics[key].feedOz || 0) <= 0) ? 2 : feedBase;
      metrics[key].sleepPct = (sleepBase <= 0 && (metrics[key].sleepMs || 0) <= 0) ? 2 : sleepBase;
    });

    return metrics;
  }, [days, allFeedings, allSleepSessions, babyWeight, multiplier, sleepSettings]);

  const getMetricsForDate = (date) => {
    const key = __ttHorizontalDateKeyLocal(date);
    const metrics = dayMetrics[key] || { feedOz: 0, sleepMs: 0, feedPct: 0, sleepPct: 0 };
    return { date, ...metrics };
  };

  React.useEffect(() => {
    if (typeof onDateSelect !== 'function') return;
    onDateSelect(getMetricsForDate(selectedDate));
  }, [selectedDate, dayMetrics]);

  const paginate = (newDirection) => {
    if (newDirection === -1 && weeksOffset === 0) return;
    setDirection(newDirection);
    setWeeksOffset(prev => prev + newDirection);
  };

  React.useEffect(() => {
    if (days.length > 0) {
      setSelectedDate(days[6]); // Auto-select rightmost date
    }
  }, [weeksOffset]);

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
      rotateX: -15,
      transition: { duration: 0.2 },
    }),
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20, rotateX: -45 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 600,
        damping: 25
      }
    }
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
      className: "w-full font-sans select-none overflow-visible",
      style: { color: 'var(--tt-text-primary)', perspective: '1000px' }
    },
      React.createElement('header', {
        className: "mb-1 pl-3 pr-4",
        style: headerLeft
          ? { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }
          : { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
      },
        headerLeft
          ? React.createElement('div', {
              style: { justifySelf: 'start', display: 'flex', justifyContent: 'center' }
            }, headerLeft)
          : null,
        isV4Header
          ? React.createElement(__ttHorizontalMotion.h1, {
              key: `${__ttHorizontalDateKeyLocal(selectedDate)}-${greeting}`,
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              className: "leading-tight flex items-start gap-4",
              style: {
                color: 'var(--tt-text-primary)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                justifySelf: headerLeft ? 'center' : undefined,
                textAlign: headerLeft ? 'center' : undefined
              }
            },
              // Avatar hidden for now; easy to restore.
              // React.createElement('div', {
              //   className: "w-[53px] h-[53px] rounded-full overflow-hidden flex-shrink-0",
              //   style: { backgroundColor: 'var(--tt-input-bg)' }
              // },
              //   headerPhotoUrl
              //     ? React.createElement('img', {
              //         src: headerPhotoUrl,
              //         alt: headerPhotoAlt,
              //         className: "w-full h-full object-cover"
              //       })
              //     : React.createElement('div', {
              //         className: "w-full h-full",
              //         style: { backgroundColor: 'var(--tt-feed-soft)' }
              //       })
              // ),
              React.createElement('div', null,
              React.createElement('div', {
                className: "text-[15.4px] font-normal",
                style: { color: 'var(--tt-text-secondary)' }
              }, dateLabel),
              React.createElement('div', {
                className: "text-[24px] font-semibold",
                style: { color: 'var(--tt-text-primary)', marginBottom: '16px' }
              }, greeting)
            )
            )
          : React.createElement(__ttHorizontalMotion.h1, {
              key: monthKey,
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              className: "text-base font-semibold",
              style: {
                color: 'var(--tt-text-primary)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                justifySelf: headerLeft ? 'center' : undefined,
                textAlign: headerLeft ? 'center' : undefined
              }
            }, monthKey),
        null
      ),
      !hideBody && React.createElement('div', { className: "relative touch-none" },
        React.createElement(__ttHorizontalAnimatePresence, { mode: "wait", custom: direction },
          React.createElement(__ttHorizontalMotion.div, {
            key: weeksOffset,
            custom: direction,
            variants: containerVariants,
            initial: "hidden",
            animate: "show",
            exit: "exit",
            style: { willChange: 'transform, opacity' },
            drag: "x",
            dragConstraints: { left: 0, right: 0 },
            dragElastic: 0.4,
            onDragEnd: handleDragEnd,
            className: "relative flex justify-between items-center gap-[2px] cursor-grab active:cursor-grabbing",
            onAnimationStart: undefined
          },
            days.map((date, index) => {
              const isSelected = __ttHorizontalIsSameDay(date, selectedDate);
              const key = __ttHorizontalDateKeyLocal(date);
              const metrics = dayMetrics[key] || { feedPct: 0, sleepPct: 0 };

              return (
                React.createElement(__ttHorizontalMotion.button, {
                  key: date.toISOString(),
                  variants: itemVariants,
                  layout: true,
                  animate: {
                    flex: isSelected ? 1 : 1,
                    scale: isSelected ? 1 : 1,
                    zIndex: isSelected ? 10 : 1
                  },
                  transition: {
                    type: "spring",
                    stiffness: 200,
                    damping: 50,
                    layout: { duration: 0.2 }
                  },
                  onClick: () => {
                    setSelectedDate(date);
                    if (onDateSelect) onDateSelect(getMetricsForDate(date));
                  },
                  className: __ttHorizontalCn(
                    "relative z-10 flex flex-col items-center justify-center flex-1 h-[64px] group focus:outline-none shrink-0",
                    isSelected ? "rounded-xl" : "rounded-2xl hover:bg-white/5"
                  ),
                  style: {
                    willChange: 'transform, opacity',
                    transformOrigin: 'center',
                    // No background fallback - pill handles all selection highlighting
                    paddingLeft: isSelected ? '8px' : undefined,
                    paddingRight: isSelected ? '8px' : undefined,
                    paddingTop: '6px',
                    paddingBottom: '6px'
                  },
                  'data-testid': `date-item-${index}`
                },
                  isSelected && React.createElement(__ttHorizontalMotion.div, {
                    layoutId: layoutIdRef.current,
                    className: "absolute inset-0 rounded-xl shadow-sm z-0",
                    style: { backgroundColor: 'var(--tt-selected-surface)' },
                    initial: false,
                    transition: { type: "spring", bounce: 0.1, duration: 0.2 }
                  }),
                  React.createElement('span', {
                    className: __ttHorizontalCn(
                      "text-xs font-semibold mb-1 block relative z-10"
                    ),
                    style: {
                      color: isSelected ? 'var(--tt-text-primary)' : 'var(--tt-text-tertiary)'
                    }
                  }, __ttHorizontalFormat(date, "EEE")),
                  React.createElement('span', {
                    className: __ttHorizontalCn(
                      isSelected
                        ? "text-[17.6px] font-bold mb-0 leading-none block relative z-10"
                        : "text-sm font-medium mb-0 leading-none block relative z-10"
                    ),
                    style: {
                      color: isSelected ? 'var(--tt-text-primary)' : 'var(--tt-text-secondary)'
                    }
                  }, __ttHorizontalFormat(date, "d")),
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

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.HorizontalCalendarCompact = HorizontalCalendar;
}
})();
