const SleepAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [sleepSessions, setSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('day');
  const sleepHistoryScrollRef = React.useRef(null);

  // Get icons (matching AnalyticsTab highlight cards)
  const sleepLabelIcon = (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"]) || null;
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
    // Match your feeding cards behavior: show avg for selected timeframe and a small label like "3-day avg"/"7-day avg"/"30-day avg"
    const vals = sleepBuckets.map(b => b || {});
    const totals = vals.map(v => v.totalHrs || 0);
    const days = vals.map(v => v.dayHrs || 0);
    const nights = vals.map(v => v.nightHrs || 0);
    const counts = vals.map(v => v.count || 0);

    const label = timeframe === 'day' ? '3-day avg' : (timeframe === 'week' ? '7-day avg' : '30-day avg');
    const windowN = timeframe === 'day' ? 3 : (timeframe === 'week' ? 7 : 30);
    
    // Count buckets with actual sleep data
    const bucketsWithData = vals.filter(v => (v.totalHrs || 0) > 0 || (v.count || 0) > 0).length;
    
    // Determine if we should exclude today/current period
    // If we have > windowN days/buckets of data, exclude today/current period
    // If we have <= windowN days/buckets of data, include today/current period
    const excludeToday = bucketsWithData > windowN;
    
    // Get today's date key
    const todayKey = _dateKeyLocal(Date.now());
    
    // Check if last bucket includes today
    // For 'day': check if key matches today
    // For 'week'/'month': assume last bucket includes today if it's the most recent period
    const lastBucketIsToday = timeframe === 'day' 
      ? (vals.length > 0 && vals[vals.length - 1]?.key === todayKey)
      : (vals.length > 0); // For week/month, last bucket is always current period
    
    // Select buckets to average
    let bucketsToAverage;
    if (excludeToday && lastBucketIsToday && vals.length > windowN) {
      // Exclude today: take last N+1 items, remove the last one (today)
      bucketsToAverage = vals.slice(-windowN - 1, -1);
    } else {
      // Include today: take last N items (or all if fewer than N)
      bucketsToAverage = vals.slice(-windowN);
    }
    
    // Extract values and calculate averages
    const totalsToAvg = bucketsToAverage.map(v => v.totalHrs || 0);
    const daysToAvg = bucketsToAverage.map(v => v.dayHrs || 0);
    const nightsToAvg = bucketsToAverage.map(v => v.nightHrs || 0);
    const countsToAvg = bucketsToAverage.map(v => v.count || 0);

    const avgTotal = _avg(totalsToAvg);
    const avgDay = _avg(daysToAvg);
    const avgNight = _avg(nightsToAvg);
    const avgSleeps = _avg(countsToAvg);
    
    return {
      label,
      avgTotal,
      avgDay,
      avgNight,
      avgSleeps
    };
  }, [timeframe, sleepBuckets]);

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
            className: 'text-[17.6px] font-semibold leading-6',
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
            className: "rounded-2xl shadow-sm p-6 flex flex-col",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15.4px] font-medium mb-2",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Hours / Day"),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-1 text-2xl font-bold", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgTotal || 0).toFixed(1),
            React.createElement("span", { className: "text-[15.4px] font-normal", style: { color: 'var(--tt-text-tertiary)' } }, "hrs")
          ),
          React.createElement("div", { className: "text-xs mt-1", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        ),
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-6 flex flex-col",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15.4px] font-medium mb-2",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Sleeps / Day"),
          React.createElement(
            "div",
            { className: "text-2xl font-bold", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgSleeps || 0).toFixed(1)
          ),
          React.createElement("div", { className: "text-xs mt-1", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        ),
        // Row 2: Day Sleep, Night Sleep
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-6 flex flex-col",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15.4px] font-medium mb-2",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Day Sleep"),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-1 text-2xl font-bold", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgDay || 0).toFixed(1),
            React.createElement("span", { className: "text-[15.4px] font-normal", style: { color: 'var(--tt-text-tertiary)' } }, "hrs")
          ),
          React.createElement("div", { className: "text-xs mt-1", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        ),
        React.createElement(
          "div",
          { 
            className: "rounded-2xl shadow-sm p-6 flex flex-col",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement("div", { 
            className: "text-[15.4px] font-medium mb-2",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Night Sleep"),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-1 text-2xl font-bold", style: { color: 'var(--tt-sleep)' } },
            Number(sleepCards.avgNight || 0).toFixed(1),
            React.createElement("span", { className: "text-[15.4px] font-normal", style: { color: 'var(--tt-text-tertiary)' } }, "hrs")
          ),
          React.createElement("div", { className: "text-xs mt-1", style: { color: 'var(--tt-text-tertiary)' } }, sleepCards.label)
        )
      ),

      // Sleep history chart
      React.createElement(
        "div",
        { 
          className: "rounded-2xl shadow-sm p-6 mt-4",
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
        React.createElement(
          "div",
          { 
            className: "text-sm font-medium mb-2.5 text-center",
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
                  className: "overflow-x-auto overflow-y-hidden -mx-6 px-6",
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
