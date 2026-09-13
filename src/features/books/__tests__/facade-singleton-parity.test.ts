import { describe, it, expect, beforeEach } from 'vitest';

// 1. Chapters & Chunk Cache (Infrastructure vs Legacy Facade)
import {
  chunkCache as featureChunkCache,
  metaCache as featureMetaCache,
  loadChapterChunk as featureLoadChapterChunk,
  loadEBookMeta as featureLoadEBookMeta,
  clearChunkCache,
  setCachedChunk,
  getCachedChunk,
} from '../infrastructure/text/chapters';

import {
  chunkCache as legacyChunkCache,
  metaCache as legacyMetaCache,
  loadChapterChunk as legacyLoadChapterChunk,
  loadEBookMeta as legacyLoadEBookMeta,
} from '@/lib/book-text/chapters';

// 2. Catalog Cache (Infrastructure vs Legacy Facade)
import { shamelaCatalogCache as featureShamelaCache } from '../infrastructure/text/catalog';
import { shamelaCatalogCache as legacyShamelaCache } from '@/lib/book-text/catalog';

// 3. Store Loader (Infrastructure vs Legacy Facade)
import {
  loadSearchIndexOnDemand as featureLoadIndex,
} from '../infrastructure/store-loader';
import {
  loadSearchIndexOnDemand as legacyLoadIndex,
} from '@/lib/books/store-loader';

// 4. Zustand Store (Feature vs Legacy Facade)
import { useBooksStore as featureBooksStore } from '../index';
import { useBooksStore as legacyBooksStore } from '@/stores/books-store';

// 5. useEBookReader Hook (Feature vs Legacy Facades)
import { useEBookReader as featureUseEBookReader } from '../index';
import { useEBookReader as hooksUseEBookReader } from '@/hooks/use-ebook-reader';
import { useEBookReader as componentsUseEBookReader } from '@/components/books/ebook/use-ebook-reader';

describe('Books Facade & Singleton Parity Verification', () => {
  beforeEach(() => {
    clearChunkCache();
    featureMetaCache.clear();
  });

  describe('Memory Cache Referencing (No Split State)', () => {
    it('shares the EXACT same chunkCache Map instance between feature and lib facade', () => {
      expect(legacyChunkCache).toBe(featureChunkCache);
    });

    it('shares the EXACT same metaCache Map instance between feature and lib facade', () => {
      expect(legacyMetaCache).toBe(featureMetaCache);
    });

    it('shares the EXACT same shamelaCatalogCache Map instance between feature and lib facade', () => {
      expect(legacyShamelaCache).toBe(featureShamelaCache);
    });

    it('propagates mutations bidirectionally through memory cache', () => {
      const dummyChunk = {
        bookId: 'test-parity-1',
        chapterIndex: 1,
        title: 'الفصل الأول للتجربة',
        startPage: 1,
        endPage: 20,
        paragraphs: [{ id: 'p1', text: 'نص تجريبي للتحقق من تطابق الذاكرة', pageNumber: 1 }],
        wordCount: 7,
      };

      // Set via feature
      setCachedChunk('test-parity-1:1', dummyChunk);

      // Verify immediate presence in legacy facade
      expect(legacyChunkCache.has('test-parity-1:1')).toBe(true);
      expect(getCachedChunk('test-parity-1:1')).toEqual(dummyChunk);

      // Mutate via legacy facade
      legacyChunkCache.delete('test-parity-1:1');

      // Verify immediate reflection in feature
      expect(featureChunkCache.has('test-parity-1:1')).toBe(false);
      expect(getCachedChunk('test-parity-1:1')).toBeNull();
    });
  });

  describe('Function Identity & Re-export Parity', () => {
    it('re-exports the exact same chapter loader functions', () => {
      expect(legacyLoadChapterChunk).toBe(featureLoadChapterChunk);
      expect(legacyLoadEBookMeta).toBe(featureLoadEBookMeta);
    });

    it('re-exports the exact same store loader functions', () => {
      expect(legacyLoadIndex).toBe(featureLoadIndex);
    });

    it('re-exports the exact same Zustand store instance between @/stores and @/features/books', () => {
      expect(legacyBooksStore).toBe(featureBooksStore);
    });

    it('re-exports the exact same useEBookReader hook between @/features/books, @/hooks, and @/components', () => {
      expect(hooksUseEBookReader).toBe(featureUseEBookReader);
      expect(componentsUseEBookReader).toBe(featureUseEBookReader);
    });
  });
});
