/**
 * Public facade for the Fatwa domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Types (exported first to prevent circular dependency evaluation issues)
export type {
  FatwaIndexItem,
  FatwaCategory,
  FatwaScholar,
  FatwaContentResult,
  FatwaFullContent,
  BrowseItem,
  AnswerRecord,
  FatwaStoreState,
} from './types';

// Engines & Pure Logic (pure constants and index data evaluated before state)
export {
  BUILTIN_SEED_FATWAS,
  SEED_FATWAS,
} from './engines/seed-fatwas';
export {
  FatwaIndexManager,
  fatwaIndexManager,
  FATWA_CATEGORIES,
  SCHOLARS_LIST,
} from './engines/index-data';
export {
  getFatwaContent,
  getFatwaContentBatch,
  prefetchFatwaContent,
  preloadAnswerShards,
  hasAnswerShardEntry,
  shardHashForId,
} from './engines/answers';
export {
  loadCategory,
  isCategoryLoaded,
  filterByScholar,
  getCategoryCount,
  BROWSE_TOTALS,
} from './engines/browse';
export { scholarFilterQuery } from './engines/scholar-filter';
export { cleanFatwaText } from './engines/text';
export {
  FatwaWorkerClient,
  fatwaWorkerClient,
} from './engines/worker-client';

// Store & State
export { useFatwaStore } from './store';
export type { FatwaState } from './store';

// Hooks
export { useFatwaAnswers } from './hooks/use-fatwa-answers';

// Components
export { FatwaLibraryView } from './components/FatwaLibraryView';
export { FatwaHeroBanner } from './components/FatwaHeroBanner';
export { FatwaCard } from './components/FatwaCard';
export { FatwaFilterBar } from './components/FatwaFilterBar';
