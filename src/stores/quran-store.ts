'use client';

import { create } from 'zustand';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  type SurahMeta,
  type QiraahMeta,
  type QuranTranslationMeta,
} from '@/lib/quran-data';
import type { MediaItem } from '@/lib/types';

export interface AyahItem {
  ayahNo: number;
  ayahNoQuran: number;
  textAr: string;
  textEn: string;
  juz: number;
  manzil?: number;
  ruku?: number;
  hizbQuarter?: number;
  isSajdah?: boolean;
}

export interface SurahDetail {
  surahNo: number;
  nameAr: string;
  nameEn: string;
  nameRoman: string;
  placeOfRevelation: string;
  totalAyahs: number;
  ayahs: AyahItem[];
}

export interface ReciterMeta {
  id: string;
  name: string;
  subfolder: string;
}

export const WARSH_AYAH_RECITERS: ReciterMeta[] = [
  { id: 'warsh_abdulbasit', name: 'الشيخ عبد الباسط عبد الصمد (رواية ورش عن نافع)', subfolder: 'warsh/warsh_Abdul_Basit_128kbps' },
  { id: 'warsh_aldosary', name: 'الشيخ إبراهيم الدوسري (رواية ورش عن نافع)', subfolder: 'warsh/warsh_ibrahim_aldosary_128kbps' },
  { id: 'warsh_yassin', name: 'الشيخ ياسين الجزائري (رواية ورش عن نافع)', subfolder: 'warsh/warsh_yassin_al_jazaery_64kbps' },
];

export const QURAN_RECITERS: ReciterMeta[] = [
  { id: 'minshawi_murattal', name: 'الشيخ محمد صديق المنشاوي (مرتل)', subfolder: 'Minshawy_Murattal_128kbps' },
  { id: 'minshawi_mujawwad', name: 'الشيخ محمد صديق المنشاوي (مجود)', subfolder: 'Minshawy_Mujawwad_192kbps' },
  { id: 'husary_murattal', name: 'الشيخ محمود خليل الحصري (مرتل)', subfolder: 'Husary_128kbps' },
  { id: 'husary_muallim', name: 'الشيخ محمود خليل الحصري (المصحف المعلم)', subfolder: 'Husary_Muallim_128kbps' },
  { id: 'abdulbasit_murattal', name: 'الشيخ عبد الباسط عبد الصمد (مرتل)', subfolder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'abdulbasit_mujawwad', name: 'الشيخ عبد الباسط عبد الصمد (مجود)', subfolder: 'Abdul_Basit_Mujawwad_128kbps' },
  { id: 'alafasy', name: 'الشيخ مشاري راشد العفاسي', subfolder: 'Alafasy_128kbps' },
  { id: 'muaiqly', name: 'الشيخ ماهر المعيقلي', subfolder: 'MaherAlMuaiqly128kbps' },
  { id: 'dossari', name: 'الشيخ ياسر الدوسري', subfolder: 'Yasser_Ad-Dussary_128kbps' },
  { id: 'sudais', name: 'الشيخ عبد الرحمن السديس', subfolder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'shuraim', name: 'الشيخ سعود الشريم', subfolder: 'Saood_ash-Shuraym_128kbps' },
  { id: 'ghamadi', name: 'الشيخ سعد الغامدي', subfolder: 'Ghamadi_40kbps' },
  { id: 'hudhaify', name: 'الشيخ علي بن عبد الرحمن الحذيفي', subfolder: 'Hudhaify_128kbps' },
  { id: 'ajamy', name: 'الشيخ أحمد بن علي العجمي', subfolder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net' },
  { id: 'qatami', name: 'الشيخ ناصر القطامي', subfolder: 'Nasser_Alqatami_128kbps' },
  { id: 'abbad', name: 'الشيخ فارس عباد', subfolder: 'Fares_Abbad_64kbps' },
  { id: 'budair', name: 'الشيخ صلاح البدير', subfolder: 'Salah_Al_Budair_128kbps' },
  { id: 'tablawi', name: 'الشيخ محمد محمود الطبلاوي', subfolder: 'Mohammad_al_Tablaway_128kbps' },
  { id: 'banna', name: 'الشيخ محمود علي البنا', subfolder: 'Mahmoud_Ali_Al_Banna_32kbps' },
  { id: 'ayyoub', name: 'الشيخ محمد أيوب', subfolder: 'Muhammad_Ayyoub_128kbps' },
  { id: 'neana', name: 'الشيخ أحمد نعينع', subfolder: 'Ahmed_Neana_128kbps' },
  { id: 'rifai', name: 'الشيخ هاني الرفاعي', subfolder: 'Hani_Rifai_192kbps' },
  { id: 'basfar', name: 'الشيخ عبد الله بصفر', subfolder: 'Abdullah_Basfar_192kbps' },
  { id: 'qasim', name: 'الشيخ عبد المحسن القاسم', subfolder: 'Muhsin_Al_Qasim_192kbps' },
  { id: 'ali_jaber', name: 'الشيخ علي جابر', subfolder: 'Ali_Jaber_64kbps' },
  { id: 'qahtani', name: 'الشيخ خالد القحطاني', subfolder: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps' },
  { id: 'sahl_yassin', name: 'الشيخ سهل ياسين', subfolder: 'Sahl_Yassin_128kbps' },
  { id: 'suesy', name: 'الشيخ علي حجاج السويسي', subfolder: 'Ali_Hajjaj_AlSuesy_128kbps' },
];

export function getAyahRecitersForQiraah(qiraahId: string): ReciterMeta[] {
  if (qiraahId === 'warsh') {
    return WARSH_AYAH_RECITERS;
  }
  return QURAN_RECITERS;
}

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
    set({ loadingSurah: true });
    
    // 1. Try local data first
    try {
      const res = await fetch(`/data/quran/surahs/${surahNumber}.json`);
      if (res.ok) {
        const data = (await res.json()) as SurahDetail;
        set({ surahData: data, loadingSurah: false });
        return;
      }
    } catch {
      /* fallback to CDN */
    }

    // 2. Fallback to high-speed public Quran Cloud CDN
    try {
      const cdnRes = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih`,
        { cache: 'force-cache' }
      );
      if (cdnRes.ok) {
        const json = await cdnRes.json();
        if (json.code === 200 && Array.isArray(json.data) && json.data.length >= 2) {
          const arData = json.data[0];
          const enData = json.data[1];
          const ayahs: AyahItem[] = arData.ayahs.map((a: any, idx: number) => ({
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

  playNextAyah: () => {
    const { currentPlayingAyah, surahData, nextSurah, autoPlayNext } = get();
    if (!surahData || currentPlayingAyah === null) return;

    if (currentPlayingAyah < surahData.totalAyahs) {
      set({ currentPlayingAyah: currentPlayingAyah + 1, isPlayingAudio: true });
    } else if (autoPlayNext && surahData.surahNo < 114) {
      nextSurah();
      set({ currentPlayingAyah: 1, isPlayingAudio: true });
    } else {
      set({ currentPlayingAyah: null, isPlayingAudio: false });
    }
  },
}));
