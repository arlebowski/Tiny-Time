// ========================================
// FIREBASE CONFIG
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyBUscvx-JB3lNWKVu9bPnYTBHVPvrndc_w",
  authDomain: "baby-feeding-tracker-978e6.firebaseapp.com",
  databaseURL: "https://baby-feeding-tracker-978e6-default-rtdb.firebaseio.com",
  projectId: "baby-feeding-tracker-978e6",
  storageBucket: "baby-feeding-tracker-978e6.firebasestorage.app",
  messagingSenderId: "775043948126",
  appId: "1:775043948126:web:28d8aefeea99cc7d25decf"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Storage wrapper to use Firebase
const storage = {
  get: async (key) => {
    try {
      const snapshot = await database.ref(key).once('value');
      if (snapshot.exists()) {
        return { value: snapshot.val() };
      }
      throw new Error('Key not found');
    } catch (error) {
      throw error;
    }
  },
  
  set: async (key, value) => {
    try {
      await database.ref(key).set(value);
      return { key, value };
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      return null;
    }
  },
  
  delete: async (key) => {
    try {
      await database.ref(key).remove();
      return { deleted: true };
    } catch (error) {
      console.error('Error deleting from Firebase:', error);
      return null;
    }
  },
  
  list: async (prefix) => {
    try {
      const snapshot = await database.ref().once('value');
      const data = snapshot.val();
      if (!data) return { keys: [] };
      
      const keys = Object.keys(data).filter(key => 
        prefix ? key.startsWith(prefix) : true
      );
      return { keys };
    } catch (error) {
      console.error('Error listing keys:', error);
      return { keys: [] };
    }
  }
};

// Make storage available globally
window.storage = storage;

// ========================================
// REACT APP
// ========================================
const { useState, useEffect } = React;

