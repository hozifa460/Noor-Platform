import { NextResponse } from 'next/server';

/**
 * CORS-proxy endpoint for PDF files.
 *
 * Supports BOTH GET (with Range requests) AND HEAD (for PDF.js to discover
 * the file size before starting Range requests). Without HEAD support,
 * PDF.js falls back to downloading the entire file — which is why 77MB
 * books were slow to load.
 *
 * The proxy:
 *   1. Follows redirects MANUALLY (re-attaching Range header on each hop).
 *   2. Streams the response body (no buffering).
 *   3. Sends permissive CORS headers + Accept-Ranges: bytes.
 *   4. Has a 120s timeout for large PDFs.
 */

const ALLOWED_HOST_PATTERNS = [
  /^archive\.org$/i,
  /^([a-z0-9-]+\.)+archive\.org$/i,
  /^raw\.githubusercontent\.com$/i,
  /^gitlab\.com$/i,
];

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.host) return true;
    return ALLOWED_HOST_PATTERNS.some((p) => p.test(parsed.host));
  } catch {
    return false;
  }
}

const MAX_REDIRECTS = 5;
const UPSTREAM_TIMEOUT_MS = 120_000; // 120s

async function fetchUpstream(
  target: string,
  method: 'GET' | 'HEAD',
  range?: string | null,
): Promise<{ response: Response | null; finalUrl: string; error?: NextResponse }> {
  let currentUrl = target;
  let response: Response | null = null;
  const visited = new Set<string>();

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (visited.has(currentUrl)) {
      return { response: null, finalUrl: currentUrl, error: NextResponse.json({ error: 'Redirect loop' }, { status: 508 }) };
    }
    visited.add(currentUrl);

    if (!isAllowedHost(currentUrl)) {
      return { response: null, finalUrl: currentUrl, error: NextResponse.json({ error: 'Disallowed host: ' + currentUrl }, { status: 403 }) };
    }

    const reqHeaders: Record<string, string> = {
      'Accept': 'application/pdf, application/octet-stream, */*',
      'User-Agent': 'Mozilla/5.0 (compatible; Noor-Islamic-Platform/1.0)',
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

    // 3xx redirect
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { response: null, finalUrl: currentUrl, error: NextResponse.json({ error: `Redirect ${response.status} without Location` }, { status: 502 }) };
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    if (!response.ok && response.status !== 206) {
      const body = method === 'GET' ? await response.text().catch(() => '') : '';
      return {
        response: null,
        finalUrl: currentUrl,
        error: NextResponse.json({ error: `Upstream ${response.status}`, url: currentUrl, body: body.slice(0, 500) }, { status: response.status }),
      };
    }

    return { response, finalUrl: currentUrl };
  }

  return { response: null, finalUrl: currentUrl, error: NextResponse.json({ error: 'Too many redirects' }, { status: 502 }) };
}

function buildResponseHeaders(upstream: Response): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    'Cache-Control': 'public, max-age=86400',
    // ALWAYS advertise Range support — this is what tells PDF.js to use
    // Range requests instead of downloading the whole file.
    'Accept-Ranges': 'bytes',
    // CRITICAL: Force inline display (not attachment download).
    // Some archive.org PDFs send Content-Disposition: attachment which
    // causes browsers to download instead of displaying in iframe.
    'Content-Disposition': 'inline',
    // X-Frame-Options must NOT be set (or set to ALLOWALL) so iframes work.
    // We explicitly do NOT send this header, which allows framing.
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
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }
  if (!isAllowedHost(target)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const range = request.headers.get('range');

  try {
    const { response, error } = await fetchUpstream(target, 'GET', range);
    if (error) return error;
    if (!response) {
      return NextResponse.json({ error: 'No response from upstream' }, { status: 502 });
    }

    const headers = buildResponseHeaders(response);
    // Stream the body directly — don't buffer.
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (err) {
    console.error('[pdf-proxy] GET error:', target, err);
    return NextResponse.json(
      { error: 'Failed to fetch upstream', message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

/**
 * HEAD handler — PDF.js sends a HEAD request first to discover the file
 * size (Content-Length) before starting Range requests. Without this,
 * PDF.js falls back to streaming the entire file.
 */
export async function HEAD(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return new NextResponse(null, { status: 400 });
  }
  if (!isAllowedHost(target)) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const { response, error } = await fetchUpstream(target, 'HEAD');
    if (error) return error;
    if (!response) {
      return new NextResponse(null, { status: 502 });
    }

    const headers = buildResponseHeaders(response);
    // HEAD response must NOT have a body.
    return new NextResponse(null, {
      status: response.status,
      headers,
    });
  } catch (err) {
    console.error('[pdf-proxy] HEAD error:', target, err);
    return new NextResponse(null, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
