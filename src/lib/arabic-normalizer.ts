/**
 * High-performance Arabic text normalizer and search matcher.
 * Handles diacritics removal, letter normalization (Alef, Yaa, Taa Marbuta),
 * Tatweel removal, zero-width characters stripping, and flexible prefix/suffix matching.
 */

// Tashkeel / Harakat Unicode range: U+064B to U+065F, plus U+0670 (Superscript Alef)
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
// Tatweel / Kashida: U+0640
const TATWEEL_REGEX = /\u0640/g;
// Zero-width characters (ZWNJ, ZWJ, BOM, LRM, RLM)
const ZERO_WIDTH_REGEX = /[\u200B-\u200F\uFEFF\u202A-\u202E\u00AD\u061C]/g;
// Punctuation and special symbols
const PUNCTUATION_REGEX = /[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"«»“”‏\\]/g;

/**
 * Normalizes Arabic text for accurate search comparisons:
 * - Strips zero-width characters and directional marks
 * - Strips all Tashkeel / Harakat and Quranic marks
 * - Strips Tatweel (Kashida)
 * - Normalizes Alef forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Yaa / Alef Maksura (ى -> ي)
 * - Converts to lower-case for any English characters
 * - Normalizes whitespace and punctuation
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .normalize('NFKD')
    .replace(ZERO_WIDTH_REGEX, '')
    .replace(TASHKEEL_REGEX, '')
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
}

/**
 * Tokenizes Arabic query string into normalized search tokens.
 */
export function tokenizeArabic(query: string): string[] {
  const normalized = normalizeArabic(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter((t) => t.length > 0);
}


/**
 * Zero-allocation fast token match on pre-normalized target and token
 */
export function matchSingleTokenFast(normalizedTarget: string, tok: string): boolean {
  if (!tok || !normalizedTarget) return false;

  // 1. Direct contains (fastest)
  if (normalizedTarget.includes(tok)) return true;

  // 2. Prefixes on the token (query has prefix, target might not)
  const prefixes = ['وبال', 'فبال', 'كال', 'بال', 'فال', 'وال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
  for (let i = 0; i < prefixes.length; i++) {
    const p = prefixes[i];
    if (tok.startsWith(p) && tok.length > p.length + 2) {
      const withoutP = tok.slice(p.length);
      if (normalizedTarget.includes(withoutP)) return true;
      if (normalizedTarget.includes('ال' + withoutP)) return true;
    }
  }

  // 3. Target might have "ال" and query doesn't
  if (normalizedTarget.includes('ال' + tok)) return true;

  // 4. Target might have "و" or "ب" or "ف" prefix on target words
  if (normalizedTarget.includes('و' + tok)) return true;
  if (normalizedTarget.includes('ب' + tok)) return true;
  if (normalizedTarget.includes('ف' + tok)) return true;
  if (normalizedTarget.includes('وب' + tok)) return true;

  // 5. Ibn / Bin interchangeability
  if (tok === 'ابن' && (normalizedTarget.includes('بن') || normalizedTarget.includes('ابن'))) return true;
  if (tok === 'بن' && (normalizedTarget.includes('ابن') || normalizedTarget.includes('بن'))) return true;

  // 6. Root/Stem matching for common forms
  if (tok.includes('والد') && normalizedTarget.includes('والد')) return true;

  return false;
}

/**
 * Checks if a target text matches an Arabic search query.
 * When targetAlreadyNormalized is true, skips expensive normalizeArabic(target).
 */
export function arabicSearchMatch(
  target: string | null | undefined,
  query: string,
  targetAlreadyNormalized = false
): boolean {
  if (!target || !query) return false;

  const normalizedTarget = targetAlreadyNormalized ? target : normalizeArabic(target);
  const queryTokens = tokenizeArabic(query);

  if (queryTokens.length === 0) return false;

  // For compact snippets (length <= 60) with long multi-word queries (>= 3 words)
  if (normalizedTarget.length <= 60 && queryTokens.length >= 3) {
    let matchedCount = 0;
    for (let i = 0; i < queryTokens.length; i++) {
      if (matchSingleTokenFast(normalizedTarget, queryTokens[i])) matchedCount++;
    }
    if (matchedCount >= 2 || matchedCount >= Math.ceil(queryTokens.length / 2)) {
      return true;
    }
  }

  for (let i = 0; i < queryTokens.length; i++) {
    if (!matchSingleTokenFast(normalizedTarget, queryTokens[i])) return false;
  }
  return true;
}

/**
 * Calculates a relevance score for ordering search results.
 */
export function arabicSearchScore(target: string | null | undefined, query: string): number {
  if (!target || !query) return 0;

  const normTarget = normalizeArabic(target);
  const normQuery = normalizeArabic(query);

  if (normTarget === normQuery) return 100; // Exact match
  if (normTarget.startsWith(normQuery)) return 75; // Prefix match
  if (normTarget.includes(normQuery)) return 50; // Substring match

  return 0;
}
