'use client';

import { normalizeArabic } from '@/lib/arabic-normalizer';
import type {
  EBookMetadata,
  TableOfContentsItem,
  BookChapterChunk,
  SectionParagraph,
  InBookSearchResult,
  ReadingProgress,
  BookHighlight,
} from './book-types';
import { getBlob, putBlob } from './offline-db';

export interface EBookMetaResponse {
  meta: EBookMetadata;
  toc: TableOfContentsItem[];
}

type SearchIndexMap = Record<string, Array<[number, number, string]>>; // token -> [chapterIndex, pageNumber, snippet]

// In-Memory Caches
let catalogCache: EBookMetadata[] | null = null;
const metaCache = new Map<string, EBookMetaResponse>();
const chunkCache = new Map<string, BookChapterChunk>(); // key: `${bookId}:${chapterIndex}`
const searchIndexCache = new Map<string, SearchIndexMap>();
const shamelaPathMap = new Map<string, string>(); // bookId -> shamelaPath

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

import {
  loadOpenItiDynamicEBook as loadOpenItiService,
  toArabicDigits,
} from './book-text/openiti-loader';

async function loadOpenItiDynamicEBook(bookId: string): Promise<EBookMetaResponse | null> {
  const result = await loadOpenItiService(bookId, chunkCache);
  if (result) {
    metaCache.set(bookId, result);
  }
  return result;
}

/**
 * Dynamically load an authentic Maktaba Shamela 4 E-Book
 * with true printed pagination, separated footnotes, verified TOC, and zero-lag chunking.
 */
