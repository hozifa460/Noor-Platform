'use client';

import { HeroCarousel } from './HeroCarousel';
import { LiveStats } from './LiveStats';
import { ContinueWatching } from './ContinueWatching';
import { SheikhGrid } from './SheikhGrid';
import { SectionRail } from './SectionRail';
import { useLibraryStore } from '@/stores/library.store';
import { PlayCircle, Zap, Radio, FileQuestion, BookOpen, FileText } from 'lucide-react';
import type { SectionKind } from '@/lib/types';

/**
 * Home page — renders each section independently with progressive loading.
 * Layout: Hero carousel → Live stats → Continue watching → Sheikhs → Section rails.
 */
export function HomeView() {
  const items = useLibraryStore((s) => s.items);
  const sheikhsArray = useLibraryStore((s) => s.sheikhsArray);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);

  const isSectionLoading = (section: SectionKind): boolean => {
    const hasItems = items.some((i) => i.section === section);
    return !hasItems && (syncing || !lastSync);
  };

  const sheikhsLoading = sheikhsArray.length === 0 && (syncing || !lastSync);

  return (
    <div className="space-y-6">
      {/* Hero carousel — appears as soon as we have any items */}
      <HeroCarousel />

      {/* Animated stats counter */}
      <LiveStats />

      {/* Continue watching (only renders if there are sessions) */}
      <ContinueWatching />

      {/* Sheikh grid — shows skeletons while loading */}
      <SheikhGrid loading={sheikhsLoading} />

      {/* Each section rail renders independently */}
      <SectionRail title="الفيديوهات" section="videos" icon={PlayCircle} loading={isSectionLoading('videos')} />
      <SectionRail title="شورتس" section="shorts" icon={Zap} loading={isSectionLoading('shorts')} />
      <SectionRail title="البث المباشر" section="live" icon={Radio} loading={isSectionLoading('live')} />
      <SectionRail title="الفتاوى" section="fatwa" icon={FileQuestion} loading={isSectionLoading('fatwa')} />
      <SectionRail title="الكتب" section="books" icon={BookOpen} loading={isSectionLoading('books')} />
      <SectionRail title="المقالات" section="articles" icon={FileText} loading={isSectionLoading('articles')} />
      <SectionRail title="الإذاعات" section="radio" icon={Radio} loading={isSectionLoading('radio')} />
    </div>
  );
}
