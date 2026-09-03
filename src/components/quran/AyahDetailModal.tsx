'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Copy,
  Check,
  Globe,
  Scroll,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SUPPORTED_TAFSIRS,
  fetchAyahTafsir,
} from '@/lib/quran-tafsir-engine';
import { fetchAyahEerab } from '@/lib/quran-eerab-engine';
import { getAyahTranslation } from '@/lib/quran-translation-engine';
import {
  QURAN_TRANSLATIONS,
  type QuranTranslationMeta,
  type SurahMeta,
  type QiraahMeta,
} from '@/lib/quran-data';
import {
  useQuranStore,
  getAyahRecitersForQiraah,
  type AyahItem,
  type ReciterMeta,
} from '@/stores/quran-store';
import { AyahTafsirTab } from './ayah-tabs/AyahTafsirTab';
import { AyahEerabTab } from './ayah-tabs/AyahEerabTab';
import { AyahTranslationTab } from './ayah-tabs/AyahTranslationTab';
import { AyahMemorizeTab } from './ayah-tabs/AyahMemorizeTab';
import { useAyahAudioLoop } from '@/hooks/use-ayah-audio-loop';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AyahDetailModalProps {
  ayah: AyahItem;
  surah: SurahMeta;
  activeQiraah: QiraahMeta;
  onClose: () => void;
  onPrevAyah?: () => void;
  onNextAyah?: () => void;
}

