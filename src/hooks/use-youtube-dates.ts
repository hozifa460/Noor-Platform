'use client';

import { useEffect, useState } from 'react';

/**
 * Hook that fetches YouTube publish dates for all videos and returns a map
 * of videoId → ISO date string.
 *
 * The dates are fetched from /api/youtube-dates (which scrapes YouTube RSS
 * feeds server-side). Once available, the client can sort videos/shorts/live
 * by ACTUAL publish date (newest first) instead of relying on file order.
 *
 * The API caches results for 1 hour, so subsequent calls are instant.
 *
 * Returns:
 *   - dates: Record<string, string> — map of videoId → ISO date
 *   - loaded: boolean — true once dates are fetched
 *   - getDate(videoUrl): function — returns the date for a given YouTube URL
 */

interface UseYouTubeDatesResult {
  dates: Record<string, string>;
  loaded: boolean;
  getDate: (videoUrl: string) => string | undefined;
}

let cachedDates: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

export function useYouTubeDates(): UseYouTubeDatesResult {
  const [dates, setDates] = useState<Record<string, string>>(cachedDates || {});
  const [loaded, setLoaded] = useState(cachedDates !== null);

  useEffect(() => {
    if (cachedDates) {
      Promise.resolve().then(() => {
        setDates(cachedDates!);
        setLoaded(true);
      });
      return;
    }

    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const res = await fetch('/api/youtube-dates');
          if (!res.ok) return {};
          const data = await res.json();
          const d = data.dates || {};
          cachedDates = d;
          return d;
        } catch {
          return {};
        }
      })();
    }

    fetchPromise.then((d) => {
      setDates(d);
      setLoaded(true);
    });
  }, []);

  const getDate = (videoUrl: string): string | undefined => {
    if (!videoUrl) return undefined;
    // Extract video ID from URL
    const match = videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    );
    if (!match) return undefined;
    return dates[match[1]];
  };

  return { dates, loaded, getDate };
}
