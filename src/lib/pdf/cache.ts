/**
 * PDF page cache using IndexedDB for offline reading.
 *
 * Stores rendered page canvases as Blobs so they can be displayed instantly
 * on subsequent reads without re-fetching from the server.
 */

const DB_NAME = 'noor-pdf-cache';
const DB_VERSION = 1;
const STORE_NAME = 'pages';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * Cache key: `${pdfUrl}::${pageNum}::${zoom}`
 */
function cacheKey(pdfUrl: string, pageNum: number, zoom: number): string {
  return `${pdfUrl}::${pageNum}::${zoom.toFixed(2)}`;
}

export async function getCachedPage(
  pdfUrl: string,
  pageNum: number,
  zoom: number,
): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cacheKey(pdfUrl, pageNum, zoom));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedPage(
  pdfUrl: string,
  pageNum: number,
  zoom: number,
  blob: Blob,
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, cacheKey(pdfUrl, pageNum, zoom));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache write errors.
  }
}

/**
 * Clear all cached pages for a specific PDF.
 */
export async function clearPdfCache(pdfUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const keysToDelete: string[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const key = cursor.key as string;
          if (key.startsWith(`${pdfUrl}::`)) {
            keysToDelete.push(key);
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        const deleteStore = deleteTx.objectStore(STORE_NAME);
        for (const key of keysToDelete) {
          deleteStore.delete(key);
        }
        deleteTx.oncomplete = () => resolve();
        deleteTx.onerror = () => reject(deleteTx.error);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore.
  }
}
