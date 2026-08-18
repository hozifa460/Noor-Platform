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
 * Helper to match token with word boundary for short (<= 2 char) tokens
 */
function matchSingleToken(normalizedTarget: string, tok: string): boolean {
  if (!normalizedTarget || !tok) return false;

  // For 2-letter tokens (like بر, حق, دم, يد, اب, ام, اخ), prevent substring false positives in اخبرنا / ابراهيم
  if (tok.length <= 2) {
    const words = normalizedTarget.split(/\s+/);
    const prefixes = ['ال', 'و', 'ف', 'ب', 'ل', 'كال', 'بال', 'فال', 'وال', 'لل', 'وبال', 'فبال'];
    for (const w of words) {
      if (w === tok) return true;
      for (const p of prefixes) {
        if (w === p + tok) return true;
      }
    }
    return false;
  }

  // 1. Direct substring match
  if (normalizedTarget.includes(tok)) return true;

  // 2. Multi-prefix stripping (وبال, فبال, كال, بال, فال, وال, لل, ال, و, ف, ب, ك, ل)
  const prefixes = ['وبال', 'فبال', 'كال', 'بال', 'فال', 'وال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
  for (const p of prefixes) {
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

  // 6. Root/Stem matching for common forms (والدين / الوالدين / وبالوالدين -> والد / والده / والديه / والداه / والديك)
  const baseTok = tok.replace(/^(?:وبال|فبال|كال|بال|فال|وال|لل|ال|و|ف|ب|ك|ل)/, '');
  if (baseTok.startsWith('والد') && normalizedTarget.includes('والد')) return true;

  return false;
}

/**
 * Checks if a target text matches an Arabic search query.
 */
export function arabicSearchMatch(target: string | null | undefined, query: string): boolean {
  if (!target || !query) return false;

  const normalizedTarget = normalizeArabic(target);
  const queryTokens = tokenizeArabic(query);

  if (queryTokens.length === 0) return false;

  // For compact snippets (length <= 60) with long multi-word queries (>= 3 words)
  if (normalizedTarget.length <= 60 && queryTokens.length >= 3) {
    let matchedCount = 0;
    for (const tok of queryTokens) {
      if (matchSingleToken(normalizedTarget, tok)) matchedCount++;
    }
    // If at least 2 tokens or half the query matches the snippet
    if (matchedCount >= 2 || matchedCount >= Math.ceil(queryTokens.length / 2)) {
      return true;
    }
  }

  return queryTokens.every((tok) => matchSingleToken(normalizedTarget, tok));
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
