'use client';

import { useMemo } from 'react';
import { Search, X, Headphones, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { RiwayahReciterEntry } from '@/lib/quran/mp3quran-engine';
import type { ReciterMeta } from '@/types/quran';
import { cn } from '@/lib/utils';

interface ReciterModalProps {
  open: boolean;
  onClose: () => void;
  reciters: RiwayahReciterEntry[];
  activeReciter: RiwayahReciterEntry | null;
  onSelectReciter: (r: RiwayahReciterEntry) => void;
  verseReciters: ReciterMeta[];
  activeVerseReciter: ReciterMeta;
  onSelectVerseReciter: (r: ReciterMeta) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  qiraahName: string;
}

export function ReciterModal({
  open,
  onClose,
  reciters,
  activeReciter,
  onSelectReciter,
  verseReciters,
  activeVerseReciter,
  onSelectVerseReciter,
  searchQuery,
  onSearchChange,
  qiraahName,
}: ReciterModalProps) {
  const filteredReciters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reciters;
    return reciters.filter(
      (r) =>
        r.reciterName.toLowerCase().includes(q) ||
        r.moshafName.toLowerCase().includes(q)
    );
  }, [reciters, searchQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
              <Headphones className="size-5 text-primary" />
              اختيار القارئ لرواية ({qiraahName})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تلاوات صوتية عالية الجودة مرتبطة مباشرة بخوادم MP3Quran و EveryAyah
            </p>
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
              placeholder="ابحث باسم القارئ..."
              className="pr-9 h-10 rounded-xl bg-muted/40 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section 1: Verse-by-verse reciters */}
          {verseReciters.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-muted-foreground px-1">
                قراء التلاوة آية بآية (EveryAyah Sync)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {verseReciters.map((vr) => {
                  const isSelected = vr.id === activeVerseReciter.id;
                  return (
                    <button
                      key={vr.id}
                      onClick={() => onSelectVerseReciter(vr)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border text-right transition-all',
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                          : 'bg-muted/30 border-border/70 hover:bg-muted/70 text-foreground'
                      )}
                    >
                      <div className="truncate">
                        <div className="text-sm font-semibold truncate">{vr.name}</div>
                        <div className="text-[11px] text-muted-foreground">تلاوة آية بآية</div>
                      </div>
                      {isSelected && <Check className="size-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Full surah reciters for Riwayah */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground px-1">
              تسجيلات السور الكاملة المتوفرة لهذه الرواية ({filteredReciters.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredReciters.map((r) => {
                const isSelected = activeReciter?.reciterId === r.reciterId;
                return (
                  <button
                    key={`${r.reciterId}-${r.moshafId}`}
                    onClick={() => {
                      onSelectReciter(r);
                      onClose();
                    }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border text-right transition-all',
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-muted/30 border-border/70 hover:bg-muted/70 text-foreground'
                    )}
                  >
                    <div className="truncate">
                      <div className="text-sm font-semibold truncate">{r.reciterName}</div>
                      <div className="text-[11px] text-muted-foreground">{r.moshafName}</div>
                    </div>
                    {isSelected && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
