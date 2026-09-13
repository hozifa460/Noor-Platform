import { getBlob } from '@/lib/shared';
import {
  shamelaBookFolder,
  shamelaBookMetaUrl,
  shamelaBookIndexUrl,
  shamelaBookTocUrl,
  shamelaBookChapterUrl,
  shamelaChunksManifestUrl,
} from '@/lib/shared/data-base';
import type {
  EBookMetadata,
  TableOfContentsItem,
  BookChapterChunk,
  SectionParagraph,
} from '../../domain';
import {
  loadOpenItiDynamicEBook as loadOpenItiService,
  toArabicDigits,
} from './openiti-loader';

export interface EBookMetaResponse {
  meta: EBookMetadata;
  toc: TableOfContentsItem[];
}

export const metaCache = new Map<string, EBookMetaResponse>();

/* -------------------------------------------------------------------------
   1. Global Byte-Budget LRU Cache (Heuristic: 8 MB Max)
   ------------------------------------------------------------------------- */
export const GLOBAL_CHUNK_CACHE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

interface CacheEntry {
  chunk: BookChapterChunk;
  estimatedBytes: number;
  lastAccessedAt: number;
}

export const chunkCache = new Map<string, CacheEntry>();
let currentCacheBytes = 0;

export function estimateChunkBytes(chunk: BookChapterChunk): number {
  let textLen = chunk.title.length;
  for (const p of chunk.paragraphs) {
    textLen += p.text.length + (p.volumePageBadge?.length || 0);
    if (p.footnotes) {
      for (const fn of p.footnotes) textLen += fn.text.length;
    }
  }
  return Math.max(1024, textLen * 2 + chunk.paragraphs.length * 128);
}

export function getCachedChunk(key: string): BookChapterChunk | null {
  const entry = chunkCache.get(key);
  if (!entry) return null;
  entry.lastAccessedAt = Date.now();
  return entry.chunk;
}

export function setCachedChunk(key: string, chunk: BookChapterChunk): void {
  const estimatedBytes = estimateChunkBytes(chunk);

  if (chunkCache.has(key)) {
    currentCacheBytes -= chunkCache.get(key)!.estimatedBytes;
    chunkCache.delete(key);
  }

  // Evict least recently used entries across ALL books when over budget
  while (currentCacheBytes + estimatedBytes > GLOBAL_CHUNK_CACHE_MAX_BYTES && chunkCache.size > 0) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of chunkCache.entries()) {
      if (v.lastAccessedAt < oldestTime) {
        oldestTime = v.lastAccessedAt;
        oldestKey = k;
      }
    }

    if (!oldestKey) break;

    const evicted = chunkCache.get(oldestKey)!;
    currentCacheBytes -= evicted.estimatedBytes;
    (evicted as unknown as { chunk: null }).chunk = null;
    chunkCache.delete(oldestKey);
  }

  chunkCache.set(key, {
    chunk,
    estimatedBytes,
    lastAccessedAt: Date.now(),
  });
  currentCacheBytes += estimatedBytes;
}

export function getCurrentCacheBytes(): number {
  return currentCacheBytes;
}

export function clearChunkCache(): void {
  for (const entry of chunkCache.values()) {
    (entry as unknown as { chunk: null }).chunk = null;
  }
  chunkCache.clear();
  currentCacheBytes = 0;
}

export function clearMetaCache(): void {
  metaCache.clear();
}

/* -------------------------------------------------------------------------
   2. Reference-Counted Request Deduplication
   ------------------------------------------------------------------------- */
interface SharedRequest<T> {
  promise: Promise<T>;
  controller: AbortController;
  refCount: number;
}

export const activeRequests = new Map<string, SharedRequest<unknown>>();

