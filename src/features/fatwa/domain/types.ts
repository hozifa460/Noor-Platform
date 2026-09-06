import type { MediaItem } from '@/lib/types';

/**
 * Centralized TypeScript contract definitions for the Fatawa domain.
 * Governs index records, categories, scholars, answer shards, and state.
 */

export interface FatwaIndexItem {
  id: string;
  title: string;
  question: string;
  scholar: string;
  category?: string;
  tags?: string[];
  sourceFile?: string;
  audioUrl?: string;
  hasAnswer: boolean;
  answer?: string;
}

export interface FatwaCategory {
  id: string;
  name: string;
  emoji: string;
  keywords?: string[];
}

export interface FatwaScholar {
  id: string;
  name: string;
  query: string;
}

export interface FatwaContentResult {
  question: string;
  answer: string;
  found: boolean;
  status?: 'ok' | 'not_found' | 'error';
}

export type FatwaFullContent = FatwaContentResult;

export interface BrowseItem {
  id: string;
  title: string;
  scholar: string;
  hasAudio: boolean;
}

export interface AnswerRecord {
  id: string;
  q: string;
  a: string;
}

export interface FatwaStoreState {
  fatwas: MediaItem[];
  searchResults: MediaItem[];
  browseItems: MediaItem[];
  loading: boolean;
  searching: boolean;
  browsingCategory: boolean;
  initialized: boolean;
  selectedCategory: string;
  selectedScholar: string;
  searchQuery: string;
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
