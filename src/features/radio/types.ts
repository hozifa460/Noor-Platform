import type { LucideIcon } from 'lucide-react';
import type { MediaItem } from '@/lib/types';

/**
 * Centralized TypeScript definitions for the Islamic Radio domain.
 * Governs categories, station metadata, stream resolution, and UI cards.
 */

export type RadioCategory = 'all' | 'national' | 'reciters' | 'hadith' | 'translations';

export interface RadioCategoryTab {
  id: RadioCategory;
  label: string;
  emoji: string;
  icon: LucideIcon;
}

export interface SheikhBadgeInfo {
  initials: string;
  gradientClass: string;
  displayName: string;
}

export interface RadioStation extends MediaItem {
  audioUrl?: string;
  imageUrl?: string;
  sheikhName?: string;
}

export interface CategorizedStations {
  national: MediaItem[];
  reciters: MediaItem[];
  hadith: MediaItem[];
  translations: MediaItem[];
}

export interface ResolvedStreamInfo {
  url: string;
  isValid: boolean;
  protocol: 'http' | 'https' | 'unknown';
  isSecure: boolean;
  mimeTypeHint?: string;
}

export interface RawRadioCatalogItem {
  title: string;
  subtitle?: string;
  emoji?: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoSource?: string;
  mediaType?: string;
}

export interface RawRadioGroup {
  title: string;
  subtitle?: string;
  emoji?: string;
  imageUrl?: string;
  subItems: RawRadioCatalogItem[];
}

export interface RawRadioCatalog {
  id: string;
  title: string;
  emoji: string;
  description: string;
  gradientColors?: string[];
  imageUrl?: string;
  items: RawRadioGroup[];
}
