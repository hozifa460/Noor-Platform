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
import { cleanFatwaText } from '@/lib/fatwa/text';
import type { MediaItem } from '@/lib/types';
import type { FatwaContentResult } from '@/types/fatwa';
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

        <div className="flex items-center gap-1">
          {fatwa.audioUrl && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onListen(fatwa)}
              className="size-8 rounded-xl text-primary hover:bg-primary/10"
              title="استماع للتسجيل الصوتي"
            >
              <Headphones className="size-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onCopy(fatwa, displayQuestion, displayAnswer)}
            className="size-8 rounded-xl"
            title="نسخ الفتوى والجواب"
          >
            {isCopied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-1 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-start gap-2.5">
          <div className="size-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 grid place-items-center shrink-0 mt-0.5">
            <FileQuestion className="size-3.5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
            <ArabicHighlight text={displayQuestion} query={searchQuery} />
          </h3>
        </div>
      </div>

      {/* Answer Preview / Full view */}
      {displayAnswer && (
        <div className="pr-8 space-y-2">
          <div
            className={cn(
              'text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line',
              !isExpanded && 'line-clamp-3'
            )}
          >
            <strong className="text-foreground block mb-1">الجواب الشرعي:</strong>
            <ArabicHighlight text={displayAnswer} query={searchQuery} />
          </div>

          {/* Toggle Accordion */}
          {displayAnswer.length > 180 && (
            <button
              onClick={onToggleExpand}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <span>طي الفتوى</span>
                  <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  <span>قراءة الفتوى كاملة</span>
                  <ChevronDown className="size-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
