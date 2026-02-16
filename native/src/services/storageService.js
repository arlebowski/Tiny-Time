/**
 * storageService — Firebase Storage for photo uploads in React Native
 * Uses @react-native-firebase/storage
 */
let storage = null;
try {
  storage = require('@react-native-firebase/storage').default;
} catch {}
const STORAGE_AVAILABLE = typeof storage === 'function';

/**
 * Upload a photo to Firebase Storage.
 * @param {string} localUri - local file URI from image picker (file://...)
 * @param {string} storagePath - e.g. "families/{fId}/kids/{kId}/photos/{uuid}"
 * @returns {string} public download URL
 */
export async function uploadPhoto(localUri, storagePath) {
  if (!STORAGE_AVAILABLE) return localUri || null;
  const ref = storage().ref(storagePath);
  await ref.putFile(localUri);
  return await ref.getDownloadURL();
}

/**
 * Upload a feeding/sleep/diaper photo.
 * @param {string} localUri - local file URI
 * @param {string} familyId
 * @param {string} kidId
 * @param {string} subfolder - 'photos' | 'diaperPhotos'
 * @returns {string} download URL
 */
export async function uploadTrackerPhoto(localUri, familyId, kidId, subfolder = 'photos') {
  const photoId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `families/${familyId}/kids/${kidId}/${subfolder}/${photoId}`;
  return await uploadPhoto(localUri, path);
}

/**
 * Upload a kid profile photo.
 * @param {string} localUri
 * @param {string} familyId
 * @param {string} kidId
 * @returns {string} download URL
 */
export async function uploadKidPhoto(localUri, familyId, kidId) {
  const path = `families/${familyId}/kids/${kidId}/profile_photo`;
  return await uploadPhoto(localUri, path);
}

/**
 * Delete a photo from Firebase Storage by its download URL.
 * @param {string} url
 */
export async function deletePhoto(url) {
  if (!STORAGE_AVAILABLE) return;
  if (!url) return;
  try {
    const ref = storage().refFromURL(url);
    await ref.delete();
  } catch (e) {
    console.warn('Failed to delete photo:', e);
  }
}
