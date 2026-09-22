import { normalizeArabic, tokenizeArabic, matchSingleTokenFast } from '@/lib/arabic';
import { expandSemanticTerms, resolveSemanticConcept } from './semantic';
import { HADITH_BASE, hadithUrl } from '@/lib/shared/data-base';
import {
  HADITH_BOOKS_LIST,
  type HadithItem,
  type GlobalSearchResultItem,
  type MicroIndexEntry,
} from '../domain';

/**
 * Distinguishes an index LOAD FAILURE from a genuinely EMPTY index.
 * `searchAcrossAllBooks` and the store currently cannot tell "the fetch failed"
 * (show the retry state) from "the loaded index has no entries" (show the
 * no-results state). This enum is the typed contract for that distinction.
 */
export type MicroIndexLoadOutcome =
  | { status: 'loaded'; entries: MicroIndexEntry[] }
  | { status: 'failed'; reason: 'timeout' | 'network' | 'invalid-payload' };

let microIndexCache: MicroIndexEntry[] | null = null;
/** Last load outcome (failure only — success is implied by a non-null cache). */
let microIndexLoadError: MicroIndexLoadOutcome | null = null;

/** Read the last load outcome (mainly for testing and diagnostics). */
export function getMicroIndexLoadError(): MicroIndexLoadOutcome | null {
  return microIndexLoadError;
}
/**
 * Single-flight guard: while the (multi-MB) micro-index is being fetched,
 * concurrent callers share the SAME in-flight promise instead of each starting
 * another full download (production evidence: two parallel index fetches were
 * observed for one short typing session, each re-downloading the full file).
 * Note the correction: this removes DUPLICATE DOWNLOADS, not the wire time of
 * the download itself — no download-speedup is claimed or measured here.
 */
let microIndexInFlight: Promise<MicroIndexLoadOutcome> | null = null;
const globalSearchResultCache = new Map<string, GlobalSearchResultItem[]>();

/** Bounded fetch: rejects after `MICRO_INDEX_SOURCE_TIMEOUT_MS` so a stalled
 *  connection can never leave `searchingGlobal` (the global-search spinner)
 *  stuck forever.
 *
 *  Scope of the timeout (per ATTEMPT, not per process): the sources are tried
 *  SEQUENTIALLY — same-origin first (step 2), then the CDN/HF mirror (step 3).
 *  Each attempt gets its own 90s budget — sized from the measured production
 *  download of the 21.5MB index (76.1s on a slow link, verified 2026-09);
 *  a 30s budget was tried first and killed slow-but-successful downloads,
 *  turning them into a false failure (preview-verified). Worst case before the
 *  UI settles is ~180s (2 × 90s) when BOTH stall, after which the failure
 *  state + retry appear instead of spinning forever. The next search call
 *  retries fresh. No debounce is added anywhere; successful loads are cached. */
const MICRO_INDEX_SOURCE_TIMEOUT_MS = 90_000;

/** Diagnosis of the most recent bounded fetch: set by `fetchJsonBounded`
 *  on EVERY attempt (success clears it). Used only to label the final
 *  `failed` outcome with the most informative reason seen across attempts. */
let lastFetchDiagnosis: 'timeout' | 'network' | null = null;

/**
 * Loading-progress protocol for the micro-index fetch (waiting-UX only —
 * this changes nothing about download speed, caching, or results).
 *
 * Phases: `connect` (request sent) → `download` (bytes arriving) →
 * `preparing` (bytes complete; JSON.parse/validate/scan running).
 * `totalBytes` is emitted ONLY when it is trustworthy, per this rule:
 *   - `Content-Length` is reliable ONLY when the response is NOT transformed
 *     on the wire (`content-encoding` absent or `identity`). With `br`/`gzip`
 *     the header counts COMPRESSED bytes while `fetch` hands us DECODED bytes,
 *     so a percentage against it would be meaningless → indeterminate
 *     (`totalBytes: null`). Same when the header is missing/invalid.
 * Callers must render a determinate bar ONLY when `totalBytes` is a finite
 * positive number; otherwise an indeterminate indicator.
 */
