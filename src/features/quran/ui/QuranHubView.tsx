'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Play,
  Pause,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useQuranStore,
  useQuranAudio,
} from '../model';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  getAyahRecitersForQiraah,
  isAyahAudioSupportedForQiraah,
  type AyahItem,
} from '../domain';
import {
  getRecitersForRiwayah,
  type RiwayahReciterEntry,
} from '../infrastructure';
import { PdfViewer } from '@/components/pdf-viewer/PdfViewer';
import { AyahDetailModal } from './AyahDetailModal';
import { SurahDrawer } from './SurahDrawer';
import { ReciterModal } from './ReciterModal';
import { QuranSearchModal } from './QuranSearchModal';
import { WordExplorerDrawer } from './WordExplorerDrawer';
import { QuranAudioBar } from './QuranAudioBar';
import { AyahCard } from './AyahCard';
import { QuickAyahMenu } from './QuickAyahMenu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIdClipboard } from '@/hooks/use-clipboard';

export function QuranHubView() {
  const activeQiraah = useQuranStore((s) => s.activeQiraah);
  const activeSurah = useQuranStore((s) => s.activeSurah);
  const surahData = useQuranStore((s) => s.surahData);
  const activeTranslation = useQuranStore((s) => s.activeTranslation);
  const activeReciter = useQuranStore((s) => s.activeReciter);
  const viewMode = useQuranStore((s) => s.viewMode);
  const fontSize = useQuranStore((s) => s.fontSize);
  const showTranslation = useQuranStore((s) => s.showTranslation);
  const currentPlayingAyah = useQuranStore((s) => s.currentPlayingAyah);
  const isPlayingAudio = useQuranStore((s) => s.isPlayingAudio);
  const loadingSurah = useQuranStore((s) => s.loadingSurah);
  const surahLoadError = useQuranStore((s) => s.surahLoadError);
  const retryLoadSurah = useQuranStore((s) => s.retryLoadSurah);

  const setActiveQiraah = useQuranStore((s) => s.setActiveQiraah);
  const setActiveSurah = useQuranStore((s) => s.setActiveSurah);
  const nextSurah = useQuranStore((s) => s.nextSurah);
  const prevSurah = useQuranStore((s) => s.prevSurah);
  const setActiveReciter = useQuranStore((s) => s.setActiveReciter);
  const setViewMode = useQuranStore((s) => s.setViewMode);
  const loadSurah = useQuranStore((s) => s.loadSurah);
  const playAyah = useQuranStore((s) => s.playAyah);
  const pauseAudio = useQuranStore((s) => s.pauseAudio);
  const stopAudio = useQuranStore((s) => s.stopAudio);
  const playNextAyah = useQuranStore((s) => s.playNextAyah);
  const highlightedTarget = useQuranStore((s) => s.highlightedTarget);
  const openQuranSearch = useQuranStore((s) => s.openQuranSearch);
  const setHighlightedTarget = useQuranStore((s) => s.setHighlightedTarget);
  const openWordExplorer = useQuranStore((s) => s.openWordExplorer);
  const selectedWordTarget = useQuranStore((s) => s.selectedWordTarget);

  const [surahDrawerOpen, setSurahDrawerOpen] = useState(false);
  const [recitersModalOpen, setRecitersModalOpen] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [reciterSearch, setReciterSearch] = useState('');
  const [selectedAyahForModal, setSelectedAyahForModal] = useState<AyahItem | null>(null);
  const [quickMenuAyah, setQuickMenuAyah] = useState<AyahItem | null>(null);
  const { copiedId: copiedAyah, copy: copyAyah } = useIdClipboard<number>();

  const [riwayahReciters, setRiwayahReciters] = useState<RiwayahReciterEntry[]>([]);
  const [activeRiwayahReciter, setActiveRiwayahReciter] = useState<RiwayahReciterEntry | null>(null);
  const [surahTranslationsMap, setSurahTranslationsMap] = useState<Map<number, string>>(new Map());
  const [loadedTranslationKey, setLoadedTranslationKey] = useState<string | null>(null);
  const currentTranslationKey = `${activeTranslation?.code || 'en-saheeh'}-${activeSurah.number}`;
  const isTranslationReady =
    Boolean(showTranslation) &&
    viewMode === 'interactive' &&
    loadedTranslationKey === currentTranslationKey;

  const audio = useQuranAudio({ activeRiwayahReciter });

  // Load surah only if not already loaded in memory to prevent duplicate requests
  useEffect(() => {
    const currentData = useQuranStore.getState().surahData;
    if (!currentData || currentData.surahNo !== activeSurah.number) {
      loadSurah(activeSurah.number);
    }
  }, [activeSurah.number, loadSurah]);

  // Load translation strictly when translation is enabled and view is interactive; cancel stale requests
  useEffect(() => {
    if (!showTranslation || viewMode !== 'interactive') {
      return;
    }
    let isCancelled = false;
    const code = activeTranslation?.code || 'en-saheeh';
    const surahNo = activeSurah.number;
    const key = `${code}-${surahNo}`;

    import('../infrastructure').then(({ getSurahTranslationsMap }) => {
      getSurahTranslationsMap(code, surahNo).then((map) => {
        if (!isCancelled) {
          setSurahTranslationsMap(map);
          setLoadedTranslationKey(key);
        }
      });
    });
    return () => {
      isCancelled = true;
    };
  }, [showTranslation, viewMode, activeTranslation?.code, activeSurah.number]);

  // Load riwayah reciters safely without stale overwrites
  useEffect(() => {
    let isCancelled = false;
    getRecitersForRiwayah(activeQiraah.id).then((list) => {
      if (!isCancelled) {
        setRiwayahReciters(list);
        setActiveRiwayahReciter(list.length > 0 ? list[0] : null);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [activeQiraah.id]);

  // Global keydown listener for Ctrl+K / Cmd+K to open search modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openQuranSearch();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [openQuranSearch]);

  // Deep link URL query params parser (?surah=X&ayah=Y)
  // Decoupled from activeSurah so manual user surah selection is never overridden by old URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseDeepLinkParams = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sParam = params.get('surah');
        const aParam = params.get('ayah');

        if (sParam) {
          const sNum = parseInt(sParam, 10);
          if (!isNaN(sNum) && sNum >= 1 && sNum <= 114) {
            const targetSurah = ALL_SURAHS[sNum - 1];
            const currentSurah = useQuranStore.getState().activeSurah;
            if (currentSurah.number !== sNum) {
              setActiveSurah(targetSurah, { skipUrlUpdate: true });
            }
            if (aParam) {
              const aNum = parseInt(aParam, 10);
              if (!isNaN(aNum) && aNum >= 1 && aNum <= targetSurah.numberOfAyahs) {
                setViewMode('interactive');
                setHighlightedTarget({ surahNo: sNum, ayahNo: aNum });
              } else {
                setHighlightedTarget(null);
              }
            } else {
              setHighlightedTarget(null);
            }
          }
        } else {
          setHighlightedTarget(null);
        }
      } catch {
        /* ignore */
      }
    };

    parseDeepLinkParams();
    window.addEventListener('popstate', parseDeepLinkParams);
    return () => window.removeEventListener('popstate', parseDeepLinkParams);
  }, [setActiveSurah, setViewMode, setHighlightedTarget]);

  // Smooth scroll to highlighted ayah when destination surah is rendered in interactive view
  useEffect(() => {
    if (
      highlightedTarget &&
      highlightedTarget.surahNo === activeSurah.number &&
      highlightedTarget.surahNo === surahData?.surahNo &&
      !loadingSurah &&
      viewMode === 'interactive'
    ) {
      const targetAyah = highlightedTarget.ayahNo;
      const timer = setTimeout(() => {
        const currentTarget = useQuranStore.getState().highlightedTarget;
        if (
          currentTarget &&
          currentTarget.surahNo === activeSurah.number &&
          currentTarget.ayahNo === targetAyah
        ) {
          const el = document.getElementById(`ayah-${targetAyah}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightedTarget, activeSurah.number, loadingSurah, surahData, viewMode]);

  const handleCopyAyah = (ayah: AyahItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const transText = isTranslationReady ? surahTranslationsMap.get(ayah.ayahNo) : undefined;
    const isEnglish = activeTranslation?.code.startsWith('en-');
    const fallbackText = isEnglish ? ayah.textEn : '';
    const finalTrans = transText || fallbackText;
    const transSection =
      showTranslation && isTranslationReady && finalTrans
        ? `\n\nالترجمة (${activeTranslation?.name || 'الإنجليزية'} - ${activeTranslation?.author || 'المعتمدة'}):\n${finalTrans}`
        : '';

    const text = `﴿ ${ayah.textAr} ﴾ [سورة ${activeSurah.nameAr}: ${ayah.ayahNo}]${transSection}\n\nالمصدر: منصة النور القرآنية`;
    copyAyah(ayah.ayahNo, text, `تم نسخ الآية رقم ${ayah.ayahNo}`);
  };

  const isVerseLevelAvailable = isAyahAudioSupportedForQiraah(activeQiraah.id);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-40 md:pb-28">
      {/* Hidden Global Audio Tag */}
      <audio
        ref={audio.audioRef}
        onEnded={audio.handleAudioEnded}
        onTimeUpdate={audio.handleTimeUpdate}
        onLoadedMetadata={audio.handleLoadedMetadata}
        onError={audio.handleAudioError}
        className="hidden"
      />

      {/* Main Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 max-w-7xl mx-auto">
          {/* Right: Surah Title & Quick Drawer Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSurahDrawerOpen(true)}
              className="gap-2 font-bold text-xs sm:text-sm rounded-2xl bg-card hover:bg-muted border-border shadow-sm h-10 px-3 sm:px-4"
            >
              <div className="size-6 rounded-xl bg-primary/10 grid place-items-center text-primary font-bold text-xs">
                {activeSurah.number}
              </div>
              <span className="font-bold">سورة {activeSurah.nameAr}</span>
              <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                {activeSurah.numberOfAyahs} آية
              </Badge>
            </Button>

            {/* Qira'ah / Narration Switcher */}
            <div className="flex items-center gap-1.5">
              <select
                value={activeQiraah.id}
                onChange={(e) => {
                  const q = QIRAAT_LIST.find((x) => x.id === e.target.value);
                  if (q) {
                    stopAudio();
                    audio.setIsPlayingFullSurah(false);
                    setActiveQiraah(q);
                    toast.success(`تم التبديل إلى: ${q.name}`);
                  }
                }}
                className="h-10 px-2.5 rounded-2xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[150px] sm:max-w-[210px] truncate shadow-sm"
              >
                {QIRAAT_LIST.map((q) => (
                  <option key={q.id} value={q.id}>
                    📖 {q.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quran Ayah Search Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={openQuranSearch}
              className="gap-2 font-bold text-xs sm:text-sm rounded-2xl bg-card hover:bg-muted border-border shadow-sm h-10 px-3 sm:px-4 text-muted-foreground hover:text-foreground"
              title="البحث في آيات القرآن الكريم (Ctrl+K)"
            >
              <Search className="size-4 text-primary shrink-0" />
              <span className="hidden sm:inline font-bold text-foreground">بحث في الآيات</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-muted border border-border text-[10px] font-mono text-muted-foreground">
                Ctrl K
              </kbd>
            </Button>
          </div>

          {/* Center & Left: Controls & Reciters */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border text-xs font-bold">
              <button
                onClick={() => setViewMode('mushaf-real')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl transition-all',
                  viewMode === 'mushaf-real'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="عرض نص السورة بالقراءة المتصلة"
              >
                قراءة متصلة
              </button>

              <button
                onClick={() => setViewMode('interactive')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl transition-all',
                  viewMode === 'interactive'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="عرض الآيات التفاعلية مع التفسير والترجمة"
              >
                آيات تفاعلية
              </button>

              <button
                onClick={() => setViewMode('pdf-page')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl transition-all',
                  viewMode === 'pdf-page'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="المصحف المصور الأصلي (PDF)"
              >
                المصحف المصور
              </button>
            </div>

            {/* Recitation Trigger (Full Surah Stream) */}
            <Button
              size="sm"
              variant={audio.isPlayingFullSurah ? 'default' : 'outline'}
              onClick={() => {
                if (audio.isPlayingFullSurah) {
                  stopAudio();
                  audio.setIsPlayingFullSurah(false);
                } else {
                  stopAudio();
                  audio.setIsPlayingFullSurah(true);
                  const reciterTitle = activeRiwayahReciter?.reciterName || activeReciter.name;
                  toast.success(
                    `جاري تلاوة سورة ${activeSurah.nameAr} بصوت ${reciterTitle}`
                  );
                }
              }}
              className={cn(
                'rounded-2xl text-xs gap-1.5 h-10 px-3 font-bold shadow-sm',
                audio.isPlayingFullSurah && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {audio.isPlayingFullSurah ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              <span className="hidden sm:inline">
                {audio.isPlayingFullSurah ? 'إيقاف السورة' : 'تلاوة السورة'}
              </span>
            </Button>

            {/* Reciters Modal Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRecitersModalOpen(true)}
              className="rounded-2xl text-xs gap-1.5 h-10 px-2.5 sm:px-3 font-bold shadow-sm bg-card hover:bg-muted"
              title="مكتبة القراء الكبرى"
            >
              <Headphones className="size-3.5 text-primary" />
              <span className="hidden md:inline">240+ قارئ</span>
            </Button>

            {/* Surah Navigation (Prev / Next) */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={nextSurah}
                disabled={activeSurah.number >= 114}
                className="size-10 rounded-2xl"
                title="السورة التالية"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                onClick={prevSurah}
                disabled={activeSurah.number <= 1}
                className="size-10 rounded-2xl"
                title="السورة السابقة"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Quran Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* Informative Riwayah Banner: when non-Hafs is selected in digital text mode */}
        {activeQiraah.id !== 'hafs' && viewMode !== 'pdf-page' && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <span>تنبيه الرواية:</span>
                <span>النص الرقمي المعروض مضبوط برواية حفص عن عاصم</span>
              </div>
              <div className="text-muted-foreground text-[11px]">
                للاطلاع على مصحف ({activeQiraah.name}) كاملاً برسمه وضبطه، يمكنك الانتقال إلى المصحف المصور.
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode('pdf-page')}
              className="rounded-xl text-xs font-bold shrink-0 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
            >
              عرض المصحف المصور
            </Button>
          </div>
        )}

        {loadingSurah && (
          <div className="py-24 text-center space-y-3">
            <div className="size-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-muted-foreground animate-pulse">
              جاري فتح سورة {activeSurah.nameAr}...
            </p>
          </div>
        )}

        {/* Error state with retry option instead of showing stale surah content */}
        {surahLoadError && !loadingSurah && (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto p-6 rounded-3xl bg-card border border-destructive/30 shadow-lg">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto text-xl font-bold">
              !
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">
                تعذر تحميل سورة {activeSurah.nameAr}
              </h3>
              <p className="text-xs text-muted-foreground">
                يرجى التحقق من الاتصال بالإنترنت، أو إعادة المحاولة لجلب بيانات السورة.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={retryLoadSurah}
              className="rounded-xl font-bold text-xs"
            >
              إعادة تحميل السورة
            </Button>
          </div>
        )}

        {/* 1. Continuous Text Reading Mode */}
        {!loadingSurah && !surahLoadError && viewMode === 'mushaf-real' && surahData && (
          <div className="mushaf-real-page rounded-3xl border border-amber-900/20 dark:border-amber-500/20 shadow-2xl p-6 sm:p-12 relative overflow-hidden">
            <div className="mushaf-surah-header text-center my-6 py-4 px-6 rounded-2xl relative shadow-md">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                سورة {surahData.nameAr} ({surahData.placeOfRevelation === 'Meccan' ? 'مكية' : 'مدنية'}) — آياتها {surahData.totalAyahs}
              </div>
              <div className="font-quran text-2xl sm:text-3xl text-amber-950 dark:text-amber-100 font-bold">
                {surahData.nameAr}
              </div>
            </div>

            {activeSurah.number !== 1 && activeSurah.number !== 9 && (
              <div className="text-center font-quran text-xl sm:text-2xl text-amber-900/80 dark:text-amber-200/80 my-6 font-bold">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </div>
            )}

            <div
              className="text-justify font-quran font-medium leading-[2.6] sm:leading-[3.0] text-amber-950 dark:text-amber-50"
              style={{ fontSize: `${fontSize}px` }}
            >
              {surahData.ayahs.map((ayah) => {
                const isPlaying = currentPlayingAyah === ayah.ayahNo;
                return (
                  <span
                    key={ayah.ayahNo}
                    onClick={() => setQuickMenuAyah(ayah)}
                    className={cn(
                      'inline cursor-pointer rounded-xl px-1.5 py-0.5 transition-all duration-200 hover:bg-amber-500/20',
                      isPlaying &&
                        'bg-emerald-500/30 text-emerald-950 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/50'
                    )}
                    title={`الآية ${ayah.ayahNo} - انقر للخيارات والتلاوة والتفسير`}
                  >
                    {ayah.textAr}
                    <span className="inline-flex items-center justify-center size-7 sm:size-8 mx-1.5 rounded-full border border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-sans text-xs font-bold align-middle">
                      {ayah.ayahNo}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Interactive Ayah List Mode */}
        {!loadingSurah && !surahLoadError && viewMode === 'interactive' && surahData && (
          <div className="space-y-3">
            {surahData.ayahs.map((ayah) => {
              const isPlaying = currentPlayingAyah === ayah.ayahNo && isPlayingAudio;
              const translation = isTranslationReady ? surahTranslationsMap.get(ayah.ayahNo) : undefined;

              return (
                <AyahCard
                  key={ayah.ayahNo}
                  ayah={ayah}
                  isPlaying={isPlaying}
                  isHighlighted={
                    highlightedTarget?.surahNo === activeSurah.number &&
                    highlightedTarget?.ayahNo === ayah.ayahNo
                  }
                  isAudioSupported={isVerseLevelAvailable}
                  onPlay={() => {
                    if (isPlaying) {
                      pauseAudio();
                    } else {
                      audio.setIsPlayingFullSurah(false);
                      playAyah(ayah.ayahNo);
                    }
                  }}
                  onOpenDetail={() => setSelectedAyahForModal(ayah)}
                  onCopy={(e) => handleCopyAyah(ayah, e)}
                  isCopied={copiedAyah === ayah.ayahNo}
                  fontSize={fontSize}
                  showTranslation={showTranslation}
                  translationText={translation}
                  translationDirection={activeTranslation?.direction || 'ltr'}
                  isEnglishTranslation={Boolean(activeTranslation?.code.startsWith('en-'))}
                  surahNo={activeSurah.number}
                  onWordClick={openWordExplorer}
                  selectedWordIndex={
                    selectedWordTarget?.surahNo === activeSurah.number &&
                    selectedWordTarget?.ayahNo === ayah.ayahNo
                      ? selectedWordTarget.wordIndex
                      : null
                  }
                />
              );
            })}
          </div>
        )}

        {/* 3. Original PDF Mushaf Viewer Mode */}
        {!loadingSurah && viewMode === 'pdf-page' && (
          <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-2xl p-2 sm:p-4">
            <PdfViewer
              url={activeQiraah.pdfUrl}
              title={activeQiraah.name}
              bookSlug={`quran-${activeQiraah.id}`}
            />
          </div>
        )}
      </main>

      {/* Surah Drawer */}
      <SurahDrawer
        open={surahDrawerOpen}
        onClose={() => setSurahDrawerOpen(false)}
        activeSurah={activeSurah}
        onSelectSurah={(s) => {
          setActiveSurah(s);
          toast.success(`تم الانتقال إلى سورة ${s.nameAr}`);
        }}
        searchQuery={surahSearch}
        onSearchChange={setSurahSearch}
      />

      {/* Reciters Modal */}
      <ReciterModal
        open={recitersModalOpen}
        onClose={() => setRecitersModalOpen(false)}
        reciters={riwayahReciters}
        activeReciter={activeRiwayahReciter}
        onSelectReciter={setActiveRiwayahReciter}
        verseReciters={getAyahRecitersForQiraah(activeQiraah.id)}
        activeVerseReciter={activeReciter}
        onSelectVerseReciter={(vr) => {
          setActiveReciter(vr);
          toast.success(`تم اختيار القارئ: ${vr.name}`);
        }}
        searchQuery={reciterSearch}
        onSearchChange={setReciterSearch}
        qiraahName={activeQiraah.name}
      />

      {/* Quick Ayah Menu Popup */}
      <QuickAyahMenu
        ayah={quickMenuAyah}
        surah={activeSurah}
        activeQiraah={activeQiraah}
        onClose={() => setQuickMenuAyah(null)}
        isVerseLevelAvailable={isVerseLevelAvailable}
        activeReciter={activeReciter}
        onSelectActiveReciter={(r) => {
          setActiveReciter(r);
          toast.success(`تم اختيار القارئ: ${r.name}`);
        }}
        riwayahReciters={riwayahReciters}
        activeRiwayahReciter={activeRiwayahReciter}
        onSelectRiwayahReciter={(r) => {
          setActiveRiwayahReciter(r);
          toast.success(`تم اختيار القارئ: ${r.reciterName}`);
        }}
        onPlayAyah={(num) => {
          if (isVerseLevelAvailable) {
            audio.setIsPlayingFullSurah(false);
            playAyah(num);
          }
        }}
        onOpenDetailModal={() => {
          if (quickMenuAyah) setSelectedAyahForModal(quickMenuAyah);
        }}
        onPlayFullSurah={() => {
          stopAudio();
          audio.setIsPlayingFullSurah(true);
          const reciterTitle = activeRiwayahReciter?.reciterName || activeReciter.name;
          toast.success(`جاري تلاوة سورة ${activeSurah.nameAr} بصوت ${reciterTitle}`);
        }}
        onCopyAyah={() => {
          if (quickMenuAyah) handleCopyAyah(quickMenuAyah);
        }}
      />

      {/* Comprehensive Ayah Detail Modal */}
      {selectedAyahForModal && (
        <AyahDetailModal
          ayah={selectedAyahForModal}
          surah={activeSurah}
          activeQiraah={activeQiraah}
          onClose={() => setSelectedAyahForModal(null)}
          onPrevAyah={
            selectedAyahForModal.ayahNo > 1 && surahData
              ? () => setSelectedAyahForModal(surahData.ayahs[selectedAyahForModal.ayahNo - 2])
              : undefined
          }
          onNextAyah={
            surahData && selectedAyahForModal.ayahNo < surahData.totalAyahs
              ? () => setSelectedAyahForModal(surahData.ayahs[selectedAyahForModal.ayahNo])
              : undefined
          }
        />
      )}

      {/* Sticky Audio Playback Bar */}
      {(isPlayingAudio || audio.isPlayingFullSurah || currentPlayingAyah !== null) && (
        <QuranAudioBar
          isPlaying={isPlayingAudio || audio.isPlayingFullSurah}
          onTogglePlay={() => {
            if (isPlayingAudio || audio.isPlayingFullSurah) {
              pauseAudio();
              audio.setIsPlayingFullSurah(false);
            } else {
              if (currentPlayingAyah) {
                playAyah(currentPlayingAyah);
              } else {
                audio.setIsPlayingFullSurah(true);
              }
            }
          }}
          onNextAyah={isVerseLevelAvailable ? playNextAyah : undefined}
          onPrevAyah={
            isVerseLevelAvailable && currentPlayingAyah && currentPlayingAyah > 1
              ? () => playAyah(currentPlayingAyah - 1)
              : undefined
          }
          onFastForward={audio.handleFastForward}
          onRewind={audio.handleRewind}
          currentTime={audio.currentTime}
          duration={audio.duration}
          onSeek={audio.handleSeek}
          onSeekStart={() => audio.setIsSeeking(true)}
          onSeekEnd={() => audio.setIsSeeking(false)}
          currentAyahNo={currentPlayingAyah}
          totalAyahs={activeSurah.numberOfAyahs}
          surahName={activeSurah.nameAr}
          reciterName={
            audio.isPlayingFullSurah
              ? activeRiwayahReciter?.reciterName || 'القارئ'
              : activeReciter.name
          }
          onOpenReciterModal={() => setRecitersModalOpen(true)}
          isPlayingFullSurah={audio.isPlayingFullSurah}
          onToggleFullSurah={() => {
            if (audio.isPlayingFullSurah) {
              stopAudio();
              audio.setIsPlayingFullSurah(false);
            } else {
              stopAudio();
              audio.setIsPlayingFullSurah(true);
            }
          }}
        />
      )}

      {/* Full-featured Quran Ayah Search Modal */}
      <QuranSearchModal />

      {/* Word Morphology & Root Explorer Drawer («استكشف الكلمة») */}
      <WordExplorerDrawer />
    </div>
  );
}
