/**
 * Centralized TypeScript definitions for Islamic Radio stations.
 */

import type { LucideIcon } from 'lucide-react';

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
