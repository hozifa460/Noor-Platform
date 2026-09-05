'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { ThemeStyle } from './types';

interface EBookPaginationBarProps {
  currentChapter: number;
  totalChapters: number;
  startPage?: number;
  endPage?: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onSelectChapter?: (chapter: number) => void;
  themeStyle?: ThemeStyle;
  className?: string;
}

export function EBookPaginationBar({
  currentChapter,
  totalChapters,
  startPage,
  endPage,
  onPrevChapter,
  onNextChapter,
  onSelectChapter,
  themeStyle,
  className,
}: EBookPaginationBarProps) {
  const safeTotal = Math.max(1, totalChapters || 1);

  return (
    <nav
      aria-label="Chapter navigation"
      className={cn(
        'w-full pt-8 pb-4 mt-12 border-t border-current/10 space-y-4 select-none',
        className
      )}
    >
      {/* Chapter Slider for smooth jumping */}
      {onSelectChapter && safeTotal > 1 && (
        <div className="max-w-md mx-auto px-4 flex items-center gap-3">
          <span className="text-[11px] font-mono opacity-60">1</span>
          <Slider
            value={[currentChapter]}
            min={1}
            max={safeTotal}
            step={1}
            onValueChange={(val) => {
              if (val && val[0]) onSelectChapter(val[0]);
            }}
            className="flex-1 cursor-pointer"
          />
          <span className="text-[11px] font-mono opacity-60">{safeTotal}</span>
        </div>
      )}

      {/* Buttons & Indicators */}
      <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
        {/* RTL: Previous Chapter is to the right */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentChapter <= 1}
          onClick={onPrevChapter}
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-bold gap-1.5 transition-all shadow-sm',
            themeStyle?.cardBg
          )}
        >
          <ChevronRight className="size-4" />
          <span>الفصل السابق</span>
        </Button>

        {/* Center Chapter & Page Info */}
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold">
            الفصل <span className="font-mono text-amber-600 dark:text-amber-400">{currentChapter}</span> من{' '}
            <span className="font-mono opacity-70">{safeTotal}</span>
          </span>
          {startPage !== undefined && endPage !== undefined && (
            <span className="text-[10px] opacity-60 font-mono">
              ص {startPage} - ص {endPage}
            </span>
          )}
        </div>

        {/* RTL: Next Chapter is to the left */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentChapter >= safeTotal}
          onClick={onNextChapter}
          className={cn(
            'rounded-xl px-4 py-2 text-xs font-bold gap-1.5 transition-all shadow-sm',
            themeStyle?.cardBg
          )}
        >
          <span>الفصل التالي</span>
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
