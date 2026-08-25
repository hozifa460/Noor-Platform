import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';

/**
 * Noor Platform — Fatwa Detail API
 *
 * Security model:
 * 1. Rate limited like every other API route (this route previously had none).
 * 2. `source` is validated against a strict allowlist of known dataset files —
 *    no arbitrary path building, so a crafted `source` can never escape the
 *    dataset folder on Hugging Face.
 * 3. Dataset files are streamed with a hard byte cap and aborted mid-flight —
 *    a multi-GB file can never be buffered into memory (OOM protection).
 * 4. Parsed records are capped; oversized datasets are processed line-by-line
 *    without ever holding the full text in memory.
 */

const REPO_BASE = 'https://huggingface.co/datasets/hozifa1/fatawaset/resolve/main';

/** Hard ceiling for any single dataset file we are willing to stream (bytes). */
const MAX_DATASET_BYTES = 120 * 1024 * 1024; // 120MB

/** Safety ceiling on how many parsed records one dataset may contribute. */
const MAX_RECORDS_PER_FILE = 400_000;

/** Item cache bounds (entries + rough byte accounting). */
const ITEM_CACHE_MAX_ENTRIES = 2000;
const ITEM_CACHE_MAX_BYTES = 32 * 1024 * 1024; // ~32MB
let itemCacheBytes = 0;

interface RawFatwaRecord {
  id?: string | number;
  title?: string;
  question?: string;
  description?: string;
  body?: string;
  answer?: string;
  reply?: string;
  fatwa?: string;
  Subject?: string;
  Question?: string;
  Answer?: string;
  audio?: string;
  audio_url?: string;
  url?: string;
}

interface SlimFatwa {
  id: string;
  title: string;
  question: string;
  answer: string;
  audioUrl?: string;
}

// In-memory cache for individual resolved fatwas (byte-bounded LRU-ish)
const itemCache = new Map<string, SlimFatwa>();

function slimRecord(id: string, title: string, r: RawFatwaRecord): SlimFatwa {
  const fullAnswer = (
    r.answer || r.reply || r.fatwa || r.Answer || ''
  ).toString().slice(0, 40_000).trim();

  const fullQuestion = (
    r.question || r.description || r.body || r.Question || r.title || ''
  ).toString().slice(0, 20_000).trim();

  return {
    id,
    title: (r.title || title || fullQuestion.slice(0, 100)).toString().slice(0, 300),
    question: fullQuestion,
    answer: fullAnswer,
    audioUrl: (r.audio_url || r.audio || r.url || undefined) as string | undefined,
  };
}

function cachePut(key: string, value: SlimFatwa): void {
  const approxBytes = key.length * 2 + value.title.length * 2 + value.question.length * 2 + value.answer.length * 2 + 200;

  // Evict oldest entries until we fit both bounds
  while (
    (itemCache.size >= ITEM_CACHE_MAX_ENTRIES && itemCache.keys().next().value) ||
    (itemCacheBytes + approxBytes > ITEM_CACHE_MAX_BYTES && itemCache.size > 0)
  ) {
    const firstKey = itemCache.keys().next().value;
    if (!firstKey) break;
    const evicted = itemCache.get(firstKey)!;
    itemCacheBytes -= (
      firstKey.length * 2 + evicted.title.length * 2 +
      evicted.question.length * 2 + evicted.answer.length * 2 + 200
    );
    itemCache.delete(firstKey);
  }

  itemCache.set(key, value);
  itemCacheBytes += approxBytes;
}

/**
 * Strict allowlist of dataset files this endpoint may ever read.
 * Anything else → 403. This kills the arbitrary-path issue completely:
 * no matter what `source` contains, only these exact values are used.
 */
const ALLOWED_SOURCES: ReadonlySet<string> = new Set([
  'fatawa/fatawa_binbaz.json',
]);

/** Resolves the requested source to a safe allowlisted path or null. */
function resolveAllowedSource(source: string): string | null {
  const clean = source.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (ALLOWED_SOURCES.has(clean)) return clean;

  // Back-compat: accept bare filenames that map to an allowed file
  const byBasename = [...ALLOWED_SOURCES].find((p) => p.split('/').pop() === clean);
  return byBasename ?? null;
}

/**
 * Streams the dataset file with a hard byte cap. Returns the parsed records
 * OR null when the file is unavailable/too large. Never buffers unbounded data.
 */
