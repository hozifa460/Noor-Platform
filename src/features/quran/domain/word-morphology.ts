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
