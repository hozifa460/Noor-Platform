/**
 * Highlights & Notes — stores text highlights with optional notes in IndexedDB.
 *
 * Each highlight stores ONLY metadata (page, text position, color, note text)
 * — never rendered images or page snapshots, to keep storage lightweight.
 *
 * Features:
 *   - Multiple highlight colors
 *   - Add notes to highlights
 *   - Edit/delete highlights
 *   - Export/import highlights as JSON
 *   - Per-book storage
 */

const DB_NAME = 'noor-pdf-annotations';
const DB_VERSION = 1;
const HIGHLIGHTS_STORE = 'highlights';
const NOTES_STORE = 'notes';

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
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
        const store = db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: 'id' });
        store.createIndex('bookSlug', 'bookSlug', { unique: false });
        store.createIndex('page', 'page', { unique: false });
      }
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        store.createIndex('bookSlug', 'bookSlug', { unique: false });
        store.createIndex('page', 'page', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export interface Highlight {
  id: string;
  bookSlug: string;
  page: number;
  text: string;
  color: HighlightColor;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#fef08a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
  orange: '#fed7aa',
};

/**
 * Generate a unique ID for a highlight.
 */
function generateId(): string {
  return `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Add a new highlight.
 */
export async function addHighlight(
  bookSlug: string,
  page: number,
  text: string,
  color: HighlightColor = 'yellow',
  note?: string,
): Promise<Highlight> {
  const db = await openDB();
  const highlight: Highlight = {
    id: generateId(),
    bookSlug,
    page,
    text,
    color,
    note,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readwrite');
    tx.objectStore(HIGHLIGHTS_STORE).add(highlight);
    tx.oncomplete = () => resolve(highlight);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all highlights for a specific book, optionally filtered by page.
 */
export async function getHighlights(
  bookSlug: string,
  page?: number,
): Promise<Highlight[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readonly');
    const index = tx.objectStore(HIGHLIGHTS_STORE).index('bookSlug');
    const req = index.getAll(bookSlug);
    req.onsuccess = () => {
      let results = req.result as Highlight[];
      if (page !== undefined) {
        results = results.filter((h) => h.page === page);
      }
      results.sort((a, b) => a.page - b.page);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Update a highlight's note or color.
 */
export async function updateHighlight(
  id: string,
  updates: Partial<Pick<Highlight, 'note' | 'color'>>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readwrite');
    const store = tx.objectStore(HIGHLIGHTS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const highlight = getReq.result as Highlight | undefined;
      if (!highlight) {
        reject(new Error('Highlight not found'));
        return;
      }
      const updated: Highlight = {
        ...highlight,
        ...updates,
        updatedAt: Date.now(),
      };
      store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a highlight by ID.
 */
export async function deleteHighlight(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readwrite');
    tx.objectStore(HIGHLIGHTS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Export all highlights for a book as JSON.
 */
export async function exportHighlights(bookSlug: string): Promise<string> {
  const highlights = await getHighlights(bookSlug);
  return JSON.stringify(
    { bookSlug, exportedAt: Date.now(), highlights },
    null,
    2,
  );
}

/**
 * Import highlights from JSON.
 */
export async function importHighlights(json: string): Promise<number> {
  const data = JSON.parse(json);
  if (!data.highlights || !Array.isArray(data.highlights)) {
    throw new Error('Invalid highlights JSON');
  }
  const db = await openDB();
  let count = 0;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readwrite');
    const store = tx.objectStore(HIGHLIGHTS_STORE);
    for (const h of data.highlights) {
      // Generate new ID to avoid conflicts
      const highlight: Highlight = {
        ...h,
        id: generateId(),
        updatedAt: Date.now(),
      };
      store.add(highlight);
      count++;
    }
    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}
