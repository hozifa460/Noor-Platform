'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';
import { type FatwaIndexItem } from '@/lib/fatwa/index-data';
import { microShardEngine } from '@/lib/shared/micro-shard-engine';
import { normalizeArabic } from '@/lib/arabic/normalizer';
import { scholarFilterQuery } from '@/lib/fatwa/scholar-filter';
import {
  loadCategory,
  isCategoryLoaded,
  BROWSE_TOTALS,
  type BrowseItem,
} from '@/lib/fatwa/browse';

interface FatwaState {
  fatwas: MediaItem[];
  searchResults: MediaItem[];
  /** Full category browse list (from fatwa_browse indexes) — the real library. */
  browseItems: MediaItem[];
  loading: boolean;
  searching: boolean;
  browsingCategory: boolean;
  initialized: boolean;
  selectedCategory: string;
  selectedScholar: string;
  searchQuery: string;
  /** Honest totals for the hero counter (real dataset size, not sample size). */
  totalCount: number;

  // Actions
  startLoading: () => Promise<void>;
  setSelectedCategory: (cat: string) => void;
  setSelectedScholar: (sch: string) => void;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
  getFilteredFatwas: () => MediaItem[];
  reset: () => void;
}

let searchDebounceTimer: NodeJS.Timeout | null = null;

/** In-memory category browse cache shared across store instances. */
const browseItemsCache = new Map<string, BrowseItem[]>();

function browseToMediaItem(b: BrowseItem): MediaItem {
  return {
    id: b.id,
    title: b.title,
    description: '', // real Q/A streams via fatwa-answers on expand
    sheikhName: b.scholar,
    section: 'fatwa',
    tags: [],
    audioUrl: b.hasAudio ? '__has_audio__' : undefined,
  } as MediaItem;
}

export const useFatwaStore = create<FatwaState>((set, get) => ({
  fatwas: [],
  searchResults: [],
  browseItems: [],
  loading: false,
  searching: false,
  browsingCategory: false,
  initialized: false,
  selectedCategory: 'all',
  selectedScholar: 'all',
  searchQuery: '',
  totalCount: BROWSE_TOTALS.all,

  setSelectedCategory: (selectedCategory) => {
    set({ selectedCategory });
    const state = get();
    if (state.searchQuery.trim()) {
      state.setSearchQuery(state.searchQuery);
    } else {
      // Phase 3: load the FULL category index (all items, not the showcase subset)
      void loadFullCategory(selectedCategory, state.selectedScholar);
    }
  },

  setSelectedScholar: (selectedScholar) => {
    set({ selectedScholar });
    const state = get();
    if (state.searchQuery.trim()) {
      state.setSearchQuery(state.searchQuery);
    } else {
      void loadFullCategory(state.selectedCategory, selectedScholar);
    }
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const q = searchQuery.trim();
    if (!q) {
      set({ searchResults: [], searching: false });
      return;
    }

    // BANDWIDTH PRIORITY: a live search aborts any in-progress bulk browse
    // loading so the small shard requests get the full connection.
    cancelBrowseLoading();

    set({ searching: true });

    searchDebounceTimer = setTimeout(async () => {
      const { selectedCategory, selectedScholar } = get();
      try {
        const results = await microShardEngine.search(q, selectedCategory, selectedScholar, 60);
        const mediaResults = results.map((r) => indexItemToMediaItem(r));
        set({ searchResults: mediaResults, searching: false });
      } catch {
        set({ searching: false });
      }
    }, 150);
  },

  startLoading: async () => {
    if (get().initialized) return;
    set({ loading: true });

    try {
      // 1. Ultra-lightweight initial showcase load (~93KB)
      const showcase = await microShardEngine.getShowcase();
      const seedMediaItems = showcase.map((item) => indexItemToMediaItem(item));

      set({
        fatwas: seedMediaItems,
        loading: false,
        initialized: true,
        totalCount: BROWSE_TOTALS[get().selectedCategory] ?? BROWSE_TOTALS.all,
      });
      // NOTE: no background preloading of the 33MB browse indexes anymore.
      // They stream lazily ONLY when the user actually browses (category click
      // or scrolling the "all" view) — so search requests never compete with
      // a bulk download for bandwidth, especially on phones.
    } catch {
      set({ loading: false, initialized: true });
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [], searching: false });
    // Lazy: do NOT auto-start the 33MB bulk browse load on clearing search.
    // The UI falls back to the initial showcase; the full category streams
    // only when the user explicitly browses (category click / scroll sentinel).
  },

  getFilteredFatwas: () => {
    const { selectedCategory, selectedScholar, searchQuery, searchResults, fatwas, browseItems } =
      get();

    if (searchQuery.trim()) {
      return searchResults;
    }

    // Phase 3: when a full category browse list is loaded, serve it
    const cached = browseItemsCache.get(browseKey(selectedCategory, selectedScholar));
    if (cached && cached.length > 0) {
      return cached.map(browseToMediaItem);
    }
    if (browseItems.length > 0) {
      return browseItems;
    }

    if (selectedCategory === 'all' && selectedScholar === 'all') {
      return fatwas;
    }

    // Fallback: legacy showcase filtering while category loads
    const normScholar = scholarFilterQuery(selectedScholar);

    return fatwas.filter((item) => {
      if (selectedCategory !== 'all' && item.tags?.[0] !== selectedCategory) return false;
      if (normScholar && !normalizeArabic(item.sheikhName || '').includes(normScholar)) return false;
      return true;
    });
  },

  reset: () => {
    set({
      fatwas: [],
      searchResults: [],
      browseItems: [],
      loading: false,
      searching: false,
      browsingCategory: false,
      initialized: false,
      selectedCategory: 'all',
      selectedScholar: 'all',
      searchQuery: '',
      totalCount: BROWSE_TOTALS.all,
    });
  },
}));

