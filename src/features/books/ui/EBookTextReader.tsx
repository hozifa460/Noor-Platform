'use client';

import { Loader2 } from 'lucide-react';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  EBookToolbar,
  EBookSidebarToc,
  EBookSearchModal,
  EBookPaginationBar,
  EBookContentView,
  THEME_STYLES,
  useEBookReader,
} from './ebook';

interface EBookTextReaderProps {
  bookItem: MediaItem;
  onClose: () => void;
  onSwitchToPdf?: () => void;
}

export function EBookTextReader({
  bookItem,
  onClose,
  onSwitchToPdf,
}: EBookTextReaderProps) {
  const {
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
  } = useEBookReader(bookItem);

  const themeStyle = THEME_STYLES[theme];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col select-text transition-colors duration-300',
        themeStyle.bg,
        themeStyle.text
      )}
    >
      {/* 1. Top Deluxe Header Toolbar */}
      <EBookToolbar
        title={metaRes?.meta.title || bookItem.title}
        author={metaRes?.meta.author || bookItem.sheikhName}
        authorDeath={metaRes?.meta.authorDeath}
        hasFacsimilePdf={metaRes?.meta.hasFacsimilePdf}
        onClose={onClose}
        onSwitchToPdf={onSwitchToPdf}
        isExporting={isExporting}
        onDownloadDeviceFile={handleDownloadDeviceFile}
        isOfflineCached={isOfflineCached}
        downloadProgress={downloadProgress}
        onSaveOffline={handleSaveOffline}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSearch={() => setSearchModalOpen(true)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        isSpeaking={isSpeaking}
        onToggleSpeech={handleToggleSpeech}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        tashkeel={tashkeel}
        setTashkeel={setTashkeel}
        currentChapter={currentChapter}
        totalChapters={metaRes?.meta.totalChapters}
        themeStyle={themeStyle}
      />

      {/* 2. Main Reader Body with Sidebar */}
      <div className="flex-1 relative flex overflow-hidden">
        <EBookSidebarToc
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          metaRes={metaRes}
          currentChapter={currentChapter}
          onJumpToChapter={handleJumpToChapter}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          searchResults={searchResults}
          searching={searching}
          onJumpToSearch={handleJumpToSearch}
          highlights={highlights}
          themeStyle={themeStyle}
        />

        <main
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 md:px-12 py-8 flex flex-col items-center"
        >
          <div className="w-full max-w-3xl min-h-full">
            {loading ? (
              <div className="h-[60vh] flex flex-col items-center justify-center gap-3 opacity-60">
                <Loader2 className="size-8 animate-spin text-amber-500" />
                <p className="text-sm font-medium">جاري تحميل وتنسيق نص الباب التراثي...</p>
              </div>
            ) : (
              <>
                <EBookContentView
                  chunkData={chunkData}
                  metaRes={metaRes}
                  tashkeel={tashkeel}
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  highlightTerm={highlightTerm}
                  onCopyCitation={handleCopyCitation}
                  onHighlightParagraph={handleHighlightParagraph}
                  onGoToStart={() => setCurrentChapter(1)}
                  onOpenToc={() => {
                    setActiveTab('toc');
                    setSidebarOpen(true);
                  }}
                />

                {chunkData && (
                  <EBookPaginationBar
                    currentChapter={currentChapter}
                    totalChapters={metaRes?.meta.totalChapters || 1}
                    startPage={chunkData.startPage}
                    endPage={chunkData.endPage}
                    onPrevChapter={() => setCurrentChapter((c) => Math.max(1, c - 1))}
                    onNextChapter={() => setCurrentChapter((c) => c + 1)}
                    onSelectChapter={(c) => setCurrentChapter(c)}
                    themeStyle={themeStyle}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 3. Search Modal Dialog */}
      <EBookSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        searchResults={searchResults}
        searching={searching}
        onJumpToSearch={handleJumpToSearch}
        bookTitle={metaRes?.meta.title || bookItem.title}
        themeStyle={themeStyle}
      />
    </div>
  );
}
