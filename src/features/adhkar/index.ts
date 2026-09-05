/**
 * Public facade for the Adhkar domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Components
export { AdhkarHubView } from './components/AdhkarHubView';
export { AdhkarFilterBar } from './components/AdhkarFilterBar';
export { DhikrCard } from './components/DhikrCard';
export { AdhkarHeroBanner } from './components/AdhkarHeroBanner';

// Engine & Logic
export {
  loadAdhkarCatalog,
  getDhikrAudioUrl,
  getDhikrAudioMapping,
  searchAdhkar,
  QUICK_ADHKAR_TABS,
} from './engines/engine';

// Hooks
export { useDhikrCounter } from './hooks/use-dhikr-counter';

// Types
export type {
  DhikrItem,
  AdhkarCategory,
  QuickFilterTab,
  AdhkarSearchResult,
  DhikrAudioMapping,
  AdhkarAudioMapping,
} from './types';

