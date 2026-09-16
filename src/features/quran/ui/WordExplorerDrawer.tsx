'use client';

import { useState, useEffect, useMemo, useCallback, useId, useRef } from 'react';
import {
  X,
  BookOpen,
  GitFork,
  ArrowRight,
  ExternalLink,
  Info,
  Loader2,
  Sparkles,
  Search,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ALL_SURAHS,
  type QuranWordTarget,
  type QuranWordMorphology,
  type QuranRootOccurrence,
  type MorphologyLoadStatus,
} from '../domain';
import {
  getWordMorphologyResult,
  getRootOccurrencesResult,
} from '../infrastructure';
import { useQuranStore } from '../model';

interface WordExplorerPanelProps {
  selectedWordTarget: QuranWordTarget;
  onClose: () => void;
  titleId: string;
}

function WordExplorerPanel({
  selectedWordTarget,
  onClose,
  titleId,
}: WordExplorerPanelProps) {
  const navigateToAyah = useQuranStore((s) => s.navigateToAyah);
  const surahData = useQuranStore((s) => s.surahData);

  const [activeTab, setActiveTab] = useState<'morphology' | 'root_occurrences'>('morphology');
  const [morphologyStatus, setMorphologyStatus] = useState<MorphologyLoadStatus | 'loading'>('loading');
  const [morphologyError, setMorphologyError] = useState('');
  const [morphology, setMorphology] = useState<QuranWordMorphology | null>(null);

  const [occurrencesStatus, setOccurrencesStatus] = useState<MorphologyLoadStatus | 'idle' | 'loading'>('idle');
  const [occurrencesError, setOccurrencesError] = useState('');
  const [occurrences, setOccurrences] = useState<QuranRootOccurrence[]>([]);
  const [occurrencesFilter, setOccurrencesFilter] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Fetch word morphology on mount of this word instance
  useEffect(() => {
    let isCancelled = false;
    getWordMorphologyResult(
      selectedWordTarget.surahNo,
      selectedWordTarget.ayahNo,
      selectedWordTarget.wordIndex,
      selectedWordTarget.wordText
    )
      .then((res) => {
        if (!isCancelled) {
          setMorphology(res.morphology);
          setMorphologyStatus(res.status);
          setMorphologyError(res.errorMessage || '');
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setMorphology(null);
          setMorphologyStatus('network_error');
          setMorphologyError('تعذر الاتصال بالخادم لتحميل التحليل الصرفي');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedWordTarget.surahNo, selectedWordTarget.ayahNo, selectedWordTarget.wordIndex, selectedWordTarget.wordText]);

  // Retry fetching word morphology
  const handleRetryMorphology = useCallback(() => {
    setMorphologyStatus('loading');
    setMorphologyError('');
    getWordMorphologyResult(
      selectedWordTarget.surahNo,
      selectedWordTarget.ayahNo,
      selectedWordTarget.wordIndex,
      selectedWordTarget.wordText
    )
      .then((res) => {
        setMorphology(res.morphology);
        setMorphologyStatus(res.status);
        setMorphologyError(res.errorMessage || '');
      })
      .catch(() => {
        setMorphology(null);
        setMorphologyStatus('network_error');
        setMorphologyError('تعذر الاتصال بالخادم لتحميل التحليل الصرفي');
      });
  }, [selectedWordTarget]);

  // Load root occurrences when user switches to the root occurrences tab
  const handleLoadRootOccurrences = useCallback(() => {
    if (!morphology || !morphology.root) return;
    setActiveTab('root_occurrences');
    if (occurrences.length > 0 && occurrencesStatus === 'success') return;

    setOccurrencesStatus('loading');
    setOccurrencesError('');
    getRootOccurrencesResult(morphology.root)
      .then((res) => {
        setOccurrences(res.occurrences);
        setOccurrencesStatus(res.status);
        if (res.status === 'network_error') {
          setOccurrencesError(res.errorMessage || 'تعذر تحميل مواضع هذا الجذر بسبب انقطاع الاتصال');
        }
      })
      .catch(() => {
        setOccurrences([]);
        setOccurrencesStatus('network_error');
        setOccurrencesError('تعذر تحميل مواضع هذا الجذر بسبب انقطاع الاتصال');
      });
  }, [morphology, occurrences.length, occurrencesStatus]);

  // Explicit retry for root occurrences
  const handleRetryRootOccurrences = useCallback(() => {
    if (!morphology || !morphology.root) return;
    setOccurrencesStatus('loading');
    setOccurrencesError('');
    getRootOccurrencesResult(morphology.root)
      .then((res) => {
        setOccurrences(res.occurrences);
        setOccurrencesStatus(res.status);
        if (res.status === 'network_error') {
          setOccurrencesError(res.errorMessage || 'تعذر تحميل مواضع هذا الجذر بسبب انقطاع الاتصال');
        }
      })
      .catch(() => {
        setOccurrences([]);
        setOccurrencesStatus('network_error');
        setOccurrencesError('تعذر تحميل مواضع هذا الجذر بسبب انقطاع الاتصال');
      });
  }, [morphology]);

  const surahMeta = useMemo(() => {
    return ALL_SURAHS[selectedWordTarget.surahNo - 1] || null;
  }, [selectedWordTarget.surahNo]);

  // Ayah text context
  const ayahContextText = useMemo(() => {
    if (!surahData || surahData.surahNo !== selectedWordTarget.surahNo) {
      return '';
    }
    const foundAyah = surahData.ayahs.find((a) => a.ayahNo === selectedWordTarget.ayahNo);
    return foundAyah ? foundAyah.textAr : '';
  }, [selectedWordTarget, surahData]);

  // Filtered occurrences
  const filteredOccurrences = useMemo(() => {
    if (!occurrencesFilter.trim()) return occurrences;
    const q = occurrencesFilter.trim();
    return occurrences.filter(
      (o) =>
        o.surahName.includes(q) ||
        o.ayahText.includes(q) ||
        String(o.surahNo) === q ||
        String(o.ayahNo) === q ||
        `${o.surahNo}:${o.ayahNo}`.includes(q)
    );
  }, [occurrences, occurrencesFilter]);

  return (
    <div className="w-full max-w-lg sm:max-w-xl h-full bg-card border-r border-border/80 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 text-right overflow-hidden">
      {/* Drawer Header */}
      <div className="p-4 border-b border-border/80 bg-muted/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 id={titleId} className="font-bold text-base sm:text-lg flex items-center gap-2">
              استكشف الكلمة
              <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
                حفص عن عاصم
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              {surahMeta?.nameAr ? `سورة ${surahMeta.nameAr}` : `سورة ${selectedWordTarget.surahNo}`} • الآية {selectedWordTarget.ayahNo}
            </p>
          </div>
        </div>

        <Button
          ref={closeButtonRef}
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-9 rounded-xl text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          title="إغلاق (Esc)"
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* Selected Word Context Banner */}
      <div className="p-4 bg-primary/5 border-b border-border/60 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-semibold text-muted-foreground">الكلمة المحددة</span>
          <span className="text-xs text-muted-foreground font-mono">
            الموضع #{selectedWordTarget.wordIndex} في الآية
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-wide">
            {selectedWordTarget.wordText}
          </div>
          {morphology?.posSummary && (
            <Badge variant="secondary" className="text-xs font-normal">
              {morphology.posSummary}
            </Badge>
          )}
        </div>

        {ayahContextText && (
          <div className="mt-3 p-2.5 rounded-xl bg-background/80 border border-border/50 text-sm font-serif leading-relaxed text-muted-foreground">
            {ayahContextText}
          </div>
        )}
      </div>

      {/* Tab Navigation when occurrences available */}
      {activeTab === 'root_occurrences' && (
        <div className="px-4 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('morphology')}
            className="gap-2 text-xs font-bold text-primary hover:text-primary"
          >
            <ArrowRight className="size-4" />
            العودة للتحليل اللغوي
          </Button>
          <span className="text-xs text-muted-foreground">
            مواضع جذر: <strong className="text-foreground font-serif">{morphology?.rootSpaced || morphology?.root}</strong>
          </span>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'morphology' ? (
          /* Tab 1: Morphology & Root Overview */
          <>
            {morphologyStatus === 'loading' ? (
              <div className="py-16 text-center space-y-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-sm">جاري جلب التحليل اللغوي والصرفي...</p>
              </div>
            ) : morphologyStatus === 'network_error' ? (
              <div className="py-12 px-4 text-center space-y-4 bg-destructive/5 rounded-2xl border border-destructive/20">
                <div className="size-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
                  <AlertTriangle className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">تعذر تحميل بيانات التحليل الصرفي</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {morphologyError || 'حدث خطأ في الشبكة أثناء جلب بيانات الصرف. يرجى التحقق من الاتصال والمحاولة مجدداً.'}
                  </p>
                </div>
                <Button
                  onClick={handleRetryMorphology}
                  variant="outline"
                  size="sm"
                  className="mx-auto gap-2 rounded-xl text-xs font-bold border-destructive/30 hover:bg-destructive/10"
                >
                  <RotateCcw className="size-3.5" />
                  إعادة المحاولة
                </Button>
              </div>
            ) : morphology ? (
              <>
                {/* Lexical Root Card */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <GitFork className="size-4 text-primary" />
                      الجذر المعجمي
                    </span>
                    {morphology.lemma && (
                      <span className="text-xs text-muted-foreground">
                        الأصل/المدخل: <strong className="text-foreground">{morphology.lemma}</strong>
                      </span>
                    )}
                  </div>

                  {morphology.root ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-serif font-bold text-foreground px-3 py-1 rounded-xl bg-background border border-border/80 tracking-widest">
                          {morphology.rootSpaced || morphology.root}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleLoadRootOccurrences}
                        className="gap-2 rounded-xl text-xs font-bold shadow-sm"
                      >
                        <BookOpen className="size-4" />
                        مواضع هذا الجذر في القرآن
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-background/60 border border-dashed border-border text-xs text-muted-foreground leading-relaxed">
                      لا جذر معجمي مسجل لهذه الكلمة في المصدر المعتمد (حرف، أداة، أو اسم مبني).
                    </div>
                  )}
                </div>

                {/* Morphological Segments Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      التفكيك الصرفي للكلمة
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {morphology.segments.length} {morphology.segments.length === 1 ? 'مقطع' : 'مقاطع'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {morphology.segments.map((seg) => (
                      <div
                        key={seg.segment}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-2',
                          seg.type === 'stem'
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-card border-border/70'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-serif font-bold text-foreground">
                              {seg.arabic}
                            </span>
                            <Badge
                              variant={seg.type === 'stem' ? 'default' : 'outline'}
                              className="text-[11px] font-normal"
                            >
                              {seg.type === 'prefix'
                                ? 'سابقة'
                                : seg.type === 'suffix'
                                ? 'لاحقة'
                                : 'جذع الكلمة'}
                            </Badge>
                          </div>

                          <span className="text-xs font-bold text-muted-foreground">
                            {seg.tagAr}
                          </span>
                        </div>

                        {seg.featuresAr && seg.featuresAr.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {seg.featuresAr.map((f, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Educational Disclaimer Banner */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    إيضاح لغوي
                  </div>
                  <p className="opacity-90">
                    التحليل اللغوي يوضح البنية الصرفية والإعرابية للكلمة في سياقها، ولا يمثل تفسيراً أو معنى مستقلاً لها.
                  </p>
                </div>
              </>
            ) : (
              /* Fallback when word not found in morphology index */
              <div className="py-12 px-4 text-center space-y-3 bg-muted/20 rounded-2xl border border-dashed border-border">
                <Info className="size-8 mx-auto text-muted-foreground opacity-60" />
                <p className="text-sm font-semibold text-foreground">
                  التحليل الصرفي غير متوفر لهذا الموضع في المصدر المعتمد
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  تم الحفاظ على نص الآية ورسمها المصحفي دون أي تغيير. قد يعود عدم توفر التحليل لاختلاف طفيف في ترقيم المقاطع أو علامات الوقف.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Tab 2: Root Occurrences Across the Quran */
          <div className="space-y-4">
            {/* Prominent Educational Warning as requested */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                تنبيه لغوي هام
              </div>
              <p className="opacity-95 font-medium">
                اشتراك الكلمات في الجذر لا يعني تطابق معانيها؛ فالأوزان الصرفية والسياقات تمنح الكلمات دلالات متباينة في البيان القرآني.
              </p>
            </div>

            {occurrencesStatus === 'loading' ? (
              <div className="py-16 text-center space-y-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-sm">جاري جلب مواضع الجذر في القرآن الكريم...</p>
              </div>
            ) : occurrencesStatus === 'network_error' ? (
              <div className="py-12 px-4 text-center space-y-4 bg-destructive/5 rounded-2xl border border-destructive/20">
                <div className="size-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
                  <AlertTriangle className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">
                    {occurrencesError || 'تعذر تحميل مواضع هذا الجذر'}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    حدث خطأ في الاتصال بالشبكة أثناء جلب بيانات الآيات أو مواضع الجذر. يرجى التحقق من الاتصال والمحاولة مجدداً.
                  </p>
                </div>
                <Button
                  onClick={handleRetryRootOccurrences}
                  variant="outline"
                  size="sm"
                  className="mx-auto gap-2 rounded-xl text-xs font-bold border-destructive/30 hover:bg-destructive/10"
                >
                  <RotateCcw className="size-3.5" />
                  إعادة المحاولة
                </Button>
              </div>
            ) : occurrences.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-bold text-muted-foreground">
                    ورد هذا الجذر في <strong className="text-foreground">{occurrences.length}</strong> موضعاً
                  </span>

                  <div className="relative max-w-xs">
                    <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={occurrencesFilter}
                      onChange={(e) => setOccurrencesFilter(e.target.value)}
                      placeholder="تصفية باسم السورة أو نص الآية..."
                      className="h-8 text-xs pr-8 rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  {filteredOccurrences.map((occ, idx) => (
                    <div
                      key={`${occ.surahNo}:${occ.ayahNo}:${occ.wordIndex}-${idx}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`انتقال إلى سورة ${occ.surahName} الآية ${occ.ayahNo}`}
                      onClick={() => {
                        navigateToAyah(occ.surahNo, occ.ayahNo);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigateToAyah(occ.surahNo, occ.ayahNo);
                        }
                      }}
                      className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200 cursor-pointer text-right group space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <span className="size-5 rounded-md bg-muted group-hover:bg-primary/20 grid place-items-center text-[10px] font-mono">
                            {occ.surahNo}
                          </span>
                          {occ.surahName} • الآية {occ.ayahNo}
                        </span>

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                          انتقال للآية
                          <ExternalLink className="size-3" />
                        </span>
                      </div>

                      {occ.ayahText && (
                        <p className="text-sm font-serif leading-relaxed text-muted-foreground line-clamp-2 pt-0.5">
                          {occ.ayahText}
                        </p>
                      )}
                    </div>
                  ))}

                  {filteredOccurrences.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      لا توجد مواضع مطابقة لبحثك في مواضع هذا الجذر.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                لم يتم العثور على مواضع مسجلة لهذا الجذر.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source & Attribution Footer */}
      <div className="p-3 border-t border-border/80 bg-muted/20 text-center text-[11px] text-muted-foreground space-y-0.5 shrink-0">
        <p>
          المصدر: <strong>معجم كوربس القرآن (The Quranic Arabic Corpus)</strong> - جامعة ليدز (د. قيس دوكس)
        </p>
        <p className="opacity-75">
          رواية حفص عن عاصم • مرخص بموجب رخصة جنو العمومية (GPL)
        </p>
      </div>
    </div>
  );
}

export function WordExplorerDrawer() {
  const isWordExplorerOpen = useQuranStore((s) => s.isWordExplorerOpen);
  const selectedWordTarget = useQuranStore((s) => s.selectedWordTarget);
  const closeWordExplorer = useQuranStore((s) => s.closeWordExplorer);
  const titleId = useId();
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const drawerContainerRef = useRef<HTMLDivElement | null>(null);

  // Capture originating active element on open
  useEffect(() => {
    if (isWordExplorerOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isWordExplorerOpen]);

  const handleClose = useCallback(() => {
    closeWordExplorer();

    // Restore focus to originating word token or saved active element
    const wordId = selectedWordTarget
      ? `word-token-${selectedWordTarget.surahNo}-${selectedWordTarget.ayahNo}-${selectedWordTarget.wordIndex}`
      : null;
    const el = (wordId && document.getElementById(wordId)) || triggerElementRef.current;
    if (el && typeof el.focus === 'function') {
      setTimeout(() => el.focus(), 0);
    }
  }, [closeWordExplorer, selectedWordTarget]);

  // Focus trapping (Tab, Shift+Tab) and Escape handling
  useEffect(() => {
    if (!isWordExplorerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        const container = drawerContainerRef.current;
        if (!container) return;

        const focusableSelector =
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]:not([aria-disabled="true"]):not([tabindex="-1"])';

        const focusableElements = Array.from(
          container.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => {
          return (
            !el.hasAttribute('disabled') &&
            el.getAttribute('aria-hidden') !== 'true' &&
            el.tabIndex >= 0
          );
        });

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Contain focus within drawer: prevent focus from leaking to background elements
    const handleFocusIn = (e: FocusEvent) => {
      const container = drawerContainerRef.current;
      if (container && !container.contains(e.target as Node)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const firstFocusable = container.querySelector<HTMLElement>(
          'button:not([disabled]), [tabindex="0"]'
        );
        firstFocusable?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [isWordExplorerOpen, handleClose]);

  if (!isWordExplorerOpen || !selectedWordTarget) {
    return null;
  }

  return (
    <div
      ref={drawerContainerRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <WordExplorerPanel
        key={`${selectedWordTarget.surahNo}:${selectedWordTarget.ayahNo}:${selectedWordTarget.wordIndex}`}
        selectedWordTarget={selectedWordTarget}
        onClose={handleClose}
        titleId={titleId}
      />
    </div>
  );
}