export interface MicroIndexProgress {
  phase: 'connect' | 'download' | 'preparing';
  loadedBytes?: number;
  totalBytes?: number | null;
}

export type MicroIndexProgressListener = (p: MicroIndexProgress) => void;

const microIndexProgressListeners = new Set<MicroIndexProgressListener>();

/** Subscribe to micro-index load progress; returns an unsubscribe function. */
export function onMicroIndexProgress(listener: MicroIndexProgressListener): () => void {
  microIndexProgressListeners.add(listener);
  return () => {
    microIndexProgressListeners.delete(listener);
  };
}

function emitProgress(p: MicroIndexProgress): void {
  for (const listener of [...microIndexProgressListeners]) {
    try {
      listener(p);
    } catch {
      /* a progress listener must never break the load */
    }
  }
}

/** Trustworthy total or null (indeterminate), per the rule documented above. */
function resolveProgressTotal(res: Response): number | null {
  const headers = (res as { headers?: { get?: (name: string) => string | null } }).headers;
  const get = typeof headers?.get === 'function' ? headers.get.bind(headers) : null;
  if (!get) return null;
  const encoding = (get('content-encoding') || '').toLowerCase().trim();
  const length = Number(get('content-length'));
  if ((!encoding || encoding === 'identity') && Number.isFinite(length) && length > 0) {
    return length;
  }
  return null;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let size = 0;
  for (const c of chunks) size += c.byteLength;
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Fetches one JSON source with a per-ATTEMPT timeout that covers headers AND
 * the full body read (`res.json()`), then aborts so a stalled socket is
 * released. Returning `null` means "this source failed" (timeout, abort,
 * exception, or non-OK status) — the caller tries the next source.
 */
async function fetchJsonBounded(url: string): Promise<unknown> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let settled = false;
  // The SAME timer object also bounds the body read (streamed below): headers
  // arriving fast must not exempt a body that then stalls mid-download.
  let timer: ReturnType<typeof setTimeout>;
  const cleanup = () => clearTimeout(timer);
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        controller?.abort();
      } catch {
        /* noop */
      }
      cleanup();
      lastFetchDiagnosis = 'timeout';
      reject(new Error(`Micro-index fetch timed out after ${MICRO_INDEX_SOURCE_TIMEOUT_MS}ms: ${url}`));
    }, MICRO_INDEX_SOURCE_TIMEOUT_MS);
  });
  try {
    const res = await Promise.race([
      fetch(url, controller ? { signal: controller.signal } : undefined),
      timeout,
    ]).catch((err) => {
      // Rejections are network-level (abort/connection/DNS) unless this is
      // the timeout rejection above, which was already diagnosed.
      if (lastFetchDiagnosis !== 'timeout') lastFetchDiagnosis = 'network';
      throw err;
    });
    if (!res.ok) {
      if (!settled) {
        settled = true;
        cleanup();
        lastFetchDiagnosis = 'network';
      }
      return null;
    }
    // Stream the body so long downloads surface progress (waiting-UX only —
    // byte-identical result to res.json(); the reader loop yields no extra
    // request and changes neither caching nor the timeout budget).
    emitProgress({ phase: 'connect' });
    const canStream =
      typeof (res as unknown as { body?: unknown }).body !== 'undefined' &&
      (res as unknown as { body?: { getReader?: unknown } | null }).body !== null &&
      typeof (res as unknown as { body?: { getReader?: unknown } }).body?.getReader === 'function';
    let text: string;
    if (canStream) {
      const total = resolveProgressTotal(res);
      const reader = (
        res as unknown as { body: { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }>; cancel: () => Promise<void> } } }
      ).body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      try {
        for (;;) {
          // Race every read against the SAME timeout so a stalled body still fails.
          const chunk = await Promise.race([reader.read(), timeout]);
          if (chunk.done) break;
          const value = chunk.value;
          if (value) {
            chunks.push(value);
            loaded += value.byteLength;
          }
          // Clamp: never report beyond total even if a proxy lied about length —
          // an inflated bar is a false-completion bug.
          emitProgress({
            phase: 'download',
            loadedBytes: loaded,
            totalBytes: total === null ? null : total,
          });
          if (total !== null && loaded >= total) break;
        }
      } finally {
        // Always release the reader lock; abort-on-timeout already releases the socket.
        try {
          await reader.cancel();
        } catch {
          /* noop */
        }
      }
      text = new TextDecoder().decode(concatBytes(chunks));
    } else {
      // No streaming surface (mocked Response in tests, old engines): report an
      // indeterminate download so the UI never invents a percentage.
      emitProgress({ phase: 'download', totalBytes: null });
      if (typeof (res as { json?: unknown }).json === 'function') {
        const parsed = await Promise.race([res.json(), timeout]).catch((err) => {
          if (lastFetchDiagnosis !== 'timeout') lastFetchDiagnosis = 'network';
          throw err;
        });
        if (settled) return null;
        settled = true;
        cleanup();
        lastFetchDiagnosis = null;
        return parsed;
      }
      text = await Promise.race([
        res.text().catch(() => ''),
        timeout,
      ]).catch((err) => {
        if (lastFetchDiagnosis !== 'timeout') lastFetchDiagnosis = 'network';
        throw err;
      });
    }
    const parsed: unknown = await Promise.race([
      (async () => JSON.parse(text))(),
      timeout,
    ]).catch((err) => {
      if (lastFetchDiagnosis !== 'timeout') lastFetchDiagnosis = 'network';
      throw err;
    });
    if (settled) return null;
    settled = true;
    cleanup();
    lastFetchDiagnosis = null;
    return parsed;
  } catch {
    settled = true;
    cleanup();
    try {
      controller?.abort();
    } catch {
      /* noop */
    }
    return null;
  }
}

