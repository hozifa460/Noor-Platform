'use client';

import { useRef, useEffect } from 'react';
import Hls from 'hls.js';

interface Html5PlayerProps {
  url: string;
  poster?: string;
  start?: number;
  isLive?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

/**
 * Universal HTML5 player for audio, video, and HLS live streams.
 * Uses native <video>/<audio> with hls.js loaded on-demand for .m3u8 streams.
 */
export function Html5Player({
  url,
  poster,
  start = 0,
  isLive = false,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
}: Html5PlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const hlsRef = useRef<unknown>(null);

  // Decide tag kind: explicit audio extensions OR (no video extension AND no poster AND not live)
  // For archive.org URLs with .mp4 in the path, we treat as video.
  const isAudio = /\.(mp3|aac|ogg|wav|m4a)(\?|$|\/)/i.test(url) ||
    (!isLive && !/\.(mp4|webm|mov|m3u8)(\?|$|\/)/i.test(url) && !poster);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    let cancelled = false;

    async function setup() {
      // Cleanup any previous HLS instance
      if (hlsRef.current) {
        const hls = hlsRef.current as { destroy: () => void };
        try { hls.destroy(); } catch { /* ignore */ }
        hlsRef.current = null;
      }

      const isHls = /\.m3u8(\?|$|\/)/i.test(url);

      if (isHls) {
        // Native HLS (Safari)
        if (media.canPlayType('application/vnd.apple.mpegurl')) {
          (media as HTMLMediaElement).src = url;
        } else if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: isLive });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(media as HTMLVideoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (start > 0 && !isLive) {
              try { (media as HTMLVideoElement).currentTime = start; } catch { /* ignore */ }
            }
          });
        }
      } else {
        (media as HTMLMediaElement).src = url;
        if (start > 0) {
          const onLoaded = () => {
            try { (media as HTMLVideoElement).currentTime = start; } catch { /* ignore */ }
            media.removeEventListener('loadedmetadata', onLoaded);
          };
          media.addEventListener('loadedmetadata', onLoaded);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        const hls = hlsRef.current as { destroy: () => void };
        try { hls.destroy(); } catch { /* ignore */ }
        hlsRef.current = null;
      }
    };
  }, [url, start, isLive]);

  // Attach media events
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    const handleTime = () => {
      onTimeUpdate?.(media.currentTime, isFinite(media.duration) ? media.duration : 0);
    };
    const handleEnded = () => onEnded?.();
    const handlePlay = () => onPlay?.();
    const handlePause = () => onPause?.();
    media.addEventListener('timeupdate', handleTime);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    return () => {
      media.removeEventListener('timeupdate', handleTime);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate, onEnded, onPlay, onPause]);

  if (isAudio) {
    return (
      <div className="w-full bg-gradient-to-br from-primary/5 to-accent/5 p-6 rounded-xl">
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          controls
          autoPlay
          className="w-full"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black">
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        controls
        autoPlay
        playsInline
        poster={poster}
        className="absolute inset-0 w-full h-full"
        preload="metadata"
      />
    </div>
  );
}
