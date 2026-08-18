import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * YouTube Date Lookup API with input validation and cross-platform caching.
 */

const CACHE_DIR = path.join(os.tmpdir(), 'yt-date-cache');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface DateCacheEntry {
  date: string | null;
  fetchedAt: number;
}

async function getCachedDate(videoId: string): Promise<string | null | undefined> {
  try {
    const cachePath = path.join(CACHE_DIR, `${videoId}.json`);
    const raw = await fs.readFile(cachePath, 'utf-8');
    const entry: DateCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
      return entry.date;
    }
  } catch {
    // Not cached or expired
  }
  return undefined;
}

async function setCachedDate(videoId: string, date: string | null): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, `${videoId}.json`);
    const entry: DateCacheEntry = { date, fetchedAt: Date.now() };
    await fs.writeFile(cachePath, JSON.stringify(entry));
  } catch {
    // Ignore cache write errors
  }
}

async function fetchPublishDate(videoId: string): Promise<string | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const html = await response.text();

    const match = html.match(/"uploadDate"\s*:\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }

    const match2 = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
    if (match2 && match2[1]) {
      return match2[1];
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // Rate limit: 120 req/min
  const rateLimitResult = enforceRateLimit(request, 'api-youtube-date', 120, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid or missing 11-character YouTube videoId' }, { status: 400 });
  }

  const cached = await getCachedDate(videoId);
  if (cached !== undefined) {
    return NextResponse.json(
      { date: cached },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }

  const date = await fetchPublishDate(videoId);
  await setCachedDate(videoId, date);

  return NextResponse.json(
    { date },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}
