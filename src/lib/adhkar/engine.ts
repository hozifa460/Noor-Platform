import { adhkarUrl } from '../shared/data-base';
import { normalizeArabic, arabicSearchMatch } from '../arabic/normalizer';

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

export const QUICK_ADHKAR_TABS: QuickFilterTab[] = [
  {
    id: 'all',
    name: 'جميع الأبواب',
    iconName: 'BookOpen',
    categoryIds: [],
  },
  {
    id: 'morning_evening',
    name: 'الصباح والمساء',
    iconName: 'Sun',
    categoryIds: [1],
  },
  {
    id: 'sleep_waking',
    name: 'النوم والاستيقاظ',
    iconName: 'Moon',
    categoryIds: [2, 3],
  },
  {
    id: 'prayer',
    name: 'الصلاة والأذان',
    iconName: 'Clock',
    categoryIds: [10, 11, 12, 13, 25, 26, 27],
  },
  {
    id: 'home_toilet',
    name: 'المنزل والوضوء',
    iconName: 'Home',
    categoryIds: [4, 5, 6, 7, 8, 9, 14, 15],
  },
  {
    id: 'ruqyah_distress',
    name: 'الكرب والرقية',
    iconName: 'Shield',
    categoryIds: [29, 30, 31, 32, 33, 34, 35, 120, 121, 122],
  },
  {
    id: 'travel',
    name: 'السفر وركوب الدابة',
    iconName: 'Compass',
    categoryIds: [56, 57, 58, 59],
  },
];

let cachedAdhkarCatalog: AdhkarCategory[] | null = null;
let catalogFetchPromise: Promise<AdhkarCategory[]> | null = null;

/**
 * Loads the complete 132-category Adhkar dataset.
 * Checks memory cache first (0ms), then local Edge asset, then fast Hugging Face CDN.
 */
export async function loadAdhkarCatalog(): Promise<AdhkarCategory[]> {
  if (cachedAdhkarCatalog && cachedAdhkarCatalog.length > 0) {
    return cachedAdhkarCatalog;
  }

  if (catalogFetchPromise) {
    return catalogFetchPromise;
  }

  catalogFetchPromise = (async () => {
    // Strategy 1: Local Edge asset (/data/adhkar/adhkar.json)
    try {
      const res = await fetch('/data/adhkar/adhkar.json', { cache: 'force-cache' });
      if (res.ok) {
        const data = (await res.json()) as AdhkarCategory[];
        if (Array.isArray(data) && data.length > 0) {
          cachedAdhkarCatalog = data;
          return data;
        }
      }
    } catch {
      /* fallback to CDN */
    }

    // Strategy 2: Fast Hugging Face CDN
    try {
      const url = adhkarUrl('adhkar/adhkar.json');
      const res = await fetch(url, { cache: 'force-cache' });
      if (res.ok) {
        const data = (await res.json()) as AdhkarCategory[];
        if (Array.isArray(data) && data.length > 0) {
          cachedAdhkarCatalog = data;
          return data;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Adhkar catalog from CDN:', err);
    }

    return [];
  })();

  try {
    return await catalogFetchPromise;
  } finally {
    catalogFetchPromise = null;
  }
}

/**
 * Returns the direct CDN stream URL for a given audio recording.
 * Serves directly from Hugging Face CDN edge with byte-range streaming.
 */
export function getDhikrAudioUrl(audioPathOrFilename: string): string {
  if (!audioPathOrFilename) return '';
  const cleanFilename = audioPathOrFilename
    .replace(/^\/?audio\//, '')
    .replace(/^\//, '')
    .replace(/\.mp3$/i, '');

  if (!cleanFilename) return '';
  return `https://huggingface.co/datasets/hozifa1/quran_and_sunnah/raw/main/adhkarset/adhkar/audio/${cleanFilename}.mp3`;
}

/**
 * High performance search across Adhkar categories and texts.
 */
export function searchAdhkar(
  catalog: AdhkarCategory[],
  query: string,
  selectedTabId: string,
  selectedCategoryId: number | 'all'
): { category: AdhkarCategory; items: DhikrItem[] }[] {
  const q = query.trim();
  const normQuery = q ? normalizeArabic(q) : '';

  const activeTab = QUICK_ADHKAR_TABS.find((t) => t.id === selectedTabId);
  const allowedCatIds = activeTab && activeTab.categoryIds.length > 0 ? new Set(activeTab.categoryIds) : null;

  const results: { category: AdhkarCategory; items: DhikrItem[] }[] = [];

  for (const cat of catalog) {
    // Category filter
    if (selectedCategoryId !== 'all' && cat.id !== selectedCategoryId) {
      continue;
    }

    // Tab filter
    if (allowedCatIds && !allowedCatIds.has(cat.id)) {
      continue;
    }

    const normCat = normalizeArabic(cat.category);
    const catMatches = normQuery ? (normCat.includes(normQuery) || arabicSearchMatch(cat.category, q)) : true;

    if (!normQuery) {
      results.push({ category: cat, items: cat.array });
      continue;
    }

    if (catMatches) {
      results.push({ category: cat, items: cat.array });
      continue;
    }

    // Text matching within items
    const matchedItems = cat.array.filter((item) => {
      const normText = normalizeArabic(item.text);
      return normText.includes(normQuery) || arabicSearchMatch(item.text, q);
    });

    if (matchedItems.length > 0) {
      results.push({ category: cat, items: matchedItems });
    }
  }

  return results;
}
