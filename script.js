// ========================================
// PART 1: FIREBASE CONFIG AND AUTH
// ========================================
// This file contains: Firebase initialization, auth functions, data migration, and invite system

const firebaseConfig = {
  apiKey: "AIzaSyBUscvx-JB3lNWKVu9bPnYTBHVPvrndc_w",
  authDomain: "baby-feeding-tracker-978e6.firebaseapp.com",
  databaseURL: "https://baby-feeding-tracker-978e6-default-rtdb.firebaseio.com",
  projectId: "baby-feeding-tracker-978e6",
  storageBucket: "baby-feeding-tracker-978e6.firebasestorage.app",
  messagingSenderId: "775043948126",
  appId: "1:775043948126:web:28d8aefeea99cc7d25decf"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

// ========================================
// AUTH & USER MANAGEMENT
// ========================================

const getUserKidId = async (userId) => {
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists && userDoc.data().kidId) {
    return userDoc.data().kidId;
  }
  
  const kidsSnapshot = await db.collection('kids')
    .where('members', 'array-contains', userId)
    .limit(1)
    .get();
  
  if (!kidsSnapshot.empty) {
    const kidId = kidsSnapshot.docs[0].id;
    await db.collection('users').doc(userId).set({ kidId }, { merge: true });
    return kidId;
  }
  
  const kidRef = await db.collection('kids').add({
    ownerId: userId,
    members: [userId],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  await db.collection('users').doc(userId).set({
    kidId: kidRef.id,
    email: auth.currentUser.email,
    displayName: auth.currentUser.displayName,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  return kidRef.id;
};

const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  return await auth.signInWithPopup(provider);
};

const signOut = async () => {
  await auth.signOut();
};

// ========================================
// DATA MIGRATION FROM LOCALSTORAGE
// ========================================

const migrateLocalStorageData = async (kidId) => {
  let migratedCount = 0;
  
  const weight = localStorage.getItem('baby_weight');
  const multiplier = localStorage.getItem('oz_multiplier');
  
  if (weight || multiplier) {
    await db.collection('kids').doc(kidId).collection('settings').doc('default').set({
      babyWeight: weight ? parseFloat(weight) : null,
      multiplier: multiplier ? parseFloat(multiplier) : 2.5
    }, { merge: true });
  }
  
  const snapshot = await rtdb.ref().once('value');
  const data = snapshot.val();
  
  if (data) {
    const feedingKeys = Object.keys(data).filter(key => key.startsWith('feedings_'));
    
    for (const key of feedingKeys) {
      const dayFeedings = JSON.parse(data[key]);
      for (const feeding of dayFeedings) {
        await db.collection('kids').doc(kidId).collection('feedings').add({
          ounces: feeding.ounces,
          timestamp: feeding.timestamp,
          time: feeding.time,
          addedBy: auth.currentUser.uid
        });
        migratedCount++;
      }
    }
  }
  
  localStorage.clear();
  return migratedCount;
};

// ========================================
// INVITE SYSTEM
// ========================================

const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

const createInvite = async (kidId) => {
  const inviteCode = generateInviteCode();
  await db.collection('invites').doc(inviteCode).set({
    kidId,
    createdBy: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    used: false
  });
  return inviteCode;
};

const acceptInvite = async (inviteCode, userId) => {
  const inviteDoc = await db.collection('invites').doc(inviteCode).get();
  if (!inviteDoc.exists) throw new Error('Invalid invite code');
  
  const invite = inviteDoc.data();
  if (invite.used) throw new Error('Invite already used');
  
  await db.collection('kids').doc(invite.kidId).update({
    members: firebase.firestore.FieldValue.arrayUnion(userId)
  });
  
  await db.collection('users').doc(userId).set({
    kidId: invite.kidId,
    email: auth.currentUser.email,
    displayName: auth.currentUser.displayName
  }, { merge: true });
  
  await db.collection('invites').doc(inviteCode).update({
    used: true,
    usedBy: userId,
    usedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return invite.kidId;
};

const removeMember = async (kidId, userId) => {
  await db.collection('kids').doc(kidId).update({
    members: firebase.firestore.FieldValue.arrayRemove(userId)
  });
  await db.collection('users').doc(userId).update({
    kidId: firebase.firestore.FieldValue.delete()
  });
};

// ========================================
// FIRESTORE DATA LAYER
// ========================================

const firestoreStorage = {
  kidId: null,
  
  async initialize(kidId) {
    this.kidId = kidId;
  },
  
  async getSettings() {
    if (!this.kidId) return null;
    const doc = await db.collection('kids').doc(this.kidId).collection('settings').doc('default').get();
    return doc.exists ? doc.data() : null;
  },
  
  async setSettings(settings) {
    if (!this.kidId) return;
    await db.collection('kids').doc(this.kidId).collection('settings').doc('default').set(settings, { merge: true });
  },
  
  async getFeedingsForDate(date) {
    if (!this.kidId) return [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const snapshot = await db.collection('kids').doc(this.kidId).collection('feedings')
      .where('timestamp', '>=', startOfDay.getTime())
      .where('timestamp', '<=', endOfDay.getTime())
      .orderBy('timestamp', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async getAllFeedings() {
    if (!this.kidId) return [];
    const snapshot = await db.collection('kids').doc(this.kidId).collection('feedings')
      .orderBy('timestamp', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async addFeeding(feeding) {
    if (!this.kidId) return null;
    const docRef = await db.collection('kids').doc(this.kidId).collection('feedings').add({
      ...feeding,
      addedBy: auth.currentUser.uid,
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  },
  
  async updateFeeding(feedingId, updates) {
    if (!this.kidId) return;
    await db.collection('kids').doc(this.kidId).collection('feedings').doc(feedingId).update(updates);
  },
  
  async deleteFeeding(feedingId) {
    if (!this.kidId) return;
    await db.collection('kids').doc(this.kidId).collection('feedings').doc(feedingId).delete();
  },
  
  subscribeToFeedings(date, callback) {
    if (!this.kidId) return () => {};
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return db.collection('kids').doc(this.kidId).collection('feedings')
      .where('timestamp', '>=', startOfDay.getTime())
      .where('timestamp', '<=', endOfDay.getTime())
      .orderBy('timestamp', 'desc')
      .onSnapshot(snapshot => {
        const feedings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(feedings);
      });
  }
};

// ========================================
// PART 2: REACT COMPONENTS
// ========================================
// This file contains: App wrapper, Login Screen, Main Tracker Component

const { useState, useEffect } = React;

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kidId, setKidId] = useState(null);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        
        try {
          let userKidId;
          if (inviteCode) {
            userKidId = await acceptInvite(inviteCode, user.uid);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            userKidId = await getUserKidId(user.uid);
            const hasLocalData = localStorage.getItem('baby_weight') || 
                                 await rtdb.ref().once('value').then(s => s.exists());
            if (hasLocalData) {
              await migrateLocalStorageData(userKidId);
            }
          }
          setKidId(userKidId);
          await firestoreStorage.initialize(userKidId);
        } catch (error) {
          console.error('Setup error:', error);
        }
      } else {
        setUser(null);
        setKidId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  if (loading) {
    return React.createElement('div', { 
      className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" 
    },
      React.createElement('div', { className: "text-center" },
        React.createElement('div', { className: "text-2xl font-bold text-gray-800 mb-2" }, '🍼'),
        React.createElement('div', { className: "text-gray-600" }, 'Loading...')
      )
    );
  }
  
  if (!user) {
    return React.createElement(LoginScreen);
  }
  
  return React.createElement(BabyFeedingTracker, { user, kidId });
};

// ========================================
// LOGIN SCREEN
// ========================================

const LoginScreen = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      setError(error.message);
      setSigningIn(false);
    }
  };
  
  return React.createElement('div', {
    className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
  },
    React.createElement('div', {
      className: "bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
    },
      React.createElement('div', { className: "text-center mb-8" },
        React.createElement('div', { className: "flex items-center justify-center gap-3 mb-4" },
          React.createElement('div', { className: "bg-indigo-100 rounded-full p-3" },
            React.createElement('span', { className: "text-4xl" }, '🍼')
          )
        ),
        React.createElement('h1', { 
          className: "text-3xl font-bold text-gray-800 handwriting mb-2" 
        }, 'Tiny Tracker'),
        React.createElement('p', { 
          className: "text-gray-600" 
        }, 'Track your baby\'s feeding journey')
      ),
      
      React.createElement('button', {
        onClick: handleSignIn,
        disabled: signingIn,
        className: "w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
      },
        React.createElement('svg', { 
          width: "20", height: "20", viewBox: "0 0 24 24" 
        },
          React.createElement('path', {
            fill: "#4285F4",
            d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          }),
          React.createElement('path', {
            fill: "#34A853",
            d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          }),
          React.createElement('path', {
            fill: "#FBBC05",
            d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          }),
          React.createElement('path', {
            fill: "#EA4335",
            d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          })
        ),
        signingIn ? 'Signing in...' : 'Sign in with Google'
      ),
      
      error && React.createElement('div', {
        className: "mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
      }, error),
      
      React.createElement('p', {
        className: "text-center text-xs text-gray-500 mt-6"
      }, 'Track feedings, invite your partner, and analyze patterns')
    )
  );
};

// ========================================
// PART 3: MAIN TRACKER COMPONENT
// ========================================
// This file contains: BabyFeedingTracker component with all feeding logic

const BabyFeedingTracker = ({ user, kidId }) => {
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
    document.title = 'Tiny Tracker';
  }, []);

  useEffect(() => {
    loadData();
  }, [kidId]);

  useEffect(() => {
    if (!loading && kidId) {
      const unsubscribe = firestoreStorage.subscribeToFeedings(currentDate, (feedingsData) => {
        setFeedings(feedingsData);
      });
      return () => unsubscribe();
    }
  }, [currentDate, loading, kidId]);

  const loadData = async () => {
    if (!kidId) return;
    try {
      const settings = await firestoreStorage.getSettings();
      if (settings) {
        if (settings.babyWeight) setBabyWeight(settings.babyWeight);
        if (settings.multiplier) setMultiplier(settings.multiplier);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await firestoreStorage.setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleWeightSave = async () => {
    const weight = parseFloat(tempWeight);
    if (weight > 0) {
      setBabyWeight(weight);
      await saveSettings({ babyWeight: weight });
      setIsEditingWeight(false);
    }
  };

  const handleMultiplierSave = async () => {
    const mult = parseFloat(tempMultiplier);
    if (mult > 0) {
      setMultiplier(mult);
      await saveSettings({ multiplier: mult });
      setIsEditingMultiplier(false);
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
      await firestoreStorage.addFeeding({
        ounces: amount,
        timestamp: feedingTime.getTime(),
        time: feedingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      });
      setOunces('');
      setCustomTime('');
      setShowCustomTime(false);
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
      await firestoreStorage.updateFeeding(editingFeedingId, {
        ounces: amount,
        timestamp: feedingTime.getTime(),
        time: feedingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      });
      setEditingFeedingId(null);
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
    } catch (error) {
      console.error('Error deleting feeding:', error);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const isToday = () => {
    return currentDate.toDateString() === new Date().toDateString();
  };

  const formatDate = (date) => {
    if (isToday()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadAllFeedings = async () => {
    return await firestoreStorage.getAllFeedings();
  };

  const totalConsumed = feedings.reduce((sum, f) => sum + f.ounces, 0);
  const targetOunces = babyWeight ? babyWeight * multiplier : 0;
  const remaining = Math.max(0, targetOunces - totalConsumed);
  const percentComplete = targetOunces > 0 ? Math.min((totalConsumed / targetOunces) * 100, 100) : 0;

  if (!babyWeight) {
    return React.createElement('div', {
      className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
    },
      React.createElement('div', {
        className: "bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      },
        React.createElement('div', { className: "text-center mb-6" },
          React.createElement('div', { className: "flex items-center justify-center mb-4" },
            React.createElement('div', { className: "bg-indigo-100 rounded-full p-3" },
              React.createElement('span', { className: "text-4xl" }, '🍼')
            )
          ),
          React.createElement('h1', { className: "text-2xl font-bold text-gray-800 text-center mb-2" }, 'Welcome to Tiny Tracker!'),
          React.createElement('p', { className: "text-gray-600 text-center mb-6" }, "Let's start by entering your baby's current weight")
        ),
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
      React.createElement('div', { className: "flex items-center justify-center gap-3 mb-4" },
        React.createElement('div', { className: "bg-indigo-100 rounded-full p-2" },
          React.createElement('span', { className: "text-2xl" }, '🍼')
        ),
        React.createElement('h1', { className: "text-2xl font-bold text-gray-800 handwriting" }, 'Tiny Tracker')
      ),

      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-2 mb-4 flex gap-2" },
        React.createElement('button', {
          onClick: () => setActiveTab('tracker'),
          className: `flex-1 py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 'tracker' 
              ? 'bg-indigo-600 text-white border-2 border-yellow-400' 
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }, 'Tracker'),
        React.createElement('button', {
          onClick: () => setActiveTab('analytics'),
          className: `flex-1 py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 'analytics' 
              ? 'bg-indigo-600 text-white border-2 border-yellow-400' 
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }, 'Analytics')
      ),

      activeTab === 'tracker' && React.createElement(React.Fragment, null,
        React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 mb-4" },
          showSettings && React.createElement(SettingsPanel, {
            user,
            kidId,
            babyWeight,
            multiplier,
            isEditingWeight,
            isEditingMultiplier,
            tempWeight,
            tempMultiplier,
            setTempWeight,
            setTempMultiplier,
            setIsEditingWeight,
            setIsEditingMultiplier,
            handleWeightSave,
            handleMultiplierSave
          }),
          
          React.createElement('div', { className: "flex items-center justify-between mb-4" },
            React.createElement('button', {
              onClick: goToPreviousDay,
              className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            }, React.createElement(ChevronLeft, { className: "w-5 h-5" })),
            React.createElement('h2', { className: "text-lg font-semibold text-gray-800" }, formatDate(currentDate)),
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('button', {
                onClick: goToNextDay,
                disabled: isToday(),
                className: `p-2 rounded-lg transition ${isToday() ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`
              }, React.createElement(ChevronRight, { className: "w-5 h-5" })),
              React.createElement('button', {
                onClick: () => setShowSettings(!showSettings),
                className: "p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              }, React.createElement(Settings, { className: "w-5 h-5" }))
            )
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

// ========================================
// PART 4: SETTINGS PANEL WITH SHARING & ANALYTICS
// ========================================

const SettingsPanel = ({ 
  user, kidId, babyWeight, multiplier, 
  isEditingWeight, isEditingMultiplier, 
  tempWeight, tempMultiplier,
  setTempWeight, setTempMultiplier,
  setIsEditingWeight, setIsEditingMultiplier,
  handleWeightSave, handleMultiplierSave
}) => {
  const [kidData, setKidData] = useState(null);
  const [members, setMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    loadKidData();
  }, [kidId]);

  const loadKidData = async () => {
    if (!kidId) return;
    const kidDoc = await db.collection('kids').doc(kidId).get();
    if (kidDoc.exists) {
      const data = kidDoc.data();
      setKidData(data);
      const memberDetails = await Promise.all(
        data.members.map(async (memberId) => {
          const userDoc = await db.collection('users').doc(memberId).get();
          return {
            uid: memberId,
            ...(userDoc.exists ? userDoc.data() : { email: 'Unknown' })
          };
        })
      );
      setMembers(memberDetails);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const code = await createInvite(kidId);
      const link = `${window.location.origin}${window.location.pathname}?invite=${code}`;
      setInviteLink(link);
      setShowInvite(true);
    } catch (error) {
      console.error('Error creating invite:', error);
      alert('Failed to create invite');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this person\'s access?')) return;
    try {
      await removeMember(kidId, memberId);
      await loadKidData();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleSignOut = async () => {
    if (confirm('Sign out of Tiny Tracker?')) {
      await signOut();
    }
  };

  const isOwner = kidData && kidData.ownerId === user.uid;

  return React.createElement('div', { className: "mb-4 p-4 bg-gray-50 rounded-xl space-y-4" },
    React.createElement('div', { className: "pb-4 border-b border-gray-200" },
      React.createElement('h3', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Account'),
      React.createElement('div', { className: "flex items-center justify-between mb-2" },
        React.createElement('span', { className: "text-sm text-gray-600" }, user.email),
        React.createElement('button', {
          onClick: handleSignOut,
          className: "text-sm text-red-600 hover:text-red-700 font-medium"
        }, 'Sign Out')
      )
    ),

    React.createElement('div', { className: "pb-4 border-b border-gray-200 space-y-3" },
      React.createElement('h3', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Baby Settings'),
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

    React.createElement('div', null,
      React.createElement('h3', { className: "text-sm font-semibold text-gray-700 mb-3" }, 'Who Has Access'),
      React.createElement('div', { className: "space-y-2 mb-3" },
        members.map(member => 
          React.createElement('div', { 
            key: member.uid,
            className: "flex items-center justify-between py-2"
          },
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('span', { className: "text-sm text-gray-700" }, member.email),
              member.uid === kidData?.ownerId && 
                React.createElement('span', { className: "text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded" }, 'Owner')
            ),
            isOwner && member.uid !== user.uid &&
              React.createElement('button', {
                onClick: () => handleRemoveMember(member.uid),
                className: "text-red-400 hover:text-red-600 text-sm"
              }, 'Remove')
          )
        )
      ),
      !showInvite ?
        React.createElement('button', {
          onClick: handleCreateInvite,
          className: "w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
        }, '+ Invite Partner')
      :
        React.createElement('div', { className: "space-y-2" },
          React.createElement('div', { className: "text-xs text-gray-600 mb-2" }, 'Share this link:'),
          React.createElement('div', { className: "flex gap-2" },
            React.createElement('input', {
              type: "text",
              value: inviteLink,
              readOnly: true,
              className: "flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
            }),
            React.createElement('button', {
              onClick: handleCopyLink,
              className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm whitespace-nowrap"
            }, copying ? '✓ Copied!' : 'Copy')
          ),
          React.createElement('button', {
            onClick: () => setShowInvite(false),
            className: "text-sm text-gray-600 hover:text-gray-700"
          }, 'Close')
        )
    )
  );
};

// ========================================
// ANALYTICS TAB
// ========================================

const AnalyticsTab = ({ loadAllFeedings }) => {
  const [allFeedings, setAllFeedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('day');
  const [stats, setStats] = useState({
    avgVolumePerFeed: 0,
    avgVolumePerDay: 0,
    avgFeedingsPerDay: 0,
    avgInterval: 0,
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
      setStats({ avgVolumePerFeed: 0, avgVolumePerDay: 0, avgFeedingsPerDay: 0, avgInterval: 0, chartData: [] });
      return;
    }

    const now = Date.now();
    let timeframeMs, labelText;
    
    if (timeRange === 'day') {
      timeframeMs = 3 * 24 * 60 * 60 * 1000;
      labelText = '3-day avg';
    } else if (timeRange === 'week') {
      timeframeMs = 7 * 24 * 60 * 60 * 1000;
      labelText = '7-day avg';
    } else {
      timeframeMs = 30 * 24 * 60 * 60 * 1000;
      labelText = '30-day avg';
    }

    const timeframeAgo = now - timeframeMs;
    const recentFeedings = feedings.filter(f => f.timestamp >= timeframeAgo);
    const totalVolume = recentFeedings.reduce((sum, f) => sum + f.ounces, 0);
    const avgVolumePerFeed = recentFeedings.length > 0 ? totalVolume / recentFeedings.length : 0;
    const uniqueDays = new Set(recentFeedings.map(f => new Date(f.timestamp).toDateString())).size;
    const avgVolumePerDay = uniqueDays > 0 ? totalVolume / uniqueDays : 0;
    const avgFeedingsPerDay = uniqueDays > 0 ? recentFeedings.length / uniqueDays : 0;

    let totalIntervalMinutes = 0;
    for (let i = 1; i < recentFeedings.length; i++) {
      totalIntervalMinutes += (recentFeedings[i].timestamp - recentFeedings[i - 1].timestamp) / (1000 * 60);
    }
    const avgInterval = recentFeedings.length > 1 ? totalIntervalMinutes / (recentFeedings.length - 1) : 0;

    const chartData = generateChartData(feedings, timeRange);

    setStats({ avgVolumePerFeed, avgVolumePerDay, avgFeedingsPerDay, avgInterval, labelText, chartData });
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
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short' });
      }
      if (!grouped[key]) grouped[key] = { date: key, volume: 0, count: 0 };
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
    return hours === 0 ? `${mins}m` : `${hours}h ${mins}m`;
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

  const maxVolume = Math.max(...stats.chartData.map(d => d.volume));

  return React.createElement('div', { className: "space-y-4" },
    React.createElement('div', { className: "flex justify-center mb-1" },
      React.createElement('div', { className: "inline-flex gap-0.5 bg-gray-100/50 rounded-lg p-0.5" },
        ['day', 'week', 'month'].map(range =>
          React.createElement('button', {
            key: range,
            onClick: () => setTimeRange(range),
            className: `px-4 py-1.5 rounded-md text-xs font-medium transition ${timeRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`
          }, range.charAt(0).toUpperCase() + range.slice(1))
        )
      )
    ),

    React.createElement('div', { className: "grid grid-cols-2 gap-4" },
      [
        { label: 'Oz / Feed', value: stats.avgVolumePerFeed.toFixed(1) },
        { label: 'Oz / Day', value: stats.avgVolumePerDay.toFixed(1) }
      ].map(stat =>
        React.createElement('div', { key: stat.label, className: "bg-white rounded-2xl shadow-lg p-6 text-center" },
          React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, stat.label),
          React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, 
            stat.value,
            React.createElement('span', { className: "text-sm font-normal text-gray-400 ml-1" }, 'oz')
          ),
          React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, stats.labelText)
        )
      )
    ),

    React.createElement('div', { className: "grid grid-cols-2 gap-4" },
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 text-center" },
        React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Feedings / Day'),
        React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, stats.avgFeedingsPerDay.toFixed(1)),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, stats.labelText)
      ),
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 text-center" },
        React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Avg Between Feeds'),
        React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, formatInterval(stats.avgInterval)),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, stats.labelText)
      )
    ),

    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-4 text-center" }, 'Volume History'),
      stats.chartData.length > 0 ?
        React.createElement('div', { className: "relative" },
          React.createElement('div', { 
            className: "overflow-x-auto overflow-y-hidden -mx-6 px-6",
            style: { scrollBehavior: 'smooth' }
          },
            React.createElement('div', { 
              className: "flex gap-6 pb-2", 
              style: { minWidth: stats.chartData.length > 4 ? `${stats.chartData.length * 80}px` : '100%' } 
            },
              stats.chartData.map(item => 
                React.createElement('div', { key: item.date, className: "flex flex-col items-center gap-2 flex-shrink-0" },
                  React.createElement('div', { className: "flex flex-col justify-end items-center", style: { height: '180px', width: '60px' } },
                    React.createElement('div', { 
                      className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500", 
                      style: { height: `${(item.volume / maxVolume) * 160}px`, minHeight: '30px' } 
                    },
                      React.createElement('span', { className: "text-white text-xs font-semibold" }, item.volume)
                    )
                  ),
                  React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, item.date),
                  React.createElement('div', { className: "text-xs text-gray-400" }, `${item.count} feeds`)
                )
              )
            )
          ),
          stats.chartData.length > 4 && React.createElement('div', { className: "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white pointer-events-none" })
        )
      :
        React.createElement('div', { className: "text-center text-gray-400 py-8" }, 'No data to display')
    )
  );
};

// ========================================
// PART 5: SVG ICONS & RENDER
// ========================================

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

// ========================================
// RENDER APP
// ========================================

ReactDOM.render(React.createElement(App), document.getElementById('root'));
