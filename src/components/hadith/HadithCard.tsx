import { useState } from 'react';
import { BookOpen, Copy, Check, Globe, Volume2, VolumeX, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HadithItem, HadithChapter } from '@/lib/hadith';
import type { HadithBookMeta } from '@/lib/hadith';
import { getHadithGrade } from '@/lib/hadith';
import { ArabicHighlight } from './ArabicHighlight';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/use-clipboard';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';


interface HadithCardProps {
  hadith: HadithItem;
  book: HadithBookMeta;
  chapter?: HadithChapter;
  highlightQuery?: string;
  isSemanticMatch?: boolean;
  semanticTopic?: string;
  onOpenDetail: (
    hadith: HadithItem,
    book: HadithBookMeta,
    chapter?: HadithChapter,
    initialTab?: 'matn' | 'isnad' | 'translations' | 'sharh' | 'hints'
  ) => void;
}

export function HadithCard({
  hadith,
  book,
  chapter,
  highlightQuery,
  isSemanticMatch,
  semanticTopic,
  onOpenDetail,
}: HadithCardProps) {
  const { copied, copy } = useClipboard();
  const { isSpeaking, speak } = useTextToSpeech({ lang: 'ar-SA', rate: 0.9 });
  const [showEnglish, setShowEnglish] = useState(false);
  const resolvedArabic = hadith.arabic;
  const gradeInfo = getHadithGrade(book.id, hadith.idInBook);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `« ${resolvedArabic.replace(/\n+/g, ' ').trim()} »\n\n[${book.nameAr} - حديث رقم: ${hadith.idInBook}${chapter ? ` - ${chapter.arabic}` : ''}]\nدرجة الحديث: ${gradeInfo.grade}\n\nالمصدر: منصة النور - موسوعة الحديث النبوي الشريف`;
    copy(text, `تم نسخ الحديث رقم ${hadith.idInBook}`);
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(resolvedArabic, 'جاري قراءة نص الحديث صوتياً...');
  };


  return (
    <div
      onClick={() => onOpenDetail({ ...hadith, arabic: resolvedArabic }, book, chapter)}
      className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer shadow-sm space-y-4 group"
    >
      {/* Top Meta Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary font-bold text-xs">
            #{hadith.idInBook}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">
                {book.nameAr}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] font-bold py-0 px-1.5 rounded-lg border',
                  gradeInfo.grade === 'صحيح'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : gradeInfo.grade === 'حسن'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    : gradeInfo.grade === 'ضعيف'
                    ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30'
                    : gradeInfo.grade === 'موضوع'
                    ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                )}
              >
                {gradeInfo.grade}
              </Badge>

              {isSemanticMatch && semanticTopic && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/35 gap-1 py-0 px-1.5 rounded-lg"
                >
                  <span>💡 تطابق بالمعنى: {semanticTopic}</span>
                </Badge>
              )}
            </div>
            {chapter && (
              <span className="text-[11px] text-muted-foreground block line-clamp-1">
                {chapter.arabic}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant={isSpeaking ? 'default' : 'ghost'}
            onClick={handleSpeak}
            className="size-8 rounded-xl"
            title="استماع للحديث صوتياً"
          >
            {isSpeaking ? <VolumeX className="size-4 animate-pulse" /> : <Volume2 className="size-4" />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail({ ...hadith, arabic: resolvedArabic }, book, chapter, 'isnad');
            }}
            className="h-8 px-2.5 rounded-xl text-[11px] font-bold gap-1.5 border-border/70 hover:border-primary/50 text-muted-foreground hover:text-primary shrink-0 cursor-pointer"
            title="فتح شجرة السند وسلسلة الرواة"
          >
            <GitFork className="size-3.5 text-primary" />
            <span>شجرة السند</span>
          </Button>

          {hadith.english?.text && (
            <Button
              size="icon"
              variant={showEnglish ? 'default' : 'ghost'}
              onClick={() => setShowEnglish(!showEnglish)}
              className="size-8 rounded-xl"
              title="عرض الترجمة الإنجليزية"
            >
              <Globe className="size-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={handleCopy}
            className="size-8 rounded-xl"
            title="نسخ نص الحديث"
          >
            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Hadith Arabic Body (Full Text) */}
      <div className="space-y-2">
        <p className="font-quran font-bold text-base sm:text-lg text-foreground leading-[2.3] select-text text-justify">
          « <ArabicHighlight text={resolvedArabic.trim()} query={highlightQuery} /> »
        </p>

        {(hadith.arabic.endsWith('...') || hadith.arabic.length < 80) && (
          <div className="flex items-center gap-1 text-xs text-primary font-bold pt-1">
            <span>انقر لفتح كامل نص الحديث ومتنه وسنده والشرح ←</span>
          </div>
        )}
      </div>

      {/* English Translation View */}
      {showEnglish && hadith.english?.text && (
        <div
          dir="ltr"
          className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs sm:text-sm text-foreground/90 space-y-1 select-text"
        >
          {hadith.english.narrator && (
            <p className="font-bold text-primary text-xs">{hadith.english.narrator}</p>
          )}
          <p className="leading-relaxed">{hadith.english.text}</p>
        </div>
      )}

      {/* Card Bottom Actions */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen className="size-3 text-primary" />
          <span>رقم الحديث في الديوان: {hadith.idInBook}</span>
        </span>

        <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
          <span>عرض الشرح والفوائد</span>
          <span>←</span>
        </span>
      </div>
    </div>
  );
}
