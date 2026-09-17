import { normalizeArabic, arabicSearchMatch } from '@/lib/arabic';
import { searchAcrossAllBooks } from './search';
import type { GlobalSearchResultItem } from '../domain';

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
  status: 'fake' | 'found_in_corpus' | 'unverified';
}

let fakeHadithsCache: FakeHadithItem[] | null = null;

export const BUILTIN_SEED_FAKES: FakeHadithItem[] = [
  {
    id: 1,
    title: 'حديث «صوموا تصحوا»',
    fakeText: 'صوموا تصحوا',
    degree: 'ضعيف',
    scholarRuling: 'ضعفه الإمام العراقي في تخريج الإحياء، والنووي في المجموع، والشيخ الألباني في السلسلة الضعيفة (253). ومعناه الطبي قد يكون صحيحاً في الجملة لكن نسبته للنبي ﷺ لا تصح.',
    source: 'السلسلة الضعيفة للألباني (253)، تلخيص الحبير لابن حجر',
    category: 'fasting_ramadan',
    authenticAlternative: 'عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «قال الله: كل عمل ابن آدم له إلا الصيام فإنه لي وأنا أجزي به» (متفق عليه).'
  },
  {
    id: 2,
    title: 'حديث «رجب شهر الله، وشعبان شهري، ورمضان شهر أمتي»',
    fakeText: 'رجب شهر الله، وشعبان شهري، ورمضان شهر أمتي',
    degree: 'موضوع (مكذوب)',
    scholarRuling: 'حكم عليه أئمة الحديث بالوضع، قال ابن حجر في تبيين العجب: لم يرد في فضل شهر رجب ولا في صيامه حديث صحيح يصلح للحجة. وذكره السيوطي وابن الجوزي في الموضوعات.',
    source: 'تبيين العجب لابن حجر، تذكرة الموضوعات للمقدسي',
    category: 'fasting_ramadan',
    authenticAlternative: 'ثبت في الصحيحين عن أبي بكرة رضي الله عنه أن النبي ﷺ قال: «السنة اثنا عشر شهراً منها أربعة حرم: ثلاثة متواليات: ذو القعدة وذو الحجة والمحرم، ورجب مضر».'
  },
  {
    id: 3,
    title: 'دعاء «اللهم بارك لنا في رجب وشعبان وبلغنا رمضان»',
    fakeText: 'اللهم بارك لنا في رجب وشعبان وبلغنا رمضان',
    degree: 'ضعيف',
    scholarRuling: 'ضعفه الحافظ ابن حجر في تبيين العجب، والنووي في الأذكار، والشيخ الألباني في ضعيف الجامع (4395). ويجوز الدعاء ببلوغ رمضان بصيغ عامة دون اعتقاد ثبوت هذا الحديث بخصوصه.',
    source: 'ضعيف الجامع الصغير (4395)، ميزان الاعتدال للذهبي',
    category: 'fasting_ramadan',
    authenticAlternative: 'كان السلف الصالح يدعون الله ستة أشهر أن يبلغهم رمضان، ثم يدعونه ستة أشهر أن يتقبله منهم.'
  },
  {
    id: 4,
    title: 'حديث «رمضان أوله رحمة، وأوسطه مغفرة، وآخره عتق من النار»',
    fakeText: 'رمضان أوله رحمة، وأوسطه مغفرة، وآخره عتق من النار',
    degree: 'منكر وضعيف جداً',
    scholarRuling: 'رواه ابن خزيمة وقال: إن صح الخبر. وضعفه الشيخ الألباني في السلسلة الضعيفة (1569). فرمضان كله رحمة ومغفرة وعتق من النار كل ليلة، وليس مقسماً أعشاراً.',
    source: 'السلسلة الضعيفة للألباني (1569)، ذخيرة الحفاظ لابن طاهر',
    category: 'fasting_ramadan',
    authenticAlternative: 'عن أبي هريرة رضي الله عنه أن النبي ﷺ قال: «ولله عتقاء من النار وذلك كل ليلة» (صحيح الترمذي وصحيح ابن ماجه).'
  }
];

/**
 * Loads the fake hadiths catalog (local JSON file, ~22 KB, instant load)
 */
export async function loadFakeHadiths(): Promise<FakeHadithItem[]> {
  if (fakeHadithsCache) return fakeHadithsCache;

  // 1. Node local FS check (SSR / tests / build)
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (typeof window === 'undefined' || isNode) {
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

  // 4. Built-in seed fallback (guaranteed never empty)
  return BUILTIN_SEED_FAKES;
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
      // Require genuine text/phrase match, NOT merely disjoint tokens scattered across a long hadith
      const validMatches = sunnahResults.filter((item) => {
        const itemTextNorm = normalizeArabic(item.hadith.arabic || '');
        if (itemTextNorm.includes(normQuery)) return true;
        const words = normQuery.split(/\s+/).filter((w) => w.length >= 2);
        if (words.length >= 2) {
          const phrase2 = words.slice(0, 2).join(' ');
          const phrase3 = words.slice(0, 3).join(' ');
          return itemTextNorm.includes(phrase3) || itemTextNorm.includes(phrase2);
        }
        return false;
      });

      if (validMatches.length > 0) {
        return {
          query: q,
          matchedFake: null,
          authenticMatches: validMatches.slice(0, 5),
          status: 'found_in_corpus',
        };
      }
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
