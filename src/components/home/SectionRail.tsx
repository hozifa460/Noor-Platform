'use client';

import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { MediaCard } from '@/components/media/MediaCard';
import { MediaRailSkeleton } from '@/components/media/MediaCardSkeleton';
import { useLibraryStore } from '@/stores/library.store';
import { useNavStore } from '@/stores/nav.store';
import { useYouTubeDates } from '@/hooks/use-youtube-dates';
import type { MediaItem, SectionKind } from '@/lib/types';
import { useMemo } from 'react';

interface SectionRailProps {
  title: string;
  section: SectionKind;
  icon?: LucideIcon;
  limit?: number;
  /** When true, show skeleton placeholders instead of hiding the section. */
  loading?: boolean;
  /** When true, shuffle items so the rail shows a mix of sheikhs (default: true). */
  shuffle?: boolean;
}

/**
 * Deterministic shuffle that distributes items from different sheikhs
 * evenly across the result. Uses a round-robin approach: takes one item
 * from each sheikh in turn, so no single sheikh dominates the top of the rail.
 *
 * This is NOT a random shuffle — it's deterministic based on input order,
 * so the same items always produce the same output (stable UI).
 */
function interleaveBySheikh(items: MediaItem[]): MediaItem[] {
  // Group items by sheikhId, preserving insertion order within each group.
  const groups = new Map<string, MediaItem[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = item.sheikhId || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  // Round-robin: take one from each group in turn.
  const result: MediaItem[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const key of order) {
      const group = groups.get(key);
      if (group && group.length > 0) {
        result.push(group.shift()!);
        remaining--;
        if (remaining === 0) break;
      }
    }
  }
  return result;
}

/**
 * Returns true if an item was sourced from a YouTube-channel sheikh.
 *
 * Heuristic: the auto-sync Dart script writes `<sheikh>.videos.json`,
 * `<sheikh>.shorts.json`, and `<sheikh>.live.json` for sheikhs with YouTube
 * channels. Main-collection files (`1_*.json`, `*_1.json`) come from the
 * `radio_islam` GitLab repo and are NOT YouTube-synced.
 *
 * Items without `sourceFile` are conservatively treated as non-YouTube.
 */
function isYouTubeSourced(item: MediaItem): boolean {
  if (!item.sourceFile) return false;
  return /\.(videos|shorts|live)\.json$/i.test(item.sourceFile);
}

/**
 * Returns true if an item was sourced from a YouTube-channel sync file
 * (.videos.json, .shorts.json, .live.json). These contain the LATEST content.
 */
function isYouTubeSynced(item: MediaItem): boolean {
  if (!item.sourceFile) return false;
  return /\.(videos|shorts|live)\.json$/i.test(item.sourceFile);
}

/**
 * Interleave by sheikh (round-robin): the newest video from each sheikh
 * appears first, then the second-newest from each sheikh, etc.
 */
function sortByNewestWithDiversity(items: MediaItem[]): MediaItem[] {
  const groups = new Map<string, MediaItem[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = item.sheikhId || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  const result: MediaItem[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const key of order) {
      const group = groups.get(key);
      if (group && group.length > 0) {
        result.push(group.shift()!);
        remaining--;
        if (remaining === 0) break;
      }
    }
  }
  return result;
}

/**
 * Sort items by ACTUAL YouTube publish date (newest first).
 */
function sortByActualDate(
  items: MediaItem[],
  getDate: (url: string) => string | undefined,
): MediaItem[] {
  const withDates = items.map((item) => {
    const url = item.youtubeUrl || item.videoUrl || item.audioUrl || '';
    const dateStr = getDate(url);
    const timestamp = dateStr ? new Date(dateStr).getTime() : 0;
    return { item, timestamp };
  });

  withDates.sort((a, b) => {
    if (a.timestamp === 0 && b.timestamp === 0) return 0;
    if (a.timestamp === 0) return 1;
    if (b.timestamp === 0) return -1;
    return b.timestamp - a.timestamp;
  });

  return withDates.map((x) => x.item);
}

export function SectionRail({
  title,
  section,
  icon: Icon,
  limit = 12,
  loading = false,
  shuffle = true,
}: SectionRailProps) {
  const items = useLibraryStore((s) => s.items);
  const setView = useNavStore((s) => s.setView);
  const { getDate, loaded: datesLoaded } = useYouTubeDates();

  const filtered = useMemo(() => {
    let sectionItems = items.filter((i) => i.section === section);

    // For videos/shorts/live: ONLY show YouTube-synced items (latest content).
    if (section === 'videos' || section === 'shorts' || section === 'live') {
      sectionItems = sectionItems.filter(isYouTubeSynced);
      // Sort by ACTUAL publish date from YouTube RSS.
      const sorted = sortByActualDate(sectionItems, getDate);
      return sorted.slice(0, limit);
    }

    // For other sections: interleave by sheikh.
    const ordered = shuffle ? sortByNewestWithDiversity(sectionItems) : sectionItems;
    return ordered.slice(0, limit);
  }, [items, section, limit, shuffle, getDate, datesLoaded]);

  // Show skeleton while loading.
  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            {Icon && <Icon className="size-5 text-primary" />}
            {title}
          </h2>
          <button
            onClick={() => setView(section)}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            عرض الكل
            <ChevronLeft className="size-3" />
          </button>
        </div>
        <MediaRailSkeleton />
      </section>
    );
  }

  // Hide the section entirely once data is loaded but this section is empty.
  if (filtered.length === 0) return null;

  // Use a 2-column grid on mobile so users can scroll the page vertically
  // (horizontal rails capture touch gestures and block vertical scroll on
  // touch devices). Switch to a horizontal rail on tablet+ where there's
  // more screen real estate and a mouse/trackpad is likely available.
  const isShorts = section === 'shorts';

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          {Icon && <Icon className="size-5 text-primary" />}
          {title}
        </h2>
        <button
          onClick={() => setView(section)}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          عرض الكل
          <ChevronLeft className="size-3" />
        </button>
      </div>

      {/* Mobile: 2-col grid (or 3-col for shorts) — allows vertical page scroll */}
      <div
        className={
          isShorts
            ? 'grid grid-cols-3 sm:hidden gap-2'
            : 'grid grid-cols-2 sm:hidden gap-3'
        }
      >
        {filtered.map((item) => (
          <MediaCard key={item.id} item={item} variant={isShorts ? 'short' : 'default'} />
        ))}
      </div>

      {/* Desktop: horizontal rail (mouse/trackpad can scroll both axes freely) */}
      <div
        className="hidden sm:flex gap-3 overflow-x-auto pb-2 no-scrollbar"
        style={{
          // Allow horizontal panning but let vertical gestures pass through
          // to the page (prevents the rail from trapping touch scroll on
          // hybrid devices like Surface).
          touchAction: 'pan-x',
          // Prevent scroll chaining: when the rail reaches its end, don't
          // continue scrolling the page underneath.
          overscrollBehaviorX: 'contain',
        }}
      >
        {filtered.map((item) => (
          <div key={item.id} className="w-56 sm:w-64 shrink-0">
            <MediaCard item={item} variant={isShorts ? 'short' : 'default'} />
          </div>
        ))}
      </div>
    </section>
  );
}
