import { NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/security';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';

/**
 * CORS-proxy endpoint for PDF files with strict SSRF & Redirect validation.
 */

const MAX_REDIRECTS = 5;
const UPSTREAM_TIMEOUT_MS = 60_000; // 60s

async function fetchUpstream(
  target: string,
  method: 'GET' | 'HEAD',
  range?: string | null
): Promise<{ response: Response | null; finalUrl: string; error?: NextResponse }> {
  let currentUrl = target;
  let response: Response | null = null;
  const visited = new Set<string>();

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (visited.has(currentUrl)) {
      return {
        response: null,
        finalUrl: currentUrl,
        error: NextResponse.json({ error: 'Redirect loop detected' }, { status: 508 }),
      };
    }
    visited.add(currentUrl);

    // Validate URL and IP on each hop to prevent SSRF via redirects
    const validation = await validateSafeUrl(currentUrl, { enforceWhitelist: true });
    if (!validation.safe) {
      return {
        response: null,
        finalUrl: currentUrl,
        error: NextResponse.json(
          { error: 'Forbidden host', message: validation.error },
          { status: 403 }
        ),
      };
    }

    const reqHeaders: Record<string, string> = {
      'Accept': 'application/pdf, application/octet-stream, */*',
      'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0)',
    };
    if (range) reqHeaders['Range'] = range;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      response = await fetch(currentUrl, {
        method,
        headers: reqHeaders,
        redirect: 'manual',
        signal: controller.signal,
        cache: 'no-cache',
      });
    } finally {
      clearTimeout(timer);
    }

    // 3xx redirect handling
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return {
          response: null,
          finalUrl: currentUrl,
          error: NextResponse.json(
            { error: `Redirect ${response.status} missing Location header` },
            { status: 502 }
          ),
        };
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    if (!response.ok && response.status !== 206) {
      return {
        response: null,
        finalUrl: currentUrl,
        error: NextResponse.json(
          { error: `Upstream returned status ${response.status}`, url: currentUrl },
          { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
        ),
      };
    }

    const cl = response.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 150 * 1024 * 1024) {
      return {
        response: null,
        finalUrl: currentUrl,
        error: NextResponse.json(
          { error: 'PDF file exceeds maximum allowed proxy size (150MB)' },
          { status: 413 }
        ),
      };
    }

    return { response, finalUrl: currentUrl };
  }

  return {
    response: null,
    finalUrl: currentUrl,
    error: NextResponse.json({ error: 'Too many redirects' }, { status: 502 }),
  };
}

function buildResponseHeaders(upstream: Response): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'public, max-age=86400',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
  };

  const ct = upstream.headers.get('content-type');
  if (ct && ct.includes('pdf')) {
    headers['Content-Type'] = ct;
  } else if (ct && ct !== 'text/html') {
    headers['Content-Type'] = ct;
  } else {
    headers['Content-Type'] = 'application/pdf';
  }

  const cl = upstream.headers.get('content-length');
  if (cl) headers['Content-Length'] = cl;
  const cr = upstream.headers.get('content-range');
  if (cr) headers['Content-Range'] = cr;

  return headers;
}

export async function GET(request: Request) {
  // Rate limiting (60 req/min)
  const rateLimitResult = await enforceRateLimitAsync(request, 'api-proxy-pdf', 60, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const range = request.headers.get('range');

  try {
    const { response, error } = await fetchUpstream(target, 'GET', range);
    if (error) return error;
    if (!response) {
      return NextResponse.json({ error: 'No response from upstream' }, { status: 502 });
    }

    const headers = buildResponseHeaders(response);

    const MAX_PDF_PROXY_BYTES = 150 * 1024 * 1024;
    let bytesRead = 0;
    let streamTimer: NodeJS.Timeout | null = null;

    const byteLimiter = new TransformStream<Uint8Array, Uint8Array>({
      start(controller) {
        streamTimer = setTimeout(() => {
          try {
            controller.error(new Error('PDF stream timeout exceeded'));
          } catch {
            /* ignore */
          }
        }, UPSTREAM_TIMEOUT_MS);
      },
      transform(chunk, controller) {
        bytesRead += chunk.byteLength;
        if (bytesRead > MAX_PDF_PROXY_BYTES) {
          if (streamTimer) clearTimeout(streamTimer);
          controller.error(new Error(`PDF proxy exceeded limit of ${MAX_PDF_PROXY_BYTES} bytes`));
          return;
        }
        controller.enqueue(chunk);
      },
      flush() {
        if (streamTimer) clearTimeout(streamTimer);
      },
    });

    const limitedBody = response.body ? response.body.pipeThrough(byteLimiter) : null;

    return new NextResponse(limitedBody, {
      status: response.status,
      headers,
    });
  } catch (err) {
    console.error('[PDF Proxy Error]', err);
    return NextResponse.json(
      { error: 'Failed to fetch PDF document' },
      { status: 502 }
    );
  }
}

export async function HEAD(request: Request) {
  const rateLimitResult = await enforceRateLimitAsync(request, 'api-proxy-pdf-head', 100, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const { response, error } = await fetchUpstream(target, 'HEAD');
    if (error) return error;
    if (!response) {
      return new NextResponse(null, { status: 502 });
    }

    const headers = buildResponseHeaders(response);
    return new NextResponse(null, {
      status: response.status,
      headers,
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
