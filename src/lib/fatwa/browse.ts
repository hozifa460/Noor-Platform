/**
 * Compatibility re-export facade.
 * The Fatwa domain has migrated to Feature-Sliced Design at @/features/fatwa.
 */
export {
  loadCategory,
  isCategoryLoaded,
  filterByScholar,
  getCategoryCount,
  BROWSE_TOTALS,
} from '@/features/fatwa/engines/browse';
export type { BrowseItem } from '@/features/fatwa/types';
