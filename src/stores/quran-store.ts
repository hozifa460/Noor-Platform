'use client';

/**
 * Compatibility facade for Quran store.
 * Canonical implementation lives in @/features/quran with AlQuran Cloud CDN fallback (api.alquran.cloud/v1/surah).
 * Registers ALL_SURAHS metadata and reciters.
 */
export {
  useQuranStore,
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  WARSH_AYAH_RECITERS,
  QURAN_RECITERS,
  getAyahRecitersForQiraah,
  type SurahMeta,
  type QiraahMeta,
  type QuranTranslationMeta,
  type AyahItem,
  type SurahDetail,
  type ReciterMeta,
} from '@/features/quran';