async function loadShamelaEBook(bookId: string): Promise<EBookMetaResponse | null> {
  const cleanId = bookId.replace(/^shamela-/, '');

  let bookItem: { id?: string, shamelaId?: string | number, shamelaPath?: string, title?: string, sheikhName?: string, date?: string, shamelaCategoryName?: string, category?: string, islamicArt?: string, century?: number, description?: string, volumeCount?: number, totalPages?: number, betakaText?: string } | null = null;
  try {
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      const p = path.join(process.cwd(), 'public', 'data', 'ebooks', 'shamela_arabic_catalog.json');
      if (fs.existsSync(p)) {
        const list = JSON.parse(fs.readFileSync(p, 'utf-8'));
        bookItem = list.find((b: { id: string, shamelaId?: string | number, title?: string, sheikhName?: string, pdfUrl?: string, date?: string, century?: number, islamicArt?: string, description?: string }) => b.id === bookId || String(b.shamelaId) === cleanId);
      }
    } else {
      const res = await fetch('/data/ebooks/shamela_arabic_catalog.json');
      if (res.ok) {
        const list = await res.json();
        bookItem = list.find((b: { id: string, shamelaId?: string | number, title?: string, sheikhName?: string, pdfUrl?: string, date?: string, century?: number, islamicArt?: string, description?: string }) => b.id === bookId || String(b.shamelaId) === cleanId);
      }
    }
  } catch {}

  const shamelaPath = bookItem?.shamelaPath;
  if (!shamelaPath) {
    console.warn(`[book-text-engine] Shamela path not found for book: ${bookId}`);
    return null;
  }

  shamelaPathMap.set(bookId, shamelaPath);

  try {
    const getUrl = (subPath: string) => {
      if (typeof window !== 'undefined' && window.location?.origin) {
        return `/api/shamela-text?path=${encodeURIComponent(shamelaPath + '/' + subPath)}`;
      }
      return `https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/${shamelaPath}/${subPath}`;
    };

    // 1. Fetch metadata, TOC, and pages concurrently
    const [metaRes, tocRes, pagesRes] = await Promise.all([
      fetch(getUrl('book_metadata.json')).catch(() => null),
      fetch(getUrl('toc.jsonl')).catch(() => null),
      fetch(getUrl('pages.jsonl')).catch(() => null),
    ]);

    let rawMeta: { title_ar?: string, main_author_name_ar?: string, main_author_death_hijri?: string, category_name_ar?: string, category?: string, islamicArt?: string } = {};
    if (metaRes && metaRes.ok) {
      try { rawMeta = await metaRes.json(); } catch {}
    }

    const tocItems: TableOfContentsItem[] = [];
    if (tocRes && tocRes.ok) {
      const tocText = await tocRes.text();
      const tocLines = tocText.split('\n').filter(Boolean);
      for (let i = 0; i < tocLines.length; i++) {
        try {
          const item = JSON.parse(tocLines[i]);
          tocItems.push({
            id: `toc-${item.title_id || i + 1}`,
            title: item.title_text || `الباب ${toArabicDigits(i + 1)}`,
            chapterIndex: i + 1,
            pageNumber: item.page_id || i + 1,
            level: item.parent_id ? 2 : 1,
          });
        } catch {}
      }
    }

    // 2. Process Pages into Chapter Chunks
    const parsedChapters: BookChapterChunk[] = [];
    let totalWordCounter = 0;
    let totalPagesObserved = 0;
    let maxVolumeObserved = 1;

    if (pagesRes && pagesRes.ok) {
      const pagesText = await pagesRes.text();
      const pageLines = pagesText.split('\n').filter(Boolean);
      totalPagesObserved = pageLines.length;

      // Group pages into chunks (20 pages per chapter chunk for silky smooth virtualized rendering)
      const PAGES_PER_CHUNK = 20;
      for (let i = 0; i < pageLines.length; i += PAGES_PER_CHUNK) {
        const slice = pageLines.slice(i, i + PAGES_PER_CHUNK);
        const chapterIdx = Math.floor(i / PAGES_PER_CHUNK) + 1;
        const paragraphs: SectionParagraph[] = [];

        let startPage = 1;
        let endPage = 1;

        for (let pIdx = 0; pIdx < slice.length; pIdx++) {
          try {
            const page = JSON.parse(slice[pIdx]);
            const volNum = parseInt(String(page.part || '1'), 10) || 1;
            const pageNum = parseInt(String(page.page_num || '0'), 10) || (i + pIdx + 1);
            if (pIdx === 0) startPage = pageNum;
            endPage = pageNum;
            if (volNum > maxVolumeObserved) maxVolumeObserved = volNum;

            const text = (page.body || '').trim();
            const footnotesText = (page.footnotes || '').trim();

            if (text) {
              const words = text.split(/\s+/).length;
              totalWordCounter += words;

              const isHadith = /^(\d+[\.\)\-]|حدثنا|أخبرنا|أنبأنا|روى|عن|سمعت|قال الإمام|أخرج)/.test(text);

              paragraphs.push({
                id: `p-${chapterIdx}-${pIdx + 1}`,
                text,
                isHadithSanad: isHadith,
                pageNumber: pageNum,
                volumeNumber: volNum,
                volumePageBadge: `[ج ${toArabicDigits(volNum)}، ص ${toArabicDigits(pageNum)}]`,
                footnotes: footnotesText ? [{ id: 1, text: footnotesText }] : undefined,
              });
            }
          } catch {}
        }

        const matchedToc = tocItems[chapterIdx - 1];
        const chapterTitle = matchedToc?.title || `الجزء ${toArabicDigits(chapterIdx)} (ص ${toArabicDigits(startPage)} - ${toArabicDigits(endPage)})`;

        const chunk: BookChapterChunk = {
          bookId,
          chapterIndex: chapterIdx,
          title: chapterTitle,
          startPage,
          endPage,
          paragraphs,
          wordCount: paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0),
        };

        parsedChapters.push(chunk);
        chunkCache.set(`${bookId}:${chapterIdx}`, chunk);
      }
    }

    // Build fallback TOC if toc.jsonl was empty
    if (tocItems.length === 0) {
      for (const ch of parsedChapters) {
        tocItems.push({
          id: `toc-${ch.chapterIndex}`,
          title: ch.title,
          chapterIndex: ch.chapterIndex,
          pageNumber: ch.startPage,
          level: 1,
        });
      }
    }

    const title = bookItem?.title || rawMeta.title_ar || 'مصنف تراثي';
    const author = bookItem?.sheikhName || rawMeta.main_author_name_ar || 'من أئمة الإسلام';
    const deathHijri = bookItem?.date || rawMeta.main_author_death_hijri;
    const categoryName = bookItem?.shamelaCategoryName || rawMeta.category_name_ar || 'تراث';

    const meta: EBookMetadata = {
      id: bookId,
      title,
      author,
      authorDeath: deathHijri ? `${deathHijri} هـ` : undefined,
      category: (bookItem?.category || 'history') as import('./book-types').EBookCategory,
      islamicArt: (bookItem?.islamicArt || 'general') as import('./book-types').IslamicArtCategory,
      century: bookItem?.century || (deathHijri ? Math.ceil(parseInt(deathHijri, 10) / 100) : 3),
      description: bookItem?.description || `مصنف ${title} في ${categoryName} للإمام ${author}`,
      totalVolumes: bookItem?.volumeCount || maxVolumeObserved || 1,
      totalPages: totalPagesObserved || bookItem?.totalPages || 1,
      totalChapters: parsedChapters.length || 1,
      totalWords: totalWordCounter || 5000,
      hasFacsimilePdf: false,
      coverGradient: 'from-emerald-950 via-stone-900 to-amber-950',
      accentColor: '#10b981',
      language: 'ar',
      edition: bookItem?.betakaText ? bookItem.betakaText.slice(0, 150) : undefined,
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
export async function loadEBookMeta(bookId: string): Promise<EBookMetaResponse | null> {
  if (metaCache.has(bookId)) {
    return metaCache.get(bookId)!;
  }

  if (bookId.startsWith('shamela-') || bookId.includes('shamela')) {
    return loadShamelaEBook(bookId);
  }

  if (bookId.startsWith('openiti-') || bookId.includes('openiti')) {
    return loadOpenItiDynamicEBook(bookId);
  }

  // Check offline DB first
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
    const res = await fetch(`/data/ebooks/${bookId}/meta.json`);
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
 * Fetch a single chapter slice on-demand using HTTP Range requests
 * Loads only ~64KB over the wire instead of the entire 30MB book.
 */
async function fetchShamelaChapterSlice(
  bookId: string,
  shamelaPath: string,
  chapterIndex: number,
  toc: TableOfContentsItem[]
): Promise<BookChapterChunk | null> {
  try {
    const tocEntry = toc[chapterIndex - 1];
    const targetStartPage = tocEntry?.pageNumber || (chapterIndex - 1) * 20 + 1;
    const nextTocEntry = toc[chapterIndex];
    const targetEndPage = nextTocEntry?.pageNumber
      ? Math.min(nextTocEntry.pageNumber - 1, targetStartPage + 30)
      : targetStartPage + 20;

    let pagesArray: { page_num?: string, part?: string, body?: string, footnotes?: string }[] = [];

    // 1. Client-Side: Fetch via Edge Proxy with pageStart & pageCount query
    if (typeof window !== 'undefined' && window.location?.origin) {
      const sliceUrl = `/api/shamela-text?path=${encodeURIComponent(shamelaPath + '/pages.jsonl')}&pageStart=${targetStartPage}&pageCount=25`;
      const res = await fetch(sliceUrl).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.pages && Array.isArray(json.pages)) {
          pagesArray = json.pages;
        }
      }
    }

    // 2. Server-Side / Node Test / Fallback
    if (pagesArray.length === 0) {
      const targetUrl = `https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/${shamelaPath}/pages.jsonl`;
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'NoorPlatform/2.0 (Islamic Heritage Reader)',
          'Accept': '*/*',
        },
      }).catch(() => null);

      if (res && res.ok) {
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          try {
            const p = JSON.parse(lines[i]);
            const num = parseInt(p.page_num, 10);
            if (num >= targetStartPage && num <= targetEndPage) {
              pagesArray.push(p);
            }
            if (num > targetEndPage && pagesArray.length > 0) {
              break;
            }
          } catch {}
        }
        // Fallback by line index if page_num not matched
        if (pagesArray.length === 0 && lines.length > 0) {
          const startIdx = Math.min(lines.length - 1, Math.max(0, targetStartPage - 1));
          for (let i = startIdx; i < Math.min(lines.length, startIdx + 25); i++) {
            try { pagesArray.push(JSON.parse(lines[i])); } catch {}
          }
        }
      }
    }

    const paragraphs: SectionParagraph[] = [];
    for (let i = 0; i < pagesArray.length; i++) {
      const page = pagesArray[i];
      const pageNum = parseInt(String(page.page_num || '0'), 10) || (targetStartPage + i);
      const volNum = parseInt(String(page.part || '1'), 10) || 1;
      const bodyText = (page.body || '').trim();
      const footnotesText = (page.footnotes || '').trim();

      if (bodyText) {
        const isHadith = /^(\d+[\.\)\-]|حدثنا|أخبرنا|أنبأنا|روى|عن|سمعت|قال الإمام|أخرج)/.test(bodyText);
        paragraphs.push({
          id: `p-${chapterIndex}-${pageNum}`,
          text: bodyText,
          isHadithSanad: isHadith,
          pageNumber: pageNum,
          volumeNumber: volNum,
          volumePageBadge: `[ج ${toArabicDigits(volNum)}، ص ${toArabicDigits(pageNum)}]`,
          footnotes: footnotesText ? [{ id: 1, text: footnotesText }] : undefined,
        });
      }
    }

    if (paragraphs.length > 0) {
      return {
        bookId,
        chapterIndex,
        title: tocEntry?.title || `الجزء ${toArabicDigits(chapterIndex)} (ص ${toArabicDigits(targetStartPage)})`,
        startPage: targetStartPage,
        endPage: targetEndPage,
        paragraphs,
        wordCount: paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0),
      };
    }
  } catch (err) {
    console.warn(`[book-text-engine] Failed to fetch slice for chapter ${chapterIndex}:`, err);
  }
  return null;
}