function browseKey(category: string, scholar: string): string {
  return `${category}::${scholar}`;
}

/**
 * Phase 3 core: loads the FULL compact index of a category (up to 100k items),
 * applies the scholar filter in-memory, and caches + publishes the result.
 *
 * For the "all" view there is no single index file, so we load every category
 * progressively (smallest file first) and publish each batch as it arrives.
 * The loop is CANCELLABLE: a live search calls cancelBrowseLoading() so the
 * bulk download never competes with answer-shard requests for bandwidth.
 */
let browseLoadGeneration = 0;

function cancelBrowseLoading(): void {
  browseLoadGeneration++;
  useFatwaStore.setState({ browsingCategory: false });
}

async function loadFullCategory(category: string, scholar: string): Promise<void> {
  const norm = scholarFilterQuery(scholar);
  const gen = ++browseLoadGeneration;

  if (category === 'all') {
    // Already fully streamed in this session? Serve from cache instantly.
    const cached = browseItemsCache.get(browseKey('all', scholar));
    if (cached && cached.length > 0) {
      useFatwaStore.setState({ browseItems: cached.map(browseToMediaItem), browsingCategory: false });
      return;
    }
    useFatwaStore.setState({ browsingCategory: true });
    try {
      const collected: BrowseItem[] = [];
      for (const cat of ALL_VIEW_ORDER) {
        if (gen !== browseLoadGeneration) return; // cancelled (search started)
        const items = await loadCategory(cat); // memory-cached after first load
        const filtered = norm
          ? items.filter((i) => normalizeArabic(i.scholar).includes(norm))
          : items;
        collected.push(...filtered);
        if (gen !== browseLoadGeneration) return;
        useFatwaStore.setState({ browseItems: collected.map(browseToMediaItem) });
      }
      if (gen === browseLoadGeneration) {
        browseItemsCache.set(browseKey('all', scholar), collected);
        useFatwaStore.setState({ browsingCategory: false });
      }
    } catch {
      if (gen === browseLoadGeneration) useFatwaStore.setState({ browsingCategory: false });
    }
    return;
  }

  const key = browseKey(category, scholar);

  useFatwaStore.setState({ browsingCategory: true });

  try {
    let items: BrowseItem[];

    if (isCategoryLoaded(category)) {
      items = await loadCategory(category); // memory-cached, instant
    } else {
      items = await loadCategory(category);
    }

    if (gen !== browseLoadGeneration) return; // cancelled mid-download

    // Scholar filter (normalized substring) — '' for 'all' means no filtering.
    if (norm) {
      items = items.filter((i) => normalizeArabic(i.scholar).includes(norm));
    }

    browseItemsCache.set(key, items);
    useFatwaStore.setState({ browseItems: items.map(browseToMediaItem), browsingCategory: false });
  } catch {
    if (gen === browseLoadGeneration) useFatwaStore.setState({ browsingCategory: false });
  }
}

/** Load order for the combined "all" view — smallest indexes first. */
const ALL_VIEW_ORDER = ['aqeedah', 'family', 'muamalat', 'contemporary', 'zakah', 'salah'];

function indexItemToMediaItem(item: FatwaIndexItem): MediaItem {
  const categoryTag = item.category || 'all';
  const itemTags = Array.isArray(item.tags) ? item.tags : [];
  return {
    id: item.id,
    title: item.title,
    description: item.question,
    sheikhName: item.scholar,
    section: 'fatwa',
    sourceFile: item.sourceFile,
    tags: [categoryTag, ...itemTags],
    audioUrl: item.audioUrl,
    answer: item.answer,
  };
}
