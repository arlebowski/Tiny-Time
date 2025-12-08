// ========================================
// TINY TRACKER V4.1 - PART 1
// Config, Auth, Firestore Layer + AI Functions (No Migration)
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyBUscvx-JB3lNWKVu9bPnYTBHVPvrndc_w",
  authDomain: "baby-feeding-tracker-978e6.firebaseapp.com",
  projectId: "baby-feeding-tracker-978e6",
  storageBucket: "baby-feeding-tracker-978e6.firebasestorage.app",
  messagingSenderId: "775043948126",
  appId: "1:775043948126:web:28d8aefeea99cc7d25decf"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
  
  return null;
};

const createKidForUser = async (userId, babyName, babyWeight, birthDate) => {
  const kidRef = await db.collection('kids').add({
    name: babyName,
    birthDate: birthDate,
    ownerId: userId,
    members: [userId],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  const kidId = kidRef.id;
  
  await db.collection('users').doc(userId).set({
    kidId: kidId
  }, { merge: true });
  
  await db.collection('kids').doc(kidId).collection('settings').doc('default').set({
    babyWeight: babyWeight,
    multiplier: 2.5,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return kidId;
};

const saveUserKidId = async (userId, kidId) => {
  await db.collection('users').doc(userId).set({
    kidId: kidId
  }, { merge: true });
};

const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  return await auth.signInWithPopup(provider);
};

const signOut = async () => {
  return await auth.signOut();
};

// ========================================
// INVITE SYSTEM
// ========================================

const createInviteCode = async (kidId, userId) => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await db.collection('invites').doc(code).set({
    kidId: kidId,
    createdBy: userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    used: false
  });
  return code;
};

// 🔧 Helper used by the UI – this is what handleCreateInvite expects
const createInvite = async (kidId) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }
  return await createInviteCode(kidId, user.uid);
};

