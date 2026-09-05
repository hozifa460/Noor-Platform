import { adhkarUrl } from '@/lib/shared/data-base';
import { normalizeArabic, arabicSearchMatch } from '@/lib/arabic';
import type { AdhkarCategory, QuickFilterTab, AdhkarSearchResult } from '../types';

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
 * Serves directly from configured Hugging Face CDN edge with byte-range streaming.
 */
export function getDhikrAudioUrl(audioPathOrFilename: string): string {
  if (!audioPathOrFilename || typeof audioPathOrFilename !== 'string') return '';
  const trimmed = audioPathOrFilename.trim();
  if (!trimmed) return '';

  // If already a valid absolute HTTP/HTTPS URL, preserve directly
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const cleanFilename = trimmed
    .replace(/^\/?audio\//i, '')
    .replace(/^\//, '')
    .replace(/\.mp3$/i, '');

  if (!cleanFilename) return '';
  return adhkarUrl(`adhkar/audio/${cleanFilename}.mp3`);
}

/**
 * Clean domain helper providing audio recording mapping and stream resolution for a Dhikr item.
 */
export function getDhikrAudioMapping(item: Pick<AdhkarCategory['array'][number], 'id' | 'audio' | 'filename'>): {
  dhikrId: number;
  rawAudio: string;
  filename: string;
  streamUrl: string;
} {
  const rawAudio = item?.audio || '';
  const filename = item?.filename || '';
  const streamUrl = getDhikrAudioUrl(rawAudio || filename);
  return {
    dhikrId: item?.id ?? 0,
    rawAudio,
    filename,
    streamUrl,
  };
}

/**
 * High performance search across Adhkar categories and texts.
 */
export function searchAdhkar(
  catalog: AdhkarCategory[],
  query: string,
  selectedTabId: string,
  selectedCategoryId: number | 'all'
): AdhkarSearchResult[] {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    return [];
  }

  const q = typeof query === 'string' ? query.trim() : '';
  const normQuery = q ? normalizeArabic(q) : '';

  const activeTab = QUICK_ADHKAR_TABS.find((t) => t.id === selectedTabId);
  const allowedCatIds = activeTab && activeTab.categoryIds.length > 0 ? new Set(activeTab.categoryIds) : null;
  const targetCatId = selectedCategoryId === 'all' ? 'all' : Number(selectedCategoryId);

  const results: AdhkarSearchResult[] = [];

  for (const cat of catalog) {
    if (!cat) continue;
    const catId = Number(cat.id);

    // Category filter
    if (targetCatId !== 'all' && catId !== targetCatId) {
      continue;
    }

    // Tab filter
    if (allowedCatIds && !allowedCatIds.has(catId)) {
      continue;
    }

    const items = Array.isArray(cat.array) ? cat.array : [];
    if (items.length === 0) {
      continue;
    }

    const catTitle = cat.category || '';
    const normCat = normalizeArabic(catTitle);
    const catMatches = normQuery ? (normCat.includes(normQuery) || arabicSearchMatch(catTitle, q)) : true;

    if (!normQuery) {
      results.push({ category: cat, items });
      continue;
    }

    if (catMatches) {
      results.push({ category: cat, items });
      continue;
    }

    // Text matching within items
    const matchedItems = items.filter((item) => {
      if (!item?.text) return false;
      const normText = normalizeArabic(item.text);
      return normText.includes(normQuery) || arabicSearchMatch(item.text, q);
    });

    if (matchedItems.length > 0) {
      results.push({ category: cat, items: matchedItems });
    }
  }

  return results;
}

