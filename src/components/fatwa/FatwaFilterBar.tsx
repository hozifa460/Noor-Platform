'use client';

import { Search, X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FATWA_CATEGORIES, SCHOLARS_LIST } from '@/lib/fatwa-index';
import { cn } from '@/lib/utils';

interface FatwaFilterBarProps {
  localSearch: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  selectedScholar: string;
  onSelectScholar: (id: string) => void;
}

export function FatwaFilterBar({
  localSearch,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  selectedCategory,
  onSelectCategory,
  selectedScholar,
  onSelectScholar,
}: FatwaFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* Search Input & Scholar Filter Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/70 p-4 sm:p-5 rounded-3xl border border-border/80 backdrop-blur-md shadow-xs">
        <form onSubmit={onSearchSubmit} className="relative w-full md:max-w-xl">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في أكثر من 50,000 فتوى أو مسألة فقهية..."
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

        {/* Scholar Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <User className="size-4 text-muted-foreground shrink-0" />
          <select
            value={selectedScholar}
            onChange={(e) => onSelectScholar(e.target.value)}
            className="h-10 px-3 rounded-2xl bg-muted/40 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-auto"
          >
            <option value="all">جميع العلماء والمفتين</option>
            {SCHOLARS_LIST.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => onSelectCategory('all')}
          className={cn(
            'px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-card/70 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          جميع الأبواب
        </button>
        {FATWA_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card/70 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