const acceptInvite = async (code, userId) => {
  const inviteDoc = await db.collection('invites').doc(code).get();
  
  if (!inviteDoc.exists) {
    throw new Error('Invalid invite code');
  }
  
  const invite = inviteDoc.data();
  if (invite.used) {
    throw new Error('Invite already used');
  }
  
  const kidId = invite.kidId;
  
  await db.collection('kids').doc(kidId).update({
    members: firebase.firestore.FieldValue.arrayUnion(userId)
  });
  
  await db.collection('invites').doc(code).update({
    used: true,
    usedBy: userId,
    usedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return kidId;
};

// 🔧 Fix: actually look up each member's profile in `users` so we can show names
const getFamilyMembers = async (kidId) => {
  const kidDoc = await db.collection('kids').doc(kidId).get();
  if (!kidDoc.exists) return [];
  
  const members = kidDoc.data().members || [];

  const memberDetails = await Promise.all(
    members.map(async (uid) => {
      const userDoc = await db.collection('users').doc(uid).get();
      const data = userDoc.exists ? userDoc.data() : {};

      const isCurrentUser = auth.currentUser && auth.currentUser.uid === uid;

      const email =
        data.email ||
        (isCurrentUser ? auth.currentUser.email : null) ||
        'Family Member';

      return {
        uid,
        displayName:
          data.displayName ||
          (isCurrentUser ? auth.currentUser.displayName : null) ||
          null,
        email,
        photoURL:
          data.photoURL ||
          (isCurrentUser ? auth.currentUser.photoURL : null) ||
          null
      };
    })
  );

  return memberDetails;
};

// ========================================
// FIRESTORE STORAGE LAYER
// ========================================

const firestoreStorage = {
  currentKidId: null,
  
  initialize: async function(kidId) {
    this.currentKidId = kidId;
  },
  
  saveFeeding: async function(feeding) {
    if (!this.currentKidId) throw new Error('No kid selected');
    await db.collection('kids').doc(this.currentKidId)
      .collection('feedings').add(feeding);
  },
  
  addFeeding: async function(ounces, timestamp) {
    // Alias for saveFeeding with direct parameters
    return await this.saveFeeding({
      ounces: ounces,
      timestamp: timestamp
    });
  },
  
  getFeedings: async function() {
    if (!this.currentKidId) return [];
    const snapshot = await db.collection('kids').doc(this.currentKidId)
      .collection('feedings')
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  getAllFeedings: async function() {
    // Alias for getFeedings for compatibility
    return await this.getFeedings();
  },
  
  getFeedingsLastNDays: async function(days) {
    if (!this.currentKidId) return [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const snapshot = await db.collection('kids').doc(this.currentKidId)
      .collection('feedings')
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  deleteFeeding: async function(feedingId) {
    if (!this.currentKidId) throw new Error('No kid selected');
    await db.collection('kids').doc(this.currentKidId)
      .collection('feedings').doc(feedingId).delete();
  },
  
  updateFeeding: async function(feedingId, ounces, timestamp) {
    if (!this.currentKidId) throw new Error('No kid selected');
    await db.collection('kids').doc(this.currentKidId)
      .collection('feedings').doc(feedingId).update({
        ounces: ounces,
        timestamp: timestamp
      });
  },
  
  getSettings: async function() {
    if (!this.currentKidId) return null;
    const doc = await db.collection('kids').doc(this.currentKidId)
      .collection('settings').doc('default').get();
    return doc.exists ? doc.data() : null;
  },
  
  saveSettings: async function(settings) {
    if (!this.currentKidId) throw new Error('No kid selected');
    await db.collection('kids').doc(this.currentKidId)
      .collection('settings').doc('default').set(settings, { merge: true });
  },
  
  getKidData: async function() {
    if (!this.currentKidId) return null;
    const doc = await db.collection('kids').doc(this.currentKidId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  
  updateKidData: async function(data) {
    if (!this.currentKidId) throw new Error('No kid selected');
    await db.collection('kids').doc(this.currentKidId).set(data, { merge: true });
  },
  
  // AI Conversation methods
  getConversation: async function() {
    if (!this.currentKidId) return null;
    const doc = await db.collection('kids').doc(this.currentKidId)
      .collection('conversations').doc('default').get();
    return doc.exists ? doc.data() : null;
  },
  
  saveMessage: async function(message) {
    if (!this.currentKidId) throw new Error('No kid selected');
    const conversationRef = db.collection('kids').doc(this.currentKidId)
      .collection('conversations').doc('default');
    
    const doc = await conversationRef.get();
    const messages = doc.exists ? (doc.data().messages || []) : [];
    
    messages.push(message);
    
    await conversationRef.set({
      messages: messages,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },
  
  clearConversation: async function() {
    if (!this.currentKidId) throw new Error('No kid selected');
    await db.collection('kids').doc(this.currentKidId)
      .collection('conversations').doc('default').delete();
  },
  
  getMembers: async function() {
    if (!this.currentKidId) return [];
    return await getFamilyMembers(this.currentKidId);
  }
};

// ========================================
// TINY TRACKER V3 - PART 2
// App Wrapper, Login Screen, Baby Setup Screen (with migration fix)
// ========================================

const { useState, useEffect } = React;

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kidId, setKidId] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        
        try {
          let userKidId;

          if (inviteCode) {
            // Accept invite + attach kid to this user
            userKidId = await acceptInvite(inviteCode, user.uid);
            if (userKidId) {
              await saveUserKidId(user.uid, userKidId);
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            // Normal path – fetch kidId for this user
            userKidId = await getUserKidId(user.uid);
          }
          
          // If no kid yet, show setup
          if (!userKidId) {
            setNeedsSetup(true);
            setLoading(false);
            return;
          }

          // ✅ No more migration here
          setKidId(userKidId);
          await firestoreStorage.initialize(userKidId);
        } catch (error) {
          console.error('Setup error:', error);
        }
      } else {
        setUser(null);
        setKidId(null);
        setNeedsSetup(false);
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
        React.createElement('div', { className: "animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" }),
        React.createElement('div', { className: "text-gray-600" }, 'Loading...')
      )
    );
  }
  
  if (!user) {
    return React.createElement(LoginScreen);
  }
  
  if (needsSetup) {
    return React.createElement(BabySetupScreen, { 
      user,
      onComplete: async (kidId) => {
        setKidId(kidId);
        setNeedsSetup(false);
        await firestoreStorage.initialize(kidId);
      }
    });
  }

  return React.createElement(MainApp, { user, kidId });
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
        React.createElement('div', { className: "flex items-center justify-center mb-4" },
          React.createElement('div', { className: "bg-indigo-100 rounded-full p-4" },
            React.createElement('span', { className: "text-5xl" }, '🍼')
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
// BABY SETUP SCREEN
// ========================================

const BabySetupScreen = ({ user, onComplete }) => {
  const [babyName, setBabyName] = useState('');
  const [babyWeight, setBabyWeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async () => {
    if (!babyName.trim()) {
      setError('Please enter your baby\'s name');
      return;
    }
    
    const weight = parseFloat(babyWeight);
    if (!weight || weight <= 0) {
      setError('Please enter a valid weight');
      return;
    }
    
    if (!birthDate) {
      setError('Please enter birth date');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const birthTimestamp = new Date(birthDate).getTime();
      const kidId = await createKidForUser(user.uid, babyName.trim(), weight, birthTimestamp);
      onComplete(kidId);
    } catch (err) {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };
  
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
        React.createElement('h1', { className: "text-2xl font-bold text-gray-800 mb-2" }, 'Welcome to Tiny Tracker!'),
        React.createElement('p', { className: "text-gray-600" }, "Let's set up your baby's profile")
      ),
      
      React.createElement('div', { className: "space-y-4" },
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, "Baby's Name"),
          React.createElement('input', {
            type: "text",
            value: babyName,
            onChange: (e) => setBabyName(e.target.value),
            placeholder: "Emma",
            className: "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
          })
        ),
        
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, "Current Weight (lbs)"),
          React.createElement('input', {
            type: "number",
            step: "0.1",
            value: babyWeight,
            onChange: (e) => setBabyWeight(e.target.value),
            placeholder: "8.5",
            className: "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
          })
        ),
        
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, "Birth Date"),
          React.createElement('input', {
            type: "date",
            value: birthDate,
            onChange: (e) => setBirthDate(e.target.value),
            className: "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
          })
        ),
        
        error && React.createElement('div', {
          className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
        }, error),
        
        React.createElement('button', {
          onClick: handleSubmit,
          disabled: saving,
          className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        }, saving ? 'Saving...' : 'Get Started')
      )
    )
  );
};

// ========================================
// TINY TRACKER V4.2 - PART 3
// Main App with Bottom Navigation (FIXED - nav extends to bottom)
// ========================================

const MainApp = ({ user, kidId }) => {
  const [activeTab, setActiveTab] = useState('tracker');
  
  useEffect(() => {
    document.title = 'Tiny Tracker';
  }, []);
  
  return React.createElement('div', { 
    className: "min-h-screen",
    style: { 
      backgroundColor: '#E0E7FF',
      paddingBottom: '80px' // Space for fixed nav
    }
  },
    React.createElement('div', { className: "max-w-2xl mx-auto" },
      // Header - no drop shadow, just flat
      React.createElement('div', { 
        className: "sticky top-0 z-10",
        style: { backgroundColor: '#E0E7FF' }
      },
        React.createElement('div', { className: "pt-4 pb-6" },
          React.createElement('div', { className: "flex items-center justify-center" },
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('span', { className: "text-3xl" }, '🍼'),
              React.createElement('h1', { className: "text-2xl font-bold text-gray-800 handwriting" }, 'Tiny Tracker')
            )
          )
        )
      ),
      
      // Content
      React.createElement('div', { className: "px-4" },
        activeTab === 'tracker' && React.createElement(TrackerTab, { user, kidId }),
        activeTab === 'analytics' && React.createElement(AnalyticsTab, { kidId }),
        activeTab === 'chat' && React.createElement(AIChatTab, { user, kidId }),
        activeTab === 'family' && React.createElement(FamilyTab, { user, kidId }),
        activeTab === 'settings' && React.createElement(SettingsTab, { user, kidId })
      )
    ),
    
    // Bottom Navigation - extends to bottom, no scroll behind
    React.createElement('div', { 
      className: "fixed bottom-0 left-0 right-0 z-50",
      style: { 
        backgroundColor: '#E0E7FF',
        boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)' // iOS safe area
      }
    },
      React.createElement('div', { 
        className: "max-w-2xl mx-auto flex items-center justify-around px-4 py-3"
      },
        [
          { id: 'tracker', icon: BarChart, label: 'Tracker' },
          { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
          { id: 'chat', icon: MessageCircle, label: 'AI Chat' },
          { id: 'family', icon: Users, label: 'Family' },
          { id: 'settings', icon: Menu, label: 'Settings' }
        ].map(tab =>
          React.createElement('button', {
            key: tab.id,
            onClick: () => setActiveTab(tab.id),
            className: `flex-1 py-2 flex flex-col items-center gap-1 transition ${
              activeTab === tab.id 
                ? 'text-indigo-600' 
                : 'text-gray-400'
            }`
          },
            React.createElement(tab.icon, { className: "w-6 h-6" }),
            React.createElement('span', { className: "text-xs font-medium" }, tab.label)
          )
        )
      )
    )
  );
};

// ========================================
// TINY TRACKER V2 - PART 4  
// Tracker Tab - Main Feeding Interface
// ========================================

