/**
 * Centralized TypeScript definitions for Adhkar & Du'aa domain.
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
