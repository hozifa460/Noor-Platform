'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLibraryStore } from '@/stores/library.store';
import { useSettingsStore } from '@/stores/settings.store';
import { loadRepositories } from '@/lib/repositories';
import { fetchMergedIndex, fetchJsonWithFallback } from '@/lib/fetcher';
import { normalizeContentFile, type NormalizeResult } from '@/lib/sheikh';
import type { MediaItem } from '@/lib/types';

// Module-level ref so multiple useLibrarySync() calls share the same lock.
const syncingRef = { current: false };

/**
 * Hook that drives the polite, lightweight background sync of index + content files.
 *
 * Performance Strategy:
 *   1. Load built-in radio and books immediately (0ms).
 *   2. Fetch lightweight index.json once.
 *   3. Ingest primary content files with gentle single-worker throttling
 *      so it NEVER hogs the user's internet bandwidth or CPU.
 *   4. Deduplicate and feed into the library store smoothly.
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
      // 1. Load built-in radios and books FIRST (instant, 0ms from /public/).
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

      // 2. Fetch remote repos with polite, non-blocking throttling
      const repos = loadRepositories();
      if (!repos || repos.length === 0) return;

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

      // Prioritize top 30 primary files to avoid consuming excessive bandwidth
      const queue = primaryFiles.slice(0, 35);
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

      // Gentle single-threaded sequential ingestion with micro-sleeps (Zero Bandwidth Hogging)
      for (const path of queue) {
        try {
          const res = await fetchJsonWithFallback<unknown>(repos, path, 4000);
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

            if (Date.now() - lastFlush > 300 || pendingItems.length >= 200) {
              flushBuffer();
            }
          }
        } catch {
          /* skip cleanly */
        }

        // Polite micro-delay (30ms) to leave bandwidth 100% free for user actions
        await new Promise((r) => setTimeout(r, 30));
      }

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

  // Background polling (relaxed)
  const autoSync = useSettingsStore((s) => s.autoSync);
  const syncIntervalMin = useSettingsStore((s) => s.syncIntervalMin);
  useEffect(() => {
    if (!autoSync) return;
    const intervalMs = Math.max(10, syncIntervalMin) * 60 * 1000;
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

/**
 * Lazy loads a specific archive file on-demand when the user clicks 'Load Archive' in Sheikh Profile.
 */
export async function loadArchiveFile(archivePath: string): Promise<MediaItem[]> {
  const repos = loadRepositories();
  try {
    const res = await fetchJsonWithFallback<unknown>(repos, archivePath, 6000);
    if (res.data !== null) {
      const { items, sheikhMeta } = normalizeContentFile(
        res.data,
        archivePath,
        res.sourceId || undefined
      );
      if (items.length > 0) {
        useLibraryStore.getState().addItems(items);
      }
      if (Object.keys(sheikhMeta).length > 0) {
        const meta = new Map(useLibraryStore.getState().sheikhMetaByFile);
        meta.set(archivePath, sheikhMeta);
        useLibraryStore.getState().setItems(useLibraryStore.getState().items, meta);
      }
      useLibraryStore.getState().markArchiveLoaded(archivePath);
      return items;
    }
  } catch (err) {
    console.warn('Failed to load archive file:', err);
  }
  return [];
}
