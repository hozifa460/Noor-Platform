import { NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/security';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';

/**
 * Hardened proxy endpoint for GitLab raw files with multi-hop SSRF validation.
 */
const GITLAB_RAW_REGEX = /^https:\/\/gitlab\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/-\/raw\/[a-zA-Z0-9_.-]+\/.+$/;
const MAX_REDIRECTS = 5;

export async function GET(request: Request) {
  // Rate limit: 120 req/min
  const rateLimitResult = await enforceRateLimitAsync(request, 'api-proxy-gitlab', 120, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!target.startsWith('https://gitlab.com/') || !GITLAB_RAW_REGEX.test(target)) {
    return NextResponse.json(
      { error: 'Invalid GitLab raw URL format' },
      { status: 403 }
    );
  }

  let currentUrl = target;
  let upstream: Response | null = null;
  const visited = new Set<string>();

  try {
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      if (visited.has(currentUrl)) {
        return NextResponse.json({ error: 'Redirect loop detected' }, { status: 508 });
      }
      visited.add(currentUrl);

      // Validate URL on EACH hop to protect against SSRF
      const validation = await validateSafeUrl(currentUrl, { enforceWhitelist: true });
      if (!validation.safe) {
        return NextResponse.json(
          { error: 'Forbidden destination host' },
          { status: 403 }
        );
      }

      upstream = await fetch(currentUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/2.0)',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get('location');
        if (!location) {
          return NextResponse.json(
            { error: `Redirect ${upstream.status} missing Location header` },
            { status: 502 }
          );
        }
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      break;
    }

    if (!upstream || !upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream resource unavailable' },
        { status: upstream ? (upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502) : 502 }
      );
    }

    const MAX_GITLAB_BYTES = 20 * 1024 * 1024; // 20MB max
    const cl = upstream.headers.get('content-length');
    if (cl && parseInt(cl, 10) > MAX_GITLAB_BYTES) {
      return NextResponse.json({ error: 'Payload exceeds size limit' }, { status: 413 });
    }

    const reader = upstream.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'Empty upstream body' }, { status: 502 });
    }

    const decoder = new TextDecoder();
    let body = '';
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_GITLAB_BYTES) {
          await reader.cancel();
          return NextResponse.json({ error: 'Payload exceeds size limit' }, { status: 413 });
        }
        body += decoder.decode(value, { stream: true });
      }
    }
    body += decoder.decode();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[GitLab Proxy Error]', err);
    return NextResponse.json(
      { error: 'Failed to fetch upstream resource' },
      { status: 502 }
    );
  }
}
