'use client';

import { useState, useCallback } from 'react';
import type { DhikrItem, AdhkarCategory } from '@/types/adhkar';
import { toast } from 'sonner';

export function useDhikrCounter(_catalog?: AdhkarCategory[]) {
  const [counterMap, setCounterMap] = useState<Record<number, number>>({});
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<number>>(new Set());

  const initializeCounters = useCallback((categories: AdhkarCategory[]) => {
    const initialCounts: Record<number, number> = {};
    for (const cat of categories) {
      for (const item of cat.array) {
        initialCounts[item.id] = item.count;
      }
    }
    setCounterMap(initialCounts);
  }, []);

  const handleDecrement = useCallback(
    (item: DhikrItem) => {
      const current = counterMap[item.id] ?? item.count;
      if (current <= 0) return;

      const next = current - 1;
      setCounterMap((prev) => ({ ...prev, [item.id]: next }));

      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          /* ignore */
        }
      }

      if (next === 0) {
        setCompletedDhikrs((prev) => new Set(prev).add(item.id));
        toast.success('تقبل الله طاعتكم وذكركم! تم إتمام هذا الذكر المبارك.');
      }
    },
    [counterMap]
  );

  const resetCounter = useCallback((item: DhikrItem) => {
    setCounterMap((prev) => ({ ...prev, [item.id]: item.count }));
    setCompletedDhikrs((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }, []);

  return {
    counterMap,
    completedDhikrs,
    initializeCounters,
    handleDecrement,
    resetCounter,
  };
}
