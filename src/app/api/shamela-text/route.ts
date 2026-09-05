import { NextResponse } from 'next/server';
import { enforceRateLimitAsync, validateSafeUrl } from '@/lib/shared/server';
import { createStructuredLogger, generateRequestId } from '@/lib/shared';

export const runtime = 'nodejs';
export const maxDuration = 30;

const log = createStructuredLogger('shamela-text');

const HF_BASE = 'https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/';
/** e.g. `books/123/pages.jsonl` — letters, digits, `_`, `-`, `/` and a trailing `pages.jsonl`. */
const PATH_RE = /^[A-Za-z0-9_\-/]{1,200}\/pages\.jsonl$/;
const MAX_PAGES = 60;
const MAX_BYTES = 40 * 1024 * 1024;

interface ShamelaPage {
  page_num?: string;
  part?: string;
  body?: string;
  footnotes?: string;
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: Request) {
  const requestId = generateRequestId();
  const rl = await enforceRateLimitAsync(request, 'shamela-text', 60, 60_000);
  if (!rl.allowed && rl.response) return rl.response;

  const url = new URL(request.url);
  const rawPath = (url.searchParams.get('path') || '').replace(/^\/+/, '');
  const pageStart = Number.parseInt(url.searchParams.get('pageStart') || '1', 10);
  const pageCount = Number.parseInt(url.searchParams.get('pageCount') || '25', 10);

  if (!PATH_RE.test(rawPath) || rawPath.includes('..')) {
    return bad(400, 'Invalid path');
  }
  if (!Number.isFinite(pageStart) || pageStart < 1 || pageStart > 100_000) {
    return bad(400, 'Invalid pageStart');
  }
  if (!Number.isFinite(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    return bad(400, `pageCount must be between 1 and ${MAX_PAGES}`);
  }

  const target = HF_BASE + rawPath;
  const check = await validateSafeUrl(target, { enforceWhitelist: true });
  if (!check.safe || !check.url) {
    log.error(requestId, 'blocked upstream url', check.error, { target });
    return bad(400, 'Upstream not allowed');
  }

  const upstream = await fetch(check.url, {
    headers: {
      'User-Agent': 'NoorPlatform/2.0 (Islamic Heritage Reader)',
      Accept: 'application/x-ndjson, text/plain, */*',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25_000),
    next: { revalidate: 86_400 },
  }).catch((err) => {
    log.error(requestId, 'upstream fetch failed', err, { target });
    return null;
  });

  if (!upstream || !upstream.ok) {
    return bad(upstream?.status === 404 ? 404 : 502, 'Upstream unavailable');
  }

  const len = Number(upstream.headers.get('content-length') || 0);
  if (len > MAX_BYTES) return bad(413, 'Book file too large');

  const text = await upstream.text();
  if (text.length > MAX_BYTES) return bad(413, 'Book file too large');

  const pageEnd = pageStart + pageCount - 1;
  const pages: ShamelaPage[] = [];

  for (const line of text.split('\n')) {
    if (!line) continue;
    let parsed: ShamelaPage;
    try {
      parsed = JSON.parse(line) as ShamelaPage;
    } catch {
      continue;
    }
    const num = Number.parseInt(parsed.page_num || '', 10);
    if (Number.isFinite(num) && num >= pageStart && num <= pageEnd) {
      pages.push({
        page_num: parsed.page_num,
        part: parsed.part,
        body: parsed.body,
        footnotes: parsed.footnotes,
      });
      if (pages.length >= pageCount) break;
    }
  }

  return NextResponse.json(
    { pages, pageStart, pageCount: pages.length },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        'X-Request-Id': requestId,
      },
    },
  );
}
