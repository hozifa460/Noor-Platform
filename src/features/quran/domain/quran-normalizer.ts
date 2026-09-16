import { ALL_SURAHS } from './data';
import type { SurahMeta } from './types';

// Unicode Regex constants for Arabic and Quranic text
// Unicode Regex constants for Arabic and Quranic text
export const TASHKEEL_WITHOUT_DAGGER_REGEX = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g;
export const TASHKEEL_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
export const TATWEEL_REGEX = /\u0640/g;
export const ZERO_WIDTH_REGEX = /[\u200B-\u200F\uFEFF\u202A-\u202E\u00AD\u061C]/g;
export const PUNCTUATION_REGEX = /[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"«»“”‏\\]/g;

/**
 * Converts Eastern Arabic-Indic numerals (٠-٩) to Western Arabic (0-9).
 */
export function convertArabicNumeralsToEnglish(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => {
    const idx = arabicDigits.indexOf(w);
    return idx !== -1 ? String(idx) : w;
  });
}

/**
 * Normalizes Quranic text specifically for fast, accurate search comparisons:
 * - Converts Arabic digits to English digits
 * - Replaces Uthmani dagger alif on waw (وٰ -> ا) so 'الصَّلَوٰةَ' matches 'الصلاة'
 * - Converts Uthmani dagger alifs (ٰ) to Alif (ا) so 'ٱلْعَٰلَمِينَ' matches dictational 'العالمين'
 * - Strips zero-width characters, tatweel, remaining tashkeel, and Quranic annotations
 * - Normalizes Alef forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Yaa / Alef Maksura (ى -> ي)
 * - Unifies common words where modern dictational spelling omits the alif that Uthmani includes via dagger alif
 * - Strips punctuation and collapses whitespace
 */
