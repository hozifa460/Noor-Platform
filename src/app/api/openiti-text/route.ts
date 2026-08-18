import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';
import { validateSafeUrl } from '@/lib/security';

/**
 * OpenITI Text Proxy API
 * Fetches classical Arabic text from OpenITI GitHub repos with rate limiting, timeouts, and byte capping.
 */

const EXTENSION_VARIANTS = [
  '',              // bare file (most common)
  '.completed',    // completed annotation
  '.mARkdown',     // markdown variant
  '.inProgress',   // in-progress annotation
];

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const MAX_OPENITI_BYTES = 35 * 1024 * 1024; // 35MB max limit

export async function GET(req: NextRequest) {
  // Rate limiting (120 req/min)
  const rateLimitResult = await enforceRateLimitAsync(req, 'api-openiti-text', 120, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // Validate URL is from OpenITI on GitHub
  if (!url.startsWith('https://raw.githubusercontent.com/OpenITI/')) {
    return NextResponse.json({ error: 'Invalid source URL' }, { status: 403 });
  }

  const validation = await validateSafeUrl(url, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json({ error: 'Forbidden host' }, { status: 403 });
  }

  // Try each extension variant until one succeeds
  for (const ext of EXTENSION_VARIANTS) {
    const tryUrl = url + ext;
    try {
      const res = await fetch(tryUrl, {
        headers: { 'Accept': 'text/plain' },
        next: { revalidate: CACHE_TTL },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        const cl = res.headers.get('content-length');
        if (cl && parseInt(cl, 10) > MAX_OPENITI_BYTES) {
          return NextResponse.json({ error: 'Text size exceeds limit' }, { status: 413 });
        }

        let bytesRead = 0;
        const byteLimiter = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            bytesRead += chunk.byteLength;
            if (bytesRead > MAX_OPENITI_BYTES) {
              controller.error(new Error(`OpenITI payload exceeds limit of ${MAX_OPENITI_BYTES} bytes`));
              return;
            }
            controller.enqueue(chunk);
          },
        });

        const limitedBody = res.body ? res.body.pipeThrough(byteLimiter) : null;

        return new NextResponse(limitedBody, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
            'X-OpenITI-Source': tryUrl,
            'X-Content-Type-Options': 'nosniff',
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
