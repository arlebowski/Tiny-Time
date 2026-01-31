// Shared persistent cache (IndexedDB with localStorage fallback)
(function initDataCache() {
  if (typeof window === 'undefined') return;
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  if (window.TT.shared.dataCache) return;

  const DB_NAME = 'tt_cache_v1';
  const STORE = 'kv';
  let openPromise = null;

  const open = () => {
    if (openPromise) return openPromise;
    if (typeof indexedDB === 'undefined') {
      openPromise = Promise.resolve(null);
      return openPromise;
    }
    openPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return openPromise;
  };

  const get = async (key) => {
    try {
      const db = await open();
      if (!db) {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  };

  const set = async (key, value) => {
    try {
      const db = await open();
      if (!db) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore cache write errors
    }
  };

  const remove = async (key) => {
    try {
      const db = await open();
      if (!db) {
        localStorage.removeItem(key);
        return;
      }
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore cache delete errors
    }
  };

  window.TT.shared.dataCache = { get, set, remove };
})();
