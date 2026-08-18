'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Settings2,
  ListTree,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Copy,
  Sparkles,
  FileText,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ALL_SURAHS } from '@/lib/quran-data';
import { fetchAyahTafsir, SUPPORTED_TAFSIRS } from '@/lib/quran-tafsir-engine';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VectorMushafReaderProps {
  bookItem: MediaItem;
  onClose: () => void;
  onSwitchToPdf?: () => void;
}

interface AyahItem {
  ayahNo: number;
  ayahNoQuran: number;
  textAr: string;
  textEn: string;
  juz: number;
  manzil: number;
  ruku: number;
  hizbQuarter: number;
  isSajdah: boolean;
}

interface SurahData {
  surahNo: number;
  nameAr: string;
  nameEn: string;
  nameRoman: string;
  placeOfRevelation: string;
  totalAyahs: number;
  ayahs: AyahItem[];
}

type MushafTheme = 'gold' | 'sepia' | 'oasis' | 'oled';

const THEME_STYLES: Record<
  MushafTheme,
  {
    bg: string;
    text: string;
    cardBg: string;
    border: string;
    accent: string;
    headerBg: string;
    ayahBorder: string;
    ayahNumberBg: string;
    ayahNumberText: string;
    ayahText: string;
  }
> = {
  gold: {
    bg: 'bg-[#faf7f2]',
    text: 'text-stone-900',
    cardBg: 'bg-white/95',
    border: 'border-amber-200/70',
    accent: 'text-amber-700',
    headerBg: 'bg-white/95 backdrop-blur-md border-amber-200/60',
    ayahBorder: 'border-amber-500/20 hover:border-amber-500/60',
    ayahNumberBg: 'bg-amber-500/15',
    ayahNumberText: 'text-amber-800 font-bold',
    ayahText: 'text-stone-950 font-semibold',
  },
  sepia: {
    bg: 'bg-[#fcf3e3]',
    text: 'text-[#3e2c17]',
    cardBg: 'bg-[#f6ebd4]/90',
    border: 'border-[#ddc59d]',
    accent: 'text-[#874911]',
    headerBg: 'bg-[#f8eed7]/95 backdrop-blur-md border-[#ddc59d]',
    ayahBorder: 'border-[#c9aa79]/30 hover:border-[#874911]/60',
    ayahNumberBg: 'bg-[#874911]/15',
    ayahNumberText: 'text-[#693607] font-bold',
    ayahText: 'text-[#2a1705] font-semibold',
  },
  oasis: {
    bg: 'bg-[#07130f]',
    text: 'text-emerald-50',
    cardBg: 'bg-[#0e211b]/90',
    border: 'border-emerald-800/40',
    accent: 'text-emerald-400',
    headerBg: 'bg-[#0a1b15]/95 backdrop-blur-md border-emerald-800/40',
    ayahBorder: 'border-emerald-700/30 hover:border-emerald-400/60',
    ayahNumberBg: 'bg-emerald-500/20',
    ayahNumberText: 'text-emerald-300 font-bold',
    ayahText: 'text-emerald-50 font-semibold',
  },
  oled: {
    bg: 'bg-black',
    text: 'text-neutral-100',
    cardBg: 'bg-neutral-900/90',
    border: 'border-neutral-800',
    accent: 'text-amber-400',
    headerBg: 'bg-neutral-950/95 backdrop-blur-md border-neutral-800',
    ayahBorder: 'border-neutral-800 hover:border-amber-500/50',
    ayahNumberBg: 'bg-amber-500/20',
    ayahNumberText: 'text-amber-400 font-bold',
    ayahText: 'text-neutral-100 font-semibold',
  },
};

