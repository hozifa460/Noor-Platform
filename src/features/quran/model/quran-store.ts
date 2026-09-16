'use client';

import { create } from 'zustand';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  WARSH_AYAH_RECITERS,
  QURAN_RECITERS,
  isAyahAudioSupportedForQiraah,
  type SurahMeta,
  type QiraahMeta,
  type QuranTranslationMeta,
  type AyahItem,
  type SurahDetail,
  type ReciterMeta,
  type QuranWordTarget,
} from '../domain';
import type { QuranSearchResult } from '../infrastructure';
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
  isPlayingFullSurah: boolean;
  registeredAudioElement: HTMLAudioElement | null;
  autoPlayNext: boolean;

  // Surah browser
  searchQuery: string;
  filterType: 'all' | 'Meccan' | 'Medinan';
  filterJuz: number | 'all';
  loadingSurah: boolean;
  surahLoadError: boolean;

  // Actions
  setActiveQiraah: (q: QiraahMeta) => void;
  setActiveSurah: (s: SurahMeta, options?: { skipUrlUpdate?: boolean }) => void;
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
  retryLoadSurah: () => void;
  getFilteredSurahs: () => SurahMeta[];
  getCurrentMushafMediaItem: () => MediaItem;

  // Audio actions
  playAyah: (ayahNo: number) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  playNextAyah: () => void;
  setIsPlayingFullSurah: (playing: boolean) => void;
  registerAudioElement: (el: HTMLAudioElement | null) => void;

  // Quran Ayah Search & Deep Navigation
  highlightedAyah: number | null;
  highlightedTarget: { surahNo: number; ayahNo: number } | null;
  quranSearchQuery: string;
  quranSearchResults: QuranSearchResult[];
  isSearchModalOpen: boolean;
  setQuranSearchQuery: (q: string) => void;
  setQuranSearchResults: (results: QuranSearchResult[]) => void;
  openQuranSearch: () => void;
  closeQuranSearch: () => void;
  setHighlightedAyah: (ayah: number | null) => void;
  setHighlightedTarget: (target: { surahNo: number; ayahNo: number } | null) => void;
  navigateToAyah: (surahNumber: number, ayahNumber: number) => Promise<void>;

  // Word Morphology & Root Explorer («استكشف الكلمة»)
  selectedWordTarget: QuranWordTarget | null;
  isWordExplorerOpen: boolean;
  openWordExplorer: (target: QuranWordTarget) => void;
  closeWordExplorer: () => void;
}

const surahMemoryCache = new Map<number, SurahDetail>();
const inFlightSurahFetches = new Map<number, Promise<SurahDetail>>();
let latestSurahRequestId = 0;
let currentAudioSessionId = 0;

export function clearQuranMemoryCacheForTesting(): void {
  surahMemoryCache.clear();
  inFlightSurahFetches.clear();
  latestSurahRequestId = 0;
  currentAudioSessionId = 0;
  useQuranStore.setState({
    highlightedAyah: null,
    highlightedTarget: null,
    quranSearchQuery: '',
    quranSearchResults: [],
    isSearchModalOpen: false,
    selectedWordTarget: null,
    isWordExplorerOpen: false,
  });
}

