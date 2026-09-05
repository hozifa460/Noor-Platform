'use client';

import {
  FileQuestion,
  User,
  Copy,
  Check,
  Headphones,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArabicHighlight } from '@/components/shared/ArabicHighlight';
import { cleanFatwaText } from '../engines/text';
import type { MediaItem } from '@/lib/types';
import type { FatwaContentResult } from '../types';
import { cn } from '@/lib/utils';

interface FatwaCardProps {
  fatwa: MediaItem;
  searchQuery: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isCopied: boolean;
  onCopy: (fatwa: MediaItem, question: string, answer: string) => void;
  onListen: (fatwa: MediaItem) => void;
  content?: FatwaContentResult;
}

export function FatwaCard({
  fatwa,
  searchQuery,
  isExpanded,
  onToggleExpand,
  isCopied,
  onCopy,
  onListen,
  content,
}: FatwaCardProps) {
  const displayQuestion = cleanFatwaText(content?.question || fatwa.title);
  const displayAnswer = cleanFatwaText(content?.answer || fatwa.description || '');

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border/80 hover:border-primary/40 transition-all duration-300 shadow-xs space-y-4">
      {/* Top badges & actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {fatwa.sheikhName && (
            <Badge
              variant="outline"
              className="text-xs font-bold gap-1 bg-muted/40 border-border/80 text-foreground"
            >
              <User className="size-3 text-primary" />
              <span>{fatwa.sheikhName}</span>
            </Badge>
          )}
          {fatwa.islamicArt && (
            <Badge variant="secondary" className="text-[11px] font-semibold">
              {fatwa.islamicArt}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {fatwa.audioUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onListen(fatwa)}
              className="h-8 px-2.5 rounded-xl text-xs gap-1.5 text-primary hover:bg-primary/10 cursor-pointer"
            >
              <Headphones className="size-3.5" />
              <span>استماع</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(fatwa, displayQuestion, displayAnswer)}
            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-bold">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>نسخ</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Question / Title */}
      <div className="space-y-1">
        <div className="flex items-start gap-2.5">
          <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 mt-0.5">
            <FileQuestion className="size-4" />
          </div>
          <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
            <ArabicHighlight text={cleanFatwaText(fatwa.title)} query={searchQuery} />
          </h3>
        </div>
      </div>

      {/* Answer content (collapsible) */}
      <div className="pt-2 border-t border-border/60">
        <div
          className={cn(
            'text-xs sm:text-sm text-muted-foreground leading-relaxed transition-all duration-300 whitespace-pre-line',
            !isExpanded && 'line-clamp-2'
          )}
        >
          {displayAnswer ? (
            <ArabicHighlight text={displayAnswer} query={searchQuery} />
          ) : (
            <span className="text-muted-foreground/60 italic">انقر لعرض تفاصيل الفتوى والجواب الشافي...</span>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggleExpand}
          className="mt-2.5 flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          <span>{isExpanded ? 'طي الفتوى' : 'قراءة الفتوى كاملة'}</span>
          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
