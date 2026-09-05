'use client';

import { useMemo } from 'react';
import { Search, X, ListTree } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ALL_SURAHS } from '@/lib/quran';
import { cn } from '@/lib/utils';

interface MushafSidebarProps {
  open: boolean;
  onClose: () => void;
  currentSurahNo: number;
  onSelectSurah: (num: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function MushafSidebar({
  open,
  onClose,
  currentSurahNo,
  onSelectSurah,
  searchQuery,
  onSearchChange,
}: MushafSidebarProps) {
  const filteredSurahs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_SURAHS;
    return ALL_SURAHS.filter(
      (s) =>
        s.nameAr.includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        String(s.number) === q
    );
  }, [searchQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start animate-in fade-in duration-200">
      <div className="w-full max-w-sm sm:max-w-md h-full bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <ListTree className="size-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">فهرس سور القرآن الكريم</h3>
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
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث باسم السورة أو رقمها..."
              className="pr-9 h-10 rounded-xl bg-muted/40 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Surah List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/40">
          {filteredSurahs.map((surah) => {
            const isSelected = surah.number === currentSurahNo;
            return (
              <button
                key={surah.number}
                onClick={() => {
                  onSelectSurah(surah.number);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl text-right transition-all group pt-2.5',
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-xs'
                    : 'hover:bg-muted/60 text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'size-8 rounded-lg text-xs font-mono font-bold grid place-items-center border',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border/80 text-muted-foreground group-hover:border-primary/40'
                    )}
                  >
                    {surah.number}
                  </span>
                  <div>
                    <div className="font-serif text-base">{surah.nameAr}</div>
                    <div className="text-xs text-muted-foreground font-sans">
                      {surah.nameTranslation} · {surah.nameEn}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 bg-background/50 border-border/60"
                  >
                    {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {surah.numberOfAyahs} آية
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 cursor-pointer" onClick={onClose} />
    </div>
  );
}
