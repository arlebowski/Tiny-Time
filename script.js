// ========================================
// TINY TRACKER - PART 1
// Config, Auth, Family-Based Firestore Layer + AI Functions
// ========================================

// ---------------------------
// FIREBASE CONFIG
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBUscvx-JB3lNWKVu9bPnYTBHVPvrndc_w",
  authDomain: "baby-feeding-tracker-978e6.firebaseapp.com",
  projectId: "baby-feeding-tracker-978e6",
  storageBucket: "baby-feeding-tracker-978e6.firebasestorage.app",
  messagingSenderId: "775043948126",
  appId: "1:775043948126:web:28d8aefeea99cc7d25decf",
  measurementId: "G-NYQMC8STML"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------------------------
// ANALYTICS
// ---------------------------
// Some environments (ad blockers, strict browsers, offline/local dev) can block
// the analytics bundle, which will throw at initialization and prevent the app
// from rendering. Guard the setup so the app still boots even if analytics
// isn’t available.
let analytics = null;
try {
  analytics = firebase.analytics();
} catch (e) {
  console.warn("Analytics unavailable; continuing without analytics", e);
}

const logEvent = (eventName, params) => {
  if (!analytics || typeof analytics.logEvent !== 'function') return;
  try {
    analytics.logEvent(eventName, params);
  } catch (e) {
    console.warn("Analytics failed:", e);
  }
};

logEvent("app_open", {});
window.trackTabSelected = (tab) => logEvent("tab_selected", { tab });

// ========================================
// USER PROFILE MANAGEMENT
// ========================================
const ensureUserProfile = async (user, inviteCode = null) => {
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);
  const snap = await userRef.get();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const base = {
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    lastActiveAt: now
  };

  if (!snap.exists) {
    await userRef.set(
      { ...base, createdAt: now, inviteCode: inviteCode || null },
      { merge: true }
    );
  } else {
    await userRef.set(base, { merge: true });
  }
};

const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await auth.signInWithPopup(provider);
  logEvent("login", { method: "google" });
  return result;
};

// Email/password auth helpers
const signUpWithEmail = async (email, password) => {
  const result = await auth.createUserWithEmailAndPassword(email, password);
  logEvent("login", { method: "password_signup" });
  return result;
};

const signInWithEmail = async (email, password) => {
  const result = await auth.signInWithEmailAndPassword(email, password);
  logEvent("login", { method: "password_login" });
  return result;
};

const signOut = async () => {
  await auth.signOut();
  logEvent("logout", {});
};

// Delete current user account:
// - Remove user from all families' members arrays
// - Remove user from all kids' members arrays
// - If user is owner of a kid, transfer ownership to another member if possible
// - Delete their user profile doc
// - Delete their auth account
const deleteCurrentUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }

  const uid = user.uid;

  // 1) Find all families where this user is a member
  const famSnap = await db
    .collection("families")
    .where("members", "array-contains", uid)
    .get();

  const familyPromises = famSnap.docs.map(async (famDoc) => {
    const famRef = famDoc.ref;
    const famData = famDoc.data() || {};
    const members = Array.isArray(famData.members) ? famData.members : [];
    const otherMembers = members.filter((m) => m !== uid);

    // Remove from family.members
    await famRef.update({
      members: firebase.firestore.FieldValue.arrayRemove(uid),
    });

    // For each kid in this family:
    const kidsSnap = await famRef.collection("kids").get();

    const kidPromises = kidsSnap.docs.map(async (kidDoc) => {
      const kidRef = kidDoc.ref;
      const kidData = kidDoc.data() || {};

      // Always remove from kid.members
      const updates = {
        members: firebase.firestore.FieldValue.arrayRemove(uid),
      };

      // If this user was the owner, transfer ownership if possible
      if (kidData.ownerId === uid) {
        if (otherMembers.length > 0) {
          updates.ownerId = otherMembers[0]; // simple: first remaining member
        } else {
          // No other members – keep baby data, but no owner
          updates.ownerId = null;
        }
      }

      await kidRef.update(updates);
    });

    await Promise.all(kidPromises);
  });

  await Promise.all(familyPromises);

  // 2) Delete user profile document (non-fatal if already gone)
  try {
    await db.collection("users").doc(uid).delete();
  } catch (e) {
    console.warn("Failed to delete user profile doc:", e);
  }

  // 3) Log analytics event
  try {
    logEvent("account_deleted", { uid });
  } catch (e) {
    console.warn("Analytics log failed for account_deleted:", e);
  }

  // 4) Delete auth user (may require recent login)
  await user.delete();
};

// ========================================
// INVITES
// ========================================
const createInviteCode = async (familyId, kidId, userId) => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();

  await db.collection("invites").doc(code).set({
    familyId,
    kidId,
    createdBy: userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    used: false
  });

  logEvent("invite_created", { familyId, kidId });
  return code;
};

const createInvite = async (familyId, kidId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  return await createInviteCode(familyId, kidId, user.uid);
};

const acceptInvite = async (code, userId) => {
  const inviteRef = db.collection("invites").doc(code);
  const snap = await inviteRef.get();
  if (!snap.exists) throw new Error("Invalid invite");

  const invite = snap.data();
  if (invite.used) throw new Error("Invite already used");

  const familyRef = db.collection("families").doc(invite.familyId);

  // 1) Add user to family
  await familyRef.update({
    members: firebase.firestore.FieldValue.arrayUnion(userId)
  });

  // 2) Add user to ALL kids in this family (so access = family-wide)
  const kidsSnap = await familyRef.collection("kids").get();
  const kidUpdates = kidsSnap.docs.map((kidDoc) =>
    kidDoc.ref.update({
      members: firebase.firestore.FieldValue.arrayUnion(userId)
    })
  );
  await Promise.all(kidUpdates);

  // 3) Mark invite used
  await inviteRef.update({
    used: true,
    usedBy: userId,
    usedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Return something reasonable
  // Prefer invite.kidId if present, else pick family primary kid if you want later.
  return { familyId: invite.familyId, kidId: invite.kidId || (kidsSnap.docs[0]?.id || null) };
};

// ========================================
// FAMILY MEMBER LOOKUP
// ========================================
const getFamilyMembers = async (familyId) => {
  const famDoc = await db.collection("families").doc(familyId).get();
  if (!famDoc.exists) return [];

  const { members = [] } = famDoc.data();

  const userDocs = await Promise.all(
    members.map((uid) => db.collection("users").doc(uid).get())
  );

  return userDocs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
};

// Update user profile (used on Family tab when renaming yourself)
const updateUserProfile = async (userId, data) => {
  if (!userId) throw new Error("No userId");
  await db.collection("users").doc(userId).set(data, { merge: true });
};

// Remove a member from a family + kid (used on Family tab)
const removeMember = async (familyId, kidId_ignored, memberId) => {
  if (!familyId || !memberId) throw new Error("Missing ids");

  const familyRef = db.collection("families").doc(familyId);

  // 1) Remove from family
  await familyRef.update({
    members: firebase.firestore.FieldValue.arrayRemove(memberId),
  });

  // 2) Remove from ALL kids in the family
  const kidsSnap = await familyRef.collection("kids").get();
  const kidUpdates = kidsSnap.docs.map((kidDoc) =>
    kidDoc.ref.update({
      members: firebase.firestore.FieldValue.arrayRemove(memberId),
    })
  );
  await Promise.all(kidUpdates);
};

// ========================================
// FAMILY-BASED STORAGE LAYER
// ========================================
const firestoreStorage = {
  currentFamilyId: null,
  currentKidId: null,

  initialize: async function (familyId, kidId) {
    this.currentFamilyId = familyId;
    this.currentKidId = kidId;
    logEvent("kid_selected", { familyId, kidId });
  },

  _kidRef() {
    if (!this.currentFamilyId || !this.currentKidId)
      throw new Error("Storage not initialized");
    return db
      .collection("families")
      .doc(this.currentFamilyId)
      .collection("kids")
      .doc(this.currentKidId);
  },

  // -----------------------
  // KID PHOTO (base64 data URL)
  // -----------------------
  async uploadKidPhoto(base64DataUrl) {
    if (!base64DataUrl || typeof base64DataUrl !== "string") {
      throw new Error("uploadKidPhoto: missing base64 data URL");
    }
    await this._kidRef().set(
      {
        photoURL: base64DataUrl,
        photoUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    try {
      logEvent("kid_photo_uploaded", {});
    } catch {
      // ignore analytics failures
    }
    return base64DataUrl;
  },

  // -----------------------
  // FEEDINGS
  // -----------------------
  async addFeeding(ounces, timestamp) {
    await this._kidRef().collection("feedings").add({ ounces, timestamp });
    logEvent("feeding_added", { ounces });
  },

  async getFeedings() {
    const snap = await this._kidRef()
      .collection("feedings")
      .orderBy("timestamp", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getFeedingsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    const snap = await this._kidRef()
      .collection("feedings")
      .where("timestamp", ">", cutoff)
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateFeeding(id, ounces, timestamp) {
    await this._kidRef()
      .collection("feedings")
      .doc(id)
      .update({ ounces, timestamp });
  },

  async deleteFeeding(id) {
    await this._kidRef().collection("feedings").doc(id).delete();
  },

  // ⭐⭐⭐⭐⭐ ADDED PATCH — REQUIRED BY ANALYTICS TAB
  async getAllFeedings() {
    const snap = await this._kidRef()
      .collection("feedings")
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // -----------------------
  // SLEEP SESSIONS
  // -----------------------
  _minutesOfDayLocal(ms) {
    try {
      const d = new Date(ms);
      return d.getHours() * 60 + d.getMinutes();
    } catch {
      return 0;
    }
  },
  _isWithinWindow(mins, startMins, endMins) {
    const s = Number(startMins);
    const e = Number(endMins);
    const m = Number(mins);
    if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
    if (s === e) return false; // degenerate window
    if (s < e) return m >= s && m <= e;
    // wraps past midnight
    return (m >= s) || (m <= e);
  },
  async _classifySleepTypeForStartMs(startMs) {
    try {
      const ss = await this.getSleepSettings();
      const dayStart = Number(ss?.sleepDayStart ?? ss?.daySleepStartMinutes ?? 390);
      const dayEnd = Number(ss?.sleepDayEnd ?? ss?.daySleepEndMinutes ?? 1170);
      const mins = this._minutesOfDayLocal(startMs);
      return this._isWithinWindow(mins, dayStart, dayEnd) ? "day" : "night";
    } catch {
      return "night";
    }
  },
  async startSleep(startTime = null) {
    const user = auth.currentUser;
    const uid = user ? user.uid : null;

    // Ensure only one active sleep per kid
    const activeSnap = await this._kidRef()
      .collection("sleepSessions")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!activeSnap.empty) {
      const d = activeSnap.docs[0];
      return { id: d.id, ...d.data() };
    }

    const startMs = typeof startTime === "number" ? startTime : Date.now();
    const sleepType = await this._classifySleepTypeForStartMs(startMs);

    const ref = await this._kidRef().collection("sleepSessions").add({
      startTime: startMs,
      endTime: null,
      isActive: true,
      sleepType,
      startedByUid: uid,
      endedByUid: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    logEvent("sleep_started", { startTime: startMs });
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };
  },

  async endSleep(sessionId, endTime = null) {
    const user = auth.currentUser;
    const uid = user ? user.uid : null;
    if (!sessionId) throw new Error("Missing sleep session id");
    const endMs = typeof endTime === "number" ? endTime : Date.now();
    // Tag sleep as day vs night based on the saved day window.
    // Rule: if the *start time* is within the day window => day sleep (nap). Otherwise => night sleep.
    let isDaySleep = false;
    try {
      const kidDoc = await this._kidRef().get();
      const kd = kidDoc.exists ? kidDoc.data() : {};
      const dayStart =
        typeof kd.sleepDayStart === "number" && !Number.isNaN(kd.sleepDayStart)
          ? kd.sleepDayStart
          : typeof kd.daySleepStartMinutes === "number" && !Number.isNaN(kd.daySleepStartMinutes)
            ? kd.daySleepStartMinutes
            : 390;
      const dayEnd =
        typeof kd.sleepDayEnd === "number" && !Number.isNaN(kd.sleepDayEnd)
          ? kd.sleepDayEnd
          : typeof kd.daySleepEndMinutes === "number" && !Number.isNaN(kd.daySleepEndMinutes)
            ? kd.daySleepEndMinutes
            : 1170;
      const sessDoc = await this._kidRef().collection("sleepSessions").doc(sessionId).get();
      const sess = sessDoc.exists ? sessDoc.data() : {};
      const startMs = typeof sess.startTime === "number" ? sess.startTime : null;
      if (startMs) {
        const dt = new Date(startMs);
        const mins = dt.getHours() * 60 + dt.getMinutes();
        if (dayStart <= dayEnd) {
          isDaySleep = mins >= dayStart && mins <= dayEnd;
        } else {
          // window wraps midnight
          isDaySleep = mins >= dayStart || mins <= dayEnd;
        }
      }
    } catch (e) {
      console.warn("Failed to classify sleep as day/night:", e);
    }
    await this._kidRef()
      .collection("sleepSessions")
      .doc(sessionId)
      .update({
        endTime: endMs,
        isActive: false,
        endedByUid: uid,
        isDaySleep: !!isDaySleep,
        sleepType: isDaySleep ? "day" : "night"
      });
    logEvent("sleep_ended", { endTime: endMs });
  },

  // Subscribe to the active sleep session (if any). Callback receives:
  // - null when no active session
  // - { id, ...data } when active
  subscribeActiveSleep(callback) {
    if (typeof callback !== "function") throw new Error("Missing callback");

    return this._kidRef()
      .collection("sleepSessions")
      .where("isActive", "==", true)
      .limit(1)
      .onSnapshot(
        (snap) => {
          if (snap.empty) {
            callback(null);
            return;
          }
          const d = snap.docs[0];
          callback({ id: d.id, ...d.data() });
        },
        (err) => {
          console.error("Active sleep subscription error:", err);
          callback(null);
        }
      );
  },

  async getSleepSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;

    const snap = await this._kidRef()
      .collection("sleepSessions")
      .where("startTime", ">", cutoff)
      .orderBy("startTime", "asc")
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getAllSleepSessions() {
    const snap = await this._kidRef()
      .collection("sleepSessions")
      .orderBy("startTime", "asc")
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateSleepSession(id, data) {
    if (!id) throw new Error("Missing sleep session id");
    await this._kidRef().collection("sleepSessions").doc(id).update(data || {});
  },

  async deleteSleepSession(id) {
    if (!id) throw new Error("Missing sleep session id");
    await this._kidRef().collection("sleepSessions").doc(id).delete();
  },

  // -----------------------
  // SETTINGS
  // -----------------------
  async getSettings() {
    const doc = await this._kidRef()
      .collection("settings")
      .doc("default")
      .get();
    return doc.exists ? doc.data() : null;
  },

  async saveSettings(settings) {
    await this._kidRef()
      .collection("settings")
      .doc("default")
      .set(settings, { merge: true });
  },

  // -----------------------
  // SLEEP SETTINGS (per kid)
  // -----------------------
  _defaultSleepTargetHoursFromBirthTs(birthTs) {
    // Age-based (best-practice) defaults using midpoints of common pediatric ranges.
    // Newborn (0-3mo): 14–17h => 15.5
    // Infant (4-12mo): 12–16h => 14
    // Toddler (1-2y): 11–14h => 12.5
    // Preschool (3-5y): 10–13h => 11.5
    try {
      if (!birthTs) return 14;
      const ageDays = Math.max(0, (Date.now() - birthTs) / 86400000);
      const ageMonths = ageDays / 30.4375;
      if (ageMonths < 4) return 15.5;
      if (ageMonths < 12) return 14;
      if (ageMonths < 24) return 12.5;
      if (ageMonths < 60) return 11.5;
      return 10.5;
    } catch {
      return 14;
    }
  },

  async getSleepSettings() {
    const doc = await this._kidRef().get();
    const d = doc.exists ? doc.data() : {};
    const autoTarget = this._defaultSleepTargetHoursFromBirthTs(d.birthDate);
    // If user explicitly set an override, use it.
    // Otherwise use auto.
    const override =
      typeof d.sleepTargetOverrideHrs === "number" && !Number.isNaN(d.sleepTargetOverrideHrs)
        ? d.sleepTargetOverrideHrs
        : typeof d.sleepTargetHours === "number" && !Number.isNaN(d.sleepTargetHours)
        ? d.sleepTargetHours
        : null;
    const hasOverride = typeof override === "number";
    const dayStart =
      typeof d.sleepDayStart === "number" && !Number.isNaN(d.sleepDayStart)
        ? d.sleepDayStart
        : typeof d.daySleepStartMinutes === "number" && !Number.isNaN(d.daySleepStartMinutes)
          ? d.daySleepStartMinutes
          : 390;
    const dayEnd =
      typeof d.sleepDayEnd === "number" && !Number.isNaN(d.sleepDayEnd)
        ? d.sleepDayEnd
        : typeof d.daySleepEndMinutes === "number" && !Number.isNaN(d.daySleepEndMinutes)
          ? d.daySleepEndMinutes
          : 1170;
    return {
      sleepNightStart: d.sleepNightStart ?? 1140, // 7:00 PM
      sleepNightEnd: d.sleepNightEnd ?? 420, // 7:00 AM
      // Day sleep window (naps): anything that STARTS within this window is treated as day sleep.
      // Defaults: 6:30 AM → 7:30 PM (matches your screenshot concept)
      sleepDayStart: dayStart, // 6:30 AM
      sleepDayEnd: dayEnd, // 7:30 PM
      // Back-compat fields for existing data/analytics callers
      daySleepStartMinutes: dayStart,
      daySleepEndMinutes: dayEnd,
      sleepTargetHours: hasOverride ? override : autoTarget,
      sleepTargetAutoHours: autoTarget,
      sleepTargetIsOverride: hasOverride
    };
  },

  async updateSleepSettings({ sleepNightStart, sleepNightEnd, sleepDayStart, sleepDayEnd, sleepTargetHours }) {
    const payload = {
      ...(sleepNightStart != null ? { sleepNightStart } : {}),
      ...(sleepNightEnd != null ? { sleepNightEnd } : {}),
      ...(sleepTargetHours != null ? { sleepTargetHours } : {})
    };

    const dayStartNum = Number(sleepDayStart);
    if (sleepDayStart != null && !Number.isNaN(dayStartNum)) {
      payload.sleepDayStart = dayStartNum;
      payload.daySleepStartMinutes = dayStartNum; // back-compat
    }

    const dayEndNum = Number(sleepDayEnd);
    if (sleepDayEnd != null && !Number.isNaN(dayEndNum)) {
      payload.sleepDayEnd = dayEndNum;
      payload.daySleepEndMinutes = dayEndNum; // back-compat
    }

    await this._kidRef().update(payload);
    logEvent("sleep_settings_updated", { sleepNightStart, sleepNightEnd, sleepDayStart: payload.sleepDayStart, sleepDayEnd: payload.sleepDayEnd, sleepTargetHours });
  },

  // -----------------------
  // KID PROFILE
  // -----------------------
  async getKidData() {
    const doc = await this._kidRef().get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async updateKidData(data) {
    await this._kidRef().set(data, { merge: true });
  },

  // -----------------------
  // AI CHAT
  // -----------------------
  async getConversation() {
    const doc = await this._kidRef()
      .collection("conversations")
      .doc("default")
      .get();
    return doc.exists ? doc.data() : { messages: [] };
  },

  async saveMessage(message) {
    const ref = this._kidRef()
      .collection("conversations")
      .doc("default");

    const doc = await ref.get();
    const messages = doc.exists ? doc.data().messages || [] : [];
    messages.push(message);

    await ref.set({ messages }, { merge: true });
  },

  async clearConversation() {
    await this._kidRef().collection("conversations").doc("default").delete();
  },

  // -----------------------
  // MEMBERS
  // -----------------------
  async getMembers() {
    return await getFamilyMembers(this.currentFamilyId);
  }
};

// In Firestore storage layer, add a helper if it doesn't exist yet
// (no-op if already present)
if (typeof firestoreStorage.setSleepTargetOverride !== 'function') {
  firestoreStorage.setSleepTargetOverride = async (kidId, hrsOrNull) => {
    // Use the family-scoped kid document (same as the rest of the storage layer)
    // so overrides persist instead of being written to a top-level /kids collection.
    const ref = firestoreStorage._kidRef();
    if (hrsOrNull === null) {
      await ref.set({
        sleepTargetOverrideHrs: firebase.firestore.FieldValue.delete(),
        sleepTargetHours: firebase.firestore.FieldValue.delete()
      }, { merge: true });
    } else {
      await ref.set({
        sleepTargetOverrideHrs: hrsOrNull,
        sleepTargetHours: hrsOrNull
      }, { merge: true });
    }
  };
}

// ========================================
// TINY TRACKER - PART 2
// App Wrapper, Login Screen, Baby Setup (family-aware)
// ========================================

const { useState, useEffect, useMemo } = React;

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // These now represent the NEW schema
  const [familyId, setFamilyId] = useState(null);
  const [kidId, setKidId] = useState(null);

  const [needsSetup, setNeedsSetup] = useState(false);

  // ----------------------------------------------------
  // KID SWITCH (multi-kid)
  // ----------------------------------------------------
  const handleKidChange = async (newKidId) => {
    if (!newKidId || newKidId === kidId || !familyId) return;
    setKidId(newKidId);
    try {
      await firestoreStorage.initialize(familyId, newKidId);
    } catch (err) {
      console.error("Failed to switch kid:", err);
    }
  };

  // ----------------------------------------------------
  // AUTH STATE CHANGE
  // ----------------------------------------------------
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUser(null);
        setKidId(null);
        setFamilyId(null);
        setNeedsSetup(false);
        setLoading(false);
        return;
      }

      setUser(u);

      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get("invite");

      try {
        //
        // 1️⃣ Ensure user profile exists
        //
        await ensureUserProfile(u, inviteCode);

        //
        // 2️⃣ Look up user's families (new schema)
        //
        const famSnap = await db
          .collection("families")
          .where("members", "array-contains", u.uid)
          .limit(1)
          .get();

        let resolvedFamilyId = null;
        let resolvedKidId = null;

        if (!famSnap.empty) {
          resolvedFamilyId = famSnap.docs[0].id;
          const familyData = famSnap.docs[0].data();

          //
          // 3️⃣ Look up kids inside this family
          //
          const kidSnap = await db
            .collection("families")
            .doc(resolvedFamilyId)
            .collection("kids")
            .get();

          if (!kidSnap.empty) {
            // prefer primaryKidId if present
            if (familyData.primaryKidId) {
              resolvedKidId = familyData.primaryKidId;
            } else {
              resolvedKidId = kidSnap.docs[0].id;
            }
          }
        }

        //
        // 4️⃣ Handle incoming invite
        //
        if (inviteCode) {
          const inviteResult = await acceptInvite(inviteCode, u.uid);

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);

          if (inviteResult && inviteResult.familyId && inviteResult.kidId) {
            resolvedFamilyId = inviteResult.familyId;
            resolvedKidId = inviteResult.kidId;
          }
        }

        //
        // 5️⃣ If no family OR no kid in the family → onboarding needed
        //
        if (!resolvedFamilyId || !resolvedKidId) {
          setNeedsSetup(true);
          setFamilyId(null);
          setKidId(null);
          setLoading(false);
          return;
        }

        //
        // 6️⃣ We now have full context → store & init
        //
        setFamilyId(resolvedFamilyId);
        setKidId(resolvedKidId);

        await firestoreStorage.initialize(resolvedFamilyId, resolvedKidId);

      } catch (err) {
        console.error("Setup error:", err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ----------------------------------------------------
  // LOADING SCREEN
  // ----------------------------------------------------
  if (loading) {
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center",
      },
      React.createElement(
        "div",
        { className: "text-center" },
        React.createElement("div", {
          className:
            "animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4",
        }),
        React.createElement("div", { className: "text-gray-600" }, "Loading...")
      )
    );
  }

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!user) {
    return React.createElement(LoginScreen);
  }

  // ----------------------------------------------------
  // ONBOARDING (now family-aware)
  // ----------------------------------------------------
  if (needsSetup) {
    return React.createElement(BabySetupScreen, {
      user,
      onComplete: async (createdFamilyId, createdKidId) => {
        setFamilyId(createdFamilyId);
        setKidId(createdKidId);
        setNeedsSetup(false);

        await firestoreStorage.initialize(createdFamilyId, createdKidId);
      },
    });
  }

  // ----------------------------------------------------
  // MAIN APP
  // ----------------------------------------------------
  return React.createElement(MainApp, {
    user,
    kidId,
    familyId,
    onKidChange: handleKidChange
  });
};

// =====================================================
// LOGIN SCREEN (Google + Email/Password, clearer modes)
// =====================================================

const LoginScreen = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error", error);
      setError("Google sign-in failed. Please try again.");
      setSigningIn(false);
    }
  };

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter an email and password.");
      return;
    }

    setSigningIn(true);
    setError(null);

    try {
      if (mode === "signup") {
        await signUpWithEmail(trimmedEmail, password);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
      // on success, onAuthStateChanged in App will take over
    } catch (error) {
      console.error("Email auth error", error);
      let friendly = "Something went wrong. Please try again.";

      if (
        error.code === "auth/invalid-login-credentials" ||
        error.code === "auth/wrong-password"
      ) {
        friendly = "Email or password is incorrect.";
      } else if (error.code === "auth/user-not-found") {
        friendly =
          "No account found for this email. Switch to “Create account” to sign up.";
      } else if (error.code === "auth/too-many-requests") {
        friendly =
          "Too many attempts. Please wait a moment and try again.";
      } else if (error.message) {
        friendly = error.message;
      }

      setError(friendly);
      setSigningIn(false);
    }
  };

  return React.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4",
    },
    React.createElement(
      "div",
      {
        className: "bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full",
      },
      // Header
      React.createElement(
        "div",
        { className: "text-center mb-8" },
        React.createElement(
          "div",
          { className: "flex items-center justify-center mb-4" },
          React.createElement(
            "div",
            { className: "bg-indigo-100 rounded-full p-4" },
            React.createElement(Baby, {
              className: "w-12 h-12 text-indigo-600",
            })
          )
        ),
        React.createElement(
          "h1",
          { className: "text-3xl font-bold text-gray-800 handwriting mb-2" },
          "Tiny Tracker"
        ),
        React.createElement(
          "p",
          { className: "text-gray-600" },
          "Track your baby's feeding journey"
        )
      ),

      // Google button
      React.createElement(
        "button",
        {
          onClick: handleSignIn,
          disabled: signingIn,
          className:
            "w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50",
        },
        React.createElement(
          "svg",
          { width: "20", height: "20", viewBox: "0 0 24 24" },
          React.createElement("path", {
            fill: "#4285F4",
            d:
              "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
          }),
          React.createElement("path", {
            fill: "#34A853",
            d:
              "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
          }),
          React.createElement("path", {
            fill: "#FBBC05",
            d:
              "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
          }),
          React.createElement("path", {
            fill: "#EA4335",
            d:
              "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
          })
        ),
        signingIn ? "Signing in..." : "Sign in with Google"
      ),

      // Error (for either Google or email)
      error &&
        React.createElement(
          "div",
          {
            className:
              "mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm",
          },
          error
        ),

      // Email/password section
      React.createElement(
        "div",
        { className: "mt-6 border-t border-gray-100 pt-4" },
        React.createElement(
          "p",
          { className: "text-sm text-gray-700 text-center font-medium" },
          "Or continue with email"
        ),

        // Mode pills
        React.createElement(
          "div",
          { className: "flex justify-center gap-2 mt-3" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setMode("login"),
              className:
                "px-3 py-1 text-xs rounded-full border " +
                (mode === "login"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200"),
            },
            "Log in"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setMode("signup"),
              className:
                "px-3 py-1 text-xs rounded-full border " +
                (mode === "signup"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200"),
            },
            "Create account"
          )
        ),

        React.createElement(
          "div",
          { className: "space-y-3 mt-4" },

          // Email input
          React.createElement("input", {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            placeholder: "Email",
            autoComplete: "email",
            className:
              "w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400",
          }),

          // Password input
          React.createElement("input", {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: "Password",
            autoComplete:
              mode === "signup" ? "new-password" : "current-password",
            className:
              "w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400",
          }),

          // Email submit button
          React.createElement(
            "button",
            {
              onClick: handleEmailSubmit,
              disabled: signingIn,
              className:
                "w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm",
            },
            mode === "signup"
              ? "Create account with email"
              : "Log in with email"
          )
        )
      ),

      React.createElement(
        "p",
        {
          className: "text-center text-xs text-gray-500 mt-6",
        },
        "Track feedings, invite your partner, and analyze patterns"
      )
    )
  );
};

