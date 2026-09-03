'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadEBookMeta,
  loadChapterChunk,
  preloadAdjacentChapters,
  searchInsideEBook,
  saveEBookForOffline,
  isEBookCachedOffline,
  getReadingProgress,
  saveReadingProgress,
  getBookHighlights,
  saveBookHighlight,
  downloadBookTextFile,
  type EBookMetaResponse,
} from '@/lib/book-text-engine';
import type {
  BookChapterChunk,
  InBookSearchResult,
  BookHighlight,
  SectionParagraph,
} from '@/lib/book-types';
import type { MediaItem } from '@/lib/types';
import { toast } from 'sonner';
import type { ReadingTheme, TashkeelMode, FontFamily, SidebarTab } from './types';

export function useEBookReader(bookItem: MediaItem) {
  const bookId = bookItem.id.replace(/^ebook-/, '');

  // Book Data State
  const [metaRes, setMetaRes] = useState<EBookMetaResponse | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [chunkData, setChunkData] = useState<BookChapterChunk | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Typography & UI Preferences
  const [fontSize, setFontSize] = useState<number>(20);
  const [theme, setTheme] = useState<ReadingTheme>('sepia');
  const [tashkeel, setTashkeel] = useState<TashkeelMode>('full');
  const [fontFamily, setFontFamily] = useState<FontFamily>('amiri');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Drawers & Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('toc');
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);

  // In-Book Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<InBookSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [highlightTerm, setHighlightTerm] = useState<string>('');

  // Offline, Export & Highlights
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);

  // Speech TTS Audio
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load: Metadata & Saved Progress
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const meta = await loadEBookMeta(bookId);
      if (!isMounted) return;
      setMetaRes(meta);

      const cached = await isEBookCachedOffline(bookId);
      if (isMounted) setIsOfflineCached(cached);

      const progress = getReadingProgress(bookId);
      const initialChapter = progress ? progress.chapterIndex : 1;
      setCurrentChapter(initialChapter);
      setHighlights(getBookHighlights(bookId));
    })();

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, [bookId, currentChapter, metaRes?.meta]);

  // Search Handler
  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim() || q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const hits = await searchInsideEBook(bookId, q);
      setSearchResults(hits);
      setSearching(false);
    },
    [bookId]
  );

  const handleJumpToSearch = (result: InBookSearchResult) => {
    setCurrentChapter(result.chapterIndex);
    setHighlightTerm(searchQuery.trim());
    setSidebarOpen(false);
    setSearchModalOpen(false);
    toast.success(`الانتقال إلى ${result.chapterTitle} (صفحة ${result.pageNumber})`);
  };

  const handleJumpToChapter = (chapIdx: number) => {
    setCurrentChapter(chapIdx);
    setSidebarOpen(false);
  };

  // Offline Cache
  const handleSaveOffline = async () => {
    if (isOfflineCached) {
      toast.info('الكتاب محفوظ بالفعل للقراءة بدون إنترنت');
      return;
    }
    setDownloadProgress(1);
    const success = await saveEBookForOffline(bookId, ({ percent }) => {
      setDownloadProgress(percent);
    });
    if (success) {
      setIsOfflineCached(true);
      setDownloadProgress(null);
      toast.success('تم حفظ الكتاب كاملاً بدون إنترنت بنجاح!');
    } else {
      setDownloadProgress(null);
      toast.error('تعذر حفظ الكتاب، يرجى المحاولة لاحقاً');
    }
  };

  // Export Device File
  const handleDownloadDeviceFile = async () => {
    setIsExporting(true);
    toast.info('جاري تجهيز الكتاب للتحميل على جهازك...');
    try {
      const ok = await downloadBookTextFile(bookId, metaRes?.meta.title || bookItem.title);
      if (ok) {
        toast.success('تم تحميل الكتاب على جهازك بنجاح!');
      } else {
        toast.error('تعذر تجهيز الملف للتحميل');
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل الكتاب');
    } finally {
      setIsExporting(false);
    }
  };

  // Text-to-Speech (TTS)
  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('القراءة الصوتية غير مدعومة في هذا المتصفح');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast.info('تم إيقاف القراءة الصوتية');
      return;
    }
    if (!chunkData?.paragraphs?.length) return;
    const fullText = chunkData.paragraphs.map((p) => p.text).join(' ');
    const utterance = new SpeechSynthesisUtterance(fullText.slice(0, 4000));
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.success('بدأت القراءة الصوتية للنص');
  };

  // Highlight & Citation
  const handleHighlightParagraph = (p: SectionParagraph, color: 'yellow' | 'green' | 'blue' | 'pink') => {
    const newHighlight: BookHighlight = {
      id: `${bookId}-${currentChapter}-${p.id}-${Date.now()}`,
      bookId,
      chapterIndex: currentChapter,
      pageNumber: p.pageNumber,
      text: p.text.slice(0, 150) + (p.text.length > 150 ? '...' : ''),
      color,
      createdAt: Date.now(),
    };
    saveBookHighlight(newHighlight);
    setHighlights((prev) => [newHighlight, ...prev]);
    toast.success('تم حفظ الفائدة في دفتر الملاحظات');
  };

  const handleCopyCitation = (text: string, pageNum: number) => {
    const title = metaRes?.meta.title || bookItem.title;
    const author = metaRes?.meta.author || bookItem.sheikhName || '';
    const citation = `«${text}»\n\n— [كتاب: ${title} - ${author}، صفحة: ${pageNum}] (منصة نور)`;
    navigator.clipboard.writeText(citation);
    toast.success('تم نسخ النص مع التوثيق والعزو');
  };

  return {
    metaRes,
    currentChapter,
    setCurrentChapter,
    chunkData,
    loading,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    tashkeel,
    setTashkeel,
    fontFamily,
    setFontFamily,
    focusMode,
    setFocusMode,
    sidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,
    searchModalOpen,
    setSearchModalOpen,
    searchQuery,
    searchResults,
    searching,
    highlightTerm,
    isOfflineCached,
    downloadProgress,
    isExporting,
    highlights,
    isSpeaking,
    scrollContainerRef,
    handleSearch,
    handleJumpToSearch,
    handleJumpToChapter,
    handleSaveOffline,
    handleDownloadDeviceFile,
    handleToggleSpeech,
    handleHighlightParagraph,
    handleCopyCitation,
  };
}
