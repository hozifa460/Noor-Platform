import { NextRequest, NextResponse } from 'next/server';

/**
 * Maktaba Shamela 4 Text & Streaming API Proxy with High-Speed Server-Side Memory Cache
 * 
 * Supports:
 * 1. Full resource proxying (metadata, toc.jsonl)
 * 2. In-memory parsed book lines cache (< 5ms response time for subsequent page requests)
 * 3. On-demand page slice extraction via ?pageStart=X&pageCount=Y
 * 4. Range-requests for streaming
 */

const BASE_HF_RESOLVE = 'https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days edge cache

// In-memory LRU cache for active books (stores split lines to avoid re-fetching 20MB-50MB text files)
const BOOK_LINES_CACHE = new Map<string, { lines: string[]; timestamp: number }>();
const MAX_CACHED_BOOKS = 25;

function getCachedLines(url: string): string[] | null {
  const entry = BOOK_LINES_CACHE.get(url);
  if (!entry) return null;
  entry.timestamp = Date.now();
  return entry.lines;
}

function setCachedLines(url: string, lines: string[]) {
  if (BOOK_LINES_CACHE.size >= MAX_CACHED_BOOKS) {
    // Evict oldest
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of BOOK_LINES_CACHE.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) BOOK_LINES_CACHE.delete(oldestKey);
  }
  BOOK_LINES_CACHE.set(url, { lines, timestamp: Date.now() });
}

export async function GET(req: NextRequest) {
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
        });

        if (!res.ok) {
          return NextResponse.json(
            { error: `Remote storage returned HTTP ${res.status}` },
            { status: res.status }
          );
        }

        const fullText = await res.text();
        lines = fullText.split('\n').filter(Boolean);
        setCachedLines(targetUrl, lines);
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
            break; // Finished collecting target slice
          }
        } catch {}
      }

      // If exact page numbers weren't matched (e.g. index offset), fallback to slice by line index
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
            'Access-Control-Allow-Origin': '*',
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
    responseHeaders.set('Access-Control-Allow-Origin', '*');

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
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal proxy exception', message: err?.message || 'Unknown' },
      { status: 500 }
    );
  }
}
