'use client';

import { useState, useCallback } from 'react';
import type { DhikrItem, AdhkarCategory } from '../types';
import { toast } from 'sonner';

export function useDhikrCounter(initialCatalog?: AdhkarCategory[]) {
  const [counterMap, setCounterMap] = useState<Record<number, number>>(() => {
    if (!Array.isArray(initialCatalog) || initialCatalog.length === 0) return {};
    const map: Record<number, number> = {};
    for (const cat of initialCatalog) {
      if (!Array.isArray(cat?.array)) continue;
      for (const item of cat.array) {
        if (item && typeof item.id === 'number') {
          map[item.id] = item.count;
        }
      }
    }
    return map;
  });
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<number>>(new Set());

  const initializeCounters = useCallback((categories: AdhkarCategory[]) => {
    if (!Array.isArray(categories)) return;
    const initialCounts: Record<number, number> = {};
    for (const cat of categories) {
      if (!Array.isArray(cat?.array)) continue;
      for (const item of cat.array) {
        if (item && typeof item.id === 'number') {
          initialCounts[item.id] = item.count;
        }
      }
    }
    setCounterMap((prev) => {
      // If already populated, merge to preserve in-flight progress
      if (Object.keys(prev).length === 0) {
        return initialCounts;
      }
      return { ...initialCounts, ...prev };
    });
  }, []);

  const handleDecrement = useCallback((item: DhikrItem) => {
    if (!item || typeof item.id !== 'number') return;

    setCounterMap((prev) => {
      const current = prev[item.id] ?? item.count;
      if (current <= 0) return prev;

      const next = current - 1;
      if (next === 0) {
        setCompletedDhikrs((completedPrev) => {
          const updated = new Set(completedPrev);
          updated.add(item.id);
          return updated;
        });
        toast.success('تقبل الله طاعتكم وذكركم! تم إتمام هذا الذكر المبارك.');
      }

      return { ...prev, [item.id]: next };
    });

    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const resetCounter = useCallback((item: DhikrItem) => {
    if (!item || typeof item.id !== 'number') return;
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

