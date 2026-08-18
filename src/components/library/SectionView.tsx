'use client';

import { MediaGrid } from '@/components/media/MediaGrid';
import { MediaCardSkeleton } from '@/components/media/MediaCardSkeleton';
import { useLibraryStore } from '@/stores/library.store';
import { FatwaLibraryView } from '@/components/fatwa/FatwaLibraryView';
import { useYouTubeDates } from '@/hooks/use-youtube-dates';
import type { MediaItem, SectionKind } from '@/lib/types';
import { PlayCircle, Zap, Radio, FileQuestion, BookOpen, FileText, History } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

const TITLES: Record<SectionKind, { ar: string; icon: typeof PlayCircle }> = {
  videos: { ar: 'الفيديوهات', icon: PlayCircle },
  shorts: { ar: 'شورتس', icon: Zap },
  live: { ar: 'البث المباشر', icon: Radio },
  radio: { ar: 'الإذاعات', icon: Radio },
  fatwa: { ar: 'الفتاوى', icon: FileQuestion },
  books: { ar: 'الكتب', icon: BookOpen },
  articles: { ar: 'المقالات', icon: FileText },
  main: { ar: 'المجموعات الرئيسية', icon: PlayCircle },
};



/**
 * Returns true if an item was sourced from a YouTube-channel sync file
 * (.videos.json, .shorts.json, .live.json). These files are auto-updated
 * by the Dart sync script from YouTube RSS feeds, so their items are in
 * newest-first order.
 *
 * Old main-collection files (1_*.json, 2_*.json, *_1.json) contain
 * historical content WITHOUT dates and should be EXCLUDED from the
 * "latest videos/shorts/live" views.
 */
function isYouTubeSynced(item: MediaItem): boolean {
  if (!item.sourceFile) return false;
  return /\.(videos|shorts|live)\.json$/i.test(item.sourceFile);
}

/**
 * Sort items: interleave by sheikh (round-robin) so the newest video from
 * each sheikh appears first, then the second-newest from each sheikh, etc.
 *
 * Within each sheikh's group, items are kept in their original insertion order
 * (which is the RSS feed order = newest first, since the Dart sync script
 * fetches from YouTube RSS and stores in that order).
 *
 * This produces a diverse "recent uploads" view where no single sheikh
 * dominates the top of the list.
 */
