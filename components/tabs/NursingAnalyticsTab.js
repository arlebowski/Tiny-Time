const NursingAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [allNursingSessions, setAllNursingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('day');
  const [stats, setStats] = useState({
    avgDurationPerSession: 0,
    avgDurationPerDay: 0,
    avgSessionsPerDay: 0,
    avgInterval: 0,
    chartData: [],
    labelText: ''
  });

  const chartScrollRef = React.useRef(null);

  // Get icons (matching AnalyticsTab highlight cards)
  const nursingLabelIcon = window.TT?.shared?.icons?.NursingIcon || null;
  const ChevronLeftIcon = window.TT?.shared?.icons?.ChevronLeftIcon || null;

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, kidId]);

  // Auto-scroll chart to the right (latest data) once data + layout are ready
  useEffect(() => {
    if (
      loading ||
      !chartScrollRef.current ||
      !stats.chartData ||
      stats.chartData.length === 0
    ) {
      return;
    }

    const container = chartScrollRef.current;

    // Defer to end of event loop so layout & scrollWidth are correct
    setTimeout(() => {
      if (!container) return;
      container.scrollLeft = container.scrollWidth;
    }, 0);
  }, [loading, stats.chartData, timeframe]);

  const loadAnalytics = async () => {
    if (!kidId) {
      setAllNursingSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sessions = await firestoreStorage.getAllNursingSessions();
      const safeSessions = Array.isArray(sessions) ? sessions : [];
      setAllNursingSessions(safeSessions);
      calculateStats(safeSessions);
    } finally {
      setLoading(false);
    }
  };

  const getSessionTimestamp = (s) => Number(s?.timestamp || s?.startTime || 0);

  const getSessionDurationSec = (s) => {
    const left = Number(s?.leftDurationSec || 0);
    const right = Number(s?.rightDurationSec || 0);
    return Math.max(0, left + right);
  };

  const calculateStats = (sessions) => {
    if (!sessions || sessions.length === 0) {
      setStats({
        avgDurationPerSession: 0,
        avgDurationPerDay: 0,
        avgSessionsPerDay: 0,
        avgInterval: 0,
        chartData: [],
        labelText: ''
      });
      return;
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    // Start of "today" in local time
    const todayStartDate = new Date();
    todayStartDate.setHours(0, 0, 0, 0);
    const todayStart = todayStartDate.getTime();

    // How many distinct calendar days of data we have in total
    const allUniqueDays = new Set(
      sessions.map(s => new Date(getSessionTimestamp(s)).toDateString())
    ).size;

    let numDays, labelText;
    if (timeframe === 'day') {
      numDays = 3;
      labelText = '3-day avg';
    } else if (timeframe === 'week') {
      numDays = 7;
      labelText = '7-day avg';
    } else {
      numDays = 30;
      labelText = '30-day avg';
    }

    // Per-timeframe bootstrap rule:
    // - If we have > numDays distinct days of data, exclude today (use only completed days)
    // - If we have <= numDays distinct days of data, include today
    const excludeToday = allUniqueDays > numDays;

    let periodStart, periodEnd;
    if (excludeToday) {
      periodEnd = todayStart; // start of today (exclusive upper bound)
      periodStart = todayStart - numDays * MS_PER_DAY;
    } else {
      periodEnd = todayStart + MS_PER_DAY; // end of today
      periodStart = periodEnd - numDays * MS_PER_DAY;
    }

    const recentSessions = sessions.filter(
      s => {
        const ts = getSessionTimestamp(s);
        return ts >= periodStart && ts < periodEnd;
      }
    ).sort((a, b) => getSessionTimestamp(a) - getSessionTimestamp(b));

    const totalDurationSec = recentSessions.reduce(
      (sum, s) => sum + getSessionDurationSec(s),
      0
    );

    const avgDurationPerSession =
      recentSessions.length > 0
        ? totalDurationSec / recentSessions.length
        : 0;

    const daysInPeriod = Math.ceil((periodEnd - periodStart) / MS_PER_DAY);
    const avgDurationPerDay =
      daysInPeriod > 0 ? totalDurationSec / daysInPeriod : 0;
    const avgSessionsPerDay =
      daysInPeriod > 0 ? recentSessions.length / daysInPeriod : 0;

    let totalIntervalMinutes = 0;
    for (let i = 1; i < recentSessions.length; i++) {
      totalIntervalMinutes +=
        (getSessionTimestamp(recentSessions[i]) -
          getSessionTimestamp(recentSessions[i - 1])) /
        (1000 * 60);
    }
    const avgInterval =
      recentSessions.length > 1
        ? totalIntervalMinutes / (recentSessions.length - 1)
        : 0;

    const chartData = generateChartData(sessions, timeframe);

    setStats({
      avgDurationPerSession,
      avgDurationPerDay,
      avgSessionsPerDay,
      avgInterval,
      labelText,
      chartData
    });
  };

  const generateChartData = (sessions, range) => {
    if (!sessions || sessions.length === 0) return [];

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const todayStartDate = new Date();
    todayStartDate.setHours(0, 0, 0, 0);
    const todayStart = todayStartDate.getTime();

    const allUniqueDays = new Set(
      sessions.map(s => new Date(getSessionTimestamp(s)).toDateString())
    ).size;

    let numDays;
    if (range === 'day') {
      numDays = 3;
    } else if (range === 'week') {
      numDays = 7;
    } else {
      numDays = 30;
    }

    const excludeToday = allUniqueDays > numDays;
    let periodStart, periodEnd;
    if (excludeToday) {
      periodEnd = todayStart;
      periodStart = todayStart - numDays * MS_PER_DAY;
    } else {
      periodEnd = todayStart + MS_PER_DAY;
      periodStart = periodEnd - numDays * MS_PER_DAY;
    }

    const filtered = sessions.filter(s => {
      const ts = getSessionTimestamp(s);
      return ts >= periodStart && ts < periodEnd;
    });

    const buckets = new Map();
    for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      buckets.set(key, {
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: 0,
        count: 0,
        _sortKey: key
      });
    }

    filtered.forEach(s => {
      const dayStart = new Date(getSessionTimestamp(s));
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.hours += getSessionDurationSec(s) / 3600;
      bucket.count += 1;
    });

    const sorted = Array.from(buckets.values()).sort((a, b) => a._sortKey - b._sortKey);

    return sorted.map(item => ({
      date: item.date,
      hours: Number(item.hours.toFixed(1)),
      count: item.count
    }));
  };

  const formatInterval = (minutes) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.round(Math.abs(minutes) % 60);
    const unitClass = 'text-[20px] font-normal leading-none ml-1';
    const unitStyle = { color: 'var(--tt-text-tertiary)' };

    if (hours === 0) {
      return React.createElement(
        React.Fragment,
        null,
        `${mins}`,
        React.createElement('span', { className: unitClass, style: unitStyle }, 'm')
      );
    }

    return React.createElement(
      React.Fragment,
      null,
      `${hours}`,
      React.createElement('span', { className: unitClass, style: unitStyle }, 'h'),
      ' ',
      `${mins}`,
      React.createElement('span', { className: unitClass, style: unitStyle }, 'm')
    );
  };

  const formatHours = (seconds) => {
    const hours = Number(seconds || 0) / 3600;
    return Number.isFinite(hours) ? hours.toFixed(1) : '0.0';
  };

  if (loading) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement(
        'div',
        { style: { color: 'var(--tt-text-secondary)' } },
        'Loading analytics...'
      )
    );
  }

  const maxHours = Math.max(...stats.chartData.map(d => d.hours || 0), 1);

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
        nursingLabelIcon && React.createElement(nursingLabelIcon, {
          className: 'w-5 h-5',
          style: {
            color: 'var(--tt-nursing)',
            strokeWidth: '1.5',
            fill: 'none'
          }
        }),
        React.createElement(
          'span',
          {
            className: 'text-[18px] font-semibold leading-6',
            style: { color: 'var(--tt-nursing)' }
          },
          'Nursing'
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
            { value: 'day', label: '3D' },
            { value: 'week', label: '7D' },
            { value: 'month', label: '30D' }
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

      // Stat cards
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-4' },
        [
          { label: 'Avg / Session', value: formatHours(stats.avgDurationPerSession) },
          { label: 'Total / Day', value: formatHours(stats.avgDurationPerDay) }
        ].map(stat =>
          React.createElement(
            'div',
            {
              key: stat.label,
              className: 'rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]',
              style: { backgroundColor: 'var(--tt-card-bg)' }
            },
            React.createElement('div', {
              className: 'text-[15px] font-semibold',
              style: { color: 'var(--tt-text-secondary)' }
            }, stat.label),
            React.createElement('div', {
              className: 'text-[30px] font-bold leading-none -mb-[8px]',
              style: { color: 'var(--tt-nursing)' }
            },
              stat.value,
              React.createElement('span', {
                className: 'text-[20px] font-normal leading-none ml-1',
                style: { color: 'var(--tt-text-tertiary)' }
              }, 'hrs')
            ),
            React.createElement('div', {
              className: 'text-[12px] font-normal leading-none',
              style: { color: 'var(--tt-text-tertiary)' }
            }, stats.labelText)
          )
        )
      ),

      // Additional stats
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-4 mt-4' },
        React.createElement(
          'div',
          {
            className: 'rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]',
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement('div', {
            className: 'text-[15px] font-semibold',
            style: { color: 'var(--tt-text-secondary)' }
          }, 'Sessions / Day'),
          React.createElement('div', {
            className: 'text-[30px] font-bold leading-none -mb-[8px]',
            style: { color: 'var(--tt-nursing)' }
          }, stats.avgSessionsPerDay.toFixed(1)),
          React.createElement('div', {
            className: 'text-[12px] font-normal leading-none',
            style: { color: 'var(--tt-text-tertiary)' }
          }, stats.labelText)
        ),
        React.createElement(
          'div',
          {
            className: 'rounded-2xl shadow-sm p-5 flex flex-col gap-[18px]',
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement('div', {
            className: 'text-[15px] font-semibold',
            style: { color: 'var(--tt-text-secondary)' }
          }, 'Interval'),
          React.createElement('div', {
            className: 'text-[30px] font-bold leading-none -mb-[8px]',
            style: { color: 'var(--tt-nursing)' }
          }, formatInterval(stats.avgInterval)),
          React.createElement('div', {
            className: 'text-[12px] font-normal leading-none',
            style: { color: 'var(--tt-text-tertiary)' }
          }, stats.labelText)
        )
      ),

      // Nursing History chart
      React.createElement(
        'div',
        {
          className: 'rounded-2xl shadow-sm p-5 mt-4',
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
        React.createElement('div', {
          className: 'text-[15px] font-semibold mb-1.5',
          style: { color: 'var(--tt-text-secondary)' }
        }, 'Nursing History'),
        stats.chartData.length > 0
          ? React.createElement(
              'div',
              { className: 'relative' },
              React.createElement(
                'div',
                {
                  ref: chartScrollRef,
                  className: 'overflow-x-auto overflow-y-hidden -mx-5 px-5',
                  style: { scrollBehavior: 'smooth' }
                },
                React.createElement(
                  'div',
                  {
                    className: 'flex gap-6 pb-2',
                    style: {
                      minWidth: stats.chartData.length > 4 ? `${stats.chartData.length * 80}px` : '100%'
                    }
                  },
                  stats.chartData.map(item =>
                    React.createElement(
                      'div',
                      { key: item.date, className: 'flex flex-col items-center gap-2 flex-shrink-0' },
                      React.createElement(
                        'div',
                        { className: 'flex flex-col justify-end items-center', style: { height: '180px', width: '60px' } },
                        React.createElement(
                          'div',
                          {
                            className: 'w-full rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500',
                            style: {
                              backgroundColor: 'var(--tt-nursing)',
                              height: `${(Number(item.hours || 0) / maxHours) * 160}px`,
                              minHeight: '30px'
                            }
                          },
                          React.createElement(
                            'div',
                            { className: 'text-white font-semibold' },
                            React.createElement('span', { className: 'text-xs' }, Number(item.hours || 0).toFixed(1)),
                            React.createElement('span', { className: 'text-[10px] opacity-70 ml-0.5' }, 'h')
                          )
                        )
                      ),
                      React.createElement('div', {
                        className: 'text-xs font-medium',
                        style: { color: 'var(--tt-text-secondary)' }
                      }, item.date),
                      React.createElement('div', {
                        className: 'text-xs',
                        style: { color: 'var(--tt-text-tertiary)' }
                      }, `${item.count} sessions`)
                    )
                  )
                )
              )
            )
          : React.createElement('div', {
              className: 'text-center py-8',
              style: { color: 'var(--tt-text-tertiary)' }
            }, 'No data to display')
      )
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.NursingAnalyticsTab = NursingAnalyticsTab;
