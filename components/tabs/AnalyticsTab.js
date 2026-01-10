const AnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [allFeedings, setAllFeedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('day');
  const [sleepSessions, setSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const sleepHistoryScrollRef = React.useRef(null);
  const [stats, setStats] = useState({
    avgVolumePerFeed: 0,
    avgVolumePerDay: 0,
    avgFeedingsPerDay: 0,
    avgInterval: 0,
    chartData: []
  });

  const chartScrollRef = React.useRef(null);

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
      setSleepSessions([]);
      setSleepSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const feedings = await firestoreStorage.getAllFeedings();
      setAllFeedings(feedings);
      calculateStats(feedings);

      try {
        const sleeps = await firestoreStorage.getAllSleepSessions(kidId);
        setSleepSessions((sleeps || []).filter(s => !!s.endTime));
      } catch (e) {
        console.error('Failed to load sleep sessions for analytics', e);
        setSleepSessions([]);
      }

      try {
        const ss = await firestoreStorage.getSleepSettings();
        setSleepSettings(ss || null);
      } catch (e) {
        console.error('Failed to load sleep settings for analytics', e);
        setSleepSettings(null);
      }
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

  const sleepChartMeta = useMemo(() => {
    const buckets = sleepBuckets || [];
    const maxTotal = Math.max(0, ...buckets.map(b => Number(b?.totalHrs || 0)));
    // Nice max: round up to nearest 2h, with a minimum of 4h for readability
    const niceMax = (() => {
      const base = Math.max(4, maxTotal);
      return Math.ceil(base / 2) * 2;
    })();

    // Ticks every 2 hours (or every 4 if huge)
    const step = niceMax >= 16 ? 4 : 2;
    const ticks = [];
    for (let t = 0; t <= niceMax; t += step) ticks.push(t);

    return { maxY: niceMax, ticks, step };
  }, [sleepBuckets]);

  // Auto-scroll Sleep History to the right — match Volume History pattern 1:1
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
    // Defer to end of event loop so layout & scrollWidth are correct (same as Volume History)
    setTimeout(() => {
      if (!container) return;
      try { container.scrollLeft = container.scrollWidth; } catch {}
    }, 0);
  }, [loading, timeframe, sleepBuckets]);

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

  // Chart data: Always last 7 days (regardless of timeframe)
  const sleepChartData = useMemo(() => {
    const now = new Date();
    const makeDayKey = (d) => _dateKeyLocal(d.getTime());
    const dataByDay = sleepByDay || {};
    
    // Get last 7 days (6 days ago to today)
    const keys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      keys.push(makeDayKey(d));
    }
    
    return keys.map(k => {
      const date = (() => {
        const parts = String(k || '').split('-');
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (!y || !m || !d) return new Date();
        return new Date(y, m - 1, d);
      })();
      
      return {
        key: k,
        date: date,
        totalHrs: (dataByDay[k]?.totalHrs || 0),
        ...(dataByDay[k] || {})
      };
    });
  }, [sleepByDay]);

  // Calculate 7-day average with same logic as sleepCards
  const sleepChartAverage = useMemo(() => {
    const bucketsWithData = sleepChartData.filter(d => (d.totalHrs || 0) > 0 || (d.count || 0) > 0).length;
    const excludeToday = bucketsWithData > 7;
    const todayKey = _dateKeyLocal(Date.now());
    const lastBucketIsToday = sleepChartData.length > 0 && sleepChartData[sleepChartData.length - 1]?.key === todayKey;
    
    let daysToAverage = sleepChartData;
    if (excludeToday && lastBucketIsToday) {
      // Exclude today: take first 6 days (remove last one which is today)
      daysToAverage = sleepChartData.slice(0, -1);
    } else {
      // Include today: take all 7 days
      daysToAverage = sleepChartData;
    }
    
    const totalHrs = daysToAverage.reduce((sum, d) => sum + (d.totalHrs || 0), 0);
    return daysToAverage.length > 0 ? totalHrs / daysToAverage.length : 0;
  }, [sleepChartData]);

  // Aggregate feedings by day (similar to aggregateSleepByDay)
  const feedingByDay = useMemo(() => {
    const map = {}; // dateKey -> { volume, count }
    (allFeedings || []).forEach((f) => {
      const timestamp = Number(f?.timestamp);
      if (!Number.isFinite(timestamp)) return;
      const key = _dateKeyLocal(timestamp);
      const ounces = Number(f?.ounces || 0);
      if (!map[key]) map[key] = { volume: 0, count: 0 };
      map[key].volume += ounces;
      map[key].count += 1;
    });
    return map;
  }, [allFeedings]);

  // Chart data: Always last 7 days (regardless of timeframe)
  const feedingChartData = useMemo(() => {
    const now = new Date();
    const makeDayKey = (d) => _dateKeyLocal(d.getTime());
    const dataByDay = feedingByDay || {};
    
    // Get last 7 days (6 days ago to today)
    const keys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      keys.push(makeDayKey(d));
    }
    
    return keys.map(k => {
      const date = (() => {
        const parts = String(k || '').split('-');
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (!y || !m || !d) return new Date();
        return new Date(y, m - 1, d);
      })();
      
      return {
        key: k,
        date: date,
        volume: (dataByDay[k]?.volume || 0),
        count: (dataByDay[k]?.count || 0),
        ...(dataByDay[k] || {})
      };
    });
  }, [feedingByDay]);

  // Calculate 7-day average with same logic as sleepCards
  const feedingChartAverage = useMemo(() => {
    const bucketsWithData = feedingChartData.filter(d => (d.volume || 0) > 0 || (d.count || 0) > 0).length;
    const excludeToday = bucketsWithData > 7;
    const todayKey = _dateKeyLocal(Date.now());
    const lastBucketIsToday = feedingChartData.length > 0 && feedingChartData[feedingChartData.length - 1]?.key === todayKey;
    
    let daysToAverage = feedingChartData;
    if (excludeToday && lastBucketIsToday) {
      // Exclude today: take first 6 days (remove last one which is today)
      daysToAverage = feedingChartData.slice(0, -1);
    } else {
      // Include today: take all 7 days
      daysToAverage = feedingChartData;
    }
    
    const totalVolume = daysToAverage.reduce((sum, d) => sum + (d.volume || 0), 0);
    return daysToAverage.length > 0 ? totalVolume / daysToAverage.length : 0;
  }, [feedingChartData]);

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

  if (allFeedings.length === 0) {
    return React.createElement(
      'div',
      { 
        className: 'rounded-2xl shadow-lg p-6',
        style: { backgroundColor: 'var(--tt-card-bg)' }
      },
      React.createElement(
        'div',
        {
          className: 'text-center py-8',
          style: { color: 'var(--tt-text-tertiary)' }
        },
        'No feeding data yet. Start logging feedings to see analytics!'
      )
    );
  }

  const maxVolume = Math.max(
    ...stats.chartData.map(d => d.volume)
  );

  const feedLabelIcon = (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"]) || Milk;
  const sleepLabelIcon = (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"]) || Moon;

  return React.createElement(
    'div',
    { className: 'space-y-4' },

    // =====================================================
    // PHASE 1: HIGHLIGHTS (ADD ONLY — DO NOT TOUCH BELOW)
    // =====================================================
    React.createElement(
      'div',
      { className: 'space-y-3' },

      // Feeding highlight
      React.createElement(
        HighlightCard,
        {
          icon: feedLabelIcon,
          label: 'Feeding',
          insightText: [
            'Levi has been eating a bit less in the last three days.',
            'But that\'s totally fine!'
          ],
          categoryColor: 'var(--tt-feed)',
          isFeeding: true,
          onClick: () => setActiveTab('analytics-feeding')
        },
        React.createElement(FeedingChart, {
          data: feedingChartData,
          average: feedingChartAverage
        })
      ),

      // Sleep highlight
      React.createElement(
        HighlightCard,
        {
          icon: sleepLabelIcon,
          label: 'Sleep',
          insightText: [
            'Levi has been sleeping great this week!',
            ''
          ],
          categoryColor: 'var(--tt-sleep)',
          onClick: () => setActiveTab('analytics-sleep')
        },
        React.createElement(SleepChart, {
          data: sleepChartData,
          average: sleepChartAverage
        })
      ),

      // Daily Activity highlight
      React.createElement(
        HighlightCard,
        {
          icon: Kanban,
          label: 'Daily Activity',
          insightText: [
            'Levi has been eating and sleeping like a champ this week!',
            'Great work, Levi!'
          ],
          categoryColor: 'var(--color-daily)',
          onClick: () => setActiveTab('analytics-activity')
        }
      )
    )
  );
};

// ========================================
// TINY TRACKER - PART 6
// Family Tab - Multi-kid + Theme + Photo + Members
// ========================================

// Small inline "info" button used for tooltips in Family tab
const InfoDot = ({ onClick, title = "Info" }) =>
  React.createElement('button', {
    type: 'button',
    onClick,
    title,
    className: "ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-[11px] font-semibold text-gray-600 bg-white active:scale-[0.98]"
  }, 'i');

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.AnalyticsTab = AnalyticsTab;
