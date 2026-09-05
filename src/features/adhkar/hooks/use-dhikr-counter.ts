'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { DhikrItem, AdhkarCategory } from '../types';
import { toast } from 'sonner';

interface CounterState {
  counterMap: Record<number, number>;
  completedDhikrs: Set<number>;
  lastCompletedId: number | null;
  completionSeq: number;
}

type CounterAction =
  | { type: 'INIT'; categories: AdhkarCategory[] }
  | { type: 'DECREMENT'; item: DhikrItem }
  | { type: 'RESET'; item: DhikrItem };

function buildInitialMap(catalog?: AdhkarCategory[]): Record<number, number> {
  if (!Array.isArray(catalog) || catalog.length === 0) return {};
  const map: Record<number, number> = {};
  for (const cat of catalog) {
    if (!Array.isArray(cat?.array)) continue;
    for (const item of cat.array) {
      if (item && typeof item.id === 'number') {
        map[item.id] = item.count;
      }
    }
  }
  return map;
}

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'INIT': {
      if (!Array.isArray(action.categories)) return state;
      const initialCounts: Record<number, number> = {};
      for (const cat of action.categories) {
        if (!Array.isArray(cat?.array)) continue;
        for (const item of cat.array) {
          if (item && typeof item.id === 'number') {
            initialCounts[item.id] = item.count;
          }
        }
      }
      if (Object.keys(state.counterMap).length === 0) {
        return {
          ...state,
          counterMap: initialCounts,
        };
      }
      return {
        ...state,
        counterMap: { ...initialCounts, ...state.counterMap },
      };
    }

    case 'DECREMENT': {
      const { item } = action;
      if (!item || typeof item.id !== 'number') return state;

      const current = state.counterMap[item.id] ?? item.count;
      if (current <= 0) return state;

      const next = current - 1;
      const nextMap = { ...state.counterMap, [item.id]: next };

      if (next === 0) {
        const nextCompleted = new Set(state.completedDhikrs);
        nextCompleted.add(item.id);
        return {
          counterMap: nextMap,
          completedDhikrs: nextCompleted,
          lastCompletedId: item.id,
          completionSeq: state.completionSeq + 1,
        };
      }

      return {
        ...state,
        counterMap: nextMap,
      };
    }

    case 'RESET': {
      const { item } = action;
      if (!item || typeof item.id !== 'number') return state;

      const nextCompleted = new Set(state.completedDhikrs);
      nextCompleted.delete(item.id);

      return {
        counterMap: { ...state.counterMap, [item.id]: item.count },
        completedDhikrs: nextCompleted,
        lastCompletedId: null,
        completionSeq: state.completionSeq,
      };
    }

    default:
      return state;
  }
}

export function useDhikrCounter(initialCatalog?: AdhkarCategory[]) {
  const [state, dispatch] = useReducer(counterReducer, undefined, () => ({
    counterMap: buildInitialMap(initialCatalog),
    completedDhikrs: new Set<number>(),
    lastCompletedId: null,
    completionSeq: 0,
  }));

  const lastProcessedSeq = useRef<number>(0);

  // Pure effect for side effects: toast & haptics on verified completion transition
  useEffect(() => {
    if (state.completionSeq > lastProcessedSeq.current && state.lastCompletedId !== null) {
      lastProcessedSeq.current = state.completionSeq;
      toast.success('تقبل الله طاعتكم وذكركم! تم إتمام هذا الذكر المبارك.');
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          /* ignore */
        }
      }
    }
  }, [state.completionSeq, state.lastCompletedId]);

  const initializeCounters = useCallback((categories: AdhkarCategory[]) => {
    dispatch({ type: 'INIT', categories });
  }, []);

  const handleDecrement = useCallback((item: DhikrItem) => {
    dispatch({ type: 'DECREMENT', item });
  }, []);

  const resetCounter = useCallback((item: DhikrItem) => {
    dispatch({ type: 'RESET', item });
  }, []);

  return {
    counterMap: state.counterMap,
    completedDhikrs: state.completedDhikrs,
    initializeCounters,
    handleDecrement,
    resetCounter,
  };
}