const TrackerTab = ({ user, kidId }) => {
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [ounces, setOunces] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [feedings, setFeedings] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingFeedingId, setEditingFeedingId] = useState(null);
  const [editOunces, setEditOunces] = useState('');
  const [editTime, setEditTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomTime, setShowCustomTime] = useState(false);

  useEffect(() => {
    loadData();
  }, [kidId]);

  useEffect(() => {
    if (!loading && kidId) {
      loadFeedings();
      const interval = setInterval(loadFeedings, 5000);
      return () => clearInterval(interval);
    }
  }, [currentDate, loading, kidId]);

  const loadFeedings = async () => {
    try {
      const allFeedings = await firestoreStorage.getFeedingsLastNDays(7);
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayFeedings = allFeedings.filter(f => 
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
    } catch (error) {
      console.error('Error loading feedings:', error);
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

  const totalConsumed = feedings.reduce((sum, f) => sum + f.ounces, 0);
  const targetOunces = babyWeight ? babyWeight * multiplier : 0;
  const remaining = Math.max(0, targetOunces - totalConsumed);
  const percentComplete = targetOunces > 0 ? Math.min((totalConsumed / targetOunces) * 100, 100) : 0;

  if (loading) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { className: "text-gray-600" }, 'Loading...')
    );
  }

  return React.createElement('div', { className: "space-y-4" },
    // Today Card
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
    
    // Log Feeding Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
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
    
    // Feedings List
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
                    React.createElement('div', { 
                      className: "bg-indigo-100 rounded-full flex items-center justify-center",
                      style: { width: '48px', height: '48px' }
                    },
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
  );
};

// ========================================
// TINY TRACKER V2 - PART 5
// Analytics Tab
// ========================================

const AnalyticsTab = ({ kidId }) => {
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
  }, [timeRange, kidId]);

  const loadAnalytics = async () => {
    setLoading(true);
    const feedings = await firestoreStorage.getAllFeedings();
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
    // FIXED: Reverse array so oldest is on left, newest on right
    return Object.values(grouped).map(item => ({
      date: item.date,
      volume: parseFloat(item.volume.toFixed(1)),
      count: item.count
    })).reverse();
  };

  const formatInterval = (minutes) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.round(Math.abs(minutes) % 60);
    return hours === 0 ? `${mins}m` : `${hours}h ${mins}m`;
  };

  if (loading) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { className: "text-gray-600" }, 'Loading analytics...')
    );
  }

  if (allFeedings.length === 0) {
    return React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "text-center text-gray-400 py-8" }, 'No feeding data yet. Start logging feedings to see analytics!')
    );
  }

  const maxVolume = Math.max(...stats.chartData.map(d => d.volume));

  return React.createElement('div', { className: "space-y-4" },
    React.createElement('div', { className: "flex justify-center" },
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
        React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
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
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
        React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Feedings / Day'),
        React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, stats.avgFeedingsPerDay.toFixed(1)),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, stats.labelText)
      ),
      React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
        React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 'Time Between Feeds'),
        React.createElement('div', { className: "text-2xl font-bold text-indigo-600" }, formatInterval(stats.avgInterval)),
        React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, stats.labelText)
      )
    ),

    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2.5 text-center" }, 'Volume History'),
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
                      React.createElement('div', { className: "text-white font-semibold" },
                        React.createElement('span', { className: "text-xs" }, item.volume),
                        React.createElement('span', { className: "text-[10px] opacity-70 ml-0.5" }, 'oz')
                      )
                    )
                  ),
                  React.createElement('div', { className: "text-xs text-gray-600 font-medium" }, item.date),
                  React.createElement('div', { className: "text-xs text-gray-400" }, `${item.count} feeds`)
                )
              )
            )
          )
        )
      :
        React.createElement('div', { className: "text-center text-gray-400 py-8" }, 'No data to display')
    )
  );
};

// ========================================
// TINY TRACKER V4.3 - PART 6
// Family Tab - FIXED: name field width, bigger buttons, show member names, image compression
// ========================================

