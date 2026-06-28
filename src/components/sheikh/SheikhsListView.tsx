'use client';

import { useState, useMemo } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SheikhCard } from '@/components/sheikh/SheikhCard';
import { SheikhCardSkeleton } from '@/components/sheikh/SheikhCardSkeleton';
import { useLibraryStore } from '@/stores/library.store';

export function SheikhsListView() {
  const sheikhsList = useLibraryStore((s) => s.sheikhsArray);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const [query, setQuery] = useState('');

  const isLoading = sheikhsList.length === 0 && (syncing || !lastSync);

  const filtered = useMemo(() => {
    const list = sheikhsList;
    if (!query.trim()) return [...list].sort((a, b) => {
      if (a.isMainCollection !== b.isMainCollection) return a.isMainCollection ? -1 : 1;
      return b.totalItems - a.totalItems;
    });
    const q = query.trim().toLowerCase();
    return list
      .filter((s) => s.name.toLowerCase().includes(q))
      .sort((a, b) => b.totalItems - a.totalItems);
  }, [sheikhsList, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="size-6 text-primary" />
          المشايخ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? 'جاري التحميل...' : `${filtered.length} شيخ`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن شيخ..."
          className="pr-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <SheikhCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          {query ? 'لا توجد نتائج' : 'لم يتم تحميل أي شيخ بعد'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((s) => <SheikhCard key={s.id} sheikh={s} />)}
        </div>
      )}
    </div>
  );
}
