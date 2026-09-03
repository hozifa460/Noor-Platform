'use client';

import { Volume2, VolumeX, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArabicHighlight } from '@/components/shared/ArabicHighlight';
import type { HadithItem } from '@/types/hadith';
import type { HadithBookMeta } from '@/lib/hadith/data';

interface HadithMatnTabProps {
  hadith: HadithItem;
  book: HadithBookMeta;
  highlightQuery?: string;
  fontSize: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  gradeBadge: {
    grade: string;
    badgeColor?: string;
    rawGrade?: string;
  };
}

export function HadithMatnTab({
  hadith,
  book: _book,
  highlightQuery,
  fontSize,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isSpeaking,
  onToggleSpeech,
  gradeBadge,
}: HadithMatnTabProps) {
  return (
    <div className="space-y-4">
      {/* Top action bar: Font controls & TTS */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/30 border border-border/80 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isSpeaking ? 'default' : 'outline'}
            onClick={onToggleSpeech}
            className="gap-2 rounded-xl text-xs font-bold"
          >
            {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4 text-primary" />}
            <span>{isSpeaking ? 'إيقاف القراءة' : 'استماع للمتن الشريف'}</span>
          </Button>

          <Badge variant="outline" className="text-xs font-bold">
            {gradeBadge.rawGrade || gradeBadge.grade}
          </Badge>
        </div>

        {/* Font size zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onZoomIn}
            className="size-8 rounded-lg"
            title="تكبير الخط"
          >
            <ZoomIn className="size-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground px-1">{fontSize}px</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onZoomOut}
            className="size-8 rounded-lg"
            title="تصغير الخط"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onResetZoom}
            className="size-8 rounded-lg text-muted-foreground"
            title="إعادة ضبط حجم الخط"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Matn Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xs space-y-6">
        <p
          className="font-serif leading-[2.6] sm:leading-[2.8] text-foreground text-right select-text"
          style={{ fontSize: `${fontSize}px` }}
        >
          <ArabicHighlight text={hadith.arabic} query={highlightQuery} />
        </p>

        {hadith.english?.text && (
          <div className="pt-4 border-t border-border/60 text-xs sm:text-sm text-muted-foreground leading-relaxed text-left dir-ltr">
            {hadith.english.narrator && (
              <span className="font-bold block mb-1 text-foreground">
                Narrated {hadith.english.narrator}:
              </span>
            )}
            <p>{hadith.english.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
