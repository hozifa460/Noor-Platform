'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PlaybackSession } from '@/lib/types';

const SESSIONS_LIMIT = 100;

interface ContinueWatchingState {
  sessions: PlaybackSession[];
  upsert: (session: PlaybackSession) => void;
  get: (itemId: string) => PlaybackSession | undefined;
  clear: () => void;
  remove: (itemId: string) => void;
}

export const useContinueWatchingStore = create<ContinueWatchingState>()(
  persist(
    (set, get) => ({
      sessions: [],
      upsert: (session) =>
        set((s) => {
          const filtered = s.sessions.filter((x) => x.itemId !== session.itemId);
          return {
            sessions: [session, ...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, SESSIONS_LIMIT),
          };
        }),
      get: (itemId) => get().sessions.find((x) => x.itemId === itemId),
      clear: () => set({ sessions: [] }),
      remove: (itemId) =>
        set((s) => ({ sessions: s.sessions.filter((x) => x.itemId !== itemId) })),
    }),
    {
      name: 'isp.continue',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
