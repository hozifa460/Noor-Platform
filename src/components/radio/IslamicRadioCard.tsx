'use client';

import { useMemo } from 'react';
import { Volume2, Play } from 'lucide-react';
import { usePlayerStore } from '@/stores/player.store';
import { getSheikhBadgeInfo } from '@/lib/shared/sheikh-badge';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IslamicRadioCardProps {
  radio: MediaItem;
}

export function IslamicRadioCard({ radio }: IslamicRadioCardProps) {
  const openPlayer = usePlayerStore((s) => s.open);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const isPlaying = currentItem?.id === radio.id;

  const { initials, gradientClass, displayName } = useMemo(
    () => getSheikhBadgeInfo(radio.title),
    [radio.title]
  );

  return (
    <div
      onClick={() => openPlayer(radio)}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer text-right bg-card hover:shadow-xl hover:-translate-y-1',
        isPlaying
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
          : 'border-border hover:border-emerald-500/50'
      )}
    >
      {/* Top Visual Area */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
        {radio.imageUrl ? (
          <img
            src={radio.imageUrl}
            alt={radio.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0 size-full bg-gradient-to-br flex flex-col items-center justify-center p-4',
              gradientClass
            )}
          >
            <div className="relative size-16 sm:size-20 rounded-full border border-white/20 bg-white/10 backdrop-blur-md grid place-items-center shadow-inner">
              <span className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wider select-none">
                {initials}
              </span>
            </div>
            <span className="text-[11px] font-semibold mt-2 opacity-90 truncate max-w-[90%] font-serif">
              {displayName}
            </span>
          </div>
        )}

        {/* Live / Playing indicator */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
          <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>مباشر</span>
        </div>

        {/* Play Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="size-11 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            {isPlaying ? <Volume2 className="size-5 animate-pulse" /> : <Play className="size-5 fill-white" />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {radio.title}
          </h3>
          {radio.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {radio.description}
            </p>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate max-w-[70%]">{radio.sheikhName || 'إذاعة القرآن'}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            {isPlaying ? 'جاري البث' : 'تشغيل الآن'}
          </span>
        </div>
      </div>
    </div>
  );
}
