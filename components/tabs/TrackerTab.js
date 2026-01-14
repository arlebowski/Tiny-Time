/* TrackerTab.js */
// --- Feed sessionization: combine nearby small feeds into a single "session" ---
// This prevents top-off feeds from dragging median volume down and making intervals look too short.
const buildFeedingSessions = (feedings, windowMinutes = 45) => {
  const getOz = (f) => {
    const oz = Number(f?.ounces ?? f?.amountOz ?? f?.amount ?? f?.volumeOz ?? f?.volume);
    return Number.isFinite(oz) && oz > 0 ? oz : 0;
  };
  const sorted = [...(feedings || [])]
    .filter(f => f && Number.isFinite(Number(f.timestamp)))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const sessions = [];
  const windowMs = windowMinutes * 60 * 1000;
  let cur = null;

  for (const f of sorted) {
    const ts = Number(f.timestamp);
    const oz = getOz(f);
    if (!cur) {
      cur = { startTime: ts, endTime: ts, totalOz: oz, items: [f] };
      continue;
    }
    if (ts - cur.endTime <= windowMs) {
      cur.endTime = ts;
      cur.totalOz += oz;
      cur.items.push(f);
    } else {
      sessions.push(cur);
      cur = { startTime: ts, endTime: ts, totalOz: oz, items: [f] };
    }
  }
  if (cur) sessions.push(cur);

  // Represent session time as startTime (simple, stable)
  return sessions.map(s => ({
    timestamp: s.startTime,
    startTime: s.startTime,
    endTime: s.endTime,
    ounces: Math.round(s.totalOz * 10) / 10,
    _sessionCount: s.items.length
  }));
};

const percentile = (arr, p) => {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
};
// ========================================
// TINY TRACKER - PART 4  
// Tracker Tab - Main Feeding Interface
// ========================================

