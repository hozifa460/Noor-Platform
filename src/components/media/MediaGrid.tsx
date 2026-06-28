'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaCard } from './MediaCard';
import { Loader2 } from 'lucide-react';
import type { MediaItem } from '@/lib/types';

interface MediaGridProps {
  items: MediaItem[];
  variant?: 'default' | 'compact' | 'short';
  pageSize?: number;
  emptyMessage?: string;
}

/**
 * Infinite-scrolling grid of MediaCards.
 * Lazily mounts cards in pages of `pageSize` to keep DOM small.
 *
 * Note: we track an "epoch" via items identity so that switching to a new list
 * resets the visible counter without an effect.
 */
export function MediaGrid({ items, variant = 'default', pageSize = 24, emptyMessage = 'لا يوجد محتوى' }: MediaGridProps) {
  const [visibleByEpoch, setVisibleByEpoch] = useState<{ epoch: MediaItem[]; visible: number }>({ epoch: items, visible: pageSize });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Detect items array identity change → reset visible counter.
  if (visibleByEpoch.epoch !== items) {
    setVisibleByEpoch({ epoch: items, visible: pageSize });
  }
  const visible = visibleByEpoch.visible;

  const loadMore = useCallback(() => {
    setVisibleByEpoch((s) => ({ ...s, visible: Math.min(s.visible + pageSize, items.length) }));
  }, [items.length, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const shown = items.slice(0, visible);

  return (
    <div>
      <div
        className={
          variant === 'short'
            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
            : variant === 'compact'
              ? 'flex flex-col gap-3'
              : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
        }
      >
        {shown.map((item) => (
          <MediaCard key={item.id} item={item} variant={variant} />
        ))}
      </div>

      {visible < items.length && (
        <div ref={sentinelRef} className="py-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
