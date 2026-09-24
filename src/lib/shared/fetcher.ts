import type { IndexFile, RepositorySource } from '../types';
import {
  fileUrl,
  candidateIndexUrls,
  filterReposForPath,
  huggingfaceTreeUrl,
  isHuggingFaceTreeUrl,
  parseNextLink,
} from './repositories';

/**
 * Smart fetcher with retry, timeout, and automatic GitHub → GitLab mirror
 * fallback.
 *
 * Strategy per the spec:
 *   1. Try GitHub first.
 *   2. If unavailable, automatically switch to GitLab.
 *   3. If a file exists in both, use the latest version (handled by last-write
 *      comparison done by callers using ETag / Date headers).
 *   4. Detect repository failures automatically.
 */

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

/**
 * Custom error representing an HTTP response status.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message?: string,
  ) {
    super(message || `HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

export interface FetchResult<T> {
  data: T | null;
  ok: boolean;
  status: number;
  sourceId: string | null;
  error?: string;
  lastModified?: string;
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      // Allow cross-origin raw fetches; GitHub/GitLab set permissive CORS for raw.
      mode: 'cors',
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function tryFetchJson<T>(
  url: string,
  timeoutMs?: number,
): Promise<{ data: T; status: number; lastModified?: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
      if (!res.ok) {
        const error = new HttpError(res.status, url);
        // Do NOT retry non-transient 404 Not Found errors on the same URL.
        // Throw immediately so the caller can proceed to the fallback alternative without delay.
        if (res.status === 404) {
          throw error;
        }
        throw error;
      }

      const text = await res.text();
      let data: T;
      try {
        data = JSON.parse(text) as T;
      } catch {
        // Fallback: parse as line-delimited JSON (NDJSON)
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsed: unknown[] = [];
        for (const line of lines) {
          try {
            parsed.push(JSON.parse(line));
          } catch {
            /* skip malformed lines */
          }
        }
        if (parsed.length > 0) {
          data = parsed as unknown as T;
        } else {
          throw new Error(`Failed to parse JSON response from ${url}`);
        }
      }

      return { data, status: res.status, lastModified: res.headers.get('last-modified') || undefined };
    } catch (err) {
      lastErr = err;
      // Terminate retries immediately on 404 (Not Found)
      if (err instanceof HttpError && err.status === 404) {
        throw err;
      }
      // For transient errors (network errors, timeouts, 5xx, 429), retry with backoff
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Unknown fetch error');
}

/**
 * Fetches a single JSON file from the best available repository.
 *
 * Discovered candidates from fetchMergedIndex (sourceRepoIds) are tried first in deterministic
 * order without being disqualified by path heuristics, followed by any other suitable repositories.
 * Repositories with enabled: false are strictly respected and never queried.
 *
 * @param repos Ordered list of repositories to try.
 * @param filePath Relative path inside the repo.
 * @param timeoutMs Request timeout in milliseconds.
 * @param sourceRepoIds Discovered originating repository ID or ordered list of fallback repository IDs.
 */
