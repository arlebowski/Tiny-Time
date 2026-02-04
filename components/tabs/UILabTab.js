// ========================================
// UI LAB TAB (v4-only)
// ========================================

const UILabTab = ({ kidId, onClose }) => {
  const { useState, useEffect } = React;

  const [feedings, setFeedings] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [currentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kidId) return;

    setLoading(true);
    const fetchData = async () => {
      try {
        const feedingsData = await firestoreStorage.getFeedings(kidId);
        setFeedings(feedingsData || []);

        const sleepData = await firestoreStorage.getSleepSessions(kidId);
        setSleepSessions(sleepData || []);

        const weightData = await firestoreStorage.getBabyWeight(kidId);
        if (weightData && weightData.weight) {
          setBabyWeight(weightData.weight);
        }

        const settings = await firestoreStorage.getSleepSettings(kidId);
        setSleepSettings(settings);
      } catch (error) {
        console.error("Error fetching production data for UI Lab:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [kidId]);

  const formatFeedingsForCard = (feedingsData, targetOunces, date) => {
    if (!feedingsData || !Array.isArray(feedingsData)) {
      return { total: 0, target: targetOunces || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const todayFeedings = feedingsData.filter((f) => {
      const timestamp = f.timestamp || 0;
      return timestamp >= startOfDay.getTime() && timestamp <= endOfDay.getTime();
    });

    const total = todayFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
    const target = targetOunces || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;

    const timelineItems = todayFeedings
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .map((f) => ({
        id: f.id,
        ounces: f.ounces,
        timestamp: f.timestamp,
        notes: f.notes || null,
        photoURLs: f.photoURLs || null
      }));

    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].timestamp : null;

    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const formatSleepSessionsForCard = (sessions, targetHours, date) => {
    if (!sessions || !Array.isArray(sessions)) {
      return { total: 0, target: targetHours || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const todaySessions = sessions.filter((s) => {
      const startTime = s.startTime || 0;
      return startTime >= startOfDay.getTime() && startTime <= endOfDay.getTime();
    });

    const total = todaySessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const target = targetHours || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;

    const timelineItems = todaySessions
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        sleepType: s.sleepType || "night",
        isActive: !s.endTime,
        notes: s.notes || null,
        photoURLs: s.photoURLs || null
      }));

    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].startTime : null;

    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const targetOunces = (babyWeight || 0) * multiplier;
  const targetHours = sleepSettings?.sleepTargetHours || 14;
  const feedingCardData = formatFeedingsForCard(feedings, targetOunces, currentDate);
  const sleepCardData = formatSleepSessionsForCard(sleepSessions, targetHours, currentDate);

  return React.createElement("div", { className: "space-y-4" },
    React.createElement("div", { className: "flex items-center gap-3 mb-4" },
      React.createElement("button", {
        onClick: () => onClose(),
        className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
      }, React.createElement(ChevronLeft, { className: "w-5 h-5" })),
      React.createElement("h1", { className: "text-xl font-semibold text-gray-800" }, "UI Lab")
    ),
    React.createElement("div", { className: "text-sm text-gray-600" }, "UI Lab runs in v4 only."),
    loading
      ? React.createElement("div", { className: "text-center py-8 text-gray-500" }, "Loading production data...")
      : React.createElement(React.Fragment, null,
          window.TrackerCard && React.createElement(window.TrackerCard, {
            mode: "feeding",
            total: feedingCardData.total,
            target: feedingCardData.target,
            timelineItems: feedingCardData.timelineItems,
            lastEntryTime: feedingCardData.lastEntryTime,
            onItemClick: () => {}
          }),
          window.TrackerCard && React.createElement(window.TrackerCard, {
            mode: "sleep",
            total: sleepCardData.total,
            target: sleepCardData.target,
            timelineItems: sleepCardData.timelineItems,
            lastEntryTime: sleepCardData.lastEntryTime,
            onItemClick: () => {}
          })
        )
  );
};

// Export
window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.UILabTab = UILabTab;
