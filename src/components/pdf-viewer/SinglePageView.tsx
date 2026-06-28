'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsePdfViewerResult } from '@/hooks/use-pdf-viewer';

interface SinglePageViewProps {
  viewer: UsePdfViewerResult;
}

/**
 * Single-page view — shows one page at a time (book-style).
 *
 * Renders only the current page + prefetches the next 2 pages in the
 * background for instant navigation.
 */
export function SinglePageView({ viewer }: SinglePageViewProps) {
  const { pdfDoc, currentPage, numPages, zoom, renderPage, nextPage, prevPage } =
    viewer;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageRendering, setPageRendering] = useState(true);

  useEffect(() => {
    if (!pdfDoc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) setPageRendering(true);
    });

    (async () => {
      try {
        await renderPage(currentPage, canvas, zoom);
        if (cancelled) return;
        setPageRendering(false);

        // Prefetch next 2 pages.
        for (const p of [currentPage + 1, currentPage + 2]) {
          if (cancelled || p > numPages) return;
          try {
            const page = await pdfDoc.getPage(p);
            // Just loading caches it in PDF.js's internal cache.
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('[SinglePageView] Failed to render page', currentPage, err);
        setPageRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, zoom, numPages, renderPage]);

  if (!pdfDoc) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto grid place-items-center p-4 bg-muted/20">
        <div className="relative">
          {pageRendering && (
            <div
              className="absolute inset-0 grid place-items-center bg-muted/60 rounded-lg z-10"
              style={{ minHeight: 600 }}
            >
              <div className="text-center">
                <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  صفحة {currentPage}
                </p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto shadow-xl bg-white rounded"
          />
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-center gap-4 py-2 border-t border-border bg-background shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevPage}
          disabled={currentPage <= 1}
        >
          <ChevronRight className="size-5" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentPage} / {numPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextPage}
          disabled={currentPage >= numPages}
        >
          <ChevronLeft className="size-5" />
        </Button>
      </div>
    </div>
  );
}
