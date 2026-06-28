'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';
import { loadRepositories, fileUrl } from '@/lib/repositories';
import { fetchJsonWithFallback } from '@/lib/fetcher';
import { normalizeContentFile } from '@/lib/sheikh';

/**
 * Fatwa-specific store with PROGRESSIVE LOADING.
 *
 * Why a separate store?
 *   The library store holds 40K+ items at once. Re-rendering all of them on
 *   every keystroke of the fatwa search box would freeze the UI. This store
 *   keeps fatwa items outside of the React render tree until they're needed,
 *   and exposes only the visible slice (`fatwas.slice(0, visibleCount)`).
 *
 * Loading strategy (INSTANT-FIRST):
 *   1. On `startLoading()`, fetch the merged index.json to discover fatwa files.
 *   2. Do parallel HEAD requests to get each file's size (raw.githubusercontent.com
 *      and GitLab both return Content-Length).
 *   3. Sort files by size ASCENDING (smallest first).
 *   4. Load files SEQUENTIALLY (one at a time) — this guarantees the smallest
 *      file (typically 4MB, ~1800 items) finishes first and shows content
 *      within ~2-3 seconds. Larger files then stream in one by one.
 *   5. As each file finishes parsing, its items are appended to `fatwas` and
 *      the UI updates immediately.
 *
 * This approach trades total load time (sequential is slower than parallel)
 * for PERCEIVED performance — the user sees the first fatwa within seconds
 * of opening the page, instead of waiting for the largest file to finish.
 *
 * Search runs chunked to avoid blocking the main thread on 36K+ items.
 *
 * The store does NOT touch the library store. Fatwa items appear only on the
 * fatwa section view — they don't pollute sheikh profiles or the home rails.
 */

const PAGE_SIZE = 60;        // items revealed per "showMore"
const SEARCH_PAGE_SIZE = 40;
const SEARCH_CHUNK = 4000;   // items scanned per tick when running a search
const SIZE_PROBE_TIMEOUT_MS = 5000; // HEAD requests should be fast

interface FatwaState {
  /** All fatwa items loaded so far (NOT in library store). */
  fatwas: MediaItem[];
  /** Set of source file paths already fetched. */
  loadedFiles: Set<string>;
  /** True while we're still pulling fatwa files from the repos. */
  loading: boolean;
  /** True once every fatwa file has been fetched (or there are none). */
  allLoaded: boolean;
  /** How many items are currently revealed in the UI. */
  visibleCount: number;

  /** Search state */
  searchQuery: string;
  searchResults: MediaItem[];
  searchVisibleCount: number;
  searching: boolean;

  /** Actions */
  startLoading: () => Promise<void>;
  showMore: () => void;
  showMoreSearch: () => void;
  search: (q: string) => Promise<void>;
  clearSearch: () => void;
  reset: () => void;
}

