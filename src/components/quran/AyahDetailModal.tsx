'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  X,
  Pause,
  Play,
  RotateCcw,
  Copy,
  Check,
  Globe,
  Scroll,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Headphones,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SUPPORTED_TAFSIRS,
  fetchAyahTafsir,
} from '@/lib/quran-tafsir-engine';
import {
  SUPPORTED_EERAB_BOOKS,
  fetchAyahEerab,
} from '@/lib/quran-eerab-engine';
import {
  getAyahTranslation,
} from '@/lib/quran-translation-engine';
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
import { cn } from '@/lib/utils';
import { sanitizeTafsirHtml } from '@/lib/sanitize-html';
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
  const setActiveReciter = useQuranStore((s) => s.setActiveReciter);

  const [activeTab, setActiveTab] = useState<'tafsir' | 'eerab' | 'asbab' | 'translation' | 'memorize'>('tafsir');
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(16); // Default: التفسير الميسر
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

  // Available verse reciters for this specific Qira'ah
  const availableAyahReciters = getAyahRecitersForQiraah(activeQiraah.id);
  const [customReciter, setCustomReciter] = useState<ReciterMeta | null>(null);
  const selectedAyahReciter =
    (customReciter && availableAyahReciters.some((r) => r.id === customReciter.id) && customReciter) ||
    availableAyahReciters[0] ||
    activeReciter;

  // Memorization & Audio Loop State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatLimit, setRepeatLimit] = useState<number>(3);
  const [repeatCount, setRepeatCount] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sStr = String(surah.number).padStart(3, '0');
  const aStr = String(ayah.ayahNo).padStart(3, '0');

  // Exact verse audio URL
  const audioUrl = `https://everyayah.com/data/${selectedAyahReciter.subfolder}/${sStr}${aStr}.mp3`;

  // Fetch Tafsir on change
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

  // Fetch I'rab on change
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

  // Fetch Translation on language or ayah change
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

  // Audio Playback
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  const handleAudioEnded = () => {
    const nextCount = repeatCount + 1;
    if (nextCount < repeatLimit) {
      setRepeatCount(nextCount);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.warn);
        }
      }, 800);
    } else {
      setIsPlaying(false);
      setRepeatCount(0);
    }
  };

  const handleCopy = () => {
    const text = `﴿ ${ayah.textAr} ﴾\n[سورة ${surah.nameAr}: الآية ${ayah.ayahNo} - ${activeQiraah.name}]\n\nالتفسير (${SUPPORTED_TAFSIRS.find((t) => t.id === selectedTafsirId)?.name}):\n${tafsirContent.replace(/<[^>]+>/g, '')}\n\nالمصدر: منصة النور القرآنية`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('تم نسخ نص الآية والتفسير بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      {/* Hidden audio player */}
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
              <span className="text-[11px] text-primary font-bold">
                {activeQiraah.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onPrevAyah && (
              <Button
                size="icon"
                variant="outline"
                onClick={onPrevAyah}
                className="size-8 rounded-xl"
                title="الآية السابقة"
              >
                <ChevronRight className="size-4" />
              </Button>
            )}

            {onNextAyah && (
              <Button
                size="icon"
                variant="outline"
                onClick={onNextAyah}
                className="size-8 rounded-xl"
                title="الآية التالية"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="size-8 rounded-xl"
            >
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
              activeTab === 'tafsir'
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <BookOpen className="size-4" />
            <span>التفاسير المعتمدة</span>
          </button>

          <button
            onClick={() => setActiveTab('eerab')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap',
              activeTab === 'eerab'
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <GraduationCap className="size-4" />
            <span>إعراب القرآن وبيانه</span>
          </button>

          <button
            onClick={() => setActiveTab('translation')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2',
              activeTab === 'translation'
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="size-4" />
            <span>التراجم العالمية</span>
          </button>

          <button
            onClick={() => setActiveTab('asbab')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2',
              activeTab === 'asbab'
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Scroll className="size-4" />
            <span>أسباب النزول والمعاني</span>
          </button>

          <button
            onClick={() => setActiveTab('memorize')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2',
              activeTab === 'memorize'
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <RotateCcw className="size-4" />
            <span>تكرار الحفظ والتثبيت</span>
          </button>
        </div>

        {/* Tab 1: Tafsirs */}
        {activeTab === 'tafsir' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Tafsir Picker */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">اختر التفسير:</span>
                <select
                  value={selectedTafsirId}
                  onChange={(e) => setSelectedTafsirId(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SUPPORTED_TAFSIRS.map((t) => (
                    <option key={t.id} value={t.id}>
                      📖 {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-muted-foreground">
                {SUPPORTED_TAFSIRS.find((t) => t.id === selectedTafsirId)?.author}
              </div>
            </div>

            {/* Tafsir Body */}
            {loadingTafsir ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
                جاري تحميل التفسير المعتمد...
              </div>
            ) : (
              <div
                className="p-5 rounded-2xl bg-card border border-border/80 text-foreground text-sm sm:text-base leading-loose select-text"
                dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(tafsirContent) }}
              />
            )}
          </div>
        )}

        {/* Tab: Eerab al-Quran */}
        {activeTab === 'eerab' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Eerab Book Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">كتاب الإعراب:</span>
                <select
                  value={selectedEerabBookId}
                  onChange={(e) => setSelectedEerabBookId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SUPPORTED_EERAB_BOOKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      📜 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-muted-foreground font-semibold">
                {SUPPORTED_EERAB_BOOKS.find((b) => b.id === selectedEerabBookId)?.author}
              </div>
            </div>

            {/* Book Description Alert */}
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl p-3 px-4">
              💡 {SUPPORTED_EERAB_BOOKS.find((b) => b.id === selectedEerabBookId)?.description}
            </div>

            {/* Eerab Body */}
            {loadingEerab ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
                جاري تحميل إعراب الآية الشريفة وبيانها...
              </div>
            ) : (
              <div
                className="p-5 rounded-2xl bg-card border border-border/80 text-foreground text-sm sm:text-base leading-loose select-text"
                dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(eerabContent) }}
              />
            )}
          </div>
        )}

        {/* Tab 2: Multilingual Translations */}
        {activeTab === 'translation' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-xs font-bold text-muted-foreground">اختر لغة الترجمة:</span>
              <select
                value={selectedTranslation.code}
                onChange={(e) => {
                  const t = QURAN_TRANSLATIONS.find((x) => x.code === e.target.value);
                  if (t) setSelectedTranslation(t);
                }}
                className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {QURAN_TRANSLATIONS.map((t) => (
                  <option key={t.code} value={t.code}>
                    🌍 {t.name}
                  </option>
                ))}
              </select>
            </div>

            {loadingTranslation ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
                جاري تحميل الترجمة...
              </div>
            ) : (
              <div
                className="p-5 rounded-2xl bg-card border border-border text-foreground text-sm sm:text-base leading-relaxed"
                dir={selectedTranslation.direction}
              >
                <div className="text-xs text-primary font-bold mb-2">
                  {selectedTranslation.nativeName} — {selectedTranslation.author}:
                </div>
                <p className="select-text text-base leading-loose font-medium">
                  {translationText}
                </p>

                {translationFootnotes && (
                  <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                    <strong className="block mb-1">Footnotes / ملاحظات الترجمة:</strong>
                    <p className="leading-relaxed">{translationFootnotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Asbab al-Nuzul & Word Meanings */}
        {activeTab === 'asbab' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Scroll className="size-4" />
                <span>سبب النزول وسياق الآية الكريمة:</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {ayah.textEn
                  ? `نزلت هذه الآية الكريمة في سياق سورة ${surah.nameAr} لبيان التوحيد والأحكام وتثبيت قلوب المؤمنين وهدايتهم إلى الصراط المستقيم.`
                  : 'بيان أحكام الآية وسياق نزولها في العهد النبوي الشريف.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Sparkles className="size-4" />
                <span>غريب القرآن ومعاني الكلمات:</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                تشتمل الآية على ألفاظ فصيحة بليغة تدل على كمال البيان الإلهي، وتفسر مفرداتها بالرجوع إلى لسان العرب وسياق الآيات الكريمة.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Memorization & Loop Tool */}
        {activeTab === 'memorize' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-center">
            {/* Reciter Selector for Verse Memorization */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border text-right space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    قارئ تلاوة الآية ({ayah.ayahNo}):
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {availableAyahReciters.length} قراء
                </Badge>
              </div>

              <select
                value={selectedAyahReciter.id}
                onChange={(e) => {
                  const r = availableAyahReciters.find((x) => x.id === e.target.value);
                  if (r) {
                    setCustomReciter(r);
                    setActiveReciter(r);
                    setIsPlaying(false);
                    toast.success(`تم اختيار القارئ: ${r.name}`);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {availableAyahReciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    🎙️ {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Repetition Selector */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-xs font-bold text-muted-foreground">عدد مرات تكرار الآية:</span>
              {[1, 3, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setRepeatLimit(num);
                    setRepeatCount(0);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    repeatLimit === num
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {num}x
                </button>
              ))}
            </div>

            {/* Play Button & Counter */}
            <div className="pt-2">
              <Button
                size="lg"
                variant="default"
                onClick={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                  } else {
                    setRepeatCount(0);
                    setIsPlaying(true);
                  }
                }}
                className={cn(
                  'px-8 py-6 rounded-2xl text-base font-bold gap-3 shadow-lg transition-all',
                  isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 fill-current" />}
                <span>
                  {isPlaying
                    ? `إيقاف مؤقت (${selectedAyahReciter.name})`
                    : `تكرار الآية ${ayah.ayahNo} بصوت (${selectedAyahReciter.name})`}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-muted/10">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="text-xs gap-1.5 rounded-xl"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الآية والتفسير'}</span>
            </Button>
          </div>

          <Button
            size="sm"
            variant="default"
            onClick={onClose}
            className="rounded-xl px-5"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