// ========================================
// UI VERSION HELPERS (Single Source of Truth)
// ========================================
// Initialize shared UI version helpers (only once)
// Note: This is initialized in SettingsTab.js with Firestore support
// This check ensures it exists, but won't re-initialize if already set
if (typeof window !== 'undefined' && !window.TT?.shared?.uiVersion) {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  
  // Cached version (updated from Firestore)
  let cachedVersion = 'v2';
  let versionListeners = [];
  let unsubscribeListener = null;
  
  // Helper to get UI version (defaults to v2 for backward compatibility)
  window.TT.shared.uiVersion = {
    getUIVersion: () => {
      // Return cached version (will be updated from Firestore)
      return cachedVersion;
    },
    shouldUseNewUI: (version) => version !== 'v1',
    getCardDesign: (version) => version === 'v3' ? 'v3' : (version === 'v2' ? 'new' : 'current'),
    
    // Set global UI version in Firestore (for all users)
    setUIVersion: async (version) => {
      if (!version || !['v1', 'v2', 'v3'].includes(version)) {
        console.error('Invalid UI version:', version);
        return;
      }
      
      try {
        // Access firebase from global scope
        if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
          const db = window.firebase.firestore();
          await db.collection('appConfig').doc('global').set({
            uiVersion: version,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          // Update cache immediately
          cachedVersion = version;
          // Notify all listeners
          versionListeners.forEach(listener => listener(version));
        } else {
          console.error('Firebase not available');
        }
      } catch (error) {
        console.error('Error setting global UI version:', error);
        throw error;
      }
    },
    
    // Subscribe to version changes
    onVersionChange: (callback) => {
      versionListeners.push(callback);
      return () => {
        versionListeners = versionListeners.filter(cb => cb !== callback);
      };
    },
    
    // Initialize: fetch from Firestore and set up real-time listener
    init: async () => {
      if (typeof window === 'undefined' || !window.firebase || !window.firebase.firestore) {
        // Fallback to localStorage if Firebase not available
        if (window.localStorage) {
          const version = window.localStorage.getItem('tt_ui_version');
          if (version && ['v1', 'v2', 'v3'].includes(version)) {
            cachedVersion = version;
          }
        }
        return;
      }
      
      try {
        const db = window.firebase.firestore();
        // First, try to get from Firestore
        const doc = await db.collection('appConfig').doc('global').get();
        if (doc.exists) {
          const data = doc.data();
          if (data.uiVersion && ['v1', 'v2', 'v3'].includes(data.uiVersion)) {
            cachedVersion = data.uiVersion;
            // Notify all listeners
            versionListeners.forEach(listener => listener(cachedVersion));
          }
        } else {
          // Document doesn't exist, create it with default
          await db.collection('appConfig').doc('global').set({
            uiVersion: 'v2',
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          });
          cachedVersion = 'v2';
        }
        
        // Set up real-time listener
        unsubscribeListener = db.collection('appConfig').doc('global')
          .onSnapshot((doc) => {
            if (doc.exists) {
              const data = doc.data();
              if (data.uiVersion && ['v1', 'v2', 'v3'].includes(data.uiVersion)) {
                const newVersion = data.uiVersion;
                if (newVersion !== cachedVersion) {
                  cachedVersion = newVersion;
                  // Notify all listeners
                  versionListeners.forEach(listener => listener(cachedVersion));
                }
              }
            }
          });
      } catch (error) {
        console.error('Error initializing UI version from Firestore:', error);
        // Fallback to localStorage
        if (window.localStorage) {
          const version = window.localStorage.getItem('tt_ui_version');
          if (version && ['v1', 'v2', 'v3'].includes(version)) {
            cachedVersion = version;
          }
        }
      }
    }
  };
  
  // Initialize on load
  if (typeof window !== 'undefined') {
    // Wait a bit for Firebase to be available
    setTimeout(() => {
      window.TT.shared.uiVersion.init();
    }, 100);
  }
}

const TrackerTab = ({ user, kidId, familyId, requestOpenInputSheetMode = null, onRequestOpenInputSheetHandled = null }) => {
  // UI Version - single source of truth (v1, v2, or v3)
  // UI Versions:
  // - v1: Old UI (useNewUI = false)
  // - v2: New UI with current tracker cards (useNewUI = true, cardDesign = 'current')
  // - v2: New UI with new tracker cards (useNewUI = true, cardDesign = 'new')
  const [uiVersion, setUiVersion] = useState(() => {
    return (window.TT?.shared?.uiVersion?.getUIVersion || (() => 'v2'))();
  });
  const useNewUI = (window.TT?.shared?.uiVersion?.shouldUseNewUI || ((v) => v !== 'v1'))(uiVersion);
  
  // Feature flag for TodayCard - controlled by localStorage (can be toggled from UI Lab)
  const [showTodayCard, setShowTodayCard] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('tt_show_today_card');
      return stored !== null ? stored === 'true' : false; // Default to false
    }
    return false;
  });
  
  // Listen for changes to the feature flags
  React.useEffect(() => {
    // Listen for global UI version changes from Firestore
    let unsubscribeVersion = null;
    if (window.TT?.shared?.uiVersion?.onVersionChange) {
      unsubscribeVersion = window.TT.shared.uiVersion.onVersionChange((newVersion) => {
        setUiVersion(newVersion);
        // Force reload to apply changes
        window.location.reload();
      });
    }
    
    const handleStorageChange = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const todayCardStored = window.localStorage.getItem('tt_show_today_card');
        setShowTodayCard(todayCardStored !== null ? todayCardStored === 'true' : false);
      }
    };
    
    // Listen for storage events (when changed from another tab/window)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab changes)
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      if (unsubscribeVersion) unsubscribeVersion();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [ounces, setOunces] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [feedings, setFeedings] = useState([]);
  const [allFeedings, setAllFeedings] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [allSleepSessions, setAllSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [yesterdayConsumed, setYesterdayConsumed] = useState(0);
  const [yesterdayFeedingCount, setYesterdayFeedingCount] = useState(0);
  const [sleepTodayMs, setSleepTodayMs] = useState(0);
  const [sleepTodayCount, setSleepTodayCount] = useState(0);
  const [sleepYesterdayMs, setSleepYesterdayMs] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  // State for smooth date transitions - preserve previous values while loading
  const [prevFeedingCardData, setPrevFeedingCardData] = useState(null);
  const [prevSleepCardData, setPrevSleepCardData] = useState(null);
  const [isDateTransitioning, setIsDateTransitioning] = useState(false);
  const transitionIdRef = React.useRef(0);
  const [transitionPending, setTransitionPending] = useState(0);
  const prevDateRef = React.useRef(currentDate);
  const [editingFeedingId, setEditingFeedingId] = useState(null);
  const [editOunces, setEditOunces] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingSleepId, setEditingSleepId] = useState(null);
  const [sleepEditStartStr, setSleepEditStartStr] = useState('');
  const [sleepEditEndStr, setSleepEditEndStr] = useState('');
  const [loading, setLoading] = useState(true);
  const [whatsNextCardAnimating, setWhatsNextCardAnimating] = useState(null); // 'entering' | 'exiting' | null
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [logMode, setLogMode] = useState('feeding');
  const [cardVisible, setCardVisible] = useState(false);
  const cardRef = React.useRef(null);
  
  // Detail sheet state
  const [showFeedDetailSheet, setShowFeedDetailSheet] = useState(false);
  const [showSleepDetailSheet, setShowSleepDetailSheet] = useState(false);
  const [selectedFeedEntry, setSelectedFeedEntry] = useState(null);
  const [selectedSleepEntry, setSelectedSleepEntry] = useState(null);
  const [showInputSheet, setShowInputSheet] = useState(false);
  const [inputSheetMode, setInputSheetMode] = useState('feeding');

  // AI-generated "What's Next" state
  const [whatsNextText, setWhatsNextText] = useState('Feed around 2:00pm');
  const generatingRef = React.useRef(false);
  const lastDataHashRef = React.useRef('');
  const [whatsNextAccordionOpen, setWhatsNextAccordionOpen] = useState(false);
  const [scheduleReady, setScheduleReady] = useState(false); // Track when schedule is built
  // Store the fixed predicted time (not recalculated as time passes)
  const predictedTimeRef = React.useRef(null); // { type: 'feed'|'nap'|'wake', time: Date, text: string }
  
  // Store the full day schedule (using state so accordion re-renders when it changes)
  const [dailySchedule, setDailySchedule] = React.useState(null); // Array of { type: 'feed'|'sleep', time: Date, patternBased: boolean }
  const dailyScheduleRef = React.useRef(null); // Keep ref for backwards compatibility
  const lastScheduleUpdateRef = React.useRef(0); // Timestamp of last schedule update
  
  // Track last AI call time to avoid quota limits (persist across page reloads)
  const getLastAICallTime = () => {
    try {
      const stored = localStorage.getItem('tt_last_ai_call');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };
  const setLastAICallTime = (timestamp) => {
    try {
      localStorage.setItem('tt_last_ai_call', String(timestamp));
    } catch {
      // Ignore localStorage errors
    }
  };
  const lastAICallRef = React.useRef(getLastAICallTime());
  
  // Separate cooldown tracker for schedule building (independent from "what's next")
  const getLastScheduleAICallTime = () => {
    try {
      const stored = localStorage.getItem('tt_last_schedule_ai_call');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };
  const setLastScheduleAICallTime = (timestamp) => {
    try {
      localStorage.setItem('tt_last_schedule_ai_call', String(timestamp));
    } catch {
      // Ignore localStorage errors
    }
  };
  const lastScheduleAICallRef = React.useRef(getLastScheduleAICallTime());

  // Format time as h:mma (e.g., "12:30pm") - no rounding
  const formatTimeHmma = (date) => {
    if (!date || !(date instanceof Date)) return '';
    const h = date.getHours();
    const m = date.getMinutes();
    const hour = h % 12 || 12;
    const minute = String(m).padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    return `${hour}:${minute}${ampm}`;
  };
  // Calculate age in months
  const calculateAgeInMonths = (birthDate) => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const now = new Date();
    return (
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth())
    );
  };

  // Analyze historical intervals from last 7 days, weighted by recency
  const analyzeHistoricalIntervals = (feedings, sleepSessions) => {
    const now = Date.now();
    const _getOunces = (f) => {
      const v = Number(f?.ounces ?? f?.amountOz ?? f?.amount ?? f?.volumeOz);
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const _getSleepDurationHours = (s) => {
      const start = Number(s?.startTime);
      const end = Number(s?.endTime);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return (end - start) / (1000 * 60 * 60);
    };
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // IMPORTANT: use feeding sessions, not raw feed logs
    const recentFeedingsRaw = (feedings || []).filter(f => f && f.timestamp >= sevenDaysAgo);
    const recentFeedingSessions = buildFeedingSessions(recentFeedingsRaw, 45);

    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
    
    // Filter to last 7 days and sort chronologically
    const recentFeedings = recentFeedingSessions;

    // Overall session volume stats (useful for floors / sanity)
    const allSessionOz = recentFeedings.map(f => Number(f.ounces)).filter(v => Number.isFinite(v) && v > 0);
    const overallSessionMedianOz = percentile(allSessionOz, 0.5);
    
    const recentSleep = (sleepSessions || [])
      .filter(s => s.startTime && s.startTime >= sevenDaysAgo && s.endTime && !s.isActive)
      .sort((a, b) => a.startTime - b.startTime);
    
    // Calculate feed intervals (in hours) between SESSIONS (not raw logs)
    const feedingIntervals = [];
    for (let i = 1; i < recentFeedings.length; i++) {
      const intervalHours = (recentFeedings[i].timestamp - recentFeedings[i - 1].timestamp) / (1000 * 60 * 60);
      if (intervalHours > 0.5 && intervalHours < 8) { // Filter out weird intervals
        feedingIntervals.push(intervalHours);
      }
    }
    const feedIntervalHours = feedingIntervals.length > 0
      ? percentile(feedingIntervals, 0.5) // median is more robust than mean
      : 3.5;

    // Minimum plausible gap between feeds (used later when building schedule)
    const minFeedGapHours = Math.max(2.5, feedIntervalHours * 0.75);
    
    // Analyze time-of-day patterns using clustering approach
    // Cluster events within 1 hour of each other across different days, then average them
    
    // Helper: Convert timestamp to minutes since midnight (for time comparison across days)
    const minutesSinceMidnight = (timestamp) => {
      const date = new Date(timestamp);
      return date.getHours() * 60 + date.getMinutes();
    };

    const getFeedOz = (f) => {
      const oz = Number(f?.ounces ?? f?.volume ?? f?.amount ?? 0);
      return Number.isFinite(oz) && oz > 0 ? oz : null;
    };
    
    // Helper: Check if two times are within 1 hour of each other (across days)
    const withinOneHour = (time1Minutes, time2Minutes) => {
      // Handle wrap-around (e.g., 11:30pm and 12:15am are close)
      const diff1 = Math.abs(time1Minutes - time2Minutes);
      const diff2 = Math.abs(time1Minutes - (time2Minutes + 24 * 60)); // next day
      const diff3 = Math.abs((time1Minutes + 24 * 60) - time2Minutes); // previous day
      return Math.min(diff1, diff2, diff3) <= 60; // 1 hour = 60 minutes
    };
    
    // Cluster feedings by time proximity (within 1 hour across days)
    const feedClusters = [];
    recentFeedings.forEach(f => {
      const timeMinutes = minutesSinceMidnight(f.timestamp);
      const oz = getFeedOz(f);
      // Find existing cluster this feeding belongs to
      let foundCluster = null;
      for (const cluster of feedClusters) {
        // Check if this feeding is within 1 hour of any feeding in the cluster
        const isClose = cluster.times.some(t => withinOneHour(timeMinutes, t));
        if (isClose) {
          foundCluster = cluster;
          break;
        }
      }
      
      if (foundCluster) {
        // Add to existing cluster
        foundCluster.times.push(timeMinutes);
        foundCluster.timestamps.push(f.timestamp);
        if (oz != null) foundCluster.ounces.push(oz);
      } else {
        // Create new cluster
        feedClusters.push({
          times: [timeMinutes],
          timestamps: [f.timestamp],
          ounces: oz != null ? [oz] : []
        });
      }
    });
    
    // Calculate average time for each cluster and find the most common one
    const feedPatterns = feedClusters
      .map(cluster => {
        // Robust time center (median), plus window (p10..p90)
        const centerMinutes = percentile(cluster.times, 0.5);
        const windowStartMinutes = percentile(cluster.times, 0.10);
        const windowEndMinutes = percentile(cluster.times, 0.90);

        const avgMinutes = Math.round(centerMinutes); // keep field name for downstream compatibility
        const hour = Math.floor(avgMinutes / 60) % 24;
        const minute = avgMinutes % 60;

        // Robust volume stats for this time cluster
        const volumeMedianOz = percentile(cluster.ounces || [], 0.5);
        const volumeP10Oz = percentile(cluster.ounces || [], 0.10);
        const volumeP90Oz = percentile(cluster.ounces || [], 0.90);

        // Floor volume guidance so we don't suggest tiny feeds.
        // This works well once sessions are used (top-offs are merged).
        const flooredMedian = (overallSessionMedianOz && volumeMedianOz)
          ? Math.max(volumeMedianOz, overallSessionMedianOz * 0.85)
          : (volumeMedianOz ?? overallSessionMedianOz ?? null);
        return {
          hour,
          minute,
          count: cluster.times.length,
          avgMinutes,
          windowStartMinutes,
          windowEndMinutes,
          volumeMedianOz: flooredMedian,
          volumeP10Oz,
          volumeP90Oz
        };
      })
      .filter(pattern => pattern.count >= 3) // Only patterns with 3+ occurrences
      .sort((a, b) => b.count - a.count); // Sort by frequency
    
    // Select the best pattern: prioritize next upcoming pattern today, then most frequent
    let commonTimePattern = null;
    if (feedPatterns.length > 0) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Find patterns that are upcoming today (in the future)
      const upcomingPatterns = feedPatterns.filter(p => {
        const patternMinutes = p.avgMinutes;
        return patternMinutes > nowMinutes; // Pattern time is later today
      });
      
      if (upcomingPatterns.length > 0) {
        // Use the closest upcoming pattern (earliest in the day that's still in the future)
        const nextPattern = upcomingPatterns.reduce((closest, current) => {
          return current.avgMinutes < closest.avgMinutes ? current : closest;
        });
        commonTimePattern = {
          hour: nextPattern.hour,
          minute: nextPattern.minute
        };
      } else {
        // No patterns upcoming today - use the most frequent one (will be for tomorrow)
        commonTimePattern = {
          hour: feedPatterns[0].hour,
          minute: feedPatterns[0].minute
        };
      }
    }
    
    // Cluster sleep sessions by start time proximity (within 1 hour across days)
    const sleepClusters = [];
    recentSleep.forEach(s => {
      const timeMinutes = minutesSinceMidnight(s.startTime);
      const durHrs = _getSleepDurationHours(s);
      // Find existing cluster this sleep belongs to
      let foundCluster = null;
      for (const cluster of sleepClusters) {
        const isClose = cluster.times.some(t => withinOneHour(timeMinutes, t));
        if (isClose) {
          foundCluster = cluster;
          break;
        }
      }
      
      if (foundCluster) {
        foundCluster.times.push(timeMinutes);
        foundCluster.timestamps.push(s.startTime);
        if (durHrs !== null) foundCluster.durations.push(durHrs);
      } else {
        sleepClusters.push({
          times: [timeMinutes],
          timestamps: [s.startTime],
          durations: durHrs !== null ? [durHrs] : []
        });
      }
    });
    
    // Calculate average time for each sleep cluster
    const sleepPatterns = sleepClusters
      .map(cluster => {
        const avgMinutes = Math.round(
          cluster.times.reduce((sum, t) => sum + t, 0) / cluster.times.length
        );
        const hour = Math.floor(avgMinutes / 60) % 24;
        const minute = avgMinutes % 60;
        const avgDurationHours = (cluster.durations && cluster.durations.length > 0)
          ? Math.round((cluster.durations.reduce((sum, v) => sum + v, 0) / cluster.durations.length) * 10) / 10
          : null;
        return {
          hour,
          minute,
          count: cluster.times.length,
          avgMinutes,
          avgDurationHours
        };
      })
      .filter(pattern => pattern.count >= 3) // Only patterns with 3+ occurrences
      .sort((a, b) => b.count - a.count); // Sort by frequency
    
    // Debug: Log pattern detection (only when data actually changes to avoid spam)
    // Removed constant logging - use window.validateWhatsNext() or window.showDailySchedule() for debugging
    
    return {
      avgInterval: feedIntervalHours,
      minFeedGapHours,
      lastFeedingTime: recentFeedings.length > 0 ? recentFeedings[recentFeedings.length - 1].timestamp : null,
      commonTimePattern,
      feedIntervals: feedingIntervals.length,
      recentFeedings, // Return for accordion use
      feedPatterns, // Return all detected feed patterns for schedule generation
      sleepPatterns, // Return all detected sleep patterns for schedule generation
      feedClusters, // Return clusters for debugging
      sleepClusters // Return sleep clusters for debugging
    };
  };

  // Build optimal schedule for today from patterns
  // Build schedule using AI to consolidate patterns into a single timeline
  const buildAISchedule = async (analysis, feedIntervalHours, ageInMonths = 0, kidId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMilliseconds(0);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Format patterns for AI
    const feedPatternsList = (analysis.feedPatterns || [])
      .filter(p => p.avgMinutes >= nowMinutes - 30) // Only future or recent patterns
      .map(p => {
        const timeStr = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
        const period = p.hour >= 12 ? (p.hour === 12 ? 'pm' : p.hour > 12 ? `${p.hour - 12}pm` : 'am') : `${p.hour}am`;
        const displayTime = p.hour === 0 ? `12:${String(p.minute).padStart(2, '0')}am` :
                          p.hour < 12 ? `${p.hour}:${String(p.minute).padStart(2, '0')}am` :
                          p.hour === 12 ? `12:${String(p.minute).padStart(2, '0')}pm` :
                          `${p.hour - 12}:${String(p.minute).padStart(2, '0')}pm`;
        return `- ${displayTime} (${p.count} occurrences)`;
      })
      .join('\n');
    
    const sleepPatternsList = (analysis.sleepPatterns || [])
      .filter(p => p.avgMinutes >= nowMinutes - 30) // Only future or recent patterns
      .map(p => {
        const displayTime = p.hour === 0 ? `12:${String(p.minute).padStart(2, '0')}am` :
                          p.hour < 12 ? `${p.hour}:${String(p.minute).padStart(2, '0')}am` :
                          p.hour === 12 ? `12:${String(p.minute).padStart(2, '0')}pm` :
                          `${p.hour - 12}:${String(p.minute).padStart(2, '0')}pm`;
        return `- ${displayTime} (${p.count} occurrences)`;
      })
      .join('\n');
    
    const currentTime = formatTimeHmma(now);
    const avgInterval = analysis.avgInterval || feedIntervalHours;
    
    // Build AI prompt
    const prompt = `You are a baby care assistant. I need you to create a single optimal timeline for TODAY based on detected patterns.

Current time: ${currentTime}
Baby's age: ${ageInMonths} months
Typical feed interval: ${avgInterval.toFixed(1)} hours

DETECTED FEED PATTERNS (from last 7 days):
${feedPatternsList || 'None detected'}

DETECTED SLEEP PATTERNS (from last 7 days):
${sleepPatternsList || 'None detected'}

TASK: Create a single, consolidated timeline for TODAY starting from now (${currentTime}).

Rules:
1. Consolidate overlapping patterns (if multiple patterns suggest the same time, pick the most frequent one)
2. Account for typical intervals (${avgInterval.toFixed(1)} hours between feeds)
3. Only include feed and sleep events - DO NOT include wake events
4. Only include events from now onwards (don't include past events)
5. Make it realistic for a ${ageInMonths}-month-old baby
6. Each time should appear only once - consolidate all duplicates

OUTPUT FORMAT (JSON array):
[
  {"type": "feed", "time": "9:30am", "patternCount": 6},
  {"type": "sleep", "time": "11:00am", "patternCount": 5},
  {"type": "feed", "time": "1:00pm", "patternCount": 7}
]

IMPORTANT:
- Output ONLY valid JSON, no other text
- Time format: "h:mma" (e.g., "9:30am", "2:15pm", "12:00pm")
- DO NOT include wake events - only "feed" and "sleep" types
- Don't include events in the past
- Consolidate duplicates - each time should appear only once per event type`;

    try {
      // Check AI cooldown - use separate shorter cooldown for schedule building (15 min, independent from "what's next")
      const nowMs = Date.now();
      const scheduleAICooldownMs = 15 * 60 * 1000; // 15 minutes for schedule building
      const storedLastScheduleCall = getLastScheduleAICallTime();
      const lastScheduleAICall = lastScheduleAICallRef.current > storedLastScheduleCall ? lastScheduleAICallRef.current : storedLastScheduleCall;
      const timeSinceLastScheduleAI = nowMs - lastScheduleAICall;
      
      console.log('[Schedule] AI cooldown check:', {
        timeSinceLastScheduleAI: Math.round(timeSinceLastScheduleAI / 1000 / 60) + ' minutes',
        cooldownRequired: Math.round(scheduleAICooldownMs / 1000 / 60) + ' minutes',
        canCallAI: timeSinceLastScheduleAI >= scheduleAICooldownMs
      });
      
      if (timeSinceLastScheduleAI >= scheduleAICooldownMs && typeof getAIResponse === 'function' && kidId) {
        console.log('[Schedule] Calling AI to generate schedule...');
        const aiResponse = await getAIResponse(prompt, kidId);
        console.log('[Schedule] AI response received:', aiResponse ? 'Yes' : 'No');
        
        // Update schedule-specific cooldown (separate from "what's next" cooldown)
        if (aiResponse) {
          lastScheduleAICallRef.current = nowMs;
          setLastScheduleAICallTime(nowMs);
        }
        
        if (aiResponse) {
          // Try to parse JSON from response
          let scheduleData = null;
          try {
            // Extract JSON from response (might have markdown code blocks)
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              scheduleData = JSON.parse(jsonMatch[0]);
            } else {
              scheduleData = JSON.parse(aiResponse);
            }
          } catch (e) {
            console.warn('[Schedule] Failed to parse AI response as JSON:', e);
            // Fall through to fallback
          }
          
          if (scheduleData && Array.isArray(scheduleData)) {
            // Convert AI response to schedule format
            const schedule = [];
            scheduleData.forEach(item => {
              if (!item.type || !item.time) return;
              
              // Parse time string (e.g., "9:30am" or "2:15pm")
              const timeMatch = item.time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
              if (!timeMatch) return;
              
              let hour = parseInt(timeMatch[1], 10);
              const minute = parseInt(timeMatch[2], 10);
              const isPm = timeMatch[3].toLowerCase() === 'pm';
              
              if (isPm && hour !== 12) hour += 12;
              if (!isPm && hour === 12) hour = 0;
              
              const scheduleTime = new Date(today);
              scheduleTime.setHours(hour, minute, 0, 0);
              scheduleTime.setSeconds(0);
              scheduleTime.setMilliseconds(0);
              
              // Skip wake events entirely
              if (item.type === 'wake') {
                return; // Skip wake events
              }
              
              // Only add if in the future or within last 30 minutes
              if (scheduleTime.getTime() >= now.getTime() - (30 * 60 * 1000)) {
                const event = {
                  type: item.type,
                  time: scheduleTime,
                  patternBased: true,
                  patternCount: item.patternCount || 0
                };
                
                schedule.push(event);
              }
            });
            
            // Sort by time
            schedule.sort((a, b) => a.time.getTime() - b.time.getTime());
            
            // Filter out any wake events that might have been included
            const filteredSchedule = schedule.filter(e => e.type !== 'wake');
            
            if (filteredSchedule.length > 0) {
              console.log('[Schedule] AI generated schedule with', filteredSchedule.length, 'events (after filtering wakes)');
              return filteredSchedule;
            }
          }
        }
      }
    } catch (error) {
      // Check if it's a quota error (429) - if so, use longer cooldown
      const isQuotaError = error?.status === 429 || 
                          error?.quotaExceeded ||
                          error?.message?.includes('429') ||
                          error?.message?.includes('quota') ||
                          error?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
        console.warn('[Schedule] AI quota exceeded (will use fallback for extended period):', error);
        // Set cooldown to 2 hours for quota errors to prevent further calls
        const extendedCooldown = 2 * 60 * 60 * 1000; // 2 hours
        lastScheduleAICallRef.current = nowMs - extendedCooldown + (15 * 60 * 1000); // Set to 15 min from now (so it waits 2 hours total)
        setLastScheduleAICallTime(lastScheduleAICallRef.current);
      } else {
        console.warn('[Schedule] AI schedule generation failed:', error);
      }
      // Fall through to fallback
    }
    
    // Fallback to programmatic schedule building
    console.log('[Schedule] Using fallback programmatic schedule');
    return buildDailySchedule(analysis, feedIntervalHours, ageInMonths);
  };

  // Fallback: Build schedule programmatically (used when AI fails or is on cooldown)
  const buildDailySchedule = (analysis, feedIntervalHours, ageInMonths = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMilliseconds(0);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    let schedule = [];

    // Enforce minimum feed spacing using analysis.minFeedGapHours
    const minFeedGapMs = (Math.max(analysis?.minFeedGapHours ?? 0, 2.5)) * 60 * 60 * 1000;
    const tooCloseToAnotherFeed = (t) => {
      const tMs = t.getTime();
      return schedule.some(e =>
        e?.type === 'feed' &&
        e?.time instanceof Date &&
        Math.abs(e.time.getTime() - tMs) < minFeedGapMs
      );
    };
    
    // Add all feed patterns for today
    (analysis.feedPatterns || []).forEach(pattern => {
      const scheduleTime = new Date(today);
      scheduleTime.setHours(pattern.hour, pattern.minute, 0, 0);
      // Only include if it's in the future or within last 30 minutes (might be happening now)
      if (pattern.avgMinutes >= nowMinutes - 30) {
        // Don’t add a pattern feed if it would create unrealistically short intervals
        if (tooCloseToAnotherFeed(scheduleTime)) return;

        schedule.push({
          type: 'feed',
          time: scheduleTime,
          patternBased: true,
          patternCount: pattern.count,
          avgMinutes: pattern.avgMinutes,
          // Volume guidance for UI (median + typical range)
          targetOz: pattern.volumeMedianOz ?? null,
          targetOzRange: (pattern.volumeP10Oz != null && pattern.volumeP90Oz != null)
            ? [pattern.volumeP10Oz, pattern.volumeP90Oz]
            : null
        });
      }
    });
    
    // Add all sleep patterns for today
    (analysis.sleepPatterns || []).forEach(pattern => {
      const scheduleTime = new Date(today);
      scheduleTime.setHours(pattern.hour, pattern.minute, 0, 0);
      // Only include if it's in the future or within last 30 minutes
      if (pattern.avgMinutes >= nowMinutes - 30) {
        schedule.push({
          type: 'sleep',
          time: scheduleTime,
          patternBased: true,
          patternCount: pattern.count,
          avgMinutes: pattern.avgMinutes,
          avgDurationHours: pattern.avgDurationHours ?? null
        });
        
        // Wake events removed - no longer creating wake events
      }
    });
    
    // Sort by time
    schedule.sort((a, b) => a.time.getTime() - b.time.getTime());

    // ------------------------------------------------------------
    // Guardrails: prevent impossible back-to-back transitions
    // Example: Feed at 4:20 then Sleep at 4:27 is nonsense.
    // We treat clusters as "soft" and push the later event forward.
    // ------------------------------------------------------------
    const FEED_DURATION_MIN = 20;   // how long a feed typically takes
    const TRANSITION_BUFFER_MIN = 10; // diaper/burp/settle
    const FEED_TO_SLEEP_MIN_GAP = FEED_DURATION_MIN + TRANSITION_BUFFER_MIN; // 30 min
    const MIN_GENERIC_GAP_MIN = 10; // for any other too-close transitions

    const resolveCollisions = (events) => {
      if (!events || events.length < 2) return events;
      const out = [...events].sort((a, b) => a.time.getTime() - b.time.getTime());

      for (let i = 1; i < out.length; i++) {
        const prev = out[i - 1];
        const cur = out[i];
        if (!prev?.time || !cur?.time) continue;

        const diffMin = (cur.time.getTime() - prev.time.getTime()) / (1000 * 60);
        if (diffMin >= MIN_GENERIC_GAP_MIN) continue;

        // Feed -> Sleep: push sleep later by feed duration + buffer
        if (prev.type === 'feed' && cur.type === 'sleep') {
          const minStart = new Date(prev.time.getTime() + FEED_TO_SLEEP_MIN_GAP * 60 * 1000);
          if (cur.time.getTime() < minStart.getTime()) {
            cur.time = minStart;
            cur.adjusted = true;
            cur.adjustReason = 'feed->sleep gap';
          }
          continue;
        }

        // Sleep -> Feed (or anything else too close): push later event forward by generic gap
        const minStart = new Date(prev.time.getTime() + MIN_GENERIC_GAP_MIN * 60 * 1000);
        if (cur.time.getTime() < minStart.getTime()) {
          cur.time = minStart;
          cur.adjusted = true;
          cur.adjustReason = 'min gap';
        }
      }
      return out;
    };

    schedule = resolveCollisions(schedule);

    // Deduplicate events at the same time (within 5 minutes)
    // Keep the event with the highest pattern count
    const deduplicatedSchedule = [];
    const timeWindowMs = 5 * 60 * 1000; // 5 minutes
    
    schedule.forEach(event => {
      // Find if there's already an event at this time (within 5 min window)
      const existingIndex = deduplicatedSchedule.findIndex(existing => {
        if (existing.type !== event.type) return false;
        const timeDiff = Math.abs(existing.time.getTime() - event.time.getTime());
        return timeDiff <= timeWindowMs;
      });
      
      if (existingIndex === -1) {
        // No duplicate found, add it
        deduplicatedSchedule.push(event);
      } else {
        // Duplicate found - keep the one with higher pattern count
        const existing = deduplicatedSchedule[existingIndex];
        const existingCount = existing.patternCount || 0;
        const newCount = event.patternCount || 0;
        
        if (newCount > existingCount) {
          // Replace with the one that has more pattern occurrences
          deduplicatedSchedule[existingIndex] = event;
        } else if (newCount === existingCount && event.patternBased && !existing.patternBased) {
          // Same count, prefer pattern-based over interval-based
          deduplicatedSchedule[existingIndex] = event;
        }
        // Otherwise keep the existing one
      }
    });
    
    // Re-sort after deduplication
    deduplicatedSchedule.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Filter out any wake events (shouldn't be any, but just in case)
    const finalSchedule = deduplicatedSchedule.filter(e => e.type !== 'wake');
    
    return finalSchedule;
  };

  // Adjust schedule based on actual logged events
  const adjustScheduleForActualEvents = (schedule, allFeedings, allSleepSessions, feedIntervalHours, analysis, ageInMonths = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMilliseconds(0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const now = new Date();
    
    // Get today's actual events
    const todayFeedings = (allFeedings || []).filter(f => {
      const feedTime = new Date(f.timestamp);
      return feedTime >= today && feedTime <= todayEnd;
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    const todaySleeps = (allSleepSessions || []).filter(s => {
      if (!s.startTime) return false;
      const sleepTime = new Date(s.startTime);
      return sleepTime >= today && sleepTime <= todayEnd;
    }).sort((a, b) => a.startTime - b.startTime);
    
    // Create adjusted schedule
    const adjustedSchedule = [];
    let lastActualFeedTime = null;
    let lastActualSleepTime = null;
    
    // Helpers for "re-solve forward"
    const minutesBetween = (a, b) => Math.abs(a.getTime() - b.getTime()) / (1000 * 60);
    const hasNearbyEvent = (events, type, time, windowMins) => {
      return events.some(e => e && e.type === type && e.time && minutesBetween(e.time, time) <= windowMins);
    };
    const hasNearbyAnyEvent = (events, time, windowMins) => {
      return events.some(e => e && e.time && minutesBetween(e.time, time) <= windowMins);
    };
    const clampToTodayEnd = (time, todayEndObj) => {
      if (!time) return null;
      return time.getTime() > todayEndObj.getTime() ? null : time;
    };

    // Day/night window from Settings:
    // day = between sleepDayStart -> sleepDayEnd (minutes since midnight)
    // night = everything outside that window
    const getDayWindow = (settings) => {
      const dayStart = Number(settings?.sleepDayStart ?? settings?.daySleepStartMinutes ?? 390);  // default 6:30am
      const dayEnd   = Number(settings?.sleepDayEnd   ?? settings?.daySleepEndMinutes   ?? 1170); // default 7:30pm
      return { dayStart, dayEnd };
    };
    const isInDayWindow = (mins, dayStart, dayEnd) => {
      // Supports windows that may wrap midnight
      return dayStart <= dayEnd
        ? (mins >= dayStart && mins < dayEnd)
        : (mins >= dayStart || mins < dayEnd);
    };
    const isNightTime = (dateObj, settings) => {
      if (!dateObj) return false;
      const { dayStart, dayEnd } = getDayWindow(settings);
      const mins = dateObj.getHours() * 60 + dateObj.getMinutes();
      return !isInDayWindow(mins, dayStart, dayEnd);
    };
    
    // Process events chronologically (only feed and sleep - no wake events)
    const allEvents = [
      ...todayFeedings.map(f => ({ type: 'feed', time: new Date(f.timestamp), actual: true, data: f })),
      ...todaySleeps.map(s => ({ 
        type: 'sleep', 
        time: new Date(s.startTime), 
        actual: true, 
        data: s,
        endTime: s.endTime ? new Date(s.endTime) : null
      }))
      // Wake events removed - no longer including wake events
    ].sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Track which scheduled events have been matched
    const matchedScheduled = new Set();
    
    // For each actual event, check if it matches a scheduled event (within 30 min)
    allEvents.forEach(actualEvent => {
      let matched = false;
      let matchedScheduledEvent = null;
      schedule.forEach((scheduledEvent, idx) => {
        if (matchedScheduled.has(idx)) return;
        const timeDiff = Math.abs(actualEvent.time.getTime() - scheduledEvent.time.getTime()) / (1000 * 60); // minutes
        if (timeDiff <= 30 && actualEvent.type === scheduledEvent.type) {
          // Event occurred within 30 min of prediction - add the scheduled event to adjustedSchedule with actual flag
          matchedScheduled.add(idx);
          matched = true;
          matchedScheduledEvent = scheduledEvent;
          
          // Add the matched scheduled event to adjustedSchedule, marking it as actual/completed
          adjustedSchedule.push({
            ...scheduledEvent,
            actual: true,
            isCompleted: true
          });
          
          if (actualEvent.type === 'feed') {
            lastActualFeedTime = actualEvent.time;
          } else if (actualEvent.type === 'sleep') {
            lastActualSleepTime = actualEvent.time;
            // Wake events removed - no longer creating wake events
          }
        }
      });
      
      // If not matched, it's a new/adjusted event - add it and recalculate from here
      if (!matched) {
        adjustedSchedule.push({
          type: actualEvent.type,
          time: actualEvent.time,
          patternBased: false,
          actual: true,
          adjusted: true,
          relatedSleep: actualEvent.relatedSleep || null,
          source: actualEvent.source || null
        });
        
        if (actualEvent.type === 'feed') {
          lastActualFeedTime = actualEvent.time;
        } else if (actualEvent.type === 'sleep') {
          lastActualSleepTime = actualEvent.time;
          // Wake events removed - no longer creating wake events
        }
      }
    });
    
    /**
     * RE-SOLVE FORWARD:
     * - Keep actual events (and matched scheduled events marked actual)
     * - Rebuild the rest of the day from "now" using:
     *   1) remaining pattern-based events (ignore old interval-based predictions)
     *   2) interval feed chain anchored to last actual feed
     *   3) optional interval nap fills, but NEVER right after a feed (min gap)
     */

    // Add remaining scheduled events that haven't passed and weren't matched
    // Filter out wake events entirely and drop old interval-based fills
    const remainingPatternScheduled = schedule.filter((event, idx) => {
      if (matchedScheduled.has(idx)) return false;
      if (!event || !event.time) return false;
      if (event.type === 'wake') return false;
      if (event.intervalBased) return false;
      if (typeof event.source === 'string' && event.source.startsWith('interval-based')) return false;
      if (!event.patternBased) return false;
      if (event.time.getTime() < now.getTime() - (30 * 60 * 1000)) return false; // >30min past
      return true;
    });

    const minFeedGapHours = Math.max(analysis?.minFeedGapHours ?? 0, 2.5);
    const minFeedGapMs = minFeedGapHours * 60 * 60 * 1000;

    // Start the forward plan with (a) actuals + (b) remaining pattern-based schedule
    const forwardPlan = [];
    adjustedSchedule.forEach(e => forwardPlan.push(e));
    remainingPatternScheduled.forEach(e => {
      if (!e || !e.time) return;

      // 🚫 Guard: skip pattern feeds that are too soon after the last ACTUAL feed
      if (e.type === 'feed' && lastActualFeedTime && e.time instanceof Date) {
        const earliestAllowed = lastActualFeedTime.getTime() + minFeedGapMs;
        if (e.time.getTime() < earliestAllowed) {
          return;
        }
      }

      forwardPlan.push({
        ...e,
        actual: false,
        adjusted: true
      });
    });

    // Rebuild interval-based feeds from the last actual feed (fallback only)
    const todayEndObj = todayEnd; // existing todayEnd Date in scope above
    const feedSkipWindowMins = 45; // if a pattern feed is within 45m, don't add interval feed
    const minNapAfterFeedMins = 25; // never suggest sleep immediately after feeding
    const napHoursAfterFeed = 1.5;
    const allowNightIntervals = ageInMonths < 1; // newborn exception

    // --- Forward re-solve rules (to avoid nonsense like two sleeps back-to-back) ---
    const MIN_SAME_SLEEP_MIN = 75; // don't allow two "sleep" events within 75 min
    const MIN_SAME_FEED_MIN = 90; // don't allow two "feed" events within 90 min
    const MIN_DIFF_TYPE_MIN = 20; // keep at least 20 min between feed<->sleep predictions

    const _eventPriority = (e) => {
      if (!e) return 0;
      if (e.actual) return 3;
      if (e.patternBased) return 2;
      if (e.intervalBased) return 1;
      return 0;
    };

    const _eventStrength = (e) => {
      // used to break ties between pattern events
      const n = (e && (e.patternCount ?? e.occurrences ?? e.count ?? e.sampleCount)) || 0;
      return Number.isFinite(n) ? n : 0;
    };

    const _hasNearbySleep = (tMs, withinMin, events) => {
      const w = withinMin * 60 * 1000;
      return (events || []).some(ev => {
        if (!ev || ev.type !== 'sleep' || !ev.time) return false;
        const evMs = ev.time.getTime();
        return Math.abs(evMs - tMs) <= w;
      });
    };

    if (lastActualFeedTime) {
      // Generate feed chain: lastActual + interval, until end of day
      let cursor = new Date(lastActualFeedTime);
      while (true) {
        const nextFeed = new Date(cursor);
        const totalMinutes = nextFeed.getHours() * 60 + nextFeed.getMinutes() + (feedIntervalHours * 60);
        nextFeed.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
        nextFeed.setSeconds(0);
        nextFeed.setMilliseconds(0);

        const clamped = clampToTodayEnd(nextFeed, todayEndObj);
        if (!clamped) break;
        cursor = clamped;

        if (clamped.getTime() <= now.getTime()) continue;

        // ✅ Phase 1: No proactive interval feeds overnight (>= 1 month).
        // Use your Settings day/night window (sleepDayStart/sleepDayEnd).
        // If next feed time lands in night window, stop generating further feeds.
        if (!allowNightIntervals && isNightTime(clamped, sleepSettings)) {
          break;
        }

        // Skip if near an existing feed (pattern or already-added)
        if (hasNearbyEvent(forwardPlan, 'feed', clamped, feedSkipWindowMins)) continue;

        forwardPlan.push({
          type: 'feed',
          time: clamped,
          patternBased: false,
          intervalBased: true,
          source: 'interval-based (last actual feed + interval)',
          adjusted: true
        });
      }
    }

    // Sort forward plan before adding naps
    forwardPlan.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Add interval nap fills after feeds ONLY if there isn't already a sleep nearby,
    // and never if it would land too close to the feed or another event.
    const planWithNaps = [...forwardPlan];
    for (let i = 0; i < forwardPlan.length; i++) {
      const ev = forwardPlan[i];
      if (!ev || ev.type !== 'feed' || !ev.time) continue;

      const napTime = new Date(ev.time);
      const napTotalMinutes = napTime.getHours() * 60 + napTime.getMinutes() + (napHoursAfterFeed * 60);
      napTime.setHours(Math.floor(napTotalMinutes / 60), napTotalMinutes % 60, 0, 0);
      napTime.setSeconds(0);
      napTime.setMilliseconds(0);

      const clampedNap = clampToTodayEnd(napTime, todayEndObj);
      if (!clampedNap) continue;
      if (clampedNap.getTime() <= now.getTime()) continue;

      // Never suggest a nap too soon after the feed
      if (minutesBetween(ev.time, clampedNap) < minNapAfterFeedMins) continue;

      // If there's already a pattern-based sleep near this nap, skip the interval nap.
      const napMs = clampedNap.getTime();
      const nearPatternSleep =
        _hasNearbySleep(napMs, 60, adjustedSchedule) || _hasNearbySleep(napMs, 60, planWithNaps);
      if (nearPatternSleep) continue;

      // Skip if it would collide with any event (feed or sleep) within 25m
      if (hasNearbyAnyEvent(planWithNaps, clampedNap, 25)) continue;

      planWithNaps.push({
        type: 'sleep',
        time: clampedNap,
        patternBased: false,
        intervalBased: true,
        source: 'interval-based (1.5h after feed)',
        adjusted: true
      });
    }

    // Sort the final schedule candidate
    planWithNaps.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Use the re-solved plan as the final schedule candidate for dedupe logic below
    const finalSchedule = planWithNaps;

    // Also add nap after last feed if there's time left in the day (handled by loop above)
    // (No-op here; kept to preserve surrounding structure)
    if (false) {
      const _noop = true;
      void _noop;
    }
    
    // --- Re-solve forward (only affects predicted events; keeps actual events fixed) ---
    finalSchedule.sort((a, b) => a.time.getTime() - b.time.getTime());
    const resolved = [];
    for (let i = 0; i < finalSchedule.length; i++) {
      const ev = finalSchedule[i];
      if (!ev || !ev.time) continue;

      // Always keep the first
      if (resolved.length === 0) {
        resolved.push(ev);
        continue;
      }

      const prev = resolved[resolved.length - 1];
      const evMs = ev.time.getTime();
      const prevMs = prev.time.getTime();
      const diffMin = Math.abs(evMs - prevMs) / (1000 * 60);

      // If same type too close, keep the better one
      if (ev.type === prev.type) {
        const minSame = (ev.type === 'sleep') ? MIN_SAME_SLEEP_MIN : (ev.type === 'feed' ? MIN_SAME_FEED_MIN : 0);
        if (minSame > 0 && diffMin < minSame) {
          const pPrev = _eventPriority(prev);
          const pEv = _eventPriority(ev);
          if (pEv > pPrev) {
            resolved[resolved.length - 1] = ev;
          } else if (pEv === pPrev) {
            // tie-breaker: stronger pattern wins
            if (_eventStrength(ev) > _eventStrength(prev)) {
              resolved[resolved.length - 1] = ev;
            }
          }
          continue;
        }
      } else {
        // If different types too close, push the *predicted* one later (never move actual)
        if (diffMin < MIN_DIFF_TYPE_MIN) {
          if (!ev.actual) {
            const pushed = new Date(prev.time.getTime() + MIN_DIFF_TYPE_MIN * 60 * 1000);
            ev.time = pushed;
          } else if (!prev.actual) {
            // rare: actual comes after predicted but very close -> pull predicted earlier is risky; drop predicted instead
            resolved.pop();
          }
        }
      }

      resolved.push(ev);
    }

    // Use resolved schedule for downstream logic
    const deduplicatedFinal = resolved;
    
    // Re-sort after deduplication
    deduplicatedFinal.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Enforce a minimum transition gap between FEED and SLEEP so we don't get impossible back-to-back events.
    // Example: "Nap at 6:00pm" + "Feed at 6:21pm" should not both survive as-is.
    // Policy:
    // - Actual events never move.
    // - Between predicted events, FEED wins (SLEEP gets shifted).
    // - If a predicted event collides with an actual event, drop/shift the predicted one.
    const MIN_TRANSITION_GAP_MIN = 30; // ~20m feed + ~10m settle
    const MIN_TRANSITION_GAP_MS = MIN_TRANSITION_GAP_MIN * 60 * 1000;

    const _normalizeTransitions = (events) => {
      if (!Array.isArray(events) || events.length <= 1) return events || [];
      // Work on a shallow copy so we don't mutate callers unexpectedly
      let out = events.slice();

      const isFeed = (e) => e && e.type === 'feed';
      const isSleep = (e) => e && e.type === 'sleep';

      // Loop until stable (max iterations to avoid infinite loops)
      for (let pass = 0; pass < 8; pass++) {
        out.sort((a, b) => a.time.getTime() - b.time.getTime());
        let changed = false;

        for (let i = 1; i < out.length; i++) {
          const prev = out[i - 1];
          const cur = out[i];
          if (!prev || !cur || !prev.time || !cur.time) continue;

          // Only care about FEED<->SLEEP adjacency
          if (!((isFeed(prev) && isSleep(cur)) || (isSleep(prev) && isFeed(cur)))) continue;

          const gapMs = cur.time.getTime() - prev.time.getTime();
          if (gapMs >= MIN_TRANSITION_GAP_MS) continue;

          // Decide which event to move (or drop): prefer keeping actual, then prefer keeping FEED
          let mover = null;
          let anchor = null;

          if (prev.actual && !cur.actual) {
            mover = cur;
            anchor = prev;
          } else if (!prev.actual && cur.actual) {
            mover = prev;
            anchor = cur;
          } else if (prev.actual && cur.actual) {
            // Can't reconcile two actuals; leave as-is
            continue;
          } else {
            // Both predicted: move SLEEP
            if (isSleep(prev) && isFeed(cur)) {
              mover = prev; // move sleep to after feed
              anchor = cur;
            } else {
              mover = cur; // feed then sleep: move sleep later
              anchor = prev;
            }
          }

          // If the mover is predicted, shift it later to after the anchor
          if (mover && !mover.actual) {
            const newTime = new Date(anchor.time.getTime() + MIN_TRANSITION_GAP_MS);
            // If we push past end-of-day, drop it
            if (newTime.getTime() > todayEnd.getTime()) {
              out.splice(out.indexOf(mover), 1);
            } else {
              mover.time = newTime;
              mover.adjusted = true;
              if (typeof mover.source === 'string' && !mover.source.includes('collision-shifted')) {
                mover.source = mover.source + ' • collision-shifted';
              } else if (!mover.source) {
                mover.source = 'collision-shifted';
              }
            }
            changed = true;
          }
        }

        if (!changed) break;
      }

      out.sort((a, b) => a.time.getTime() - b.time.getTime());
      return out;
    };

    const normalizedFinal = _normalizeTransitions(deduplicatedFinal);

    // ------------------------------------------------------------
    // V2 fix: ensure we always have remaining FEEDS.
    // If there are no future feed patterns, we generate interval-based future feeds
    // starting from the last actual feed today (or last feed in schedule).
    // ------------------------------------------------------------
    const ensureFutureFeeds = () => {
      const intervalHrs = Number(feedIntervalHours);
      if (!Number.isFinite(intervalHrs) || intervalHrs <= 0) return;

      const dayEnd = new Date(today);
      dayEnd.setHours(23, 59, 59, 999);

      // Find last feed time we can anchor from: prefer last actual feed today, else last feed in schedule <= now
      let anchor = lastActualFeedTime;
      if (!anchor) {
        for (let i = deduplicatedFinal.length - 1; i >= 0; i--) {
          const ev = deduplicatedFinal[i];
          if (ev?.type === 'feed' && ev?.time instanceof Date && ev.time.getTime() <= now.getTime()) {
            anchor = ev.time;
            break;
          }
        }
      }
      if (!anchor) return;

      const existingFutureFeeds = deduplicatedFinal
        .filter(ev => ev?.type === 'feed' && ev?.time instanceof Date && ev.time.getTime() > now.getTime())
        .map(ev => ev.time.getTime())
        .sort((a, b) => a - b);

      const tooCloseMs = 35 * 60 * 1000; // don't add if within ~35 min of an existing feed
      const intervalMs = intervalHrs * 60 * 60 * 1000;

      // Generate candidate feeds forward until end of day
      let t = new Date(anchor.getTime() + intervalMs);
      t.setSeconds(0);
      t.setMilliseconds(0);

      // If we're already way past the next interval, step forward until it's in the future
      while (t.getTime() <= now.getTime()) {
        t = new Date(t.getTime() + intervalMs);
        t.setSeconds(0);
        t.setMilliseconds(0);
      }

      while (t.getTime() < dayEnd.getTime()) {
        // Skip if close to an existing future feed
        const close = existingFutureFeeds.some(ft => Math.abs(ft - t.getTime()) <= tooCloseMs);
        if (!close) {
          deduplicatedFinal.push({
            type: 'feed',
            time: new Date(t),
            patternBased: false,
            intervalBased: true,
            source: 'interval-based (after last feed)'
          });
          existingFutureFeeds.push(t.getTime());
          existingFutureFeeds.sort((a, b) => a - b);
        }
        t = new Date(t.getTime() + intervalMs);
        t.setSeconds(0);
        t.setMilliseconds(0);
      }
    };

    ensureFutureFeeds();

    // Re-sort after injecting interval feeds
    deduplicatedFinal.sort((a, b) => a.time.getTime() - b.time.getTime());

    // If no events logged yet today, add interval-based predictions for remaining day
    if (allEvents.length === 0 && schedule.length > 0) {
      // Use the schedule as-is but add interval-based fills (filter wakes from schedule too)
      const filteredSchedule = schedule.filter(e => e.type !== 'wake');
      return normalizedFinal.length > 0 ? normalizedFinal : filteredSchedule;
    }
    
    return normalizedFinal;
  };

  // Generate fallback prediction based on historical intervals and age
  const generateFallbackPrediction = (ageInMonths, isSleepActive, lastFeedingTimeObj, lastSleepTimeObj, feedings, sleepSessions) => {
    const now = new Date();
    let nextTime = new Date(now);
    
    if (isSleepActive && activeSleep?.startTime) {
      // If sleeping, predict next feed after wake (not wake itself)
      const wakeHours = ageInMonths < 3 ? 1.5 : ageInMonths < 6 ? 2 : 2.5;
      const sleepStart = new Date(activeSleep.startTime);
      const predictedWakeTime = new Date(sleepStart);
      // Convert fractional hours to minutes for accurate calculation
      const totalMinutes = predictedWakeTime.getHours() * 60 + predictedWakeTime.getMinutes() + (wakeHours * 60);
      predictedWakeTime.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
      predictedWakeTime.setSeconds(0);
      predictedWakeTime.setMilliseconds(0);
      
      // Predict next feed after wake (use age-based interval)
      let feedIntervalHours;
      const analysis = analyzeHistoricalIntervals(feedings, sleepSessions);
      if (analysis.avgInterval && analysis.feedIntervals >= 2) {
        feedIntervalHours = analysis.avgInterval;
      } else {
        if (ageInMonths < 1) feedIntervalHours = 2;
        else if (ageInMonths < 3) feedIntervalHours = 2.5;
        else if (ageInMonths < 6) feedIntervalHours = 3;
        else feedIntervalHours = 3.5;
      }
      
      const predictedFeedTime = new Date(predictedWakeTime);
      const feedMinutes = predictedFeedTime.getHours() * 60 + predictedFeedTime.getMinutes() + (feedIntervalHours * 60);
      predictedFeedTime.setHours(Math.floor(feedMinutes / 60), feedMinutes % 60, 0, 0);
      predictedFeedTime.setSeconds(0);
      predictedFeedTime.setMilliseconds(0);
      
      const predictedTimeStr = formatTimeHmma(predictedFeedTime);
      return {
        type: 'feed',
        time: predictedFeedTime,
        text: `Feed around ${predictedTimeStr}`
      };
    }
    
    // Analyze historical intervals
    const analysis = analyzeHistoricalIntervals(feedings, sleepSessions);
    
    // Use historical interval if available, otherwise fall back to age-based
    let feedIntervalHours;
    if (analysis.avgInterval && analysis.feedIntervals >= 2) {
      feedIntervalHours = analysis.avgInterval;
    } else {
      // Fallback to age-based intervals
      if (ageInMonths < 1) feedIntervalHours = 2;
      else if (ageInMonths < 3) feedIntervalHours = 2.5;
      else if (ageInMonths < 6) feedIntervalHours = 3;
      else feedIntervalHours = 3.5;
    }
    
    // Base prediction on last feeding time + interval (FIXED, not "now" + interval)
    // BUT prioritize time-of-day patterns if they exist
    let predictedFeedTime;
    
    // PRIORITY 1: If there's a common time pattern and it's in the future today, use it
    if (analysis.commonTimePattern) {
      const today = new Date();
      const patternTime = new Date(today);
      patternTime.setHours(analysis.commonTimePattern.hour, analysis.commonTimePattern.minute, 0, 0);
      patternTime.setSeconds(0);
      patternTime.setMilliseconds(0);
      
      // If pattern time is in the future today, use it as the primary prediction
      if (patternTime > now) {
        predictedFeedTime = patternTime;
        // Debug logging removed - use window.validateWhatsNext() for debugging
      } else {
        // Pattern time is in the past today, calculate next occurrence (tomorrow)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(analysis.commonTimePattern.hour, analysis.commonTimePattern.minute, 0, 0);
        tomorrow.setSeconds(0);
        tomorrow.setMilliseconds(0);
        predictedFeedTime = tomorrow;
        // Debug logging removed - use window.validateWhatsNext() for debugging
      }
    } else if (lastFeedingTimeObj) {
      // PRIORITY 2: No pattern, use last feeding time + interval
      predictedFeedTime = new Date(lastFeedingTimeObj);
      // Convert fractional hours to minutes for accurate calculation
      const totalMinutes = predictedFeedTime.getHours() * 60 + predictedFeedTime.getMinutes() + (feedIntervalHours * 60);
      predictedFeedTime.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
      // Debug logging removed - use window.validateWhatsNext() for debugging
    } else {
      // PRIORITY 3: No last feeding - use current time as baseline (only for initial prediction)
      predictedFeedTime = new Date(now);
      // Convert fractional hours to minutes for accurate calculation
      const totalMinutes = predictedFeedTime.getHours() * 60 + predictedFeedTime.getMinutes() + (feedIntervalHours * 60);
      predictedFeedTime.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
      // Debug logging removed - use window.validateWhatsNext() for debugging
    }
    
    // Set seconds and milliseconds to 0 for clean time
    predictedFeedTime.setSeconds(0);
    predictedFeedTime.setMilliseconds(0);
    
    const predictedTimeStr = formatTimeHmma(predictedFeedTime);
    return {
      type: 'feed',
      time: predictedFeedTime,
      text: `Feed around ${predictedTimeStr}`
    };
  };

  // Helper function to determine if a time is day or night sleep based on settings
  const getSleepLabel = (time, settings) => {
    if (!time || !(time instanceof Date)) return 'Sleep';
    const dayStart = Number(settings?.sleepDayStart ?? settings?.daySleepStartMinutes ?? 390);
    const dayEnd = Number(settings?.sleepDayEnd ?? settings?.daySleepEndMinutes ?? 1170);
    const mins = time.getHours() * 60 + time.getMinutes();
    const isDaySleep = dayStart <= dayEnd
      ? (mins >= dayStart && mins < dayEnd)
      : (mins >= dayStart || mins < dayEnd);
    return isDaySleep ? 'Nap' : 'Sleep';
  };

  // Format predicted feeding volume hint (optional)
  const getFeedOzHint = (event) => {
    const fmt = (n) => {
      if (typeof n !== 'number' || !isFinite(n)) return null;
      const v = Math.round(n * 10) / 10;
      return String(v).replace(/\.0$/, '');
    };

    const target = fmt(event?.targetOz);

    // Allow ranges as {min,max} or [min,max]
    const range = event?.targetOzRange;
    const minRaw = Array.isArray(range) ? range[0] : range?.min;
    const maxRaw = Array.isArray(range) ? range[1] : range?.max;
    const min = fmt(minRaw);
    const max = fmt(maxRaw);

    if (min && max) return `${min}–${max} oz`;
    if (target) return `~${target} oz`;
    return null;
  };

  const withNowTag = (text) => {
    if (!text || typeof text !== 'string') return text;
    if (text.includes('(Now!)')) return text;
    return `${text} (Now!)`;
  };

  const withoutNowTag = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\s*\(Now!\)\s*$/i, '');
  };

  // Format AI response according to spec
  const formatWhatsNextResponse = (aiResponse, isSleepActive, lastFeedingTime, lastSleepTime) => {
    if (!aiResponse || typeof aiResponse !== 'string') {
      return 'No prediction yet';
    }

    const now = Date.now();
    const graceMinutes = 15;
    const graceMs = graceMinutes * 60 * 1000;

    // Parse AI response - look for verb (Wake/Feed/Nap) and time
    const response = aiResponse.trim();
    
    // Extract verb and time from patterns like "Feed around 2:30pm" or "Nap around 3:00pm" or "Sleep around 8:00pm"
    const verbMatch = response.match(/^(Feed|Nap|Sleep)\s+(?:around\s+)?(\d{1,2}:\d{2}(?:am|pm))/i);
    
    if (!verbMatch) {
      // Try to extract just verb and time separately
      const verb = response.match(/^(Feed|Nap|Sleep)/i)?.[1];
      const timeMatch = response.match(/(\d{1,2}:\d{2}(?:am|pm))/i);
      
      if (!verb || !timeMatch) {
        return 'No prediction yet';
      }
      
      const verbCap = verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase();
      const timeStr = timeMatch[1].toLowerCase();
      
      // Parse time and check if overdue
      const timeParts = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/);
      if (!timeParts) return 'No prediction yet';
      
      const hour = parseInt(timeParts[1], 10);
      const minute = parseInt(timeParts[2], 10);
      const isPm = timeParts[3] === 'pm';
      const hour24 = isPm && hour !== 12 ? hour + 12 : (!isPm && hour === 12 ? 0 : hour);
      
      const today = new Date();
      today.setHours(hour24, minute, 0, 0);
      const predictedTime = today.getTime();
      
      // Check if overdue - keep original predicted time, just add (Now!)
      if (now > predictedTime + graceMs) {
        return `${verbCap} around ${timeStr} (Now!)`;
      }
      
      // Format: "Verb around time" or "Verb time" if too long
      let formatted = `${verbCap} around ${timeStr}`;
      if (formatted.length > 28) {
        formatted = `${verbCap} ${timeStr}`;
      }
      if (formatted.length > 28) {
        formatted = `${verbCap} soon`;
      }
      
      return formatted;
    }
    
    const verbCap = verbMatch[1].charAt(0).toUpperCase() + verbMatch[1].slice(1).toLowerCase();
    const timeStr = verbMatch[2].toLowerCase();
    
    // Parse time and check if overdue
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/);
    if (!timeParts) return 'No prediction yet';
    
    const hour = parseInt(timeParts[1], 10);
    const minute = parseInt(timeParts[2], 10);
    const isPm = timeParts[3] === 'pm';
    const hour24 = isPm && hour !== 12 ? hour + 12 : (!isPm && hour === 12 ? 0 : hour);
    
    const today = new Date();
    today.setHours(hour24, minute, 0, 0);
    const predictedTime = today.getTime();
    
    // If overdue → keep original predicted time, just add (Now!)
    if (now > predictedTime + graceMs) {
      return `${verbCap} around ${timeStr} (Now!)`;
    }
    
    // Priority 3: Show next predicted event
    let formatted = `${verbCap} around ${timeStr}`;
    
    // Character overflow handling
    if (formatted.length > 28) {
      formatted = `${verbCap} ${timeStr}`;
    }
    if (formatted.length > 28) {
      formatted = `${verbCap} soon`;
    }
    
    return formatted;
  };

  // Consistent icon-button styling for edit actions (✓ / ✕) — match Family tab
  const TRACKER_ICON_BTN_BASE =
    "h-10 w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center";
  const TRACKER_ICON_BTN_OK = TRACKER_ICON_BTN_BASE + " text-green-600";
  const TRACKER_ICON_BTN_CANCEL = TRACKER_ICON_BTN_BASE + " text-gray-500";
  const TRACKER_ICON_SIZE = "w-5 h-5";

  // Ensure edit-grid items never overflow/overhang on iOS (time inputs have stubborn intrinsic sizing)
  useEffect(() => {
    try {
      if (document.getElementById('tt-tracker-edit-style')) return;
      const st = document.createElement('style');
      st.id = 'tt-tracker-edit-style';
      st.textContent = `
        .trackerEditCard .trackerEditGrid { width: 100%; }
        .trackerEditCard .trackerEditGrid > * { min-width: 0; }
        .trackerEditCard input { min-width: 0; max-width: 100%; }
        .trackerEditCard input[type="time"] { -webkit-appearance: none; appearance: none; }
      `;
      document.head.appendChild(st);
    } catch (e) {}
  }, []);

  const TrackerEditActions = ({ onSave, onCancel }) =>
    React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
      React.createElement('button', { type: 'button', onClick: onSave, className: TRACKER_ICON_BTN_OK, title: "Save" },
        React.createElement(Check, { className: TRACKER_ICON_SIZE })
      ),
      React.createElement('button', { type: 'button', onClick: onCancel, className: TRACKER_ICON_BTN_CANCEL, title: "Cancel" },
        React.createElement(X, { className: TRACKER_ICON_SIZE })
      )
    );

  // Sleep logging state
  const [activeSleep, setActiveSleep] = useState(null);
  const [sleepElapsedMs, setSleepElapsedMs] = useState(0);
  const [sleepStartStr, setSleepStartStr] = useState('');
  const [sleepEndStr, setSleepEndStr] = useState('');
  const [editingSleepField, setEditingSleepField] = useState(null); // 'start' | 'end' | null
  const sleepIntervalRef = React.useRef(null);
  const [lastActiveSleepId, setLastActiveSleepId] = useState(null);

  useEffect(() => {
    if (!kidId) return;
    return firestoreStorage.subscribeActiveSleep((session) => {
      setActiveSleep(session);
    });
  }, [kidId]);

  useEffect(() => {
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }

    if (!activeSleep) {
      setSleepElapsedMs(0);
      setSleepStartStr('');
      setSleepEndStr('');
      return;
    }

    const start = _normalizeSleepStartMs(activeSleep.startTime);
    if (!start) { setSleepElapsedMs(0); return; }
    const tick = () => setSleepElapsedMs(Date.now() - start);
    tick();
    sleepIntervalRef.current = setInterval(tick, 1000);

    return () => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }
    };
  }, [activeSleep]);

  useEffect(() => {
    if (!activeSleep) {
      setSleepElapsedMs(0);
      setSleepEndStr('');
      setLastActiveSleepId(null);
    }
  }, [activeSleep]);

  // Generate AI "What's Next" copy - optimized to prevent loops, always generates prediction
  const generateWhatsNext = React.useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (generatingRef.current) {
      return;
    }
    
    // Inline isToday check
    const isTodayCheck = currentDate.toDateString() === new Date().toDateString();
    
    if (!kidId || !isTodayCheck || loading) {
      // Still generate a fallback even if not today or loading
      if (!kidId || !isTodayCheck) {
        return;
      }
    }
    
    // Create a data hash to detect meaningful changes
    // Use allFeedings/allSleepSessions (all historical data) not just today's data
    const lastFeeding = allFeedings && allFeedings.length > 0 
      ? [...allFeedings].sort((a, b) => b.timestamp - a.timestamp)[0] 
      : null;
    const completedSleepSessions = allSleepSessions 
      ? allSleepSessions.filter(s => s.endTime && !s.isActive).sort((a, b) => b.startTime - a.startTime)
      : [];
    const lastSleep = completedSleepSessions.length > 0 ? completedSleepSessions[0] : null;
    const lastFeedingId = lastFeeding?.id || 'none';
    const lastFeedingTime = lastFeeding ? new Date(lastFeeding.timestamp).getTime() : 0;
    const lastSleepId = lastSleep?.id || 'none';
    const lastSleepTime = lastSleep ? new Date(lastSleep.startTime).getTime() : 0;
    const activeSleepId = activeSleep?.id || 'none';
    const activeSleepStart = activeSleep?.startTime || 0;
    
    // Create a hash of meaningful data
    const dataHash = `${lastFeedingId}-${lastFeedingTime}-${lastSleepId}-${lastSleepTime}-${activeSleepId}-${activeSleepStart}`;
    
    // Force schedule rebuild if data changed (new event logged)
    const dataChanged = dataHash !== lastDataHashRef.current;
    const nowMs = Date.now();
    const nowDate = new Date(nowMs);
    
    // Check if we've passed the NEXT upcoming event (not just any past event)
    // Skip wake events - only check feed and sleep events
    const currentSchedule = dailySchedule || dailyScheduleRef.current;
    let hasPassedNextEvent = false;
    if (currentSchedule && Array.isArray(currentSchedule) && currentSchedule.length > 0) {
      // Find the next upcoming event (skip wake events)
      const nextEvent = currentSchedule.find(event => 
        event && 
        event.time && 
        (event.type === 'feed' || event.type === 'sleep') &&
        event.time.getTime() > nowDate.getTime()
      );
      // Only rebuild if we've passed the next event (with 5 min grace period)
      if (nextEvent && nextEvent.time.getTime() < nowDate.getTime() - (5 * 60 * 1000)) {
        hasPassedNextEvent = true;
      }
    }
    
    const shouldRebuildSchedule = !currentSchedule || 
      (Array.isArray(currentSchedule) && currentSchedule.length === 0) || // Rebuild if schedule is empty array
      (nowMs - lastScheduleUpdateRef.current > 5 * 60 * 1000) || // Rebuild every 5 min instead of 15
      dataChanged ||
      hasPassedNextEvent; // Rebuild if we've passed the next scheduled event
    
    // Only log rebuild decision if it's actually rebuilding (to reduce spam)
    if (shouldRebuildSchedule) {
      console.log('[Schedule] Rebuild decision:', {
        hasCurrentSchedule: !!currentSchedule,
        currentScheduleLength: currentSchedule?.length || 0,
        timeSinceUpdate: nowMs - lastScheduleUpdateRef.current,
        dataChanged,
        hasPassedNextEvent,
        shouldRebuildSchedule
      });
    }
    
    if (dataChanged) {
      dailyScheduleRef.current = null; // Force rebuild
      lastScheduleUpdateRef.current = 0;
    }
    
    // Skip if data hasn't meaningfully changed AND we have a stored prediction
    // Only recalculate if there's a new feeding/sleep event
    if (dataHash === lastDataHashRef.current && whatsNextText !== 'No prediction yet' && predictedTimeRef.current && !shouldRebuildSchedule) {
      // Check if stored prediction is now overdue and update display accordingly
      const graceMs = 15 * 60 * 1000;
      const storedPrediction = predictedTimeRef.current;
      if (nowMs > storedPrediction.time.getTime() + graceMs) {
        // Prediction is overdue - keep full stored text (including any volume hint), just add (Now!)
        const newText = withNowTag(storedPrediction.text);
        if (whatsNextText !== newText) setWhatsNextText(newText);
      } else {
        // Prediction is still valid - show the stored text
        if (whatsNextText !== storedPrediction.text) {
          setWhatsNextText(storedPrediction.text);
        }
      }
      return; // Return BEFORE setting generatingRef to avoid blocking future calls
    }
    
    lastDataHashRef.current = dataHash;
    generatingRef.current = true;
    
    try {
      // Fetch baby data for age calculation
      const babyData = await firestoreStorage.getKidData();
      const ageInMonths = babyData?.birthDate ? calculateAgeInMonths(babyData.birthDate) : 0;
      const ageInDays = babyData?.birthDate ? Math.floor((Date.now() - babyData.birthDate) / (1000 * 60 * 60 * 24)) : 0;
      
      const lastFeedingTimeObj = lastFeeding ? new Date(lastFeeding.timestamp) : null;
      const lastSleepTimeObj = lastSleep ? new Date(lastSleep.startTime) : null;
      const isSleepActive = !!activeSleep;
      
      // Check AI cooldown (1 hour) to avoid quota limits (free tier: 20 requests/day)
      const now = nowMs;
      const aiCooldownMs = 60 * 60 * 1000; // 1 hour (reduces daily calls to max 24, well under 20/day limit)
      // Sync with localStorage in case of page reload
      const storedLastCall = getLastAICallTime();
      if (storedLastCall > lastAICallRef.current) {
        lastAICallRef.current = storedLastCall;
      }
      const timeSinceLastAI = now - lastAICallRef.current;
      const shouldCallAI = timeSinceLastAI >= aiCooldownMs && typeof getAIResponse === 'function';
      
      let answer = null;
      if (shouldCallAI) {
        try {
          const currentTime = formatTimeHmma(new Date());
          const lastFeedingStr = lastFeedingTimeObj ? formatTimeHmma(lastFeedingTimeObj) : 'none';
          const lastSleepStr = lastSleepTimeObj ? formatTimeHmma(lastSleepTimeObj) : 'none';
          
          // Build comprehensive prompt with age and weight
          const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
          const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);
          const dayStartHour = Math.floor(dayStart / 60);
          const dayStartMin = dayStart % 60;
          const dayEndHour = Math.floor(dayEnd / 60);
          const dayEndMin = dayEnd % 60;
          const dayStartStr = `${dayStartHour}:${String(dayStartMin).padStart(2, '0')}`;
          const dayEndStr = `${dayEndHour}:${String(dayEndMin).padStart(2, '0')}`;
          
          const prompt = `You are a baby care assistant. Generate a single-line "what's next" prediction.

Baby's age: ${ageInMonths} months (${ageInDays} days old)
Baby's weight: ${babyWeight || 'not set'} lbs
Current time: ${currentTime}
Last feeding: ${lastFeedingStr}
Last sleep: ${lastSleepStr}
Sleep timer active: ${isSleepActive ? 'yes' : 'no'}
Day sleep window: ${dayStartStr} - ${dayEndStr} (use "Nap" for sleep during this time)
Night sleep: outside day window (use "Sleep" for sleep outside day window)

Rules:
1. Output ONLY one of these exact formats:
   - "Feed around {time}" (predict next feeding)
   - "Nap around {time}" (predict next nap - use for daytime sleep, between ${dayStartStr} and ${dayEndStr})
   - "Sleep around {time}" (predict next sleep - use for nighttime sleep, outside ${dayStartStr}-${dayEndStr} window)
   - "Feed around {predictedTime} (Now!)" (if feeding is overdue - keep original predicted time, add (Now!))
   - "Nap around {predictedTime} (Now!)" (if nap is overdue - keep original predicted time, add (Now!))
   - "Sleep around {predictedTime} (Now!)" (if sleep is overdue - keep original predicted time, add (Now!))
   
   IMPORTANT: Use "Nap" for sleep during day window (${dayStartStr}-${dayEndStr}), "Sleep" for sleep outside this window.

2. Time format: h:mma (e.g., "2:30pm", "11:00am") - no spaces, lowercase

3. Priority:
   - If sleep timer is running → predict wake time
   - Else if something is overdue → use "around {predictedTime} (Now!)" format (keep original predicted time)
   - Else predict next event

4. Base predictions on:
   - Feeding/sleep patterns from history (if available)
   - Baby's age and developmental stage (ALWAYS use this)
   - Typical intervals for this age (use age-appropriate defaults if no history)
   - Baby's weight (for feeding amount considerations)

IMPORTANT: Always generate a prediction. If no history, use age-appropriate defaults:
- 0-1 months: Feed every 2 hours
- 1-3 months: Feed every 2.5 hours  
- 3-6 months: Feed every 3 hours
- 6+ months: Feed every 3.5 hours

Output ONLY the formatted string, nothing else.`;

          answer = await getAIResponse(prompt, kidId);
          // Only update lastAICallRef on successful call
          if (answer) {
            lastAICallRef.current = now;
            setLastAICallTime(now);
          }
        } catch (aiError) {
          // Check if it's a quota error (429) - if so, use longer cooldown
          const isQuotaError = aiError?.message?.includes('429') || 
                               aiError?.message?.includes('quota') ||
                               aiError?.message?.includes('RESOURCE_EXHAUSTED');
          
          if (isQuotaError) {
            console.warn("AI quota exceeded (will use fallback for extended period):", aiError);
            // Set cooldown to 2 hours for quota errors to prevent further calls
            const extendedCooldown = 2 * 60 * 60 * 1000;
            lastAICallRef.current = now - extendedCooldown + (60 * 60 * 1000); // Set to 1 hour from now
            setLastAICallTime(lastAICallRef.current);
          } else {
            console.error("AI error (will use fallback):", aiError);
            // Update cooldown even on error to avoid rapid retries
            lastAICallRef.current = now;
            setLastAICallTime(now);
          }
        }
      }
      
      if (answer) {
        const formatted = formatWhatsNextResponse(answer, isSleepActive, lastFeedingTimeObj, lastSleepTimeObj);
        if (formatted && formatted !== 'No prediction yet') {
          // Store the predicted time from AI response
          const timeMatch = formatted.match(/(\d{1,2}:\d{2}(?:am|pm))/i);
          if (timeMatch && !formatted.includes('(Now!)')) {
            const timeStr = timeMatch[1].toLowerCase();
            const timeParts = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/);
            if (timeParts) {
              const hour = parseInt(timeParts[1], 10);
              const minute = parseInt(timeParts[2], 10);
              const isPm = timeParts[3] === 'pm';
              const hour24 = isPm && hour !== 12 ? hour + 12 : (!isPm && hour === 12 ? 0 : hour);
              const today = new Date();
              today.setHours(hour24, minute, 0, 0);
              predictedTimeRef.current = {
                type: formatted.toLowerCase().includes('wake') ? 'wake' : formatted.toLowerCase().includes('nap') ? 'nap' : 'feed',
                time: today,
                text: formatted
              };
            }
          }
          setWhatsNextText(formatted);
        } else {
          // Fallback if AI returned invalid format
          const fallback = generateFallbackPrediction(ageInMonths, isSleepActive, lastFeedingTimeObj, lastSleepTimeObj, allFeedings, allSleepSessions);
          predictedTimeRef.current = fallback;
          // Check if overdue and show "Now!" if so, but keep the base prediction time
          const now = Date.now();
          const graceMs = 15 * 60 * 1000;
          if (now > fallback.time.getTime() + graceMs) {
            // Keep original predicted time, just add (Now!)
            const originalTimeStr = formatTimeHmma(fallback.time);
            const verb = fallback.text.split(' around ')[0];
            setWhatsNextText(`${verb} around ${originalTimeStr} (Now!)`);
          } else {
            setWhatsNextText(fallback.text);
          }
        }
      } else {
        // Always generate fallback prediction - never show "No prediction yet"
        const fallback = generateFallbackPrediction(ageInMonths, isSleepActive, lastFeedingTimeObj, lastSleepTimeObj, allFeedings, allSleepSessions);
        predictedTimeRef.current = fallback;
        // Check if overdue and show "Now!" if so, but keep the base prediction time
        const now = Date.now();
        const graceMs = 15 * 60 * 1000;
        if (now > fallback.time.getTime() + graceMs) {
          // Keep original predicted time, just add (Now!)
          const originalTimeStr = formatTimeHmma(fallback.time);
          const verb = fallback.text.split(' around ')[0];
          setWhatsNextText(`${verb} around ${originalTimeStr} (Now!)`);
        } else {
          setWhatsNextText(fallback.text);
        }
      }
      
      // Build and adjust schedule based on patterns and actual events
      // This should run regardless of AI success/failure (moved from catch block)
      const analysis = analyzeHistoricalIntervals(allFeedings, allSleepSessions);
      let feedIntervalHours;
      if (analysis.avgInterval && analysis.feedIntervals >= 2) {
        feedIntervalHours = analysis.avgInterval;
      } else {
        if (ageInMonths < 1) feedIntervalHours = 2;
        else if (ageInMonths < 3) feedIntervalHours = 2.5;
        else if (ageInMonths < 6) feedIntervalHours = 3;
        else feedIntervalHours = 3.5;
      }
      
      // Schedule rebuild already determined above
      
      if (shouldRebuildSchedule) {
        // Build initial schedule deterministically from patterns (no AI)
        const initialSchedule = buildDailySchedule(analysis, feedIntervalHours, ageInMonths);
        // Adjust based on actual events
        const adjustedSchedule = adjustScheduleForActualEvents(
          initialSchedule, 
          allFeedings, 
          allSleepSessions, 
          feedIntervalHours,
          analysis,
          ageInMonths
        );
        dailyScheduleRef.current = adjustedSchedule;
        setDailySchedule(adjustedSchedule); // Update state to trigger re-render
        lastScheduleUpdateRef.current = nowMs;
        setScheduleReady(true); // Mark schedule as ready
          // Log schedule build completion (only when actually building)
          console.log('[Schedule] Schedule built:', adjustedSchedule.length, 'events');
      }
      
      // Get next event from schedule (use state, fallback to ref)
      const schedule = dailySchedule || dailyScheduleRef.current || [];
      const nowDate = new Date(nowMs);
      let nextEvent = null;
      
      if (isSleepActive && activeSleep?.startTime) {
        // If sleep timer is active, find next feed or sleep after predicted wake time
        const wakeHours = ageInMonths < 3 ? 1.5 : ageInMonths < 6 ? 2 : 2.5;
        const sleepStart = new Date(activeSleep.startTime);
        const predictedWakeTime = new Date(sleepStart);
        const totalMinutes = predictedWakeTime.getHours() * 60 + predictedWakeTime.getMinutes() + (wakeHours * 60);
        predictedWakeTime.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
        predictedWakeTime.setSeconds(0);
        predictedWakeTime.setMilliseconds(0);
        
        // Find next feed or sleep after wake (skip wake events)
        nextEvent = schedule.find(e => 
          (e.type === 'feed' || e.type === 'sleep') && 
          e.time.getTime() > predictedWakeTime.getTime()
        );
      } else {
        // Find next event from schedule (skip wake events - only feed and sleep)
        nextEvent = schedule.find(e => 
          (e.type === 'feed' || e.type === 'sleep') && 
          e.time.getTime() > nowDate.getTime()
        );
      }
      
      // Fallback to old method if no schedule event found
      const fallback = nextEvent ? {
        type: nextEvent.type,
        time: nextEvent.time,
        text: (() => {
          if (nextEvent.type === 'feed') {
            const hint = getFeedOzHint(nextEvent);
            return hint
              ? `Feed around ${formatTimeHmma(nextEvent.time)} (${hint})`
              : `Feed around ${formatTimeHmma(nextEvent.time)}`;
          }
          return `${getSleepLabel(nextEvent.time, sleepSettings)} around ${formatTimeHmma(nextEvent.time)}`;
        })()
      } : generateFallbackPrediction(ageInMonths, isSleepActive, lastFeedingTimeObj, lastSleepTimeObj, allFeedings, allSleepSessions);
      predictedTimeRef.current = fallback;
      // Check if overdue and show "Now!" if so
      const graceMs = 15 * 60 * 1000;
      if (nowMs > fallback.time.getTime() + graceMs) {
        // Keep full text (including any volume hint), just add (Now!)
        setWhatsNextText(withNowTag(fallback.text));
      } else {
        setWhatsNextText(fallback.text);
      }
    } finally {
      generatingRef.current = false;
    }
  }, [kidId, loading, activeSleep, feedings, sleepSessions, allFeedings, allSleepSessions, currentDate, whatsNextText, babyWeight]);
  // Generate "what's next" when data changes - optimized to prevent loops
  React.useEffect(() => {
    const isTodayCheck = currentDate.toDateString() === new Date().toDateString();
    if (!loading && isTodayCheck && kidId && typeof getAIResponse === 'function') {
      // Generate immediately without delay for faster loading
      generateWhatsNext();
    }
    // Removed generateWhatsNext from dependencies to prevent loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, feedings, sleepSessions, activeSleep, currentDate, kidId]);

  // Force re-render when schedule is built (so accordion can display it)
  React.useEffect(() => {
    const schedule = dailySchedule || dailyScheduleRef.current;
    if (schedule && schedule.length > 0) {
      setScheduleReady(true);
    }
  }, [dailySchedule, allFeedings, allSleepSessions]); // Re-check when data changes

  // Sync ref to state when accordion opens (so it can display the schedule)
  React.useEffect(() => {
    if (whatsNextAccordionOpen && dailyScheduleRef.current && !dailySchedule) {
      // Accordion just opened and ref has schedule but state doesn't - sync them
      setDailySchedule(dailyScheduleRef.current);
    }
  }, [whatsNextAccordionOpen, dailySchedule]); // Re-sync when accordion opens

  // Validation function for debugging prediction calculation
  // Call from console: window.validateWhatsNext()
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.validateWhatsNext = async () => {
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        // IMPORTANT: Use allFeedings/allSleepSessions (all historical data) not just today's data
        const recentFeedings = (allFeedings || [])
          .filter(f => f.timestamp >= sevenDaysAgo)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        const recentSleep = (allSleepSessions || [])
          .filter(s => s.startTime && s.startTime >= sevenDaysAgo && s.endTime && !s.isActive)
          .sort((a, b) => a.startTime - b.startTime);
        
        // Format time helper
        const formatTime = (timestamp) => {
          const d = new Date(timestamp);
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };
        
        // Format date + time helper
        const formatDateTime = (timestamp) => {
          const d = new Date(timestamp);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + formatTime(timestamp);
        };
        
        console.log('\n=== WHAT\'S NEXT PREDICTION VALIDATION ===\n');
        
        // 1. Show all feeds from last 5 days
        console.log('📊 FEEDS FROM LAST 5 DAYS:');
        if (recentFeedings.length === 0) {
          console.log('  ❌ No feeds found in last 5 days');
        } else {
          recentFeedings.forEach((f, idx) => {
            const timeMinutes = new Date(f.timestamp).getHours() * 60 + new Date(f.timestamp).getMinutes();
            console.log(`  ${idx + 1}. ${formatDateTime(f.timestamp)} (${timeMinutes} min since midnight)`);
          });
        }
        
        // 2. Run analysis (use all feedings, not just today's)
        const analysis = analyzeHistoricalIntervals(allFeedings || [], allSleepSessions || []);
        
        // 3. Show clusters
        console.log('\n🔍 CLUSTERS DETECTED:');
        if (analysis.feedClusters && analysis.feedClusters.length > 0) {
          analysis.feedClusters.forEach((cluster, idx) => {
            const avgMinutes = Math.round(cluster.times.reduce((sum, t) => sum + t, 0) / cluster.times.length);
            const hour = Math.floor(avgMinutes / 60) % 24;
            const minute = avgMinutes % 60;
            const timeStr = `${hour}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`;
            console.log(`  Cluster ${idx + 1}: ${cluster.times.length} feeds → Average: ${timeStr}`);
            cluster.timestamps.forEach((ts, i) => {
              console.log(`    - ${formatDateTime(ts)} (${cluster.times[i]} min)`);
            });
          });
        } else {
          console.log('  ❌ No clusters detected');
        }
        
        // 4. Show patterns
        console.log('\n📈 PATTERNS FOUND (3+ occurrences):');
        if (analysis.feedPatterns && analysis.feedPatterns.length > 0) {
          analysis.feedPatterns.forEach((pattern, idx) => {
            const timeStr = `${pattern.hour}:${String(pattern.minute).padStart(2, '0')}${pattern.hour >= 12 ? 'pm' : 'am'}`;
            console.log(`  Pattern ${idx + 1}: ${timeStr} (${pattern.count} occurrences)`);
          });
          console.log(`  ✅ Using pattern: ${analysis.commonTimePattern ? `${analysis.commonTimePattern.hour}:${String(analysis.commonTimePattern.minute).padStart(2, '0')}${analysis.commonTimePattern.hour >= 12 ? 'pm' : 'am'}` : 'NONE'}`);
        } else {
          console.log('  ❌ No patterns found (need 3+ occurrences in a cluster)');
          console.log(`  ⚠️  This is why the 9:30-10am pattern isn't being used!`);
          if (recentFeedings.length > 0) {
            const morningFeeds = recentFeedings.filter(f => {
              const hour = new Date(f.timestamp).getHours();
              return hour >= 9 && hour <= 10;
            });
            console.log(`  📝 Found ${morningFeeds.length} feeds between 9am-10am in last 7 days`);
            if (morningFeeds.length < 3) {
              console.log(`  💡 Need at least 3 feeds in this time window for pattern detection`);
            }
          }
        }
        
        // 5. Show interval calculation
        console.log('\n⏱️  INTERVAL CALCULATION:');
        console.log(`  Average interval: ${analysis.avgInterval ? analysis.avgInterval.toFixed(2) : 'N/A'} hours`);
        console.log(`  Feed intervals calculated: ${analysis.feedIntervals}`);
        
        // 6. Show last feeding
        const lastFeedingTimeObj = analysis.lastFeedingTime ? new Date(analysis.lastFeedingTime) : null;
        console.log(`  Last feeding: ${lastFeedingTimeObj ? formatDateTime(analysis.lastFeedingTime) : 'N/A'}`);
        
        // 7. Simulate prediction calculation
        console.log('\n🎯 PREDICTION CALCULATION:');
        // Fetch baby data to get birth date
        let ageInMonths = 0;
        try {
          const babyData = await firestoreStorage.getKidData();
          ageInMonths = calculateAgeInMonths(babyData?.birthDate);
        } catch (e) {
          console.warn('  ⚠️  Could not fetch baby data:', e);
        }
        let feedIntervalHours;
        if (analysis.avgInterval && analysis.feedIntervals >= 2) {
          feedIntervalHours = analysis.avgInterval;
          console.log(`  Using historical interval: ${feedIntervalHours.toFixed(2)} hours`);
        } else {
          if (ageInMonths < 1) feedIntervalHours = 2;
          else if (ageInMonths < 3) feedIntervalHours = 2.5;
          else if (ageInMonths < 6) feedIntervalHours = 3;
          else feedIntervalHours = 3.5;
          console.log(`  Using age-based interval: ${feedIntervalHours.toFixed(2)} hours (age: ${ageInMonths} months)`);
        }
        
        // Show which method would be used
        if (analysis.commonTimePattern) {
          const today = new Date();
          const patternTime = new Date(today);
          patternTime.setHours(analysis.commonTimePattern.hour, analysis.commonTimePattern.minute, 0, 0);
          patternTime.setSeconds(0);
          patternTime.setMilliseconds(0);
          
          if (patternTime > now) {
            console.log(`  ✅ PRIORITY 1: Using time-of-day pattern: ${formatTime(patternTime.getTime())}`);
          } else {
            console.log(`  ⚠️  Pattern time (${formatTime(patternTime.getTime())}) is in the past, would use tomorrow`);
          }
        } else if (lastFeedingTimeObj) {
          const predictedTime = new Date(lastFeedingTimeObj);
          const totalMinutes = predictedTime.getHours() * 60 + predictedTime.getMinutes() + (feedIntervalHours * 60);
          predictedTime.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
          console.log(`  ✅ PRIORITY 2: Using interval-based: ${formatTime(lastFeedingTimeObj.getTime())} + ${feedIntervalHours.toFixed(2)}h = ${formatTime(predictedTime.getTime())}`);
        } else {
          const predictedTime = new Date(now);
          const totalMinutes = predictedTime.getHours() * 60 + predictedTime.getMinutes() + (feedIntervalHours * 60);
          predictedTime.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
          console.log(`  ✅ PRIORITY 3: Using current time + interval: ${formatTime(now)} + ${feedIntervalHours.toFixed(2)}h = ${formatTime(predictedTime.getTime())}`);
        }
        
        // 8. Show current prediction
        console.log('\n📱 CURRENT PREDICTION:');
        console.log(`  "${whatsNextText}"`);
        if (predictedTimeRef.current) {
          console.log(`  Stored time: ${formatTime(predictedTimeRef.current.time.getTime())}`);
        }
        
        console.log('\n=== END VALIDATION ===\n');
        
        return {
          recentFeedings: recentFeedings.map(f => ({
            time: formatDateTime(f.timestamp),
            timestamp: f.timestamp,
            minutesSinceMidnight: new Date(f.timestamp).getHours() * 60 + new Date(f.timestamp).getMinutes()
          })),
          clusters: analysis.feedClusters || [],
          patterns: analysis.feedPatterns || [],
          commonTimePattern: analysis.commonTimePattern,
          avgInterval: analysis.avgInterval,
          currentPrediction: whatsNextText,
          predictedTime: predictedTimeRef.current
        };
      };
      
      // Show full optimized schedule for today
      window.showDailySchedule = async () => {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setMilliseconds(0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        // Get all data
        let allFeedingsData = [];
        let allSleepSessionsData = [];
        try {
          allFeedingsData = await firestoreStorage.getAllFeedings();
          allSleepSessionsData = await firestoreStorage.getAllSleepSessions();
        } catch (e) {
          console.error('Error fetching data:', e);
          allFeedingsData = allFeedings || [];
          allSleepSessionsData = allSleepSessions || [];
        }
        
        // Run analysis
        const analysis = analyzeHistoricalIntervals(allFeedingsData, allSleepSessionsData);

        // Explainability: show the feeding sessions the model uses (not raw logs)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentFeedLogs = (allFeedingsData || []).filter(f => f && Number(f.timestamp) >= sevenDaysAgo);
        const recentFeedingSessions = buildFeedingSessions(recentFeedLogs, 45);
        const todayFeedingSessions = recentFeedingSessions.filter(s => {
          const ts = Number(s.timestamp);
          return ts >= today.getTime() && ts <= todayEnd.getTime();
        });
        
        // Get feed interval and kidId
        let ageInMonths = 0;
        try {
          const babyData = await firestoreStorage.getKidData();
          ageInMonths = calculateAgeInMonths(babyData?.birthDate);
        } catch (e) {
          console.warn('Could not fetch baby data:', e);
        }
        
        // Prefer analysis-derived interval (session-based + robust) if present
        let feedIntervalHours = Number(analysis?.feedIntervalHours);
        if (!Number.isFinite(feedIntervalHours) || feedIntervalHours <= 0) {
          if (ageInMonths < 1) feedIntervalHours = 2;
          else if (ageInMonths < 3) feedIntervalHours = 2.5;
          else if (ageInMonths < 6) feedIntervalHours = 3;
          else feedIntervalHours = 3.5;
        }

        const minFeedGapHours = Number(analysis?.minFeedGapHours);
        const effectiveMinFeedGapHours = Number.isFinite(minFeedGapHours) && minFeedGapHours > 0
          ? minFeedGapHours
          : Math.max(2.5, feedIntervalHours * 0.75);
        
        // Build schedule deterministically (no AI)
        const initialSchedule = buildDailySchedule(analysis, feedIntervalHours, ageInMonths);
        const adjustedSchedule = adjustScheduleForActualEvents(
          initialSchedule,
          allFeedingsData,
          allSleepSessionsData,
          feedIntervalHours,
          analysis,
          ageInMonths
        );
        
        // Format time helper
        const formatTime = (date) => {
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };

        const fmtDateTime = (ms) => {
          const d = new Date(ms);
          return d.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
          });
        };
        
        console.log('\n=== SCHEDULE DEBUG (EXPLAINABLE) ===\n');
        console.log(`Current time: ${formatTime(now)}\n`);

        // 1) Feeding sessions used for learning
        console.log('🧩 FEEDING SESSIONS (last 7 days, merged within 45m):');
        if (recentFeedingSessions.length === 0) {
          console.log('  (none)');
        } else {
          recentFeedingSessions.slice(-30).forEach((s) => {
            const n = s?._sessionCount ? ` (${s._sessionCount} logs)` : '';
            console.log(`  - ${fmtDateTime(s.timestamp)} • ${s.ounces ?? '?'} oz${n}`);
          });
          if (recentFeedingSessions.length > 30) {
            console.log(`  … (${recentFeedingSessions.length - 30} more)`);
          }
        }

        console.log('\n🧾 TODAY FEEDING SESSIONS:');
        if (todayFeedingSessions.length === 0) {
          console.log('  (none today yet)');
        } else {
          todayFeedingSessions.forEach(s => {
            const n = s?._sessionCount ? ` (${s._sessionCount} logs)` : '';
            console.log(`  - ${formatTime(new Date(s.timestamp))} • ${s.ounces ?? '?'} oz${n}`);
          });
        }

        // 2) Key stats the engine is using
        console.log('\n📊 MODEL STATS:');
        console.log(`  feedIntervalHours (learned): ${Number(feedIntervalHours).toFixed(2)}h`);
        console.log(`  minFeedGapHours (effective): ${Number(effectiveMinFeedGapHours).toFixed(2)}h`);
        console.log(`  feedPatterns: ${(analysis?.feedPatterns || []).length} | sleepPatterns: ${(analysis?.sleepPatterns || []).length}`);
        
        if (adjustedSchedule.length === 0) {
          console.log('❌ No schedule events found. This might mean:');
          console.log('  - No patterns detected (need 3+ occurrences)');
          console.log('  - All patterns are in the past today');
          console.log('  - Schedule needs to be rebuilt');
        } else {
          console.log('📅 SCHEDULE EVENTS:');
          adjustedSchedule.forEach((event, idx) => {
            const isPast = event.time.getTime() < now.getTime();
            const isNow = Math.abs(event.time.getTime() - now.getTime()) < 30 * 60 * 1000; // Within 30 min
            const status = isNow ? '🟢 NOW' : isPast ? '✅ PAST' : '⏰ UPCOMING';
            const typeIcon = event.type === 'feed' ? '🍼' : event.type === 'wake' ? '⏰' : '😴';
            const typeLabel = event.type === 'feed' ? 'Feed' : event.type === 'wake' ? 'Wake' : 'Sleep';

            // Explain why it exists
            let reason = '';
            if (event.actual) reason = '(Actual)';
            else if (event.patternBased) reason = `(Pattern: ${event.patternCount ?? event.count ?? '?'} occ)`;
            else if (event.intervalBased) reason = `(${event.source || 'Interval'})`;
            else if (event.adjusted) reason = '(Adjusted)';
            else reason = '(Unknown)';

            // If feed, show target oz ONLY in console
            let extra = '';
            if (event.type === 'feed') {
              const t = Number(event.targetOz);
              const r = event.targetOzRange;
              const rMin = Array.isArray(r) ? Number(r[0]) : Number(r?.min);
              const rMax = Array.isArray(r) ? Number(r[1]) : Number(r?.max);
              const fmt = (n) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10).replace(/\.0$/, '') : null);
              const tS = fmt(t);
              const rMinS = fmt(rMin);
              const rMaxS = fmt(rMax);
              if (rMinS && rMaxS) extra = ` • target ${tS ? `~${tS}` : ''}${tS ? ' ' : ''}(${rMinS}-${rMaxS} oz)`;
              else if (tS) extra = ` • target ~${tS} oz`;
            }
            
            console.log(`  ${idx + 1}. ${status} ${typeIcon} ${typeLabel} at ${formatTime(event.time)} ${reason}${extra}`);
          });
          
          // Show next event
          const nextEvent = adjustedSchedule.find(e => e.time.getTime() > now.getTime());
          if (nextEvent) {
            const eventIcon = nextEvent.type === 'feed' ? '🍼 Feed' : nextEvent.type === 'wake' ? '⏰ Wake' : '😴 Sleep';
            console.log(`\n🎯 NEXT EVENT: ${eventIcon} at ${formatTime(nextEvent.time)}`);
          } else {
            console.log(`\n🎯 NEXT EVENT: None scheduled (all events are in the past)`);
          }
        }
        
        console.log('\n=== END SCHEDULE DEBUG ===\n');

        // Stash last debug payload for quick inspection
        window.__ttScheduleDebug = {
          now,
          analysis,
          feedIntervalHours,
          minFeedGapHours: effectiveMinFeedGapHours,
          recentFeedingSessions,
          todayFeedingSessions,
          initialSchedule,
          schedule: adjustedSchedule
        };
        
        return {
          schedule: adjustedSchedule,
          initialSchedule,
          analysis,
          feedIntervalHours
        };
      };

      // Alias: more explicit name for explainability (same output)
      window.explainSchedule = window.showDailySchedule;
      
      // Test function for day/night sleep labels
      // Call from console: window.testSleepLabels()
      window.testSleepLabels = () => {
        // Get current sleep settings
        const settings = sleepSettings || {};
        const dayStart = Number(settings?.sleepDayStart ?? settings?.daySleepStartMinutes ?? 390);
        const dayEnd = Number(settings?.sleepDayEnd ?? settings?.daySleepEndMinutes ?? 1170);
        
        const dayStartHour = Math.floor(dayStart / 60);
        const dayStartMin = dayStart % 60;
        const dayEndHour = Math.floor(dayEnd / 60);
        const dayEndMin = dayEnd % 60;
        
        console.log('\n=== TESTING SLEEP LABELS ===\n');
        console.log(`Day sleep window: ${dayStartHour}:${String(dayStartMin).padStart(2, '0')} - ${dayEndHour}:${String(dayEndMin).padStart(2, '0')}`);
        console.log(`(Minutes: ${dayStart} - ${dayEnd})\n`);
        
        // Test various times throughout the day
        const testTimes = [
          { hour: 6, minute: 0, label: '6:00 AM (early morning)' },
          { hour: 9, minute: 30, label: '9:30 AM (morning nap)' },
          { hour: 12, minute: 0, label: '12:00 PM (noon)' },
          { hour: 14, minute: 30, label: '2:30 PM (afternoon nap)' },
          { hour: 18, minute: 0, label: '6:00 PM (evening)' },
          { hour: 20, minute: 0, label: '8:00 PM (night sleep)' },
          { hour: 22, minute: 0, label: '10:00 PM (night sleep)' },
          { hour: 2, minute: 0, label: '2:00 AM (night sleep)' },
        ];
        
        testTimes.forEach(({ hour, minute, label }) => {
          const testDate = new Date();
          testDate.setHours(hour, minute, 0, 0);
          
          // Use the same logic as getSleepLabel
          const mins = hour * 60 + minute;
          const isDaySleep = dayStart <= dayEnd
            ? (mins >= dayStart && mins < dayEnd)
            : (mins >= dayStart || mins < dayEnd);
          const result = isDaySleep ? 'Nap' : 'Sleep';
          
          const timeStr = testDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          console.log(`${timeStr.padEnd(10)} → ${result.padEnd(5)} (${label})`);
        });
        
        console.log('\n=== CURRENT PREDICTION ===');
        const currentPrediction = whatsNextText;
        console.log(`"${currentPrediction}"`);
        
        if (predictedTimeRef.current) {
          const predTime = predictedTimeRef.current.time;
          const predType = predictedTimeRef.current.type;
          if (predType === 'sleep' || predType === 'nap') {
            const mins = predTime.getHours() * 60 + predTime.getMinutes();
            const isDaySleep = dayStart <= dayEnd
              ? (mins >= dayStart && mins < dayEnd)
              : (mins >= dayStart || mins < dayEnd);
            const expectedLabel = isDaySleep ? 'Nap' : 'Sleep';
            const timeStr = predTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            console.log(`Predicted time: ${timeStr}`);
            console.log(`Expected label: ${expectedLabel}`);
            console.log(`Actual text: "${currentPrediction}"`);
            console.log(`✓ Match: ${currentPrediction.includes(expectedLabel)}`);
          }
        }
        
        console.log('\n=== SCHEDULE EVENTS ===');
        const schedule = dailySchedule || dailyScheduleRef.current || [];
        const sleepEvents = schedule.filter(e => e.type === 'sleep').slice(0, 5);
        if (sleepEvents.length > 0) {
          sleepEvents.forEach(event => {
            const timeStr = event.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const mins = event.time.getHours() * 60 + event.time.getMinutes();
            const isDaySleep = dayStart <= dayEnd
              ? (mins >= dayStart && mins < dayEnd)
              : (mins >= dayStart || mins < dayEnd);
            const expectedLabel = isDaySleep ? 'Nap' : 'Sleep';
            console.log(`${timeStr.padEnd(10)} → ${expectedLabel}`);
          });
        } else {
          console.log('No sleep events in schedule');
        }
        
        console.log('\n=== END TEST ===\n');
        
        return {
          dayWindow: { start: dayStart, end: dayEnd },
          currentPrediction: whatsNextText,
          predictedTime: predictedTimeRef.current
        };
      };
      
      // Debug function for timeline/accordion
      // Call from console: window.debugTimeline()
      window.debugTimeline = () => {
        console.log('\n=== TIMELINE DEBUG ===\n');
        
        // Check schedule state
        const refSchedule = dailyScheduleRef.current;
        const stateSchedule = dailySchedule;
        const isScheduleReady = scheduleReady;
        const isAccordionOpen = whatsNextAccordionOpen;
        
        console.log('📊 STATE:');
        console.log(`  scheduleReady: ${isScheduleReady}`);
        console.log(`  accordionOpen: ${isAccordionOpen}`);
        console.log(`  refSchedule exists: ${!!refSchedule}`);
        console.log(`  refSchedule length: ${refSchedule?.length || 0}`);
        console.log(`  stateSchedule exists: ${!!stateSchedule}`);
        console.log(`  stateSchedule length: ${stateSchedule?.length || 0}`);
        
        // Get the schedule source
        const scheduleSource = (refSchedule && Array.isArray(refSchedule) && refSchedule.length > 0) 
          ? refSchedule 
          : (stateSchedule && Array.isArray(stateSchedule) && stateSchedule.length > 0)
            ? stateSchedule
            : null;
        
        console.log(`\n📅 SCHEDULE SOURCE: ${scheduleSource ? 'Found' : 'Missing'}`);
        
        if (scheduleSource) {
          console.log(`  Total events: ${scheduleSource.length}`);
          
          // Filter to today
          const now = Date.now();
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);
          
          const todayEvents = scheduleSource.filter(event => {
            if (!event || !event.time) return false;
            const eventTime = event.time instanceof Date ? event.time.getTime() : new Date(event.time).getTime();
            return eventTime >= todayStart.getTime() && eventTime <= todayEnd.getTime();
          });
          
          console.log(`  Today's events: ${todayEvents.length}`);
          
          // Filter out wake events
          const withoutWake = todayEvents.filter(e => e.type !== 'wake');
          console.log(`  After filtering wake events: ${withoutWake.length}`);
          
          // Show event breakdown
          const feedCount = withoutWake.filter(e => e.type === 'feed').length;
          const sleepCount = withoutWake.filter(e => e.type === 'sleep').length;
          console.log(`    Feeds: ${feedCount}`);
          console.log(`    Sleeps: ${sleepCount}`);
          
          // Show first 5 events
          console.log('\n📋 FIRST 5 EVENTS:');
          withoutWake.slice(0, 5).forEach((event, idx) => {
            const timeStr = event.time instanceof Date 
              ? event.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : new Date(event.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const isPast = (event.time instanceof Date ? event.time.getTime() : new Date(event.time).getTime()) < now;
            console.log(`  ${idx + 1}. ${event.type} at ${timeStr} ${isPast ? '(PAST)' : '(UPCOMING)'}`);
          });
          
          // Check feedings and sleep sessions
          console.log('\n🍼 DATA:');
          console.log(`  feedings length: ${feedings?.length || 0}`);
          console.log(`  sleepSessions length: ${sleepSessions?.length || 0}`);
          console.log(`  allFeedings length: ${allFeedings?.length || 0}`);
          console.log(`  allSleepSessions length: ${allSleepSessions?.length || 0}`);
          
          // Check if events match
          if (feedings && feedings.length > 0) {
            const todayFeedings = feedings.filter(f => {
              const feedTime = f.timestamp;
              return feedTime >= todayStart.getTime() && feedTime <= todayEnd.getTime();
            });
            console.log(`  Today's feedings: ${todayFeedings.length}`);
          }
          
          if (sleepSessions && sleepSessions.length > 0) {
            const todaySleep = sleepSessions.filter(s => {
              if (!s.startTime) return false;
              return s.startTime >= todayStart.getTime() && s.startTime <= todayEnd.getTime();
            });
            console.log(`  Today's sleep sessions: ${todaySleep.length}`);
          }
        } else {
          console.log('❌ No schedule found!');
          console.log('  This might mean:');
          console.log('    - Schedule hasn\'t been built yet');
          console.log('    - generateWhatsNext() hasn\'t run');
          console.log('    - There was an error building the schedule');
        }
        
        console.log('\n=== END DEBUG ===\n');
        
        return {
          scheduleReady: isScheduleReady,
          accordionOpen: isAccordionOpen,
          refSchedule: refSchedule?.length || 0,
          stateSchedule: stateSchedule?.length || 0,
          scheduleSource: scheduleSource?.length || 0
        };
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedings, sleepSessions, allFeedings, allSleepSessions, whatsNextText]);

  // Inject a calm zZz keyframe animation (used for the Sleep in-progress indicator)
  useEffect(() => {
    try {
      if (document.getElementById('tt-zzz-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-zzz-style';
      s.textContent = `@keyframes ttZzz{0%{opacity:0;transform:translateY(2px)}20%{opacity:.9}80%{opacity:.9;transform:translateY(-4px)}100%{opacity:0;transform:translateY(-6px)}}`;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Ensure zzz animation styles from TrackerCard are available (for What's Next timer)
  useEffect(() => {
    try {
      if (document.getElementById('tt-zzz-anim')) return;
      const style = document.createElement('style');
      style.id = 'tt-zzz-anim';
      style.textContent = `
        @keyframes floatingZs {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-4px) scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-8px) scale(1);
            opacity: 0;
          }
        }
        .zzz {
          display: inline-block;
        }
        .zzz > span {
          display: inline-block;
          animation: floatingZs 2s ease-in-out infinite;
        }
        .zzz > span:nth-child(1) { animation-delay: 0s; }
        .zzz > span:nth-child(2) { animation-delay: 0.3s; }
        .zzz > span:nth-child(3) { animation-delay: 0.6s; }
      `;
      document.head.appendChild(style);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Format elapsed time for timer display (borrowed from TrackerCard)
  const formatElapsedHmsTT = (ms) => {
    const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

    if (h > 0) {
      const hStr = h >= 10 ? pad2(h) : String(h);
      const mStr = pad2(m);
      const sStr = pad2(s);
      return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: `${hStr}h ${mStr}m ${sStr}s` };
    }

    if (m > 0) {
      const mStr = m >= 10 ? pad2(m) : String(m);
      const sStr = pad2(s);
      return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
    }

    const sStr = s < 10 ? String(s) : pad2(s);
    return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
  };

  // Inject BMW-style charging pulse animation for active sleep progress bar
  useEffect(() => {
    try {
      if (document.getElementById('tt-sleep-pulse-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-sleep-pulse-style';
      s.textContent = `
        @keyframes ttSleepPulse {
          0% {
            transform: translateX(-100%) skewX(-20deg);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(200%) skewX(-20deg);
            opacity: 0;
          }
        }
        .tt-sleep-progress-pulse {
          position: relative;
          overflow: hidden;
        }
        .tt-sleep-progress-pulse::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.5),
            transparent
          );
          animation: ttSleepPulse 2.5s ease-in-out infinite;
          border-radius: inherit;
          pointer-events: none;
        }
      `;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Helper function to check if a sleep session overlaps with existing ones
  const checkSleepOverlap = async (startMs, endMs, excludeId = null) => {
    try {
      const allSessions = await firestoreStorage.getAllSleepSessions();
      const nowMs = Date.now();
      
      // Normalize the new sleep interval
      const normalizeInterval = (sMs, eMs) => {
        let s = Number(sMs);
        let e = Number(eMs);
        if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
        if (s > nowMs + 3 * 3600000) s -= 86400000;
        if (e < s) s -= 86400000;
        if (e < s) return null;
        return { startMs: s, endMs: e };
      };
      
      const newNorm = normalizeInterval(startMs, endMs);
      if (!newNorm) return false; // Invalid interval, let other validation catch it
      
      // Check each existing session for overlap
      for (const session of allSessions) {
        // Skip the session being edited
        if (excludeId && session.id === excludeId) continue;
        
        // For active sleeps, use current time as end
        const existingEnd = session.isActive ? nowMs : (session.endTime || null);
        if (!session.startTime || !existingEnd) continue;
        
        const existingNorm = normalizeInterval(session.startTime, existingEnd);
        if (!existingNorm) continue;
        
        // Check if ranges overlap: (start1 < end2) && (start2 < end1)
        if (newNorm.startMs < existingNorm.endMs && existingNorm.startMs < newNorm.endMs) {
          return true; // Overlap found
        }
      }
      
      return false; // No overlap
    } catch (error) {
      console.error('Error checking sleep overlap:', error);
      // On error, allow the save (fail open) - user can manually check
      return false;
    }
  };

  const _pad2 = (n) => String(n).padStart(2, '0');
  const _toHHMM = (ms) => {
    try {
      const d = new Date(ms);
      return _pad2(d.getHours()) + ':' + _pad2(d.getMinutes());
    } catch (e) {
      return '';
    }
  };
  const _toHHMMNoZero = (ms) => {
    try {
      const d = new Date(ms);
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h === 0 ? 12 : h;
      return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch {
      return '';
    }
  };
  const _hhmmToMsToday = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string' || hhmm.indexOf(':') === -1) return null;
    const parts = hhmm.split(':');
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const d = new Date();
    d.setHours(hh);
    d.setMinutes(mm);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d.getTime();
  };
  const _hhmmToMsForDate = (hhmm, baseDate) => {
    if (!hhmm || typeof hhmm !== 'string' || hhmm.indexOf(':') === -1) return null;
    const parts = hhmm.split(':');
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const d = new Date(baseDate || Date.now());
    d.setHours(hh);
    d.setMinutes(mm);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d.getTime();
  };

  // Sleep-specific time parsing helpers:
  // - If it's after midnight and the user picks a late-night time (e.g. 23:00 at 01:00), assume they mean the previous day.
  // - For end times, if the chosen time-of-day is earlier than the start time-of-day, assume the sleep crossed midnight and add a day.
  const _hhmmToMsNearNowSmart = (hhmm, nowMs = Date.now(), futureCutoffHours = 3) => {
    const ms = _hhmmToMsForDate(hhmm, nowMs);
    if (!ms) return null;
    const cutoff = futureCutoffHours * 3600000;
    return (ms > (nowMs + cutoff)) ? (ms - 86400000) : ms;
  };
  const _normalizeSleepStartMs = (startMs, nowMs = Date.now()) => {
    if (!startMs) return null;
    // If start is wildly in the future (due to day ambiguity), pull it back 1 day.
    return (startMs > nowMs + 3 * 3600000) ? (startMs - 86400000) : startMs;
  };
  const _hhmmToSleepEndMs = (hhmm, startMs, nowMs = Date.now()) => {
    const base = (typeof startMs === 'number' && Number.isFinite(startMs)) ? startMs : nowMs;
    let endMs = _hhmmToMsForDate(hhmm, base);
    if (!endMs) return null;
    // If end looks earlier than start, assume it rolled past midnight.
    if (typeof startMs === 'number' && Number.isFinite(startMs) && endMs < startMs) {
      endMs += 86400000;
    }
    // Also guard against accidentally selecting an end time that's a full day ahead.
    if (endMs > nowMs + 6 * 3600000) {
      endMs -= 86400000;
    }
    return endMs;
  };
  const _formatMMSS = (ms) => {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const hh = Math.floor(total / 3600);
    const rem = total % 3600;
    const mm = Math.floor(rem / 60);
    const ss = rem % 60;
    // < 1 hour: MM:SS  |  >= 1 hour: H:MM:SS
    return hh > 0
      ? (hh + ':' + _pad2(mm) + ':' + _pad2(ss))
      : (mm + ':' + _pad2(ss));
  };

  // ========================================
  // ADDITIVE: Today Progress Bars (Experiment)
  // ========================================

  const ProgressBarRow = ({
    label,
    value,
    target,
    unit,
    deltaLabel,
    deltaIsGood
  }) => {
    const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

    return React.createElement(
      'div',
      { className: "mt-5" },
      React.createElement(
        'div',
        { className: "text-sm font-medium text-gray-700 mb-1" },
        label
      ),
      React.createElement(
        'div',
        { className: "relative w-full h-4 bg-gray-200 rounded-full overflow-hidden" },
        React.createElement('div', {
          className: "absolute left-0 top-0 h-full bg-indigo-600 rounded-full",
          style: {
            width: `${pct}%`,
            transition: "width 300ms ease-out"
          }
        })
      ),
      React.createElement(
        'div',
        { className: "mt-1 flex items-baseline justify-between" },
        React.createElement(
          'div',
          { className: "text-base font-semibold text-indigo-600" },
          `${value} ${unit} `,
          React.createElement(
            'span',
            { className: "text-sm font-normal text-gray-500" },
            `of ${target} ${unit}`
          )
        ),
        React.createElement(
          'div',
          { className: "text-xs font-medium" },
          React.createElement(
            'span',
            { className: deltaIsGood ? "text-green-600 font-semibold" : "text-red-600 font-semibold" },
            deltaLabel
          ),
          React.createElement(
            'span',
            { className: "text-gray-400 font-normal ml-1" },
            "vs yday"
          )
        )
      )
    );
  };

  // Keep time inputs in sync with active sleep state
  useEffect(() => {
    if (activeSleep && activeSleep.startTime) {
      setSleepStartStr(_toHHMM(activeSleep.startTime));
      if (activeSleep.id && activeSleep.id !== lastActiveSleepId) {
        setSleepEndStr('');
        setLastActiveSleepId(activeSleep.id);
      }
      return;
    }
    if (logMode === 'sleep') {
      setSleepStartStr(_toHHMM(Date.now()));
      setSleepEndStr('');
    }
  }, [logMode, activeSleep]);

  useEffect(() => {
    loadData();
  }, [kidId]);

  useEffect(() => {
    if (!kidId) return;
    loadSleepSessions();
  }, [kidId, activeSleep, currentDate]);

  // Intersection Observer to detect when card scrolls into view (matches analytics page animation)
  // Use callback ref to set up observer when element is attached to DOM
  const cardRefCallback = React.useCallback((element) => {
    if (!element) {
      cardRef.current = null;
      return;
    }
    
    cardRef.current = element;
    
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: animate immediately if IntersectionObserver not available
      setCardVisible(true);
      return;
    }
    
    // Check if element is already visible (in case it's visible on mount)
    const checkInitialVisibility = () => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
      if (isVisible) {
        setCardVisible(true);
        return true;
      }
      return false;
    };
    
    // If already visible, animate immediately
    if (checkInitialVisibility()) {
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCardVisible(true);
            observer.disconnect(); // Disconnect after first trigger
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    // Store observer cleanup on element for later cleanup if needed
    element._observer = observer;
  }, []);

  // Log render state after DOM updates (moved after calculations to avoid TDZ issues)

  const loadSleepSessions = async () => {
    const myTransitionId = transitionIdRef.current; // Capture transition ID
    try {
      const sessions = await firestoreStorage.getAllSleepSessions();
      setAllSleepSessions(sessions || []); // Store all sleep sessions for yesterday calculation
      const ended = (sessions || []).filter(s => s && s.endTime);
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      const yDate = new Date(currentDate);
      yDate.setDate(yDate.getDate() - 1);
      const yStart = new Date(yDate);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yDate);
      yEnd.setHours(23, 59, 59, 999);
      const dayStartMs = startOfDay.getTime();
      const dayEndMs = endOfDay.getTime() + 1; // make end inclusive
      const yDayStartMs = yStart.getTime();
      const yDayEndMs = yEnd.getTime() + 1;

      const _normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
        let sMs = Number(startMs);
        let eMs = Number(endMs);
        if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
        // If start time accidentally landed in the future (common around midnight), pull it back one day.
        if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
        // If end < start, assume the sleep crossed midnight and the start belongs to the previous day.
        if (eMs < sMs) sMs -= 86400000;
        if (eMs < sMs) return null; // still invalid
        return { startMs: sMs, endMs: eMs };
      };

      const _overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
        const a = Math.max(rangeStartMs, winStartMs);
        const b = Math.min(rangeEndMs, winEndMs);
        return Math.max(0, b - a);
      };

      const normEnded = ended.map((s) => {
        const norm = _normalizeSleepInterval(s.startTime, s.endTime);
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      }).filter(Boolean);

      const todaySessions = normEnded.filter(s => _overlapMs(s._normStartTime, s._normEndTime, dayStartMs, dayEndMs) > 0);
      const ySessions = normEnded.filter(s => _overlapMs(s._normStartTime, s._normEndTime, yDayStartMs, yDayEndMs) > 0);
      const todayMs = todaySessions.reduce((sum, ss) => sum + _overlapMs(ss._normStartTime, ss._normEndTime, dayStartMs, dayEndMs), 0);
      const yMs = ySessions.reduce((sum, ss) => sum + _overlapMs(ss._normStartTime, ss._normEndTime, yDayStartMs, yDayEndMs), 0);
      setSleepSessions(todaySessions.sort((a, b) => (b._normStartTime || 0) - (a._normStartTime || 0)));
      setSleepTodayMs(todayMs);
      setSleepTodayCount(todaySessions.length);
      setSleepYesterdayMs(yMs);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (err) {
      console.error("Failed to load sleep sessions", err);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  useEffect(() => {
    if (!loading && kidId) {
      loadFeedings();
      const interval = setInterval(loadFeedings, 5000);
      return () => clearInterval(interval);
    }
  }, [currentDate, loading, kidId]);

  const loadFeedings = async () => {
    const myTransitionId = transitionIdRef.current; // Capture transition ID
    try {
      const allFeedingsData = await firestoreStorage.getAllFeedings();
      setAllFeedings(allFeedingsData); // Store all feedings for yesterday calculation
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const yDate = new Date(currentDate);
      yDate.setDate(yDate.getDate() - 1);
      const yStart = new Date(yDate);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yDate);
      yEnd.setHours(23, 59, 59, 999);

      const yFeedings = allFeedingsData.filter(f => f.timestamp >= yStart.getTime() && f.timestamp <= yEnd.getTime());
      const yConsumed = yFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
      setYesterdayConsumed(yConsumed);
      setYesterdayFeedingCount(yFeedings.length);

      const dayFeedings = allFeedingsData.filter(f =>
        f.timestamp >= startOfDay.getTime() &&
        f.timestamp <= endOfDay.getTime()
      ).map(f => ({
        ...f,
        time: new Date(f.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      })).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
      
      setFeedings(dayFeedings);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    } catch (error) {
      console.error('Error loading feedings:', error);
      // Only decrement if still current transition
      if (myTransitionId === transitionIdRef.current) {
        setTransitionPending(p => Math.max(0, p - 1));
      }
    }
  };

  const loadData = async () => {
    if (!kidId) return;
    try {
      const settings = await firestoreStorage.getSettings();
      if (settings) {
        if (settings.babyWeight) setBabyWeight(settings.babyWeight);
        if (settings.multiplier) setMultiplier(settings.multiplier);
      }
      const ss = await firestoreStorage.getSleepSettings();
      setSleepSettings(ss || null);
      await loadFeedings();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeeding = async () => {
    const amount = parseFloat(ounces);
    if (!amount || amount <= 0) return;

    let feedingTime;
    if (customTime) {
      const [hours, minutes] = customTime.split(':');
      feedingTime = new Date(currentDate);
      feedingTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      feedingTime = new Date();
    }

    try {
      await firestoreStorage.addFeeding(amount, feedingTime.getTime());
      setOunces('');
      setCustomTime('');
      setShowCustomTime(false);
      await loadFeedings(); // Refresh immediately
    } catch (error) {
      console.error('Error adding feeding:', error);
    }
  };

  const handleStartEdit = (feeding) => {
    setEditingFeedingId(feeding.id);
    setEditOunces(feeding.ounces.toString());
    const date = new Date(feeding.timestamp);
    setEditTime(date.toTimeString().slice(0, 5));
  };

  const handleSaveEdit = async () => {
    const amount = parseFloat(editOunces);
    if (!amount || amount <= 0) return;

    const [hours, minutes] = editTime.split(':');
    const feedingTime = new Date(currentDate);
    feedingTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await firestoreStorage.updateFeeding(editingFeedingId, amount, feedingTime.getTime());
      setEditingFeedingId(null);
      await loadFeedings(); // Refresh immediately
    } catch (error) {
      console.error('Error updating feeding:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingFeedingId(null);
  };

  const handleDeleteFeeding = async (feedingId) => {
    if (!confirm('Delete this feeding?')) return;
    try {
      await firestoreStorage.deleteFeeding(feedingId);
      await loadFeedings(); // Refresh immediately
    } catch (error) {
      console.error('Error deleting feeding:', error);
    }
  };

  const handleStartEditSleep = (session) => {
    setEditingSleepId(session.id);
    setSleepEditStartStr(_toHHMM(session.startTime));
    setSleepEditEndStr(_toHHMM(session.endTime));
  };

  const handleSaveSleepEdit = async () => {
    if (!editingSleepId) return;
    const session = sleepSessions.find((sess) => sess.id === editingSleepId);
    const baseDate = session?.startTime || currentDate;
    let startMs = _hhmmToMsForDate(sleepEditStartStr, baseDate);
    let endMs = _hhmmToMsForDate(sleepEditEndStr, baseDate);
    if (!startMs || !endMs) return;
    // If the user edits a sleep that crosses midnight (11pm → 1am), interpret end as next day.
    if (typeof session?.endTime === 'number' && Number.isFinite(session.endTime) && startMs > session.endTime) {
      startMs -= 86400000;
    }
    if (endMs < startMs) {
      endMs += 86400000;
    }
    
    // Check for overlaps (exclude the session being edited)
    try {
      const hasOverlap = await checkSleepOverlap(startMs, endMs, editingSleepId);
      if (hasOverlap) {
        alert('This sleep session overlaps with an existing sleep session. Please adjust the times.');
        return;
      }
    } catch (err) {
      console.error('Error checking overlap:', err);
      // Continue with save on error (fail open)
    }
    
    try {
      await firestoreStorage.updateSleepSession(editingSleepId, { startTime: startMs, endTime: endMs });
      setEditingSleepId(null);
      setSleepEditStartStr('');
      setSleepEditEndStr('');
      await loadSleepSessions();
    } catch (err) {
      console.error('Error updating sleep session:', err);
    }
  };

  const handleCancelSleepEdit = () => {
    setEditingSleepId(null);
    setSleepEditStartStr('');
    setSleepEditEndStr('');
  };

  const handleDeleteSleepSession = async (sleepId) => {
    if (!confirm('Delete this sleep entry?')) return;
    try {
      await firestoreStorage.deleteSleepSession(sleepId);
      await loadSleepSessions();
    } catch (err) {
      console.error('Error deleting sleep session:', err);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    // Save current card data before changing date for smooth transition
    // Calculate target values inline since they're not available yet
    const targetOz = babyWeight ? babyWeight * multiplier : 0;
    const targetHrs = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number") ? sleepSettings.sleepTargetHours : 14;
    const currentFeedingData = formatFeedingsForCard(feedings, targetOz, currentDate);
    const currentSleepData = formatSleepSessionsForCard(sleepSessions, targetHrs, currentDate, activeSleep);
    setPrevFeedingCardData(currentFeedingData);
    setPrevSleepCardData(currentSleepData);
    // Start new transition and expect 2 completions
    transitionIdRef.current += 1;
    setTransitionPending(2);
    setIsDateTransitioning(true);
    setCurrentDate(newDate);
    prevDateRef.current = newDate;
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    // Save current card data before changing date for smooth transition
    // Calculate target values inline since they're not available yet
    const targetOz = babyWeight ? babyWeight * multiplier : 0;
    const targetHrs = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number") ? sleepSettings.sleepTargetHours : 14;
    const currentFeedingData = formatFeedingsForCard(feedings, targetOz, currentDate);
    const currentSleepData = formatSleepSessionsForCard(sleepSessions, targetHrs, currentDate, activeSleep);
    setPrevFeedingCardData(currentFeedingData);
    setPrevSleepCardData(currentSleepData);
    // Start new transition and expect 2 completions
    transitionIdRef.current += 1;
    setTransitionPending(2);
    setIsDateTransitioning(true);
    setCurrentDate(newDate);
    prevDateRef.current = newDate;
  };

  const isToday = () => {
    return currentDate.toDateString() === new Date().toDateString();
  };

  // What's Next card animation state (v3 only)
  const prevIsTodayRef = React.useRef(isToday());
  React.useEffect(() => {
    if (uiVersion !== 'v3') return;
    
    const currentlyToday = isToday();
    const wasToday = prevIsTodayRef.current;
    
    if (currentlyToday && !wasToday) {
      // Entering: show card with enter animation
      setWhatsNextCardAnimating('entering');
      setTimeout(() => {
        setWhatsNextCardAnimating(null);
      }, 400);
    } else if (!currentlyToday && wasToday) {
      // Exiting: start exit animation, then hide
      setWhatsNextCardAnimating('exiting');
      setTimeout(() => {
        setWhatsNextCardAnimating(null);
      }, 400);
    }
    
    prevIsTodayRef.current = currentlyToday;
  }, [currentDate, uiVersion]);

  const formatDate = (date) => {
    if (isToday()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime12Hour = (date) => {
    if (!date || !(date instanceof Date)) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }).toLowerCase();
  };

  const getLastFeeding = () => {
    if (!feedings || feedings.length === 0) return null;
    return feedings[0];
  };

  const getLastSleep = () => {
    if (!sleepSessions || sleepSessions.length === 0) return null;
    // Filter out active sessions (those without endTime or with isActive flag)
    const completed = sleepSessions.filter(s => s.endTime && !s.isActive);
    return completed.length > 0 ? completed[0] : null;
  };

  // Data transformation helpers for new TrackerCard components
  // Helper function to determine sleep type (must be defined before formatSleepSessionsForCard)
  const _sleepTypeForSession = (session) => {
    if (!session) return 'night';
    if (session.sleepType === 'day' || session.sleepType === 'night') return session.sleepType;
    if (typeof session.isDaySleep === 'boolean') return session.isDaySleep ? 'day' : 'night';
    const start = session.startTime;
    if (!start) return 'night';
    const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
    const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);
    const mins = (() => {
      try {
        const d = new Date(start);
        return d.getHours() * 60 + d.getMinutes();
      } catch {
        return 0;
      }
    })();
    const within = dayStart <= dayEnd
      ? (mins >= dayStart && mins <= dayEnd)
      : (mins >= dayStart || mins <= dayEnd);
    return within ? 'day' : 'night';
  };

  const formatFeedingsForCard = (feedings, targetOunces, currentDate) => {
    if (!feedings || !Array.isArray(feedings)) return { total: 0, target: targetOunces || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    
    // Filter to today only
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayFeedings = feedings.filter(f => {
      const timestamp = f.timestamp || 0;
      return timestamp >= startOfDay.getTime() && timestamp <= endOfDay.getTime();
    });
    
    // Calculate total
    const total = todayFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
    const target = targetOunces || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
    
    // Format timeline items (newest first)
    const timelineItems = todayFeedings
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .map(f => ({
        id: f.id,
        ounces: f.ounces,
        timestamp: f.timestamp,
        notes: f.notes || null,
        photoURLs: f.photoURLs || null
      }));
    
    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].timestamp : null;
    
    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const formatSleepSessionsForCard = (sessions, targetHours, currentDate, activeSleepSession = null) => {
    if (!sessions || !Array.isArray(sessions)) return { total: 0, target: targetHours || 0, percent: 0, timelineItems: [], lastEntryTime: null };
    
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    const dayStartMs = startOfDay.getTime();
    const dayEndMs = endOfDay.getTime() + 1; // make end inclusive

    // Use the same normalization and overlap helpers as loadSleepSessions
    const _normalizeSleepInterval = (startMs, endMs, nowMs = Date.now()) => {
      let sMs = Number(startMs);
      let eMs = Number(endMs);
      if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
      // If start time accidentally landed in the future (common around midnight), pull it back one day.
      if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
      // If end < start, assume the sleep crossed midnight and the start belongs to the previous day.
      if (eMs < sMs) sMs -= 86400000;
      if (eMs < sMs) return null; // still invalid
      return { startMs: sMs, endMs: eMs };
    };

    const _overlapMs = (rangeStartMs, rangeEndMs, winStartMs, winEndMs) => {
      const a = Math.max(rangeStartMs, winStartMs);
      const b = Math.min(rangeEndMs, winEndMs);
      return Math.max(0, b - a);
    };

    // Normalize all sessions (including active sleep)
    const normSessions = sessions.map((s) => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      if (isActive) {
        // Active sleep - use current time as end
        const norm = _normalizeSleepInterval(s.startTime, Date.now());
        return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
      }
      if (!s.endTime) return null; // Skip incomplete sessions (except active)
      const norm = _normalizeSleepInterval(s.startTime, s.endTime);
      return norm ? { ...s, _normStartTime: norm.startMs, _normEndTime: norm.endMs } : null;
    }).filter(Boolean);

    // Filter to sessions that overlap with current day (using overlap, not just start/end check)
    const todaySessions = normSessions.filter(s => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      const endTime = isActive ? Date.now() : (s._normEndTime || s.endTime);
      return _overlapMs(s._normStartTime || s.startTime, endTime, dayStartMs, dayEndMs) > 0;
    });

    // Calculate total using overlap (like loadSleepSessions does) - only counts portion in current day
    const completedSessions = todaySessions.filter(s => {
      const isActive = activeSleepSession && s.id === activeSleepSession.id;
      return s.endTime && !isActive; // Only completed, non-active sessions
    });
    
    let totalMs = completedSessions.reduce((sum, s) => {
      return sum + _overlapMs(s._normStartTime, s._normEndTime, dayStartMs, dayEndMs);
    }, 0);

    // Add active sleep if it exists and overlaps with today
    if (activeSleepSession && activeSleepSession.startTime) {
      const activeNorm = _normalizeSleepInterval(activeSleepSession.startTime, Date.now());
      if (activeNorm) {
        const activeOverlap = _overlapMs(activeNorm.startMs, activeNorm.endMs, dayStartMs, dayEndMs);
        if (activeOverlap > 0) {
          totalMs += activeOverlap;
        }
      }
    }

    const total = totalMs / (1000 * 60 * 60); // Convert to hours
    const target = targetHours || 0;
    const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;

    // Format timeline items (newest first by start time)
    const timelineItems = todaySessions
      .sort((a, b) => (b._normStartTime || b.startTime || 0) - (a._normStartTime || a.startTime || 0))
      .map(s => {
        const isActive = activeSleepSession && s.id === activeSleepSession.id;
        return {
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: isActive || false,
          notes: s.notes || null,
          photoURLs: s.photoURLs || null,
          sleepType: _sleepTypeForSession(s) // Add sleep type
        };
      });

    // Add active sleep to timeline if not already included
    if (activeSleepSession && activeSleepSession.startTime) {
      const activeNorm = _normalizeSleepInterval(activeSleepSession.startTime, Date.now());
      if (activeNorm && _overlapMs(activeNorm.startMs, activeNorm.endMs, dayStartMs, dayEndMs) > 0) {
        const activeInTimeline = timelineItems.find(item => item.id === activeSleepSession.id);
        if (!activeInTimeline) {
          timelineItems.unshift({
            id: activeSleepSession.id,
            startTime: activeSleepSession.startTime,
            endTime: null,
            isActive: true,
            notes: activeSleepSession.notes || null,
            photoURLs: activeSleepSession.photoURLs || null,
            sleepType: _sleepTypeForSession(activeSleepSession)
          });
        }
      }
    }

    // Get last entry time (most recent start time)
    const lastEntryTime = timelineItems.length > 0 ? timelineItems[0].startTime : null;

    return { total, target, percent, timelineItems, lastEntryTime };
  };

  const formatTimelineItem = (entry, mode) => {
    // This is handled by TimelineItem component itself
    // Just return the entry as-is
    return entry;
  };

  const calculateSleepDurationMinutes = (session) => {
    if (!session || !session.startTime || !session.endTime) return 0;
    const _normalizeSleepIntervalForUI = (startMs, endMs, nowMs = Date.now()) => {
      let sMs = Number(startMs);
      let eMs = Number(endMs);
      if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
      if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
      if (eMs < sMs) sMs -= 86400000;
      if (eMs < sMs) return null;
      return { startMs: sMs, endMs: eMs };
    };
    const norm = _normalizeSleepIntervalForUI(session.startTime, session.endTime);
    const ns = norm ? norm.startMs : session.startTime;
    const ne = norm ? norm.endMs : session.endTime;
    const durMs = Math.max(0, (ne || 0) - (ns || 0));
    return Math.round(durMs / 60000);
  };

  const formatSleepDuration = (minutes) => {
    if (!minutes || minutes < 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const totalConsumed = feedings.reduce((sum, f) => sum + f.ounces, 0);
  const targetOunces = babyWeight ? babyWeight * multiplier : 0;
  const remaining = Math.max(0, targetOunces - totalConsumed);
  const percentComplete = (totalConsumed / targetOunces) * 100;
  const sleepTargetHours = (sleepSettings && typeof sleepSettings.sleepTargetHours === "number") ? sleepSettings.sleepTargetHours : 14;
  const sleepTargetMs = sleepTargetHours * 3600000;
  const activeExtraMs = activeSleep && activeSleep.startTime ? Math.max(0, Date.now() - _normalizeSleepStartMs(activeSleep.startTime)) : 0;
  const sleepTotalMsLive = sleepTodayMs + activeExtraMs;
  const sleepPercent = sleepTargetMs > 0 ? (sleepTotalMsLive / sleepTargetMs) * 100 : 0;
  const sleepTotalHours = sleepTotalMsLive / 3600000;
  const sleepRemainingHours = Math.max(0, sleepTargetHours - sleepTotalHours);
  const sleepDeltaHours = (sleepTotalMsLive - sleepYesterdayMs) / 3600000;
  const feedingDeltaOz = totalConsumed - yesterdayConsumed;

  const _fmtDelta = (n) => {
    const s = Math.abs(Number(n || 0)).toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };

  // v2 card number formatting:
  // - whole numbers: "7"
  // - non-whole: "7.3" (one decimal)
  const formatV2Number = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return '0';
    const rounded = Math.round(x);
    if (Math.abs(x - rounded) < 1e-9) return String(rounded);
    return x.toFixed(1);
  };
  const feedingDeltaLabel = `${feedingDeltaOz >= 0 ? '+' : '-'}${_fmtDelta(feedingDeltaOz)} oz`;
  const feedingDeltaIsGood = feedingDeltaOz >= 0;
  const sleepDeltaLabel = `${sleepDeltaHours >= 0 ? '+' : '-'}${_fmtDelta(sleepDeltaHours)} hrs`;
  const sleepDeltaIsGood = sleepDeltaHours >= 0;

  // Format data for new TrackerCard components
  // Use previous data during date transitions to prevent showing zeros
  const currentFeedingData = formatFeedingsForCard(feedings, targetOunces, currentDate);
  const currentSleepData = formatSleepSessionsForCard(sleepSessions, sleepTargetHours, currentDate, activeSleep);
  
  const feedingCardData = isDateTransitioning && prevFeedingCardData 
    ? prevFeedingCardData 
    : currentFeedingData;
    
  const sleepCardData = isDateTransitioning && prevSleepCardData 
    ? prevSleepCardData 
    : currentSleepData;
  
  // End transition when both loaders complete
  React.useEffect(() => {
    if (isDateTransitioning && transitionPending === 0) {
      setIsDateTransitioning(false);
    }
  }, [isDateTransitioning, transitionPending]);

  // Clear previous data when transition completes
  React.useEffect(() => {
    if (!isDateTransitioning && (prevFeedingCardData || prevSleepCardData)) {
      setPrevFeedingCardData(null);
      setPrevSleepCardData(null);
    }
  }, [isDateTransitioning, prevFeedingCardData, prevSleepCardData]);

  // Handlers for timeline item clicks
  const handleFeedItemClick = (entry) => {
    setSelectedFeedEntry(entry);
    setShowFeedDetailSheet(true);
  };

  const handleSleepItemClick = (entry) => {
    // If it's an active sleep entry, open input sheet in sleep mode
    if (entry && entry.isActive) {
      setInputSheetMode('sleep');
      setShowInputSheet(true);
      return;
    }
    setSelectedSleepEntry(entry);
    setShowSleepDetailSheet(true);
  };

  // Allow global nav "+" button (outside this tab) to open the input half sheet.
  React.useEffect(() => {
    if (!requestOpenInputSheetMode) return;
    try {
      setInputSheetMode(requestOpenInputSheetMode);
      setShowInputSheet(true);
    } finally {
      try { if (typeof onRequestOpenInputSheetHandled === 'function') onRequestOpenInputSheetHandled(); } catch {}
    }
  }, [requestOpenInputSheetMode, onRequestOpenInputSheetHandled]);

  if (loading) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { 
        style: { color: 'var(--tt-text-secondary)' }
      }, 'Loading...')
    );
  }

  // Calculate data for new card
  const lastFeeding = getLastFeeding();
  const lastFeedingTime = lastFeeding ? new Date(lastFeeding.timestamp) : new Date();
  const lastFeedingAmount = lastFeeding ? lastFeeding.ounces : 0;
  const lastSleep = getLastSleep();
  const lastSleepTime = lastSleep ? new Date(lastSleep.startTime) : new Date();
  const lastSleepDuration = lastSleep ? calculateSleepDurationMinutes(lastSleep) : 0;
  const isCurrentlySleeping = !!activeSleep;
  const feedingPercent = targetOunces > 0 ? Math.min(100, (totalConsumed / targetOunces) * 100) : 0;
  // sleepPercent is already calculated above (line 2795)

  const isDark = document.documentElement.classList.contains('dark');
  const chevronColor = 'var(--tt-text-tertiary)'; // match TrackerCard timeline chevron token
  // Disabled but still visible against the track (esp. in dark mode)
  const chevronDisabledColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.24)';
  const dateNavTrackBg = 'var(--tt-subtle-surface)';
  const dateNavDividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgb(243, 244, 246)';

  return React.createElement('div', { className: "space-y-4" },
    // Date Navigation (moved outside Today Card) - hidden in v3
    uiVersion !== 'v3' && React.createElement('div', { 
      className: "date-nav-container",
      style: {
        backgroundColor: 'var(--tt-app-bg)', // Match header background
        // Match the horizontal inset used by the cards (`script.js` page content uses `px-4` = 16px)
        padding: '16px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: `0.5px solid ${dateNavDividerColor}`,
        margin: '0 -1rem 1rem -1rem'
      }
    },
      React.createElement('div', { 
        className: "date-nav",
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Match TrackerCards: full available width within the tab content.
          width: '100%',
          backgroundColor: dateNavTrackBg, // tokenized for dark mode
          padding: '8px 16px',
          borderRadius: '12px' // rounded-xl (matches toggle)
        }
      },
        React.createElement('div', {
          onClick: goToPreviousDay,
          className: "nav-arrow",
          style: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent'
          },
          onMouseDown: (e) => { e.currentTarget.style.opacity = '0.4'; },
          onMouseUp: (e) => { e.currentTarget.style.opacity = '1'; },
          onMouseLeave: (e) => { e.currentTarget.style.opacity = '1'; }
        }, React.createElement(window.TT?.shared?.icons?.ChevronLeftIcon || ChevronLeft, { className: "w-5 h-5", isTapped: false, selectedWeight: 'bold', style: { color: chevronColor } })),
        React.createElement('div', { 
          className: "date-text",
          style: {
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--tt-text-primary)',
            flex: 1,
            textAlign: 'center'
          }
        }, formatDate(currentDate)),
        React.createElement('div', {
          onClick: isToday() ? null : goToNextDay,
          className: "nav-arrow",
          style: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isToday() ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent'
          },
          onMouseDown: (e) => { if (!isToday()) e.currentTarget.style.opacity = '0.4'; },
          onMouseUp: (e) => { if (!isToday()) e.currentTarget.style.opacity = '1'; },
          onMouseLeave: (e) => { if (!isToday()) e.currentTarget.style.opacity = '1'; }
        }, React.createElement(window.TT?.shared?.icons?.ChevronRightIcon || ChevronRight, { className: "w-5 h-5", isTapped: false, selectedWeight: 'bold', style: { color: isToday() ? chevronDisabledColor : chevronColor } }))
      )
    ),

    // New TrackerCard Components (when useNewUI is true)
    useNewUI && window.TrackerCard && React.createElement(React.Fragment, null,
      // Date Navigation in v3 (moved to body, above What's Next card)
      uiVersion === 'v3' && React.createElement('div', { 
        className: "date-nav",
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          backgroundColor: dateNavTrackBg,
          padding: '8px 16px',
          borderRadius: '12px',
          marginBottom: '16px'
        }
      },
        React.createElement('div', {
          onClick: goToPreviousDay,
          className: "nav-arrow",
          style: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent'
          },
          onMouseDown: (e) => { e.currentTarget.style.opacity = '0.4'; },
          onMouseUp: (e) => { e.currentTarget.style.opacity = '1'; },
          onMouseLeave: (e) => { e.currentTarget.style.opacity = '1'; }
        }, React.createElement(window.TT?.shared?.icons?.ChevronLeftIcon || ChevronLeft, { className: "w-5 h-5", isTapped: false, selectedWeight: 'bold', style: { color: chevronColor } })),
        React.createElement('div', { 
          className: "date-text",
          style: {
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--tt-text-primary)',
            flex: 1,
            textAlign: 'center'
          }
        }, formatDate(currentDate)),
        React.createElement('div', {
          onClick: isToday() ? null : goToNextDay,
          className: "nav-arrow",
          style: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isToday() ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s',
            WebkitTapHighlightColor: 'transparent'
          },
          onMouseDown: (e) => { if (!isToday()) e.currentTarget.style.opacity = '0.4'; },
          onMouseUp: (e) => { if (!isToday()) e.currentTarget.style.opacity = '1'; },
          onMouseLeave: (e) => { if (!isToday()) e.currentTarget.style.opacity = '1'; }
        }, React.createElement(window.TT?.shared?.icons?.ChevronRightIcon || ChevronRight, { className: "w-5 h-5", isTapped: false, selectedWeight: 'bold', style: { color: isToday() ? chevronDisabledColor : chevronColor } }))
      ),
      // What's Next Card - simple card with icon, label, and body (only show on today, v3 only)
      // Show card if it's today OR if it's animating out
      (isToday() || whatsNextCardAnimating === 'exiting') && uiVersion === 'v3' && React.createElement('div', {
        className: `rounded-2xl px-5 py-4 tt-tapable ${whatsNextCardAnimating === 'entering' ? 'timeline-item-enter' : whatsNextCardAnimating === 'exiting' ? 'timeline-item-exit' : ''}`,
        style: {
          backgroundColor: activeSleep && activeSleep.startTime 
            ? 'var(--tt-sleep-soft-medium, var(--tt-sleep-soft))'
            : "var(--tt-subtle-surface)",
          borderColor: "var(--tt-card-border)",
          overflow: whatsNextCardAnimating === 'exiting' ? 'hidden' : 'visible',
          marginBottom: whatsNextCardAnimating === 'exiting' ? '1rem' : '16px' // Start at 1rem for smooth animation to 0
        }
      },
        // When sleep timer is running: show timer and timer button (opens half sheet), hide header
        activeSleep && activeSleep.startTime ? (() => {
          // Real-time timer component for active sleep
          const ActiveSleepTimer = ({ startTime, sessionId }) => {
            // Use a ref to store the initial startTime to prevent timer resets on server refreshes
            const startTimeRef = React.useRef(startTime);
            const sessionIdRef = React.useRef(sessionId);
            
            // Update refs only when session changes (not on every startTime update)
            if (sessionIdRef.current !== sessionId) {
              startTimeRef.current = startTime;
              sessionIdRef.current = sessionId;
            }
            
            const [elapsed, setElapsed] = React.useState(() => {
              return Date.now() - startTimeRef.current;
            });
            
            React.useEffect(() => {
              // Only reset timer if session actually changed
              if (sessionIdRef.current !== sessionId) {
                startTimeRef.current = startTime;
                sessionIdRef.current = sessionId;
                setElapsed(Date.now() - startTimeRef.current);
              }
              
              const interval = setInterval(() => {
                setElapsed(Date.now() - startTimeRef.current);
              }, 1000);
              return () => clearInterval(interval);
            }, [sessionId]); // Use sessionId instead of startTime to prevent resets on server refreshes
            
            const formatWithSeconds = (ms) => {
              const formatted = formatElapsedHmsTT(ms);
              // Hide seconds when there are hours
              if (formatted.h > 0) {
                return `${formatted.hStr}h ${formatted.mStr}m`;
              }
              return formatted.str;
            };
            
            return React.createElement('span', { 
              className: "text-[36px] leading-none tabular-nums whitespace-nowrap inline-block text-right", 
              style: { 
                color: 'var(--tt-sleep)',
                fontWeight: '250'
              } 
            }, formatWithSeconds(elapsed));
          };

          // zZz animation element (memoized to prevent animation restart)
          const zzzElement = React.createElement('span', { 
            className: "zzz text-[29.07px] leading-none",
            style: { fontWeight: '75' } // Half step lighter than font-thin (100)
          },
            React.createElement('span', null, 'z'),
            React.createElement('span', null, 'Z'),
            React.createElement('span', null, 'z')
          );

          return React.createElement(React.Fragment, null,
            // Outer tappable container (entire blue area)
            React.createElement('button', {
              type: 'button',
              onClick: () => {
                setInputSheetMode('sleep');
                setShowInputSheet(true);
              },
              className: "w-full mb-[5px]",
              style: { 
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left'
              },
              'aria-label': 'Open sleep timer'
            },
              // Wrapper container (centered, 75% width) - contains timer row and secondary text
              React.createElement('div', {
                className: "mx-auto",
                style: {
                  width: '75%'
                }
              },
                // Inner container (timer + zzz + button) - 2-column flex row with space-between
                React.createElement('div', {
                  className: "flex items-center justify-between",
                  style: { 
                    width: '100%',
                    gap: '12px' // Gap between timer row and button
                  }
                },
                  // Timer row (time + zzz)
                  React.createElement('div', {
                    className: "inline-flex items-baseline gap-2 whitespace-nowrap",
                    style: { color: 'var(--tt-sleep)' }
                  },
                    React.createElement(ActiveSleepTimer, { startTime: activeSleep.startTime, sessionId: activeSleep.id }),
                    React.createElement('span', {
                      className: "inline-flex justify-start leading-none",
                      style: { color: 'currentColor' }
                    }, zzzElement)
                  ),
                  // Timer button wrapper (increased hit area, centered vertically)
                  React.createElement('div', {
                    className: "flex items-center",
                    style: { 
                      padding: '4px', // Increases hit area by 8px on all sides
                      flexShrink: 0
                    }
                  },
                    React.createElement('button', {
                      type: 'button',
                      onClick: (e) => {
                        e.stopPropagation();
                        setInputSheetMode('sleep');
                        setShowInputSheet(true);
                      },
                      className: "w-9 h-9 rounded-full flex items-center justify-center shadow-sm hover:opacity-80 transition-opacity",
                      style: { 
                        backgroundColor: 'var(--tt-sleep)'
                      },
                      'aria-label': 'Open sleep timer'
                    },
                      React.createElement('svg', {
                        xmlns: "http://www.w3.org/2000/svg",
                        width: "18",
                        height: "18",
                        fill: "currentColor",
                        viewBox: "0 0 256 256",
                        className: "w-[18px] h-[18px]",
                        style: { color: '#ffffff' }
                      },
                        React.createElement('path', {
                          d: "M128,44a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,44Zm0,168a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,212ZM164.49,99.51a12,12,0,0,1,0,17l-28,28a12,12,0,0,1-17-17l28-28A12,12,0,0,1,164.49,99.51ZM92,16A12,12,0,0,1,104,4h48a12,12,0,0,1,0,24H104A12,12,0,0,1,92,16Z"
                        })
                      )
                    )
                  )
                ),
                // Secondary text (below inner container, left-aligned to timer text start)
                React.createElement('div', {
                  className: "text-[15.4px] font-normal flex items-center gap-1.5",
                  style: { 
                    color: 'var(--tt-text-tertiary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                },
                  React.createElement('svg', {
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 24 24",
                    width: "15.4",
                    height: "15.4",
                    style: {
                      color: 'currentColor',
                      fill: 'none',
                      flexShrink: 0,
                      marginTop: '1px'
                    }
                  },
                    React.createElement('path', {
                      fill: 'currentColor',
                      d: "M12.069,6.949 C13.386,7.796 14.432,8.468 15.175,9.084 C15.932,9.71 16.49,10.367 16.669,11.22 C16.777,11.734 16.777,12.266 16.669,12.78 C16.49,13.633 15.932,14.29 15.175,14.917 C14.432,15.532 13.386,16.205 12.069,17.051 L11.98,17.108 C10.546,18.03 9.411,18.76 8.484,19.208 C7.552,19.658 6.666,19.908 5.791,19.64 C5.275,19.483 4.802,19.206 4.408,18.833 C3.747,18.21 3.491,17.315 3.37,16.257 C3.25,15.203 3.25,13.814 3.25,12.051 L3.25,11.949 C3.25,10.186 3.25,8.797 3.37,7.743 C3.491,6.686 3.747,5.79 4.408,5.167 C4.802,4.794 5.275,4.518 5.791,4.36 C6.666,4.092 7.552,4.342 8.484,4.793 C9.411,5.24 10.546,5.97 11.98,6.892 Z M6.23,5.794 C5.938,5.884 5.667,6.041 5.437,6.258 C5.175,6.505 4.971,6.947 4.86,7.913 C4.751,8.872 4.75,10.175 4.75,12 C4.75,13.825 4.751,15.128 4.86,16.087 C4.971,17.053 5.175,17.496 5.437,17.742 C5.667,17.959 5.938,18.117 6.23,18.206 C6.547,18.303 6.994,18.262 7.832,17.857 C8.666,17.454 9.725,16.775 11.214,15.817 C12.584,14.937 13.554,14.312 14.219,13.761 C14.88,13.214 15.126,12.83 15.201,12.472 C15.266,12.161 15.266,11.839 15.201,11.528 C15.126,11.17 14.88,10.786 14.219,10.239 C13.554,9.688 12.584,9.064 11.214,8.183 C9.725,7.225 8.666,6.546 7.832,6.143 C6.994,5.738 6.547,5.697 6.23,5.794 Z M20.75,5 L20.75,19 C20.75,19.414 20.414,19.75 20,19.75 C19.586,19.75 19.25,19.414 19.25,19 L19.25,5 C19.25,4.586 19.586,4.25 20,4.25 C20.414,4.25 20.75,4.586 20.75,5 Z"
                    })
                  ),
                  whatsNextText
                )
              )
            )
          );
        })() : (
          // Normal state: show header and body
          React.createElement(React.Fragment, null,
            // Header with icon, label, and chevron
            React.createElement('div', {
              className: "flex items-center justify-between mb-[5px]"
            },
              React.createElement('div', {
                className: "flex items-center gap-2"
              },
                React.createElement('svg', {
                  xmlns: "http://www.w3.org/2000/svg",
                  width: "18",
                  height: "18",
                  fill: "currentColor",
                  viewBox: "0 0 256 256",
                  className: "w-[18px] h-[18px]",
                  style: { color: 'var(--tt-text-secondary)' }
                },
                  React.createElement('path', {
                    d: "M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z"
                  })
                ),
                React.createElement('div', {
                  className: "text-[14.5px] font-normal",
                  style: { color: 'var(--tt-text-secondary)' }
                }, "What's Next")
              ),
              // Chevron button (only when sleep timer is not active)
              !activeSleep && React.createElement('button', {
                type: 'button',
                onClick: (e) => {
                  e.stopPropagation();
                  setWhatsNextAccordionOpen(!whatsNextAccordionOpen);
                },
                className: "p-1 -mr-1",
                style: {
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--tt-text-tertiary)',
                  transition: 'transform 0.2s ease',
                  transform: whatsNextAccordionOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                },
                'aria-label': whatsNextAccordionOpen ? 'Close schedule' : 'Show schedule'
              },
                React.createElement(window.TT?.shared?.icons?.ChevronDownIcon || (() => {
                  // Fallback chevron if icon not available
                  return React.createElement('svg', {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "20",
                    height: "20",
                    fill: "currentColor",
                    viewBox: "0 0 256 256"
                  },
                    React.createElement('path', {
                      d: "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
                    })
                  );
                }), {
                  className: "w-5 h-5",
                  style: { color: 'var(--tt-text-tertiary)' }
                })
              )
            ),
            // Simple body
            React.createElement('div', {
              className: "text-[15.4px] font-medium flex items-center gap-1.5",
              style: { 
                color: 'var(--tt-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            },
              React.createElement('svg', {
                xmlns: "http://www.w3.org/2000/svg",
                viewBox: "0 0 24 24",
                width: "15.4",
                height: "15.4",
                style: {
                  color: 'currentColor',
                  fill: 'none',
                  flexShrink: 0
                }
              },
                React.createElement('path', {
                  fill: 'currentColor',
                  d: "M12.069,6.949 C13.386,7.796 14.432,8.468 15.175,9.084 C15.932,9.71 16.49,10.367 16.669,11.22 C16.777,11.734 16.777,12.266 16.669,12.78 C16.49,13.633 15.932,14.29 15.175,14.917 C14.432,15.532 13.386,16.205 12.069,17.051 L11.98,17.108 C10.546,18.03 9.411,18.76 8.484,19.208 C7.552,19.658 6.666,19.908 5.791,19.64 C5.275,19.483 4.802,19.206 4.408,18.833 C3.747,18.21 3.491,17.315 3.37,16.257 C3.25,15.203 3.25,13.814 3.25,12.051 L3.25,11.949 C3.25,10.186 3.25,8.797 3.37,7.743 C3.491,6.686 3.747,5.79 4.408,5.167 C4.802,4.794 5.275,4.518 5.791,4.36 C6.666,4.092 7.552,4.342 8.484,4.793 C9.411,5.24 10.546,5.97 11.98,6.892 Z M6.23,5.794 C5.938,5.884 5.667,6.041 5.437,6.258 C5.175,6.505 4.971,6.947 4.86,7.913 C4.751,8.872 4.75,10.175 4.75,12 C4.75,13.825 4.751,15.128 4.86,16.087 C4.971,17.053 5.175,17.496 5.437,17.742 C5.667,17.959 5.938,18.117 6.23,18.206 C6.547,18.303 6.994,18.262 7.832,17.857 C8.666,17.454 9.725,16.775 11.214,15.817 C12.584,14.937 13.554,14.312 14.219,13.761 C14.88,13.214 15.126,12.83 15.201,12.472 C15.266,12.161 15.266,11.839 15.201,11.528 C15.126,11.17 14.88,10.786 14.219,10.239 C13.554,9.688 12.584,9.064 11.214,8.183 C9.725,7.225 8.666,6.546 7.832,6.143 C6.994,5.738 6.547,5.697 6.23,5.794 Z M20.75,5 L20.75,19 C20.75,19.414 20.414,19.75 20,19.75 C19.586,19.75 19.25,19.414 19.25,19 L19.25,5 C19.25,4.586 19.586,4.25 20,4.25 C20.414,4.25 20.75,4.586 20.75,5 Z"
                })
              ),
              whatsNextText
            ),
            // Accordion content
            whatsNextAccordionOpen && React.createElement('div', {
              className: "mt-4 pt-4 border-t",
              style: {
                borderColor: 'var(--tt-card-border)'
              },
              key: `schedule-${scheduleReady}-${dailySchedule?.length || dailyScheduleRef.current?.length || 0}` // Force re-render when schedule changes
            },
              React.createElement('div', {
                className: "text-[13px] font-medium mb-2",
                style: { color: 'var(--tt-text-secondary)' }
              }, "Today's Schedule"),
              React.createElement('div', {
                className: "space-y-2"
              },
                // Use the optimized schedule from dailyScheduleRef
                (() => {
                  const now = Date.now();
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const todayEnd = new Date();
                  todayEnd.setHours(23, 59, 59, 999);
                  
                  // Get today's actual feedings and sleep sessions for matching
                  const todayFeedings = (feedings || [])
                    .filter(f => f.timestamp >= todayStart.getTime() && f.timestamp <= todayEnd.getTime())
                    .sort((a, b) => a.timestamp - b.timestamp);
                  
                  const todaySleep = (sleepSessions || [])
                    .filter(s => s.startTime && s.startTime >= todayStart.getTime() && s.startTime <= todayEnd.getTime())
                    .sort((a, b) => a.startTime - b.startTime);
                  
                  // Use the optimized schedule - always check ref first as it's the source of truth
                  // Then check state (which triggers re-renders when updated)
                  const refSchedule = dailyScheduleRef.current;
                  const stateSchedule = dailySchedule;
                  
                  // Prioritize ref as it's the source of truth, but use state if ref is empty
                  const scheduleSource = (refSchedule && Array.isArray(refSchedule) && refSchedule.length > 0) 
                    ? refSchedule 
                    : (stateSchedule && Array.isArray(stateSchedule) && stateSchedule.length > 0)
                      ? stateSchedule
                      : null;
                  const optimizedSchedule = Array.isArray(scheduleSource) ? scheduleSource : [];
                  
                  // Schedule sync is handled by useEffect above - don't call setState during render
                  
                  // If schedule is empty, show loading or trigger rebuild
                  if (optimizedSchedule.length === 0) {
                    // If schedule should be ready but isn't, it might not have been built yet
                    // Try to trigger a rebuild by calling generateWhatsNext (but don't await to avoid blocking)
                    if (!scheduleReady && typeof generateWhatsNext === 'function') {
                      // Schedule will be built asynchronously
                      generateWhatsNext();
                    }
                    return React.createElement('div', {
                      className: "text-[13px]",
                      style: { color: 'var(--tt-text-tertiary)' }
                    }, scheduleReady ? 'No schedule available' : 'Building schedule...');
                  }
                  
                  // Filter schedule to today's events, and filter out all wake events
                  const todaySchedule = optimizedSchedule.filter(event => {
                    if (!event || !event.time) return false;
                    // Ensure event.time is a Date object
                    let eventTime;
                    if (event.time instanceof Date) {
                      eventTime = event.time.getTime();
                    } else if (typeof event.time === 'number') {
                      eventTime = event.time;
                    } else {
                      eventTime = new Date(event.time).getTime();
                    }
                    if (isNaN(eventTime)) return false;
                    
                    // Must be today
                    const isToday = eventTime >= todayStart.getTime() && eventTime <= todayEnd.getTime();
                    if (!isToday) return false;
                    
                    // Filter out all wake events (only show feed and sleep)
                    if (event.type === 'wake') {
                      return false;
                    }
                    
                    return true;
                  });
                  
                  if (todaySchedule.length === 0) {
                    // If we have a schedule but no today events, show helpful message with debug info
                    const sampleEvent = optimizedSchedule[0];
                    const sampleTime = sampleEvent ? (sampleEvent.time instanceof Date ? sampleEvent.time.toISOString() : String(sampleEvent.time)) : 'N/A';
                    return React.createElement('div', {
                      className: "text-[13px]",
                      style: { color: 'var(--tt-text-tertiary)' }
                    }, `No events scheduled for today (${optimizedSchedule.length} total events, sample time: ${sampleTime})`);
                  }
                  
                  // Match actual events to scheduled events to determine completion
                  const matchedActualEvents = new Set();
                  todaySchedule.forEach(scheduledEvent => {
                    const scheduledTime = scheduledEvent.time.getTime();
                    
                    if (scheduledEvent.type === 'feed') {
                      // Match with actual feedings (within 30 min)
                      todayFeedings.forEach(f => {
                        const feedTime = f.timestamp;
                        const timeDiff = Math.abs(feedTime - scheduledTime) / (1000 * 60); // minutes
                        if (timeDiff <= 30 && !matchedActualEvents.has(`feed-${feedTime}`)) {
                          matchedActualEvents.add(`feed-${feedTime}`);
                          scheduledEvent.isCompleted = true;
                          scheduledEvent.actual = true;
                        }
                      });
                    } else if (scheduledEvent.type === 'sleep') {
                      // Match with actual sleep sessions (within 30 min)
                      todaySleep.forEach(s => {
                        if (!s.startTime) return;
                        const sleepTime = s.startTime;
                        const timeDiff = Math.abs(sleepTime - scheduledTime) / (1000 * 60); // minutes
                        if (timeDiff <= 30 && !matchedActualEvents.has(`sleep-${sleepTime}`)) {
                          matchedActualEvents.add(`sleep-${sleepTime}`);
                          scheduledEvent.isCompleted = true;
                          scheduledEvent.actual = true;
                        }
                      });
                    } else if (scheduledEvent.type === 'wake') {
                      // Match with actual wake events (from completed sleeps)
                      todaySleep.forEach(s => {
                        if (!s.endTime || s.isActive) return;
                        const wakeTime = s.endTime;
                        const timeDiff = Math.abs(wakeTime - scheduledTime) / (1000 * 60); // minutes
                        if (timeDiff <= 30 && !matchedActualEvents.has(`wake-${wakeTime}`)) {
                          matchedActualEvents.add(`wake-${wakeTime}`);
                          scheduledEvent.isCompleted = true;
                          scheduledEvent.actual = true;
                        }
                      });
                    }
                  });
                  
                  // Convert schedule events to display format
                  const scheduleItems = todaySchedule.map(event => {
                    const eventTime = event.time.getTime();
                    const isPast = eventTime < now;
                    const isCompleted = event.isCompleted || event.actual || false;
                    
                    // Determine day/night sleep for sleep events
                    let displayType = event.type;
                    if (event.type === 'sleep') {
                      const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
                      const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);
                      const mins = event.time.getHours() * 60 + event.time.getMinutes();
                      let isDaySleep = false;
                      if (dayStart < dayEnd) {
                        isDaySleep = mins >= dayStart && mins < dayEnd;
                      } else {
                        isDaySleep = mins >= dayStart || mins < dayEnd;
                      }
                      displayType = isDaySleep ? 'nap' : 'sleep';
                    }
                    
                    return {
                      type: displayType,
                      originalType: event.type,
                      time: event.time,
                      timeStr: formatTimeHmma(event.time),
                      isPast,
                      isCompleted,
                      targetOz: event.targetOz,
                      targetOzRange: event.targetOzRange,
                      patternBased: event.patternBased || false,
                      actual: event.actual || false
                    };
                  });
                  
                  // Sort by time (already sorted, but ensure)
                  scheduleItems.sort((a, b) => a.time.getTime() - b.time.getTime());
                  
                  return scheduleItems.map((item, idx) => {
                    const isFeed = item.type === 'feed';
                    const isWake = item.originalType === 'wake';
                    const isNap = item.type === 'nap';
                    const isSleep = item.type === 'sleep';
                    
                    // Get icons
                    const FeedIcon = window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.BottleMain || (() => null);
                    const SleepIcon = window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.MoonMain || (() => null);
                    const WakeIcon = () => React.createElement('svg', {
                      xmlns: "http://www.w3.org/2000/svg",
                      width: "16",
                      height: "16",
                      fill: "none",
                      viewBox: "0 0 24 24",
                      stroke: "currentColor",
                      strokeWidth: "1.5"
                    }, React.createElement('path', {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      d: "M12 6v6m0 0v6m0-6h6m-6 0H6"
                    }));
                    
                    // Determine label with past tense for completed events
                    let label;
                    if (isFeed) {
                      label = item.isCompleted ? 'Fed' : 'Feed';
                    } else if (isWake) {
                      label = item.isCompleted ? 'Woke' : 'Wake';
                    } else if (isNap) {
                      label = item.isCompleted ? 'Napped' : 'Nap';
                    } else if (isSleep) {
                      label = item.isCompleted ? 'Slept' : 'Sleep';
                    }
                    
                    return React.createElement('div', {
                      key: `${item.originalType}-${item.time.getTime()}-${idx}`,
                      className: "flex items-center gap-2 text-[14px]",
                      style: { 
                        color: item.isPast ? 'var(--tt-text-secondary)' : 'var(--tt-text-primary)',
                        marginBottom: idx < scheduleItems.length - 1 ? '8px' : '0',
                        opacity: item.isPast ? 0.7 : 1
                      }
                    },
                      isFeed ? React.createElement(FeedIcon, {
                        className: "w-4 h-4",
                        style: { 
                          color: 'var(--tt-feed)',
                          strokeWidth: '1.5'
                        }
                      }) : isWake ? React.createElement(WakeIcon, {
                        className: "w-4 h-4",
                        style: { 
                          color: 'var(--tt-text-secondary)',
                          strokeWidth: '1.5'
                        }
                      }) : React.createElement(SleepIcon, {
                        className: "w-4 h-4",
                        style: {
                          color: 'var(--tt-sleep)',
                          strokeWidth: '1.5'
                        }
                      }),
                      React.createElement('span', null, `${label} around ${item.timeStr}`),
                      item.isCompleted && React.createElement('span', {
                        style: {
                          color: 'var(--tt-text-tertiary)',
                          marginLeft: 'auto',
                          fontSize: '16px'
                        }
                      }, '✓')
                    );
                  });
                })()
              )
            )
          )
        )
      ),
      React.createElement(window.TrackerCard, {
        mode: 'feeding',
        total: feedingCardData.total,
        target: feedingCardData.target,
        timelineItems: feedingCardData.timelineItems,
        entriesTodayCount: Array.isArray(feedingCardData.timelineItems) ? feedingCardData.timelineItems.length : 0,
        lastEntryTime: feedingCardData.lastEntryTime,
        rawFeedings: allFeedings,
        rawSleepSessions: [],
        currentDate: currentDate,
        onItemClick: handleFeedItemClick,
        onDelete: async () => {
          // Small delay for animation
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadFeedings();
        }
      }),
      React.createElement(window.TrackerCard, {
        mode: 'sleep',
        total: sleepCardData.total,
        target: sleepCardData.target,
        timelineItems: sleepCardData.timelineItems,
        entriesTodayCount: sleepTodayCount,
        lastEntryTime: sleepCardData.lastEntryTime,
        rawFeedings: [],
        rawSleepSessions: allSleepSessions,
        currentDate: currentDate,
        onItemClick: handleSleepItemClick,
        onActiveSleepClick: () => {
          setInputSheetMode('sleep');
          setShowInputSheet(true);
        },
        onDelete: async () => {
          // Small delay for animation
          await new Promise(resolve => setTimeout(resolve, 200));
          await loadSleepSessions();
        }
      }),
      
      // Today Card (New UI) — split v2 so v2 can be edited independently.
      // Only show if feature flag is enabled.
      showTodayCard && (uiVersion === 'v2' || uiVersion === 'v3'
        ? React.createElement('div', { 
            ref: cardRefCallback, 
            className: "rounded-2xl shadow-sm p-6",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
            // Feeding Progress (v2)
            React.createElement('div', { className: "mb-8" },
              // Icon + label
              React.createElement('div', { className: "flex items-center mb-2" },
                React.createElement('div', { 
                  className: "text-sm font-medium inline-flex items-center gap-2",
                  style: { color: 'var(--tt-feed)' }
                },
                  (() => {
                    const v2Src = 'assets/ui-icons/bottle-main-right-v3@3x.png';
                    const v2Svg =
                      (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["bottle-main"]) ||
                      (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Bottle2) ||
                      null;
                    const canMask = (() => {
                      try {
                        if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
                        return CSS.supports('(-webkit-mask-image: url("x"))') || CSS.supports('(mask-image: url("x"))');
                      } catch {
                        return false;
                      }
                    })();
                    if (canMask) {
                      return React.createElement(
                        'span',
                        { style: { width: 18, height: 18, display: 'inline-block' } },
                        React.createElement('span', {
                          style: {
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            backgroundColor: 'var(--tt-feed)',
                            WebkitMaskImage: `url("${v2Src}")`,
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskSize: 'contain',
                            WebkitMaskPosition: 'center',
                            maskImage: `url("${v2Src}")`,
                            maskRepeat: 'no-repeat',
                            maskSize: 'contain',
                            maskPosition: 'center'
                          }
                        })
                      );
                    }
                    // Fallback: SVG if mask isn't supported
                    return v2Svg ? React.createElement(v2Svg, { className: "w-[18px] h-[18px]", style: { color: 'var(--tt-feed)', strokeWidth: '3' } }) : null;
                  })(),
                  React.createElement('span', null, "Feeding")
                )
              ),

              // Big number (moved above progress)
              React.createElement('div', { className: "flex items-baseline justify-between mb-2" },
                React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-feed)' } },
                  `${formatV2Number(totalConsumed)} `,
                  React.createElement('span', { 
                    className: "text-base font-normal",
                    style: { color: 'var(--tt-text-secondary)' }
                  },
                    `of ${formatV2Number(targetOunces)} oz`
                  )
                )
              ),
              
              // Progress Bar
              React.createElement('div', { 
                className: "relative w-full h-[22px] rounded-2xl overflow-hidden mb-2",
                style: { backgroundColor: 'var(--tt-input-bg)' }
              },
                React.createElement('div', {
                  className: "absolute left-0 top-0 h-full rounded-2xl",
                  style: {
                    width: cardVisible ? `${Math.min(100, feedingPercent)}%` : '0%',
                    background: 'var(--tt-feed)',
                    transition: 'width 0.6s ease-out',
                    transitionDelay: '0s'
                  }
                })
              ),

              // Status text (moved below progress)
              React.createElement('div', { 
                className: "text-xs text-right",
                style: { color: 'var(--tt-text-tertiary)' }
              },
                lastFeeding 
                  ? `Last fed at ${formatTime12Hour(lastFeedingTime)} (${formatV2Number(lastFeedingAmount)} oz)`
                  : "No feedings yet"
              )
            ),

            // Sleep Progress (v2)
            React.createElement('div', {},
              // Icon + label
              React.createElement('div', { className: "flex items-center mb-2" },
                React.createElement('div', { 
                  className: "text-sm font-medium inline-flex items-center gap-2",
                  style: { color: 'var(--tt-sleep)' }
                },
                  (() => {
                    const v2Src = 'assets/ui-icons/moon-main@3x.png';
                    const v2Svg =
                      (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["moon-main"]) ||
                      (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Moon2) ||
                      null;
                    const canMask = (() => {
                      try {
                        if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
                        return CSS.supports('(-webkit-mask-image: url("x"))') || CSS.supports('(mask-image: url("x"))');
                      } catch {
                        return false;
                      }
                    })();
                    if (canMask) {
                      return React.createElement(
                        'span',
                        { style: { width: 18, height: 18, display: 'inline-block' } },
                        React.createElement('span', {
                          style: {
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            backgroundColor: 'var(--tt-sleep)',
                            WebkitMaskImage: `url("${v2Src}")`,
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskSize: 'contain',
                            WebkitMaskPosition: 'center',
                            maskImage: `url("${v2Src}")`,
                            maskRepeat: 'no-repeat',
                            maskSize: 'contain',
                            maskPosition: 'center'
                          }
                        })
                      );
                    }
                    // Fallback: SVG if mask isn't supported
                    return v2Svg ? React.createElement(v2Svg, { className: "w-[18px] h-[18px]", style: { color: 'var(--tt-sleep)', strokeWidth: '3' } }) : null;
                  })(),
                  React.createElement('span', null, "Sleep")
                )
              ),

              // Big number (moved above progress)
              React.createElement('div', { className: "flex items-baseline justify-between mb-2" },
                React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-sleep)' } },
                  `${formatV2Number(sleepTotalHours)} `,
                  React.createElement('span', { 
                    className: "text-base font-normal",
                    style: { color: 'var(--tt-text-secondary)' }
                  },
                    `of ${formatV2Number(sleepTargetHours)} hrs`
                  )
                )
              ),
              
              // Progress Bar
              React.createElement('div', { 
                className: "relative w-full h-[22px] rounded-2xl overflow-hidden mb-2",
                style: { backgroundColor: 'var(--tt-input-bg)' }
              },
                React.createElement('div', {
                  className: `absolute left-0 top-0 h-full rounded-2xl ${isCurrentlySleeping ? 'tt-sleep-progress-pulse' : ''}`,
                  style: {
                    width: cardVisible ? `${Math.min(100, sleepPercent)}%` : '0%',
                    background: 'var(--tt-sleep)',
                    transition: 'width 0.6s ease-out',
                    transitionDelay: '0.05s'
                  }
                })
              ),

              // Status text (moved below progress)
              React.createElement('div', { 
                className: "text-xs text-right",
                style: { color: 'var(--tt-text-tertiary)' }
              },
                isCurrentlySleeping
                  ? `Sleeping now (${formatSleepDuration(Math.floor(sleepElapsedMs / 60000))})`
                  : lastSleep
                    ? `Last slept at ${formatTime12Hour(lastSleepTime)} (${formatSleepDuration(lastSleepDuration)})`
                    : "No sleep sessions yet"
              )
            )
          )
        : React.createElement('div', { 
            ref: cardRefCallback, 
            className: "rounded-2xl shadow-sm p-6",
            style: { backgroundColor: 'var(--tt-card-bg)' }
          },
            // Feeding Progress (v2)
            React.createElement('div', { className: "mb-8" },
              React.createElement('div', { className: "flex items-center justify-between mb-2" },
                React.createElement('div', { 
                  className: "text-sm font-medium",
                  style: { color: 'var(--tt-text-secondary)' }
                }, "Feeding"),
                React.createElement('div', { 
                  className: "text-xs",
                  style: { color: 'var(--tt-text-tertiary)' }
                },
                  lastFeeding 
                    ? `Last fed at ${formatTime12Hour(lastFeedingTime)} (${lastFeedingAmount.toFixed(1)} oz)`
                    : "No feedings yet"
                )
              ),
              
              // Progress Bar
              React.createElement('div', { 
                className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
                style: { backgroundColor: 'var(--tt-input-bg)' }
              },
                React.createElement('div', {
                  className: "absolute left-0 top-0 h-full rounded-2xl",
                  style: {
                    width: cardVisible ? `${Math.min(100, feedingPercent)}%` : '0%',
                    background: 'var(--tt-feed)',
                    transition: 'width 0.6s ease-out',
                    transitionDelay: '0s'
                  }
                })
              ),

              // Stats
              React.createElement('div', { className: "flex items-baseline justify-between" },
                React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-feed)' } },
                  `${totalConsumed.toFixed(1)} `,
                  React.createElement('span', { 
                    className: "text-base font-normal",
                    style: { color: 'var(--tt-text-secondary)' }
                  },
                    `of ${targetOunces.toFixed(1)} oz`
                  )
                )
              )
            ),

            // Sleep Progress (v2)
            React.createElement('div', {},
              React.createElement('div', { className: "flex items-center justify-between mb-2" },
                React.createElement('div', { 
                  className: "text-sm font-medium",
                  style: { color: 'var(--tt-text-secondary)' }
                }, "Sleep"),
                React.createElement('div', { 
                  className: "text-xs",
                  style: { color: 'var(--tt-text-tertiary)' }
                },
                  isCurrentlySleeping
                    ? `Sleeping now (${formatSleepDuration(Math.floor(sleepElapsedMs / 60000))})`
                    : lastSleep
                      ? `Last slept at ${formatTime12Hour(lastSleepTime)} (${formatSleepDuration(lastSleepDuration)})`
                      : "No sleep sessions yet"
                )
              ),
              
              // Progress Bar
              React.createElement('div', { 
                className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
                style: { backgroundColor: 'var(--tt-input-bg)' }
              },
                React.createElement('div', {
                  className: `absolute left-0 top-0 h-full rounded-2xl ${isCurrentlySleeping ? 'tt-sleep-progress-pulse' : ''}`,
                  style: {
                    width: cardVisible ? `${Math.min(100, sleepPercent)}%` : '0%',
                    background: 'var(--tt-sleep)',
                    transition: 'width 0.6s ease-out',
                    transitionDelay: '0.05s'
                  }
                })
              ),

              // Stats
              React.createElement('div', { className: "flex items-baseline justify-between" },
                React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-sleep)' } },
                  `${sleepTotalHours.toFixed(1)} `,
                  React.createElement('span', { 
                    className: "text-base font-normal",
                    style: { color: 'var(--tt-text-secondary)' }
                  },
                    `of ${sleepTargetHours.toFixed(1)} hrs`
                  )
                )
              )
            )
          )
      )
    ),

    // Old UI (only show when useNewUI is false)
    !useNewUI && React.createElement(React.Fragment, null,
    // Today Card (duplicate for editing - new design)
    React.createElement('div', { 
      ref: cardRefCallback, 
      className: "rounded-2xl shadow-sm p-6",
      style: { backgroundColor: 'var(--tt-card-bg)' }
    },
      // Feeding Progress
      React.createElement('div', { className: "mb-8" },
        React.createElement('div', { className: "flex items-center justify-between mb-2" },
          React.createElement('div', { 
            className: "text-sm font-medium",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Feeding"),
          React.createElement('div', { 
            className: "text-xs",
            style: { color: 'var(--tt-text-tertiary)' }
          },
            lastFeeding 
              ? `Last fed at ${formatTime12Hour(lastFeedingTime)} (${lastFeedingAmount.toFixed(1)} oz)`
              : "No feedings yet"
          )
        ),
        
        // Progress Bar
        React.createElement('div', { 
          className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
          style: { backgroundColor: 'var(--tt-input-bg)' }
        },
          React.createElement('div', {
            className: "absolute left-0 top-0 h-full rounded-2xl",
            style: {
              width: cardVisible ? `${Math.min(100, feedingPercent)}%` : '0%',
              background: 'var(--tt-feed)',
              transition: 'width 0.6s ease-out',
              transitionDelay: '0s'
            }
          })
        ),

        // Stats
        React.createElement('div', { className: "flex items-baseline justify-between" },
          React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-feed)' } },
            `${totalConsumed.toFixed(1)} `,
            React.createElement('span', { 
              className: "text-base font-normal",
              style: { color: 'var(--tt-text-secondary)' }
            },
              `of ${targetOunces.toFixed(1)} oz`
            )
          )
        )
      ),

      // Sleep Progress
      React.createElement('div', {},
        React.createElement('div', { className: "flex items-center justify-between mb-2" },
          React.createElement('div', { 
            className: "text-sm font-medium",
            style: { color: 'var(--tt-text-secondary)' }
          }, "Sleep"),
          React.createElement('div', { 
            className: "text-xs",
            style: { color: 'var(--tt-text-tertiary)' }
          },
            isCurrentlySleeping
              ? `Sleeping now (${formatSleepDuration(Math.floor(sleepElapsedMs / 60000))})`
              : lastSleep
                ? `Last slept at ${formatTime12Hour(lastSleepTime)} (${formatSleepDuration(lastSleepDuration)})`
                : "No sleep sessions yet"
          )
        ),
        
        // Progress Bar
        React.createElement('div', { 
          className: "relative w-full h-5 rounded-2xl overflow-hidden mb-2",
          style: { backgroundColor: 'var(--tt-input-bg)' }
        },
          React.createElement('div', {
            className: `absolute left-0 top-0 h-full rounded-2xl ${isCurrentlySleeping ? 'tt-sleep-progress-pulse' : ''}`,
            style: {
              width: cardVisible ? `${Math.min(100, sleepPercent)}%` : '0%',
              background: 'var(--tt-sleep)',
              transition: 'width 0.6s ease-out',
              transitionDelay: '0.05s'
            }
          })
        ),

        // Stats
        React.createElement('div', { className: "flex items-baseline justify-between" },
          React.createElement('div', { className: "text-2xl font-semibold", style: { color: 'var(--tt-sleep)' } },
            `${sleepTotalHours.toFixed(1)} `,
            React.createElement('span', { 
              className: "text-base font-normal",
              style: { color: 'var(--tt-text-secondary)' }
            },
              `of ${sleepTargetHours.toFixed(1)} hrs`
            )
          )
        )
      )
    ),
    
    // Log Feeding Card
    React.createElement('div', { 
      className: "rounded-2xl shadow-lg p-6",
      style: { backgroundColor: 'var(--tt-card-bg)' }
    },
      null,
      React.createElement('div', { 
        className: "mt-3 mb-4 inline-flex w-full rounded-xl p-1",
        style: { backgroundColor: 'var(--tt-input-bg)' }
      },
        React.createElement('button', {
          onClick: () => setLogMode('feeding'),
          className: logMode === 'feeding'
            ? "flex-1 py-2 rounded-lg shadow font-semibold"
            : "flex-1 py-2 rounded-lg",
          style: logMode === 'feeding'
            ? { backgroundColor: 'var(--tt-card-bg)', color: 'var(--tt-text-primary)' }
            : { color: 'var(--tt-text-secondary)' }
        }, 'Feed'),
        React.createElement('button', {
          onClick: () => setLogMode('sleep'),
          className: logMode === 'sleep'
            ? "flex-1 py-2 rounded-lg shadow font-semibold"
            : "flex-1 py-2 rounded-lg",
          style: logMode === 'sleep'
            ? { backgroundColor: 'var(--tt-card-bg)', color: 'var(--tt-text-primary)' }
            : { color: 'var(--tt-text-secondary)' }
        },
          React.createElement(
            "span",
            { className: "inline-flex items-center gap-2" },
            "Sleep",
            activeSleep &&
              React.createElement(
                "span",
                { className: "inline-flex items-center", title: "Sleep in progress", 'aria-label': "Sleep in progress" },
                React.createElement(
                  "span",
                  { className: "text-xs font-bold select-none", style: { color: 'var(--tt-sleep)', animation: "ttZzz 2.4s ease-in-out infinite" } },
                  "zZz"
                )
              )
          )
        )
      ),

      // Feeding form
      (logMode === 'feeding') &&
      React.createElement('div', { className: "space-y-3" },
        React.createElement('div', { className: "flex gap-3 min-w-0" },
          React.createElement('input', {
            type: "number",
            inputMode: "decimal",
            step: "0.25",
            placeholder: "Ounces",
            value: ounces,
            onChange: (e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setOunces(value);
            },
            onKeyPress: (e) => e.key === 'Enter' && !showCustomTime && handleAddFeeding(),
            className: "min-w-0 flex-1 px-4 py-2.5 text-base border-2 rounded-xl focus:outline-none",
            style: { 
              borderColor: 'var(--tt-card-border)',
              backgroundColor: 'var(--tt-input-bg)',
              color: 'var(--tt-text-primary)'
            },
            onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed)',
            onBlur: (e) => e.target.style.borderColor = 'var(--tt-card-border)'
          }),
          React.createElement('button', {
            onClick: () => {
              setShowCustomTime((prev) => {
                const next = !prev;
                if (next) {
                  setCustomTime((t) => {
                    if (t && String(t).trim()) return t;
                    const d = new Date();
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    return `${hh}:${mm}`;
                  });
                }
                return next;
              });
            },
            className: "shrink-0 px-4 py-2.5 rounded-xl transition",
            style: showCustomTime
              ? { backgroundColor: 'var(--tt-feed-soft)', color: 'var(--tt-feed)' }
              : { backgroundColor: 'var(--tt-input-bg)', color: 'var(--tt-text-secondary)' }
          }, React.createElement(Clock, { className: "w-5 h-5", style: { strokeWidth: '3' } }))
        ),

        showCustomTime && React.createElement('input', {
          type: "time",
          value: customTime,
          onChange: (e) => setCustomTime(e.target.value),
          className: "block w-full min-w-0 max-w-full appearance-none box-border px-4 py-3 text-base border-2 rounded-xl focus:outline-none",
          style: { 
            borderColor: 'var(--tt-card-border)',
            backgroundColor: 'var(--tt-input-bg)',
            color: 'var(--tt-text-primary)'
          },
          onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed)',
          onBlur: (e) => e.target.style.borderColor = 'var(--tt-card-border)'
        }),

        React.createElement('button', {
          onClick: handleAddFeeding,
          className: "w-full text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2",
          style: { backgroundColor: 'var(--tt-feed)' }
        },
          React.createElement(Plus, { className: "w-5 h-5", style: { strokeWidth: '3' } }),
          'Add Feeding'
        )
      ),

      // Sleep form
      (logMode === 'sleep') &&
        React.createElement('div', { className: "space-y-4" },

          activeSleep &&
            React.createElement(
              'div',
              { className: "grid grid-cols-2 gap-4 text-center" },

              React.createElement(
                'div',
                null,
                React.createElement('div', { 
                  className: "text-sm mb-1",
                  style: { color: 'var(--tt-text-secondary)' }
                }, 'Start'),
                editingSleepField === 'start'
                  ? React.createElement('input', {
                      type: 'time',
                      autoFocus: true,
                      defaultValue: _toHHMM(activeSleep.startTime),
                      onBlur: async (e) => {
                        setEditingSleepField(null);
                        const ms = _hhmmToMsNearNowSmart(e.target.value);
                        if (!ms) return;
                        try {
                          await firestoreStorage.updateSleepSession(activeSleep.id, { startTime: ms });
                        } catch (err) {
                          console.error(err);
                        }
                      },
                      className: "font-semibold bg-transparent text-center",
                      style: { color: 'var(--tt-sleep)' }
                    })
                  : React.createElement(
                      'div',
                      {
                        className: "inline-block px-3 py-2 rounded-lg font-semibold text-lg cursor-pointer",
                        style: { 
                          backgroundColor: 'var(--tt-input-bg)',
                          color: 'var(--tt-sleep)'
                        },
                        onClick: () => setEditingSleepField('start')
                      },
                      _toHHMMNoZero(activeSleep.startTime)
                    )
              ),

              React.createElement(
                'div',
                null,
                React.createElement('div', { 
                  className: "text-sm mb-1",
                  style: { color: 'var(--tt-text-secondary)' }
                }, 'End'),
                editingSleepField === 'end'
                  ? React.createElement('input', {
                      type: 'time',
                      autoFocus: true,
                      defaultValue: sleepEndStr
                        ? _toHHMM(_hhmmToMsNearNowSmart(sleepEndStr))
                        : _toHHMM(Date.now()),
                      onBlur: async (e) => {
                        setEditingSleepField(null);
                        const ms = _hhmmToSleepEndMs(e.target.value, activeSleep.startTime);
                        if (!ms) return;
                        try {
                          await firestoreStorage.updateSleepSession(activeSleep.id, { endTime: ms });
                          setSleepEndStr(_toHHMMNoZero(ms));
                        } catch (err) {
                          console.error(err);
                        }
                      },
                      className: "font-semibold bg-transparent text-center",
                      style: { color: 'var(--tt-sleep)' }
                    })
                  : React.createElement(
                      'div',
                      {
                        className: "inline-block px-3 py-2 rounded-lg font-semibold text-lg cursor-pointer",
                        style: { 
                          backgroundColor: 'var(--tt-input-bg)',
                          color: 'var(--tt-sleep)'
                        },
                        onClick: () => setEditingSleepField('end')
                      },
                      sleepEndStr || '--:--'
                    )
              )
            ),

          activeSleep &&
            React.createElement(
              'div',
              { className: "text-center text-4xl font-semibold my-2" },
              _formatMMSS(sleepElapsedMs)
            ),

          !activeSleep &&
            React.createElement(
              'button',
              {
                className: "w-full text-white py-3 rounded-xl font-semibold",
                style: { backgroundColor: 'var(--tt-sleep)' },
                onClick: async () => await firestoreStorage.startSleep(Date.now())
              },
              'Start Sleep'
            ),

          activeSleep &&
            React.createElement(
              'button',
              {
                className: "w-full text-white py-3 rounded-xl font-semibold",
                style: { backgroundColor: 'var(--tt-sleep)' },
                onClick: async () => {
                  await firestoreStorage.endSleep(activeSleep.id, Date.now());
                  setActiveSleep(null);
                  setSleepElapsedMs(0);
                }
              },
              'End Sleep'
            )
        )
    ),

    // -----------------------
    // SLEEP LOG (TODAY)
    // -----------------------
    (logMode === 'sleep') && React.createElement(
      'div',
      { 
        className: "rounded-2xl shadow-lg p-6 mt-6",
        style: { backgroundColor: 'var(--tt-card-bg)' }
      },
      React.createElement(
        'h2',
        { 
          className: "text-lg font-semibold mb-4",
          style: { color: 'var(--tt-text-primary)' }
        },
        `Sleep · ${sleepSessions.length}`
      ),
      sleepSessions.length === 0
        ?           React.createElement(
            'div',
            { 
              className: "text-center py-6",
              style: { color: 'var(--tt-text-tertiary)' }
            },
            'No sleep logged yet'
          )
        : React.createElement(
            'div',
            { className: "space-y-3" },
            sleepSessions.map((s) => {
              const _normalizeSleepIntervalForUI = (startMs, endMs, nowMs = Date.now()) => {
                let sMs = Number(startMs);
                let eMs = Number(endMs);
                if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return null;
                if (sMs > nowMs + 3 * 3600000) sMs -= 86400000;
                if (eMs < sMs) sMs -= 86400000;
                if (eMs < sMs) return null;
                return { startMs: sMs, endMs: eMs };
              };

              const norm = _normalizeSleepIntervalForUI(s.startTime, s.endTime);
              const ns = norm ? norm.startMs : s.startTime;
              const ne = norm ? norm.endMs : s.endTime;
              const durMs = Math.max(0, (ne || 0) - (ns || 0));
              const mins = Math.round(durMs / 60000);
              const hrs = Math.floor(mins / 60);
              const rem = mins % 60;
              const durLabel =
                hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
              const startLabel = new Date(ns).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const endLabel = new Date(ne).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const sleepEmoji = _sleepTypeForSession(s) === 'day' ? '😴' : '🌙';

                return React.createElement(
                  'div',
                  { key: s.id },
                  editingSleepId === s.id
                    ? React.createElement('div', { 
                        className: "trackerEditCard p-4 rounded-xl",
                        style: { backgroundColor: 'var(--tt-sleep-soft)' }
                      },
                        React.createElement('div', { className: "trackerEditBlock space-y-3 w-full max-w-[520px] mx-auto" },
                          React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
                            React.createElement('div', { className: "editField min-w-0" },
                              React.createElement('div', { 
                                className: "editFieldLabel text-xs font-semibold mb-1",
                                style: { color: 'var(--tt-text-secondary)' }
                              }, 'Start'),
                              React.createElement('input', {
                                type: 'time',
                                value: sleepEditStartStr,
                                onChange: (e) => setSleepEditStartStr(e.target.value),
                                className: "w-full h-11 min-w-0 appearance-none px-3 border-2 rounded-lg focus:outline-none",
                                style: {
                                  backgroundColor: 'var(--tt-input-bg)',
                                  borderColor: 'var(--tt-sleep)',
                                  color: 'var(--tt-text-primary)'
                                },
                                onFocus: (e) => e.target.style.borderColor = 'var(--tt-sleep-strong)',
                                onBlur: (e) => e.target.style.borderColor = 'var(--tt-sleep)'
                              })
                            ),
                            React.createElement('div', { className: "editField min-w-0" },
                              React.createElement('div', { 
                                className: "editFieldLabel text-xs font-semibold mb-1",
                                style: { color: 'var(--tt-text-secondary)' }
                              }, 'End'),
                              React.createElement('input', {
                                type: 'time',
                                value: sleepEditEndStr,
                                onChange: (e) => setSleepEditEndStr(e.target.value),
                                className: "w-full h-11 min-w-0 appearance-none px-3 border-2 rounded-lg focus:outline-none",
                                style: {
                                  backgroundColor: 'var(--tt-input-bg)',
                                  borderColor: 'var(--tt-sleep)',
                                  color: 'var(--tt-text-primary)'
                                },
                                onFocus: (e) => e.target.style.borderColor = 'var(--tt-sleep-strong)',
                                onBlur: (e) => e.target.style.borderColor = 'var(--tt-sleep)'
                              })
                            )
                          ),
                            React.createElement(TrackerEditActions, { onSave: handleSaveSleepEdit, onCancel: handleCancelSleepEdit })
                          )
                        )
                      : React.createElement('div', { 
                          className: "flex justify-between items-center p-4 rounded-xl",
                          style: { backgroundColor: 'var(--tt-input-bg)' }
                        },
                      React.createElement('div', { className: "flex items-center gap-3" },
                        React.createElement(
                          'div',
                          {
                            className: "rounded-full flex items-center justify-center",
                            style: { 
                              width: '48px', 
                              height: '48px',
                              backgroundColor: 'var(--tt-sleep-soft)'
                            }
                          },
                          React.createElement('span', { className: "text-xl" }, sleepEmoji)
                        ),
                        React.createElement(
                          'div',
                          {},
                          React.createElement('div', { 
                            className: "font-semibold",
                            style: { color: 'var(--tt-text-primary)' }
                          }, durLabel),
                          React.createElement(
                            'div',
                            { 
                              className: "text-sm",
                              style: { color: 'var(--tt-text-secondary)' }
                            },
                            `${startLabel} – ${endLabel}`
                          )
                        )
                      ),
                      React.createElement('div', { className: "flex gap-2" },
                        React.createElement('button', {
                          onClick: () => handleStartEditSleep(s),
                          className: "transition",
                          style: { color: 'var(--tt-sleep)' }
                        }, React.createElement(Edit2, { className: "w-5 h-5", style: { strokeWidth: '3' } })),
                        React.createElement('button', {
                          onClick: () => handleDeleteSleepSession(s.id),
                          className: "text-red-400 hover:text-red-600 transition"
                        }, React.createElement(X, { className: "w-5 h-5", style: { strokeWidth: '3' } }))
                      )
                    )
              );
            })
          )
    ),
    // Feedings List
    (logMode === 'feeding') && React.createElement('div', { 
      className: "rounded-2xl shadow-lg p-6",
      style: { backgroundColor: 'var(--tt-card-bg)' }
    },
      React.createElement('h2', { 
        className: "text-lg font-semibold mb-4",
        style: { color: 'var(--tt-text-primary)' }
      }, `Feedings · ${feedings.length}`),
      feedings.length === 0 ?
        React.createElement('p', { 
          className: "text-center py-8",
          style: { color: 'var(--tt-text-tertiary)' }
        }, 'No feedings logged for this day')
      :
        React.createElement('div', { className: "space-y-3" },
          feedings.map((feeding) =>
            React.createElement('div', { key: feeding.id },
              editingFeedingId === feeding.id ?
                React.createElement('div', { 
                  className: "trackerEditCard p-4 rounded-xl",
                  style: { backgroundColor: 'var(--tt-feed-soft)' }
                },
                  React.createElement('div', { className: "trackerEditBlock space-y-3 w-full max-w-[520px] mx-auto" },
                    React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
                      React.createElement('div', { className: "feedingAmountField relative w-full min-w-0" },
                        React.createElement('input', {
                          type: "number",
                          inputMode: "decimal",
                          step: "0.25",
                          value: editOunces,
                          onChange: (e) => {
                            // Only allow numbers and decimal point
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setEditOunces(value);
                          },
                          placeholder: "Ounces",
                          className: "feedingAmountInput w-full h-11 min-w-0 appearance-none px-3 pr-10 border-2 rounded-lg focus:outline-none",
                          style: {
                            backgroundColor: 'var(--tt-input-bg)',
                            borderColor: 'var(--tt-feed)',
                            color: 'var(--tt-text-primary)'
                          },
                          onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed-strong)',
                          onBlur: (e) => e.target.style.borderColor = 'var(--tt-feed)'
                        }),
                        React.createElement('span', { 
                          className: "feedingAmountUnit absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none",
                          style: { color: 'var(--tt-text-secondary)' }
                        }, 'oz')
                      ),
                      React.createElement('input', {
                        type: "time",
                        value: editTime,
                        onChange: (e) => setEditTime(e.target.value),
                        className: "w-full h-11 min-w-0 appearance-none px-3 border-2 rounded-lg focus:outline-none",
                        style: {
                          backgroundColor: 'var(--tt-input-bg)',
                          borderColor: 'var(--tt-feed)',
                          color: 'var(--tt-text-primary)'
                        },
                        onFocus: (e) => e.target.style.borderColor = 'var(--tt-feed-strong)',
                        onBlur: (e) => e.target.style.borderColor = 'var(--tt-feed)'
                      })
                    ),
                    React.createElement(TrackerEditActions, { onSave: handleSaveEdit, onCancel: handleCancelEdit })
                  )
                )
              :
                React.createElement('div', { 
                  className: "flex justify-between items-center p-4 rounded-lg",
                  style: { backgroundColor: 'var(--tt-input-bg)' }
                },
                  React.createElement('div', { className: "flex items-center gap-3" },
                    React.createElement('div', { 
                      className: "rounded-full flex items-center justify-center",
                      style: { 
                        width: '48px', 
                        height: '48px',
                        backgroundColor: 'var(--tt-feed-soft)'
                      }
                    },
                      React.createElement('span', { className: "text-xl" }, '🍼')
                    ),
                    React.createElement('div', {},
                      React.createElement('div', { 
                        className: "font-semibold",
                        style: { color: 'var(--tt-text-primary)' }
                      }, `${feeding.ounces} oz`),
                      React.createElement('div', { 
                        className: "text-sm",
                        style: { color: 'var(--tt-text-secondary)' }
                      }, feeding.time)
                    )
                  ),
                  React.createElement('div', { className: "flex gap-2" },
                    React.createElement('button', {
                      onClick: () => handleStartEdit(feeding),
                      className: "transition",
                      style: { color: 'var(--tt-feed)' }
                    }, React.createElement(Edit2, { className: "w-5 h-5" })),
                    React.createElement('button', {
                      onClick: () => handleDeleteFeeding(feeding.id),
                      className: "text-red-400 hover:text-red-600 transition"
                    }, React.createElement(X, { className: "w-5 h-5" }))
                  )
                )
            )
          )
        )
    )
    ), // End of old UI section

    // Today Card (original - moved to bottom for testing)
    // COMMENTED OUT - Old design kept for reference
    /*
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "flex items-center justify-between mb-4" },
        React.createElement('button', {
          onClick: goToPreviousDay,
          className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
        }, React.createElement(ChevronLeft, { className: "w-5 h-5" })),
        React.createElement('h2', { className: "text-lg font-semibold text-gray-800" }, formatDate(currentDate)),
        React.createElement('button', {
          onClick: goToNextDay,
          disabled: isToday(),
          className: `p-2 rounded-lg transition ${isToday() ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`
        }, React.createElement(ChevronRight, { className: "w-5 h-5" }))
      ),

      // Stacked progress bars (current Today-card design)
      React.createElement(ProgressBarRow, {
        label: "Feeding",
        value: Number(totalConsumed.toFixed(1)),
        target: Number(targetOunces.toFixed(1)),
        unit: "oz",
        deltaLabel: feedingDeltaLabel,
        deltaIsGood: feedingDeltaIsGood
      }),

      React.createElement(ProgressBarRow, {
        label: "Sleep",
        value: Number(sleepTotalHours.toFixed(1)),
        target: Number(sleepTargetHours.toFixed(1)),
        unit: "hrs",
        deltaLabel: sleepDeltaLabel,
        deltaIsGood: sleepDeltaIsGood
      })
    )
    */

    // Detail Sheet Instances
    window.TTFeedDetailSheet && React.createElement(window.TTFeedDetailSheet, {
      isOpen: showFeedDetailSheet,
      onClose: () => {
        setShowFeedDetailSheet(false);
        setSelectedFeedEntry(null);
      },
      entry: selectedFeedEntry,
      onDelete: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadFeedings();
      },
      onSave: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadFeedings();
      }
    }),
    window.TTSleepDetailSheet && React.createElement(window.TTSleepDetailSheet, {
      isOpen: showSleepDetailSheet,
      onClose: () => {
        setShowSleepDetailSheet(false);
        setSelectedSleepEntry(null);
      },
      entry: selectedSleepEntry,
      onDelete: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadSleepSessions();
      },
      onSave: async () => {
        // Small delay for sheet close animation (animation handled locally in TrackerCard)
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadSleepSessions();
      }
    }),
    window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet, {
      isOpen: showInputSheet,
      onClose: () => setShowInputSheet(false),
      kidId: kidId,
      initialMode: inputSheetMode,
      activeSleep: activeSleep,
      onAdd: async (mode) => {
        // Delay refresh until after sheet closes (200ms for close animation)
        await new Promise(resolve => setTimeout(resolve, 250));
        if (mode === 'feeding') {
          await loadFeedings();
        } else {
          await loadSleepSessions();
        }
      }
    })
  );
};

