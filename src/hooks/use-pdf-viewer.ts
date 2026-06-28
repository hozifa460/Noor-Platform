'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  loadPdfjs,
  getDocumentParams,
  proxifyPdfUrl,
} from '@/lib/pdf/config';
import { getCachedPage, setCachedPage } from '@/lib/pdf/cache';

type PDFDocumentProxy = import('pdfjs-dist').PDFDocumentProxy;
type PDFPageProxy = import('pdfjs-dist').PDFPageProxy;

export type ViewMode = 'single' | 'continuous' | 'spread';
export type ReadingMode = 'light' | 'dark' | 'sepia';

export interface SearchResult {
  page: number;
  snippet: string;
  query: string;
}

export interface PdfViewerState {
  // Document state
  pdfDoc: PDFDocumentProxy | null;
  numPages: number;
  currentPage: number;
  loading: boolean;
  loadProgress: number;
  error: string | null;

  // View state
  viewMode: ViewMode;
  readingMode: ReadingMode;
  zoom: number;
  isFullscreen: boolean;

  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  currentSearchIdx: number;
  searching: boolean;

  // Bookmarks
  bookmarks: number[];

  // Reading progress
  lastReadPage: number;
}

export interface PdfViewerActions {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitWidth: () => void;
  fitPage: () => void;
  setViewMode: (mode: ViewMode) => void;
  setReadingMode: (mode: ReadingMode) => void;
  toggleFullscreen: () => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  toggleBookmark: (page: number) => void;
  isBookmarked: (page: number) => boolean;
  renderPage: (
    pageNum: number,
    canvas: HTMLCanvasElement,
    zoom: number,
  ) => Promise<void>;
  setSearchQuery: (q: string) => void;
  /** Callback ref for the container element (used for fullscreen). */
  setContainerRef: (el: HTMLDivElement | null) => void;
  /** Retry loading after a library error. */
  retry: () => void;
  /** True if the last error was a library loading error (not a PDF file error). */
  libraryError: boolean;
}

export interface UsePdfViewerResult extends PdfViewerState, PdfViewerActions {}

/**
 * Hook that encapsulates ALL PDF viewer logic.
 *
 * This separates the viewer logic from the UI components, making the code
 * testable and reusable. The UI components just call these actions and
 * render based on the state.
 *
 * Features:
 *   - Document loading with progress + retry
 *   - Page rendering with caching (IndexedDB)
 *   - Search inside PDF
 *   - Bookmarks (localStorage)
 *   - Reading progress (localStorage) — auto-resume from last page
 *   - Zoom + fit modes
 *   - View modes: single, continuous, spread
 *   - Reading modes: light, dark, sepia
 *   - Fullscreen
 *   - Prefetch nearby pages
 */