export function fetchWithRefCount<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  consumerSignal?: AbortSignal
): Promise<T> {
  let entry = activeRequests.get(key) as SharedRequest<T> | undefined;

  if (!entry) {
    const controller = new AbortController();
    const promise = fetcher(controller.signal)
      .finally(() => {
        activeRequests.delete(key);
      });

    entry = { promise, controller, refCount: 1 };
    activeRequests.set(key, entry as SharedRequest<unknown>);
  } else {
    entry.refCount++;
  }

  const currentEntry = entry;

  if (!consumerSignal) {
    return currentEntry.promise;
  }

  if (consumerSignal.aborted) {
    currentEntry.refCount--;
    if (currentEntry.refCount <= 0) {
      currentEntry.controller.abort();
      activeRequests.delete(key);
    }
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      currentEntry.refCount--;
      if (currentEntry.refCount <= 0) {
        currentEntry.controller.abort();
        activeRequests.delete(key);
      }
      reject(new DOMException('Aborted', 'AbortError'));
    };

    consumerSignal.addEventListener('abort', onAbort, { once: true });

    currentEntry.promise
      .then((val) => {
        if (settled) return;
        settled = true;
        consumerSignal.removeEventListener('abort', onAbort);
        resolve(val);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        consumerSignal.removeEventListener('abort', onAbort);
        reject(err);
      });
  });
}

/* -------------------------------------------------------------------------
   3. OpenITI classical books loader
   ------------------------------------------------------------------------- */
export async function loadOpenItiDynamicEBook(bookId: string): Promise<EBookMetaResponse | null> {
  const adapterMap = new Map<string, BookChapterChunk>();
  const result = await loadOpenItiService(bookId, adapterMap);
  if (result) {
    metaCache.set(bookId, result);
    for (const [k, chunk] of adapterMap.entries()) {
      setCachedChunk(k, chunk);
    }
  }
  return result;
}

/* -------------------------------------------------------------------------
   4. Authentic Maktaba Shamela 4 Modular Loader
   ------------------------------------------------------------------------- */
