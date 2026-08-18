'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Settings2,
  ListTree,
  Bookmark,
  Download,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
  Copy,
  Highlighter,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  loadEBookMeta,
  loadChapterChunk,
  preloadAdjacentChapters,
  searchInsideEBook,
  saveEBookForOffline,
  isEBookCachedOffline,
  getReadingProgress,
  saveReadingProgress,
  getBookHighlights,
  saveBookHighlight,
  downloadBookTextFile,
  type EBookMetaResponse,
} from '@/lib/book-text-engine';
import type {
  BookChapterChunk,
  InBookSearchResult,
  BookHighlight,
  SectionParagraph,
} from '@/lib/book-types';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EBookTextReaderProps {
  bookItem: MediaItem;
  onClose: () => void;
  onSwitchToPdf?: () => void;
}

type ReadingTheme = 'light' | 'sepia' | 'oasis' | 'oled';
type TashkeelMode = 'full' | 'light' | 'none';
type FontFamily = 'amiri' | 'naskh' | 'kufi' | 'traditional';

const THEME_STYLES: Record<
  ReadingTheme,
  {
    bg: string;
    text: string;
    cardBg: string;
    border: string;
    accent: string;
    headerBg: string;
    subtext: string;
    highlightYellow: string;
    highlightGreen: string;
    highlightBlue: string;
    highlightPink: string;
  }
> = {
  light: {
    bg: 'bg-stone-50',
    text: 'text-stone-900',
    cardBg: 'bg-white/90',
    border: 'border-stone-200',
    accent: 'text-amber-700',
    headerBg: 'bg-white/95 backdrop-blur-md border-stone-200',
    subtext: 'text-stone-600',
    highlightYellow: 'bg-amber-200/80 text-stone-950',
    highlightGreen: 'bg-emerald-200/80 text-stone-950',
    highlightBlue: 'bg-sky-200/80 text-stone-950',
    highlightPink: 'bg-rose-200/80 text-stone-950',
  },
  sepia: {
    bg: 'bg-[#fbf0d9]',
    text: 'text-[#43301a]',
    cardBg: 'bg-[#f4e4c1]/70',
    border: 'border-[#dfcaa4]',
    accent: 'text-[#8c5017]',
    headerBg: 'bg-[#f7ebd0]/95 backdrop-blur-md border-[#dfcaa4]',
    subtext: 'text-[#705638]',
    highlightYellow: 'bg-[#eed07a] text-[#342410]',
    highlightGreen: 'bg-[#c6dfaa] text-[#1c3814]',
    highlightBlue: 'bg-[#bad5e8] text-[#152e42]',
    highlightPink: 'bg-[#f1c3be] text-[#421b18]',
  },
  oasis: {
    bg: 'bg-[#0a1612]',
    text: 'text-emerald-50',
    cardBg: 'bg-[#10241e]/80',
    border: 'border-emerald-800/40',
    accent: 'text-emerald-400',
    headerBg: 'bg-[#0d1e18]/95 backdrop-blur-md border-emerald-800/40',
    subtext: 'text-emerald-200/70',
    highlightYellow: 'bg-amber-500/30 text-amber-200 border-b border-amber-400/50',
    highlightGreen: 'bg-emerald-500/30 text-emerald-200 border-b border-emerald-400/50',
    highlightBlue: 'bg-cyan-500/30 text-cyan-200 border-b border-cyan-400/50',
    highlightPink: 'bg-rose-500/30 text-rose-200 border-b border-rose-400/50',
  },
  oled: {
    bg: 'bg-black',
    text: 'text-neutral-200',
    cardBg: 'bg-neutral-900/90',
    border: 'border-neutral-800',
    accent: 'text-amber-400',
    headerBg: 'bg-neutral-950/95 backdrop-blur-md border-neutral-800',
    subtext: 'text-neutral-400',
    highlightYellow: 'bg-amber-500/25 text-amber-100',
    highlightGreen: 'bg-emerald-500/25 text-emerald-100',
    highlightBlue: 'bg-blue-500/25 text-blue-100',
    highlightPink: 'bg-rose-500/25 text-rose-100',
  },
};

const FONT_CLASSES: Record<FontFamily, string> = {
  amiri: 'font-serif',
  naskh: 'font-sans',
  kufi: 'font-mono',
  traditional: 'font-serif tracking-wide',
};

