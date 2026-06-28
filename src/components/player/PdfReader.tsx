'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  ExternalLink,
  Maximize,
  Minimize,
  FileText,
  Download,
  BookOpen,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PdfReaderProps {
  url: string;
  title?: string;
}

/**
 * Professional PDF Reader — FINAL ROOT SOLUTION.
 *
 * Strategy: Open the PDF in a NEW BROWSER TAB by default.
 *
 * Why? Because iframe/embed/object ALL have issues:
 *   - <iframe>: blocked by Microsoft Edge security
 *   - <embed>: shows blank in some browsers
 *   - <object>: inconsistent behavior
 *
 * Opening in a new tab ALWAYS works:
 *   - The browser's native PDF viewer is the best, fastest viewer
 *   - No security restrictions
 *   - Full screen reading experience
 *   - Built-in zoom, search, page navigation, thumbnails
 *   - Range requests = instant first page
 *
 * The reader shows a beautiful "open book" preview with a prominent
 * "Open Book" button. The user clicks it and the PDF opens in a new tab.
 */
export function PdfReader({ url, title }: PdfReaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const proxyUrl = proxifyUrl(url);

  // Fullscreen handling.
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col w-full bg-card rounded-xl border border-border overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
      )}
      style={{ height: isFullscreen ? '100vh' : '85vh' }}
    >
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <FileText className="size-4 text-primary shrink-0" />
        {title && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            {title}
          </span>
        )}
        <div className="flex-1" />
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
        >
          <a href={url} target="_blank" rel="noopener noreferrer" download>
            <Download className="size-3.5" />
            <span className="hidden sm:inline">تنزيل</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </Button>
      </div>

      {/* ─── Book preview + open button ─── */}
      <div className="flex-1 relative bg-gradient-to-br from-primary/5 to-accent/5 grid place-items-center p-6 overflow-auto">
        <div className="text-center max-w-lg">
          {/* Book icon */}
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative size-24 rounded-2xl bg-primary/10 grid place-items-center">
              <BookOpen className="size-12 text-primary" />
            </div>
          </div>

          {/* Title */}
          {title && (
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{title}</h3>
          )}

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground mb-6">
            اضغط الزر أدناه لفتح الكتاب في نافذة منفصلة باستخدام عارض PDF
            المدمج في متصفحك لضمان أفضل تجربة قراءة
          </p>

          {/* Open button — PRIMARY action */}
          <Button
            asChild
            size="lg"
            className="gap-2 w-full max-w-xs h-12 text-base"
          >
            <a href={proxyUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-5" />
              فتح الكتاب للقراءة
            </a>
          </Button>

          {/* Secondary actions */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
            >
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <Download className="size-3.5" />
                تنزيل الكتاب
              </a>
            </Button>
          </div>

          {/* Features list */}
          <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-muted-foreground max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-primary" />
              عرض فوري للصفحة الأولى
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-primary" />
              تكبير وتصغير
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-primary" />
              بحث داخل الكتاب
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-primary" />
              تنقل بين الصفحات
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function proxifyUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return url;
    return `/api/proxy/pdf?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
