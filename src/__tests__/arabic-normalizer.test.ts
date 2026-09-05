import { describe, it, expect } from 'vitest';
import {
  normalizeArabic,
  stripTashkeel,
  stripHarakat,
  tokenizeArabic,
  matchSingleTokenFast,
  arabicSearchMatch,
  arabicSearchScore,
  TASHKEEL_REGEX,
  TATWEEL_REGEX,
} from '@/lib/arabic/normalizer';

describe('Arabic Normalizer & Search Engine (arabic/normalizer.ts)', () => {
  describe('stripTashkeel', () => {
    it('returns empty string for null, undefined, or empty text', () => {
      expect(stripTashkeel(null)).toBe('');
      expect(stripTashkeel(undefined)).toBe('');
      expect(stripTashkeel('')).toBe('');
    });

    it('strips all diacritics including Tanween and Sukoon', () => {
      const input = 'قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ';
      const stripped = stripTashkeel(input);
      expect(stripped).toBe('قال رسول الله صلى الله عليه وسلم');
      expect(TASHKEEL_REGEX.test(stripped)).toBe(false);
    });

    it('strips Quranic annotation marks and superscript Alef', () => {
      const input = 'بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ';
      const stripped = stripTashkeel(input);
      expect(stripped.includes('َ')).toBe(false);
      expect(stripped.includes('ِ')).toBe(false);
      expect(stripped.includes('ْ')).toBe(false);
    });

    it('strips Quranic small vowel signs and honorific marks (U+0610 to U+061A)', () => {
      // \u0618 (small fatha), \u0619 (small damma), \u061A (small kasra)
      const quranicVowels = '\u0628\u0618\u0633\u0619\u0645\u061A';
      expect(stripTashkeel(quranicVowels)).toBe('بسم');
      // \u0610 (sallallahou alayhe wasallam sign)
      const honorific = 'محمد\u0610';
      expect(stripTashkeel(honorific)).toBe('محمد');
    });
  });

  describe('stripHarakat', () => {
    it('returns empty string for null or undefined', () => {
      expect(stripHarakat(null)).toBe('');
      expect(stripHarakat(undefined)).toBe('');
    });

    it('strips both tashkeel and tatweel (kashida)', () => {
      const input = 'صَـــلَاةٌ';
      const stripped = stripHarakat(input);
      expect(stripped).toBe('صلاة');
      expect(TATWEEL_REGEX.test(stripped)).toBe(false);
      expect(TASHKEEL_REGEX.test(stripped)).toBe(false);
    });
  });

  describe('normalizeArabic', () => {
    it('handles empty, null, or undefined values gracefully', () => {
      expect(normalizeArabic(null)).toBe('');
      expect(normalizeArabic(undefined)).toBe('');
      expect(normalizeArabic('')).toBe('');
    });

    it('normalizes all Alef forms (أ, إ, آ, ٱ -> ا)', () => {
      expect(normalizeArabic('إسلام')).toBe('اسلام');
      expect(normalizeArabic('أحمد')).toBe('احمد');
      expect(normalizeArabic('آيات')).toBe('ايات');
      expect(normalizeArabic('ٱلرحمن')).toBe('الرحمن');
    });

    it('normalizes Taa Marbuta (ة -> ه)', () => {
      expect(normalizeArabic('الصلاة')).toBe('الصلاه');
      expect(normalizeArabic('الزكاة')).toBe('الزكاه');
      expect(normalizeArabic('فاطمة')).toBe('فاطمه');
    });

    it('normalizes Alef Maksura & Persian/Urdu variants (ى -> ي)', () => {
      expect(normalizeArabic('على')).toBe('علي');
      expect(normalizeArabic('هدى')).toBe('هدي');
      expect(normalizeArabic('فتوى')).toBe('فتوي');
    });

    it('normalizes Waw with Hamza (ؤ -> و) and strips standalone Hamza (ء)', () => {
      expect(normalizeArabic('مؤمن')).toBe('مومن');
      expect(normalizeArabic('سماء')).toBe('سما');
      expect(normalizeArabic('قراءة')).toBe('قراه');
    });

    it('strips Tatweel (Kashida) and zero-width characters', () => {
      expect(normalizeArabic('مـــنــصـــة الــــنــــور')).toBe('منصه النور');
      // Zero-width characters (ZWNJ \u200C, ZWJ \u200D, BOM \uFEFF)
      const withZeroWidth = 'كتاب \u200Cالله \uFEFFالكريم';
      expect(normalizeArabic(withZeroWidth)).toBe('كتاب الله الكريم');
    });

    it('replaces punctuation with spaces, collapses whitespace and trims', () => {
      const raw = '  «تفسير: ابن كثير...» (سورة الفاتحة)،  ';
      expect(normalizeArabic(raw)).toBe('تفسير ابن كثير سوره الفاتحه');
    });

    it('converts English letters to lower case', () => {
      expect(normalizeArabic('PDF - Volume 1')).toBe('pdf volume 1');
    });
  });

  describe('tokenizeArabic', () => {
    it('returns empty array for empty or whitespace query', () => {
      expect(tokenizeArabic('')).toEqual([]);
      expect(tokenizeArabic('   ')).toEqual([]);
    });

    it('tokenizes and normalizes multi-word query into distinct tokens', () => {
      const tokens = tokenizeArabic('أحكامُ الصَّلاةِ والزَّكاةِ');
      expect(tokens).toEqual(['احكام', 'الصلاه', 'والزكاه']);
    });
  });

  describe('matchSingleTokenFast', () => {
    it('returns false for empty token or target', () => {
      expect(matchSingleTokenFast('', 'صلاة')).toBe(false);
      expect(matchSingleTokenFast('صلاة', '')).toBe(false);
    });

    it('matches direct substring', () => {
      expect(matchSingleTokenFast('شرح رياض الصالحين', 'رياض')).toBe(true);
    });

    it('matches target without Al- prefix when query has Al-', () => {
      expect(matchSingleTokenFast('كتاب صلاه التراويح', 'الصلاه')).toBe(true);
    });

    it('matches target with Al- prefix when query lacks Al-', () => {
      expect(matchSingleTokenFast('كتاب الصلاه', 'صلاه')).toBe(true);
    });

    it('handles Arabic conjunction and preposition prefixes (و, ف, ب, ك, ل, وبال)', () => {
      expect(matchSingleTokenFast('صحيح البخاري', 'وبالبخاري')).toBe(true);
      expect(matchSingleTokenFast('باب الصيام', 'بالصيام')).toBe(true);
      expect(matchSingleTokenFast('فضل العلم', 'والعلم')).toBe(true);
    });

    it('matches Ibn and Bin interchangeably', () => {
      expect(matchSingleTokenFast('فتاوى بن باز', 'ابن')).toBe(true);
      expect(matchSingleTokenFast('فتاوى ابن عثيمين', 'بن')).toBe(true);
    });

    it('handles root/stem matching and conjunction prefix كال', () => {
      expect(matchSingleTokenFast('بر الوالدين', 'والد')).toBe(true);
      expect(matchSingleTokenFast('الصلاة نور', 'كالصلاة')).toBe(true);
    });
  });

  describe('arabicSearchMatch', () => {
    it('returns false if target or query is empty', () => {
      expect(arabicSearchMatch('', 'البخاري')).toBe(false);
      expect(arabicSearchMatch('البخاري', '')).toBe(false);
      expect(arabicSearchMatch(null, 'البخاري')).toBe(false);
      expect(arabicSearchMatch('البخاري', '  ')).toBe(false);
    });

    it('matches exact text after normalization', () => {
      expect(arabicSearchMatch('تفسير سورة الفاتحة', 'الفاتحة')).toBe(true);
    });

    it('matches query with different diacritics and Alef forms', () => {
      expect(arabicSearchMatch('شَرْحُ الأَرْبَعِينَ النَّوَوِيَّة', 'الاربعين النووية')).toBe(true);
    });

    it('matches query regardless of token order', () => {
      expect(arabicSearchMatch('شرح صحيح البخاري', 'البخاري شرح')).toBe(true);
    });

    it('rejects queries containing non-matching tokens', () => {
      expect(arabicSearchMatch('شرح صحيح البخاري', 'صحيح مسلم')).toBe(false);
    });

    it('supports targetAlreadyNormalized fast-path flag', () => {
      const preNormalized = normalizeArabic('تفسير القرطبي للجامع لاحكام القران');
      expect(arabicSearchMatch(preNormalized, 'القرطبي', true)).toBe(true);
    });

    it('matches compact snippets (<= 60 chars) when query has >= 3 tokens and >= half match', () => {
      const compactTarget = 'كتاب الصلاة والزكاة'; // length <= 60
      const query = 'احكام الصلاة والزكاة والصيام'; // 4 tokens, 2 match
      expect(arabicSearchMatch(compactTarget, query)).toBe(true);
    });
  });

  describe('arabicSearchScore', () => {
    it('returns 0 for empty target or query', () => {
      expect(arabicSearchScore('', 'البخاري')).toBe(0);
      expect(arabicSearchScore('البخاري', '')).toBe(0);
      expect(arabicSearchScore(null, 'البخاري')).toBe(0);
    });

    it('gives 100 for exact match', () => {
      expect(arabicSearchScore('صحيح البخاري', 'صحيح البخاري')).toBe(100);
      expect(arabicSearchScore('صَحِيحُ الْبُخَارِيِّ', 'صحيح البخاري')).toBe(100);
    });

    it('gives 75 for prefix match', () => {
      expect(arabicSearchScore('صحيح البخاري المجلد الأول', 'صحيح البخاري')).toBe(75);
    });

    it('gives 50 for substring match', () => {
      expect(arabicSearchScore('مختصر صحيح البخاري', 'صحيح البخاري')).toBe(50);
    });

    it('gives 0 for non-match', () => {
      expect(arabicSearchScore('صحيح مسلم', 'البخاري')).toBe(0);
    });
  });
});
