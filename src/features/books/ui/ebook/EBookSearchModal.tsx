'use client';

import { useRef, useEffect } from 'react';
import { Search, X, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InBookSearchResult, ThemeStyle } from './types';

interface EBookSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  searchResults: InBookSearchResult[];
  searching: boolean;
  onJumpToSearch: (result: InBookSearchResult) => void;
  bookTitle: string;
  themeStyle?: ThemeStyle;
}

export function EBookSearchModal({
  isOpen,
  onClose,
  searchQuery,
  onSearch,
  searchResults,
  searching,
  onJumpToSearch,
  bookTitle,
}: EBookSearchModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Search className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  البحث الشامل في الكتاب
                </DialogTitle>
                <p className="text-xs text-muted-foreground truncate max-w-sm">
                  {bookTitle}
                </p>
              </div>
            </div>
            {searchResults.length > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">
                {searchResults.length} نتيجة
              </Badge>
            )}
          </div>

          {/* Search Input Box */}
          <div className="relative mt-3">
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="اكتب كلمة أو عبارة للبحث في جميع أبواب الكتاب..."
              className="pr-10 pl-9 text-sm rounded-xl bg-background border-border/80 shadow-inner"
            />
            <Search className="size-4 absolute right-3.5 top-3 text-muted-foreground pointer-events-none" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearch('')}
                className="size-6 p-0 rounded-full absolute left-2.5 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[260px] max-h-[50vh]">
          {searching ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
              <Loader2 className="size-6 animate-spin text-amber-500" />
              <p>جاري البحث السريع في صفحات وأبواب الكتاب...</p>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((hit, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onJumpToSearch(hit);
                  onClose();
                }}
                className="w-full text-right p-3.5 rounded-xl border border-border/60 hover:border-amber-500/40 hover:bg-amber-500/[0.04] dark:hover:bg-amber-400/[0.03] transition-all text-xs space-y-2 group block"
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                    <BookOpen className="size-3.5" />
                    <span>{hit.chapterTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="bg-muted px-2 py-0.5 rounded">
                      صفحة {hit.pageNumber}
                    </span>
                    <ArrowLeft className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
                  </div>
                </div>
                <p className="line-clamp-3 text-foreground/90 text-[12px] leading-relaxed text-justify">
                  {hit.snippet}
                </p>
              </button>
            ))
          ) : searchQuery.trim().length >= 2 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center">
              <BookOpen className="size-8 opacity-30 text-amber-500 mb-1" />
              <p className="text-sm font-semibold">لم يُعثر على نتائج مطابقة</p>
              <p className="text-xs text-muted-foreground/80 max-w-xs">
                جرب البحث بكلمة مرادفة أو جذر الكلمة بدون زيادات أو لواحق
              </p>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center">
              <Search className="size-8 opacity-30 text-amber-500 mb-1" />
              <p className="text-sm font-semibold">ابحث داخل نص هذا الكتاب التراثي</p>
              <p className="text-xs text-muted-foreground/80 max-w-xs">
                يقوم المحرك بالبحث المطابق والمجرد عبر جميع الأبواب والفصول فوراً
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
