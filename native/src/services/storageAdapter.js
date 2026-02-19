/**
 * storageAdapter — thin adapter bridging firestoreService (object args)
 * to the `storage` prop API that sheets expect (positional args matching web).
 */
import firestoreService from './firestoreService';
import { uploadTrackerPhoto } from './storageService';

export function createStorageAdapter(familyId, kidId) {
  if (!firestoreService?.isAvailable) {
    const noop = async () => null;
    return {
      addFeeding: noop,
      getAllFeedings: async () => [],
      updateFeeding: noop,
      addFeedingWithNotes: noop,
      updateFeedingWithNotes: noop,
      deleteFeeding: noop,
      addNursingSession: noop,
      addNursingSessionWithNotes: noop,
      updateNursingSession: noop,
      updateNursingSessionWithNotes: noop,
      deleteNursingSession: noop,
      addSolidsSession: noop,
      updateSolidsSession: noop,
      deleteSolidsSession: noop,
      getAllSolidsSessions: async () => [],
      getCustomFoods: async () => [],
      getRecentFoods: async () => [],
      updateRecentFoods: noop,
      addCustomFood: noop,
      updateCustomFood: noop,
      deleteCustomFood: noop,
      saveMessage: noop,
      addDiaperChange: noop,
      updateDiaperChange: noop,
      deleteDiaperChange: noop,
      startSleep: async (startTime) => ({ id: `local-sleep-${Date.now()}`, startTime: startTime || Date.now(), isActive: true }),
      endSleep: noop,
      addSleepSession: noop,
      updateSleepSession: noop,
      deleteSleepSession: noop,
      subscribeActiveSleep: () => () => {},
      uploadFeedingPhoto: async (localUri) => localUri || null,
      uploadSleepPhoto: async (localUri) => localUri || null,
      uploadDiaperPhoto: async (localUri) => localUri || null,
      getKidData: async () => ({ id: 'local-kid', name: 'Levi', photoURL: null }),
      updateKidData: noop,
      getSettings: async () => ({ preferredVolumeUnit: 'oz' }),
      saveSettings: noop,
      getFamilyMembers: async () => [],
      createInvite: async () => `LOCAL${Date.now().toString().slice(-6)}`,
      removeMember: noop,
    };
  }

  return {
    // ── Feedings ──
    addFeeding: (ounces, timestamp) =>
      firestoreService.addFeeding({ ounces, timestamp }),

    getAllFeedings: () => firestoreService.getAllFeedings(),

    updateFeeding: (id, data) =>
      firestoreService.updateFeeding(id, data),

    addFeedingWithNotes: (ounces, timestamp, notes, photoURLs) =>
      firestoreService.addFeeding({ ounces, timestamp, notes, photoURLs }),

    updateFeedingWithNotes: (id, ounces, timestamp, notes, photoURLs) =>
      firestoreService.updateFeeding(id, { ounces, timestamp, notes, photoURLs }),

    deleteFeeding: (id) => firestoreService.deleteFeeding(id),

    // ── Nursing ──
    addNursingSession: (startTime, leftSec, rightSec, lastSide) =>
      firestoreService.addNursingSession({ startTime, leftDurationSec: leftSec, rightDurationSec: rightSec, lastSide }),

    addNursingSessionWithNotes: (startTime, leftSec, rightSec, lastSide, notes, photoURLs) =>
      firestoreService.addNursingSession({ startTime, leftDurationSec: leftSec, rightDurationSec: rightSec, lastSide, notes, photoURLs }),

    updateNursingSession: (id, data) =>
      firestoreService.updateNursingSession(id, data),

    updateNursingSessionWithNotes: (id, startTime, leftSec, rightSec, lastSide, notes, photoURLs) =>
      firestoreService.updateNursingSession(id, { startTime, timestamp: startTime, leftDurationSec: leftSec, rightDurationSec: rightSec, lastSide, notes, photoURLs }),

    deleteNursingSession: (id) => firestoreService.deleteNursingSession(id),

    // ── Solids ──
    addSolidsSession: (data) => firestoreService.addSolidsSession(data),

    updateSolidsSession: (id, data) => firestoreService.updateSolidsSession(id, data),

    deleteSolidsSession: (id) => firestoreService.deleteSolidsSession(id),

    getAllSolidsSessions: () => firestoreService.getAllSolidsSessions(),
    getCustomFoods: () => firestoreService.getCustomFoods(),
    getRecentFoods: (options) => firestoreService.getRecentFoods(options),
    updateRecentFoods: (foodName) => firestoreService.updateRecentFoods(foodName),
    addCustomFood: (data) => firestoreService.addCustomFood(data),
    updateCustomFood: (foodId, patch) => firestoreService.updateCustomFood(foodId, patch),
    deleteCustomFood: (foodId) => firestoreService.deleteCustomFood(foodId),

    // ── Diaper ──
    addDiaperChange: (data) => firestoreService.addDiaperChange(data),

    updateDiaperChange: (id, data) => firestoreService.updateDiaperChange(id, data),

    deleteDiaperChange: (id) => firestoreService.deleteDiaperChange(id),

    // ── Sleep ──
    startSleep: (startTime) => firestoreService.startSleep(startTime),

    endSleep: (sessionId, endTime) => firestoreService.endSleep(sessionId, endTime),

    addSleepSession: (data) => firestoreService.addSleepSession(data),

    updateSleepSession: (id, data) => firestoreService.updateSleepSession(id, data),

    deleteSleepSession: (id) => firestoreService.deleteSleepSession(id),

    subscribeActiveSleep: (cb) => firestoreService.subscribeActiveSleep(cb),

    // ── Photo uploads ──
    uploadFeedingPhoto: (localUri) =>
      uploadTrackerPhoto(localUri, familyId, kidId, 'photos'),

    uploadSleepPhoto: (localUri) =>
      uploadTrackerPhoto(localUri, familyId, kidId, 'photos'),

    uploadDiaperPhoto: (localUri) =>
      uploadTrackerPhoto(localUri, familyId, kidId, 'diaperPhotos'),

    // ── Settings & Kid ──
    getKidData: () => firestoreService.getKidData(),
    updateKidData: (data) => firestoreService.updateKidData(data),
    getSettings: () => firestoreService.getKidSettings(),
    saveSettings: (data) => firestoreService.updateKidSettings(data),
    getFamilyMembers: () => firestoreService.getFamilyMembers(),
    createInvite: (kidId) => firestoreService.createInvite(kidId),
    removeMember: (memberId) => firestoreService.removeMember(memberId),
    saveMessage: (message) => firestoreService.saveMessage(message),
  };
}
