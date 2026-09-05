/**
 * Public facade for the Fatwa domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Domain Layer (Types, Rules & Constants)
export type {
  FatwaIndexItem,
  FatwaCategory,
  FatwaScholar,
  FatwaContentResult,
  FatwaFullContent,
  BrowseItem,
  AnswerRecord,
  FatwaStoreState,
} from './domain';

export {
  FATWA_CATEGORIES,
  SCHOLARS_LIST,
  scholarFilterQuery,
  BUILTIN_SEED_FATWAS,
  SEED_FATWAS,
  cleanFatwaText,
} from './domain';

// Infrastructure Layer (Remote Shards, Caches, Workers & Inverted Index)
export {
  microShardEngine,
  getFatwaContent,
  getFatwaContentBatch,
  prefetchFatwaContent,
  preloadAnswerShards,
  hasAnswerShardEntry,
  shardHashForId,
  loadCategory,
  isCategoryLoaded,
  filterByScholar,
  getCategoryCount,
  BROWSE_TOTALS,
  FatwaWorkerClient,
  fatwaWorkerClient,
  FatwaIndexManager,
  fatwaIndexManager,
} from './infrastructure';

// Model Layer (Zustand Store & React State Hooks)
export { useFatwaStore, type FatwaState } from './model';
export { useFatwaAnswers } from './model';

// UI Layer (Presentational Views, Banners & Cards)
export {
  FatwaLibraryView,
  FatwaHeroBanner,
  FatwaCard,
  FatwaFilterBar,
} from './ui';