async function fetchSurahDetail(surahNumber: number): Promise<SurahDetail> {
  // 1. High-speed local Edge asset (committed and served by Vercel / Cloudflare CDN)
  try {
    const res = await fetch(`/data/quran/surahs/${surahNumber}.json`, { cache: 'force-cache' });
    if (res.ok) {
      const data = (await res.json()) as SurahDetail;
      surahMemoryCache.set(surahNumber, data);
      return data;
    }
  } catch {
    /* fallback to CDN */
  }

  // 2. Fallback to public Quran Cloud CDN if local asset is unavailable
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const cdnRes = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih`,
      { cache: 'force-cache', signal: controller.signal }
    );
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
        return constructedDetail;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  throw new Error(`Failed to load surah ${surahNumber}`);
}

export const useQuranStore = create<QuranState>((set, get) => ({
  activeQiraah: QIRAAT_LIST[0], // مصحف حفص عن عاصم
  activeSurah: ALL_SURAHS[0], // سورة الفاتحة
  surahData: null,
  activeTranslation: QURAN_TRANSLATIONS[0], // English Saheeh
  activeReciter: QURAN_RECITERS[0], // الشيخ محمد صديق المنشاوي (مرتل)
  viewMode: 'mushaf-real', // Continuous reading / real Mus-haf view
  fontSize: 32,
  showTranslation: false,
  showTafsir: false,
  activeTafsirAyah: null,

  currentPlayingAyah: null,
  isPlayingAudio: false,
  isPlayingFullSurah: false,
  registeredAudioElement: null,
  autoPlayNext: true,

  searchQuery: '',
  filterType: 'all',
  filterJuz: 'all',
  loadingSurah: false,
  surahLoadError: false,

  // Quran Ayah Search & Highlighting State
  highlightedAyah: null,
  highlightedTarget: null,
  quranSearchQuery: '',
  quranSearchResults: [],
  isSearchModalOpen: false,

  setQuranSearchQuery: (quranSearchQuery) => set({ quranSearchQuery }),
  setQuranSearchResults: (quranSearchResults) => set({ quranSearchResults }),
  openQuranSearch: () => set({ isSearchModalOpen: true }),
  closeQuranSearch: () => set({ isSearchModalOpen: false }),
  setHighlightedAyah: (highlightedAyah) =>
    set((s) => ({
      highlightedAyah,
      highlightedTarget: highlightedAyah ? { surahNo: s.activeSurah.number, ayahNo: highlightedAyah } : null,
    })),
  setHighlightedTarget: (highlightedTarget) =>
    set({
      highlightedTarget,
      highlightedAyah: highlightedTarget?.ayahNo ?? null,
    }),

  selectedWordTarget: null,
  isWordExplorerOpen: false,
  openWordExplorer: (selectedWordTarget) => set({ selectedWordTarget, isWordExplorerOpen: true }),
  closeWordExplorer: () => set({ isWordExplorerOpen: false }),

  navigateToAyah: async (surahNumber: number, ayahNumber: number): Promise<void> => {
    // 1. Ensure audio is stopped (do not auto-play audio)
    get().stopAudio();

    // 2. Set active surah and interactive view mode
    const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
    if (surahMeta) {
      set({
        activeSurah: surahMeta,
        viewMode: 'interactive',
        highlightedAyah: ayahNumber,
        highlightedTarget: { surahNo: surahNumber, ayahNo: ayahNumber },
        isSearchModalOpen: false,
        isWordExplorerOpen: false,
      });
    }

    // 3. Update URL with query parameters without full page reload
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('surah', String(surahNumber));
        url.searchParams.set('ayah', String(ayahNumber));
        window.history.pushState({}, '', url.toString());
      } catch {
        /* ignore */
      }
    }

    // 4. Load the target surah
    await get().loadSurah(surahNumber);

    // 5. Scroll smoothly to target Ayah element in DOM (only if destination still matches)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const currentTarget = get().highlightedTarget;
        if (currentTarget?.surahNo === surahNumber && currentTarget?.ayahNo === ayahNumber) {
          const el = document.getElementById(`ayah-${ayahNumber}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 150);
    }
  },

  setActiveQiraah: (activeQiraah) => {
    // Stop ongoing playback on Riwayah switch to avoid desync
    get().stopAudio();
    set({
      activeQiraah,
      activeReciter:
        activeQiraah.id === 'warsh' ? WARSH_AYAH_RECITERS[0] : QURAN_RECITERS[0],
    });
  },

  setActiveSurah: (activeSurah, options) => {
    get().stopAudio();
    set({
      activeSurah,
      surahLoadError: false,
      highlightedAyah: null,
      highlightedTarget: null,
    });
    // Remove obsolete ayah parameter from URL if user manually changed surah
    if (!options?.skipUrlUpdate && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const prevSurah = url.searchParams.get('surah');
        url.searchParams.set('surah', String(activeSurah.number));
        url.searchParams.delete('ayah');
        if (prevSurah && prevSurah !== String(activeSurah.number)) {
          window.history.pushState({}, '', url.toString());
        } else {
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        /* ignore */
      }
    }
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

  loadSurah: async (surahNumber: number): Promise<void> => {
    // 1. Instant 0ms return if already loaded in memory
    const memoryCached = surahMemoryCache.get(surahNumber);
    if (memoryCached) {
      set({ surahData: memoryCached, loadingSurah: false, surahLoadError: false });
      return;
    }

    const reqId = ++latestSurahRequestId;
    // Clear previous surah data if navigating to a new surah so old content never displays under new title
    const currentData = get().surahData;
    if (currentData && currentData.surahNo !== surahNumber) {
      set({ surahData: null });
    }
    set({ loadingSurah: true, surahLoadError: false });

    // 2. Obtain or reuse in-flight data fetch promise (prevents duplicate network requests)
    let fetchPromise = inFlightSurahFetches.get(surahNumber);
    if (!fetchPromise) {
      fetchPromise = fetchSurahDetail(surahNumber).finally(() => {
        inFlightSurahFetches.delete(surahNumber);
      });
      inFlightSurahFetches.set(surahNumber, fetchPromise);
    }

    try {
      const data = await fetchPromise;
      if (reqId === latestSurahRequestId && get().activeSurah.number === surahNumber) {
        set({ surahData: data, loadingSurah: false, surahLoadError: false });
      }
    } catch (err) {
      console.warn('Failed to load surah from CDN:', err);
      if (reqId === latestSurahRequestId && get().activeSurah.number === surahNumber) {
        set({ surahData: null, loadingSurah: false, surahLoadError: true });
      }
    }
  },

  retryLoadSurah: () => {
    const { activeSurah, loadSurah } = get();
    loadSurah(activeSurah.number);
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
    const { activeQiraah } = get();
    if (!isAyahAudioSupportedForQiraah(activeQiraah.id)) {
      return;
    }
    currentAudioSessionId++;
    set({ currentPlayingAyah: ayahNo, isPlayingAudio: true, isPlayingFullSurah: false });
  },

  pauseAudio: () => {
    currentAudioSessionId++;
    const { registeredAudioElement } = get();
    if (registeredAudioElement) {
      try {
        registeredAudioElement.pause();
      } catch {}
    }
    set({ isPlayingAudio: false, isPlayingFullSurah: false });
  },

  stopAudio: () => {
    currentAudioSessionId++;
    const { registeredAudioElement } = get();
    if (registeredAudioElement) {
      try {
        registeredAudioElement.pause();
        registeredAudioElement.currentTime = 0;
      } catch {}
    }
    set({ currentPlayingAyah: null, isPlayingAudio: false, isPlayingFullSurah: false });
  },

  setIsPlayingFullSurah: (isPlayingFullSurah) => {
    currentAudioSessionId++;
    if (isPlayingFullSurah) {
      set({ isPlayingFullSurah: true, isPlayingAudio: false, currentPlayingAyah: null });
    } else {
      set({ isPlayingFullSurah: false });
    }
  },

  registerAudioElement: (el) => {
    set({ registeredAudioElement: el });
  },

  playNextAyah: async () => {
    const { currentPlayingAyah, surahData, autoPlayNext, activeSurah, loadSurah, activeQiraah } = get();
    if (!surahData || currentPlayingAyah === null || !isAyahAudioSupportedForQiraah(activeQiraah.id)) return;

    if (currentPlayingAyah < surahData.totalAyahs) {
      currentAudioSessionId++;
      set({ currentPlayingAyah: currentPlayingAyah + 1, isPlayingAudio: true, isPlayingFullSurah: false });
    } else if (autoPlayNext && activeSurah.number < 114) {
      const next = ALL_SURAHS[activeSurah.number];
      const intendedSurahNumber = next.number;
      const intendedQiraahId = activeQiraah.id;
      const thisSessionId = ++currentAudioSessionId;

      set({ activeSurah: next, currentPlayingAyah: null, isPlayingAudio: false, isPlayingFullSurah: false });
      await loadSurah(intendedSurahNumber);

      const current = get();
      if (
        thisSessionId === currentAudioSessionId &&
        current.activeSurah.number === intendedSurahNumber &&
        current.activeQiraah.id === intendedQiraahId &&
        isAyahAudioSupportedForQiraah(current.activeQiraah.id) &&
        current.surahData !== null &&
        current.surahData.surahNo === intendedSurahNumber &&
        !current.surahLoadError
      ) {
        set({ currentPlayingAyah: 1, isPlayingAudio: true, isPlayingFullSurah: false });
      } else {
        if (thisSessionId === currentAudioSessionId) {
          set({ currentPlayingAyah: null, isPlayingAudio: false, isPlayingFullSurah: false });
        }
      }
    } else {
      currentAudioSessionId++;
      set({ currentPlayingAyah: null, isPlayingAudio: false, isPlayingFullSurah: false });
    }
  },
}));