export async function fetchJsonWithFallback<T>(
  repos: RepositorySource[],
  filePath: string,
  timeoutMs?: number,
  sourceRepoIds?: string | string[],
): Promise<FetchResult<T>> {
  const discoveredIds: string[] = Array.isArray(sourceRepoIds)
    ? sourceRepoIds
    : sourceRepoIds
      ? [sourceRepoIds]
      : [];

  const candidateRepos: RepositorySource[] = [];
  const seenRepoIds = new Set<string>();

  // 1. Try discovered & enabled sources in their deterministic priority order.
  // Do NOT exclude a source proven to contain the file because of heuristics/guessing from its name alone.
  for (const id of discoveredIds) {
    const repo = repos.find((r) => r.id === id);
    if (repo && repo.enabled !== false && !seenRepoIds.has(repo.id)) {
      seenRepoIds.add(repo.id);
      candidateRepos.push(repo);
    }
  }

  // 2. Then try other suitable repositories as further fallbacks, without duplicates.
  const suitableRepos = filterReposForPath(repos, filePath);
  for (const repo of suitableRepos) {
    if (repo.enabled !== false && !seenRepoIds.has(repo.id)) {
      seenRepoIds.add(repo.id);
      candidateRepos.push(repo);
    }
  }

  let lastModified: string | undefined;
  let bestData: T | null = null;
  let bestSourceId: string | null = null;
  let lastErr: string | undefined;

  for (const repo of candidateRepos) {
    const url = fileUrl(repo, filePath);
    try {
      const { data, lastModified: lm } = await tryFetchJson<T>(url, timeoutMs);
      // Prefer the most recently modified copy across mirrors.
      if (bestData === null || (lm && (!lastModified || lm > lastModified))) {
        bestData = data;
        bestSourceId = repo.id;
        lastModified = lm;
      }
      // If we have a copy from the primary, no need to check mirrors.
      if (repo.primary) break;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      // continue to next repo (mirror fallback)
    }
  }

  if (bestData !== null) {
    return { data: bestData, ok: true, status: 200, sourceId: bestSourceId!, lastModified };
  }
  return { data: null, ok: false, status: 0, sourceId: null, error: lastErr || 'All sources failed' };
}

/**
 * Maximum number of Tree API pages followed for a single directory listing.
 * Hugging Face returns 1,000 entries per page, so 5 pages caps a listing at
 * 5,000 entries while still covering realistically sized datasets.
 */
const MAX_TREE_PAGES = 5;

/**
 * Maximum number of directory listings issued for a single repository scan.
 * Keeps the global sync polite for repositories with tens of thousands of
 * nested book folders (e.g. `islamic_books/books/shamela_liberary`).
 */
const MAX_TREE_DIRECTORIES = 8;

/**
 * Maximum number of recursive pages followed before the cheap shallow scan
 * takes over. A recursive listing of a large nested dataset is dominated by
 * directory entries, so following many pages of it wastes requests that the
 * shallow scan resolves in one.
 */
const MAX_RECURSIVE_TREE_PAGES = 2;

/** A single entry from a Hugging Face Tree API listing. */
interface HfTreeEntry {
  path: string;
  type?: string;
}

/** Extracts JSON file paths from either a Hugging Face tree listing or an index payload. */
function extractJsonFilePaths(data: unknown): string[] {
  if (Array.isArray(data)) {
    // Either an array of strings or an array of Hugging Face tree objects
    return data
      .map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'path' in item) {
          const node = item as { path: string; type?: string };
          if (node.type === 'directory') return '';
          return typeof node.path === 'string' ? node.path : '';
        }
        return '';
      })
      .filter((p) => Boolean(p) && p.endsWith('.json'));
  }

  if (data && typeof data === 'object' && Array.isArray((data as IndexFile).files)) {
    return (data as IndexFile).files;
  }

  return [];
}

/**
 * Fetches one directory listing from the Hugging Face Tree API, following the
 * cursor pagination advertised in the `Link` response header.
 *
 * Without this loop a repository with more than 1,000 entries under a path
 * would be silently truncated to the first page.
 */
