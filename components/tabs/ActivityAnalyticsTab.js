const ActivityAnalyticsTab = ({ user, kidId, familyId, setActiveTab }) => {
  const [allFeedings, setAllFeedings] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('day');

  // Get icons
  const ChevronLeft = window.TT?.shared?.icons?.ChevronLeftIcon || window.TT?.shared?.icons?.["chevron-left"] || (() => React.createElement('span', null, '←'));

  useEffect(() => {
    loadAnalytics();
  }, [kidId]);

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
      }, 'Daily Activity')
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
