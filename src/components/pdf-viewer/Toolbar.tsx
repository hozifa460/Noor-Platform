'use client';

import {
  List,
  Search,
  Bookmark,
  Download,
  Share2,
  Printer,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolbarSearchRow } from './ToolbarSearchRow';
import { ToolbarPagination } from './ToolbarPagination';
import { ToolbarViewOptions } from './ToolbarViewOptions';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/shared';
import type { UsePdfViewerResult } from '@/hooks/use-pdf-viewer';

interface ToolbarProps {
  viewer: UsePdfViewerResult;
  title?: string;
  url: string;
  onToggleSidebar: () => void;
  onToggleSearch: () => void;
  showSearch: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export function Toolbar({
  viewer,
  title,
  url,
  onToggleSidebar,
  onToggleSearch,
  showSearch,
  focusMode,
  onToggleFocusMode,
}: ToolbarProps) {
  const {
    currentPage,
    numPages,
    zoom,
    viewMode,
    readingMode,
    isFullscreen,
    isBookmarked,
    toggleBookmark,
    goToPage,
    prevPage,
    nextPage,
    zoomIn,
    zoomOut,
    setViewMode,
    setReadingMode,
    toggleFullscreen,
  } = viewer;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      copyToClipboard(window.location.href, 'تم نسخ رابط الصفحة بنجاح');
    }
  };


  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
      {/* Main Top Row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 flex-wrap">
        {/* Left Side: Sidebar Toggle, Search Toggle, and Title */}
        <div className="flex items-center gap-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={onToggleSidebar}
            title="الفهرس والإشارات"
          >
            <List className="size-4" />
          </Button>

          <Button
            variant={showSearch ? 'secondary' : 'ghost'}
            size="icon"
            className="size-9"
            onClick={onToggleSearch}
            title="بحث في الكتاب"
          >
            <Search className="size-4" />
          </Button>

          {title && (
            <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs px-2 hidden sm:inline-block">
              {title}
            </span>
          )}
        </div>

        {/* Center: Pagination */}
        <ToolbarPagination
          currentPage={currentPage}
          numPages={numPages}
          onGoToPage={goToPage}
          onPrevPage={prevPage}
          onNextPage={nextPage}
        />

        {/* Right Side: View Options & Utility Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Zoom, Modes & Reading Themes */}
          <ToolbarViewOptions
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            readingMode={readingMode}
            onSetReadingMode={setReadingMode}
          />

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Bookmark */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-8', isBookmarked(currentPage) && 'text-amber-500')}
            onClick={() => toggleBookmark(currentPage)}
            title={isBookmarked(currentPage) ? 'إزالة الإشارة' : 'حفظ إشارة مرجعية'}
          >
            <Bookmark className={cn('size-4', isBookmarked(currentPage) && 'fill-amber-500')} />
          </Button>

          {/* Focus Mode Toggle */}
          {onToggleFocusMode && (
            <Button
              variant={focusMode ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={onToggleFocusMode}
              title={focusMode ? 'إلغاء وضع التركيز' : 'وضع التركيز وقراءة هادئة'}
            >
              {focusMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          )}

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>

          {/* Print */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hidden sm:inline-flex"
            onClick={handlePrint}
            title="طباعة"
          >
            <Printer className="size-4" />
          </Button>

          {/* Share */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hidden sm:inline-flex"
            onClick={handleShare}
            title="مشاركة رابط الكتاب"
          >
            <Share2 className="size-4" />
          </Button>

          {/* Download */}
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="تنزيل الملف (PDF)"
          >
            <Download className="size-4" />
          </a>
        </div>
      </div>

      {/* Optional Expandable Search Row */}
      {showSearch && (
        <ToolbarSearchRow viewer={viewer} onClose={onToggleSearch} />
      )}
    </div>
  );
}
