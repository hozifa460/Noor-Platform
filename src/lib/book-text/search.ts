import { normalizeArabic } from '@/lib/arabic-normalizer';
import { getBlob } from '../offline-db';
import type { InBookSearchResult } from '../book-types';
import { loadEBookMeta } from './chapters';

type SearchIndexMap = Record<string, Array<[number, number, string]>>; // token -> [chapterIndex, pageNumber, snippet]
const searchIndexCache = new Map<string, SearchIndexMap>();

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

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.pageNumber - b.pageNumber;
  });

  return results.slice(0, 30);
}
