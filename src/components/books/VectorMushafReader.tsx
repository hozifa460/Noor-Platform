'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ALL_SURAHS } from '@/lib/quran-data';
import { fetchAyahTafsir } from '@/lib/quran-tafsir-engine';
import { MUSHAF_THEME_STYLES } from '@/lib/reader-theme';
import type { MediaItem } from '@/lib/types';
import type { AyahItem, SurahData } from '@/types/quran';
import type { MushafTheme } from '@/types/reader';
import { MushafToolbar } from './mushaf/MushafToolbar';
import { MushafAyahActionModal } from './mushaf/MushafAyahActionModal';
import { MushafSidebar } from './mushaf/MushafSidebar';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from 'sonner';

interface VectorMushafReaderProps {
  bookItem: MediaItem;
  onClose: () => void;
  onSwitchToPdf?: () => void;
}

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
  const [currentSurahNo, setCurrentSurahNo] = useState<number>(1);
  const [surahData, setSurahData] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedAyah, setSelectedAyah] = useState<AyahItem | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState<boolean>(false);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(16);
  const [tafsirText, setTafsirText] = useState<string>('');

  const [reciter, setReciter] = useState<string>('mishari');
  const [playingAyahNo, setPlayingAyahNo] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [fontSize, setFontSize] = useState<number>(26);
  const [theme, setTheme] = useState<MushafTheme>('gold');
  const [showEnglish, setShowEnglish] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      if (surahData && ayahNo < surahData.totalAyahs) {
        playAyahAudio(ayahNo + 1);
      }
    };
  };

  const handleCopyAyah = (ayah: AyahItem) => {
    const surahMeta = ALL_SURAHS.find((s) => s.number === currentSurahNo);
    const surahName = surahMeta?.nameAr || `سورة رقم ${currentSurahNo}`;
    const textToCopy = `﴿ ${ayah.textAr} ﴾ [سورة ${surahName} - الآية ${ayah.ayahNo}]\nالمصدر: منصة النور - مصحف المدينة النبوية`;

    copyToClipboard(textToCopy, 'تم نسخ الآية الكريمة بنجاح');
  };


  const currentStyles = MUSHAF_THEME_STYLES[theme] || MUSHAF_THEME_STYLES.gold;
  const surahMeta = ALL_SURAHS.find((s) => s.number === currentSurahNo);
  const surahNameAr = surahMeta?.nameAr || surahData?.nameAr || '';
  const revelationPlace = surahMeta?.revelationType || surahData?.placeOfRevelation || 'Meccan';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-300 ${currentStyles.bg} ${currentStyles.text}`}
      dir="rtl"
    >
      <MushafToolbar
        currentSurahNo={currentSurahNo}
        surahNameAr={surahNameAr}
        revelationPlace={revelationPlace}
        totalAyahs={surahData?.totalAyahs || 0}
        onPrevSurah={() => currentSurahNo > 1 && setCurrentSurahNo((prev) => prev - 1)}
        onNextSurah={() => currentSurahNo < 114 && setCurrentSurahNo((prev) => prev + 1)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen((prev) => !prev)}
        onClose={onClose}
        onSwitchToPdf={onSwitchToPdf}
        styles={currentStyles}
      />

      {/* Settings Bar */}
      {settingsOpen && (
        <div
          className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200 ${currentStyles.headerBg}`}
        >
          {/* Theme switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">ثيم المصحف:</span>
            <div className="flex items-center gap-1.5">
              {(['gold', 'sepia', 'oasis', 'oled'] as MushafTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all border',
                    theme === t
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-background/50 hover:bg-background'
                  )}
                >
                  {t === 'gold' && 'المذهب 🌟'}
                  {t === 'sepia' && 'الورقي 📜'}
                  {t === 'oasis' && 'الواحة 🌿'}
                  {t === 'oled' && 'الداكن 🌙'}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">حجم الخط:</span>
            <input
              type="range"
              min={20}
              max={44}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-28 accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono">{fontSize}px</span>
          </div>

          {/* Reciter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">القارئ:</span>
            <select
              value={reciter}
              onChange={(e) => setReciter(e.target.value)}
              className="h-8 px-2 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Translation switch */}
          <Button
            size="sm"
            variant={showEnglish ? 'default' : 'outline'}
            onClick={() => setShowEnglish((prev) => !prev)}
            className="h-8 rounded-lg text-xs"
          >
            {showEnglish ? 'إخفاء المعاني بالإنجليزية' : 'عرض المعاني بالإنجليزية'}
          </Button>
        </div>
      )}

      {/* Main Canvas / Mushaf Page */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 my-auto">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري تحميل السورة الكريمة...</p>
          </div>
        ) : surahData ? (
          <div
            className={`w-full max-w-4xl p-6 sm:p-12 rounded-3xl border shadow-xl transition-all duration-300 relative ${currentStyles.cardBg} ${currentStyles.border}`}
          >
            {/* Surah Title Frame */}
            <div className="text-center my-6 py-4 px-6 border-y border-amber-600/30 bg-amber-500/5 relative">
              <span className="text-xs font-serif text-muted-foreground">
                سورة {surahNameAr} — عدد آياتها {surahData.totalAyahs}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide mt-1">
                سورة {surahNameAr}
              </h2>
            </div>

            {/* Basmalah */}
            {currentSurahNo !== 1 && currentSurahNo !== 9 && (
              <div className="text-center font-serif text-xl sm:text-2xl my-8 font-semibold select-none">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </div>
            )}

            {/* Continuous Ayah Flow */}
            <div
              className="font-serif text-justify leading-[2.6] sm:leading-[3.0] select-text"
              style={{ fontSize: `${fontSize}px` }}
            >
              {surahData.ayahs.map((ayah) => {
                const isPlaying = playingAyahNo === ayah.ayahNo;
                return (
                  <span
                    key={ayah.ayahNo}
                    onClick={() => setSelectedAyah(ayah)}
                    className={cn(
                      'inline cursor-pointer px-1 py-0.5 rounded-lg transition-all',
                      currentStyles.ayahText,
                      isPlaying &&
                        'bg-amber-500/25 dark:bg-amber-500/30 font-bold ring-2 ring-amber-500/50',
                      !isPlaying && 'hover:bg-amber-500/10'
                    )}
                    title={`انقر لبيان تفسير الآية ${ayah.ayahNo}`}
                  >
                    {ayah.textAr}
                    <span
                      className={`inline-flex items-center justify-center size-7 sm:size-8 mx-1.5 rounded-full border text-xs font-mono font-bold align-middle select-none ${currentStyles.ayahNumberBg} ${currentStyles.ayahNumberText} ${currentStyles.ayahBorder}`}
                    >
                      {ayah.ayahNo}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* English translation if turned on */}
            {showEnglish && (
              <div className="mt-12 pt-8 border-t border-border/60 space-y-3 font-sans text-xs sm:text-sm text-left dir-ltr opacity-90">
                <div className="font-bold text-base mb-4 text-right dir-rtl text-muted-foreground">
                  English Meanings
                </div>
                {surahData.ayahs.map((ayah) => (
                  <p key={ayah.ayahNo} className="leading-relaxed">
                    <strong className="text-primary mr-1">[{ayah.ayahNo}]</strong> {ayah.textEn}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Sidebar: Surah Selector Drawer */}
      <MushafSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSurahNo={currentSurahNo}
        onSelectSurah={(num) => setCurrentSurahNo(num)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Ayah Action & Tafsir Modal */}
      <MushafAyahActionModal
        ayah={selectedAyah}
        onClose={() => setSelectedAyah(null)}
        isPlaying={selectedAyah ? playingAyahNo === selectedAyah.ayahNo : false}
        onTogglePlay={(num) => playAyahAudio(num)}
        onCopy={handleCopyAyah}
        selectedTafsirId={selectedTafsirId}
        onSelectTafsir={setSelectedTafsirId}
        tafsirLoading={tafsirLoading}
        tafsirText={tafsirText}
      />
    </div>
  );
}
