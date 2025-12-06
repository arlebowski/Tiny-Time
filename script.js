// ========================================
// TINY TRACKER V4.3 - PART 1
// Config, Auth, Data Migration, Invites, Firestore Layer (Fixed Firebase loading)
// ========================================

// Wait for Firebase to load
const initApp = () => {
  const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, orderBy, limit, Timestamp } = window.firebaseModules;

  const firebaseConfig = {
    apiKey: "AIzaSyBUscvx-JB3lNWKVu9bPnYTBHVPvrndc_w",
    authDomain: "baby-feeding-tracker-978e6.firebaseapp.com",
    databaseURL: "https://baby-feeding-tracker-978e6-default-rtdb.firebaseio.com",
    projectId: "baby-feeding-tracker-978e6",
    storageBucket: "baby-feeding-tracker-978e6.firebasestorage.app",
    messagingSenderId: "775043948126",
    appId: "1:775043948126:web:28d8aefeea99cc7d25decf"
  };

  const app = initializeApp(firebaseConfig);
  window.auth = getAuth(app);
  window.db = getFirestore(app);
  window.GoogleAuthProvider = GoogleAuthProvider;
  window.signInWithPopup = signInWithPopup;
  window.onAuthStateChanged = onAuthStateChanged;
  window.signOut = signOut;
  window.firestoreDoc = doc;
  window.firestoreGetDoc = getDoc;
  window.firestoreSetDoc = setDoc;
  window.firestoreUpdateDoc = updateDoc;
  window.firestoreCollection = collection;
  window.firestoreQuery = query;
  window.firestoreWhere = where;
  window.firestoreGetDocs = getDocs;
  window.firestoreDeleteDoc = deleteDoc;
  window.firestoreOrderBy = orderBy;
  window.firestoreLimit = limit;
  window.firestoreTimestamp = Timestamp;
};

// Initialize when Firebase is ready
if (window.firebaseLoaded) {
  initApp();
} else {
  window.addEventListener('firebaseready', initApp);
}

// ========================================
// AUTH & USER MANAGEMENT
// ========================================

const getUserKidId = async (userId) => {
  const userDocRef = firestoreDoc(db, 'users', userId);
  const userDoc = await firestoreGetDoc(userDocRef);
  if (userDoc.exists()) {
    return userDoc.data().kidId || null;
  }
  return null;
};

const saveUserKidId = async (userId, kidId) => {
  const userDocRef = firestoreDoc(db, 'users', userId);
  await firestoreSetDoc(userDocRef, { kidId }, { merge: true });
};

const createKidForUser = async (userId, babyName, babyWeight, birthDate) => {
  const kidId = `kid_${Date.now()}`;
  const kidDocRef = firestoreDoc(db, 'kids', kidId);
  
  await firestoreSetDoc(kidDocRef, {
    name: babyName,
    birthDate: birthDate,
    ownerId: userId,
    createdAt: firestoreTimestamp.now()
  });
  
  const settingsDocRef = firestoreDoc(db, 'kids', kidId, 'settings', 'default');
  await firestoreSetDoc(settingsDocRef, {
    babyWeight: babyWeight,
    multiplier: 2.5
  });
  
  await saveUserKidId(userId, kidId);
  return kidId;
};

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

const signOutUser = async () => {
  await signOut(auth);
};

const updateUserProfile = async (userId, data) => {
  const userDocRef = firestoreDoc(db, 'users', userId);
  await firestoreSetDoc(userDocRef, data, { merge: true });
};

// ========================================
// INVITES
// ========================================