const RECITERS = [
  { id: 'mishari', name: 'مشاري راشد العفاسي', subfolder: 'Alafasy_128kbps' },
  { id: 'minshawi', name: 'محمد صديق المنشاوي (مرتل)', subfolder: 'Minshawy_Murattal_128kbps' },
  { id: 'husary', name: 'محمود خليل الحصري', subfolder: 'Husary_128kbps' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد (مرتل)', subfolder: 'Abdul_Basit_Murattal_192kbps' },
];

export function VectorMushafReader({
  bookItem: _bookItem,
  onClose,
  onSwitchToPdf,
}: VectorMushafReaderProps) {
  // Surah & Ayah State
  const [currentSurahNo, setCurrentSurahNo] = useState<number>(1);
  const [surahData, setSurahData] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Ayah for Tafsir & Actions Modal
  const [selectedAyah, setSelectedAyah] = useState<AyahItem | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState<boolean>(false);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(16); // Muyassar default
  const [tafsirText, setTafsirText] = useState<string>('');

  // Audio Playback
  const [reciter, setReciter] = useState<string>('mishari');
  const [playingAyahNo, setPlayingAyahNo] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // UI & Typography Preferences
  const [fontSize, setFontSize] = useState<number>(26);
  const [theme, setTheme] = useState<MushafTheme>('gold');
  const [showEnglish, setShowEnglish] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Fetch Surah JSON
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/data/quran/surahs/${currentSurahNo}.json`);
        if (res.ok && isMounted) {
          const data = (await res.json()) as SurahData;
          setSurahData(data);
        }
      } catch (err) {
        console.error('Failed to load Surah data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAyahNo(null);
    };
  }, [currentSurahNo]);

  // 2. Fetch Tafsir when an Ayah is selected
  useEffect(() => {
    if (!selectedAyah) {
      setTafsirText('');
      return;
    }

    let isMounted = true;
    (async () => {
      setTafsirLoading(true);
      const res = await fetchAyahTafsir(
        selectedTafsirId,
        currentSurahNo,
        selectedAyah.ayahNo
      );
      if (isMounted) {
        setTafsirText(res?.text || 'لا يوجد نص متاح لهذا التفسير حالياً');
        setTafsirLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedAyah, selectedTafsirId, currentSurahNo]);

  // 3. Audio Playback Handler
  const playAyahAudio = (ayahNo: number) => {
    if (playingAyahNo === ayahNo && audioRef.current) {
      audioRef.current.pause();
      setPlayingAyahNo(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const currentReciterObj = RECITERS.find((r) => r.id === reciter) || RECITERS[0];
    const sPadded = String(currentSurahNo).padStart(3, '0');
    const aPadded = String(ayahNo).padStart(3, '0');
    const audioUrl = `https://everyayah.com/data/${currentReciterObj.subfolder}/${sPadded}${aPadded}.mp3`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingAyahNo(ayahNo);

    audio.play().catch(() => {
      toast.error('تعذر تشغيل التلاوة الصوتية');
      setPlayingAyahNo(null);
    });

    audio.onended = () => {
      setPlayingAyahNo(null);
      // Auto-advance to next ayah in surah
      if (surahData && ayahNo < surahData.totalAyahs) {
        playAyahAudio(ayahNo + 1);
      }
    };
  };

  const handleCopyAyah = (ayah: AyahItem) => {
    const surahMeta = ALL_SURAHS.find((s) => s.number === currentSurahNo);
    const surahName = surahMeta?.nameAr || `سورة رقم ${currentSurahNo}`;
    const formatted = `﴿${ayah.textAr}﴾ [${surahName}: آية ${ayah.ayahNo}]`;
    navigator.clipboard.writeText(formatted);
    toast.success('تم نسخ الآية الكريمة مع العزو');
  };

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return ALL_SURAHS;
    return ALL_SURAHS.filter(
      (s) =>
        s.nameAr.includes(searchQuery.trim()) ||
        s.nameEn.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        String(s.number) === searchQuery.trim()
    );
  }, [searchQuery]);

  const currentSurahMeta = ALL_SURAHS.find((s) => s.number === currentSurahNo);
  const themeStyle = THEME_STYLES[theme];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col select-text transition-colors duration-300',
        themeStyle.bg,
        themeStyle.text
      )}
    >
      {/* ─── Top Deluxe Mushaf Header ───────────────────────────────── */}
      <header
        className={cn(
          'relative z-20 flex items-center justify-between px-3 sm:px-6 py-2.5 border-b shadow-sm transition-colors',
          themeStyle.headerBg
        )}
      >
        {/* Right Section: Back + Title & Surah Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
            title="رجوع"
          >
            <X className="size-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base truncate">
                سورة {currentSurahMeta?.nameAr || 'الفاتحة'}
              </span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-2 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 font-semibold"
              >
                <Sparkles className="size-2.5" />
                رسم عثماني متجهي
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-75 truncate">
              <span>{currentSurahMeta?.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
              <span>•</span>
              <span>{currentSurahMeta?.numberOfAyahs} آية</span>
              <span>•</span>
              <span>الجزء {currentSurahMeta?.juz}</span>
            </div>
          </div>
        </div>

        {/* Center: Dual-Mode Switcher to PDF Facsimile */}
        {onSwitchToPdf && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToPdf}
            className="hidden md:flex items-center gap-1.5 rounded-full text-xs font-semibold px-3.5 py-1.5 border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-all shadow-sm"
            title="عرض النسخة المصورة الأصلية للمصحف (PDF)"
          >
            <FileText className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>عرض مصحف الرواية (PDF)</span>
          </Button>
        )}

        {/* Left Section: Drawer & Typography Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Translation Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEnglish((v) => !v)}
            className={cn(
              'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors text-xs font-bold',
              showEnglish && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            )}
            title="إظهار / إخفاء الترجمة الإنجليزية"
          >
            EN
          </Button>

          {/* Surah Index Drawer Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen((v) => !v)}
            className={cn(
              'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors',
              sidebarOpen && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            )}
            title="فهرس سور القرآن الكريم"
          >
            <ListTree className="size-4" />
          </Button>

          {/* Typography Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen((v) => !v)}
            className={cn(
              'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors',
              settingsOpen && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            )}
            title="إعدادات القراءة والصوت"
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* ─── Settings Floating Panel ───────────────────────────────── */}
      {settingsOpen && (
        <div
          className={cn(
            'absolute top-14 left-4 sm:left-6 z-40 w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200',
            themeStyle.cardBg,
            themeStyle.border
          )}
        >
          <div className="flex items-center justify-between mb-4 border-b pb-2 border-current/10">
            <span className="font-bold text-sm flex items-center gap-1.5">
              <Settings2 className="size-4 text-amber-500" />
              إعدادات المصحف والتلاوة
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(false)}
              className="size-6 p-0 rounded-full"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* 1. Theme Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-2 opacity-80">
              لون وإضاءة المصحف:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(
                [
                  { id: 'gold', label: 'مذهب', icon: '✨' },
                  { id: 'sepia', label: 'ورقي', icon: '📜' },
                  { id: 'oasis', label: 'واحة', icon: '🌴' },
                  { id: 'oled', label: 'داكن', icon: '🌑' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'flex flex-col items-center py-2 px-1 rounded-xl border transition-all',
                    theme === t.id
                      ? 'border-amber-500 bg-amber-500/15 font-bold shadow-sm'
                      : 'border-current/10 hover:border-current/30'
                  )}
                >
                  <span className="text-base mb-0.5">{t.icon}</span>
                  <span className="text-[11px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Font Size Adjuster */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="opacity-80">حجم الخط القرآني:</span>
              <span className="font-mono text-amber-500">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize((s) => Math.max(20, s - 2))}
                className="flex-1 rounded-xl font-bold"
              >
                A-
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize((s) => Math.min(44, s + 2))}
                className="flex-1 rounded-xl font-bold"
              >
                A+
              </Button>
            </div>
          </div>

          {/* 3. Reciter Selector */}
          <div>
            <label className="text-xs font-semibold block mb-2 opacity-80">
              القارئ الصوتي للآيات:
            </label>
            <div className="space-y-1">
              {RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReciter(r.id)}
                  className={cn(
                    'w-full text-right py-2 px-3 rounded-xl border text-xs transition-all flex items-center justify-between',
                    reciter === r.id
                      ? 'border-amber-500 bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400'
                      : 'border-current/10 hover:border-current/30 opacity-80'
                  )}
                >
                  <span>{r.name}</span>
                  {reciter === r.id && <Check className="size-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content Body & Drawer ────────────────────────────── */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Surah List Drawer */}
        {sidebarOpen && (
          <aside
            className={cn(
              'absolute sm:relative inset-y-0 right-0 z-30 w-full sm:w-80 border-l flex flex-col shadow-2xl sm:shadow-none transition-all duration-300',
              themeStyle.cardBg,
              themeStyle.border
            )}
          >
            <div className="p-3 border-b border-current/10 flex items-center justify-between gap-2 bg-black/5 dark:bg-white/5">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم أو اسم السورة..."
                  className="pr-8 text-xs rounded-xl bg-black/5 dark:bg-white/5 border-current/20 h-8"
                />
                <Search className="size-3.5 absolute right-2.5 top-2.5 opacity-50" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="size-8 p-0 rounded-lg sm:hidden"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSurahs.map((s) => (
                <button
                  key={s.number}
                  onClick={() => {
                    setCurrentSurahNo(s.number);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between text-xs',
                    currentSurahNo === s.number
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 font-mono">
                      {s.number}
                    </span>
                    <div>
                      <p className="font-bold">{s.nameAr}</p>
                      <span className="text-[10px] opacity-60">
                        {s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • {s.numberOfAyahs} آية
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-60 font-mono">جزء {s.juz}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* ─── Center Vector Mushaf Canvas ───────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-20 py-8 max-w-4xl mx-auto">
          {loading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <p className="text-xs opacity-70">جاري تحميل الآيات الكريمة بالرسم العثماني...</p>
            </div>
          ) : surahData ? (
            <article className="space-y-6 pb-20">
              {/* Surah Decorative Header */}
              <div className="text-center py-6 border-y-2 border-amber-500/30 my-6 bg-amber-500/5 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                <span className="text-xs tracking-widest text-amber-600 dark:text-amber-400 font-bold block mb-1">
                  سُورَةُ {surahData.nameAr}
                </span>
                <p className="text-xs opacity-70">
                  {surahData.placeOfRevelation === 'Meccan' ? 'مَكِّيَّةٌ' : 'مَدَنِيَّةٌ'} • آيَاتُهَا {surahData.totalAyahs.toLocaleString('ar-SA')}
                </p>
              </div>

              {/* Basmalah (except Surah At-Tawbah #9) */}
              {currentSurahNo !== 9 && currentSurahNo !== 1 && (
                <div className={cn(
                  'text-center py-4 font-serif text-xl sm:text-2xl drop-shadow-sm font-bold',
                  theme === 'oasis' ? 'text-emerald-400' : theme === 'oled' ? 'text-amber-400' : 'text-amber-800'
                )}>
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}

              {/* Vector Uthmanic Ayahs Flow */}
              <div
                className={cn('leading-[2.6] text-justify font-serif select-text tracking-wide', themeStyle.ayahText)}
                style={{ fontSize: `${fontSize}px` }}
              >
                {surahData.ayahs.map((ayah) => {
                  const isPlaying = playingAyahNo === ayah.ayahNo;
                  const isSelected = selectedAyah?.ayahNo === ayah.ayahNo;

                  return (
                    <span
                      key={ayah.ayahNo}
                      onClick={() => setSelectedAyah(ayah)}
                      className={cn(
                        'inline cursor-pointer transition-all duration-200 rounded px-1 -mx-0.5 relative group',
                        isPlaying && 'bg-amber-400/30 text-amber-950 dark:text-amber-100 font-bold shadow-sm',
                        isSelected && 'bg-amber-500/20 ring-1 ring-amber-500/50',
                        'hover:bg-amber-500/10'
                      )}
                    >
                      <span>{ayah.textAr}</span>

                      {/* Ayah End Ornamental Marker */}
                      <span className={cn(
                        'inline-flex items-center justify-center size-7 mx-1 rounded-full text-xs font-bold font-sans align-middle border select-none',
                        themeStyle.ayahNumberBg,
                        themeStyle.ayahNumberText,
                        themeStyle.ayahBorder
                      )}>
                        {ayah.ayahNo.toLocaleString('ar-SA')}
                      </span>

                      {/* Optional English Translation on Demand */}
                      {showEnglish && (
                        <span className="block text-xs font-sans text-muted-foreground my-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-current/10 leading-normal not-italic font-normal">
                          {ayah.ayahNo}. {ayah.textEn}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* ─── Surah Bottom Pagination ─────────────────────────── */}
              <div className="flex items-center justify-between pt-12 mt-12 border-t border-current/10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSurahNo <= 1}
                  onClick={() => setCurrentSurahNo((s) => Math.max(1, s - 1))}
                  className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5"
                >
                  <ChevronRight className="size-4" />
                  السورة السابقة
                </Button>

                <span className="text-xs opacity-60 font-semibold">
                  سورة {currentSurahNo} من 114
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSurahNo >= 114}
                  onClick={() => setCurrentSurahNo((s) => Math.min(114, s + 1))}
                  className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5"
                >
                  السورة التالية
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </article>
          ) : null}
        </main>
      </div>

      {/* ─── Ayah Interactive Tafsir & Action Bottom Modal ─────────── */}
      {selectedAyah && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-black/80 backdrop-blur-md flex justify-center p-2 sm:p-4 animate-in slide-in-from-bottom duration-300">
          <div
            className={cn(
              'w-full max-w-3xl rounded-3xl border shadow-2xl p-4 sm:p-6 max-h-[85vh] flex flex-col',
              themeStyle.cardBg,
              themeStyle.border
            )}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-current/10 shrink-0">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-amber-500 text-white text-xs font-bold">
                  سورة {currentSurahMeta?.nameAr} • آية {selectedAyah.ayahNo}
                </Badge>
                <span className="text-xs opacity-60 font-mono">
                  [ جزء {selectedAyah.juz} ]
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => playAyahAudio(selectedAyah.ayahNo)}
                  className="rounded-full text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400"
                >
                  {playingAyahNo === selectedAyah.ayahNo ? (
                    <Pause className="size-3.5 fill-current" />
                  ) : (
                    <Play className="size-3.5 fill-current" />
                  )}
                  {playingAyahNo === selectedAyah.ayahNo ? 'إيقاف' : 'استماع'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyAyah(selectedAyah)}
                  className="size-8 p-0 rounded-full"
                  title="نسخ الآية"
                >
                  <Copy className="size-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedAyah(null)}
                  className="size-8 p-0 rounded-full"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Ayah Text in Modal */}
            <div className="py-4 border-b border-current/10 text-center font-serif text-lg sm:text-xl text-amber-800 dark:text-amber-200 leading-relaxed shrink-0">
              ﴿{selectedAyah.textAr}﴾
            </div>

            {/* Tafsir Selector Tabs */}
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto shrink-0 border-b border-current/10 text-xs">
              <span className="opacity-60 text-[11px] shrink-0">اختر التفسير:</span>
              {SUPPORTED_TAFSIRS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTafsirId(t.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs shrink-0 transition-all font-medium',
                    selectedTafsirId === t.id
                      ? 'bg-amber-500 text-white font-bold shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'
                  )}
                >
                  {t.name.split('(')[0].trim()}
                </button>
              ))}
            </div>

            {/* Tafsir Body Text */}
            <div className="flex-1 overflow-y-auto py-4 text-xs sm:text-sm leading-loose text-justify">
              {tafsirLoading ? (
                <div className="py-12 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-amber-500" />
                  جاري جلب التفسير المعتمد...
                </div>
              ) : (
                <p className="opacity-90">{tafsirText}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
