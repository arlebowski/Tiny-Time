import * as FileSystem from 'expo-file-system/legacy';
const {
  MAX_PHOTO_CACHE_BYTES,
  isLocalPhotoUri,
  photoCacheFileName,
  cacheFilesToDelete,
} = require('./photoCacheUtils.cjs');

const CACHE_DIR = `${FileSystem.cacheDirectory || ''}tt-photos/`;
const inflight = new Map();

async function ensureDir() {
  if (!FileSystem.cacheDirectory) return false;
  try {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    return true;
  } catch {
    return false;
  }
}

function cachePathFor(uri) {
  return `${CACHE_DIR}${photoCacheFileName(uri)}`;
}

async function cachedFileIfPresent(uri) {
  if (!uri || isLocalPhotoUri(uri) || !FileSystem.cacheDirectory) return null;
  const path = cachePathFor(uri);
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && (info.size == null || info.size > 0) ? path : null;
  } catch {
    return null;
  }
}

async function pruneCache(preservePath) {
  try {
    const names = (await FileSystem.readDirectoryAsync(CACHE_DIR))
      .filter((name) => name.endsWith('.jpg'));
    const files = await Promise.all(names.map(async (name) => {
      const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${name}`);
      return {
        name,
        size: info.exists ? info.size || 0 : 0,
        modifiedAt: info.modificationTime || 0,
      };
    }));
    const preserveName = preservePath?.slice(CACHE_DIR.length);
    const staleNames = cacheFilesToDelete(
      files,
      MAX_PHOTO_CACHE_BYTES,
      preserveName
    );
    await Promise.all(
      staleNames.map((name) =>
        FileSystem.deleteAsync(`${CACHE_DIR}${name}`, { idempotent: true })
      )
    );
  } catch {
    // Cache cleanup is best-effort.
  }
}

export async function rememberLocalPhoto(remoteUrl, localUri) {
  if (!remoteUrl || !localUri || isLocalPhotoUri(remoteUrl)) return;
  if (!(await ensureDir())) return;
  const dest = cachePathFor(remoteUrl);
  const temp = `${dest}.${Date.now()}.tmp`;
  try {
    await FileSystem.copyAsync({ from: localUri, to: temp });
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.moveAsync({ from: temp, to: dest });
    void pruneCache(dest);
  } catch {
    // Cache is best-effort; the remote URL still works.
  } finally {
    await FileSystem.deleteAsync(temp, { idempotent: true }).catch(() => {});
  }
}

export async function getCachedPhotoUri(uri) {
  if (!uri) return uri;
  if (isLocalPhotoUri(uri)) return uri;

  const hit = await cachedFileIfPresent(uri);
  if (hit) return hit;

  if (inflight.has(uri)) return inflight.get(uri);

  const download = (async () => {
    if (!(await ensureDir())) return uri;
    const dest = cachePathFor(uri);
    const temp = `${dest}.${Date.now()}.tmp`;
    try {
      const result = await FileSystem.downloadAsync(uri, temp);
      if (result.status >= 200 && result.status < 300) {
        const info = await FileSystem.getInfoAsync(temp);
        if (info.exists && (info.size == null || info.size > 0)) {
          await FileSystem.moveAsync({ from: temp, to: dest });
          void pruneCache(dest);
          return dest;
        }
      }
    } catch {
      // Fall through to the remote URL.
    } finally {
      await FileSystem.deleteAsync(temp, { idempotent: true }).catch(() => {});
    }
    return uri;
  })().finally(() => inflight.delete(uri));

  inflight.set(uri, download);
  return download;
}
