/**
 * Compatibility facade for fake/fabricated Hadith detection engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  FAKE_HADITH_CATEGORIES,
  loadFakeHadiths,
  searchFakeHadiths,
  checkHadithAuthenticity,
  type FakeHadithCategory,
  type FakeHadithCategoryMeta,
  type FakeHadithItem,
  type AuthenticityCheckResult,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/fake-engine';
