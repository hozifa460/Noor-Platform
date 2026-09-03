'use client';

import { Search, X, HelpCircle, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GradeFilterOption } from '@/types/hadith';

export const GRADE_FILTERS: GradeFilterOption[] = [
  { id: 'all', name: 'جميع الدرجات' },
  {
    id: 'muttafaqun',
    name: 'متفق عليه 🌟',
    dotColor: 'bg-emerald-600',
    activeClass:
      'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-600/50 font-extrabold shadow-xs',
  },
  {
    id: 'sahih',
    name: 'صحيح',
    dotColor: 'bg-emerald-500',
    activeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'hasan',
    name: 'حسن',
    dotColor: 'bg-sky-500',
    activeClass:
      'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
  },
  {
    id: 'daif',
    name: 'ضعيف',
    dotColor: 'bg-amber-500',
    activeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  },
  {
    id: 'mawdu',
    name: 'موضوع ⚠️',
    dotColor: 'bg-rose-500',
    activeClass:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
  },
];

interface HadithSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchMode: 'book' | 'all';
  onToggleSearchMode: (m: 'book' | 'all') => void;
  activeGradeFilter: string;
  onSelectGradeFilter: (g: 'all' | 'muttafaqun' | 'sahih' | 'hasan' | 'daif' | 'mawdu') => void;
  onOpenGradesGuide: () => void;
  activeBookName: string;
}

export function HadithSearchHeader({
  searchQuery,
  onSearchChange,
  searchMode,
  onToggleSearchMode,
  activeGradeFilter,
  onSelectGradeFilter,
  onOpenGradesGuide,
  activeBookName,
}: HadithSearchHeaderProps) {
  return (
    <div className="space-y-3 bg-card p-4 sm:p-5 rounded-3xl border border-border/80 shadow-xs">
      {/* Search Input Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              searchMode === 'book'
                ? `ابحث في نص أو راوي أحاديث ${activeBookName}...`
                : 'ابحث في كافة دواوين الحديث النبوي الشريف (17 كتاباً)...'
            }
            className="pr-10 pl-9 h-11 rounded-2xl bg-muted/30 border-border/80 text-sm font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Search Mode Switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/80 text-xs font-bold shrink-0">
          <button
            onClick={() => onToggleSearchMode('book')}
            className={cn(
              'px-3 py-2 rounded-xl transition-all cursor-pointer',
              searchMode === 'book'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            هذا الكتاب
          </button>
          <button
            onClick={() => onToggleSearchMode('all')}
            className={cn(
              'px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1',
              searchMode === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-3" />
            <span>كل الدواوين</span>
          </button>
        </div>
      </div>

      {/* Grade Filters & Guide Button */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {GRADE_FILTERS.map((f) => {
            const isSelected = activeGradeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectGradeFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
                  isSelected
                    ? f.activeClass || 'bg-primary/15 text-primary border-primary/40 font-bold'
                    : 'bg-background/50 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f.dotColor && (
                  <span className={cn('size-2 rounded-full inline-block', f.dotColor)} />
                )}
                <span>{f.name}</span>
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenGradesGuide}
          className="gap-1.5 text-xs text-muted-foreground hover:text-primary rounded-xl shrink-0 h-8"
        >
          <HelpCircle className="size-3.5" />
          <span>دليل درجات الحديث</span>
        </Button>
      </div>
    </div>
  );
}
