/**
 * Single source of truth for where static data lives.
 *
 * - In Vercel production: served from the Noor HuggingFace dataset, so the
 *   site works WITHOUT shipping 1.1GB of shards in the git repo (Vercel's
 *   git size limit would block the build anyway).
 *
 * - In local dev: defaults to the on-disk public/data so developers without
 *   network still get a working app.
 *
 * Override at build time with:
 *   NEXT_PUBLIC_DATA_BASE=https://huggingface.co/datasets/hozifa1/noor-platform-shards/resolve/main
 */
export const DATA_BASE: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DATA_BASE) ||
  // Dev fallback (works offline against the local public/data tree)
  '';

const ensureTrailingSlash = (s: string) => (s.endsWith('/') ? s : s + '/');

/** Resolve a path under the data base, or return the local path if no base. */
export function dataUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (!DATA_BASE) return `/${p}`;
  return ensureTrailingSlash(DATA_BASE) + p;
}

/** Shard URL with 2-level sharding (ab/cd/abcd1234.json) to stay under HF's
 *  10K-files-per-directory limit while keeping local dev flat.
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

/** Test helper: is the data base remote (HF) rather than local. */
export function isRemoteData(): boolean {
  return DATA_BASE.length > 0;
}
