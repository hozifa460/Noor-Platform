'use client';

import { memo } from 'react';
import { Play, Pause, Copy, Check, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DhikrItem } from '../types';
import { cn } from '@/lib/utils';

interface DhikrCardProps {
  item: DhikrItem;
  remainingCount: number;
  isCompleted: boolean;
  onDecrement: (item: DhikrItem) => void;
  onReset: (item: DhikrItem) => void;
  isPlaying: boolean;
  onToggleAudio: (item: DhikrItem) => void;
  isCopied: boolean;
  onCopy: (item: DhikrItem) => void;
}

export const DhikrCard = memo(function DhikrCard({
  item,
  remainingCount,
  isCompleted,
  onDecrement,
  onReset,
  isPlaying,
  onToggleAudio,
  isCopied,
  onCopy,
}: DhikrCardProps) {
  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-3xl border transition-all duration-300 space-y-4 bg-card',
        isCompleted
          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-xs'
          : 'border-border/80 hover:border-emerald-500/40 shadow-xs'
      )}
    >
      {/* Top row: Counter status badge & Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge
            variant={isCompleted ? 'default' : 'secondary'}
            className={cn(
              'text-xs font-bold gap-1 px-3 py-1 rounded-xl',
              isCompleted && 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>تم إتمام التكرار ({item.count} مرات)</span>
              </>
            ) : (
              <span>
                متبقي: {remainingCount} من {item.count}
              </span>
            )}
          </Badge>

          {item.count > 1 && remainingCount < item.count && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReset(item)}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              title="إعادة ضبط العداد"
            >
              <RotateCcw className="size-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Audio Button */}
          {item.audio && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onToggleAudio(item)}
              className={cn(
                'size-8 rounded-xl',
                isPlaying
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={isPlaying ? 'إيقاف التلاوة' : 'استماع للذكر'}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
          )}

          {/* Copy Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onCopy(item)}
            className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
            title="نسخ الذكر"
          >
            {isCopied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Main Dhikr Text */}
      <div
        onClick={() => onDecrement(item)}
        className="cursor-pointer group/text select-text"
        title="انقر هنا للتسبيح واحتساب التكرار"
      >
        <p className="text-base sm:text-lg font-serif leading-loose text-foreground font-semibold">
          « {item.text} »
        </p>
      </div>

      {/* Interactive Decrement Bar / Button */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <Button
          size="sm"
          onClick={() => onDecrement(item)}
          disabled={isCompleted}
          className={cn(
            'flex-1 h-11 rounded-2xl font-bold text-xs sm:text-sm gap-2 transition-all',
            isCompleted
              ? 'bg-muted text-muted-foreground hover:bg-muted cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-98'
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="size-4" />
              <span>مكتمل بفضل الله</span>
            </>
          ) : (
            <>
              <span>سبّح (تبقى {remainingCount})</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
});
