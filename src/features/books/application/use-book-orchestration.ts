'use client';

import { useState, useEffect, useRef } from 'react';
import {
  loadEBookMeta,
  loadChapterChunk,
  preloadAdjacentChapters,
  getReadingProgress,
  saveReadingProgress,
  type EBookMetaResponse,
} from '../infrastructure';
import type { BookChapterChunk } from '../domain';

export function useBookOrchestration(bookId: string, onChapterChange?: () => void) {
  const [metaRes, setMetaRes] = useState<EBookMetaResponse | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [chunkData, setChunkData] = useState<BookChapterChunk | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load: Metadata & Saved Progress
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const meta = await loadEBookMeta(bookId);
      if (!isMounted) return;
      setMetaRes(meta);

      const progress = getReadingProgress(bookId);
      const initialChapter = progress ? progress.chapterIndex : 1;
      setCurrentChapter(initialChapter);
    })();

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  // 2. Load Chapter Chunk on Chapter Change
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const chunk = await loadChapterChunk(bookId, currentChapter);
      if (!isMounted) return;
      setChunkData(chunk);
      setLoading(false);

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (metaRes?.meta) {
        preloadAdjacentChapters(bookId, currentChapter, metaRes.meta.totalChapters);
      }

      if (chunk && metaRes?.meta) {
        const percent = Math.round((currentChapter / metaRes.meta.totalChapters) * 100);
        saveReadingProgress({
          bookId,
          chapterIndex: currentChapter,
          pageNumber: chunk.startPage,
          scrollRatio: 0,
          lastReadTimestamp: Date.now(),
          completedPercent: percent,
        });
      }
    })();

    return () => {
      isMounted = false;
      onChapterChange?.();
    };
  }, [bookId, currentChapter, metaRes?.meta, onChapterChange]);

  const handleJumpToChapter = (chapIdx: number) => {
    setCurrentChapter(chapIdx);
  };

  return {
    metaRes,
    currentChapter,
    setCurrentChapter,
    chunkData,
    loading,
    scrollContainerRef,
    handleJumpToChapter,
  };
}
