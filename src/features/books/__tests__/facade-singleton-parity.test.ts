import { describe, it, expect, beforeEach } from 'vitest';

// 1. Chapters & Chunk Cache (Canonical Feature Layer)
import {
  chunkCache,
  metaCache,
  loadChapterChunk as directLoadChapterChunk,
  loadEBookMeta as directLoadEBookMeta,
  clearChunkCache,
  setCachedChunk,
  getCachedChunk,
} from '../infrastructure/text/chapters';

// 2. Catalog Cache (Canonical Feature Layer)
import {
  shamelaCatalogCache,
} from '../infrastructure/text/catalog';

// 3. Store Loader (Canonical Feature Layer)
import {
  loadSearchIndexOnDemand,
} from '../infrastructure/store-loader';

// 4. Feature Root Facade
import {
  loadChapterChunk,
  loadEBookMeta,
  useBooksStore,
  useEBookReader,
  BOOK_CATEGORIES,
  BOOK_LANGUAGES,
} from '../index';

import { useEBookReader as directUseEBookReader } from '../ui/ebook/use-ebook-reader';

describe('Books Domain Canonical Architecture — Cache Singletons & Lifecycle Verification', () => {
  beforeEach(() => {
    clearChunkCache();
    metaCache.clear();
    shamelaCatalogCache.clear();
  });

  describe('Memory Cache Referencing & Isolation', () => {
    it('initializes single-instance chunkCache and metaCache Maps', () => {
      expect(chunkCache instanceof Map).toBe(true);
      expect(metaCache instanceof Map).toBe(true);
      expect(shamelaCatalogCache instanceof Map).toBe(true);
      expect(chunkCache.size).toBe(0);
      expect(metaCache.size).toBe(0);
    });

    it('mutates and retrieves chunks cleanly through cache operations', () => {
      const dummyChunk = {
        bookId: 'test-parity-1',
        chapterIndex: 1,
        title: 'الفصل الأول للتجربة',
        startPage: 1,
        endPage: 20,
        paragraphs: [{ id: 'p1', text: 'نص تجريبي للتحقق من تطابق الذاكرة', pageNumber: 1 }],
        wordCount: 7,
      };

      setCachedChunk('test-parity-1:1', dummyChunk);

      expect(chunkCache.has('test-parity-1:1')).toBe(true);
      expect(getCachedChunk('test-parity-1:1')).toEqual(dummyChunk);

      clearChunkCache();
      expect(chunkCache.has('test-parity-1:1')).toBe(false);
      expect(getCachedChunk('test-parity-1:1')).toBeNull();
    });
  });

  describe('Canonical Re-export Parity in @/features/books', () => {
    it('re-exports the exact same chapter loader functions from root facade', () => {
      expect(loadChapterChunk).toBe(directLoadChapterChunk);
      expect(loadEBookMeta).toBe(directLoadEBookMeta);
    });

    it('re-exports the exact same useEBookReader hook from root facade', () => {
      expect(useEBookReader).toBe(directUseEBookReader);
    });

    it('exposes valid store loader, Zustand store and catalog constants', () => {
      expect(typeof loadSearchIndexOnDemand).toBe('function');
      expect(typeof useBooksStore).toBe('function');
      const state = useBooksStore.getState();
      expect(state).toBeDefined();
      expect(Array.isArray(state.books)).toBe(true);
      expect(Array.isArray(BOOK_CATEGORIES)).toBe(true);
      expect(BOOK_CATEGORIES.length).toBeGreaterThan(0);
      expect(Array.isArray(BOOK_LANGUAGES)).toBe(true);
      expect(BOOK_LANGUAGES.length).toBeGreaterThan(0);
    });
  });
});
