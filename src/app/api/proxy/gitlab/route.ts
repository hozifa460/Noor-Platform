import { NextResponse } from 'next/server';

/**
 * CORS-proxy endpoint for GitLab raw files.
 *
 * GitLab's raw endpoint doesn't set permissive CORS headers, so browser
 * fetches fail. This server-side proxy fetches the file server-side and
 * re-serves it with permissive CORS headers.
 *
 * Usage:
 *   /api/proxy/gitlab?url=<encoded URL>
 *
 * The URL must be a gitlab.com/-/raw/ URL.
 */

const ALLOWED_PREFIX = 'https://gitlab.com/';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!target.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json({ error: 'Only gitlab.com URLs are allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      headers: { 'Accept': 'application/json, text/plain, */*' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}`, url: target },
        { status: upstream.status },
      );
    }

    const body = await upstream.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    );
  }
}