// ========================================
// TINY TRACKER - PART 5
// Analytics Tab
// ========================================

// ========================================
// SLEEP ANALYTICS HELPERS
// ========================================
const _dateKeyLocal = (ms) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const _minutesSinceMidnightLocal = (ms) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

// Returns true if "startMin" is within [winStart, winEnd) where window may wrap over midnight.
const _isWithinWindow = (startMin, winStart, winEnd) => {
  const s = Number(winStart);
  const e = Number(winEnd);
  if (isNaN(s) || isNaN(e)) return false;
  if (s === e) return false;
  if (s < e) return startMin >= s && startMin < e;
  // wraps midnight
  return startMin >= s || startMin < e;
};

const _getDayWindow = (sleepSettings) => {
  // Prefer current fields; fall back to legacy if present.
  const dayStart = sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 7 * 60;
  const dayEnd = sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 19 * 60;
  return { dayStart: Number(dayStart), dayEnd: Number(dayEnd) };
};

const _sleepDurationHours = (sess) => {
  const start = Number(sess?.startTime);
  const end = Number(sess?.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  let s = start;
  let e = end;
  const nowMs = Date.now();
  // If start time accidentally landed in the future (common around midnight), pull it back one day.
  if (s > nowMs + 3 * 3600000) s -= 86400000;
  // If end < start, assume the sleep crossed midnight and the start belongs to the previous day.
  if (e < s) s -= 86400000;
  const ms = e - s;
  if (!isFinite(ms) || ms <= 0) return 0;
  return ms / (1000 * 60 * 60);
};

// Aggregate by local day, splitting sessions that cross midnight.
const aggregateSleepByDay = (sleepSessions, sleepSettings) => {
  const { dayStart, dayEnd } = _getDayWindow(sleepSettings);
  const map = {}; // dateKey -> { totalHrs, dayHrs, nightHrs, count }
  (sleepSessions || []).forEach((s) => {
    const startRaw = Number(s?.startTime);
    const endRaw = Number(s?.endTime);
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) return;
    let start = startRaw;
    let end = endRaw;
    const nowMs = Date.now();
    if (start > nowMs + 3 * 3600000) start -= 86400000;
    if (end < start) start -= 86400000;
    if (end <= start) return;

    const startMin = _minutesSinceMidnightLocal(start);
    const isDay = _isWithinWindow(startMin, dayStart, dayEnd);

    // Walk across midnights and allocate hours to each local day.
    let cursor = start;
    while (cursor < end) {
      const dayStartDate = new Date(cursor);
      dayStartDate.setHours(0, 0, 0, 0);
      const nextMidnight = dayStartDate.getTime() + 86400000;
      const segEnd = Math.min(end, nextMidnight);
      const key = _dateKeyLocal(cursor);
      const hrs = (segEnd - cursor) / (1000 * 60 * 60);
      if (!map[key]) map[key] = { totalHrs: 0, dayHrs: 0, nightHrs: 0, count: 0 };
      map[key].totalHrs += hrs;
      if (isDay) map[key].dayHrs += hrs;
      else map[key].nightHrs += hrs;
      // Count session once, on the day it started (not on every split day).
      if (cursor === start) map[key].count += 1;
      cursor = segEnd;
    }
  });
  return map;
};

