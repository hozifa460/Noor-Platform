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

    const body = await upstream.text();
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
