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
const syncingRef = { current: false };

/**
 * Hook that drives the background sync of index + content files.
 *
 * Strategy (High-Performance Batched Ingestion):
 *   1. Fetch and merge index.json from every enabled repository.
 *   2. Load built-in radio and books immediately.
 *   3. Fetch content files with controlled concurrency.
 *   4. Buffer items in a fast queue and commit in smooth UI batches.
 *   5. Deduplicate and feed into the library store without freezing main thread.
 */
export function useLibrarySync() {
  const queryClient = useQueryClient();
  const setSyncing = useLibraryStore((s) => s.setSyncing);
  const setRepoStatus = useLibraryStore((s) => s.setRepoStatus);
  const setLastSync = useLibraryStore((s) => s.setLastSync);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      // Load built-in radios and books FIRST (instant, from /public/).
      useLibraryStore.getState().reset();

      try {
        const radioRes = await fetch('/radio/islamic_radios.json');
        if (radioRes.ok) {
          const radioData = await radioRes.json();
          const { items: radioItems } = normalizeContentFile(
            radioData,
            'islamic_radios/radio.json',
            'builtin'
          );
          if (radioItems.length > 0) useLibraryStore.getState().addItems(radioItems);
        }
      } catch {
        /* non-critical */
      }

      try {
        const booksRes = await fetch('/books/islamic_books.json');
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          const { items: bookItems } = normalizeContentFile(
            booksData,
            'islamic_books/books.json',
            'builtin'
          );
          if (bookItems.length > 0) useLibraryStore.getState().addItems(bookItems);
        }
      } catch {
        /* non-critical */
      }

      const repos = loadRepositories();
      const { files, perRepo } = await fetchMergedIndex(repos);
      setRepoStatus(perRepo);

      const primaryFiles: string[] = [];
      const archiveFiles: string[] = [];
      for (const f of files) {
        if (/\.archive\.json$/i.test(f)) {
          archiveFiles.push(f);
        } else {
          primaryFiles.push(f);
        }
      }
      useLibraryStore.getState().setArchiveFiles(archiveFiles);

      // Concurrently fetch and buffer items
      const CONCURRENCY = 6;
      const queue = [...primaryFiles];
      const sheikhMetaByFile = new Map<string, NormalizeResult['sheikhMeta']>();

      let pendingItems: MediaItem[] = [];
      let lastFlush = Date.now();

      const flushBuffer = () => {
        if (pendingItems.length > 0) {
          useLibraryStore.getState().addItems(pendingItems);
          pendingItems = [];
          lastFlush = Date.now();
        }
      };

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
                  const { items, sheikhMeta } = normalizeContentFile(
                    res.data,
                    path,
                    res.sourceId || undefined
                  );
                  if (items.length > 0) {
                    pendingItems.push(...items);
                  }
                  if (Object.keys(sheikhMeta).length > 0) {
                    sheikhMetaByFile.set(path, sheikhMeta);
                  }

                  // Flush in batches every 200ms or when buffer has 1000+ items
                  if (Date.now() - lastFlush > 200 || pendingItems.length >= 1000) {
                    flushBuffer();
                  }
                }
              } catch {
                // Skip failed file; mirror fallback already attempted
              }
            }
          })()
        );
      }

      await Promise.all(workers);
      // Final flush
      flushBuffer();

      // Apply metadata to library
      if (sheikhMetaByFile.size > 0) {
        const meta = new Map(useLibraryStore.getState().sheikhMetaByFile);
        for (const [k, v] of sheikhMetaByFile.entries()) {
          meta.set(k, v);
        }
        useLibraryStore.getState().setItems(useLibraryStore.getState().items, meta);
      }

      setLastSync(Date.now());
      queryClient.invalidateQueries({ queryKey: ['library'] });
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [setSyncing, setRepoStatus, setLastSync, queryClient]);

  // Initial sync on mount
  useEffect(() => {
    sync();
  }, [sync]);

  // Background polling
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
 * merges its items into the library store.
 */
export async function loadArchiveFile(filePath: string): Promise<MediaItem[]> {
  const repos = loadRepositories();
  const res = await fetchJsonWithFallback<unknown>(repos, filePath);
  if (res.data === null) return [];

  const { items, sheikhMeta } = normalizeContentFile(
    res.data,
    filePath,
    res.sourceId || undefined
  );

  const store = useLibraryStore.getState();
  store.addItems(items);
  if (Object.keys(sheikhMeta).length > 0) {
    const meta = new Map(store.sheikhMetaByFile);
    meta.set(filePath, sheikhMeta);
    store.setItems(store.items, meta);
  }

  store.markArchiveLoaded(filePath);
  return items;
}
