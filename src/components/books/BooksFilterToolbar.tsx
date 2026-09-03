'use client';

import { Search, X, LayoutGrid, List, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BOOK_CATEGORIES, BOOK_LANGUAGES, type BookCategory } from '@/data/books';
import { cn } from '@/lib/utils';

interface BooksFilterToolbarProps {
  localSearch: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
}

export function BooksFilterToolbar({
  localSearch,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  selectedCategory,
  onSelectCategory,
  selectedLanguage,
  onSelectLanguage,
  viewMode,
  onToggleViewMode,
}: BooksFilterToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Search Input & View Mode & Language row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/70 p-4 sm:p-5 rounded-3xl border border-border/80 backdrop-blur-md shadow-xs">
        {/* Search input */}
        <form onSubmit={onSearchSubmit} className="relative w-full md:max-w-xl">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في أكثر من 8,589 كتاباً أو مؤلفاً أو فناً إسلامياً..."
            className="pr-10 pl-9 h-11 rounded-2xl bg-muted/40 border-border/80 text-sm font-medium"
          />
          {localSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </form>

        {/* View Mode & Language Selector */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Language Picker */}
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="h-10 px-3 rounded-2xl bg-muted/40 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {BOOK_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grid / List Mode Toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/80">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => onToggleViewMode('grid')}
              className="size-8 rounded-xl"
              title="عرض الشبكة"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => onToggleViewMode('list')}
              className="size-8 rounded-xl"
              title="عرض القائمة"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {BOOK_CATEGORIES.map((cat: BookCategory) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card/70 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span>{cat.emoji || '📖'}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