const FamilyTab = ({ user, kidId }) => {
  const [kidData, setKidData] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState({ babyWeight: null, multiplier: 2.5 });
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copying, setCopying] = useState(false);
  const [babyPhotoUrl, setBabyPhotoUrl] = useState(null);
  
  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  const [editingUserName, setEditingUserName] = useState(false);
  
  // Temp values
  const [tempBabyName, setTempBabyName] = useState('');
  const [tempBirthDate, setTempBirthDate] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempMultiplier, setTempMultiplier] = useState('');
  const [tempUserName, setTempUserName] = useState('');

  // File input ref
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadData();
  }, [kidId]);

  const loadData = async () => {
    if (!kidId) return;
    setLoading(true);
    try {
      const kid = await firestoreStorage.getKidData();
      setKidData(kid);
      if (kid.photoURL) {
        setBabyPhotoUrl(kid.photoURL);
      }
      
      const memberList = await firestoreStorage.getMembers();
      setMembers(memberList);
      
      const settingsData = await firestoreStorage.getSettings();
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    }
    setLoading(false);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // FIXED: Auto-compress images to meet size requirements
  const compressImage = (file, maxSizeKB = 500) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large
          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels to hit target size
          let quality = 0.9;
          let base64 = canvas.toDataURL('image/jpeg', quality);
          
          // Keep reducing quality until under max size
          while (base64.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      // Compress image to ~500KB
      const compressedBase64 = await compressImage(file, 500);
      
      // Save to Firestore
      await firestoreStorage.updateKid({ photoURL: compressedBase64 });
      setBabyPhotoUrl(compressedBase64);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    }
  };

  const handleCreateInvite = async () => {
  try {
    const code = await createInvite(kidId);
    const link = `${window.location.origin}${window.location.pathname}?invite=${code}`;

    const shareText =
      "Come join me on Tiny Tracker so we can both track the baby's feedings together.";

    // Try native share sheet first (iOS / Android / mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Tiny Tracker',
          text: `${shareText}\n\n${link}`,
          url: link
        });
        return; // done – user shared or cancelled
      } catch (err) {
        console.log('Share failed or was cancelled, falling back to copy UI:', err);
        // fall through to copy UI
      }
    }

    // Fallback: show the existing copy-link UI and auto-copy if possible
    setInviteLink(link);
    setShowInvite(true);

    try {
      await navigator.clipboard.writeText(link);
      setCopying(true);
      setTimeout(() => setCopying(false), 1500);
    } catch (err) {
      // ignore – user can still manually copy from the text field
    }
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
      await loadData();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateBabyName = async () => {
    if (!tempBabyName.trim()) return;
    try {
      await firestoreStorage.updateKid({ name: tempBabyName.trim() });
      setEditingName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleUpdateBirthDate = async () => {
    if (!tempBirthDate) return;
    try {
      const birthTimestamp = new Date(tempBirthDate).getTime();
      await firestoreStorage.updateKid({ birthDate: birthTimestamp });
      setEditingBirthDate(false);
      await loadData();
    } catch (error) {
      console.error('Error updating birth date:', error);
    }
  };

  const handleUpdateWeight = async () => {
    const weight = parseFloat(tempWeight);
    if (!weight || weight <= 0) return;
    try {
      await firestoreStorage.saveSettings({ ...settings, babyWeight: weight });
      setEditingWeight(false);
      await loadData();
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };

  const handleUpdateMultiplier = async () => {
    const mult = parseFloat(tempMultiplier);
    if (!mult || mult <= 0) return;
    try {
      await firestoreStorage.saveSettings({ ...settings, multiplier: mult });
      setEditingMultiplier(false);
      await loadData();
    } catch (error) {
      console.error('Error updating multiplier:', error);
    }
  };

  const handleUpdateUserName = async () => {
    if (!tempUserName.trim()) return;
    try {
      await updateUserProfile(user.uid, { displayName: tempUserName.trim() });
      setEditingUserName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating user name:', error);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Not set';
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months === 0) {
      const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
      return `${days} day${days !== 1 ? 's' : ''} old`;
    }
    return `${months} month${months !== 1 ? 's' : ''} old`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateForInput = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  if (loading) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { className: "text-gray-600" }, 'Loading...')
    );
  }

  const isOwner = kidData?.ownerId === user.uid;

  return React.createElement('div', { className: "space-y-4" },
    // Hidden file input
    React.createElement('input', {
      ref: fileInputRef,
      type: "file",
      accept: "image/*",
      onChange: handlePhotoChange,
      style: { display: 'none' }
    }),

    // Baby Info Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Baby Info'),
      
      React.createElement('div', { className: "flex items-start gap-4 mb-6" },
        React.createElement('div', { className: "relative flex-shrink-0" },
          React.createElement('div', {
            onClick: handlePhotoClick,
            className: "w-24 h-24 rounded-full overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition relative"
          },
            babyPhotoUrl ?
              React.createElement('img', {
                src: babyPhotoUrl,
                alt: kidData?.name || 'Baby',
                className: "w-full h-full object-cover"
              })
            :
              React.createElement('div', { className: "w-full h-full flex items-center justify-center text-4xl" }, '👶')
          ),
          React.createElement('div', { 
            className: "absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 cursor-pointer hover:bg-indigo-700 transition",
            onClick: handlePhotoClick
          },
            React.createElement(Camera, { className: "w-4 h-4 text-white" })
          )
        ),
        
        // FIXED: Name field with proper width constraint
        React.createElement('div', { className: "flex-1 min-w-0" },
          editingName ?
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: "text",
                value: tempBabyName,
                onChange: (e) => setTempBabyName(e.target.value),
                placeholder: "Baby's name",
                maxLength: 20,
                className: "flex-1 px-3 py-2 text-lg font-medium border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500",
                style: { minWidth: 0 }
              }),
              // FIXED: Bigger buttons (w-6 h-6 instead of w-4 h-4)
              React.createElement('button', {
                onClick: handleUpdateBabyName,
                className: "text-green-600 hover:text-green-700 flex-shrink-0"
              }, React.createElement(Check, { className: "w-6 h-6" })),
              React.createElement('button', {
                onClick: () => setEditingName(false),
                className: "text-gray-400 hover:text-gray-600 flex-shrink-0"
              }, React.createElement(X, { className: "w-6 h-6" }))
            )
          :
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('h3', { className: "text-lg font-semibold text-gray-800 truncate" }, 
                kidData?.name || 'Baby'
              ),
              React.createElement('button', {
                onClick: () => {
                  setTempBabyName(kidData?.name || '');
                  setEditingName(true);
                },
                className: "text-indigo-600 hover:text-indigo-700 flex-shrink-0"
              }, React.createElement(Edit2, { className: "w-4 h-4" }))
            ),
          React.createElement('div', { className: "text-sm text-gray-500 mt-1" }, 
            calculateAge(kidData?.birthDate)
          )
        )
      ),
      
      // Birth Date
      React.createElement('div', { className: "flex items-center justify-between py-3" },
        React.createElement('span', { className: "text-gray-600 font-medium" }, 'Birth Date'),
        editingBirthDate ?
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('input', {
              type: "date",
              value: tempBirthDate,
              onChange: (e) => setTempBirthDate(e.target.value),
              className: "px-3 py-1.5 border-2 border-indigo-300 rounded-lg text-sm"
            }),
            React.createElement('button', {
              onClick: handleUpdateBirthDate,
              className: "text-green-600 hover:text-green-700"
            }, React.createElement(Check, { className: "w-6 h-6" })),
            React.createElement('button', {
              onClick: () => setEditingBirthDate(false),
              className: "text-gray-400 hover:text-gray-600"
            }, React.createElement(X, { className: "w-6 h-6" }))
          )
        :
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('span', { className: "text-gray-800 font-medium" }, 
              formatDate(kidData?.birthDate) || 'Not set'
            ),
            React.createElement('button', {
              onClick: () => {
                setTempBirthDate(formatDateForInput(kidData?.birthDate) || '');
                setEditingBirthDate(true);
              },
              className: "text-indigo-600 hover:text-indigo-700"
            }, React.createElement(Edit2, { className: "w-4 h-4" }))
          )
      ),
      
      // Current Weight
      React.createElement('div', { className: "flex items-center justify-between py-3" },
        React.createElement('span', { className: "text-gray-600 font-medium" }, 'Current Weight'),
        editingWeight ?
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('input', {
              type: "number",
              step: "0.1",
              value: tempWeight,
              onChange: (e) => setTempWeight(e.target.value),
              placeholder: "8.5",
              className: "w-20 px-3 py-1.5 border-2 border-indigo-300 rounded-lg text-sm text-right"
            }),
            React.createElement('span', { className: "text-gray-600" }, 'lbs'),
            React.createElement('button', {
              onClick: handleUpdateWeight,
              className: "text-green-600 hover:text-green-700"
            }, React.createElement(Check, { className: "w-6 h-6" })),
            React.createElement('button', {
              onClick: () => setEditingWeight(false),
              className: "text-gray-400 hover:text-gray-600"
            }, React.createElement(X, { className: "w-6 h-6" }))
          )
        :
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('span', { className: "text-gray-800 font-medium" }, 
              settings.babyWeight ? `${settings.babyWeight} lbs` : 'Not set'
            ),
            React.createElement('button', {
              onClick: () => {
                setTempWeight(settings.babyWeight?.toString() || '');
                setEditingWeight(true);
              },
              className: "text-indigo-600 hover:text-indigo-700"
            }, React.createElement(Edit2, { className: "w-4 h-4" }))
          )
      ),
      
      // Target Multiplier
      React.createElement('div', { className: "flex items-center justify-between py-3" },
        React.createElement('span', { className: "text-gray-600 font-medium" }, 'Target Multiplier (oz/lb)'),
        editingMultiplier ?
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('input', {
              type: "number",
              step: "0.1",
              value: tempMultiplier,
              onChange: (e) => setTempMultiplier(e.target.value),
              placeholder: "2.5",
              className: "w-20 px-3 py-1.5 border-2 border-indigo-300 rounded-lg text-sm text-right"
            }),
            React.createElement('span', { className: "text-gray-600" }, 'x'),
            React.createElement('button', {
              onClick: handleUpdateMultiplier,
              className: "text-green-600 hover:text-green-700"
            }, React.createElement(Check, { className: "w-6 h-6" })),
            React.createElement('button', {
              onClick: () => setEditingMultiplier(false),
              className: "text-gray-400 hover:text-gray-600"
            }, React.createElement(X, { className: "w-6 h-6" }))
          )
        :
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('span', { className: "text-gray-800 font-medium" }, 
              `${settings.multiplier}x`
            ),
            React.createElement('button', {
              onClick: () => {
                setTempMultiplier(settings.multiplier?.toString() || '2.5');
                setEditingMultiplier(true);
              },
              className: "text-indigo-600 hover:text-indigo-700"
            }, React.createElement(Edit2, { className: "w-4 h-4" }))
          )
      )
    ),

    // Family Members Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Family Members'),
      React.createElement('div', { className: "space-y-3 mb-4" },
        members.map(member => 
          React.createElement('div', { 
            key: member.uid,
            className: "flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
          },
            React.createElement('div', { className: "flex-shrink-0" },
              member.photoURL ?
                React.createElement('img', {
                  src: member.photoURL,
                  alt: member.displayName || member.email,
                  className: "w-12 h-12 rounded-full"
                })
              :
                React.createElement('div', { 
                  className: "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
                  style: { backgroundColor: '#818cf8' }
                },
                  React.createElement('span', {}, (member.displayName || member.email).charAt(0).toUpperCase())
                )
            ),
            React.createElement('div', { className: "flex-1 min-w-0" },
              member.uid === user.uid && editingUserName ?
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    type: "text",
                    value: tempUserName,
                    onChange: (e) => setTempUserName(e.target.value),
                    placeholder: "Your name",
                    className: "flex-1 px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg",
                    style: { minWidth: 0 }
                  }),
                  React.createElement('button', {
                    onClick: handleUpdateUserName,
                    className: "text-green-600 hover:text-green-700 flex-shrink-0"
                  }, React.createElement(Check, { className: "w-6 h-6" })),
                  React.createElement('button', {
                    onClick: () => setEditingUserName(false),
                    className: "text-gray-400 hover:text-gray-600 flex-shrink-0"
                  }, React.createElement(X, { className: "w-6 h-6" }))
                )
              :
                React.createElement('div', null,
                  React.createElement('div', { className: "flex items-center gap-2" },
                    // FIXED: Show displayName or email properly
                    React.createElement('span', { className: "font-medium text-gray-800 truncate" }, 
                      member.displayName || member.email.split('@')[0]
                    ),
                    member.uid === kidData?.ownerId && 
                      React.createElement('span', { className: "text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded flex-shrink-0" }, 'Owner'),
                    member.uid === user.uid &&
                      React.createElement('button', {
                        onClick: () => {
                          setTempUserName(member.displayName || '');
                          setEditingUserName(true);
                        },
                        className: "text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                      }, React.createElement(Edit2, { className: "w-3 h-3" }))
                  ),
                  React.createElement('div', { className: "text-sm text-gray-500 truncate" }, member.email)
                )
            ),
            isOwner && member.uid !== user.uid &&
              React.createElement('button', {
                onClick: () => handleRemoveMember(member.uid),
                className: "text-red-400 hover:text-red-600 text-sm font-medium flex-shrink-0"
              }, 'Remove')
          )
        )
      ),

      !showInvite ?
        React.createElement('button', {
          onClick: handleCreateInvite,
          className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
        },
          React.createElement(UserPlus, { className: "w-5 h-5" }),
          '+ Invite Partner'
        )
      :
        React.createElement('div', { className: "bg-indigo-50 rounded-xl p-4" },
          React.createElement('div', { className: "text-sm text-gray-600 mb-2" }, 'Share this link with your partner:'),
          React.createElement('div', { className: "flex gap-2" },
            React.createElement('input', {
              type: "text",
              value: inviteLink,
              readOnly: true,
              className: "flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            }),
            React.createElement('button', {
              onClick: handleCopyLink,
              className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            }, copying ? 'Copied!' : 'Copy')
          ),
          React.createElement('button', {
            onClick: () => setShowInvite(false),
            className: "mt-2 text-sm text-gray-600 hover:text-gray-800"
          }, 'Close')
        )
    )
  );
};

