const MAX_PHOTO_SIDE = 1600;
const JPEG_QUALITY = 0.7;
const MAX_PHOTO_CACHE_BYTES = 150 * 1024 * 1024;

function isLocalPhotoUri(uri) {
  if (!uri || typeof uri !== 'string') return false;
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://') ||
    uri.startsWith('data:')
  );
}

function hashPhotoCacheKey(uri) {
  const value = String(uri || '');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function photoCacheFileName(uri) {
  return `${hashPhotoCacheKey(uri)}.jpg`;
}

function cacheFilesToDelete(files, maxBytes, preserveName) {
  const candidates = files
    .filter((file) => file.name !== preserveName)
    .sort((a, b) => a.modifiedAt - b.modifiedAt);
  let totalBytes = files.reduce((total, file) => total + (file.size || 0), 0);
  const names = [];

  for (const file of candidates) {
    if (totalBytes <= maxBytes) break;
    names.push(file.name);
    totalBytes -= file.size || 0;
  }
  return names;
}

module.exports = {
  MAX_PHOTO_SIDE,
  JPEG_QUALITY,
  MAX_PHOTO_CACHE_BYTES,
  isLocalPhotoUri,
  hashPhotoCacheKey,
  photoCacheFileName,
  cacheFilesToDelete,
};
