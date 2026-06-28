'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DownloadRecord } from '@/lib/types';

interface DownloadsState {
  downloads: DownloadRecord[];
  add: (rec: DownloadRecord) => void;
  update: (itemId: string, patch: Partial<DownloadRecord>) => void;
  remove: (itemId: string) => void;
  get: (itemId: string) => DownloadRecord | undefined;
  clear: () => void;
}

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set, get) => ({
      downloads: [],
      add: (rec) =>
        set((s) => {
          const filtered = s.downloads.filter((d) => d.itemId !== rec.itemId);
          return { downloads: [rec, ...filtered] };
        }),
      update: (itemId, patch) =>
        set((s) => ({
          downloads: s.downloads.map((d) => (d.itemId === itemId ? { ...d, ...patch } : d)),
        })),
      remove: (itemId) =>
        set((s) => ({ downloads: s.downloads.filter((d) => d.itemId !== itemId) })),
      get: (itemId) => get().downloads.find((d) => d.itemId === itemId),
      clear: () => set({ downloads: [] }),
    }),
    {
      name: 'isp.downloads',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
