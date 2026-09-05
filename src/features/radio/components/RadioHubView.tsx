'use client';

import { useState, useMemo } from 'react';
import { Search, Volume2 } from 'lucide-react';
import { useLibraryStore } from '@/stores/library-store';
import { MediaCardSkeleton } from '@/components/media/MediaCardSkeleton';
import { Input } from '@/components/ui/input';
import { RadioHeroBanner } from './RadioHeroBanner';
import { FeaturedStationsRibbon } from './FeaturedStationsRibbon';
import { RadioCategoryTabs } from './RadioCategoryTabs';
import { IslamicRadioCard } from './IslamicRadioCard';
import {
  categorizeRadioStations,
  filterRadioStations,
  getFeaturedRadios,
} from '../engines/stream-engine';
import type { RadioCategory } from '../types';

export function RadioHubView() {
  const [selectedCategory, setSelectedCategory] = useState<RadioCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const items = useLibraryStore((s) => s.items);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);

  // All radio items from library store
  const allRadioItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.section === 'radio' ||
        item.mediaType === 'audio' ||
        (item.tags && item.tags.includes('إذاعة'))
    );
  }, [items]);

  // Categorize stations using dedicated engine
  const categorized = useMemo(
    () => categorizeRadioStations(allRadioItems),
    [allRadioItems]
  );

  // Filtered by Tab & Search using dedicated engine
  const filteredRadios = useMemo(
    () =>
      filterRadioStations(
        allRadioItems,
        categorized,
        selectedCategory,
        searchQuery
      ),
    [allRadioItems, categorized, selectedCategory, searchQuery]
  );

  const isLoading = allRadioItems.length === 0 && (syncing || !lastSync);

  // Featured Radios for Top Ribbon using dedicated engine
  const featuredRadios = useMemo(
    () => getFeaturedRadios(allRadioItems, 8),
    [allRadioItems]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Hero Banner */}
      <RadioHeroBanner totalStations={allRadioItems.length} />

      {/* Featured Stations Horizontal Ribbon */}
      {!searchQuery && <FeaturedStationsRibbon featuredRadios={featuredRadios} />}

      {/* Search & Filter Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <RadioCategoryTabs
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم القارئ أو الإذاعة..."
              className="pr-10 h-11 rounded-2xl bg-card border-border/80 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Count indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {searchQuery ? (
              <>نتائج البحث: {filteredRadios.length} إذاعة</>
            ) : (
              <>المعروض: {filteredRadios.length} إذاعة إسلامية</>
            )}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              مسح البحث
            </button>
          )}
        </div>
      </div>

      {/* Grid of Radios */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRadios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredRadios.map((radio) => (
            <IslamicRadioCard key={radio.id} radio={radio} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
          <Volume2 className="size-10 mx-auto text-muted-foreground/40" />
          <h4 className="font-bold text-base text-foreground">لم نعثر على إذاعات مطابقة</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            جرب البحث باسم قارئ آخر أو التبديل لقسم كافة الإذاعات.
          </p>
        </div>
      )}
    </div>
  );
}
