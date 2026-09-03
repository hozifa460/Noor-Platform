'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';
import { loadRepositories } from '@/lib/repositories';
import { fetchJsonWithFallback } from '@/lib/fetcher';
import { normalizeContentFile } from '@/lib/sheikh';
import { fetchEBookCatalog } from '@/lib/book-text-engine';
import { searchBooksWithIntent } from '@/lib/book-intent-engine';
import {
  BOOK_CATEGORIES,
  BOOK_LANGUAGES,
  QURANIC_MUS_HAFS,
  LANGUAGE_BOOK_FILES,
  CATEGORY_BOOK_FILES,
  type BookCategory,
  type BookLanguage,
} from '@/data/books';
import {
  dedupeBooks,
  cachedLoadShamelaCatalog,
  getInitialCachedBooks,
  LOCAL_CACHE_KEY,
} from '@/lib/books-store-loader';

export type { BookCategory, BookLanguage };
export { BOOK_CATEGORIES, BOOK_LANGUAGES, QURANIC_MUS_HAFS };

interface BooksState {
  books: MediaItem[];
  loading: boolean;
  selectedCategory: string;
  selectedLanguage: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  loadedFiles: Set<string>;

  startLoading: () => Promise<void>;
  loadLanguageBooks: (langCode: string) => Promise<void>;
  loadCategoryBooks: (catId: string) => Promise<void>;
  setSelectedCategory: (catId: string) => void;
  setSelectedLanguage: (langCode: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  getFilteredBooks: (
    customBooks?: MediaItem[],
    customCat?: string,
    customLang?: string,
    customQuery?: string
  ) => MediaItem[];
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: getInitialCachedBooks(),
  loading: false,
  selectedCategory: 'all',
  selectedLanguage: 'all',
  searchQuery: '',
  viewMode: 'grid',
  loadedFiles: new Set(),

  setSelectedCategory: (selectedCategory) => {
    set({ selectedCategory });
    if (
      selectedCategory === 'shamela' ||
      selectedCategory === 'openiti' ||
      CATEGORY_BOOK_FILES[selectedCategory]
    ) {
      get().loadCategoryBooks(selectedCategory);
    }
  },
  setSelectedLanguage: (selectedLanguage) => {
    set({ selectedLanguage });
    if (selectedLanguage !== 'all' && selectedLanguage !== 'ar') {
      get().loadLanguageBooks(selectedLanguage);
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),

  loadLanguageBooks: async (langCode: string) => {
    const filePaths = LANGUAGE_BOOK_FILES[langCode];
    if (!filePaths || filePaths.length === 0) return;

    const unvisited = filePaths.filter((fp) => !get().loadedFiles.has(fp));
    if (unvisited.length === 0) return;

    try {
      const repos = loadRepositories();
      const newItems: MediaItem[] = [];
      const nextFiles = new Set(get().loadedFiles);

      for (const filePath of unvisited) {
        try {
          const res = await fetchJsonWithFallback<unknown>(repos, filePath, 10000);
          if (res.data !== null) {
            const { items } = normalizeContentFile(res.data, filePath, res.sourceId || undefined);
            if (items.length > 0) {
              newItems.push(...items);
              nextFiles.add(filePath);
            }
          }
        } catch {
          // ignore error on single file
        }
      }

      if (newItems.length > 0) {
        set((s) => ({
          books: dedupeBooks([...s.books, ...newItems]),
          loadedFiles: nextFiles,
        }));
      }
    } catch {
      // non-critical
    }
  },

  loadCategoryBooks: async (catId: string) => {
    if (catId === 'shamela' || catId === 'openiti') {
      if (get().loadedFiles.has('shamela')) return;
      await cachedLoadShamelaCatalog(set, get);
      return;
    }

    const filePaths = CATEGORY_BOOK_FILES[catId];
    if (!filePaths || filePaths.length === 0) return;

    const unvisited = filePaths.filter((fp) => !get().loadedFiles.has(fp));
    if (unvisited.length === 0) return;

    try {
      const repos = loadRepositories();
      const newItems: MediaItem[] = [];
      const nextFiles = new Set(get().loadedFiles);

      for (const filePath of unvisited) {
        try {
          const res = await fetchJsonWithFallback<unknown>(repos, filePath, 12000);
          if (res.data !== null) {
            const { items } = normalizeContentFile(res.data, filePath, res.sourceId || undefined);
            if (items.length > 0) {
              newItems.push(...items);
              nextFiles.add(filePath);
            }
          }
        } catch {
          // ignore error
        }
      }

      if (newItems.length > 0) {
        set((s) => ({
          books: dedupeBooks([...s.books, ...newItems]),
          loadedFiles: nextFiles,
        }));
      }
    } catch {
      // non-critical
    }
  },

  startLoading: async () => {
    if (get().loading) return;
    set({ loading: true });

    try {
      const repos = loadRepositories();
      const nextFiles = new Set(get().loadedFiles);
      const accumulated: MediaItem[] = [...QURANIC_MUS_HAFS];

      const [textCatalogResult, localBooksResult, arBooksResult, arArticlesResult] =
        await Promise.allSettled([
          fetchEBookCatalog(),
          fetch('/books/islamic_books.json').then((r) => (r.ok ? r.json() : null)),
          fetchJsonWithFallback<unknown>(repos, 'books/islamhouse_books_ar.json', 10000),
          fetchJsonWithFallback<unknown>(repos, 'books/islamhouse_articles_ar.json', 10000),
        ]);

      if (textCatalogResult.status === 'fulfilled' && textCatalogResult.value) {
        const textItems: MediaItem[] = textCatalogResult.value.map((m) => ({
          id: `ebook-${m.id}`,
          title: m.title,
          subtitle: m.subtitle,
          sheikhName: m.author,
          section: 'books',
          tags: [...m.tags, 'نص حي', 'ebook_text', 'قراءة سريعة', m.category],
          language: m.language || 'ar',
          description: m.description,
          pdfUrl: m.pdfUrl,
        }));
        accumulated.push(...textItems);
      }

      if (localBooksResult.status === 'fulfilled' && localBooksResult.value) {
        const { items } = normalizeContentFile(
          localBooksResult.value,
          'islamic_books/books.json',
          'builtin'
        );
        if (items.length > 0) accumulated.push(...items);
      }

      if (arBooksResult.status === 'fulfilled' && arBooksResult.value?.data) {
        const { items } = normalizeContentFile(
          arBooksResult.value.data,
          'books/islamhouse_books_ar.json',
          arBooksResult.value.sourceId || undefined
        );
        if (items.length > 0) {
          accumulated.push(...items);
          nextFiles.add('books/islamhouse_books_ar.json');
        }
      }

      if (arArticlesResult.status === 'fulfilled' && arArticlesResult.value?.data) {
        const { items } = normalizeContentFile(
          arArticlesResult.value.data,
          'books/islamhouse_articles_ar.json',
          arArticlesResult.value.sourceId || undefined
        );
        if (items.length > 0) {
          accumulated.push(...items);
          nextFiles.add('books/islamhouse_articles_ar.json');
        }
      }

      await cachedLoadShamelaCatalog(set, get);

      const merged = dedupeBooks(accumulated);
      set({
        books: merged,
        loadedFiles: nextFiles,
      });

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  getFilteredBooks: (
    customBooks?: MediaItem[],
    customCat?: string,
    customLang?: string,
    customQuery?: string
  ) => {
    const books = customBooks ?? get().books;
    const selectedCategory = customCat ?? get().selectedCategory;
    const selectedLanguage = customLang ?? get().selectedLanguage;
    const searchQuery = customQuery ?? get().searchQuery;
    const queryTrimmed = searchQuery.trim();

    if (queryTrimmed) {
      const intentResults = searchBooksWithIntent(
        books,
        queryTrimmed,
        selectedCategory,
        selectedLanguage
      );
      return intentResults.map((r) =>
        r.matchReason ? { ...r.book, matchReason: r.matchReason } : r.book
      );
    }

    if (selectedCategory === 'all' && selectedLanguage === 'all') {
      return books;
    }

    return books.filter((book: MediaItem) => {
      if (selectedLanguage !== 'all' && book.language && book.language !== selectedLanguage) {
        return false;
      }

      if (selectedCategory !== 'all') {
        const tags = (book.tags || []).map((t: string) => t.toLowerCase());
        const title = (book.title || '').toLowerCase();
        const desc = (book.description || '').toLowerCase();

        if (selectedCategory === 'ebook_pure_text') {
          if (!tags.includes('ebook_text') && !tags.includes('نص حي')) return false;
        } else if (selectedCategory === 'shamela' || selectedCategory === 'openiti') {
          const isShamela =
            (book.id && (book.id.startsWith('shamela-') || book.id.startsWith('openiti-'))) ||
            tags.includes('شاملة') ||
            tags.includes('openiti') ||
            tags.includes('تراث') ||
            book.mediaType === 'shamela_archive' ||
            Boolean(book.shamelaPath);
          if (!isShamela) return false;
        } else if (selectedCategory === 'quran') {
          const isQuran =
            book.islamicArt === 'quran' ||
            tags.some((t) => t.includes('quran') || t.includes('مصحف') || t.includes('قراءة') || t.includes('تفسير')) ||
            title.includes('مصحف') ||
            title.includes('قرآن') ||
            title.includes('تفسير');
          if (!isQuran) return false;
        } else if (selectedCategory === 'fiqh') {
          const isFiqh =
            book.islamicArt === 'fiqh' ||
            tags.some((t) => t.includes('فقه') || t.includes('فتوى') || t.includes('احكام') || t.includes('أصول')) ||
            title.includes('فقه') ||
            title.includes('فتاوى') ||
            desc.includes('فقه');
          if (!isFiqh) return false;
        } else if (selectedCategory === 'sunnah') {
          const isSunnah =
            book.islamicArt === 'hadith' ||
            tags.some((t) => t.includes('حديث') || t.includes('سنة') || t.includes('صحيح') || t.includes('سنن') || t.includes('مسند')) ||
            title.includes('حديث') ||
            title.includes('سنن') ||
            title.includes('صحيح');
          if (!isSunnah) return false;
        } else if (selectedCategory === 'history') {
          const isHistory =
            book.islamicArt === 'history' ||
            tags.some((t) => t.includes('تاريخ') || t.includes('سيرة') || t.includes('تراجم') || t.includes('طبقات')) ||
            title.includes('تاريخ') ||
            title.includes('سيرة');
          if (!isHistory) return false;
        } else if (selectedCategory === 'language_literature') {
          const isLang =
            book.islamicArt === 'language' ||
            tags.some((t) => t.includes('لغة') || t.includes('أدب') || t.includes('شعر') || t.includes('معجم') || t.includes('نحو')) ||
            title.includes('ديوان') ||
            title.includes('شعر') ||
            title.includes('معجم');
          if (!isLang) return false;
        } else if (selectedCategory === 'mwaez') {
          const isMwaez =
            book.islamicArt === 'raqaiq' ||
            tags.some((t) => t.includes('رقائق') || t.includes('مواعظ') || t.includes('تزكية') || t.includes('زهد') || t.includes('قلوب')) ||
            title.includes('مواعظ') ||
            title.includes('الرقائق') ||
            title.includes('الزهد');
          if (!isMwaez) return false;
        } else if (selectedCategory === 'shobohat') {
          const isShobohat =
            book.islamicArt === 'aqeedah' ||
            tags.some((t) => t.includes('عقيدة') || t.includes('شبهات') || t.includes('توحيد') || t.includes('ردود') || t.includes('سنة')) ||
            title.includes('عقيدة') ||
            title.includes('توحيد') ||
            title.includes('شبهات');
          if (!isShobohat) return false;
        } else if (selectedCategory === 'multilingual') {
          if (book.language === 'ar') return false;
        }
      }

      return true;
    });
  },
}));
