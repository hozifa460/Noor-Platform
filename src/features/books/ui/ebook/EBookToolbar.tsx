'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Settings2,
  ListTree,
  Download,
  Check,
  Sparkles,
  FileText,
  X,
  Loader2,
  Search,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  ReadingTheme,
  TashkeelMode,
  FontFamily,
  ThemeStyle,
} from './types';

interface EBookToolbarProps {
  title: string;
  author?: string;
  authorDeath?: string;
  hasFacsimilePdf?: boolean;
  onClose: () => void;
  onSwitchToPdf?: () => void;
  isExporting: boolean;
  onDownloadDeviceFile: () => void;
  isOfflineCached: boolean;
  downloadProgress: number | null;
  onSaveOffline: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSearch?: () => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isSpeaking?: boolean;
  onToggleSpeech?: () => void;
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  fontFamily: FontFamily;
  setFontFamily: (f: FontFamily) => void;
  tashkeel: TashkeelMode;
  setTashkeel: (m: TashkeelMode) => void;
  currentChapter: number;
  totalChapters?: number;
  themeStyle: ThemeStyle;
}

export function EBookToolbar({
  title,
  author,
  authorDeath,
  hasFacsimilePdf,
  onClose,
  onSwitchToPdf,
  isExporting,
  onDownloadDeviceFile,
  isOfflineCached,
  downloadProgress,
  onSaveOffline,
  sidebarOpen,
  onToggleSidebar,
  onOpenSearch,
  focusMode,
  onToggleFocusMode,
  isSpeaking,
  onToggleSpeech,
  theme,
  setTheme,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  tashkeel,
  setTashkeel,
  currentChapter,
  totalChapters,
  themeStyle,
}: EBookToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);

  // Close settings panel when clicking outside
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  const progressPercent = totalChapters && totalChapters > 0
    ? Math.round((currentChapter / totalChapters) * 100)
    : 0;

  return (
    <header className="relative z-20 shrink-0 select-none">
      {/* ─── Main Top Bar ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center justify-between px-3 sm:px-6 py-2.5 border-b shadow-sm transition-colors',
          themeStyle.headerBg
        )}
      >
        {/* Right Section: Back + Title & Meta (RTL Arabic: on the right) */}
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
              <span className="font-extrabold text-sm sm:text-base truncate max-w-[180px] sm:max-w-[340px]">
                {title}
              </span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 shrink-0"
              >
                <Sparkles className="size-2.5" />
                نص حي فائق السرعة
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-75 truncate">
              <span>{author}</span>
              {authorDeath && (
                <span className="hidden sm:inline-block text-[10px] px-1 rounded bg-black/5 dark:bg-white/5 font-mono">
                  ({authorDeath})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Dual-Mode Switcher (PDF Facsimile) */}
        {hasFacsimilePdf && onSwitchToPdf && (
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

        {/* Left Section: Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick Search Modal trigger */}
          {onOpenSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSearch}
              className="rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
              title="بحث سريع في نص الكتاب"
            >
              <Search className="size-4" />
            </Button>
          )}

          {/* Text-To-Speech Speech Audio Toggle */}
          {onToggleSpeech && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSpeech}
              className={cn(
                'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors',
                isSpeaking && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              )}
              title={isSpeaking ? 'إيقاف القراءة الصوتية' : 'استماع صوتي للباب'}
            >
              {isSpeaking ? (
                <VolumeX className="size-4 text-amber-600 animate-pulse" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          )}

          {/* Focus Mode Toggle */}
          {onToggleFocusMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFocusMode}
              className={cn(
                'rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 hidden sm:inline-flex',
                focusMode && 'bg-amber-500/20 text-amber-600'
              )}
              title={focusMode ? 'الخروج من وضع التركيز' : 'وضع التركيز الهادئ'}
            >
              {focusMode ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
          )}

          {/* Download to Device (.txt) Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownloadDeviceFile}
            disabled={isExporting}
            className="rounded-full size-9 p-0 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 relative"
            title="تحميل الكتاب كاملاً على جهازك (.txt)"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin text-amber-500" />
            ) : (
              <Download className="size-4" />
            )}
          </Button>

          {/* Offline Cache Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveOffline}
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

          {/* Table of Contents & Sidebar Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
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
      </div>

      {/* ─── Reading Progress Bar ──────────────────────────────────── */}
      {totalChapters && totalChapters > 0 ? (
        <div className="w-full bg-black/5 dark:bg-white/5 h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      ) : null}

      {/* ─── Settings Floating Panel ───────────────────────────────── */}
      {settingsOpen && (
        <div
          ref={settingsPanelRef}
          className={cn(
            'absolute top-14 left-4 sm:left-6 z-40 w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 select-text',
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
    </header>
  );
}