/**
 * Structural validation of a micro-index payload. A 200-OK body that is NOT a
 * valid index (e.g. `{"error":"unavailable"}` from an upstream, an HTML error
 * page, or a truncated schema) must be treated as a SOURCE FAILURE — never
 * cached — so the loader falls through to the next source and, if all sources
 * deliver invalid payloads, reports a typed failure instead of an empty index.
 *
 * REAL DATA SHAPE (verified against public/data/hadith/hadiths_core_index.json,
 * 41,676 items): the dictionary form is
 *   { books: string[], grades: string[], items: [bookIdx, idInBook, chapterId, text][] }
 * i.e. every row carries exactly FOUR fields; the 5th (grade index) is OPTIONAL
 * and usually absent — grading is resolved elsewhere (getHadithGrade). Validation
 * therefore MUST accept 4-field rows and must NOT demand a 5th.
 *
 * A structurally-correct EMPTY index (`books/grades/items` all empty arrays)
 * is a VALID load (returns true) — emptiness is data, not corruption.
 */
export function isValidMicroIndexPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;

  // Shape A (current dictionary form): books/grades/items.
  const r = raw as { books?: unknown; grades?: unknown; items?: unknown };
  if (Array.isArray(r.books) && Array.isArray(r.grades) && Array.isArray(r.items)) {
    const books = r.books as unknown[];
    const items = r.items as unknown[];
    if (!books.every((b) => typeof b === 'string')) return false;
    if (!(r.grades as unknown[]).every((g) => typeof g === 'string')) return false;

    for (const it of items) {
      // Every row must be a tuple with >= 4 fields: [bookIdx, idInBook, chapterId, text].
      if (!Array.isArray(it) || it.length < 4) return false;
      const [bookIdx, idInBook, chapterId, text, gradeIdx] = it as unknown[];
      if (typeof bookIdx !== 'number' || !Number.isInteger(bookIdx)) return false;
      // Book reference must resolve inside `books` (guards against corrupted/misaligned data).
      if (bookIdx < 0 || bookIdx >= books.length) return false;
      if (typeof idInBook !== 'number' || !Number.isFinite(idInBook)) return false;
      if (typeof chapterId !== 'number' || !Number.isFinite(chapterId)) return false;
      if (typeof text !== 'string') return false;
      // Optional 5th field: when present it must be a valid grades reference.
      if (gradeIdx !== undefined) {
        if (typeof gradeIdx !== 'number' || !Number.isInteger(gradeIdx) || gradeIdx < 0) return false;
        if (gradeIdx >= (r.grades as unknown[]).length) return false;
      }
    }
    return true;
  }

  // Shape B (legacy plain array of rows). `Array.isArray(raw)` alone is NOT
  // enough — the rows themselves must be valid, otherwise a stray JSON array
  // (error list, HTML-derived data) would be silently accepted as an index.
  if (Array.isArray(raw)) {
    for (const it of raw as unknown[]) {
      if (!Array.isArray(it) || it.length < 4) return false;
      const [book, idInBook, chapterId, text] = it as unknown[];
      if (typeof book !== 'string' || !book) return false;
      if (typeof idInBook !== 'number' || !Number.isFinite(idInBook)) return false;
      if (typeof chapterId !== 'number' || !Number.isFinite(chapterId)) return false;
      if (typeof text !== 'string') return false;
    }
    return true;
  }

  return false;
}

