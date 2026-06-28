'use client';

import { MediaGrid } from '@/components/media/MediaGrid';
import { FatwaCard } from '@/components/media/FatwaCard';
import { MediaCardSkeleton } from '@/components/media/MediaCardSkeleton';
import { useLibraryStore } from '@/stores/library.store';
import { useFatwaStore } from '@/stores/fatwa-store';
import type { MediaItem, SectionKind } from '@/lib/types';
import { PlayCircle, Zap, Radio, FileQuestion, BookOpen, FileText, Loader2, Search, History } from 'lucide-react';
import { useMemo, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
 * Sort items by publishedAt (newest first). Falls back to insertion order for
 * items without publishedAt. Items WITHOUT publishedAt are placed at the END
 * (after all dated items) so the freshest content is always at the top.
 */
function sortByNewest(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Returns true if an item was sourced from a YouTube-channel sheikh.
 *
 * Heuristic: the auto-sync Dart script writes `<sheikh>.videos.json`,
 * `<sheikh>.shorts.json`, and `<sheikh>.live.json` for sheikhs with YouTube
 * channels. Main-collection files (`1_*.json`, `*_1.json`) come from the
 * `radio_islam` GitLab repo and are NOT YouTube-synced.
 */
function isYouTubeSourced(item: MediaItem): boolean {
  if (!item.sourceFile) return false;
  return /\.(videos|shorts|live)\.json$/i.test(item.sourceFile);
}

/**
 * Round-robin interleave: takes one item from each sheikh in turn so no
 * single sheikh dominates the visible window.
 */
function interleaveBySheikh(items: MediaItem[]): MediaItem[] {
  const groups = new Map<string, MediaItem[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = item.sheikhId || 'unknown';
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
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
 * Sort + diversify strategy:
 *   1. Split items into YouTube-sourced (auto-synced from channels) and others.
 *   2. Within each group: sort by publishedAt desc (newest first).
 *   3. Within each group: interleave by sheikh for diversity (round-robin).
 *   4. Concatenate: YouTube group first, then other group.
 *
 * This puts the freshest channel content at the top while ensuring diversity
 * across sheikhs — no single sheikh dominates the visible window.
 */
function sortAndDiversify(items: MediaItem[]): MediaItem[] {
  const youTube = items.filter(isYouTubeSourced);
  const others = items.filter((i) => !isYouTubeSourced(i));
  youTube.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
  others.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
  return [...interleaveBySheikh(youTube), ...interleaveBySheikh(others)];
}

interface SectionViewProps {
  section: SectionKind;
}

export function SectionView({ section }: SectionViewProps) {
  const items = useLibraryStore((s) => s.items);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);

  const filtered = useMemo(() => {
    const sectionItems = items.filter((i) => i.section === section);
    // YouTube-sourced videos first (newest), then others, with interleave
    // across sheikhs for diversity in each group.
    return sortAndDiversify(sectionItems);
  }, [items, section]);

  const meta = TITLES[section];
  const Icon = meta.icon;
  const isLoading = filtered.length === 0 && (syncing || !lastSync);

  // Fatwa-specific rendering
  if (section === 'fatwa') {
    return <FatwaSectionView />;
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
//  FatwaSectionView — lazy loading with pagination + search.
// ════════════════════════════════════════════════════════════════

function FatwaSectionView() {
  const fatwaStore = useFatwaStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadTriggered = useRef(false);

  // Start progressive loading on mount
  useEffect(() => {
    if (loadTriggered.current) return;
    loadTriggered.current = true;
    fatwaStore.startLoading();
  }, [fatwaStore]);

  // Infinite scroll for browsing
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !searchQuery) {
          fatwaStore.showMore();
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fatwaStore, searchQuery]);

  // Infinite scroll for search results
  useEffect(() => {
    const el = searchSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && searchQuery) {
          fatwaStore.showMoreSearch();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fatwaStore, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    setSearchQuery(q);
    fatwaStore.search(q);
  };

  const visibleFatwas = searchQuery
    ? fatwaStore.searchResults.slice(0, fatwaStore.searchVisibleCount)
    : fatwaStore.fatwas.slice(0, fatwaStore.visibleCount);

  const totalShown = visibleFatwas.length;
  const totalAvailable = searchQuery ? fatwaStore.searchResults.length : fatwaStore.fatwas.length;
  const hasMore = searchQuery
    ? fatwaStore.searchVisibleCount < fatwaStore.searchResults.length
    : fatwaStore.visibleCount < fatwaStore.fatwas.length || !fatwaStore.allLoaded;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileQuestion className="size-6 text-primary" />
          الفتاوى
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {fatwaStore.loading && 'جاري تحميل الفتاوى...'}
          {!fatwaStore.loading && !fatwaStore.allLoaded && `${fatwaStore.fatwas.length} فتوى محمّلة · جاري تحميل المزيد`}
          {fatwaStore.allLoaded && `${fatwaStore.fatwas.length} فتوى`}
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative max-w-xl">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث في الفتاوى عن سؤالك..."
          className="pr-10 h-11"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8"
            onClick={() => { setSearchQuery(''); setSearchInput(''); fatwaStore.clearSearch(); }}
          >
            مسح
          </Button>
        )}
      </form>

      {/* Search results info */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          {fatwaStore.searching ? 'جاري البحث...' : `${fatwaStore.searchResults.length} نتيجة لـ «${searchQuery}»`}
        </div>
      )}

      {/* Fatwa cards */}
      {visibleFatwas.length === 0 && !fatwaStore.loading ? (
        <div className="py-20 text-center text-muted-foreground">
          {searchQuery ? 'لا توجد نتائج. جاري تحميل المزيد من الفتاوى...' : 'جاري تحميل الفتاوى...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFatwas.map((item) => (
            <FatwaCard key={item.id} item={item} />
          ))}
          {/* Loading skeleton while fetching more */}
          {fatwaStore.loading && !searchQuery && (
            <div className="col-span-full flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">جاري تحميل المزيد من الفتاوى...</span>
            </div>
          )}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={searchQuery ? searchSentinelRef : sentinelRef} className="py-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {/* Progress indicator */}
      {!fatwaStore.allLoaded && !searchQuery && (
        <div className="fixed bottom-4 left-4 z-30 bg-card border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-xs">
          <Loader2 className={`size-3 ${fatwaStore.loading ? 'animate-spin' : ''} text-primary`} />
          <span>{fatwaStore.fatwas.length} فتوى · {fatwaStore.loadedFiles.size} ملف</span>
        </div>
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

  const { liveNow, ended } = useMemo(() => {
    const liveItems = items.filter((i) => i.section === 'live');
    // Split based on computed liveStatus (kept up-to-date by useLiveMonitor).
    const now: MediaItem[] = [];
    const past: MediaItem[] = [];
    for (const item of liveItems) {
      if (item.liveStatus === 'ended') past.push(item);
      else now.push(item); // 'now' or undefined (optimistic)
    }
    return {
      liveNow: sortByNewest(now),
      ended: sortByNewest(past),
    };
  }, [items]);

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
