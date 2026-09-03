'use client';

import {
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Coffee,
  BookOpen,
  Columns2,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ViewMode, ReadingMode } from '@/hooks/use-pdf-viewer';

interface ToolbarViewOptionsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  readingMode: ReadingMode;
  onSetReadingMode: (mode: ReadingMode) => void;
}

export function ToolbarViewOptions({
  zoom,
  onZoomIn,
  onZoomOut,
  viewMode,
  onSetViewMode,
  readingMode,
  onSetReadingMode,
}: ToolbarViewOptionsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onZoomOut}
          title="تصغير"
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="text-xs font-mono w-10 text-center text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onZoomIn}
          title="تكبير"
        >
          <ZoomIn className="size-4" />
        </Button>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      {/* View Mode (Single, Spread, Continuous) */}
      <div className="flex items-center gap-0.5">
        <Button
          variant={viewMode === 'single' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-8"
          onClick={() => onSetViewMode('single')}
          title="صفحة واحدة"
        >
          <BookOpen className="size-4" />
        </Button>
        <Button
          variant={viewMode === 'spread' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-8"
          onClick={() => onSetViewMode('spread')}
          title="صفحتان متقابلتان"
        >
          <Columns2 className="size-4" />
        </Button>
        <Button
          variant={viewMode === 'continuous' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-8"
          onClick={() => onSetViewMode('continuous')}
          title="تمرير متواصل"
        >
          <ScrollText className="size-4" />
        </Button>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Reading Themes (Light, Sepia, Dark) */}
      <div className="flex items-center gap-0.5">
        <Button
          variant={readingMode === 'light' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-8"
          onClick={() => onSetReadingMode('light')}
          title="النمط النهاري"
        >
          <Sun className="size-4" />
        </Button>
        <Button
          variant={readingMode === 'sepia' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-8"
          onClick={() => onSetReadingMode('sepia')}
          title="النمط الدافئ (ورقي)"
        >
          <Coffee className="size-4 text-amber-700 dark:text-amber-500" />
        </Button>
        <Button
          variant={readingMode === 'dark' ? 'secondary' : 'ghost'}
          size="icon"
          className="size-8"
          onClick={() => onSetReadingMode('dark')}
          title="النمط الليلي"
        >
          <Moon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
