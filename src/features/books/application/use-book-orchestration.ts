'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
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
  const [targetPageNumber, setTargetPageNumber] = useState<number | null>(null);
  const [targetPageId, setTargetPageId] = useState<number | null>(null);
  const [targetJumpNonce, setTargetJumpNonce] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const metaResRef = useRef(metaRes);
  const onChapterChangeRef = useRef(onChapterChange);
  const currentChapterRef = useRef(currentChapter);

  useEffect(() => {
    metaResRef.current = metaRes;
    onChapterChangeRef.current = onChapterChange;
    currentChapterRef.current = currentChapter;
  });

  // 1. Initial Load: Metadata & Saved Progress with AbortSignal
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const meta = await loadEBookMeta(bookId, controller.signal);
        if (!isMounted || controller.signal.aborted) return;
        setMetaRes(meta);

        const progress = getReadingProgress(bookId);
        const initialChapter = progress ? progress.chapterIndex : 1;
        if (initialChapter !== currentChapterRef.current) {
          setCurrentChapter(initialChapter);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return;
        console.warn('[use-book-orchestration] Error loading book meta:', err);
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [bookId]);

  // 2. Load Chapter Chunk on Chapter Change with AbortSignal & Stabilized Dependencies
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const chunk = await loadChapterChunk(bookId, currentChapter, controller.signal);
        if (!isMounted || controller.signal.aborted) return;
        setChunkData(chunk);
        setLoading(false);

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }

        const totalChaps = metaResRef.current?.meta?.totalChapters;
        if (totalChaps) {
          preloadAdjacentChapters(bookId, currentChapter, totalChaps);
        }

        if (chunk && totalChaps) {
          const percent = Math.round((currentChapter / totalChaps) * 100);
          saveReadingProgress({
            bookId,
            chapterIndex: currentChapter,
            pageNumber: chunk.startPage,
            scrollRatio: 0,
            lastReadTimestamp: Date.now(),
            completedPercent: percent,
          });
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return;
        console.warn('[use-book-orchestration] Error loading chapter chunk:', err);
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
      onChapterChangeRef.current?.();
    };
  }, [bookId, currentChapter]);

  const handleJumpToChapter = (chapIdx: number, pageNum?: number, pageId?: number) => {
    if (chapIdx <= 0) {
      toast.warning(
        'القفز المباشر لهذا العنوان غير مدعوم حالياً لعدم توفر خريطة فهرسة موثقة. يمكنك متابعة القراءة المتسلسلة عبر الفصول.'
      );
      return;
    }
    setCurrentChapter(chapIdx);
    setTargetPageNumber(pageNum ?? null);
    setTargetPageId(pageId ?? null);
    setTargetJumpNonce((prev) => prev + 1);
  };

  return {
    metaRes,
    currentChapter,
    setCurrentChapter,
    chunkData,
    loading,
    targetPageNumber,
    targetPageId,
    targetJumpNonce,
    scrollContainerRef,
    handleJumpToChapter,
  };
}
