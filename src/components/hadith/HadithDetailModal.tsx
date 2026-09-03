'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Copy,
  Check,
  Globe,
  Scroll,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  GitFork,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HadithItem, HadithChapter, HadeethEncSharhItem } from '@/lib/hadith';
import type { HadithBookMeta } from '@/lib/hadith/data';
import { getHadithGrade } from '@/lib/hadith/grade-engine';
import { ArabicHighlight } from './ArabicHighlight';
import { HadithIsnadTree } from './HadithIsnadTree';
import { HadithTranslationsView } from './HadithTranslationsView';
import { HadithMatnTab } from './detail-tabs/HadithMatnTab';
import { HadithSharhTab } from './detail-tabs/HadithSharhTab';
import { HadithHintsTab } from './detail-tabs/HadithHintsTab';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/use-clipboard';

interface HadithDetailModalProps {
  hadith: HadithItem;
  book: HadithBookMeta;
  chapter?: HadithChapter;
  sharh: HadeethEncSharhItem | null;
  loadingSharh: boolean;
  highlightQuery?: string;
  initialTab?: 'matn' | 'isnad' | 'translations' | 'sharh' | 'hints';
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function HadithDetailModal({
  hadith,
  book,
  chapter,
  sharh,
  loadingSharh,
  highlightQuery,
  initialTab = 'matn',
  onClose,
  onPrev,
  onNext,
}: HadithDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'matn' | 'isnad' | 'translations' | 'sharh' | 'hints'>(
    initialTab
  );
  const [showMatnSnippet, setShowMatnSnippet] = useState(false);
  const { copied, copy } = useClipboard();
  const [isMaximized, setIsMaximized] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);

  const gradeInfo = getHadithGrade(book.id, hadith.idInBook, sharh?.grade);
  const tts = useTextToSpeech();

  // Keyboard shortcut to close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Smoothly scroll to highlighted search term
  useEffect(() => {
    if (highlightQuery && highlightQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        const mark = document.querySelector('mark');
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [highlightQuery, hadith.idInBook]);

  const handleCopy = () => {
    let text = `« ${hadith.arabic.replace(/\n+/g, ' ').trim()} »\n\n[رواه ${book.nameAr} - رقم: ${hadith.idInBook}${chapter ? ` - ${chapter.arabic}` : ''}]\nدرجة الحديث: ${gradeInfo.rawGrade || gradeInfo.grade}`;

    if (sharh) {
      text += `\n\nالشرح والبيان:\n${sharh.explanation.replace(/<[^>]+>/g, '')}`;
      if (sharh.hints && sharh.hints.length > 0) {
        text += `\n\nالفوائد والاستنباطات:\n${sharh.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
      }
    }

    text += `\n\nالمصدر: منصة النور - موسوعة الحديث النبوي الشريف`;
    copy(text, 'تم نسخ نص الحديث والشرح والتخريج بنجاح');
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className={cn(
          'bg-card border border-border shadow-2xl flex flex-col overflow-hidden transition-all duration-300',
          isMaximized
            ? 'w-full h-full rounded-none sm:rounded-2xl'
            : 'w-full max-w-5xl max-h-[92vh] rounded-3xl'
        )}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-border/80 flex items-center justify-between gap-3 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="size-9 sm:size-10 rounded-2xl bg-primary/10 grid place-items-center text-primary font-bold text-xs sm:text-sm shrink-0">
              {hadith.idInBook}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                  {book.nameAr} • حديث رقم {hadith.idInBook}
                </h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] sm:text-xs font-bold shrink-0',
                    gradeInfo.grade === 'صحيح'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : gradeInfo.grade === 'حسن'
                      ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  )}
                >
                  {gradeInfo.rawGrade || gradeInfo.grade}
                </Badge>
              </div>

              {chapter && (
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                  باب: {chapter.arabic}
                </p>
              )}
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onPrev && (
              <Button
                size="icon"
                variant="outline"
                onClick={onPrev}
                className="size-8 sm:size-9 rounded-xl"
                title="الحديث السابق"
              >
                <ChevronRight className="size-4" />
              </Button>
            )}

            {onNext && (
              <Button
                size="icon"
                variant="outline"
                onClick={onNext}
                className="size-8 sm:size-9 rounded-xl"
                title="الحديث التالي"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="size-8 sm:size-9 rounded-xl"
              title="نسخ نص الحديث والتخريج"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsMaximized(!isMaximized)}
              className="size-8 sm:size-9 rounded-xl hidden sm:flex"
              title={isMaximized ? 'استعادة الحجم' : 'ملء الشاشة'}
            >
              {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="size-8 sm:size-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
              title="إغلاق النافذة"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-2 border-b border-border/70 overflow-x-auto scrollbar-none bg-muted/10 shrink-0">
          <button
            onClick={() => setActiveTab('matn')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'matn'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Scroll className="size-4" />
            <span>متن الحديث الشريف</span>
          </button>

          <button
            onClick={() => setActiveTab('isnad')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'isnad'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <GitFork className="size-4" />
            <span>شجرة السند والرواة</span>
          </button>

          <button
            onClick={() => setActiveTab('sharh')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'sharh'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <BookOpen className="size-4" />
            <span>الشرح والبيان</span>
          </button>

          <button
            onClick={() => setActiveTab('translations')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'translations'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="size-4" />
            <span>الترجمات العالمية</span>
          </button>

          <button
            onClick={() => setActiveTab('hints')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'hints'
                ? 'border-primary text-primary bg-background shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-4" />
            <span>الفوائد والاستنباطات ({sharh?.hints?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {activeTab !== 'matn' && (
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setShowMatnSnippet(!showMatnSnippet)}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-muted/40 hover:bg-muted/70 px-3.5 py-1.5 rounded-xl border border-border/60"
              >
                <Scroll className="size-3.5 text-primary" />
                <span>{showMatnSnippet ? 'إخفاء مقتطف نص الحديث' : 'عرض مقتطف نص الحديث الشريف'}</span>
              </button>

              {showMatnSnippet && (
                <div className="mt-2.5 p-4 sm:p-5 rounded-2xl bg-muted/25 border border-border/80 text-xs sm:text-sm font-quran leading-[2.3] text-foreground select-text text-justify shadow-2xs">
                  « <ArabicHighlight text={hadith.arabic.trim()} query={highlightQuery} /> »
                </div>
              )}
            </div>
          )}

          {activeTab === 'matn' && (
            <HadithMatnTab
              hadith={hadith}
              book={book}
              highlightQuery={highlightQuery}
              fontSize={fontSize}
              onZoomIn={() => setFontSize((s) => Math.min(32, s + 2))}
              onZoomOut={() => setFontSize((s) => Math.max(14, s - 2))}
              onResetZoom={() => setFontSize(18)}
              isSpeaking={tts.isSpeaking}
              onToggleSpeech={() => (tts.isSpeaking ? tts.stop() : tts.speak(hadith.arabic))}
              gradeBadge={gradeInfo}
            />
          )}

          {activeTab === 'isnad' && (
            <div className="max-w-4xl mx-auto">
              <HadithIsnadTree hadith={hadith} book={book} />
            </div>
          )}

          {activeTab === 'sharh' && (
            <HadithSharhTab sharh={sharh} loadingSharh={loadingSharh} />
          )}

          {activeTab === 'translations' && (
            <HadithTranslationsView
              bookId={book.id}
              bookName={book.nameAr}
              hadithNumber={hadith.idInBook}
            />
          )}

          {activeTab === 'hints' && (
            <HadithHintsTab sharh={sharh} loadingSharh={loadingSharh} />
          )}
        </div>
      </div>
    </div>
  );
}
