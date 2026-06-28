'use client';

import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  List,
  Search,
  Bookmark,
  Download,
  Share2,
  Printer,
  Loader2,
  BookOpen,
  Columns2,
  ScrollText,
  BookMarked,
  Sun,
  Moon,
  Coffee,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UsePdfViewerResult, ViewMode, ReadingMode } from '@/hooks/use-pdf-viewer';

interface ToolbarProps {
  viewer: UsePdfViewerResult;
  title?: string;
  url: string;
  onToggleSidebar: () => void;
  onToggleSearch: () => void;
  showSearch: boolean;
}

export function Toolbar({
  viewer,
  title,
  url,
  onToggleSidebar,
  onToggleSearch,
  showSearch,
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
    searchResults,
    currentSearchIdx,
    nextSearchResult,
    prevSearchResult,
    searching,
  } = viewer;

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
      {/* ─── Top row: navigation + title ─── */}
      <div className="flex items-center gap-1 px-3 py-2 flex-wrap">
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
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={onToggleSearch}
          title="بحث في الكتاب"
        >
          <Search className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Page navigation */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={prevPage}
          disabled={currentPage <= 1}
          title="الصفحة السابقة"
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) goToPage(v);
            }}
            className="h-8 w-14 text-center text-sm"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            / {numPages || '?'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={nextPage}
          disabled={currentPage >= numPages}
          title="الصفحة التالية"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Zoom */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={zoomOut}
          title="تصغير"
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={zoomIn}
          title="تكبير"
        >
          <ZoomIn className="size-4" />
        </Button>

        <div className="flex-1" />

        {/* Title */}
        {title && (
          <span className="text-xs text-muted-foreground truncate max-w-[150px] hidden md:inline">
            {title}
          </span>
        )}

        {/* Bookmark current page */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-9', isBookmarked(currentPage) && 'text-primary')}
          onClick={() => toggleBookmark(currentPage)}
          title={isBookmarked(currentPage) ? 'إزالة الإشارة' : 'إضافة إشارة'}
        >
          <Bookmark className={cn('size-4', isBookmarked(currentPage) && 'fill-current')} />
        </Button>

        {/* Download */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-9"
          title="تنزيل"
        >
          <a href={url} target="_blank" rel="noopener noreferrer" download>
            <Download className="size-4" />
          </a>
        </Button>

        {/* Print */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-9"
          title="طباعة"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Printer className="size-4" />
          </a>
        </Button>

        {/* Share */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({
                  title: title || 'كتاب',
                  url: `${window.location.origin}/books/${encodeURIComponent(title || 'book')}/page/${currentPage}`,
                });
              } else {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/books/${encodeURIComponent(title || 'book')}/page/${currentPage}`,
                );
              }
            } catch {
              // user cancelled
            }
          }}
          title="مشاركة"
        >
          <Share2 className="size-4" />
        </Button>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </Button>
      </div>

      {/* ─── Second row: view modes + reading modes ─── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50 flex-wrap">
        {/* View modes */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <button
            onClick={() => setViewMode('single')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
              viewMode === 'single'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="صفحة واحدة"
          >
            <BookOpen className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode('continuous')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
              viewMode === 'continuous'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="تمرير مستمر"
          >
            <ScrollText className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode('spread')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
              viewMode === 'spread'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="صفحتين متجاورتين"
          >
            <Columns2 className="size-3.5" />
          </button>
        </div>

        {/* Reading modes */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <button
            onClick={() => setReadingMode('light')}
            className={cn(
              'px-2 py-1 rounded transition-colors',
              readingMode === 'light'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="وضع نهاري"
          >
            <Sun className="size-3.5" />
          </button>
          <button
            onClick={() => setReadingMode('sepia')}
            className={cn(
              'px-2 py-1 rounded transition-colors',
              readingMode === 'sepia'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="وضع بني"
          >
            <Coffee className="size-3.5" />
          </button>
          <button
            onClick={() => setReadingMode('dark')}
            className={cn(
              'px-2 py-1 rounded transition-colors',
              readingMode === 'dark'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="وضع ليلي"
          >
            <Moon className="size-3.5" />
          </button>
        </div>

        {/* Search results indicator */}
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {currentSearchIdx + 1}/{searchResults.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={prevSearchResult}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={nextSearchResult}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        )}

        {searching && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            جاري البحث...
          </div>
        )}
      </div>

      {/* ─── Search bar (collapsible) ─── */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-muted/30">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={viewer.searchQuery}
            onChange={(e) => {
              viewer.setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value;
                if (searchResults.length > 0) nextSearchResult();
                else viewer.search(v);
              }
            }}
            placeholder="ابحث في الكتاب..."
            className="h-8 flex-1 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>(
                'input[placeholder="ابحث في الكتاب..."]',
              );
              if (input?.value) {
                if (searchResults.length > 0) nextSearchResult();
                else viewer.search(input.value);
              }
            }}
            disabled={searching}
          >
            {searching ? <Loader2 className="size-3.5 animate-spin" /> : 'بحث'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => {
              viewer.clearSearch();
              onToggleSearch();
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
