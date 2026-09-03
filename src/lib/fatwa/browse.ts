'use client';

import { dataUrl } from '../shared/data-base';

/**
 * Fatwa Browse Engine (Phase 3)
 * =============================
 * Full-category browsing over ALL 226,580 fatwas using the light browse index
 * (public/data/fatwa_browse/*.json — tuples without answer bodies).
 *
 * - Category selection loads that category's compact index (1.6–15MB, cached).
 * - "All" view paginates across categories lazily.
 * - Answers are NOT here; they stream on demand via lib/fatwa-answers.ts.
 */

export interface BrowseItem {
  id: string;
  title: string;
  scholar: string;
  hasAudio: boolean;
}

interface CategoryData {
  tuples: [string, string, number, number][];
  loaded: boolean;
}

const categoryCache = new Map<string, CategoryData>();
let scholarsMap: Record<string, string> | null = null;

const CATEGORY_FILES: Record<string, string> = {
  salah: 'data/fatwa_browse/salah.json',
  zakah: 'data/fatwa_browse/zakah.json',
  muamalat: 'data/fatwa_browse/muamalat.json',
  aqeedah: 'data/fatwa_browse/aqeedah.json',
  family: 'data/fatwa_browse/family.json',
  contemporary: 'data/fatwa_browse/contemporary.json',
};

function categoryUrl(cat: string): string {
  const p = CATEGORY_FILES[cat];
  return p ? dataUrl(p) : '';
}

/** Real totals from manifest — used for honest counters. */
export const BROWSE_TOTALS: Record<string, number> = {
  all: 226_580,
  salah: 100_769,
  zakah: 33_555,
  muamalat: 19_543,
  aqeedah: 11_565,
  family: 15_098,
  contemporary: 46_050,
};

async function ensureScholars(): Promise<void> {
  if (scholarsMap) return;
  try {
    const res = await fetch(dataUrl('data/fatwa_browse/scholars.json'));
    if (res.ok) scholarsMap = await res.json();
  } catch {
    scholarsMap = {};
  }
}

function decodeTuple(t: [string, string, number, number]): BrowseItem {
  return {
    id: t[0],
    title: t[1],
    scholar: scholarsMap?.[String(t[2])] || 'عالم ومفتي',
    hasAudio: t[3] === 1,
  };
}

/** Loads one category's compact browse index (cached in memory). */
export async function loadCategory(category: string): Promise<BrowseItem[]> {
  if (category === 'all') {
    // For 'all' we return an empty marker list — UI uses showcase + counts.
    return [];
  }

  const cached = categoryCache.get(category);
  if (cached?.loaded) return cached.tuples.map(decodeTuple);

  const file = categoryUrl(category);
  if (!file) return [];

  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tuples = (await res.json()) as [string, string, number, number][];
    await ensureScholars();
    categoryCache.set(category, { tuples, loaded: true });
    return tuples.map(decodeTuple);
  } catch {
    return [];
  }
}

/** True when a category's full index is already in memory (no spinner needed). */
export function isCategoryLoaded(category: string): boolean {
  return Boolean(categoryCache.get(category)?.loaded) || category === 'all';
}

/**
 * Client-side filter of a loaded category by scholar name substring
 * (normalized on the fly — categories are ≤100k items, filtering is fast).
 */
export function filterByScholar(items: BrowseItem[], normalizedQuery: string): BrowseItem[] {
  if (!normalizedQuery) return items;
  return items.filter((i) => i.scholar.includes(normalizedQuery));
}

/** Honest count for display without loading anything. */
export function getCategoryCount(category: string): number {
  return BROWSE_TOTALS[category] ?? 0;
}
