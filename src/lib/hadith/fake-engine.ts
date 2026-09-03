import { normalizeArabic, arabicSearchMatch } from '@/lib/arabic/normalizer';
import { searchAcrossAllBooks } from './search';
import type { GlobalSearchResultItem } from './types';

export type FakeHadithCategory =
  | 'all'
  | 'fasting_ramadan'
  | 'prayer_worship'
  | 'dhikr_duaa'
  | 'quran_virtues'
  | 'wealth_rizq'
  | 'manners_general';

export interface FakeHadithCategoryMeta {
  id: FakeHadithCategory;
  nameAr: string;
  icon?: string;
}

export const FAKE_HADITH_CATEGORIES: FakeHadithCategoryMeta[] = [
  { id: 'all', nameAr: 'جميع الأحاديث المنتشرة' },
  { id: 'fasting_ramadan', nameAr: 'الصيام ورمضان ورجب' },
  { id: 'prayer_worship', nameAr: 'الصلاة والمساجد والعبادات' },
  { id: 'dhikr_duaa', nameAr: 'الأدعية والأذكار المخترعة' },
  { id: 'quran_virtues', nameAr: 'فضائل السور غير الثابتة' },
  { id: 'wealth_rizq', nameAr: 'الرزق والمال والمعاملات' },
  { id: 'manners_general', nameAr: 'الآداب والأمثال الشائعة' },
];

export interface FakeHadithItem {
  id: number;
  title: string;
  fakeText: string;
  degree: string;
  scholarRuling: string;
  source: string;
  category: FakeHadithCategory;
  authenticAlternative?: string;
}

export interface AuthenticityCheckResult {
  query: string;
  matchedFake: FakeHadithItem | null;
  authenticMatches: GlobalSearchResultItem[];
  status: 'fake' | 'authentic' | 'unverified';
}

let fakeHadithsCache: FakeHadithItem[] | null = null;

/**
 * Loads the fake hadiths catalog (local JSON file, ~22 KB, instant load)
 */
export async function loadFakeHadiths(): Promise<FakeHadithItem[]> {
  if (fakeHadithsCache) return fakeHadithsCache;

  // 1. Node local FS check (SSR / tests / build)
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'fake_hadiths.json');
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        fakeHadithsCache = JSON.parse(raw) as FakeHadithItem[];
        return fakeHadithsCache;
      }
    } catch {
      /* proceed */
    }
  }

  // 2. Browser fetch with cache-busting version query
  try {
    const res = await fetch('/data/hadith/fake_hadiths.json?v=60', { cache: 'no-cache' });
    if (res.ok) {
      const data = (await res.json()) as FakeHadithItem[];
      if (Array.isArray(data) && data.length > 0) {
        fakeHadithsCache = data;
        return data;
      }
    }
  } catch {
    /* fallback */
  }

  // 3. Remote CDN fallback
  try {
    const res = await fetch('https://huggingface.co/datasets/hozifa1/noor-platform-hadith/raw/main/data/hadith/fake_hadiths.json');
    if (res.ok) {
      const data = (await res.json()) as FakeHadithItem[];
      if (Array.isArray(data) && data.length > 0) {
        fakeHadithsCache = data;
        return data;
      }
    }
  } catch {
    /* fallback */
  }

  return [];
}

/**
 * Fast search and filtering within the Fake Hadiths collection.
 */
export function searchFakeHadiths(
  catalog: FakeHadithItem[],
  query: string,
  category: FakeHadithCategory = 'all'
): FakeHadithItem[] {
  const q = query.trim();
  const normQuery = q ? normalizeArabic(q) : '';

  return catalog.filter((item) => {
    // 1. Category Filter
    if (category !== 'all' && item.category !== category) {
      return false;
    }

    // 2. Query matching
    if (!normQuery) return true;

    const normTitle = normalizeArabic(item.title);
    const normText = normalizeArabic(item.fakeText);
    const normRuling = normalizeArabic(item.scholarRuling);

    if (
      normTitle.includes(normQuery) ||
      normText.includes(normQuery) ||
      normRuling.includes(normQuery) ||
      arabicSearchMatch(item.title, q) ||
      arabicSearchMatch(item.fakeText, q)
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Verifies any user-supplied hadith query against:
 * 1. The Fake Hadiths database (high priority warning)
 * 2. The authentic 50,000+ Sunnah Hadith corpus
 */
export async function checkHadithAuthenticity(query: string): Promise<AuthenticityCheckResult> {
  const q = query.trim();
  if (!q || q.length < 3) {
    return { query: q, matchedFake: null, authenticMatches: [], status: 'unverified' };
  }

  const catalog = await loadFakeHadiths();
  const normQuery = normalizeArabic(q);

  // 1. Check against fake hadiths
  let matchedFake: FakeHadithItem | null = null;
  let highestScore = 0;

  for (const item of catalog) {
    const normText = normalizeArabic(item.fakeText);
    const normTitle = normalizeArabic(item.title);

    if (
      normText.includes(normQuery) ||
      normQuery.includes(normText) ||
      normTitle.includes(normQuery)
    ) {
      matchedFake = item;
      break;
    }

    if (arabicSearchMatch(item.fakeText, q) || arabicSearchMatch(item.title, q)) {
      if (highestScore < 0.8) {
        matchedFake = item;
        highestScore = 0.8;
      }
    }
  }

  if (matchedFake) {
    return {
      query: q,
      matchedFake,
      authenticMatches: [],
      status: 'fake',
    };
  }

  // 2. Check against 50,000+ authentic books in the Sunnah corpus
  try {
    const sunnahResults = await searchAcrossAllBooks(q);
    if (sunnahResults && sunnahResults.length > 0) {
      return {
        query: q,
        matchedFake: null,
        authenticMatches: sunnahResults.slice(0, 5),
        status: 'authentic',
      };
    }
  } catch {
    /* proceed */
  }

  return {
    query: q,
    matchedFake: null,
    authenticMatches: [],
    status: 'unverified',
  };
}
