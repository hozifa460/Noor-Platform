'use client';

import { FileQuestion, ChevronLeft, BookOpen } from 'lucide-react';
import { usePlayerStore } from '@/stores/player.store';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FatwaCardProps {
  item: MediaItem;
}

/**
 * Lightweight card for fatwa items.
 *
 * Fatwa items have very long titles (often full questions), so this card
 * uses a different layout than MediaCard: it leads with the question text,
 * shows the sheikh name and source as metadata, and is much more compact
 * vertically (no thumbnail) so we can fit dozens on screen without lag.
 *
 * Clicking opens a reader modal that shows the full question + answer.
 */
export function FatwaCard({ item }: FatwaCardProps) {
  const open = usePlayerStore((s) => s.open);

  // Even text-only fatwas open the player — MediaPlayer renders a special
  // fatwa view (no video/audio, just the question + answer text).
  const hasContent = !!(item.title || item.description || item.answer);

  return (
    <button
      onClick={() => hasContent && open(item)}
      disabled={!hasContent}
      className={cn(
        'group relative w-full text-right rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors p-4',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        !hasContent && 'opacity-60 cursor-default',
      )}
      aria-label={`فتوى: ${item.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
          <FileQuestion className="size-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-relaxed line-clamp-3 text-foreground">
            {item.title}
          </p>

          {/* Metadata row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {item.sheikhName && (
              <span className="font-medium text-foreground/80">{item.sheikhName}</span>
            )}
            {item.groupTitle && (
              <span className="truncate max-w-[160px]">· {item.groupTitle}</span>
            )}
            {item.publishedAt && (
              <span>· {formatDate(item.publishedAt)}</span>
            )}
            {item.answer && (
              <span className="inline-flex items-center gap-1 text-primary/80">
                · <BookOpen className="size-3" /> جواب متوفر
              </span>
            )}
          </div>

          {/* Optional short description excerpt */}
          {item.description && (
            <p className="mt-1.5 text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Arrow */}
        {hasContent && (
          <ChevronLeft className="shrink-0 size-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
        )}
      </div>
    </button>
  );
}

/** Format an ISO date as `YYYY/MM/DD` (Hijri-style numerals — Arabic-Indic for visual consistency). */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return '';
  }
}
