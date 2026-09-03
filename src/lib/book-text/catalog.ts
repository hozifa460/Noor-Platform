import { booksIndexUrl, isRemoteData } from '../shared/data-base';
import type { EBookMetadata } from '../books/types';

let catalogCache: EBookMetadata[] | null = null;
export const shamelaCatalogCache: Map<string, EBookMetadata> = new Map(); // key: bookId
export const openitiCatalogCache: Map<string, EBookMetadata> = new Map();

/** Normalise Arabic title for prefixing — must match the Python build script. */
export function normBookTitle(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function firstLetterOf(title: string): string {
  const normed = normBookTitle(title).replace(/[^\u0600-\u06FF]/g, '');
  return normed[0] || '_';
}

/** Fetch a single per-letter index file and cache its books. */
export async function loadCatalogLetterIndex(
  source: 'shamela' | 'openiti',
  letter: string,
): Promise<EBookMetadata[]> {
  if (isRemoteData()) {
    const url = booksIndexUrl(source, letter);
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) return [];
    const data = (await res.json()) as EBookMetadata[];
    const cache = source === 'shamela' ? shamelaCatalogCache : openitiCatalogCache;
    for (const b of data) {
      if (b.id) cache.set(b.id, b);
    }
    return data;
  }
  // Local dev fallback: read the legacy flat JSON if present.
  if (source === 'shamela') {
    try {
      const res = await fetch('/data/ebooks/shamela_arabic_catalog.json');
      if (res.ok) {
        const data = (await res.json()) as EBookMetadata[];
        for (const b of data) {
          if (b.id) shamelaCatalogCache.set(b.id, b);
        }
        return data;
      }
    } catch {}
  }
  return [];
}

/** Load the whole shamela catalog (used by /library). Fetches the per-letter index files lazily. */
export async function loadShamelaCatalogFull(): Promise<EBookMetadata[]> {
  const letters = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
  const results = await Promise.all(
    [...letters, '__'].map((l) => loadCatalogLetterIndex('shamela', l)),
  );
  return results.flat();
}

/** Lookup a single shamela book — fetches per-letter indexes on demand. */
export async function lookupShamelaBook(bookId: string): Promise<EBookMetadata | null> {
  if (shamelaCatalogCache.has(bookId)) return shamelaCatalogCache.get(bookId)!;
  await loadShamelaCatalogFull();
  return shamelaCatalogCache.get(bookId) ?? null;
}

/** Fetch ONLY the per-letter index that *might* contain this book. */
export async function loadShamelaBookByLetter(
  bookId: string,
  firstLetter: string,
): Promise<EBookMetadata | null> {
  if (shamelaCatalogCache.has(bookId)) return shamelaCatalogCache.get(bookId)!;
  if (isRemoteData()) {
    await loadCatalogLetterIndex('shamela', firstLetter);
    if (shamelaCatalogCache.has(bookId)) return shamelaCatalogCache.get(bookId)!;
    if (firstLetter !== '_' && firstLetter !== '__') {
      await loadCatalogLetterIndex('shamela', '__');
      if (shamelaCatalogCache.has(bookId)) return shamelaCatalogCache.get(bookId)!;
    }
  }
  return null;
}

/**
 * Fetch the master catalog of pure-text Islamic eBooks
 */
export async function fetchEBookCatalog(): Promise<EBookMetadata[]> {
  if (catalogCache && catalogCache.length > 0) {
    return catalogCache;
  }

  try {
    const res = await fetch('/data/ebooks/catalog.json');
    if (res.ok) {
      const data = (await res.json()) as EBookMetadata[];
      catalogCache = data;
      return data;
    }
  } catch (err) {
    console.warn('[book-text-engine] Failed to fetch remote catalog:', err);
  }

  return [];
}
