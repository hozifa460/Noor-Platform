'use client';

import { useState, useEffect, useRef } from 'react';
import { Bookmark, X, BookMarked, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UsePdfViewerResult } from '@/hooks/use-pdf-viewer';

interface SidebarProps {
  viewer: UsePdfViewerResult;
  onClose: () => void;
}

export function Sidebar({ viewer, onClose }: SidebarProps) {
  const {
    numPages,
    currentPage,
    bookmarks,
    lastReadPage,
    goToPage,
    toggleBookmark,
    isBookmarked,
    renderPage,
  } = viewer;

  const [activeTab, setActiveTab] = useState<'thumbnails' | 'bookmarks'>(
    'thumbnails',
  );

  return (
    <div className="w-64 border-l border-border bg-background shrink-0 flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('thumbnails')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            activeTab === 'thumbnails'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          الصفحات
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            activeTab === 'bookmarks'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          الإشارات ({bookmarks.length})
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'thumbnails' ? (
          <ThumbnailsGrid
            numPages={numPages}
            currentPage={currentPage}
            goToPage={(p) => {
              goToPage(p);
              onClose();
            }}
            renderPage={renderPage}
          />
        ) : (
          <BookmarksList
            bookmarks={bookmarks}
            lastReadPage={lastReadPage}
            currentPage={currentPage}
            goToPage={(p) => {
              goToPage(p);
              onClose();
            }}
            toggleBookmark={toggleBookmark}
          />
        )}
      </div>
    </div>
  );
}

function ThumbnailsGrid({
  numPages,
  currentPage,
  goToPage,
  renderPage,
}: {
  numPages: number;
  currentPage: number;
  goToPage: (p: number) => void;
  renderPage: UsePdfViewerResult['renderPage'];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 20 });

  // Virtualize thumbnails — only render those near the viewport.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      const thumbHeight = 180; // estimated thumbnail height + gap
      const start = Math.max(1, Math.floor(scrollTop / thumbHeight) * 2 + 1);
      const end = Math.min(
        numPages,
        start + Math.ceil(viewportHeight / thumbHeight) * 2 + 10,
      );
      setVisibleRange({ start, end });
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages]);

  const thumbs: number[] = [];
  for (let p = visibleRange.start; p <= visibleRange.end; p++) {
    thumbs.push(p);
  }

  const aboveHeight = (visibleRange.start - 1) * 90; // each row ~90px
  const belowHeight = Math.max(0, (numPages - visibleRange.end) * 90);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        {aboveHeight > 0 && <div style={{ height: aboveHeight, gridColumn: 'span 2' }} />}
        {thumbs.map((pageNum) => (
          <ThumbnailItem
            key={pageNum}
            pageNum={pageNum}
            isActive={pageNum === currentPage}
            onClick={() => goToPage(pageNum)}
            renderPage={renderPage}
          />
        ))}
        {belowHeight > 0 && <div style={{ height: belowHeight, gridColumn: 'span 2' }} />}
      </div>
    </div>
  );
}

function ThumbnailItem({
  pageNum,
  isActive,
  onClick,
  renderPage,
}: {
  pageNum: number;
  isActive: boolean;
  onClick: () => void;
  renderPage: UsePdfViewerResult['renderPage'];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    (async () => {
      try {
        // Render at low zoom for thumbnail.
        await renderPage(pageNum, canvas, 0.3);
        if (!cancelled) setRendered(true);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageNum, renderPage]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'aspect-[3/4] border-2 rounded overflow-hidden transition-colors bg-white relative',
        isActive ? 'border-primary' : 'border-border hover:border-primary/50',
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ display: rendered ? 'block' : 'none' }}
      />
      {!rendered && (
        <div className="absolute inset-0 grid place-items-center bg-muted/30">
          <span className="text-[10px] text-muted-foreground">{pageNum}</span>
        </div>
      )}
      <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded">
        {pageNum}
      </span>
    </button>
  );
}

function BookmarksList({
  bookmarks,
  lastReadPage,
  currentPage,
  goToPage,
  toggleBookmark,
}: {
  bookmarks: number[];
  lastReadPage: number;
  currentPage: number;
  goToPage: (p: number) => void;
  toggleBookmark: (p: number) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Resume reading */}
      {lastReadPage > 1 && lastReadPage !== currentPage && (
        <button
          onClick={() => goToPage(lastReadPage)}
          className="w-full flex items-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-right"
        >
          <History className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">متابعة القراءة</p>
            <p className="text-[10px] text-muted-foreground">
              صفحة {lastReadPage}
            </p>
          </div>
        </button>
      )}

      {bookmarks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookMarked className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">لا توجد إشارات بعد</p>
          <p className="text-[10px] mt-1">
            اضغط أيقونة الإشارة لحفظ صفحة
          </p>
        </div>
      ) : (
        bookmarks.map((page) => (
          <div
            key={page}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/40 transition-colors group"
          >
            <button
              onClick={() => goToPage(page)}
              className="flex-1 flex items-center gap-2 text-right"
            >
              <Bookmark className="size-4 text-primary fill-current shrink-0" />
              <span className="text-xs">صفحة {page}</span>
            </button>
            <button
              onClick={() => toggleBookmark(page)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
