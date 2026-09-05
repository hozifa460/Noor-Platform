/**
 * Compatibility re-export facade.
 * The Fatwa domain has migrated to Feature-Sliced Design at @/features/fatwa.
 */
export {
  FATWA_CATEGORIES,
  SCHOLARS_LIST,
  FatwaIndexManager,
  fatwaIndexManager,
} from '@/features/fatwa/engines/index-data';
export type { FatwaIndexItem } from '@/features/fatwa/types';
