'use client';

import { Play, Pause, Copy, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AyahItem } from '@/types/quran';
import { cn } from '@/lib/utils';

interface AyahCardProps {
  ayah: AyahItem;
  isPlaying: boolean;
  onPlay: () => void;
  onOpenDetail: () => void;
  onCopy: (e: React.MouseEvent) => void;
  isCopied: boolean;
  fontSize: number;
  showTranslation: boolean;
  translationText?: string;
}

export function AyahCard({
  ayah,
  isPlaying,
  onPlay,
  onOpenDetail,
  onCopy,
  isCopied,
  fontSize,
  showTranslation,
  translationText,
}: AyahCardProps) {
  return (
    <div
      id={`ayah-${ayah.ayahNo}`}
      className={cn(
        'group relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 text-right',
        isPlaying
          ? 'bg-primary/5 border-primary/60 shadow-lg ring-2 ring-primary/20 -translate-y-0.5'
          : 'bg-card border-border/80 hover:border-primary/40 hover:shadow-sm'
      )}
    >
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'size-7 sm:size-8 rounded-full text-xs font-mono font-bold grid place-items-center border',
              isPlaying
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            {ayah.ayahNo}
          </span>
          {ayah.isSajdah && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
              سجدة تلاوة ۩
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onPlay}
            title={isPlaying ? 'إيقاف مؤقت' : 'استماع للآية'}
          >
            {isPlaying ? (
              <Pause className="size-4 text-primary" />
            ) : (
              <Play className="size-4 text-muted-foreground group-hover:text-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onOpenDetail}
            title="التفسير والإعراب والترجمة"
          >
            <BookOpen className="size-4 text-muted-foreground group-hover:text-primary" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onCopy}
            title="نسخ نص الآية"
          >
            {isCopied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4 text-muted-foreground group-hover:text-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Ayah Text */}
      <div
        className="font-serif leading-loose select-text cursor-pointer hover:text-primary transition-colors text-stone-900 dark:text-stone-100"
        style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 2.2}px` }}
        onClick={onOpenDetail}
      >
        {ayah.textAr}
        <span className="inline-block mx-2 text-primary font-mono text-base select-none">
          ﴿{ayah.ayahNo}﴾
        </span>
      </div>

      {/* Translation if enabled */}
      {showTranslation && (translationText || ayah.textEn) && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed text-left dir-ltr">
          {translationText || ayah.textEn}
        </div>
      )}
    </div>
  );
}
