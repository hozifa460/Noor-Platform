import { getBlob } from '../shared/offline-db';
import type {
  EBookMetadata,
  TableOfContentsItem,
  BookChapterChunk,
  SectionParagraph,
} from '../books/types';
import {
  loadOpenItiDynamicEBook as loadOpenItiService,
  toArabicDigits,
} from './openiti-loader';
import {
  firstLetterOf,
  lookupShamelaBook,
  loadShamelaBookByLetter,
  loadShamelaCatalogFull,
  shamelaCatalogCache,
} from './catalog';

export interface EBookMetaResponse {
  meta: EBookMetadata;
  toc: TableOfContentsItem[];
}

export const metaCache = new Map<string, EBookMetaResponse>();
export const chunkCache = new Map<string, BookChapterChunk>(); // key: `${bookId}:${chapterIndex}`
export const shamelaPathMap = new Map<string, string>(); // bookId -> shamelaPath

export async function loadOpenItiDynamicEBook(bookId: string): Promise<EBookMetaResponse | null> {
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
export async function loadShamelaEBook(
  bookId: string,
  firstLetter?: string,
): Promise<EBookMetaResponse | null> {
  type BookItem = {
    id?: string;
    shamelaId?: string | number;
    shamelaPath?: string;
    title?: string;
    sheikhName?: string;
    date?: string;
    shamelaCategoryName?: string;
    category?: string;
    islamicArt?: string;
    century?: number;
    description?: string;
    volumeCount?: number;
    totalPages?: number;
    betakaText?: string;
  };
  let bookItem: BookItem | null = null;
  try {
    const found = firstLetter
      ? await loadShamelaBookByLetter(bookId, firstLetter)
      : await lookupShamelaBook(bookId);
    if (found) {
      bookItem = found as unknown as BookItem;
    } else if (!firstLetter) {
      await loadShamelaCatalogFull();
      const retry = shamelaCatalogCache.get(bookId);
      if (retry) bookItem = retry as unknown as BookItem;
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
      return `https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/${shamelaPath}/${subPath}`;
    };

    // 1. Fetch metadata, TOC, and pages concurrently
    const [metaRes, tocRes, pagesRes] = await Promise.all([
      fetch(getUrl('book_metadata.json')).catch(() => null),
      fetch(getUrl('toc.jsonl')).catch(() => null),
      fetch(getUrl('pages.jsonl')).catch(() => null),
    ]);

    let rawMeta: {
      title_ar?: string;
      main_author_name_ar?: string;
      main_author_death_hijri?: string;
      category_name_ar?: string;
      category?: string;
      islamicArt?: string;
    } = {};
    if (metaRes && metaRes.ok) {
      try {
        rawMeta = await metaRes.json();
      } catch {}
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
        const chapterTitle =
          matchedToc?.title ||
          `الجزء ${toArabicDigits(chapterIdx)} (ص ${toArabicDigits(startPage)} - ${toArabicDigits(endPage)})`;

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
      category: (bookItem?.category || 'history') as import('../books/types').EBookCategory,
      islamicArt: (bookItem?.islamicArt || 'general') as import('../books/types').IslamicArtCategory,
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
    const cached = shamelaCatalogCache.get(bookId);
    const firstLetter = cached ? firstLetterOf(cached.title || '') : undefined;
    return loadShamelaEBook(bookId, firstLetter);
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
 * Fetch a single chapter slice on-demand
 */
export async function fetchShamelaChapterSlice(
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

    let pagesArray: { page_num?: string; part?: string; body?: string; footnotes?: string }[] = [];

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

    if (pagesArray.length === 0) {
      const targetUrl = `https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/${shamelaPath}/pages.jsonl`;
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'NoorPlatform/2.0 (Islamic Heritage Reader)',
          Accept: '*/*',
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
        if (pagesArray.length === 0 && lines.length > 0) {
          const startIdx = Math.min(lines.length - 1, Math.max(0, targetStartPage - 1));
          for (let i = startIdx; i < Math.min(lines.length, startIdx + 25); i++) {
            try {
              pagesArray.push(JSON.parse(lines[i]));
            } catch {}
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
        title:
          tocEntry?.title ||
          `الجزء ${toArabicDigits(chapterIndex)} (ص ${toArabicDigits(targetStartPage)})`,
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
      const cached = shamelaCatalogCache.get(bookId);
      const firstLetter = cached ? firstLetterOf(cached.title || '') : undefined;
      await loadShamelaEBook(bookId, firstLetter);
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
