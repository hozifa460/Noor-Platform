/**
 * Infrastructure engine for fetching and querying Quran Word Morphology & Root occurrences.
 * Loads lightweight JSON assets on-demand and caches them in memory.
 */

import {
  ALL_SURAHS,
  normalizeArabicRoot,
  cleanArabicForMatching,
  type QuranSurahMorphology,
  type QuranWordMorphology,
  type QuranRootsIndex,
  type QuranRootOccurrence,
  type WordMorphologyResult,
  type RootOccurrencesResult,
} from '../domain';

const surahMorphologyCache = new Map<number, QuranSurahMorphology>();
let rootsIndexCache: QuranRootsIndex | null = null;
let rootsIndexPromise: Promise<QuranRootsIndex | null> | null = null;

let ayahTextMapCache: Map<string, string> | null = null;
let ayahTextMapPromise: Promise<Map<string, string> | null> | null = null;

/** Clears all in-memory morphology caches (useful for testing retry/recovery) */
export function clearMorphologyCacheForTesting(): void {
  surahMorphologyCache.clear();
  rootsIndexCache = null;
  rootsIndexPromise = null;
  ayahTextMapCache = null;
  ayahTextMapPromise = null;
}

/**
 * Loads morphology data for a single surah on-demand.
 */
export async function loadSurahMorphology(surahNo: number): Promise<QuranSurahMorphology | null> {
  const result = await loadSurahMorphologyResult(surahNo);
  return result.data;
}

/**
 * Loads morphology data for a single surah with explicit status (success vs network_error).
 */
export async function loadSurahMorphologyResult(
  surahNo: number
): Promise<{ status: 'success' | 'network_error'; data: QuranSurahMorphology | null }> {
  if (surahNo < 1 || surahNo > 114) {
    return { status: 'success', data: null };
  }
  if (surahMorphologyCache.has(surahNo)) {
    return { status: 'success', data: surahMorphologyCache.get(surahNo)! };
  }

  try {
    const res = await fetch(`/data/quran/morphology/${surahNo}.json`);
    if (!res.ok) {
      return { status: 'network_error', data: null };
    }
    const data: QuranSurahMorphology = await res.json();
    surahMorphologyCache.set(surahNo, data);
    return { status: 'success', data };
  } catch {
    return { status: 'network_error', data: null };
  }
}

/**
 * Loads the compact Quran roots index on-demand with status.
 */