export async function loadShamelaEBook(
  bookId: string,
  signal?: AbortSignal
): Promise<EBookMetaResponse | null> {
  const folder = shamelaBookFolder(bookId);
  if (!folder || folder === '00000') {
    return null;
  }

  if (metaCache.has(bookId)) {
    return metaCache.get(bookId)!;
  }

  try {
    const metaUrl = shamelaBookMetaUrl(folder);
    const indexUrl = shamelaBookIndexUrl(folder);
    const tocUrl = shamelaBookTocUrl(folder);
    const manifestUrl = shamelaChunksManifestUrl(folder);

    // Concurrently fetch metadata, index, table of contents, and chunks manifest (with local fallback)
    const [rawMeta, rawIndex, rawToc, rawManifest] = await Promise.all([
      fetchWithRefCount(metaUrl, (sig) => fetch(metaUrl, { signal: sig }).then((r) => (r.ok ? r.json() : null)).catch(() => null), signal),
      fetchWithRefCount(indexUrl, (sig) => fetch(indexUrl, { signal: sig }).then((r) => (r.ok ? r.json() : null)).catch(() => null), signal),
      fetchWithRefCount(tocUrl, (sig) => fetch(tocUrl, { signal: sig }).then((r) => (r.ok ? r.json() : null)).catch(() => null), signal),
      fetchWithRefCount(manifestUrl, async (sig) => {
        try {
          const res = await fetch(manifestUrl, { signal: sig });
          if (res.ok) return await res.json();
        } catch {}
        // Fallback to local manifest if available (e.g. for verified high-priority books)
        try {
          const localUrl = `/data/ebooks/manifests/${folder}_manifest.json`;
          const resLocal = await fetch(localUrl, { signal: sig });
          if (resLocal.ok) return await resLocal.json();
        } catch {}
        return null;
      }, signal),
    ]);

    if (!rawMeta && !rawIndex) {
      return null;
    }

    const title = rawMeta?.title_ar || rawIndex?.section || 'مصنف تراثي';
    const author = rawMeta?.main_author_name_ar || 'من أئمة الإسلام';
    const deathHijri = rawMeta?.main_author_death_hijri || rawMeta?.main_author_death_hijri_text;
    const categoryName = rawMeta?.category_name_ar || rawIndex?.section || 'تراث';

    const totalChapters = rawIndex?.chapterCount || 1;
    const totalPages = rawIndex?.totalPages || totalChapters * 20;

    const tocItems: TableOfContentsItem[] = [];
    if (Array.isArray(rawToc)) {
      const manifestList = Array.isArray(rawManifest)
        ? (rawManifest as Array<{
            chunk: number;
            startPageId?: number;
            endPageId?: number;
            startPage?: number;
            endPage?: number;
            pageIds?: number[];
            pageNums?: (number | null)[];
          }>)
        : null;

      // 1. Build an exact lookup map from explicit pageIds arrays if available
      const pageIdToChunkMap = new Map<
        number,
        { chunk: number; startPage?: number; pageNum?: number }
      >();
      let hasExplicitPageIds = false;

      if (manifestList) {
        for (const m of manifestList) {
          if (Array.isArray(m.pageIds) && m.pageIds.length > 0) {
            hasExplicitPageIds = true;
            m.pageIds.forEach((pid, idx) => {
              if (pid !== undefined && pid !== null) {
                const pageNum =
                  Array.isArray(m.pageNums) && m.pageNums[idx] !== undefined && m.pageNums[idx] !== null
                    ? Number(m.pageNums[idx])
                    : undefined;
                pageIdToChunkMap.set(Number(pid), {
                  chunk: m.chunk,
                  startPage: m.startPage,
                  pageNum,
                });
              }
            });
          }
        }
      }

      for (let i = 0; i < rawToc.length; i++) {
        const item = rawToc[i];
        let assignedChunk = -1;
        let isMapped = false;
        let matchedManifest: {
          chunk: number;
          startPage?: number;
          endPage?: number;
          startPageId?: number;
          endPageId?: number;
          pageIds?: number[];
          pageNums?: (number | null)[];
          pageNum?: number;
        } | null = null;

        // Level 1: Explicit chunk_index enriched in toc.json
        if (item.chunk_index !== undefined) {
          assignedChunk = item.chunk_index;
          isMapped = true;
        }
        // Level 2A: Exact lookup from explicit pageIds map (Strict: prevents any range divergence)
        else if (hasExplicitPageIds && item.page_id !== undefined) {
          const matched = pageIdToChunkMap.get(Number(item.page_id));
          if (matched) {
            assignedChunk = matched.chunk;
            isMapped = true;
            matchedManifest = { ...matched, chunk: matched.chunk };
          }
        }
        // Level 2B: Only when manifest DOES NOT contain explicit pageIds lists AT ALL, fall back to range bounds
        else if (!hasExplicitPageIds && manifestList && item.page_id !== undefined) {
          const found = manifestList.find(
            (m) =>
              m.startPageId !== undefined &&
              m.endPageId !== undefined &&
              item.page_id! >= m.startPageId &&
              item.page_id! <= m.endPageId
          );
          if (found) {
            assignedChunk = found.chunk;
            isMapped = true;
            matchedManifest = found;
          }
        }
        // Level 3: Contiguous sequence_num (1..N sequence order)
        else if (item.sequence_num !== undefined) {
          assignedChunk = Math.max(
            0,
            Math.min(totalChapters - 1, Math.floor((item.sequence_num - 1) / 20))
          );
          isMapped = true;
        }

        // Strict boundary policy: NEVER guess from raw page_id / 20 because database IDs
        // are non-sequential. If unverified, assignedChunk remains -1 and isMapped is false.
        const targetChapter = isMapped ? assignedChunk + 1 : -1;

        // Strict page number resolution:
        // 1) Use genuine page_num from TOC item if available.
        // 2) Use exact pageNum from manifest's page data if available.
        // 3) NEVER use chunk startPage or raw page_id as a substitute.
        // If unknown, leave undefined so the UI hides the page number.
        const resolvedPageNum =
          item.page_num !== undefined && item.page_num !== null
            ? item.page_num
            : matchedManifest?.pageNum !== undefined
            ? matchedManifest.pageNum
            : undefined;

        tocItems.push({
          id: `toc-${item.title_id || i + 1}`,
          title: item.title_text || `الباب ${toArabicDigits(i + 1)}`,
          chapterIndex: targetChapter,
          pageNumber: resolvedPageNum,
          pageId: item.page_id,
          level: item.parent_id ? 2 : 1,
          isMapped,
        });
      }
    }

    const meta: EBookMetadata = {
      id: bookId,
      title,
      author,
      authorDeath: deathHijri ? `${deathHijri} هـ` : undefined,
      category: 'history',
      islamicArt: 'general',
      century: deathHijri ? Math.ceil(parseInt(String(deathHijri), 10) / 100) : 3,
      description: rawMeta?.betaka_text?.slice(0, 200) || `مصنف ${title} للإمام ${author}`,
      totalVolumes: 1,
      totalPages,
      totalChapters,
      totalWords: totalPages * 250,
      hasFacsimilePdf: false,
      coverGradient: 'from-emerald-950 via-stone-900 to-amber-950',
      accentColor: '#10b981',
      language: 'ar',
      edition: rawMeta?.betaka_text ? rawMeta.betaka_text.slice(0, 150) : undefined,
      tags: ['شاملة', categoryName, 'موافق للمطبوع', 'نص محقق'],
    };

    const response: EBookMetaResponse = { meta, toc: tocItems };
    metaCache.set(bookId, response);
    return response;
  } catch (err) {
    console.warn(`[book-text-engine] Failed to load Shamela book ${bookId}:`, err);
    return null;
  }
}