const _fmtHours1 = (hrs) => {
  const n = Number(hrs || 0);
  return `${n.toFixed(1)} hrs`;
};

const _avg = (arr) => {
  if (!arr || !arr.length) return 0;
  const s = arr.reduce((a, b) => a + (Number(b) || 0), 0);
  return s / arr.length;
};

// =====================================================
// DAILY ACTIVITY CHART - Calendar-style like Huckleberry
// X = dates (columns), Y = time of day (rows)
// Sleep = vertical blocks (start->end) per day column
// Feeds = short horizontal ticks at feed start time
// Uses CSS variables: --tt-feed, --tt-sleep, --tt-feed-soft, --tt-sleep-soft
// =====================================================
const DailyActivityChart = ({
  viewMode = 'day', // 'day' | 'week' | 'month'
  feedings = [],
  sleepSessions = [],
  sleepSettings = null,
  suppressNow = false
}) => {
  // ========================================
  // ACTOGRAM: "Apple Health" polish + bulletproofing
  // ========================================
  // Turn on locally if you need it, but keep it off for production.
  const DEBUG_ACTOGRAM = false;
  const dlog = (...args) => { try { if (DEBUG_ACTOGRAM) console.log('[ACTOGRAM]', ...args); } catch {} };

  // Helper to get computed CSS variable values
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '#000000'; // fallback
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#000000';
  };

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Apple Health-ish styling constants (local to this component)
  const TT = {
    cardH: 464,           // restored taller card height (post-revert). grows downward; top/left remain locked
    headerH: 48,          // slightly tighter header for better chart breathing room
    axisW: 44,            // quiet gutter
    gridMajor: 'rgba(17,24,39,0.08)',
    gridMinor: 'rgba(17,24,39,0.04)',
    axisTextClass: 'text-[12px] font-medium text-gray-500',
    nowGreen: '#22C55E',
    // Event colors - computed from CSS variables
    sleepNight: getComputedColor('--tt-sleep'),
    sleepDay: getComputedColor('--tt-sleep-soft'),
    feedPink: getComputedColor('--tt-feed'),
  };

  // Tappable legend toggles (guard: don't allow "all off")
  const [legendOn, setLegendOn] = React.useState({ sleep: true, nap: true, feed: true });
  const toggleLegend = (key) => {
    setLegendOn((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Guard: don't allow turning everything off
      if (!next.sleep && !next.nap && !next.feed) return prev;
      return next;
    });
  };
  const legendBtnClass = (on) =>
    `flex items-center gap-2 px-2 py-1 rounded-md transition ${
      on ? 'opacity-100' : 'opacity-35'
    } hover:bg-gray-50 active:bg-gray-100`;

  // Safe default handling without mutation
  const effectiveViewMode = viewMode || 'day';
  const isMonthView = effectiveViewMode === 'month';
  const days = effectiveViewMode === 'day' ? 1 : 7; // day: 1 column, week: 7 columns (month uses its own grid)
  const [offsetDays, setOffsetDays] = React.useState(0); // 0 = week/day ending today
  const [offsetMonths, setOffsetMonths] = React.useState(0); // 0 = current month

  // Nav step:
  // - Day view should page 1 day at a time
  // - Week/Month should page 7 days at a time
  const stepDays = effectiveViewMode === 'day' ? 1 : 7;

  const clampOffset = (n) => Math.max(0, Math.floor(Number(n) || 0));
  const clampMonths = (n) => Math.max(0, Math.floor(Number(n) || 0));
  const pageBack = () => {
    if (isMonthView) setOffsetMonths((m) => clampMonths(m + 1));
    else setOffsetDays((n) => clampOffset(n + stepDays));
  };
  const pageFwd = () => {
    if (isMonthView) setOffsetMonths((m) => clampMonths(m - 1));
    else setOffsetDays((n) => clampOffset(n - stepDays));
  };
  const scrollRef = React.useRef(null);     // single horizontal scroller (header + plot) - MUST be overflow-x-auto
  const plotScrollRef = React.useRef(null); // day-view vertical scroll container

  // Apple-style current time (axis-owned, not column-owned)
  const nowMs = Date.now();

  // Auto-scroll to the most recent day (ONLY on today; do not fight paging)
  React.useEffect(() => {
    if (offsetDays !== 0) return;
    if (effectiveViewMode === 'day') return;
    if (isMonthView) return;

    const el = scrollRef.current;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let t1 = 0;
    const scrollToRight = () => {
      try {
        // scrollWidth includes the visible area; subtract clientWidth to land at max scroll
        el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      } catch {}
    };

    raf1 = requestAnimationFrame(() => {
      scrollToRight();
      raf2 = requestAnimationFrame(() => {
        scrollToRight();
        t1 = setTimeout(scrollToRight, 50);
      });
    });

    return () => {
      try { if (raf1) cancelAnimationFrame(raf1); } catch {}
      try { if (raf2) cancelAnimationFrame(raf2); } catch {}
      try { if (t1) clearTimeout(t1); } catch {}
    };
  }, [effectiveViewMode, offsetDays]);

  // Day view: auto-scroll vertically to current time (only on today)
  React.useEffect(() => {
    if (effectiveViewMode !== 'day') return;
    if (offsetDays !== 0) return;
    if (isMonthView) return;

    const el = plotScrollRef.current;
    if (!el) return;

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const pct = mins / (24 * 60);

    requestAnimationFrame(() => {
      try {
        const target = (el.scrollHeight * pct) - (el.clientHeight * 0.40);
        el.scrollTop = Math.max(0, target);
      } catch {}
    });
  }, [effectiveViewMode, offsetDays]);

  const toMs = React.useCallback((t) => {
    if (!t) return null;
    // Normalize numeric timestamps:
    // - If stored as Unix seconds (10 digits-ish), convert to ms.
    // - If already ms (13 digits-ish), keep as-is.
    if (typeof t === 'number') {
      // 2025 epoch ms ~ 1.7e12. Anything below 1e11 is definitely not ms.
      if (t > 0 && t < 100000000000) return t * 1000; // seconds -> ms
      return t; // already ms
    }
    if (t?.toMillis) return t.toMillis(); // Firestore Timestamp
    // Handle numeric strings like "1702780000"
    if (typeof t === 'string' && /^[0-9]+$/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      if (n > 0 && n < 100000000000) return n * 1000;
      return n;
    }
    const d = (t instanceof Date) ? t : new Date(t);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }, []);

  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const nowMsLocal = nowMs;

  // Month anchor (local): first day of the visible month
  const monthAnchor0 = React.useMemo(() => {
    // Use local midnight on the 1st of the month, offset backwards by offsetMonths.
    const d = new Date(today.getFullYear(), today.getMonth() - clampMonths(offsetMonths), 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [today.getFullYear(), today.getMonth(), offsetMonths]);

  const monthLabel = React.useMemo(() => {
    return new Date(monthAnchor0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [monthAnchor0]);

  dlog('viewMode', effectiveViewMode, 'days', days, 'offsetDays', offsetDays);

  // End day for the visible range
  const endDay0 = today0 - clampOffset(offsetDays) * 86400000;

  const dayStarts = React.useMemo(() => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) out.push(endDay0 - i * 86400000);
    return out;
  }, [days, endDay0]);

  const hasToday = React.useMemo(() => dayStarts.includes(today0), [dayStarts, today0]);
  const showNow = hasToday && effectiveViewMode !== 'month' && !suppressNow;
  const nowMinutes = React.useMemo(() => {
    const d = new Date(nowMs);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowMs]);
  const nowPct = (nowMinutes / (24 * 60)) * 100;
  const nowLabel = React.useMemo(() => new Date(nowMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }), [nowMs]);

  // Window: midnight to midnight (24 hours)
  const windowStartMs = (day0) => day0;
  const windowEndMs = (day0) => day0 + 86400000; // +24 hours

  // Feedings are stored as point-in-time events (typically { ounces, timestamp }).
  // Use toMs() so we correctly handle Firestore Timestamps, numbers (ms), Dates, and ISO strings.
  const feeds = React.useMemo(() => {
    const raw = Array.isArray(feedings) ? feedings : [];
    const out = [];
    for (const f of raw) {
      const s = toMs(f?.timestamp ?? f?.startTime ?? f?.time ?? f?.startAt ?? f?.start);
      if (s) out.push({ s });
    }
    return out;
  }, [feedings, toMs]);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const yPct = (tMs, day0) => {
    const ws = windowStartMs(day0);
    const we = windowEndMs(day0);
    const x = clamp(tMs, ws, we);
    return ((x - ws) / (we - ws)) * 100;
  };

  const sleeps = React.useMemo(() => {
    const raw = Array.isArray(sleepSessions) ? sleepSessions : [];
    const out = [];
    for (const s of raw) {
      const start = toMs(s?.startTime ?? s?.startAt ?? s?.start);
      const end = toMs(s?.endTime ?? s?.endAt ?? s?.end);
      // Include active sessions (missing end), and completed sessions (need end)
      if (start && (end || s?.isActive)) out.push({ ...s, s: start, e: end || null });
    }
    return out;
  }, [sleepSessions, toMs]);

  dlog('parsed feeds', feeds.length, 'parsed sleeps', sleeps.length);

  // Classify sleep as day/night based on start time
  const _sleepTypeForSession = (session) => {
    if (!session || !session.s) return 'night';
    if (session.sleepType === 'day' || session.sleepType === 'night') return session.sleepType;
    if (typeof session.isDaySleep === 'boolean') return session.isDaySleep ? 'day' : 'night';

    const start = session.s;
    const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
    const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);

    const mins = (() => {
      try {
        const d = new Date(start);
        return d.getHours() * 60 + d.getMinutes();
      } catch {
        return 0;
      }
    })();

    const within = dayStart <= dayEnd
      ? (mins >= dayStart && mins <= dayEnd)
      : (mins >= dayStart || mins <= dayEnd);
    return within ? 'day' : 'night';
  };

  // Apple Calendar-like ticks: every 3 hours; show "Noon" at 12 PM
  const majorTicks = React.useMemo(() => [0, 12, 24], []);
  const minorTicks = React.useMemo(() => [3, 6, 9, 15, 18, 21], []);
  const hourLabels = React.useMemo(() => ([
    { i: 0, label: '12 AM' },
    { i: 6, label: '6 AM' },
    { i: 12, label: 'Noon' },
    { i: 18, label: '6 PM' },
    { i: 24, label: '12 AM' }
  ]), []);

  // Match "Daily volume" style: black number + smaller grey AM/PM (and show "Noon" as Noon)
  const renderGutterTime = React.useCallback((label) => {
    const raw = String(label || '');
    // Force 12 PM to show as "Noon" (handles either 'Noon' or '12 PM')
    if (raw === 'Noon' || raw === '12 PM') {
      return React.createElement(
        'span',
        { className: 'inline-flex items-baseline' },
        React.createElement(
          'span',
          { className: 'text-[12px] font-semibold text-gray-900 leading-none' },
          'Noon'
        )
      );
    }

    const parts = raw.split(' ');
    const num = parts[0] || '';
    const mer = (parts[1] || '').toUpperCase();

    // If something unexpected comes through, fall back to plain text
    if (!num) return React.createElement('span', null, label);

    return React.createElement(
      'span',
      { className: 'inline-flex items-baseline gap-1' },
      React.createElement(
        'span',
        { className: 'text-[12px] font-semibold text-gray-900 leading-none' },
        num
      ),
      mer
        ? React.createElement(
            'span',
            { className: 'text-[10px] font-medium text-gray-400 leading-none' },
            mer
          )
        : null
    );
  }, []);

  // Keep the chart area visually consistent across day/week/month.
  // We keep card height fixed (TT.cardH) and use one plot height for all modes.
  // IMPORTANT: Must fit 12a -> 12a with NO vertical scroll inside the fixed card height.
  // This is tuned so: nav + legend + sticky header + plot fits within TT.cardH.
  // If you change TT.cardH/headerH/paddings elsewhere, adjust this first.
  // Give the top 12 AM label box extra headroom (prevents clipping in Day view),
  // while keeping the overall chart height identical.
  const PAD_T = 14;
  const PLOT_H = 260; // +28px: more vertical breathing room for the grid itself
  const PAD_B = 14; // give the bottom "12 AM" label a few extra px so it never clips
  const PLOT_TOTAL_H = PLOT_H + PAD_T + PAD_B;
  const yPxFromPct = (pct) => PAD_T + (pct / 100) * PLOT_H;
  // Exact tick Y used throughout the chart (mins from 0..1440)
  // NOTE: We do NOT change the gridlines here; we only use this to align labels precisely.
  const tickY = React.useCallback((hour) => {
    const mins = Number(hour) * 60;
    return PAD_T + (mins / (24 * 60)) * PLOT_H;
  }, [PAD_T, PLOT_H]);
  // Fixed label box height so all time labels align consistently to gridlines
  // (avoids font-metric differences like "Noon" vs "6 PM")
  const GUTTER_LABEL_H = 16;
  const yPx = (tMs, day0) => yPxFromPct(yPct(tMs, day0));
  const nowY = yPxFromPct(nowPct);
  // Clamp “now” so pill/line never render outside the plot (prevents running off-card)
  const nowYClamped = clamp(nowY, 10, PLOT_TOTAL_H - 10);
  const COL_W = effectiveViewMode === 'day' ? null : 54;
  const contentWidth = effectiveViewMode === 'day' ? '100%' : `${days * COL_W}px`;

  // Bucket feeds by dayStart for O(1) lookup per column
  const feedsByDay = React.useMemo(() => {
    const map = new Map();
    for (const day0 of dayStarts) map.set(day0, []);
    for (const ev of feeds) {
      // Determine which visible day bucket this feed belongs to
      for (const day0 of dayStarts) {
        const ws = windowStartMs(day0);
        const we = windowEndMs(day0);
        if (ev.s >= ws && ev.s < we) {
          map.get(day0).push(ev);
          break;
        }
      }
    }
    return map;
  }, [feeds, dayStarts]);

  // Bucket sleeps by dayStart (include overlaps)
  const sleepsByDay = React.useMemo(() => {
    const map = new Map();
    for (const day0 of dayStarts) map.set(day0, []);
    for (const ev of sleeps) {
      for (const day0 of dayStarts) {
        const ws = windowStartMs(day0);
        const we = windowEndMs(day0);
        if (ev.isActive) {
          // Active sleep: show if it started before window ends
          if (ev.s < we) map.get(day0).push(ev);
        } else if (ev.e) {
          // Completed sleep: show if overlap
          if ((ev.s < we) && (ev.e > ws)) map.get(day0).push(ev);
        }
      }
    }
    return map;
  }, [sleeps, dayStarts]);

  // ===========================
  // MONTH SUMMARY CALENDAR DATA
  // ===========================
  const monthGridDays = React.useMemo(() => {
    if (!isMonthView) return [];

    const start = new Date(monthAnchor0); // first of month
    const monthY = start.getFullYear();
    const monthM = start.getMonth();
    const monthStart0 = new Date(monthY, monthM, 1).getTime();
    const monthEnd0 = new Date(monthY, monthM + 1, 1).getTime();

    // Calendar grid starts on Sunday of the week containing the 1st.
    const firstDow = new Date(monthStart0).getDay(); // 0..6 (Sun..Sat)
    const gridStart0 = monthStart0 - firstDow * 86400000;

    const out = [];
    for (let i = 0; i < 42; i++) {
      const day0 = gridStart0 + i * 86400000;
      const inMonth = day0 >= monthStart0 && day0 < monthEnd0;
      out.push({ day0, inMonth });
    }
    return out;
  }, [isMonthView, monthAnchor0]);

  const feedOzByDayKey = React.useMemo(() => {
    if (!isMonthView) return new Map();
    const map = new Map(); // YYYY-MM-DD -> oz
    const raw = Array.isArray(feedings) ? feedings : [];
    for (const f of raw) {
      const ms = toMs(f?.timestamp ?? f?.startTime ?? f?.time ?? f?.startAt ?? f?.start);
      if (!ms) continue;
      const oz = Number(f?.ounces ?? f?.volume ?? 0);
      if (!Number.isFinite(oz) || oz <= 0) continue;
      const key = _dateKeyLocal(ms);
      map.set(key, (map.get(key) || 0) + oz);
    }
    return map;
  }, [isMonthView, feedings, toMs]);

  const sleepHrsByDayKey = React.useMemo(() => {
    if (!isMonthView) return {};
    // Reuse the same aggregation logic used elsewhere (splits across midnight properly)
    return aggregateSleepByDay(sleepSessions || [], sleepSettings);
  }, [isMonthView, sleepSessions, sleepSettings]);

  const fmtOz0 = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `${Math.round(v)} oz`;
  };

  const fmtHrs1Short = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `${v.toFixed(1)} h`;
  };

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        className: 'bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col',
        style: { height: TT.cardH }
      },

      // Month navigation row (no toggle inside card)
      React.createElement(
        'div',
        { className: 'px-4 pt-4 pb-2 flex items-center justify-between' },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: pageBack,
            className: 'p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition'
          },
          React.createElement(ChevronLeft, { className: 'w-5 h-5', style: { strokeWidth: '3' } })
        ),
        React.createElement(
          'div',
          { className: 'text-[16px] font-semibold text-gray-900' },
          isMonthView
            ? monthLabel
            : new Date(dayStarts[Math.floor(dayStarts.length / 2)]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: pageFwd,
            disabled: isMonthView ? (offsetMonths <= 0) : (offsetDays <= 0),
            className: `p-2 rounded-lg transition ${
              (isMonthView ? (offsetMonths <= 0) : (offsetDays <= 0))
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-indigo-600 hover:bg-indigo-50'
            }`
          },
          React.createElement(ChevronRight, { className: 'w-5 h-5', style: { strokeWidth: '3' } })
        )
      ),

      // Scrollable time-grid (ONE scroll container; header + gutter are sticky)
      React.createElement(
        'div',
        {
          // IMPORTANT: Do NOT let the chart consume all remaining height (or the bottom legend gets clipped).
          // Give it an explicit height so the legend below always has room inside the fixed-height card.
          className: 'pl-2 pr-4 pb-3 flex-none',
          style: {
            overscrollBehavior: 'contain',
            height: TT.headerH + PLOT_TOTAL_H + 6
          }
        },
        React.createElement(
          'div',
          {
            // Preserve the same rounded container + fixed height in all modes
            className: 'w-full overflow-hidden rounded-xl',
            style: {
              display: 'grid',
              gridTemplateRows: `${TT.headerH}px ${PLOT_TOTAL_H}px`,
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              scrollbarGutter: 'stable',
              height: TT.headerH + PLOT_TOTAL_H
            },
            ref: (el) => {
              // Single scroll container for BOTH horizontal + vertical behaviors
              scrollRef.current = el;
              plotScrollRef.current = el;
            }
          },

          // Inner content
          React.createElement(
            'div',
            { className: 'min-w-full', style: { minWidth: '100%', width: '100%' } },
            isMonthView
              ? React.createElement(
                  React.Fragment,
                  null,
                  // Header row: weekday labels (no gutter divider, calm)
                  React.createElement(
                    'div',
                    {
                      className: 'grid',
                      style: {
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        background: 'rgba(255,255,255,0.98)',
                        backdropFilter: 'saturate(180%) blur(10px)',
                        borderBottom: 'none',
                        height: TT.headerH,
                        maxHeight: TT.headerH,
                        overflow: 'hidden',
                        gridTemplateColumns: `${TT.axisW}px repeat(7, 1fr)`
                      }
                    },
                    React.createElement('div', { style: { height: TT.headerH } }),
                    React.createElement(
                      'div',
                      {
                        className: 'grid',
                        style: {
                          gridColumn: '2 / span 7',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          height: TT.headerH,
                          maxHeight: TT.headerH
                        }
                      },
                      ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) =>
                        React.createElement(
                          'div',
                          { key: d, className: 'text-center flex items-center justify-center' },
                          React.createElement('div', { className: 'text-[11px] font-medium tracking-[0.5px] text-gray-400 leading-none' }, d)
                        )
                      )
                    )
                  ),

                  // Body row: 7x6 grid (breathable)
                  React.createElement(
                    'div',
                    {
                      className: 'grid relative',
                      style: {
                        gridTemplateColumns: `${TT.axisW}px repeat(7, 1fr)`,
                        height: PLOT_TOTAL_H,
                        overflow: 'hidden'
                      }
                    },
                    // quiet gutter spacer to align with other modes
                    React.createElement('div', { className: 'relative', style: { background: 'rgba(255,255,255,0.98)' } }),

                    React.createElement(
                      'div',
                      {
                        className: 'grid h-full',
                        style: {
                          gridColumn: '2 / span 7',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gridTemplateRows: 'repeat(6, 1fr)',
                          gap: 6,
                          padding: 6
                        }
                      },
                      monthGridDays.map(({ day0, inMonth }) => {
                        const key = _dateKeyLocal(day0);
                        const isTodayCell = day0 === today0;
                        const oz = feedOzByDayKey.get(key) || 0;
                        const sleepHrs = Number(sleepHrsByDayKey?.[key]?.totalHrs || 0);

                        // If out-of-month, render an empty muted cell to preserve breathing.
                        if (!inMonth) {
                          return React.createElement('div', {
                            key: `mcell-${day0}`,
                            className: 'rounded-lg',
                            style: { background: 'rgba(17,24,39,0.02)' }
                          });
                        }

                        const ozText = fmtOz0(oz);
                        const hrsText = fmtHrs1Short(sleepHrs);

                        return React.createElement(
                          'div',
                          {
                            key: `mcell-${day0}`,
                            className: 'rounded-xl',
                            style: {
                              background: isTodayCell ? hexToRgba(TT.feedPink, 0.08) : 'rgba(255,255,255,1)',
                              border: '1px solid rgba(17,24,39,0.06)',
                              padding: 10,
                              overflow: 'hidden'
                            }
                          },
                          React.createElement(
                            'div',
                            { className: 'text-[11px] font-medium text-gray-500 leading-none' },
                            String(new Date(day0).getDate())
                          ),
                          ozText
                            ? React.createElement(
                                'div',
                                { className: 'mt-2 text-[13px] font-semibold leading-tight', style: { color: TT.feedPink } },
                                ozText
                              )
                            : null,
                          hrsText
                            ? React.createElement(
                                'div',
                                { className: 'mt-1 text-[13px] font-medium leading-tight', style: { color: TT.sleepNight } },
                                hrsText
                              )
                            : null
                        );
                      })
                    )
                  )
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  // Sticky header row (day strip)
                  React.createElement(
                    'div',
                    {
                      className: 'grid',
                      style: {
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        background: 'rgba(255,255,255,0.98)',
                        backdropFilter: 'saturate(180%) blur(10px)',
                        borderBottom: 'none',
                        height: TT.headerH,
                        maxHeight: TT.headerH,
                        overflow: 'hidden',
                        gridTemplateColumns: `${TT.axisW}px ${effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`}`
                      }
                    },
                    React.createElement('div', { style: { height: TT.headerH } }),
                    React.createElement(
                      'div',
                      {
                        className: 'grid',
                        style: {
                          gridColumn: `2 / span ${effectiveViewMode === 'day' ? 1 : days}`,
                          gridTemplateColumns: effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`,
                          height: TT.headerH,
                          maxHeight: TT.headerH
                        }
                      },
                      dayStarts.map((day0) => {
                        const d = new Date(day0);
                        const isToday = day0 === today0;
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                        const dayNum = d.getDate();

                        return React.createElement(
                          'div',
                          {
                            key: `strip-${day0}`,
                            className: 'text-center',
                            style: { height: TT.headerH, maxHeight: TT.headerH }
                          },
                          React.createElement(
                            'div',
                            {
                              className: `h-full flex flex-col justify-center ${isToday ? 'bg-indigo-50' : ''}`,
                              style: isToday ? { borderRadius: 12 } : { overflow: 'hidden' }
                            },
                            React.createElement(
                              React.Fragment,
                              null,
                              React.createElement(
                                'div',
                                { className: 'text-[11px] font-medium tracking-[0.5px] text-gray-400 leading-none' },
                                dayName
                              ),
                              React.createElement(
                                'div',
                                { className: `mt-[2px] text-[16px] font-semibold leading-none ${isToday ? 'text-indigo-600' : 'text-gray-900'}` },
                                String(dayNum)
                              )
                            )
                          )
                        );
                      })
                    )
                  ),

                  // Body row: axis + day columns share ONE coordinate system (existing actogram)
                  React.createElement(
                    'div',
                    {
                      className: 'grid relative',
                      style: {
                        gridTemplateColumns: `${TT.axisW}px ${effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`}`,
                        height: PLOT_TOTAL_H,
                        overflow: 'hidden'
                      }
                    },

                    // AXIS COLUMN (sticky-left, no divider line)
                    React.createElement(
                      'div',
                      {
                        className: 'relative',
                        style: {
                          position: 'sticky',
                          left: 0,
                          zIndex: 30,
                          background: 'rgba(255,255,255,0.98)'
                        }
                      },

                      // Time labels (calm, Apple-like)
                      React.createElement(
                        'div',
                        { className: 'relative', style: { height: PLOT_TOTAL_H } },
                        hourLabels.map((h) =>
                          React.createElement(
                            'div',
                            {
                              key: `ylab-${h.i}`,
                              className: 'absolute right-1 text-right',
                              style: {
                                // Align the CENTER of a fixed-height label box to the gridline
                                top: `${tickY(h.i) - GUTTER_LABEL_H / 2}px`,
                                height: `${GUTTER_LABEL_H}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                              }
                            },
                            renderGutterTime(h.label)
                          )
                        )
                      )
                    ),

                    // BODY ROW "NOW" DOT: sits on the gutter/grid boundary and caps the now line
                    showNow &&
                      React.createElement('div', {
                        className: 'absolute pointer-events-none',
                        style: {
                          top: `${nowYClamped}px`,
                          left: `${TT.axisW}px`, // exact boundary between gutter and grid
                          width: 6,
                          height: 6,
                          background: TT.nowGreen,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: 999,
                          // Keep above chart content but BELOW fullscreen overlays / persistent nav
                          zIndex: 18
                        }
                      }),

                    // DAY COLUMNS WRAPPER (relative so gridlines + now line span fully)
                    React.createElement(
                      'div',
                      {
                        className: 'relative',
                        style: {
                          gridColumn: `2 / span ${effectiveViewMode === 'day' ? 1 : days}`,
                          height: '100%'
                        }
                      },

                      // Global horizontal gridlines (draw ONCE across all columns)
                      React.createElement(
                        'div',
                        { className: 'pointer-events-none absolute inset-0', style: { zIndex: 1 } },
                        // Major lines (align line center to tick: y - 0.5)
                        majorTicks.map((i) =>
                          React.createElement('div', {
                            key: `maj-${i}`,
                            className: 'absolute left-0 right-0',
                            style: {
                              top: `${PAD_T + ((i * 60) / (24 * 60)) * PLOT_H - 0.5}px`,
                              height: 1,
                              background: TT.gridMajor
                            }
                          })
                        ),
                        // Minor lines (every 3h) (align line center to tick: y - 0.5)
                        minorTicks.map((i) =>
                          React.createElement('div', {
                            key: `min-${i}`,
                            className: 'absolute left-0 right-0',
                            style: {
                              top: `${PAD_T + ((i * 60) / (24 * 60)) * PLOT_H - 0.5}px`,
                              height: 1,
                              background: TT.gridMinor
                            }
                          })
                        )
                      ),

                      // NOW LINE: spans the FULL grid width and connects to the dot at the boundary
                      showNow &&
                        React.createElement('div', {
                          className: 'pointer-events-none absolute',
                          style: {
                            top: `${nowYClamped}px`,
                            left: 0, // wrapper already starts AFTER the gutter (gridColumn: 2)
                            right: 0, // extend to the end of the calendar
                            height: 2,
                            background: TT.nowGreen,
                            transform: 'translateY(-50%)',
                            // Below the dot, above gridlines
                            zIndex: 16
                          }
                        }),

                      // Day columns
                      React.createElement(
                        'div',
                        {
                          className: 'grid h-full',
                          style: {
                            gridTemplateColumns: effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`,
                            height: '100%'
                          }
                        },
                        dayStarts.map((day0) => {
                          const isToday = day0 === today0;
                          const daySleeps = sleepsByDay.get(day0) || [];
                          const dayFeeds = feedsByDay.get(day0) || [];

                          return React.createElement(
                            'div',
                            {
                              key: day0,
                              className: '',
                              style: {
                                position: 'relative',
                                height: '100%',
                                // No gutter divider; keep only ultra-subtle column separators
                                borderRight: 'none'
                              }
                            },

                            // Sleep blocks + feed ticks
                            React.createElement(
                              'div',
                              { className: 'relative', style: { height: '100%', zIndex: 10 } },

                              // Today shading: ONLY the 24h grid area (from 12 AM line to 12 AM line)
                              isToday &&
                                React.createElement('div', {
                                  className: 'absolute left-0 right-0 pointer-events-none',
                                  style: {
                                    top: `${PAD_T}px`,
                                    height: `${PLOT_H}px`,
                                    background: hexToRgba(TT.feedPink, 0.06),
                                    borderRadius: 8,
                                    zIndex: 0
                                  }
                                }),

                              // Sleep blocks (wide, clean) - build a single flat children array (more reliable on iOS)
                              (() => {
                                const children = [];
                                for (let idx = 0; idx < daySleeps.length; idx++) {
                                  const ev = daySleeps[idx];
                                  const sleepType = _sleepTypeForSession(ev);
                                  const allow = sleepType === 'night' ? legendOn.sleep : legendOn.nap;
                                  if (!allow) continue;

                                  const isActive = ev.isActive;
                                  const endTime = isActive ? nowMsLocal : ev.e || nowMsLocal;

                                  const topPct = yPct(ev.s, day0);
                                  const bottomPct = yPct(endTime, day0);
                                  const topPx = yPxFromPct(topPct);
                                  const bottomPx = yPxFromPct(bottomPct);
                                  const hPx = Math.max(1, bottomPx - topPx);

                                  const bgColor = sleepType === 'night' ? TT.sleepNight : TT.sleepDay;
                                  const leftMargin = effectiveViewMode === 'day' ? 10 : 6;
                                  const rightMargin = effectiveViewMode === 'day' ? 10 : 6;

                                  const baseKey = ev?.id || `${day0}-${ev.s}-${ev.e || 'active'}-${idx}`;

                                  children.push(
                                    React.createElement('div', {
                                      key: `sleep-block-${baseKey}`,
                                      className: 'absolute rounded-lg',
                                      style: {
                                        top: `${topPx}px`,
                                        height: `${hPx}px`,
                                        left: `${leftMargin}px`,
                                        right: `${rightMargin}px`,
                                        background: bgColor,
                                        opacity: 0.72,
                                        border: '1px solid rgba(255,255,255,0.25)',
                                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)',
                                        zIndex: 10
                                      }
                                    })
                                  );

                                  // Active indicator (day view only; keep quiet)
                                  if (isActive && effectiveViewMode === 'day') {
                                    children.push(
                                      React.createElement(
                                        'div',
                                        {
                                          key: `sleep-active-${baseKey}`,
                                          className:
                                            'absolute left-3 text-[9px] font-semibold bg-white px-1 py-0.5 rounded shadow-sm',
                                          style: {
                                            top: `${Math.min(PLOT_TOTAL_H - 8, bottomPx + 6)}px`,
                                            color: TT.sleepNight,
                                            border: `1px solid ${hexToRgba(TT.sleepNight, 0.2)}`,
                                            zIndex: 15
                                          }
                                        },
                                        ' Active'
                                      )
                                    );
                                  }
                                }
                                return children;
                              })(),

                              // Feed ticks
                              legendOn.feed
                                ? dayFeeds.map((ev, idx) => {
                                    const topPx = yPx(ev.s, day0);
                                    return React.createElement('div', {
                                      key: `${day0}-feed-${idx}`,
                                      className: 'absolute',
                                      style: {
                                        top: `${topPx}px`,
                                        left: effectiveViewMode === 'day' ? '10px' : '8px',
                                        right: effectiveViewMode === 'day' ? '10px' : '8px',
                                        height: '2px',
                                        background: TT.feedPink,
                                        transform: 'translateY(-50%)',
                                        borderRadius: '2px',
                                        zIndex: 20
                                      }
                                    });
                                  })
                                : null
                            )
                          );
                        })
                      )
                    )
                  )
                )
          )
        ),

      // Legend (below chart; push down into any leftover card whitespace)
      React.createElement(
        'div',
        { className: 'pl-2 pr-4 pt-1 pb-2 w-full mt-auto' },
        React.createElement(
          'div',
          {
            className: 'w-full flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-gray-700'
          },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => toggleLegend('sleep'),
              'aria-pressed': !!legendOn.sleep,
              className: legendBtnClass(!!legendOn.sleep)
            },
            React.createElement('span', { className: 'inline-block w-[10px] h-[10px] rounded-sm', style: { background: TT.sleepNight } }),
            'Sleep'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => toggleLegend('nap'),
              'aria-pressed': !!legendOn.nap,
              className: legendBtnClass(!!legendOn.nap)
            },
            React.createElement('span', { className: 'inline-block w-[10px] h-[10px] rounded-sm', style: { background: TT.sleepDay } }),
            'Nap'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => toggleLegend('feed'),
              'aria-pressed': !!legendOn.feed,
              className: legendBtnClass(!!legendOn.feed)
            },
            React.createElement('span', { className: 'inline-block w-[12px] h-[3px] rounded-sm', style: { background: TT.feedPink } }),
            'Feed'
          )
        )
      )
    )
  ));
};

// ========================================
// SHARED SUBPAGE SEGMENTED TOGGLE (matches Part 4 style)
// - Full-width, card-aligned
// - Apple Health–like height
// - Used ONLY on Analytics subpages (modals)
// ========================================
const AnalyticsSubpageToggle = ({
  value,
  options = [], // [{ key, label, mapsTo }]
  onChange,
  ariaLabel = 'Time range'
}) => {
  const opts = Array.isArray(options) ? options.filter(Boolean) : [];
  if (opts.length <= 1) return null;

  return React.createElement(
    'div',
    {
      className: 'px-4 pt-3 pb-2'
    },
    React.createElement(
      'div',
      {
        role: 'tablist',
        'aria-label': ariaLabel,
        className: 'w-full flex h-[30px] p-[2px] rounded-[8px] bg-black/5 dark:bg-white/10'
      },
      opts.flatMap((opt, index) => {
        const selected = value === opt.key;
        const isFirst = index === 0;
        const prevSelected = index > 0 && value === opts[index - 1]?.key;
        const showDivider = !isFirst && !selected && !prevSelected;
        
        const elements = [];
        
        // Add divider before this button (except for first)
        if (!isFirst && !selected && !prevSelected) {
          elements.push(
            React.createElement(
              'div',
              {
                key: `divider-${index}`,
                className: 'w-[1px] my-[2px] bg-gray-400/30 dark:bg-gray-300/25'
              }
            )
          );
        }
        
        // Add the button
        elements.push(
          React.createElement(
            'button',
            {
              key: opt.key,
              type: 'button',
              role: 'tab',
              'aria-selected': selected,
              onClick: () => {
                try {
                  if (typeof onChange === 'function') {
                    onChange(opt.mapsTo || opt.key);
                  }
                } catch {}
              },
              className:
                'flex-1 h-[26px] flex items-center justify-center rounded-[6px] text-[12px] leading-[14px] font-medium transition ' +
                (selected
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600')
            },
            opt.label
          )
        );
        
        return elements;
      })
    )
  );
};

// ========================================
// FULLSCREEN MODAL (for Analytics highlights)
// - iOS-friendly: fixed overlay + safe-area padding
// - Swipe-right to go back (close) with animation (edge swipe)
// ========================================
const FullscreenModal = ({ title, onClose, children }) => {
  const startRef = React.useRef(null);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const bodyRef = React.useRef(null);
  const restoreRef = React.useRef(null);

  // Keep bottom tab bar visible (your app uses ~80px bottom padding)
  const TAB_BAR_H = 80;

  // Match app background by reading what MainApp already applies to <body>
  const bg = React.useMemo(() => {
    try {
      const c = getComputedStyle(document.body).backgroundColor;
      return c || '#F2F2F7';
    } catch {
      return '#F2F2F7';
    }
  }, []);

  // Lock underlying document scrolling while modal is open (prevents “page behind modal” scroll)
  React.useEffect(() => {
    try {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollY = window.scrollY || 0;

      restoreRef.current = {
        scrollY,
        docOverflow: docEl.style.overflow,
        bodyOverflow: body.style.overflow,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyWidth: body.style.width
      };

      docEl.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      // iOS: position fixed prevents rubber-band scroll of the underlying page
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
    } catch {}

    return () => {
      try {
        const docEl = document.documentElement;
        const body = document.body;
        const prev = restoreRef.current;
        if (prev) {
          docEl.style.overflow = prev.docOverflow || '';
          body.style.overflow = prev.bodyOverflow || '';
          body.style.position = prev.bodyPosition || '';
          body.style.top = prev.bodyTop || '';
          body.style.width = prev.bodyWidth || '';
          window.scrollTo(0, prev.scrollY || 0);
        }
      } catch {}
    };
  }, []);

  const closeAnimated = React.useCallback(() => {
    if (closing) return;
    setClosing(true);
    try {
      const w = Math.max(320, (typeof window !== 'undefined' ? window.innerWidth : 375));
      setDragging(false);
      setDragX(w);
      setTimeout(() => {
        try { if (typeof onClose === 'function') onClose(); } catch {}
      }, 220);
    } catch {
      try { if (typeof onClose === 'function') onClose(); } catch {}
    }
  }, [closing, onClose]);

  const onTouchStart = (e) => {
    try {
      const t = e.touches && e.touches[0];
      if (!t) return;
      // Only allow swipe-back if gesture begins near the left edge (iOS back gesture)
      const EDGE_PX = 24;
      const edgeOK = t.clientX <= EDGE_PX;
      startRef.current = { x: t.clientX, y: t.clientY, ts: Date.now(), edgeOK };
      if (edgeOK) {
        setDragging(true);
        setDragX(0);
      }
    } catch {}
  };

  const onTouchMove = (e) => {
    try {
      const s = startRef.current;
      if (!s || !s.edgeOK) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;

      // If user is clearly scrolling vertically, cancel the swipe gesture
      if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
        setDragging(false);
        setDragX(0);
        startRef.current = null;
        return;
      }

      if (dx <= 0) {
        setDragX(0);
        return;
      }

      // Prevent horizontal scroll; keep vertical scrolling working in body
      try { e.preventDefault(); } catch {}

      const w = Math.max(320, (typeof window !== 'undefined' ? window.innerWidth : 375));
      const clamped = Math.max(0, Math.min(dx, w));
      setDragX(clamped);
    } catch {}
  };

  const onTouchEnd = (e) => {
    try {
      const s = startRef.current;
      startRef.current = null;
      if (!s || !s.edgeOK) {
        setDragging(false);
        setDragX(0);
        return;
      }

      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) {
        setDragging(false);
        setDragX(0);
        return;
      }

      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - (s.ts || 0);

      // Complete if it was a deliberate right swipe
      const w = Math.max(320, (typeof window !== 'undefined' ? window.innerWidth : 375));
      const shouldClose =
        dx > Math.min(120, w * 0.33) &&
        Math.abs(dy) < 60 &&
        dt < 900;

      setDragging(false);

      if (shouldClose) {
        closeAnimated();
      } else {
        // snap back
        setDragX(0);
      }
    } catch {
      setDragging(false);
      setDragX(0);
    }
  };

  return React.createElement(
    'div',
    {
      // Overlay: fixed, sized to leave the bottom tab bar visible
      className: 'fixed left-0 right-0 top-0 z-50',
      style: {
        backgroundColor: bg,
        bottom: `${TAB_BAR_H}px`,
        display: 'flex',
        flexDirection: 'column'
      }
    },
    // Sliding SHEET: full viewport height; this is what we translate during swipe
    React.createElement(
      'div',
      {
        className: 'w-full min-h-0',
        style: {
          // Own the overlay’s height (which already excludes the tab bar)
          height: '100%',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 220ms ease',
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: bg
        }
      },
      // Left-edge swipe zone (captures iOS back swipe without hijacking scrolling)
      React.createElement('div', {
        className: 'absolute left-0 top-0 bottom-0 z-50',
        style: { width: 24, background: 'transparent', touchAction: 'none' },
        onTouchStart,
        onTouchMove,
        onTouchEnd
      }),
      // Header: fixed height; whole row is tappable back
      React.createElement(
        'div',
        {
          className: 'flex-none border-b border-gray-100',
          // IMPORTANT: explicit background so underlying page never “peeks through”
          style: { paddingTop: 'env(safe-area-inset-top)', backgroundColor: bg }
        },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => { try { if (typeof onClose === 'function') onClose(); } catch {} },
            className: 'w-full h-12 px-4 flex items-center gap-2 text-left',
            style: { backgroundColor: bg }
          },
          React.createElement(
            'span',
            { className: 'p-2 -ml-2 rounded-lg hover:bg-black/5 active:bg-black/10' },
            React.createElement(ChevronLeft, { className: 'w-5 h-5 text-indigo-600', style: { strokeWidth: '3' } })
          ),
          React.createElement(
            'div',
            { className: 'text-[16px] font-semibold text-gray-900' },
            title || ''
          )
        )
      ),
      // Body: ONLY scroll container (fixes clipped cards + weird scroll indicator)
      React.createElement(
        'div',
        {
          ref: bodyRef,
          className: 'flex-1 min-h-0 overflow-y-auto',
          style: {
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            touchAction: 'pan-y'
          }
        },
        children
      )
    )
  );
};

// =====================================================
// HIGHLIGHT CARD COMPONENT
// Reusable container for Analytics highlight cards
// =====================================================

// =====================================================
// HIGHLIGHT MINI VIZ VIEWPORT (Highlight cards only)
// - Fixed-height viewport (180px default)
// - Inner horizontal scroller (scrollbar visually hidden)
// - Programmatically pinned to the RIGHT (latest bucket fully visible)
// - Non-interactive (no user scrolling)
// =====================================================
let __ttHighlightMiniVizStyleInjected = false;
const _ensureHighlightMiniVizStyles = () => {
  try {
    if (__ttHighlightMiniVizStyleInjected) return;
    __ttHighlightMiniVizStyleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .tt-hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}
      .tt-hide-scrollbar::-webkit-scrollbar{display:none}
    `;
    document.head.appendChild(style);
  } catch {}
};

const HighlightMiniVizViewport = ({ height = 180, children }) => {
  const scrollerRef = React.useRef(null);

  React.useEffect(() => {
    _ensureHighlightMiniVizStyles();
  }, []);

  const childCount = React.Children.count(children);

  // Pin to the right on mount + whenever the child count changes.
  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const pinRight = () => {
      try {
        el.scrollLeft = el.scrollWidth;
      } catch {}
    };

    // Run a few times to survive layout/paint order quirks.
    pinRight();
    const r1 = requestAnimationFrame(pinRight);
    const r2 = requestAnimationFrame(pinRight);
    const t1 = setTimeout(pinRight, 0);

    return () => {
      try { cancelAnimationFrame(r1); } catch {}
      try { cancelAnimationFrame(r2); } catch {}
      try { clearTimeout(t1); } catch {}
    };
  }, [childCount]);

  // NOTE: HighlightCard has 24px padding. We full-bleed by 24px on each side (-mx-6)
  // and then re-add inner padding so bars align to the card edges.
  return React.createElement(
    'div',
    {
      className: 'relative overflow-hidden -mx-6',
      style: { height: `${height}px`, width: 'calc(100% + 48px)' }
    },
    React.createElement(
      'div',
      {
        ref: scrollerRef,
        className: 'tt-hide-scrollbar overflow-x-auto overflow-y-visible',
        style: {
          height: `${height}px`,
          paddingLeft: 24,
          paddingRight: 32, // extra right padding so the last value pill doesn't kiss the edge
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          // Disable all user interaction/scrolling while still allowing programmatic scrollLeft.
          pointerEvents: 'none',
          touchAction: 'none'
        }
      },
      children
    )
  );
};

