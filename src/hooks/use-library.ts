'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLibraryStore } from '@/stores/library.store';
import { useSettingsStore } from '@/stores/settings.store';
import { loadRepositories } from '@/lib/repositories';
import { fetchMergedIndex, fetchJsonWithFallback } from '@/lib/fetcher';
import { normalizeContentFile, type NormalizeResult } from '@/lib/sheikh';
import type { IndexFile, MediaItem } from '@/lib/types';

// Module-level ref so multiple useLibrarySync() calls share the same lock.
// Without this, each component that calls useLibrarySync() gets its own ref
// and triggers a separate sync — causing duplicate fetches.
const syncingRef = { current: false };

/**
 * Hook that drives the background sync of index + content files.
 *
 * Strategy:
 *   1. Fetch and merge index.json from every enabled repository
 *      (GitHub first, GitLab as mirror).
 *   2. For every file path in the merged list, fetch the JSON content
 *      from any repository that has it, with mirror fallback.
 *   3. Normalize every file into MediaItem records (supports both flat
 *      and nested items[]/subItems[] structures).
 *   4. Deduplicate and feed into the library store.
 */
export function useLibrarySync() {
  const queryClient = useQueryClient();
  const setItems = useLibraryStore((s) => s.setItems);
  const setSyncing = useLibraryStore((s) => s.setSyncing);
  const setRepoStatus = useLibraryStore((s) => s.setRepoStatus);
  const setLastSync = useLibraryStore((s) => s.setLastSync);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      // Load built-in radios and books FIRST (instant, from /public/).
      // This ensures they appear immediately while repos are still syncing.
      useLibraryStore.getState().reset();

      try {
        const radioRes = await fetch('/radio/islamic_radios.json');
        if (radioRes.ok) {
          const radioData = await radioRes.json();
          const { items: radioItems } = normalizeContentFile(
            radioData, 'islamic_radios/radio.json', 'builtin',
          );
          if (radioItems.length > 0) useLibraryStore.getState().addItems(radioItems);
        }
      } catch { /* non-critical */ }

      try {
        const booksRes = await fetch('/books/islamic_books.json');
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          const { items: bookItems } = normalizeContentFile(
            booksData, 'islamic_books/books.json', 'builtin',
          );
          if (bookItems.length > 0) useLibraryStore.getState().addItems(bookItems);
        }
      } catch { /* non-critical */ }
      const repos = loadRepositories();
      const { files, perRepo } = await fetchMergedIndex(repos);
      setRepoStatus(perRepo);

      // Split files into:
      //   - primaryFiles: loaded eagerly (everything except .archive.json)
      //   - archiveFiles: stored in the library store but NOT loaded here.
      //     They are loaded lazily when the user clicks "Load older videos"
      //     on a sheikh's section.
      const primaryFiles: string[] = [];
      const archiveFiles: string[] = [];
      for (const f of files) {
        if (/\.archive\.json$/i.test(f)) {
          archiveFiles.push(f);
        } else {
          primaryFiles.push(f);
        }
      }
      // Register archive file paths so the UI can discover them per-sheikh.
      useLibraryStore.getState().setArchiveFiles(archiveFiles);

      // Reset was already done above (before loading radios/books).
      // Now fetch each primary file in parallel.
      // INCREMENTAL: each file's items are added to the store as soon as
      // they're parsed, so the UI fills in progressively instead of waiting
      // for all files to finish.
      const CONCURRENCY = 6;
      const sheikhMetaByFile = new Map<string, NormalizeResult['sheikhMeta']>();
      const queue = [...primaryFiles];
      const workers: Promise<void>[] = [];

      for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(
          (async () => {
            while (queue.length > 0) {
              const path = queue.shift();
              if (!path) break;
              try {
                const res = await fetchJsonWithFallback<unknown>(repos, path);
                if (res.data !== null) {
                  const { items, sheikhMeta } = normalizeContentFile(res.data, path, res.sourceId || undefined);
                  if (items.length > 0) {
                    // Add items to the store immediately — UI updates per file.
                    useLibraryStore.getState().addItems(items);
                  }
                  if (Object.keys(sheikhMeta).length > 0) {
                    sheikhMetaByFile.set(path, sheikhMeta);
                    // Apply metadata incrementally too so sheikh names/emojis
                    // appear as soon as their file is parsed.
                    const meta = new Map(useLibraryStore.getState().sheikhMetaByFile);
                    meta.set(path, sheikhMeta);
                    useLibraryStore.getState().setItems(
                      useLibraryStore.getState().items,
                      meta,
                    );
                  }
                }
              } catch {
                // Skip failed file; mirror fallback already tried inside.
              }
            }
          })(),
        );
      }
      await Promise.all(workers);

      // Radios and books were already loaded at the start of sync.
      setLastSync(Date.now());
      // Invalidate derived queries.
      queryClient.invalidateQueries({ queryKey: ['library'] });
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [setSyncing, setRepoStatus, setLastSync, queryClient]);

  // Initial sync on mount.
  useEffect(() => {
    sync();
  }, [sync]);

  // Background polling.
  const autoSync = useSettingsStore((s) => s.autoSync);
  const syncIntervalMin = useSettingsStore((s) => s.syncIntervalMin);
  useEffect(() => {
    if (!autoSync) return;
    const intervalMs = Math.max(1, syncIntervalMin) * 60 * 1000;
    const id = setInterval(() => {
      sync();
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoSync, syncIntervalMin, sync]);

  return { sync };
}

/** Convenience hook for components that just need to know "is the library loaded". */
export function useLibraryReady(): boolean {
  return useLibraryStore((s) => s.items.length > 0);
}

/** React Query wrapper around the index fetch (for refetching on demand). */
export function useIndexQuery() {
  return useQuery({
    queryKey: ['library', 'index'],
    queryFn: async () => {
      const repos = loadRepositories();
      const { files, perRepo } = await fetchMergedIndex(repos);
      return { files, perRepo, ok: perRepo.some((p) => p.ok) };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** Used by callers that need to fetch a single file outside the sync loop. */
export async function fetchSingleFile(path: string): Promise<{ data: unknown; ok: boolean }> {
  const repos = loadRepositories();
  const res = await fetchJsonWithFallback<IndexFile>(repos, path);
  return { data: res.data, ok: res.ok };
}

/**
 * Lazily loads an archive file (e.g. `[name].videos.archive.json`) and
 * merges its items into the library store. Called when the user clicks
 * "Load older videos" on a sheikh's section.
 *
 * Returns the list of newly loaded MediaItems (already merged into the
 * store), or an empty array if the file could not be loaded.
 */
export async function loadArchiveFile(
  filePath: string,
): Promise<MediaItem[]> {
  const repos = loadRepositories();
  const res = await fetchJsonWithFallback<unknown>(repos, filePath);
  if (res.data === null) return [];

  const { items, sheikhMeta } = normalizeContentFile(
    res.data,
    filePath,
    res.sourceId || undefined,
  );

  // Merge into the library store + apply sheikh metadata.
  const store = useLibraryStore.getState();
  store.addItems(items);
  if (Object.keys(sheikhMeta).length > 0) {
    // The store already tracks sheikhMetaByFile from the initial sync;
    // we just add this file's metadata to the map and rebuild sheikhs.
    const meta = new Map(store.sheikhMetaByFile);
    meta.set(filePath, sheikhMeta);
    // Trigger a rebuild by calling setItems with the current items + new meta.
    store.setItems(store.items, meta);
  }

  // Mark this archive as loaded so the UI can hide the "Load older" button.
  store.markArchiveLoaded(filePath);

  return items;
}
