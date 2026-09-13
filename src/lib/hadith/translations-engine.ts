/**
 * Compatibility facade for Hadith translations engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  SUPPORTED_TRANSLATION_LANGUAGES,
  isBookTranslationAvailable,
  fetchHadithTranslation,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/translations-engine';
