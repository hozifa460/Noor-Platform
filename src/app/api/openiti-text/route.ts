import { NextRequest, NextResponse } from 'next/server';

/**
 * OpenITI Text Proxy API
 * 
 * Fetches classical Arabic text from OpenITI GitHub repos.
 * Handles multiple file extension variants (.completed, .mARkdown, .inProgress, bare).
 * Streams text directly to the client for on-the-fly parsing.
 * 
 * Usage: /api/openiti-text?url=<raw_github_url>
 */

const EXTENSION_VARIANTS = [
  '',              // bare file (most common)
  '.completed',    // completed annotation
  '.mARkdown',     // markdown variant
  '.inProgress',   // in-progress annotation
];

const CACHE_TTL = 60 * 60 * 24; // 24 hours

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // Validate URL is from OpenITI on GitHub
  if (!url.startsWith('https://raw.githubusercontent.com/OpenITI/')) {
    return NextResponse.json({ error: 'Invalid source URL' }, { status: 403 });
  }

  // Try each extension variant until one succeeds
  for (const ext of EXTENSION_VARIANTS) {
    const tryUrl = url + ext;
    try {
      const res = await fetch(tryUrl, {
        headers: { 'Accept': 'text/plain' },
        next: { revalidate: CACHE_TTL },
      });
      if (res.ok) {
        const text = await res.text();
        return new NextResponse(text, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
            'X-OpenITI-Source': tryUrl,
          },
        });
      }
    } catch {
      // Try next variant
    }
  }

  return NextResponse.json(
    { error: 'Book text not found in any OpenITI variant' },
    { status: 404 }
  );
}
