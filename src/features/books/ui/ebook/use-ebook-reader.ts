'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  saveEBookForOffline,
  isEBookCachedOffline,
  getBookHighlights,
  saveBookHighlight,
  downloadBookTextFile,
} from '../../infrastructure';
import type {
  InBookSearchResult,
  BookHighlight,
  SectionParagraph,
} from '../../domain';
import type { MediaItem } from '@/lib/types';
import { toast } from 'sonner';
import type { SidebarTab } from './types';
import { copyToClipboard } from '@/lib/shared';
import {
  useBookPreferences,
  useBookAudio,
  useBookSearch,
  useBookOrchestration,
} from '../../application';

export function useEBookReader(bookItem: MediaItem) {
  const bookId = bookItem.id.replace(/^ebook-/, '');

  // 1. Audio Application Subsystem
  // We need a stable reference to chunkData for audio, so we declare orchestration first
  // with a callback to stop audio on chapter change.
  const [activeTab, setActiveTab] = useState<SidebarTab>('toc');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // 2. Preferences Subsystem
  const preferences = useBookPreferences();

  // 3. Orchestration Subsystem
  const orchestration = useBookOrchestration(bookId, () => {
    audio.ttsStop();
  });

  // 4. Audio Subsystem
  const audio = useBookAudio(orchestration.chunkData);

  // 5. In-Book Search Subsystem
  const search = useBookSearch(bookId, (chapIdx) => {
    orchestration.handleJumpToChapter(chapIdx);
    setSidebarOpen(false);
  });

  // 6. Offline, Export & Highlights Subsystem
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cached = await isEBookCachedOffline(bookId);
      if (isMounted) setIsOfflineCached(cached);
      if (isMounted) setHighlights(getBookHighlights(bookId));
    })();
    return () => {
      isMounted = false;
    };
  }, [bookId]);

  // Jump to search result wrapper
  const handleJumpToSearch = (result: InBookSearchResult) => {
    search.handleJumpToSearch(result);
    setSidebarOpen(false);
  };

  const handleJumpToChapter = (chapIdx: number, pageNum?: number, pageId?: number) => {
    orchestration.handleJumpToChapter(chapIdx, pageNum, pageId);
    if (chapIdx > 0) {
      setSidebarOpen(false);
    }
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
      const ok = await downloadBookTextFile(bookId, orchestration.metaRes?.meta.title || bookItem.title);
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

  // Highlight & Citation
  const handleHighlightParagraph = useCallback((p: SectionParagraph, color: 'yellow' | 'green' | 'blue' | 'pink') => {
    const newHighlight: BookHighlight = {
      id: `${bookId}-${orchestration.currentChapter}-${p.id}-${Date.now()}`,
      bookId,
      chapterIndex: orchestration.currentChapter,
      pageNumber: p.pageNumber,
      text: p.text.slice(0, 150) + (p.text.length > 150 ? '...' : ''),
      color,
      createdAt: Date.now(),
    };
    saveBookHighlight(newHighlight);
    setHighlights((prev) => [newHighlight, ...prev]);
    toast.success('تم حفظ الفائدة في دفتر الملاحظات');
  }, [bookId, orchestration.currentChapter]);

  const handleCopyCitation = useCallback((text: string, pageNum: number) => {
    const title = orchestration.metaRes?.meta.title || bookItem.title;
    const author = orchestration.metaRes?.meta.author || bookItem.sheikhName || '';
    const citation = `«${text}»\n\n— [كتاب: ${title} - ${author}، صفحة: ${pageNum}] (منصة نور)`;
    copyToClipboard(citation, 'تم نسخ النص مع التوثيق والعزو');
  }, [orchestration.metaRes?.meta.title, orchestration.metaRes?.meta.author, bookItem.title, bookItem.sheikhName]);

  return {
    metaRes: orchestration.metaRes,
    currentChapter: orchestration.currentChapter,
    setCurrentChapter: orchestration.setCurrentChapter,
    chunkData: orchestration.chunkData,
    loading: orchestration.loading,
    targetPageNumber: orchestration.targetPageNumber,
    targetPageId: orchestration.targetPageId,
    targetJumpNonce: orchestration.targetJumpNonce,
    scrollContainerRef: orchestration.scrollContainerRef,
    handleJumpToChapter,

    fontSize: preferences.fontSize,
    setFontSize: preferences.setFontSize,
    theme: preferences.theme,
    setTheme: preferences.setTheme,
    tashkeel: preferences.tashkeel,
    setTashkeel: preferences.setTashkeel,
    fontFamily: preferences.fontFamily,
    setFontFamily: preferences.setFontFamily,
    focusMode: preferences.focusMode,
    setFocusMode: preferences.setFocusMode,

    sidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,

    searchModalOpen: search.searchModalOpen,
    setSearchModalOpen: search.setSearchModalOpen,
    searchQuery: search.searchQuery,
    searchResults: search.searchResults,
    searching: search.searching,
    highlightTerm: search.highlightTerm,
    handleSearch: search.handleSearch,
    handleJumpToSearch,

    isSpeaking: audio.isSpeaking,
    handleToggleSpeech: audio.handleToggleSpeech,

    isOfflineCached,
    downloadProgress,
    isExporting,
    highlights,
    handleSaveOffline,
    handleDownloadDeviceFile,
    handleHighlightParagraph,
    handleCopyCitation,
  };
}
