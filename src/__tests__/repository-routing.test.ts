import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_REPOSITORIES,
  isRepoSuitableForPath,
  filterReposForPath,
  fetchJsonWithFallback,
  tryFetchJson,
  HttpError,
} from '@/lib/shared';
import type { RepositorySource } from '@/lib/types';

describe('Repository Routing & Retry Optimization Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. Repository Route Filtering & Boundary Isolation', () => {
    it('routes books and articles exclusively to hf-islamic-books', () => {
      const bookPaths = [
        'books/islamhouse_books_ar.json',
        'books/islamhouse_articles_ar.json',
        'books/OpenITI_14k_Classical_Books/openiti_books_index.json',
        'islamic_books/books.json',
      ];

      for (const path of bookPaths) {
        const filtered = filterReposForPath(DEFAULT_REPOSITORIES, path);
        expect(filtered.map((r) => r.id)).toEqual(['hf-islamic-books']);
        expect(filtered.some((r) => r.id === 'hf-telewat-dawah')).toBe(false);
        expect(filtered.some((r) => r.id === 'hf-fatawa')).toBe(false);
      }
    });

    it('routes fatawa exclusively to hf-fatawa', () => {
      const fatwaPaths = [
        'fatawa/fatawa_bibaz.json',
        'fatawa/islamhouse_fatwa_ar.json',
        'sheikh_fatawa/nur_ealaa_aldarb.json',
      ];

      for (const path of fatwaPaths) {
        const filtered = filterReposForPath(DEFAULT_REPOSITORIES, path);
        expect(filtered.map((r) => r.id)).toEqual(['hf-fatawa']);
        expect(filtered.some((r) => r.id === 'hf-telewat-dawah')).toBe(false);
        expect(filtered.some((r) => r.id === 'hf-islamic-books')).toBe(false);
      }
    });

    it('routes media, recitations, and channels exclusively to hf-telewat-dawah', () => {
      const mediaPaths = [
        'iyad_alqunibi/iyad_alqunibi.videos.json',
        'menshawy/1_menshawy.json',
        'othman_alkhamees/othman_alkhamees.shorts.json',
        'live/makkah_live.live.json',
      ];

      for (const path of mediaPaths) {
        const filtered = filterReposForPath(DEFAULT_REPOSITORIES, path);
        expect(filtered.map((r) => r.id)).toEqual(['hf-telewat-dawah']);
        expect(filtered.some((r) => r.id === 'hf-fatawa')).toBe(false);
        expect(filtered.some((r) => r.id === 'hf-islamic-books')).toBe(false);
      }
    });

    it('preserves user-customized repositories without supportedTypes for all file types', () => {
      const customUserRepo: RepositorySource = {
        id: 'user-custom-repo',
        provider: 'github',
        owner: 'hozifa1',
        repo: 'custom_archive',
        branch: 'main',
        path: 'data',
        enabled: true,
      };

      const mixedRepos = [...DEFAULT_REPOSITORIES, customUserRepo];

      // Custom repo should be included in book requests alongside islamic-books
      const bookFiltered = filterReposForPath(mixedRepos, 'books/custom_book.json');
      expect(bookFiltered.map((r) => r.id)).toEqual(['hf-islamic-books', 'user-custom-repo']);

      // Custom repo should be included in fatwa requests alongside fatawa
      const fatwaFiltered = filterReposForPath(mixedRepos, 'fatawa/custom_fatwa.json');
      expect(fatwaFiltered.map((r) => r.id)).toEqual(['hf-fatawa', 'user-custom-repo']);

      // Custom repo should be included in media requests alongside telewat
      const mediaFiltered = filterReposForPath(mixedRepos, 'sheikh/videos.json');
      expect(mediaFiltered.map((r) => r.id)).toEqual(['hf-telewat-dawah', 'user-custom-repo']);
    });

    it('honors user-configured repo paths that match the target path prefix', () => {
      const pathSpecificRepo: RepositorySource = {
        id: 'special-path-repo',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'special_repo',
        path: 'special_category',
        enabled: true,
        supportedTypes: ['videos'], // strictly videos
      };

      // When requesting a file starting with the repo's explicit path prefix, it should match
      expect(isRepoSuitableForPath(pathSpecificRepo, 'special_category/manifest.json')).toBe(true);
    });

    it('never routes to disabled repositories even if data types match', () => {
      const disabledBookRepo: RepositorySource = {
        id: 'disabled-books',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'islamic_books',
        path: 'books',
        enabled: false,
        supportedTypes: ['books'],
      };

      expect(isRepoSuitableForPath(disabledBookRepo, 'books/any.json')).toBe(false);
      expect(filterReposForPath([disabledBookRepo], 'books/any.json')).toEqual([]);
    });
  });

  describe('2. Non-Retry on HTTP 404 (Immediate Fallback)', () => {
    it('calls fetch exactly once on HTTP 404 and terminates retries immediately', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('Not Found'),
      });
      global.fetch = fetchMock;

      await expect(tryFetchJson('https://example.com/missing.json', 1000)).rejects.toThrow(HttpError);
      await expect(tryFetchJson('https://example.com/missing.json', 1000)).rejects.toThrow(/HTTP 404/);

      // Verify fetch was called only once per call (total 2 calls for 2 expect statements)
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry 404 in fetchJsonWithFallback and proceeds straight to the fallback repo', async () => {
      const repo1: RepositorySource = {
        id: 'repo-primary',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'books_primary',
        path: 'books',
        enabled: true,
        supportedTypes: ['books'],
      };
      const repo2: RepositorySource = {
        id: 'repo-backup',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'books_backup',
        path: 'books',
        enabled: true,
        supportedTypes: ['books'],
      };

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('books_primary')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        if (url.includes('books_backup')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'last-modified': '2026-09-01' }),
            text: () => Promise.resolve(JSON.stringify([{ id: 'book-1', title: 'كتاب بديل' }])),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      global.fetch = fetchMock;

      const result = await fetchJsonWithFallback<{ id: string; title: string }[]>(
        [repo1, repo2],
        'books/islamhouse_books_ar.json',
      );

      // Primary was queried exactly ONCE (zero 404 retries)
      const primaryCalls = fetchMock.mock.calls.filter((c) => c[0].includes('books_primary'));
      expect(primaryCalls.length).toBe(1);

      // Backup was queried exactly ONCE and succeeded
      const backupCalls = fetchMock.mock.calls.filter((c) => c[0].includes('books_backup'));
      expect(backupCalls.length).toBe(1);

      // Data is recovered without loss
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.sourceId).toBe('repo-backup');
      expect(result.data).toEqual([{ id: 'book-1', title: 'كتاب بديل' }]);
    });
  });

  describe('3. Transient Error Retry Resilience (5xx, 429 & Network Errors)', () => {
    it('retries up to MAX_RETRIES on HTTP 500 and succeeds when server recovers', async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            headers: new Headers(),
            text: () => Promise.resolve('Internal Server Error'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify({ recovered: true })),
        });
      });
      global.fetch = fetchMock;

      const res = await tryFetchJson<{ recovered: boolean }>('https://example.com/transient.json', 1000);
      expect(callCount).toBe(3);
      expect(res.data).toEqual({ recovered: true });
    });

    it('retries on network exceptions (Failed to fetch) up to MAX_RETRIES', async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify({ recovered: true })),
        });
      });
      global.fetch = fetchMock;

      const res = await tryFetchJson<{ recovered: boolean }>('https://example.com/network-blip.json', 1000);
      expect(callCount).toBe(2);
      expect(res.data).toEqual({ recovered: true });
    });
    it('retries on HTTP 429 (Rate Limit) up to MAX_RETRIES and recovers', async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers(),
            text: () => Promise.resolve('Too Many Requests'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify({ rateLimitPassed: true })),
        });
      });
      global.fetch = fetchMock;

      const res = await tryFetchJson<{ rateLimitPassed: boolean }>('https://example.com/ratelimit.json', 1000);
      expect(callCount).toBe(2);
      expect(res.data).toEqual({ rateLimitPassed: true });
    });
  });

  describe('4. Candidate Index & Blob Fetcher Fallback Behavior', () => {
    it('switches candidate index URLs on 404 without repeating the failed candidate', async () => {
      const { fetchMergedIndex } = await import('@/lib/shared');
      const testRepo: RepositorySource = {
        id: 'hf-test-index',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'test_repo',
        path: 'data',
        enabled: true,
      };

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        // Candidate 1: data/index.json -> 404
        if (url.includes('data/index.json')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        // Candidate 2: Tree API -> 200
        if (url.includes('/api/datasets/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify([{ path: 'data/file1.json', type: 'file' }])),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      global.fetch = fetchMock;

      const result = await fetchMergedIndex([testRepo]);

      // Failed candidate was tried exactly ONCE (zero 404 retries)
      const failedCandidateCalls = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('data/index.json'));
      expect(failedCandidateCalls.length).toBe(1);

      // Successful tree candidate was queried once
      const treeCalls = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('/api/datasets/'));
      expect(treeCalls.length).toBe(1);

      expect(result.files).toContain('file1.json');
      expect(result.perRepo[0].ok).toBe(true);
    });

    it('filters repositories for fetchBlobWithFallback and falls back when primary returns 404', async () => {
      const { fetchBlobWithFallback } = await import('@/lib/shared');
      const bookRepo1: RepositorySource = {
        id: 'book-repo-1',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'books_1',
        path: 'books',
        enabled: true,
        supportedTypes: ['books'],
      };
      const bookRepo2: RepositorySource = {
        id: 'book-repo-2',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'books_2',
        path: 'books',
        enabled: true,
        supportedTypes: ['books'],
      };
      const mediaRepo: RepositorySource = {
        id: 'media-repo',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'media_repo',
        path: 'media',
        enabled: true,
        supportedTypes: ['videos'],
      };

      const mockBlob = new Blob(['mock content'], { type: 'application/pdf' });
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('books_1')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
          });
        }
        if (url.includes('books_2')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            blob: () => Promise.resolve(mockBlob),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      global.fetch = fetchMock;

      const blob = await fetchBlobWithFallback([bookRepo1, bookRepo2, mediaRepo], 'books/sample.pdf');

      // mediaRepo was completely bypassed
      expect(fetchMock.mock.calls.some((c) => (c[0] as string).includes('media_repo'))).toBe(false);

      // bookRepo1 was tried once
      expect(fetchMock.mock.calls.filter((c) => (c[0] as string).includes('books_1')).length).toBe(1);

      // bookRepo2 succeeded
      expect(fetchMock.mock.calls.filter((c) => (c[0] as string).includes('books_2')).length).toBe(1);
      expect(blob).not.toBeNull();
    });
  });

  describe('5. Overall Request Reduction Quantification', () => {
    it('prevents any network calls to Telewat and Fatawa when fetching book files', async () => {
      const fetchMock = vi.fn().mockImplementation((_url: string) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify([{ id: 1 }])),
        });
      });
      global.fetch = fetchMock;

      await fetchJsonWithFallback(DEFAULT_REPOSITORIES, 'books/islamhouse_books_ar.json');

      // Exactly ONE request made across the entire repository list
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('islamic_books');
      expect(calledUrl).not.toContain('Telewat');
      expect(calledUrl).not.toContain('fatawa');
    });

    it('issues zero network requests when no enabled repository matches the requested type', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      // Only media repo is provided, but a book file is requested
      const onlyMediaRepo: RepositorySource[] = [
        {
          id: 'hf-telewat-dawah',
          provider: 'huggingface',
          owner: 'hozifa1',
          repo: 'Telewat_Daawa_And_Channels',
          path: 'Dawah_And_Channels',
          enabled: true,
          supportedTypes: ['videos', 'shorts', 'live', 'radio', 'main'],
        },
      ];

      const result = await fetchJsonWithFallback(onlyMediaRepo, 'books/islamhouse_books_ar.json');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.ok).toBe(false);
      expect(result.data).toBeNull();
    });
  });
});
