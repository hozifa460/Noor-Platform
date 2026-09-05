/**
 * Centralized TypeScript contract definitions for the Adhkar domain.
 * Governs categories, items, quick tabs, and search results.
 */

export interface DhikrItem {
  id: number;
  text: string;
  count: number;
  audio: string;
  filename: string;
}

export interface AdhkarCategory {
  id: number;
  category: string;
  audio: string;
  filename: string;
  array: DhikrItem[];
}

export interface QuickFilterTab {
  id: string;
  name: string;
  iconName: string;
  categoryIds: number[];
}

export interface AdhkarSearchResult {
  category: AdhkarCategory;
  items: DhikrItem[];
}

/**
 * Clean contract type for Dhikr audio recording resolution and CDN mapping.
 */
export interface DhikrAudioMapping {
  dhikrId?: number;
  rawAudio: string;
  filename: string;
  streamUrl: string;
}

export type AdhkarAudioMapping = DhikrAudioMapping;
