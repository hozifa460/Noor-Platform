/**
 * Compatibility re-export facade.
 * The Fatwa domain has migrated to Feature-Sliced Design at @/features/fatwa.
 */
export {
  getFatwaContent,
  getFatwaContentBatch,
  prefetchFatwaContent,
  preloadAnswerShards,
  hasAnswerShardEntry,
  shardHashForId,
} from '@/features/fatwa/engines/answers';
export type { FatwaFullContent } from '@/features/fatwa/types';