// =====================================================
// BABY SETUP — now creates a FAMILY + KID
// =====================================================

const BabySetupScreen = ({ user, onComplete }) => {
  const getTodayLocalDateString = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
  };

  const [babyName, setBabyName] = useState("");
  const [babyWeight, setBabyWeight] = useState("");
  const [birthDate, setBirthDate] = useState(getTodayLocalDateString);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!babyName.trim()) {
      setError("Please enter your baby's name");
      return;
    }

    const weight = parseFloat(babyWeight);
    if (!weight || weight <= 0) {
      setError("Please enter a valid weight");
      return;
    }

    if (!birthDate) {
      setError("Please enter birth date");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const birthTimestamp = new Date(birthDate).getTime();

      //
      // Create a NEW family + kid
      //
      const famRef = await db.collection("families").add({
        members: [user.uid],
        name: `${babyName}'s family`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        primaryKidId: null,
      });

      const familyId = famRef.id;

      const kidRef = await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .add({
          name: babyName.trim(),
          ownerId: user.uid,
          birthDate: birthTimestamp,
          members: [user.uid],
          photoURL: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      const kidId = kidRef.id;

      // set primaryKidId
      await famRef.set({ primaryKidId: kidId }, { merge: true });

      // default settings
      await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .doc(kidId)
        .collection("settings")
        .doc("default")
        .set({
          babyWeight: weight,
          multiplier: 2.5,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      //
      // return family + kid to App
      //
      onComplete(familyId, kidId);
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return React.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4",
    },
    React.createElement(
      "div",
      {
        className: "bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full",
      },
      React.createElement(
        "div",
        { className: "text-center mb-6" },
        React.createElement(
          "div",
          { className: "flex items-center justify-center mb-4" },
          React.createElement(
            "div",
            { className: "bg-indigo-100 rounded-full p-3" },
            React.createElement(Baby, { className: "w-10 h-10 text-indigo-600" })
          )
        ),
        React.createElement(
          "h1",
          { className: "text-2xl font-bold text-gray-800 mb-2" },
          "Welcome to Tiny Tracker!"
        ),
        React.createElement(
          "p",
          { className: "text-gray-600" },
          "Let's set up your baby's profile"
        )
      ),

      React.createElement(
        "div",
        { className: "space-y-4" },

        React.createElement(
          "div",
          null,
          React.createElement(
            "label",
            { className: "block text-sm font-medium text-gray-700 mb-2" },
            "Baby's Name"
          ),
          React.createElement("input", {
            type: "text",
            value: babyName,
            onChange: (e) => setBabyName(e.target.value),
            placeholder: "Emma",
            className:
              "w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400",
          })
        ),

        React.createElement(
          "div",
          null,
          React.createElement(
            "label",
            { className: "block text-sm font-medium text-gray-700 mb-2" },
            "Current Weight (lbs)"
          ),
          React.createElement("input", {
            type: "number",
            step: "0.1",
            value: babyWeight,
            onChange: (e) => setBabyWeight(e.target.value),
            placeholder: "8.5",
            className:
              "w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400",
          })
        ),

        React.createElement(
          "div",
          { className: "min-w-0" }, // FIX: Prevent date input overflow on mobile - allow container to shrink
          React.createElement(
            "label",
            { className: "block text-sm font-medium text-gray-700 mb-2" },
            "Birth Date"
          ),
          React.createElement("input", {
            type: "date",
            value: birthDate,
            onChange: (e) => setBirthDate(e.target.value),
            className:
              "w-full min-w-0 max-w-full appearance-none box-border px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400",
          })
        ),

        error &&
          React.createElement(
            "div",
            {
              className:
                "p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm",
            },
            error
          ),

        React.createElement(
          "button",
          {
            onClick: handleSubmit,
            disabled: saving,
            className:
              "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50",
          },
          saving ? "Saving..." : "Get Started"
        )
      )
    )
  );
};

// ========================================
// TINY TRACKER - PART 3
// Main App with Bottom Navigation (family-aware)
// ========================================

// Lucide-style "share" (box + arrow up)
const ShareIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  },
  React.createElement('path', { d: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" }),
  React.createElement('polyline', { points: "16 6 12 2 8 6" }),
  React.createElement('line', { x1: "12", y1: "2", x2: "12", y2: "15" })
);

// Lucide-style link icon
const LinkIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  },
  React.createElement('path', { d: "M10 13a5 5 0 0 0 7.54.54l1.92-1.92a3 3 0 0 0-4.24-4.24l-1.1 1.1" }),
  React.createElement('path', { d: "M14 11a5 5 0 0 0-7.54-.54l-1.92 1.92a3 3 0 0 0 4.24 4.24l1.1-1.1" })
);

// Lucide-style "person add"
const PersonAddIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  },
  React.createElement('circle', { cx: "9", cy: "7", r: "3" }),
  React.createElement('path', { d: "M4 20v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1" }),
  React.createElement('line', { x1: "17", y1: "8", x2: "23", y2: "8" }),
  React.createElement('line', { x1: "20", y1: "5", x2: "20", y2: "11" })
);

// Lucide-style ChevronDown
const ChevronDown = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "6 9 12 15 18 9" })
);

