'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerMobileBarProps {
  currentPage: number;
  numPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function PdfViewerMobileBar({
  currentPage,
  numPages,
  onPrevPage,
  onNextPage,
}: PdfViewerMobileBarProps) {
  return (
    <div className="sm:hidden flex items-center justify-between px-3 py-2 border-t border-border bg-background shrink-0 select-none">
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        title="الصفحة السابقة"
      >
        <ChevronRight className="size-5" />
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums font-mono">
        {currentPage} / {numPages}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={onNextPage}
        disabled={currentPage >= numPages}
        title="الصفحة التالية"
      >
        <ChevronLeft className="size-5" />
      </Button>
    </div>
  );
}
