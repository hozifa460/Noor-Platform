'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FavoriteRecord } from '@/lib/types';

interface FavoritesState {
  favorites: FavoriteRecord[];
  isFavorite: (itemId: string) => boolean;
  add: (itemId: string) => void;
  remove: (itemId: string) => void;
  toggle: (itemId: string) => void;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isFavorite: (itemId) => get().favorites.some((f) => f.itemId === itemId),
      add: (itemId) =>
        set((s) =>
          s.favorites.some((f) => f.itemId === itemId)
            ? s
            : { favorites: [{ itemId, addedAt: Date.now() }, ...s.favorites] },
        ),
      remove: (itemId) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.itemId !== itemId) })),
      toggle: (itemId) =>
        set((s) =>
          s.favorites.some((f) => f.itemId === itemId)
            ? { favorites: s.favorites.filter((f) => f.itemId !== itemId) }
            : { favorites: [{ itemId, addedAt: Date.now() }, ...s.favorites] },
        ),
      clear: () => set({ favorites: [] }),
    }),
    {
      name: 'isp.favorites',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