export async function loadRootsIndexResult(): Promise<{
  status: 'success' | 'network_error';
  data: QuranRootsIndex | null;
}> {
  if (rootsIndexCache) {
    return { status: 'success', data: rootsIndexCache };
  }
  if (rootsIndexPromise) {
    const data = await rootsIndexPromise;
    return { status: data ? 'success' : 'network_error', data };
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

  const data = await rootsIndexPromise;
  return { status: data ? 'success' : 'network_error', data };
}

export async function loadRootsIndex(): Promise<QuranRootsIndex | null> {
  const res = await loadRootsIndexResult();
  return res.data;
}

/**
 * Loads the verse texts mapping for displaying occurrences text with explicit status.
 */
export async function loadAyahTextsMapResult(): Promise<{
  status: 'success' | 'network_error';
  data: Map<string, string> | null;
}> {
  if (ayahTextMapCache) {
    return { status: 'success', data: ayahTextMapCache };
  }
  if (ayahTextMapPromise) {
    const data = await ayahTextMapPromise;
    return { status: data ? 'success' : 'network_error', data };
  }

  ayahTextMapPromise = (async () => {
    try {
      const res = await fetch('/data/quran/quran_search_index.json');
      if (!res.ok) {
        return null;
      }
      const rawRows: [number, number, string][] = await res.json();
      const map = new Map<string, string>();
      for (const [surah, ayah, text] of rawRows) {
        map.set(`${surah}:${ayah}`, text);
      }
      ayahTextMapCache = map;
      return map;
    } catch {
      return null;
    } finally {
      ayahTextMapPromise = null;
    }
  })();

  const data = await ayahTextMapPromise;
  return { status: data ? 'success' : 'network_error', data };
}

export async function loadAyahTextsMap(): Promise<Map<string, string>> {
  const res = await loadAyahTextsMapResult();
  return res.data || new Map<string, string>();
}

/**
 * Retrieves morphology for a specific word in an ayah with text-verified alignment
 * and distinction between network error and unavailable analysis.
 */
export async function getWordMorphologyResult(
  surahNo: number,
  ayahNo: number,
  wordIndex: number,
  wordText?: string
): Promise<WordMorphologyResult> {
  const surahLoad = await loadSurahMorphologyResult(surahNo);
  if (surahLoad.status === 'network_error') {
    return { status: 'network_error', morphology: null, errorMessage: 'تعذر الاتصال بالخادم لتحميل ملف الصرف' };
  }
  const surahData = surahLoad.data;
  if (!surahData || !surahData.words) {
    return { status: 'not_found', morphology: null };
  }

  // 1. Determine corpus word index based on known structural alignments
  let corpusIndex = wordIndex;

  // Surah 95 (At-Tin) Ayah 1: words 1..4 are Basmalah in Tanzil text (not in corpus)
  if (surahNo === 95 && ayahNo === 1) {
    if (wordIndex <= 4) {
      return { status: 'not_found', morphology: null };
    }
    corpusIndex = wordIndex - 4;
  }
  // Surah 97 (Al-Qadr) Ayah 1: words 1..4 are Basmalah in Tanzil text (not in corpus)
  else if (surahNo === 97 && ayahNo === 1) {
    if (wordIndex <= 4) {
      return { status: 'not_found', morphology: null };
    }
    corpusIndex = wordIndex - 4;
  }
  // Surah 37 (As-Saffat) Ayah 130: words 3 (إِلْ) and 4 (يَاسِينَ) are token 3 (إِلْ يَاسِينَ) in corpus
  else if (surahNo === 37 && ayahNo === 130) {
    if (wordIndex === 1) corpusIndex = 1;
    else if (wordIndex === 2) corpusIndex = 2;
    else if (wordIndex === 3 || wordIndex === 4) corpusIndex = 3;
  }

  // 2. Lookup candidate morphology
  let candidate: QuranWordMorphology | null = surahData.words[`${ayahNo}:${corpusIndex}`] || null;

  // 3. Strict content-verified text check (without generic search/includes compensation)
  if (wordText) {
    const cleanTarget = cleanArabicForMatching(wordText);
    if (candidate) {
      const cleanCandidate = cleanArabicForMatching(candidate.wordArabic);
      const isDirectMatch =
        cleanCandidate === cleanTarget ||
        (surahNo === 37 && ayahNo === 130 && cleanCandidate.includes(cleanTarget));

      if (!isDirectMatch) {
        // Alignment not proven; do not guess or search across other words
        candidate = null;
      }
    }
  }

  if (!candidate) {
    return { status: 'not_found', morphology: null };
  }

  return { status: 'success', morphology: candidate };
}

/**
 * Retrieves morphology for a specific word in an ayah (convenience helper).
 */
export async function getWordMorphology(
  surahNo: number,
  ayahNo: number,
  wordIndex: number,
  wordText?: string
): Promise<QuranWordMorphology | null> {
  const res = await getWordMorphologyResult(surahNo, ayahNo, wordIndex, wordText);
  return res.morphology;
}

/**
 * Retrieves all occurrences of a root across the Quran with error separation.
 */
export async function getRootOccurrencesResult(root: string): Promise<RootOccurrencesResult> {
  if (!root) return { status: 'success', occurrences: [] };

  const indexRes = await loadRootsIndexResult();
  if (indexRes.status === 'network_error') {
    return { status: 'network_error', occurrences: [], errorMessage: 'تعذر تحميل فهرس الجذور من الشبكة' };
  }
  const index = indexRes.data;
  if (!index) return { status: 'success', occurrences: [] };

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
    return { status: 'success', occurrences: [] };
  }

  const textsRes = await loadAyahTextsMapResult();
  if (textsRes.status === 'network_error' || !textsRes.data) {
    return {
      status: 'network_error',
      occurrences: [],
      errorMessage: 'تعذر تحميل نصوص الآيات لعرض مواضع الجذر',
    };
  }
  const ayahTexts = textsRes.data;

  const occurrences = entry.occurrences.map(([sNo, aNo, wIdx]) => {
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

  return { status: 'success', occurrences };
}

/**
 * Retrieves all occurrences of a root across the Quran (convenience helper).
 */
export async function getRootOccurrences(root: string): Promise<QuranRootOccurrence[]> {
  const res = await getRootOccurrencesResult(root);
  return res.occurrences;
}