/**
 * Load metadata and Table of Contents for a specific book
 */
export async function loadEBookMeta(
  bookId: string,
  signal?: AbortSignal
): Promise<EBookMetaResponse | null> {
  if (metaCache.has(bookId)) {
    return metaCache.get(bookId)!;
  }

  if (bookId.startsWith('shamela-') || /^\d+$/.test(bookId)) {
    return loadShamelaEBook(bookId, signal);
  }

  if (bookId.startsWith('openiti-') || bookId.includes('openiti')) {
    return loadOpenItiDynamicEBook(bookId);
  }

  try {
    const offlineBlob = await getBlob(`ebook:${bookId}:meta`);
    if (offlineBlob) {
      const text = await offlineBlob.text();
      const parsed = JSON.parse(text) as EBookMetaResponse;
      metaCache.set(bookId, parsed);
      return parsed;
    }
  } catch {
    /* fallback to network */
  }

  try {
    const res = await fetch(`/data/ebooks/${bookId}/meta.json`, { signal });
    if (res.ok) {
      const data = (await res.json()) as EBookMetaResponse;
      metaCache.set(bookId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[book-text-engine] Failed to load meta for ${bookId}:`, err);
  }

  return null;
}

/**
 * Fetch a single chapter slice on-demand (20 pages per chunk)
 */
export async function fetchShamelaChapterSlice(
  bookId: string,
  chunkIndex: number,
  signal?: AbortSignal
): Promise<BookChapterChunk | null> {
  const folder = shamelaBookFolder(bookId);
  if (!folder) return null;

  const zeroBasedChunk = chunkIndex;
  const displayChapterIndex = chunkIndex + 1;
  const cacheKey = `${bookId}:${displayChapterIndex}`;
  const cached = getCachedChunk(cacheKey);
  if (cached) return cached;

  const url = shamelaBookChapterUrl(folder, zeroBasedChunk);

  try {
    const rawPages = await fetchWithRefCount<Array<{
      page_id?: number;
      page_num?: number | string;
      sequence_num?: number;
      part?: number | string | null;
      body?: string;
      footnotes?: string | null;
    }>>(
      url,
      async (sig) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch(url, { signal: sig });
            if (res.ok) return await res.json();
            if (res.status === 404) return null;
          } catch (e) {
            if (sig.aborted) throw e;
            if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
          }
        }
        return null;
      },
      signal
    );

    if (!Array.isArray(rawPages) || rawPages.length === 0) {
      return null;
    }

    const paragraphs: SectionParagraph[] = [];
    let startPage = 1;
    let endPage = 1;

    for (let i = 0; i < rawPages.length; i++) {
      const page = rawPages[i];
      const pageNum = parseInt(String(page.page_num || (zeroBasedChunk * 20 + i + 1)), 10) || 1;
      const pageId = page.page_id !== undefined ? Number(page.page_id) : undefined;
      const volNum = page.part ? parseInt(String(page.part), 10) || 1 : 1;
      if (i === 0) startPage = pageNum;
      endPage = pageNum;

      const bodyText = (page.body || '').trim();
      const footnotesText = (page.footnotes || '').trim();

      if (bodyText) {
        const isHadith = /^(\d+[\.\)\-]|حدثنا|أخبرنا|أنبأنا|روى|عن|سمعت|قال الإمام|أخرج)/.test(bodyText);
        paragraphs.push({
          id: `p-${zeroBasedChunk}-${i + 1}`,
          text: bodyText,
          isHadithSanad: isHadith,
          pageNumber: pageNum,
          pageId,
          volumeNumber: volNum,
          volumePageBadge: volNum > 1
            ? `[ج ${toArabicDigits(volNum)}، ص ${toArabicDigits(pageNum)}]`
            : `[ص ${toArabicDigits(pageNum)}]`,
          footnotes: footnotesText ? [{ id: 1, text: footnotesText }] : undefined,
        });
      }
    }

    const chunk: BookChapterChunk = {
      bookId,
      chapterIndex: displayChapterIndex,
      title: `المقطع ${toArabicDigits(displayChapterIndex)} (ص ${toArabicDigits(startPage)} - ${toArabicDigits(endPage)})`,
      startPage,
      endPage,
      paragraphs,
      wordCount: paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0),
    };

    setCachedChunk(cacheKey, chunk);
    return chunk;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    console.warn(`[book-text-engine] Failed to fetch chunk ${chunkIndex} for ${bookId}:`, err);
    return null;
  }
}

/**
 * Load a single chapter chunk on-demand with offline cache verification
 */
export async function loadChapterChunk(
  bookId: string,
  chapterIndex: number,
  signal?: AbortSignal
): Promise<BookChapterChunk | null> {
  const cacheKey = `${bookId}:${chapterIndex}`;
  const cached = getCachedChunk(cacheKey);
  if (cached) {
    return cached;
  }

  if (bookId.startsWith('shamela-') || /^\d+$/.test(bookId)) {
    const zeroBasedChunk = Math.max(0, chapterIndex - 1);
    return fetchShamelaChapterSlice(bookId, zeroBasedChunk, signal);
  }

  if (bookId.startsWith('openiti-') || bookId.includes('openiti')) {
    if (!metaCache.has(bookId)) {
      await loadOpenItiDynamicEBook(bookId);
    }
    return getCachedChunk(cacheKey) || null;
  }

  try {
    const offlineBlob = await getBlob(`ebook:${bookId}:chunk:${chapterIndex}`);
    if (offlineBlob) {
      const text = await offlineBlob.text();
      const parsed = JSON.parse(text) as BookChapterChunk;
      setCachedChunk(cacheKey, parsed);
      return parsed;
    }
  } catch {
    /* fallback to network */
  }

  try {
    const res = await fetch(`/data/ebooks/${bookId}/chunks/chunk_${chapterIndex}.json`, { signal });
    if (res.ok) {
      const data = (await res.json()) as BookChapterChunk;
      setCachedChunk(cacheKey, data);
      return data;
    }
  } catch (err) {
    console.warn(
      `[book-text-engine] Failed to load chunk ${chapterIndex} for ${bookId}:`,
      err
    );
  }

  return null;
}

/**
 * Background preloading of adjacent chapters (Disabled by default)
 */
export const ENABLE_PREFETCH = false;

export function preloadAdjacentChapters(
  bookId: string,
  currentChapterIndex: number,
  totalChapters: number,
  options?: { isNearBottom?: boolean; force?: boolean }
): void {
  if (!ENABLE_PREFETCH && !options?.force) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (document.visibilityState === 'hidden') return;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;

  if (!options?.isNearBottom && !options?.force) return;

  const nextIdx = currentChapterIndex + 1;
  if (nextIdx <= totalChapters && !getCachedChunk(`${bookId}:${nextIdx}`)) {
    loadChapterChunk(bookId, nextIdx).catch(() => {});
  }
}
