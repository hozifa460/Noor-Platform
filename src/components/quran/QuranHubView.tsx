'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Globe,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Copy,
  Check,
  Headphones,
  Download,
  X,
  RotateCcw,
  FastForward,
  Rewind,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useQuranStore,
  getAyahRecitersForQiraah,
  QURAN_RECITERS,
  type AyahItem,
} from '@/stores/quran-store';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
} from '@/lib/quran-data';
import {
  loadMp3QuranReciters,
  getRecitersForRiwayah,
  getMp3QuranSurahUrl,
  type Mp3Reciter,
  type RiwayahReciterEntry,
} from '@/lib/mp3quran-engine';
import { PdfViewer } from '@/components/pdf-viewer/PdfViewer';
import { AyahDetailModal } from './AyahDetailModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getWarshAyahAudioNumber(surahNo: number, ayahNo: number): number {
  if (surahNo === 1) {
    if (ayahNo <= 1) return 1;
    return Math.max(1, ayahNo - 1);
  }
  return ayahNo;
}

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
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);

  // Riwayah-specific reciters
  const [riwayahReciters, setRiwayahReciters] = useState<RiwayahReciterEntry[]>([]);
  const [activeRiwayahReciter, setActiveRiwayahReciter] = useState<RiwayahReciterEntry | null>(null);

  // Full MP3Quran catalog & translations map
  const [mp3Reciters, setMp3Reciters] = useState<Mp3Reciter[]>([]);
  const [surahTranslationsMap, setSurahTranslationsMap] = useState<Map<number, string>>(new Map());

  // Surah stream playback mode (full surah recitation by selected sheikh)
  const [isPlayingFullSurah, setIsPlayingFullSurah] = useState(false);

  // Progress Bar & Time State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [targetSeekAyah, setTargetSeekAyah] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load initial Surah and MP3Quran catalog on mount
  useEffect(() => {
    loadSurah(activeSurah.number);
    loadMp3QuranReciters().then(setMp3Reciters).catch(console.warn);
  }, [activeSurah.number, loadSurah]);

  // Load active translation for current Surah
  useEffect(() => {
    const code = activeTranslation?.code || 'en-saheeh';
    import('@/lib/quran-translation-engine').then(({ getSurahTranslationsMap }) => {
      getSurahTranslationsMap(code, activeSurah.number).then(setSurahTranslationsMap);
    });
  }, [activeTranslation?.code, activeSurah.number]);

  // When activeQiraah changes, load the reciters for THAT specific Riwayah
  useEffect(() => {
    getRecitersForRiwayah(activeQiraah.id).then((list) => {
      setRiwayahReciters(list);
      if (list.length > 0) {
        setActiveRiwayahReciter(list[0]);
      }
    });
  }, [activeQiraah.id]);

  // Handle Ayah Audio URL (Selected Reciter & Riwayah with exact Warsh alignment)
  const currentAudioUrl = useMemo(() => {
    if (isPlayingFullSurah && activeRiwayahReciter) {
      return getMp3QuranSurahUrl(activeRiwayahReciter.server, activeSurah.number);
    }
    if (!currentPlayingAyah || !surahData) return null;
    const sStr = String(surahData.surahNo).padStart(3, '0');
    const adjustedAyahNo =
      activeQiraah.id === 'warsh'
        ? getWarshAyahAudioNumber(surahData.surahNo, currentPlayingAyah)
        : currentPlayingAyah;
    const aStr = String(adjustedAyahNo).padStart(3, '0');
    return `https://everyayah.com/data/${activeReciter.subfolder}/${sStr}${aStr}.mp3`;
  }, [currentPlayingAyah, surahData, activeReciter, isPlayingFullSurah, activeRiwayahReciter, activeSurah.number, activeQiraah.id]);

  // Audio Playback effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentAudioUrl && audio.src !== currentAudioUrl) {
      audio.src = currentAudioUrl;
    }

    if ((isPlayingAudio || isPlayingFullSurah) && currentAudioUrl) {
      audio.play().catch((err) => {
        console.warn('Audio play prevented or format fallback:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlayingAudio, isPlayingFullSurah, currentAudioUrl]);

  // Proportional Ayah Seeking on metadata load
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || 0;
    setDuration(dur);

    if (isPlayingFullSurah && targetSeekAyah && surahData && dur > 0) {
      const totalChars = surahData.ayahs.reduce((acc, a) => acc + a.textAr.length, 0);
      const charsBefore = surahData.ayahs
        .slice(0, Math.max(0, targetSeekAyah - 1))
        .reduce((acc, a) => acc + a.textAr.length, 0);
      const fraction = totalChars > 0 ? charsBefore / totalChars : 0;
      const targetSec = fraction * dur;
      audioRef.current.currentTime = targetSec;
      setCurrentTime(targetSec);
      setTargetSeekAyah(null);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || isSeeking) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleAudioEnded = () => {
    if (isPlayingFullSurah) {
      setIsPlayingFullSurah(false);
      setCurrentTime(0);
      return;
    }
    playNextAyah();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleFastForward = () => {
    if (!audioRef.current) return;
    const next = Math.min(duration, audioRef.current.currentTime + 10);
    audioRef.current.currentTime = next;
    setCurrentTime(next);
  };

  const handleRewind = () => {
    if (!audioRef.current) return;
    const prev = Math.max(0, audioRef.current.currentTime - 10);
    audioRef.current.currentTime = prev;
    setCurrentTime(prev);
  };

  const handleCopyAyah = (ayah: AyahItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `﴿ ${ayah.textAr} ﴾ [سورة ${activeSurah.nameAr}: ${ayah.ayahNo}]\n${showTranslation && ayah.textEn ? `\nTranslation: ${ayah.textEn}` : ''}\n\nالمصدر: منصة النور القرآنية`;
    navigator.clipboard.writeText(text);
    setCopiedAyah(ayah.ayahNo);
    toast.success(`تم نسخ الآية رقم ${ayah.ayahNo}`);
    setTimeout(() => setCopiedAyah(null), 2000);
  };

  const filteredSurahsList = useMemo(() => {
    const q = surahSearch.trim().toLowerCase();
    if (!q) return ALL_SURAHS;
    return ALL_SURAHS.filter(
      (s) =>
        s.nameAr.includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        String(s.number) === q
    );
  }, [surahSearch]);

  const filteredRecitersList = useMemo(() => {
    const q = reciterSearch.trim().toLowerCase();
    if (!q) return mp3Reciters;
    return mp3Reciters.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.moshaf.some((m) => m.name.toLowerCase().includes(q))
    );
  }, [reciterSearch, mp3Reciters]);

  const isVerseLevelAvailable = activeQiraah.id === 'hafs' || activeQiraah.id === 'warsh';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-40 md:pb-28">
      {/* Hidden Global Audio Tag */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
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
              variant={isPlayingFullSurah ? 'default' : 'outline'}
              onClick={() => {
                if (isPlayingFullSurah) {
                  stopAudio();
                  setIsPlayingFullSurah(false);
                } else {
                  stopAudio();
                  setIsPlayingFullSurah(true);
                  toast.success(`جاري تلاوة سورة ${activeSurah.nameAr} برواية ${activeQiraah.name} بصوت ${activeRiwayahReciter?.reciterName || activeReciter.name}`);
                }
              }}
              className={cn(
                'rounded-2xl text-xs gap-1.5 h-10 px-3 font-bold shadow-sm',
                isPlayingFullSurah && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {isPlayingFullSurah ? <Pause className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
              <span className="hidden sm:inline">
                {isPlayingFullSurah ? 'إيقاف السورة' : 'تلاوة السورة'}
              </span>
            </Button>

            {/* MP3Quran Reciters Modal Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRecitersModalOpen(true)}
              className="rounded-2xl text-xs gap-1.5 h-10 px-2.5 sm:px-3 font-bold shadow-sm bg-card hover:bg-muted"
              title="مكتبة القراء الكبرى (240+ قارئاً)"
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
        {/* Loading State */}
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
            {/* Real Mushaf Surah Header Banner */}
            <div className="mushaf-surah-header text-center my-6 py-4 px-6 rounded-2xl relative shadow-md">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                سورة {surahData.nameAr} ({surahData.placeOfRevelation === 'Meccan' ? 'مكية' : 'مدنية'}) — آياتها {surahData.totalAyahs}
              </div>
              <div className="font-quran text-2xl sm:text-3xl text-amber-950 dark:text-amber-100 font-bold">
                {surahData.nameAr}
              </div>
            </div>

            {/* Basmalah */}
            {activeSurah.number !== 1 && activeSurah.number !== 9 && (
              <div className="text-center font-quran text-xl sm:text-2xl text-amber-900/80 dark:text-amber-200/80 my-6 font-bold">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </div>
            )}

            {/* Continuous Ayah Flow (Authentic Quranic Layout) */}
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
                      isPlaying && 'bg-emerald-500/30 text-emerald-950 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/50'
                    )}
                    title={`الآية ${ayah.ayahNo} - انقر للخيارات والتلاوة والتفسير`}
                  >
                    {ayah.textAr}
                    {/* Quranic Ayah Number Badge */}
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
                <div
                  key={ayah.ayahNo}
                  onClick={() => setQuickMenuAyah(ayah)}
                  className={cn(
                    'p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer space-y-3',
                    isPlaying
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-1 ring-emerald-500'
                      : 'border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary font-bold text-xs">
                      {ayah.ayahNo}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAyah(ayah.ayahNo);
                        }}
                        className="size-8 rounded-xl"
                        title="تلاوة الآية"
                      >
                        <Volume2 className="size-4 text-emerald-600" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAyahForModal(ayah);
                        }}
                        className="size-8 rounded-xl"
                        title="تفسير الآية"
                      >
                        <BookOpen className="size-4 text-primary" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleCopyAyah(ayah, e)}
                        className="size-8 rounded-xl"
                        title="نسخ الآية"
                      >
                        {copiedAyah === ayah.ayahNo ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="font-quran text-xl sm:text-2xl text-foreground leading-[2.2] text-right">
                    ﴿ {ayah.textAr} ﴾
                  </p>

                  {translation && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/50 text-left" dir="ltr">
                      {translation}
                    </p>
                  )}
                </div>
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

      {/* Quick Ayah Action Menu Popup */}
      {quickMenuAyah && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-primary/10 grid place-items-center text-primary text-xs font-bold">
                  {quickMenuAyah.ayahNo}
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  سورة {activeSurah.nameAr} • الآية {quickMenuAyah.ayahNo}
                </h4>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setQuickMenuAyah(null)}
                className="size-8 rounded-xl"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Ayah Calligraphy Preview */}
            <div className="p-5 bg-gradient-to-b from-primary/5 to-transparent text-center border-b border-border">
              <p className="font-quran text-xl sm:text-2xl text-foreground leading-[2.2]">
                ﴿ {quickMenuAyah.textAr} ﴾
              </p>
            </div>

            {/* Reciter Selector strictly for THIS Riwayah */}
            <div className="p-3 bg-muted/30 border-b border-border space-y-1.5 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  🎙️ قراء ({activeQiraah.name.replace('مصحف القرآن الكريم - ', '').replace('مصحف المدينة النبوية - ', '')}):
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isVerseLevelAvailable ? getAyahRecitersForQiraah(activeQiraah.id).length : riwayahReciters.length} قراء
                </span>
              </div>

              {isVerseLevelAvailable ? (
                <select
                  value={activeReciter.id}
                  onChange={(e) => {
                    const available = getAyahRecitersForQiraah(activeQiraah.id);
                    const r = available.find((x) => x.id === e.target.value) || QURAN_RECITERS.find((x) => x.id === e.target.value);
                    if (r) {
                      setActiveReciter(r);
                      toast.success(`تم اختيار القارئ: ${r.name}`);
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {getAyahRecitersForQiraah(activeQiraah.id).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={activeRiwayahReciter?.reciterId || ''}
                  onChange={(e) => {
                    const r = riwayahReciters.find((x) => x.reciterId === Number(e.target.value));
                    if (r) {
                      setActiveRiwayahReciter(r);
                      toast.success(`تم اختيار القارئ: ${r.reciterName}`);
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {riwayahReciters.map((r) => (
                    <option key={`${r.reciterId}-${r.moshafId}`} value={r.reciterId}>
                      {r.reciterName} ({r.moshafName.replace(' - مرتل', '')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Action Grid Buttons */}
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {/* Button 1: Recite Audio */}
              <button
                onClick={() => {
                  if (isVerseLevelAvailable) {
                    setIsPlayingFullSurah(false);
                    playAyah(quickMenuAyah.ayahNo);
                    setQuickMenuAyah(null);
                    toast.success(`جاري تلاوة الآية ${quickMenuAyah.ayahNo} برواية ${activeQiraah.name} بصوت ${activeReciter.name}`);
                  } else {
                    stopAudio();
                    setIsPlayingFullSurah(true);
                    setTargetSeekAyah(quickMenuAyah.ayahNo);
                    setQuickMenuAyah(null);
                    toast.success(`جاري تلاوة سورة ${activeSurah.nameAr} برواية ${activeQiraah.name} والقفز للآية ${quickMenuAyah.ayahNo}`);
                  }
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-bold text-xs text-right shadow-sm"
              >
                <Volume2 className="size-5 shrink-0" />
                <div>
                  <div>{isVerseLevelAvailable ? `تلاوة الآية (${quickMenuAyah.ayahNo})` : `سورة بالرواية (${quickMenuAyah.ayahNo})`}</div>
                  <div className="text-[10px] opacity-90 truncate max-w-[130px]">
                    {isVerseLevelAvailable ? activeReciter.name : activeRiwayahReciter?.reciterName || 'القارئ'}
                  </div>
                </div>
              </button>

              {/* Button 2: Tafsir */}
              <button
                onClick={() => {
                  setSelectedAyahForModal(quickMenuAyah);
                  setQuickMenuAyah(null);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-95 transition-all font-bold text-xs text-right shadow-sm"
              >
                <BookOpen className="size-5 shrink-0" />
                <div>
                  <div>تفسير الآية</div>
                  <div className="text-[10px] opacity-80">الميسر والسعدي وابن كثير</div>
                </div>
              </button>

              {/* Button 3: Memorization Loop */}
              <button
                onClick={() => {
                  setSelectedAyahForModal(quickMenuAyah);
                  setQuickMenuAyah(null);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
              >
                <RotateCcw className="size-5 text-amber-600 shrink-0" />
                <div>
                  <div>تكرار التحفيظ</div>
                  <div className="text-[10px] text-muted-foreground">3x / 5x / 10x</div>
                </div>
              </button>

              {/* Button 4: Full Surah by Riwayah Sheikh */}
              <button
                onClick={() => {
                  stopAudio();
                  setIsPlayingFullSurah(true);
                  setQuickMenuAyah(null);
                  toast.success(`جاري تلاوة سورة ${activeSurah.nameAr} برواية ${activeQiraah.name} بصوت ${activeRiwayahReciter?.reciterName || activeReciter.name}`);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
              >
                <Headphones className="size-5 text-blue-600 shrink-0" />
                <div>
                  <div>تلاوة السورة كاملة</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {activeRiwayahReciter?.reciterName || activeReciter.name}
                  </div>
                </div>
              </button>

              {/* Button 5: Translation */}
              <button
                onClick={() => {
                  setSelectedAyahForModal(quickMenuAyah);
                  setQuickMenuAyah(null);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
              >
                <Globe className="size-5 text-teal-600 shrink-0" />
                <div>
                  <div>التراجم العالمية</div>
                  <div className="text-[10px] text-muted-foreground">85+ لغة وترجمة</div>
                </div>
              </button>

              {/* Button 6: Copy Ayah */}
              <button
                onClick={() => {
                  handleCopyAyah(quickMenuAyah);
                  setQuickMenuAyah(null);
                }}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
              >
                <Copy className="size-5 text-purple-600 shrink-0" />
                <div>
                  <div>نسخ الآية</div>
                  <div className="text-[10px] text-muted-foreground">مع التشكيل والرقم</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surah Selection Drawer */}
      {surahDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">فهرس سور القرآن الكريم (114 سورة)</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSurahDrawerOpen(false)}
                className="size-8 rounded-xl"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-3 border-b border-border/60 bg-muted/30">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  placeholder="ابحث برقم أو اسم السورة (مثل: 36 أو يس أو الكهف)..."
                  className="pr-10 h-10 bg-background"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              {filteredSurahsList.map((s) => {
                const isSelected = activeSurah.number === s.number;
                return (
                  <div
                    key={s.number}
                    onClick={() => {
                      setActiveSurah(s);
                      setSurahDrawerOpen(false);
                      toast.success(`تم الانتقال إلى سورة ${s.nameAr}`);
                    }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border/70 hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary text-xs font-bold">
                        {s.number}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">سورة {s.nameAr}</h4>
                        <span className="text-[11px] text-muted-foreground">{s.nameEn}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <Badge variant="outline" className="text-[10px]">
                        {s.numberOfAyahs} آية
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MP3Quran 240+ Reciters & Qira'at Modal */}
      {recitersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-3xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Headphones className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">مكتبة القراء والروايات الكبرى (240+ قارئاً - MP3Quran)</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setRecitersModalOpen(false)}
                className="size-8 rounded-xl"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-3 border-b border-border/60 bg-muted/30">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={reciterSearch}
                  onChange={(e) => setReciterSearch(e.target.value)}
                  placeholder="ابحث باسم القارئ أو الرواية (مثل: ورش، المنشاوي، العفاسي، قالون)..."
                  className="pr-10 h-10 bg-background"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {filteredRecitersList.slice(0, 100).map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground">{r.name}</h4>
                    <Badge variant="outline" className="text-[10px]">
                      {r.moshaf.length} مصحف
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {r.moshaf.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40 hover:bg-primary/10 transition-colors"
                      >
                        <span className="text-muted-foreground truncate max-w-[180px]">
                          {m.name}
                        </span>

                        <div className="flex items-center gap-1">
                          <a
                            href={getMp3QuranSurahUrl(m.server, activeSurah.number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold"
                          >
                            <Download className="size-3" />
                            تحميل MP3
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Ayah Detail Modal (Tafsirs, Asbab, Translations, Memorization) */}
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

      {/* Interactive Sticky Mini Audio Player with Full Progress Bar (Seekbar) */}
      {(isPlayingAudio || isPlayingFullSurah || currentPlayingAyah !== null) && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 max-w-xl w-full bg-card/95 backdrop-blur-lg border border-emerald-500/40 p-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 space-y-2.5">
          {/* Track Info & Controls Row */}
          <div className="flex items-center justify-between gap-3">
            {/* Sheikh & Track info */}
            <div className="flex items-center gap-3 truncate">
              <div className="size-10 rounded-2xl bg-emerald-600 text-white grid place-items-center shrink-0 shadow-sm animate-pulse">
                <Volume2 className="size-5" />
              </div>
              <div className="truncate text-right">
                <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                  سورة {activeSurah.nameAr}
                  {currentPlayingAyah && (
                    <span className="text-emerald-600 dark:text-emerald-400 mx-1">
                      (الآية {currentPlayingAyah})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {isPlayingFullSurah
                    ? `${activeRiwayahReciter?.reciterName || 'القارئ'} • ${activeQiraah.name}`
                    : `${activeReciter.name} • ${activeQiraah.name}`}
                </div>
              </div>
            </div>

            {/* Playback Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Rewind 10s */}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRewind}
                className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                title="تأخير 10 ثوانٍ"
              >
                <Rewind className="size-4" />
              </Button>

              {/* Play / Pause */}
              <Button
                size="icon"
                variant="default"
                onClick={() => {
                  if (isPlayingAudio || isPlayingFullSurah) {
                    pauseAudio();
                    setIsPlayingFullSurah(false);
                  } else {
                    if (currentPlayingAyah) {
                      playAyah(currentPlayingAyah);
                    } else {
                      setIsPlayingFullSurah(true);
                    }
                  }
                }}
                className="size-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {isPlayingAudio || isPlayingFullSurah ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4 fill-current" />
                )}
              </Button>

              {/* Fast Forward 10s */}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleFastForward}
                className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                title="تقديم 10 ثوانٍ"
              >
                <FastForward className="size-4" />
              </Button>

              {/* Stop / Close Player */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  stopAudio();
                  setIsPlayingFullSurah(false);
                  setCurrentTime(0);
                }}
                className="size-8 rounded-xl text-muted-foreground hover:text-destructive"
                title="إيقاف التلاوة"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Progress Bar (Seekbar) & Time Indicators */}
          <div className="space-y-1 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.5"
                value={currentTime}
                onChange={handleSeek}
                onMouseDown={() => setIsSeeking(true)}
                onMouseUp={() => setIsSeeking(false)}
                onTouchStart={() => setIsSeeking(true)}
                onTouchEnd={() => setIsSeeking(false)}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