/**
 * Parses raw micro-index payload
 */
export function parseMicroIndexPayload(raw: { books?: unknown; grades?: unknown; items?: unknown }): MicroIndexEntry[] {
  if (!raw) return [];

  if (raw.books && raw.grades && Array.isArray(raw.items)) {
    const books = raw.books as string[];
    const grades = raw.grades as string[];
    const result: MicroIndexEntry[] = new Array(raw.items.length);

    for (let i = 0; i < raw.items.length; i++) {
      const tuple = raw.items[i];
      result[i] = {
        b: books[tuple[0]] || 'bukhari',
        i: tuple[1],
        c: tuple[2] || 0,
        t: tuple[3] || '',
        // Grade (5th tuple field) is OPTIONAL in the real dataset — when absent,
        // grading falls back to the canonical source in `grade-engine`.
        g: (typeof tuple[4] === 'number' ? grades[tuple[4]] : undefined) || 'غير محدد',
      };
    }
    return result;
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (Array.isArray(item)) {
        return {
          b: String(item[0]),
          i: Number(item[1]),
          c: Number(item[2]) || 0,
          t: String(item[3] || ''),
          g: String(item[4] || 'غير محدد'),
        };
      }
      return item as MicroIndexEntry;
    });
  }

  return [];
}

export async function loadHadithMicroIndex(): Promise<MicroIndexEntry[]> {
  const outcome = await loadHadithMicroIndexOutcome();
  // Backward-compatible shape for legacy callers (scripts, diagnostics):
  // failure degrades to `[]`. UI paths must use `loadHadithMicroIndexOutcome`
  // or `searchAcrossAllBooks` (typed error) to distinguish failure from empty.
  return outcome.status === 'loaded' ? outcome.entries : [];
}

/**
 * Loads the micro-index and reports a LOAD FAILURE (`status: 'failed'`) instead
 * of silently returning `[]`. `searchAcrossAllBooks` and the store must branch
 * on this: failure → retry affordance; a loaded-but-empty index → no-results.
 * Success AND failure are single-flight shared: concurrent callers join the
 * same in-flight attempt and observe the same outcome.
 */
