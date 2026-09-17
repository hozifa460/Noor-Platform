import type { ReciterMeta } from './types';

/**
 * Normalizes Arabic text for robust fuzzy comparison of reciter names.
 * Handles honorifics, diacritics, prefixes, letter variants (alef/hamza/taa marbuta),
 * and compound prefixes (like 'عبد ').
 */
export function normalizeReciterWords(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\s*\([^)]*\)/g, '') // remove parentheses like (مرتل), (مجود)
    .replace(/^(الشيخ|الدكتور|القارئ)\s+/g, '') // strip title prefixes
    .replace(/[أإآ]/g, 'ا') // normalize alef variants
    .replace(/ة/g, 'ه') // normalize taa marbuta
    .replace(/ى/g, 'ي') // normalize alef maksura
    .replace(/عبد\s+/g, 'عبد') // join "عبد الرحمن" -> "عبدالرحمن"
    .replace(/[\u064B-\u065F]/g, '') // strip Arabic diacritics/tashkeel
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Checks if two reciter names refer to the same reciter across EveryAyah and MP3Quran catalogs.
 */
export function matchReciterNames(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  const w1 = normalizeReciterWords(name1);
  const w2 = normalizeReciterWords(name2);
  const s1 = w1.join('');
  const s2 = w2.join('');

  if (s1 === s2 || (s1.length > 4 && s2.length > 4 && (s1.includes(s2) || s2.includes(s1)))) {
    return true;
  }

  // Token-based matching for composite Arabic names
  if (w1.length >= 2 && w2.length >= 2) {
    // Both first and last tokens match (e.g. "مشاري" and "العفاسي", "محمد" and "الطبلاوي")
    if (w1[0] === w2[0] && w1[w1.length - 1] === w2[w2.length - 1]) {
      return true;
    }
    // Last name matches and at least one other word matches
    if (w1[w1.length - 1] === w2[w2.length - 1]) {
      const hasOther = w1.slice(0, -1).some((x) => w2.slice(0, -1).includes(x));
      if (hasOther) return true;
    }
  }

  return false;
}

/**
 * Finds a matching verse-by-verse reciter for a given full surah reciter.
 */
export function findMatchingVerseReciter<T extends { reciterName: string }>(
  fullSurahReciter: T | null | undefined,
  verseReciters: ReciterMeta[]
): ReciterMeta | null {
  if (!fullSurahReciter || !Array.isArray(verseReciters) || verseReciters.length === 0) {
    return null;
  }
  return (
    verseReciters.find((vr) => matchReciterNames(vr.name, fullSurahReciter.reciterName)) || null
  );
}

/**
 * Finds a matching full surah reciter for a given verse-by-verse reciter.
 */
export function findMatchingFullSurahReciter<T extends { reciterName: string }>(
  verseReciter: ReciterMeta | null | undefined,
  fullSurahReciters: T[]
): T | null {
  if (!verseReciter || !Array.isArray(fullSurahReciters) || fullSurahReciters.length === 0) {
    return null;
  }
  return (
    fullSurahReciters.find((fs) => matchReciterNames(verseReciter.name, fs.reciterName)) || null
  );
}
