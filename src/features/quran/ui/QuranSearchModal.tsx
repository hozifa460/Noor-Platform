'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { Search, X, AlertCircle, ArrowLeft, Loader2, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuranStore } from '../model';
import {
  searchQuranAyahs,
  type QuranSearchResult,
} from '../infrastructure';
import { cn } from '@/lib/utils';

export function QuranSearchModal() {
  const isOpen = useQuranStore((s) => s.isSearchModalOpen);
  const closeSearch = useQuranStore((s) => s.closeQuranSearch);
  const query = useQuranStore((s) => s.quranSearchQuery);
  const setQuery = useQuranStore((s) => s.setQuranSearchQuery);
  const results = useQuranStore((s) => s.quranSearchResults);
  const setResults = useQuranStore((s) => s.setQuranSearchResults);
  const navigateToAyah = useQuranStore((s) => s.navigateToAyah);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invalidRefMessage, setInvalidRefMessage] = useState<string | null>(null);
  const [referenceNotice, setReferenceNotice] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [executedQuery, setExecutedQuery] = useState<string>('');
  const [displayCount, setDisplayCount] = useState<number>(25);
  const [, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const searchRequestIdRef = useRef<number>(0);

  // Manage focus: capture prior element, auto-focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isOpen]);

  // Execute search when query changes
  useEffect(() => {
    let isMounted = true;
    const trimmed = query.trim();

    if (!trimmed) {
      searchRequestIdRef.current += 1;
      const timer = setTimeout(() => {
        if (!isMounted) return;
        setResults([]);
        setInvalidRefMessage(null);
        setReferenceNotice(null);
        setIsLoading(false);
        setExecutedQuery('');
        setDisplayCount(25);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    const currentRequestId = ++searchRequestIdRef.current;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const resp = await searchQuranAyahs(trimmed);
        if (!isMounted || currentRequestId !== searchRequestIdRef.current) return;

        startTransition(() => {
          setResults(resp.results);
          setInvalidRefMessage(resp.invalidReferenceMessage || null);
          setReferenceNotice(resp.referenceNotice || null);
          setSelectedIndex(0);
          setDisplayCount(25);
          setExecutedQuery(trimmed);
          setIsLoading(false);
        });
      } catch (err: unknown) {
        if (!isMounted || currentRequestId !== searchRequestIdRef.current) return;
        const msg = err instanceof Error ? err.message : 'تعذر تنفيذ البحث';
        setLoadError(msg);
        setIsLoading(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, setResults]);

  const handleSelectResult = useCallback(
    (item: QuranSearchResult | null | undefined) => {
      if (!item) return;
      const trimmed = query.trim();
      // Unified validity check: never select stale results while query changed or search in-flight
      if (isLoading || trimmed !== executedQuery) {
        return;
      }
      const currentQiraah = useQuranStore.getState().activeQiraah;
      if (currentQiraah.id !== 'hafs') {
        toast.info(`تم الانتقال إلى سورة ${item.surahNameAr} في نص حفص التفاعلي`);
      }
      navigateToAyah(item.surahNumber, item.ayahNumber);
    },
    [isLoading, query, executedQuery, navigateToAyah]
  );

  // Keyboard navigation & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Focus trap inside modal
      if (e.key === 'Tab') {
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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % Math.min(results.length, displayCount) : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const limit = Math.min(results.length, displayCount);
        setSelectedIndex((prev) => (limit > 0 ? (prev - 1 + limit) % limit : 0));
      } else if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        const isInput = activeEl === inputRef.current;
        const isList = listRef.current ? listRef.current.contains(activeEl) : false;

        // If focus is on any button (Close, Clear, Load More, Retry), let Enter trigger the button's native action
        if (activeEl instanceof HTMLButtonElement || activeEl?.tagName === 'BUTTON') {
          return;
        }

        // Only handle Enter for selecting search results when focus is on search input or results list
        if (!isInput && !isList) {
          return;
        }

        if (results.length > 0 && results[selectedIndex]) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, displayCount, closeSearch, handleSelectResult]);

  const handleRetry = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const currentRequestId = ++searchRequestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const resp = await searchQuranAyahs(trimmed);
      if (currentRequestId !== searchRequestIdRef.current) return;

      startTransition(() => {
        setResults(resp.results);
        setInvalidRefMessage(resp.invalidReferenceMessage || null);
        setReferenceNotice(resp.referenceNotice || null);
        setSelectedIndex(0);
        setDisplayCount(25);
        setExecutedQuery(trimmed);
        setIsLoading(false);
      });
    } catch (err: unknown) {
      if (currentRequestId !== searchRequestIdRef.current) return;
      setLoadError(err instanceof Error ? err.message : 'تعذر تحميل فهرس البحث');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="البحث في آيات القرآن الكريم"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-border bg-muted/20 relative">
          <div className="relative flex items-center">
            <Search className="absolute right-3.5 size-5 text-primary pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن آية، سورة، أو مرجع (مثال: 2:255 أو «إن مع العسر يسرا»)..."
              className="h-12 sm:h-13 pr-11 pl-20 rounded-2xl bg-background border-border text-sm sm:text-base font-medium shadow-inner focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="absolute left-2.5 flex items-center gap-1">
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="مسح البحث"
                >
                  <X className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSearch}
                className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                title="إغلاق (Esc)"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Hafs Scope Notice & Reference Alert */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-[11px] leading-relaxed">
              <Info className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>البحث المفهرس معتمد على نص حفص عن عاصم (العد الكوفي)؛ واختيار أي نتيجة ينقلك مباشرة لنص حفص التفاعلي.</span>
            </div>

            {results.length > 0 && !isLoading && (
              <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-xl">
                {results.length} {results.length === 1 ? 'نتيجة' : 'نتائج'}
              </Badge>
            )}
          </div>

          {/* Invalid Reference Warning */}
          {invalidRefMessage && (
            <div className="mt-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <AlertCircle className="size-4 shrink-0" />
              <span>{invalidRefMessage}</span>
            </div>
          )}

          {/* Reference Notice (Found exact ayah) */}
          {referenceNotice && !invalidRefMessage && (
            <div className="mt-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <Sparkles className="size-4 shrink-0" />
              <span>{referenceNotice}</span>
            </div>
          )}
        </div>

        {/* Results Body / States */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[220px]">
          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">
                جاري البحث في آيات القرآن الكريم...
              </p>
            </div>
          )}

          {/* Error State */}
          {loadError && !isLoading && (
            <div className="py-12 text-center space-y-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
              <AlertCircle className="size-8 text-destructive mx-auto" />
              <p className="text-sm font-bold text-foreground">{loadError}</p>
              <Button size="sm" variant="outline" onClick={handleRetry} className="rounded-xl text-xs font-bold">
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Initial Blank State (No query typed yet) */}
          {!query.trim() && !isLoading && (
            <div className="py-12 text-center space-y-3 text-muted-foreground">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
                <Search className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">ابحث في آيات القرآن الكريم</h4>
                <p className="text-xs max-w-sm mx-auto">
                  يمكنك البحث بنص الآية، أو اسم السورة، أو برقم المرجع مثل{' '}
                  <span className="font-mono font-bold text-foreground">2:255</span> أو{' '}
                  <span className="font-mono font-bold text-foreground">٢:٢٥٥</span>
                </p>
              </div>
            </div>
          )}

          {/* No Results State */}
          {query.trim() && !isLoading && !loadError && results.length === 0 && (
            <div className="py-14 text-center space-y-2.5 text-muted-foreground">
              <div className="size-10 rounded-full bg-muted grid place-items-center mx-auto text-lg font-bold">
                ؟
              </div>
              <h4 className="font-bold text-sm text-foreground">
                لم نجد نتائج مطابقة لـ &quot;{query}&quot;
              </h4>
              <p className="text-xs max-w-sm mx-auto">
                تأكد من صحة الكلمات المكتوبة، أو جرب البحث بمرجع السورة والآية مثل{' '}
                <span className="font-mono font-bold text-foreground">الكهف 10</span> أو{' '}
                <span className="font-mono font-bold text-foreground">2:255</span>.
              </p>
            </div>
          )}

          {/* Results List */}
          {!isLoading &&
            !loadError &&
            results.slice(0, displayCount).map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.surahNumber}-${item.ayahNumber}`}
                  role="button"
                  tabIndex={0}
                  data-testid="search-result-item"
                  onClick={() => handleSelectResult(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectResult(item);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer text-right flex flex-col gap-2 focus:outline-none',
                    isSelected
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-md'
                      : 'bg-card border-border hover:bg-muted/50 hover:border-primary/40'
                  )}
                >
                  {/* Meta header */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-primary font-bold">
                        سورة {item.surahNameAr}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground font-mono">
                        الآية {item.ayahNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.matchType === 'surah' && (
                        <Badge variant="default" className="text-[10px] font-bold bg-primary text-primary-foreground">
                          بداية السورة
                        </Badge>
                      )}
                      {item.matchType === 'reference' && (
                        <Badge variant="default" className="text-[10px] font-bold bg-primary text-primary-foreground">
                          مرجع محدد
                        </Badge>
                      )}
                      {item.matchType === 'exact_phrase' && (
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          تطابق تام
                        </Badge>
                      )}
                      {item.matchType === 'all_words' && (
                        <Badge variant="outline" className="text-[10px]">
                          كلمات مطابقة
                        </Badge>
                      )}
                      <ArrowLeft className="size-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Quranic Text */}
                  <p
                    className="font-quran text-foreground text-base sm:text-lg leading-relaxed sm:leading-loose select-none"
                    dir="rtl"
                  >
                    {item.ayahTextAr}
                  </p>
                </div>
              );
            })}

          {/* Show More Results Button */}
          {!isLoading && !loadError && results.length > displayCount && (
            <div className="pt-2 pb-3 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisplayCount((prev) => prev + 25)}
                className="rounded-2xl px-5 py-2 text-xs font-bold gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <span>عرض المزيد من النتائج</span>
                <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0">
                  متبقي {results.length - displayCount}
                </Badge>
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer / Keyboard Shortcuts */}
        <div className="p-3 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px]">↓</kbd>{' '}
              للتنقل
            </span>
            <span>•</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px]">Enter</kbd>{' '}
              للانتقال للآية
            </span>
            <span>•</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px]">Esc</kbd>{' '}
              للإغلاق
            </span>
          </div>

          <span className="hidden sm:inline font-bold text-foreground/80">
            الانتقال يبرز الآية في العرض التفاعلي
          </span>
        </div>
      </div>
    </div>
  );
}
