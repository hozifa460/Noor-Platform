/**
 * Public facade for the Radio domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Components
export { RadioHubView } from './components/RadioHubView';
export { FeaturedStationsRibbon } from './components/FeaturedStationsRibbon';
export { IslamicRadioCard } from './components/IslamicRadioCard';
export { RadioCategoryTabs, CATEGORY_TABS } from './components/RadioCategoryTabs';
export { RadioHeroBanner } from './components/RadioHeroBanner';

// Engines & Logic
export {
  SCHOLAR_PORTRAITS,
  THEMATIC_RADIO_ARTWORKS,
  getRadioArtwork,
} from './engines/visual-engine';
export {
  categorizeRadioStations,
  filterRadioStations,
  getFeaturedRadios,
  resolveRadioStream,
  validateRadioStation,
  PRIORITY_STATION_NAMES,
} from './engines/stream-engine';

// Types
export type {
  RadioCategory,
  RadioCategoryTab,
  SheikhBadgeInfo,
  RadioStation,
  CategorizedStations,
  ResolvedStreamInfo,
  RawRadioCatalogItem,
  RawRadioGroup,
  RawRadioCatalog,
} from './types';
