'use client';

import { create } from 'zustand';
import { HADITH_BOOKS_LIST, type HadithBookMeta } from '@/lib/hadith-data';
import {
  loadHadithBook,
  loadSpecificHadith,
  findHadithSharh,
  searchHadithsInBook,
  searchAcrossAllBooks,
  type HadithBookData,
  type HadithItem,
  type HadithChapter,
  type HadeethEncSharhItem,
  type GlobalSearchResultItem,
} from '@/lib/hadith-engine';
import { loadSunanGrades } from '@/lib/hadith-grade-engine';

interface HadithState {
  activeBook: HadithBookMeta;
  bookData: HadithBookData | null;
  selectedChapterId: number | 'all';
  searchQuery: string;
  categoryFilter: string;
  searchMode: 'in-book' | 'global';
  loadingBook: boolean;
  searchingGlobal: boolean;

  // Global search results
  globalResults: GlobalSearchResultItem[];

  // Selected Hadith Modal
  selectedHadith: HadithItem | null;
  selectedHadithBook: HadithBookMeta | null;
  selectedHadithChapter?: HadithChapter;
  hadithSharh: HadeethEncSharhItem | null;
  loadingSharh: boolean;

  // Actions
  setActiveBook: (book: HadithBookMeta) => void;
  setSelectedChapterId: (chapterId: number | 'all') => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (cat: string) => void;
  setSearchMode: (mode: 'in-book' | 'global') => void;
  openHadithDetail: (hadith: HadithItem, book?: HadithBookMeta, chapter?: HadithChapter) => Promise<void>;
  closeHadithDetail: () => void;
  loadBookData: (fileName: string) => Promise<void>;
  getFilteredHadiths: () => HadithItem[];
  runGlobalSearch: (q: string) => Promise<void>;
}

export const useHadithStore = create<HadithState>((set, get) => ({
  activeBook: HADITH_BOOKS_LIST[0], // صحيح البخاري
  bookData: null,
  selectedChapterId: 'all',
  searchQuery: '',
  categoryFilter: 'all',
  searchMode: 'in-book',
  loadingBook: false,
  searchingGlobal: false,

  globalResults: [],

  selectedHadith: null,
  selectedHadithBook: null,
  selectedHadithChapter: undefined,
  hadithSharh: null,
  loadingSharh: false,

  setActiveBook: (activeBook) => {
    set({ activeBook, selectedChapterId: 'all', searchQuery: '', searchMode: 'in-book' });
    get().loadBookData(activeBook.fileName);
  },

  setSelectedChapterId: (selectedChapterId) => set({ selectedChapterId }),
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    if (get().searchMode === 'global' && searchQuery.trim().length >= 2) {
      get().runGlobalSearch(searchQuery);
    }
  },
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSearchMode: (searchMode) => {
    set({ searchMode });
    if (searchMode === 'global' && get().searchQuery.trim().length >= 2) {
      get().runGlobalSearch(get().searchQuery);
    }
  },

  loadBookData: async (fileName: string) => {
    set({ loadingBook: true });
    try {
      const activeBookId = get().activeBook?.id;
      if (activeBookId) {
        loadSunanGrades(activeBookId).catch(() => {});
      }
      const data = await loadHadithBook(fileName);
      set({ bookData: data, loadingBook: false });
    } catch {
      set({ loadingBook: false });
    }
  },

  runGlobalSearch: async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      set({ globalResults: [], searchingGlobal: false });
      return;
    }
    set({ searchingGlobal: true });
    try {
      const res = await searchAcrossAllBooks(trimmed);
      set({ globalResults: res, searchingGlobal: false });
    } catch {
      set({ searchingGlobal: false });
    }
  },

  openHadithDetail: async (hadith: HadithItem, book?: HadithBookMeta, chapter?: HadithChapter) => {
    const targetBook = book || get().activeBook;
    let targetChapter =
      chapter ||
      get().bookData?.chapters.find((c) => c.id === hadith.chapterId);

    let resolvedHadith = hadith;

    // Open modal immediately with available text
    set({
      selectedHadith: resolvedHadith,
      selectedHadithBook: targetBook,
      selectedHadithChapter: targetChapter,
      hadithSharh: null,
      loadingSharh: true,
    });

    // 1. Asynchronously fetch full hadith from its exact chunk to guarantee 100% complete text
    try {
      const fullItem = await loadSpecificHadith(targetBook.id, hadith.idInBook);
      if (fullItem && fullItem.arabic && fullItem.arabic.length >= hadith.arabic.length) {
        resolvedHadith = fullItem;
        if (!targetChapter && get().bookData?.chapters) {
          targetChapter = get().bookData?.chapters.find((c) => c.id === fullItem.chapterId);
        }
        set({
          selectedHadith: resolvedHadith,
          selectedHadithChapter: targetChapter,
        });
      }
    } catch {
      /* fallback to available snippet */
    }

    // 2. Fetch Sharh & Explanations from HadeethEnc
    try {
      const sharh = await findHadithSharh(resolvedHadith.arabic);
      set({ hadithSharh: sharh, loadingSharh: false });
    } catch {
      set({ loadingSharh: false });
    }
  },

  closeHadithDetail: () =>
    set({
      selectedHadith: null,
      selectedHadithBook: null,
      selectedHadithChapter: undefined,
      hadithSharh: null,
    }),

  getFilteredHadiths: () => {
    const { bookData, searchQuery, selectedChapterId, searchMode } = get();
    if (searchMode === 'global') return [];
    if (!bookData || !bookData.hadiths) return [];

    return searchHadithsInBook(
      bookData.hadiths,
      searchQuery,
      selectedChapterId === 'all' ? undefined : selectedChapterId
    );
  },
}));
