import { NextResponse } from 'next/server';
import { SHEIKH_META } from '@/lib/sheikh';
import { enforceRateLimitAsync } from '@/lib/shared/server';
import { createStructuredLogger, generateRequestId } from '@/lib/shared';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const revalidate = 3600;

const log = createStructuredLogger('youtube-dates');

const CHANNEL_RE = /^UC[A-Za-z0-9_-]{22}$/;
const ENTRY_RE = /<entry>([\s\S]*?)<\/entry>/g;
const VIDEO_ID_RE = /<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/;
const PUBLISHED_RE = /<published>([^<]+)<\/published>/;

/**
 * Parses a YouTube channel RSS feed (public, no API key required) into
 * videoId → ISO published date. Feeds contain the 15 most recent uploads.
 */
async function fetchChannelDates(channelId: string): Promise<Record<string, string>> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl, {
    headers: { Accept: 'application/atom+xml, application/xml' },
    next: { revalidate },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!res || !res.ok) return {};

  const xml = await res.text();
  const out: Record<string, string> = {};
  for (const match of xml.matchAll(ENTRY_RE)) {
    const entry = match[1];
    const id = VIDEO_ID_RE.exec(entry)?.[1];
    const published = PUBLISHED_RE.exec(entry)?.[1];
    if (id && published && !Number.isNaN(Date.parse(published))) {
      out[id] = new Date(published).toISOString();
    }
  }
  return out;
}

export async function GET(request: Request) {
  const requestId = generateRequestId();
  const rl = await enforceRateLimitAsync(request, 'youtube-dates', 30, 60_000);
  if (!rl.allowed && rl.response) return rl.response;

  const channelIds = Array.from(
    new Set(
      Object.values(SHEIKH_META)
        .map((m) => m.channelId)
        .filter((id): id is string => Boolean(id) && CHANNEL_RE.test(id as string)),
    ),
  );

  const results = await Promise.allSettled(channelIds.map(fetchChannelDates));
  const dates: Record<string, string> = {};
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') Object.assign(dates, r.value);
    else failed += 1;
  }
  if (failed) log.log(requestId, 'some channel feeds failed', { failed, total: channelIds.length });

  return NextResponse.json(
    { dates, channels: channelIds.length, generatedAt: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=3600',
        'X-Request-Id': requestId,
      },
    },
  );
}
