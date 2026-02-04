const SleepAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [sleepSessions, setSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('day');
  const sleepHistoryScrollRef = React.useRef(null);

  // Get icons (matching AnalyticsTab highlight cards)
  const sleepLabelIcon = (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"] || window.TT?.shared?.icons?.MoonMain || window.TT?.shared?.icons?.["moon-main"]) || null;
  const ChevronLeftIcon = window.TT?.shared?.icons?.ChevronLeftIcon || null;

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, kidId]);

  const loadAnalytics = async () => {
    if (!kidId) {
      setSleepSessions([]);
      setSleepSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sleeps = await firestoreStorage.getAllSleepSessions(kidId);
      setSleepSessions((sleeps || []).filter(s => !!s.endTime));
      const ss = await firestoreStorage.getSleepSettings();
      setSleepSettings(ss || null);
    } catch (e) {
      console.error('Failed to load sleep data', e);
    } finally {
      setLoading(false);
    }
  };

  const sleepByDay = useMemo(() => aggregateSleepByDay(sleepSessions, sleepSettings), [sleepSessions, sleepSettings]);

  // Build date buckets depending on timeframe.
  const sleepBuckets = useMemo(() => {
    const now = new Date();

    const parseDayKeyToDate = (key) => {
      // key: YYYY-MM-DD (local)
      const parts = String(key || '').split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (!y || !m || !d) return new Date();
      return new Date(y, m - 1, d);
    };

    const parseMonthKeyToDate = (key) => {
      // key: YYYY-MM
      const parts = String(key || '').split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      if (!y || !m) return new Date();
      return new Date(y, m - 1, 1);
    };

    const fmtDayLabel = (key) =>
      parseDayKeyToDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const fmtWeekLabel = (weekStartKey) =>
      parseDayKeyToDate(weekStartKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const fmtMonthLabel = (monthKey) =>
      parseMonthKeyToDate(monthKey).toLocaleDateString('en-US', { month: 'short' });

    const makeDayKey = (d) => _dateKeyLocal(d.getTime());
    const dataByDay = sleepByDay || {};

    if (timeframe === 'day') {
      const keys = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        keys.push(makeDayKey(d));
      }
      return keys.map(k => ({
        key: k,
        label: fmtDayLabel(k),
        ...(dataByDay[k] || {})
      }));
    }

    if (timeframe === 'week') {
      // Match Volume History behavior: week start = Sunday
      const res = [];
      const d = new Date(now);
      const diffToSun = d.getDay(); // 0 Sun..6 Sat
      d.setDate(d.getDate() - diffToSun);

      // 8 weeks including current week (oldest -> newest)
      for (let w = 7; w >= 0; w--) {
        const ws = new Date(d);
        ws.setDate(d.getDate() - w * 7);
        const wkKey = makeDayKey(ws);

        // sum 7 days
        let totalHrs = 0, dayHrs = 0, nightHrs = 0, count = 0;
        for (let i = 0; i < 7; i++) {
          const dd = new Date(ws);
          dd.setDate(ws.getDate() + i);
          const kk = makeDayKey(dd);
          const v = dataByDay[kk];
          if (!v) continue;
          totalHrs += v.totalHrs || 0;
          dayHrs += v.dayHrs || 0;
          nightHrs += v.nightHrs || 0;
          count += v.count || 0;
        }

        res.push({
          key: wkKey,
          label: fmtWeekLabel(wkKey),
          totalHrs,
          dayHrs,
          nightHrs,
          count
        });
      }
      return res;
    }

    // month: last 6 months including current month
    const res = [];
    for (let m = 5; m >= 0; m--) {
      const ms = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthKey = `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, '0')}`;

      let totalHrs = 0, dayHrs = 0, nightHrs = 0, count = 0;
      const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 1);
      for (let dd = new Date(ms); dd < me; dd.setDate(dd.getDate() + 1)) {
        const kk = makeDayKey(dd);
        const v = dataByDay[kk];
        if (!v) continue;
        totalHrs += v.totalHrs || 0;
        dayHrs += v.dayHrs || 0;
        nightHrs += v.nightHrs || 0;
        count += v.count || 0;
      }

      res.push({
        key: monthKey,
        label: fmtMonthLabel(monthKey),
        totalHrs,
        dayHrs,
        nightHrs,
        count
      });
    }
    return res;
  }, [timeframe, sleepByDay]);

  const sleepCards = useMemo(() => {
    // Calculate averages based on actual calendar days (not buckets)
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    
    // Start of "today" in local time
    const todayStartDate = new Date();
    todayStartDate.setHours(0, 0, 0, 0);
    const todayStart = todayStartDate.getTime();
    
    // How many distinct calendar days of data we have in total
    const dataByDay = sleepByDay || {};
    const allUniqueDays = Object.keys(dataByDay).filter(k => {
      const day = dataByDay[k];
      return (day.totalHrs || 0) > 0 || (day.count || 0) > 0;
    }).length;
    
    let numDays, label;
    if (timeframe === 'day') {
      numDays = 3;
      label = '3-day avg';
    } else if (timeframe === 'week') {
      numDays = 7;
      label = '7-day avg';
    } else {
      numDays = 30;
      label = '30-day avg';
    }
    
    // Per-timeframe bootstrap rule (same as feeding):
    // - If we have > numDays distinct days of data, exclude today (use only completed days)
    // - If we have <= numDays distinct days of data, include today
    const excludeToday = allUniqueDays > numDays;
    
    let periodStart, periodEnd;
    if (excludeToday) {
      // Exclude today: last `numDays` full days before today
      periodEnd = todayStart; // start of today (exclusive upper bound)
      periodStart = todayStart - numDays * MS_PER_DAY;
    } else {
      // Include today: last `numDays` days up through the end of today
      periodEnd = todayStart + MS_PER_DAY; // end of today
      periodStart = periodEnd - numDays * MS_PER_DAY;
    }
    
    // Get all day keys in the period
    const daysInPeriod = [];
    for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
      const key = _dateKeyLocal(d.getTime());
      daysInPeriod.push(key);
    }
    
    // Sum values for all days in period (days with 0 data contribute 0)
    let totalHrs = 0;
    let dayHrs = 0;
    let nightHrs = 0;
    let count = 0;
    
    daysInPeriod.forEach(key => {
      const day = dataByDay[key] || {};
      totalHrs += day.totalHrs || 0;
      dayHrs += day.dayHrs || 0;
      nightHrs += day.nightHrs || 0;
      count += day.count || 0;
    });
    
    // Calculate averages: divide by number of calendar days in period
    const avgTotal = daysInPeriod.length > 0 ? totalHrs / daysInPeriod.length : 0;
    const avgDay = daysInPeriod.length > 0 ? dayHrs / daysInPeriod.length : 0;
    const avgNight = daysInPeriod.length > 0 ? nightHrs / daysInPeriod.length : 0;
    const avgSleeps = daysInPeriod.length > 0 ? count / daysInPeriod.length : 0;
    
    return {
      label,
      avgTotal,
      avgDay,
      avgNight,
      avgSleeps
    };
  }, [timeframe, sleepByDay]);

  // Auto-scroll Sleep History to the right
  useEffect(() => {
    if (
      loading ||
      !sleepHistoryScrollRef.current ||
      !sleepBuckets ||
      sleepBuckets.length === 0
    ) {
      return;
    }

    const container = sleepHistoryScrollRef.current;
    setTimeout(() => {
      if (!container) return;
      try { container.scrollLeft = container.scrollWidth; } catch {}
    }, 0);
  }, [loading, timeframe, sleepBuckets]);

  if (loading) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement('div', { style: { color: 'var(--tt-text-secondary)' } }, 'Loading...')
    );
  }

  return React.createElement(
    'div',
    { className: 'min-h-screen pb-24' },
    
    // Back button header
    React.createElement(
      'div',
      { 
        className: 'sticky top-0 z-10 px-4 py-3 grid grid-cols-3 items-center',
        style: { backgroundColor: 'var(--tt-app-bg)', borderBottom: '1px solid var(--tt-card-border)' }
      },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => setActiveTab('analytics'),
          className: 'rounded-lg transition font-medium active:scale-95 flex items-center justify-start',
          style: { 
            color: 'var(--tt-text-secondary)',
            padding: '8px 12px',
            minHeight: '44px',
            minWidth: '44px'
          }
        },
        ChevronLeftIcon && React.createElement(ChevronLeftIcon, {
          className: 'w-5 h-5',
          style: { color: 'var(--tt-text-secondary)' }
        })
      ),
      React.createElement(
        'div',
        { className: 'flex items-center justify-center gap-1' },
        sleepLabelIcon && React.createElement(sleepLabelIcon, {
          className: 'w-5 h-5',
          style: { 
            color: 'var(--tt-sleep)',
            fill: 'var(--tt-sleep)'
          }
        }),
        React.createElement(
          'span',
          {
            className: 'text-[15px] font-semibold leading-6',
            style: { color: 'var(--tt-sleep)' }
          },
          'Sleep'
        )
      ),
      React.createElement('div') // Empty spacer for grid balance
    ),

    // Timeframe toggle
    React.createElement(
      'div',
      { className: 'pt-3 pb-2' },
      React.createElement(
        'div',
        { className: 'px-4' },
        window.TT?.shared?.SegmentedToggle && React.createElement(window.TT.shared.SegmentedToggle, {
          value: timeframe,
          onChange: (v) => setTimeframe(v),
          options: [
            { value: 'day', label: 'D' },
            { value: 'week', label: 'W' },
            { value: 'month', label: 'M' }
          ],
          variant: 'body',
          size: 'medium',
          fullWidth: true
        })
      )
    ),

    // Content
    React.createElement(
      'div',
      { className: 'px-4 pb-4' },
      
      // Stat cards (4 cards in 2x2 grid)
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-4" },
        // Row 1: Hours / Day, Sleeps / Day
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15px] font-semibold",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Hours / Day"),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-1 text-[30px] font-bold leading-none -mb-[8px]", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgTotal || 0).toFixed(1),
            React.createElement("span", { className: "text-[20px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, "hrs")
          ),
          React.createElement("div", { className: "text-[12px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        ),
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15px] font-semibold",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Sleeps / Day"),
          React.createElement(
            "div",
            { className: "text-[30px] font-bold leading-none -mb-[8px]", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgSleeps || 0).toFixed(1)
          ),
          React.createElement("div", { className: "text-[12px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        ),
        // Row 2: Day Sleep, Night Sleep
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15px] font-semibold",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Day Sleep"),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-1 text-[30px] font-bold leading-none -mb-[8px]", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgDay || 0).toFixed(1),
            React.createElement("span", { className: "text-[20px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, "hrs")
          ),
          React.createElement("div", { className: "text-[12px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        ),
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15px] font-semibold",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Night Sleep"),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-1 text-[30px] font-bold leading-none -mb-[8px]", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgNight || 0).toFixed(1),
            React.createElement("span", { className: "text-[20px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, "hrs")
          ),
          React.createElement("div", { className: "text-[12px] font-normal leading-none", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        )
      ),

      // Sleep history chart
      React.createElement(
        "div",
        { 
          className: "rounded-2xl shadow-sm p-5 mt-4",
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
        React.createElement(
          "div",
          { 
            className: "text-[15px] font-semibold mb-1.5",
            style: { color: 'var(--tt-text-secondary)' }
          },
          "Sleep history"
        ),
        sleepBuckets.length > 0
          ? React.createElement(
              "div",
              { className: "relative" },
              React.createElement(
                "div",
                {
                  ref: sleepHistoryScrollRef,
                  className: "overflow-x-auto overflow-y-hidden -mx-5 px-5",
                  style: { scrollBehavior: "smooth" }
                },
                React.createElement(
                  "div",
                  {
                    className: "flex gap-6 pb-2",
                    style: {
                      minWidth: sleepBuckets.length > 4 ? `${sleepBuckets.length * 80}px` : "100%"
                    }
                  },
                  sleepBuckets.map((b) =>
                    React.createElement(
                      "div",
                      { key: b.key, className: "flex flex-col items-center gap-2 flex-shrink-0" },
                      React.createElement(
                        "div",
                        { className: "flex flex-col justify-end items-center", style: { height: "180px", width: "60px" } },
                        React.createElement(
                          "div",
                          {
                            className: "w-full rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500",
                            style: {
                              backgroundColor: 'var(--tt-sleep)',
                              height: `${(Number(b.totalHrs || 0) / Math.max(...sleepBuckets.map(x => x.totalHrs || 0), 1)) * 160}px`,
                              minHeight: "30px"
                            }
                          },
                          React.createElement(
                            "div",
                            { className: "text-white font-semibold" },
                            React.createElement("span", { className: "text-xs" }, Number(b.totalHrs || 0).toFixed(1)),
                            React.createElement("span", { className: "text-[10px] opacity-70 ml-0.5" }, "h")
                          )
                        )
                      ),
                      React.createElement("div", { 
                        className: "text-xs font-medium",
                        style: { color: 'var(--tt-text-secondary)' }
                      }, b.label),
                      React.createElement("div", { 
                        className: "text-xs",
                        style: { color: 'var(--tt-text-tertiary)' }
                      }, `${b.count || 0} sleeps`)
                    )
                  )
                )
              )
            )
          : React.createElement("div", { 
              className: "text-center py-8",
              style: { color: 'var(--tt-text-tertiary)' }
            }, "No data to display")
      )
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.SleepAnalyticsTab = SleepAnalyticsTab;
