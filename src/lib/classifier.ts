import type { SectionKind } from './types';

/**
 * Classifies a JSON file path into a section kind based on the rules:
 *   *.videos.json -> videos
 *   *.shorts.json -> shorts
 *   *.live.json   -> live
 *   *.radio.json  -> radio
 *   *.fatwa.json  -> fatwa
 *   *.books.json  -> books
 *   *.articles.json -> articles
 *   1_*.json      -> main (Sheikh collection)
 *   fallback      -> videos
 */
export function classifyFile(filePath: string): SectionKind {
  const name = filePath.split('/').pop() || filePath;
  const lowerPath = filePath.toLowerCase();

  // Built-in files from /public/ (radio, books, articles)
  if (/radio\.json$/i.test(name) || lowerPath.includes('islamic_radios')) return 'radio';
  if (/books\.json$/i.test(name) || lowerPath.includes('islamic_books')) return 'books';
  if (/articles\.json$/i.test(name) || lowerPath.includes('islamic_articles')) return 'articles';

  // Fatwa folder detection
  if (lowerPath.includes('fatawa_bibaz/') || lowerPath.includes('islam_fatawa/')) {
    return 'fatwa';
  }

  if (/\.videos\.json$/i.test(name)) return 'videos';
  if (/\.shorts\.json$/i.test(name)) return 'shorts';
  if (/\.live\.json$/i.test(name)) return 'live';
  if (/\.radio\.json$/i.test(name)) return 'radio';

  // Fatwa file patterns
  if (/\.fatwa\.json$/i.test(name)) return 'fatwa';
  if (/^fatawa[_a]?/i.test(name) || /^fatwa_/i.test(name)) return 'fatwa';
  if (/^nur_ealaa_aldarb/i.test(name)) return 'fatwa';

  if (/\.books\.json$/i.test(name)) return 'books';
  if (/\.articles\.json$/i.test(name)) return 'articles';
  if (/^1_.+\.json$/i.test(name)) return 'main';

  // Fallback: treat unknown JSON as a generic video collection.
  return 'videos';
}

/**
 * Extracts the sheikh id (folder name) from a file path.
 * If the file lives at the repo root, falls back to the file's stem.
 *
 * Examples:
 *   "iyad_alqunibi/iyad_alqunibi.videos.json" -> "iyad_alqunibi"
 *   "menshawy/1_menshawy.json"                -> "menshawy"
 *   "1_root.json"                              -> "root"
 */
export function extractSheikhId(filePath: string): string {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length > 1) return parts[0];

  const fileName = parts[0] || 'unknown';
  // Strip extension and known suffixes
  return fileName
    .replace(/\.json$/i, '')
    .replace(/^(1_)?(.+?)(\.(videos|shorts|live|radio|fatwa|books|articles))?$/i, '$2');
}

/**
 * Pretty-print a sheikh id into a human-friendly name.
 * "iyad_alqunibi" -> "Iyad Alqunibi"
 * "alshaarawy"    -> "Alshaarawy"
 */
export function prettifySheikhName(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Returns true if a file is the main sheikh collection marker (1_*.json). */
export function isMainCollectionFile(filePath: string): boolean {
  const name = filePath.split('/').pop() || '';
  return /^1_.+\.json$/i.test(name);
}
