'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Headphones,
  Check,
  CheckCircle2,
  AlertCircle,
  Mic,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RiwayahReciterEntry } from '../infrastructure';
import {
  type ReciterMeta,
  findMatchingFullSurahReciter,
  findMatchingVerseReciter,
  getReciterSyncStatus,
} from '../domain';
import { cn } from '@/lib/utils';

export type ReciterTab = 'verse' | 'surah' | 'all';

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
  currentSurahNo?: number;
  currentSurahName?: string;
  initialTab?: ReciterTab;
  isPlayingFullSurah?: boolean;
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
  currentSurahNo,
  currentSurahName,
  initialTab,
  isPlayingFullSurah = false,
}: ReciterModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  const defaultTab: ReciterTab =
    initialTab || (isPlayingFullSurah ? 'surah' : verseReciters.length > 0 ? 'verse' : 'surah');
  const [userTab, setUserTab] = useState<ReciterTab | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setUserTab(null);
    }
  }

  const activeTab = userTab ?? defaultTab;
  const setActiveTab = (tab: ReciterTab) => setUserTab(tab);

  // Focus trap & Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Filter both verse reciters and full surah reciters
  const filteredVerseReciters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return verseReciters;
    return verseReciters.filter((vr) => vr.name.toLowerCase().includes(q));
  }, [verseReciters, searchQuery]);

  const filteredFullSurahReciters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reciters;
    return reciters.filter(
      (r) =>
        r.reciterName.toLowerCase().includes(q) ||
        r.moshafName.toLowerCase().includes(q)
    );
  }, [reciters, searchQuery]);

  // Handlers with bi-directional syncing
  const handleSelectVerse = (vr: ReciterMeta) => {
    // Check if this reciter exists in MP3Quran for full surahs and sync
    const matchingSurahReciter = findMatchingFullSurahReciter(vr, reciters);
    if (matchingSurahReciter) {
      onSelectReciter(matchingSurahReciter);
    }
    onSelectVerseReciter(vr);
    onClose();
  };

  const handleSelectFullSurah = (r: RiwayahReciterEntry) => {
    // Check if this reciter exists in EveryAyah for verse-by-verse and sync
    const matchingVerseReciter = findMatchingVerseReciter(r, verseReciters);
    if (matchingVerseReciter) {
      onSelectVerseReciter(matchingVerseReciter);
    }
    onSelectReciter(r);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`اختيار القارئ لرواية ${qiraahName}`}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-card w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
              <Headphones className="size-5 text-primary" />
              اختيار القارئ والتسجيل
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تلاوات صوتية موثقة مرتبطة برواية ({qiraahName}) عبر خوادم MP3Quran و EveryAyah
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose} aria-label="إغلاق">
            <X className="size-4" />
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 sm:px-4 pt-3 pb-0 bg-card border-b border-border/60">
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-2xl border border-border/60">
            <button
              type="button"
              data-testid="tab-verse-reciters"
              onClick={() => setActiveTab('verse')}
              className={cn(
                'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'verse'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Mic className="size-3.5 text-primary" />
              <span>تلاوة الآيات (آية بآية)</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {filteredVerseReciters.length}
              </Badge>
            </button>

            <button
              type="button"
              data-testid="tab-surah-reciters"
              onClick={() => setActiveTab('surah')}
              className={cn(
                'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'surah'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Headphones className="size-3.5 text-primary" />
              <span>السور الكاملة (المشغل)</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {filteredFullSurahReciters.length}
              </Badge>
            </button>

            <button
              type="button"
              data-testid="tab-all-reciters"
              onClick={() => setActiveTab('all')}
              className={cn(
                'py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>الكل</span>
            </button>
          </div>

          {/* Context Banner */}
          {activeTab === 'verse' && (
            <div className="my-2.5 p-2 px-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary shrink-0" />
              <span>
                <strong>تلاوة الآيات المنفردة:</strong> مخصصة للمصحف التفاعلي وتظليل الكلمات آية بآية أثناء القراءة.
              </span>
            </div>
          )}

          {activeTab === 'surah' && (
            <div className="my-2.5 p-2 px-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground flex items-center gap-2">
              <Headphones className="size-3.5 text-primary shrink-0" />
              <span>
                <strong>تسجيلات السور الكاملة:</strong> تلاوة متصلة لكامل السورة بجودة عالية عبر خوادم MP3Quran المعتمدة.
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث باسم القارئ أو نمط التلاوة..."
              className="pr-9 h-10 rounded-xl bg-muted/40 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Section 1: Verse-by-verse reciters */}
          {(activeTab === 'verse' || activeTab === 'all') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mic className="size-3.5 text-primary" />
                  قراء التلاوة آية بآية (المصحف التفاعلي)
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {filteredVerseReciters.length} قراء
                </Badge>
              </div>

              {filteredVerseReciters.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredVerseReciters.map((vr) => {
                    const isSelected = vr.id === activeVerseReciter.id;
                    const syncStatus = getReciterSyncStatus(vr, 'verse');

                    return (
                      <button
                        key={vr.id}
                        data-testid={`reciter-verse-${vr.id}`}
                        onClick={() => handleSelectVerse(vr)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border text-right transition-all cursor-pointer',
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/40'
                            : 'bg-muted/20 border-border/70 hover:bg-muted/60 text-foreground'
                        )}
                      >
                        <div className="truncate space-y-0.5">
                          <div className="text-sm font-semibold truncate">{vr.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span>تلاوة مقطعة مع التظليل</span>
                            <span
                              title={syncStatus.explanation}
                              className={cn(
                                'text-[10px] font-medium',
                                syncStatus.isSynchronizable
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-muted-foreground/80'
                              )}
                            >
                              • {syncStatus.badgeText}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="size-4 text-primary shrink-0 mr-2" />}
                      </button>
                    );
                  })}
                </div>
              ) : verseReciters.length > 0 ? (
                <div className="p-4 rounded-xl bg-muted/20 text-center text-xs text-muted-foreground">
                  لا يوجد قراء آيات يطابقون بحثك.
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 text-xs text-muted-foreground space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-amber-500" />
                    تلاوة الآيات المنفصلة (آية بآية):
                  </div>
                  <div>غير متوفرة لهذه الرواية لعدم وجود تسجيلات مقطعة آية بآية؛ التلاوة آية بآية مدعومة بروايتي حفص وورش فقط.</div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Full surah reciters */}
          {(activeTab === 'surah' || activeTab === 'all') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Headphones className="size-3.5 text-primary" />
                  تسجيلات السور الكاملة (المشغل الصوتي)
                </div>
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {filteredFullSurahReciters.length} تسجيل
                </Badge>
              </div>

              {filteredFullSurahReciters.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredFullSurahReciters.map((r) => {
                    const isSelected =
                      activeReciter?.reciterId === r.reciterId &&
                      activeReciter?.moshafId === r.moshafId;
                    const isCurrentSurahRecorded =
                      currentSurahNo && Array.isArray(r.surahList)
                        ? r.surahList.includes(currentSurahNo)
                        : true;
                    const syncStatus = getReciterSyncStatus(r, 'surah');

                    return (
                      <button
                        key={`${r.reciterId}-${r.moshafId}`}
                        data-testid={`reciter-surah-${r.reciterId}`}
                        onClick={() => handleSelectFullSurah(r)}
                        className={cn(
                          'flex flex-col justify-between p-3 rounded-xl border text-right transition-all cursor-pointer space-y-2',
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/40'
                            : 'bg-muted/20 border-border/70 hover:bg-muted/60 text-foreground'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="truncate">
                            <div className="text-sm font-semibold truncate">{r.reciterName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{r.moshafName}</div>
                          </div>
                          {isSelected && <Check className="size-4 text-primary shrink-0 mt-0.5" />}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {r.surahTotal === 114 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                              <CheckCircle2 className="size-2.5" />
                              المصحف كاملاً (114 سورة)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                              تسجيل جزئي ({r.surahTotal} سورة)
                            </span>
                          )}

                          {currentSurahNo && (
                            isCurrentSurahRecorded ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px]">
                                سورة {currentSurahName || currentSurahNo}: متوفرة ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold">
                                سورة {currentSurahName || currentSurahNo}: غير مسجلة
                              </span>
                            )
                          )}

                          <span
                            title={syncStatus.explanation}
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium',
                              syncStatus.isSynchronizable
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {syncStatus.badgeText}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : reciters.length > 0 ? (
                <div className="p-4 rounded-xl bg-muted/20 text-center text-xs text-muted-foreground">
                  لا توجد تسجيلات سور كاملة تطابق بحثك.
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground space-y-1">
                  <AlertCircle className="size-5 mx-auto text-muted-foreground/60" />
                  <div className="font-bold text-foreground">لا تتوفر تسجيلات صوتية مسجلة لهذه الرواية حالياً</div>
                  <div>يمكنك تصفح المصحف المصور الأصلي لهذه الرواية أو التبديل إلى رواية أخرى للاستماع.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