async function fetchTreeListing(
  url: string,
  timeoutMs?: number,
  maxPages: number = MAX_TREE_PAGES,
): Promise<HfTreeEntry[]> {
  const entries: HfTreeEntry[] = [];
  let nextUrl: string | null = url;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const currentUrl: string = nextUrl;
    pages += 1;
    const res = await fetchWithTimeout(currentUrl, { method: 'GET' }, timeoutMs);
    if (!res.ok) throw new HttpError(res.status, currentUrl);

    const raw = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse Tree API response from ${currentUrl}`);
    }
    if (!Array.isArray(data)) throw new Error(`Unexpected Tree API response from ${currentUrl}`);

    for (const item of data) {
      if (item && typeof item === 'object' && 'path' in item) {
        const node = item as HfTreeEntry;
        if (typeof node.path === 'string') entries.push({ path: node.path, type: node.type });
      }
    }

    nextUrl = parseNextLink(res.headers.get('link'));
  }

  return entries;
}

/**
 * Discovers JSON files for a tree-only repository.
 *
 * Strategy (adaptive and bounded):
 *  1. List the configured path recursively with pagination — cheap (a single
 *     request) and complete for datasets whose files fit in one page
 *     (e.g. `fatawaset/fatawa` → 37 files).
 *  2. If the recursive listing exposes no JSON files within the page budget,
 *     fall back to bounded non-recursive directory listings. This is what makes
 *     large nested datasets such as `islamic_books/books` discoverable: their
 *     recursive listing is dominated by tens of thousands of Shamela folders,
 *     while the actual book JSON files live directly under `books/`.
 */
async function discoverTreeFiles(repo: RepositorySource, timeoutMs?: number): Promise<string[]> {
  const basePath = (repo.path || '').replace(/^\/+|\/+$/g, '');

  // 1. Recursive listing (paginated, bounded so nested datasets cannot stall the sync)
  const recursiveEntries = await fetchTreeListing(
    huggingfaceTreeUrl(repo, basePath, { recursive: true }),
    timeoutMs,
    MAX_RECURSIVE_TREE_PAGES,
  );
  const recursiveFiles = extractJsonFilePaths(recursiveEntries);
  if (recursiveFiles.length > 0) return recursiveFiles;

  // 2. Bounded breadth-first scan of the directory levels beneath the path
  const visited = new Set<string>();
  const discovered = new Set<string>();
  const queue: string[] = [basePath];
  let listings = 0;

  while (queue.length > 0 && listings < MAX_TREE_DIRECTORIES) {
    const dir = queue.shift() as string;
    if (visited.has(dir)) continue;
    visited.add(dir);
    listings += 1;

    const entries = await fetchTreeListing(huggingfaceTreeUrl(repo, dir), timeoutMs);
    const subDirs: string[] = [];
    for (const entry of entries) {
      if (entry.type === 'directory') subDirs.push(entry.path);
      else if (entry.path.endsWith('.json')) discovered.add(entry.path);
    }

    // Only descend further while the scan has not discovered any JSON files yet.
    if (discovered.size === 0) queue.push(...subDirs);
  }

  return [...discovered];
}

/**
 * Resolves the file list of a single repository.
 *
 * Tree-only repositories (`indexMode: 'tree'`) never request a static
 * `${path}/index.json`, which is what produced 404 requests for tree-only
 * datasets. All other modes keep the approved candidate fallback ordering and
 * now follow Tree API cursor pagination instead of truncating at 1,000 entries.
 */
async function discoverRepoFiles(repo: RepositorySource, timeoutMs?: number): Promise<string[]> {
  if (repo.provider === 'huggingface' && repo.indexMode === 'tree') {
    return discoverTreeFiles(repo, timeoutMs);
  }

  const urls = candidateIndexUrls(repo);
  let lastErr: unknown;

  for (const url of urls) {
    try {
      if (repo.provider === 'huggingface' && isHuggingFaceTreeUrl(url)) {
        return extractJsonFilePaths(await fetchTreeListing(url, timeoutMs));
      }
      const result = await tryFetchJson<unknown>(url, timeoutMs);
      return extractJsonFilePaths(result.data);
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('All index URLs failed');
}

/**
 * Fetches and merges all index.json files from every enabled repository.
 * Deduplicates the merged file list, deterministically retains primary originating
 * repository associations according to approved repository order, and tracks fallback mirrors.
 */
export async function fetchMergedIndex(
  repos: RepositorySource[],
  timeoutMs?: number,
): Promise<{
  files: string[];
  perRepo: { repoId: string; ok: boolean; fileCount: number; error?: string }[];
  fileSources: Record<string, string>;
  fileFallbacks: Record<string, string[]>;
}> {
  const enabled = repos.filter((r) => r.enabled !== false);
  const seen = new Set<string>();
  const files: string[] = [];
  const fileSources: Record<string, string> = {};
  const fileFallbacks: Record<string, string[]> = {};
  const perRepo: { repoId: string; ok: boolean; fileCount: number; error?: string }[] = [];

  // 1. Fetch remote indexes concurrently while maintaining approved repository ordering
  const repoResults = await Promise.all(
    enabled.map(async (repo) => {
      try {
        // Resolve this repository's file list according to its explicit index mode.
        const rawList = await discoverRepoFiles(repo, timeoutMs);
        return { repo, ok: true, rawList, error: undefined };
      } catch (err) {
        return {
          repo,
          ok: false,
          rawList: [] as string[],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  // 2. Deterministically process results in the approved repository order (sequential)
  for (const res of repoResults) {
    perRepo.push({
      repoId: res.repo.id,
      ok: res.ok,
      fileCount: res.rawList.length,
      error: res.error,
    });

    if (!res.ok) continue;

    const subPath = (res.repo.path || '').replace(/^\/+|\/+$/g, '');
    for (const f of res.rawList) {
      const rawTrimmed = String(f).trim().replace(/^\/+/, '');
      if (!rawTrimmed) continue;

      let cleaned = rawTrimmed;
      // Normalize relative path if returned with repo subPath prefix
      if (subPath && (cleaned === subPath || cleaned.startsWith(`${subPath}/`))) {
        cleaned = cleaned.slice(subPath.length).replace(/^\/+/, '');
      }
      if (!cleaned) continue;

      // Track all candidate repos that provide this file as fallback mirrors
      if (!fileFallbacks[cleaned]) {
        fileFallbacks[cleaned] = [];
      }
      if (!fileFallbacks[cleaned].includes(res.repo.id)) {
        fileFallbacks[cleaned].push(res.repo.id);
      }

      // Deterministic primary origin according to approved repository priority:
      // The higher-priority repository claims the primary source.
      // Do NOT overwrite if already assigned by a preceding repository!
      if (!fileSources[cleaned]) {
        fileSources[cleaned] = res.repo.id;
      }

      if (rawTrimmed !== cleaned) {
        if (!fileFallbacks[rawTrimmed]) {
          fileFallbacks[rawTrimmed] = [];
        }
        if (!fileFallbacks[rawTrimmed].includes(res.repo.id)) {
          fileFallbacks[rawTrimmed].push(res.repo.id);
        }
        if (!fileSources[rawTrimmed]) {
          fileSources[rawTrimmed] = res.repo.id;
        }
      }

      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        files.push(cleaned);
      }
    }
  }

  return { files, perRepo, fileSources, fileFallbacks };
}

/**
 * Fetches a raw text resource (e.g. PDF, audio) with fallback across repos.
 * Returns the first successful response body as a Blob.
 */
export async function fetchBlobWithFallback(
  repos: RepositorySource[],
  filePath: string,
  timeoutMs?: number,
  sourceRepoIds?: string | string[],
): Promise<Blob | null> {
  const discoveredIds: string[] = Array.isArray(sourceRepoIds)
    ? sourceRepoIds
    : sourceRepoIds
      ? [sourceRepoIds]
      : [];

  const candidateRepos: RepositorySource[] = [];
  const seenRepoIds = new Set<string>();

  // 1. Try discovered & enabled sources in deterministic order
  for (const id of discoveredIds) {
    const repo = repos.find((r) => r.id === id);
    if (repo && repo.enabled !== false && !seenRepoIds.has(repo.id)) {
      seenRepoIds.add(repo.id);
      candidateRepos.push(repo);
    }
  }

  // 2. Then try other suitable repositories without duplicates
  const suitableRepos = filterReposForPath(repos, filePath);
  for (const repo of suitableRepos) {
    if (repo.enabled !== false && !seenRepoIds.has(repo.id)) {
      seenRepoIds.add(repo.id);
      candidateRepos.push(repo);
    }
  }

  for (const repo of candidateRepos) {
    try {
      const url = fileUrl(repo, filePath);
      const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
      if (res.ok) return await res.blob();
    } catch {
      // try next mirror
    }
  }
  return null;
}
