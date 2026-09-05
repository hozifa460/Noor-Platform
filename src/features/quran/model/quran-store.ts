'use client';

import { create } from 'zustand';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  WARSH_AYAH_RECITERS,
  QURAN_RECITERS,
  type SurahMeta,
  type QiraahMeta,
  type QuranTranslationMeta,
  type AyahItem,
  type SurahDetail,
  type ReciterMeta,
} from '../domain';
import type { MediaItem } from '@/lib/types';


interface QuranState {
  activeQiraah: QiraahMeta;
  activeSurah: SurahMeta;
  surahData: SurahDetail | null;
  activeTranslation: QuranTranslationMeta | null;
  activeReciter: ReciterMeta;
  viewMode: 'mushaf-real' | 'interactive' | 'pdf-page';
  fontSize: number; // 22 to 50
  showTranslation: boolean;
  showTafsir: boolean;
  activeTafsirAyah: AyahItem | null;

  // Audio Playback
  currentPlayingAyah: number | null;
  isPlayingAudio: boolean;
  autoPlayNext: boolean;

  // Surah browser
  searchQuery: string;
  filterType: 'all' | 'Meccan' | 'Medinan';
  filterJuz: number | 'all';
  loadingSurah: boolean;

  // Actions
  setActiveQiraah: (q: QiraahMeta) => void;
  setActiveSurah: (s: SurahMeta) => void;
  nextSurah: () => void;
  prevSurah: () => void;
  setActiveTranslation: (t: QuranTranslationMeta | null) => void;
  setActiveReciter: (r: ReciterMeta) => void;
  setViewMode: (v: 'mushaf-real' | 'interactive' | 'pdf-page') => void;
  setFontSize: (size: number) => void;
  toggleTranslation: () => void;
  openTafsirForAyah: (ayah: AyahItem | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterType: (f: 'all' | 'Meccan' | 'Medinan') => void;
  setFilterJuz: (juz: number | 'all') => void;
  loadSurah: (surahNumber: number) => Promise<void>;
  getFilteredSurahs: () => SurahMeta[];
  getCurrentMushafMediaItem: () => MediaItem;

  // Audio actions
  playAyah: (ayahNo: number) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  playNextAyah: () => void;
}

const surahMemoryCache = new Map<number, SurahDetail>();

export const useQuranStore = create<QuranState>((set, get) => ({
  activeQiraah: QIRAAT_LIST[0], // مصحف حفص عن عاصم
  activeSurah: ALL_SURAHS[0], // سورة الفاتحة
  surahData: null,
  activeTranslation: QURAN_TRANSLATIONS[0], // English Saheeh
  activeReciter: QURAN_RECITERS[0], // الشيخ محمد صديق المنشاوي (مرتل)
  viewMode: 'mushaf-real', // Real Mus-haf Page by Default!
  fontSize: 32,
  showTranslation: false,
  showTafsir: false,
  activeTafsirAyah: null,

  currentPlayingAyah: null,
  isPlayingAudio: false,
  autoPlayNext: true,

  searchQuery: '',
  filterType: 'all',
  filterJuz: 'all',
  loadingSurah: false,

  setActiveQiraah: (activeQiraah) => {
    // If switching to Warsh, default to Warsh verse reciter; else default to Hafs
    if (activeQiraah.id === 'warsh') {
      set({ activeQiraah, activeReciter: WARSH_AYAH_RECITERS[0] });
    } else {
      set({ activeQiraah, activeReciter: QURAN_RECITERS[0] });
    }
  },

  setActiveSurah: (activeSurah) => {
    set({ activeSurah, currentPlayingAyah: null, isPlayingAudio: false });
    get().loadSurah(activeSurah.number);
  },

  nextSurah: () => {
    const { activeSurah } = get();
    if (activeSurah.number < 114) {
      const next = ALL_SURAHS[activeSurah.number]; // 0-indexed: index = number
      get().setActiveSurah(next);
    }
  },

  prevSurah: () => {
    const { activeSurah } = get();
    if (activeSurah.number > 1) {
      const prev = ALL_SURAHS[activeSurah.number - 2];
      get().setActiveSurah(prev);
    }
  },

  setActiveTranslation: (activeTranslation) => set({ activeTranslation }),
  setActiveReciter: (activeReciter) => set({ activeReciter }),
  setViewMode: (viewMode) => set({ viewMode }),
  setFontSize: (fontSize) => set({ fontSize }),
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  openTafsirForAyah: (activeTafsirAyah) => set({ activeTafsirAyah, showTafsir: Boolean(activeTafsirAyah) }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setFilterJuz: (filterJuz) => set({ filterJuz }),

  loadSurah: async (surahNumber: number) => {
    // 1. Instant 0ms return if already loaded in memory
    const memoryCached = surahMemoryCache.get(surahNumber);
    if (memoryCached) {
      set({ surahData: memoryCached, loadingSurah: false });
      return;
    }

    set({ loadingSurah: true });
    
    // 2. High-speed local Edge asset (now committed and served by Vercel / Cloudflare CDN)
    try {
      const res = await fetch(`/data/quran/surahs/${surahNumber}.json`, { cache: 'force-cache' });
      if (res.ok) {
        const data = (await res.json()) as SurahDetail;
        surahMemoryCache.set(surahNumber, data);
        set({ surahData: data, loadingSurah: false });
        return;
      }
    } catch {
      /* fallback to CDN */
    }

    // 3. Fallback to public Quran Cloud CDN if local asset is unavailable
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const cdnRes = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih`,
        { cache: 'force-cache', signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (cdnRes.ok) {
        const json = await cdnRes.json();
        if (json.code === 200 && Array.isArray(json.data) && json.data.length >= 2) {
          const arData = json.data[0];
          const enData = json.data[1];
          const ayahs: AyahItem[] = arData.ayahs.map((a: { numberInSurah: number, number: number, text: string, juz: number, manzil: number, ruku: number, hizbQuarter: number, sajda: boolean | string | object }, idx: number) => ({
            ayahNo: a.numberInSurah,
            ayahNoQuran: a.number,
            textAr: a.text,
            textEn: enData.ayahs[idx]?.text || '',
            juz: a.juz,
            manzil: a.manzil,
            ruku: a.ruku,
            hizbQuarter: a.hizbQuarter,
            isSajdah: Boolean(a.sajda),
          }));

          const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
          const constructedDetail: SurahDetail = {
            surahNo: surahNumber,
            nameAr: arData.name || surahMeta?.nameAr || `سورة رقم ${surahNumber}`,
            nameEn: arData.englishName || surahMeta?.nameEn || '',
            nameRoman: arData.englishNameTranslation || surahMeta?.nameTranslation || '',
            placeOfRevelation: arData.revelationType || surahMeta?.revelationType || 'Meccan',
            totalAyahs: arData.numberOfAyahs || ayahs.length,
            ayahs,
          };

          surahMemoryCache.set(surahNumber, constructedDetail);
          set({ surahData: constructedDetail, loadingSurah: false });
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load surah from CDN:', err);
    }

    set({ loadingSurah: false });
  },

  getFilteredSurahs: () => {
    const { searchQuery, filterType, filterJuz } = get();
    const q = searchQuery.trim().toLowerCase();

    return ALL_SURAHS.filter((s) => {
      if (filterType !== 'all' && s.revelationType !== filterType) return false;
      if (filterJuz !== 'all' && s.juz !== filterJuz) return false;
      if (q) {
        const matchAr = s.nameAr.includes(q);
        const matchEn = s.nameEn.toLowerCase().includes(q);
        const matchNum = String(s.number) === q;
        if (!matchAr && !matchEn && !matchNum) return false;
      }
      return true;
    });
  },

  getCurrentMushafMediaItem: (): MediaItem => {
    const { activeQiraah } = get();
    return {
      id: `quran-${activeQiraah.id}`,
      title: activeQiraah.name,
      subtitle: activeQiraah.origin,
      sheikhName: activeQiraah.narrator,
      section: 'books',
      pdfUrl: activeQiraah.pdfUrl,
      tags: ['مصحف', 'قرآن كريم', activeQiraah.name],
      description: activeQiraah.description,
    };
  },

  playAyah: (ayahNo) => {
    set({ currentPlayingAyah: ayahNo, isPlayingAudio: true });
  },

  pauseAudio: () => {
    set({ isPlayingAudio: false });
  },

  stopAudio: () => {
    set({ currentPlayingAyah: null, isPlayingAudio: false });
  },

  playNextAyah: async () => {
    const { currentPlayingAyah, surahData, autoPlayNext, activeSurah, loadSurah } = get();
    if (!surahData || currentPlayingAyah === null) return;

    if (currentPlayingAyah < surahData.totalAyahs) {
      set({ currentPlayingAyah: currentPlayingAyah + 1, isPlayingAudio: true });
    } else if (autoPlayNext && activeSurah.number < 114) {
      const next = ALL_SURAHS[activeSurah.number];
      set({ activeSurah: next, currentPlayingAyah: null, isPlayingAudio: false });
      await loadSurah(next.number);
      set({ currentPlayingAyah: 1, isPlayingAudio: true });
    } else {
      set({ currentPlayingAyah: null, isPlayingAudio: false });
    }
  },
}));
