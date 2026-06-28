'use client';

import { create } from 'zustand';
import type { MediaItem, Sheikh } from '@/lib/types';
import { buildSheikhs, dedupeItems, type NormalizeResult } from '@/lib/sheikh';

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
  /** Search items by query. */
  search: (query: string) => MediaItem[];
  reset: () => void;
}

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
    const meta = sheikhMetaByFile || get().sheikhMetaByFile;
    const sheikhs = buildSheikhs(deduped, meta);
    set({
      items: deduped,
      sheikhs,
      sheikhsArray: Array.from(sheikhs.values()),
      knownFiles: Array.from(new Set(deduped.map((i) => i.sourceFile).filter(Boolean) as string[])),
      sheikhMetaByFile: meta,
    });
  },

  addItems: (newItems) => {
    const merged = dedupeItems([...get().items, ...newItems]);
    const sheikhs = buildSheikhs(merged, get().sheikhMetaByFile);
    set({ items: merged, sheikhs, sheikhsArray: Array.from(sheikhs.values()) });
  },

  setSyncing: (syncing) => set({ syncing }),
  setRepoStatus: (repoStatus) => set({ repoStatus }),
  setLastSync: (lastSync) => set({ lastSync }),

  setArchiveFiles: (files) =>
    set({ archiveFiles: files, loadedArchives: new Set() }),

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
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return get().items.filter((i) =>
      [i.title, i.subtitle, i.description, i.sheikhName, i.groupTitle, ...(i.tags || [])]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  },

  reset: () => set({ items: [], sheikhs: new Map(), sheikhsArray: [], lastSync: null, knownFiles: [], sheikhMetaByFile: new Map(), archiveFiles: [], loadedArchives: new Set() }),
}));