// ========================================
// TINY TRACKER V3 - PART 7
// Settings Tab - Share App, Sign Out (Target Settings moved to Family tab)
// ========================================

const SettingsTab = ({ user, kidId }) => {
  const handleShareApp = async () => {
    const url = window.location.origin + window.location.pathname;
    const text = `Check out Tiny Tracker - track your baby's feedings and get insights! ${url}`;
    
    // Try native share first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tiny Tracker',
          text: 'Check out Tiny Tracker - track your baby\'s feedings and get insights!',
          url: url
        });
        return;
      } catch (error) {
        // User cancelled or share failed, fall through to Messenger
      }
    }
    
    // Try Messenger deep link (mobile)
    const messengerUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}&app_id=`;
    window.location.href = messengerUrl;
    
    // Fallback: Copy to clipboard after short delay
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(text);
        alert('Link copied to clipboard! You can paste it in Messenger or any app.');
      } catch (error) {
        // Final fallback: show the link
        prompt('Copy this link to share:', url);
      }
    }, 1000);
  };

  const handleSignOut = async () => {
    if (confirm('Sign out of Tiny Tracker?')) {
      await signOut();
    }
  };

  return React.createElement('div', { className: "space-y-4" },
    // Share & Support Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Share & Support'),
      React.createElement('button', {
        onClick: handleShareApp,
        className: "w-full bg-indigo-50 text-indigo-600 py-3 rounded-xl font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2"
      },
        React.createElement('span', { className: "text-xl" }, '📱'),
        'Share Tiny Tracker'
      ),
      React.createElement('p', { className: "text-xs text-gray-500 mt-2 text-center" }, 
        'Tell other parents about Tiny Tracker!'
      )
    ),

    // Account Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Account'),
      React.createElement('div', { className: "space-y-3" },
        React.createElement('div', { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-medium text-gray-800" }, user.displayName || 'User'),
            React.createElement('div', { className: "text-xs text-gray-500" }, user.email)
          ),
          user.photoURL &&
            React.createElement('img', {
              src: user.photoURL,
              alt: user.displayName,
              className: "w-10 h-10 rounded-full"
            })
        ),
        React.createElement('button', {
          onClick: handleSignOut,
          className: "w-full bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition"
        }, 'Sign Out')
      )
    ),
    
    // Info Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-3" }, 'About'),
      React.createElement('div', { className: "space-y-2 text-sm text-gray-600" },
        React.createElement('p', null, 'Tiny Tracker helps you track your baby\'s feeding journey with ease.'),
        React.createElement('p', null, '💡 Tip: Baby settings like weight and target are in the Family tab!')
      )
    )
  );
};

// ========================================
// TINY TRACKER V4.1 - PART 8
// SVG Icons & Render (with Menu/Hamburger icon for settings)
// ========================================

// Edit icon
const Edit2 = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
);

// Check icon
const Check = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M20 6 9 17l-5-5" })
);

// X (close) icon
const X = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M18 6 6 18" }),
  React.createElement('path', { d: "m6 6 12 12" })
);

// Chevron left
const ChevronLeft = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m15 18-6-6 6-6" })
);

// Chevron right
const ChevronRight = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m9 18 6-6-6-6" })
);

// Clock icon
const Clock = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
  React.createElement('polyline', { points: "12 6 12 12 16 14" })
);

// Plus icon
const Plus = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M5 12h14" }),
  React.createElement('path', { d: "M12 5v14" })
);

// Camera icon (for baby photo)
const Camera = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }),
  React.createElement('circle', { cx: "12", cy: "13", r: "4" })
);

// UserPlus icon (for invite)
const UserPlus = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
  React.createElement('circle', { cx: "9", cy: "7", r: "4" }),
  React.createElement('line', { x1: "19", x2: "19", y1: "8", y2: "14" }),
  React.createElement('line', { x1: "22", x2: "16", y1: "11", y2: "11" })
);

// Send icon (for chat)
const Send = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m22 2-7 20-4-9-9-4Z" }),
  React.createElement('path', { d: "M22 2 11 13" })
);

// Navigation Icons

// BarChart (Tracker tab)
const BarChart = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('line', { x1: "12", y1: "20", x2: "12", y2: "10" }),
  React.createElement('line', { x1: "18", y1: "20", x2: "18", y2: "4" }),
  React.createElement('line', { x1: "6", y1: "20", x2: "6", y2: "16" })
);

// TrendingUp (Analytics tab)
const TrendingUp = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('polyline', { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
  React.createElement('polyline', { points: "17 6 23 6 23 12" })
);

// MessageCircle (AI Chat tab)
const MessageCircle = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" })
);

// Users (Family tab)
const Users = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
  React.createElement('circle', { cx: "9", cy: "7", r: "4" }),
  React.createElement('path', { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
  React.createElement('path', { d: "M16 3.13a4 4 0 0 1 0 7.75" })
);

// Menu/Hamburger (Settings tab)
const Menu = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('line', { x1: "4", y1: "12", x2: "20", y2: "12" }),
  React.createElement('line', { x1: "4", y1: "6", x2: "20", y2: "6" }),
  React.createElement('line', { x1: "4", y1: "18", x2: "20", y2: "18" })
);

// ========================================
// SET THEME COLOR FOR MOBILE BROWSER
// ========================================

const metaThemeColor = document.querySelector('meta[name="theme-color"]');
if (metaThemeColor) {
  metaThemeColor.setAttribute('content', '#E0E7FF');
} else {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#E0E7FF';
  document.head.appendChild(meta);
}

// ========================================
// RENDER APP
// ========================================

ReactDOM.render(React.createElement(App), document.getElementById('root'));

// ========================================
// TINY TRACKER V4.1 - PART 9
// AI Chat Tab - iMessage Style
// ========================================

// AI Chat Tab - iMessage Style
const AIChatTab = ({ user, kidId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = React.useRef(null);
  const messagesContainerRef = React.useRef(null);

  useEffect(() => {
    loadConversation();
  }, [kidId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!initializing) {
      scrollToBottom();
    }
  }, [initializing]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      // wait for layout to settle then jump to bottom
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 0);
    }
  };

  const loadConversation = async () => {
    if (!kidId) return;
    setInitializing(true);
    try {
      const conversation = await firestoreStorage.getConversation();
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
    setInitializing(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      await firestoreStorage.saveMessage(userMessage);
      const aiResponse = await getAIResponse(input.trim(), kidId);

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await firestoreStorage.saveMessage(assistantMessage);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const handleClearConversation = async () => {
    if (!confirm('Clear all conversation history?')) return;
    try {
      await firestoreStorage.clearConversation();
      setMessages([]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const suggestedQuestions = [
    'How much should my baby be eating?',
    'Is cluster feeding normal?',
    'Why is my baby eating less today?',
    "What\'s a normal feeding schedule?"
  ];

  if (initializing) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement(
        'div',
        { className: 'text-gray-600' },
        'Loading conversation.'
      )
    );
  }

  return React.createElement(
    'div',
    {
      className: 'flex flex-col',
      style: { height: 'calc(100vh - 160px)' } // viewport minus header + nav
    },

    // Top row – just Clear button on the right
    React.createElement(
      'div',
      { className: 'flex justify-end px-4 pt-2 pb-1' },
      messages.length > 0 &&
        React.createElement(
          'button',
          {
            onClick: handleClearConversation,
            className: 'text-[11px] text-gray-400 hover:text-red-500'
          },
          'Clear'
        )
    ),

    // Messages area
    React.createElement(
      'div',
      {
        ref: messagesContainerRef,
        className: 'flex-1 overflow-y-auto px-4 py-3 space-y-3',
        style: { minHeight: 0 }
      },

      // Empty-state intro + suggestions
      messages.length === 0 &&
        React.createElement(
          React.Fragment,
          null,

          // Intro bubble
          React.createElement(
            'div',
            { className: 'flex justify-start' },
            React.createElement(
              'div',
              {
                className:
                  'max-w-[75%] bg-gray-200 rounded-2xl px-4 py-3'
              },
              React.createElement(
                'div',
                {
                  className:
                    'font-semibold text-sm text-gray-700 mb-1'
                },
                'Tiny Tracker'
              ),
              React.createElement(
                'div',
                { className: 'text-gray-900' },
                "Hi! I can help you understand your baby's feeding patterns. Ask me anything!"
              )
            )
          ),

          // Suggested questions
          React.createElement(
            'div',
            { className: 'flex justify-start mt-2' },
            React.createElement(
              'div',
              { className: 'max-w-[75%] space-y-2' },
              React.createElement(
                'div',
                {
                  className:
                    'text-xs text-gray-500 px-2 mb-1'
                },
                'Try asking:'
              ),
              suggestedQuestions.map((q, i) =>
                React.createElement(
                  'button',
                  {
                    key: i,
                    onClick: () => setInput(q),
                    className:
                      'block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 transition'
                  },
                  q
                )
              )
            )
          )
        ),

      // Conversation messages
      messages.map((message, index) =>
        React.createElement(
          'div',
          {
            key: index,
            className:
              'flex ' +
              (message.role === 'user'
                ? 'justify-end'
                : 'justify-start')
          },
          React.createElement(
            'div',
            {
              className:
                'max-w-[75%] rounded-2xl px-4 py-3 ' +
                (message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : message.error
                  ? 'bg-red-100 text-red-900'
                  : 'bg-gray-200 text-gray-900')
            },
            message.role === 'assistant' &&
              !message.error &&
              React.createElement(
                'div',
                {
                  className:
                    'font-semibold text-sm text-gray-700 mb-1'
                },
                'Tiny Tracker'
              ),
            React.createElement(
              'div',
              {
                className:
                  'whitespace-pre-wrap text-[15px]'
              },
              message.content
            ),
            React.createElement(
              'div',
              {
                className:
                  'text-[11px] mt-1 ' +
                  (message.role === 'user'
                    ? 'text-indigo-200'
                    : 'text-gray-500')
              },
              formatTimestamp(message.timestamp)
            )
          )
        )
      ),

      // Loading indicator
      loading &&
        React.createElement(
          'div',
          { className: 'flex justify-start' },
          React.createElement(
            'div',
            {
              className:
                'bg-gray-200 rounded-2xl px-4 py-3'
            },
            React.createElement(
              'div',
              { className: 'flex gap-1' },
              React.createElement('div', {
                className:
                  'w-2 h-2 bg-gray-400 rounded-full animate-bounce',
                style: { animationDelay: '0ms' }
              }),
              React.createElement('div', {
                className:
                  'w-2 h-2 bg-gray-400 rounded-full animate-bounce',
                style: { animationDelay: '150ms' }
              }),
              React.createElement('div', {
                className:
                  'w-2 h-2 bg-gray-400 rounded-full animate-bounce',
                style: { animationDelay: '300ms' }
              })
            )
          )
        ),

      React.createElement('div', { ref: messagesEndRef })
    ),

    // Input area
    React.createElement(
      'div',
      {
        className: 'px-4 pb-4 pt-2',
        style: { backgroundColor: '#E0E7FF' }
      },
      React.createElement(
        'div',
        {
          className:
            'flex items-center gap-2 bg-white rounded-2xl px-3 py-1.5 border border-gray-200'
        },
        React.createElement('textarea', {
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyPress: (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          },
          placeholder: 'Message',
          disabled: loading,
          rows: 1,
          className:
            'flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-[15px] disabled:opacity-50',
          style: { maxHeight: '100px' }
        }),
        React.createElement(
          'button',
          {
            onClick: handleSend,
            disabled: loading || !input.trim(),
            className:
              'flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center disabled:opacity-30 transition hover:bg-indigo-700'
          },
          React.createElement(
            'svg',
            {
              className: 'w-4 h-4 text-white',
              fill: 'currentColor',
              viewBox: '0 0 24 24'
            },
            React.createElement('path', {
              d: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'
            })
          )
        )
      )
    )
  );
};

// ========================================
// TINY TRACKER V4.3 - PART 10 (GEMINI VERSION)
// AI Integration via Cloudflare Worker + Gemini
// Conversational, analytical, non-creepy
// ========================================

// Optional: keep replies compact (used at end of getAIResponse)
const trimAIAnswer = (text) => {
  if (!text || typeof text !== "string") return text;

  // Split into paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // At most 3 short paragraphs
  let trimmed = paragraphs.slice(0, 3).join("\n\n");

  const MAX_CHARS = 650;
  if (trimmed.length > MAX_CHARS) {
    trimmed = trimmed.slice(0, MAX_CHARS);
    const lastBreak =
      Math.max(trimmed.lastIndexOf("."), trimmed.lastIndexOf("\n"), trimmed.lastIndexOf(" "));
    if (lastBreak > 0) trimmed = trimmed.slice(0, lastBreak + 1);
    trimmed = trimmed.trim() + "…";
  }

  return trimmed;
};

// ----------------------------------------
// 1) Call Cloudflare Worker → Gemini
// ----------------------------------------
const getAIResponse = async (question, kidId) => {
  try {
    const context = await buildAIContext(kidId, question);

    const response = await fetch("https://tiny-tracker-ai.adamlebowski.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: context.fullPrompt })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Worker error:", response.status, text);
      throw new Error("AI backend error");
    }

    const data = await response.json();

    if (data && data.error) {
      console.error("AI backend error payload:", data);
      throw new Error("AI backend error: " + data.error);
    }

    const candidate = data?.candidates?.[0];
    console.log("Gemini raw candidate:", candidate);

    let answer = "";

    if (candidate?.content?.parts) {
      answer = candidate.content.parts.map((p) => p.text || "").join(" ").trim();
    } else if (candidate?.parts) {
      answer = candidate.parts.map((p) => p.text || "").join(" ").trim();
    } else if (typeof candidate?.output_text === "string") {
      answer = candidate.output_text.trim();
    } else if (typeof candidate?.text === "string") {
      answer = candidate.text.trim();
    }

    if (!answer) {
      answer =
        "Tiny Tracker got an unexpected response from Gemini:\n\n" +
        JSON.stringify(candidate || data, null, 2);
    }

    return trimAIAnswer(answer);
  } catch (error) {
    console.error("🔴 AI Error:", error);
    throw error;
  }
};

// ----------------------------------------
// 2) Analytics helpers (no labels)
// ----------------------------------------

const getHour = (ts) => new Date(ts).getHours();

const getMinutes = (ts) => {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
};

const trendSlope = (arr) => {
  if (!arr || arr.length < 3) return 0;
  const n = arr.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += arr[i];
    sumXY += i * arr[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
};

// High-level advanced stats over ALL feedings (no “grazer/back-loader” labels)
const analyzeAdvancedFeedingPatterns = (feedings) => {
  if (!feedings || feedings.length === 0) {
    return {
      daysTracked: 0,
      totalFeedings: 0,
      avgDailyIntake: 0,
      avgIntervalHours: 0,
      morningPercent: 0,
      afternoonPercent: 0,
      eveningPercent: 0,
      nightPercent: 0,
      midDayDriftDirection: "unknown",
      midDayDriftMinutesPerDay: 0,
      last3DailyAvg: null,
      prev7DailyAvg: null,
      intakeSlope: 0
    };
  }

  const sorted = [...feedings].sort((a, b) => a.timestamp - b.timestamp);
  const timestamps = sorted.map((f) => f.timestamp);

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const daysTracked = Math.max(
    1,
    Math.ceil((last - first) / (1000 * 60 * 60 * 24))
  );

  // ---- daily totals ----
  const dailyTotals = {};
  sorted.forEach((f) => {
    const d = new Date(f.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    dailyTotals[key] = (dailyTotals[key] || 0) + f.ounces;
  });
  const dayKeys = Object.keys(dailyTotals).sort();
  const dailyArray = dayKeys.map((k) => dailyTotals[k]);
  const totalIntake = dailyArray.reduce((a, b) => a + b, 0);
  const avgDailyIntake = totalIntake / dailyArray.length;

  // intake trend (slope across days)
  const intakeSlope = trendSlope(dailyArray);

  // last 3 vs previous 7
  let last3DailyAvg = null;
  let prev7DailyAvg = null;
  if (dailyArray.length >= 3) {
    const last3 = dailyArray.slice(-3);
    last3DailyAvg = last3.reduce((a, b) => a + b, 0) / last3.length;
  }
  if (dailyArray.length >= 10) {
    const prev7 = dailyArray.slice(-10, -3);
    prev7DailyAvg = prev7.reduce((a, b) => a + b, 0) / prev7.length;
  }

  // ---- intervals ----
  let intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffHours =
      (sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60);
    intervals.push(diffHours);
  }
  const avgIntervalHours =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

  // ---- time-of-day percentages ----
  let morning = 0,
    afternoon = 0,
    evening = 0,
    night = 0;
  sorted.forEach((f) => {
    const h = getHour(f.timestamp);
    if (h >= 6 && h < 12) morning += f.ounces;
    else if (h >= 12 && h < 18) afternoon += f.ounces;
    else if (h >= 18 && h < 22) evening += f.ounces;
    else night += f.ounces; // 22–6 bucket
  });
  const totalOz = morning + afternoon + evening + night || 1; // avoid /0
  const morningPercent = (morning / totalOz) * 100;
  const afternoonPercent = (afternoon / totalOz) * 100;
  const eveningPercent = (evening / totalOz) * 100;
  const nightPercent = (night / totalOz) * 100;

  // ---- mid-day drift (approx) ----
  const midDayFeeds = sorted.filter((f) => {
    const h = getHour(f.timestamp);
    return h >= 11 && h <= 15;
  });

  let midDayDriftDirection = "unknown";
  let midDayDriftMinutesPerDay = 0;

  if (midDayFeeds.length > 3) {
    // group mid-day feed time by day, take average minutes that day
    const perDay = {};
    midDayFeeds.forEach((f) => {
      const d = new Date(f.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!perDay[key]) perDay[key] = [];
      perDay[key].push(getMinutes(f.timestamp));
    });
    const perDayKeys = Object.keys(perDay).sort();
    const avgMinutesSeries = perDayKeys.map((k) => {
      const arr = perDay[k];
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    const slope = trendSlope(avgMinutesSeries); // minutes per "step" (day)
    midDayDriftMinutesPerDay = slope;
    if (slope > 2) midDayDriftDirection = "later";
    else if (slope < -2) midDayDriftDirection = "earlier";
    else midDayDriftDirection = "stable";
  }

  return {
    daysTracked,
    totalFeedings: sorted.length,
    avgDailyIntake,
    avgIntervalHours,
    morningPercent,
    afternoonPercent,
    eveningPercent,
    nightPercent,
    midDayDriftDirection,
    midDayDriftMinutesPerDay,
    last3DailyAvg,
    prev7DailyAvg,
    intakeSlope
  };
};

// Format last 7 days of feedings as a compact log Gemini can read
const formatRecentFeedingLog = (feedings) => {
  if (!feedings || feedings.length === 0) return "No recent feedings logged.";

  const sorted = [...feedings].sort((a, b) => a.timestamp - b.timestamp);

  const lines = sorted.map((f) => {
    const d = new Date(f.timestamp);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    return `${dateStr} ${timeStr} — ${f.ounces.toFixed(1)} oz`;
  });

  return lines.join("\n");
};

// ----------------------------------------
// 3) Build AI context (prompt)
// ----------------------------------------
const buildAIContext = async (kidId, question) => {
  const babyData = await firestoreStorage.getKidData();
  const settings = await firestoreStorage.getSettings();
  const allFeedings = await firestoreStorage.getAllFeedings();
  const recentFeedings = await firestoreStorage.getFeedingsLastNDays(7);
  const conversation = await firestoreStorage.getConversation();

  const ageInMonths = calculateAgeInMonths(babyData.birthDate);
  const ageInDays = Math.floor(
    (Date.now() - babyData.birthDate) / (1000 * 60 * 60 * 24)
  );

  const advancedStats = analyzeAdvancedFeedingPatterns(allFeedings);
  const recentLog = formatRecentFeedingLog(recentFeedings);

  // recent conversation (for follow-ups)
  let conversationHistory = "";
  if (conversation && conversation.messages) {
    const recentMessages = conversation.messages.slice(-10);
    conversationHistory = "\n\nPREVIOUS CONVERSATION:\n";
    recentMessages.forEach((msg) => {
      conversationHistory += `${
        msg.role === "user" ? "Parent" : "AI"
      }: ${msg.content}\n\n`;
    });
  }

  const fullPrompt = `
