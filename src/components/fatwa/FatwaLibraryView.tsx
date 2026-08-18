'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  FileQuestion,
  Search,
  X,
  Sparkles,
  BookOpen,
  User,
  Copy,
  Check,
  Headphones,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFatwaStore } from '@/stores/fatwa-store';
import { FATWA_CATEGORIES, SCHOLARS_LIST } from '@/lib/fatwa-index';
import { usePlayerStore } from '@/stores/player.store';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function FatwaLibraryView() {
  const fatwas = useFatwaStore((s) => s.fatwas);
  const loading = useFatwaStore((s) => s.loading);
  const searching = useFatwaStore((s) => s.searching);
  const selectedCategory = useFatwaStore((s) => s.selectedCategory);
  const selectedScholar = useFatwaStore((s) => s.selectedScholar);
  const searchQuery = useFatwaStore((s) => s.searchQuery);

  const startLoading = useFatwaStore((s) => s.startLoading);
  const setSelectedCategory = useFatwaStore((s) => s.setSelectedCategory);
  const setSelectedScholar = useFatwaStore((s) => s.setSelectedScholar);
  const setSearchQuery = useFatwaStore((s) => s.setSearchQuery);
  const getFilteredFatwas = useFatwaStore((s) => s.getFilteredFatwas);

  const openPlayer = usePlayerStore((s) => s.open);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [visibleCount, setVisibleCount] = useState(30);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startLoading();
  }, [startLoading]);

  // Reset pagination on filter or search changes (standard React pattern)
  const [prevFilter, setPrevFilter] = useState({ selectedCategory, selectedScholar, searchQuery });
  if (
    prevFilter.selectedCategory !== selectedCategory ||
    prevFilter.selectedScholar !== selectedScholar ||
    prevFilter.searchQuery !== searchQuery
  ) {
    setPrevFilter({ selectedCategory, selectedScholar, searchQuery });
    setVisibleCount(30);
  }

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 30);
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleInputChange = (val: string) => {
    setLocalSearch(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val.trim());
    }, 200);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchQuery(localSearch.trim());
  };

  const handleCopy = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `السؤال: ${item.title}\n\nالجواب: ${item.answer || item.description || ''}\n\nالمفتي: ${item.sheikhName || 'عالم ومفتي'}\nالمصدر: منصة النور الإسلامية`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast.success('تم نسخ نص الفتوى');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFatwas = useMemo(() => {
    return getFilteredFatwas();
  }, [getFilteredFatwas, fatwas, selectedCategory, selectedScholar, searchQuery]);

  const displayedFatwas = useMemo(() => {
    return filteredFatwas.slice(0, visibleCount);
  }, [filteredFatwas, visibleCount]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Deluxe Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-emerald-500/20 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
            <Sparkles className="size-3.5 text-amber-400" />
            الموسوعة الفقهية والفتاوى الشرعية
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-emerald-100">
            موسوعة الفتاوى الإسلامية المعتمدة
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/80 leading-relaxed mb-6 max-w-2xl">
            أكثر من 225,000 فتوى شرعية محققة لكبار أئمة وعلماء الإسلام ودور الإفتاء المعتمدة، مع محرك بحث فوري فائق الدقة والسرعة وخفيف على جهازك.
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
              <FileQuestion className="size-4 text-emerald-400" />
              <span>
                <strong className="text-white font-bold">+225,000</strong> فتوى شرعية مفهرسة
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
              <User className="size-4 text-amber-400" />
              <span>
                <strong className="text-white font-bold">كبار العلماء</strong> ودور الإفتاء
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {FATWA_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all shrink-0 border',
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/80'
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Scholar Selector & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-2xl border border-border/80 backdrop-blur-sm">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="ابحث في الفتاوى عن مسألتك الشرعية..."
            className="pr-10 pl-10 h-11 bg-background/80"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                setLocalSearch('');
                setSearchQuery('');
              }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        {/* Scholar Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 w-full md:w-auto">
          {SCHOLARS_LIST.map((sch) => {
            const active = selectedScholar === sch.id;
            return (
              <button
                key={sch.id}
                onClick={() => setSelectedScholar(sch.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border',
                  active
                    ? 'bg-secondary text-secondary-foreground border-secondary font-bold'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border/50'
                )}
              >
                {sch.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-2">
        <div>
          {searching ? (
            <span className="text-primary font-medium flex items-center gap-1.5 animate-pulse">
              <span>جاري البحث الفوري في +225,000 فتوى...</span>
            </span>
          ) : searchQuery ? (
            <span>
              نتائج البحث لـ «<strong className="text-foreground">{searchQuery}</strong>»: {filteredFatwas.length} فتوى مطابقة بدقة
            </span>
          ) : (
            <span>
              تصفح الفتاوى المفهرسة: {displayedFatwas.length} من أصل {filteredFatwas.length} فتوى في هذا القسم
            </span>
          )}
        </div>
      </div>

      {/* Fatwa Cards List */}
      {displayedFatwas.length > 0 ? (
        <div className="space-y-3.5">
          {displayedFatwas.map((item) => {
            const isExpanded = expandedId === item.id;
            const categoryObj = FATWA_CATEGORIES.find((c) => c.id === item.tags?.[0]);

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all p-4 sm:p-5 shadow-sm',
                  isExpanded && 'ring-1 ring-primary/40 shadow-md bg-card/95'
                )}
              >
                {/* Header Row */}
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="shrink-0 size-10 rounded-xl bg-primary/10 grid place-items-center text-primary mt-0.5 border border-primary/20">
                      <FileQuestion className="size-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.sheikhName && (
                          <Badge variant="secondary" className="text-[11px] font-medium py-0.5">
                            {item.sheikhName}
                          </Badge>
                        )}
                        {categoryObj && (
                          <Badge variant="outline" className="text-[10px] py-0.5">
                            {categoryObj.emoji} {categoryObj.name}
                          </Badge>
                        )}
                        {item.audioUrl && (
                          <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] gap-1">
                            <Headphones className="size-3" /> تسجيل صوتي
                          </Badge>
                        )}
                      </div>

                      {/* Main Title / Question */}
                      <h3 className="font-bold text-base sm:text-lg text-foreground leading-snug">
                        {item.title}
                      </h3>

                      {/* Prominent Descriptive Snippet under Title */}
                      <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 mt-2 leading-relaxed font-normal">
                        {item.answer || item.description || 'اضغط لقراءة الفتوى والبيان الفقهي بالتفصيل...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleCopy(item, e)}
                      aria-label="نسخ"
                      className="size-8 text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === item.id ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="size-8 text-muted-foreground hover:text-foreground"
                      aria-label="تبديل العرض"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Full Answer Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-4 animate-in fade-in duration-300">
                    {/* Answer Body */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm sm:text-base leading-loose text-foreground">
                      <strong className="text-xs font-bold text-primary flex items-center gap-1.5 mb-2">
                        <BookOpen className="size-3.5" /> نص الجواب والبيان الفقهي:
                      </strong>
                      <div className="whitespace-pre-wrap">
                        {item.answer || item.description || 'الجواب متوفر في التسجيل الصوتي أو عبر فتح الفتوى.'}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 text-xs">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openPlayer(item)}
                        className="gap-2 font-medium"
                      >
                        <BookOpen className="size-3.5" />
                        فتح في قارئ الفتاوى
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleCopy(item, e)}
                          className="gap-1.5"
                        >
                          <Copy className="size-3.5" />
                          نسخ الفتوى
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Sentinel for Infinite Scrolling */}
          <div ref={sentinelRef} className="h-10" />
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-card/30">
          <FileQuestion className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-bold text-lg text-foreground mb-1">لا توجد فتاوى مطابقة للبحث</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            جرب البحث بكلمات أخرى أو اختر تصنيفاً فقهياً مختلفاً.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedScholar('all');
              setSearchQuery('');
              setLocalSearch('');
            }}
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      )}
    </div>
  );
}
