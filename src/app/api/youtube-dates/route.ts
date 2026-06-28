import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * YouTube Dates API.
 *
 * Fetches ALL YouTube channel RSS feeds listed in the youtube_channels.json
 * manifest, extracts video IDs + publish dates, and returns a map of
 * videoId → publishDate.
 *
 * The client uses this map to sort videos/shorts/live by ACTUAL publish date
 * (newest first), instead of relying on file order (which doesn't work when
 * merging multiple sheikhs' files).
 *
 * The result is cached on disk for 1 hour (RSS feeds update hourly anyway).
 *
 * Usage:
 *   GET /api/youtube-dates
 *
 * Returns: { dates: { [videoId]: ISO8601 dateString }, fetchedAt: number }
 */

const CACHE_DIR = '/tmp/yt-dates';
const CACHE_FILE = path.join(CACHE_DIR, 'all-dates.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const MANIFEST_URL = 'https://raw.githubusercontent.com/hozifa460/fatawa_database/main/radio_database/youtube_channels.json';

interface ChannelManifest {
  categoryId: string;
  channelId: string;
  channelName: string;
}

interface DateCache {
  dates: Record<string, string>;
  fetchedAt: number;
}

/**
 * Fetch the channel manifest from the GitHub repo.
 */
async function fetchManifest(): Promise<ChannelManifest[]> {
  const response = await fetch(MANIFEST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Noor-Islamic-Platform/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: HTTP ${response.status}`);
  }
  const data = await response.json();
  // The manifest might be an array or { channels: [...] }
  const channels = Array.isArray(data) ? data : (data.channels || data.items || []);
  return channels;
}

/**
 * Fetch a single YouTube channel's RSS feed and extract video IDs + publish dates.
 * Returns a map of videoId → ISO date string.
 */
async function fetchChannelDates(channelId: string): Promise<Record<string, string>> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Noor-Islamic-Platform/1.0)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return {};
    const xml = await response.text();

    const dates: Record<string, string> = {};
    // Parse <entry> blocks: each has <yt:videoId> and <published>
    const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
    const entries = xml.match(entryRegex) || [];

    for (const entry of entries) {
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      if (videoIdMatch && publishedMatch) {
        dates[videoIdMatch[1]] = publishedMatch[1];
      }
    }
    return dates;
  } catch {
    return {};
  }
}

/**
 * Extract video ID from a YouTube URL.
 */
function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export async function GET() {
  // Check cache first.
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    const cache: DateCache = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        { dates: cache.dates, fetchedAt: cache.fetchedAt, cached: true },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }
  } catch {
    // No cache or invalid.
  }

  try {
    // Fetch all channel RSS feeds in parallel.
    const channels = await fetchManifest();
    const datesPromises = channels.map((ch) => fetchChannelDates(ch.channelId));
    const results = await Promise.all(datesPromises);

    // Merge all dates into one map.
    const allDates: Record<string, string> = {};
    for (const dates of results) {
      Object.assign(allDates, dates);
    }

    // Save to cache.
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cache: DateCache = { dates: allDates, fetchedAt: Date.now() };
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache));

    return NextResponse.json(
      { dates: allDates, fetchedAt: cache.fetchedAt, cached: false, channelCount: channels.length },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (err) {
    console.error('[youtube-dates] Error:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch YouTube dates',
        message: err instanceof Error ? err.message : String(err),
        dates: {},
      },
      { status: 500 },
    );
  }
}
