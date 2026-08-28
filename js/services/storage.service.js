/**
 * BD Career Hub - Unified Storage Engine (js/services/storage.service.js)
 * Asynchronous IndexedDB storage with seamless LocalStorage fallback.
 */

class StorageService {
  constructor() {
    this.DB_NAME = 'BDCareerHubDB';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'keyval';
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    if (!window.indexedDB) {
      console.warn('[Storage] IndexedDB not available, using LocalStorage fallback.');
      return null;
    }

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME);
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => {
          console.warn('[Storage] IndexedDB failed to open, using LocalStorage fallback.');
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  }

  async get(key, defaultValue = null) {
    await this.initPromise;
    if (this.db) {
      try {
        return await new Promise((resolve) => {
          const tx = this.db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result !== undefined ? req.result : defaultValue);
          req.onerror = () => resolve(this.getLocal(key, defaultValue));
        });
      } catch (e) {
        return this.getLocal(key, defaultValue);
      }
    }
    return this.getLocal(key, defaultValue);
  }

  async set(key, value) {
    // Keep in sync with LocalStorage for fast synchronous bootstrap
    this.setLocal(key, value);

    await this.initPromise;
    if (this.db) {
      try {
        return await new Promise((resolve) => {
          const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.put(value, key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  async remove(key) {
    this.removeLocal(key);
    await this.initPromise;
    if (this.db) {
      try {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        tx.objectStore(this.STORE_NAME).delete(key);
      } catch (e) {}
    }
  }

  // LocalStorage Fallbacks
  getLocal(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  removeLocal(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
}

window.storageService = new StorageService();
