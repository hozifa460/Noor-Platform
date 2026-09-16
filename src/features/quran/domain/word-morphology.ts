/**
 * Domain types and utilities for Holy Quran Word Morphology & Root Explorer («استكشف الكلمة»).
 * Scope: Hafs an Asim (رواية حفص عن عاصم).
 * Source attribution: The Quranic Arabic Corpus (v0.4) - Kais Dukes, University of Leeds.
 */

export type QuranWordSegmentType = 'prefix' | 'stem' | 'suffix';

export interface QuranWordSegment {
  segment: number;
  type: QuranWordSegmentType;
  arabic: string;
  tag: string;
  tagAr: string;
  featuresAr: string[];
}

export interface QuranWordMorphology {
  ayahNo: number;
  wordIndex: number;
  wordArabic: string;
  root: string;
  rootSpaced: string;
  rootBw: string;
  lemma: string;
  posSummary: string;
  segments: QuranWordSegment[];
}

export interface QuranSurahMorphology {
  surahNo: number;
  source: string;
  riwayah: string;
  attribution: string;
  totalWords: number;
  words: Record<string, QuranWordMorphology>;
}

export interface QuranRootIndexEntry {
  bw: string;
  spaced: string;
  count: number;
  occurrences: [number, number, number][]; // [surahNo, ayahNo, wordIndex]
}

export type QuranRootsIndex = Record<string, QuranRootIndexEntry>;

export interface QuranWordTarget {
  surahNo: number;
  ayahNo: number;
  wordIndex: number;
  wordText: string;
}

export interface QuranRootOccurrence {
  surahNo: number;
  surahName: string;
  ayahNo: number;
  wordIndex: number;
  ayahText: string;
}

export interface AyahTextToken {
  type: 'word' | 'waqf';
  text: string;
  wordIndex?: number;
}

/** Standalone Quranic waqf marks and signs pattern */
export const QURAN_WAQF_MARKS_REGEX = /^[\u06D6-\u06ED\s]+$/;

/**
 * Tokenizes Quranic verse text into words and waqf marks,
 * assigning a 1-indexed word position to each genuine word token.
 * Preserves exact text characters and order.
 */
export function tokenizeAyahWords(textAr: string): AyahTextToken[] {
  if (!textAr) return [];
  const parts = textAr.trim().split(/\s+/);
  const tokens: AyahTextToken[] = [];
  let wordCounter = 0;

  for (const part of parts) {
    if (!part) continue;
    if (QURAN_WAQF_MARKS_REGEX.test(part)) {
      tokens.push({
        type: 'waqf',
        text: part,
      });
    } else {
      wordCounter += 1;
      tokens.push({
        type: 'word',
        text: part,
        wordIndex: wordCounter,
      });
    }
  }

  return tokens;
}

/**
 * Normalizes an Arabic root string for robust matching
 * (unifies forms of alif/hamza and removes spaces/dashes).
 */
export function normalizeArabicRoot(root: string): string {
  if (!root) return '';
  return root
    .replace(/[\s\-_]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Normalizes Quranic Arabic text for matching against morphological corpus entries.
 * Strips tashkeel, Quranic recitation signs, and unifies alif/hamza/ya/ta-marbuta forms.
 */
export function cleanArabicForMatching(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\s\-_]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[\u06E5\u06E6\u06DF\u06E0\u06E2\u06ED\u06EB\u06E8\u06EC\u06E3\u065C]/g, '')
    .trim();
}

/** Status types for distinguishing network/asset load errors from unavailable analysis */
export type MorphologyLoadStatus = 'success' | 'network_error' | 'not_found';

export interface WordMorphologyResult {
  status: MorphologyLoadStatus;
  morphology: QuranWordMorphology | null;
  errorMessage?: string;
}

export interface RootOccurrencesResult {
  status: MorphologyLoadStatus;
  occurrences: QuranRootOccurrence[];
  errorMessage?: string;
}
