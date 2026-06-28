'use client';

import { Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaGrid } from '@/components/media/MediaGrid';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useLibraryStore } from '@/stores/library.store';

export function FavoritesView() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const clear = useFavoritesStore((s) => s.clear);
  const items = useLibraryStore((s) => s.items);

  const favItems = favorites
    .map((f) => items.find((i) => i.id === f.itemId))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Heart className="size-6 text-red-500" />
            المفضلة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{favItems.length} عنصر محفوظ</p>
        </div>
        {favItems.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear} className="gap-2 text-destructive">
            <Trash2 className="size-4" />
            مسح الكل
          </Button>
        )}
      </div>

      {favItems.length === 0 ? (
        <div className="py-20 text-center">
          <Heart className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">لم تقم بإضافة أي عنصر للمفضلة بعد</p>
        </div>
      ) : (
        <MediaGrid items={favItems} />
      )}
    </div>
  );
}
