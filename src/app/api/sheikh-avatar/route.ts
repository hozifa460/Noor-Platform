import { NextResponse } from 'next/server';
import { getSheikhMeta } from '@/lib/sheikh-meta';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';
import { createStructuredLogger, generateRequestId } from '@/lib/observability';

export const runtime = 'nodejs';

const log = createStructuredLogger('sheikh-avatar');

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CHANNEL_RE = /^UC[A-Za-z0-9_-]{22}$/;
const ONE_DAY = 86_400;
const ONE_WEEK = 7 * ONE_DAY;

/** Server-side memo of channelId → avatar URL (per lambda instance). */
const channelAvatarCache = new Map<string, { url: string; expires: number }>();

function svgFallback(name: string): string {
  const initial = (name || '?').trim().charAt(0) || '?';
  const safe = initial.replace(/[<>&"']/g, '');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#0f7c66"/><stop offset="100%" stop-color="#0a5a4a"/>` +
    `</linearGradient></defs><rect width="160" height="160" fill="url(#g)"/>` +
    `<text x="50%" y="54%" font-size="76" font-family="sans-serif" fill="#fff" ` +
    `text-anchor="middle" dominant-baseline="middle">${safe}</text></svg>`;
  return svg;
}

function svgResponse(name: string): NextResponse {
  return new NextResponse(svgFallback(name), {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${ONE_DAY}, s-maxage=${ONE_DAY}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Resolves the YouTube channel avatar via the official Data API v3.
 * Returns null when the key is missing, the quota is exhausted, or the
 * channel has no thumbnails.
 */
async function resolveChannelAvatar(channelId: string): Promise<string | null> {
  const cached = channelAvatarCache.get(channelId);
  if (cached && cached.expires > Date.now()) return cached.url;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/channels');
  endpoint.searchParams.set('part', 'snippet');
  endpoint.searchParams.set('id', channelId);
  endpoint.searchParams.set('fields', 'items(snippet/thumbnails)');
  endpoint.searchParams.set('key', apiKey);

  const res = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    next: { revalidate: ONE_WEEK },
    signal: AbortSignal.timeout(6_000),
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const json = (await res.json().catch(() => null)) as {
    items?: Array<{ snippet?: { thumbnails?: Record<string, { url?: string }> } }>;
  } | null;

  const thumbs = json?.items?.[0]?.snippet?.thumbnails;
  const url = thumbs?.medium?.url || thumbs?.high?.url || thumbs?.default?.url || null;
  if (!url || !/^https:\/\/(yt3\.ggpht\.com|[a-z0-9-]+\.googleusercontent\.com)\//.test(url)) {
    return null;
  }

  channelAvatarCache.set(channelId, { url, expires: Date.now() + ONE_WEEK * 1000 });
  return url;
}

export async function GET(request: Request) {
  const requestId = generateRequestId();
  const rl = await enforceRateLimitAsync(request, 'sheikh-avatar', 240, 60_000);
  if (!rl.allowed && rl.response) return rl.response;

  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  const name = (url.searchParams.get('name') || id).slice(0, 80);

  if (!ID_RE.test(id)) {
    return svgResponse(name);
  }

  const meta = getSheikhMeta(id);

  // 1. Curated image (served from /public — same origin).
  if (meta.imageUrl) {
    const target = meta.imageUrl.startsWith('/') ? new URL(meta.imageUrl, url.origin) : new URL(meta.imageUrl);
    return NextResponse.redirect(target, {
      status: 302,
      headers: { 'Cache-Control': `public, max-age=${ONE_DAY}, s-maxage=${ONE_WEEK}` },
    });
  }

  // 2. YouTube channel avatar via the official Data API.
  if (meta.channelId && CHANNEL_RE.test(meta.channelId)) {
    const avatar = await resolveChannelAvatar(meta.channelId);
    if (avatar) {
      return NextResponse.redirect(avatar, {
        status: 302,
        headers: { 'Cache-Control': `public, max-age=${ONE_DAY}, s-maxage=${ONE_WEEK}` },
      });
    }
    log.log(requestId, 'channel avatar unavailable, using SVG fallback', { id, channelId: meta.channelId });
  }

  // 3. Deterministic SVG initial.
  return svgResponse(name);
}
