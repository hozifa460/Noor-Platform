'use client';

import { create } from 'zustand';
import type { MediaItem, Sheikh } from '@/lib/types';
import { buildSheikhs, dedupeItems, type NormalizeResult } from '@/lib/sheikh/sheikh';
import { arabicSearchMatch, arabicSearchScore } from '@/lib/arabic/normalizer';

interface LibraryState {
  /** All loaded media items (merged + deduplicated). */
  items: MediaItem[];
  /** Sheikhs keyed by id. */
  sheikhs: Map<string, Sheikh>;
  /** Last sync timestamp. */
  lastSync: number | null;
  /** True while a sync is in progress. */
  syncing: boolean;
  /** Per-repo status from latest index fetch. */
  repoStatus: { repoId: string; ok: boolean; fileCount: number; error?: string }[];
  /** Set of file paths that were merged into the library. */
  knownFiles: string[];
  /** Per-file sheikh metadata (from real data files with title/emoji/gradient). */
  sheikhMetaByFile: Map<string, NormalizeResult['sheikhMeta']>;
  /**
   * Cached array of all sheikhs (kept in sync with `sheikhs` map).
   * Returns the same reference until the map changes — avoids infinite
   * re-renders when components call `allSheikhs()` in selectors.
   */
  sheikhsArray: Sheikh[];
  /**
   * Archive file paths discovered in index.json (files ending with
   * `.archive.json`). These are NOT loaded eagerly — they are fetched
   * lazily when the user clicks "Load older videos" on a sheikh section.
   */
  archiveFiles: string[];
  /** Set of archive file paths that have already been lazy-loaded. */
  loadedArchives: Set<string>;

  setItems: (items: MediaItem[], sheikhMetaByFile?: Map<string, NormalizeResult['sheikhMeta']>) => void;
  addItems: (items: MediaItem[]) => void;
  addItemsBatch: (items: MediaItem[]) => void;
  setSyncing: (v: boolean) => void;
  setRepoStatus: (s: LibraryState['repoStatus']) => void;
  setLastSync: (t: number) => void;
  /** Register the list of archive files discovered during sync. */
  setArchiveFiles: (files: string[]) => void;
  /** Mark an archive file as lazy-loaded (hide its "Load older" button). */
  markArchiveLoaded: (filePath: string) => void;
  /** Returns archive files that belong to a given sheikh id. */
  archivesForSheikh: (sheikhId: string) => string[];
  /** Returns true if an archive file has been lazy-loaded. */
  isArchiveLoaded: (filePath: string) => boolean;
  /** Returns true if a newly-discovered file should be loaded. */
  shouldLoadFile: (path: string) => boolean;
  /** Returns items filtered by section. */
  getBySection: (section: MediaItem['section']) => MediaItem[];
  /** Returns a sheikh by id. */
  getSheikh: (id: string) => Sheikh | undefined;
  /** Returns all sheikhs as an array (cached reference). */
  allSheikhs: () => Sheikh[];
  /** High performance Arabic search with diacritics removal and ranking. */
  search: (query: string) => MediaItem[];
  reset: () => void;
}

// In-memory ID set for fast O(1) membership check during active ingestion
const globalItemIdSet = new Set<string>();

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  sheikhs: new Map(),
  lastSync: null,
  syncing: false,
  repoStatus: [],
  knownFiles: [],
  sheikhMetaByFile: new Map(),
  sheikhsArray: [],
  archiveFiles: [],
  loadedArchives: new Set(),

  setItems: (items, sheikhMetaByFile) => {
    const deduped = dedupeItems(items);
    globalItemIdSet.clear();
    for (const it of deduped) {
      globalItemIdSet.add(it.id);
    }
    const meta = sheikhMetaByFile || get().sheikhMetaByFile;
    const sheikhs = buildSheikhs(deduped, meta);
    const known = Array.from(new Set(deduped.map((i) => i.sourceFile).filter(Boolean) as string[]));

    set({
      items: deduped,
      sheikhs,
      sheikhsArray: Array.from(sheikhs.values()),
      knownFiles: known,
      sheikhMetaByFile: meta,
    });
  },

  addItems: (newItems) => {
    if (!newItems || newItems.length === 0) return;

    // Fast O(1) filter for unseen items
    const toAdd: MediaItem[] = [];
    for (const item of newItems) {
      if (!globalItemIdSet.has(item.id)) {
        globalItemIdSet.add(item.id);
        toAdd.push(item);
      }
    }

    if (toAdd.length === 0) return;

    const currentItems = get().items;
    const merged = currentItems.concat(toAdd);
    const meta = get().sheikhMetaByFile;
    const sheikhs = buildSheikhs(merged, meta);
    const known = Array.from(new Set(merged.map((i) => i.sourceFile).filter(Boolean) as string[]));

    set({
      items: merged,
      sheikhs,
      sheikhsArray: Array.from(sheikhs.values()),
      knownFiles: known,
    });
  },

  addItemsBatch: (newItems) => {
    get().addItems(newItems);
  },

  setSyncing: (syncing) => set({ syncing }),
  setRepoStatus: (repoStatus) => set({ repoStatus }),
  setLastSync: (lastSync) => set({ lastSync }),

  setArchiveFiles: (files) => set({ archiveFiles: files, loadedArchives: new Set() }),

  markArchiveLoaded: (filePath) =>
    set((s) => {
      const next = new Set(s.loadedArchives);
      next.add(filePath);
      return { loadedArchives: next };
    }),

  archivesForSheikh: (sheikhId) =>
    get().archiveFiles.filter((f) => f.startsWith(`${sheikhId}/`)),

  isArchiveLoaded: (filePath) => get().loadedArchives.has(filePath),

  shouldLoadFile: (path) => !get().knownFiles.includes(path),

  getBySection: (section) => get().items.filter((i) => i.section === section),

  getSheikh: (id) => get().sheikhs.get(id),

  allSheikhs: () => get().sheikhsArray,

  search: (query) => {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const items = get().items;
    const matches: { item: MediaItem; score: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const targetText = `${it.title} ${it.subtitle || ''} ${it.sheikhName || ''} ${it.groupTitle || ''} ${it.description || ''} ${(it.tags || []).join(' ')}`;

      if (arabicSearchMatch(targetText, q)) {
        const titleScore = arabicSearchScore(it.title, q);
        const sheikhScore = arabicSearchScore(it.sheikhName, q);
        const score = titleScore * 2 + sheikhScore;
        matches.push({ item: it, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.map((m) => m.item);
  },

  reset: () => {
    globalItemIdSet.clear();
    set({
      items: [],
      sheikhs: new Map(),
      sheikhsArray: [],
      lastSync: null,
      knownFiles: [],
      sheikhMetaByFile: new Map(),
      archiveFiles: [],
      loadedArchives: new Set(),
    });
  },
}));
