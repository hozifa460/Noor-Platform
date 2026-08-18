import { NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/security';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * CORS-proxy endpoint for GitLab raw files with SSRF and path validation.
 */
const GITLAB_RAW_REGEX = /^https:\/\/gitlab\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/-\/raw\/[a-zA-Z0-9_.-]+\/.+$/;

export async function GET(request: Request) {
  // Rate limit: 120 req/min
  const rateLimitResult = enforceRateLimit(request, 'api-proxy-gitlab', 120, 60_000);
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

  // SSRF & Private IP validation
  const validation = await validateSafeUrl(target, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json(
      { error: 'Forbidden', message: validation.error },
      { status: 403 }
    );
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned status ${upstream.status}`, url: target },
        { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 }
      );
    }

    const body = await upstream.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch from GitLab', message: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