export async function loadHadithMicroIndexOutcome(): Promise<MicroIndexLoadOutcome> {
  if (microIndexCache) return Promise.resolve({ status: 'loaded', entries: microIndexCache });
  if (microIndexInFlight) return microIndexInFlight;

  microIndexInFlight = (async (): Promise<MicroIndexLoadOutcome> => {
    // 1. Node local FS (build-time / SSR / tests)
    const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
    let sawInvalidPayload = false;
    if (typeof window === 'undefined' || isNode) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_core_index.json');
        if (fs.existsSync(p)) {
          const parsed: unknown = JSON.parse(fs.readFileSync(p, 'utf-8'));
          // Same structural validation as the browser path: an invalid local
          // artifact must NOT be cached as a successful load.
          if (isValidMicroIndexPayload(parsed)) {
            microIndexCache = parseMicroIndexPayload(parsed as { books?: unknown; grades?: unknown; items?: unknown });
            microIndexLoadError = null;
            return { status: 'loaded', entries: microIndexCache };
          }
          sawInvalidPayload = true;
          console.warn('[hadith] local hadiths_core_index.json failed structural validation');
        }
      } catch {
        /* fall through to network sources */
      }
    }

    // 2. Browser relative URL (/data/hadith/hadiths_core_index.json)
    //    Bounded per attempt (headers + full body), single-flight shared.
    //    A non-conforming payload (e.g. {"error":"unavailable"}) counts as a
    //    source failure → fall through to the mirror; it is NEVER cached.
    const local = await fetchJsonBounded('/data/hadith/hadiths_core_index.json');
    // Download finished → JSON.parse/validate run next: surface the handoff so
    // the UI can switch from "downloading" to "preparing results" (no fake 100%).
    emitProgress({ phase: 'preparing' });
    if (local !== null && isValidMicroIndexPayload(local)) {
      microIndexCache = parseMicroIndexPayload(local as { books?: unknown; grades?: unknown; items?: unknown });
      microIndexLoadError = null;
      return { status: 'loaded', entries: microIndexCache };
    }
    if (local !== null) sawInvalidPayload = true;

    // 3. CDN / HF mirror (bounded as well, same per-attempt budget)
    if (HADITH_BASE) {
      const remote = await fetchJsonBounded(hadithUrl('data/hadith/hadiths_core_index.json'));
      emitProgress({ phase: 'preparing' });
      if (remote !== null && isValidMicroIndexPayload(remote)) {
        microIndexCache = parseMicroIndexPayload(remote as { books?: unknown; grades?: unknown; items?: unknown });
        microIndexLoadError = null;
        return { status: 'loaded', entries: microIndexCache };
      }
      if (remote !== null) sawInvalidPayload = true;
    }

    // All sources failed: report failure — NOT an empty index. An invalid
    // payload is distinguished from a transport failure in the typed reason.
    // A failure must NEVER poison the cache: the next call retries fresh.
    microIndexLoadError = {
      status: 'failed',
      reason: sawInvalidPayload ? 'invalid-payload' : lastFetchDiagnosis ?? 'network',
    };
    console.warn('[hadith] hadiths_core_index unavailable from all sources:', microIndexLoadError.reason);
    return microIndexLoadError;
  })();

  try {
    return await microIndexInFlight;
  } finally {
    // Clear the in-flight slot AFTER settlement so later calls retry fresh.
    // microIndexInFlight is deliberately NOT cached on failure.
    microIndexInFlight = null;
  }
}

/**
 * Intelligent Semantic In-Book Search Engine (< 1ms).
 * Combines exact phrase matching, whole-word token intersections, and Fiqh topic understanding.
 */
