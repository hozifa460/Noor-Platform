import type { IndexFile, RepositorySource } from '../types';
import { fileUrl, candidateIndexUrls, filterReposForPath } from './repositories';

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
 * @param repos Ordered list of repositories to try (GitHub first, then GitLab).
 * @param filePath Relative path inside the repo.
 */
export async function fetchJsonWithFallback<T>(
  repos: RepositorySource[],
  filePath: string,
  timeoutMs?: number,
  sourceRepoId?: string,
): Promise<FetchResult<T>> {
  const suitableRepos = filterReposForPath(repos, filePath);
  let enabled = suitableRepos.filter((r) => r.enabled !== false);

  // If a known source repository is specified, prioritize it at the front of the fallback chain
  if (sourceRepoId) {
    const preferredRepo = repos.find((r) => r.id === sourceRepoId && r.enabled !== false);
    if (preferredRepo) {
      enabled = [preferredRepo, ...enabled.filter((r) => r.id !== sourceRepoId)];
    }
  }

  let lastModified: string | undefined;
  let bestData: T | null = null;
  let bestSourceId: string | null = null;
  let lastErr: string | undefined;

  for (const repo of enabled) {
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
        // Try each candidate index URL in order until one returns valid JSON.
        const urls = candidateIndexUrls(repo);
        let data: IndexFile | null = null;
        let lastErr: unknown;
        for (const url of urls) {
          try {
            const result = await tryFetchJson<IndexFile>(url, timeoutMs);
            data = result.data;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (data === null) throw lastErr instanceof Error ? lastErr : new Error('All index URLs failed');
        let rawList: string[] = [];
        if (data && typeof data === 'object') {
          if (Array.isArray(data)) {
            // Either array of strings or array of Hugging Face tree objects
            rawList = data
              .map((item: unknown) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && 'path' in item) {
                  const node = item as { path: string; type?: string };
                  if (node.type === 'directory') return '';
                  return node.path;
                }
                return '';
              })
              .filter((p) => p && p.endsWith('.json'));
          } else if (Array.isArray((data as IndexFile).files)) {
            rawList = (data as IndexFile).files;
          }
        }
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
  sourceRepoId?: string,
): Promise<Blob | null> {
  const suitableRepos = filterReposForPath(repos, filePath);
  let enabled = suitableRepos.filter((r) => r.enabled !== false);

  if (sourceRepoId) {
    const preferredRepo = repos.find((r) => r.id === sourceRepoId && r.enabled !== false);
    if (preferredRepo) {
      enabled = [preferredRepo, ...enabled.filter((r) => r.id !== sourceRepoId)];
    }
  }

  for (const repo of enabled) {
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
