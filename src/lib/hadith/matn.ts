/**
 * Compatibility facade for Hadith matn text cleaning engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  COMMON_STOP_WORDS,
  extractCleanMatn,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/matn';
