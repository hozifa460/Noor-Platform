'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';
import type { FatwaIndexItem } from '@/lib/fatwa-index';
import { microShardEngine } from '@/lib/micro-shard-engine';

interface FatwaState {
  fatwas: MediaItem[];
  searchResults: MediaItem[];
  loading: boolean;
  searching: boolean;
  initialized: boolean;
  selectedCategory: string;
  selectedScholar: string;
  searchQuery: string;

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

export const useFatwaStore = create<FatwaState>((set, get) => ({
  fatwas: [],
  searchResults: [],
  loading: false,
  searching: false,
  initialized: false,
  selectedCategory: 'all',
  selectedScholar: 'all',
  searchQuery: '',

  setSelectedCategory: (selectedCategory) => {
    set({ selectedCategory });
    const { searchQuery } = get();
    if (searchQuery.trim()) {
      get().setSearchQuery(searchQuery);
    }
  },

  setSelectedScholar: (selectedScholar) => {
    set({ selectedScholar });
    const { searchQuery } = get();
    if (searchQuery.trim()) {
      get().setSearchQuery(searchQuery);
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
      });
    } catch {
      set({ loading: false, initialized: true });
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [], searching: false });
  },

  getFilteredFatwas: () => {
    const { selectedCategory, selectedScholar, searchQuery, searchResults, fatwas } = get();

    if (searchQuery.trim()) {
      return searchResults;
    }

    if (selectedCategory === 'all' && selectedScholar === 'all') {
      return fatwas;
    }

    return fatwas.filter((item) => {
      if (selectedCategory !== 'all' && item.tags?.[0] !== selectedCategory) return false;
      if (selectedScholar !== 'all' && !item.sheikhName?.includes(selectedScholar)) return false;
      return true;
    });
  },

  reset: () => {
    set({
      fatwas: [],
      searchResults: [],
      loading: false,
      searching: false,
      initialized: false,
      selectedCategory: 'all',
      selectedScholar: 'all',
      searchQuery: '',
    });
  },
}));

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
