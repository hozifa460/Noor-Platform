'use client';

import { Sparkles, Play, Volume2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/player.store';
import { getSheikhBadgeInfo } from '@/lib/shared/sheikh-badge';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FeaturedStationsRibbonProps {
  featuredRadios: MediaItem[];
}

export function FeaturedStationsRibbon({ featuredRadios }: FeaturedStationsRibbonProps) {
  const openPlayer = usePlayerStore((s) => s.open);
  const currentItem = usePlayerStore((s) => s.currentItem);

  if (featuredRadios.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-foreground font-bold text-base">
        <Sparkles className="size-4 text-emerald-500" />
        <span>إذاعات رئيسية مختارة ذات إقبال عالي</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {featuredRadios.map((radio) => {
          const isPlaying = currentItem?.id === radio.id;
          const { initials } = getSheikhBadgeInfo(radio.title);

          return (
            <button
              key={radio.id}
              onClick={() => openPlayer(radio)}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-2xl border text-right transition-all shrink-0 snap-start bg-card cursor-pointer',
                isPlaying
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5 shadow-md'
                  : 'border-border/80 hover:border-emerald-500/40 hover:bg-muted/30'
              )}
            >
              <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-950 text-emerald-200 grid place-items-center font-serif text-sm font-bold shadow-inner shrink-0">
                {isPlaying ? <Volume2 className="size-4 animate-pulse" /> : initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {radio.title}
                </p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {radio.sheikhName || 'بث مباشر عالي النقاوة'}
                </p>
              </div>
              <div className="size-7 rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-500 group-hover:text-white grid place-items-center transition-colors shrink-0">
                <Play className="size-3.5 fill-current" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
