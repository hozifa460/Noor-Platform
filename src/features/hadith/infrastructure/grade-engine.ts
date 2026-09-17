/**
 * Hadith Grade & Authentication Engine (أحكام المحدثين ودرجات الأحاديث).
 * Integrates rulings from Sahihayn and Sunan collections (Al-Albani, Ahmad Shakir, Ibn Hajar, At-Tirmidhi).
 */

export interface HadithGradeInfo {
  grade: 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع' | 'مقبول' | 'غير محدد';
  rawGrade?: string;
  scholar?: string;
  source?: string;
  badgeColor?: 'emerald' | 'sky' | 'amber' | 'rose' | 'gray';
}

interface GradeEntry {
  g: 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع' | 'مقبول' | 'غير محدد';
  r: string;
  s: string;
}

const gradeCache = new Map<string, HadithGradeInfo>();
const sunanGradesCache = new Map<string, Record<number, GradeEntry>>();

const SUNAN_BOOK_IDS = new Set(['tirmidhi', 'abudawud', 'nasai', 'ibnmajah']);

/**
 * Normalizes any grade text into canonical scholarly taxonomy.
 * Safely maps unclassified, typos, or missing grades to 'غير محدد' instead of falsely assuming 'مقبول'.
 */
export function normalizeGradeText(
  raw?: string | null
): 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع' | 'مقبول' | 'غير محدد' {
  if (!raw) return 'غير محدد';

  const cleaned = raw
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B`']/g, "'")
    .replace(/da[, ]+if/g, "da'if");

  // 1. Fabricated / Batil
  if (
    raw.includes('موضوع') ||
    raw.includes('باطل') ||
    cleaned.includes('mawdu') ||
    cleaned.includes('batil')
  ) {
    return 'موضوع';
  }

  // 2. Weak & Terminology categories (Munkar, Shadh, Maqtu', etc.)
  if (
    raw.includes('ضعيف') ||
    raw.includes('منكر') ||
    raw.includes('شاذ') ||
    raw.includes('مقطوع') ||
    cleaned.includes("da'if") ||
    cleaned.includes('daif') ||
    cleaned.includes('munkar') ||
    cleaned.includes('shadh') ||
    cleaned.includes("maqtu'") ||
    cleaned.includes('maqtu')
  ) {
    return 'ضعيف';
  }

  // 3. Sahih
  if (raw.includes('صحيح') || cleaned.includes('sahih')) {
    return 'صحيح';
  }

  // 4. Hasan
  if (raw.includes('حسن') || cleaned.includes('hasan')) {
    return 'حسن';
  }

  // 5. Maqbul (only if explicitly classified by scholar)
  if (raw.includes('مقبول') || cleaned.includes('maqbul')) {
    return 'مقبول';
  }

  // 6. Safe default when no explicit verified ruling is known
  return 'غير محدد';
}

/**
 * Loads and caches Sunan grade map from local storage / CDN.
 */
export async function loadSunanGrades(bookId: string): Promise<Record<number, GradeEntry> | null> {
  if (!SUNAN_BOOK_IDS.has(bookId)) return null;
  const cached = sunanGradesCache.get(bookId);
  if (cached) return cached;

  // 1. Node local FS check
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'grades', `${bookId}.json`);
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        sunanGradesCache.set(bookId, data);
        return data;
      }
    } catch {
      /* proceed */
    }
  }

  // 2. Browser fetch
  try {
    const res = await fetch(`/data/hadith/grades/${bookId}.json`, { cache: 'force-cache' });
    if (res.ok) {
      const data = await res.json();
      sunanGradesCache.set(bookId, data);
      return data;
    }
  } catch {
    /* fallback */
  }

  return null;
}

/**
 * Returns the authentic scholarly grade for a Hadith based on book and metadata.
 */
export function getHadithGrade(
  bookId: string,
  hadithNumber: number,
  explicitGrade?: string
): HadithGradeInfo {
  const cacheKey = `${bookId}:${hadithNumber}:${explicitGrade || ''}`;
  const cached = gradeCache.get(cacheKey);
  if (cached) return cached;

  let result: HadithGradeInfo;

  // 1. Sahihayn (Bukhari & Muslim) are universally agreed to be Sahih
  if (bookId === 'bukhari') {
    result = {
      grade: 'صحيح',
      rawGrade: 'صحيح متفق عليه أو مخرج في الصحيح',
      scholar: 'الإمام البخاري وأجمع علماء الأمة على صحة أصوله',
      source: 'صحيح البخاري',
      badgeColor: 'emerald',
    };
  } else if (bookId === 'muslim') {
    result = {
      grade: 'صحيح',
      rawGrade: 'صحيح مخرج في الصحيح',
      scholar: 'الإمام مسلم وأجمع علماء الأمة على صحة أصوله',
      source: 'صحيح مسلم',
      badgeColor: 'emerald',
    };
  } else {
    // 2. Check Sunan grade map if loaded in memory or on Node
    let bookGrades = sunanGradesCache.get(bookId);
    if (!bookGrades && typeof window === 'undefined' && SUNAN_BOOK_IDS.has(bookId)) {
      try {
        // Synchronous read for SSR/test/build
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path');
        const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'grades', `${bookId}.json`);
        if (fs.existsSync(p)) {
          bookGrades = JSON.parse(fs.readFileSync(p, 'utf-8'));
          if (bookGrades) sunanGradesCache.set(bookId, bookGrades);
        }
      } catch {
        /* proceed */
      }
    }

    const verified = bookGrades?.[hadithNumber];
    if (verified) {
      const normalized = normalizeGradeText(verified.r || verified.g);
      result = {
        grade: normalized,
        rawGrade: verified.r,
        scholar: verified.s,
        source: 'موسوعة أحكام وتخريج السنن',
        badgeColor:
          normalized === 'صحيح'
            ? 'emerald'
            : normalized === 'حسن'
            ? 'sky'
            : normalized === 'ضعيف'
            ? 'amber'
            : normalized === 'موضوع'
            ? 'rose'
            : 'gray',
      };
    } else if (explicitGrade) {
      const normalized = normalizeGradeText(explicitGrade);
      result = {
        grade: normalized,
        rawGrade: explicitGrade,
        scholar: 'حكم مسند مع المتن',
        source: 'موسوعة الحديث الشريف',
        badgeColor:
          normalized === 'صحيح'
            ? 'emerald'
            : normalized === 'حسن'
            ? 'sky'
            : normalized === 'ضعيف'
            ? 'amber'
            : normalized === 'موضوع'
            ? 'rose'
            : 'gray',
      };
    } else {
      result = {
        grade: 'غير محدد',
        rawGrade: undefined,
        scholar: undefined,
        source: 'لم نقف على حكم مسند في هذه النسخة',
        badgeColor: 'gray',
      };
    }
  }

  gradeCache.set(cacheKey, result);
  return result;
}

/**
 * Checks if a hadith is Muttafaqun Alayh (متفق عليه - narrated by Bukhari and Muslim).
 * Requires explicit textual or metadata verification. Merely appearing in Bukhari or Muslim alone
 * does NOT automatically imply agreement of both Imams.
 */
export function isMuttafaqunAlayh(
  _bookId: string,
  _hadithNumber: number,
  text?: string,
  rawGrade?: string
): boolean {
  if (
    rawGrade &&
    (rawGrade.includes('متفق عليه') ||
      rawGrade.includes('رواه البخاري ومسلم') ||
      rawGrade.includes('أخرجه الشيخان'))
  ) {
    return true;
  }
  if (
    text &&
    (text.includes('متفق عليه') ||
      text.includes('رواه البخاري ومسلم') ||
      text.includes('أخرجه البخاري ومسلم') ||
      text.includes('أخرجه الشيخان'))
  ) {
    return true;
  }
  return false;
}
