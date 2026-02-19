/**
 * firestoreService — Firestore CRUD for React Native
 * Port of web/script.js firestoreStorage using @react-native-firebase/firestore.
 *
 * Usage:
 *   firestoreService.initialize(familyId, kidId);
 *   const feedings = await firestoreService.getFeedings();
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLLECTIONS } from '../../../shared/firebase/collections';

let firestore = null;
let auth = null;
try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {}
try {
  auth = require('@react-native-firebase/auth').default;
} catch {}
const FIREBASE_AVAILABLE = typeof firestore === 'function' && typeof auth === 'function';

// ── Helpers ──

const sortAsc = (list, field = 'timestamp') =>
  [...(list || [])].sort((a, b) => (a[field] || a.startTime || 0) - (b[field] || b.startTime || 0));

const CACHE_PREFIX = 'tt_cache_v1';
const CACHE_MAX_AGE_MS = 60_000;

// ── Service singleton ──

const firestoreService = {
  isAvailable: FIREBASE_AVAILABLE,
  currentFamilyId: null,
  currentKidId: null,
  _cache: {
    feedings: null,
    nursingSessions: null,
    sleepSessions: null,
    diaperChanges: null,
    solidsSessions: null,
    lastSyncMs: 0,
  },

  // ─── Init ───

  initialize(familyId, kidId) {
    this.currentFamilyId = familyId;
    this.currentKidId = kidId;
    this._cache = {
      feedings: null,
      nursingSessions: null,
      sleepSessions: null,
      diaperChanges: null,
      solidsSessions: null,
      lastSyncMs: 0,
    };
  },

  _kidRef() {
    if (!this.currentFamilyId || !this.currentKidId) {
      throw new Error('firestoreService not initialized');
    }
    return firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .collection('kids')
      .doc(this.currentKidId);
  },

  _cacheKey(name) {
    return `${CACHE_PREFIX}:${this.currentFamilyId}:${this.currentKidId}:${name}`;
  },

  async _loadCache() {
    try {
      const keys = ['feedings', 'nursingSessions', 'sleepSessions', 'diaperChanges', 'solidsSessions'];
      const results = await AsyncStorage.multiGet(keys.map((k) => this._cacheKey(k)));
      for (const [key, value] of results) {
        const name = key.split(':').pop();
        if (value) {
          try {
            this._cache[name] = JSON.parse(value);
          } catch {}
        }
      }
    } catch {}
  },

  async _saveCache() {
    try {
      const entries = [];
      for (const name of ['feedings', 'nursingSessions', 'sleepSessions', 'diaperChanges', 'solidsSessions']) {
        if (this._cache[name]) {
          entries.push([this._cacheKey(name), JSON.stringify(this._cache[name])]);
        }
      }
      if (entries.length) await AsyncStorage.multiSet(entries);
    } catch {}
  },

  async _refreshCache({ force = false } = {}) {
    if (!force && Date.now() - this._cache.lastSyncMs < CACHE_MAX_AGE_MS) return;
    try {
      const kidRef = this._kidRef();
      const [feedSnap, nurseSnap, sleepSnap, diaperSnap, solidsSnap] = await Promise.all([
        kidRef.collection(COLLECTIONS.feedings).orderBy('timestamp', 'asc').get(),
        kidRef.collection(COLLECTIONS.nursingSessions).orderBy('timestamp', 'asc').get(),
        kidRef.collection(COLLECTIONS.sleepSessions).orderBy('startTime', 'asc').get(),
        kidRef.collection(COLLECTIONS.diaperChanges).orderBy('timestamp', 'asc').get(),
        kidRef.collection(COLLECTIONS.solidsSessions).orderBy('timestamp', 'asc').get(),
      ]);
      this._cache.feedings = feedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this._cache.nursingSessions = nurseSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this._cache.sleepSessions = sleepSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this._cache.diaperChanges = diaperSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this._cache.solidsSessions = solidsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this._cache.lastSyncMs = Date.now();
      await this._saveCache();
    } catch (e) {
      console.warn('Cache refresh failed:', e);
    }
  },

  // ─── FEEDINGS ───

  async addFeeding({ ounces, timestamp, notes = null, photoURLs = null }) {
    const data = { ounces, timestamp: timestamp || Date.now() };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;

    const ref = await this._kidRef().collection(COLLECTIONS.feedings).add(data);
    const item = { id: ref.id, ...data };
    if (this._cache.feedings) {
      this._cache.feedings = sortAsc([...this._cache.feedings, item]);
      await this._saveCache();
    }
    return item;
  },

  async getFeedings() {
    if (this._cache.feedings) {
      this._refreshCache({ force: false });
      return [...this._cache.feedings].reverse();
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.feedings)
      .orderBy('timestamp', 'desc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.feedings = sortAsc(data);
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getFeedingsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    if (this._cache.feedings) {
      this._refreshCache({ force: false });
      return this._cache.feedings.filter((f) => (f.timestamp || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.feedings)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateFeeding(id, data) {
    const updateData = { ...data };
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.feedings).doc(id).update(updateData);
    if (this._cache.feedings) {
      this._cache.feedings = sortAsc(
        this._cache.feedings.map((f) => (f.id === id ? { ...f, ...data } : f))
      );
      await this._saveCache();
    }
  },

  async deleteFeeding(id) {
    await this._kidRef().collection(COLLECTIONS.feedings).doc(id).delete();
    if (this._cache.feedings) {
      this._cache.feedings = this._cache.feedings.filter((f) => f.id !== id);
      await this._saveCache();
    }
  },

  async getAllFeedings() {
    if (this._cache.feedings) {
      this._refreshCache({ force: false });
      return this._cache.feedings;
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.feedings)
      .orderBy('timestamp', 'asc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.feedings = sortAsc(data);
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return this._cache.feedings;
  },

  // ─── NURSING SESSIONS ───

  async addNursingSession({ startTime, leftDurationSec, rightDurationSec, lastSide = null, notes = null, photoURLs = null }) {
    const timestamp = Number.isFinite(startTime) ? startTime : Date.now();
    const data = {
      startTime: timestamp,
      timestamp,
      leftDurationSec: Number(leftDurationSec) || 0,
      rightDurationSec: Number(rightDurationSec) || 0,
    };
    if (lastSide) data.lastSide = lastSide;
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;

    const ref = await this._kidRef().collection(COLLECTIONS.nursingSessions).add(data);
    const item = { id: ref.id, ...data };
    if (this._cache.nursingSessions) {
      this._cache.nursingSessions = sortAsc([...this._cache.nursingSessions, item]);
      await this._saveCache();
    }
    return item;
  },

  async getNursingSessions() {
    if (this._cache.nursingSessions) {
      this._refreshCache({ force: false });
      return [...this._cache.nursingSessions].reverse();
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.nursingSessions)
      .orderBy('timestamp', 'desc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.nursingSessions = sortAsc(data);
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getNursingSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    if (this._cache.nursingSessions) {
      this._refreshCache({ force: false });
      return this._cache.nursingSessions.filter((s) => (s.timestamp || s.startTime || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.nursingSessions)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateNursingSession(id, data) {
    const updateData = { ...data };
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.nursingSessions).doc(id).update(updateData);
    if (this._cache.nursingSessions) {
      this._cache.nursingSessions = sortAsc(
        this._cache.nursingSessions.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      await this._saveCache();
    }
  },

  async deleteNursingSession(id) {
    await this._kidRef().collection(COLLECTIONS.nursingSessions).doc(id).delete();
    if (this._cache.nursingSessions) {
      this._cache.nursingSessions = this._cache.nursingSessions.filter((s) => s.id !== id);
      await this._saveCache();
    }
  },

  // ─── SOLIDS SESSIONS ───

  async addSolidsSession({ timestamp, foods, notes = null, photoURLs = null }) {
    const data = {
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      foods: Array.isArray(foods) ? foods : [],
    };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;

    const ref = await this._kidRef().collection(COLLECTIONS.solidsSessions).add(data);
    const item = { id: ref.id, ...data };
    if (this._cache.solidsSessions) {
      this._cache.solidsSessions = sortAsc([...this._cache.solidsSessions, item]);
      await this._saveCache();
    }
    return item;
  },

  async getSolidsSessions() {
    if (this._cache.solidsSessions) {
      this._refreshCache({ force: false });
      return [...this._cache.solidsSessions].reverse();
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.solidsSessions)
      .orderBy('timestamp', 'desc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.solidsSessions = sortAsc(data);
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getSolidsSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    if (this._cache.solidsSessions) {
      this._refreshCache({ force: false });
      return this._cache.solidsSessions.filter((s) => (s.timestamp || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.solidsSessions)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateSolidsSession(id, data) {
    const updateData = { ...data };
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.solidsSessions).doc(id).update(updateData);
    if (this._cache.solidsSessions) {
      this._cache.solidsSessions = sortAsc(
        this._cache.solidsSessions.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      await this._saveCache();
    }
  },

  async deleteSolidsSession(id) {
    await this._kidRef().collection(COLLECTIONS.solidsSessions).doc(id).delete();
    if (this._cache.solidsSessions) {
      this._cache.solidsSessions = this._cache.solidsSessions.filter((s) => s.id !== id);
      await this._saveCache();
    }
  },

  async getAllSolidsSessions() {
    if (this._cache.solidsSessions) {
      this._refreshCache({ force: false });
      return this._cache.solidsSessions;
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.solidsSessions)
      .orderBy('timestamp', 'asc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.solidsSessions = sortAsc(data);
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return this._cache.solidsSessions;
  },

  // ─── DIAPER CHANGES ───

  async addDiaperChange({ timestamp, isWet = false, isDry = false, isPoo = false, notes = null, photoURLs = null }) {
    const data = {
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      isWet: !!isWet,
      isDry: !!isDry,
      isPoo: !!isPoo,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;

    const ref = await this._kidRef().collection(COLLECTIONS.diaperChanges).add(data);
    const item = { id: ref.id, ...data };
    if (this._cache.diaperChanges) {
      this._cache.diaperChanges = sortAsc([...this._cache.diaperChanges, item]);
      await this._saveCache();
    }
    return item;
  },

  async getDiaperChanges() {
    if (this._cache.diaperChanges) {
      this._refreshCache({ force: false });
      return [...this._cache.diaperChanges].reverse();
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.diaperChanges)
      .orderBy('timestamp', 'desc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.diaperChanges = sortAsc(data);
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getDiaperChangesLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    if (this._cache.diaperChanges) {
      this._refreshCache({ force: false });
      return this._cache.diaperChanges.filter((c) => (c.timestamp || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.diaperChanges)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateDiaperChange(id, data) {
    const updateData = { ...data };
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    await this._kidRef().collection(COLLECTIONS.diaperChanges).doc(id).update(updateData);
    if (this._cache.diaperChanges) {
      this._cache.diaperChanges = sortAsc(
        this._cache.diaperChanges.map((c) => (c.id === id ? { ...c, ...data } : c))
      );
      await this._saveCache();
    }
  },

  async deleteDiaperChange(id) {
    await this._kidRef().collection(COLLECTIONS.diaperChanges).doc(id).delete();
    if (this._cache.diaperChanges) {
      this._cache.diaperChanges = this._cache.diaperChanges.filter((c) => c.id !== id);
      await this._saveCache();
    }
  },

  // ─── SLEEP SESSIONS ───

  async startSleep(startTime = null) {
    const user = auth().currentUser;
    const uid = user ? user.uid : null;

    // Ensure only one active sleep per kid
    const activeSnap = await this._kidRef()
      .collection(COLLECTIONS.sleepSessions)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!activeSnap.empty) {
      const d = activeSnap.docs[0];
      return { id: d.id, ...d.data() };
    }

    const startMs = typeof startTime === 'number' ? startTime : Date.now();
    const sleepType = await this._classifySleepType(startMs);

    const ref = await this._kidRef().collection(COLLECTIONS.sleepSessions).add({
      startTime: startMs,
      endTime: null,
      isActive: true,
      sleepType,
      startedByUid: uid,
      endedByUid: null,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    const doc = await ref.get();
    const item = { id: doc.id, ...doc.data() };
    if (this._cache.sleepSessions) {
      this._cache.sleepSessions = sortAsc([...this._cache.sleepSessions, item], 'startTime');
      await this._saveCache();
    }
    return item;
  },

  async endSleep(sessionId, endTime = null) {
    if (!sessionId) throw new Error('Missing sleep session id');
    const user = auth().currentUser;
    const uid = user ? user.uid : null;
    const endMs = typeof endTime === 'number' ? endTime : Date.now();

    // Classify sleep type based on start time
    let sleepType = 'night';
    try {
      const sessDoc = await this._kidRef()
        .collection(COLLECTIONS.sleepSessions)
        .doc(sessionId)
        .get();
      if (sessDoc.exists) {
        const sess = sessDoc.data();
        sleepType = await this._classifySleepType(sess.startTime);
      }
    } catch {}

    const isDaySleep = sleepType === 'day';
    await this._kidRef()
      .collection(COLLECTIONS.sleepSessions)
      .doc(sessionId)
      .update({
        endTime: endMs,
        isActive: false,
        endedByUid: uid,
        isDaySleep,
        sleepType: isDaySleep ? 'day' : 'night',
      });

    if (this._cache.sleepSessions) {
      this._cache.sleepSessions = sortAsc(
        this._cache.sleepSessions.map((s) =>
          s.id === sessionId
            ? { ...s, endTime: endMs, isActive: false, endedByUid: uid, isDaySleep, sleepType: isDaySleep ? 'day' : 'night' }
            : s
        ),
        'startTime'
      );
      await this._saveCache();
    }
  },

  /** Add a completed sleep session (with both start and end) */
  async addSleepSession({ startTime, endTime, notes = null, photoURLs = null, sleepType = null }) {
    const data = {
      startTime: startTime || Date.now(),
      endTime: endTime || null,
      isActive: !endTime,
      sleepType: sleepType || (await this._classifySleepType(startTime || Date.now())),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (notes) data.notes = notes;
    if (Array.isArray(photoURLs) && photoURLs.length > 0) data.photoURLs = photoURLs;

    const ref = await this._kidRef().collection(COLLECTIONS.sleepSessions).add(data);
    const item = { id: ref.id, ...data };
    if (this._cache.sleepSessions) {
      this._cache.sleepSessions = sortAsc([...this._cache.sleepSessions, item], 'startTime');
      await this._saveCache();
    }
    return item;
  },

  /** Subscribe to active sleep session — returns unsubscribe function */
  subscribeActiveSleep(callback) {
    if (!this.currentFamilyId || !this.currentKidId) {
      callback(null);
      return () => {};
    }

    try {
      return this._kidRef()
        .collection(COLLECTIONS.sleepSessions)
        .where('isActive', '==', true)
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
            console.error('Active sleep subscription error:', err);
            callback(null);
          }
        );
    } catch (err) {
      console.warn('Could not create active sleep listener:', err);
      callback(null);
      return () => {};
    }
  },

  _subscribeCollection({ collectionName, orderByField, orderDirection = 'desc', cacheKey, cacheField = 'timestamp', callback }) {
    if (typeof callback !== 'function') throw new Error('Missing callback');
    if (!this.currentFamilyId || !this.currentKidId) {
      callback([]);
      return () => {};
    }

    try {
      return this._kidRef()
        .collection(collectionName)
        .orderBy(orderByField, orderDirection)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            if (cacheKey) {
              this._cache[cacheKey] = sortAsc(data, cacheField);
              this._cache.lastSyncMs = Date.now();
              this._saveCache().catch(() => {});
            }
            callback(data);
          },
          (err) => {
            console.error(`[firestoreService] ${collectionName} subscription error:`, err);
            callback([]);
          }
        );
    } catch (err) {
      console.warn(`[firestoreService] Could not subscribe to ${collectionName}:`, err);
      callback([]);
      return () => {};
    }
  },

  subscribeFeedings(callback) {
    return this._subscribeCollection({
      collectionName: COLLECTIONS.feedings,
      orderByField: 'timestamp',
      cacheKey: 'feedings',
      cacheField: 'timestamp',
      callback,
    });
  },

  subscribeNursingSessions(callback) {
    return this._subscribeCollection({
      collectionName: COLLECTIONS.nursingSessions,
      orderByField: 'timestamp',
      cacheKey: 'nursingSessions',
      cacheField: 'timestamp',
      callback,
    });
  },

  subscribeSolidsSessions(callback) {
    return this._subscribeCollection({
      collectionName: COLLECTIONS.solidsSessions,
      orderByField: 'timestamp',
      cacheKey: 'solidsSessions',
      cacheField: 'timestamp',
      callback,
    });
  },

  subscribeSleepSessions(callback) {
    return this._subscribeCollection({
      collectionName: COLLECTIONS.sleepSessions,
      orderByField: 'startTime',
      cacheKey: 'sleepSessions',
      cacheField: 'startTime',
      callback,
    });
  },

  subscribeDiaperChanges(callback) {
    return this._subscribeCollection({
      collectionName: COLLECTIONS.diaperChanges,
      orderByField: 'timestamp',
      cacheKey: 'diaperChanges',
      cacheField: 'timestamp',
      callback,
    });
  },

  async getSleepSessions() {
    if (this._cache.sleepSessions) {
      this._refreshCache({ force: false });
      return [...this._cache.sleepSessions].reverse();
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.sleepSessions)
      .orderBy('startTime', 'desc')
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cache.sleepSessions = sortAsc(data, 'startTime');
    this._cache.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getSleepSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    if (this._cache.sleepSessions) {
      this._refreshCache({ force: false });
      return this._cache.sleepSessions.filter((s) => (s.startTime || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection(COLLECTIONS.sleepSessions)
      .where('startTime', '>', cutoff)
      .orderBy('startTime', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateSleepSession(id, data) {
    const updateData = { ...data };
    if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
      updateData.photoURLs = firestore.FieldValue.delete();
    }
    if (updateData.notes === '') updateData.notes = firestore.FieldValue.delete();
    await this._kidRef().collection(COLLECTIONS.sleepSessions).doc(id).update(updateData);
    if (this._cache.sleepSessions) {
      this._cache.sleepSessions = sortAsc(
        this._cache.sleepSessions.map((s) => (s.id === id ? { ...s, ...data } : s)),
        'startTime'
      );
      await this._saveCache();
    }
  },

  async deleteSleepSession(id) {
    await this._kidRef().collection(COLLECTIONS.sleepSessions).doc(id).delete();
    if (this._cache.sleepSessions) {
      this._cache.sleepSessions = this._cache.sleepSessions.filter((s) => s.id !== id);
      await this._saveCache();
    }
  },

  async _classifySleepType(startMs) {
    try {
      const settings = await this.getKidSettings();
      const dayStart = Number(settings?.sleepDayStart ?? settings?.daySleepStartMinutes ?? 390);
      const dayEnd = Number(settings?.sleepDayEnd ?? settings?.daySleepEndMinutes ?? 1170);
      const d = new Date(startMs);
      const mins = d.getHours() * 60 + d.getMinutes();
      if (dayStart <= dayEnd) {
        return (mins >= dayStart && mins <= dayEnd) ? 'day' : 'night';
      }
      return (mins >= dayStart || mins <= dayEnd) ? 'day' : 'night';
    } catch {
      return 'night';
    }
  },

  // ─── SETTINGS ───

  async getKidSettings() {
    try {
      const snap = await this._kidRef().collection('settings').doc('default').get();
      return snap.exists ? snap.data() : {};
    } catch {
      return {};
    }
  },

  async updateKidSettings(settings) {
    await this._kidRef()
      .collection('settings')
      .doc('default')
      .set(settings, { merge: true });
  },

  // ─── KID DATA ───

  async getKidData() {
    try {
      const snap = await this._kidRef().get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  },

  async getKids() {
    if (!this.currentFamilyId) return [];
    try {
      const snap = await firestore()
        .collection('families')
        .doc(this.currentFamilyId)
        .collection('kids')
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  async updateKidData(data) {
    await this._kidRef().set(data, { merge: true });
  },

  async getRecentFoods(options = {}) {
    const forceServer = !!options?.forceServer;
    if (forceServer) {
      const snap = await this._kidRef().get();
      const remote = snap.exists ? snap.data() : {};
      return Array.isArray(remote?.recentSolidFoods) ? remote.recentSolidFoods : [];
    }
    const kidData = await this.getKidData();
    return Array.isArray(kidData?.recentSolidFoods) ? kidData.recentSolidFoods : [];
  },

  async updateRecentFoods(foodName) {
    if (!foodName || typeof foodName !== 'string') return;
    const currentRaw = await this.getRecentFoods();
    const current = Array.isArray(currentRaw)
      ? currentRaw.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
      : [];
    const filtered = current.filter((f) => String(f).toLowerCase() !== String(foodName).toLowerCase());
    const updated = [foodName, ...filtered].slice(0, 20);
    await this._kidRef().set({ recentSolidFoods: updated }, { merge: true });
  },

  async addCustomFood({ name, category, icon, emoji }) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const data = {
      name,
      category: category || 'Custom',
      icon: icon || null,
      emoji: emoji || null,
      isDeleted: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    const ref = await familyRef.collection('customFoods').add(data);
    return { id: ref.id, ...data };
  },

  async getCustomFoods() {
    if (!this.currentFamilyId) return [];
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const snap = await familyRef.collection('customFoods').get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => !item?.isDeleted);
  },

  async updateCustomFood(foodId, patch = {}) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    if (!foodId) throw new Error('No custom food ID');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const update = { ...patch };
    if (Object.prototype.hasOwnProperty.call(update, 'name') && typeof update.name === 'string') {
      update.name = update.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(update, 'emoji')) update.emoji = update.emoji || null;
    if (Object.prototype.hasOwnProperty.call(update, 'icon')) update.icon = update.icon || null;
    update.updatedAt = firestore.FieldValue.serverTimestamp();
    await familyRef.collection('customFoods').doc(foodId).set(update, { merge: true });
  },

  async deleteCustomFood(foodId) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    if (!foodId) throw new Error('No custom food ID');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    await familyRef.collection('customFoods').doc(foodId).set(
      {
        isDeleted: true,
        deletedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  },

  async updateKidDataById(kidId, data) {
    if (!kidId || !this.currentFamilyId) return;
    if (!FIREBASE_AVAILABLE) return;
    await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .collection('kids')
      .doc(kidId)
      .set(data, { merge: true });
  },

  // ─── FAMILY ───

  async getFamilyMembers() {
    if (!this.currentFamilyId) return [];
    const famDoc = await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .get();
    if (!famDoc.exists) return [];

    const { members = [] } = famDoc.data();
    const userDocs = await Promise.all(
      members.map((uid) => firestore().collection('users').doc(uid).get())
    );
    return userDocs.map((doc) => ({
      uid: doc.id,
      ...(doc.exists ? doc.data() : {}),
    }));
  },

  async getFamilyInfo() {
    if (!this.currentFamilyId) return null;
    const famDoc = await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .get();
    if (!famDoc.exists) return null;
    return { id: famDoc.id, ...famDoc.data() };
  },

  async updateFamilyData(patch = {}) {
    if (!this.currentFamilyId) throw new Error('Missing family id');
    const update = { ...patch };
    if (Object.prototype.hasOwnProperty.call(update, 'name') && typeof update.name === 'string') {
      update.name = update.name.trim();
    }
    update.updatedAt = firestore.FieldValue.serverTimestamp();
    await firestore()
      .collection('families')
      .doc(this.currentFamilyId)
      .set(update, { merge: true });
  },

  async createChild({
    name,
    birthDate,
    ownerId = null,
    photoURL = null,
    preferredVolumeUnit = 'oz',
    themeKey = null,
  }) {
    if (!name || !this.currentFamilyId) throw new Error('Missing child fields');
    if (!FIREBASE_AVAILABLE) return `local-kid-${Date.now()}`;

    const uid = ownerId || auth()?.currentUser?.uid || null;
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);
    const famDoc = await familyRef.get();
    const famMembers =
      famDoc.exists && Array.isArray(famDoc.data()?.members)
        ? famDoc.data().members
        : (uid ? [uid] : []);

    const kidRef = await familyRef.collection('kids').add({
      name: String(name).trim(),
      ownerId: uid,
      birthDate,
      members: famMembers,
      photoURL: photoURL || null,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    const settingsPayload = {
      preferredVolumeUnit: preferredVolumeUnit === 'ml' ? 'ml' : 'oz',
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (themeKey) settingsPayload.themeKey = themeKey;

    await kidRef
      .collection('settings')
      .doc('default')
      .set(settingsPayload, { merge: true });

    return kidRef.id;
  },

  async createInvite(kidId = null) {
    const user = auth().currentUser;
    if (!user) throw new Error('Not signed in');
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await firestore().collection('invites').doc(code).set({
      familyId: this.currentFamilyId,
      kidId: kidId || this.currentKidId,
      createdBy: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      used: false,
    });
    return code;
  },

  async removeMember(memberId) {
    if (!this.currentFamilyId || !memberId) throw new Error('Missing ids');
    const familyRef = firestore().collection('families').doc(this.currentFamilyId);

    await familyRef.update({
      members: firestore.FieldValue.arrayRemove(memberId),
    });

    // Remove from all kids
    const kidsSnap = await familyRef.collection('kids').get();
    await Promise.all(
      kidsSnap.docs.map((kidDoc) =>
        kidDoc.ref.update({
          members: firestore.FieldValue.arrayRemove(memberId),
        })
      )
    );
  },

  async getConversation() {
    const doc = await this._kidRef().collection('conversations').doc('default').get();
    return doc.exists ? doc.data() : { messages: [] };
  },

  async saveMessage(message) {
    const ref = this._kidRef().collection('conversations').doc('default');
    const doc = await ref.get();
    const messages = doc.exists ? doc.data()?.messages || [] : [];
    messages.push(message);
    await ref.set({ messages }, { merge: true });
  },

  async clearConversation() {
    await this._kidRef().collection('conversations').doc('default').delete();
  },

  // ─── SLEEP SETTINGS (convenience) ───

  async getSleepSettings() {
    try {
      const kidDoc = await this._kidRef().get();
      if (!kidDoc.exists) return {};
      const kd = kidDoc.data();
      return {
        sleepDayStart: kd.sleepDayStart ?? kd.daySleepStartMinutes ?? 390,
        sleepDayEnd: kd.sleepDayEnd ?? kd.daySleepEndMinutes ?? 1170,
      };
    } catch {
      return { sleepDayStart: 390, sleepDayEnd: 1170 };
    }
  },
};

export default firestoreService;