// Sleep Chart Component - matches SleepCard.tsx design
const SleepChart = ({ data = [], average = 0 }) => {
  // Helper to get computed CSS variable values
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '#4a8ac2'; // fallback to default sleep
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#4a8ac2';
  };

  const sleepColor = getComputedColor('--tt-sleep');
  const mutedBarColor = getComputedColor('--tt-subtle-surface');
  const tertiaryText = getComputedColor('--tt-text-tertiary');
  const secondaryText = getComputedColor('--tt-text-secondary');

  // Convert date to day of week abbreviation
  const getDayAbbrev = (date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return abbrevs[day];
  };
  
  // Get today's date key for highlighting
  const todayKey = _dateKeyLocal(Date.now());
  
  // Process data: map to chart format (data should already have 7 days, oldest to newest)
  const chartData = data.map((entry, index) => {
    const hours = entry.totalHrs || 0;
    const dayAbbrev = entry.date ? getDayAbbrev(entry.date) : '';
    const isToday = entry.key === todayKey;
    return {
      day: dayAbbrev,
      hours: hours,
      isHighlighted: isToday,
      isToday: isToday
    };
  });
  
  // Ensure we have exactly 7 days (data should already be 7, but handle edge cases)
  if (chartData.length === 0) {
    // No data: create 7 empty days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: i === 0
      });
    }
  } else if (chartData.length < 7) {
    // Pad missing days with zeros (shouldn't happen, but handle gracefully)
    const now = new Date();
    while (chartData.length < 7) {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - chartData.length - 1));
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: chartData.length === 6 // Last one added is today
      });
    }
  }
  
  // Calculate max hours for scaling (include average in max calculation)
  const maxHours = Math.max(
    ...chartData.map(d => d.hours),
    average,
    1 // Minimum of 1 to avoid division by zero
  );
  
  const chartHeight = 130; // Increased from 100 to make bars taller
  const barWidth = 32;
  const barGap = 16; // gap between bars
  const chartWidth = barWidth + barGap; // per bar area
  const totalWidth = (chartData.length - 1) * chartWidth + barWidth;
  
  // Calculate bar heights and positions
  const bars = chartData.map((entry, index) => {
    const x = index * chartWidth;
    const height = (entry.hours / maxHours) * chartHeight;
    const y = chartHeight - height;
    return { ...entry, x, y, height };
  });
  
  // Reference line position (average sleep)
  const refLineY = chartHeight - (average / maxHours) * chartHeight;
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = React.useRef(null);
  
  // Intersection Observer to detect when card scrolls into view
  useEffect(() => {
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: animate immediately if IntersectionObserver not available
      setIsVisible(true);
      return;
    }
    
    const element = chartRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);
  
  return React.createElement(
    'div',
    { 
      className: 'flex flex-col h-full justify-between',
      ref: chartRef
    },
    // Average Sleep section
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
        React.createElement(
          'span',
          {
            className: 'text-xs font-medium tracking-wider mb-1',
            style: { color: tertiaryText }
          },
          'Average sleep'
        ),
        React.createElement(
          'div',
          { className: 'flex items-baseline gap-1' },
        React.createElement(
          'span',
          {
            className: 'text-[39.6px] font-bold leading-none',
            style: { color: sleepColor }
          },
          formatV2Number(average)
        ),
        React.createElement(
          'span',
          {
            className: 'relative -top-[1px] text-[17.6px] leading-none font-normal',
            style: { color: 'var(--tt-text-secondary)' }
          },
          'hrs'
        )
      )
    ),
    // Chart section
    React.createElement(
      'div',
      { className: 'w-full mt-2 -mx-1 relative', style: { height: '150px' } },
      React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
          preserveAspectRatio: 'xMidYMax meet',
          style: { overflow: 'visible' }
        },
        // Bars with animation
        bars.map((bar, index) =>
          React.createElement(
            'rect',
            {
              key: `bar-${index}`,
              x: bar.x,
              y: isVisible ? bar.y : chartHeight, // Start at bottom, animate to position
              width: barWidth,
              height: isVisible ? bar.height : 0, // Start with 0 height, animate to full height
              fill: bar.isToday ? sleepColor : mutedBarColor,
              rx: 6,
              ry: 6,
              style: {
                transition: 'height 0.6s ease-out, y 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`
              }
            }
          )
        ),
        // Day labels
        bars.map((bar, index) =>
          React.createElement(
            'text',
            {
              key: `label-${index}`,
              x: bar.x + barWidth / 2,
              y: chartHeight + 18,
              textAnchor: 'middle',
              fill: tertiaryText,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            bar.day
          )
        ),
        // Reference line (rendered after bars so it appears on top)
        React.createElement(
          'line',
          {
            x1: 0,
            y1: refLineY,
            x2: totalWidth,
            y2: refLineY,
            stroke: sleepColor,
            strokeWidth: 3,
            opacity: 0.85
          }
        )
      )
    )
  );
};

