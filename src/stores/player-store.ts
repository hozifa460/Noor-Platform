'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';

interface PlayerState {
  currentItem: MediaItem | null;
  open: (item: MediaItem) => void;
  close: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentItem: null,
  open: (item) => set({ currentItem: item }),
  close: () => set({ currentItem: null }),
}));
