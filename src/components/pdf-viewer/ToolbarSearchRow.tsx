'use client';

import { Search, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { UsePdfViewerResult } from '@/hooks/use-pdf-viewer';

interface ToolbarSearchRowProps {
  viewer: UsePdfViewerResult;
  onClose: () => void;
}

export function ToolbarSearchRow({ viewer, onClose }: ToolbarSearchRowProps) {
  const {
    searchResults,
    currentSearchIdx,
    nextSearchResult,
    prevSearchResult,
    searching,
    search,
  } = viewer;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/40">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="بحث في صفحات الكتاب..."
          className="pr-9 pl-4 h-8 text-xs bg-background"
          onChange={(e) => search(e.target.value)}
          autoFocus
        />
      </div>

      {searching && <Loader2 className="size-4 animate-spin text-primary shrink-0" />}

      {searchResults.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-xs">
            {currentSearchIdx + 1} من {searchResults.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={prevSearchResult}
            title="السابق"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={nextSearchResult}
            title="التالي"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      )}

      {searchResults.length === 0 && !searching && (
        <span className="text-xs text-muted-foreground">لا توجد نتائج</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-8 mr-auto shrink-0"
        onClick={onClose}
        title="إغلاق البحث"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
