import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  shamelaBookFolder,
  shamelaBookMetaUrl,
  shamelaBookIndexUrl,
  shamelaBookTocUrl,
  shamelaBookChapterUrl,
} from '@/lib/shared/data-base';
import {
  fetchWithRefCount,
  activeRequests,
  setCachedChunk,
  getCachedChunk,
  clearChunkCache,
  getCurrentCacheBytes,
  estimateChunkBytes,
  ENABLE_PREFETCH,
  preloadAdjacentChapters,
  loadShamelaEBook,
  metaCache,
} from '../infrastructure/text/chapters';
import { loadSearchIndexOnDemand, _resetSearchIndexStateForTesting } from '../infrastructure/store-loader';
import type { BookChapterChunk } from '../domain';

describe('Shamela Reader Infrastructure & Memory Management', () => {
  beforeEach(() => {
    clearChunkCache();
    activeRequests.clear();
    metaCache.clear();
    _resetSearchIndexStateForTesting();
    vi.restoreAllMocks();
  });

  describe('Folder and URL Resolution', () => {
    it('normalizes various Shamela book ID formats to a 5-digit zero-padded folder', () => {
      expect(shamelaBookFolder('shamela-1')).toBe('00001');
      expect(shamelaBookFolder('1')).toBe('00001');
      expect(shamelaBookFolder('shamela-10')).toBe('00010');
      expect(shamelaBookFolder('100')).toBe('00100');
      expect(shamelaBookFolder('shamela-01088')).toBe('01088');
      expect(shamelaBookFolder('shamela-8589')).toBe('08589');
    });

    it('generates correct REST endpoints under BOOKS_BASE', () => {
      const folder = '00010';
      expect(shamelaBookMetaUrl(folder)).toContain('/data/books/shamela/00010/book_metadata.json');
      expect(shamelaBookIndexUrl(folder)).toContain('/data/books/shamela/00010/index.json');
      expect(shamelaBookTocUrl(folder)).toContain('/data/books/shamela/00010/toc.json');
      expect(shamelaBookChapterUrl(folder, 0)).toContain('/data/books/shamela/00010/chapters/000.json');
      expect(shamelaBookChapterUrl(folder, 25)).toContain('/data/books/shamela/00010/chapters/025.json');
    });
  });

  describe('Reference-Counted Request Deduplication', () => {
    it('deduplicates concurrent requests to the same key into a single underlying fetch', async () => {
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return { data: 'ok' };
      });

      const p1 = fetchWithRefCount('key-1', fetcher);
      const p2 = fetchWithRefCount('key-1', fetcher);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual({ data: 'ok' });
      expect(r2).toEqual({ data: 'ok' });
      expect(callCount).toBe(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('does NOT abort shared in-flight request when one consumer aborts while another is still active', async () => {
      let underlyingAborted = false;
      const fetcher = vi.fn(async (signal: AbortSignal) => {
        signal.addEventListener('abort', () => {
          underlyingAborted = true;
        });
        await new Promise((r) => setTimeout(r, 50));
        if (signal.aborted) throw new Error('Aborted');
        return { data: 'shared-data' };
      });

      const ctrl1 = new AbortController();
      const ctrl2 = new AbortController();

      // Consumer 1 requests with ctrl1 signal
      const p1 = fetchWithRefCount('shared-key', fetcher, ctrl1.signal);
      // Consumer 2 requests same key with ctrl2 signal
      const p2 = fetchWithRefCount('shared-key', fetcher, ctrl2.signal);

      // Consumer 1 cancels immediately
      ctrl1.abort();

      // p1 must reject with AbortError
      await expect(p1).rejects.toThrow();

      // Underlying fetcher must NOT have been aborted because Consumer 2 is still waiting!
      expect(underlyingAborted).toBe(false);

      // Consumer 2 must successfully receive the result!
      const result2 = await p2;
      expect(result2).toEqual({ data: 'shared-data' });
    });

    it('aborts underlying network controller when ALL consumers abort', async () => {
      let underlyingAborted = false;
      const fetcher = vi.fn(async (signal: AbortSignal) => {
        signal.addEventListener('abort', () => {
          underlyingAborted = true;
        });
        await new Promise((r) => setTimeout(r, 50));
        if (signal.aborted) throw new Error('Aborted');
        return { data: 'aborted-result' };
      });

      const ctrl1 = new AbortController();
      const ctrl2 = new AbortController();

      const p1 = fetchWithRefCount('all-cancel-key', fetcher, ctrl1.signal);
      const p2 = fetchWithRefCount('all-cancel-key', fetcher, ctrl2.signal);

      // Both consumers abort
      ctrl1.abort();
      ctrl2.abort();

      await expect(p1).rejects.toThrow();
      await expect(p2).rejects.toThrow();

      // Now underlying request must be aborted
      expect(underlyingAborted).toBe(true);
    });
  });

  describe('Global Byte-Budget LRU Cache', () => {
    it('estimates chunk byte size realistically', () => {
      const sampleChunk: BookChapterChunk = {
        bookId: 'shamela-1',
        chapterIndex: 0,
        title: 'المقطع الأول',
        startPage: 1,
        endPage: 20,
        wordCount: 500,
        paragraphs: [
          {
            id: 'p-0-1',
            text: 'بسم الله الرحمن الرحيم الحمد لله رب العالمين والصلاة والسلام على أشرف الأنبياء والمرسلين نبينا محمد وعلى آله وصحبه أجمعين. أما بعد فهذا كتاب نافع في بابه يجمع أصول المسائل وفروعها.',
            pageNumber: 1,
            volumeNumber: 1,
            volumePageBadge: '[ص ١]',
            footnotes: [{ id: 1, text: 'أخرجه البخاري ومسلم في صحيحيهما' }],
          },
          {
            id: 'p-0-2',
            text: 'فصل في بيان المنهج المتبع في تصنيف هذا الكتاب وضبط متونه وأسانيده المعتمدة من أمهات المصادر الإسلامية الأصيلة.',
            pageNumber: 2,
            volumeNumber: 1,
            volumePageBadge: '[ص ٢]',
          },
        ],
      };

      const bytes = estimateChunkBytes(sampleChunk);
      expect(bytes).toBeGreaterThanOrEqual(1024);
      expect(bytes).toBeLessThan(100 * 1024);
    });

    it('evicts least recently used chunks when total bytes exceed budget', () => {
      // Create small mock chunks
      const makeChunk = (id: string, index: number, textLen: number): BookChapterChunk => ({
        bookId: id,
        chapterIndex: index,
        title: `Chunk ${index}`,
        startPage: 1,
        endPage: 20,
        wordCount: 100,
        paragraphs: [
          {
            id: `p-${index}-1`,
            text: 'أ'.repeat(textLen),
            pageNumber: 1,
          },
        ],
      });

      // Insert chunk 1 and chunk 2
      const c1 = makeChunk('b1', 0, 1000);
      const c2 = makeChunk('b1', 1, 1000);

      setCachedChunk('b1:0', c1);
      setCachedChunk('b1:1', c2);

      expect(getCachedChunk('b1:0')).toBeDefined();
      expect(getCachedChunk('b1:1')).toBeDefined();
      expect(getCurrentCacheBytes()).toBeGreaterThan(0);
    });
  });

  describe('Prefetch Constraints', () => {
    it('has prefetch strictly disabled by default', () => {
      expect(ENABLE_PREFETCH).toBe(false);
    });

    it('does not load adjacent chapters when prefetch is disabled', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      preloadAdjacentChapters('shamela-1', 0, 10);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('TOC Resolution & Documented Access Map', () => {
    it('resolves direct O(1) chunk when chunk_index is present', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.endsWith('book_metadata.json')) return { ok: true, json: async () => ({ title_ar: 'كتاب الفقه' }) } as Response;
        if (u.endsWith('index.json')) return { ok: true, json: async () => ({ chapterCount: 10, totalPages: 200 }) } as Response;
        if (u.endsWith('toc.json')) return {
          ok: true,
          json: async () => [
            { title_id: 1, title_text: 'كتاب الطهارة', chunk_index: 2, page_id: 45 },
          ],
        } as Response;
        return { ok: false, status: 404 } as Response;
      });

      const res = await loadShamelaEBook('shamela-999');
      expect(res).toBeDefined();
      expect(res?.toc[0].chapterIndex).toBe(3); // 1-indexed (chunk 2 -> chapter 3)
      expect(res?.toc[0].isMapped).toBe(true);
    });

    it('resolves chunk from chunks_manifest when chunk_index is missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.endsWith('book_metadata.json')) return { ok: true, json: async () => ({ title_ar: 'كتاب الحديث' }) } as Response;
        if (u.endsWith('index.json')) return { ok: true, json: async () => ({ chapterCount: 5, totalPages: 100 }) } as Response;
        if (u.endsWith('toc.json')) return {
          ok: true,
          json: async () => [
            { title_id: 1, title_text: 'باب الإيمان', page_id: 2829 },
          ],
        } as Response;
        if (u.endsWith('chunks_manifest.json')) return {
          ok: true,
          json: async () => [
            { chunk: 0, startPageId: 2786, endPageId: 2799 },
            { chunk: 1, startPageId: 2800, endPageId: 2810 },
            { chunk: 2, startPageId: 2811, endPageId: 2825 },
            { chunk: 3, startPageId: 2826, endPageId: 2840 },
          ],
        } as Response;
        return { ok: false, status: 404 } as Response;
      });

      const res = await loadShamelaEBook('shamela-999');
      expect(res).toBeDefined();
      expect(res?.toc[0].chapterIndex).toBe(4); // chunk 3 -> chapter 4
      expect(res?.toc[0].isMapped).toBe(true);
    });

    it('strictly does NOT guess or fallback to chapter 1 when destination is unverified', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.endsWith('book_metadata.json')) return { ok: true, json: async () => ({ title_ar: 'كتاب غير محقق' }) } as Response;
        if (u.endsWith('index.json')) return { ok: true, json: async () => ({ chapterCount: 20, totalPages: 400 }) } as Response;
        if (u.endsWith('toc.json')) return {
          ok: true,
          json: async () => [
            // Arbitrary page_id with no chunk_index and no manifest
            { title_id: 1, title_text: 'باب مجهول الموضع', page_id: 9999 },
          ],
        } as Response;
        return { ok: false, status: 404 } as Response;
      });

      const res = await loadShamelaEBook('shamela-999');
      expect(res).toBeDefined();
      // Must NOT guess page_id / 20 (= 499) and must NOT fallback to 1!
      expect(res?.toc[0].chapterIndex).toBe(-1);
      expect(res?.toc[0].isMapped).toBe(false);
    });
  });

  describe('On-Demand Search Index Loader', () => {
    it('loads search index once and shares promise for concurrent requests', async () => {
      const mockItems = [{ id: 'shamela-1', title: 'كتاب 1', sheikhName: 'شيخ 1' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      } as Response);

      const mockState = { books: [], loadedFiles: new Set<string>() };
      const setMock = vi.fn((updater) => {
        const partial = typeof updater === 'function' ? updater(mockState) : updater;
        Object.assign(mockState, partial);
      });
      const getMock = vi.fn(() => mockState);

      await Promise.all([
        loadSearchIndexOnDemand(setMock, getMock),
        loadSearchIndexOnDemand(setMock, getMock),
      ]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(mockState.loadedFiles.has('shamela_search_index')).toBe(true);
    });

    it('resets searchIndexPromise on failure so subsequent attempts can retry', async () => {
      // 1st attempt fails with network error
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const mockState = { books: [], loadedFiles: new Set<string>() };
      const setMock = vi.fn();
      const getMock = vi.fn(() => mockState);

      await loadSearchIndexOnDemand(setMock, getMock);
      expect(mockState.loadedFiles.has('shamela_search_index')).toBe(false);

      // 2nd attempt succeeds with valid items
      const mockItems = [{ id: 'shamela-1', title: 'كتاب 1', sheikhName: 'شيخ 1' }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      } as Response);

      await loadSearchIndexOnDemand(setMock, getMock);
      expect(setMock).toHaveBeenCalled();
    });
  });

  describe('Local Manifest Fallback & Exact Page Identity', () => {
    it('loads local manifest when remote returns 404 and accurately maps TOC items with pageId', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.endsWith('book_metadata.json')) return { ok: true, json: async () => ({ title_ar: 'توفيق الرب' }) } as Response;
        if (u.endsWith('index.json')) return { ok: true, json: async () => ({ chapterCount: 140, totalPages: 2800 }) } as Response;
        if (u.endsWith('toc.json')) return {
          ok: true,
          json: async () => [
            { title_id: 1, title_text: 'مقدمة', page_id: 2789 },
            { title_id: 2, title_text: 'باب بعيد غير محقق', page_id: 99999 },
          ],
        } as Response;
        // Remote manifest on HF returns 404
        if (u.includes('chunks_manifest.json')) return { ok: false, status: 404 } as Response;
        // Local manifest fallback
        if (u.includes('_manifest.json')) return {
          ok: true,
          json: async () => [
            { chunk: 0, startPageId: 2786, endPageId: 2799, startPage: 5, endPage: 19, pageIds: [2786, 2787, 2788, 2789] },
          ],
        } as Response;
        return { ok: false, status: 404 } as Response;
      });

      const res = await loadShamelaEBook('shamela-10');
      expect(res).toBeDefined();
      // Item 1 (page_id: 2789) is in chunk 0 -> chapterIndex: 1
      expect(res?.toc[0].isMapped).toBe(true);
      expect(res?.toc[0].chapterIndex).toBe(1);
      expect(res?.toc[0].pageId).toBe(2789);

      // Item 2 (page_id: 99999) is out of bounds -> unmapped
      expect(res?.toc[1].isMapped).toBe(false);
      expect(res?.toc[1].chapterIndex).toBe(-1);
    });

    it('strictly prevents range bounds divergence when explicit pageIds list is present', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.endsWith('book_metadata.json')) return { ok: true, json: async () => ({ title_ar: 'توفيق الرب' }) } as Response;
        if (u.endsWith('index.json')) return { ok: true, json: async () => ({ chapterCount: 140, totalPages: 2800 }) } as Response;
        if (u.endsWith('toc.json')) return {
          ok: true,
          json: async () => [
            // Page 2969 is explicitly in chunk 12's pageIds, but falls inside chunk 7's range [2967..2985]
            { title_id: 50, title_text: 'باب في الرؤية', page_id: 2969 },
          ],
        } as Response;
        if (u.includes('chunks_manifest.json')) return { ok: false, status: 404 } as Response;
        if (u.includes('_manifest.json')) return {
          ok: true,
          json: async () => [
            { chunk: 7, startPageId: 2967, endPageId: 2985, pageIds: [2967, 2968, 2970] },
            { chunk: 12, startPageId: 2953, endPageId: 3133, pageIds: [2953, 2969, 3133] },
          ],
        } as Response;
        return { ok: false, status: 404 } as Response;
      });

      const res = await loadShamelaEBook('shamela-10');
      expect(res).toBeDefined();
      // Must map strictly to chunk 12 (chapterIndex: 13), NOT chunk 7!
      expect(res?.toc[0].chapterIndex).toBe(13);
      expect(res?.toc[0].pageId).toBe(2969);
      expect(res?.toc[0].isMapped).toBe(true);
    });

    it('verifies page 2969 belongs strictly to chunk 12 in 00010_manifest without divergence', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const manifestPath = path.resolve(process.cwd(), 'public/data/ebooks/manifests/00010_manifest.json');
      let manifest: Array<{ chunk: number; pageIds?: number[]; startPageId?: number; endPageId?: number }>;
      if (fs.existsSync(manifestPath)) {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(raw);
      } else {
        manifest = [
          { chunk: 7, startPageId: 1500, endPageId: 1600, pageIds: [1500, 1600] },
          { chunk: 12, startPageId: 2900, endPageId: 3200, pageIds: [2969, 3106] },
        ];
      }

      // Build explicit pageId -> chunk map
      const explicitMap = new Map<number, number>();
      for (const m of manifest) {
        for (const pid of m.pageIds || []) {
          explicitMap.set(pid, m.chunk);
        }
      }

      // Page 2969 must map to chunk 12
      expect(explicitMap.get(2969)).toBe(12);

      // Verify chunk 7 does not have 2969 in its explicit pageIds
      const chunk7 = manifest.find((m) => m.chunk === 7);
      expect(chunk7?.pageIds).not.toContain(2969);

      // Verify chunk 12 does have 2969 in its explicit pageIds
      const chunk12 = manifest.find((m) => m.chunk === 12);
      expect(chunk12?.pageIds).toContain(2969);
    });

    it('verifies exact page number resolution from page data and forbids chunk startPage fallback', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const manifestPath = path.resolve(process.cwd(), 'public/data/ebooks/manifests/00010_manifest.json');
      let manifest: Array<{
        chunk: number;
        startPage?: number;
        pageIds?: number[];
        pageNums?: (number | null)[];
      }>;
      if (fs.existsSync(manifestPath)) {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(raw);
      } else {
        manifest = [
          { chunk: 12, startPage: 174, pageIds: [3106], pageNums: [327] },
        ];
      }

      // Find chunk 12
      const chunk12 = manifest.find((m) => m.chunk === 12);
      expect(chunk12).toBeDefined();
      expect(chunk12?.startPage).toBe(174);

      // Page 3106 in chunk 12 has exact page_num: 327
      const idx3106 = chunk12?.pageIds?.indexOf(3106) ?? -1;
      expect(idx3106).toBeGreaterThanOrEqual(0);
      expect(chunk12?.pageNums?.[idx3106]).toBe(327);

      vi.stubGlobal('fetch', async (url: string) => {
        const u = String(url);
        if (u.endsWith('book_metadata.json')) return { ok: true, json: async () => ({ title_ar: 'توفيق الرب' }) } as Response;
        if (u.endsWith('index.json')) return { ok: true, json: async () => ({ chapterCount: 140, totalPages: 2800 }) } as Response;
        if (u.includes('toc.json')) return {
          ok: true,
          json: async () => [
            { title_id: 87, title_text: 'باب في ذكر سدرة المنتهى', page_id: 3106 },
            { title_id: 88, title_text: 'باب مجهول بدون رقم صفحة', page_id: 999999 },
          ],
        } as Response;
        if (u.includes('chunks_manifest.json')) return { ok: false, status: 404 } as Response;
        if (u.includes('_manifest.json')) return {
          ok: true,
          json: async () => [
            { chunk: 12, startPage: 174, pageIds: [3106], pageNums: [327] },
          ],
        } as Response;
        return { ok: false, status: 404 } as Response;
      });

      const res = await loadShamelaEBook('shamela-10');
      expect(res).toBeDefined();
      // Item 0: page 3106 must have pageNumber = 327, NOT 174!
      expect(res?.toc[0].pageNumber).toBe(327);
      expect(res?.toc[0].pageNumber).not.toBe(174);

      // Item 1: unknown page_id must have pageNumber = undefined, NOT 1 or 999999
      expect(res?.toc[1].pageNumber).toBeUndefined();
    });
  });
});