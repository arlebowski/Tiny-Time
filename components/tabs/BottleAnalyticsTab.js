const BottleAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [allFeedings, setAllFeedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [stats, setStats] = useState({
    avgVolumePerFeed: 0,
    avgVolumePerDay: 0,
    avgFeedingsPerDay: 0,
    avgInterval: 0,
    chartData: []
  });

  const chartScrollRef = React.useRef(null);

  // Get icons (matching AnalyticsTab highlight cards)
  const feedLabelIcon = window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"] || null;
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
      setAllFeedings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const feedings = await firestoreStorage.getAllFeedings();
      setAllFeedings(feedings);
      calculateStats(feedings);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (feedings) => {
    if (feedings.length === 0) {
      setStats({
        avgVolumePerFeed: 0,
        avgVolumePerDay: 0,
        avgFeedingsPerDay: 0,
        avgInterval: 0,
        chartData: []
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
      feedings.map(f => new Date(f.timestamp).toDateString())
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
      // Exclude today: last `numDays` full days before today
      periodEnd = todayStart; // start of today (exclusive upper bound)
      periodStart = todayStart - numDays * MS_PER_DAY;
    } else {
      // Include today: last `numDays` days up through the end of today
      periodEnd = todayStart + MS_PER_DAY; // end of today
      periodStart = periodEnd - numDays * MS_PER_DAY;
    }

    const recentFeedings = feedings.filter(
      f => f.timestamp >= periodStart && f.timestamp < periodEnd
    );

    const totalVolume = recentFeedings.reduce(
      (sum, f) => sum + f.ounces,
      0
    );
    const avgVolumePerFeed =
      recentFeedings.length > 0
        ? totalVolume / recentFeedings.length
        : 0;
    // Calculate number of calendar days in period (not just days with data)
    const daysInPeriod = Math.ceil((periodEnd - periodStart) / MS_PER_DAY);
    const avgVolumePerDay =
      daysInPeriod > 0 ? totalVolume / daysInPeriod : 0;
    const avgFeedingsPerDay =
      daysInPeriod > 0 ? recentFeedings.length / daysInPeriod : 0;

    let totalIntervalMinutes = 0;
    for (let i = 1; i < recentFeedings.length; i++) {
      totalIntervalMinutes +=
        (recentFeedings[i].timestamp -
          recentFeedings[i - 1].timestamp) /
        (1000 * 60);
    }
    const avgInterval =
      recentFeedings.length > 1
        ? totalIntervalMinutes / (recentFeedings.length - 1)
        : 0;

    const chartData = generateChartData(feedings, timeframe);

    setStats({
      avgVolumePerFeed,
      avgVolumePerDay,
      avgFeedingsPerDay,
      avgInterval,
      labelText,
      chartData
    });
  };

  const generateChartData = (feedings, range) => {
    if (!feedings || feedings.length === 0) return [];

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const todayStartDate = new Date();
    todayStartDate.setHours(0, 0, 0, 0);
    const todayStart = todayStartDate.getTime();

    const allUniqueDays = new Set(
      feedings.map(f => new Date(f.timestamp).toDateString())
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

    const filtered = feedings.filter(
      f => f.timestamp >= periodStart && f.timestamp < periodEnd
    );

    const buckets = new Map();
    for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      buckets.set(key, {
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: 0,
        count: 0,
        _sortKey: key
      });
    }

    filtered.forEach(f => {
      const dayStart = new Date(f.timestamp);
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.volume += f.ounces || 0;
      bucket.count += 1;
    });

    const sorted = Array.from(buckets.values()).sort((a, b) => a._sortKey - b._sortKey);

    return sorted.map(item => ({
      date: item.date,
      volume: parseFloat(item.volume.toFixed(1)),
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

  const maxVolume = Math.max(...stats.chartData.map(d => d.volume), 1);

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
          className: 'rounded-lg transition font-medium active:scale-95 flex items-center justify-start gap-1',
          style: { 
            color: 'var(--tt-text-secondary)',
            padding: '8px 12px',
            minHeight: '44px',
            minWidth: '44px'
          }
        },
        ChevronLeftIcon && React.createElement(ChevronLeftIcon, {
          className: 'w-5 h-5',
          style: { color: 'var(--tt-text-secondary)', transform: 'translateY(1px)' }
        }),
        React.createElement('span', {
          className: 'text-[15px] font-medium',
          style: { color: 'var(--tt-text-secondary)' }
        }, 'Back')
      ),
      React.createElement(
        'div',
        { className: 'flex items-center justify-center gap-1' },
        feedLabelIcon && React.createElement(feedLabelIcon, {
          className: 'w-5 h-5',
          style: { 
            color: 'var(--tt-feed)',
            strokeWidth: '1.5',
            fill: 'none',
            transform: 'rotate(20deg)'
          }
        }),
        React.createElement(
          'span',
          {
            className: 'text-[18px] font-semibold leading-6',
            style: { color: 'var(--tt-feed)' }
          },
          'Bottle'
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
          { label: 'Oz / Feed', value: stats.avgVolumePerFeed.toFixed(1) },
          { label: 'Oz / Day', value: stats.avgVolumePerDay.toFixed(1) }
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
              style: { color: 'var(--tt-feed)' }
            }, 
              stat.value,
              React.createElement('span', { 
                className: 'text-[20px] font-normal leading-none ml-1',
                style: { color: 'var(--tt-text-tertiary)' }
              }, 'oz')
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
          }, 'Bottles / Day'),
          React.createElement('div', { 
            className: 'text-[30px] font-bold leading-none -mb-[8px]',
            style: { color: 'var(--tt-feed)' }
          }, stats.avgFeedingsPerDay.toFixed(1)),
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
            style: { color: 'var(--tt-feed)' }
          }, formatInterval(stats.avgInterval)),
          React.createElement('div', { 
            className: 'text-[12px] font-normal leading-none',
            style: { color: 'var(--tt-text-tertiary)' }
          }, stats.labelText)
        )
      ),

      // Volume History chart
      React.createElement(
        'div',
        { 
          className: 'rounded-2xl shadow-sm p-5 mt-4',
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
        React.createElement('div', { 
          className: 'text-[15px] font-semibold mb-1.5',
          style: { color: 'var(--tt-text-secondary)' }
        }, 'Volume History'),
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
                              backgroundColor: 'var(--tt-feed)',
                              height: `${(item.volume / maxVolume) * 160}px`,
                              minHeight: '30px'
                            }
                          },
                          React.createElement(
                            'div',
                            { className: 'text-white font-semibold' },
                            React.createElement('span', { className: 'text-xs' }, item.volume),
                            React.createElement('span', { className: 'text-[10px] opacity-70 ml-0.5' }, 'oz')
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
                      }, `${item.count} bottles`)
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
    ),
    React.createElement('div', {
      className: "tt-nav-fade fixed left-0 right-0 pointer-events-none",
      style: {
        bottom: 'calc(env(safe-area-inset-bottom) + 65px)',
        height: '100px',
        background: 'var(--tt-nav-fade-gradient)',
        zIndex: 40
      }
    })
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.BottleAnalyticsTab = BottleAnalyticsTab;
