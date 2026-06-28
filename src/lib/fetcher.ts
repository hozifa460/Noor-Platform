import type { IndexFile, RepositorySource } from './types';
import { fileUrl, candidateIndexUrls } from './repositories';

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

async function tryFetchJson<T>(
  url: string,
  timeoutMs?: number,
): Promise<{ data: T; status: number; lastModified?: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const data = (await res.json()) as T;
      return { data, status: res.status, lastModified: res.headers.get('last-modified') || undefined };
    } catch (err) {
      lastErr = err;
      // brief backoff before retry
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
): Promise<FetchResult<T>> {
  const enabled = repos.filter((r) => r.enabled !== false);
  let lastModified: string | undefined;
  let bestData: T | null = null;
  let bestSourceId: string | null = null;
  let lastErr: string | undefined;

  for (const repo of enabled) {
    const url = fileUrl(repo, filePath);
    try {
      const { data, status, lastModified: lm } = await tryFetchJson<T>(url, timeoutMs);
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
 * Deduplicates the merged file list.
 */
export async function fetchMergedIndex(
  repos: RepositorySource[],
  timeoutMs?: number,
): Promise<{
  files: string[];
  perRepo: { repoId: string; ok: boolean; fileCount: number; error?: string }[];
}> {
  const enabled = repos.filter((r) => r.enabled !== false);
  const seen = new Set<string>();
  const files: string[] = [];
  const perRepo: { repoId: string; ok: boolean; fileCount: number; error?: string }[] = [];

  await Promise.all(
    enabled.map(async (repo) => {
      try {
        // Try each candidate index URL in order until one returns valid JSON.
        // Most repos use <path>/index.json, but some use custom names like
        // fatawa_bibaz/fatawa_index.json.
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
            // Try next candidate URL.
          }
        }
        if (data === null) throw lastErr instanceof Error ? lastErr : new Error('All index URLs failed');
        const list = Array.isArray(data?.files) ? data.files : [];
        for (const f of list) {
          const cleaned = String(f).trim();
          if (!cleaned) continue;
          if (!seen.has(cleaned)) {
            seen.add(cleaned);
            files.push(cleaned);
          }
        }
        perRepo.push({ repoId: repo.id, ok: true, fileCount: list.length });
      } catch (err) {
        perRepo.push({
          repoId: repo.id,
          ok: false,
          fileCount: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  return { files, perRepo };
}

/**
 * Fetches a raw text resource (e.g. PDF, audio) with fallback across repos.
 * Returns the first successful response body as a Blob.
 */
export async function fetchBlobWithFallback(
  repos: RepositorySource[],
  filePath: string,
  timeoutMs?: number,
): Promise<Blob | null> {
  const enabled = repos.filter((r) => r.enabled !== false);
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
