/**
 * Compatibility facade for Hadith semantic clustering engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  HADITH_INTENT_CLUSTERS,
  extractQueryCore,
  expandSemanticTerms,
  resolveSemanticConcept,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/semantic';
