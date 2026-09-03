'use client';

import React, { useState } from 'react';
import { parseHadithIsnad, type IsnadNode } from '@/lib/hadith-isnad-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Copy,
  Check,
  Sparkles,
  BookOpen,
  User,
  Crown,
  Scroll,
  Network,
  ListTree,
  GitBranch,
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'tree' | 'stepper'>('tree');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

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
      <div className="py-16 px-4 text-center space-y-4 bg-muted/20 rounded-3xl border border-border/60 max-w-2xl mx-auto">
        <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center mx-auto shadow-inner">
          <Scroll className="size-7" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h4 className="font-bold text-base text-foreground">
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
      {/* Top Header Card with View Mode Switcher */}
      <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-2">
              <Network className="size-4 text-primary" />
              شجرة السند النبوي وسلسلة الرواة
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
            سلسلة النقل المتصلة من {bookAuthor} صعوداً إلى سيدنا رسول الله ﷺ عبر {isnadData.narratorCount} من الرواة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Tree Diagram vs Stepper */}
          <div className="flex items-center p-1 bg-muted/40 rounded-2xl border border-border/70">
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'tree'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="عرض الشجرة البصرية التفاعلية"
            >
              <GitBranch className="size-3.5 text-primary" />
              <span>الشجرة البصرية</span>
            </button>
            <button
              onClick={() => setViewMode('stepper')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'stepper'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="عرض السلسلة التفصيلية"
            >
              <ListTree className="size-3.5 text-primary" />
              <span>السلسلة</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopySanad}
            className="rounded-2xl text-xs gap-1.5 font-bold shrink-0 h-9"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'تم النسخ' : 'نسخ السند'}</span>
          </Button>
        </div>
      </div>

      {/* VIEW 1: TRUE VISUAL TREE CANVAS (الشجرة البصرية الحقيقية) */}
      {viewMode === 'tree' && (
        <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-card/90 to-muted/20 border border-border/80 shadow-xs overflow-hidden">
          {/* Decorative Islamic geometric background watermark */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative max-w-3xl mx-auto space-y-3">
            {/* SVG Connecting Tree Trunk & Branches */}
            <div className="space-y-6 sm:space-y-8 relative">
              {/* Continuous vertical trunk */}
              <div className="absolute left-1/2 -translate-x-1/2 top-8 bottom-8 w-1 bg-gradient-to-b from-primary/30 via-emerald-500/40 to-amber-500/50 rounded-full hidden sm:block" />

              {isnadData.nodes.map((node: IsnadNode, idx: number) => {
                const isFirst = idx === 0;
                const isLast = idx === isnadData.nodes.length - 1;
                const isSahabi = node.role === 'الصحابي الجليل';
                const isEven = idx % 2 === 0;
                const isSelected = selectedNode === node.order;

                return (
                  <div
                    key={`${node.order}-${node.name}`}
                    onClick={() => setSelectedNode(isSelected ? null : node.order)}
                    className={cn(
                      'relative flex flex-col sm:flex-row items-center gap-3 transition-all cursor-pointer group',
                      isLast || isFirst
                        ? 'sm:justify-center'
                        : isEven
                        ? 'sm:flex-row-reverse sm:text-left'
                        : 'sm:flex-row sm:text-right'
                    )}
                  >
                    {/* Node Tree Fruit / Seal */}
                    <div
                      className={cn(
                        'relative z-20 size-14 sm:size-16 rounded-3xl grid place-items-center shrink-0 font-extrabold shadow-md transition-all duration-300',
                        isLast
                          ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white ring-8 ring-amber-500/20 shadow-amber-500/30 shadow-lg scale-110'
                          : isSahabi
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-6 ring-emerald-500/20 shadow-emerald-500/20 shadow-md scale-105'
                          : isFirst
                          ? 'bg-primary text-primary-foreground ring-6 ring-primary/20 shadow-primary/20 shadow-md'
                          : 'bg-card text-foreground border-2 border-border/90 group-hover:border-primary/60 group-hover:scale-105 shadow-sm'
                      )}
                    >
                      {isLast ? (
                        <div className="text-center">
                          <Crown className="size-6 text-white animate-pulse" />
                        </div>
                      ) : isSahabi ? (
                        <Sparkles className="size-6 text-white" />
                      ) : isFirst ? (
                        <BookOpen className="size-6" />
                      ) : (
                        <User className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}

                      {/* Small badge for node order in the tree */}
                      <span
                        className={cn(
                          'absolute -bottom-2 text-[10px] font-black px-1.5 py-0.5 rounded-full border shadow-2xs',
                          isLast
                            ? 'bg-amber-600 text-white border-amber-300'
                            : isSahabi
                            ? 'bg-emerald-700 text-white border-emerald-400'
                            : isFirst
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        #{node.order}
                      </span>
                    </div>

                    {/* Branch Content Card */}
                    <div
                      className={cn(
                        'w-full sm:w-[calc(50%-44px)] p-4 rounded-3xl border transition-all duration-300 relative',
                        isLast
                          ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40 text-center sm:max-w-md shadow-md ring-1 ring-amber-500/30'
                          : isSahabi
                          ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                          : isFirst
                          ? 'bg-primary/10 border-primary/30 text-center sm:max-w-md'
                          : 'bg-card/90 border-border/80 group-hover:bg-muted/40 group-hover:border-primary/40 shadow-2xs',
                        isSelected && 'ring-2 ring-primary border-primary'
                      )}
                    >
                      {/* Branch connector leaf (صيغة الأداء والتحمل) */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5 justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-lg border',
                            isLast
                              ? 'bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/40'
                              : isSahabi
                              ? 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-emerald-500/40'
                              : isFirst
                              ? 'bg-primary/20 text-primary border-primary/30'
                              : 'bg-muted/80 text-muted-foreground border-border'
                          )}
                        >
                          {node.role}
                        </Badge>

                        <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-[11px] font-bold text-muted-foreground border border-border/50">
                          <span className="text-[10px] opacity-70">صيغة التحمل:</span>
                          <span className="text-primary font-black">{node.phrase}</span>
                        </div>
                      </div>

                      {/* Narrator Name */}
                      <h5
                        className={cn(
                          'text-sm sm:text-base font-bold text-foreground transition-colors',
                          isLast && 'text-amber-900 dark:text-amber-300 font-extrabold text-base sm:text-lg',
                          isSahabi && 'text-emerald-900 dark:text-emerald-300 font-extrabold',
                          'group-hover:text-primary'
                        )}
                      >
                        {node.name}
                      </h5>

                      {isSahabi && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                          رضي الله عنه وأرضاه — صحابي جليل وناقل الحديث عن النبي ﷺ مباشرة
                        </p>
                      )}
                      {isLast && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium mt-1">
                          صلوات ربي وسلامه عليه — ينبوع الوحي والهداية للبشرية
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: STEPPER FLOW (السلسلة التفصيلية المتتابعة) */}
      {viewMode === 'stepper' && (
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
      )}

      {/* Raw Sanad Quotation Box */}
      <div className="p-4 sm:p-5 rounded-3xl bg-muted/20 border border-border/60 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Scroll className="size-4 text-primary" />
          <span>نص السند النبوي كما ساقه المصنف في الأصل:</span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm font-serif pr-6">
          « {isnadData.sanadText} »
        </p>
      </div>
    </div>
  );
}
