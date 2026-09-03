'use client';

import { useState } from 'react';
import { BookOpen, X, Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { HadithChapter } from '@/lib/hadith-engine';
import { cn } from '@/lib/utils';

interface HadithChapterSelectorModalProps {
  open: boolean;
  onClose: () => void;
  chapters: HadithChapter[];
  selectedChapterId: number | 'all';
  onSelectChapter: (id: number | 'all') => void;
  bookTitle: string;
}

export function HadithChapterSelectorModal({
  open,
  onClose,
  chapters,
  selectedChapterId,
  onSelectChapter,
  bookTitle,
}: HadithChapterSelectorModalProps) {
  const [search, setSearch] = useState('');

  if (!open) return null;

  const filteredChapters = chapters.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return c.arabic.includes(q) || String(c.id).includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <div>
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                فهرس أبواب كتاب ({bookTitle})
              </h3>
              <p className="text-xs text-muted-foreground">{chapters.length} باباً وفصلاً</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الباب أو رقمه..."
              className="pr-9 h-10 rounded-xl bg-muted/40 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Chapters list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Option for All Chapters */}
          <button
            onClick={() => {
              onSelectChapter('all');
              onClose();
            }}
            className={cn(
              'w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer',
              selectedChapterId === 'all'
                ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                : 'border-border/60 bg-card hover:bg-muted/50 text-foreground'
            )}
          >
            <span>📖 جميع الأبواب والأحاديث</span>
            {selectedChapterId === 'all' && <Check className="size-4 text-primary" />}
          </button>

          {filteredChapters.map((c) => {
            const isSelected = selectedChapterId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  onSelectChapter(c.id);
                  onClose();
                }}
                className={cn(
                  'w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                    : 'border-border/60 bg-card hover:bg-muted/50 text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="size-7 rounded-lg bg-muted text-xs font-mono font-bold grid place-items-center shrink-0">
                    {c.id}
                  </span>
                  <span className="text-sm font-medium leading-normal">{c.arabic}</span>
                </div>
                {isSelected && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
