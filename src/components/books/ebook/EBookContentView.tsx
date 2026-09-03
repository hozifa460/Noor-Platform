'use client';

import { Sparkles, FileText, Copy, Highlighter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FONT_CLASSES,
  filterTashkeel,
  type BookChapterChunk,
  type SectionParagraph,
  type TashkeelMode,
  type FontFamily,
  type EBookMetaResponse,
} from './types';

interface EBookContentViewProps {
  chunkData: BookChapterChunk | null;
  metaRes: EBookMetaResponse | null;
  tashkeel: TashkeelMode;
  fontFamily: FontFamily;
  fontSize: number;
  highlightTerm: string;
  onCopyCitation: (text: string, pageNum: number) => void;
  onHighlightParagraph: (p: SectionParagraph, color: 'yellow' | 'green' | 'blue' | 'pink') => void;
  onGoToStart: () => void;
  onOpenToc: () => void;
}

export function EBookContentView({
  chunkData,
  metaRes,
  tashkeel,
  fontFamily,
  fontSize,
  highlightTerm,
  onCopyCitation,
  onHighlightParagraph,
  onGoToStart,
  onOpenToc,
}: EBookContentViewProps) {
  if (!chunkData) {
    return (
      <div className="py-24 text-center space-y-4 animate-in fade-in duration-300">
        <div className="size-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
          <BookOpen className="size-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground">تعذر جلب صفحات هذا الباب مباشرة</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          يمكنك الانتقال إلى أول الكتاب أو اختيار أي باب آخر من الفهرس الهرمي الجانبي.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={onGoToStart}
            className="rounded-xl font-bold"
          >
            الانتقال إلى بداية الكتاب
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenToc}
            className="rounded-xl"
          >
            فتح الفهرس
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className={cn('space-y-6', FONT_CLASSES[fontFamily])}>
      {/* Chapter Header Banner */}
      <div className="text-center py-8 border-b-2 border-amber-500/20 mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <span>الباب {chunkData.chapterIndex}</span>
          <span>•</span>
          <span>ص {chunkData.startPage} إلى {chunkData.endPage}</span>
          {metaRes?.meta.totalVolumes && metaRes.meta.totalVolumes > 1 && (
            <>
              <span>•</span>
              <span>المجلد {metaRes.meta.totalVolumes}</span>
            </>
          )}
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-900 dark:text-amber-200">
          ❖ {chunkData.title} ❖
        </h2>
        <p className="text-xs opacity-60">
          عدد الكلمات في هذا الباب: {chunkData.wordCount.toLocaleString('ar-SA')} كلمة
        </p>
      </div>

      {/* Paragraphs Render */}
      {chunkData.paragraphs.map((p) => {
        const textFormatted = filterTashkeel(p.text, tashkeel);
        const isSearchMatch =
          Boolean(highlightTerm) &&
          textFormatted.toLowerCase().includes(highlightTerm.toLowerCase());

        // 1. Poetry Verses
        if (p.isPoetry || p.hemistich1 || p.hemistich2) {
          return (
            <div
              key={p.id}
              className="my-6 py-4 px-6 rounded-2xl bg-amber-500/[0.04] dark:bg-amber-400/[0.03] border border-amber-500/15 max-w-2xl mx-auto shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 items-center text-center">
                <div
                  className="font-medium text-right sm:text-center text-amber-950 dark:text-amber-200"
                  style={{ fontSize: `${Math.max(16, fontSize - 2)}px` }}
                >
                  {filterTashkeel(p.hemistich1 || p.text, tashkeel)}
                </div>
                <div
                  className="font-medium text-left sm:text-center text-amber-950 dark:text-amber-200"
                  style={{ fontSize: `${Math.max(16, fontSize - 2)}px` }}
                >
                  {filterTashkeel(p.hemistich2 || '', tashkeel)}
                </div>
              </div>
              {p.volumePageBadge && (
                <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-amber-500/10 text-[10px] opacity-60 font-mono">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>{p.volumePageBadge}</span>
                </div>
              )}
            </div>
          );
        }

        // 2. Section Headings
        if (p.isHeading) {
          return (
            <div key={p.id} className="pt-8 pb-3 border-b border-amber-500/20 my-4">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-lg">§</span>
                <h3
                  className={cn(
                    'font-bold text-amber-800 dark:text-amber-300',
                    p.headingLevel === 1 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
                  )}
                >
                  {textFormatted}
                </h3>
              </div>
            </div>
          );
        }

        // 3. Classical Paragraph / Matn / Sanad
        return (
          <div
            key={p.id}
            className="group relative text-justify leading-loose my-4 transition-colors rounded-xl p-3 -mx-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
          >
            <p
              className={cn(
                'transition-colors leading-[2.2]',
                p.isHadithSanad && 'font-medium text-amber-950/90 dark:text-amber-100/90',
                isSearchMatch && 'bg-amber-300/40 dark:bg-amber-500/30 p-1.5 rounded-lg font-medium'
              )}
              style={{ fontSize: `${fontSize}px` }}
            >
              {p.volumePageBadge && (
                <span className="inline-block ms-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-current/5 text-muted-foreground align-middle select-none">
                  {p.volumePageBadge}
                </span>
              )}
              {textFormatted}
            </p>

            {/* Footnotes & Tahqiq Box */}
            {p.footnotes && p.footnotes.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.05] dark:bg-amber-400/[0.04] border-r-2 border-amber-500/40 text-xs space-y-1 select-text">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px] mb-1">
                  <FileText className="size-3" />
                  <span>الحواشي والتحقيق:</span>
                </div>
                {p.footnotes.map((fn, fIdx) => (
                  <p key={fIdx} className="text-muted-foreground leading-relaxed text-[12px] whitespace-pre-wrap">
                    {filterTashkeel(fn.text, tashkeel)}
                  </p>
                ))}
              </div>
            )}

            {/* Page Number & Hover Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between pt-1 border-t border-current/5 text-[11px] text-muted-foreground">
              <span className="font-mono text-[10px] opacity-70">
                {p.volumePageBadge || `[ ص ${p.pageNumber} ]`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCopyCitation(p.text, p.pageNumber)}
                  className="p-1 hover:text-amber-500 rounded flex items-center gap-1"
                  title="نسخ مع العزو والتوثيق"
                >
                  <Copy className="size-3" />
                  <span className="text-[10px]">نسخ</span>
                </button>
                <button
                  onClick={() => onHighlightParagraph(p, 'yellow')}
                  className="p-1 hover:text-amber-500 rounded flex items-center gap-1"
                  title="تظليل وحفظ الفائدة"
                >
                  <Highlighter className="size-3 text-amber-500" />
                  <span className="text-[10px]">تظليل</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </article>
  );
}