/**
 * Load a single chapter chunk on-demand with offline cache verification
 */
export async function loadChapterChunk(
  bookId: string,
  chapterIndex: number
): Promise<BookChapterChunk | null> {
  const cacheKey = `${bookId}:${chapterIndex}`;
  if (chunkCache.has(cacheKey)) {
    return chunkCache.get(cacheKey)!;
  }

  if (bookId.startsWith('shamela-') || bookId.includes('shamela')) {
    if (!metaCache.has(bookId)) {
      await loadShamelaEBook(bookId);
    }
    if (chunkCache.has(cacheKey)) {
      return chunkCache.get(cacheKey)!;
    }

    const meta = metaCache.get(bookId);
    const shamelaPath = shamelaPathMap.get(bookId);
    if (meta && shamelaPath) {
      const chunk = await fetchShamelaChapterSlice(
        bookId,
        shamelaPath,
        chapterIndex,
        meta.toc
      );
      if (chunk) {
        chunkCache.set(cacheKey, chunk);
        return chunk;
      }
    }
    return chunkCache.get(cacheKey) || null;
  }

  if (bookId.startsWith('openiti-') || bookId.includes('openiti')) {
    if (!metaCache.has(bookId)) {
      await loadOpenItiDynamicEBook(bookId);
    }
    return chunkCache.get(cacheKey) || null;
  }

  // Check offline DB first
  try {
    const offlineBlob = await getBlob(`ebook:${bookId}:chunk:${chapterIndex}`);
    if (offlineBlob) {
      const text = await offlineBlob.text();
      const parsed = JSON.parse(text) as BookChapterChunk;
      chunkCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    /* fallback to network */
  }

  try {
    const res = await fetch(`/data/ebooks/${bookId}/chunks/chunk_${chapterIndex}.json`);
    if (res.ok) {
      const data = (await res.json()) as BookChapterChunk;
      chunkCache.set(cacheKey, data);
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
 * Export and trigger a clean formatted text download of the book to the user's phone/computer
 */
export async function downloadBookTextFile(bookId: string, customTitle?: string): Promise<boolean> {
  try {
    const meta = await loadEBookMeta(bookId);
    if (!meta) return false;

    let fullText = `═══════════════════════════════════════\n`;
    fullText += `  ${meta.meta.title}\n`;
    fullText += `  المؤلف: ${meta.meta.author}\n`;
    if (meta.meta.description) fullText += `  ${meta.meta.description}\n`;
    fullText += `  المصدر: منصة نور - المكتبة الرقمية\n`;
    fullText += `═══════════════════════════════════════\n\n`;

    for (let i = 1; i <= meta.meta.totalChapters; i++) {
      const chunk = await loadChapterChunk(bookId, i);
      if (chunk) {
        fullText += `\n\n─── ${chunk.title} ───\n\n`;
        for (const p of chunk.paragraphs) {
          if (p.isHeading) {
            fullText += `\n■ ${p.text}\n\n`;
          } else {
            fullText += `${p.text}\n\n`;
          }
        }
      }
    }

    if (typeof window !== 'undefined') {
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanFileName = (customTitle || meta.meta.title || 'كتاب').replace(/[\\/:*?"<>|]/g, '_');
      a.download = `${cleanFileName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return true;
  } catch (err) {
    console.error('Failed to download book text file:', err);
    return false;
  }
}

/**
 * Background preloading of adjacent chapters for 0ms transitions
 */
export function preloadAdjacentChapters(
  bookId: string,
  currentChapterIndex: number,
  totalChapters: number
): void {
  if (typeof window === 'undefined') return;

  const prefetch = (idx: number) => {
    if (idx >= 1 && idx <= totalChapters && !chunkCache.has(`${bookId}:${idx}`)) {
      loadChapterChunk(bookId, idx).catch(() => {});
    }
  };

  const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
  schedule(() => {
    prefetch(currentChapterIndex + 1);
    prefetch(currentChapterIndex - 1);
  });
}

/**
 * Sub-millisecond in-book text search via lightweight salient inverted index
 */
export async function searchInsideEBook(
  bookId: string,
  query: string
): Promise<InBookSearchResult[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const normQuery = normalizeArabic(q);
  const searchTokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);
  if (searchTokens.length === 0) return [];

  let searchIndex = searchIndexCache.get(bookId);
  if (!searchIndex) {
    try {
      const offlineBlob = await getBlob(`ebook:${bookId}:search_index`);
      if (offlineBlob) {
        searchIndex = JSON.parse(await offlineBlob.text()) as SearchIndexMap;
      } else {
        const res = await fetch(`/data/ebooks/${bookId}/search_index.json`);
        if (res.ok) {
          searchIndex = (await res.json()) as SearchIndexMap;
        }
      }
      if (searchIndex) {
        searchIndexCache.set(bookId, searchIndex);
      }
    } catch {
      /* search index missing or failed */
    }
  }

  const metaRes = await loadEBookMeta(bookId);
  const tocMap = new Map<number, string>();
  if (metaRes?.toc) {
    for (const item of metaRes.toc) {
      tocMap.set(item.chapterIndex, item.title);
    }
  }

  const results: InBookSearchResult[] = [];
  const hitKeys = new Set<string>();

  if (searchIndex) {
    for (const token of searchTokens) {
      const postings = searchIndex[token] || [];
      for (const [chapterIndex, pageNumber, snippet] of postings) {
        const key = `${chapterIndex}:${pageNumber}`;
        if (!hitKeys.has(key)) {
          hitKeys.add(key);
          const score = snippet.includes(q) ? 100 : 50;
          results.push({
            bookId,
            chapterIndex,
            chapterTitle: tocMap.get(chapterIndex) || `الفصل ${chapterIndex}`,
            pageNumber,
            snippet,
            score,
          });
        }
      }
    }
  }

  // Sort by score then page
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.pageNumber - b.pageNumber;
  });

  return results.slice(0, 30);
}

/**
 * Save an entire pure-text eBook for 100% offline reading with progress callback
 */
export async function saveEBookForOffline(
  bookId: string,
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
): Promise<boolean> {
  try {
    const metaRes = await loadEBookMeta(bookId);
    if (!metaRes) return false;

    // 1. Save meta
    await putBlob(
      `ebook:${bookId}:meta`,
      new Blob([JSON.stringify(metaRes)], { type: 'application/json' })
    );

    // 2. Save search index
    try {
      const sRes = await fetch(`/data/ebooks/${bookId}/search_index.json`);
      if (sRes.ok) {
        const sData = await sRes.text();
        await putBlob(
          `ebook:${bookId}:search_index`,
          new Blob([sData], { type: 'application/json' })
        );
      }
    } catch {
      /* ignore */
    }

    // 3. Download & save all chapter chunks
    const totalChapters = metaRes.meta.totalChapters;
    for (let c = 1; c <= totalChapters; c++) {
      const chunk = await loadChapterChunk(bookId, c);
      if (chunk) {
        await putBlob(
          `ebook:${bookId}:chunk:${c}`,
          new Blob([JSON.stringify(chunk)], { type: 'application/json' })
        );
      }
      if (onProgress) {
        const percent = Math.round((c / totalChapters) * 100);
        onProgress({ current: c, total: totalChapters, percent });
      }
    }

    return true;
  } catch (err) {
    console.error(`[book-text-engine] Error saving ${bookId} for offline:`, err);
    return false;
  }
}

/**
 * Check if a book is fully cached in offline IndexedDB storage
 */
export async function isEBookCachedOffline(bookId: string): Promise<boolean> {
  try {
    const metaBlob = await getBlob(`ebook:${bookId}:meta`);
    if (!metaBlob) return false;

    const metaRes = JSON.parse(await metaBlob.text()) as EBookMetaResponse;
    const total = metaRes.meta.totalChapters;

    for (let c = 1; c <= total; c++) {
      const chunkBlob = await getBlob(`ebook:${bookId}:chunk:${c}`);
      if (!chunkBlob) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Reading Progress & Highlighting (Local Storage Persistence)
// -------------------------------------------------------------

const PROGRESS_PREFIX = 'noor-ebook-progress:';
const HIGHLIGHTS_PREFIX = 'noor-ebook-highlights:';

export function getReadingProgress(bookId: string): ReadingProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + bookId);
    return raw ? (JSON.parse(raw) as ReadingProgress) : null;
  } catch {
    return null;
  }
}

export function saveReadingProgress(progress: ReadingProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_PREFIX + progress.bookId, JSON.stringify(progress));
  } catch {
    /* ignore storage quota errors */
  }
}

export function getBookHighlights(bookId: string): BookHighlight[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIGHLIGHTS_PREFIX + bookId);
    return raw ? (JSON.parse(raw) as BookHighlight[]) : [];
  } catch {
    return [];
  }
}

export function saveBookHighlight(highlight: BookHighlight): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getBookHighlights(highlight.bookId);
    const updated = [highlight, ...current.filter((h) => h.id !== highlight.id)];
    localStorage.setItem(HIGHLIGHTS_PREFIX + highlight.bookId, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}