// Feeding Chart Component - duplicate of SleepChart design
const FeedingChart = ({ data = [], average = 0 }) => {
  // Helper to get computed CSS variable values
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '#d45d5c'; // fallback to default feed
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#d45d5c';
  };

  const feedColor = getComputedColor('--tt-feed');
  const mutedBarColor = getComputedColor('--tt-subtle-surface');
  const tertiaryText = getComputedColor('--tt-text-tertiary');
  const secondaryText = getComputedColor('--tt-text-secondary');

  // Convert date to day of week abbreviation
  const getDayAbbrev = (date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return abbrevs[day];
  };
  
  // Get today's date key for highlighting
  const todayKey = _dateKeyLocal(Date.now());
  
  // Process data: map to chart format (data should already have 7 days, oldest to newest)
  const chartData = data.map((entry, index) => {
    const volume = entry.volume || 0;
    const dayAbbrev = entry.date ? getDayAbbrev(entry.date) : '';
    const isToday = entry.key === todayKey;
    return {
      day: dayAbbrev,
      volume: volume,
      isHighlighted: isToday,
      isToday: isToday
    };
  });
  
  // Ensure we have exactly 7 days (data should already be 7, but handle edge cases)
  if (chartData.length === 0) {
    // No data: create 7 empty days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: i === 0
      });
    }
  } else if (chartData.length < 7) {
    // Pad missing days with zeros (shouldn't happen, but handle gracefully)
    const now = new Date();
    while (chartData.length < 7) {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - chartData.length - 1));
      chartData.push({
        day: getDayAbbrev(d),
        volume: 0,
        isHighlighted: false,
        isToday: chartData.length === 6 // Last one added is today
      });
    }
  }
  
  // Calculate max volume for scaling (include average in max calculation)
  const maxVolume = Math.max(
    ...chartData.map(d => d.volume),
    average,
    1 // Minimum of 1 to avoid division by zero
  );
  
  const chartHeight = 130; // Increased from 100 to make bars taller
  const barWidth = 32;
  const barGap = 16; // gap between bars
  const chartWidth = barWidth + barGap; // per bar area
  const totalWidth = (chartData.length - 1) * chartWidth + barWidth;
  
  // Calculate bar heights and positions
  const bars = chartData.map((entry, index) => {
    const x = index * chartWidth;
    const height = (entry.volume / maxVolume) * chartHeight;
    const y = chartHeight - height;
    return { ...entry, x, y, height };
  });
  
  // Reference line position (average intake)
  const refLineY = chartHeight - (average / maxVolume) * chartHeight;
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = React.useRef(null);
  
  // Intersection Observer to detect when card scrolls into view
  useEffect(() => {
    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: animate immediately if IntersectionObserver not available
      setIsVisible(true);
      return;
    }
    
    const element = chartRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);
  
  return React.createElement(
    'div',
    { 
      className: 'flex flex-col h-full justify-between',
      ref: chartRef
    },
    // Average Intake section
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
        React.createElement(
          'span',
          {
            className: 'text-xs font-medium tracking-wider mb-1',
            style: { color: tertiaryText }
          },
          'Average intake'
        ),
        React.createElement(
          'div',
          { className: 'flex items-baseline gap-1' },
        React.createElement(
          'span',
          {
            className: 'text-[39.6px] font-bold leading-none',
            style: { color: feedColor }
          },
          formatV2Number(average)
        ),
        React.createElement(
          'span',
          {
            className: 'relative -top-[1px] text-[17.6px] leading-none font-normal',
            style: { color: 'var(--tt-text-secondary)' }
          },
          'oz'
        )
      )
    ),
    // Chart section
    React.createElement(
      'div',
      { className: 'w-full mt-2 -mx-1 relative', style: { height: '150px' } },
      React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
          preserveAspectRatio: 'xMidYMax meet',
          style: { overflow: 'visible' }
        },
        // Bars with animation
        bars.map((bar, index) =>
          React.createElement(
            'rect',
            {
              key: `bar-${index}`,
              x: bar.x,
              y: isVisible ? bar.y : chartHeight, // Start at bottom, animate to position
              width: barWidth,
              height: isVisible ? bar.height : 0, // Start with 0 height, animate to full height
              fill: bar.isToday ? feedColor : mutedBarColor,
              rx: 6,
              ry: 6,
              style: {
                transition: 'height 0.6s ease-out, y 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`
              }
            }
          )
        ),
        // Day labels
        bars.map((bar, index) =>
          React.createElement(
            'text',
            {
              key: `label-${index}`,
              x: bar.x + barWidth / 2,
              y: chartHeight + 18,
              textAnchor: 'middle',
              fill: tertiaryText,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            bar.day
          )
        ),
        // Reference line (rendered after bars so it appears on top)
        React.createElement(
          'line',
          {
            x1: 0,
            y1: refLineY,
            x2: totalWidth,
            y2: refLineY,
            stroke: feedColor,
            strokeWidth: 3,
            opacity: 0.85
          }
        )
      )
    )
  );
};

