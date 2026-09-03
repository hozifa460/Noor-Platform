'use client';

import { Radio, User, BookOpen, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RadioCategory, RadioCategoryTab } from '@/types/radio';

export const CATEGORY_TABS: RadioCategoryTab[] = [
  { id: 'all', label: 'كافة الإذاعات', emoji: '🌟', icon: Radio },
  { id: 'national', label: 'الإذاعات الكبرى والعامة', emoji: '📻', icon: Radio },
  { id: 'reciters', label: 'إذاعات كبار القراء', emoji: '🎙️', icon: User },
  { id: 'hadith', label: 'الحديث والسنة والتفاسير', emoji: '📚', icon: BookOpen },
  { id: 'translations', label: 'ترجمات معاني القرآن', emoji: '🌍', icon: Globe },
];

interface RadioCategoryTabsProps {
  selectedCategory: RadioCategory;
  onSelectCategory: (id: RadioCategory) => void;
}

export function RadioCategoryTabs({
  selectedCategory,
  onSelectCategory,
}: RadioCategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {CATEGORY_TABS.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <span>{cat.emoji}</span>
            <Icon className="size-3.5" />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
