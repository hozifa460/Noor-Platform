'use client';

import { useEffect, useState, useMemo } from 'react';
import { FileQuestion, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFatwaStore } from '@/stores/fatwa-store';
import { usePlayerStore } from '@/stores/player-store';
import { useFatwaAnswers } from '@/hooks/use-fatwa-answers';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useIdClipboard } from '@/hooks/use-clipboard';
import { FatwaHeroBanner } from './FatwaHeroBanner';
import { FatwaFilterBar } from './FatwaFilterBar';
import { FatwaCard } from './FatwaCard';
import { scholarFilterQuery } from '@/lib/fatwa';
import { normalizeArabic } from '@/lib/arabic';
import type { MediaItem } from '@/lib/types';


export function FatwaLibraryView() {
  const searching = useFatwaStore((s) => s.searching);
  const fatwas = useFatwaStore((s) => s.fatwas);
  const searchResults = useFatwaStore((s) => s.searchResults);
  const browseItems = useFatwaStore((s) => s.browseItems);
  const selectedCategory = useFatwaStore((s) => s.selectedCategory);
  const selectedScholar = useFatwaStore((s) => s.selectedScholar);
  const searchQuery = useFatwaStore((s) => s.searchQuery);

  const startLoading = useFatwaStore((s) => s.startLoading);
  const setSelectedCategory = useFatwaStore((s) => s.setSelectedCategory);
  const setSelectedScholar = useFatwaStore((s) => s.setSelectedScholar);
  const setSearchQuery = useFatwaStore((s) => s.setSearchQuery);

  const openPlayer = usePlayerStore((s) => s.open);

  const [visibleCount, setVisibleCount] = useState(30);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { copiedId, copy: copyFatwa } = useIdClipboard<string>();

  const {
    localSearch,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
  } = useDebouncedSearch({
    value: searchQuery,
    onSearchChange: setSearchQuery,
    delay: 300,
    onResetPagination: () => setVisibleCount(30),
  });

  useEffect(() => {
    startLoading();
  }, [startLoading]);


  // Determine active item list
  const activeList = useMemo(() => {
    let list: MediaItem[];
    if (searchQuery.trim()) {
      list = searchResults;
    } else if (selectedCategory !== 'all') {
      list = browseItems;
    } else {
      list = fatwas;
    }

    if (selectedScholar !== 'all') {
      const sQuery = scholarFilterQuery(selectedScholar);
      list = list.filter((item) => {
        const normName = normalizeArabic(item.sheikhName || '');
        const normScholar = normalizeArabic(selectedScholar);
        return normName.includes(normScholar) || (Boolean(sQuery) && normName.includes(sQuery));
      });
    }

    return list;
  }, [searchQuery, searchResults, selectedCategory, browseItems, fatwas, selectedScholar]);

  // Visible items slice
  const visibleItems = useMemo(() => {
    return activeList.slice(0, visibleCount);
  }, [activeList, visibleCount]);

  // Hydrate answers using custom hook
  const { contentMap } = useFatwaAnswers(expandedId);

  const handleCopyFatwa = (item: MediaItem, question: string, answer: string) => {
    const text = `سؤال: ${question}\n\nالجواب: ${answer}\n\nالمصدر: ${item.sheikhName || 'فتوى معتمدة'} - منصة نور`;
    copyFatwa(item.id, text, 'تم نسخ الفتوى والجواب بنجاح');
  };


  const handleListenAudio = (item: MediaItem) => {
    openPlayer(item);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Hero Banner */}
      <FatwaHeroBanner />

      {/* Filter and Search Bar */}
      <FatwaFilterBar
        localSearch={localSearch}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setVisibleCount(30);
        }}
        selectedScholar={selectedScholar}
        onSelectScholar={(id) => {
          setSelectedScholar(id);
          setVisibleCount(30);
        }}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {searchQuery ? (
            <>
              نتائج البحث عن «<strong>{searchQuery}</strong>»: {activeList.length.toLocaleString('ar-SA')} فتوى
            </>
          ) : (
            <>إجمالي الفتاوى المعروضة: {activeList.length.toLocaleString('ar-SA')} فتوى</>
          )}
        </span>

        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="text-primary hover:underline font-bold cursor-pointer"
          >
            مسح البحث
          </button>
        )}
      </div>

      {/* Loading state */}
      {searching && (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">جاري البحث في الفهارس الفقهية...</p>
        </div>
      )}

      {/* Cards List */}
      {!searching && visibleItems.length > 0 ? (
        <div className="space-y-4">
          {visibleItems.map((fatwa) => (
            <FatwaCard
              key={fatwa.id}
              fatwa={fatwa}
              searchQuery={searchQuery}
              isExpanded={expandedId === fatwa.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === fatwa.id ? null : fatwa.id))
              }
              isCopied={copiedId === fatwa.id}
              onCopy={handleCopyFatwa}
              onListen={handleListenAudio}
              content={contentMap.get(fatwa.id)}
            />
          ))}

          {/* Load More Button */}
          {visibleCount < activeList.length && (
            <div className="pt-6 text-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 30)}
                className="rounded-2xl px-8 font-bold text-xs shadow-xs bg-card hover:bg-muted"
              >
                <span>عرض المزيد ({activeList.length - visibleCount} فتوى متبقية)</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        !searching && (
          <div className="py-24 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
            <FileQuestion className="size-10 mx-auto text-muted-foreground/40" />
            <h4 className="font-bold text-base text-foreground">لم نعثر على فتاوى مطابقة</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              جرب تغيير الكلمات المفتاحية أو اختيار عالم آخر أو إعادة ضبط التصنيف.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  handleClearSearch();
                  setSelectedCategory('all');
                  setSelectedScholar('all');
                }}
                className="rounded-xl text-xs"
              >
                إعادة ضبط الفلاتر
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
