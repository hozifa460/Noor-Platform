import { NextResponse } from 'next/server';
import { getSheikhMeta } from '@/lib/sheikh-meta';
import { validateSafeUrl } from '@/lib/security';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * Sheikh avatar endpoint with SSRF protection and memory caching.
 */

const AVATAR_CACHE: Map<string, { buffer: Buffer; contentType: string; ts: number }> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_AVATAR_CACHE_ITEMS = 500;

function pruneCache() {
  if (AVATAR_CACHE.size > MAX_AVATAR_CACHE_ITEMS) {
    const now = Date.now();
    for (const [key, val] of AVATAR_CACHE.entries()) {
      if (now - val.ts > CACHE_TTL) {
        AVATAR_CACHE.delete(key);
      }
    }
  }
}

/** Fetches the YouTube channel avatar URL by scraping the channel page. */
async function fetchYouTubeAvatarUrl(channelId: string): Promise<string | null> {
  // Validate channelId format to avoid arbitrary queries
  if (!/^[a-zA-Z0-9_-]{15,35}$/.test(channelId)) return null;

  try {
    let currentUrl = `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;
    let res: Response | null = null;
    const visited = new Set<string>();

    for (let hop = 0; hop < 3; hop++) {
      if (visited.has(currentUrl)) return null;
      visited.add(currentUrl);

      const validation = await validateSafeUrl(currentUrl, { enforceWhitelist: true });
      if (!validation.safe) return null;

      res = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/2.0)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }
      break;
    }

    if (!res || !res.ok) return null;
    const html = await res.text();

    const patterns = [
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
      /<link\s+rel="image_src"\s+href="([^"]+)"/i,
      /"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/\\u0026/g, '&');
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetches an image URL safely with multi-hop SSRF protection and returns it as a Buffer + content type. */
async function fetchImageAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  let currentUrl = url;
  let res: Response | null = null;
  const visited = new Set<string>();

  try {
    for (let hop = 0; hop < 5; hop++) {
      if (visited.has(currentUrl)) return null;
      visited.add(currentUrl);

      const validation = await validateSafeUrl(currentUrl, { enforceWhitelist: true });
      if (!validation.safe) return null;

      res = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/2.0)',
          'Accept': 'image/*,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }
      break;
    }

    if (!res || !res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return null; // Reject non-image payloads
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return null; // Reject images larger than 5MB
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 5 * 1024 * 1024) {
      return null; // Enforce hard 5MB memory limit
    }

    const buffer = Buffer.from(arrayBuf);
    return { buffer, contentType };
  } catch {
    return null;
  }
}

/** Generates an SVG avatar with the sheikh's initials and Islamic aesthetic. */
function generateSvgAvatar(name: string, seed: string): { buffer: Buffer; contentType: string } {
  const words = name
    .replace(/^(الشيخ|الدكتور|د\.?|القارئ|العلامة|فضيلة الشيخ)\s+/i, '')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2);
  const initials = words.map((w) => w.charAt(0)).join('') || '؟';

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;

  const color1 = `hsl(${hue1}, 45%, 35%)`;
  const color2 = `hsl(${hue2}, 50%, 25%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="100%" stop-color="${color2}"/>
    </linearGradient>
    <pattern id="stars" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
      <polygon points="40,10 48,32 70,32 52,46 58,68 40,54 22,68 28,46 10,32 32,32"
               fill="white" opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <rect width="400" height="400" fill="url(#stars)"/>
  <circle cx="200" cy="200" r="140" fill="white" opacity="0.08"/>
  <circle cx="200" cy="200" r="120" fill="white" opacity="0.05"/>
  <text x="200" y="200" font-family="sans-serif" font-size="120" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="central" opacity="0.95">
    ${initials}
  </text>
</svg>`;

  return {
    buffer: Buffer.from(svg, 'utf-8'),
    contentType: 'image/svg+xml',
  };
}

export async function GET(request: Request) {
  // Rate limiting (120 req/min)
  const rateLimitResult = enforceRateLimit(request, 'api-sheikh-avatar', 120, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').slice(0, 80);
  const name = (searchParams.get('name') || id).slice(0, 100);

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  pruneCache();

  const CACHE_VERSION = 'v4';
  const cacheKey = `${id}:${CACHE_VERSION}`;
  const cached = AVATAR_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const meta = getSheikhMeta(id);

  // 1. Curated image URL
  if (meta.imageUrl) {
    const result = await fetchImageAsBuffer(meta.imageUrl);
    if (result) {
      AVATAR_CACHE.set(cacheKey, { ...result, ts: Date.now() });
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
  }

  // 2. YouTube avatar
  if (meta.channelId) {
    const avatarUrl = await fetchYouTubeAvatarUrl(meta.channelId);
    if (avatarUrl) {
      const result = await fetchImageAsBuffer(avatarUrl);
      if (result) {
        AVATAR_CACHE.set(cacheKey, { ...result, ts: Date.now() });
        return new NextResponse(new Uint8Array(result.buffer), {
          status: 200,
          headers: {
            'Content-Type': result.contentType,
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }
  }

  // 3. Fallback SVG avatar
  const svgResult = generateSvgAvatar(name, id);
  AVATAR_CACHE.set(cacheKey, { ...svgResult, ts: Date.now() });
  return new NextResponse(new Uint8Array(svgResult.buffer), {
    status: 200,
    headers: {
      'Content-Type': svgResult.contentType,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