You are one member of a small group chat with a tired but very loving parent.
You are here ONLY to help them understand their baby's feeding patterns and make practical decisions.

## Tone
- Sound like a smart, observant friend in the group chat.
- Casual and human, but not over-familiar.
- NO pet names or terms of endearment (no "love", "mama", etc.).
- Do NOT start with greetings ("hey", "hi", etc.). Start directly with the point.
- Short answers: 1–2 short paragraphs max.

## How to answer
1. FIRST, answer the parent's literal question as directly and concretely as possible.
   - If they ask "how much did the baby eat at X time on Y day", use the detailed log to give the exact amount and closest time.
   - Example style: "On Dec 5 around 6:40 pm, Levi had 3.0 oz."
2. THEN, if it's relevant, ask a follow up question that could lead to more data questions. If the reason the parent asked is strongly implied you can improvise. If it's unclear, you can ask why the parent asked the question. But if it seems like amatter of fact question, you can leave it at that. 
   - DON'T answer a question the parent didn't ask or volunteer more information based on assumptions.
3. If the parent asks for insights deliver insights that are interesting, and not obvious just by looking at the basic data.
4. If the parent asks for advice focus on suggestions informed by the data.
   - Especially for questions about sleep stretches, feeding schedules, or shifting calories earlier/later in the day.

