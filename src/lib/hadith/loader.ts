/**
 * Compatibility facade for Hadith book loading engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  prepareBookData,
  loadHadithBook,
  loadHadithBookFromShards,
  loadSpecificHadith,
  clearBookCache,
  getBookCacheSize,
  type HadithBookData,
  type HadithItem,
  type HadithChapter,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/loader';
