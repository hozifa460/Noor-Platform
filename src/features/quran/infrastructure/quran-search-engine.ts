import {
  ALL_SURAHS,
  type SurahMeta,
  normalizeQuranArabic,
  parseQuranReference,
} from '../domain';

export type QuranSearchMatchType = 'surah' | 'reference' | 'exact_phrase' | 'all_words';

export interface QuranSearchResult {
  surahNumber: number;
  ayahNumber: number;
  surahNameAr: string;
  surahNameEn: string;
  ayahTextAr: string;
  matchType: QuranSearchMatchType;
  score: number;
}

export interface QuranSearchResponse {
  results: QuranSearchResult[];
  referenceNotice?: string;
  invalidReferenceMessage?: string;
  totalMatches: number;
}

interface SearchIndexEntry {
  surahNo: number;
  ayahNo: number;
  textAr: string;
  normText: string;
}

let cachedSearchIndex: SearchIndexEntry[] | null = null;
let inFlightIndexPromise: Promise<SearchIndexEntry[]> | null = null;

/**
 * Lazy loads the lightweight precompiled search index once and caches in memory.
 */
export async function loadQuranSearchIndex(): Promise<SearchIndexEntry[]> {
  if (cachedSearchIndex) {
    return cachedSearchIndex;
  }

  if (inFlightIndexPromise) {
    return inFlightIndexPromise;
  }

  inFlightIndexPromise = (async () => {
    try {
      let rawData: [number, number, string][] | null = null;

      // In browser environment, fetch via Edge asset
      try {
        if (typeof window !== 'undefined' || typeof fetch !== 'undefined') {
          const res = await fetch('/data/quran/quran_search_index.json', { cache: 'force-cache' });
          if (res.ok) {
            rawData = await res.json();
          }
        }
      } catch {
        // fallback to fs in Node/test environments
      }

      // Fallback for Node.js / test environments
      if (!rawData && typeof window === 'undefined') {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.resolve(process.cwd(), 'public', 'data', 'quran', 'quran_search_index.json');
          if (fs.existsSync(filePath)) {
            rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          }
        } catch {
          // fs fallback not available
        }
      }

      if (!rawData || !Array.isArray(rawData)) {
        throw new Error('Failed to load Quran search index asset');
      }

      // Pre-normalize text once in memory for sub-millisecond query execution
      cachedSearchIndex = rawData.map(([surahNo, ayahNo, textAr]) => ({
        surahNo,
        ayahNo,
        textAr,
        normText: normalizeQuranArabic(textAr),
      }));

      return cachedSearchIndex;
    } finally {
      inFlightIndexPromise = null;
    }
  })();

  return inFlightIndexPromise;
}

export function _resetQuranSearchIndexForTesting(): void {
  cachedSearchIndex = null;
  inFlightIndexPromise = null;
}

export function _setQuranSearchIndexForTesting(entries: [number, number, string][]): void {
  cachedSearchIndex = entries.map(([surahNo, ayahNo, textAr]) => ({
    surahNo,
    ayahNo,
    textAr,
    normText: normalizeQuranArabic(textAr),
  }));
}

/**
 * Searches the Quran text:
 * 1. Reference matching (Priority 1: exact surah & ayah)
 * 2. Exact phrase matching (Priority 2: contiguous text)
 * 3. All-words matching (Priority 3: every query word present)
 * Strictly avoids matching single arbitrary words for multi-word queries.
 */
export async function searchQuranAyahs(
  rawQuery: string,
  options?: { maxResults?: number }
): Promise<QuranSearchResponse> {
  const maxResults = options?.maxResults;
  const trimmed = rawQuery.trim();

  if (!trimmed) {
    return { results: [], totalMatches: 0 };
  }

  const index = await loadQuranSearchIndex();
  const surahMetaMap = new Map<number, SurahMeta>();
  for (const s of ALL_SURAHS) {
    surahMetaMap.set(s.number, s);
  }

  const resultsMap = new Map<string, QuranSearchResult>();
  let referenceNotice: string | undefined;
  let invalidReferenceMessage: string | undefined;

  // 1. Reference check
  const refResult = parseQuranReference(trimmed);
  if (refResult) {
    if (refResult.isValid && refResult.surahNo && refResult.ayahNo) {
      const matchKey = `${refResult.surahNo}:${refResult.ayahNo}`;
      const entry = index.find(
        (e) => e.surahNo === refResult.surahNo && e.ayahNo === refResult.ayahNo
      );
      if (entry) {
        const surah = surahMetaMap.get(entry.surahNo);
        const matchType: QuranSearchMatchType = refResult.isSurahOnly ? 'surah' : 'reference';
        resultsMap.set(matchKey, {
          surahNumber: entry.surahNo,
          ayahNumber: entry.ayahNo,
          surahNameAr: surah?.nameAr || `سورة ${entry.surahNo}`,
          surahNameEn: surah?.nameEn || '',
          ayahTextAr: entry.textAr,
          matchType,
          score: 1000,
        });
        referenceNotice = refResult.isSurahOnly
          ? `الانتقال إلى بداية سورة ${surah?.nameAr} (الآية 1)`
          : `تم العثور على المرجع المحدد: سورة ${surah?.nameAr}، الآية ${entry.ayahNo}`;
      }
    } else if (refResult.errorMessage) {
      invalidReferenceMessage = refResult.errorMessage;
    }
  }

  // 2. Text Search
  const normQuery = normalizeQuranArabic(trimmed);
  if (normQuery.length >= 2) {
    const tokens = normQuery.split(/\s+/).filter((t) => t.length > 0);

    for (const entry of index) {
      const matchKey = `${entry.surahNo}:${entry.ayahNo}`;
      if (resultsMap.has(matchKey)) continue;

      // Exact contiguous phrase
      if (entry.normText.includes(normQuery)) {
        const surah = surahMetaMap.get(entry.surahNo);
        resultsMap.set(matchKey, {
          surahNumber: entry.surahNo,
          ayahNumber: entry.ayahNo,
          surahNameAr: surah?.nameAr || `سورة ${entry.surahNo}`,
          surahNameEn: surah?.nameEn || '',
          ayahTextAr: entry.textAr,
          matchType: 'exact_phrase',
          score: 500,
        });
        continue;
      }

      // All-words match (only if multi-word query)
      if (tokens.length > 1) {
        const allPresent = tokens.every((tok) => entry.normText.includes(tok));
        if (allPresent) {
          const surah = surahMetaMap.get(entry.surahNo);
          resultsMap.set(matchKey, {
            surahNumber: entry.surahNo,
            ayahNumber: entry.ayahNo,
            surahNameAr: surah?.nameAr || `سورة ${entry.surahNo}`,
            surahNameEn: surah?.nameEn || '',
            ayahTextAr: entry.textAr,
            matchType: 'all_words',
            score: 200,
          });
        }
      }
    }
  }

  const allResults = Array.from(resultsMap.values()).sort((a, b) => {
    // Highest score first
    if (b.score !== a.score) return b.score - a.score;
    // Lower surah number first
    if (a.surahNumber !== b.surahNumber) return a.surahNumber - b.surahNumber;
    // Lower ayah number first
    return a.ayahNumber - b.ayahNumber;
  });

  return {
    results: maxResults !== undefined ? allResults.slice(0, maxResults) : allResults,
    totalMatches: allResults.length,
    referenceNotice,
    invalidReferenceMessage,
  };
}
