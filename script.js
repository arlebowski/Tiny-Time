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

const getFamilyMembers = async (kidId) => {
  const kidDoc = await db.collection('kids').doc(kidId).get();
  if (!kidDoc.exists) return [];
  
  const members = kidDoc.data().members || [];
  const memberDetails = await Promise.all(
    members.map(async (uid) => {
      const user = auth.currentUser?.uid === uid ? auth.currentUser : null;
      return {
        uid,
        email: user?.email || 'Family Member',
        photoURL: user?.photoURL || null
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
  
  getFeedings: async function() {
    if (!this.currentKidId) return [];
    const snapshot = await db.collection('kids').doc(this.currentKidId)
      .collection('feedings')
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
// TINY TRACKER V4.1 - PART 3
// Main App with Bottom Navigation (Clean colors, simpler shadows)
// ========================================

const MainApp = ({ user, kidId }) => {
  const [activeTab, setActiveTab] = useState('tracker');
  const [hasUnreadAI, setHasUnreadAI] = useState(false);
  
  useEffect(() => {
    document.title = 'Tiny Tracker';
  }, []);
  
  // Check for unread AI messages when not on chat tab
  useEffect(() => {
    if (activeTab !== 'chat') {
      // Simple check: if conversation exists and last message was from AI
      checkUnreadMessages();
    } else {
      setHasUnreadAI(false);
    }
  }, [activeTab, kidId]);
  
  const checkUnreadMessages = async () => {
    try {
      const conversation = await firestoreStorage.getConversation();
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        // If last message was from AI and we're not on chat tab, show badge
        if (lastMessage.role === 'assistant') {
          setHasUnreadAI(true);
        }
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  };
  
  return React.createElement('div', { 
    className: "min-h-screen pb-24",
    style: { backgroundColor: '#E0E7FF' } // Single consistent background color
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
    
    // Bottom Navigation - simpler shadow like Instagram
    React.createElement('div', { 
      className: "fixed bottom-0 left-0 right-0 z-50 mb-2",
      style: { 
        backgroundColor: '#E0E7FF',
        boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)' // Subtle top shadow only
      }
    },
      React.createElement('div', { 
        className: "max-w-2xl mx-auto flex items-center justify-around px-4 py-2"
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
      );
      
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
// TINY TRACKER V3.1 - PART 6
// Family Tab - with functional baby photo upload
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

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        
        // Save to Firestore
        await firestoreStorage.updateKid({ photoURL: base64 });
        setBabyPhotoUrl(base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
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
    if (weight > 0) {
      await firestoreStorage.setSettings({ babyWeight: weight });
      setSettings({ ...settings, babyWeight: weight });
      setEditingWeight(false);
    }
  };

  const handleUpdateMultiplier = async () => {
    const mult = parseFloat(tempMultiplier);
    if (mult > 0) {
      await firestoreStorage.setSettings({ multiplier: mult });
      setSettings({ ...settings, multiplier: mult });
      setEditingMultiplier(false);
    }
  };

  const handleUpdateUserName = async () => {
    if (!tempUserName.trim()) return;
    try {
      await updateUserProfile(user.uid, { displayName: tempUserName.trim() });
      setEditingUserName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const formatBirthDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatDateForInput = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  const getAge = (timestamp) => {
    if (!timestamp) return '';
    const birth = new Date(timestamp);
    const now = new Date();
    const diffMs = now - birth;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (days < 7) return `${days} days old`;
    if (days < 30) return `${Math.floor(days / 7)} weeks old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} old`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  const isOwner = kidData && kidData.ownerId === user.uid;

  if (loading) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { className: "text-gray-600" }, 'Loading...')
    );
  }

  return React.createElement('div', { className: "space-y-4" },
    // Baby Info Card
    kidData && React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, 'Baby Info'),
      React.createElement('div', { className: "space-y-4" },
        // Baby photo and name
        React.createElement('div', { className: "flex items-center gap-4" },
          React.createElement('div', { className: "relative" },
            React.createElement('div', { 
              className: "bg-indigo-100 rounded-full w-20 h-20 flex items-center justify-center overflow-hidden cursor-pointer",
              onClick: handlePhotoClick
            },
              babyPhotoUrl ?
                React.createElement('img', {
                  src: babyPhotoUrl,
                  alt: kidData.name || 'Baby',
                  className: "w-full h-full object-cover"
                })
              :
                React.createElement('span', { className: "text-4xl" }, '👶')
            ),
            React.createElement('button', {
              onClick: handlePhotoClick,
              className: "absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1.5 text-white hover:bg-indigo-700 transition shadow-lg",
              title: "Change photo"
            }, React.createElement(Camera, { className: "w-3 h-3" })),
            React.createElement('input', {
              ref: fileInputRef,
              type: "file",
              accept: "image/*",
              onChange: handlePhotoChange,
              style: { display: 'none' }
            })
          ),
          React.createElement('div', { className: "flex-1" },
            !editingName ?
              React.createElement('div', { className: "flex items-center gap-2" },
                React.createElement('span', { className: "text-2xl font-bold text-gray-800" }, kidData.name || 'Baby'),
                React.createElement('button', {
                  onClick: () => {
                    setTempBabyName(kidData.name || '');
                    setEditingName(true);
                  },
                  className: "text-indigo-600 hover:text-indigo-700"
                }, React.createElement(Edit2, { className: "w-4 h-4" }))
              )
            :
              React.createElement('div', { className: "flex items-center gap-2" },
                React.createElement('input', {
                  type: "text",
                  value: tempBabyName,
                  onChange: (e) => setTempBabyName(e.target.value),
                  className: "flex-1 px-3 py-1 text-lg border-2 border-indigo-300 rounded-lg"
                }),
                React.createElement('button', {
                  onClick: handleUpdateBabyName,
                  className: "text-green-600 hover:text-green-700"
                }, React.createElement(Check, { className: "w-5 h-5" })),
                React.createElement('button', {
                  onClick: () => setEditingName(false),
                  className: "text-gray-400 hover:text-gray-600"
                }, React.createElement(X, { className: "w-5 h-5" }))
              ),
            React.createElement('div', { className: "text-sm text-gray-500" }, getAge(kidData.birthDate))
          )
        ),
        
        // Birth date
        React.createElement('div', { className: "flex items-center justify-between p-3 bg-gray-50 rounded-xl" },
          React.createElement('span', { className: "text-sm font-medium text-gray-700" }, 'Birth Date'),
          !editingBirthDate ?
            React.createElement('button', {
              onClick: () => {
                setTempBirthDate(formatDateForInput(kidData.birthDate));
                setEditingBirthDate(true);
              },
              className: "flex items-center gap-2 text-sm text-gray-600"
            },
              formatBirthDate(kidData.birthDate),
              React.createElement(Edit2, { className: "w-4 h-4 text-indigo-600" })
            )
          :
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: "date",
                value: tempBirthDate,
                onChange: (e) => setTempBirthDate(e.target.value),
                className: "px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg"
              }),
              React.createElement('button', {
                onClick: handleUpdateBirthDate,
                className: "text-green-600 hover:text-green-700"
              }, React.createElement(Check, { className: "w-4 h-4" })),
              React.createElement('button', {
                onClick: () => setEditingBirthDate(false),
                className: "text-gray-400 hover:text-gray-600"
              }, React.createElement(X, { className: "w-4 h-4" }))
            )
        ),
        
        // Baby weight
        React.createElement('div', { className: "flex items-center justify-between p-3 bg-gray-50 rounded-xl" },
          React.createElement('span', { className: "text-sm font-medium text-gray-700" }, "Current Weight"),
          !editingWeight ?
            React.createElement('button', {
              onClick: () => {
                setTempWeight(settings.babyWeight?.toString() || '');
                setEditingWeight(true);
              },
              className: "flex items-center gap-2 text-sm text-gray-600"
            },
              settings.babyWeight ? `${settings.babyWeight} lbs` : 'Not set',
              React.createElement(Edit2, { className: "w-4 h-4 text-indigo-600" })
            )
          :
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: "number",
                step: "0.1",
                value: tempWeight,
                onChange: (e) => setTempWeight(e.target.value),
                placeholder: "Weight",
                className: "w-20 px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg"
              }),
              React.createElement('span', { className: "text-sm text-gray-600" }, 'lbs'),
              React.createElement('button', {
                onClick: handleUpdateWeight,
                className: "text-green-600 hover:text-green-700"
              }, React.createElement(Check, { className: "w-4 h-4" })),
              React.createElement('button', {
                onClick: () => setEditingWeight(false),
                className: "text-gray-400 hover:text-gray-600"
              }, React.createElement(X, { className: "w-4 h-4" }))
            )
        ),
        
        // Target multiplier
        React.createElement('div', { className: "flex items-center justify-between p-3 bg-gray-50 rounded-xl" },
          React.createElement('span', { className: "text-sm font-medium text-gray-700" }, "Target Multiplier (oz/lb)"),
          !editingMultiplier ?
            React.createElement('button', {
              onClick: () => {
                setTempMultiplier(settings.multiplier?.toString() || '2.5');
                setEditingMultiplier(true);
              },
              className: "flex items-center gap-2 text-sm text-gray-600"
            },
              `${settings.multiplier}x`,
              React.createElement(Edit2, { className: "w-4 h-4 text-indigo-600" })
            )
          :
            React.createElement('div', { className: "flex items-center gap-2" },
              React.createElement('input', {
                type: "number",
                step: "0.1",
                value: tempMultiplier,
                onChange: (e) => setTempMultiplier(e.target.value),
                className: "w-20 px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg"
              }),
              React.createElement('button', {
                onClick: handleUpdateMultiplier,
                className: "text-green-600 hover:text-green-700"
              }, React.createElement(Check, { className: "w-4 h-4" })),
              React.createElement('button', {
                onClick: () => setEditingMultiplier(false),
                className: "text-gray-400 hover:text-gray-600"
              }, React.createElement(X, { className: "w-4 h-4" }))
            )
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
                React.createElement('div', { className: "w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center" },
                  React.createElement('span', { className: "text-xl" }, '👤')
                )
            ),
            React.createElement('div', { className: "flex-1" },
              member.uid === user.uid && editingUserName ?
                React.createElement('div', { className: "flex gap-2" },
                  React.createElement('input', {
                    type: "text",
                    value: tempUserName,
                    onChange: (e) => setTempUserName(e.target.value),
                    placeholder: "Your name",
                    className: "flex-1 px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg"
                  }),
                  React.createElement('button', {
                    onClick: handleUpdateUserName,
                    className: "text-green-600 hover:text-green-700"
                  }, React.createElement(Check, { className: "w-4 h-4" })),
                  React.createElement('button', {
                    onClick: () => setEditingUserName(false),
                    className: "text-gray-400 hover:text-gray-600"
                  }, React.createElement(X, { className: "w-4 h-4" }))
                )
              :
                React.createElement('div', null,
                  React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('span', { className: "font-medium text-gray-800" }, 
                      member.displayName || member.email.split('@')[0]
                    ),
                    member.uid === kidData?.ownerId && 
                      React.createElement('span', { className: "text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded" }, 'Owner'),
                    member.uid === user.uid &&
                      React.createElement('button', {
                        onClick: () => {
                          setTempUserName(member.displayName || '');
                          setEditingUserName(true);
                        },
                        className: "text-indigo-600 hover:text-indigo-700"
                      }, React.createElement(Edit2, { className: "w-3 h-3" }))
                  ),
                  React.createElement('div', { className: "text-sm text-gray-500" }, member.email)
                )
            ),
            isOwner && member.uid !== user.uid &&
              React.createElement('button', {
                onClick: () => handleRemoveMember(member.uid),
                className: "text-red-400 hover:text-red-600 text-sm font-medium"
              }, 'Remove')
          )
        )
      ),

      !showInvite ?
        React.createElement('button', {
          onClick: handleCreateInvite,
          className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
        }, '+ Invite Partner')
      :
        React.createElement('div', { className: "space-y-2" },
          React.createElement('div', { className: "text-xs text-gray-600 mb-2" }, 'Share this link with your partner:'),
          React.createElement('div', { className: "flex gap-2" },
            React.createElement('input', {
              type: "text",
              value: inviteLink,
              readOnly: true,
              className: "flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg"
            }),
            React.createElement('button', {
              onClick: handleCopyLink,
              className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
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

const AIChatTab = ({ user, kidId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = React.useRef(null);
  
  useEffect(() => {
    loadConversation();
  }, [kidId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  
  const suggestedQuestions = [
    'How much should my baby be eating?',
    'Is cluster feeding normal?',
    'Why is my baby eating less today?',
    'What\'s a normal feeding schedule?'
  ];
  
  if (initializing) {
    return React.createElement('div', { className: "flex items-center justify-center py-12" },
      React.createElement('div', { className: "text-gray-600" }, 'Loading conversation...')
    );
  }
  
  return React.createElement('div', { 
    className: "flex flex-col",
    style: { height: 'calc(100vh - 10rem)' }
  },
    // Messages Area - looks like iMessage
    React.createElement('div', { 
      className: "flex-1 overflow-y-auto px-4 py-4 space-y-3"
    },
      // First message if empty
      messages.length === 0 && React.createElement(React.Fragment, null,
        // Initial AI message
        React.createElement('div', { className: "flex justify-start" },
          React.createElement('div', { 
            className: "max-w-[75%] bg-gray-200 rounded-2xl px-4 py-3"
          },
            React.createElement('div', { className: "font-semibold text-sm text-gray-700 mb-1" }, 'Tiny Tracker'),
            React.createElement('div', { className: "text-gray-900" }, 
              'Hi! I can help you understand your baby\'s feeding patterns. Ask me anything!'
            )
          )
        ),
        
        // Suggested questions
        React.createElement('div', { className: "flex justify-start mt-2" },
          React.createElement('div', { className: "max-w-[75%] space-y-2" },
            React.createElement('div', { className: "text-xs text-gray-500 px-2 mb-1" }, 'Try asking:'),
            suggestedQuestions.map((q, i) =>
              React.createElement('button', {
                key: i,
                onClick: () => setInput(q),
                className: "block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 transition"
              }, q)
            )
          )
        )
      ),
      
      // Conversation messages
      messages.map((message, index) =>
        React.createElement('div', {
          key: index,
          className: `flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`
        },
          React.createElement('div', {
            className: `max-w-[75%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-indigo-600 text-white'
                : message.error
                ? 'bg-red-100 text-red-900'
                : 'bg-gray-200 text-gray-900'
            }`
          },
            message.role === 'assistant' && !message.error &&
              React.createElement('div', { className: "font-semibold text-sm text-gray-700 mb-1" }, 'Tiny Tracker'),
            React.createElement('div', { className: "whitespace-pre-wrap text-[15px]" }, message.content),
            React.createElement('div', {
              className: `text-[11px] mt-1 ${
                message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`
            }, formatTimestamp(message.timestamp))
          )
        )
      ),
      
      // Loading indicator
      loading && React.createElement('div', { className: "flex justify-start" },
        React.createElement('div', { className: "bg-gray-200 rounded-2xl px-4 py-3" },
          React.createElement('div', { className: "flex gap-1" },
            React.createElement('div', { className: "w-2 h-2 bg-gray-400 rounded-full animate-bounce", style: { animationDelay: '0ms' } }),
            React.createElement('div', { className: "w-2 h-2 bg-gray-400 rounded-full animate-bounce", style: { animationDelay: '150ms' } }),
            React.createElement('div', { className: "w-2 h-2 bg-gray-400 rounded-full animate-bounce", style: { animationDelay: '300ms' } })
          )
        )
      ),
      
      React.createElement('div', { ref: messagesEndRef })
    ),
    
    // Input Area - iMessage style
    React.createElement('div', { 
      className: "px-4 pb-4 pt-2",
      style: { backgroundColor: '#E0E7FF' }
    },
      React.createElement('div', { 
        className: "flex items-end gap-2 bg-white rounded-full px-3 py-1.5 border border-gray-200"
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
          placeholder: "Message",
          disabled: loading,
          rows: 1,
          className: "flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-[15px] disabled:opacity-50",
          style: { maxHeight: '100px' }
        }),
        React.createElement('button', {
          onClick: handleSend,
          disabled: loading || !input.trim(),
          className: "flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center disabled:opacity-30 transition hover:bg-indigo-700"
        },
          React.createElement('svg', {
            className: "w-4 h-4 text-white",
            fill: "currentColor",
            viewBox: "0 0 24 24"
          },
            React.createElement('path', {
              d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
            })
          )
        )
      )
    )
  );
};

// ========================================
// TINY TRACKER V4 - PART 10 (GEMINI VERSION)
// AI Integration - Google Gemini API (FREE!)
// ========================================

const getAIResponse = async (question, kidId) => {
  try {
    // Build context from baby's data
    const context = await buildAIContext(kidId, question);
    
    // Call Gemini API (FREE!)
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context.fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('AI request failed');
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
};

const buildAIContext = async (kidId, question) => {
  // Get baby's data
  const babyData = await firestoreStorage.getKidData();
  const settings = await firestoreStorage.getSettings();
  const recentFeedings = await firestoreStorage.getFeedingsLastNDays(7);
  const conversation = await firestoreStorage.getConversation();
  
  // Calculate age
  const ageInMonths = calculateAgeInMonths(babyData.birthDate);
  const ageInDays = Math.floor((Date.now() - babyData.birthDate) / (1000 * 60 * 60 * 24));
  
  // Analyze recent feedings
  const feedingAnalysis = analyzeFeedingPatterns(recentFeedings);
  
  // Build conversation history
  let conversationHistory = '';
  if (conversation && conversation.messages) {
    const recentMessages = conversation.messages.slice(-10);
    conversationHistory = '\n\nPREVIOUS CONVERSATION:\n';
    recentMessages.forEach(msg => {
      conversationHistory += `${msg.role === 'user' ? 'Parent' : 'AI'}: ${msg.content}\n\n`;
    });
  }
  
  // Build full prompt (Gemini doesn't have separate system prompt)
  const fullPrompt = `You are an AI assistant for parents tracking their baby's feeding patterns. You have access to detailed data about their baby and should provide helpful, personalized insights.

BABY'S INFORMATION:
- Name: ${babyData.name || 'Baby'}
- Age: ${ageInMonths} month${ageInMonths !== 1 ? 's' : ''} old (${ageInDays} days)
- Current weight: ${settings?.babyWeight || 'not set'} lbs
- Target daily intake: ${settings?.babyWeight && settings?.multiplier ? (settings.babyWeight * settings.multiplier).toFixed(1) : 'not set'} oz/day

RECENT FEEDING PATTERNS (Last 7 days):
- Total feedings: ${feedingAnalysis.totalFeedings}
- Average per day: ${feedingAnalysis.avgPerDay.toFixed(1)} feedings
- Average intake per feeding: ${feedingAnalysis.avgPerFeeding.toFixed(1)} oz
- Total daily average: ${feedingAnalysis.avgDailyIntake.toFixed(1)} oz
- Average time between feedings: ${feedingAnalysis.avgInterval.toFixed(1)} hours
- Night feedings (10pm-6am): ${feedingAnalysis.nightFeedings} (${feedingAnalysis.nightIntakePercent.toFixed(0)}% of daily intake)

TODAY'S INTAKE:
- Total so far: ${feedingAnalysis.todayTotal.toFixed(1)} oz
- Feedings so far: ${feedingAnalysis.todayCount}
- Compared to 7-day average: ${feedingAnalysis.todayVsAvg > 0 ? '+' : ''}${feedingAnalysis.todayVsAvg.toFixed(1)} oz

IMPORTANT GUIDELINES:
1. Always reference specific data points from ${babyData.name}'s actual feeding patterns
2. Be conversational and supportive, not clinical
3. If you notice concerning patterns, suggest consulting a pediatrician
4. Remember context from previous messages in this conversation
5. Use phrases like "Looking at ${babyData.name}'s patterns..." or "Based on ${babyData.name}'s data..."
6. Never diagnose medical conditions - only provide informational insights
7. Keep responses concise but thorough (2-4 paragraphs)
8. If asked about aggregated data from other babies, acknowledge that feature is coming soon

You are speaking to ${babyData.name}'s parent. Be helpful, empathetic, and data-driven.
${conversationHistory}
Parent's Question: ${question}

Your Response:`;

  return {
    fullPrompt,
    messages: [] // Not used for Gemini
  };
};

const calculateAgeInMonths = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  return months;
};

const analyzeFeedingPatterns = (feedings) => {
  if (!feedings || feedings.length === 0) {
    return {
      totalFeedings: 0,
      avgPerDay: 0,
      avgPerFeeding: 0,
      avgDailyIntake: 0,
      avgInterval: 0,
      nightFeedings: 0,
      nightIntakePercent: 0,
      todayTotal: 0,
      todayCount: 0,
      todayVsAvg: 0
    };
  }
  
  const totalFeedings = feedings.length;
  const totalOunces = feedings.reduce((sum, f) => sum + f.ounces, 0);
  
  // Calculate days span
  const timestamps = feedings.map(f => f.timestamp);
  const firstDay = Math.min(...timestamps);
  const lastDay = Math.max(...timestamps);
  const daysSpan = Math.max(1, Math.ceil((lastDay - firstDay) / (1000 * 60 * 60 * 24)) + 1);
  
  // Today's feedings
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayFeedings = feedings.filter(f => f.timestamp >= todayStart.getTime());
  const todayTotal = todayFeedings.reduce((sum, f) => sum + f.ounces, 0);
  const todayCount = todayFeedings.length;
  
  // Night feedings (10pm - 6am)
  const nightFeedings = feedings.filter(f => {
    const hour = new Date(f.timestamp).getHours();
    return hour >= 22 || hour < 6;
  });
  const nightIntake = nightFeedings.reduce((sum, f) => sum + f.ounces, 0);
  
  // Calculate intervals
  let totalIntervalHours = 0;
  for (let i = 1; i < feedings.length; i++) {
    const intervalHours = (feedings[i].timestamp - feedings[i-1].timestamp) / (1000 * 60 * 60);
    totalIntervalHours += intervalHours;
  }
  
  const avgDailyIntake = totalOunces / daysSpan;
  
  return {
    totalFeedings,
    avgPerDay: totalFeedings / daysSpan,
    avgPerFeeding: totalOunces / totalFeedings,
    avgDailyIntake,
    avgInterval: totalIntervalHours / (totalFeedings - 1),
    nightFeedings: nightFeedings.length,
    nightIntakePercent: (nightIntake / totalOunces) * 100,
    todayTotal,
    todayCount,
    todayVsAvg: todayTotal - avgDailyIntake
  };
};
