'use client';

import { useEffect, useState, useRef } from 'react';
import { useLibraryStore } from '@/stores/library.store';
import { usePlayerStore } from '@/stores/player.store';
import type { MediaItem } from '@/lib/types';
import { Play, Radio, Users, Sparkles } from 'lucide-react';

interface SlideData {
  item: MediaItem;
  sheikhName: string;
}

/**
 * Hero carousel — auto-rotating featured content on the home page.
 *
 * Picks 5 interesting items (mix of live streams, recent videos, and
 * high-duration content) and displays them in a full-width carousel
 * with the thumbnail as background, title overlay, and play button.
 */
export function HeroCarousel() {
  const items = useLibraryStore((s) => s.items);
  const sheikhs = useLibraryStore((s) => s.sheikhsArray);
  const openPlayer = usePlayerStore((s) => s.open);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pick 5 featured items: prefer live, then recent videos, then mix.
  const slides: SlideData[] = items.length > 0 ? pickFeaturedItems(items, sheikhs) : [];

  useEffect(() => {
    if (slides.length === 0 || paused) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  if (!slide) return null;

  return (
    <section
      className="relative mb-8 rounded-3xl overflow-hidden border border-border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ minHeight: '320px' }}
    >
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0">
        {slide.item.imageUrl ? (
          <img
            key={slide.item.id}
            src={slide.item.imageUrl}
            alt=""
            className="w-full h-full object-cover animate-[fadein_0.8s_ease-out]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 via-accent/30 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col justify-end p-6 sm:p-8 lg:p-10 min-h-[320px]">
        <div className="max-w-2xl">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {slide.item.section === 'live' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold pulse-live">
                <Radio className="size-2.5" />
                مباشر الآن
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/80 text-primary-foreground text-[10px] font-bold backdrop-blur">
              <Sparkles className="size-2.5" />
              مميز
            </span>
            {slide.sheikhName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[10px] font-medium backdrop-blur">
                <Users className="size-2.5" />
                {slide.sheikhName}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2 drop-shadow-lg">
            {slide.item.title}
          </h2>

          {slide.item.subtitle && (
            <p className="text-sm text-white/80 mb-4 line-clamp-1">{slide.item.subtitle}</p>
          )}

          {/* Play button */}
          <button
            onClick={() => openPlayer(slide.item)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all hover:scale-105 shadow-xl"
          >
            <Play className="size-4 fill-black" />
            تشغيل الآن
          </button>
        </div>
      </div>

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-4 z-20 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === current ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`الشريحة ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Picks 5 featured items for the carousel:
 *   - 1 live stream (if any)
 *   - 2 recent videos (newest in each sheikh)
 *   - 2 random items from different sheikhs
 *
 * Always returns items with imageUrl for nice visuals.
 */
function pickFeaturedItems(items: MediaItem[], sheikhs: { id: string; name: string }[]): SlideData[] {
  const withSheikhName = items.map((item) => {
    const sheikh = sheikhs.find((s) => s.id === item.sheikhId);
    return { item, sheikhName: sheikh?.name || item.sheikhName || '' };
  });

  // Filter to items with images for better visuals.
  const withImages = withSheikhName.filter((s) => s.item.imageUrl);

  // 1. Live streams first — prefer currently-broadcasting items (liveStatus === 'now'),
  //    fall back to any live item if none are broadcasting right now.
  const liveNow = withImages.filter((s) => s.item.section === 'live' && s.item.liveStatus === 'now');
  const live = (liveNow.length > 0 ? liveNow : withImages.filter((s) => s.item.section === 'live')).slice(0, 1);

  // 2. Recent videos (one per sheikh, newest first)
  const videosBySheikh = new Map<string, SlideData>();
  for (const s of withImages) {
    if (s.item.section === 'videos' || s.item.section === 'main') {
      if (!videosBySheikh.has(s.item.sheikhId || '')) {
        videosBySheikh.set(s.item.sheikhId || '', s);
      }
    }
  }
  const recentVideos = Array.from(videosBySheikh.values()).slice(0, 2);

  // 3. Random from different sheikhs
  const usedSheikhs = new Set([
    ...live.map((s) => s.item.sheikhId),
    ...recentVideos.map((s) => s.item.sheikhId),
  ]);
  const remaining = withImages.filter((s) => !usedSheikhs.has(s.item.sheikhId));
  // Deterministic "random" based on item id hash so it's stable per session.
  const shuffled = [...remaining].sort((a, b) => {
    const hashA = a.item.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const hashB = b.item.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    return hashA - hashB;
  });
  const random = shuffled.slice(0, 2);

  const result = [...live, ...recentVideos, ...random].slice(0, 5);
  return result.length > 0 ? result : withImages.slice(0, 5);
}