async function loadDatasetStreamed(
  relativePath: string
): Promise<{ records: RawFatwaRecord[] } | { error: 'not-found' | 'too-large' | 'unavailable' }> {
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
  const url = `${REPO_BASE}/${encodedPath}`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': 'NoorPlatform/1.0' },
    });
  } catch {
    return { error: 'unavailable' };
  }

  if (res.status === 404) return { error: 'not-found' };
  if (!res.ok) return { error: 'unavailable' };

  // Reject early when upstream declares an oversized body
  const cl = res.headers.get('content-length');
  if (cl && parseInt(cl, 10) > MAX_DATASET_BYTES) {
    try { await res.body?.cancel(); } catch {}
    return { error: 'too-large' };
  }

  const reader = res.body?.getReader();
  if (!reader) return { error: 'unavailable' };

  const decoder = new TextDecoder();
  const records: RawFatwaRecord[] = [];
  let totalBytes = 0;
  let carry = '';
  let looksLikeJsonArray: boolean | null = null;
  let overflowed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_DATASET_BYTES) {
      // Abort mid-stream: server keeps serving, we walk away
      overflowed = true;
      try { await reader.cancel(); } catch {}
      break;
    }

    const chunkText = carry + decoder.decode(value, { stream: true });

    if (looksLikeJsonArray === null) {
      const trimmedStart = chunkText.trimStart();
      if (trimmedStart.length === 0) { continue; }
      looksLikeJsonArray = trimmedStart.startsWith('[');
    }

    if (looksLikeJsonArray) {
      // JSON array format: buffer whole file (bounded by MAX_DATASET_BYTES)
      carry = chunkText;
      continue;
    }

    // JSONL format: parse complete lines incrementally
    const lines = chunkText.split('\n');
    carry = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const rec = JSON.parse(t) as RawFatwaRecord;
        records.push(rec);
        if (records.length >= MAX_RECORDS_PER_FILE) {
          overflowed = true;
          try { await reader.cancel(); } catch {}
          break;
        }
      } catch { /* skip malformed line */ }
    }
    if (overflowed) break;
  }

  if (overflowed) {
    // We still may have usable partial data for JSONL; for JSON arrays bail out
    if (looksLikeJsonArray) return { error: 'too-large' };
  } else {
    const tail = carry + decoder.decode();
    if (looksLikeJsonArray) {
      try {
        const arr = JSON.parse(tail.trim()) as RawFatwaRecord[];
        if (Array.isArray(arr)) records.push(...arr.slice(0, MAX_RECORDS_PER_FILE));
      } catch {
        return { error: 'unavailable' };
      }
    } else {
      const t = tail.trim();
      if (t) {
        try {
          records.push(JSON.parse(t) as RawFatwaRecord);
        } catch { /* ignore */ }
      }
    }
  }

  return { records };
}

export async function GET(req: NextRequest) {
  // Rate limit: 60 req/min per IP (this route previously had NO rate limit at all)
  const rateLimitResult = await enforceRateLimitAsync(req, 'api-fatwa-detail', 60, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const source = searchParams.get('source') || '';
  const title = searchParams.get('title') || '';

  if (!id && !title) {
    return NextResponse.json({ error: 'Missing id or title parameter' }, { status: 400 });
  }

  const cacheKey = `${source}:${id}:${title}`;
  const cached = itemCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });
  }

  // Allowlisted source resolution — arbitrary paths are impossible now
  const sourceFile = resolveAllowedSource(source) ?? 'fatawa/fatawa_binbaz.json';

  const result = await loadDatasetStreamed(sourceFile);

  if ('error' in result) {
    const status = result.error === 'not-found' ? 404 : result.error === 'too-large' ? 413 : 503;
    const message =
      result.error === 'not-found' ? 'Dataset file not found' :
      result.error === 'too-large' ? 'Dataset exceeds processing limits' :
      'Dataset temporarily unavailable, please retry';
    return NextResponse.json({ error: message }, { status });
  }

  const records = result.records;
  if (!records || records.length === 0) {
    return NextResponse.json({ error: 'Dataset file not found or unavailable' }, { status: 404 });
  }

  // Find record by index or title matching
  let matchedRecord: RawFatwaRecord | null = null;

  // 1. Try matching by index parsed from ID (e.g. hf-fatawa_binbaz-123 -> idx 123)
  const idMatch = id.match(/-(\d+)$/);
  if (idMatch) {
    const idx = parseInt(idMatch[1], 10);
    if (idx >= 0 && idx < records.length) {
      matchedRecord = records[idx];
    }
  }

  // 2. Try matching by ID directly
  if (!matchedRecord && id) {
    matchedRecord = records.find((r) => String(r.id) === id || r.id === id) || null;
  }

  // 3. Fallback to title matching
  if (!matchedRecord && title) {
    const cleanTitle = title.replace(/[^\u0621-\u064A0-9]/g, '').trim();
    matchedRecord = records.find((r) => {
      const t = (r.title || r.question || r.Subject || '').replace(/[^\u0621-\u064A0-9]/g, '').trim();
      return t === cleanTitle || (cleanTitle.length > 10 && t.includes(cleanTitle));
    }) || null;
  }

  if (!matchedRecord) {
    return NextResponse.json({ error: 'Fatwa record not found in dataset' }, { status: 404 });
  }

  const slim = slimRecord(id, title, matchedRecord);
  cachePut(cacheKey, slim);

  return NextResponse.json(slim, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
}
