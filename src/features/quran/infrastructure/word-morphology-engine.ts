/**
 * Infrastructure engine for fetching and querying Quran Word Morphology & Root occurrences.
 * Loads lightweight JSON assets on-demand and caches them in memory.
 */

import {
  ALL_SURAHS,
  normalizeArabicRoot,
  type QuranSurahMorphology,
  type QuranWordMorphology,
  type QuranRootsIndex,
  type QuranRootOccurrence,
} from '../domain';

const surahMorphologyCache = new Map<number, QuranSurahMorphology>();
let rootsIndexCache: QuranRootsIndex | null = null;
let rootsIndexPromise: Promise<QuranRootsIndex | null> | null = null;

let ayahTextMapCache: Map<string, string> | null = null;
let ayahTextMapPromise: Promise<Map<string, string>> | null = null;

/**
 * Loads morphology data for a single surah on-demand.
 */
export async function loadSurahMorphology(surahNo: number): Promise<QuranSurahMorphology | null> {
  if (surahNo < 1 || surahNo > 114) return null;
  if (surahMorphologyCache.has(surahNo)) {
    return surahMorphologyCache.get(surahNo)!;
  }

  try {
    const res = await fetch(`/data/quran/morphology/${surahNo}.json`);
    if (!res.ok) {
      return null;
    }
    const data: QuranSurahMorphology = await res.json();
    surahMorphologyCache.set(surahNo, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Loads the compact Quran roots index on-demand.
 */
export async function loadRootsIndex(): Promise<QuranRootsIndex | null> {
  if (rootsIndexCache) {
    return rootsIndexCache;
  }
  if (rootsIndexPromise) {
    return rootsIndexPromise;
  }

  rootsIndexPromise = (async () => {
    try {
      const res = await fetch('/data/quran/morphology/roots_index.json');
      if (!res.ok) {
        return null;
      }
      const data: QuranRootsIndex = await res.json();
      rootsIndexCache = data;
      return data;
    } catch {
      return null;
    } finally {
      rootsIndexPromise = null;
    }
  })();

  return rootsIndexPromise;
}

/**
 * Loads the verse texts mapping for displaying occurrences text.
 */
async function loadAyahTextsMap(): Promise<Map<string, string>> {
  if (ayahTextMapCache) {
    return ayahTextMapCache;
  }
  if (ayahTextMapPromise) {
    return ayahTextMapPromise;
  }

  ayahTextMapPromise = (async () => {
    try {
      const res = await fetch('/data/quran/quran_search_index.json');
      if (!res.ok) {
        return new Map<string, string>();
      }
      const rawRows: [number, number, string][] = await res.json();
      const map = new Map<string, string>();
      for (const [surah, ayah, text] of rawRows) {
        map.set(`${surah}:${ayah}`, text);
      }
      ayahTextMapCache = map;
      return map;
    } catch {
      return new Map<string, string>();
    } finally {
      ayahTextMapPromise = null;
    }
  })();

  return ayahTextMapPromise;
}

/**
 * Retrieves morphology for a specific word in an ayah.
 */
export async function getWordMorphology(
  surahNo: number,
  ayahNo: number,
  wordIndex: number
): Promise<QuranWordMorphology | null> {
  const surahData = await loadSurahMorphology(surahNo);
  if (!surahData || !surahData.words) return null;
  return surahData.words[`${ayahNo}:${wordIndex}`] || null;
}

/**
 * Retrieves all occurrences of a root across the Quran, enriched with surah names and ayah texts.
 */
export async function getRootOccurrences(root: string): Promise<QuranRootOccurrence[]> {
  if (!root) return [];
  const index = await loadRootsIndex();
  if (!index) return [];

  // 1. Direct match
  let entry = index[root];

  // 2. Normalized match if not found directly
  if (!entry) {
    const normTarget = normalizeArabicRoot(root);
    for (const [key, val] of Object.entries(index)) {
      if (normalizeArabicRoot(key) === normTarget) {
        entry = val;
        break;
      }
    }
  }

  if (!entry || !entry.occurrences || entry.occurrences.length === 0) {
    return [];
  }

  const ayahTexts = await loadAyahTextsMap();

  return entry.occurrences.map(([sNo, aNo, wIdx]) => {
    const surahMeta = ALL_SURAHS[sNo - 1];
    const surahName = surahMeta ? surahMeta.nameAr : `سورة ${sNo}`;
    const ayahText = ayahTexts.get(`${sNo}:${aNo}`) || '';
    return {
      surahNo: sNo,
      surahName,
      ayahNo: aNo,
      wordIndex: wIdx,
      ayahText,
    };
  });
}
