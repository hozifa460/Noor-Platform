import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  BOOKS_BASE,
  FATWA_BASE,
  HADITH_BASE,
  ADHKAR_BASE,
  sanitizeBooksBase,
  booksUrl,
  booksIndexUrl,
  booksShardUrl,
  shamelaBookFolder,
  shamelaBookMetaUrl,
  shamelaBookIndexUrl,
  shamelaBookTocUrl,
  shamelaBookChapterUrl,
  shamelaChunksManifestUrl,
  isRemoteBooks,
  dataUrl,
  hadithUrl,
  adhkarUrl,
} from '@/lib/shared/data-base';

describe('Shamela Books Source Unification & Mock Server Routing', () => {
  let server: http.Server;
  let mockBaseUrl: string;
  const receivedRequests: Array<{ method: string; path: string; headers: http.IncomingHttpHeaders }> = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = req.url || '';
      receivedRequests.push({
        method: req.method || 'GET',
        path: url,
        headers: req.headers,
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      if (url === '/data/books/shamela/00008/book_metadata.json') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            book_id: 'shamela-8',
            title_ar: 'مختصر خوقير',
            main_author_name_ar: 'محمد بن عبد الله بن حميد النجدي',
            main_author_death_hijri: 1395,
            category_name_ar: 'الفقه الحنبلي',
          })
        );
        return;
      }

      if (url === '/data/books/shamela/00008/index.json') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            id: 'shamela-8',
            title: 'مختصر خوقير',
            section: 'الفقه الحنبلي',
          })
        );
        return;
      }

      if (url === '/data/books/shamela/00008/toc.json') {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            { id: 't1', title_text: 'مقدمة المؤلف', page_num: 1, level: 1 },
            { id: 't2', title_text: 'كتاب الطهارة', page_num: 21, level: 1 },
          ])
        );
        return;
      }

      if (url === '/data/books/shamela/00008/chunks_manifest.json') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            book_id: 'shamela-8',
            chunks_count: 5,
          })
        );
        return;
      }

      if (url === '/data/books/shamela/00008/chapters/000.json') {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            {
              page_id: 1,
              page_num: 1,
              part: 1,
              body: 'بسم الله الرحمن الرحيم - قال الشيخ خوقير رحمه الله: هذا مختصر لطيف',
              footnotes: null,
            },
          ])
        );
        return;
      }

      if (url === '/data/books/shamela/00008/chapters/001.json') {
        res.writeHead(200);
        res.end(
          JSON.stringify([
            {
              page_id: 21,
              page_num: 21,
              part: 1,
              body: 'باب المياه: المياه ثلاثة أقسام: طهور، وطاهر، ونجس',
              footnotes: null,
            },
          ])
        );
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found', url }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        mockBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    receivedRequests.length = 0;
  });

  /* --------------------------------------------------------------------------
     Section A: اختبار توليد الرابط (URL Generation & Sanitization Tests)
     -------------------------------------------------------------------------- */
  describe('A. اختبار توليد الرابط (URL Generation & Sanitization)', () => {
    it('1. Sanitizes books base URLs: trims slashes, normalizes legacy HF, supports custom CDN & localhost', () => {
      // Default fallback when undefined / empty
      const defaultHF = 'https://huggingface.co/datasets/hozifa1/noor-platform-books/resolve/main';
      expect(sanitizeBooksBase(undefined)).toBe(defaultHF);
      expect(sanitizeBooksBase('')).toBe(defaultHF);
      expect(sanitizeBooksBase('   ')).toBe(defaultHF);

      // Custom domain: keeps protocol and domain, strips trailing slashes
      expect(sanitizeBooksBase('https://data.noor-platform.com')).toBe('https://data.noor-platform.com');
      expect(sanitizeBooksBase('https://data.noor-platform.com/')).toBe('https://data.noor-platform.com');
      expect(sanitizeBooksBase('https://data.noor-platform.com///')).toBe('https://data.noor-platform.com');

      // Localhost / mock URL: keeps port and protocol, strips trailing slashes
      expect(sanitizeBooksBase('http://127.0.0.1:8989')).toBe('http://127.0.0.1:8989');
      expect(sanitizeBooksBase('http://127.0.0.1:8989/')).toBe('http://127.0.0.1:8989');

      // Legacy Hugging Face normalization
      expect(sanitizeBooksBase('https://huggingface.co/datasets/hozifa1/noor-platform-books/tree/main')).toBe(defaultHF);
      expect(sanitizeBooksBase('https://huggingface.co/datasets/hozifa1/noor-platform-books/raw/main')).toBe(defaultHF);
      expect(sanitizeBooksBase('https://huggingface.co/datasets/hozifa1/noor-platform-books')).toBe(defaultHF);
    });

    it('2. Preserves default production paths identically when NEXT_PUBLIC_BOOKS_BASE is unset', () => {
      const defaultHF = 'https://huggingface.co/datasets/hozifa1/noor-platform-books/resolve/main';
      expect(BOOKS_BASE).toBe(defaultHF);
      expect(isRemoteBooks()).toBe(true);

      const folder = shamelaBookFolder('shamela-8');
      expect(folder).toBe('00008');

      expect(shamelaBookMetaUrl(folder)).toBe(`${defaultHF}/data/books/shamela/00008/book_metadata.json`);
      expect(shamelaBookIndexUrl(folder)).toBe(`${defaultHF}/data/books/shamela/00008/index.json`);
      expect(shamelaBookTocUrl(folder)).toBe(`${defaultHF}/data/books/shamela/00008/toc.json`);
      expect(shamelaChunksManifestUrl(folder)).toBe(`${defaultHF}/data/books/shamela/00008/chunks_manifest.json`);
      expect(shamelaBookChapterUrl(folder, 0)).toBe(`${defaultHF}/data/books/shamela/00008/chapters/000.json`);
      expect(shamelaBookChapterUrl(folder, 1)).toBe(`${defaultHF}/data/books/shamela/00008/chapters/001.json`);
      expect(booksIndexUrl('shamela', 'ا')).toBe(`${defaultHF}/data/books/catalogs/shamela/_index_ا.json`);
      expect(booksShardUrl('shamela', 'كتب')).toBe(`${defaultHF}/data/books/catalogs/shamela/_by_prefix/ك/ت/ب.json`);
      expect(booksUrl('data/books/custom.json')).toBe(`${defaultHF}/data/books/custom.json`);
    });

    it('3. Ensures Hadith, Fatwa, and Adhkar bases and URLs are completely unaffected', () => {
      // Assert Fatwa base and url
      expect(FATWA_BASE).toContain('noor-platform-fatwa');
      expect(dataUrl('data/fatwa_answers/01/test.json')).toContain('noor-platform-fatwa');

      // Assert Hadith base and url
      expect(HADITH_BASE).toContain('noor-platform-hadith');
      expect(hadithUrl('data/hadith/books/bukhari/index.json')).toContain('noor-platform-hadith');

      // Assert Adhkar base and url
      expect(ADHKAR_BASE).toContain('adhkarset');
      expect(adhkarUrl('data/adhkar/1.mp3')).toContain('adhkarset');
    });
  });

  /* --------------------------------------------------------------------------
     Section B: اختبار التهيئة الفعلية عبر عزل الوحدات ومتغيرات البيئة
     -------------------------------------------------------------------------- */
  describe('B. اختبار التهيئة الفعلية عبر عزل الوحدات (Module Isolation Tests)', () => {
    it('4. Custom domain: re-evaluates BOOKS_BASE cleanly without modifying other domains', async () => {
      const savedEnv = process.env.NEXT_PUBLIC_BOOKS_BASE;
      try {
        process.env.NEXT_PUBLIC_BOOKS_BASE = 'https://data.noor-platform.com';
        vi.resetModules();

        const isolatedDb = await import('@/lib/shared/data-base');
        expect(isolatedDb.BOOKS_BASE).toBe('https://data.noor-platform.com');
        expect(isolatedDb.isRemoteBooks()).toBe(true);

        const folder = isolatedDb.shamelaBookFolder('shamela-8');
        expect(isolatedDb.shamelaBookMetaUrl(folder)).toBe(
          'https://data.noor-platform.com/data/books/shamela/00008/book_metadata.json'
        );
        expect(isolatedDb.shamelaBookChapterUrl(folder, 0)).toBe(
          'https://data.noor-platform.com/data/books/shamela/00008/chapters/000.json'
        );

        // Ensure Fatwa, Hadith, Adhkar remain isolated and unaffected
        expect(isolatedDb.FATWA_BASE).toContain('noor-platform-fatwa');
        expect(isolatedDb.HADITH_BASE).toContain('noor-platform-hadith');
        expect(isolatedDb.ADHKAR_BASE).toContain('adhkarset');
      } finally {
        if (savedEnv !== undefined) {
          process.env.NEXT_PUBLIC_BOOKS_BASE = savedEnv;
        } else {
          delete process.env.NEXT_PUBLIC_BOOKS_BASE;
        }
        vi.resetModules();
      }
    });

    it('5. Local mock server: routes all Shamela books paths with 100% path structure fidelity', async () => {
      const savedEnv = process.env.NEXT_PUBLIC_BOOKS_BASE;
      try {
        process.env.NEXT_PUBLIC_BOOKS_BASE = mockBaseUrl;
        vi.resetModules();

        const isolatedDb = await import('@/lib/shared/data-base');
        expect(isolatedDb.BOOKS_BASE).toBe(mockBaseUrl);

        const folder = isolatedDb.shamelaBookFolder('shamela-8');
        expect(folder).toBe('00008');

        expect(isolatedDb.shamelaBookMetaUrl(folder)).toBe(
          `${mockBaseUrl}/data/books/shamela/00008/book_metadata.json`
        );
        expect(isolatedDb.shamelaBookIndexUrl(folder)).toBe(
          `${mockBaseUrl}/data/books/shamela/00008/index.json`
        );
        expect(isolatedDb.shamelaBookTocUrl(folder)).toBe(
          `${mockBaseUrl}/data/books/shamela/00008/toc.json`
        );
        expect(isolatedDb.shamelaChunksManifestUrl(folder)).toBe(
          `${mockBaseUrl}/data/books/shamela/00008/chunks_manifest.json`
        );
        expect(isolatedDb.shamelaBookChapterUrl(folder, 0)).toBe(
          `${mockBaseUrl}/data/books/shamela/00008/chapters/000.json`
        );
        expect(isolatedDb.shamelaBookChapterUrl(folder, 1)).toBe(
          `${mockBaseUrl}/data/books/shamela/00008/chapters/001.json`
        );
      } finally {
        if (savedEnv !== undefined) {
          process.env.NEXT_PUBLIC_BOOKS_BASE = savedEnv;
        } else {
          delete process.env.NEXT_PUBLIC_BOOKS_BASE;
        }
        vi.resetModules();
      }
    });
  });

  /* --------------------------------------------------------------------------
     Section C: اختبار جلب الملف ومعالجته عبر الشبكة المحلية (Network Fetch & Processing)
     -------------------------------------------------------------------------- */
  describe('C. اختبار جلب الملف ومعالجته عبر الشبكة المحلية (Fetch & Processing Tests)', () => {
    it('6. loadShamelaEBook fetches and parses metadata, TOC, and manifest from local mock server', async () => {
      const savedEnv = process.env.NEXT_PUBLIC_BOOKS_BASE;
      try {
        process.env.NEXT_PUBLIC_BOOKS_BASE = mockBaseUrl;
        vi.resetModules();

        const { loadShamelaEBook, metaCache } = await import('../infrastructure/text/chapters');
        metaCache.clear();

        const book = await loadShamelaEBook('shamela-8');
        expect(book).not.toBeNull();
        expect(book?.meta.title).toBe('مختصر خوقير');
        expect(book?.meta.author).toBe('محمد بن عبد الله بن حميد النجدي');
        expect(book?.meta.category).toBe('history');
        expect(book?.meta.tags).toContain('الفقه الحنبلي');
        expect(book?.toc.length).toBe(2);
        expect(book?.toc[0].title).toBe('مقدمة المؤلف');
        expect(book?.toc[1].title).toBe('كتاب الطهارة');

        // Verify actual HTTP requests received by mock server
        const paths = receivedRequests.map((r) => r.path);
        expect(paths).toContain('/data/books/shamela/00008/book_metadata.json');
        expect(paths).toContain('/data/books/shamela/00008/index.json');
        expect(paths).toContain('/data/books/shamela/00008/toc.json');
        expect(paths).toContain('/data/books/shamela/00008/chunks_manifest.json');
      } finally {
        if (savedEnv !== undefined) {
          process.env.NEXT_PUBLIC_BOOKS_BASE = savedEnv;
        } else {
          delete process.env.NEXT_PUBLIC_BOOKS_BASE;
        }
        vi.resetModules();
      }
    });

    it('7. fetchShamelaChapterSlice fetches and parses chapter slices 0 and 1 from local mock server', async () => {
      const savedEnv = process.env.NEXT_PUBLIC_BOOKS_BASE;
      try {
        process.env.NEXT_PUBLIC_BOOKS_BASE = mockBaseUrl;
        vi.resetModules();

        const { fetchShamelaChapterSlice, chunkCache } = await import('../infrastructure/text/chapters');
        chunkCache.clear();

        // Fetch chapter slice 0
        const chunk0 = await fetchShamelaChapterSlice('shamela-8', 0);
        expect(chunk0).not.toBeNull();
        expect(chunk0?.paragraphs[0].text).toContain(
          'بسم الله الرحمن الرحيم - قال الشيخ خوقير رحمه الله: هذا مختصر لطيف'
        );

        // Fetch chapter slice 1
        const chunk1 = await fetchShamelaChapterSlice('shamela-8', 1);
        expect(chunk1).not.toBeNull();
        expect(chunk1?.paragraphs[0].text).toContain(
          'باب المياه: المياه ثلاثة أقسام: طهور، وطاهر، ونجس'
        );

        // Verify mock server received requests for both slices
        const paths = receivedRequests.map((r) => r.path);
        expect(paths).toContain('/data/books/shamela/00008/chapters/000.json');
        expect(paths).toContain('/data/books/shamela/00008/chapters/001.json');
      } finally {
        if (savedEnv !== undefined) {
          process.env.NEXT_PUBLIC_BOOKS_BASE = savedEnv;
        } else {
          delete process.env.NEXT_PUBLIC_BOOKS_BASE;
        }
        vi.resetModules();
      }
    });
  });
});
