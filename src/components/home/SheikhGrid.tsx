'use client';

import { ChevronLeft } from 'lucide-react';
import { SheikhCard } from '@/components/sheikh/SheikhCard';
import { SheikhCardSkeleton } from '@/components/sheikh/SheikhCardSkeleton';
import { useLibraryStore } from '@/stores/library.store';
import { useNavStore } from '@/stores/nav.store';

interface SheikhGridProps {
  /** When true, show skeleton placeholders even if sheikhs list is empty. */
  loading?: boolean;
}

export function SheikhGrid({ loading = false }: SheikhGridProps) {
  const sheikhsList = useLibraryStore((s) => s.sheikhsArray);
  const setView = useNavStore((s) => s.setView);

  // Sort: main collections first, then by total items desc.
  const sheikhs = [...sheikhsList].sort((a, b) => {
    if (a.isMainCollection !== b.isMainCollection) return a.isMainCollection ? -1 : 1;
    return b.totalItems - a.totalItems;
  }).slice(0, 12);

  const showSkeletons = sheikhs.length === 0 && loading;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">المشايخ</h2>
        <button
          onClick={() => setView('sheikhs')}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          عرض الكل
          <ChevronLeft className="size-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sheikhs.map((s) => (
          <SheikhCard key={s.id} sheikh={s} />
        ))}
        {showSkeletons && (
          <>
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
            <SheikhCardSkeleton />
          </>
        )}
      </div>
    </section>
  );
}
