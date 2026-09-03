'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { QUICK_ADHKAR_TABS, type AdhkarCategory } from '@/lib/adhkar/engine';
import { cn } from '@/lib/utils';

interface AdhkarFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTab: string;
  onSelectTab: (tabId: string) => void;
  selectedCategoryId: number | 'all';
  onSelectCategory: (catId: number | 'all') => void;
  categories: AdhkarCategory[];
}

export function AdhkarFilterBar({
  searchQuery,
  onSearchChange,
  selectedTab,
  onSelectTab,
  selectedCategoryId,
  onSelectCategory,
  categories,
}: AdhkarFilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
          {QUICK_ADHKAR_TABS.map((tab) => {
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  onSelectCategory('all');
                }}
                className={cn(
                  'px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Search & Category Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {selectedTab === 'all' && (
            <select
              value={selectedCategoryId}
              onChange={(e) =>
                onSelectCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="h-11 px-3 rounded-2xl bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">كافة الأبواب (132 باباً)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category} ({c.array.length})
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في الأذكار والأدعية..."
              className="pr-10 pl-8 h-11 rounded-2xl bg-card border-border/80 text-xs sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