function sortByNewestWithDiversity(items: MediaItem[]): MediaItem[] {
  // Group by sheikh, preserving insertion order within each group.
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
 * Sort items by ACTUAL YouTube publish date (newest first).
 * Uses the dates fetched from YouTube RSS feeds via useYouTubeDates hook.
 *
 * Items WITHOUT a known date are placed at the END (after all dated items).
 * Within the same date, items keep their original insertion order (stable sort).
 */
function sortByActualDate(
  items: MediaItem[],
  getDate: (url: string) => string | undefined,
): MediaItem[] {
  // Build a list with dates attached.
  const withDates = items.map((item) => {
    const url = item.youtubeUrl || item.videoUrl || item.audioUrl || '';
    const dateStr = getDate(url);
    const timestamp = dateStr ? new Date(dateStr).getTime() : 0;
    return { item, timestamp };
  });

  // Sort by timestamp desc. Items without dates go to the end.
  withDates.sort((a, b) => {
    if (a.timestamp === 0 && b.timestamp === 0) return 0;
    if (a.timestamp === 0) return 1;
    if (b.timestamp === 0) return -1;
    return b.timestamp - a.timestamp;
  });

  return withDates.map((x) => x.item);
}

interface SectionViewProps {
  section: SectionKind;
}

export function SectionView({ section }: SectionViewProps) {
  const items = useLibraryStore((s) => s.items);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const { getDate } = useYouTubeDates();

  const filtered = useMemo(() => {
    let sectionItems = items.filter((i) => i.section === section);

    // For videos/shorts/live sections: ONLY show items from YouTube-synced files
    // (.videos.json, .shorts.json, .live.json). These are auto-updated from
    // YouTube RSS and contain the LATEST content.
    if (section === 'videos' || section === 'shorts' || section === 'live') {
      sectionItems = sectionItems.filter(isYouTubeSynced);
    }

    // For videos/shorts/live: sort by ACTUAL publish date from YouTube.
    // This gives a true chronological order (newest first) across all sheikhs.
    if (section === 'videos' || section === 'shorts' || section === 'live') {
      return sortByActualDate(sectionItems, getDate);
    }

    // For other sections: use interleave by sheikh.
    return sortByNewestWithDiversity(sectionItems);
  }, [items, section, getDate]);

  const meta = TITLES[section];
  const Icon = meta.icon;
  const isLoading = filtered.length === 0 && (syncing || !lastSync);

  // Fatwa-specific rendering
  if (section === 'fatwa') {
    return <FatwaLibraryView />;
  }

  // Live-specific rendering: split into "مباشر الآن" + "بثوث سابقة"
  if (section === 'live') {
    return <LiveSectionView />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon className="size-6 text-primary" />
          {meta.ar}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? 'جاري التحميل...' : `${filtered.length} عنصر`}
        </p>
      </div>
      {isLoading ? (
        <div className={
          section === 'shorts'
            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
            : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
        }>
          {Array.from({ length: 12 }).map((_, i) => <MediaCardSkeleton key={i} />)}
        </div>
      ) : (
        <MediaGrid items={filtered} variant={section === 'shorts' ? 'short' : 'default'} emptyMessage="لا يوجد محتوى في هذا القسم حاليًا" />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  LiveSectionView — splits live items into "مباشر الآن" + "بثوث سابقة"
//  Sorted by publishedAt desc (newest first).
// ════════════════════════════════════════════════════════════════

function LiveSectionView() {
  const items = useLibraryStore((s) => s.items);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const { getDate } = useYouTubeDates();

  const { liveNow, ended } = useMemo(() => {
    // Only show YouTube-synced live items (.live.json files).
    const liveItems = items.filter(
      (i) => i.section === 'live' && isYouTubeSynced(i),
    );
    // Split based on computed liveStatus (kept up-to-date by useLiveMonitor).
    const now: MediaItem[] = [];
    const past: MediaItem[] = [];
    for (const item of liveItems) {
      if (item.liveStatus === 'ended') past.push(item);
      else now.push(item); // 'now' or undefined (optimistic)
    }
    return {
      // Sort by ACTUAL YouTube publish date (newest first).
      liveNow: sortByActualDate(now, getDate),
      ended: sortByActualDate(past, getDate),
    };
  }, [items, getDate]);

  const isLoading = liveNow.length === 0 && ended.length === 0 && (syncing || !lastSync);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="size-6 text-primary" />
          البث المباشر
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading
            ? 'جاري التحميل...'
            : `${liveNow.length} بث مباشر الآن · ${ended.length} بث سابق`}
        </p>
      </div>

      {/* Live now subsection */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
          </span>
          <h2 className="text-lg font-bold">مباشر الآن</h2>
          {liveNow.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{liveNow.length}</Badge>
          )}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MediaCardSkeleton key={i} />)}
          </div>
        ) : liveNow.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <Radio className="size-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد بثوث مباشرة حاليًا</p>
            <p className="text-xs mt-1 opacity-70">قد تبدأ البثوث القادمة قريبًا — تابع هذا القسم</p>
          </div>
        ) : (
          <MediaGrid items={liveNow} emptyMessage="لا توجد بثوث مباشرة حاليًا" />
        )}
      </section>

      {/* Past broadcasts subsection */}
      {ended.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-t border-border pt-6">
            <History className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-bold">بثوث سابقة</h2>
            <Badge variant="secondary" className="text-[10px]">{ended.length}</Badge>
          </div>
          <MediaGrid items={ended} emptyMessage="لا توجد بثوث سابقة" />
        </section>
      )}
    </div>
  );
}