## Hard rules
- Anchor everything in the actual numbers and times provided below.
- Do NOT invent labels or types like "grazer" or "back-loader".
- Do NOT diagnose medical conditions or give medical instructions.
  If something seems concerning, say: "You might want to check this with your pediatrician."
- Keep language simple, concrete, and non-dramatic.

## Baby snapshot
- Name: ${babyData.name || "Baby"}
- Age: ${ageInMonths} month${ageInMonths !== 1 ? "s" : ""} (${ageInDays} days)
- Current weight: ${settings?.babyWeight || "not set"} lbs
- Target daily intake (based on settings): ${
    settings?.babyWeight && settings?.multiplier
      ? (settings.babyWeight * settings.multiplier).toFixed(1)
      : "not set"
  } oz/day

## Long-term feeding patterns (all data)
- Days tracked: ${advancedStats.daysTracked}
- Total feedings logged: ${advancedStats.totalFeedings}
- Average daily intake: ${advancedStats.avgDailyIntake.toFixed(1)} oz
- Average interval between feeds: ${advancedStats.avgIntervalHours.toFixed(2)} hours
- Intake by time of day (approx % of total):
  • Morning (6–12): ${advancedStats.morningPercent.toFixed(0)}%
  • Afternoon (12–18): ${advancedStats.afternoonPercent.toFixed(0)}%
  • Evening (18–22): ${advancedStats.eveningPercent.toFixed(0)}%
  • Night (22–6): ${advancedStats.nightPercent.toFixed(0)}%
