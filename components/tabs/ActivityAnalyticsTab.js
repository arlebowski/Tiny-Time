const ensureTabCache = (key) => {
  if (typeof window === 'undefined') return {};
  window.TT = window.TT || {};
  window.TT.cache = window.TT.cache || {};
  if (!window.TT.cache[key]) {
    window.TT.cache[key] = {};
  }
  return window.TT.cache[key];
};

const ActivityAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const cache = ensureTabCache('activityAnalytics');
  const cacheScope = `${familyId || 'none'}:${kidId || 'none'}`;
  const isCacheValid = cache.scope === cacheScope;
  const [allFeedings, setAllFeedings] = useState(() => (isCacheValid ? (cache.allFeedings || []) : []));
  const [sleepSessions, setSleepSessions] = useState(() => (isCacheValid ? (cache.sleepSessions || []) : []));
  const [sleepSettings, setSleepSettings] = useState(() => (isCacheValid ? (cache.sleepSettings || null) : null));
  const [loading, setLoading] = useState(() => (!isCacheValid || !cache.hydrated));
  const [timeframe, setTimeframe] = useState('day');
  
  // Get chevron icon
  const ChevronLeftIcon = window.TT?.shared?.icons?.ChevronLeftIcon || null;

  useEffect(() => {
    loadAnalytics();
  }, [kidId]);

  useEffect(() => {
    if (cache.scope !== cacheScope) {
      cache.scope = cacheScope;
      cache.hydrated = false;
      setAllFeedings([]);
      setSleepSessions([]);
      setSleepSettings(null);
      setLoading(true);
    }
  }, [cacheScope]);

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
      const sleeps = await firestoreStorage.getAllSleepSessions(kidId);
      setSleepSessions((sleeps || []).filter(s => !!s.endTime));
      const ss = await firestoreStorage.getSleepSettings();
      setSleepSettings(ss || null);
    } catch (e) {
      console.error('Failed to load activity data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cache.allFeedings = allFeedings;
    cache.sleepSessions = sleepSessions;
    cache.sleepSettings = sleepSettings;
    cache.scope = cacheScope;
    cache.hydrated = true;
  }, [allFeedings, sleepSessions, sleepSettings, cacheScope]);

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
        typeof Kanban !== 'undefined' && React.createElement(Kanban, {
          className: 'w-5 h-5',
          style: { color: 'var(--color-daily)' }
        }),
        React.createElement(
          'span',
          {
            className: 'text-[17.6px] font-semibold leading-6',
            style: { color: 'var(--color-daily)' }
          },
          'Daily Activity'
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
            { value: 'week', label: 'W' }
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
      React.createElement(DailyActivityChart, {
        viewMode: timeframe,
        feedings: allFeedings,
        sleepSessions: sleepSessions,
        sleepSettings: sleepSettings,
        suppressNow: false
      })
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.ActivityAnalyticsTab = ActivityAnalyticsTab;