const createInvite = async (kidId) => {
  const code = Math.random().toString(36).substring(2, 10);
  const inviteDocRef = firestoreDoc(db, 'invites', code);
  
  await firestoreSetDoc(inviteDocRef, {
    kidId: kidId,
    createdAt: firestoreTimestamp.now(),
    expiresAt: firestoreTimestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  return code;
};

const acceptInvite = async (code, userId) => {
  const inviteDocRef = firestoreDoc(db, 'invites', code);
  const inviteDoc = await firestoreGetDoc(inviteDocRef);
  
  if (!inviteDoc.exists()) {
    throw new Error('Invalid invite code');
  }
  
  const data = inviteDoc.data();
  if (data.expiresAt.toMillis() < Date.now()) {
    throw new Error('Invite expired');
  }
  
  await saveUserKidId(userId, data.kidId);
  await firestoreDeleteDoc(inviteDocRef);
  
  return data.kidId;
};

const removeMember = async (kidId, userId) => {
  const userDocRef = firestoreDoc(db, 'users', userId);
  await firestoreUpdateDoc(userDocRef, { kidId: null });
};

// ========================================
// FIRESTORE STORAGE LAYER
// ========================================

const firestoreStorage = {
  currentKidId: null,

  // Set which kid we're operating on
  initialize: async function (kidId) {
    this.currentKidId = kidId;
  },

  // -------- FEEDINGS --------

  // Add a feeding: ounces (number), timestamp (ms)
  addFeeding: async function (ounces, timestamp) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const feedingId = `feeding_${Date.now()}`;
    const feedingDocRef = firestoreDoc(
      db,
      "kids",
      this.currentKidId,
      "feedings",
      feedingId
    );

    await firestoreSetDoc(feedingDocRef, {
      ounces: ounces,
      timestamp: timestamp,
      createdAt: firestoreTimestamp.now(),
    });

    return feedingId;
  },

  // Update an existing feeding
  updateFeeding: async function (feedingId, ounces, timestamp) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const feedingDocRef = firestoreDoc(
      db,
      "kids",
      this.currentKidId,
      "feedings",
      feedingId
    );

    await firestoreUpdateDoc(feedingDocRef, {
      ounces: ounces,
      timestamp: timestamp,
    });
  },

  // Delete a feeding
  deleteFeeding: async function (feedingId) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const feedingDocRef = firestoreDoc(
      db,
      "kids",
      this.currentKidId,
      "feedings",
      feedingId
    );

    await firestoreDeleteDoc(feedingDocRef);
  },

  // Get all feedings in the last N days (used for analytics)
  getFeedingsLastNDays: async function (days) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

    const feedingsRef = firestoreCollection(
      db,
      "kids",
      this.currentKidId,
      "feedings"
    );
    const q = firestoreQuery(feedingsRef, firestoreOrderBy("timestamp", "desc"));

    const snapshot = await firestoreGetDocs(q);
    const feedings = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.timestamp >= cutoffMs) {
        feedings.push({
          id: docSnap.id,
          ounces: data.ounces,
          timestamp: data.timestamp,
        });
      }
    });

    // oldest → newest
    return feedings.sort((a, b) => a.timestamp - b.timestamp);
  },

  // Get all feedings for a specific calendar day (used by TrackerTab)
  getFeedingsForDate: async function (date) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startMs = startOfDay.getTime();
    const endMs = endOfDay.getTime();

    const feedingsRef = firestoreCollection(
      db,
      "kids",
      this.currentKidId,
      "feedings"
    );
    const q = firestoreQuery(feedingsRef, firestoreOrderBy("timestamp", "desc"));

    const snapshot = await firestoreGetDocs(q);
    const feedings = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const ts = data.timestamp;
      if (ts >= startMs && ts <= endMs) {
        feedings.push({
          id: docSnap.id,
          ounces: data.ounces,
          timestamp: ts,
        });
      }
    });

    // newest first for the list
    return feedings.sort((a, b) => b.timestamp - a.timestamp);
  },

  // "Subscribe" to feedings for a date.
  // For now this just loads once and returns a no-op unsubscribe,
  // so your existing useEffect code keeps working.
  subscribeToFeedings: function (date, callback) {
    this.getFeedingsForDate(date)
      .then((feedings) => callback(feedings))
      .catch((err) => console.error("Error loading feedings:", err));

    // return fake unsubscribe so useEffect cleanup doesn't break
    return () => {};
  },

  // -------- SETTINGS --------

  getSettings: async function () {
    if (!this.currentKidId) throw new Error("No kid selected");

    const settingsDocRef = firestoreDoc(
      db,
      "kids",
      this.currentKidId,
      "settings",
      "default"
    );
    const settingsDoc = await firestoreGetDoc(settingsDocRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    return { babyWeight: null, multiplier: 2.5 };
  },

  setSettings: async function (settings) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const settingsDocRef = firestoreDoc(
      db,
      "kids",
      this.currentKidId,
      "settings",
      "default"
    );

    await firestoreSetDoc(settingsDocRef, settings, { merge: true });
  },

  // -------- KID DATA --------

  getKidData: async function () {
    if (!this.currentKidId) throw new Error("No kid selected");

    const kidDocRef = firestoreDoc(db, "kids", this.currentKidId);
    const kidDoc = await firestoreGetDoc(kidDocRef);

    if (kidDoc.exists()) {
      return { id: kidDoc.id, ...kidDoc.data() };
    }
    return null;
  },

  updateKid: async function (data) {
    if (!this.currentKidId) throw new Error("No kid selected");

    const kidDocRef = firestoreDoc(db, "kids", this.currentKidId);
    await firestoreSetDoc(kidDocRef, data, { merge: true });
  },

  // -------- MEMBERS (linked users) --------

  getMembers: async function () {
    if (!this.currentKidId) throw new Error("No kid selected");

    const usersRef = firestoreCollection(db, "users");
    const q = firestoreQuery(
      usersRef,
      firestoreWhere("kidId", "==", this.currentKidId)
    );

    const snapshot = await firestoreGetDocs(q);
    const members = [];

    snapshot.forEach((docSnap) => {
      members.push({
        uid: docSnap.id,
        ...docSnap.data(),
      });
    });

    return members;
  },
};

  // AI Conversation methods
  getConversation: async function() {
    if (!this.currentKidId) throw new Error('No kid selected');
    
    const conversationDocRef = firestoreDoc(db, 'kids', this.currentKidId, 'conversations', 'default');
    const conversationDoc = await firestoreGetDoc(conversationDocRef);
    
    if (conversationDoc.exists()) {
      return conversationDoc.data();
    }
    return { messages: [] };
  },

  saveMessage: async function(message) {
    if (!this.currentKidId) throw new Error('No kid selected');
    
    const conversation = await this.getConversation();
    const messages = conversation.messages || [];
    messages.push(message);
    
    const conversationDocRef = firestoreDoc(db, 'kids', this.currentKidId, 'conversations', 'default');
    await firestoreSetDoc(conversationDocRef, {
      messages: messages,
      updatedAt: firestoreTimestamp.now()
    }, { merge: true });
  },

  clearConversation: async function() {
    if (!this.currentKidId) throw new Error('No kid selected');
    
    const conversationDocRef = firestoreDoc(db, 'kids', this.currentKidId, 'conversations', 'default');
    await firestoreSetDoc(conversationDocRef, {
      messages: [],
      updatedAt: firestoreTimestamp.now()
    });
  }
};

