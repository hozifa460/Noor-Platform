/**
 * Compatibility facade for Hadith IndexedDB storage.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  getCachedHadithBook,
  setCachedHadithBook,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/storage';
