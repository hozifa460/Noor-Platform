'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Scroll,
  Library,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchHadithsInBook } from '@/lib/hadith-engine';
import { getHadithGrade, isMuttafaqunAlayh } from '@/lib/hadith-grade-engine';
import { useHadithStore } from '@/stores/hadith-store';
import { HadithCard } from './HadithCard';
import { HadithDetailModal } from './HadithDetailModal';
import { HadithGradesGuideModal } from './HadithGradesGuideModal';
import { FakeHadithChecker } from './FakeHadithChecker';
import { HadithBookSelectorModal } from './HadithBookSelectorModal';
import { HadithChapterSelectorModal } from './HadithChapterSelectorModal';
import { HadithSearchHeader } from './HadithSearchHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function HadithHubView() {
  const activeBook = useHadithStore((s) => s.activeBook);
  const bookData = useHadithStore((s) => s.bookData);
  const selectedChapterId = useHadithStore((s) => s.selectedChapterId);
  const searchQuery = useHadithStore((s) => s.searchQuery);
  const categoryFilter = useHadithStore((s) => s.categoryFilter);
  const gradeFilter = useHadithStore((s) => s.gradeFilter);
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
  const setGradeFilter = useHadithStore((s) => s.setGradeFilter);
  const setSearchMode = useHadithStore((s) => s.setSearchMode);
  const openHadithDetail = useHadithStore((s) => s.openHadithDetail);
  const closeHadithDetail = useHadithStore((s) => s.closeHadithDetail);
  const detailInitialTab = useHadithStore((s) => s.detailInitialTab);
  const loadBookData = useHadithStore((s) => s.loadBookData);

  const [bookDrawerOpen, setBookDrawerOpen] = useState(false);
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [hubTab, setHubTab] = useState<'books' | 'checker'>('books');
  const [gradesGuideOpen, setGradesGuideOpen] = useState(false);

  const [localInput, setLocalInput] = useState(searchQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    loadBookData(activeBook.fileName);
  }, [activeBook.fileName, loadBookData]);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, selectedChapterId, activeBook.id, searchMode, gradeFilter, categoryFilter]);

  const inBookHadiths = useMemo(() => {
    if (searchMode === 'global' || !bookData || !bookData.hadiths) return [];
    const base = searchHadithsInBook(
      bookData.hadiths,
      searchQuery,
      selectedChapterId === 'all' ? undefined : selectedChapterId
    );
    if (gradeFilter === 'all') return base;
    return base.filter((h) => {
      const g = getHadithGrade(activeBook.id, h.idInBook).grade;
      if (gradeFilter === 'muttafaqun') {
        return isMuttafaqunAlayh(activeBook.id, h.idInBook, h.arabic);
      }
      if (gradeFilter === 'sahih') return g === 'صحيح';
      if (gradeFilter === 'hasan') return g === 'حسن';
      if (gradeFilter === 'daif') return g === 'ضعيف';
      if (gradeFilter === 'mawdu') return g === 'موضوع';
      return true;
    });
  }, [bookData, searchQuery, selectedChapterId, searchMode, gradeFilter, activeBook.id]);

  const displayedGlobalResults = useMemo(() => {
    if (searchMode !== 'global') return [];
    return globalResults.filter((res) => {
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'jawami') {
          if (res.book.category !== 'jawami' && res.book.category !== 'masanid') return false;
        } else if (res.book.category !== categoryFilter) {
          return false;
        }
      }
      if (gradeFilter !== 'all') {
        const g = getHadithGrade(res.book.id, res.hadith.idInBook).grade;
        if (gradeFilter === 'muttafaqun') {
          if (!isMuttafaqunAlayh(res.book.id, res.hadith.idInBook, res.hadith.arabic)) return false;
        } else if (gradeFilter === 'sahih') {
          if (g !== 'صحيح') return false;
        } else if (gradeFilter === 'hasan') {
          if (g !== 'حسن') return false;
        } else if (gradeFilter === 'daif') {
          if (g !== 'ضعيف') return false;
        } else if (gradeFilter === 'mawdu') {
          if (g !== 'موضوع') return false;
        }
      }
      return true;
    });
  }, [searchMode, globalResults, categoryFilter, gradeFilter]);

  const currentChapter = bookData?.chapters.find(
    (c) => String(c.id) === String(selectedChapterId)
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Right: Book selector & Chapter triggers */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookDrawerOpen(true)}
              className="gap-2 font-bold text-xs sm:text-sm rounded-2xl bg-card hover:bg-muted border-border shadow-xs h-10 px-3 sm:px-4"
            >
              <Library className="size-4 text-primary" />
              <span>{activeBook.nameAr}</span>
              <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                {activeBook.hadithCount.toLocaleString('ar-EG')} حديث
              </Badge>
            </Button>

            {bookData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChapterDrawerOpen(true)}
                className="gap-1.5 text-xs rounded-2xl bg-card hover:bg-muted border-border h-10 px-3 truncate max-w-[200px] sm:max-w-[320px]"
              >
                <Scroll className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate font-semibold">
                  {selectedChapterId === 'all' || !currentChapter
                    ? 'جميع الأبواب'
                    : currentChapter.arabic}
                </span>
              </Button>
            )}
          </div>

          {/* Left: View mode tabs (Books vs Fake Hadith Checker) */}
          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/80 text-xs font-bold">
            <button
              onClick={() => setHubTab('books')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
                hubTab === 'books'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookOpen className="size-3.5 text-primary" />
              <span>دواوين السنة</span>
            </button>

            <button
              onClick={() => setHubTab('checker')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
                hubTab === 'checker'
                  ? 'bg-rose-500 text-white shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400'
              )}
            >
              <ShieldAlert className="size-3.5" />
              <span>كاشف الأحاديث المكذوبة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {hubTab === 'checker' ? (
          <FakeHadithChecker />
        ) : (
          <>
            {/* Search and Filters Header */}
            <HadithSearchHeader
              searchQuery={localInput}
              onSearchChange={handleInputChange}
              searchMode={searchMode === 'global' ? 'all' : 'book'}
              onToggleSearchMode={(mode) => setSearchMode(mode === 'all' ? 'global' : 'in-book')}
              activeGradeFilter={gradeFilter}
              onSelectGradeFilter={(g) => setGradeFilter(g)}
              onOpenGradesGuide={() => setGradesGuideOpen(true)}
              activeBookName={activeBook.nameAr}
            />

            {/* Loading Indicator */}
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

            {/* Global Search Results */}
            {!searchingGlobal && searchMode === 'global' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    نتائج البحث الشامل:{' '}
                    <strong className="text-foreground">
                      {displayedGlobalResults.length.toLocaleString('ar-EG')} حديث
                    </strong>
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

                {displayedGlobalResults.length > 0 ? (
                  <div className="space-y-4">
                    {displayedGlobalResults.slice(0, visibleCount).map((res) => (
                      <HadithCard
                        key={`${res.book.id}-${res.hadith.idInBook}`}
                        hadith={res.hadith}
                        book={res.book}
                        chapter={res.chapter}
                        highlightQuery={searchQuery}
                        isSemanticMatch={res.isSemanticMatch}
                        semanticTopic={res.semanticTopic}
                        onOpenDetail={openHadithDetail}
                      />
                    ))}

                    {visibleCount < displayedGlobalResults.length && (
                      <div className="pt-6 text-center">
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => setVisibleCount((prev) => prev + 30)}
                          className="rounded-2xl px-8 font-bold text-xs gap-2 shadow-xs bg-card hover:bg-muted"
                        >
                          تحميل المزيد ({displayedGlobalResults.length - visibleCount} متبقٍ)
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
                    <Scroll className="size-10 mx-auto text-muted-foreground/40" />
                    <h4 className="font-bold text-base text-foreground">
                      {searchQuery
                        ? 'لم نعثر على أحاديث مطابقة لهذا الفلتر'
                        : 'اكتب كلمة للبحث في جميع كتب السنة'}
                    </h4>
                  </div>
                )}
              </div>
            )}

            {/* In-Book Hadiths */}
            {!loadingBook && searchMode === 'in-book' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    أحاديث {activeBook.nameAr}:{' '}
                    <strong className="text-foreground">
                      {inBookHadiths.length.toLocaleString('ar-EG')}
                    </strong>
                  </span>
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="text-primary hover:underline font-bold cursor-pointer"
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
                          highlightQuery={searchQuery}
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
                          className="rounded-2xl px-8 font-bold text-xs gap-2 shadow-xs bg-card hover:bg-muted"
                        >
                          تحميل المزيد من الأحاديث ({inBookHadiths.length - visibleCount} متبقٍ)
                        </Button>
                      </div>
                    )}
                  </div>
                ) : !bookData ? (
                  <div className="py-20 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
                    <Scroll className="size-10 mx-auto text-muted-foreground/40" />
                    <h4 className="font-bold text-base text-foreground">
                      جاري تجهيز أحاديث {activeBook.nameAr}...
                    </h4>
                    <div className="pt-2">
                      <Button
                        size="sm"
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
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <Button
                        size="sm"
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

      {/* Book Selector Modal */}
      <HadithBookSelectorModal
        open={bookDrawerOpen}
        onClose={() => setBookDrawerOpen(false)}
        activeBook={activeBook}
        onSelectBook={(b) => {
          setActiveBook(b);
          toast.success(`تم فتح ${b.nameAr}`);
        }}
        categoryFilter={categoryFilter}
        onSelectCategory={setCategoryFilter}
      />

      {/* Chapter Selector Modal */}
      {bookData && (
        <HadithChapterSelectorModal
          open={chapterDrawerOpen}
          onClose={() => setChapterDrawerOpen(false)}
          chapters={bookData.chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapter={(id) => {
            setSelectedChapterId(id);
            const found = bookData.chapters.find((c) => c.id === id);
            if (found) toast.success(`تم الانتقال إلى: ${found.arabic}`);
          }}
          bookTitle={activeBook.nameAr}
        />
      )}

      {/* Hadith Detail Modal */}
      {selectedHadith && selectedHadithBook && (
        <HadithDetailModal
          key={`${selectedHadith.idInBook}-${detailInitialTab}`}
          hadith={selectedHadith}
          book={selectedHadithBook}
          chapter={selectedHadithChapter}
          sharh={hadithSharh}
          loadingSharh={loadingSharh}
          highlightQuery={searchQuery}
          initialTab={detailInitialTab || 'matn'}
          onClose={closeHadithDetail}
        />
      )}

      {/* Educational Hadith Grades Guide Modal */}
      <HadithGradesGuideModal
        isOpen={gradesGuideOpen}
        onClose={() => setGradesGuideOpen(false)}
      />
    </div>
  );
}
