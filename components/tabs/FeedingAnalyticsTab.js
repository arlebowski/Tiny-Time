const FeedingAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [allFeedings, setAllFeedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('day');
  const [stats, setStats] = useState({
    avgVolumePerFeed: 0,
    avgVolumePerDay: 0,
    avgFeedingsPerDay: 0,
    avgInterval: 0,
    chartData: []
  });

  const chartScrollRef = React.useRef(null);

  // Get icons
  const ChevronLeft = window.TT?.shared?.icons?.ChevronLeftIcon || window.TT?.shared?.icons?.["chevron-left"] || (() => React.createElement('span', null, '←'));

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
    const uniqueDays = new Set(
      recentFeedings.map(f => new Date(f.timestamp).toDateString())
    ).size;
    const avgVolumePerDay =
      uniqueDays > 0 ? totalVolume / uniqueDays : 0;
    const avgFeedingsPerDay =
      uniqueDays > 0 ? recentFeedings.length / uniqueDays : 0;

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
    const grouped = {};
    const dateMap = new Map(); // Store original timestamp for sorting
    feedings.forEach(f => {
      const date = new Date(f.timestamp);
      let key;
      if (range === 'day') {
        key = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else if (range === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short' });
      }
      if (!grouped[key]) {
        grouped[key] = { date: key, volume: 0, count: 0 };
        // Store the earliest timestamp for this key for sorting
        dateMap.set(key, date.getTime());
      }
      grouped[key].volume += f.ounces;
      grouped[key].count += 1;
      // Update to most recent timestamp for this key
      if (date.getTime() > dateMap.get(key)) {
        dateMap.set(key, date.getTime());
      }
    });
    // Sort by date (oldest on left, newest on right)
    const sorted = Object.values(grouped).map(item => ({
      date: item.date,
      volume: parseFloat(item.volume.toFixed(1)),
      count: item.count,
      _sortKey: dateMap.get(item.date)
    })).sort((a, b) => a._sortKey - b._sortKey);
    // Remove sort key before returning
    return sorted.map(item => ({
      date: item.date,
      volume: item.volume,
      count: item.count
    }));
  };

  const formatInterval = (minutes) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.round(Math.abs(minutes) % 60);
    return hours === 0 ? `${mins}m` : `${hours}h ${mins}m`;
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
        className: 'sticky top-0 z-10 px-4 py-3 flex items-center gap-3',
        style: { backgroundColor: 'var(--tt-bg)', borderBottom: '1px solid var(--tt-border)' }
      },
      React.createElement(
        'button',
        {
          onClick: () => setActiveTab('analytics'),
          className: 'p-2 rounded-lg active:scale-95',
          style: { color: 'var(--tt-text-primary)' }
        },
        React.createElement(ChevronLeft, { size: 24 })
      ),
      React.createElement('h1', { 
        className: 'text-lg font-semibold',
        style: { color: 'var(--tt-text-primary)' }
      }, 'Feeding')
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
              className: 'rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center',
              style: { backgroundColor: 'var(--tt-card-bg)' }
            },
            React.createElement('div', { 
              className: 'text-sm font-medium mb-2',
              style: { color: 'var(--tt-text-secondary)' }
            }, stat.label),
            React.createElement('div', { 
              className: 'text-2xl font-bold',
              style: { color: 'var(--tt-feed)' }
            }, 
              stat.value,
              React.createElement('span', { 
                className: 'text-sm font-normal ml-1',
                style: { color: 'var(--tt-text-tertiary)' }
              }, 'oz')
            ),
            React.createElement('div', { 
              className: 'text-xs mt-1',
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
            className: 'rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center',
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement('div', { 
            className: 'text-sm font-medium mb-2',
            style: { color: 'var(--tt-text-secondary)' }
          }, 'Feedings / Day'),
          React.createElement('div', { 
            className: 'text-2xl font-bold',
            style: { color: 'var(--tt-feed)' }
          }, stats.avgFeedingsPerDay.toFixed(1)),
          React.createElement('div', { 
            className: 'text-xs mt-1',
            style: { color: 'var(--tt-text-tertiary)' }
          }, stats.labelText)
        ),
        React.createElement(
          'div',
          { 
            className: 'rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center',
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
          React.createElement('div', { 
            className: 'text-sm font-medium mb-2',
            style: { color: 'var(--tt-text-secondary)' }
          }, 'Time Between Feeds'),
          React.createElement('div', { 
            className: 'text-2xl font-bold',
            style: { color: 'var(--tt-feed)' }
          }, formatInterval(stats.avgInterval)),
          React.createElement('div', { 
            className: 'text-xs mt-1',
            style: { color: 'var(--tt-text-tertiary)' }
          }, stats.labelText)
        )
      ),

      // Volume History chart
      React.createElement(
        'div',
        { 
          className: 'rounded-2xl shadow-sm p-6 mt-4',
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
        React.createElement('div', { 
          className: 'text-sm font-medium mb-2.5 text-center',
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
                  className: 'overflow-x-auto overflow-y-hidden -mx-6 px-6',
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
                      }, `${item.count} feeds`)
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
window.TT.tabs.FeedingAnalyticsTab = FeedingAnalyticsTab;
