import type { MediaItem } from '@/lib/types';
import { normalizeArabic } from '@/lib/arabic/normalizer';
import { dataUrl, isRemoteData } from '@/lib/shared/data-base';
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
      const letters = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
      const urls = isRemoteData()
        ? [...letters, '__'].map((l) =>
            dataUrl(`data/books/catalogs/shamela/_index_${l}.json`),
          )
        : ['/data/ebooks/shamela_arabic_catalog.json'];
      const responses = await Promise.all(
        urls.map((u) => fetch(u).then((r) => (r.ok ? r.json() : [])).catch(() => [])),
      );
      const items = responses.flat();
      if (items.length > 0) {
        set((s: TState) => {
          const nextFiles = new Set(s.loadedFiles);
          nextFiles.add('shamela');
          nextFiles.add('openiti');
          return {
            ...s,
            books: dedupeBooks([...s.books, ...items]),
            loadedFiles: nextFiles,
          };
        });
      }
    } catch {
      // non-critical: shamela is optional
    }
  })();
  try {
    await shamelaCatalogPromise;
  } finally {
    // Keep resolved cache
  }
}

export function getInitialCachedBooks(): MediaItem[] {
  if (typeof window === 'undefined') return QURANIC_MUS_HAFS;
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
  return QURANIC_MUS_HAFS;
}
