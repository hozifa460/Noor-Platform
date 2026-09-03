import { normalizeArabic } from '../arabic/normalizer';
import { getCachedHadithBook, setCachedHadithBook } from './storage';
import {
  HADITH_BASE,
  hadithBookIndexUrl,
  hadithBookMetadataUrl,
  hadithChapterUrl,
  hadithBookTocUrl,
} from '../shared/data-base';
import type {
  HadithItem,
  HadithChapter,
  HadithBookData,
} from './types';

const bookCache = new Map<string, HadithBookData>();

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

/**
 * Pre-normalizes all Hadiths in a book data structure for instant in-memory search with minimal memory footprint
 */
export function prepareBookData(data: HadithBookData): HadithBookData {
  if (!data || !data.hadiths) return data;
  for (let i = 0; i < data.hadiths.length; i++) {
    const h = data.hadiths[i];
    if (h && h.arabic && !h._norm) {
      h._norm = normalizeArabic(h.arabic);
    }
  }
  return data;
}

/**
 * Loads a full Hadith book (with memory cache + IndexedDB + local Node + remote fallback)
 */
export async function loadHadithBook(fileName: string): Promise<HadithBookData | null> {
  // 1. In-memory cache
  if (bookCache.has(fileName)) {
    return bookCache.get(fileName)!;
  }

  // 2. IndexedDB cache (browser)
  try {
    const idbData = await getCachedHadithBook<HadithBookData>(fileName);
    if (idbData && idbData.hadiths && idbData.hadiths.length > 0) {
      const prepared = prepareBookData(idbData);
      bookCache.set(fileName, prepared);
      return prepared;
    }
  } catch {
    /* proceed */
  }

  // 3. Check Node environment for local files
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', fileName);
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf-8');
        const parsed = JSON.parse(raw) as HadithBookData;
        const prepared = prepareBookData(parsed);
        bookCache.set(fileName, prepared);
        return prepared;
      }
    } catch {
      /* proceed */
    }
  }

  // 4. PRIMARY: chunked shards on noor-platform-hadith (smaller, faster,
  //    served from a dedicated dataset). index.json → N chapter chunks.
  if (HADITH_BASE) {
    try {
      const label = fileName.replace(/\.json$/, '');
      const data = await loadHadithBookFromShards(label);
      if (data) {
        const prepared = prepareBookData(data);
        bookCache.set(fileName, prepared);
        setCachedHadithBook(fileName, data).catch(() => {});
        return prepared;
      }
    } catch (err) {
      console.warn(`[hadith] shard fetch failed for ${fileName}, falling back:`, err);
    }
  }

  // 5. Legacy: full-size JSON from the public mirror repo
  try {
    const res = await fetch(`/data/hadith/${fileName}`);
    if (res.ok) {
      const data = (await res.json()) as HadithBookData;
      const prepared = prepareBookData(data);
      bookCache.set(fileName, prepared);
      setCachedHadithBook(fileName, data).catch(() => {});
      return prepared;
    }
  } catch {
    /* fallback to HF */
  }

  // 6. Final fallback: full JSON on the legacy quran_and_sunnah repo
  try {
    const url = `${HF_SUNNAH_BASE}/All_hadith_books/${fileName}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as HadithBookData;
      const prepared = prepareBookData(data);
      bookCache.set(fileName, prepared);
      setCachedHadithBook(fileName, data).catch(() => {});
      return prepared;
    }
  } catch (err) {
    console.warn(`Failed to fetch Hadith book ${fileName}:`, err);
  }

  return null;
}

/**
 * Loads a hadith book from the chunked layout on noor-platform-hadith:
 *   <book>/index.json        — {totalHadiths, chapterCount, chunkCount}
 *   <book>/metadata.json     — slim book info
 *   <book>/chapters/NNN.json — array of ~500 hadiths each
 */
export async function loadHadithBookFromShards(
  label: string,
  options?: { loadAllImmediately?: boolean }
): Promise<HadithBookData | null> {
  // 1. Fetch the book index (small — ~200 bytes)
  let index: { totalHadiths: number; chapterCount: number; chunkCount: number; fileName?: string };
  try {
    const res = await fetch(hadithBookIndexUrl(label));
    if (!res.ok) return null;
    index = await res.json();
  } catch {
    return null;
  }
  if (!index || !index.chunkCount) return null;

  // 2. Fetch metadata + toc + CHUNK 0 in parallel for instant UI render (< 60ms)
  const isServer = typeof window === 'undefined';
  const shouldLoadAll = options?.loadAllImmediately || isServer;

  const [metaRes, tocRes, chunk0Res] = await Promise.all([
    fetch(hadithBookMetadataUrl(label)).catch(() => null),
    fetch(hadithBookTocUrl(label)).catch(() => null),
    fetch(hadithChapterUrl(label, 0)).catch(() => null),
  ]);

  let chunk0: HadithItem[] = [];
  if (chunk0Res && (chunk0Res as Response).ok) {
    try {
      chunk0 = (await (chunk0Res as Response).json()) as HadithItem[];
    } catch { /* */ }
  }

  if (chunk0.length === 0) {
    return null;
  }

  type SlimMeta = {
    id?: number;
    length?: number;
    title_ar?: string;
    author_ar?: string;
    introduction_ar?: string;
    title_en?: string;
    author_en?: string;
  };
  let meta: SlimMeta = {};
  if (metaRes && (metaRes as Response).ok) {
    try { meta = (await (metaRes as Response).json()) as SlimMeta; } catch { /* */ }
  }

  type TocItem = {
    id: number;
    arabic?: string;
    english?: string;
    count?: number;
    firstHadithId?: number;
  };
  let tocItems: TocItem[] = [];
  if (tocRes && (tocRes as Response).ok) {
    try { tocItems = (await (tocRes as Response).json()) as TocItem[]; } catch { /* */ }
  }

  const bookId = meta.id ?? 1;
  let chapters: HadithChapter[] = [];

  if (tocItems.length > 0) {
    chapters = tocItems.map((t) => ({
      id: t.id,
      bookId,
      arabic: t.arabic || `باب ${t.id}`,
      english: t.english || '',
    }));
  } else {
    chapters = [{ id: 1, bookId, arabic: 'جميع أحاديث الديوان', english: '' }];
  }

  const hadiths: HadithItem[] = [...chunk0];

  const data: HadithBookData = {
    id: meta.id ?? 1,
    metadata: {
      id: meta.id ?? 1,
      length: meta.length ?? index.totalHadiths,
      arabic: {
        title: meta.title_ar ?? label,
        author: meta.author_ar ?? '',
        introduction: meta.introduction_ar ?? '',
      },
      english: {
        title: meta.title_en ?? label,
        author: meta.author_en ?? '',
      },
    },
    chapters,
    hadiths,
  };

  // 3. Load remaining chunks (if any)
  const remainingChunkIndices: number[] = [];
  for (let i = 1; i < index.chunkCount; i++) {
    remainingChunkIndices.push(i);
  }

  const fetchRemainingChunks = async () => {
    for (let i = 0; i < remainingChunkIndices.length; i += 3) {
      const batch = remainingChunkIndices.slice(i, i + 3);
      const batchRes = await Promise.all(
        batch.map((idx) =>
          fetch(hadithChapterUrl(label, idx))
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      for (const c of batchRes) {
        if (Array.isArray(c)) {
          for (const item of c) {
            if (item && item.arabic && !item._norm) {
              item._norm = normalizeArabic(item.arabic);
            }
            data.hadiths.push(item);
          }
        }
      }
    }
    setCachedHadithBook(`${label}.json`, data).catch(() => {});
  };

  if (shouldLoadAll) {
    await fetchRemainingChunks();
  } else if (remainingChunkIndices.length > 0) {
    fetchRemainingChunks().catch(() => {});
  }

  return data;
}

/**
 * Loads the complete, untruncated Hadith by book ID and Hadith number.
 */
export async function loadSpecificHadith(
  bookId: string,
  idInBook: number
): Promise<HadithItem | null> {
  const cached = await getCachedHadithBook<HadithBookData>(`${bookId}.json`);
  if (cached?.hadiths) {
    const found = cached.hadiths.find((h: HadithItem) => h.idInBook === idInBook || h.id === idInBook);
    if (found && found.arabic && found.arabic.length > 50) return found;
  }

  const chunkIndex = Math.max(0, Math.floor((idInBook - 1) / 500));
  try {
    const url = hadithChapterUrl(bookId, chunkIndex);
    const res = await fetch(url);
    if (res.ok) {
      const items: HadithItem[] = await res.json();
      const found = items.find((h) => h.idInBook === idInBook || h.id === idInBook);
      if (found) return found;
    }
  } catch (err) {
    console.warn(`[hadith] Failed to fetch chunk ${chunkIndex} for ${bookId}:`, err);
  }

  return null;
}
