'use client';

import React, { useState } from 'react';
import { parseHadithIsnad } from '@/lib/hadith-isnad-engine';
import { findNarratorBio, type NarratorProfile } from '@/lib/hadith-narrator-engine';
import { NarratorBioModal } from './NarratorBioModal';
import { HadithIsnadCanvas } from './isnad/HadithIsnadCanvas';
import { HadithIsnadStepper } from './isnad/HadithIsnadStepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Copy,
  Check,
  Scroll,
  Network,
  ListTree,
  GitBranch,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';
import type { HadithItem } from '@/types/hadith';
import type { HadithBookMeta } from '@/lib/hadith-data';

interface HadithIsnadTreeProps {
  hadith?: HadithItem;
  book?: HadithBookMeta;
  arabic?: string;
  bookAuthor?: string;
  bookName?: string;
  hadithNumber?: number;
  grade?: string;
}

export function HadithIsnadTree(props: HadithIsnadTreeProps) {
  const arabicText = props.hadith ? props.hadith.arabic : props.arabic || '';
  const authorName = props.book ? props.book.authorAr : props.bookAuthor || 'الإمام';
  const bookTitle = props.book ? props.book.nameAr : props.bookName || 'ديوان الحديث';
  const hadithNo = props.hadith ? props.hadith.idInBook : props.hadithNumber;
  const gradeText = props.grade;

  const { copied, copy } = useClipboard();
  const [viewMode, setViewMode] = useState<'tree' | 'stepper'>('tree');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedBio, setSelectedBio] = useState<NarratorProfile | null>(null);

  const isnadData = React.useMemo(() => {
    return parseHadithIsnad(arabicText, authorName);
  }, [arabicText, authorName]);

  const handleCopySanad = () => {
    if (!isnadData.sanadText) return;
    const textToCopy = `« ${isnadData.sanadText} »\n\n[سند حديث رقم ${hadithNo || ''} - ${bookTitle}]\nدرجة الحديث: ${gradeText || 'محققة'}\nالمصدر: منصة النور`;
    copy(textToCopy, 'تم نسخ نص السند وسلسلة الرواة بنجاح');
  };


  const handleOpenBio = (narratorName: string) => {
    const profile = findNarratorBio(narratorName, authorName);
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
      {/* Top Header Card */}
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
            {gradeText && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[11px] font-bold',
                  gradeText === 'صحيح'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : gradeText === 'حسن'
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                )}
              >
                {gradeText}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            اضغط على أي راوٍ في الشجرة لاستعراض نسبه وحكم الجرح والتعديل وأقوال الأئمة فيه.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls */}
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

      {/* VIEW 1: Visual Tree Canvas */}
      {viewMode === 'tree' && (
        <HadithIsnadCanvas
          nodes={isnadData.nodes}
          zoomLevel={zoomLevel}
          onOpenBio={handleOpenBio}
        />
      )}

      {/* VIEW 2: Stepper Flow */}
      {viewMode === 'stepper' && (
        <HadithIsnadStepper
          nodes={isnadData.nodes}
          onOpenBio={handleOpenBio}
        />
      )}

      {/* Raw Sanad Quotation Box */}
      <div className="p-4 sm:p-5 rounded-3xl bg-muted/20 border border-border/60 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Scroll className="size-4 text-primary" />
          <span>نص السند النبوي كما ساقه المصنف في الأصل:</span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm font-serif pr-6 select-text">
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
