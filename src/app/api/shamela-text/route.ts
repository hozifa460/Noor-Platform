import { NextRequest, NextResponse } from 'next/server';

/**
 * Maktaba Shamela 4 Text & Streaming API Proxy
 * 
 * Supports:
 * 1. Full resource proxying (metadata, toc.jsonl)
 * 2. On-demand page slice extraction via ?pageStart=X&pageCount=Y
 * 3. Range-requests for streaming
 */

const BASE_HF_RESOLVE = 'https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days edge cache

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
      const lines = fullText.split('\n').filter(Boolean);
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
        { error: `Remote storage returned HTTP ${res.status}: ${res.statusText}` },
        { status: res.status }
      );
    }

    const contentType = cleanPath.endsWith('.json')
      ? 'application/json; charset=utf-8'
      : 'text/plain; charset=utf-8';

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    const contentRange = res.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    const contentLength = res.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to stream Shamela resource', details: err?.message },
      { status: 502 }
    );
  }
}
