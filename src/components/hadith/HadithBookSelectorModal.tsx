'use client';

import { useState } from 'react';
import { Library, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HADITH_BOOKS_LIST, type HadithBookMeta } from '@/lib/hadith/data';
import { cn } from '@/lib/utils';

export const HADITH_BOOK_CATEGORIES = [
  { id: 'all', name: 'جميع الدواوين (17 كتاباً)' },
  { id: 'sahih', name: 'الصحيحان' },
  { id: 'sunan', name: 'السنن الأربعة' },
  { id: 'jawami', name: 'الجوامع والمسانيد' },
  { id: 'akhlak', name: 'الآداب والأخلاق' },
  { id: 'forties', name: 'الأربعينيات' },
];

interface HadithBookSelectorModalProps {
  open: boolean;
  onClose: () => void;
  activeBook: HadithBookMeta;
  onSelectBook: (b: HadithBookMeta) => void;
  categoryFilter: string;
  onSelectCategory: (cat: string) => void;
}

export function HadithBookSelectorModal({
  open,
  onClose,
  activeBook,
  onSelectBook,
  categoryFilter,
  onSelectCategory,
}: HadithBookSelectorModalProps) {
  const [search, setSearch] = useState('');

  if (!open) return null;

  const filteredBooks = HADITH_BOOKS_LIST.filter((b) => {
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return b.nameAr.includes(q) || b.authorAr.includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-3xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Library className="size-5 text-primary" />
            <h3 className="font-bold text-base sm:text-lg text-foreground">
              دواوين وموسوعات الحديث النبوي الشريف (17 ديواناً مسنداً)
            </h3>
          </div>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="p-3 border-b border-border bg-card space-y-2.5">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الكتاب أو الإمام المصنّف..."
              className="pr-9 h-10 rounded-xl bg-muted/40 text-sm"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {HADITH_BOOK_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCategory(c.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                  categoryFilter === c.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Book Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredBooks.map((b) => {
            const isSelected = b.id === activeBook.id;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onSelectBook(b);
                  onClose();
                }}
                className={cn(
                  'p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 group cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                      {b.nameAr}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium">
                      {b.authorAr}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                    {b.hadithCount.toLocaleString('ar-EG')} حديث
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                  <span className="text-primary font-semibold">فتح الديوان وتصفحه ←</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