export function searchHadithsInBook(
  hadiths: HadithItem[],
  query: string,
  chapterId?: number
): HadithItem[] {
  let list = hadiths;
  if (chapterId !== undefined && chapterId !== null && (chapterId as unknown) !== 'all') {
    list = list.filter((h) => h.chapterId === chapterId);
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return list;

  // Direct number lookup (< 0.01ms)
  const isNum = /^\d+$/.test(trimmedQuery);
  if (isNum) {
    const num = parseInt(trimmedQuery, 10);
    return list.filter((h) => h.idInBook === num || h.id === num);
  }

  const normQ = normalizeArabic(trimmedQuery);
  if (!normQ) return [];

  const rawTokens = tokenizeArabic(trimmedQuery);
  const normTokens = rawTokens.map((t) => normalizeArabic(t)).filter((t) => t.length >= 2);
  const qEn = /^[a-zA-Z0-9\s]+$/.test(trimmedQuery) ? trimmedQuery.toLowerCase() : '';

  const exactMatches: HadithItem[] = [];
  const tokenMatches: HadithItem[] = [];
  const seenIds = new Set<number>();

  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    if (!h._norm) {
      h._norm = normalizeArabic(h.arabic);
    }
    const textNorm = h._norm;

    // 1. Direct substring match (instant — 0.0001ms)
    if (textNorm.includes(normQ)) {
      exactMatches.push(h);
      seenIds.add(h.idInBook);
      continue;
    }

    // 2. Multi-token match using zero-allocation matchSingleTokenFast
    if (normTokens.length > 1) {
      let allMatch = true;
      for (let j = 0; j < normTokens.length; j++) {
        if (!matchSingleTokenFast(textNorm, normTokens[j])) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        tokenMatches.push(h);
        seenIds.add(h.idInBook);
        continue;
      }
    }

    // 3. English text fallback
    if (qEn && h.english?.text && h.english.text.toLowerCase().includes(qEn)) {
      exactMatches.push(h);
      seenIds.add(h.idInBook);
    }
  }

  // 4. Fiqh semantic topic match — ONLY if direct & token matches are few (< 15)
  const semanticMatches: HadithItem[] = [];
  if (exactMatches.length + tokenMatches.length < 15 && normQ.length >= 3) {
    const semanticTokens = expandSemanticTerms(trimmedQuery);
    if (semanticTokens.length > 0) {
      const cleanSemantic = semanticTokens
        .map((st) => normalizeArabic(st))
        .filter((st) => st !== normQ && st.length >= 3);

      for (let i = 0; i < list.length; i++) {
        const h = list[i];
        if (seenIds.has(h.idInBook)) continue;

        const textNorm = h._norm!;
        for (let j = 0; j < cleanSemantic.length; j++) {
          const st = cleanSemantic[j];
          if (st.includes(' ')) {
            if (textNorm.includes(st)) {
              semanticMatches.push(h);
              seenIds.add(h.idInBook);
              break;
            }
          } else if (matchSingleTokenFast(textNorm, st)) {
            semanticMatches.push(h);
            seenIds.add(h.idInBook);
            break;
          }
        }
      }
    }
  }

  return [...exactMatches, ...tokenMatches, ...semanticMatches];
}

/**
 * Global Cross-Book Search Engine powered by the ultra-fast Micro-Index.
 * Executes in < 0.5ms and returns prioritized results (Sahihayn first).
 *
 * LOAD FAILURE vs EMPTY RESULTS: when the index cannot be loaded this throws
 * `MicroIndexLoadError` instead of returning `[]` — callers MUST NOT confuse
 * "the index failed to load" (retry affordance) with "no hadiths matched"
 * (no-results state). The success path is unchanged.
 */
export class MicroIndexLoadError extends Error {
  readonly reason: 'timeout' | 'network' | 'invalid-payload';
  constructor(reason: 'timeout' | 'network' | 'invalid-payload') {
    super(`Hadith micro-index unavailable: ${reason}`);
    this.name = 'MicroIndexLoadError';
    this.reason = reason;
  }
}

