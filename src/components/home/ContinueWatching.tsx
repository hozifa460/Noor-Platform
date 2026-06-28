'use client';

import { History, ChevronLeft } from 'lucide-react';
import { MediaCard } from '@/components/media/MediaCard';
import { useContinueWatchingStore } from '@/stores/continue-watching.store';
import { useLibraryStore } from '@/stores/library.store';
import { useNavStore } from '@/stores/nav.store';

export function ContinueWatching() {
  const sessions = useContinueWatchingStore((s) => s.sessions);
  const items = useLibraryStore((s) => s.items);
  const setView = useNavStore((s) => s.setView);

  // Match sessions to items, exclude fully-watched (>95%)
  const recent = sessions
    .filter((s) => {
      if (!s.duration) return s.position > 5;
      const ratio = s.position / s.duration;
      return ratio > 0.02 && ratio < 0.95;
    })
    .slice(0, 12)
    .map((s) => items.find((i) => i.id === s.itemId))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  if (recent.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <History className="size-5 text-primary" />
          أكمل المشاهدة
        </h2>
        <button
          onClick={() => setView('history')}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          عرض الكل
          <ChevronLeft className="size-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {recent.map((item) => (
          <div key={item.id} className="w-64 sm:w-72 shrink-0">
            <MediaCard item={item} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
