import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * YouTube Date Lookup API.
 *
 * Fetches the publish date for a YouTube video using the YouTube oEmbed API
 * (which doesn't require an API key) + a small in-memory cache.
 *
 * Since oEmbed doesn't return the publish date directly, we use a different
 * approach: we fetch the video's YouTube watch page and extract the
 * "uploadDate" from the JSON-LD structured data.
 *
 * Usage:
 *   GET /api/youtube-date?videoId=VIDEO_ID
 *
 * Returns: { date: ISO8601 string | null }
 *
 * The result is cached on disk at /tmp/yt-date-cache/ for 30 days.
 */

const CACHE_DIR = '/tmp/yt-date-cache';
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
    // Not cached or expired.
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
    // Ignore cache write errors.
  }
}

/**
 * Fetch the publish date for a YouTube video by scraping the watch page.
 * YouTube embeds JSON-LD structured data that includes "uploadDate".
 */
async function fetchPublishDate(videoId: string): Promise<string | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Noor-Islamic-Platform/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const html = await response.text();

    // Extract uploadDate from JSON-LD structured data.
    // The HTML contains: "uploadDate":"2024-01-15T10:30:00-08:00"
    const match = html.match(/"uploadDate"\s*:\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }

    // Fallback: try datePublished
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
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  // Check cache first.
  const cached = await getCachedDate(videoId);
  if (cached !== undefined) {
    return NextResponse.json(
      { date: cached },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  // Fetch from YouTube.
  const date = await fetchPublishDate(videoId);
  await setCachedDate(videoId, date);

  return NextResponse.json(
    { date },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