export const useFatwaStore = create<FatwaState>((set, get) => ({
  fatwas: [],
  loadedFiles: new Set(),
  loading: false,
  allLoaded: false,
  visibleCount: PAGE_SIZE,

  searchQuery: '',
  searchResults: [],
  searchVisibleCount: SEARCH_PAGE_SIZE,
  searching: false,

  startLoading: async () => {
    if (get().loading || get().allLoaded) return;
    set({ loading: true });

    try {
      const repos = loadRepositories();
      // Use the merged index to find fatwa-classified files.
      const { files } = await fetchMergedIndexForFatwa(repos);

      // Filter to fatwa files only. The classifier is the source of truth.
      const { classifyFile } = await import('@/lib/classifier');
      const fatwaFiles = files.filter((f) => classifyFile(f) === 'fatwa');

      if (fatwaFiles.length === 0) {
        set({ loading: false, allLoaded: true });
        return;
      }

      // Probe each file's size via HEAD requests (parallel — fast).
      // Then sort by size ascending so the smallest file loads first.
      const sized = await Promise.all(
        fatwaFiles.map(async (path) => {
          const size = await probeFileSize(repos, path);
          return { path, size };
        }),
      );
      // Files with unknown size go last; otherwise sort smallest first.
      sized.sort((a, b) => {
        const sa = a.size ?? Number.MAX_SAFE_INTEGER;
        const sb = b.size ?? Number.MAX_SAFE_INTEGER;
        return sa - sb;
      });

      // Load files SEQUENTIALLY (one at a time). This ensures:
      //   - The smallest file loads first (typically ~4MB → 2-3 seconds)
      //   - Items appear ASAP, before larger files start downloading
      //   - The UI stays responsive (no parallel JSON.parse competing)
      for (const { path } of sized) {
        if (get().loadedFiles.has(path)) continue;
        try {
          // Fatwa files can be very large (up to 24MB). Use a 120s timeout
          // so we don't fail on slow connections.
          const res = await fetchJsonWithFallback<unknown>(repos, path, 120_000);
          if (res.data !== null) {
            const { items } = normalizeContentFile(res.data, path, res.sourceId || undefined);
            const fatwaItems = items.filter((i) => i.section === 'fatwa');
            if (fatwaItems.length > 0) {
              const newLoaded = new Set(get().loadedFiles);
              newLoaded.add(path);
              // Append new items, dedupe by id.
              const existing = new Set(get().fatwas.map((i) => i.id));
              const merged = [...get().fatwas, ...fatwaItems.filter((i) => !existing.has(i.id))];
              set({
                fatwas: merged,
                loadedFiles: newLoaded,
                visibleCount: Math.min(merged.length, Math.max(get().visibleCount, PAGE_SIZE)),
              });
            } else {
              const newLoaded = new Set(get().loadedFiles);
              newLoaded.add(path);
              set({ loadedFiles: newLoaded });
            }
          }
        } catch {
          // Skip failed file; mirror fallback already tried inside fetcher.
        }
      }
      set({ loading: false, allLoaded: true });
    } catch {
      set({ loading: false, allLoaded: true });
    }
  },

  showMore: () =>
    set((s) => ({
      visibleCount: Math.min(s.fatwas.length, s.visibleCount + PAGE_SIZE),
    })),

  showMoreSearch: () =>
    set((s) => ({
      searchVisibleCount: Math.min(s.searchResults.length, s.searchVisibleCount + SEARCH_PAGE_SIZE),
    })),

  search: async (q: string) => {
    const query = q.trim().toLowerCase();
    set({
      searchQuery: q.trim(),
      searchResults: [],
      searchVisibleCount: SEARCH_PAGE_SIZE,
      searching: true,
    });
    if (!query) {
      set({ searching: false });
      return;
    }

    // Chunked search to avoid blocking the main thread on 36K+ items.
    // We scan SEARCH_CHUNK items per tick, then yield to the event loop.
    const all = get().fatwas;
    const matches: MediaItem[] = [];
    let i = 0;
    while (i < all.length) {
      const end = Math.min(i + SEARCH_CHUNK, all.length);
      for (let j = i; j < end; j++) {
        const item = all[j];
        // Check title, subtitle, description, sheikhName, groupTitle, tags, answer.
        // Use simple `includes` — much faster than RegExp for short strings.
        if (
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.sheikhName && item.sheikhName.toLowerCase().includes(query)) ||
          (item.groupTitle && item.groupTitle.toLowerCase().includes(query)) ||
          (item.answer && item.answer.toLowerCase().includes(query)) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)))
        ) {
          matches.push(item);
        }
      }
      i = end;
      // Update progressively so users see results stream in.
      set({ searchResults: [...matches] });
      // Yield to the event loop so the UI can paint.
      await new Promise((r) => setTimeout(r, 0));
    }
    set({ searching: false });
  },

  clearSearch: () =>
    set({
      searchQuery: '',
      searchResults: [],
      searchVisibleCount: SEARCH_PAGE_SIZE,
      searching: false,
    }),

  reset: () =>
    set({
      fatwas: [],
      loadedFiles: new Set(),
      loading: false,
      allLoaded: false,
      visibleCount: PAGE_SIZE,
      searchQuery: '',
      searchResults: [],
      searchVisibleCount: SEARCH_PAGE_SIZE,
      searching: false,
    }),
}));

/**
 * Helper: fetch the merged index.json from all repos and return the union
 * of file paths. Mirrors `fetchMergedIndex` in the fetcher but is local to
 * avoid a circular import when the fetcher pulls from `useLibraryStore`.
 */
async function fetchMergedIndexForFatwa(
  repos: ReturnType<typeof loadRepositories>,
): Promise<{ files: string[] }> {
  const { fetchMergedIndex } = await import('@/lib/fetcher');
  const result = await fetchMergedIndex(repos);
  return { files: result.files };
}

/**
 * Probe the size of a file by issuing a HEAD request to each enabled repo
 * until one succeeds with a Content-Length header.
 *
 * Used to sort fatwa files by size (smallest first) so the smallest file
 * loads first and shows content ASAP.
 *
 * Returns undefined if the size could not be determined (e.g. all repos
 * returned 404 or no Content-Length header).
 */
async function probeFileSize(
  repos: ReturnType<typeof loadRepositories>,
  filePath: string,
): Promise<number | undefined> {
  const enabled = repos.filter((r) => r.enabled !== false);
  for (const repo of enabled) {
    try {
      const url = fileUrl(repo, filePath);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SIZE_PROBE_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'cors',
        });
        const len = res.headers.get('content-length');
        if (len) {
          const n = parseInt(len, 10);
          if (!isNaN(n) && n > 0) return n;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Try next repo.
    }
  }
  return undefined;
}
