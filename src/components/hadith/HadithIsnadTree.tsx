'use client';

import React, { useState } from 'react';
import { parseHadithIsnad, type IsnadNode } from '@/lib/hadith-isnad-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy, Check, Sparkles, BookOpen, User, Crown, ArrowDown, Scroll } from 'lucide-react';
import { toast } from 'sonner';

interface HadithIsnadTreeProps {
  arabic: string;
  bookAuthor?: string;
  bookName?: string;
  hadithNumber?: number;
  grade?: string;
}

export function HadithIsnadTree({
  arabic,
  bookAuthor = 'الإمام',
  bookName = 'ديوان الحديث',
  hadithNumber,
  grade,
}: HadithIsnadTreeProps) {
  const [copied, setCopied] = useState(false);
  const isnadData = React.useMemo(() => {
    return parseHadithIsnad(arabic, bookAuthor);
  }, [arabic, bookAuthor]);

  const handleCopySanad = () => {
    if (!isnadData.sanadText) return;
    const textToCopy = `« ${isnadData.sanadText} »\n\n[سند حديث رقم ${hadithNumber || ''} - ${bookName}]\nدرجة الحديث: ${grade || 'محققة'}\nالمصدر: منصة النور`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('تم نسخ نص السند وسلسلة الرواة بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isnadData.hasSanad || isnadData.nodes.length <= 2) {
    return (
      <div className="py-12 px-4 text-center space-y-4 bg-muted/20 rounded-3xl border border-border/60">
        <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center mx-auto">
          <Scroll className="size-6" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h4 className="font-bold text-sm text-foreground">
            متن مروي مباشرة بدون تفصيل الإسناد
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            هذا الحديث مسوق في هذه الرواية أو المختصر بالمتن مباشرة عن الصحابي أو النبي ﷺ، مع الاكتفاء بشهرة الحديث أو لتجريد المتون في هذا الديوان.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-foreground">
              سلسلة السند والرواة
            </span>
            <Badge
              variant="outline"
              className="text-[11px] font-bold bg-primary/10 text-primary border-primary/30"
            >
              {isnadData.chainTypeArabic}
            </Badge>
            {grade && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[11px] font-bold',
                  grade === 'صحيح'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : grade === 'حسن'
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                )}
              >
                {grade}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            تتبع مسار وصول الحديث الشريف من {bookAuthor} صعوداً إلى رسول الله ﷺ عبر {isnadData.narratorCount} من الرواة الثقات.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleCopySanad}
          className="rounded-xl text-xs gap-1.5 font-bold shrink-0"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          <span>{copied ? 'تم النسخ' : 'نسخ السند'}</span>
        </Button>
      </div>

      {/* Stepper Flow Timeline */}
      <div className="relative px-2 sm:px-6 py-2">
        {/* Continuous luminous vertical connection line */}
        <div className="absolute right-[27px] sm:right-[43px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary/30 via-emerald-500/40 to-amber-500/40" />

        <div className="space-y-4">
          {isnadData.nodes.map((node: IsnadNode, idx: number) => {
            const isFirst = idx === 0;
            const isLast = idx === isnadData.nodes.length - 1;
            const isSahabi = node.role === 'الصحابي الجليل';

            return (
              <div key={`${node.order}-${node.name}`} className="relative flex items-start gap-3 sm:gap-4 group">
                {/* Node Circle Indicator */}
                <div
                  className={cn(
                    'relative z-10 size-9 sm:size-10 rounded-2xl grid place-items-center shrink-0 font-extrabold text-xs shadow-xs transition-all',
                    isFirst
                      ? 'bg-primary text-primary-foreground border-2 border-primary ring-4 ring-primary/15'
                      : isLast
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-2 border-amber-400 ring-4 ring-amber-500/20 shadow-md scale-105'
                      : isSahabi
                      ? 'bg-emerald-500 text-white border-2 border-emerald-400 ring-4 ring-emerald-500/15'
                      : 'bg-card text-foreground border-2 border-border group-hover:border-primary/50'
                  )}
                >
                  {isLast ? (
                    <Crown className="size-4.5" />
                  ) : isFirst ? (
                    <BookOpen className="size-4" />
                  ) : isSahabi ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <User className="size-4 text-muted-foreground group-hover:text-primary" />
                  )}
                </div>

                {/* Node Content Card */}
                <div
                  className={cn(
                    'flex-1 p-3.5 sm:p-4 rounded-2xl border transition-all',
                    isLast
                      ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 shadow-xs'
                      : isSahabi
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 shadow-xs'
                      : isFirst
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-card border-border/70 group-hover:bg-muted/30 group-hover:border-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0 rounded-md border',
                          isLast
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                            : isSahabi
                            ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/40'
                            : isFirst
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {node.role}
                      </Badge>
                      <span className="text-[11px] font-bold text-muted-foreground/80">
                        {node.phrase}
                      </span>
                    </div>

                    <span className="text-[10px] text-muted-foreground">
                      المحطة {node.order} من {isnadData.nodes.length}
                    </span>
                  </div>

                  <h5
                    className={cn(
                      'text-sm sm:text-base font-bold text-foreground',
                      isLast && 'text-amber-800 dark:text-amber-300 font-extrabold',
                      isSahabi && 'text-emerald-800 dark:text-emerald-300 font-extrabold'
                    )}
                  >
                    {node.name}
                  </h5>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Sanad Accordion / Quotation */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
          <ArrowDown className="size-3.5" />
          <span>نص السند النبوي كما ورد في الأصل:</span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm font-serif">
          « {isnadData.sanadText} »
        </p>
      </div>
    </div>
  );
}
