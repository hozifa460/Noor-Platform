'use client';

import { useState, useMemo } from 'react';
import {
  ListTree,
  Search,
  Bookmark,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  ThemeStyle,
  EBookMetaResponse,
  InBookSearchResult,
  BookHighlight,
  SidebarTab,
} from './types';

export type { SidebarTab };

interface EBookSidebarTocProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  metaRes: EBookMetaResponse | null;
  currentChapter: number;
  onJumpToChapter: (chapterIndex: number, pageNumber?: number, pageId?: number) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  searchResults: InBookSearchResult[];
  searching: boolean;
  onJumpToSearch: (result: InBookSearchResult) => void;
  highlights: BookHighlight[];
  themeStyle: ThemeStyle;
}

export function EBookSidebarToc({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  metaRes,
  currentChapter,
  onJumpToChapter,
  searchQuery,
  onSearch,
  searchResults,
  searching,
  onJumpToSearch,
  highlights,
  themeStyle,
}: EBookSidebarTocProps) {
  const PAGE_SIZE = 300;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Adjust visibleCount during render when book changes (official React pattern)
  const [prevBookKey, setPrevBookKey] = useState<string | null>(null);
  const currentBookKey = `${metaRes?.meta?.id || ''}:${metaRes?.toc?.length || 0}`;
  if (prevBookKey !== currentBookKey) {
    setPrevBookKey(currentBookKey);
    setVisibleCount(PAGE_SIZE);
  }

  // Adjust visibleCount if currentChapter changed and is beyond current visible count
  const [prevChapter, setPrevChapter] = useState(currentChapter);
  if (prevChapter !== currentChapter) {
    setPrevChapter(currentChapter);
    if (metaRes?.toc) {
      const currentIdx = metaRes.toc.findIndex((item) => item.chapterIndex === currentChapter);
      if (currentIdx >= 0 && currentIdx >= visibleCount) {
        setVisibleCount(Math.min(metaRes.toc.length, currentIdx + PAGE_SIZE));
      }
    }
  }

  const toc = metaRes?.toc;
  const displayedToc = useMemo(() => {
    if (!toc) return [];
    const sliced = toc.slice(0, visibleCount);
    // Include unmapped items so that any unmapped headings remain accessible
    const unmapped = toc.filter((item) => item.isMapped === false);
    const unmappedNotInSlice = unmapped.filter((item) => !sliced.includes(item));
    if (unmappedNotInSlice.length > 0) {
      return [...sliced, ...unmappedNotInSlice];
    }
    return sliced;
  }, [toc, visibleCount]);

  const hasMore = toc ? visibleCount < toc.length : false;
  const remainingCount = toc ? toc.length - visibleCount : 0;

  const handleLoadMore = () => {
    if (!toc) return;
    setVisibleCount((prev) => Math.min(toc.length, prev + PAGE_SIZE));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200 && hasMore) {
      handleLoadMore();
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        'absolute sm:relative inset-y-0 right-0 z-30 w-full sm:w-84 border-l flex flex-col shadow-xl sm:shadow-none transition-all duration-300',
        themeStyle.cardBg,
        themeStyle.border
      )}
    >
      {/* Sidebar Tabs */}
      <div className="flex items-center border-b border-current/10 p-2 gap-1 bg-black/5 dark:bg-white/5 shrink-0">
        <button
          onClick={() => setActiveTab('toc')}
          className={cn(
            'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'toc'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'opacity-70 hover:opacity-100'
          )}
        >
          <ListTree className="size-3.5" />
          الأبواب ({metaRes?.toc.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={cn(
            'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'search'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'opacity-70 hover:opacity-100'
          )}
        >
          <Search className="size-3.5" />
          بحث داخلي
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={cn(
            'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'notes'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'opacity-70 hover:opacity-100'
          )}
        >
          <Bookmark className="size-3.5" />
          الفوائد ({highlights.length})
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="size-7 p-0 rounded-lg sm:hidden"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Tab 1: Table of Contents */}
      {activeTab === 'toc' && (
        <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayedToc && displayedToc.length > 0 ? (
            <>
              {displayedToc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onJumpToChapter(item.chapterIndex, item.pageNumber, item.pageId)}
                  className={cn(
                    'w-full text-right p-2.5 rounded-xl transition-all flex items-start gap-2 text-xs leading-relaxed',
                    item.level === 2 && 'mr-2 text-[11px] opacity-90',
                    item.level === 3 && 'mr-4 text-[10px] opacity-80',
                    item.isMapped === false && 'opacity-65 hover:opacity-90',
                    currentChapter === item.chapterIndex
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shadow-sm border border-amber-500/30'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
                  )}
                >
                  <span
                    className={cn(
                      'size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 font-mono',
                      item.isMapped !== false
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                    title={item.isMapped === false ? 'موضع غير معاير بفهرسة موثقة' : undefined}
                  >
                    {item.isMapped !== false && item.chapterIndex > 0 ? item.chapterIndex : '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-60 font-mono">
                      {item.volumeNumber && <span>ج {item.volumeNumber}</span>}
                      {item.pageNumber !== undefined && item.pageNumber !== null && (
                        <span>ص {item.pageNumber}</span>
                      )}
                      {item.isMapped === false && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                          غير محقق
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {hasMore && (
                <div className="p-2 pt-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    className="w-full text-xs font-semibold rounded-xl border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-amber-600 dark:text-amber-400 py-2"
                  >
                    تحميل المزيد ({remainingCount.toLocaleString('ar-SA')} متبقية)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs opacity-60">
              لا يتوفر فهرس تفصيلي لهذا الكتاب
            </div>
          )}
        </div>
      )}

      {/* Tab 2: In-Book Search */}
      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <div className="relative mb-3 shrink-0">
            <Input
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="ابحث عن كلمة داخل الكتاب..."
              className="pr-9 text-xs rounded-xl bg-black/5 dark:bg-white/5 border-current/20"
            />
            <Search className="size-4 absolute right-3 top-2.5 opacity-50" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {searching ? (
              <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-amber-500" />
                جاري البحث السريع...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onJumpToSearch(r)}
                  className="w-full text-right p-2.5 rounded-xl border border-current/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs space-y-1 block"
                >
                  <div className="flex items-center justify-between text-[10px] opacity-60">
                    <span className="font-semibold">{r.chapterTitle}</span>
                    <span className="font-mono">صفحة {r.pageNumber}</span>
                  </div>
                  <p className="line-clamp-2 text-justify text-[11px] leading-relaxed">
                    {r.snippet}
                  </p>
                </button>
              ))
            ) : searchQuery.trim().length >= 2 ? (
              <div className="p-8 text-center text-xs opacity-60">
                لم يتم العثور على نتائج مطابقة
              </div>
            ) : (
              <div className="p-8 text-center text-xs opacity-60">
                اكتب كلمة للبحث داخل هذا الكتاب
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Highlights & Notes */}
      {activeTab === 'notes' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {highlights.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-60 space-y-2">
              <Bookmark className="size-6 mx-auto opacity-40 text-amber-500" />
              <p>لا توجد فوائد محفوظة بعد</p>
              <p className="text-[10px] opacity-60">
                ظلل أي فقرة أثناء القراءة لحفظها هنا والرجوع إليها لاحقاً
              </p>
            </div>
          ) : (
            highlights.map((h) => (
              <div
                key={h.id}
                onClick={() => onJumpToChapter(h.chapterIndex)}
                className="p-3 rounded-xl border border-current/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-1.5 cursor-pointer hover:border-amber-500/40 transition-all text-xs"
              >
                <div className="flex items-center justify-between text-[10px] opacity-60 font-mono">
                  <span>الفصل {h.chapterIndex} • صفحة {h.pageNumber}</span>
                  <span>{new Date(h.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
                <p className="line-clamp-3 text-justify text-[11px] leading-relaxed italic">
                  «{h.text}»
                </p>
                {h.note && (
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded-lg">
                    ملاحظة: {h.note}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
