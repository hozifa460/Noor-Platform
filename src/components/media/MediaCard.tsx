'use client';

import { Play, Headphones, Radio, FileText, Youtube, Clock, Heart, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/player.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useContinueWatchingStore } from '@/stores/continue-watching.store';
import { triggerDownload } from '@/lib/download';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  item: MediaItem;
  variant?: 'default' | 'compact' | 'short';
}

function formatDuration(s?: number): string | null {
  if (!s || s < 1) return null;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function MediaCard({ item, variant = 'default' }: MediaCardProps) {
  const open = usePlayerStore((s) => s.open);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const sessions = useContinueWatchingStore((s) => s.sessions);
  const session = sessions.find((s) => s.itemId === item.id);

  const hasVideo = !!(item.videoUrl || item.youtubeUrl);
  const isAudio = !hasVideo && !!item.audioUrl && !item.pdfUrl && !item.liveUrl;
  const isLive = !!item.liveUrl && !item.videoUrl;
  const isPdf = !!item.pdfUrl;
  const isShort = item.section === 'shorts' || variant === 'short';

  const progress = session?.duration && session.duration > 0 && session.position
    ? Math.min(100, (session.position / session.duration) * 100)
    : 0;

  const Icon = isLive ? Radio : isAudio ? Headphones : isPdf ? FileText : hasVideo ? Play : Play;
  const SourceIcon = item.youtubeUrl ? Youtube : null;

  if (isShort || variant === 'short') {
    return (
      <div className="group relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-muted text-right focus:outline-none focus-within:ring-2 focus-within:ring-primary">
        <button
          onClick={() => open(item)}
          className="absolute inset-0 w-full h-full"
          aria-label={`تشغيل: ${item.title}`}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
          ) : item.emoji ? (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-5xl" aria-hidden>{item.emoji}</span>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/20 to-accent/20">
              <Icon className="size-12 text-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {isLive && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full pulse-live">
              <Radio className="size-2.5" /> مباشر
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 p-3 text-white">
            <p className="text-xs font-semibold line-clamp-2 leading-tight">{item.title}</p>
            {item.sheikhName && <p className="text-[10px] opacity-80 mt-1">{item.sheikhName}</p>}
          </div>
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="size-12 rounded-full bg-white/95 grid place-items-center shadow-lg">
              <Play className="size-5 text-black fill-black mr-0.5" />
            </div>
          </div>
        </button>
        {/* Download button for shorts */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerDownload(item, isAudio ? 'audio' : 'video');
          }}
          className="absolute top-2 left-2 size-7 rounded-full grid place-items-center backdrop-blur bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="تنزيل"
          title="تنزيل"
        >
          <Download className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all',
        'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
        variant === 'compact' && 'flex gap-3',
      )}
    >
      <button
        onClick={() => open(item)}
        className={cn(
          'block text-right w-full',
          variant === 'compact' ? 'shrink-0' : 'w-full',
        )}
        aria-label={`تشغيل: ${item.title}`}
      >
        <div className={cn(
          'relative overflow-hidden bg-muted',
          variant === 'compact' ? 'w-32 h-20 sm:w-40 sm:h-24' : 'aspect-video w-full',
        )}>
          {item.imageUrl ? (
             
            <img src={item.imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : item.emoji ? (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/15 to-accent/15">
              <span className="text-3xl sm:text-4xl" aria-hidden>{item.emoji}</span>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/15 to-accent/15">
              <Icon className="size-10 text-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {isLive && (
              <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0 pulse-live">
                <Radio className="size-2.5" /> مباشر
              </Badge>
            )}
            {SourceIcon && (
              <Badge className="gap-1 text-[10px] px-1.5 py-0 bg-red-600 hover:bg-red-600">
                <SourceIcon className="size-2.5" />
              </Badge>
            )}
          </div>

          {item.duration && (
            <Badge variant="secondary" className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0 font-mono bg-black/75 text-white hover:bg-black/75">
              {formatDuration(item.duration)}
            </Badge>
          )}

          {/* Continue-watching progress */}
          {progress > 0 && progress < 99 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="size-12 rounded-full bg-white/95 grid place-items-center shadow-xl">
              <Play className="size-5 text-black fill-black mr-0.5" />
            </div>
          </div>
        </div>

        {variant !== 'compact' && (
          <div className="p-3">
            <h3 className="font-semibold text-sm line-clamp-2 leading-snug mb-1">{item.title}</h3>
            {item.sheikhName && (
              <p className="text-xs text-muted-foreground line-clamp-1">{item.sheikhName}</p>
            )}
            {item.description && variant === 'default' && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1.5">{item.description}</p>
            )}
          </div>
        )}
      </button>

      {variant === 'compact' && (
        <div className="flex-1 py-2 pl-2 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{item.title}</h3>
          {item.sheikhName && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.sheikhName}</p>
          )}
          {item.duration && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
              <Clock className="size-3" /> {formatDuration(item.duration)}
            </p>
          )}
        </div>
      )}

      {/* Quick action buttons (favorite + download) */}
      <div className="absolute top-2 left-2 flex flex-col gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerDownload(item, isAudio ? 'audio' : 'video');
          }}
          className={cn(
            'size-8 rounded-full grid place-items-center backdrop-blur',
            'bg-black/40 text-white hover:bg-black/60 transition-colors',
            variant === 'compact' && 'size-7',
          )}
          aria-label="تنزيل"
          title="تنزيل"
        >
          <Download className="size-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          className={cn(
            'size-8 rounded-full grid place-items-center backdrop-blur',
            'bg-black/40 text-white hover:bg-black/60 transition-colors',
            variant === 'compact' && 'size-7',
          )}
          aria-label={isFavorite(item.id) ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
        >
          <Heart className={cn('size-4', isFavorite(item.id) && 'fill-red-500 text-red-500')} />
        </button>
      </div>
    </div>
  );
}
