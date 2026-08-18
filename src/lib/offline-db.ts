'use client';

/**
 * Resilient IndexedDB wrapper for storing offline media blobs with in-memory fallback.
 * DB: isp-offline, Store: blobs (key: string).
 */

const DB_NAME = 'isp-offline';
const STORE = 'blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryStore = new Map<string, StoredBlob>();

export interface StoredBlob {
  key: string;
  blob: Blob;
  addedAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('[offline-db] IndexedDB open error, falling back to memory store');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const item: StoredBlob = { key, blob, addedAt: Date.now() };

  try {
    const db = await openDb();
    if (!db) {
      memoryStore.set(key, item);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          memoryStore.set(key, item);
          resolve(); // Fall back gracefully
        };
      } catch {
        memoryStore.set(key, item);
        resolve();
      }
    });
  } catch {
    memoryStore.set(key, item);
  }
}

export async function getBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    if (!db) {
      return memoryStore.get(key)?.blob ?? null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => {
          if (req.result?.blob) {
            resolve(req.result.blob);
          } else {
            resolve(memoryStore.get(key)?.blob ?? null);
          }
        };
        req.onerror = () => resolve(memoryStore.get(key)?.blob ?? null);
      } catch {
        resolve(memoryStore.get(key)?.blob ?? null);
      }
    });
  } catch {
    return memoryStore.get(key)?.blob ?? null;
  }
}

export async function deleteBlob(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    const db = await openDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore
  }
}

export async function listBlobs(): Promise<StoredBlob[]> {
  try {
    const db = await openDb();
    if (!db) {
      return Array.from(memoryStore.values());
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => {
          const dbResults = (req.result as StoredBlob[]) || [];
          const combinedMap = new Map<string, StoredBlob>();
          for (const item of memoryStore.values()) combinedMap.set(item.key, item);
          for (const item of dbResults) combinedMap.set(item.key, item);
          resolve(Array.from(combinedMap.values()));
        };
        req.onerror = () => resolve(Array.from(memoryStore.values()));
      } catch {
        resolve(Array.from(memoryStore.values()));
      }
    });
  } catch {
    return Array.from(memoryStore.values());
  }
}

export async function clearBlobs(): Promise<void> {
  memoryStore.clear();
  try {
    const db = await openDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore
  }
}
