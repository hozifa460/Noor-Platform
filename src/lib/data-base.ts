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

/** Test helper: is the data base remote (HF) rather than local. */
export function isRemoteData(): boolean {
  return DATA_BASE.length > 0;
}
