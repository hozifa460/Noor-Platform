'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings } from '@/lib/types';

interface SettingsState extends AppSettings {
  setTheme: (theme: AppSettings['theme']) => void;
  setLanguage: (lang: AppSettings['language']) => void;
  setRtl: (rtl: boolean) => void;
  toggleRtl: () => void;
  toggleTheme: () => void;
  setAutoSync: (v: boolean) => void;
  setSyncIntervalMin: (v: number) => void;
  setPrefetch: (v: boolean) => void;
  setDataSaver: (v: boolean) => void;
  setDefaultQuality: (q: AppSettings['defaultQuality']) => void;
  /** Re-derive rtl from language automatically. */
  syncRtlFromLanguage: () => void;
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  language: 'ar',
  rtl: true,
  autoSync: true,
  syncIntervalMin: 10,
  prefetch: true,
  dataSaver: false,
  defaultQuality: 'auto',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) =>
        set({ language, rtl: language === 'ar' }),
      setRtl: (rtl) => set({ rtl }),
      toggleRtl: () => set({ rtl: !get().rtl }),
      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
      },
      setAutoSync: (autoSync) => set({ autoSync }),
      setSyncIntervalMin: (syncIntervalMin) => set({ syncIntervalMin }),
      setPrefetch: (prefetch) => set({ prefetch }),
      setDataSaver: (dataSaver) => set({ dataSaver }),
      setDefaultQuality: (defaultQuality) => set({ defaultQuality }),
      syncRtlFromLanguage: () => set({ rtl: get().language === 'ar' }),
    }),
    {
      name: 'isp.settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