const BabyFeedingTracker = () => {
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [ounces, setOunces] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [feedings, setFeedings] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [isEditingMultiplier, setIsEditingMultiplier] = useState(false);
  const [editingFeedingId, setEditingFeedingId] = useState(null);
  const [editOunces, setEditOunces] = useState('');
  const [editTime, setEditTime] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempMultiplier, setTempMultiplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadFeedingsForDate(currentDate);
    }
  }, [currentDate]);

  const loadData = async () => {
    try {
      const weightResult = await storage.get('baby_weight');
      if (weightResult) {
        setBabyWeight(parseFloat(weightResult.value));
      }

      const multiplierResult = await storage.get('oz_multiplier');
      if (multiplierResult) {
        setMultiplier(parseFloat(multiplierResult.value));
      }

      await loadFeedingsForDate(new Date());
    } catch (error) {
      console.log('No existing data found, starting fresh');
    } finally {
      setLoading(false);
    }
  };

  const loadFeedingsForDate = async (date, retries = 3) => {
      try {
        const dateString = date.toDateString();
        const feedingsResult = await storage.get(`feedings_${dateString}`);
        if (feedingsResult) {
          const loadedFeedings = JSON.parse(feedingsResult.value);
          loadedFeedings.sort((a, b) => b.timestamp - a.timestamp);
          setFeedings(loadedFeedings);
        } else {
          setFeedings([]);
        }
      } catch (error) {
        if (retries > 0) {
          // Retry after 500ms
          setTimeout(() => loadFeedingsForDate(date, retries - 1), 500);
        } else {
          setFeedings([]);
        }
      }
    };

  const loadAllFeedings = async () => {
    try {
      const result = await storage.list('feedings_');
      const allFeedings = [];
      
      for (const key of result.keys) {
        const feedingsResult = await storage.get(key);
        if (feedingsResult) {
          const dayFeedings = JSON.parse(feedingsResult.value);
          allFeedings.push(...dayFeedings);
        }
      }
      return allFeedings.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error loading all feedings:', error);
      return [];
    }
  };

  const saveWeight = async (weight) => {
    try {
      await storage.set('baby_weight', weight.toString());
    } catch (error) {
      console.error('Error saving weight:', error);
    }
  };

  const saveMultiplier = async (mult) => {
    try {
      await storage.set('oz_multiplier', mult.toString());
    } catch (error) {
      console.error('Error saving multiplier:', error);
    }
  };

  const saveFeedings = async (feedingsList, date) => {
    try {
      const dateString = date.toDateString();
      await storage.set(`feedings_${dateString}`, JSON.stringify(feedingsList));
    } catch (error) {
      console.error('Error saving feedings:', error);
    }
  };

  const handleWeightSave = () => {
    const weight = parseFloat(tempWeight);
    if (weight && weight > 0) {
      setBabyWeight(weight);
      saveWeight(weight);
      setIsEditingWeight(false);
      setTempWeight('');
    }
  };

  const handleMultiplierSave = () => {
    const mult = parseFloat(tempMultiplier);
    if (mult && mult > 0) {
      setMultiplier(mult);
      saveMultiplier(mult);
      setIsEditingMultiplier(false);
      setTempMultiplier('');
    }
  };

  const timeStringToDate = (timeString, baseDate) => {
    const date = new Date(baseDate);
    
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':').map(s => parseInt(s.trim()));
      if (!isNaN(hours) && !isNaN(minutes)) {
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    }
    
    return null;
  };

  const handleAddFeeding = () => {
    const oz = parseFloat(ounces);
    if (oz && oz > 0) {
      let feedingDate;
      
      if (customTime && showCustomTime) {
        feedingDate = timeStringToDate(customTime, currentDate);
        if (!feedingDate) {
          alert('Please enter time in format HH:MM (e.g., 14:30 or 2:30)');
          return;
        }
      } else {
        feedingDate = new Date();
      }
      
      const newFeeding = {
        id: Date.now(),
        ounces: oz,
        time: feedingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        timestamp: feedingDate.getTime()
      };
      
      const updatedFeedings = [newFeeding, ...feedings];
      updatedFeedings.sort((a, b) => b.timestamp - a.timestamp);
      setFeedings(updatedFeedings);
      saveFeedings(updatedFeedings, currentDate);
      setOunces('');
      setCustomTime('');
      setShowCustomTime(false);
    }
  };

  const handleStartEdit = (feeding) => {
    setEditingFeedingId(feeding.id);
    setEditOunces(feeding.ounces.toString());
    const date = new Date(feeding.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    setEditTime(`${hours}:${minutes}`);
  };

  const handleSaveEdit = () => {
    const oz = parseFloat(editOunces);
    if (!oz || oz <= 0) return;

    const feedingDate = timeStringToDate(editTime, currentDate);
    if (!feedingDate) {
      alert('Please enter time in format HH:MM (e.g., 14:30 or 2:30)');
      return;
    }

    const updatedFeedings = feedings.map(f => 
      f.id === editingFeedingId 
        ? {
            ...f,
            ounces: oz,
            time: feedingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            timestamp: feedingDate.getTime()
          }
        : f
    );
    
    updatedFeedings.sort((a, b) => b.timestamp - a.timestamp);
    setFeedings(updatedFeedings);
    saveFeedings(updatedFeedings, currentDate);
    setEditingFeedingId(null);
    setEditOunces('');
    setEditTime('');
  };

  const handleCancelEdit = () => {
    setEditingFeedingId(null);
    setEditOunces('');
    setEditTime('');
  };

  const handleDeleteFeeding = (id) => {
    const updatedFeedings = feedings.filter(f => f.id !== id);
    setFeedings(updatedFeedings);
    saveFeedings(updatedFeedings, currentDate);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);
    
    if (current < today) {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const totalConsumed = feedings.reduce((sum, f) => sum + f.ounces, 0);
  const targetOunces = babyWeight ? babyWeight * multiplier : 0;
  const remaining = targetOunces - totalConsumed;
  const percentComplete = targetOunces > 0 ? (totalConsumed / targetOunces) * 100 : 0;

  if (loading) {
    return React.createElement('div', { 
      className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" 
    }, 
      React.createElement('div', { className: "text-indigo-600" }, 'Loading...')
    );
  }

  if (!babyWeight) {
    return React.createElement('div', { 
      className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" 
    }, 
      React.createElement('div', { className: "bg-white rounded-2xl shadow-xl p-8 max-w-md w-full" },
        React.createElement('div', { className: "flex justify-center mb-6" },
          React.createElement('div', { className: "bg-indigo-100 rounded-full p-4" },
            React.createElement(Baby, { className: "w-12 h-12 text-indigo-600" })
          )
        ),
        React.createElement('h1', { className: "text-2xl font-bold text-gray-800 text-center mb-2" }, 'Welcome to Tiny Tracker!'),
        React.createElement('p', { className: "text-gray-600 text-center mb-6" }, "Let's start by entering your baby's current weight"),
        React.createElement('input', {
          type: "number",
          step: "0.1",
          placeholder: "Weight in pounds",
          value: tempWeight,
          onChange: (e) => setTempWeight(e.target.value),
          onKeyPress: (e) => e.key === 'Enter' && handleWeightSave(),
          className: "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 mb-4"
        }),
        React.createElement('button', {
          onClick: handleWeightSave,
          className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
        }, 'Get Started')
      )
    );
  }

  return React.createElement('div', { 
    className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-8" 
  },
    React.createElement('div', { className: "max-w-2xl mx-auto" },
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-2 mb-4 flex gap-2" },
        React.createElement('button', {
          onClick: () => setActiveTab('tracker'),
          className: `flex-1 py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 'tracker' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }, 'Tracker'),
        React.createElement('button', {
          onClick: () => setActiveTab('analytics'),
          className: `flex-1 py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 'analytics' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }, 'Analytics')
      ),

      activeTab === 'tracker' && React.createElement(React.Fragment, null,
        // New header at top
        React.createElement('div', { className: "bg-white shadow-sm p-4 mb-4" },
          React.createElement('div', { className: "flex items-center justify-center gap-2" },
            React.createElement('div', { className: "bg-indigo-100 rounded-full p-2" },
              React.createElement(Baby, { className: "w-6 h-6 text-indigo-600" })
            ),
            React.createElement('h1', { className: "text-xl font-bold text-gray-800" }, 'Tiny Tracker')
          )
        ),
        
        // Moved tabs here (find the tab navigation section and move it here)
        
        // Today section with gear icon
        React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 mb-4" },
          React.createElement('div', { className: "flex items-center justify-end mb-4" },
            React.createElement('button', {
              onClick: () => setShowSettings(!showSettings),
              className: "text-gray-400 hover:text-indigo-600 transition"
            }, React.createElement(Settings, { className: "w-6 h-6" }))
          ),
          
          showSettings && React.createElement('div', { className: "mb-4 p-4 bg-gray-50 rounded-xl space-y-3" },
            React.createElement('div', { className: "flex items-center justify-between" },
              React.createElement('span', { className: "text-sm font-medium text-gray-700" }, "Baby's Weight"),
              !isEditingWeight ? 
                React.createElement('button', {
                  onClick: () => {
                    setIsEditingWeight(true);
                    setTempWeight(babyWeight.toString());
                  },
                  className: "flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                },
                  `${babyWeight} lbs`,
                  React.createElement(Edit2, { className: "w-4 h-4" })
                )
              :
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    type: "number",
                    step: "0.1",
                    value: tempWeight,
                    onChange: (e) => setTempWeight(e.target.value),
                    className: "w-20 px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  }),
                  React.createElement('button', { 
                    onClick: handleWeightSave, 
                    className: "text-green-600 hover:text-green-700" 
                  }, React.createElement(Check, { className: "w-5 h-5" })),
                  React.createElement('button', { 
                    onClick: () => setIsEditingWeight(false), 
                    className: "text-gray-400 hover:text-gray-600" 
                  }, React.createElement(X, { className: "w-5 h-5" }))
                )
            ),
            
            React.createElement('div', { className: "flex items-center justify-between" },
              React.createElement('span', { className: "text-sm font-medium text-gray-700" }, "Target Multiplier (oz/lb)"),
              !isEditingMultiplier ?
                React.createElement('button', {
                  onClick: () => {
                    setIsEditingMultiplier(true);
                    setTempMultiplier(multiplier.toString());
                  },
                  className: "flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                },
                  `${multiplier}x`,
                  React.createElement(Edit2, { className: "w-4 h-4" })
                )
              :
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    type: "number",
                    step: "0.1",
                    value: tempMultiplier,
                    onChange: (e) => setTempMultiplier(e.target.value),
                    className: "w-20 px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  }),
                  React.createElement('button', { 
                    onClick: handleMultiplierSave, 
                    className: "text-green-600 hover:text-green-700" 
                  }, React.createElement(Check, { className: "w-5 h-5" })),
                  React.createElement('button', { 
                    onClick: () => setIsEditingMultiplier(false), 
                    className: "text-gray-400 hover:text-gray-600" 
                  }, React.createElement(X, { className: "w-5 h-5" }))
                )
            )
          ),
          
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
          
          React.createElement('div', { className: "grid grid-cols-3 gap-4 mb-4" },
            React.createElement('div', { className: "text-center" },
              React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, 
                totalConsumed.toFixed(1),
                React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'oz')
              ),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'Consumed')
            ),
            React.createElement('div', { className: "text-center" },
              React.createElement('div', { className: "text-2xl font-bold text-gray-800" }, 
                targetOunces.toFixed(1),
                React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'oz')
              ),
              React.createElement('div', { className: "text-xs text-gray-500" }, 'Target')
            ),
            React.createElement('div', { className: "text-center" },
              React.createElement('div', { 
                className: `text-2xl font-bold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}` 
              }, 
                Math.abs(remaining).toFixed(1),
                React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'oz')
              ),
              React.createElement('div', { className: "text-xs text-gray-500" }, remaining > 0 ? 'Remaining' : 'Over')
            )
          ),
          
          React.createElement('div', { className: "w-full bg-gray-200 rounded-full h-3 overflow-hidden" },
            React.createElement('div', {
              className: `h-full transition-all duration-500 ${percentComplete >= 100 ? 'bg-green-500' : 'bg-indigo-600'}`,
              style: { width: `${Math.min(percentComplete, 100)}%` }
            })
          ),
          React.createElement('div', { className: "text-right text-xs text-gray-500 mt-1" }, `${percentComplete.toFixed(0)}%`)
        ),
        
        React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 mb-4" },
          React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Log Feeding'),
          React.createElement('div', { className: "space-y-3" },
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('input', {
                type: "number",
                step: "0.25",
                placeholder: "Ounces",
                value: ounces,
                onChange: (e) => setOunces(e.target.value),
                onKeyPress: (e) => e.key === 'Enter' && !showCustomTime && handleAddFeeding(),
                className: "flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
              }),
              React.createElement('button', {
                onClick: () => setShowCustomTime(!showCustomTime),
                className: `px-4 py-3 rounded-xl transition ${showCustomTime ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
              }, React.createElement(Clock, { className: "w-5 h-5" }))
            ),
            
            showCustomTime && React.createElement('input', {
              type: "time",
              value: customTime,
              onChange: (e) => setCustomTime(e.target.value),
              className: "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
            }),
            
            React.createElement('button', {
              onClick: handleAddFeeding,
              className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            },
              React.createElement(Plus, { className: "w-5 h-5" }),
              'Add Feeding'
            )
          )
        ),
        
        React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
          React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Feedings'),
          feedings.length === 0 ?
            React.createElement('p', { className: "text-gray-400 text-center py-8" }, 'No feedings logged for this day')
          :
            React.createElement('div', { className: "space-y-3" },
              feedings.map((feeding) =>
                React.createElement('div', { key: feeding.id },
                  editingFeedingId === feeding.id ?
                    React.createElement('div', { className: "p-4 bg-indigo-50 rounded-xl space-y-3" },
                      React.createElement('div', { className: "flex gap-2" },
                        React.createElement('input', {
                          type: "number",
                          step: "0.25",
                          value: editOunces,
                          onChange: (e) => setEditOunces(e.target.value),
                          placeholder: "Ounces",
                          className: "flex-1 px-3 py-2 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                        }),
                        React.createElement('input', {
                          type: "time",
                          value: editTime,
                          onChange: (e) => setEditTime(e.target.value),
                          className: "flex-1 px-3 py-2 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                        })
                      ),
                      React.createElement('div', { className: "flex gap-2" },
                        React.createElement('button', {
                          onClick: handleSaveEdit,
                          className: "flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                        },
                          React.createElement(Check, { className: "w-4 h-4" }),
                          'Save'
                        ),
                        React.createElement('button', {
                          onClick: handleCancelEdit,
                          className: "flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition flex items-center justify-center gap-2"
                        },
                          React.createElement(X, { className: "w-4 h-4" }),
                          'Cancel'
                        )
                      )
                    )
                  :
                    React.createElement('div', { className: "flex justify-between items-center p-4 bg-gray-50 rounded-xl" },
                      React.createElement('div', { className: "flex items-center gap-3" },
                        React.createElement('div', { className: "bg-indigo-100 rounded-full p-2" },
                          React.createElement('span', { className: "text-xl" }, '🍼')
                        ),
                        React.createElement('div', {},
                          React.createElement('div', { className: "font-semibold text-gray-800" }, `${feeding.ounces} oz`),
                          React.createElement('div', { className: "text-sm text-gray-500" }, feeding.time)
                        )
                      ),
                      React.createElement('div', { className: "flex gap-2" },
                        React.createElement('button', {
                          onClick: () => handleStartEdit(feeding),
                          className: "text-indigo-600 hover:text-indigo-700 transition"
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
      ),

      activeTab === 'analytics' && React.createElement(AnalyticsTab, { 
        loadAllFeedings: loadAllFeedings 
      })
    )
  );
};

const AnalyticsTab = ({ loadAllFeedings }) => {
  const [allFeedings, setAllFeedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('day'); // 'day', 'week', 'month'
  const [stats, setStats] = useState({
    avgVolume3Days: 0,
    avgInterval3Days: 0,
    longestInterval3Days: 0,
    chartData: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    const feedings = await loadAllFeedings();
    setAllFeedings(feedings);
    calculateStats(feedings);
    setLoading(false);
  };

  const calculateStats = (feedings) => {
    if (feedings.length === 0) {
      setStats({ avgVolume3Days: 0, avgInterval3Days: 0, longestInterval3Days: 0, chartData: [] });
      return;
    }

    const now = Date.now();
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
    const last3DaysFeedings = feedings.filter(f => f.timestamp >= threeDaysAgo);

    // Average volume
    const totalVolume = last3DaysFeedings.reduce((sum, f) => sum + f.ounces, 0);
    const avgVolume = last3DaysFeedings.length > 0 ? totalVolume / last3DaysFeedings.length : 0;

    // Average and longest interval
    let totalIntervalMinutes = 0;
    let longestIntervalMinutes = 0;
    for (let i = 1; i < last3DaysFeedings.length; i++) {
      const interval = last3DaysFeedings[i].timestamp - last3DaysFeedings[i - 1].timestamp;
      const intervalMinutes = interval / (1000 * 60);
      totalIntervalMinutes += intervalMinutes;
      if (intervalMinutes > longestIntervalMinutes) {
        longestIntervalMinutes = intervalMinutes;
      }
    }
    const avgIntervalMinutes = last3DaysFeedings.length > 1 
      ? totalIntervalMinutes / (last3DaysFeedings.length - 1) 
      : 0;

    // Chart data based on time range
    const chartData = generateChartData(feedings, timeRange);

    setStats({
      avgVolume3Days: avgVolume,
      avgInterval3Days: avgIntervalMinutes,
      longestInterval3Days: longestIntervalMinutes,
      chartData: chartData
    });
  };

  const generateChartData = (feedings, range) => {
    const grouped = {};
    
    feedings.forEach(f => {
      const date = new Date(f.timestamp);
      let key;
      
      if (range === 'day') {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (range === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else { // month
        key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: key, volume: 0, count: 0 };
      }
      grouped[key].volume += f.ounces;
      grouped[key].count += 1;
    });

    return Object.values(grouped).map(item => ({
      date: item.date,
      volume: parseFloat(item.volume.toFixed(1)),
      count: item.count
    }));
  };

  const formatInterval = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "text-center text-gray-600" }, 'Loading analytics...')
    );
  }

  if (allFeedings.length === 0) {
    return React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "text-center text-gray-400 py-8" }, 'No feeding data yet. Start logging feedings to see analytics!')
    );
  }

  return React.createElement('div', { className: "space-y-4" },
    // Stats Cards 
    React.createElement('div', { className: "grid grid-cols-2 gap-4 auto-rows-fr" },
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-4" },
        React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, '3-Day Avg Volume'),
        React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, `${stats.avgVolume3Days.toFixed(1)}`),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, 'oz/feed')
      ),
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-4" },
        React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, '3-Day Avg Interval'),
        React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, formatInterval(stats.avgInterval3Days)),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, 'Between feeds')
      ),
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-4 col-span-2" },
        React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, 'Longest Interval'),
        React.createElement('div', { className: "text-2xl font-bold text-orange-600" }, formatInterval(stats.longestInterval3Days)),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, 'Last 3 days')
      )
    ),

    // Chart with toggle
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Volume History'),
        React.createElement('div', { className: "flex gap-1 bg-gray-100 rounded-lg p-1" },
          React.createElement('button', {
            onClick: () => setTimeRange('day'),
            className: `px-3 py-1 rounded text-sm font-medium transition ${timeRange === 'day' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`
          }, 'Day'),
          React.createElement('button', {
            onClick: () => setTimeRange('week'),
            className: `px-3 py-1 rounded text-sm font-medium transition ${timeRange === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`
          }, 'Week'),
          React.createElement('button', {
            onClick: () => setTimeRange('month'),
            className: `px-3 py-1 rounded text-sm font-medium transition ${timeRange === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`
          }, 'Month')
        ),
      stats.chartData.length > 0 ?
        React.createElement('div', { className: "space-y-2" },
          stats.chartData.map(item => 
            React.createElement('div', { key: item.date, className: "flex items-center gap-3" },
              React.createElement('div', { className: "text-sm text-gray-600 w-20" }, item.date),
              React.createElement('div', { className: "flex-1 bg-gray-200 rounded-full h-8 overflow-hidden relative" },
                React.createElement('div', {
                  className: "bg-indigo-600 h-full transition-all duration-500 flex items-center justify-end pr-3",
                  style: { width: `${Math.min((item.volume / Math.max(...stats.chartData.map(d => d.volume))) * 100, 100)}%` }
                },
                  React.createElement('span', { className: "text-white text-sm font-semibold" }, `${item.volume} oz`)
                )
              ),
              React.createElement('div', { className: "text-xs text-gray-500 w-16 text-right" }, `${item.count} feeds`)
            )
          )
        )
      :
        React.createElement('div', { className: "text-center text-gray-400 py-8" }, 'No data to display')
  )
};

const Baby = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, 
  React.createElement('path', { d: "M9 12h.01" }), 
  React.createElement('path', { d: "M15 12h.01" }), 
  React.createElement('path', { d: "M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" }), 
  React.createElement('path', { d: "M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" })
);

const TrendingUp = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('polyline', { points: "22 7 13.5 15.5 8.5 10.5 2 17" }),
  React.createElement('polyline', { points: "16 7 22 7 22 13" })
);

const Edit2 = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
);

const Check = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M20 6 9 17l-5-5" })
);

const X = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M18 6 6 18" }),
  React.createElement('path', { d: "m6 6 12 12" })
);

const ChevronLeft = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m15 18-6-6 6-6" })
);

const ChevronRight = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m9 18 6-6-6-6" })
);

const Settings = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
  React.createElement('circle', { cx: "12", cy: "12", r: "3" })
);

const Clock = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
  React.createElement('polyline', { points: "12 6 12 12 16 14" })
);

const Plus = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M5 12h14" }),
  React.createElement('path', { d: "M12 5v14" })
);

ReactDOM.render(React.createElement(BabyFeedingTracker), document.getElementById('root'));
