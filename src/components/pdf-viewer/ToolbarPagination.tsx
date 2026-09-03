'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ToolbarPaginationProps {
  currentPage: number;
  numPages: number;
  onGoToPage: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function ToolbarPagination({
  currentPage,
  numPages,
  onGoToPage,
  onPrevPage,
  onNextPage,
}: ToolbarPaginationProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      onGoToPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onNextPage}
        disabled={currentPage >= numPages}
        title="الصفحة التالية"
      >
        <ChevronRight className="size-4" />
      </Button>

      <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
        <Input
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={handlePageSubmit}
          className="w-12 h-8 text-center text-xs p-0 bg-background"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          / {numPages || '...'}
        </span>
      </form>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        title="الصفحة السابقة"
      >
        <ChevronLeft className="size-4" />
      </Button>
    </div>
  );
}
