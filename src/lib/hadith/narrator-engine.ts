/**
 * Compatibility facade for Hadith narrator biography engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  findNarratorBio,
  type NarratorProfile,
  type NarratorScholarlyOpinion,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/narrator-engine';
