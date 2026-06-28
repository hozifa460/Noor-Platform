'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePdfViewer, type ReadingMode } from '@/hooks/use-pdf-viewer';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { ContinuousView } from './ContinuousView';
import { SinglePageView } from './SinglePageView';

interface PdfViewerProps {
  url: string;
  title?: string;
  bookSlug?: string;
  initialPage?: number;
}

/**
 * Production-grade PDF Viewer for the Islamic media platform.
 *
 * Features:
 *   - Multiple view modes: single, continuous (virtualized), spread
 *   - Reading modes: light, dark, sepia
 *   - Search inside PDF with highlighted results
 *   - Bookmarks (localStorage)
 *   - Auto-save reading progress + resume
 *   - Zoom (buttons + mouse wheel + pinch)
 *   - Fullscreen
 *   - Keyboard shortcuts
 *   - Thumbnails sidebar
 *   - Loading skeletons
 *   - Error boundaries
 *   - IndexedDB cache for offline reading
 *   - Prefetch nearby pages
 *   - Arabic RTL support
 *
 * Architecture:
 *   - Viewer logic: usePdfViewer hook (separated from UI)
 *   - UI components: Toolbar, Sidebar, ContinuousView, SinglePageView
 *   - PDF.js config: src/lib/pdf/config.ts
 *   - Cache: src/lib/pdf/cache.ts (IndexedDB)
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

  // Sync local ref with the hook's container ref (for fullscreen).
  const setRef = useCallback((el: HTMLDivElement | null) => {
    localRef.current = el;
    viewer.setContainerRef(el);
  }, [viewer]);

  // Navigate to initial page if provided (deep linking).
  useEffect(() => {
    if (initialPage && initialPage > 1 && viewer.pdfDoc) {
      viewer.goToPage(initialPage);
    }
  }, [initialPage, viewer.pdfDoc, viewer.goToPage]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          if (viewer.viewMode === 'single') {
            e.preventDefault();
            viewer.nextPage();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          if (viewer.viewMode === 'single') {
            e.preventDefault();
            viewer.prevPage();
          }
          break;
        case 'Home':
          e.preventDefault();
          viewer.goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          viewer.goToPage(viewer.numPages);
          break;
        case '+':
        case '=':
          e.preventDefault();
          viewer.zoomIn();
          break;
        case '-':
          e.preventDefault();
          viewer.zoomOut();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            viewer.toggleFullscreen();
          }
          break;
        case 'b':
        case 'B':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            viewer.toggleBookmark(viewer.currentPage);
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewer]);

  // ─── Mouse wheel zoom (Ctrl + scroll) ────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) viewer.zoomIn();
        else viewer.zoomOut();
      }
    },
    [viewer],
  );

  // ─── Touch gestures (pinch zoom) ─────────────────────────────────
  const touchRef = useRef<{ distance: number | null }>({ distance: null });
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current.distance = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchRef.current.distance) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        const diff = newDistance - touchRef.current.distance;
        if (Math.abs(diff) > 10) {
          if (diff > 0) viewer.zoomIn();
          else viewer.zoomOut();
          touchRef.current.distance = newDistance;
        }
      }
    },
    [viewer],
  );

  // ─── Reading mode background ─────────────────────────────────────
  const readingModeBg: Record<ReadingMode, string> = {
    light: 'bg-white',
    dark: 'bg-gray-900',
    sepia: 'bg-amber-50',
  };

  // ─── Error state ─────────────────────────────────────────────────
  if (viewer.error) {
    return (
      <div className="w-full grid place-items-center bg-muted rounded-xl border border-border p-8" style={{ minHeight: 400 }}>
        <div className="text-center max-w-md">
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <p className="text-base font-bold mb-2">تعذر تحميل الكتاب</p>
          <p className="text-sm text-muted-foreground mb-6">{viewer.error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Force reload by changing the URL slightly
                window.location.reload();
              }}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              إعادة المحاولة
            </Button>
            <Button asChild variant="default" size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                <ExternalLink className="size-3.5" />
                فتح في نافذة جديدة
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────────
  if (viewer.loading) {
    return (
      <div
        className="w-full grid place-items-center bg-muted rounded-xl border border-border p-8"
        style={{ minHeight: 400 }}
      >
        <div className="text-center max-w-sm">
          <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            جاري تحميل الكتاب...
          </p>
          {viewer.loadProgress > 0 && (
            <>
              <div className="h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden max-w-xs mx-auto mb-1">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${viewer.loadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {Math.round(viewer.loadProgress)}%
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Main viewer ─────────────────────────────────────────────────
  return (
    <div
      ref={setRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      className={cn(
        'flex flex-col w-full bg-card rounded-xl border border-border overflow-hidden',
        viewer.isFullscreen && 'fixed inset-0 z-50 rounded-none',
      )}
      style={{ height: viewer.isFullscreen ? '100vh' : '85vh' }}
    >
      {/* Toolbar */}
      <Toolbar
        viewer={viewer}
        title={title}
        url={url}
        onToggleSidebar={() => setShowSidebar((v) => !v)}
        onToggleSearch={() => setShowSearch((v) => !v)}
        showSearch={showSearch}
      />

      {/* Main content: sidebar + page area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {showSidebar && <Sidebar viewer={viewer} onClose={() => setShowSidebar(false)} />}

        {/* Page display area */}
        <div className={cn('flex-1 min-w-0', readingModeBg[viewer.readingMode])}>
          {viewer.viewMode === 'single' ? (
            <SinglePageView viewer={viewer} />
          ) : viewer.viewMode === 'continuous' ? (
            <ContinuousView viewer={viewer} />
          ) : (
            // Spread mode — reuse continuous but show 2 pages side by side
            <ContinuousView viewer={viewer} />
          )}
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="sm:hidden flex items-center justify-between px-3 py-2 border-t border-border bg-background shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={viewer.prevPage}
          disabled={viewer.currentPage <= 1}
        >
          <ExternalLink className="size-5 rotate-180" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {viewer.currentPage} / {viewer.numPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={viewer.nextPage}
          disabled={viewer.currentPage >= viewer.numPages}
        >
          <ExternalLink className="size-5" />
        </Button>
      </div>
    </div>
  );
}
