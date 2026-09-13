/**
 * Compatibility facade for Hadith Sharh explanation engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  buildSharhInvertedIndex,
  loadHadeethEncSharh,
  findHadithSharh,
  getSharhByHadithId,
  clearSharhCache,
  isSharhCacheLoaded,
  type HadeethEncSharhItem,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/sharh';