// Per-kid theme palette
const KID_THEMES = {
  indigo: { bg: '#E0E7FF', accent: '#4F46E5', soft: '#EEF2FF' },
  health: { bg: '#F2F2F7', accent: '#4F46E5', soft: '#FFFFFF' },
  teal:   { bg: '#CCFBF1', accent: '#0F766E', soft: '#E0F2F1' },
  pink:   { bg: '#FCE7F3', accent: '#DB2777', soft: '#FDF2F8' },
  amber:  { bg: '#FEF3C7', accent: '#D97706', soft: '#FFFBEB' },
  purple: { bg: '#EDE9FE', accent: '#7C3AED', soft: '#F5F3FF' }
};


// =====================================================
// MAIN APP
// =====================================================

const MainApp = ({ user, kidId, familyId, onKidChange }) => {
  const [activeTab, setActiveTab] = useState('tracker');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const [kids, setKids] = useState([]);
  const [activeKid, setActiveKid] = useState(null);
  const [themeKey, setThemeKey] = useState('indigo');
  const [showKidMenu, setShowKidMenu] = useState(false);

  const [headerRequestedAddChild, setHeaderRequestedAddChild] = useState(false);

  const theme = KID_THEMES[themeKey] || KID_THEMES.indigo;

  useEffect(() => {
    try {
      requestAnimationFrame(() => window.scrollTo(0, 0));
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    document.title = 'Tiny Tracker';
  }, []);

  useEffect(() => {
    // Sync iOS Safari safe-area / browser chrome with active kid theme
    try {
      document.body.style.backgroundColor = theme.bg;
      document.documentElement.style.backgroundColor = theme.bg;
      if (typeof window.updateMetaThemeColor === 'function') {
        window.updateMetaThemeColor(theme);
      }
    } catch (e) {
      // non-fatal
    }
  }, [themeKey]);

  useEffect(() => {
    loadKidsAndTheme();
  }, [familyId, kidId]);

  async function loadKidsAndTheme() {
    if (!familyId || !kidId) return;

    try {
      const kidsSnap = await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .get();

      const list = kidsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setKids(list);

      const current = list.find(k => k.id === kidId) || null;
      setActiveKid(current);

      const settingsDoc = await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .doc(kidId)
        .collection("settings")
        .doc("default")
        .get();

      const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
      setThemeKey(settingsData.themeKey || "indigo");

    } catch (err) {
      console.error("Error loading kids/theme:", err);
    }
  }

  const handleSelectKid = (newKidId) => {
    if (!newKidId || newKidId === kidId) {
      setShowKidMenu(false);
      return;
    }
    if (typeof onKidChange === 'function') {
      onKidChange(newKidId);
    }
    setShowKidMenu(false);
  };

  // --------------------------------------
  // SHARE ACTIONS
  // --------------------------------------

  const handleGlobalShareApp = async () => {
    const url = window.location.origin + window.location.pathname;
  
    // Best path: native share sheet
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tiny Tracker",
          text: "Check out Tiny Tracker — track your baby's feedings and get insights!",
          url
        });
        return;
      } catch (err) {
        // User canceled share sheet — do nothing else
        return;
      }
    }
  
    // Fallback: copy link (only if focused), otherwise show prompt
    const text = `Check out Tiny Tracker — track your baby's feedings and get insights! ${url}`;
  
    try {
      if (document.hasFocus() && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert("Link copied!");
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (e) {
      window.prompt("Copy this link:", url);
    }
  };

  const handleGlobalInvitePartner = async () => {
    const resolvedKidId = kidId || (kids && kids.length ? kids[0].id : null);
  
    if (!familyId || !resolvedKidId) {
      alert("Something went wrong. Try refreshing.");
      return;
    }
  
    let link;
  
    // ---- ONLY invite creation can fail ----
    try {
      const code = await createInvite(familyId, resolvedKidId);
      link = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    } catch (err) {
      console.error("Invite creation failed:", err);
      alert("Failed to create invite.");
      return;
    }
  
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Tiny Tracker",
          text: "Come join me so we can track together.",
          url: link
        });
        return;
      } catch {
        return; // user cancelled → STOP, no clipboard
      }
    }
  
    // Only if share is NOT available
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        alert("Invite link copied!");
        return;
      } catch {}
    }
  
    window.prompt("Copy this invite link:", link);
  };


  // --------------------------------------
  // UI
  // --------------------------------------

  return React.createElement(
    'div',
    {
      className: "min-h-screen",
      style: {
        backgroundColor: theme.bg,
        paddingBottom: '80px'
      }
    },

    // WRAPPER (header + page content)
    React.createElement(
      'div',
      { className: "max-w-2xl mx-auto" },

      // ---------------- HEADER ----------------
      React.createElement(
        'div',
        {
          className: "sticky top-0 z-50",
          style: { backgroundColor: theme.bg }
        },
        React.createElement(
          'div',
          { className: "pt-4 pb-6 px-4 relative" },
          React.createElement(
            'div',
            { className: "flex items-center justify-between" },

            // LEFT: logo + "{kid}'s Tracker"
            React.createElement(
              'div',
              { className: "relative" },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onPointerDown: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowKidMenu((v) => !v);
                    setShowShareMenu(false);
                  },
                  className: "flex items-center gap-2 focus:outline-none"
                },
                React.createElement(
                  'div',
                  { className: "flex items-center justify-center mr-2" },
                  React.createElement(Baby, {
                    className: "w-8 h-8",
                    style: { color: theme.accent }
                  })
                ),
                React.createElement(
                  'span',
                  { className: "text-2xl font-semibold text-gray-800 handwriting leading-none" },
                  (activeKid?.name || 'Baby') + "'s Tracker"
                ),
                React.createElement(ChevronDown, {
                  className: "w-5 h-5 ml-2",
                  style: { color: theme.accent }
                })
              ),

              // Kid switcher dropdown
              showKidMenu && kids.length > 0 &&
                React.createElement(
                  'div',
                  {
                    className:
                      "absolute left-0 mt-3 w-60 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50",
                    onPointerDown: (e) => e.stopPropagation(),
                    onClick: (e) => e.stopPropagation()
                  },
                  kids.map((k) => {
                    const isCurrent = k.id === kidId;
                    return React.createElement(
                      'button',
                      {
                        key: k.id,
                        type: 'button',
                        onPointerDown: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectKid(k.id);
                        },
                        className:
                          "w-full px-3 py-2.5 text-sm flex items-center justify-between " +
                          (isCurrent ? "bg-indigo-50" : "hover:bg-gray-50")
                      },
                      React.createElement(
                        'span',
                        { className: "font-medium text-gray-800 truncate" },
                        k.name || 'Baby'
                      ),
                      React.createElement(
                        'span',
                        { className: "w-4 h-4 rounded-full border border-indigo-500 flex items-center justify-center" },
                        isCurrent ? React.createElement('span', { className: "w-2 h-2 rounded-full bg-indigo-500" }) : null
                      )
                    );
                  }),

                  // Add child
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onPointerDown: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowKidMenu(false);
                        setActiveTab('family');
                        setHeaderRequestedAddChild(true);
                      },
                      className:
                        "w-full px-3 py-2 text-xs font-medium text-indigo-600 border-t border-gray-100 text-left hover:bg-indigo-50"
                    },
                    "+ Add child"
                  )
                )
            ),

            // RIGHT: Share button
            React.createElement(
              'button',
              {
                type: 'button',
                onPointerDown: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowShareMenu((v) => !v);
                  setShowKidMenu(false);
                },
                className:
                  "w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition"
              },
              React.createElement(ShareIcon, {
                className: "w-4 h-4",
                style: { color: theme.accent }
              })
            ),

            // Share dropdown
            showShareMenu &&
              React.createElement(
                'div',
                {
                  className:
                    "absolute right-4 top-20 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50",
                  onPointerDown: (e) => e.stopPropagation(),
                  onClick: (e) => e.stopPropagation()
                },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onPointerDown: async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await handleGlobalShareApp();
                      setShowShareMenu(false);
                    },
                    className:
                      "w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-indigo-50 text-gray-800"
                  },
                  React.createElement(LinkIcon, { className: "w-4 h-4", style: { color: theme.accent } }),
                  "Share app link"
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onPointerDown: async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await handleGlobalInvitePartner();
                      setShowShareMenu(false);
                    },
                    className:
                      "w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-indigo-50 text-gray-800"
                  },
                  React.createElement(PersonAddIcon, { className: "w-4 h-4", style: { color: theme.accent } }),
                  "Invite partner"
                )
              )
          )
        )
      ),

      // ---------------- PAGE CONTENT ----------------
      React.createElement(
        'div',
        { className: "px-4" },
        activeTab === 'tracker' && React.createElement(TrackerTab, { user, kidId, familyId }),
        activeTab === 'analytics' && React.createElement(AnalyticsTab, { user, kidId, familyId }),
        activeTab === 'chat' && React.createElement(AIChatTab, { user, kidId, familyId, themeKey }),
        activeTab === 'family' && React.createElement(FamilyTab, {
          user,
          kidId,
          familyId,
          onKidChange,
          kids,
          themeKey,
          onThemeChange: setThemeKey,
          requestAddChild: headerRequestedAddChild,
          onRequestAddChildHandled: () => setHeaderRequestedAddChild(false)
        }),
        activeTab === 'settings' && React.createElement(SettingsTab, { user })
      )
    ),

    // Click-away overlay to close menus (UNDER dropdowns)
    (showShareMenu || showKidMenu) &&
      React.createElement('div', {
        className: "fixed inset-0 z-20",
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowShareMenu(false);
          setShowKidMenu(false);
        }
      }),

    // Bottom navigation
    React.createElement(
      'div',
      {
        className: "fixed bottom-0 left-0 right-0 z-50",
        style: {
          backgroundColor: theme.bg,
          boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }
      },
      React.createElement(
        'div',
        { className: "max-w-2xl mx-auto flex items-center justify-around px-4 py-3" },
        [
          { id: 'tracker', icon: BarChart, label: 'Tracker' },
          { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
          { id: 'chat', icon: MessageCircle, label: 'AI Chat' },
          { id: 'family', icon: Users, label: 'Family' },
          { id: 'settings', icon: Menu, label: 'Settings' }
        ].map((tab) =>
          React.createElement(
            'button',
            {
              key: tab.id,
              type: 'button',
              onClick: () => {
                setActiveTab(tab.id);
                setShowShareMenu(false);
                setShowKidMenu(false);
              },
              className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
              style: { color: activeTab === tab.id ? theme.accent : '#9CA3AF' }
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
// TINY TRACKER - PART 4  
// Tracker Tab - Main Feeding Interface
// ========================================

const TrackerTab = ({ user, kidId, familyId }) => {
  const [babyWeight, setBabyWeight] = useState(null);
  const [multiplier, setMultiplier] = useState(2.5);
  const [ounces, setOunces] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [feedings, setFeedings] = useState([]);
  const [sleepSessions, setSleepSessions] = useState([]);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [yesterdayConsumed, setYesterdayConsumed] = useState(0);
  const [yesterdayFeedingCount, setYesterdayFeedingCount] = useState(0);
  const [sleepTodayMs, setSleepTodayMs] = useState(0);
  const [sleepTodayCount, setSleepTodayCount] = useState(0);
  const [sleepYesterdayMs, setSleepYesterdayMs] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingFeedingId, setEditingFeedingId] = useState(null);
  const [editOunces, setEditOunces] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingSleepId, setEditingSleepId] = useState(null);
  const [sleepEditStartStr, setSleepEditStartStr] = useState('');
  const [sleepEditEndStr, setSleepEditEndStr] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [logMode, setLogMode] = useState('feeding');

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

  const loadSleepSessions = async () => {
    try {
      const sessions = await firestoreStorage.getSleepSessionsLastNDays(8);
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
    } catch (err) {
      console.error("Failed to load sleep sessions", err);
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
    try {
      const allFeedings = await firestoreStorage.getFeedingsLastNDays(8);
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

      const yFeedings = allFeedings.filter(f => f.timestamp >= yStart.getTime() && f.timestamp <= yEnd.getTime());
      const yConsumed = yFeedings.reduce((sum, f) => sum + (f.ounces || 0), 0);
      setYesterdayConsumed(yConsumed);
      setYesterdayFeedingCount(yFeedings.length);

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
  const feedingDeltaLabel = `${feedingDeltaOz >= 0 ? '+' : '-'}${_fmtDelta(feedingDeltaOz)} oz`;
  const feedingDeltaIsGood = feedingDeltaOz >= 0;
  const sleepDeltaLabel = `${sleepDeltaHours >= 0 ? '+' : '-'}${_fmtDelta(sleepDeltaHours)} hrs`;
  const sleepDeltaIsGood = sleepDeltaHours >= 0;
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
    ),
    
    // Log Feeding Card
    React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      null,
      React.createElement('div', { className: "mt-3 mb-4 inline-flex w-full bg-gray-100 rounded-xl p-1" },
        React.createElement('button', {
          onClick: () => setLogMode('feeding'),
          className: logMode === 'feeding'
            ? "flex-1 py-2 rounded-lg bg-white shadow text-gray-900 font-semibold"
            : "flex-1 py-2 rounded-lg text-gray-600"
        }, 'Feed'),
        React.createElement('button', {
          onClick: () => setLogMode('sleep'),
          className: logMode === 'sleep'
            ? "flex-1 py-2 rounded-lg bg-white shadow text-gray-900 font-semibold"
            : "flex-1 py-2 rounded-lg text-gray-600"
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
                  { className: "text-indigo-600 text-xs font-bold select-none", style: { animation: "ttZzz 2.4s ease-in-out infinite" } },
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
            step: "0.25",
            placeholder: "Ounces",
            value: ounces,
            onChange: (e) => setOunces(e.target.value),
            onKeyPress: (e) => e.key === 'Enter' && !showCustomTime && handleAddFeeding(),
            className: "min-w-0 flex-1 px-4 py-2.5 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
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
            className: `shrink-0 px-4 py-2.5 rounded-xl transition ${showCustomTime ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
          }, React.createElement(Clock, { className: "w-5 h-5" }))
        ),

        showCustomTime && React.createElement('input', {
          type: "time",
          value: customTime,
          onChange: (e) => setCustomTime(e.target.value),
          className: "block w-full min-w-0 max-w-full appearance-none box-border px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
        }),

        React.createElement('button', {
          onClick: handleAddFeeding,
          className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
        },
          React.createElement(Plus, { className: "w-5 h-5" }),
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
                React.createElement('div', { className: "text-sm text-gray-500 mb-1" }, 'Start'),
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
                      className: "text-indigo-600 font-semibold bg-transparent text-center"
                    })
                  : React.createElement(
                      'div',
                      {
                        className:
                          "inline-block px-3 py-2 rounded-lg bg-gray-50 text-indigo-600 font-semibold text-lg cursor-pointer",
                        onClick: () => setEditingSleepField('start')
                      },
                      _toHHMMNoZero(activeSleep.startTime)
                    )
              ),

              React.createElement(
                'div',
                null,
                React.createElement('div', { className: "text-sm text-gray-500 mb-1" }, 'End'),
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
                      className: "text-indigo-600 font-semibold bg-transparent text-center"
                    })
                  : React.createElement(
                      'div',
                      {
                        className:
                          "inline-block px-3 py-2 rounded-lg bg-gray-50 text-indigo-600 font-semibold text-lg cursor-pointer",
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
                className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold",
                onClick: async () => await firestoreStorage.startSleep(Date.now())
              },
              'Start Sleep'
            ),

          activeSleep &&
            React.createElement(
              'button',
              {
                className: "w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold",
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
      { className: "bg-white rounded-2xl shadow-lg p-6 mt-6" },
      React.createElement(
        'h2',
        { className: "text-lg font-semibold text-gray-800 mb-4" },
        `Sleep · ${sleepSessions.length}`
      ),
      sleepSessions.length === 0
        ? React.createElement(
            'div',
            { className: "text-gray-400 text-center py-6" },
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
                    ? React.createElement('div', { className: "trackerEditCard p-4 bg-indigo-50 rounded-xl" },
                        React.createElement('div', { className: "trackerEditBlock space-y-3 w-full max-w-[520px] mx-auto" },
                          React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
                            React.createElement('div', { className: "editField min-w-0" },
                              React.createElement('div', { className: "editFieldLabel text-xs font-semibold text-gray-500 mb-1" }, 'Start'),
                              React.createElement('input', {
                                type: 'time',
                                value: sleepEditStartStr,
                                onChange: (e) => setSleepEditStartStr(e.target.value),
                                className: "w-full h-11 min-w-0 appearance-none bg-white px-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                              })
                            ),
                            React.createElement('div', { className: "editField min-w-0" },
                              React.createElement('div', { className: "editFieldLabel text-xs font-semibold text-gray-500 mb-1" }, 'End'),
                              React.createElement('input', {
                                type: 'time',
                                value: sleepEditEndStr,
                                onChange: (e) => setSleepEditEndStr(e.target.value),
                                className: "w-full h-11 min-w-0 appearance-none bg-white px-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                              })
                            )
                          ),
                            React.createElement(TrackerEditActions, { onSave: handleSaveSleepEdit, onCancel: handleCancelSleepEdit })
                          )
                        )
                      : React.createElement('div', { className: "flex justify-between items-center p-4 bg-gray-50 rounded-xl" },
                      React.createElement('div', { className: "flex items-center gap-3" },
                        React.createElement(
                          'div',
                          {
                            className: "bg-indigo-100 rounded-full flex items-center justify-center",
                            style: { width: '48px', height: '48px' }
                          },
                          React.createElement('span', { className: "text-xl" }, sleepEmoji)
                        ),
                        React.createElement(
                          'div',
                          {},
                          React.createElement('div', { className: "font-semibold text-gray-800" }, durLabel),
                          React.createElement(
                            'div',
                            { className: "text-sm text-gray-500" },
                            `${startLabel} – ${endLabel}`
                          )
                        )
                      ),
                      React.createElement('div', { className: "flex gap-2" },
                        React.createElement('button', {
                          onClick: () => handleStartEditSleep(s),
                          className: "text-indigo-600 hover:text-indigo-700 transition"
                        }, React.createElement(Edit2, { className: "w-5 h-5" })),
                        React.createElement('button', {
                          onClick: () => handleDeleteSleepSession(s.id),
                          className: "text-red-400 hover:text-red-600 transition"
                        }, React.createElement(X, { className: "w-5 h-5" }))
                      )
                    )
              );
            })
          )
    ),
    // Feedings List
    (logMode === 'feeding') && React.createElement('div', { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement('h2', { className: "text-lg font-semibold text-gray-800 mb-4" }, `Feedings · ${feedings.length}`),
      feedings.length === 0 ?
        React.createElement('p', { className: "text-gray-400 text-center py-8" }, 'No feedings logged for this day')
      :
        React.createElement('div', { className: "space-y-3" },
          feedings.map((feeding) =>
            React.createElement('div', { key: feeding.id },
              editingFeedingId === feeding.id ?
                React.createElement('div', { className: "trackerEditCard p-4 bg-indigo-50 rounded-xl" },
                  React.createElement('div', { className: "trackerEditBlock space-y-3 w-full max-w-[520px] mx-auto" },
                    React.createElement('div', { className: "trackerEditGrid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full" },
                      React.createElement('div', { className: "feedingAmountField relative w-full min-w-0" },
                        React.createElement('input', {
                          type: "number",
                          step: "0.25",
                          value: editOunces,
                          onChange: (e) => setEditOunces(e.target.value),
                          placeholder: "Ounces",
                          className: "feedingAmountInput w-full h-11 min-w-0 appearance-none bg-white px-3 pr-10 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                        }),
                        React.createElement('span', { className: "feedingAmountUnit absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none" }, 'oz')
                      ),
                      React.createElement('input', {
                        type: "time",
                        value: editTime,
                        onChange: (e) => setEditTime(e.target.value),
                        className: "w-full h-11 min-w-0 appearance-none bg-white px-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                      })
                    ),
                    React.createElement(TrackerEditActions, { onSave: handleSaveEdit, onCancel: handleCancelEdit })
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
// Uses app's indigo color scheme: bg=#E0E7FF, accent=#4F46E5, soft=#EEF2FF
// =====================================================
const DailyActivityChart = ({
  viewMode = 'day', // 'day' | 'week' | 'month'
  feedings = [],
  sleepSessions = [],
  sleepSettings = null
}) => {
  // ========================================
  // ACTOGRAM: "Apple Health" polish + bulletproofing
  // ========================================
  // Turn on locally if you need it, but keep it off for production.
  const DEBUG_ACTOGRAM = false;
  const dlog = (...args) => { try { if (DEBUG_ACTOGRAM) console.log('[ACTOGRAM]', ...args); } catch {} };

  // Apple Health-ish styling constants (local to this component)
  const TT = {
    cardH: 420,           // KEEP CONSISTENT across day/week/month
    headerH: 48,          // slightly tighter header for better chart breathing room
    axisW: 52,            // quiet gutter
    gridMajor: 'rgba(17,24,39,0.08)',
    gridMinor: 'rgba(17,24,39,0.04)',
    axisTextClass: 'text-[12px] font-medium text-gray-500',
    nowGreen: '#22C55E',
    // Event colors (match legend)
    sleepNight: 'rgba(79,70,229,0.72)', // indigo
    sleepDay:   'rgba(96,165,250,0.72)', // blue
    feedPink:   '#EC4899',
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
  const days = effectiveViewMode === 'day' ? 1 : 7; // week/month: 7-day rolling window
  const [offsetDays, setOffsetDays] = React.useState(0); // 0 = week/day ending today
  const stepDays = 7; // nav always moves week-over-week for consistency

  const clampOffset = (n) => Math.max(0, Math.floor(Number(n) || 0));
  const pageBack = () => setOffsetDays((n) => clampOffset(n + stepDays));
  const pageFwd = () => setOffsetDays((n) => clampOffset(n - stepDays));
  const scrollRef = React.useRef(null);     // single horizontal scroller (header + plot) - MUST be overflow-x-auto
  const plotScrollRef = React.useRef(null); // day-view vertical scroll container

  // Apple-style current time (axis-owned, not column-owned)
  const nowMs = Date.now();

  // Auto-scroll to the most recent day (ONLY on today; do not fight paging)
  React.useEffect(() => {
    if (offsetDays !== 0) return;
    if (effectiveViewMode === 'day') return;

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

  dlog('viewMode', effectiveViewMode, 'days', days, 'offsetDays', offsetDays);

  // End day for the visible range
  const endDay0 = today0 - clampOffset(offsetDays) * 86400000;

  const dayStarts = React.useMemo(() => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) out.push(endDay0 - i * 86400000);
    return out;
  }, [days, endDay0]);

  const hasToday = React.useMemo(() => dayStarts.includes(today0), [dayStarts, today0]);
  const showNow = hasToday && effectiveViewMode !== 'month';
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
  const PLOT_H = 220; // small reduction to guarantee room for bottom legend inside fixed-height card
  const PAD_T = 10;
  const PAD_B = 14; // give the bottom "12 AM" label a few extra px so it never clips
  const PLOT_TOTAL_H = PLOT_H + PAD_T + PAD_B;
  const yPxFromPct = (pct) => PAD_T + (pct / 100) * PLOT_H;
  // Exact tick Y used throughout the chart (mins from 0..1440)
  // NOTE: We do NOT change the gridlines here; we only use this to align labels precisely.
  const tickY = React.useCallback((hour) => {
    const mins = Number(hour) * 60;
    return PAD_T + (mins / (24 * 60)) * PLOT_H;
  }, [PAD_T, PLOT_H]);
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
          React.createElement(ChevronLeft, { className: 'w-5 h-5' })
        ),
        React.createElement(
          'div',
          { className: 'text-[16px] font-semibold text-gray-900' },
          new Date(dayStarts[Math.floor(dayStarts.length / 2)]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: pageFwd,
            disabled: offsetDays <= 0,
            className: `p-2 rounded-lg transition ${offsetDays <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`
          },
          React.createElement(ChevronRight, { className: 'w-5 h-5' })
        )
      ),

      // Scrollable time-grid (ONE scroll container; header + gutter are sticky)
      React.createElement(
        'div',
        {
          // IMPORTANT: Do NOT let the chart consume all remaining height (or the bottom legend gets clipped).
          // Give it an explicit height so the legend below always has room inside the fixed-height card.
          className: 'px-4 pb-3 flex-none',
          style: {
            overscrollBehavior: 'contain',
            height: TT.headerH + PLOT_TOTAL_H + 6
          }
        },
        React.createElement(
          'div',
          {
            // NO SCROLL: everything must fit on the card (24h + 7 days)
            className: 'w-full h-full overflow-hidden rounded-xl',
            style: {
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              scrollbarGutter: 'stable'
            },
            ref: (el) => {
              // Single scroll container for BOTH horizontal + vertical behaviors
              scrollRef.current = el;
              plotScrollRef.current = el;
            }
          },

          // Inner content: allow week/month to scroll horizontally while still filling the card
          React.createElement(
            'div',
            {
              className: 'min-w-full',
              style: {
                // NO HORIZONTAL SCROLL: force the 7 columns to fit the available card width
                minWidth: '100%',
                width: '100%'
              }
            },

            // Sticky header row (day strip) — MUST be a fixed height so week headers can't grow and clip the plot
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
                  // Remove this separator so the 12 AM gridline becomes the single top separator.
                  borderBottom: 'none',
                  height: TT.headerH,
                  maxHeight: TT.headerH,
                  // NO HORIZONTAL SCROLL: columns are equal fractions
                  gridTemplateColumns: `${TT.axisW}px ${effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`}`
                }
              },
              // Axis header spacer
              React.createElement('div', { style: { height: TT.headerH } }),
              // Day headers (clamp height so content can't expand the header row)
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
                  const daySub = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
                        style: isToday
                          ? {
                              borderRadius: 12,           // softer rounded-rect, not a pill
                              paddingTop: 6,
                              paddingBottom: 6
                            }
                          : { overflow: 'hidden' }
                      },
                      React.createElement('div', { className: 'text-[11px] font-medium tracking-[0.5px] text-gray-400 leading-none' }, dayName),
                      React.createElement(
                        'div',
                        { className: `mt-[2px] text-[16px] font-semibold leading-none ${isToday ? 'text-indigo-600' : 'text-gray-900'}` },
                        effectiveViewMode === 'day' ? daySub : String(dayNum)
                      )
                    )
                  );
                })
              )
            ),

            // Body row: axis + day columns share ONE coordinate system
            React.createElement(
              'div',
              {
                className: 'grid relative',
                style: {
                  gridTemplateColumns: `${TT.axisW}px ${effectiveViewMode === 'day' ? '1fr' : `repeat(${days}, 1fr)`}`,
                  height: PLOT_TOTAL_H
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
                    React.createElement('div', {
                      key: `ylab-${h.i}`,
                      className: 'absolute right-2 text-right',
                      style: {
                        // Align the *center* of the label to the 1px gridline position.
                        // (Gridlines are 1px; visually they sit best when labels are offset by 0.5px.)
                        top: `${tickY(h.i) - 0.5}px`,
                        transform: 'translateY(-50%)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap'
                      }
                    }, renderGutterTime(h.label))
                  ),

                  // Now indicator (axis-owned): dot + connector stub so it feels attached to the now line
                  showNow && React.createElement(
                    React.Fragment,
                    null,
                    // Small green stub that reaches into the grid area
                    React.createElement('div', {
                      className: 'absolute',
                      style: {
                        top: `${nowYClamped}px`,
                        right: -3,
                        width: 14,
                        height: 2,
                        background: TT.nowGreen,
                        transform: 'translateY(-50%)',
                        borderRadius: 2,
                        zIndex: 55,
                        pointerEvents: 'none'
                      }
                    }),
                    React.createElement('div', {
                      className: 'absolute',
                      style: {
                        top: `${nowYClamped}px`,
                        // Straddle the gutter/grid boundary so the dot is "attached" to the now line
                        right: -3,
                        width: 6,
                        height: 6,
                        background: TT.nowGreen,
                        transform: 'translateY(-50%)',
                        borderRadius: 999,
                        zIndex: 60,
                        pointerEvents: 'none'
                      }
                    })
                  )
                )
              ),

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
                        top: `${(PAD_T + ((i * 60) / (24 * 60)) * PLOT_H) - 0.5}px`,
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
                        top: `${(PAD_T + ((i * 60) / (24 * 60)) * PLOT_H) - 0.5}px`,
                        height: 1,
                        background: TT.gridMinor
                      }
                    })
                  )
                ),

                // Now line (spans the full grid width)
                showNow && React.createElement('div', {
                  className: 'pointer-events-none absolute left-0 right-0',
                  style: {
                    top: `${nowYClamped}px`,
                    transform: 'translateY(-50%)',
                    height: 2,
                    background: TT.nowGreen,
                    zIndex: 25
                  }
                }),

                // Columns + events
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
                        isToday && React.createElement('div', {
                          className: 'absolute left-0 right-0 pointer-events-none',
                          style: {
                            top: `${PAD_T}px`,
                            height: `${PLOT_H}px`,
                            background: 'rgba(79,70,229,0.06)',
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
                            const allow = (sleepType === 'night') ? legendOn.sleep : legendOn.nap;
                            if (!allow) continue;

                            const isActive = ev.isActive;
                            const endTime = isActive ? nowMsLocal : (ev.e || nowMsLocal);

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
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)',
                                  zIndex: 10
                                }
                              })
                            );

                            // Nap label: only in Day view + tall enough + not active
                            if (sleepType === 'day' && !isActive && effectiveViewMode === 'day' && hPx >= 26) {
                              children.push(
                                React.createElement('div', {
                                  key: `sleep-label-${baseKey}`,
                                  className: 'absolute left-3 text-[9px] font-semibold bg-white px-1 py-0.5 rounded shadow-sm',
                                  style: {
                                    top: `${Math.max(0, topPx - 7)}px`,
                                    color: '#3B82F6',
                                    border: '1px solid rgba(59,130,246,0.2)',
                                    zIndex: 15
                                  }
                                }, 'Nap')
                              );
                            }

                            // Active indicator (day view only; keep quiet)
                            if (isActive && effectiveViewMode === 'day') {
                              children.push(
                                React.createElement('div', {
                                  key: `sleep-active-${baseKey}`,
                                  className: 'absolute left-3 text-[9px] font-semibold bg-white px-1 py-0.5 rounded shadow-sm',
                                  style: {
                                    top: `${Math.min(PLOT_TOTAL_H - 8, bottomPx + 6)}px`,
                                    color: '#4F46E5',
                                    border: '1px solid rgba(79,70,229,0.2)',
                                    zIndex: 15
                                  }
                                }, ' Active')
                              );
                            }
                          }
                          return children;
                        })(),

                        // Feed ticks
                        legendOn.feed ? dayFeeds.map((ev, idx) => {
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
                        }) : null
                      )
                    );
                  })
                )
              )
            )
          )
        ),

      // Legend (MOVED BELOW the chart; wrap-safe so it cannot squish the grid)
      React.createElement(
        'div',
        { className: 'px-4 pt-2 pb-4 w-full' },
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

const AnalyticsTab = ({ user, kidId, familyId }) => {
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

    // Global 3-day bootstrap rule:
    // - If we have <= 3 distinct days of data, include today in the window.
    // - Once we have > 3 distinct days of data, all windows use only completed days (exclude today).
    const bootstrap = allUniqueDays <= 3;

    let periodStart, periodEnd;
    if (bootstrap) {
      // Include today: last `numDays` days up through the end of today
      periodEnd = todayStart + MS_PER_DAY; // end of today
      periodStart = periodEnd - numDays * MS_PER_DAY;
    } else {
      // Exclude today: last `numDays` full days before today
      periodEnd = todayStart; // start of today (exclusive upper bound)
      periodStart = todayStart - numDays * MS_PER_DAY;
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
      if (!grouped[key])
        grouped[key] = { date: key, volume: 0, count: 0 };
      grouped[key].volume += f.ounces;
      grouped[key].count += 1;
    });
    // Oldest on left, newest on right
    return Object.values(grouped).map(item => ({
      date: item.date,
      volume: parseFloat(item.volume.toFixed(1)),
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
    const tail = (arr) => arr.slice(Math.max(0, arr.length - Math.min(windowN, arr.length)));

    const avgTotal = _avg(tail(totals));
    const avgDay = _avg(tail(days));
    const avgNight = _avg(tail(nights));
    const avgSleeps = _avg(tail(counts));
    return {
      label,
      avgTotal,
      avgDay,
      avgNight,
      avgSleeps
    };
  }, [timeframe, sleepBuckets]);

  if (loading) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement(
        'div',
        { className: 'text-gray-600' },
        'Loading analytics...'
      )
    );
  }

  if (allFeedings.length === 0) {
    return React.createElement(
      'div',
      { className: 'bg-white rounded-2xl shadow-lg p-6' },
      React.createElement(
        'div',
        {
          className:
            'text-center text-gray-400 py-8'
        },
        'No feeding data yet. Start logging feedings to see analytics!'
      )
    );
  }

  const maxVolume = Math.max(
    ...stats.chartData.map(d => d.volume)
  );

  return React.createElement(
    'div',
    { className: 'space-y-4' },

    // Section title OUTSIDE the card (matches your preference)
    React.createElement('div', {
      className: "section-title",
      style: { fontWeight: 700, fontSize: 18, margin: "4px 0 10px" }
    }, "Daily Activity"),
    React.createElement(DailyActivityChart, {
      viewMode: timeframe, // day | week | month drives the actogram
      feedings: allFeedings,
      sleepSessions: sleepSessions,
      sleepSettings: sleepSettings
    }),

    // Day/Week/Month toggle (BELOW actogram, applies to everything)

    React.createElement(
      'div',
      { className: 'flex justify-center' },
      React.createElement(
        'div',
        {
          className:
            'inline-flex gap-0.5 bg-gray-100/50 rounded-lg p-0.5'
        },
        ['day', 'week', 'month'].map(range =>
          React.createElement(
            'button',
            {
              key: range,
              onClick: () => {
                setTimeframe(range);
                if (window.trackTabSelected) {
                  window.trackTabSelected(
                    `analytics_${range}`
                  );
                }
              },
              className: `px-4 py-1.5 rounded-md text-xs font-medium transition ${
                timeframe === range
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            },
            range.charAt(0).toUpperCase() + range.slice(1)
          )
        )
      )
    ),
    // ---- Feeding stats header (should be BELOW day/week/month picker)
    React.createElement('div', { className: "section-title", style: { fontWeight: 700, fontSize: 18, margin: "4px 0 10px" } }, "Feeding stats"),

    React.createElement(
      'div',
      { className: 'grid grid-cols-2 gap-4' },
      [
        { label: 'Oz / Feed', value: stats.avgVolumePerFeed.toFixed(1) },
        { label: 'Oz / Day', value: stats.avgVolumePerDay.toFixed(1) }
      ].map(stat =>
        React.createElement(
          'div',
          {
            key: stat.label,
            className:
              'bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center'
          },
          React.createElement(
            'div',
            {
              className:
                'text-sm font-medium text-gray-600 mb-2'
            },
            stat.label
          ),
          React.createElement(
            'div',
            {
              className:
                'text-2xl font-bold text-indigo-600'
            },
            stat.value,
            React.createElement(
              'span',
              {
                className:
                  'text-sm font-normal text-gray-400 ml-1'
              },
              'oz'
            )
          ),
          React.createElement(
            'div',
            {
              className:
                'text-xs text-gray-400 mt-1'
            },
            stats.labelText
          )
        )
      )
    ),

    React.createElement(
      'div',
      { className: 'grid grid-cols-2 gap-4' },
      React.createElement(
        'div',
        {
          className:
            'bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center'
        },
        React.createElement(
          'div',
          {
            className:
              'text-sm font-medium text-gray-600 mb-2'
          },
          'Feedings / Day'
        ),
        React.createElement(
          'div',
          {
            className:
              'text-2xl font-bold text-indigo-600'
          },
          stats.avgFeedingsPerDay.toFixed(1)
        ),
        React.createElement(
          'div',
          {
            className:
              'text-xs text-gray-400 mt-1'
          },
          stats.labelText
        )
      ),
      React.createElement(
        'div',
        {
          className:
            'bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center'
        },
        React.createElement(
          'div',
          {
            className:
              'text-sm font-medium text-gray-600 mb-2'
          },
          'Time Between Feeds'
        ),
        React.createElement(
          'div',
          {
            className:
              'text-2xl font-bold text-indigo-600'
          },
          formatInterval(stats.avgInterval)
        ),
        React.createElement(
          'div',
          {
            className:
              'text-xs text-gray-400 mt-1'
          },
          stats.labelText
        )
      )
    ),

    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl shadow-lg p-6' },
      React.createElement(
        'div',
        {
          className:
            'text-sm font-medium text-gray-600 mb-2.5 text-center'
        },
        'Volume History'
      ),
      stats.chartData.length > 0
        ? React.createElement(
            'div',
            { className: 'relative' },
            React.createElement(
              'div',
              {
                ref: chartScrollRef,
                className:
                  'overflow-x-auto overflow-y-hidden -mx-6 px-6',
                style: { scrollBehavior: 'smooth' }
              },
              React.createElement(
                'div',
                {
                  className: 'flex gap-6 pb-2',
                  style: {
                    minWidth:
                      stats.chartData.length > 4
                        ? `${stats.chartData.length * 80}px`
                        : '100%'
                  }
                },
                stats.chartData.map(item =>
                  React.createElement(
                    'div',
                    {
                      key: item.date,
                      className:
                        'flex flex-col items-center gap-2 flex-shrink-0'
                    },
                    React.createElement(
                      'div',
                      {
                        className:
                          'flex flex-col justify-end items-center',
                        style: {
                          height: '180px',
                          width: '60px'
                        }
                      },
                      React.createElement(
                        'div',
                        {
                          className:
                            'w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500',
                          style: {
                            height: `${
                              (item.volume / maxVolume) * 160
                            }px`,
                            minHeight: '30px'
                          }
                        },
                        React.createElement(
                          'div',
                          {
                            className:
                              'text-white font-semibold'
                          },
                          React.createElement(
                            'span',
                            { className: 'text-xs' },
                            item.volume
                          ),
                          React.createElement(
                            'span',
                            {
                              className:
                                'text-[10px] opacity-70 ml-0.5'
                            },
                            'oz'
                          )
                        )
                      )
                    ),
                    React.createElement(
                      'div',
                      {
                        className:
                          'text-xs text-gray-600 font-medium'
                      },
                      item.date
                    ),
                    React.createElement(
                      'div',
                      {
                        className:
                          'text-xs text-gray-400'
                      },
                      `${item.count} feeds`
                    )
                  )
                )
              )
            )
          )
        : React.createElement(
            'div',
            {
              className:
                'text-center text-gray-400 py-8'
            },
            'No data to display'
          )
    ),

    // ---- Sleep stats header
    React.createElement(
      "div",
      { className: "section-title", style: { fontWeight: 700, fontSize: 18, margin: "18px 0 10px" } },
      "Sleep stats"
    ),

    // 4 cards styled exactly like Feeding stats cards
    React.createElement(
      "div",
      { className: "grid grid-cols-2 gap-4" },
      React.createElement(
        "div",
        { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
        React.createElement("div", { className: "text-sm font-medium text-gray-600 mb-2" }, "Total Sleep"),
        React.createElement(
          "div",
          { className: "flex items-baseline justify-center gap-1 text-2xl font-bold text-indigo-600" },
          Number(sleepCards.avgTotal || 0).toFixed(1),
          React.createElement("span", { className: "text-sm font-normal text-gray-400" }, "hrs")
        ),
        React.createElement("div", { className: "text-xs text-gray-400 mt-1" }, sleepCards.label)
      ),
      React.createElement(
        "div",
        { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
        React.createElement("div", { className: "text-sm font-medium text-gray-600 mb-2" }, "Day Sleep"),
        React.createElement(
          "div",
          { className: "flex items-baseline justify-center gap-1 text-2xl font-bold text-indigo-600" },
          Number(sleepCards.avgDay || 0).toFixed(1),
          React.createElement("span", { className: "text-sm font-normal text-gray-400" }, "hrs")
        ),
        React.createElement("div", { className: "text-xs text-gray-400 mt-1" }, sleepCards.label)
      ),
      React.createElement(
        "div",
        { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
        React.createElement("div", { className: "text-sm font-medium text-gray-600 mb-2" }, "Night Sleep"),
        React.createElement(
          "div",
          { className: "flex items-baseline justify-center gap-1 text-2xl font-bold text-indigo-600" },
          Number(sleepCards.avgNight || 0).toFixed(1),
          React.createElement("span", { className: "text-sm font-normal text-gray-400" }, "hrs")
        ),
        React.createElement("div", { className: "text-xs text-gray-400 mt-1" }, sleepCards.label)
      ),
      React.createElement(
        "div",
        { className: "bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center" },
        React.createElement("div", { className: "text-sm font-medium text-gray-600 mb-2" }, "Sleeps / Day"),
        React.createElement(
          "div",
          { className: "flex items-baseline justify-center gap-1 text-2xl font-bold text-indigo-600" },
          Number(sleepCards.avgSleeps || 0).toFixed(1)
        ),
        React.createElement("div", { className: "text-xs text-gray-400 mt-1" }, sleepCards.label)
      )
    ),

    // ---- Sleep history (COPY OF VOLUME HISTORY, TOTAL SLEEP HOURS)
    React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow-lg p-6" },
      React.createElement(
        "div",
        { className: "text-sm font-medium text-gray-600 mb-2.5 text-center" },
        "Sleep history"
      ),
      sleepBuckets.length > 0
        ? React.createElement(
            "div",
            { className: "relative" },
            React.createElement(
              "div",
              {
                ref: sleepHistoryScrollRef,
                className: "overflow-x-auto overflow-y-hidden -mx-6 px-6",
                style: { scrollBehavior: "smooth" }
              },
              React.createElement(
                "div",
                {
                  className: "flex gap-6 pb-2",
                  style: {
                    minWidth:
                      sleepBuckets.length > 4
                        ? `${sleepBuckets.length * 80}px`
                        : "100%"
                  }
                },
                sleepBuckets.map((b) =>
                  React.createElement(
                    "div",
                    {
                      key: b.key,
                      className: "flex flex-col items-center gap-2 flex-shrink-0"
                    },
                    React.createElement(
                      "div",
                      {
                        className: "flex flex-col justify-end items-center",
                        style: { height: "180px", width: "60px" }
                      },
                      React.createElement(
                        "div",
                        {
                          className: "w-full bg-indigo-600 rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500",
                          style: {
                            height: `${
                              (Number(b.totalHrs || 0) /
                                Math.max(...sleepBuckets.map(x => x.totalHrs || 0), 1)) * 160
                            }px`,
                            minHeight: "30px"
                          }
                        },
                        React.createElement(
                          "div",
                          { className: "text-white font-semibold" },
                          React.createElement(
                            "span",
                            { className: "text-xs" },
                            Number(b.totalHrs || 0).toFixed(1)
                          ),
                          React.createElement(
                            "span",
                            { className: "text-[10px] opacity-70 ml-0.5" },
                            "h"
                          )
                        )
                      )
                    ),
                    React.createElement(
                      "div",
                      { className: "text-xs text-gray-600 font-medium" },
                      b.label
                    ),
                    React.createElement(
                      "div",
                      { className: "text-xs text-gray-400" },
                      `${b.count || 0} sleeps`
                    )
                  )
                )
              )
            )
          )
        : React.createElement(
            "div",
            { className: "text-center text-gray-400 py-8" },
            "No data to display"
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

const FamilyTab = ({
  user,
  kidId,
  familyId,
  onKidChange,
  kids = [],
  themeKey,
  onThemeChange,
  requestAddChild,
  onRequestAddChildHandled
}) => {
  const [kidData, setKidData] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState({ babyWeight: null, multiplier: 2.5 });
  const [sleepTargetInput, setSleepTargetInput] = useState('');
  const [daySleepStartMin, setDaySleepStartMin] = useState(390);
  const [daySleepEndMin, setDaySleepEndMin] = useState(1170);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [isEditingSleepTarget, setIsEditingSleepTarget] = useState(false);
  const [sleepTargetLastSaved, setSleepTargetLastSaved] = useState('');
  const [sleepTargetDraftOverride, setSleepTargetDraftOverride] = useState(false);
  const [editingDayStart, setEditingDayStart] = useState(false);
  const [editingDayEnd, setEditingDayEnd] = useState(false);
  const [tempDayStartInput, setTempDayStartInput] = useState('');
  const [tempDayEndInput, setTempDayEndInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copying, setCopying] = useState(false);
  const [babyPhotoUrl, setBabyPhotoUrl] = useState(null);

  // Consistent icon-button styling for edit actions (✓ / ✕)
  const TT_ICON_BTN_BASE = "h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center";
  const TT_ICON_BTN_OK = TT_ICON_BTN_BASE + " text-green-600";
  const TT_ICON_BTN_CANCEL = TT_ICON_BTN_BASE + " text-gray-500";
  const TT_ICON_SIZE = "w-5 h-5";

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  const [editingUserName, setEditingUserName] = useState(false);

  // Temp fields
  const [tempBabyName, setTempBabyName] = useState('');
  const [tempBirthDate, setTempBirthDate] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempMultiplier, setTempMultiplier] = useState('');
  const [tempUserName, setTempUserName] = useState('');

  const fileInputRef = React.useRef(null);

  // Add Child modal state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyWeight, setNewBabyWeight] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [savingChild, setSavingChild] = useState(false);

  const autoSleepTargetHrs = Number(sleepSettings?.sleepTargetAutoHours || 14);
  const sleepTargetOverride = !!sleepSettings?.sleepTargetIsOverride;

  const formatSleepTargetDisplay = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
  };

  // --------------------------------------
  // Data loading
  // --------------------------------------

  useEffect(() => {
    loadData();
  }, [kidId, familyId]);

  useEffect(() => {
    if (requestAddChild) {
      setShowAddChild(true);
      if (onRequestAddChildHandled) {
        onRequestAddChildHandled();
      }
    }
  }, [requestAddChild, onRequestAddChildHandled]);

  useEffect(() => {
    if (!sleepSettings) return;
    const auto = Number(sleepSettings.sleepTargetAutoHours || 14);
    const current = sleepSettings.sleepTargetHours ?? auto;
    const formatted = formatSleepTargetDisplay(current);
    setSleepTargetInput(formatted);
    setSleepTargetLastSaved(formatted);
    setIsEditingSleepTarget(false);
    setSleepTargetDraftOverride(false);
    setDaySleepStartMin(Number(sleepSettings.sleepDayStart ?? 390));
    setDaySleepEndMin(Number(sleepSettings.sleepDayEnd ?? 1170));
  }, [sleepSettings]);

  useEffect(() => {
    if (!editingDayStart) {
      setTempDayStartInput(minutesToTimeValue(daySleepStartMin));
    }
    if (!editingDayEnd) {
      setTempDayEndInput(minutesToTimeValue(daySleepEndMin));
    }
  }, [daySleepStartMin, daySleepEndMin, editingDayStart, editingDayEnd]);

  const minutesToLabel = (m) => {
    const mm = ((Number(m) % 1440) + 1440) % 1440;
    const h24 = Math.floor(mm / 60);
    const min = mm % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = ((h24 + 11) % 12) + 1;
    return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
  };

  const minutesToTimeValue = (m) => {
    const mm = ((Number(m) % 1440) + 1440) % 1440;
    const h24 = Math.floor(mm / 60);
    const min = mm % 60;
    return `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  const parseTimeInput = (value) => {
    if (!value || typeof value !== "string") return null;
    const [hStr, mStr] = value.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return clamp(h * 60 + m, 0, 1439);
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const saveDaySleepWindow = async (startMin, endMin) => {
    const startVal = clamp(Number(startMin), 0, 1439);
    const endVal = clamp(Number(endMin), 0, 1439);
    setDaySleepStartMin(startVal);
    setDaySleepEndMin(endVal);
    try {
      await firestoreStorage.updateSleepSettings({
        sleepDayStart: startVal,
        sleepDayEnd: endVal,
      });
      setSleepSettings((prev) => ({
        ...(prev || {}),
        sleepDayStart: startVal,
        sleepDayEnd: endVal,
        daySleepStartMinutes: startVal,
        daySleepEndMinutes: endVal
      }));
    } catch (e) {
      console.error("Error saving day sleep window:", e);
    }
  };

  const loadData = async () => {
    if (!kidId) return;
    setLoading(true);
    try {
      const kid = await firestoreStorage.getKidData();
      setKidData(kid);
      if (kid?.photoURL) {
        setBabyPhotoUrl(kid.photoURL);
      }

      const memberList = await firestoreStorage.getMembers();
      setMembers(memberList);

      const settingsData = await firestoreStorage.getSettings();
      if (settingsData) {
        const merged = {
          babyWeight:
            typeof settingsData.babyWeight === 'number'
              ? settingsData.babyWeight
              : null,
          multiplier:
            typeof settingsData.multiplier === 'number'
              ? settingsData.multiplier
              : 2.5,
          themeKey: settingsData.themeKey || themeKey || 'indigo'
        };
        setSettings(merged);

        if (onThemeChange && merged.themeKey && merged.themeKey !== themeKey) {
          onThemeChange(merged.themeKey);
        }
      } else {
        const merged = {
          babyWeight: null,
          multiplier: 2.5,
          themeKey: themeKey || 'indigo'
        };
        setSettings(merged);
      }

      const ss = await firestoreStorage.getSleepSettings();
      if (ss) setSleepSettings(ss);
    } catch (error) {
      console.error('Error loading family tab:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKidPartial = async (updates) => {
    await firestoreStorage.updateKidData(updates);
  };

  // --------------------------------------
  // Add Child
  // --------------------------------------

  const handleCreateChild = async () => {
    if (!newBabyName.trim()) {
      alert("Please enter your child's name");
      return;
    }
    const weight = parseFloat(newBabyWeight);
    if (!weight || weight <= 0) {
      alert('Please enter a valid weight');
      return;
    }
    if (!newBabyBirthDate) {
      alert('Please enter birth date');
      return;
    }
    if (!familyId) return;

    setSavingChild(true);
    try {
      const birthTimestamp = new Date(newBabyBirthDate).getTime();

      const famDoc = await db.collection("families").doc(familyId).get();
      const famMembers = famDoc.exists && Array.isArray(famDoc.data().members)
        ? famDoc.data().members
        : [user.uid];
      
      const kidRef = await db
        .collection('families')
        .doc(familyId)
        .collection('kids')
        .add({
          name: newBabyName.trim(),
          ownerId: user.uid,
          birthDate: birthTimestamp,
          members: famMembers, // ✅ inherit all family members
          photoURL: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      const newKidId = kidRef.id;
      const defaultTheme = themeKey || 'indigo';

      await db
        .collection('families')
        .doc(familyId)
        .collection('kids')
        .doc(newKidId)
        .collection('settings')
        .doc('default')
        .set({
          babyWeight: weight,
          multiplier: 2.5,
          themeKey: defaultTheme,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      setShowAddChild(false);
      setNewBabyName('');
      setNewBabyWeight('');
      setNewBabyBirthDate('');

      if (typeof onKidChange === 'function') {
        onKidChange(newKidId);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error('Error creating child:', err);
      alert('Failed to create child. Please try again.');
    } finally {
      setSavingChild(false);
    }
  };

  // --------------------------------------
  // Theme handling
  // --------------------------------------

  const handleThemeSelect = async (newThemeKey) => {
    if (!newThemeKey || newThemeKey === settings.themeKey) return;

    const updated = {
      ...settings,
      themeKey: newThemeKey
    };
    setSettings(updated);

    if (onThemeChange) {
      onThemeChange(newThemeKey);
    }

    try {
      await firestoreStorage.saveSettings(updated);
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  // --------------------------------------
  // Updates: name, dates, settings
  // --------------------------------------

  const handleUpdateBabyName = async () => {
    if (!tempBabyName.trim()) return;
    try {
      await updateKidPartial({ name: tempBabyName.trim() });
      setEditingName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleUpdateBirthDate = async () => {
    if (!tempBirthDate) return;
    try {
      const [year, month, day] = tempBirthDate.split('-').map((v) => Number(v));
      if (!year || !month || !day) {
        throw new Error('Invalid birth date');
      }
      const birthTimestamp = new Date(year, month - 1, day).getTime();
      await updateKidPartial({ birthDate: birthTimestamp });
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
      await firestoreStorage.saveSettings({
        ...settings,
        babyWeight: weight
      });
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
      await firestoreStorage.saveSettings({
        ...settings,
        multiplier: mult
      });
      setEditingMultiplier(false);
      await loadData();
    } catch (error) {
      console.error('Error updating multiplier:', error);
    }
  };

  const handleUpdateUserName = async () => {
    if (!tempUserName.trim()) return;
    try {
      await firestoreStorage.updateUserProfile({ displayName: tempUserName.trim() });
      setEditingUserName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating user name:', error);
    }
  };

  const saveSleepTargetOverride = async () => {
    const hrs = parseFloat(sleepTargetInput);
    const fallback = formatSleepTargetDisplay(autoSleepTargetHrs);

    if (!hrs || hrs <= 0) {
      alert('Please enter a valid daily sleep target.');
      setSleepTargetInput(fallback);
      return;
    }

    const isSameAsAuto = Math.abs(hrs - autoSleepTargetHrs) < 0.05;

    try {
      if (isSameAsAuto) {
        await firestoreStorage.setSleepTargetOverride(kidId, null);
      } else {
        await firestoreStorage.setSleepTargetOverride(kidId, hrs);
      }
      await loadData();
    } catch (error) {
      console.error('Error saving sleep target override:', error);
    }
  };

  const handleRevertSleepTarget = async () => {
    try {
      await firestoreStorage.setSleepTargetOverride(kidId, null);
      await loadData();
      setIsEditingSleepTarget(false);
      setSleepTargetDraftOverride(false);
    } catch (error) {
      console.error('Error reverting to recommended sleep target:', error);
    }
  };

  // --------------------------------------
  // Photo upload + compression (max ~2MB)
  // --------------------------------------

  const compressImage = (file, maxSizeKB = 2048) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const getApproxBytes = (b64) => Math.ceil((b64.length * 3) / 4);
          const maxBytes = maxSizeKB * 1024;

          let quality = 0.9;
          let base64 = canvas.toDataURL('image/jpeg', quality);
          let approxBytes = getApproxBytes(base64);

          while (approxBytes > maxBytes && quality > 0.3) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality);
            approxBytes = getApproxBytes(base64);
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

    try {
      const compressedBase64 = await compressImage(file, 2048);
      await firestoreStorage.uploadKidPhoto(compressedBase64);
      await loadData();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    }
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // --------------------------------------
  // Invite / members
  // --------------------------------------

const handleInvite = async () => {
  const resolvedKidId = kidId || (kids && kids.length ? kids[0].id : null);

  if (!familyId || !resolvedKidId) {
    alert("Something went wrong. Try refreshing.");
    return;
  }

  let link;

  // ---- ONLY invite creation can fail ----
  try {
    const code = await createInvite(familyId, resolvedKidId);
    link = `${window.location.origin}${window.location.pathname}?invite=${code}`;
  } catch (err) {
    console.error("Invite creation failed:", err);
    alert("Failed to create invite");
    return;
  }

  // ---- Optional UX only ----
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Join Tiny Tracker",
        text: "Join our family on Tiny Tracker:",
        url: link
      });
      return; // shared successfully
    } catch {
      return; // user cancelled → STOP here
    }
  }

  // Only reach here if share is NOT supported
  setInviteLink(link);
  setShowInvite(true);
};

  const handleCopyLink = async () => {
    if (!inviteLink) return;
  
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      // Safari fallback that always works
      window.prompt("Copy this invite link:", inviteLink);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this person's access?")) return;
    try {
      await removeMember(familyId, kidId, memberId);
      await loadData();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  // --------------------------------------
  // Render
  // --------------------------------------

  if (loading) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement('div', { className: 'text-gray-600' }, 'Loading...')
    );
  }

  const isOwner = kidData?.ownerId === user.uid;
  const activeThemeKey = settings.themeKey || themeKey || 'indigo';

  // Day sleep window (slider UI)
  // Anything that STARTS inside this window is counted as Day Sleep (naps). Everything else = Night Sleep.
  // Saved to Firebase on drag end (touchEnd/mouseUp) to avoid spamming writes.
  const dayStart = clamp(daySleepStartMin, 0, 1439);
  const dayEnd = clamp(daySleepEndMin, 0, 1439);
  const startPct = (dayStart / 1440) * 100;
  const endPct = (dayEnd / 1440) * 100;
  const leftPct = Math.min(startPct, endPct);
  const widthPct = Math.abs(endPct - startPct);

  const DaySleepWindowCard = React.createElement(
    "div",
    { className: "mt-5" },
    React.createElement(
      "div",
      { className: "flex items-start justify-between gap-3" },
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "text-base font-semibold text-gray-800" }, "Day sleep window"),
        React.createElement(
          "div",
          { className: "text-sm text-gray-500 mt-1" },
          "Sleep that starts between these times counts as ",
          React.createElement("span", { className: "font-medium text-gray-700" }, "Day Sleep"),
          " (naps). Everything else counts as ",
          React.createElement("span", { className: "font-medium text-gray-700" }, "Night Sleep"),
          "."
        )
      )
    ),
    // Start/End “editable boxes”
    React.createElement(
      "div",
      { className: "grid grid-cols-2 gap-3 mt-4 items-start min-w-0" },

      // Start (match the affordance style used above in settings rows)
      React.createElement(
        "div",
        {
          className: "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 min-w-0 overflow-hidden",
          onClick: editingDayStart
            ? undefined
            : () => {
                setEditingDayStart(true);
                setTempDayStartInput(minutesToTimeValue(dayStart));
              }
        },
        React.createElement(
          "div",
          { className: "text-xs font-medium text-gray-500" },
          "Start"
        ),
        editingDayStart
          ? React.createElement(
              "div",
              // single grid controls both input + actions so edges ALWAYS match
              { className: "mt-2 grid grid-cols-2 gap-2 w-full" },
              React.createElement("input", {
                type: "time",
                value: tempDayStartInput,
                onChange: (e) => setTempDayStartInput(e.target.value),
                // Force the time input to obey the grid width on iOS
                className: "col-span-2 block w-full max-w-full min-w-0 box-border appearance-none bg-white px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm",
                // iOS Safari: hard-force intrinsic control sizing
                style: { width: "100%", maxWidth: "100%", minWidth: 0, WebkitAppearance: "none", appearance: "none" }
              }),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    const mins = parseTimeInput(tempDayStartInput);
                    if (mins == null) {
                      alert("Please enter a valid start time.");
                      return;
                    }
                    setDaySleepStartMin(mins);
                    saveDaySleepWindow(mins, daySleepEndMin);
                    setEditingDayStart(false);
                  },
                  className: `${TT_ICON_BTN_OK} w-full`,
                  type: "button"
                },
                React.createElement(Check, { className: TT_ICON_SIZE })
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    setTempDayStartInput(minutesToTimeValue(dayStart));
                    setEditingDayStart(false);
                  },
                  className: `${TT_ICON_BTN_CANCEL} w-full`,
                  type: "button"
                },
                React.createElement(X, { className: TT_ICON_SIZE })
              )
            )
          : React.createElement(
              "div",
              { className: "flex items-center justify-between mt-1" },
              React.createElement(
                "div",
                { className: "text-base font-semibold text-gray-900" },
                minutesToLabel(dayStart)
              ),
              React.createElement(Edit2, {
                className: "w-4 h-4 text-indigo-600"
              })
            )
      ),

      // End (match the affordance style used above in settings rows)
      React.createElement(
        "div",
        {
          className: "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 min-w-0 overflow-hidden",
          onClick: editingDayEnd
            ? undefined
            : () => {
                setEditingDayEnd(true);
                setTempDayEndInput(minutesToTimeValue(dayEnd));
              }
        },
        React.createElement(
          "div",
          { className: "text-xs font-medium text-gray-500" },
          "End"
        ),
        editingDayEnd
          ? React.createElement(
              "div",
              // single grid controls both input + actions so edges ALWAYS match
              { className: "mt-2 grid grid-cols-2 gap-2 w-full" },
              React.createElement("input", {
                type: "time",
                value: tempDayEndInput,
                onChange: (e) => setTempDayEndInput(e.target.value),
                // Force the time input to obey the grid width on iOS
                className: "col-span-2 block w-full max-w-full min-w-0 box-border appearance-none bg-white px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm",
                // iOS Safari: hard-force intrinsic control sizing
                style: { width: "100%", maxWidth: "100%", minWidth: 0, WebkitAppearance: "none", appearance: "none" }
              }),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    const mins = parseTimeInput(tempDayEndInput);
                    if (mins == null) {
                      alert("Please enter a valid end time.");
                      return;
                    }
                    setDaySleepEndMin(mins);
                    saveDaySleepWindow(daySleepStartMin, mins);
                    setEditingDayEnd(false);
                  },
                  className: `${TT_ICON_BTN_OK} w-full`,
                  type: "button"
                },
                React.createElement(Check, { className: TT_ICON_SIZE })
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    setTempDayEndInput(minutesToTimeValue(dayEnd));
                    setEditingDayEnd(false);
                  },
                  className: `${TT_ICON_BTN_CANCEL} w-full`,
                  type: "button"
                },
                React.createElement(X, { className: TT_ICON_SIZE })
              )
            )
          : React.createElement(
              "div",
              { className: "flex items-center justify-between mt-1" },
              React.createElement(
                "div",
                { className: "text-base font-semibold text-gray-900" },
                minutesToLabel(dayEnd)
              ),
              React.createElement(Edit2, {
                className: "w-4 h-4 text-indigo-600"
              })
            )
      )
    ),
    // Slider track + selection + handles
    React.createElement(
      "div",
      { className: "mt-4" },
      React.createElement(
        "div",
        { className: "relative h-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 day-sleep-slider" },
        React.createElement("div", { className: "absolute inset-y-0", style: { left: `${leftPct}%`, width: `${widthPct}%`, background: "rgba(99,102,241,0.25)" } }),
        // left handle visual
        React.createElement("div", { className: "absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-white shadow-sm border border-gray-200", style: { left: `calc(${startPct}% - 6px)`, pointerEvents: "none" } }),
        // right handle visual
        React.createElement("div", { className: "absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-white shadow-sm border border-gray-200", style: { left: `calc(${endPct}% - 6px)`, pointerEvents: "none" } }),
        // two range inputs layered (one controls start, one controls end)
        React.createElement("input", {
          type: "range",
          min: 0,
          max: 1439,
          value: daySleepStartMin,
          onChange: (e) => setDaySleepStartMin(Number(e.target.value)),
          onMouseUp: (e) => saveDaySleepWindow(Number(e.target.value), daySleepEndMin),
          onTouchEnd: (e) => saveDaySleepWindow(Number(e.target.value), daySleepEndMin),
          className: "absolute inset-0 w-full h-full opacity-0"
        }),
        React.createElement("input", {
          type: "range",
          min: 0,
          max: 1439,
          value: daySleepEndMin,
          onChange: (e) => setDaySleepEndMin(Number(e.target.value)),
          onMouseUp: (e) => saveDaySleepWindow(daySleepStartMin, Number(e.target.value)),
          onTouchEnd: (e) => saveDaySleepWindow(daySleepStartMin, Number(e.target.value)),
          className: "absolute inset-0 w-full h-full opacity-0"
        })
      ),
      React.createElement(
        "div",
        { className: "flex justify-between text-xs text-gray-400 mt-2 px-3 select-none" },
        React.createElement("span", null, "6AM"),
        React.createElement("span", null, "9AM"),
        React.createElement("span", null, "12PM"),
        React.createElement("span", null, "3PM"),
        React.createElement("span", null, "6PM"),
        React.createElement("span", null, "9PM")
      )
    )
  );

  return React.createElement(
    'div',
    { className: 'space-y-4 relative' },

    // Hidden file input
    React.createElement('input', {
      ref: fileInputRef,
      type: 'file',
      accept: 'image/*',
      onChange: handlePhotoChange,
      style: { display: 'none' }
    }),

    // Kids Card (multi-kid)
    kids && kids.length > 0 &&
      React.createElement(
        'div',
        { className: 'bg-white rounded-2xl shadow-lg p-6' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-3' },
          React.createElement(
            'h2',
            { className: 'text-lg font-semibold text-gray-800' },
            'Kids'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => setShowAddChild(true),
              className: 'text-sm font-medium text-indigo-600 hover:text-indigo-700'
            },
            '+ Add Child'
          )
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          kids.map((k) => {
            const isCurrent = k.id === kidId;
            return React.createElement(
              'button',
              {
                key: k.id,
                onClick: () => {
                  if (isCurrent) return;
                  if (typeof onKidChange === 'function') {
                    onKidChange(k.id);
                  }
                },
                className:
                  'w-full px-4 py-3 rounded-xl border flex items-center justify-between text-sm ' +
                  (isCurrent
                    ? 'border-indigo-500 bg-indigo-50 text-gray-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100')
              },
              React.createElement(
                'span',
                { className: 'font-medium truncate' },
                k.name || 'Baby'
              ),
              isCurrent &&
                React.createElement(
                  'span',
                  { className: 'text-xs font-semibold text-indigo-600' },
                  'Active'
                )
            );
          })
        ),
        React.createElement(
          'p',
          { className: 'mt-3 text-xs text-gray-500' },
          'Active kid controls what you see in Tracker, Analytics, and AI Chat.'
        )
      ),

    // Baby Info Card
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl shadow-lg p-6' },
      React.createElement(
        'h2',
        { className: 'text-lg font-semibold text-gray-800 mb-4' },
        'Baby Info'
      ),

      React.createElement(
        'div',
        { className: 'flex items-start gap-4 mb-6' },
        // Photo
        React.createElement(
          'div',
          { className: 'relative flex-shrink-0 cursor-pointer', onClick: handlePhotoClick },
          React.createElement(
            'div',
            {
              className:
                'w-24 h-24 rounded-full overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition relative'
            },
            babyPhotoUrl
              ? React.createElement('img', {
                  src: babyPhotoUrl,
                  alt: kidData?.name || 'Baby',
                  className: 'w-full h-full object-cover'
                })
              : React.createElement(
                  'div',
                  {
                    className:
                      'w-full h-full flex items-center justify-center bg-indigo-100'
                  },
                  React.createElement(Baby, {
                    className: 'w-12 h-12 text-indigo-600'
                  })
                )
          ),
          React.createElement(
            'div',
            {
              className:
                'absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-white cursor-pointer',
              onClick: (e) => { e.stopPropagation(); handlePhotoClick(); }
            },
            React.createElement(Camera, { className: 'w-4 h-4 text-white' })
          )
        ),

        // Name + age + owner
        React.createElement(
          'div',
          { className: 'flex-1 space-y-2 min-w-0' },

          // Name row
          editingName
            ? React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement('input', {
                  type: 'text',
                  value: tempBabyName,
                  onChange: (e) => setTempBabyName(e.target.value),
                  className:
                    'flex-1 px-3 py-2 text-lg font-medium border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500',
                  style: { minWidth: 0 }
                }),
                React.createElement(
                  'button',
                  {
                    onClick: handleUpdateBabyName,
                    className: TT_ICON_BTN_OK
                  },
                  React.createElement(Check, { className: TT_ICON_SIZE })
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => setEditingName(false),
                    className: TT_ICON_BTN_CANCEL
                  },
                  React.createElement(X, { className: TT_ICON_SIZE })
                )
              )
            : React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(
                  'h3',
                  {
                    className:
                      'text-lg font-semibold text-gray-800 truncate'
                  },
                  kidData?.name || 'Baby'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => {
                      setTempBabyName(kidData?.name || '');
                      setEditingName(true);
                    },
                    className: 'text-indigo-600 hover:text-indigo-700'
                  },
                  React.createElement(Edit2, { className: 'w-4 h-4' })
                )
              ),

          // Age
          React.createElement(
            'div',
            { className: 'text-sm text-gray-500' },
            kidData?.birthDate
              ? (() => {
                  const today = new Date();
                  const birth = new Date(kidData.birthDate);
                  const diffMs = today.getTime() - birth.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays < 7) return `${diffDays} days old`;
                  if (diffDays < 30)
                    return `${Math.floor(diffDays / 7)} weeks old`;
                  const months = Math.floor(diffDays / 30);
                  return `${months} month${months === 1 ? '' : 's'} old`;
                })()
              : 'Birth date not set'
          ),

          // Owner display / your name
          React.createElement(
            'div',
            { className: 'mt-1 text-sm text-gray-500' },
            'Owner: ',
            editingUserName
              ? React.createElement(
                  'span',
                  null,
                  React.createElement('input', {
                    type: 'text',
                    value: tempUserName,
                    onChange: (e) => setTempUserName(e.target.value),
                    className:
                      'px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500'
                  }),
                  React.createElement(
                    'button',
                    {
                      onClick: handleUpdateUserName,
                      className:
                        'ml-2 text-green-600 hover:text-green-700'
                    },
                    React.createElement(Check, { className: 'w-4 h-4' })
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => setEditingUserName(false),
                      className: 'ml-1 text-gray-400 hover:text-gray-600'
                    },
                    React.createElement(X, { className: 'w-4 h-4' })
                  )
                )
              : React.createElement(
                  'span',
                  null,
                  kidData?.ownerName || 'You',
                  isOwner &&
                    React.createElement(
                      'button',
                      {
                        onClick: () => {
                          setTempUserName(kidData?.ownerName || '');
                          setEditingUserName(true);
                        },
                        className:
                          'ml-2 text-indigo-600 hover:text-indigo-700'
                      },
                      'Edit'
                    )
                )
          )
        )
      ),

      // Baby info rows (mobile-friendly: full-width tappable rows)
      React.createElement(
        'div',
        { className: 'space-y-2 mb-3' },
        // Birth date
        React.createElement(
          'div',
          {
            className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
            onClick: editingBirthDate
              ? undefined
              : () => {
                  if (kidData?.birthDate) {
                    const d = new Date(kidData.birthDate);
                    const iso = d.toISOString().slice(0, 10);
                    setTempBirthDate(iso);
                  } else {
                    setTempBirthDate('');
                  }
                  setEditingBirthDate(true);
                }
          },
          React.createElement(
            'div',
            { className: 'text-xs font-medium text-gray-500' },
            'Birth date'
          ),
          editingBirthDate
            ? React.createElement(
                'div',
                { className: 'flex items-center gap-2 mt-2' },
                React.createElement('input', {
                  type: 'date',
                  value: tempBirthDate,
                  onChange: (e) => setTempBirthDate(e.target.value),
                  className:
                    'flex-1 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm'
                }),
                React.createElement(
                  'button',
                  {
                    onClick: handleUpdateBirthDate,
                    className: TT_ICON_BTN_OK
                  },
                  React.createElement(Check, { className: TT_ICON_SIZE })
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => setEditingBirthDate(false),
                    className: TT_ICON_BTN_CANCEL
                  },
                  React.createElement(X, { className: TT_ICON_SIZE })
                )
              )
            : React.createElement(
                'div',
                { className: 'flex items-center justify-between mt-1' },
                React.createElement(
                  'div',
                  { className: 'text-base font-semibold text-gray-900' },
                  kidData?.birthDate
                    ? new Date(kidData.birthDate).toLocaleDateString()
                    : 'Not set'
                ),
                React.createElement(Edit2, {
                  className: 'w-4 h-4 text-indigo-600'
                })
              )
        ),
        // Current weight
        React.createElement(
          'div',
          {
            className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
            onClick: editingWeight
              ? undefined
              : () => {
                  setTempWeight(settings.babyWeight?.toString() || '');
                  setEditingWeight(true);
                }
          },
          React.createElement(
            'div',
            { className: 'text-xs font-medium text-gray-500' },
            'Current weight'
          ),
          editingWeight
            ? React.createElement(
                'div',
                { className: 'flex items-center gap-2 mt-2' },
                React.createElement('input', {
                  type: 'number',
                  step: '0.1',
                  value: tempWeight,
                  onChange: (e) => setTempWeight(e.target.value),
                  placeholder: '8.5',
                  className:
                    'w-28 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm text-right'
                }),
                React.createElement(
                  'span',
                  { className: 'text-gray-600' },
                  'lbs'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: handleUpdateWeight,
                    className: TT_ICON_BTN_OK
                  },
                  React.createElement(Check, { className: TT_ICON_SIZE })
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => setEditingWeight(false),
                    className: TT_ICON_BTN_CANCEL
                  },
                  React.createElement(X, { className: TT_ICON_SIZE })
                )
              )
            : React.createElement(
                'div',
                { className: 'flex items-center justify-between mt-1' },
                React.createElement(
                  'div',
                  { className: 'text-base font-semibold text-gray-900' },
                  settings.babyWeight ? `${settings.babyWeight} lbs` : 'Not set'
                ),
                React.createElement(Edit2, {
                  className: 'w-4 h-4 text-indigo-600'
                })
              )
        )
      ),
      // Target multiplier (full-width row)
      React.createElement(
        'div',
        {
          className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mt-2',
          onClick: editingMultiplier
            ? undefined
            : () => {
                setTempMultiplier(settings.multiplier?.toString() || '2.5');
                setEditingMultiplier(true);
              }
        },
        React.createElement(
          'div',
          { className: 'flex items-center' },
          React.createElement(
            'div',
            { className: 'text-xs font-medium text-gray-500' },
            'Target multiplier (oz/lb)'
          ),
          React.createElement(InfoDot, {
            onClick: (e) => {
              if (e && e.stopPropagation) e.stopPropagation();
              alert(
                'Target multiplier (oz/lb)\n\n' +
                  'This is used to estimate a daily feeding target:\n' +
                  'weight (lb) × multiplier (oz/lb).\n\n' +
                  'Common rule-of-thumb for formula is ~2.5 oz per lb per day, but needs vary. If your pediatrician gave you a different plan, use that.'
              );
            }
          })
        ),
        editingMultiplier
          ? React.createElement(
              'div',
              { className: 'flex items-center gap-2 mt-2' },
              React.createElement('input', {
                type: 'number',
                step: '0.1',
                value: tempMultiplier,
                onChange: (e) => setTempMultiplier(e.target.value),
                placeholder: '2.5',
                className:
                  'w-28 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm text-right'
              }),
              React.createElement(
                'span',
                { className: 'text-gray-600' },
                'x'
              ),
              React.createElement(
                'button',
                {
                  onClick: handleUpdateMultiplier,
                  className: TT_ICON_BTN_OK
                },
                React.createElement(Check, { className: TT_ICON_SIZE })
              ),
              React.createElement(
                'button',
                {
                  onClick: () => setEditingMultiplier(false),
                  className: TT_ICON_BTN_CANCEL
                },
                React.createElement(X, { className: TT_ICON_SIZE })
              )
            )
          : React.createElement(
              'div',
              { className: 'flex items-center justify-between mt-1' },
              React.createElement(
                'div',
                { className: 'text-base font-semibold text-gray-900' },
                `${settings.multiplier}x`
              ),
              React.createElement(Edit2, {
                className: 'w-4 h-4 text-indigo-600'
              })
            )
      ),

      sleepSettings && React.createElement('div', { className: "mt-4 pt-4 border-t border-gray-100" },
        React.createElement('div', { className: "text-sm font-semibold text-gray-800 mb-2" }, 'Sleep settings'),
        React.createElement( 'div', { className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3', onClick: isEditingSleepTarget ? undefined : () => { setIsEditingSleepTarget(true); } },
          React.createElement('div', { className: "flex items-center" },
            React.createElement('div', { className: "text-xs font-medium text-gray-500" }, 'Daily sleep target (hrs)'),
            React.createElement(InfoDot, { onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); alert( "Daily sleep target\n\n" + "We auto-suggest a target based on age using widely cited pediatric sleep recommendations for total sleep per 24 hours (including naps).\n\n" + "If your baby’s clinician suggested a different target, you can override it here." ); } })
          ),
          isEditingSleepTarget ? React.createElement('div', { className: "flex items-center gap-3 mt-2" },
            React.createElement('input', {
              type: 'number',
              inputMode: 'decimal',
              value: sleepTargetInput,
              onChange: (e) => {
                const v = e.target.value;
                setSleepTargetInput(v);
                const n = parseFloat(v);
                if (!n || n <= 0) {
                  setSleepTargetDraftOverride(false);
                  return;
                }
                setSleepTargetDraftOverride(Math.abs(n - autoSleepTargetHrs) >= 0.05);
              },
              onFocus: () => {
                const n = parseFloat(sleepTargetInput);
                if (!n || n <= 0) setSleepTargetDraftOverride(false);
                else setSleepTargetDraftOverride(Math.abs(n - autoSleepTargetHrs) >= 0.05);
              },
              className: "w-28 h-10 px-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300",
              step: "0.1",
              min: "0"
            }),
            React.createElement('button', { type: 'button', disabled: !sleepTargetDraftOverride && (sleepTargetInput === sleepTargetLastSaved), onClick: async () => { await saveSleepTargetOverride(); setSleepTargetLastSaved(sleepTargetInput); setIsEditingSleepTarget(false); }, className: TT_ICON_BTN_OK }, React.createElement(Check, { className: TT_ICON_SIZE })),
            React.createElement('button', { type: 'button', onClick: () => { setSleepTargetInput(sleepTargetLastSaved || formatSleepTargetDisplay(autoSleepTargetHrs)); setSleepTargetDraftOverride(false); setIsEditingSleepTarget(false); }, className: TT_ICON_BTN_CANCEL }, React.createElement(X, { className: TT_ICON_SIZE }))
          ) : React.createElement( 'div', { className: 'flex items-center justify-between mt-1' },
            React.createElement( 'div', { className: 'text-base font-semibold text-gray-900' }, sleepTargetInput || formatSleepTargetDisplay(autoSleepTargetHrs) ),
            React.createElement(Edit2, { className: 'w-4 h-4 text-indigo-600' })
          )
        ),
        sleepSettings?.sleepTargetIsOverride && Math.abs(Number(sleepSettings.sleepTargetHours ?? 0) - Number(sleepSettings.sleepTargetAutoHours ?? 0)) >= 0.05 && React.createElement('div', { className: "flex items-center justify-between mt-2 text-xs text-gray-600" },
          React.createElement('div', null, `Recommended: ${formatSleepTargetDisplay(sleepSettings.sleepTargetAutoHours)} hrs`),
          React.createElement('button', { type: 'button', onClick: handleRevertSleepTarget, className: "text-indigo-600 font-medium" }, 'Revert to recommended')
        ),
        DaySleepWindowCard
      ),

      // Theme picker
      React.createElement(
        'div',
        { className: 'mt-6 pt-4 border-t border-gray-100' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-3' },
          React.createElement(
            'span',
            { className: 'text-sm font-semibold text-gray-800' },
            'App Color'
          ),
          React.createElement(
            'span',
            { className: 'text-xs text-gray-500' },
            'Applies to top bar & tabs'
          )
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-3' },
          Object.keys(KID_THEMES).map((key) =>
            React.createElement(
              'button',
              {
                key,
                type: 'button',
                onClick: () => handleThemeSelect(key),
                className:
                  'w-9 h-9 rounded-full border-2 flex items-center justify-center ' +
                  (activeThemeKey === key
                    ? 'border-indigo-600'
                    : 'border-transparent'),
                style: {
                  backgroundColor: KID_THEMES[key].bg
                }
              },
              activeThemeKey === key
                ? React.createElement('div', {
                    className: 'w-4 h-4 rounded-full',
                    style: { backgroundColor: KID_THEMES[key].accent }
                  })
                : null
            )
          )
        )
      )
    ),

    // Family Members Card
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl shadow-lg p-6' },
      React.createElement(
        'h2',
        { className: 'text-lg font-semibold text-gray-800 mb-4' },
        'Family Members'
      ),
      React.createElement(
        'div',
        { className: 'space-y-3 mb-4' },
        members.map((member) =>
          React.createElement(
            'div',
            {
              key: member.uid,
              className:
                'flex items-center gap-3 p-3 bg-gray-50 rounded-xl'
            },
            React.createElement(
              'div',
              { className: 'flex-shrink-0' },
              member.photoURL
                ? React.createElement('img', {
                    src: member.photoURL,
                    alt: member.displayName || member.email,
                    className: 'w-12 h-12 rounded-full'
                  })
                : React.createElement(
                    'div',
                    {
                      className:
                        'w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold'
                    },
                    (member.displayName || member.email || '?')
                      .charAt(0)
                      .toUpperCase()
                  )
            ),
            React.createElement(
              'div',
              { className: 'flex-1 min-w-0' },
              React.createElement(
                'div',
                { className: 'text-sm font-medium text-gray-800 truncate' },
                member.displayName || member.email || 'Member'
              ),
              React.createElement(
                'div',
                { className: 'text-xs text-gray-500 truncate' },
                member.email
              )
            ),
            member.uid !== user.uid &&
              React.createElement(
                'button',
                {
                  onClick: () => handleRemoveMember(member.uid),
                  className:
                    'text-xs text-red-500 hover:text-red-600 font-medium'
                },
                'Remove'
              )
          )
        )
      ),
      React.createElement(
        'button',
        {
          onClick: handleInvite,
          className:
            'w-full mt-1 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 py-3'
        },
        React.createElement(UserPlus, { className: 'w-5 h-5' }),
        '+ Invite Partner'
      )
    ),

    // Invite link panel
    showInvite &&
      React.createElement(
        'div',
        { className: 'bg-indigo-50 rounded-2xl p-4' },
        React.createElement(
          'div',
          { className: 'text-sm text-gray-600 mb-2' },
          'Share this link with your partner:'
        ),
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement('input', {
            type: 'text',
            value: inviteLink,
            readOnly: true,
            className:
              'flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm'
          }),
          React.createElement(
            'button',
            {
              onClick: handleCopyLink,
              className:
                'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium'
            },
            copying ? 'Copied!' : 'Copy'
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowInvite(false),
            className:
              'mt-2 text-sm text-gray-600 hover:text-gray-800'
          },
          'Close'
        )
      ),

    // Add Child Modal
    showAddChild &&
      React.createElement(
        'div',
        {
          className:
            'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4'
        },
        React.createElement(
          'div',
          {
            className:
              'bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm'
          },
          React.createElement(
            'h2',
            { className: 'text-lg font-semibold text-gray-800 mb-2' },
            'Add Child'
          ),
          React.createElement(
            'p',
            { className: 'text-xs text-gray-500 mb-4' },
            'This child will share the same family and members.'
          ),
          React.createElement(
            'div',
            { className: 'space-y-3' },
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                {
                  className:
                    'block text-xs font-medium text-gray-700 mb-1'
                },
                "Child's Name"
              ),
              React.createElement('input', {
                type: 'text',
                value: newBabyName,
                onChange: (e) => setNewBabyName(e.target.value),
                className:
                  'w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400'
              })
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-3 min-w-0' }, // FIX: Prevent grid overflow on mobile
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  {
                    className:
                      'block text-xs font-medium text-gray-700 mb-1'
                  },
                  'Weight (lbs)'
                ),
                React.createElement('input', {
                  type: 'number',
                  step: '0.1',
                  value: newBabyWeight,
                  onChange: (e) => setNewBabyWeight(e.target.value),
                  className:
                    'w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400'
                })
              ),
              React.createElement(
                'div',
                { className: 'min-w-0' }, // FIX: Prevent date input overflow on mobile - allow grid item to shrink
                React.createElement(
                  'label',
                  {
                    className:
                      'block text-xs font-medium text-gray-700 mb-1'
                  },
                  'Birth date'
                ),
                React.createElement('input', {
                  type: 'date',
                  value: newBabyBirthDate,
                  onChange: (e) => setNewBabyBirthDate(e.target.value),
                  className:
                    'w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400'
                })
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'mt-5 flex justify-end gap-3' },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setShowAddChild(false),
                className:
                  'text-sm text-gray-600 hover:text-gray-800'
              },
              'Cancel'
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleCreateChild,
                disabled: savingChild,
                className:
                  'px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50'
              },
              savingChild ? 'Saving...' : 'Add Child'
            )
          )
        )
      )
  );
};

