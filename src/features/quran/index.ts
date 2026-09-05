/**
 * Public facade for the Holy Quran domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Domain Layer
export type {
  SurahMeta,
  QiraahMeta,
  QuranTranslationMeta,
  AyahItem,
  SurahDetail,
  ReciterMeta,
} from './domain';

export {
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  WARSH_AYAH_RECITERS,
  QURAN_RECITERS,
  RECITERS,
  getSurahMeta,
  getQiraahPdfUrl,
  getAyahRecitersForQiraah,
} from './domain';

// Infrastructure Layer
export {
  SUPPORTED_TAFSIRS,
  fetchAyahTafsir,
  SUPPORTED_EERAB_BOOKS,
  fetchAyahEerab,
  getAyahTranslation,
  getSurahTranslationsMap,
  loadMp3QuranReciters,
  getRecitersForRiwayah,
  sanitizeTafsirHtml,
} from './infrastructure';

// Model Layer
export {
  useQuranStore,
  useQuranAudio,
  useAyahAudioLoop,
} from './model';

// UI Layer
export {
  QuranHubView,
  AyahCard,
  AyahDetailModal,
  QuickAyahMenu,
  QuranAudioBar,
  ReciterModal,
  SurahDrawer,
} from './ui';

