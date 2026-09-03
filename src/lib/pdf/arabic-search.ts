/**
 * Arabic-aware search utilities.
 *
 * Features:
 *   - Case-insensitive search
 *   - Ignore Arabic diacritics (tashkeel)
 *   - Normalize alef variants (أ إ آ → ا)
 *   - Normalize ya variants (ى → ي)
 *   - Normalize ta marbouta (ة → ه)
 *   - Normalize alef maqsura
 *   - Debounce search input
 */

import {
  stripTashkeel,
  normalizeArabic as canonicalNormalizeArabic,
} from '@/lib/arabic-normalizer';

/**
 * Remove Arabic diacritics (tashkeel) from a string using the canonical normalizer.
 */
export function removeDiacritics(text: string): string {
  return stripTashkeel(text);
}

/**
 * Normalize Arabic text for search using the canonical normalizer.
 */
export function normalizeArabic(text: string): string {
  return canonicalNormalizeArabic(text);
}


/**
 * Check if a text contains a query (Arabic-aware, case-insensitive,
 * diacritics-insensitive).
 */
export function arabicIncludes(text: string, query: string): boolean {
  const normalizedText = normalizeArabic(text);
  const normalizedQuery = normalizeArabic(query);
  return normalizedText.includes(normalizedQuery);
}

/**
 * Find all occurrences of a query in a text, returning their positions.
 * Uses Arabic-aware normalization.
 */
export function findOccurrences(
  text: string,
  query: string,
): { start: number; end: number }[] {
  const normalizedText = normalizeArabic(text);
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return [];

  const results: { start: number; end: number }[] = [];
  let idx = 0;
  while ((idx = normalizedText.indexOf(normalizedQuery, idx)) !== -1) {
    results.push({ start: idx, end: idx + normalizedQuery.length });
    idx += normalizedQuery.length;
  }
  return results;
}

/**
 * Build a snippet around a match, with context.
 */
export function buildSnippet(
  text: string,
  query: string,
  radius = 60,
): string {
  const normalized = normalizeArabic(text);
  const normalizedQuery = normalizeArabic(query);
  const idx = normalized.indexOf(normalizedQuery);
  if (idx < 0) return '';

  // Map back to original text positions (approximate — normalization
  // may change length, so we use the normalized position as a guide).
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = '… ' + snippet;
  if (end < text.length) snippet = snippet + ' …';
  return snippet;
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
