'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  loadEBookMeta,
  loadChapterChunk,
  preloadAdjacentChapters,
  getReadingProgress,
  saveReadingProgress,
  getBookHighlights,
  saveBookHighlight,
  type EBookMetaResponse,
} from '@/lib/book-text';
import type {
  BookChapterChunk,
  BookHighlight,
} from '@/lib/books/types';
import type {
  ReadingTheme,
  TashkeelMode,
  FontFamily,
} from '@/types/reader';
import { toast } from 'sonner';

interface UseEBookReaderProps {
  bookId: string;
}

export function useEBookReader({ bookId }: UseEBookReaderProps) {
  const [metaResponse, setMetaResponse] = useState<EBookMetaResponse | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(1);
  const [currentChunk, setCurrentChunk] = useState<BookChapterChunk | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingChapter, setLoadingChapter] = useState<boolean>(false);

  // Appearance settings
  const [theme, setTheme] = useState<ReadingTheme>('sepia');
  const [fontSize, setFontSize] = useState<number>(20);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [fontFamily, setFontFamily] = useState<FontFamily>('amiri');
  const [tashkeelMode, setTashkeelMode] = useState<TashkeelMode>('full');

  // Bookmarks & Highlights
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);

  // Initial load: metadata & saved progress
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    loadEBookMeta(bookId)
      .then((res) => {
        if (!mounted || !res) return;
        setMetaResponse(res);

        const savedProgress = getReadingProgress(bookId);
        const startChapter =
          savedProgress && savedProgress.chapterIndex <= res.meta.totalChapters
            ? savedProgress.chapterIndex
            : 1;

        setCurrentChapterIndex(startChapter);
        setHighlights(getBookHighlights(bookId));

        return loadChapterChunk(bookId, startChapter);
      })
      .then((chunk) => {
        if (!mounted || !chunk) return;
        setCurrentChunk(chunk);
      })
      .catch((err) => {
        console.warn('Failed to load ebook:', err);
        toast.error('تعذر تحميل بيانات الكتاب');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bookId]);

  // Navigate to chapter
  const goToChapter = useCallback(
    async (idx: number) => {
      if (!metaResponse) return;
      if (idx < 1 || idx > metaResponse.meta.totalChapters) return;

      setLoadingChapter(true);
      try {
        const chunk = await loadChapterChunk(bookId, idx);
        if (chunk) {
          setCurrentChapterIndex(idx);
          setCurrentChunk(chunk);

          // Save progress matching ReadingProgress interface
          saveReadingProgress({
            bookId,
            chapterIndex: idx,
            pageNumber: chunk.startPage,
            scrollRatio: 0,
            lastReadTimestamp: Date.now(),
            completedPercent: Math.round((idx / metaResponse.meta.totalChapters) * 100),
          });

          // Preload adjacent
          preloadAdjacentChapters(bookId, idx, metaResponse.meta.totalChapters);
        }
      } finally {
        setLoadingChapter(false);
      }
    },
    [bookId, metaResponse]
  );

  const nextChapter = useCallback(() => {
    if (metaResponse && currentChapterIndex < metaResponse.meta.totalChapters) {
      goToChapter(currentChapterIndex + 1);
    }
  }, [currentChapterIndex, metaResponse, goToChapter]);

  const prevChapter = useCallback(() => {
    if (currentChapterIndex > 1) {
      goToChapter(currentChapterIndex - 1);
    }
  }, [currentChapterIndex, goToChapter]);

  const addHighlight = useCallback(
    (highlight: BookHighlight) => {
      saveBookHighlight(highlight);
      setHighlights(getBookHighlights(bookId));
      toast.success('تم حفظ التحديد في الفوائد المحفوظة');
    },
    [bookId]
  );

  return {
    metaResponse,
    currentChapterIndex,
    currentChunk,
    loading,
    loadingChapter,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    fontFamily,
    setFontFamily,
    tashkeelMode,
    setTashkeelMode,
    highlights,
    goToChapter,
    nextChapter,
    prevChapter,
    addHighlight,
  };
}