// ========================================
// TINY TRACKER - PART 7
// Settings Tab - Share App, Sign Out, Delete Account
// ========================================

const SettingsTab = ({ user, kidId }) => {
  const handleShareApp = async () => {
    const url = window.location.origin + window.location.pathname;
    const text = `Check out Tiny Tracker - track your baby's feedings and get insights! ${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tiny Tracker',
          text: 'Check out Tiny Tracker - track your baby\'s feedings and get insights!',
          url: url
        });
        return;
      } catch (error) {
        // User cancelled or incompatible device
      }
    }
    
    const messengerUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}&app_id=`;
    window.location.href = messengerUrl;
    
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(text);
        alert('Link copied to clipboard! You can paste it anywhere.');
      } catch (error) {
        prompt('Copy this link to share:', url);
      }
    }, 1000);
  };

  const handleSignOut = async () => {
    if (confirm('Sign out of Tiny Tracker?')) {
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      "Are you sure you want to delete your account?\n\n" +
      "- You will be removed from the family.\n" +
      "- If you are the owner, ownership will transfer to another member.\n" +
      "- Your baby's data will NOT be deleted.\n\n" +
      "This action cannot be undone."
    );
    
    if (!confirmDelete) return;

    try {
      await deleteCurrentUserAccount();
      alert("Your account has been deleted.");
    } catch (err) {
      console.error("Account deletion failed:", err);
      alert("Something went wrong deleting your account. Please try again.");
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

        // User Profile Display
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

        // Sign Out Button
        React.createElement('button', {
          onClick: handleSignOut,
          className: "w-full bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition"
        }, 'Sign Out'),

        // Delete Account Button (Destructive)
        React.createElement('button', {
          onClick: handleDeleteAccount,
          className: "w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition"
        }, 'Delete My Account')
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
// TINY TRACKER - PART 8
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

const Baby = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M9 12h.01" }),
  React.createElement('path', { d: "M15 12h.01" }),
  React.createElement('path', { d: "M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" }),
  React.createElement('path', { d: "M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" })
);

// ========================================
// TINY TRACKER - PART 9
// AI Chat Tab - iMessage Style
// ========================================

// AI Chat Tab - iMessage Style
const AIChatTab = ({ user, kidId, familyId, themeKey = 'indigo' }) => {
  const theme = KID_THEMES[themeKey] || KID_THEMES.indigo;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(localStorage.getItem('aiChatDraft') || '');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
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

  // persist draft input across tab/app switches
  useEffect(() => {
    localStorage.setItem('aiChatDraft', input);
  }, [input]);

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
            className: 'text-[11px] text-gray-500 underline underline-offset-2 hover:text-red-500'
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
        style: { backgroundColor: theme.bg }
      },
      React.createElement(
        'div',
        {
          className:
            'flex items-center gap-2 bg-white rounded-2xl px-3 py-1.5 border',
          style: {
            borderColor: inputFocused ? theme.accent : '#e5e7eb',
            boxShadow: inputFocused ? `0 0 0 3px ${theme.soft || theme.bg}` : 'none'
          }
        },
        React.createElement('textarea', {
          value: input,
          onChange: (e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          },
          onFocus: () => setInputFocused(true),
          onBlur: () => setInputFocused(false),
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
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition',
            style: { backgroundColor: theme.accent }
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
// TINY TRACKER - PART 10 (GEMINI VERSION)
// AI Integration via Cloudflare Worker + Gemini
// Conversational, analytical, non-creepy
// ========================================

// Optional: keep replies compact (used at end of getAIResponse)
const trimAIAnswer = (text) => {
  if (!text || typeof text !== "string") return text;
  
  // Only trim if significantly over limit
  const MAX_CHARS = 1000; // increased from 650
  
  if (text.length <= MAX_CHARS) return text;
  
  // Try to keep complete thoughts
  const paragraphs = text.split(/\n\n+/);
  let result = "";
  
  for (const para of paragraphs) {
    if ((result + para).length > MAX_CHARS) break;
    result += (result ? "\n\n" : "") + para;
  }
  
  // If we got at least 70% of target, return it
  if (result.length > MAX_CHARS * 0.7) return result;
  
  // Otherwise do sentence-level trimming
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  result = "";
  
  for (const sentence of sentences) {
    if ((result + sentence).length > MAX_CHARS) break;
    result += sentence;
  }
  
  return result || text.slice(0, MAX_CHARS) + "…";
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
// 2b) Sleep helpers (compact, prompt-safe)
// ----------------------------------------

const _safeNumber = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? v : null;

const _formatDurationHMS = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
};

const _sleepDayKeyLocal = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const _minutesOfDayLocalFromTs = (ts) => {
  try {
    const d = new Date(ts);
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return 0;
  }
};

const _isWithinWindowLocal = (mins, startMins, endMins) => {
  const s = Number(startMins);
  const e = Number(endMins);
  const m = Number(mins);
  if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
  if (s === e) return false;
  if (s < e) return m >= s && m <= e;
  // wraps midnight
  return m >= s || m <= e;
};

const _normalizeSleepWindowMins = (startMins, endMins) => {
  const start = Number(startMins);
  const end = Number(endMins);
  if (Number.isFinite(start) && Number.isFinite(end)) {
    return { start, end };
  }
  return { start: 390, end: 1170 };
};

const _classifyNapOvernight = (startTs, dayStartMins, dayEndMins) => {
  const mins = _minutesOfDayLocalFromTs(startTs);
  const { start, end } = _normalizeSleepWindowMins(dayStartMins, dayEndMins);
  const isNap = _isWithinWindowLocal(mins, start, end);
  return isNap ? "NAP" : "OVERNIGHT";
};

const analyzeSleepSessions = (sessions, dayStartMins = 390, dayEndMins = 1170) => {
  if (!sessions || sessions.length === 0) {
    return {
      daysTracked: 0,
      totalSessions: 0,
      avgTotalSleepHours: 0,
      avgOvernightSleepHours: 0,
      avgNapSleepHours: 0
    };
  }

  const { start: windowStart, end: windowEnd } = _normalizeSleepWindowMins(
    dayStartMins,
    dayEndMins
  );

  const cleaned = sessions
    .map((s) => {
      const start = _safeNumber(s.startTime);
      const end = _safeNumber(s.endTime);
      const isActive = !!s.isActive;
      // IMPORTANT: Do not trust stored sleepType/isDaySleep here.
      // Reclassify using current day sleep window at read time.
      const label = start ? _classifyNapOvernight(start, windowStart, windowEnd) : "OVERNIGHT";
      return { ...s, startTime: start, endTime: end, isActive, _aiSleepLabel: label };
    })
    .filter(
      (s) =>
        s.startTime &&
        s.endTime &&
        s.endTime > s.startTime &&
        !s.isActive
    );

  if (cleaned.length === 0) {
    return {
      daysTracked: 0,
      totalSessions: 0,
      avgTotalSleepHours: 0,
      avgOvernightSleepHours: 0,
      avgNapSleepHours: 0
    };
  }

  const daily = {};
  cleaned.forEach((s) => {
    const key = _sleepDayKeyLocal(s.startTime);
    const durMs = s.endTime - s.startTime;
    if (!daily[key]) daily[key] = { totalMs: 0, napMs: 0, overnightMs: 0 };
    daily[key].totalMs += durMs;
    if (s._aiSleepLabel === "NAP") daily[key].napMs += durMs;
    else daily[key].overnightMs += durMs;
  });

  const keys = Object.keys(daily).sort();
  const daysTracked = keys.length;

  const avg = (arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    daysTracked,
    totalSessions: cleaned.length,
    avgTotalSleepHours: avg(keys.map((k) => daily[k].totalMs)) / 3600000,
    avgOvernightSleepHours: avg(keys.map((k) => daily[k].overnightMs)) / 3600000,
    avgNapSleepHours: avg(keys.map((k) => daily[k].napMs)) / 3600000
  };
};

const formatRecentSleepLog = (sessions, dayStartMins = 390, dayEndMins = 1170) => {
  if (!sessions || sessions.length === 0)
    return "No recent sleep sessions logged.";

  const sorted = [...sessions].sort(
    (a, b) => (_safeNumber(a.startTime) || 0) - (_safeNumber(b.startTime) || 0)
  );

  const lines = sorted
    .map((s) => {
      const start = _safeNumber(s.startTime);
      if (!start) return null;

      const end = _safeNumber(s.endTime);
      const isActive = !!s.isActive;
      // IMPORTANT: Do not trust stored sleepType/isDaySleep here.
      // Reclassify using current day sleep window at read time.
      const { start: windowStart, end: windowEnd } = _normalizeSleepWindowMins(
        dayStartMins,
        dayEndMins
      );
      const label = _classifyNapOvernight(start, windowStart, windowEnd);

      const d = new Date(start);
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
      const startStr = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });

      if (isActive || !end) {
        return `${dateStr} ${startStr} → in progress (${label})`;
      }

      const endStr = new Date(end).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });
      const durStr = _formatDurationHMS(end - start);

      return `${dateStr} ${startStr} → ${endStr} — ${durStr} (${label})`;
    })
    .filter(Boolean);

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
  let allSleepSessions = [];
  let recentSleepSessions = [];
  let sleepDayStartMins = 390;
  let sleepDayEndMins = 1170;
  try {
    allSleepSessions = await firestoreStorage.getAllSleepSessions();
    recentSleepSessions = await firestoreStorage.getSleepSessionsLastNDays(7);
    // Use current sleep day window for AI labeling/aggregation (read-time truth)
    const ss = await firestoreStorage.getSleepSettings();
    const { start, end } = _normalizeSleepWindowMins(
      ss?.sleepDayStart ?? ss?.daySleepStartMinutes,
      ss?.sleepDayEnd ?? ss?.daySleepEndMinutes
    );
    sleepDayStartMins = start;
    sleepDayEndMins = end;
  } catch (e) {
    console.warn("Sleep data fetch failed", e);
  }
  const conversation = await firestoreStorage.getConversation();

  const ageInMonths = calculateAgeInMonths(babyData.birthDate);
  const ageInDays = Math.floor(
    (Date.now() - babyData.birthDate) / (1000 * 60 * 60 * 24)
  );

  const advancedStats = analyzeAdvancedFeedingPatterns(allFeedings);
  const recentLog = formatRecentFeedingLog(recentFeedings);
  const sleepStats = analyzeSleepSessions(allSleepSessions, sleepDayStartMins, sleepDayEndMins);
  const recentSleepLog = formatRecentSleepLog(recentSleepSessions, sleepDayStartMins, sleepDayEndMins);

  const todayAnchor = new Date().toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

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
You are Tiny Tracker, helping a parent understand their baby's feeding patterns and troubleshoot sleep issues.

IMPORTANT: Today is ${todayAnchor} (local time).
IMPORTANT: Sleep sessions below are labeled as NAP vs OVERNIGHT using the app’s configured day-sleep window. Do NOT reclassify based on clock time.

## Core principle: LISTEN AND ADAPT
The parent is reporting what's ACTUALLY HAPPENING with their baby. Your job is to:
1. Acknowledge what they just told you
2. Adjust your recommendations based on real results
3. Problem-solve NEW issues as they arise

DO NOT just repeat your previous recommendation when:
- They report it didn't work
- A new problem has emerged
- They're asking for help with a different situation

## Tone & Style
- Warm, direct friend who's paying attention
- Start directly with your response (no "Hi!" or "Sure!")
- 2-3 short paragraphs maximum
- Use their baby's name naturally

## Response patterns

**When they report what happened:**
✅ "That 2am wake-up with only 1.5oz and distress is definitely different from his usual pattern..."
❌ "The data shows he took 1.5oz at 2:58am" (they just told you this!)

**When something didn't work:**
✅ "Since the consolidated feed approach led to that distressed wake-up, let's try a different strategy..."
❌ "The idea behind consolidating calories is..." (repeating the same failed advice)

**When they ask "what do you recommend?":**
✅ "I'd try X first because Y. If that doesn't work, fall back to Z."
❌ "You could try X. The earlier suggestion was Y." (listing options without picking one)

**When they ask "why?":**
✅ "The reason is [specific mechanism]: when A happens, it causes B, so doing C should help."
❌ "The reason is to achieve the goal" (circular non-answer)

**When there's a NEW problem:**
✅ Acknowledge it's different, troubleshoot the new issue
❌ Keep pushing the original plan that just failed

## Making recommendations

**Be decisive and specific:**
- "Skip the 8pm feed tonight and aim for 4.5oz at 10:30pm" 
- NOT "you could try skipping the 8pm feed"

**Compare options when asked:**
- "Option A is better here because X. Option B could work as backup if Y."
- Pick one as your lead recommendation

**Explain WHY with mechanism:**
- "When you do two feeds close together, his stomach processes them faster, so he wakes sooner"
- NOT "it might not provide the same fullness" (vague)

**Adjust when reality contradicts theory:**
- "Hmm, that distressed wake-up suggests something else is going on - maybe he's overtired or has gas. Let's try..."
- NOT "continue focusing on the 4.5oz feed" (ignoring new info)

## Conversation flow rules
- Read the previous conversation before responding
- If you just explained something, don't explain it again
- If they ask the same question twice, your first answer wasn't clear enough
- When they report results, START with acknowledging those results
- Build on the discussion, don't reset every message

## When parent is frustrated
Signs: "Are you having issues?", "You're not very friendly", "You're just repeating yourself"
Response: Be MORE direct, pick ONE clear path forward, acknowledge their frustration is valid

## Baby snapshot
- Name: ${babyData.name || "Baby"}
- Age: ${ageInMonths} month${ageInMonths !== 1 ? "s" : ""} (${ageInDays} days old)
- Weight: ${settings?.babyWeight || "not set"} lbs
- Target daily: ${
    settings?.babyWeight && settings?.multiplier
      ? (settings.babyWeight * settings.multiplier).toFixed(1)
      : "not set"
  } oz/day

## Patterns summary (${advancedStats.daysTracked} days)
- Daily average: ${advancedStats.avgDailyIntake.toFixed(1)} oz
- Typical interval: ${advancedStats.avgIntervalHours.toFixed(1)} hours
- Time distribution: Morning ${advancedStats.morningPercent.toFixed(0)}% | Afternoon ${advancedStats.afternoonPercent.toFixed(0)}% | Evening ${advancedStats.eveningPercent.toFixed(0)}% | Night ${advancedStats.nightPercent.toFixed(0)}%
${
    advancedStats.last3DailyAvg && advancedStats.prev7DailyAvg
      ? `- Trend: Last 3 days ${advancedStats.last3DailyAvg.toFixed(1)} oz vs previous week ${advancedStats.prev7DailyAvg.toFixed(1)} oz`
      : ""
  }

## Recent detailed log (last 7 days)
${recentLog}

## Sleep summary (${sleepStats.daysTracked} days)
- Avg total sleep: ${sleepStats.avgTotalSleepHours.toFixed(1)} hours/day
- Avg overnight sleep: ${sleepStats.avgOvernightSleepHours.toFixed(1)} hours/day
- Avg nap sleep: ${sleepStats.avgNapSleepHours.toFixed(1)} hours/day

## Recent sleep log (last 7 days)
${recentSleepLog}

## Previous conversation
${conversationHistory}

## Parent's current question/situation
${question}

Before responding, ask yourself:
- Did they just report what happened? Start by acknowledging it
- Did my previous advice work or not work? Adjust accordingly
- Are they asking WHY? Explain the mechanism, not just the goal
- Have I already said this? Don't repeat yourself
- Is there a NEW problem that needs different troubleshooting?

Remember: You're helping a sleep-deprived parent in real-time. Be the attentive, adaptive friend they need.
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

// ========================================
// TINY TRACKER V4.4 – PART 11
// App Initialization, Theme Color, and Render Ordering Fix
// ========================================
//
// IMPORTANT:
// ReactDOM.render() must run AFTER all components (including App) are defined.
// iOS Safari and some mobile WebViews will crash with a blank screen if App
// is referenced before it is initialized.
//
// This part moves the theme-color logic and the ReactDOM.render() call to the
// very bottom of script.js to guarantee correct load order across devices.
//
// Also: GitHub Pages aggressively caches script.js — use ?v=### to force refresh.
//
// ========================================


// ========================================
// SET THEME COLOR FOR MOBILE BROWSER
// ========================================

const ensureMetaThemeTag = () => {
  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }

  return meta;
};

const updateMetaThemeColor = (theme) => {
  const meta = ensureMetaThemeTag();
  const color = (theme && theme.bg) || '#E0E7FF';
  meta.setAttribute('content', color);
};

updateMetaThemeColor();
window.updateMetaThemeColor = updateMetaThemeColor;

// ========================================
// RENDER APP (must stay last)
// ========================================

ReactDOM.render(
  React.createElement(App),
  document.getElementById('root')
);
