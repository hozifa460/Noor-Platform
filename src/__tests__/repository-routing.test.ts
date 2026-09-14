import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_REPOSITORIES,
  isRepoSuitableForPath,
  filterReposForPath,
  fetchJsonWithFallback,
  fetchMergedIndex,
  tryFetchJson,
  HttpError,
  loadRepositories,
  migrateSavedRepositories,
  matchDefaultRepo,
  REPOS_STORAGE_KEY,
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

    it('migrates legacy saved default repositories without supportedTypes while preserving user edits and custom repositories', () => {
      const legacySavedRepos: RepositorySource[] = [
        {
          id: 'hf-telewat-dawah',
          provider: 'huggingface',
          owner: 'hozifa1',
          repo: 'Telewat_Daawa_And_Channels',
          branch: 'main',
          path: 'Dawah_And_Channels',
          indexFile: 'index.json',
          primary: true,
          enabled: false, // User customized: disabled telewat
        },
        {
          id: 'hf-fatawa',
          provider: 'huggingface',
          owner: 'hozifa1',
          repo: 'fatawaset',
          branch: 'custom-branch', // User customized: custom branch
          path: 'fatawa',
          primary: false,
          enabled: true,
        },
        {
          id: 'hf-islamic-books',
          provider: 'huggingface',
          owner: 'hozifa1',
          repo: 'islamic_books',
          branch: 'main',
          path: 'books',
          primary: false,
          enabled: true,
        },
        {
          id: 'custom-user-repo-99',
          provider: 'github',
          owner: 'hozifa1',
          repo: 'my_special_repo',
          branch: 'main',
          path: 'special',
          enabled: true,
        },
      ];

      // Store legacy configurations in localStorage
      window.localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(legacySavedRepos));

      const loaded = loadRepositories();

      // 1. Array length and composition is preserved (not overwritten with DEFAULT_REPOSITORIES)
      expect(loaded.length).toBe(4);
      expect(loaded.map((r) => r.id)).toEqual([
        'hf-telewat-dawah',
        'hf-fatawa',
        'hf-islamic-books',
        'custom-user-repo-99',
      ]);

      // 2. User customizations are preserved
      const telewat = loaded.find((r) => r.id === 'hf-telewat-dawah');
      expect(telewat?.enabled).toBe(false); // user edit preserved!
      expect(telewat?.supportedTypes).toEqual(['videos', 'shorts', 'live', 'radio', 'main']); // backfilled!

      const fatawa = loaded.find((r) => r.id === 'hf-fatawa');
      expect(fatawa?.branch).toBe('custom-branch'); // user edit preserved!
      expect(fatawa?.supportedTypes).toEqual(['fatwa']); // backfilled!

      const books = loaded.find((r) => r.id === 'hf-islamic-books');
      expect(books?.supportedTypes).toEqual(['books', 'articles']); // backfilled!

      const customRepo = loaded.find((r) => r.id === 'custom-user-repo-99');
      expect(customRepo).toBeDefined();
      expect(customRepo?.repo).toBe('my_special_repo');
      expect(customRepo?.supportedTypes).toBeUndefined(); // remains unconstrained!

      // 3. Verify migrated state was persisted to localStorage
      const persisted = JSON.parse(window.localStorage.getItem(REPOS_STORAGE_KEY) || '[]');
      expect(persisted.find((r: Record<string, unknown>) => r.id === 'hf-fatawa')?.supportedTypes).toEqual(['fatwa']);
      expect(persisted.find((r: Record<string, unknown>) => r.id === 'hf-telewat-dawah')?.enabled).toBe(false);
    });

    it('migrates a combined list of legacy settings (owner hozifa460) and custom user repo without replacing list with defaults', () => {
      const combinedSavedRepos: RepositorySource[] = [
        {
          id: 'gh-fatawa',
          provider: 'github',
          owner: 'hozifa460',
          repo: 'fatawaset',
          branch: 'custom-legacy-branch',
          path: 'fatawa',
          enabled: true,
          // supportedTypes is intentionally undefined (legacy state)
        },
        {
          id: 'custom-community-hadith',
          provider: 'github',
          owner: 'OpenITI',
          repo: '0750Tarikh',
          branch: 'main',
          path: 'hadith_data',
          enabled: true,
          supportedTypes: ['books'],
        },
      ];

      window.localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(combinedSavedRepos));

      const loaded = loadRepositories();

      // Ensure user repository list was NOT wiped or replaced by DEFAULT_REPOSITORIES
      expect(loaded.length).toBe(2);
      expect(loaded.map((r) => r.id)).toEqual(['hf-fatawa', 'custom-community-hadith']);

      // Known legacy default repo is upgraded:
      const fatawaRepo = loaded.find((r) => r.id === 'hf-fatawa');
      expect(fatawaRepo).toBeDefined();
      expect(fatawaRepo?.provider).toBe('huggingface');
      expect(fatawaRepo?.owner).toBe('hozifa1');
      expect(fatawaRepo?.repo).toBe('fatawaset');
      expect(fatawaRepo?.branch).toBe('custom-legacy-branch'); // user customization preserved
      expect(fatawaRepo?.supportedTypes).toEqual(['fatwa']); // backfilled

      // Custom repository is 100% preserved:
      const customRepo = loaded.find((r) => r.id === 'custom-community-hadith');
      expect(customRepo).toBeDefined();
      expect(customRepo?.provider).toBe('github');
      expect(customRepo?.owner).toBe('OpenITI');
      expect(customRepo?.repo).toBe('0750Tarikh');
      expect(customRepo?.branch).toBe('main');
      expect(customRepo?.supportedTypes).toEqual(['books']);
    });

    it('distinguishes missing supportedTypes (undefined) from intentional empty array ([]) and rejects matching by ID when coordinates changed', () => {
      // 1. Intentional empty array supportedTypes: []
      const repoWithEmptyTypes: RepositorySource = {
        id: 'hf-fatawa',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'fatawaset',
        path: 'fatawa',
        enabled: true,
        supportedTypes: [], // User intentionally cleared or emptied supportedTypes
      };

      const { repos: migrated1, migrated: didMigrate1 } = migrateSavedRepositories([repoWithEmptyTypes]);
      expect(didMigrate1).toBe(false);
      expect(migrated1[0].supportedTypes).toEqual([]); // NOT overwritten by ['fatwa']

      // Verify unconstrained behavior in isRepoSuitableForPath for supportedTypes: []
      expect(isRepoSuitableForPath(repoWithEmptyTypes, 'books/some_book.json')).toBe(true);
      expect(isRepoSuitableForPath(repoWithEmptyTypes, 'fatawa/some_fatwa.json')).toBe(true);
      expect(isRepoSuitableForPath(repoWithEmptyTypes, 'media/some_video.json')).toBe(true);

      // 2. Repository with default ID but coordinates changed by user
      const repoWithModifiedCoords: RepositorySource = {
        id: 'hf-telewat-dawah', // matches default ID
        provider: 'github',
        owner: 'OpenITI',       // changed coordinates
        repo: 'custom_archive', // changed coordinates
        path: 'archive',
        enabled: true,
        // supportedTypes undefined
      };

      // Ensure matchDefaultRepo does NOT match this as a default repo
      expect(matchDefaultRepo(repoWithModifiedCoords)).toBeNull();

      const { repos: migrated2, migrated: didMigrate2 } = migrateSavedRepositories([repoWithModifiedCoords]);
      expect(didMigrate2).toBe(false);
      // Coordinates and properties are not modified to hozifa1/Telewat_Daawa_And_Channels
      expect(migrated2[0].owner).toBe('OpenITI');
      expect(migrated2[0].repo).toBe('custom_archive');
      expect(migrated2[0].supportedTypes).toBeUndefined();
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

    it('fetches a non-indicative file discovered via fetchMergedIndex without losing path prefix or origin', async () => {
      const { fetchMergedIndex, fetchJsonWithFallback } = await import('@/lib/shared');

      // Suppose hf-islamic-books index returns a file with a non-indicative name without 'books' keyword
      // e.g. 'record_0842.json'
      const nonIndicativeFileName = 'record_0842.json';
      const expectedData = { title: 'مخطوطة نادرة', content: 'نص الكتاب' };

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        // 1. hf-telewat candidate index.json -> returns 200 with standard media files
        if (url.includes('Telewat_Daawa_And_Channels') && url.includes('index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify(['iyad_alqunibi/iyad_alqunibi.videos.json'])),
          });
        }
        // 2. hf-fatawa candidate index.json -> 404
        if (url.includes('fatawaset') && url.includes('index.json')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        // 3. hf-fatawa tree API -> returns 200 with empty list
        if (url.includes('fatawaset') && url.includes('tree')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify([])),
          });
        }
        // 4. hf-islamic-books candidate index.json -> 404
        if (url.includes('islamic_books') && url.includes('index.json')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        // 5. hf-islamic-books tree API -> returns 200 with non-indicative file
        if (url.includes('islamic_books') && url.includes('tree')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify([{ path: `books/${nonIndicativeFileName}`, type: 'file' }])),
          });
        }
        // 6. When fetching the content of the non-indicative file:
        // If telewat is asked for it under Dawah_And_Channels -> 404
        if (url.includes('Telewat_Daawa_And_Channels')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        // If islamic_books is asked for it under books -> 200
        if (url.includes('islamic_books') && url.includes(nonIndicativeFileName)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify(expectedData)),
          });
        }

        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      global.fetch = fetchMock;

      // Step A: Run fetchMergedIndex across DEFAULT_REPOSITORIES
      const { files, fileSources } = await fetchMergedIndex(DEFAULT_REPOSITORIES);

      expect(files).toContain(nonIndicativeFileName);
      expect(fileSources[nonIndicativeFileName]).toBe('hf-islamic-books');

      // Step B: Fetch the non-indicative file using origin tracking
      const resultWithOrigin = await fetchJsonWithFallback<{ title: string; content: string }>(
        DEFAULT_REPOSITORIES,
        nonIndicativeFileName,
        2500,
        fileSources[nonIndicativeFileName],
      );

      expect(resultWithOrigin.ok).toBe(true);
      expect(resultWithOrigin.status).toBe(200);
      expect(resultWithOrigin.sourceId).toBe('hf-islamic-books');
      expect(resultWithOrigin.data).toEqual(expectedData);

      // Step C: Also verify that even WITHOUT passing sourceRepoId (blind path),
      // the safe unclassified routing does NOT exclude hf-islamic-books based on default 'videos'
      const resultWithoutOrigin = await fetchJsonWithFallback<{ title: string; content: string }>(
        DEFAULT_REPOSITORIES,
        nonIndicativeFileName,
        2500,
      );

      expect(resultWithoutOrigin.ok).toBe(true);
      expect(resultWithoutOrigin.status).toBe(200);
      expect(resultWithoutOrigin.sourceId).toBe('hf-islamic-books');
      expect(resultWithoutOrigin.data).toEqual(expectedData);
    });

    it('deterministically associates colliding file paths to the higher-priority repo regardless of network response order while preserving fallbacks', async () => {
      const primaryRepo: RepositorySource = {
        id: 'repo-priority-1',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'primary_repo',
        path: 'catalog',
        enabled: true,
      };

      const backupRepo: RepositorySource = {
        id: 'repo-priority-2',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'backup_repo',
        path: 'catalog',
        enabled: true,
      };

      const collidingFile = 'shared_resource.json';

      // Simulate network race condition:
      // backupRepo responds IMMEDIATELY (0ms)
      // primaryRepo responds SLOWLY (50ms delay)
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        // Candidate index for backupRepo (arrives first!)
        if (url.includes('backup_repo') && url.includes('index.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify([`catalog/${collidingFile}`])),
          });
        }
        // Candidate index for primaryRepo (arrives second after 50ms delay!)
        if (url.includes('primary_repo') && url.includes('index.json')) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify([`catalog/${collidingFile}`])),
              });
            }, 50);
          });
        }
        // Content fetch for primaryRepo -> 404 (simulating failover scenario)
        if (url.includes('primary_repo') && url.includes(collidingFile)) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        // Content fetch for backupRepo -> 200 with recovered content
        if (url.includes('backup_repo') && url.includes(collidingFile)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify({ recoveredData: 'from-backup' })),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });
      global.fetch = fetchMock;

      // 1. fetchMergedIndex with approved order [primaryRepo, backupRepo]
      const merged = await fetchMergedIndex([primaryRepo, backupRepo]);

      expect(merged.files).toContain(collidingFile);

      // Deterministic origin check:
      // Must belong to primaryRepo (repo-priority-1), NOT backupRepo (repo-priority-2),
      // even though backupRepo's network response arrived first!
      expect(merged.fileSources[collidingFile]).toBe('repo-priority-1');

      // Fallbacks must contain BOTH repositories
      expect(merged.fileFallbacks[collidingFile]).toEqual(['repo-priority-1', 'repo-priority-2']);

      // 2. Fetch content using the deterministic origin:
      // Primary is tried first, fails with 404 (single request, zero 404 retries),
      // then falls back to backupRepo and succeeds!
      const contentResult = await fetchJsonWithFallback<{ recoveredData: string }>(
        [primaryRepo, backupRepo],
        collidingFile,
        2000,
        merged.fileSources[collidingFile],
      );

      expect(contentResult.ok).toBe(true);
      expect(contentResult.status).toBe(200);
      expect(contentResult.sourceId).toBe('repo-priority-2');
      expect(contentResult.data).toEqual({ recoveredData: 'from-backup' });
    });

    it('tries discovered fallbacks in deterministic order and succeeds when primary 404s, even if fallback would be excluded by standard filtering, while strictly respecting enabled: false', async () => {
      // Setup repositories:
      // repoPrimary supports only 'videos' (matches standard filtering for this path)
      const repoPrimary: RepositorySource = {
        id: 'repo-primary-video',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'videos_repo',
        path: 'videos',
        enabled: true,
        supportedTypes: ['videos'],
      };

      // repoBackup supports only 'fatwa'
      // Standard heuristic filtering for a video path will EXCLUDE repoBackup!
      const repoBackup: RepositorySource = {
        id: 'repo-backup-fatwa',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'fatwa_repo',
        path: 'fatawa',
        enabled: true,
        supportedTypes: ['fatwa'],
      };

      // repoDisabled is disabled (enabled: false)
      const repoDisabled: RepositorySource = {
        id: 'repo-disabled',
        provider: 'huggingface',
        owner: 'hozifa1',
        repo: 'disabled_repo',
        path: 'data',
        enabled: false,
        supportedTypes: ['videos'],
      };

      const testPath = 'sheikh/lecture.videos.json';

      // 1. Verify that standard filtering excludes repoBackup and repoDisabled
      const standardFiltered = filterReposForPath([repoPrimary, repoBackup, repoDisabled], testPath);
      expect(standardFiltered.map((r) => r.id)).toEqual(['repo-primary-video']);
      expect(standardFiltered.some((r) => r.id === 'repo-backup-fatwa')).toBe(false);
      expect(standardFiltered.some((r) => r.id === 'repo-disabled')).toBe(false);

      // 2. Discovered fallbacks from fetchMergedIndex containing both repoPrimary and repoBackup:
      const discoveredFallbacks = ['repo-primary-video', 'repo-backup-fatwa', 'repo-disabled'];

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        // Primary returns 404
        if (url.includes('videos_repo')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            text: () => Promise.resolve('Not Found'),
          });
        }
        // Discovered fallback returns 200 with data
        if (url.includes('fatwa_repo')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve(JSON.stringify([{ id: 'video-fatwa-1', title: 'شرح بالفيديو' }])),
          });
        }
        // Disabled repo must NEVER be queried
        if (url.includes('disabled_repo')) {
          return Promise.reject(new Error('Disabled repo should never be called'));
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      global.fetch = fetchMock;

      // 3. Fetch with discovered fallbacks:
      // repoPrimary is tried first -> 404 (single request, zero 404 retries)
      // repoBackup is tried second despite standard filter exclusion, and succeeds!
      const result = await fetchJsonWithFallback<{ id: string; title: string }[]>(
        [repoPrimary, repoBackup, repoDisabled],
        testPath,
        2000,
        discoveredFallbacks,
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.sourceId).toBe('repo-backup-fatwa');
      expect(result.data).toEqual([{ id: 'video-fatwa-1', title: 'شرح بالفيديو' }]);

      // Verify repoPrimary called exactly once
      expect(fetchMock.mock.calls.filter((c) => (c[0] as string).includes('videos_repo')).length).toBe(1);
      // Verify repoBackup called exactly once
      expect(fetchMock.mock.calls.filter((c) => (c[0] as string).includes('fatwa_repo')).length).toBe(1);
      // Verify repoDisabled NEVER called
      expect(fetchMock.mock.calls.some((c) => (c[0] as string).includes('disabled_repo'))).toBe(false);

      // 4. Prove that if repoBackup is disabled (enabled: false), it is strictly respected
      fetchMock.mockClear();
      const repoBackupDisabled = { ...repoBackup, enabled: false };

      const disabledResult = await fetchJsonWithFallback(
        [repoPrimary, repoBackupDisabled, repoDisabled],
        testPath,
        2000,
        discoveredFallbacks,
      );

      expect(disabledResult.ok).toBe(false);
      // Primary was tried and failed
      expect(fetchMock.mock.calls.filter((c) => (c[0] as string).includes('videos_repo')).length).toBe(1);
      // Backup was NOT called because enabled === false
      expect(fetchMock.mock.calls.some((c) => (c[0] as string).includes('fatwa_repo'))).toBe(false);
      // Disabled repo was NOT called
      expect(fetchMock.mock.calls.some((c) => (c[0] as string).includes('disabled_repo'))).toBe(false);
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
