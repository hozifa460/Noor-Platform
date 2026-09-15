import type { MediaItem } from '@/lib/types';
import { normalizeArabic } from '@/lib/arabic';
import { booksUrl, isRemoteBooks } from '@/lib/shared';
import { QURANIC_MUS_HAFS } from '@/data/books';

export const LOCAL_CACHE_KEY = 'noor-books-shamela-v4';

let shamelaCatalogPromise: Promise<unknown> | null = null;

export function dedupeBooks(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const it of items) {
    const key = it.pdfUrl || it.id || it.title;
    if (!seen.has(key)) {
      seen.add(key);
      const normTitle = normalizeArabic(it.title);
      const normAuthor = normalizeArabic(it.sheikhName);
      const normDesc = normalizeArabic(it.description);
      const normTags = (it.tags || []).map(normalizeArabic).join(' ');
      (it as unknown as MediaItem & Record<string, unknown>)._normTitle = normTitle;
      (it as unknown as MediaItem & Record<string, unknown>)._normAuthor = normAuthor;
      (it as unknown as MediaItem & Record<string, unknown>)._normSearchText = `${normTitle} ${normAuthor} ${normDesc} ${normTags}`;
      out.push(it);
    }
  }
  return out;
}

export async function cachedLoadShamelaCatalog<TState extends { books: MediaItem[]; loadedFiles: Set<string> }>(
  set: (partial: Partial<TState> | ((s: TState) => Partial<TState>)) => void,
  get: () => TState,
): Promise<void> {
  if (get().loadedFiles.has('shamela')) return;
  if (shamelaCatalogPromise) {
    await shamelaCatalogPromise;
    return;
  }
  shamelaCatalogPromise = (async () => {
    try {
      if (!isRemoteBooks()) {
        const res = await fetch('/data/ebooks/shamela_arabic_catalog.json').catch(() => null);
        if (res && res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            set((s: TState) => {
              const nextFiles = new Set(s.loadedFiles);
              nextFiles.add('shamela');
              return { ...s, books: dedupeBooks([...s.books, ...items]), loadedFiles: nextFiles };
            });
          }
        }
        return;
      }

      // Step 1: Responsive initial load — Letter 'ا' (~4,000 books, 45% of entire library)
      const primaryRes = await fetch(booksUrl('data/books/catalogs/shamela/_index_ا.json')).catch(() => null);
      if (primaryRes && primaryRes.ok) {
        const primaryItems = await primaryRes.json();
        if (Array.isArray(primaryItems) && primaryItems.length > 0) {
          set((s: TState) => {
            const nextFiles = new Set(s.loadedFiles);
            nextFiles.add('shamela');
            return {
              ...s,
              books: dedupeBooks([...s.books, ...primaryItems]),
              loadedFiles: nextFiles,
            };
          });
        }
      }

      // Initial load complete for responsive entry (Letter 'ا' ~4,000 books)
      // Note: No background downloading of the other 28 letter shards is performed to respect user bandwidth.
    } catch {
      // non-critical
    }
  })();

  try {
    await shamelaCatalogPromise;
  } finally {
    // Keep promise resolved
  }
}

let searchIndexPromise: Promise<MediaItem[]> | null = null;
let searchIndexLoaded = false;

export function _resetSearchIndexStateForTesting(): void {
  searchIndexPromise = null;
  searchIndexLoaded = false;
}

/**
 * On-demand lazy loader for the comprehensive books search index.
 * Loaded ONCE only when the user types in the search bar.
 */
export async function loadSearchIndexOnDemand<TState extends { books: MediaItem[]; loadedFiles: Set<string> }>(
  set: (partial: Partial<TState> | ((s: TState) => Partial<TState>)) => void,
  _get: () => TState,
): Promise<void> {
  if (searchIndexLoaded) return;
  if (searchIndexPromise) {
    await searchIndexPromise;
    return;
  }

  searchIndexPromise = (async () => {
    try {
      const res = await fetch('/data/ebooks/books_search_index.json').catch(() => null);
      if (res && res.ok) {
        const items = (await res.json()) as MediaItem[];
        if (Array.isArray(items) && items.length > 0) {
          searchIndexLoaded = true;
          set((s: TState) => {
            const nextFiles = new Set(s.loadedFiles);
            nextFiles.add('shamela_search_index');
            return {
              ...s,
              books: dedupeBooks([...s.books, ...items]),
              loadedFiles: nextFiles,
            };
          });
          return items;
        }
      }
    } catch (e) {
      console.warn('[store-loader] Failed to load search index:', e);
    }
    // On failure: clear promise so subsequent search interactions can retry
    searchIndexPromise = null;
    return [];
  })();

  await searchIndexPromise;
}
/**
 * Initial books for store initialization.
 * Must be strictly deterministic across SSR and initial client hydration
 * to prevent React Error #418 (Text content hydration mismatch).
 * Cached books from localStorage are loaded post-hydration in startLoading().
 */
export function getInitialCachedBooks(): MediaItem[] {
  return QURANIC_MUS_HAFS;
}

/**
 * Loads cached catalog items from localStorage safely after React hydration.
 */
export function loadCachedBooksPostHydration(): MediaItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 500) {
        return dedupeBooks(parsed);
      }
    }
  } catch {
    // fallback
  }
  return null;
}
