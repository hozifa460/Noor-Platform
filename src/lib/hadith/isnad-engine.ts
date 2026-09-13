/**
 * Compatibility facade for Hadith isnad chain parsing engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  parseHadithIsnad,
  type IsnadNode,
  type ParsedIsnad,
  type IsnadNodeRole,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/isnad-engine';
