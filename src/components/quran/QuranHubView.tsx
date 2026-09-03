'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useQuranStore,
  getAyahRecitersForQiraah,
} from '@/stores/quran-store';
import { QIRAAT_LIST } from '@/lib/quran/data';
import {
  getRecitersForRiwayah,
  type RiwayahReciterEntry,
} from '@/lib/quran/mp3quran-engine';
import { PdfViewer } from '@/components/pdf-viewer/PdfViewer';
import { AyahDetailModal } from './AyahDetailModal';
import { SurahDrawer } from './SurahDrawer';
import { ReciterModal } from './ReciterModal';
import { QuranAudioBar } from './QuranAudioBar';
import { AyahCard } from './AyahCard';
import { QuickAyahMenu } from './QuickAyahMenu';
import { useQuranAudio } from '@/hooks/use-quran-audio';
import type { AyahItem } from '@/types/quran';
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

  const audio = useQuranAudio({ activeRiwayahReciter });

  useEffect(() => {
    loadSurah(activeSurah.number);
  }, [activeSurah.number, loadSurah]);

  useEffect(() => {
    const code = activeTranslation?.code || 'en-saheeh';
    import('@/lib/quran/translation-engine').then(({ getSurahTranslationsMap }) => {
      getSurahTranslationsMap(code, activeSurah.number).then(setSurahTranslationsMap);
    });
  }, [activeTranslation?.code, activeSurah.number]);

  useEffect(() => {
    getRecitersForRiwayah(activeQiraah.id).then((list) => {
      setRiwayahReciters(list);
      if (list.length > 0) {
        setActiveRiwayahReciter(list[0]);
      }
    });
  }, [activeQiraah.id]);

  const handleCopyAyah = (ayah: AyahItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `﴿ ${ayah.textAr} ﴾ [سورة ${activeSurah.nameAr}: ${ayah.ayahNo}]\n${showTranslation && ayah.textEn ? `\nTranslation: ${ayah.textEn}` : ''}\n\nالمصدر: منصة النور القرآنية`;
    copyAyah(ayah.ayahNo, text, `تم نسخ الآية رقم ${ayah.ayahNo}`);
  };


  const isVerseLevelAvailable = activeQiraah.id === 'hafs' || activeQiraah.id === 'warsh';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-40 md:pb-28">
      {/* Hidden Global Audio Tag */}
      <audio
        ref={audio.audioRef}
        onEnded={audio.handleAudioEnded}
        onTimeUpdate={audio.handleTimeUpdate}
        onLoadedMetadata={audio.handleLoadedMetadata}
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
                title="عرض صفحة المصحف الحقيقي"
              >
                المصحف
              </button>

              <button
                onClick={() => setViewMode('interactive')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl transition-all',
                  viewMode === 'interactive'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="عرض الآيات التفاعلية"
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
                title="المصحف المصور الأصلي"
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
                  toast.success(
                    `جاري تلاوة سورة ${activeSurah.nameAr} برواية ${activeQiraah.name} بصوت ${activeRiwayahReciter?.reciterName || activeReciter.name}`
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
        {loadingSurah && (
          <div className="py-24 text-center space-y-3">
            <div className="size-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-muted-foreground animate-pulse">
              جاري فتح سورة {activeSurah.nameAr} برواية {activeQiraah.name}...
            </p>
          </div>
        )}

        {/* 1. Real Mushaf Page Mode */}
        {!loadingSurah && viewMode === 'mushaf-real' && surahData && (
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
        {!loadingSurah && viewMode === 'interactive' && surahData && (
          <div className="space-y-3">
            {surahData.ayahs.map((ayah) => {
              const isPlaying = currentPlayingAyah === ayah.ayahNo;
              const translation = surahTranslationsMap.get(ayah.ayahNo) || ayah.textEn;

              return (
                <AyahCard
                  key={ayah.ayahNo}
                  ayah={ayah}
                  isPlaying={isPlaying}
                  onPlay={() => playAyah(ayah.ayahNo)}
                  onOpenDetail={() => setSelectedAyahForModal(ayah)}
                  onCopy={(e) => handleCopyAyah(ayah, e)}
                  isCopied={copiedAyah === ayah.ayahNo}
                  fontSize={fontSize}
                  showTranslation={showTranslation}
                  translationText={translation}
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
          } else {
            stopAudio();
            audio.setIsPlayingFullSurah(true);
            audio.setTargetSeekAyah(num);
          }
        }}
        onOpenDetailModal={() => {
          if (quickMenuAyah) setSelectedAyahForModal(quickMenuAyah);
        }}
        onPlayFullSurah={() => {
          stopAudio();
          audio.setIsPlayingFullSurah(true);
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
          onNextAyah={playNextAyah}
          onPrevAyah={
            currentPlayingAyah && currentPlayingAyah > 1
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
    </div>
  );
}
