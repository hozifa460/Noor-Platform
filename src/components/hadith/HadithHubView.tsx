'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  Scroll,
  X,
  Library,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HADITH_BOOKS_LIST } from '@/lib/hadith-data';
import { useHadithStore } from '@/stores/hadith-store';
import { HadithCard } from './HadithCard';
import { HadithDetailModal } from './HadithDetailModal';
import { FakeHadithChecker } from './FakeHadithChecker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BOOK_CATEGORIES = [
  { id: 'all', name: 'جميع الدواوين (17 كتاباً)' },
  { id: 'sahih', name: 'الصحيحان' },
  { id: 'sunan', name: 'السنن الأربعة' },
  { id: 'jawami', name: 'الجوامع والمسانيد' },
  { id: 'akhlak', name: 'الآداب والأخلاق' },
  { id: 'forties', name: 'الأربعينيات' },
];

export function HadithHubView() {
  const activeBook = useHadithStore((s) => s.activeBook);
  const bookData = useHadithStore((s) => s.bookData);
  const selectedChapterId = useHadithStore((s) => s.selectedChapterId);
  const searchQuery = useHadithStore((s) => s.searchQuery);
  const categoryFilter = useHadithStore((s) => s.categoryFilter);
  const searchMode = useHadithStore((s) => s.searchMode);
  const loadingBook = useHadithStore((s) => s.loadingBook);
  const searchingGlobal = useHadithStore((s) => s.searchingGlobal);
  const globalResults = useHadithStore((s) => s.globalResults);

  const selectedHadith = useHadithStore((s) => s.selectedHadith);
  const selectedHadithBook = useHadithStore((s) => s.selectedHadithBook);
  const selectedHadithChapter = useHadithStore((s) => s.selectedHadithChapter);
  const hadithSharh = useHadithStore((s) => s.hadithSharh);
  const loadingSharh = useHadithStore((s) => s.loadingSharh);

  const setActiveBook = useHadithStore((s) => s.setActiveBook);
  const setSelectedChapterId = useHadithStore((s) => s.setSelectedChapterId);
  const setSearchQuery = useHadithStore((s) => s.setSearchQuery);
  const setCategoryFilter = useHadithStore((s) => s.setCategoryFilter);
  const setSearchMode = useHadithStore((s) => s.setSearchMode);
  const openHadithDetail = useHadithStore((s) => s.openHadithDetail);
  const closeHadithDetail = useHadithStore((s) => s.closeHadithDetail);
  const loadBookData = useHadithStore((s) => s.loadBookData);
  const getFilteredHadiths = useHadithStore((s) => s.getFilteredHadiths);

  const [bookDrawerOpen, setBookDrawerOpen] = useState(false);
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [hubTab, setHubTab] = useState<'books' | 'checker'>('books');

  // Local responsive search input to guarantee 60fps typing without debounce lag
  const [localInput, setLocalInput] = useState(searchQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local input with store search query
  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  const handleInputChange = (val: string) => {
    setLocalInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 200);
  };

  const handleClearSearch = () => {
    setLocalInput('');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchQuery('');
  };

  // Load active book on mount
  useEffect(() => {
    loadBookData(activeBook.fileName);
  }, [activeBook.fileName, loadBookData]);

  // Reset pagination when search or chapter changes
  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, selectedChapterId, activeBook.id, searchMode]);

  const filteredBooksList = useMemo(() => {
    if (categoryFilter === 'all') return HADITH_BOOKS_LIST;
    if (categoryFilter === 'jawami') {
      return HADITH_BOOKS_LIST.filter((b) => b.category === 'jawami' || b.category === 'masanid');
    }
    return HADITH_BOOKS_LIST.filter((b) => b.category === categoryFilter);
  }, [categoryFilter]);

  const inBookHadiths = getFilteredHadiths();
  const currentChapter = useMemo(() => {
    if (!bookData || selectedChapterId === 'all') return undefined;
    return bookData.chapters.find((c) => c.id === selectedChapterId);
  }, [bookData, selectedChapterId]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 max-w-7xl mx-auto">
          {/* Right: Book Trigger & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookDrawerOpen(true)}
              className="gap-2 font-bold text-xs sm:text-sm rounded-2xl bg-card hover:bg-muted border-border shadow-sm h-10 px-3 sm:px-4"
            >
              <Library className="size-4 text-primary" />
              <span className="font-bold">{activeBook.nameAr}</span>
              <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                {activeBook.hadithCount.toLocaleString('ar-EG')} حديث
              </Badge>
            </Button>

            {/* Chapter Selector Button (In-book mode) */}
            {searchMode === 'in-book' && bookData && bookData.chapters && bookData.chapters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChapterDrawerOpen(true)}
                className="gap-1.5 font-bold text-xs rounded-2xl bg-card hover:bg-muted border-border shadow-sm h-10 px-3 max-w-[180px] sm:max-w-[240px] truncate"
              >
                <Scroll className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {selectedChapterId === 'all'
                    ? 'جميع الأبواب'
                    : currentChapter?.arabic || `كتاب ${selectedChapterId}`}
                </span>
              </Button>
            )}
          </div>

          {/* Search Bar & Scope Switcher with Debounce */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={localInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={
                  searchMode === 'global'
                    ? 'بحث شامل في دواوين السنة الـ 17...'
                    : `ابحث داخل ${activeBook.nameAr}...`
                }
                className="pr-10 pl-28 h-10 rounded-2xl bg-card border-border text-xs focus:ring-1 focus:ring-primary shadow-sm"
              />

              {/* Clear button if text entered */}
              {localInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute left-20 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}

              {/* Search Scope Switcher (In-book vs Global) */}
              <button
                onClick={() => {
                  const nextMode = searchMode === 'in-book' ? 'global' : 'in-book';
                  setSearchMode(nextMode);
                  toast.info(nextMode === 'global' ? 'تم تفعيل البحث الشامل في الـ 17 ديواناً' : `تم قصر البحث على ${activeBook.nameAr}`);
                }}
                className={cn(
                  'absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border shadow-xs',
                  searchMode === 'global'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                )}
                title="التبديل بين البحث في الكتاب الحالي والبحث الشامل في جميع كتب السنة"
              >
                {searchMode === 'global' ? '🌐 شامل' : '📖 كتابي'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Top Hub Navigation Bar: Books vs Fake Hadith Checker */}
      <div className="border-b border-border/80 bg-card/70 backdrop-blur sticky top-16 z-30 px-3 sm:px-6 py-2.5">
        <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-start gap-2">
          <button
            onClick={() => setHubTab('books')}
            className={cn(
              'px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border',
              hubTab === 'books'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
            )}
          >
            <BookOpen className="size-4" />
            <span>دواوين السنة النبوية (17 كتاباً)</span>
          </button>

          <button
            onClick={() => setHubTab('checker')}
            className={cn(
              'px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border',
              hubTab === 'checker'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-background text-muted-foreground border-border/80 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
            )}
          >
            <ShieldAlert className="size-4" />
            <span>التحقق من صحة حديث (تحقق قبل النشر)</span>
            <Badge variant="secondary" className="text-[10px] font-bold py-0 px-1.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border-0">
              جديد
            </Badge>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {hubTab === 'checker' ? (
          <FakeHadithChecker />
        ) : (
          <>
            {/* Book Header Hero Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
            <BookOpen className="size-3.5" />
            <span>موسوعة الحديث النبوي الشريف</span>
          </div>

          <h2 className="font-quran text-2xl sm:text-3xl text-foreground font-bold">
            {searchMode === 'global' ? 'البحث الشامل في دواوين السنة النبوية' : activeBook.nameAr}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl mx-auto">
            {searchMode === 'global'
              ? 'يبحث في 17 ديواناً وكتاباً مسنداً مع ترتيب النتائج تلقائياً بحسب درجة الصحة'
              : `${activeBook.authorAr} — ${activeBook.description}`}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs bg-card">
              📚 عدد الأحاديث: {activeBook.hadithCount.toLocaleString('ar-EG')} حديث
            </Badge>

            {bookData && searchMode === 'in-book' && (
              <Badge variant="outline" className="text-xs bg-card">
                📖 عدد الأبواب: {bookData.chapters.length} باب
              </Badge>
            )}

            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              ⚡ تخزين محلي فوري (IndexedDB)
            </Badge>
          </div>
        </div>

        {/* Categories Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {BOOK_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border',
                categoryFilter === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {(loadingBook || searchingGlobal) && (
          <div className="py-24 text-center space-y-3">
            <div className="size-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-muted-foreground animate-pulse">
              {searchingGlobal
                ? 'جاري البحث في دواوين السنة الـ 17 وترتيب النتائج...'
                : `جاري فتح ديوان ${activeBook.nameAr}...`}
            </p>
          </div>
        )}

        {/* 1. Global Multi-Book Search Results View */}
        {!searchingGlobal && searchMode === 'global' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                نتائج البحث الشامل:{' '}
                <strong className="text-foreground">
                  {globalResults.length.toLocaleString('ar-EG')} حديث
                </strong>
              </span>

              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="text-primary hover:underline font-bold"
                >
                  مسح البحث
                </button>
              )}
            </div>

            {globalResults.length > 0 ? (
              <div className="space-y-4">
                {globalResults.slice(0, visibleCount).map((res) => (
                  <HadithCard
                    key={`${res.book.id}-${res.hadith.idInBook}`}
                    hadith={res.hadith}
                    book={res.book}
                    chapter={res.chapter}
                    onOpenDetail={openHadithDetail}
                  />
                ))}

                {visibleCount < globalResults.length && (
                  <div className="pt-6 text-center">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setVisibleCount((prev) => prev + 30)}
                      className="rounded-2xl px-8 font-bold text-xs gap-2 shadow-sm bg-card hover:bg-muted"
                    >
                      <span>تحميل المزيد ({globalResults.length - visibleCount} متبقٍ)</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
                <Scroll className="size-10 mx-auto text-muted-foreground/40" />
                <h4 className="font-bold text-base text-foreground">
                  {searchQuery ? 'لم نعثر على أحاديث مطابقة للبحث الشامل' : 'اكتب كلمة للبحث في جميع كتب السنة'}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? 'جرب البحث بمرادفات أخرى أو بجزء من متن الحديث'
                    : 'محرك البحث الشامل يبحث في الصحيحين والسنن والمسانيد في آنٍ واحد.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. In-Book Hadiths View */}
        {!loadingBook && searchMode === 'in-book' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                أحاديث {activeBook.nameAr}:{' '}
                <strong className="text-foreground">
                  {inBookHadiths.length.toLocaleString('ar-EG')}
                </strong>
                {selectedChapterId !== 'all' && currentChapter && (
                  <span className="mx-1">في {currentChapter.arabic}</span>
                )}
              </span>

              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="text-primary hover:underline font-bold"
                >
                  إلغاء البحث
                </button>
              )}
            </div>

            {inBookHadiths.length > 0 ? (
              <div className="space-y-4">
                {inBookHadiths.slice(0, visibleCount).map((hadith) => {
                  const chapter = bookData?.chapters.find(
                    (c) => c.id === hadith.chapterId
                  );
                  return (
                    <HadithCard
                      key={`${hadith.bookId}-${hadith.id}`}
                      hadith={hadith}
                      book={activeBook}
                      chapter={chapter}
                      onOpenDetail={openHadithDetail}
                    />
                  );
                })}

                {visibleCount < inBookHadiths.length && (
                  <div className="pt-6 text-center">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setVisibleCount((prev) => prev + 30)}
                      className="rounded-2xl px-8 font-bold text-xs gap-2 shadow-sm bg-card hover:bg-muted"
                    >
                      <span>تحميل المزيد من الأحاديث ({inBookHadiths.length - visibleCount} متبقٍ)</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : !bookData ? (
              <div className="py-20 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
                <Scroll className="size-10 mx-auto text-muted-foreground/40" />
                <h4 className="font-bold text-base text-foreground">جاري تجهيز أحاديث {activeBook.nameAr}...</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  إذا تأخر التحميل، يمكنك الضغط على زر إعادة المحاولة لجلب أحاديث الديوان فوراً.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => loadBookData(activeBook.fileName)}
                    className="rounded-xl text-xs gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    إعادة تحميل الديوان
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
                <Scroll className="size-10 mx-auto text-muted-foreground/40" />
                <h4 className="font-bold text-base text-foreground">لا توجد أحاديث مطابقة</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  لم نعثر على نتائج في هذا الكتاب. يمكنك تجربة التبديل إلى <strong>[البحث الشامل]</strong> من شريط البحث.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setSearchMode('global')}
                    className="rounded-xl text-xs"
                  >
                    البحث في جميع كتب السنة الـ 17
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleClearSearch();
                      setSelectedChapterId('all');
                    }}
                    className="rounded-xl text-xs"
                  >
                    عرض كل أحاديث {activeBook.nameAr}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* Book Selection Drawer */}
      {bookDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-3xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Library className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  دواوين وكتب الحديث النبوي الشريف (17 كتاباً)
                </h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setBookDrawerOpen(false)}
                className="size-8 rounded-xl"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {filteredBooksList.map((book) => {
                const isSelected = activeBook.id === book.id;
                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      setActiveBook(book);
                      setBookDrawerOpen(false);
                      toast.success(`تم فتح ${book.nameAr}`);
                    }}
                    className={cn(
                      'p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground">
                        {book.nameAr}
                      </h4>
                      <Badge variant="outline" className="text-[10px]">
                        {book.hadithCount.toLocaleString('ar-EG')} حديث
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {book.authorAr}
                    </p>

                    <p className="text-[11px] text-muted-foreground/80 line-clamp-2 pt-1 border-t border-border/40">
                      {book.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chapters Selection Drawer */}
      {chapterDrawerOpen && bookData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Scroll className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  فهرس كتب وأبواب {activeBook.nameAr} ({bookData.chapters.length} باب)
                </h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setChapterDrawerOpen(false)}
                className="size-8 rounded-xl"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {/* All Chapters Option */}
              <div
                onClick={() => {
                  setSelectedChapterId('all');
                  setChapterDrawerOpen(false);
                }}
                className={cn(
                  'p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between font-bold text-xs',
                  selectedChapterId === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/80 bg-card hover:bg-muted/50'
                )}
              >
                <span>📖 جميع الأبواب والأحاديث</span>
                <Badge variant="outline" className="text-[10px]">
                  {bookData.hadiths.length} حديث
                </Badge>
              </div>

              {bookData.chapters.map((ch) => {
                const isSelected = selectedChapterId === ch.id;
                const hadithsInCh = bookData.hadiths.filter(
                  (h) => h.chapterId === ch.id
                ).length;

                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      setSelectedChapterId(ch.id);
                      setChapterDrawerOpen(false);
                      toast.success(`تم الانتقال إلى: ${ch.arabic}`);
                    }}
                    className={cn(
                      'p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-6 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-[10px]">
                        {ch.id}
                      </div>
                      <span className="font-bold text-foreground line-clamp-1">
                        {ch.arabic}
                      </span>
                    </div>

                    <Badge variant="secondary" className="text-[10px]">
                      {hadithsInCh} حديث
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Hadith Detail Modal (Sharh, Hints, English) */}
      {selectedHadith && selectedHadithBook && (
        <HadithDetailModal
          hadith={selectedHadith}
          book={selectedHadithBook}
          chapter={selectedHadithChapter}
          sharh={hadithSharh}
          loadingSharh={loadingSharh}
          onClose={closeHadithDetail}
        />
      )}
    </div>
  );
}
