'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { usePdfViewer, type ReadingMode } from '@/hooks/use-pdf-viewer';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { ContinuousView } from './ContinuousView';
import { SinglePageView } from './SinglePageView';
import { PdfViewerError } from './PdfViewerError';
import { PdfViewerLoading } from './PdfViewerLoading';
import { PdfViewerMobileBar } from './PdfViewerMobileBar';
import { usePdfControls } from './use-pdf-controls';

interface PdfViewerProps {
  url: string;
  title?: string;
  bookSlug?: string;
  initialPage?: number;
}

const READING_MODE_BG: Record<ReadingMode, string> = {
  light: 'bg-white',
  dark: 'bg-gray-900',
  sepia: 'bg-amber-50',
};

/**
 * Production-grade PDF Viewer for the Islamic media platform.
 * Modular architecture:
 *   - usePdfViewer: core document and page rendering state
 *   - usePdfControls: gestures, zoom, keyboard shortcuts, focus mode
 *   - Subcomponents: Toolbar, Sidebar, ContinuousView, SinglePageView, PdfViewerError, PdfViewerLoading, PdfViewerMobileBar
 */
export function PdfViewer({
  url,
  title,
  bookSlug,
  initialPage,
}: PdfViewerProps) {
  const viewer = usePdfViewer(url, bookSlug || title);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const localRef = useRef<HTMLDivElement | null>(null);

  const {
    focusMode,
    setFocusMode,
    controlsVisible,
    showControlsTemporarily,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePdfControls(viewer);

  // Sync local ref with the hook's container ref (for fullscreen).
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      localRef.current = el;
      viewer.setContainerRef(el);
    },
    [viewer],
  );

  const { pdfDoc, goToPage } = viewer;

  // Navigate to initial page if provided (deep linking).
  useEffect(() => {
    if (initialPage && initialPage > 1 && pdfDoc) {
      goToPage(initialPage);
    }
  }, [initialPage, pdfDoc, goToPage]);

  // Error state
  if (viewer.error) {
    return (
      <PdfViewerError
        error={viewer.error}
        libraryError={viewer.libraryError}
        url={url}
        onRetry={() => viewer.retry()}
      />
    );
  }

  // Loading state
  if (viewer.loading) {
    return <PdfViewerLoading progress={viewer.loadProgress} />;
  }

  const readingProgress =
    viewer.numPages > 0
      ? Math.round((viewer.currentPage / viewer.numPages) * 100)
      : 0;

  return (
    <div
      ref={setRef}
      onWheel={(e) => {
        handleWheel(e);
        showControlsTemporarily();
      }}
      onTouchStart={(e) => {
        handleTouchStart(e);
        showControlsTemporarily();
      }}
      onTouchMove={(e) => {
        handleTouchMove(e);
        showControlsTemporarily();
      }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseMove={showControlsTemporarily}
      className={cn(
        'flex flex-col w-full bg-card rounded-xl border border-border overflow-hidden transition-all',
        viewer.isFullscreen && 'fixed inset-0 z-50 rounded-none',
        focusMode && !controlsVisible && 'cursor-none',
      )}
      style={{ height: viewer.isFullscreen ? '100vh' : '85vh' }}
    >
      {/* Toolbar — hidden in focus mode when controls are not visible */}
      {(!focusMode || controlsVisible) && (
        <Toolbar
          viewer={viewer}
          title={title}
          url={url}
          onToggleSidebar={() => setShowSidebar((v) => !v)}
          onToggleSearch={() => setShowSearch((v) => !v)}
          showSearch={showSearch}
          focusMode={focusMode}
          onToggleFocusMode={() => setFocusMode((v) => !v)}
        />
      )}

      {/* Main content: sidebar + page area */}
      <div className="flex-1 flex min-h-0">
        {showSidebar && (!focusMode || controlsVisible) && (
          <Sidebar viewer={viewer} onClose={() => setShowSidebar(false)} />
        )}

        <div className={cn('flex-1 min-w-0', READING_MODE_BG[viewer.readingMode])}>
          {viewer.viewMode === 'single' ? (
            <SinglePageView viewer={viewer} />
          ) : (
            <ContinuousView viewer={viewer} />
          )}
        </div>
      </div>

      {/* Reading progress bar (bottom) */}
      <div className="h-1 bg-muted shrink-0 relative">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${readingProgress}%` }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground tabular-nums bg-background/80 px-1 rounded font-mono">
          {readingProgress}%
        </span>
      </div>

      {/* Mobile bottom bar */}
      {(!focusMode || controlsVisible) && (
        <PdfViewerMobileBar
          currentPage={viewer.currentPage}
          numPages={viewer.numPages}
          onPrevPage={viewer.prevPage}
          onNextPage={viewer.nextPage}
        />
      )}
    </div>
  );
}
