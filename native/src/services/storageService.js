/**
 * storageService — Supabase Storage uploads for React Native.
 * Mirrors web/supabaseUpload.js behavior (photos bucket + public URL).
 */
const SUPABASE_URL = 'https://zzxnkjssveypcxbguzif.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z_Sz0xirzaY1y5E6x7wssw_qJdXb2yB';
const SUPABASE_BUCKET = 'photos';

function ensureJpgPath(path) {
  if (!path) return '';
  return path.endsWith('.jpg') ? path : `${path}.jpg`;
}

function encodeStoragePath(path) {
  return String(path || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getPublicUrl(path) {
  const encodedPath = encodeStoragePath(path);
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodedPath}`;
}

function getUploadUrl(path) {
  const encodedPath = encodeStoragePath(path);
  return `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodedPath}`;
}

async function sourceToBlob(source) {
  if (!source) return null;
  const response = await fetch(source);
  return await response.blob();
}

/**
 * Upload a photo to Supabase Storage.
 * @param {string} sourceUriOrDataUrl - file://... or data:image/...;base64,...
 * @param {string} storagePath - e.g. "families/{fId}/kids/{kId}/photos/{uuid}"
 * @returns {string} public download URL
 */
export async function uploadPhoto(sourceUriOrDataUrl, storagePath) {
  if (!sourceUriOrDataUrl) return null;
  const finalPath = ensureJpgPath(storagePath);
  const blob = await sourceToBlob(sourceUriOrDataUrl);
  if (!blob) throw new Error('uploadPhoto: failed to create blob');

  const uploadRes = await fetch(getUploadUrl(finalPath), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': blob.type || 'image/jpeg',
      'x-upsert': 'false',
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '');
    throw new Error(`Supabase upload failed (${uploadRes.status}): ${body}`);
  }

  return getPublicUrl(finalPath);
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
 * Upload a user profile photo.
 * @param {string} localUri
 * @param {string} familyId
 * @param {string} userId
 * @returns {string} download URL
 */
export async function uploadUserPhoto(localUri, familyId, userId) {
  const resolvedFamilyId = familyId || 'shared';
  const path = `families/${resolvedFamilyId}/users/${userId}/profile_photo`;
  return await uploadPhoto(localUri, path);
}

/**
 * Delete a photo from Supabase Storage by its public URL.
 * @param {string} url
 */
export async function deletePhoto(url) {
  if (!url) return;
  const marker = `/${SUPABASE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const encodedPath = url.substring(idx + marker.length).split('?')[0].split('#')[0];
  const path = decodeURIComponent(encodedPath);

  const deleteRes = await fetch(getUploadUrl(path), {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!deleteRes.ok) {
    const body = await deleteRes.text().catch(() => '');
    throw new Error(`Supabase delete failed (${deleteRes.status}): ${body}`);
  }
}
