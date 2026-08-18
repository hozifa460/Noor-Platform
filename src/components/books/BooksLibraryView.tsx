'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  X,
  LayoutGrid,
  List,
  Sparkles,
  Globe,
  Scroll,
  Layers,
  Flame,
  ChevronLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookCard } from './BookCard';
import {
  useBooksStore,
  BOOK_CATEGORIES,
  BOOK_LANGUAGES,
} from '@/stores/books-store';
import { FEATURED_ISLAMIC_CLASSICS, type FeaturedClassic } from '@/lib/featured-books';
import { usePlayerStore } from '@/stores/player.store';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

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

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [visibleCount, setVisibleCount] = useState(36);

  useEffect(() => {
    startLoading();
  }, [startLoading]);

  // Debounce search query update to store (120ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch.trim());
    }, 120);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Reset pagination on filter change (standard React pattern)
  const [prevFilter, setPrevFilter] = useState({ selectedCategory, selectedLanguage, searchQuery });
  if (
    prevFilter.selectedCategory !== selectedCategory ||
    prevFilter.selectedLanguage !== selectedLanguage ||
    prevFilter.searchQuery !== searchQuery
  ) {
    setPrevFilter({ selectedCategory, selectedLanguage, searchQuery });
    setVisibleCount(36);
  }

  const filteredBooks = useMemo(
    () => getFilteredBooks(),
    [books, selectedCategory, selectedLanguage, searchQuery, getFilteredBooks],
  );
  const displayedBooks = filteredBooks.slice(0, visibleCount);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch.trim());
  };

  const handleOpenFeatured = (fc: FeaturedClassic) => {
    // 1. Quran Mushaf Featured Item
    if (fc.artTag === 'quran' || fc.id.startsWith('quran-')) {
      const existing = books.find((b) => b.id === fc.id);
      if (existing) {
        openPlayer(existing);
        return;
      }
      const quranItem: MediaItem = {
        id: fc.id,
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

    // 2. Classical Heritage Book Item
    const existing = books.find((b) => b.id === fc.id || (fc.shamelaId && (b as any).shamelaId === fc.shamelaId));
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
            أكثر من <strong className="text-amber-300 font-bold">8,589 مصنفاً محققاً وموافقاً للمطبوع</strong> من أمهات كتب التراث الإسلامي في العقيدة والحديث والفقه والتفسير واللغة والتاريخ، مع نصوص حية فائقة الدقة وفهارس شجرية وعزل الحواشي.
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

      {/* ─── Featured Classics Ribbon (أمهات الكتب الكبرى) ───────────── */}
      {!searchQuery && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-500">
                <Flame className="size-4 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <span>أمهات كتب التراث الكبرى</span>
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    روائع مختارة
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">أوثق وأجل أمهات المصنفات الإسلامية المحققة موافقة للمطبوع</p>
              </div>
            </div>
          </div>

          <div className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory">
            {FEATURED_ISLAMIC_CLASSICS.map((fc) => (
              <div
                key={fc.id}
                onClick={() => handleOpenFeatured(fc)}
                className="group relative w-64 sm:w-72 shrink-0 snap-start p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-card/90 to-card hover:border-amber-500/50 transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between text-[11px] mb-2.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <span>{fc.icon}</span>
                      <span>{fc.discipline}</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {fc.volumes} {fc.volumes > 1 ? 'مجلدات' : 'مجلد'}
                    </Badge>
                  </div>

                  {/* Title & Author */}
                  <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1 leading-snug">
                    {fc.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
                    <span className="line-clamp-1 font-medium">{fc.author}</span>
                    <span className="text-[10px] opacity-75 shrink-0">({fc.authorDeath})</span>
                  </div>

                  {/* Summary */}
                  <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                    {fc.description}
                  </p>
                </div>

                {/* Open Button */}
                <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold group-hover:underline flex items-center gap-1">
                    قراءة فورية
                    <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
                  </span>
                  <span className="text-[10px] opacity-60 font-mono">موافق للمطبوع</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Search & Intent Filter Toolbar ─────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/70 p-4 sm:p-5 rounded-3xl border border-border/80 backdrop-blur-md shadow-sm">
        {/* Smart Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-amber-500/70" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="ابحث باسم الكتاب، المؤلف (ابن تيمية، النووي)، اللقب (المغني، زاد المعاد)، أو الموضوع..."
            className="pr-12 pl-10 h-12 text-sm bg-background/90 rounded-2xl border-border/80 focus:border-amber-500 transition-all shadow-inner"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                setSearchQuery('');
              }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        {/* Language Selector & View Toggle */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {BOOK_LANGUAGES.slice(0, 5).map((lang) => {
              const active = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border',
                    active
                      ? 'bg-secondary text-secondary-foreground border-secondary font-bold shadow-sm'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border/50'
                  )}
                >
                  {lang.flag} {lang.name}
                </button>
              );
            })}
          </div>

          {/* Grid/List View Toggles */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border shrink-0">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="size-8 rounded-xl"
              onClick={() => setViewMode('grid')}
              aria-label="عرض شبكي"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="size-8 rounded-xl"
              onClick={() => setViewMode('list')}
              aria-label="عرض قائمة"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {BOOK_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 border',
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/80'
              )}
            >
              <span className="text-base">{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Category Info Header & Count */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span>{currentCategoryInfo?.emoji || '📚'}</span>
            {searchQuery ? `نتائج البحث الذكي عن: «${searchQuery}»` : currentCategoryInfo?.name || 'جميع الكتب والمصاحف'}
            <span className="text-sm font-normal text-muted-foreground">({filteredBooks.length.toLocaleString('ar-SA')} كتاب)</span>
          </h2>
          {currentCategoryInfo?.description && !searchQuery && (
            <p className="text-xs text-muted-foreground mt-0.5">{currentCategoryInfo.description}</p>
          )}
        </div>

        {loading && (
          <Badge variant="outline" className="animate-pulse gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-emerald-500" />
            جاري مزامنة الكتب...
          </Badge>
        )}
      </div>

      {/* ─── Books Content Grid / List ──────────────────────────────── */}
      {displayedBooks.length > 0 ? (
        <div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {displayedBooks.map((book) => (
                <BookCard key={book.id} book={book} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBooks.map((book) => (
                <BookCard key={book.id} book={book} viewMode="list" />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredBooks.length && (
            <div className="text-center pt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setVisibleCount((v) => v + 36)}
                className="px-8 rounded-2xl gap-2 font-bold shadow-sm"
              >
                <BookOpen className="size-4" />
                عرض المزيد من الكتب ({filteredBooks.length - visibleCount} كتاب متبقي)
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-card/30">
          <BookOpen className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-bold text-lg text-foreground mb-1">لا توجد كتب مطابقة لبحثك</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            جرب البحث باسم المؤلف (مثل: ابن تيمية، النووي) أو اسم الكتاب (مثل: المغني، زاد المعاد).
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedLanguage('all');
              setSearchQuery('');
              setLocalSearch('');
            }}
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      )}
    </div>
  );
}