export function usePdfViewer(url: string, bookSlug?: string): UsePdfViewerResult {
  // ─── Document state ──────────────────────────────────────────────
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ─── View state ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');
  const [zoom, setZoomState] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── Search state ────────────────────────────────────────────────
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(-1);
  const [searching, setSearching] = useState(false);

  // ─── Bookmarks + progress ────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [lastReadPage, setLastReadPage] = useState(1);

  // ─── Error type tracking ─────────────────────────────────────────
  const [libraryError, setLibraryError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // ─── Refs ────────────────────────────────────────────────────────
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookmarkStorageKey = bookSlug ? `pdf-bookmarks:${bookSlug}` : '';
  const progressStorageKey = bookSlug ? `pdf-progress:${bookSlug}` : '';

  /** Callback ref — assign to the container div's `ref` prop. */
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  // ─── Load bookmarks + progress from localStorage ─────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    Promise.resolve().then(() => {
      try {
        if (bookmarkStorageKey) {
          const raw = localStorage.getItem(bookmarkStorageKey);
          if (raw) setBookmarks(JSON.parse(raw));
        }
        if (progressStorageKey) {
          const raw = localStorage.getItem(progressStorageKey);
          if (raw) {
            const page = parseInt(raw, 10);
            if (!isNaN(page) && page > 0) {
              setLastReadPage(page);
              setCurrentPage(page);
            }
          }
        }
      } catch {
        // ignore
      }
    });
  }, [bookmarkStorageKey, progressStorageKey]);

  // ─── Save reading progress automatically ─────────────────────────
  useEffect(() => {
    if (!progressStorageKey || currentPage === 1) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(progressStorageKey, String(currentPage));
        setLastReadPage(currentPage);
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentPage, progressStorageKey]);

  // ─── Load the PDF document ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);
      setPdfDoc(null);
      setNumPages(0);
      renderedPagesRef.current.clear();

      try {
        const pdfjsLib = await loadPdfjs();
        if (cancelled) return;

        const proxyUrl = proxifyPdfUrl(url);
        const loadingTask = pdfjsLib.getDocument(getDocumentParams(proxyUrl));

        loadingTask.onProgress = ({
          loaded,
          total,
        }: {
          loaded: number;
          total: number;
        }) => {
          if (total > 0) {
            setLoadProgress(Math.min(100, (loaded / total) * 100));
          } else {
            setLoadProgress((p) => Math.min(95, p + 1));
          }
        };

        doc = await loadingTask.promise;
        if (cancelled) {
          doc.destroy();
          return;
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('[usePdfViewer] Failed to load PDF:', err);
        let msg = err instanceof Error ? err.message : String(err);
        let isLibError = false;

        // Check if this is a PDF.js library loading error (not a PDF file error).
        if (
          err instanceof Error &&
          (err.name === 'PdfjsLoadError' ||
            msg.includes('Failed to load PDF.js') ||
            msg.includes('Loading chunk') ||
            msg.includes('network error') ||
            msg.includes('Loading CSS chunk'))
        ) {
          isLibError = true;
          msg = 'تعذر تحميل مكتبة عرض الكتب. تحقق من اتصالك بالإنترنت ثم اضغط إعادة المحاولة.';
        } else if (msg.includes('Invalid PDF')) {
          msg = 'ملف PDF تالف أو غير صالح.';
        } else if (msg.includes('password')) {
          msg = 'هذا الكتاب محمي بكلمة مرور.';
        } else if (msg.includes('Network') || msg.includes('fetch')) {
          msg = 'خطأ في الشبكة. تحقق من اتصالك بالإنترنت.';
        }
        setError(msg);
        setLibraryError(isLibError);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (doc) doc.destroy();
    };
  }, [url, retryCount]);

  // ─── Fullscreen handling ─────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ─── Page navigation ─────────────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => {
      if (!pdfDoc) return;
      const target = Math.max(1, Math.min(numPages, page));
      setCurrentPage(target);
    },
    [pdfDoc, numPages],
  );

  const nextPage = useCallback(
    () => goToPage(currentPage + 1),
    [goToPage, currentPage],
  );
  const prevPage = useCallback(
    () => goToPage(currentPage - 1),
    [goToPage, currentPage],
  );

  // ─── Zoom ────────────────────────────────────────────────────────
  const setZoom = useCallback((z: number) => {
    setZoomState(Math.max(0.5, Math.min(4, z)));
  }, []);

  const zoomIn = useCallback(() => setZoom(zoom + 0.25), [zoom, setZoom]);
  const zoomOut = useCallback(() => setZoom(zoom - 0.25), [zoom, setZoom]);

  const fitWidth = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth - 32; // padding
    // We'd need page width to calculate exact zoom; approximate with 1.5
    setZoom(Math.max(0.5, Math.min(4, containerWidth / 500)));
  }, [setZoom]);

  const fitPage = useCallback(() => setZoom(1.0), [setZoom]);

  // ─── Page rendering with cache ───────────────────────────────────
  const renderPage = useCallback(
    async (
      pageNum: number,
      canvas: HTMLCanvasElement,
      renderZoom: number,
    ): Promise<void> => {
      if (!pdfDoc) return;

      // Check IndexedDB cache first.
      const cached = await getCachedPage(url, pageNum, renderZoom);
      if (cached) {
        const bitmap = await createImageBitmap(cached);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);
        return;
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderZoom * 2 }); // 2x for crispness
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / 2)}px`;
      canvas.style.height = `${Math.floor(viewport.height / 2)}px`;

      // Fill white background.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      } as any);
      await renderTask.promise;

      // Cache the rendered page.
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
        );
        if (blob) {
          await setCachedPage(url, pageNum, renderZoom, blob);
        }
      } catch {
        // ignore cache errors
      }
    },
    [pdfDoc, url],
  );

  // ─── Search (Arabic-aware) ───────────────────────────────────────
  const search = useCallback(
    async (query: string) => {
      if (!pdfDoc || !query.trim()) return;
      setSearching(true);
      setSearchQueryState(query);
      setSearchResults([]);
      setCurrentSearchIdx(-1);

      const results: SearchResult[] = [];
      const maxPagesToScan = Math.min(numPages, 200);

      // Use Arabic-aware search (ignores diacritics, normalizes alef/ya/ta).
      const { arabicIncludes, buildSnippet } = await import('@/lib/pdf/arabic-search');

      for (let p = 1; p <= maxPagesToScan; p++) {
        try {
          const page = await pdfDoc.getPage(p);
          const content = await page.getTextContent();
          const text = content.items
            .map((i) => ('str' in i ? i.str : ''))
            .join(' ');
          if (arabicIncludes(text, query)) {
            const snippet = buildSnippet(text, query);
            results.push({ page: p, snippet, query });
          }
        } catch {
          // skip page
        }
      }

      setSearchResults(results);
      setCurrentSearchIdx(results.length > 0 ? 0 : -1);
      setSearching(false);
      if (results.length > 0) goToPage(results[0].page);
    },
    [pdfDoc, numPages, goToPage],
  );

  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setSearchResults([]);
    setCurrentSearchIdx(-1);
    setSearching(false);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
  }, []);

  /** Retry loading after a library error. Increments retryCount to re-trigger the load effect. */
  const retry = useCallback(() => {
    setLibraryError(false);
    setError(null);
    setLoading(true);
    setRetryCount((c) => c + 1);
  }, []);

  const nextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const next = (currentSearchIdx + 1) % searchResults.length;
    setCurrentSearchIdx(next);
    goToPage(searchResults[next].page);
  }, [searchResults, currentSearchIdx, goToPage]);

  const prevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const prev = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIdx(prev);
    goToPage(searchResults[prev].page);
  }, [searchResults, currentSearchIdx, goToPage]);

  // ─── Bookmarks ───────────────────────────────────────────────────
  const toggleBookmark = useCallback(
    (page: number) => {
      setBookmarks((prev) => {
        const next = prev.includes(page)
          ? prev.filter((p) => p !== page)
          : [...prev, page].sort((a, b) => a - b);
        if (bookmarkStorageKey) {
          try {
            localStorage.setItem(bookmarkStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [bookmarkStorageKey],
  );

  const isBookmarked = useCallback(
    (page: number) => bookmarks.includes(page),
    [bookmarks],
  );

  return {
    // State
    pdfDoc,
    numPages,
    currentPage,
    loading,
    loadProgress,
    error,
    viewMode,
    readingMode,
    zoom,
    isFullscreen,
    searchQuery,
    searchResults,
    currentSearchIdx,
    searching,
    bookmarks,
    lastReadPage,
    // Actions
    goToPage,
    nextPage,
    prevPage,
    setZoom,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
    setViewMode,
    setReadingMode,
    toggleFullscreen,
    search,
    clearSearch,
    nextSearchResult,
    prevSearchResult,
    toggleBookmark,
    isBookmarked,
    renderPage,
    setSearchQuery,
    setContainerRef,
    retry,
    libraryError,
  } as UsePdfViewerResult;
}