export function normalizeQuranArabic(text: string | null | undefined): string {
  if (!text) return '';

  let s = text
    .normalize('NFKD')
    .replace(ZERO_WIDTH_REGEX, '')
    // Replace Uthmani waw/yaa + dagger alif with alif (e.g. صلوٰة -> صلاة -> صلاه)
    .replace(/و\u0670/g, 'ا')
    .replace(/ى\u0670/g, 'ا')
    // Convert Uthmani dagger alifs to alif (e.g. ٱلْعَٰلَمِينَ -> العالمين, مَٰلِكِ -> مالك)
    .replace(/\u0670/g, 'ا')
    .replace(TASHKEEL_WITHOUT_DAGGER_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Unify common words where modern dictational spelling omits the alif that Uthmani includes via dagger alif:
  s = s
    .replace(/الرحمان/g, 'الرحمن')
    .replace(/هاذا/g, 'هذا')
    .replace(/هاذه/g, 'هذه')
    .replace(/ذالك/g, 'ذلك')
    .replace(/هاؤلاء/g, 'هؤلاء')
    .replace(/لاكن/g, 'لكن')
    .replace(/الاه/g, 'اله')
    .replace(/اولائك/g, 'اولئك');

  return s;
}

export interface QuranReferenceResult {
  isReference: boolean;
  isValid: boolean;
  surahNo?: number;
  ayahNo?: number;
  surahMeta?: SurahMeta;
  errorMessage?: string;
  isSurahOnly?: boolean;
}

// Pre-computed map of normalized surah names to SurahMeta
const SURAH_NAME_MAP = new Map<string, SurahMeta>();
for (const surah of ALL_SURAHS) {
  const normName = normalizeQuranArabic(surah.nameAr);
  SURAH_NAME_MAP.set(normName, surah);
  // Also store without 'ال' prefix if applicable
  if (normName.startsWith('ال')) {
    SURAH_NAME_MAP.set(normName.slice(2), surah);
  }
}

/**
 * Parses user search query to detect if it matches an Ayah or Surah reference:
 * Examples supported:
 * - '2:255', '٢:٢٥٥', '2 : 255', '2-255'
 * - 'البقرة: 255', 'البقرة 255', 'سورة البقرة: 255'
 * - 'سورة البقرة آية 255', 'سورة 2 آية 255'
 * - 'الفاتحة', 'سورة الفاتحة', 'الكهف', 'سورة الكهف' (Surah name alone)
 */
export function parseQuranReference(rawQuery: string): QuranReferenceResult | null {
  if (!rawQuery) return null;

  // Convert Arabic numerals first
  const query = convertArabicNumeralsToEnglish(rawQuery.trim());

  // 1. Check patterns like "2:255", "2 : 255", "2-255", "2/255"
  const colonDashMatch = query.match(/^(\d{1,3})\s*[:\-\/]\s*(\d{1,3})$/);
  if (colonDashMatch) {
    const sNum = parseInt(colonDashMatch[1], 10);
    const aNum = parseInt(colonDashMatch[2], 10);
    return validateReferenceNumbers(sNum, aNum);
  }

  // 2. Check pattern: "سورة [name/number] آية [number]" or "سورة [name/number] [number]"
  const surahPrefixMatch = query.match(/^(?:سوره|سورة)\s+([^\d:]+?)(?:\s+(?:آية|اية|رقم)?)?\s*[:\-]?\s*(\d{1,3})$/i);
  if (surahPrefixMatch) {
    const surahTarget = surahPrefixMatch[1].trim();
    const aNum = parseInt(surahPrefixMatch[2], 10);
    const surahMeta = findSurahByNameOrNumber(surahTarget);
    if (!surahMeta) {
      return {
        isReference: true,
        isValid: false,
        errorMessage: `لم يتم التعرف على اسم السورة: "${surahTarget}"`,
      };
    }
    return validateReferenceNumbers(surahMeta.number, aNum);
  }

  // 3. Check pattern: "[SurahName] [number]" or "[SurahName]: [number]" (e.g. "البقرة 255", "الكهف: 10")
  const namedMatch = query.match(/^([^\d:]+?)\s*[:\-]\s*(\d{1,3})$/) || query.match(/^([^\d:]+?)\s+(\d{1,3})$/);
  if (namedMatch) {
    const candidateName = namedMatch[1].trim();
    const aNum = parseInt(namedMatch[2], 10);
    const surahMeta = findSurahByNameOrNumber(candidateName);
    if (surahMeta) {
      return validateReferenceNumbers(surahMeta.number, aNum);
    }
  }

  // 4. Standalone Surah name or "سورة [name]" alone (e.g. "الفاتحة", "سورة الفاتحة", "الكهف")
  const strippedSurahPrefix = query.replace(/^(?:سوره|سورة)\s+/, '').trim();
  const standaloneSurahMeta = findSurahByNameOrNumber(strippedSurahPrefix);
  if (standaloneSurahMeta) {
    return {
      isReference: true,
      isValid: true,
      surahNo: standaloneSurahMeta.number,
      ayahNo: 1,
      surahMeta: standaloneSurahMeta,
      isSurahOnly: true,
    };
  }

  // If query explicitly starts with "سورة" / "سوره" but was not recognized
  if (/^(?:سوره|سورة)\s+/i.test(query)) {
    return {
      isReference: true,
      isValid: false,
      errorMessage: `لم يتم التعرف على اسم السورة: "${strippedSurahPrefix}"`,
    };
  }

  // 5. Single number reference alone (e.g. "2") - if strictly 1..114, consider as surah pointer
  const singleNumMatch = query.match(/^(\d{1,3})$/);
  if (singleNumMatch) {
    const sNum = parseInt(singleNumMatch[1], 10);
    if (sNum >= 1 && sNum <= 114) {
      const meta = ALL_SURAHS[sNum - 1];
      return {
        isReference: true,
        isValid: true,
        surahNo: sNum,
        ayahNo: 1,
        surahMeta: meta,
        isSurahOnly: true,
      };
    }
    return {
      isReference: true,
      isValid: false,
      errorMessage: `رقم السورة غير صحيح (${sNum}). القرآن الكريم يضم 114 سورة (1 - 114).`,
    };
  }

  return null;
}

function findSurahByNameOrNumber(target: string): SurahMeta | null {
  const trimmed = target.trim();
  // Require full match for pure numeric surah identifiers (prevent partial prefix matching like 2abc or 2:255x)
  if (/^\d+$/.test(trimmed)) {
    const asNum = parseInt(trimmed, 10);
    if (asNum >= 1 && asNum <= 114) {
      return ALL_SURAHS[asNum - 1];
    }
    return null;
  }

  const norm = normalizeQuranArabic(trimmed).replace(/^(?:سوره|سورة)\s+/, '');
  if (SURAH_NAME_MAP.has(norm)) {
    return SURAH_NAME_MAP.get(norm)!;
  }
  if (norm.startsWith('ال') && SURAH_NAME_MAP.has(norm.slice(2))) {
    return SURAH_NAME_MAP.get(norm.slice(2))!;
  }

  return null;
}

function validateReferenceNumbers(surahNo: number, ayahNo: number): QuranReferenceResult {
  if (surahNo < 1 || surahNo > 114) {
    return {
      isReference: true,
      isValid: false,
      surahNo,
      ayahNo,
      errorMessage: `رقم السورة غير صحيح (${surahNo}). القرآن الكريم يضم 114 سورة (1 - 114).`,
    };
  }

  const surahMeta = ALL_SURAHS[surahNo - 1];
  if (ayahNo < 1 || ayahNo > surahMeta.numberOfAyahs) {
    return {
      isReference: true,
      isValid: false,
      surahNo,
      ayahNo,
      surahMeta,
      errorMessage: `المرجع غير صحيح: سورة ${surahMeta.nameAr} تحتوي على ${surahMeta.numberOfAyahs} آية فقط.`,
    };
  }

  return {
    isReference: true,
    isValid: true,
    surahNo,
    ayahNo,
    surahMeta,
  };
}
