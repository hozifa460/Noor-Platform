/**
 * Single source of truth for where static data lives.
 *
 * The platform is split across three independent HuggingFace datasets so
 * each concern (fatwas, hadiths, books) can be uploaded, versioned, and
 * served independently. Each base is overridable at build time:
 *
 *   NEXT_PUBLIC_FATWA_BASE=https://huggingface.co/datasets/hozifa1/noor-platform-fatwa/resolve/main
 *   NEXT_PUBLIC_HADITH_BASE=https://huggingface.co/datasets/hozifa1/noor-platform-hadith/resolve/main
 *   NEXT_PUBLIC_BOOKS_BASE=https://huggingface.co/datasets/hozifa1/noor-platform-books/resolve/main
 *
 * For backward compatibility NEXT_PUBLIC_DATA_BASE still works as the
 * fatwa base when NEXT_PUBLIC_FATWA_BASE is not set. In local dev, all
 * bases fall back to the empty string and callers serve from /public/data.
 */
export const FATWA_BASE: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FATWA_BASE) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DATA_BASE) ||
  // Dev fallback (works offline against the local public/data tree)
  '';

export const HADITH_BASE: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_HADITH_BASE) ||
  // Legacy default — points at the public mirror repo
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset' ||
  '';

export const BOOKS_BASE: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BOOKS_BASE) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DATA_BASE) ||
  '';

const ensureTrailingSlash = (s: string) => (s.endsWith('/') ? s : s + '/');

/** Resolve a path under the fatwa/base, or return the local path if no base. */
export function dataUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (!FATWA_BASE) return `/${p}`;
  return ensureTrailingSlash(FATWA_BASE) + p;
}

/** Resolve a path under the hadith base. Falls back to /<path> if no base. */
export function hadithUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (!HADITH_BASE) return `/${p}`;
  return ensureTrailingSlash(HADITH_BASE) + p;
}

/** Resolve a path under the books base. Falls back to /<path> if no base. */
export function booksUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (!BOOKS_BASE) return `/${p}`;
  return ensureTrailingSlash(BOOKS_BASE) + p;
}

/** Shard URL with 2-level sharding (ab/cd/abcd1234.json) for BOTH subdirs.
 *
 *  fatwa_answers: 226k files → needs fan-out.
 *  micro_shards: 1,566 files but each ~1MB (283MB total) → fan-out keeps
 *  per-directory size and per-commit size manageable on HF.
 *
 *  The hash is validated against `^[0-9a-f]{8}$` so user-supplied ids can
 *  never inject path separators, traversal sequences, or an absolute URL —
 *  silences CodeQL's "request depends on file data" alert and is a real
 *  hardening measure. */
const SHARD_HASH_RE = /^[0-9a-f]{8}$/;
export function shardUrl(subdir: 'fatwa_answers' | 'micro_shards', hash: string): string {
  if (!SHARD_HASH_RE.test(hash)) {
    throw new Error(`Invalid shard hash: ${hash} (expected 8 hex chars)`);
  }
  const path = `data/${subdir}/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}.json`;
  return dataUrl(path);
}

/** Test helper: is the fatwa base remote (HF) rather than local. */
export function isRemoteData(): boolean {
  return FATWA_BASE.length > 0;
}

/** URL for a books-catalog index file split by Arabic first letter.
 *  On HF the index is sharded per letter (data/books/catalogs/<source>/_index_<letter>.json)
 *  to keep any single file under 1.5MB. Locally, with the on-disk catalog
 *  removed, this falls back to the empty string and callers must short-circuit. */
export function booksIndexUrl(source: 'shamela' | 'openiti', firstLetter: string): string {
  // Non-Arabic / letterless titles land in _index__.json
  const inArabic = firstLetter && '\u0600' <= firstLetter && firstLetter <= '\u06FF';
  const suffix = inArabic ? firstLetter : '__';
  return dataUrl(`data/books/catalogs/${source}/_index_${suffix}.json`);
}

/** URL for a per-prefix book details shard, keyed by the 3-char Arabic prefix
 *  computed from the normalised title. See scripts/build_books_catalogs.py. */
export function booksShardUrl(source: 'shamela' | 'openiti', prefix: string): string {
  // prefix is 3 chars, each in the Arabic block; sanitise just in case.
  const safe = (prefix || '___').padEnd(3, '_').slice(0, 3);
  const p1 = safe[0] || '_';
  const p2 = safe[1] || '_';
  const p3 = safe[2] || '_';
  return dataUrl(`data/books/catalogs/${source}/_by_prefix/${p1}/${p2}/${p3}.json`);
}

/* -------------------- Hadith helpers --------------------------------- */

/** Per-book index file (hadith/books/<label>/index.json). */
export function hadithBookIndexUrl(label: string): string {
  return hadithUrl(`data/hadith/books/${label}/index.json`);
}

/** Per-book metadata (hadith/books/<label>/metadata.json). */
export function hadithBookMetadataUrl(label: string): string {
  return hadithUrl(`data/hadith/books/${label}/metadata.json`);
}

/** Per-book chapter chunk (hadith/books/<label>/chapters/<NNN>.json). */
export function hadithChapterUrl(label: string, chunkIndex: number): string {
  const i = String(chunkIndex).padStart(3, '0');
  return hadithUrl(`data/hadith/books/${label}/chapters/${i}.json`);
}

/** HadeethEnc sharh dataset (single file). */
export function hadithSharhUrl(): string {
  return hadithUrl('data/hadith/sharh/hadeethenc_sharh.json');
}
