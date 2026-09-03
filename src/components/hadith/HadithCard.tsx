import { useState } from 'react';
import { BookOpen, Copy, Check, Globe, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HadithItem, HadithChapter } from '@/lib/hadith-engine';
import type { HadithBookMeta } from '@/lib/hadith-data';
import { getHadithGrade } from '@/lib/hadith-grade-engine';
import { ArabicHighlight } from './ArabicHighlight';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HadithCardProps {
  hadith: HadithItem;
  book: HadithBookMeta;
  chapter?: HadithChapter;
  highlightQuery?: string;
  onOpenDetail: (hadith: HadithItem, book: HadithBookMeta, chapter?: HadithChapter) => void;
}

export function HadithCard({
  hadith,
  book,
  chapter,
  highlightQuery,
  onOpenDetail,
}: HadithCardProps) {
  const [copied, setCopied] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const resolvedArabic = hadith.arabic;
  const gradeInfo = getHadithGrade(book.id, hadith.idInBook);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `« ${resolvedArabic.replace(/\n+/g, ' ').trim()} »\n\n[${book.nameAr} - حديث رقم: ${hadith.idInBook}${chapter ? ` - ${chapter.arabic}` : ''}]\nدرجة الحديث: ${gradeInfo.grade}\n\nالمصدر: منصة النور - موسوعة الحديث النبوي الشريف`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`تم نسخ الحديث رقم ${hadith.idInBook}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('المتصفح لا يدعم القراءة الصوتية');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(resolvedArabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.info('جاري قراءة نص الحديث صوتياً...');
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