// Helper for dynamic Tashkeel stripping
function filterTashkeel(text: string, mode: TashkeelMode): string {
  if (mode === 'full') return text;
  if (mode === 'none') {
    return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  }
  // Light mode: Keep Shaddah (\u0651) and Tanween, strip Sukun and simple vowels
  return text.replace(/[\u064E\u064F\u0650\u0652]/g, '');
}

export function EBookTextReader({
  bookItem,
  onClose,
  onSwitchToPdf,
}: EBookTextReaderProps) {
  const bookId = bookItem.id.replace(/^ebook-/, '');

  // Book Data State
  const [metaRes, setMetaRes] = useState<EBookMetaResponse | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [chunkData, setChunkData] = useState<BookChapterChunk | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Typography & UI Preferences (Persisted in localStorage)
  const [fontSize, setFontSize] = useState<number>(20);
  const [theme, setTheme] = useState<ReadingTheme>('sepia');
  const [tashkeel, setTashkeel] = useState<TashkeelMode>('full');
  const [fontFamily, setFontFamily] = useState<FontFamily>('amiri');

  // Sidebar & Drawers
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'toc' | 'search' | 'notes'>('toc');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // In-Book Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<InBookSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [highlightTerm, setHighlightTerm] = useState<string>('');

  // Offline & Highlights
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);

  // Fullscreen
  const [isFullscreen, _setIsFullscreen] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load: Metadata & Saved Progress
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const meta = await loadEBookMeta(bookId);
      if (!isMounted) return;
      setMetaRes(meta);

      // Check offline cache
      const cached = await isEBookCachedOffline(bookId);
      if (isMounted) setIsOfflineCached(cached);

      // Load saved progress
      const progress = getReadingProgress(bookId);
      const initialChapter = progress ? progress.chapterIndex : 1;
      setCurrentChapter(initialChapter);

      // Load saved highlights
      setHighlights(getBookHighlights(bookId));
    })();

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  // 2. Load Chapter Chunk on Chapter Change
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const chunk = await loadChapterChunk(bookId, currentChapter);
      if (!isMounted) return;
      setChunkData(chunk);
      setLoading(false);

      // Reset scroll position to top
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Preload adjacent chapters
      if (metaRes?.meta) {
        preloadAdjacentChapters(bookId, currentChapter, metaRes.meta.totalChapters);
      }

      // Save reading progress
      if (chunk && metaRes?.meta) {
        const percent = Math.round((currentChapter / metaRes.meta.totalChapters) * 100);
        saveReadingProgress({
          bookId,
          chapterIndex: currentChapter,
          pageNumber: chunk.startPage,
          scrollRatio: 0,
          lastReadTimestamp: Date.now(),
          completedPercent: percent,
        });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [bookId, currentChapter, metaRes?.meta]);

  // 3. Search Handler
  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim() || q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const hits = await searchInsideEBook(bookId, q);
      setSearchResults(hits);
      setSearching(false);
    },
    [bookId]
  );

  // Jump to search result
  const handleJumpToSearch = (result: InBookSearchResult) => {
    setCurrentChapter(result.chapterIndex);
    setHighlightTerm(searchQuery.trim());
    setSidebarOpen(false);
    toast.success(`الانتقال إلى ${result.chapterTitle} (صفحة ${result.pageNumber})`);
  };

  // Jump to TOC chapter
  const handleJumpToChapter = (chapIdx: number) => {
    setCurrentChapter(chapIdx);
    setSidebarOpen(false);
  };

  // 4. Download for Offline
  const handleSaveOffline = async () => {
    if (isOfflineCached) {
      toast.info('الكتاب محفوظ بالفعل للقراءة بدون إنترنت');
      return;
    }
    setDownloadProgress(1);
    const success = await saveEBookForOffline(bookId, ({ percent }) => {
      setDownloadProgress(percent);
    });
    if (success) {
      setIsOfflineCached(true);
      setDownloadProgress(null);
      toast.success('تم حفظ الكتاب كاملاً بدون إنترنت بنجاح!');
    } else {
      setDownloadProgress(null);
      toast.error('تعذر حفظ الكتاب، يرجى المحاولة لاحقاً');
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const handleDownloadDeviceFile = async () => {
    setIsExporting(true);
    toast.info('جاري تجهيز الكتاب للتحميل على جهازك...');
    try {
      const ok = await downloadBookTextFile(bookId, metaRes?.meta.title || bookItem.title);
      if (ok) {
        toast.success('تم تحميل الكتاب على جهازك بنجاح!');
      } else {
        toast.error('تعذر تجهيز الملف للتحميل');
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل الكتاب');
    } finally {
      setIsExporting(false);
    }
  };

  // 5. Highlight & Copy Text Selection
  const handleHighlightParagraph = (p: SectionParagraph, color: 'yellow' | 'green' | 'blue' | 'pink') => {
    const newHighlight: BookHighlight = {
      id: `${bookId}-${currentChapter}-${p.id}-${Date.now()}`,
      bookId,
      chapterIndex: currentChapter,
      pageNumber: p.pageNumber,
      text: p.text.slice(0, 150) + (p.text.length > 150 ? '...' : ''),
      color,
      createdAt: Date.now(),
    };
    saveBookHighlight(newHighlight);
    setHighlights((prev) => [newHighlight, ...prev]);
    toast.success('تم حفظ الفائدة في دفتر الملاحظات');
  };

  const handleCopyCitation = (text: string, pageNum: number) => {
    const title = metaRes?.meta.title || bookItem.title;
    const author = metaRes?.meta.author || bookItem.sheikhName || '';
    const citation = `«${text}»\n\n— [كتاب: ${title} - ${author}، صفحة: ${pageNum}] (منصة نور)`;
    navigator.clipboard.writeText(citation);
    toast.success('تم نسخ النص مع التوثيق والعزو');
  };

  const themeStyle = THEME_STYLES[theme];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col select-text transition-colors duration-300',
        themeStyle.bg,
        themeStyle.text,
        isFullscreen ? 'p-0' : 'p-0'
      )}
    >
      {/* ─── Top Deluxe Header Toolbar ─────────────────────────────── */}
      <header
        className={cn(
          'relative z-20 flex items-center justify-between px-3 sm:px-6 py-2.5 border-b shadow-sm transition-colors',
          themeStyle.headerBg
        )}
      >
        {/* Right Section: Back + Title & Meta */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
            title="رجوع للمكتبة"
          >
            <X className="size-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base truncate max-w-[200px] sm:max-w-[360px]">
                {metaRes?.meta.title || bookItem.title}
              </span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1"
              >
                <Sparkles className="size-2.5" />
                نص حي فائق السرعة
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-75 truncate">
              <span>{metaRes?.meta.author || bookItem.sheikhName}</span>
              {metaRes?.meta.authorDeath && (
                <span className="hidden sm:inline-block text-[10px] px-1 rounded bg-black/5 dark:bg-white/5">
                  ({metaRes.meta.authorDeath})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Dual-Mode Switcher (PDF Facsimile) */}
        {metaRes?.meta.hasFacsimilePdf && onSwitchToPdf && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToPdf}
            className="hidden md:flex items-center gap-1.5 rounded-full text-xs font-semibold px-3 py-1.5 border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-all shadow-sm"
            title="التبديل إلى النسخة المصورة الأصلية الموافقة للمطبوع"
          >
            <FileText className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>عرض المطبوع (PDF)</span>
          </Button>
        )}

        {/* Left Section: Tools & Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Download to Device (.txt) Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadDeviceFile}
            disabled={isExporting}
            className="rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 relative"
            title="تحميل الكتاب كاملاً على هاتفك أو جهازك (.txt)"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin text-amber-500" />
            ) : (
              <Download className="size-4 text-primary" />
            )}
          </Button>
          {/* Offline Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveOffline}
            className="rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 relative"
            title={isOfflineCached ? 'محفوظ بدون إنترنت' : 'حفظ الكتاب بدون إنترنت'}
          >
            {downloadProgress !== null ? (
              <Loader2 className="size-4 animate-spin text-amber-500" />
            ) : isOfflineCached ? (
              <Check className="size-4 text-emerald-500 font-bold" />
            ) : (
              <Download className="size-4 opacity-80" />
            )}
          </Button>

          {/* Table of Contents & Search Drawer Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen((v) => !v)}
            className={cn(
              'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors',
              sidebarOpen && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            )}
            title="الفهرس والبحث والملاحظات"
          >
            <ListTree className="size-4" />
          </Button>

          {/* Typography Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen((v) => !v)}
            className={cn(
              'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors',
              settingsOpen && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            )}
            title="تنسيق الخطوط والثيمات"
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* ─── Reading Progress Bar ──────────────────────────────────── */}
      {metaRes?.meta && (
        <div className="w-full bg-black/5 dark:bg-white/5 h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
            style={{
              width: `${Math.round((currentChapter / metaRes.meta.totalChapters) * 100)}%`,
            }}
          />
        </div>
      )}

      {/* ─── Settings Floating Panel ───────────────────────────────── */}
      {settingsOpen && (
        <div
          className={cn(
            'absolute top-14 left-4 sm:left-6 z-40 w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200',
            themeStyle.cardBg,
            themeStyle.border
          )}
        >
          <div className="flex items-center justify-between mb-4 border-b pb-2 border-current/10">
            <span className="font-bold text-sm flex items-center gap-1.5">
              <Settings2 className="size-4 text-amber-500" />
              تخصيص لوحة القراءة
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(false)}
              className="size-6 p-0 rounded-full"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* 1. Theme Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-2 opacity-80">
              ثيم وإضاءة القراءة:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(
                [
                  { id: 'light', label: 'ناصع', icon: '☀️' },
                  { id: 'sepia', label: 'ورقي', icon: '📜' },
                  { id: 'oasis', label: 'واحة', icon: '🌴' },
                  { id: 'oled', label: 'داكن', icon: '🌑' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'flex flex-col items-center py-2 px-1 rounded-xl border transition-all',
                    theme === t.id
                      ? 'border-amber-500 bg-amber-500/15 font-bold shadow-sm'
                      : 'border-current/10 hover:border-current/30'
                  )}
                >
                  <span className="text-base mb-0.5">{t.icon}</span>
                  <span className="text-[11px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Font Size Adjuster */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="opacity-80">حجم الخط:</span>
              <span className="font-mono text-amber-500">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                className="flex-1 rounded-xl font-bold"
              >
                A-
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize((s) => Math.min(36, s + 2))}
                className="flex-1 rounded-xl font-bold"
              >
                A+
              </Button>
            </div>
          </div>

          {/* 3. Font Family */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-2 opacity-80">
              نوع الخط العربي:
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(
                [
                  { id: 'amiri', label: 'الخط الأميري الفاخر' },
                  { id: 'naskh', label: 'خط النسخ الحديث' },
                  { id: 'traditional', label: 'النسخ الكلاسيكي' },
                  { id: 'kufi', label: 'الخط الكوفي' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  className={cn(
                    'py-2 px-2 rounded-xl border text-center text-xs transition-all truncate',
                    fontFamily === f.id
                      ? 'border-amber-500 bg-amber-500/15 font-bold'
                      : 'border-current/10 hover:border-current/30'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Tashkeel Mode */}
          <div>
            <label className="text-xs font-semibold block mb-2 opacity-80">
              مستوى التشكيل:
            </label>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {(
                [
                  { id: 'full', label: 'كامل' },
                  { id: 'light', label: 'مخفف' },
                  { id: 'none', label: 'بدون تشكيل' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTashkeel(m.id)}
                  className={cn(
                    'py-1.5 rounded-lg border text-center text-[11px] transition-all',
                    tashkeel === m.id
                      ? 'border-amber-500 bg-amber-500/15 font-bold'
                      : 'border-current/10 hover:border-current/30'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content Body & Sidebar ───────────────────────────── */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Collapsible Sidebar (TOC / Search / Notes) */}
        {sidebarOpen && (
          <aside
            className={cn(
              'absolute sm:relative inset-y-0 right-0 z-30 w-full sm:w-84 border-l flex flex-col shadow-xl sm:shadow-none transition-all duration-300',
              themeStyle.cardBg,
              themeStyle.border
            )}
          >
            {/* Sidebar Tabs */}
            <div className="flex items-center border-b border-current/10 p-2 gap-1 bg-black/5 dark:bg-white/5">
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
                onClick={() => setSidebarOpen(false)}
                className="size-7 p-0 rounded-lg sm:hidden"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Tab 1: Table of Contents */}
            {activeTab === 'toc' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {metaRes?.toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleJumpToChapter(item.chapterIndex)}
                    className={cn(
                      'w-full text-right p-2.5 rounded-xl transition-all flex items-start gap-2 text-xs leading-relaxed',
                      item.level === 2 && 'mr-2 text-[11px] opacity-90',
                      item.level === 3 && 'mr-4 text-[10px] opacity-80',
                      currentChapter === item.chapterIndex
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shadow-sm border border-amber-500/30'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
                    )}
                  >
                    <span className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 font-mono">
                      {item.chapterIndex}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-60 font-mono">
                        {item.volumeNumber && <span>ج {item.volumeNumber}</span>}
                        <span>ص {item.pageNumber}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: In-Book Search */}
            {activeTab === 'search' && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                <div className="relative mb-3">
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
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
                        onClick={() => handleJumpToSearch(r)}
                        className="w-full text-right p-2.5 rounded-xl border border-current/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs space-y-1 block"
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-60">
                          <span>{r.chapterTitle}</span>
                          <span>صفحة {r.pageNumber}</span>
                        </div>
                        <p className="line-clamp-2 text-justify text-[11px] leading-relaxed">
                          {r.snippet}
                        </p>
                      </button>
                    ))
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-8 text-center text-xs opacity-60">
                      لم يتم العثور على نتائج
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
                      onClick={() => handleJumpToChapter(h.chapterIndex)}
                      className="p-3 rounded-xl border border-current/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-1.5 cursor-pointer hover:border-amber-500/40 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-60">
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
        )}

        {/* Reader Canvas Area */}
        <main
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 md:px-12 py-8 flex flex-col items-center"
        >
          <div className="w-full max-w-3xl min-h-full">
            {loading ? (
              <div className="h-[60vh] flex flex-col items-center justify-center gap-3 opacity-60">
                <Loader2 className="size-8 animate-spin text-amber-500" />
                <p className="text-sm font-medium">جاري تحميل وتنسيق نص الباب التراثي...</p>
              </div>
            ) : chunkData ? (
              <article className={cn('space-y-6 pb-24', FONT_CLASSES[fontFamily])}>
                {/* Chapter Header Banner */}
                <div className="text-center py-8 border-b-2 border-amber-500/20 mb-10 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    <span>الباب {chunkData.chapterIndex}</span>
                    <span>•</span>
                    <span>ص {chunkData.startPage} إلى {chunkData.endPage}</span>
                    {metaRes?.meta.totalVolumes && metaRes.meta.totalVolumes > 1 && (
                      <>
                        <span>•</span>
                        <span>المجلد {metaRes.meta.totalVolumes}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-900 dark:text-amber-200">
                    ❖ {chunkData.title} ❖
                  </h2>
                  <p className="text-xs opacity-60">
                    عدد الكلمات في هذا الباب: {chunkData.wordCount.toLocaleString('ar-SA')} كلمة
                  </p>
                </div>

                {/* Paragraphs Render */}
                {chunkData.paragraphs.map((p) => {
                  const textFormatted = filterTashkeel(p.text, tashkeel);
                  const isSearchMatch =
                    highlightTerm &&
                    textFormatted.toLowerCase().includes(highlightTerm.toLowerCase());

                  // 1. Poetry Verses
                  if (p.isPoetry || p.hemistich1 || p.hemistich2) {
                    return (
                      <div
                        key={p.id}
                        className="my-6 py-4 px-6 rounded-2xl bg-amber-500/[0.04] dark:bg-amber-400/[0.03] border border-amber-500/15 max-w-2xl mx-auto shadow-sm"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 items-center text-center">
                          <div className="text-base sm:text-lg font-medium text-right sm:text-center text-amber-950 dark:text-amber-200">
                            {filterTashkeel(p.hemistich1 || p.text, tashkeel)}
                          </div>
                          <div className="text-base sm:text-lg font-medium text-left sm:text-center text-amber-950 dark:text-amber-200">
                            {filterTashkeel(p.hemistich2 || '', tashkeel)}
                          </div>
                        </div>
                        {p.volumePageBadge && (
                          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-amber-500/10 text-[10px] opacity-60 font-mono">
                            <Sparkles className="size-3 text-amber-500" />
                            <span>{p.volumePageBadge}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 2. Section Headings
                  if (p.isHeading) {
                    return (
                      <div key={p.id} className="pt-8 pb-3 border-b border-amber-500/20 my-4">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 dark:text-amber-400 text-lg">§</span>
                          <h3
                            className={cn(
                              'font-bold text-amber-800 dark:text-amber-300',
                              p.headingLevel === 1 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
                            )}
                          >
                            {textFormatted}
                          </h3>
                        </div>
                      </div>
                    );
                  }

                  // 3. Classical Paragraph / Matn / Sanad
                  return (
                    <div
                      key={p.id}
                      className="group relative text-justify leading-loose my-4 transition-colors rounded-xl p-3 -mx-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <p
                        className={cn(
                          'transition-colors text-[17px] sm:text-[19px] leading-[2.2]',
                          p.isHadithSanad && 'font-medium text-amber-950/90 dark:text-amber-100/90',
                          isSearchMatch && 'bg-amber-300/40 dark:bg-amber-500/30 p-1.5 rounded-lg font-medium'
                        )}
                      >
                        {p.volumePageBadge && (
                          <span className="inline-block ms-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-current/5 text-muted-foreground align-middle select-none">
                            {p.volumePageBadge}
                          </span>
                        )}
                        {textFormatted}
                      </p>

                      {/* Isolated Footnotes & Tahqiq Box */}
                      {p.footnotes && p.footnotes.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.05] dark:bg-amber-400/[0.04] border-r-2 border-amber-500/40 text-xs space-y-1 select-text">
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px] mb-1">
                            <FileText className="size-3" />
                            <span>الحواشي والتحقيق:</span>
                          </div>
                          {p.footnotes.map((fn, fIdx) => (
                            <p key={fIdx} className="text-muted-foreground leading-relaxed text-[12px] whitespace-pre-wrap">
                              {filterTashkeel(fn.text, tashkeel)}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Page Number & Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between pt-1 border-t border-current/5 text-[11px] text-muted-foreground">
                        <span className="font-mono text-[10px] opacity-70">
                          {p.volumePageBadge || `[ ص ${p.pageNumber} ]`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyCitation(p.text, p.pageNumber)}
                            className="p-1 hover:text-amber-500 rounded flex items-center gap-1"
                            title="نسخ مع العزو والتوثيق"
                          >
                            <Copy className="size-3" />
                            <span className="text-[10px]">نسخ</span>
                          </button>
                          <button
                            onClick={() => handleHighlightParagraph(p, 'yellow')}
                            className="p-1 hover:text-amber-500 rounded flex items-center gap-1"
                            title="تظليل وحفظ الفائدة"
                          >
                            <Highlighter className="size-3 text-amber-500" />
                            <span className="text-[10px]">تظليل</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* ─── Chapter Bottom Pagination Controls ────────────── */}
              <div className="flex items-center justify-between pt-12 mt-12 border-t border-current/10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentChapter <= 1}
                  onClick={() => setCurrentChapter((c) => Math.max(1, c - 1))}
                  className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5"
                >
                  <ChevronRight className="size-4" />
                  الفصل السابق
                </Button>

                <span className="text-xs opacity-60 font-semibold">
                  الفصل {currentChapter} من {metaRes?.meta.totalChapters || 1}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={Boolean(
                    metaRes?.meta.totalChapters && currentChapter >= metaRes.meta.totalChapters
                  )}
                  onClick={() => setCurrentChapter((c) => c + 1)}
                  className="rounded-xl px-4 py-2 text-xs font-bold gap-1.5"
                >
                  الفصل التالي
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </article>
          ) : (
            <div className="py-24 text-center space-y-4 animate-in fade-in duration-300">
              <div className="size-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
                <BookOpen className="size-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">تعذر جلب صفحات هذا الباب مباشرة</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                يمكنك الانتقال إلى أول الكتاب أو اختيار أي باب آخر من الفهرس الهرمي الجانبي.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setCurrentChapter(1)}
                  className="rounded-xl font-bold"
                >
                  الانتقال إلى بداية الكتاب
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab('toc');
                    setSidebarOpen(true);
                  }}
                  className="rounded-xl"
                >
                  فتح الفهرس
                </Button>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