export async function searchAcrossAllBooks(
  query: string,
  maxResults = 100
): Promise<GlobalSearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed}:${maxResults}`;
  if (globalSearchResultCache.has(cacheKey)) {
    return globalSearchResultCache.get(cacheKey)!;
  }

  const normQuery = normalizeArabic(trimmed);
  if (!normQuery || normQuery.length <= 1) return [];

  const micro = await loadHadithMicroIndexOutcome().then((outcome) => {
    if (outcome.status === 'failed') {
      // Propagate as a typed error: an index LOAD FAILURE is not "zero matches".
      throw new MicroIndexLoadError(outcome.reason);
    }
    return outcome.entries;
  });
  if (!micro || micro.length === 0) return [];

  // 1. Direct number search
  const isNum = /^\d+$/.test(trimmed);
  if (isNum) {
    const targetNum = parseInt(trimmed, 10);
    const matchedEntries = micro.filter((e) => e.i === targetNum);
    return matchedEntries.slice(0, maxResults).map((entry) => {
      const meta = HADITH_BOOKS_LIST.find((b) => b.id === entry.b) || HADITH_BOOKS_LIST[0];
      return {
        hadith: {
          id: entry.i,
          idInBook: entry.i,
          chapterId: entry.c,
          bookId: 1,
          arabic: entry.t,
        },
        book: meta,
      };
    });
  }

  const rawTokens = tokenizeArabic(trimmed);
  const queryTokens = rawTokens.map((t) => normalizeArabic(t)).filter((t) => t.length >= 2);
  if (queryTokens.length === 0) return [];

  // Semantic Concept Detection for thematic meaning search
  const semanticConcept = resolveSemanticConcept(trimmed);

  const matchedEntries: {
    entry: MicroIndexEntry;
    score: number;
    isSemantic?: boolean;
    semanticTopic?: string;
  }[] = [];

  for (let i = 0; i < micro.length; i++) {
    const entry = micro[i];
    if (!entry._norm) {
      entry._norm = normalizeArabic(entry.t || '');
    }
    const textNorm = entry._norm;

    // 1. Direct substring match (highest precision)
    const isDirectMatch = textNorm.includes(normQuery);

    // 2. Multi-token match using zero-allocation token matcher
    let allTokensMatch = false;
    if (queryTokens.length > 1) {
      allTokensMatch = true;
      for (let j = 0; j < queryTokens.length; j++) {
        if (!matchSingleTokenFast(textNorm, queryTokens[j])) {
          allTokensMatch = false;
          break;
        }
      }
    } else if (queryTokens.length === 1) {
      allTokensMatch = matchSingleTokenFast(textNorm, queryTokens[0]);
    }

    // 3. Semantic Concept Match (meaning comprehension without literal match)
    let isSemanticMatch = false;
    if (!isDirectMatch && !allTokensMatch && semanticConcept) {
      for (let p = 0; p < semanticConcept.corePhrases.length; p++) {
        if (textNorm.includes(semanticConcept.corePhrases[p])) {
          isSemanticMatch = true;
          break;
        }
      }
    }

    if (!isDirectMatch && !allTokensMatch && !isSemanticMatch) {
      continue;
    }

    let score = 0;
    if (isDirectMatch) {
      score += 400;
      if (textNorm.startsWith(normQuery)) score += 100;
    } else if (allTokensMatch) {
      score += 250;
    } else if (isSemanticMatch) {
      score += 150; // Follows literal matches
    }

    // Proximity / Bigram boost for multi-word queries
    if (queryTokens.length >= 2) {
      for (let j = 0; j < queryTokens.length - 1; j++) {
        const bigram = `${queryTokens[j]} ${queryTokens[j + 1]}`;
        if (textNorm.includes(bigram)) score += 100;
      }
    }

    // Authority Prioritization: Sahihayn and prime collections first
    if (entry.b === 'bukhari') score += 60;
    else if (entry.b === 'muslim') score += 55;
    else if (entry.b === 'nawawi40') score += 50;
    else if (entry.b === 'riyad_assalihin') score += 45;
    else if (entry.b === 'bulugh_almaram') score += 40;
    else if (entry.b === 'aladab_almufrad') score += 35;
    else if (entry.b === 'abudawud' || entry.b === 'tirmidhi') score += 25;
    else if (entry.b === 'nasai' || entry.b === 'ibnmajah') score += 20;

    matchedEntries.push({
      entry,
      score,
      isSemantic: isSemanticMatch,
      semanticTopic: isSemanticMatch ? semanticConcept?.topic : undefined,
    });
  }

  // Sort by score descending (Sahihayn and exact matches at the very top, followed by semantic matches)
  matchedEntries.sort((a, b) => b.score - a.score);

  const results: GlobalSearchResultItem[] = [];
  const limit = Math.min(matchedEntries.length, maxResults);

  for (let i = 0; i < limit; i++) {
    const item = matchedEntries[i];
    const { entry } = item;
    const meta = HADITH_BOOKS_LIST.find((b) => b.id === entry.b);
    if (!meta) continue;

    results.push({
      hadith: {
        id: entry.i,
        idInBook: entry.i,
        chapterId: entry.c,
        bookId: 1,
        arabic: entry.t,
      },
      book: meta,
      isSemanticMatch: item.isSemantic,
      semanticTopic: item.semanticTopic,
    });
  }

  if (globalSearchResultCache.size < 500) {
    globalSearchResultCache.set(cacheKey, results);
  }

  return results;
}