- Mid-day feed timing over days: ${advancedStats.midDayDriftDirection}
  (about ${advancedStats.midDayDriftMinutesPerDay.toFixed(1)} minutes per day)
- 3-day vs earlier trend:
  ${
    advancedStats.last3DailyAvg
      ? `Last 3-day average: ${advancedStats.last3DailyAvg.toFixed(
          1
        )} oz/day` + (advancedStats.prev7DailyAvg
          ? `; earlier 7-day average: ${advancedStats.prev7DailyAvg.toFixed(
              1
            )} oz/day`
          : "")
      : "Not enough data for 3-day vs earlier trend."
  }
- Overall intake slope over time: ${advancedStats.intakeSlope.toFixed(3)} (positive = trending up)

## Detailed feeding log (last 7 days)
Use this for any time-specific questions.
${recentLog}

${conversationHistory}

Parent's latest question:
${question}

Remember:
- Answer the specific question first, as clearly and concretely as possible.
- Then optionally add one short, helpful pattern insight + suggestion.
- Keep it brief, like a good friend replying in a chat.
`;

  return {
    fullPrompt,
    messages: [] // Not used for Gemini (we put everything into fullPrompt)
  };
};

// ----------------------------------------
// 4) Age helper
// ----------------------------------------
const calculateAgeInMonths = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
};
