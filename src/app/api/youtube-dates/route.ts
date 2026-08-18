import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';

/**
 * YouTube Dates API.
 * Fetches YouTube channel RSS feeds safely and caches results.
 */

const CACHE_DIR = path.join(os.tmpdir(), 'yt-dates');
const CACHE_FILE = path.join(CACHE_DIR, 'all-dates.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const MANIFEST_URL =
  'https://raw.githubusercontent.com/hozifa460/fatawa_database/main/radio_database/youtube_channels.json';

interface ChannelManifest {
  categoryId: string;
  channelId: string;
  channelName: string;
}

interface DateCache {
  dates: Record<string, string>;
  fetchedAt: number;
}

async function fetchManifest(): Promise<ChannelManifest[]> {
  const response = await fetch(MANIFEST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.channels || data.items || [];
}

async function fetchChannelDates(channelId: string): Promise<Record<string, string>> {
  if (!/^[a-zA-Z0-9_-]{15,35}$/.test(channelId)) return {};

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return {};
    const xml = await response.text();

    const dates: Record<string, string> = {};
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

export async function GET(request: Request) {
  // Rate limit: 30 req/min
  const rateLimitResult = await enforceRateLimitAsync(request, 'api-youtube-dates', 30, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // Check cache first
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
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }
  } catch {
    // Cache miss
  }

  try {
    const channels = await fetchManifest();
    const allDates: Record<string, string> = {};

    // Limit concurrency to 5 channels at a time
    const CONCURRENCY = 5;
    for (let i = 0; i < channels.length; i += CONCURRENCY) {
      const chunk = channels.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map((ch) => fetchChannelDates(ch.channelId)));
      for (const dates of results) {
        Object.assign(allDates, dates);
      }
    }

    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cache: DateCache = { dates: allDates, fetchedAt: Date.now() };
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache));

    return NextResponse.json(
      { dates: allDates, fetchedAt: cache.fetchedAt, cached: false, channelCount: channels.length },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err) {
    console.error('[youtube-dates] Error:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch YouTube dates',
        dates: {},
      },
      { status: 500 }
    );
  }
}
