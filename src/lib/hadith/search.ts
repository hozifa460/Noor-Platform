/**
 * Compatibility facade for Hadith search engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  parseMicroIndexPayload,
  loadHadithMicroIndex,
  searchHadithsInBook,
  searchAcrossAllBooks,
  type MicroIndexEntry,
  type GlobalSearchResultItem,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/search';
