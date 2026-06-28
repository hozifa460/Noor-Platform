'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { HistoryRecord } from '@/lib/types';

const HISTORY_LIMIT = 500;

interface HistoryState {
  history: HistoryRecord[];
  record: (rec: Omit<HistoryRecord, 'watchedAt'>) => void;
  clear: () => void;
  remove: (itemId: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      record: (rec) =>
        set((s) => {
          const watchedAt = Date.now();
          const filtered = s.history.filter((h) => h.itemId !== rec.itemId);
          return {
            history: [{ ...rec, watchedAt }, ...filtered].slice(0, HISTORY_LIMIT),
          };
        }),
      clear: () => set({ history: [] }),
      remove: (itemId) =>
        set((s) => ({ history: s.history.filter((h) => h.itemId !== itemId) })),
    }),
    {
      name: 'isp.history',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