const HighlightCard = ({ icon: Icon, label, insightText, categoryColor, onClick, children, isFeeding = false }) => {
  return React.createElement(
    'div',
    {
      className: 'rounded-2xl shadow-sm p-6 cursor-pointer',
      style: { backgroundColor: 'var(--tt-card-bg)' },
      onClick: onClick
    },
    // Header: icon + label left, chevron right
      React.createElement(
        'div',
        { className: 'flex items-center justify-between mb-3 h-6' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-1' },
          React.createElement(Icon, {
            className: 'w-5 h-5',
            style: { 
              color: categoryColor,
              strokeWidth: isFeeding ? '1.5' : undefined,
              fill: isFeeding ? 'none' : categoryColor,
              transform: isFeeding ? 'rotate(20deg)' : undefined
            }
          }),
          React.createElement(
            'span',
            {
              className: 'text-[17.6px] font-semibold leading-6',
              style: { color: categoryColor }
            },
            label
          )
        ),
      React.createElement(window.TT?.shared?.icons?.ChevronRightIcon || ChevronRight, { 
        className: 'w-5 h-5',
        style: { color: 'var(--tt-text-tertiary)' }
      })
    ),
    // Insight Text: single block, bold, clamped to 2 lines
    React.createElement(
      'div',
      { className: 'mb-3' },
      React.createElement(
        'div',
        { 
          className: 'text-base font-bold leading-tight insight-text-clamp',
          style: { color: 'var(--tt-text-primary)' }
        },
        insightText.join(' ')
      )
    ),
    // Divider
    React.createElement('div', { 
      className: 'border-t mb-3',
      style: { borderColor: 'var(--tt-card-border)' }
    }),
    // Mini Viz Area: fixed height (240px). Any clipping/scroll pinning is handled
    // by HighlightMiniVizViewport (used only by highlight mini-viz).
    React.createElement(
      'div',
      { style: { height: '240px' } },
      children
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.TrackerTab = TrackerTab;
// Helper: is there already a sleep event near a given time?
const hasNearbySleep = (events, t, windowMin = 45) => {
  const tMs = t.getTime();
  const wMs = windowMin * 60 * 1000;
  return (events || []).some(e =>
    e?.type === 'sleep' &&
    e?.time instanceof Date &&
    Math.abs(e.time.getTime() - tMs) <= wMs
  );
};
