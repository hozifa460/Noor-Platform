import { NextResponse } from 'next/server';
import { getSheikhMeta } from '@/lib/sheikh-meta';

/**
 * Sheikh avatar endpoint.
 *
 * Usage: /api/sheikh-avatar?id=zein_khair_allah&name=زين خير الله
 *
 * Resolution order:
 *   1. Curated image URL (for famous sheikhs with known photos)
 *   2. YouTube channel avatar (fetched server-side from the channel page)
 *   3. Generated SVG avatar (Islamic-themed, with the sheikh's initials)
 *
 * The image is PROXIED through our server (not redirected) to avoid
 * cross-origin issues, rate limiting, and hot-linking protection.
 * Results are cached server-side for 24 hours.
 */

const AVATAR_CACHE: Map<string, { buffer: Buffer; contentType: string; ts: number }> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** Fetches the YouTube channel avatar URL by scraping the channel page. */
async function fetchYouTubeAvatarUrl(channelId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${channelId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) return null;
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

/** Fetches an image URL and returns it as a Buffer + content type. */
async function fetchImageAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
  } catch {
    return null;
  }
}

/** Generates a nice SVG avatar with the sheikh's initials and Islamic colors. */
function generateSvgAvatar(name: string, seed: string): { buffer: Buffer; contentType: string } {
  const words = name
    .replace(/^(الشيخ|الدكتور|د\.?|القارئ)\s+/i, '')
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
  <text x="200" y="200" font-family="Arial, sans-serif" font-size="120" font-weight="bold"
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
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';
  const name = searchParams.get('name') || id;

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  // Check server-side cache first.
  // Cache key includes a version suffix so we can bust the cache by
  // bumping the version when sheikh-meta.ts is updated.
  const CACHE_VERSION = 'v3';
  const cacheKey = `${id}:${CACHE_VERSION}`;
  const cached = AVATAR_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const meta = getSheikhMeta(id);

  // Try curated image URL first.
  if (meta.imageUrl) {
    const result = await fetchImageAsBuffer(meta.imageUrl);
    if (result) {
      AVATAR_CACHE.set(cacheKey, { ...result, ts: Date.now() });
      return new NextResponse(result.buffer, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  }

  // Try YouTube channel avatar.
  if (meta.channelId) {
    const avatarUrl = await fetchYouTubeAvatarUrl(meta.channelId);
    if (avatarUrl) {
      const result = await fetchImageAsBuffer(avatarUrl);
      if (result) {
        AVATAR_CACHE.set(cacheKey, { ...result, ts: Date.now() });
        return new NextResponse(result.buffer, {
          status: 200,
          headers: {
            'Content-Type': result.contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }
  }

  // Fallback: generated SVG avatar.
  const svgResult = generateSvgAvatar(name, id);
  AVATAR_CACHE.set(cacheKey, { ...svgResult, ts: Date.now() });
  return new NextResponse(svgResult.buffer, {
    status: 200,
    headers: {
      'Content-Type': svgResult.contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
