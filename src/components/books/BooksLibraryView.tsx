'use client';

import { useState, useEffect } from 'react';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import {
  BookOpen,
  Sparkles,
  Layers,
  Scroll,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBooksStore, BOOK_CATEGORIES } from '@/stores/books-store';
import { usePlayerStore } from '@/stores/player-store';
import { BookCard } from './BookCard';
import { FeaturedClassicsRibbon } from './FeaturedClassicsRibbon';
import { BooksFilterToolbar } from './BooksFilterToolbar';
import type { MediaItem } from '@/lib/types';
import type { FeaturedClassic } from '@/lib/books';

export function BooksLibraryView() {
  const books = useBooksStore((s) => s.books);
  const loading = useBooksStore((s) => s.loading);
  const selectedCategory = useBooksStore((s) => s.selectedCategory);
  const selectedLanguage = useBooksStore((s) => s.selectedLanguage);
  const searchQuery = useBooksStore((s) => s.searchQuery);
  const viewMode = useBooksStore((s) => s.viewMode);

  const startLoading = useBooksStore((s) => s.startLoading);
  const setSelectedCategory = useBooksStore((s) => s.setSelectedCategory);
  const setSelectedLanguage = useBooksStore((s) => s.setSelectedLanguage);
  const setSearchQuery = useBooksStore((s) => s.setSearchQuery);
  const setViewMode = useBooksStore((s) => s.setViewMode);
  const getFilteredBooks = useBooksStore((s) => s.getFilteredBooks);

  const openPlayer = usePlayerStore((s) => s.open);

  const [visibleCount, setVisibleCount] = useState(30);

  const {
    localSearch,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
  } = useDebouncedSearch({
    value: searchQuery,
    onSearchChange: setSearchQuery,
    delay: 250,
  });

  useEffect(() => {
    startLoading();
  }, [startLoading]);

  const filteredBooks = getFilteredBooks();

  // Reset pagination on filter change
  const filterKey = `${searchQuery}-${selectedCategory}-${selectedLanguage}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(30);
  }



  const handleOpenFeatured = (fc: FeaturedClassic) => {
    const quranId = (fc as unknown as { quranId?: string }).quranId;
    if (quranId) {
      const quranItem: MediaItem = {
        id: `mushaf-${quranId}`,
        title: fc.title,
        sheikhName: fc.author,
        section: 'books',
        islamicArt: 'quran',
        description: fc.description,
        language: 'ar',
        tags: ['مصحف', 'قرآن كريم', 'quran', 'قراءات'],
      };
      openPlayer(quranItem);
      return;
    }

    const existing = books.find(
      (b) =>
        b.id === fc.id ||
        (fc.shamelaId &&
          (b as unknown as Record<string, unknown>).shamelaId === fc.shamelaId)
    );
    if (existing) {
      openPlayer(existing);
      return;
    }

    const virtualItem: MediaItem = {
      id: fc.id,
      title: fc.title,
      sheikhName: fc.author,
      section: 'books',
      islamicArt: fc.artTag,
      description: fc.description,
      language: 'ar',
      mediaType: 'shamela_archive',
      tags: ['شاملة', 'تراث', fc.discipline, 'أمهات الكتب'],
    };
    openPlayer(virtualItem);
  };

  const currentCategoryInfo = BOOK_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Deluxe Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-amber-500/20 bg-gradient-to-r from-emerald-950 via-teal-950 to-amber-950 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
            <Sparkles className="size-3.5 text-amber-400" />
            المكتبة الإسلامية الكبرى الشاملة
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 text-amber-100">
            مكتبة نور للكتب والمصاحف والتراث
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed mb-6 max-w-2xl">
            أكثر من <strong className="text-amber-300 font-bold">8,589 مصنفاً محققاً وموافقاً للمطبوع</strong> من أمهات كتب التراث الإسلامي في العقيدة والحديث والفقه والتفسير واللغة والتاريخ.
          </p>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
              <BookOpen className="size-4 text-amber-400" />
              <span>
                <strong className="text-white font-bold">{books.length.toLocaleString('ar-SA')}</strong> كتاب ومصحف متاح
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
              <Layers className="size-4 text-emerald-400" />
              <span>
                <strong className="text-white font-bold">40</strong> علماً وفناً شرعياً ولغوياً
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
              <Scroll className="size-4 text-amber-400" />
              <span>
                <strong className="text-white font-bold">18</strong> رواية وقراءة متواترة
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
              <Globe className="size-4 text-teal-400" />
              <span>
                <strong className="text-white font-bold">12</strong> لغة عالمية
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Classics Ribbon */}
      {!searchQuery && (
        <FeaturedClassicsRibbon onOpenFeatured={handleOpenFeatured} />
      )}

      {/* Search & Intent Filter Toolbar */}
      <BooksFilterToolbar
        localSearch={localSearch}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* Books Content Section */}
      <section className="space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {searchQuery ? (
              <>
                نتائج البحث عن «<strong>{searchQuery}</strong>»: {filteredBooks.length.toLocaleString('ar-SA')} كتاب
              </>
            ) : (
              <>
                قسم {currentCategoryInfo?.name || 'جميع الكتب'}: {filteredBooks.length.toLocaleString('ar-SA')} كتاب
              </>
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

        {/* Loading Indicator */}
        {loading && books.length === 0 && (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="size-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">
              جاري تحميل وتجهيز فهارس المكتبة الرقمية...
            </p>
          </div>
        )}

        {/* Books Grid / List */}
        {filteredBooks.length > 0 ? (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'
                  : 'space-y-3'
              }
            >
              {filteredBooks.slice(0, visibleCount).map((book) => (
                <BookCard key={book.id} book={book} viewMode={viewMode} />
              ))}
            </div>

            {visibleCount < filteredBooks.length && (
              <div className="pt-8 text-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                  className="rounded-2xl px-8 font-bold text-xs gap-2 shadow-xs bg-card hover:bg-muted"
                >
                  <span>عرض المزيد ({filteredBooks.length - visibleCount} كتاب متبقٍ)</span>
                </Button>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div className="py-24 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
              <BookOpen className="size-10 mx-auto text-muted-foreground/40" />
              <h4 className="font-bold text-base text-foreground">لم نعثر على كتب مطابقة</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                جرب تغيير خيارات الفلتر أو البحث بكلمات أخرى.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleClearSearch();
                    setSelectedCategory('all');
                    setSelectedLanguage('all');
                  }}
                  className="rounded-xl text-xs"
                >
                  إعادة ضبط الفلاتر
                </Button>
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}
