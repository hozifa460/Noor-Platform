import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * Maktaba Shamela 4 Text & Streaming API Proxy with Memory-Safe LRU Cache & Rate Limiting
 */

const BASE_HF_RESOLVE = 'https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days edge cache
const MAX_BOOK_BYTES = 35 * 1024 * 1024; // 35MB max file size

// Byte-bounded in-memory LRU cache (capped to 50MB total RAM limit)
interface CachedBookEntry {
  lines: string[];
  bytes: number;
  timestamp: number;
}

const BOOK_LINES_CACHE = new Map<string, CachedBookEntry>();
const MAX_CACHED_BOOKS = 8;
const MAX_CACHE_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB hard ceiling

function getCachedLines(url: string): string[] | null {
  const entry = BOOK_LINES_CACHE.get(url);
  if (!entry) return null;
  entry.timestamp = Date.now();
  return entry.lines;
}

function getTotalCacheBytes(): number {
  let total = 0;
  for (const entry of BOOK_LINES_CACHE.values()) {
    total += entry.bytes;
  }
  return total;
}

function setCachedLines(url: string, lines: string[], estimatedBytes: number) {
  while (
    BOOK_LINES_CACHE.size >= MAX_CACHED_BOOKS ||
    (BOOK_LINES_CACHE.size > 0 && getTotalCacheBytes() + estimatedBytes > MAX_CACHE_TOTAL_BYTES)
  ) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of BOOK_LINES_CACHE.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      BOOK_LINES_CACHE.delete(oldestKey);
    } else {
      break;
    }
  }
  BOOK_LINES_CACHE.set(url, { lines, bytes: estimatedBytes, timestamp: Date.now() });
}

export async function GET(req: NextRequest) {
  // Rate limiting (120 req/min)
  const rateLimitResult = enforceRateLimit(req, 'api-shamela-text', 120, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const relPath = req.nextUrl.searchParams.get('path');
  if (!relPath) {
    return NextResponse.json({ error: 'Missing path param' }, { status: 400 });
  }

  // Security: Clean and prevent directory traversal
  const cleanPath = relPath.replace(/\.\./g, '').replace(/^\/+/, '');
  const targetUrl = `${BASE_HF_RESOLVE}${cleanPath}`;

  const pageStartParam = req.nextUrl.searchParams.get('pageStart');
  const pageCountParam = req.nextUrl.searchParams.get('pageCount');

  try {
    // 1. On-Demand Page Slicing Mode for pages.jsonl
    if (pageStartParam && cleanPath.endsWith('pages.jsonl')) {
      const pageStart = Math.max(1, parseInt(pageStartParam, 10) || 1);
      const pageCount = Math.min(50, Math.max(1, parseInt(pageCountParam || '20', 10)));
      const pageEnd = pageStart + pageCount - 1;

      let lines = getCachedLines(targetUrl);

      if (!lines) {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'NoorPlatform/2.0 (Islamic Heritage Reader)',
            'Accept': '*/*',
          },
          next: { revalidate: CACHE_TTL },
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          return NextResponse.json(
            { error: `Remote storage returned HTTP ${res.status}` },
            { status: res.status }
          );
        }

        const reader = res.body?.getReader();
        if (!reader) {
          return NextResponse.json({ error: 'Empty upstream body' }, { status: 502 });
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.byteLength;
            if (totalBytes > MAX_BOOK_BYTES) {
              await reader.cancel();
              return NextResponse.json(
                { error: 'Book size exceeds processing limit' },
                { status: 413 }
              );
            }
            fullText += decoder.decode(value, { stream: true });
          }
        }
        fullText += decoder.decode();
        lines = fullText.split('\n').filter(Boolean);
        setCachedLines(targetUrl, lines, totalBytes || fullText.length);
      }

      const matchedPages: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const page = JSON.parse(lines[i]);
          const pageNum = parseInt(page.page_num, 10);
          if (pageNum >= pageStart && pageNum <= pageEnd) {
            matchedPages.push(page);
          }
          if (pageNum > pageEnd && matchedPages.length > 0) {
            break;
          }
        } catch {}
      }

      // Fallback to line slice if page_num not indexed
      if (matchedPages.length === 0 && lines.length > 0) {
        const lineIdxStart = Math.min(lines.length - 1, Math.max(0, pageStart - 1));
        const lineSlice = lines.slice(lineIdxStart, lineIdxStart + pageCount);
        for (const l of lineSlice) {
          try { matchedPages.push(JSON.parse(l)); } catch {}
        }
      }

      return NextResponse.json(
        {
          pageStart,
          pageEnd,
          totalAvailable: lines.length,
          pages: matchedPages,
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    // 2. Standard Proxy Mode (Metadata, TOC, and Full Files)
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'NoorPlatform/2.0 (Islamic Heritage Reader)',
      'Accept': '*/*',
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const res = await fetch(targetUrl, {
      headers: fetchHeaders,
      next: { revalidate: CACHE_TTL },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok && res.status !== 206) {
      return NextResponse.json(
        { error: `Remote storage returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', res.headers.get('content-type') || 'application/octet-stream');
    responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`);
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    if (res.headers.has('content-range')) {
      responseHeaders.set('Content-Range', res.headers.get('content-range')!);
    }
    if (res.headers.has('content-length')) {
      responseHeaders.set('Content-Length', res.headers.get('content-length')!);
    }
    if (res.headers.has('accept-ranges')) {
      responseHeaders.set('Accept-Ranges', res.headers.get('accept-ranges')!);
    }

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[Shamela Text API Error]', err);
    return NextResponse.json(
      { error: 'Failed to retrieve book content' },
      { status: 500 }
    );
  }
}
