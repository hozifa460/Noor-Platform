'use client';

import React, { useState } from 'react';
import { parseHadithIsnad, type IsnadNode } from '@/lib/hadith-isnad-engine';
import { findNarratorBio, type NarratorProfile } from '@/lib/hadith-narrator-engine';
import { NarratorBioModal } from './NarratorBioModal';
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedBio, setSelectedBio] = useState<NarratorProfile | null>(null);

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

  const handleOpenBio = (narratorName: string) => {
    const profile = findNarratorBio(narratorName, bookAuthor);
    setSelectedBio(profile);
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
    <div className="space-y-5">
      {/* Top Header Card with View Mode Switcher & Zoom Controls */}
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
            اضغط على أي راوٍ في الشجرة لاستعراض نسبه وحكم الجرح والتعديل وأقوال الأئمة فيه.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls for Tree Mode */}
          {viewMode === 'tree' && (
            <div className="flex items-center p-1 bg-muted/40 rounded-2xl border border-border/70 gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="size-7 rounded-xl"
                title="تكبير الشجرة"
              >
                <ZoomIn className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                className="size-7 rounded-xl"
                title="تصغير الشجرة"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoomLevel(1)}
                className="size-7 rounded-xl"
                title="إعادة ضبط الحجم"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-muted/40 rounded-2xl border border-border/70">
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'tree'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="عرض الشجرة التفاعلية"
            >
              <GitBranch className="size-3.5 text-primary" />
              <span>شجرة الرواة</span>
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

      {/* VIEW 1: TRUE VISUAL TREE CANVAS (شجرة الرواة البصرية الحقيقية) */}
      {viewMode === 'tree' && (
        <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-card/95 via-muted/20 to-card/90 border border-border/80 shadow-xs overflow-x-auto overflow-y-hidden">
          {/* Subtle Islamic Geometric Watermark */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Interactive Zoom Scaler Container */}
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out',
            }}
            className="relative max-w-3xl mx-auto py-4"
          >
            {/* SVG Connecting Tree Trunk & Branches */}
            <div className="space-y-8 relative">
              {/* Continuous central spine connecting the nodes */}
              <div className="absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-1 bg-gradient-to-b from-primary/40 via-emerald-500/50 to-amber-500/60 rounded-full hidden sm:block pointer-events-none" />

              {isnadData.nodes.map((node: IsnadNode, idx: number) => {
                const isFirst = idx === 0;
                const isLast = idx === isnadData.nodes.length - 1;
                const isSahabi = node.role === 'الصحابي الجليل';
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={`${node.order}-${node.name}`}
                    onClick={() => handleOpenBio(node.name)}
                    className={cn(
                      'relative flex flex-col sm:flex-row items-center gap-4 transition-all cursor-pointer group',
                      isLast || isFirst
                        ? 'sm:justify-center'
                        : isEven
                        ? 'sm:flex-row-reverse sm:text-left'
                        : 'sm:flex-row sm:text-right'
                    )}
                  >
                    {/* Node Medallion (ختم الراوي / عقدة الشجرة) */}
                    <div
                      className={cn(
                        'relative z-20 size-15 sm:size-17 rounded-3xl grid place-items-center shrink-0 font-extrabold shadow-md transition-all duration-300 group-hover:scale-110',
                        isLast
                          ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white ring-8 ring-amber-500/25 shadow-amber-500/40 shadow-xl'
                          : isSahabi
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-6 ring-emerald-500/25 shadow-emerald-500/30 shadow-lg'
                          : isFirst
                          ? 'bg-primary text-primary-foreground ring-6 ring-primary/20 shadow-primary/25 shadow-md'
                          : 'bg-card text-foreground border-2 border-border/90 group-hover:border-primary group-hover:shadow-md'
                      )}
                    >
                      {isLast ? (
                        <Crown className="size-7 text-white animate-pulse" />
                      ) : isSahabi ? (
                        <Sparkles className="size-7 text-white" />
                      ) : isFirst ? (
                        <BookOpen className="size-7" />
                      ) : (
                        <User className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}

                      {/* Station order badge */}
                      <span
                        className={cn(
                          'absolute -bottom-2 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs',
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

                    {/* Branch Card (غصن الشجرة وبطاقة الراوي) */}
                    <div
                      className={cn(
                        'w-full sm:w-[calc(50%-48px)] p-4 sm:p-5 rounded-3xl border transition-all duration-300 relative shadow-2xs group-hover:shadow-md',
                        isLast
                          ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40 text-center sm:max-w-md ring-1 ring-amber-500/30'
                          : isSahabi
                          ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/40 ring-1 ring-emerald-500/25'
                          : isFirst
                          ? 'bg-primary/10 border-primary/30 text-center sm:max-w-md'
                          : 'bg-card/95 border-border/80 group-hover:bg-muted/30 group-hover:border-primary/50'
                      )}
                    >
                      {/* Leaf badge for Tahammul phrase & Role */}
                      <div className="flex items-center gap-2 flex-wrap mb-2 justify-between">
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

                      {/* Narrator Name with Clickable Info Hint */}
                      <div className="flex items-center justify-between gap-2">
                        <h5
                          className={cn(
                            'text-sm sm:text-base font-bold text-foreground transition-colors group-hover:text-primary',
                            isLast && 'text-amber-900 dark:text-amber-300 font-black text-base sm:text-lg',
                            isSahabi && 'text-emerald-900 dark:text-emerald-300 font-black'
                          )}
                        >
                          {node.name}
                        </h5>

                        <span className="text-[10px] text-muted-foreground group-hover:text-primary font-bold flex items-center gap-1 shrink-0 bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                          <Info className="size-3" />
                          <span>الترجمة</span>
                        </span>
                      </div>

                      {isSahabi && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                          رضي الله عنه وأرضاه — صحابي جليل وناقل الحديث عن النبي ﷺ
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
                <div
                  key={`${node.order}-${node.name}`}
                  onClick={() => handleOpenBio(node.name)}
                  className="relative flex items-start gap-3 sm:gap-4 group cursor-pointer"
                >
                  <div
                    className={cn(
                      'relative z-10 size-9 sm:size-10 rounded-2xl grid place-items-center shrink-0 font-extrabold text-xs shadow-xs transition-all group-hover:scale-105',
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

                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Info className="size-3 text-primary" />
                        <span>انقر للترجمة الكاملة</span>
                      </span>
                    </div>

                    <h5
                      className={cn(
                        'text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors',
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

      {/* Narrator Biographical Dossier Modal */}
      <NarratorBioModal
        profile={selectedBio}
        onClose={() => setSelectedBio(null)}
      />
    </div>
  );
}
