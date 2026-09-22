'use client';

import { create } from 'zustand';
import {
  HADITH_BOOKS_LIST,
  type HadithBookMeta,
  type HadithBookData,
  type HadithItem,
  type HadithChapter,
  type HadeethEncSharhItem,
  type GlobalSearchResultItem,
} from '../domain';
import {
  loadHadithBook,
  loadSpecificHadith,
  findHadithSharh,
  searchHadithsInBook,
  searchAcrossAllBooks,
  loadSunanGrades,
  MicroIndexLoadError,
  onMicroIndexProgress,
} from '../infrastructure';

export interface HadithState {
  activeBook: HadithBookMeta;
  bookData: HadithBookData | null;
  selectedChapterId: number | 'all';
  searchQuery: string;
  categoryFilter: string;
  gradeFilter: 'all' | 'muttafaqun' | 'sahih' | 'hasan' | 'daif' | 'mawdu' | 'unspecified';
  searchMode: 'in-book' | 'global';
  loadingBook: boolean;
  searchingGlobal: boolean;
  /**
   * Typed global-search index failure (null = no failure). Distinct from an
   * EMPTY `globalResults` (genuine "no matches"): the UI shows a retry
   * affordance on this state, never the "no results" copy. Cleared on every
   * new search start and on success.
   */
  globalSearchError: 'timeout' | 'network' | 'invalid-payload' | null;

  /**
   * Live load-progress of the micro-index while a global search is running
   * (waiting-UX only; null when idle). `totalBytes` is null ⇒ indeterminate.
   */
  globalSearchProgress: {
    phase: 'connect' | 'download' | 'preparing';
    loadedBytes?: number;
    totalBytes?: number | null;
  } | null;

  // Global search results
  globalResults: GlobalSearchResultItem[];

  // Selected Hadith Modal
  selectedHadith: HadithItem | null;
  selectedHadithBook: HadithBookMeta | null;
  selectedHadithChapter?: HadithChapter;
  hadithSharh: HadeethEncSharhItem | null;
  loadingSharh: boolean;
  detailInitialTab?: 'matn' | 'isnad' | 'translations' | 'sharh' | 'hints';

  // Actions
  setActiveBook: (book: HadithBookMeta) => void;
  setSelectedChapterId: (chapterId: number | 'all') => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (cat: string) => void;
  setGradeFilter: (grade: 'all' | 'muttafaqun' | 'sahih' | 'hasan' | 'daif' | 'mawdu' | 'unspecified') => void;
  setSearchMode: (mode: 'in-book' | 'global') => void;
  openHadithDetail: (
    hadith: HadithItem,
    book?: HadithBookMeta,
    chapter?: HadithChapter,
    initialTab?: 'matn' | 'isnad' | 'translations' | 'sharh' | 'hints'
  ) => Promise<void>;
  closeHadithDetail: () => void;
  loadBookData: (fileName: string) => Promise<void>;
  getFilteredHadiths: () => HadithItem[];
  runGlobalSearch: (q: string) => Promise<void>;
  /** Re-run the current global query (used by the failure-state retry button). */
  retryGlobalSearch: () => Promise<void>;
}

/**
 * Monotonic generation counter for book loads. Each `loadBookData` call bumps
 * it and captures its own value; a response may only commit to the store if it
 * is still the newest load. Without this guard a slow load of book A could
 * overwrite the data/loading/error state of a later-selected book B
 * (A → B → A navigation, or simply switching faster than a cold load resolves).
 */
let latestBookLoadGeneration = 0;

export const useHadithStore = create<HadithState>((set, get) => ({
  activeBook: HADITH_BOOKS_LIST[0], // صحيح البخاري
  bookData: null,
  selectedChapterId: 'all',
  searchQuery: '',
  categoryFilter: 'all',
  gradeFilter: 'all',
  searchMode: 'in-book',
  loadingBook: false,
  searchingGlobal: false,
  globalSearchError: null,
  globalSearchProgress: null,

  globalResults: [],

  selectedHadith: null,
  selectedHadithBook: null,
  selectedHadithChapter: undefined,
  hadithSharh: null,
  loadingSharh: false,
  detailInitialTab: 'matn',

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
  setGradeFilter: (gradeFilter) => set({ gradeFilter }),
  setSearchMode: (searchMode) => {
    set({ searchMode });
    if (searchMode === 'global' && get().searchQuery.trim().length >= 2) {
      get().runGlobalSearch(get().searchQuery);
    }
  },

  loadBookData: async (fileName: string) => {
    const generation = ++latestBookLoadGeneration;
    set({ loadingBook: true });
    try {
      const activeBookId = get().activeBook?.id;
      if (activeBookId) {
        loadSunanGrades(activeBookId).catch(() => {});
      }
      const data = await loadHadithBook(fileName);
      // A newer load superseded this one while it was awaiting — drop the stale
      // result so it cannot clobber the current book or its loading/error state.
      if (generation !== latestBookLoadGeneration) return;
      set({ bookData: data, loadingBook: false });
    } catch {
      if (generation !== latestBookLoadGeneration) return;
      set({ loadingBook: false });
    }
  },

  runGlobalSearch: async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      set({ globalResults: [], searchingGlobal: false, globalSearchError: null, globalSearchProgress: null });
      return;
    }
    set({ searchingGlobal: true, globalSearchError: null, globalSearchProgress: null });
    const stopProgress = onMicroIndexProgress((p) => {
      // Only surface progress while this search is the active one.
      if (get().searchingGlobal) set({ globalSearchProgress: p });
    });
    try {
      const res = await searchAcrossAllBooks(trimmed);
      // A load failure never reaches here as data: it throws
      // MicroIndexLoadError and is handled in the dedicated branch below.
      set({ globalResults: res, searchingGlobal: false, globalSearchError: null, globalSearchProgress: null });
    } catch (err) {
      if (err instanceof MicroIndexLoadError) {
        // Index unavailable (timeout/network): keep the spinner off, preserve
        // any previous results, and surface the typed error for the retry UI.
        // The in-flight slot was already cleared, so retry refetches fresh.
        set({
          searchingGlobal: false,
          globalSearchError: err.reason === 'timeout' ? 'timeout' : err.reason,
          globalSearchProgress: null,
        });
      } else {
        set({ searchingGlobal: false, globalSearchProgress: null });
      }
    } finally {
      stopProgress();
    }
  },

  retryGlobalSearch: async () => {
    const { searchQuery, searchMode } = get();
    if (searchMode !== 'global' || !searchQuery.trim()) return;
    // Explicit retry: force a fresh load attempt through the same path.
    await get().runGlobalSearch(searchQuery);
  },

  openHadithDetail: async (
    hadith: HadithItem,
    book?: HadithBookMeta,
    chapter?: HadithChapter,
    initialTab: 'matn' | 'isnad' | 'translations' | 'sharh' | 'hints' = 'matn'
  ) => {
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
      detailInitialTab: initialTab,
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

    // 2. Fetch Sharh & Explanations from HadeethEnc using documented links or exact verbatim matn
    try {
      const sharh = await findHadithSharh(resolvedHadith.arabic, {
        bookId: targetBook?.id,
        idInBook: resolvedHadith.idInBook,
      });
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
