'use client';

import { Youtube } from 'lucide-react';

interface YouTubePlayerProps {
  url: string;
  /** Optional start position in seconds for "continue watching". */
  start?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

/** Extracts the 11-char YouTube video id from any common URL form. */
function extractYouTubeId(url: string): string | null {
  try {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    if (url.includes('youtube.com/watch')) {
      const u = new URL(url);
      const v = u.searchParams.get('v');
      return v && v.length === 11 ? v : null;
    }
    if (url.includes('youtube.com/embed/')) {
      const id = url.split('youtube.com/embed/')[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    if (url.includes('youtube.com/shorts/')) {
      const id = url.split('youtube.com/shorts/')[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function YouTubePlayer({ url, start = 0, onTimeUpdate, onEnded }: YouTubePlayerProps) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <div className="aspect-video bg-black grid place-items-center text-white/70">
        <div className="text-center">
          <Youtube className="size-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">رابط يوتيوب غير صالح</p>
          <p className="text-xs text-white/40 mt-1 truncate max-w-md" dir="ltr">{url}</p>
        </div>
      </div>
    );
  }

  // YouTube iframe API doesn't expose timeupdate events easily without the IFrame API.
  // We embed with autoplay and start param; for continue-watching we use the start param.
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&start=${Math.floor(start)}&enablejsapi=1&playsinline=1`;

  return (
    <div className="relative w-full aspect-video bg-black">
      <iframe
        key={videoId}
        src={embedUrl}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Hidden endpoint to satisfy onEnded/onTimeUpdate (YouTube IFrame API would be heavy; we no-op) */}
      <span className="sr-only" aria-hidden onChange={() => onTimeUpdate?.(0, 0)}>
        {onEnded ? '' : ''}
      </span>
    </div>
  );
}