// ========================================
// TINY TRACKER V4.4 - PART 2
// App Wrapper, Login Screen, Baby Setup Screen (waits for Firebase)
// ========================================

const { useState, useEffect } = React;

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kidId, setKidId] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  
  // Wait for Firebase to initialize
  useEffect(() => {
    const checkFirebase = () => {
      if (window.auth && window.db) {
        setFirebaseReady(true);
      } else {
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  }, []);
  
  useEffect(() => {
    if (!firebaseReady) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        
        try {
          let userKidId;

          if (inviteCode) {
            userKidId = await acceptInvite(inviteCode, user.uid);
            if (userKidId) {
              await saveUserKidId(user.uid, userKidId);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            userKidId = await getUserKidId(user.uid);
          }
          
          if (!userKidId) {
            setNeedsSetup(true);
            setLoading(false);
            return;
          }

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
  }, [firebaseReady]);
  
  if (loading || !firebaseReady) {
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
// TINY TRACKER V4.3 - PART 3
// Main App with Bottom Navigation (Fixed badge logic)
// ========================================

const MainApp = ({ user, kidId }) => {
  const [activeTab, setActiveTab] = useState('tracker');
  const [hasUnreadAI, setHasUnreadAI] = useState(false);
  
  useEffect(() => {
    document.title = 'Tiny Tracker';
  }, []);
  
  // Check for unread AI messages
  useEffect(() => {
    if (activeTab !== 'chat') {
      checkUnreadMessages();
    } else {
      // Mark as read when viewing chat
      setHasUnreadAI(false);
      markMessagesAsRead();
    }
  }, [activeTab, kidId]);
  
  const checkUnreadMessages = async () => {
    try {
      const conversation = await firestoreStorage.getConversation();
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        const lastRead = conversation.lastReadTimestamp || 0;
        
        // Show badge if last message is from AI and user hasn't read it yet
        if (lastMessage.role === 'assistant' && lastMessage.timestamp > lastRead) {
          setHasUnreadAI(true);
        } else {
          setHasUnreadAI(false);
        }
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  };
  
  const markMessagesAsRead = async () => {
    try {
      if (!kidId) return;
      const conversationDocRef = firestoreDoc(db, 'kids', kidId, 'conversations', 'default');
      await firestoreSetDoc(conversationDocRef, {
        lastReadTimestamp: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };
  
  return React.createElement('div', { 
    className: "min-h-screen pb-24",
    style: { backgroundColor: '#E0E7FF' }
  },
    React.createElement('div', { className: "max-w-2xl mx-auto" },
      // Header
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
    
    // Bottom Navigation
    React.createElement('div', { 
      className: "fixed bottom-0 left-0 right-0 z-50 mb-2",
      style: { 
        backgroundColor: '#E0E7FF',
        boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)'
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
            className: `flex-1 py-2 flex flex-col items-center gap-1 transition relative ${
              activeTab === tab.id 
                ? 'text-indigo-600' 
                : 'text-gray-400'
            }`
          },
            React.createElement(tab.icon, { className: "w-6 h-6" }),
            // Unread badge for chat (only when last AI message is newer than lastRead)
            tab.id === 'chat' && hasUnreadAI && activeTab !== 'chat' &&
              React.createElement('div', {
                className: "absolute top-1 right-1/4 w-2 h-2 bg-red-500 rounded-full"
              }),
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
// TINY TRACKER V4.3 - PART 6  
// Family Tab - Fixed photo upload with camera roll choice
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
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
      if (kid && kid.photoURL) {
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadingPhoto(true);

    // Check file size (max 2MB for better performance)
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be less than 2MB');
      event.target.value = '';
      setUploadingPhoto(false);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      event.target.value = '';
      setUploadingPhoto(false);
      return;
    }

    try {
      // Resize and convert to base64
      const resizedBase64 = await resizeImage(file, 400, 400); // Max 400x400px
      
      // Save to Firestore (base64 stored in kid document)
      await firestoreStorage.updateKid({ photoURL: resizedBase64 });
      setBabyPhotoUrl(resizedBase64);
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    }
    
    // Reset input
    event.target.value = '';
    setUploadingPhoto(false);
  };

  // Resize image to reduce file size
  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 (JPEG for smaller size)
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateInvite = async () => {
    try {
      const code = await createInvite(kidId);
      const link = `${window.location.origin}${window.location.pathname}?invite=${code}`;
      setInviteLink(link);
      
      // Open SMS with invite link
      const message = `Join me on Tiny Tracker to track ${kidData?.name || 'our baby'}'s feedings together! ${link}`;
      const smsLink = `sms:?&body=${encodeURIComponent(message)}`;
      window.location.href = smsLink;
      
      // Also show UI for copying
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
              className: `bg-indigo-100 rounded-full w-20 h-20 flex items-center justify-center overflow-hidden cursor-pointer ${uploadingPhoto ? 'opacity-50' : ''}`,
              onClick: uploadingPhoto ? null : handlePhotoClick
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
            uploadingPhoto ?
              React.createElement('div', {
                className: "absolute inset-0 flex items-center justify-center"
              },
                React.createElement('div', { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" })
              )
            :
              React.createElement('button', {
                onClick: handlePhotoClick,
                type: "button",
                className: "absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1.5 text-white hover:bg-indigo-700 transition shadow-lg",
                title: "Change photo"
              }, React.createElement(Camera, { className: "w-3 h-3" })),
            // File input - REMOVED capture attribute to allow camera roll
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

      // Invite button
      React.createElement('button', {
        onClick: handleCreateInvite,
        className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
      }, '+ Invite Partner'),
      
      // Show link after creating
      showInvite && React.createElement('div', { className: "mt-3 space-y-2" },
        React.createElement('div', { className: "text-xs text-gray-600" }, 'Or copy and share this link:'),
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
          }, copying ? '✓' : 'Copy')
        )
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
// TINY TRACKER V4.4 - PART 9
// AI Chat Tab - With proactive insights on app open
// ========================================

const AIChatTab = ({ user, kidId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const hasCheckedProactive = React.useRef(false);
  
  useEffect(() => {
    loadConversation();
  }, [kidId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };
  
  const loadConversation = async () => {
    if (!kidId) return;
    setInitializing(true);
    try {
      const conversation = await firestoreStorage.getConversation();
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      }
      
      // Check if we should send a proactive insight
      if (!hasCheckedProactive.current) {
        hasCheckedProactive.current = true;
        await checkAndSendProactiveInsight(conversation);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
    setInitializing(false);
  };
  
  const checkAndSendProactiveInsight = async (conversation) => {
    try {
      const now = Date.now();
      const twelveHoursAgo = now - (12 * 60 * 60 * 1000);
      
      // Check if there are any messages
      if (!conversation || !conversation.messages || conversation.messages.length === 0) {
        // No messages yet, send welcome insight
        await sendProactiveInsight('welcome');
        return;
      }
      
      // Get last AI message
      const aiMessages = conversation.messages.filter(m => m.role === 'assistant');
      if (aiMessages.length === 0) {
        return; // No AI messages yet
      }
      
      const lastAIMessage = aiMessages[aiMessages.length - 1];
      
      // If last AI message was more than 12 hours ago, send new insight
      if (lastAIMessage.timestamp < twelveHoursAgo) {
        await sendProactiveInsight('periodic');
      }
    } catch (error) {
      console.error('Error checking proactive insight:', error);
    }
  };
  
  const sendProactiveInsight = async (type) => {
    try {
      setLoading(true);
      
      let prompt;
      if (type === 'welcome') {
        prompt = "Welcome me and introduce yourself as Tiny Tracker. Ask me a question about my baby's feeding patterns to get started.";
      } else {
        prompt = "Generate a brief, personalized insight about my baby's feeding patterns, development, or ask me an engaging question. Keep it under 3 sentences and make it feel like a helpful check-in.";
      }
      
      const aiResponse = await getAIResponse(prompt, kidId);
      
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        proactive: true // Mark as proactive
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      await firestoreStorage.saveMessage(assistantMessage);
      
    } catch (error) {
      console.error('Error sending proactive insight:', error);
    }
    setLoading(false);
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
      hasCheckedProactive.current = false; // Allow welcome message again
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
    // Header with Clear button
    messages.length > 0 && React.createElement('div', {
      className: "px-4 pb-2 flex justify-end"
    },
      React.createElement('button', {
        onClick: handleClearConversation,
        className: "text-sm text-gray-500 hover:text-red-600 transition"
      }, 'Clear Chat')
    ),
    
    // Messages Area
    React.createElement('div', { 
      className: "flex-1 overflow-y-auto px-4 py-4 space-y-3"
    },
      // First message if empty (won't show because proactive message will be sent)
      messages.length === 0 && React.createElement(React.Fragment, null,
        React.createElement('div', { className: "flex justify-center py-12" },
          React.createElement('div', { className: "text-gray-500 text-sm" }, 'Starting conversation...')
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
              React.createElement('div', { className: "font-semibold text-sm text-gray-700 mb-1" }, 
                'Tiny Tracker',
                message.proactive && React.createElement('span', { 
                  className: "ml-2 text-xs text-gray-500 font-normal" 
                }, '💡')
              ),
            React.createElement('div', { className: "whitespace-pre-wrap text-[15px] leading-relaxed" }, message.content),
            React.createElement('div', {
              className: `text-[11px] mt-1 ${
                message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`
            }, formatTimestamp(message.timestamp))
          )
        )
      ),
      
      // Show suggested questions only if no messages yet
      messages.length === 0 && React.createElement('div', { className: "flex justify-start mt-2" },
        React.createElement('div', { className: "max-w-[75%] space-y-2" },
          React.createElement('div', { className: "text-xs text-gray-500 px-2 mb-1" }, 'Or try asking:'),
          suggestedQuestions.map((q, i) =>
            React.createElement('button', {
              key: i,
              onClick: () => setInput(q),
              className: "block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 transition"
            }, q)
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
    
    // Input Area
    React.createElement('div', { 
      className: "px-4 pb-4 pt-2",
      style: { backgroundColor: '#E0E7FF' }
    },
      React.createElement('div', { 
        className: "flex items-center gap-2 bg-white rounded-2xl px-3 py-2 border border-gray-200"
      },
        React.createElement('textarea', {
          ref: inputRef,
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
          className: "flex-1 px-2 py-1 bg-transparent resize-none focus:outline-none text-[16px] disabled:opacity-50",
          style: { 
            maxHeight: '100px',
            fontSize: '16px'
          }
        }),
        React.createElement('button', {
          onClick: handleSend,
          disabled: loading || !input.trim(),
          className: "flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center disabled:opacity-30 transition hover:bg-indigo-700"
        },
          React.createElement('svg', {
            className: "w-4 h-4 text-white",
            fill: "currentColor",
            viewBox: "0 0 24 24",
            style: { marginLeft: '2px' }
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
// TINY TRACKER V4.2 - PART 10 (GEMINI VERSION)
// AI Integration - Improved prompts, Claude-style voice
// ========================================

const GEMINI_API_KEY = "AIzaSyBnIJEviabBAvmJXzowVNTDIARPYq6Hz1U"; // Replace with your key

const getAIResponse = async (question, kidId) => {
  try {
    const context = await buildAIContext(kidId, question);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
          maxOutputTokens: 800 // Shorter responses
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
  const babyData = await firestoreStorage.getKidData();
  const settings = await firestoreStorage.getSettings();
  const recentFeedings = await firestoreStorage.getFeedingsLastNDays(7);
  const conversation = await firestoreStorage.getConversation();
  
  // Calculate age
  const ageInMonths = calculateAgeInMonths(babyData.birthDate);
  const ageInDays = Math.floor((Date.now() - babyData.birthDate) / (1000 * 60 * 60 * 24));
  const ageInWeeks = Math.floor(ageInDays / 7);
  
  // Analyze recent feedings (EXCLUDING today's incomplete data for averages)
  const feedingAnalysis = analyzeFeedingPatterns(recentFeedings, babyData.birthDate);
  
  // Build conversation history
  let conversationHistory = '';
  if (conversation && conversation.messages) {
    const recentMessages = conversation.messages.slice(-6); // Last 6 messages for context
    conversationHistory = '\n\nCONVERSATION HISTORY:\n';
    recentMessages.forEach(msg => {
      conversationHistory += `${msg.role === 'user' ? 'Parent' : 'You'}: ${msg.content}\n\n`;
    });
  }
  
  const fullPrompt = `You are Tiny Tracker, an AI assistant for parents. You help parents understand their baby's feeding patterns with concise, actionable insights.

CRITICAL INSTRUCTIONS:
1. **Be concise**: 2-3 sentences maximum. Cut straight to the insight.
2. **Be actionable**: Always suggest specific next steps when relevant.
3. **Sound human**: Conversational, warm, and direct. Like a helpful friend, not a manual.
4. **Ignore incomplete data**: Today's data is always partial - don't flag it as concerning.
5. **Use "I noticed..." pattern**: Lead with what you observed in their data.
6. **Consider age & weight**: Tailor advice to the baby's developmental stage.

BABY'S INFO:
- Name: ${babyData.name}
- Age: ${ageInMonths} month${ageInMonths !== 1 ? 's' : ''} (${ageInWeeks} weeks, ${ageInDays} days)
- Weight: ${settings?.babyWeight || 'unknown'} lbs
- Target daily: ${settings?.babyWeight && settings?.multiplier ? (settings.babyWeight * settings.multiplier).toFixed(1) : 'not set'} oz

FEEDING PATTERNS (Last 7 days, EXCLUDING today):
- Daily average: ${feedingAnalysis.avgDailyIntake.toFixed(1)} oz
- Feedings per day: ${feedingAnalysis.avgPerDay.toFixed(1)}
- Average per feeding: ${feedingAnalysis.avgPerFeeding.toFixed(1)} oz
- Time between feeds: ${feedingAnalysis.avgInterval.toFixed(1)} hours
- Night feedings: ${feedingAnalysis.nightFeedings} (${feedingAnalysis.nightIntakePercent.toFixed(0)}% of daily)

TODAY (incomplete, don't worry about it):
- So far: ${feedingAnalysis.todayTotal.toFixed(1)} oz in ${feedingAnalysis.todayCount} feedings

DEVELOPMENTAL CONTEXT (${ageInMonths} months old):
${getDevelopmentalContext(ageInMonths, settings?.babyWeight)}
${conversationHistory}
Parent's Question: ${question}

Your Response (2-3 sentences, actionable):`;

  return { fullPrompt };
};

const getDevelopmentalContext = (ageInMonths, weight) => {
  if (ageInMonths < 1) {
    return `- Newborns typically eat 8-12 times per day (every 2-3 hours)
- Growth spurts common around 7-10 days and 3-6 weeks
- Cluster feeding in evenings is normal
- Sleep patterns irregular`;
  } else if (ageInMonths === 1) {
    return `- 1-month-olds typically eat 6-8 times per day
- May start extending one nighttime sleep stretch (4-5 hours)
- Cluster feeding still common in evenings
- Developing more predictable patterns`;
  } else if (ageInMonths === 2) {
    return `- 2-month-olds typically eat 5-7 times per day
- Longer stretches at night (5-6 hours possible)
- More efficient feeders, takes less time
- Growth spurt around 6-8 weeks common`;
  } else if (ageInMonths <= 4) {
    return `- 3-4 month-olds typically eat 5-6 times per day
- May sleep 6-8 hour stretches at night
- 4-month sleep regression is common
- Starting to drop night feedings`;
  } else {
    return `- Older babies eat less frequently (4-5 times/day)
- May be starting solids (consult pediatrician)
- Most can sleep through night without feeding
- Feedings more spaced out and predictable`;
  }
};

const calculateAgeInMonths = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  return months;
};

const analyzeFeedingPatterns = (feedings, birthDate) => {
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
      todayCount: 0
    };
  }
  
  // TODAY's data (incomplete)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayFeedings = feedings.filter(f => f.timestamp >= todayStart.getTime());
  const todayTotal = todayFeedings.reduce((sum, f) => sum + f.ounces, 0);
  const todayCount = todayFeedings.length;
  
  // EXCLUDING today for averages
  const feedingsExcludingToday = feedings.filter(f => f.timestamp < todayStart.getTime());
  
  if (feedingsExcludingToday.length === 0) {
    return {
      totalFeedings: 0,
      avgPerDay: 0,
      avgPerFeeding: 0,
      avgDailyIntake: 0,
      avgInterval: 0,
      nightFeedings: 0,
      nightIntakePercent: 0,
      todayTotal,
      todayCount
    };
  }
  
  const totalFeedings = feedingsExcludingToday.length;
  const totalOunces = feedingsExcludingToday.reduce((sum, f) => sum + f.ounces, 0);
  
  // Calculate days span
  const timestamps = feedingsExcludingToday.map(f => f.timestamp);
  const firstDay = Math.min(...timestamps);
  const lastDay = Math.max(...timestamps);
  const daysSpan = Math.max(1, Math.ceil((lastDay - firstDay) / (1000 * 60 * 60 * 24)) + 1);
  
  // Night feedings
  const nightFeedings = feedingsExcludingToday.filter(f => {
    const hour = new Date(f.timestamp).getHours();
    return hour >= 22 || hour < 6;
  });
  const nightIntake = nightFeedings.reduce((sum, f) => sum + f.ounces, 0);
  
  // Calculate intervals
  let totalIntervalHours = 0;
  for (let i = 1; i < feedingsExcludingToday.length; i++) {
    const intervalHours = (feedingsExcludingToday[i].timestamp - feedingsExcludingToday[i-1].timestamp) / (1000 * 60 * 60);
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
    todayCount
  };
};