export function AyahDetailModal({
  ayah,
  surah,
  activeQiraah,
  onClose,
  onPrevAyah,
  onNextAyah,
}: AyahDetailModalProps) {
  const activeReciter = useQuranStore((s) => s.activeReciter);

  const [activeTab, setActiveTab] = useState<'tafsir' | 'eerab' | 'asbab' | 'translation' | 'memorize'>('tafsir');
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(16);
  const [tafsirContent, setTafsirContent] = useState<string>('');
  const [loadedTafsirKey, setLoadedTafsirKey] = useState<string | null>(null);
  const tafsirKey = `${selectedTafsirId}-${surah.number}-${ayah.ayahNo}`;
  const loadingTafsir = loadedTafsirKey !== tafsirKey;

  const [selectedEerabBookId, setSelectedEerabBookId] = useState<string>('i-rab-al-quran-li-al-darwish');
  const [eerabContent, setEerabContent] = useState<string>('');
  const [loadedEerabKey, setLoadedEerabKey] = useState<string | null>(null);
  const eerabKey = `${selectedEerabBookId}-${surah.number}-${ayah.ayahNo}`;
  const loadingEerab = loadedEerabKey !== eerabKey;

  const [selectedTranslation, setSelectedTranslation] = useState<QuranTranslationMeta>(QURAN_TRANSLATIONS[0]);
  const [translationText, setTranslationText] = useState<string>('');
  const [translationFootnotes, setTranslationFootnotes] = useState<string | undefined>(undefined);
  const [loadedTranslationKey, setLoadedTranslationKey] = useState<string | null>(null);
  const translationKey = `${selectedTranslation.code}-${surah.number}-${ayah.ayahNo}`;
  const loadingTranslation = loadedTranslationKey !== translationKey;

  const [copied, setCopied] = useState<boolean>(false);

  const availableAyahReciters = getAyahRecitersForQiraah(activeQiraah.id);
  const [customReciter, setCustomReciter] = useState<ReciterMeta | null>(null);
  const selectedAyahReciter =
    (customReciter && availableAyahReciters.some((r) => r.id === customReciter.id) && customReciter) ||
    availableAyahReciters[0] ||
    activeReciter;

  const sStr = String(surah.number).padStart(3, '0');
  const aStr = String(ayah.ayahNo).padStart(3, '0');
  const audioUrl = `https://everyayah.com/data/${selectedAyahReciter.subfolder}/${sStr}${aStr}.mp3`;

  const {
    audioRef,
    isPlaying: isLoopPlaying,
    repeatLimit,
    setRepeatLimit,
    repeatCount,
    handleAudioEnded,
    togglePlay: toggleLoopPlay,
    resetLoop,
  } = useAyahAudioLoop({ audioUrl });

  useEffect(() => {
    let isMounted = true;
    fetchAyahTafsir(selectedTafsirId, surah.number, ayah.ayahNo)
      .then((res) => {
        if (isMounted) {
          setTafsirContent(res.text);
          setLoadedTafsirKey(tafsirKey);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTafsirContent('تعذر جلب التفسير.');
          setLoadedTafsirKey(tafsirKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTafsirId, surah.number, ayah.ayahNo, tafsirKey]);

  useEffect(() => {
    let isMounted = true;
    fetchAyahEerab(selectedEerabBookId, surah.number, ayah.ayahNo)
      .then((res) => {
        if (isMounted) {
          setEerabContent(res.text);
          setLoadedEerabKey(eerabKey);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEerabContent('<p class="text-muted-foreground">تعذر جلب نص الإعراب.</p>');
          setLoadedEerabKey(eerabKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedEerabBookId, surah.number, ayah.ayahNo, eerabKey]);

  useEffect(() => {
    let isMounted = true;
    getAyahTranslation(selectedTranslation.code, surah.number, ayah.ayahNo)
      .then((res) => {
        if (isMounted) {
          setTranslationText(res.text);
          setTranslationFootnotes(res.footnotes);
          setLoadedTranslationKey(translationKey);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTranslationText(ayah.textEn || 'Translation unavailable.');
          setLoadedTranslationKey(translationKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTranslation.code, surah.number, ayah.ayahNo, ayah.textEn, translationKey]);

  const handleCopy = () => {
    const text = `﴿ ${ayah.textAr} ﴾\n[سورة ${surah.nameAr}: الآية ${ayah.ayahNo} - ${activeQiraah.name}]\n\nالتفسير (${SUPPORTED_TAFSIRS.find((t) => t.id === selectedTafsirId)?.name}):\n${tafsirContent.replace(/<[^>]+>/g, '')}\n\nالمصدر: منصة النور القرآنية`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('تم نسخ نص الآية والتفسير بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      <div className="bg-card w-full max-w-3xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary font-bold text-xs">
              {ayah.ayahNo}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                سورة {surah.nameAr} • الآية {ayah.ayahNo}
              </h3>
              <span className="text-[11px] text-primary font-bold">{activeQiraah.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onPrevAyah && (
              <Button size="icon" variant="outline" onClick={onPrevAyah} className="size-8 rounded-xl" title="الآية السابقة">
                <ChevronRight className="size-4" />
              </Button>
            )}

            {onNextAyah && (
              <Button size="icon" variant="outline" onClick={onNextAyah} className="size-8 rounded-xl" title="الآية التالية">
                <ChevronLeft className="size-4" />
              </Button>
            )}

            <Button size="icon" variant="ghost" onClick={onClose} className="size-8 rounded-xl">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Ayah Arabic Box */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent border-b border-border text-center">
          <p className="font-quran font-bold text-2xl sm:text-3xl text-foreground leading-[2.2] select-text">
            ﴿ {ayah.textAr} ﴾
            <span className="inline-flex items-center justify-center size-8 mx-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-sans text-xs font-bold align-middle">
              {ayah.ayahNo}
            </span>
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-border/70 overflow-x-auto scrollbar-none bg-muted/10">
          <button
            onClick={() => setActiveTab('tafsir')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap',
              activeTab === 'tafsir' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <BookOpen className="size-4" />
            <span>التفاسير المعتمدة</span>
          </button>

          <button
            onClick={() => setActiveTab('eerab')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap',
              activeTab === 'eerab' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <GraduationCap className="size-4" />
            <span>إعراب القرآن وبيانه</span>
          </button>

          <button
            onClick={() => setActiveTab('translation')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2',
              activeTab === 'translation' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="size-4" />
            <span>التراجم العالمية</span>
          </button>

          <button
            onClick={() => setActiveTab('asbab')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2',
              activeTab === 'asbab' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Scroll className="size-4" />
            <span>أسباب النزول والمعاني</span>
          </button>

          <button
            onClick={() => setActiveTab('memorize')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2',
              activeTab === 'memorize' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <RotateCcw className="size-4" />
            <span>تكرار الحفظ والتثبيت</span>
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === 'tafsir' && (
          <AyahTafsirTab
            selectedTafsirId={selectedTafsirId}
            onSelectTafsir={setSelectedTafsirId}
            loadingTafsir={loadingTafsir}
            tafsirContent={tafsirContent}
          />
        )}

        {activeTab === 'eerab' && (
          <AyahEerabTab
            selectedEerabBookId={selectedEerabBookId}
            onSelectEerabBook={setSelectedEerabBookId}
            loadingEerab={loadingEerab}
            eerabContent={eerabContent}
          />
        )}

        {activeTab === 'translation' && (
          <AyahTranslationTab
            selectedTranslation={selectedTranslation}
            onSelectTranslation={setSelectedTranslation}
            loadingTranslation={loadingTranslation}
            translationText={translationText}
            translationFootnotes={translationFootnotes}
          />
        )}

        {activeTab === 'asbab' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Scroll className="size-4 text-amber-600" />
                أسباب النزول وسياق الآية
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                هذه الآية الكريمة نزلت في سياق مقاصد سورة {surah.nameAr} ({surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}). للاستزادة في أسباب النزول المفصلة، يرجى مراجعة «لباب النقول في أسباب النزول» للسيوطي أو «أسباب النزول» للواحدي في مكتبة الكتب.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'memorize' && (
          <AyahMemorizeTab
            availableAyahReciters={availableAyahReciters}
            selectedAyahReciter={selectedAyahReciter}
            onSelectAyahReciter={setCustomReciter}
            repeatLimit={repeatLimit}
            onSetRepeatLimit={setRepeatLimit}
            repeatCount={repeatCount}
            isPlaying={isLoopPlaying}
            onTogglePlay={toggleLoopPlay}
            onReset={resetLoop}
          />
        )}

        {/* Footer with Copy button */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2 rounded-xl text-xs font-bold"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            <span>{copied ? 'تم النسخ' : 'نسخ الآية والتفسير'}</span>
          </Button>

          <Button size="sm" variant="ghost" onClick={onClose} className="rounded-xl text-xs">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
