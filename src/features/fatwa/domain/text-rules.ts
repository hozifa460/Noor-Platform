/**
 * Cleans dataset text artifacts so fatwa text renders cleanly everywhere.
 * Handles Excel-escaped carriage returns (_x000D_), stray \r, and doubled
 * spaces — while preserving intentional newlines in answers.
 * Cheap pure string ops; safe on every render path.
 */
export function cleanFatwaText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/_x000D_/gi, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
