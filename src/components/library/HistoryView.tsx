'use client';

import { History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaCard } from '@/components/media/MediaCard';
import { useHistoryStore } from '@/stores/history.store';
import { useLibraryStore } from '@/stores/library.store';

export function HistoryView() {
  const history = useHistoryStore((s) => s.history);
  const clear = useHistoryStore((s) => s.clear);
  const items = useLibraryStore((s) => s.items);

  const historyItems = history
    .map((h) => items.find((i) => i.id === h.itemId))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  // Group by day
  const groups = new Map<string, typeof historyItems>();
  for (const item of historyItems) {
    const date = new Date(item.publishedAt || Date.now());
    const key = date.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <History className="size-6 text-primary" />
            سجل المشاهدة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{historyItems.length} عنصر</p>
        </div>
        {historyItems.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear} className="gap-2 text-destructive">
            <Trash2 className="size-4" />
            مسح السجل
          </Button>
        )}
      </div>

      {historyItems.length === 0 ? (
        <div className="py-20 text-center">
          <History className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">لا يوجد سجل مشاهدات بعد</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, dayItems]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">{day}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dayItems.map((item) => <MediaCard key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
