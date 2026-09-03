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
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  GitFork,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HadithItem, HadithChapter, HadeethEncSharhItem } from '@/lib/hadith-engine';
import type { HadithBookMeta } from '@/lib/hadith-data';
import { getHadithGrade } from '@/lib/hadith-grade-engine';
import { ArabicHighlight } from './ArabicHighlight';
import { HadithIsnadTree } from './HadithIsnadTree';
import { HadithTranslationsView } from './HadithTranslationsView';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HadithDetailModalProps {
  hadith: HadithItem;
  book: HadithBookMeta;
  chapter?: HadithChapter;
  sharh: HadeethEncSharhItem | null;
  loadingSharh: boolean;
  highlightQuery?: string;
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
  onClose,
  onPrev,
  onNext,
}: HadithDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'sharh' | 'isnad' | 'translations' | 'hints'>('sharh');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [fontSize, setFontSize] = useState<number>(17); // Default readable font size

  const gradeInfo = getHadithGrade(book.id, hadith.idInBook, sharh?.grade);

  // Keyboard shortcut to close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Smoothly scroll to the highlighted search term if opened from search
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
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('تم نسخ نص الحديث والشرح والتخريج بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
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
    const utterance = new SpeechSynthesisUtterance(hadith.arabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.85;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.info('جاري قراءة نص الحديث الشريف...');
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
        {/* 1. Top Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/30">
          {/* Left: Book Meta & Chapter */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-2xl bg-primary/10 grid place-items-center text-primary font-bold text-xs shrink-0 border border-primary/20">
              #{hadith.idInBook}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                  {book.nameAr}
                </h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] font-bold py-0.5 px-2 rounded-lg border shrink-0',
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
                <span className="text-[11px] text-muted-foreground truncate block">
                  {chapter.arabic}
                </span>
              )}
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Font Size Adjusters */}
            <div className="hidden sm:flex items-center bg-muted/60 rounded-xl p-0.5 border border-border/70">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="تصغير الخط"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="text-[10px] font-bold px-1.5 text-muted-foreground select-none">
                {fontSize}px
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setFontSize((s) => Math.min(26, s + 1))}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="تكبير الخط"
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </div>

            {/* Audio Recitation */}
            <Button
              size="icon"
              variant={isSpeaking ? 'default' : 'outline'}
              onClick={handleSpeak}
              className="size-8 sm:size-9 rounded-xl border-border"
              title="استماع للحديث صوتياً"
            >
              {isSpeaking ? <VolumeX className="size-4 animate-pulse" /> : <Volume2 className="size-4" />}
            </Button>

            {/* Prev / Next Navigation */}
            {onPrev && (
              <Button
                size="icon"
                variant="outline"
                onClick={onPrev}
                className="size-8 sm:size-9 rounded-xl border-border hidden sm:grid place-items-center"
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
                className="size-8 sm:size-9 rounded-xl border-border hidden sm:grid place-items-center"
                title="الحديث التالي"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}

            {/* Maximize / Minimize Toggle */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsMaximized(!isMaximized)}
              className="size-8 sm:size-9 rounded-xl border-border hidden md:grid place-items-center"
              title={isMaximized ? 'تصغير النافذة' : 'تكبير ملء الشاشة'}
            >
              {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>

            {/* Close Button */}
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

        {/* 2. Compact Matn Quote Box */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent border-b border-border shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
              <Scroll className="size-3.5" />
              نص الحديث الشريف
            </span>
            <Badge variant="outline" className="text-[10px] bg-card">
              رقم الحديث: {hadith.idInBook}
            </Badge>
          </div>

          <p
            style={{ fontSize: `${fontSize + 2}px` }}
            className="font-quran font-bold text-foreground leading-[2.4] select-text text-justify sm:text-center px-1 sm:px-4"
          >
            « <ArabicHighlight text={hadith.arabic.trim()} query={highlightQuery} /> »
          </p>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-2 border-b border-border/70 overflow-x-auto scrollbar-none bg-muted/10 shrink-0">
          <button
            onClick={() => setActiveTab('sharh')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'sharh'
                ? 'border-primary text-primary bg-background shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <BookOpen className="size-4" />
            <span>الشرح والبيان</span>
          </button>

          <button
            onClick={() => setActiveTab('isnad')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'isnad'
                ? 'border-primary text-primary bg-background shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <GitFork className="size-4" />
            <span>شجرة السند والرواة</span>
          </button>

          <button
            onClick={() => setActiveTab('translations')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'translations'
                ? 'border-primary text-primary bg-background shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="size-4" />
            <span>الترجمات العالمية (7 لغات)</span>
          </button>

          <button
            onClick={() => setActiveTab('hints')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer',
              activeTab === 'hints'
                ? 'border-primary text-primary bg-background shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-4" />
            <span>الفوائد والاستنباطات ({sharh?.hints?.length || 0})</span>
          </button>
        </div>

        {/* 4. Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {/* Tab 1: Comprehensive Sharh & Explanation */}
          {activeTab === 'sharh' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {loadingSharh ? (
                <div className="py-16 text-center space-y-3 text-muted-foreground">
                  <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold animate-pulse">
                    جاري جلب شرح الحديث وغريب الألفاظ من موسوعة HadeethEnc...
                  </p>
                </div>
              ) : sharh ? (
                <div className="space-y-5">
                  {/* Takhrij Banner */}
                  {sharh.attribution && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                      <div className="size-7 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 font-bold text-xs mt-0.5">
                        📌
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <strong className="text-primary block font-bold">التخريج والحكم:</strong>
                        <p className="text-foreground/90 leading-relaxed font-medium">{sharh.attribution}</p>
                      </div>
                    </div>
                  )}

                  {/* Scholarly Explanation Body */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                    <h4 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
                      <BookOpen className="size-4 text-primary" />
                      <span>الشرح التفصيلي</span>
                    </h4>

                    <div
                      style={{ fontSize: `${fontSize}px` }}
                      className="text-foreground/90 leading-[2.5] select-text whitespace-pre-line text-justify font-normal"
                    >
                      {sharh.explanation}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center space-y-3 bg-muted/20 rounded-3xl border border-border p-6">
                  <Scroll className="size-10 mx-auto text-muted-foreground/50" />
                  <h4 className="font-bold text-base text-foreground">
                    الحديث مخرّج في {book.nameAr} برقم {hadith.idInBook}
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {gradeInfo.scholar} — حكم الحديث: <strong className="text-primary">{gradeInfo.rawGrade || gradeInfo.grade}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Hints & Jurisprudential Benefits */}
          {activeTab === 'hints' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {sharh?.hints && sharh.hints.length > 0 ? (
                sharh.hints.map((hint, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-card border border-border/80 flex items-start gap-4 shadow-sm hover:border-primary/40 transition-all"
                  >
                    <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <p
                      style={{ fontSize: `${fontSize}px` }}
                      className="select-text pt-0.5 text-foreground leading-[2.3] text-justify flex-1"
                    >
                      {hint}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-muted-foreground text-sm space-y-2 bg-muted/20 rounded-3xl border border-border p-6">
                  <Sparkles className="size-8 mx-auto text-amber-500/60" />
                  <p className="font-bold">تشتمل دلالة الحديث على أحكام وآداب جليلة مقررة في أبواب الفقه والسنة.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Visual Isnad Tree */}
          {activeTab === 'isnad' && (
            <div className="max-w-4xl mx-auto">
              <HadithIsnadTree
                arabic={hadith.arabic}
                bookAuthor={book.nameAr}
                bookName={book.nameAr}
                hadithNumber={hadith.idInBook}
                grade={gradeInfo.grade}
              />
            </div>
          )}

          {/* Tab 3: Multi-Language Global Translations */}
          {activeTab === 'translations' && (
            <div className="max-w-4xl mx-auto">
              <HadithTranslationsView
                bookId={book.id}
                bookName={book.nameAr}
                hadithNumber={hadith.idInBook}
              />
            </div>
          )}
        </div>

        {/* 5. Modal Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-border flex items-center justify-between gap-3 bg-muted/20 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="text-xs gap-1.5 rounded-xl h-9 px-4 font-bold border-border bg-card"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'تم النسخ بنجاح' : 'نسخ الحديث والشرح والتخريج'}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onClose}
              className="rounded-xl px-6 h-9 font-bold text-xs"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
