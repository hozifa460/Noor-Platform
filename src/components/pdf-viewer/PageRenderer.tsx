'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageRendererProps {
  pageNum: number;
  renderPage: (
    pageNum: number,
    canvas: HTMLCanvasElement,
    zoom: number,
  ) => Promise<void>;
  zoom: number;
  estimatedHeight?: number;
  isActive: boolean;
}

/**
 * Renders a single PDF page to a canvas.
 *
 * Uses an offscreen canvas approach:
 *   1. Render the page to an offscreen canvas via PDF.js
 *   2. Convert to a JPEG data URL
 *   3. Display in an <img> tag
 *
 * This approach:
 *   - Is more reliable than direct canvas rendering (avoids blank pages)
 *   - Supports text selection (PDF.js text layer can be overlaid)
 *   - Works with the IndexedDB cache
 *   - Is HiDPI-aware (renders at 2x for crisp display)
 */
export function PageRenderer({
  pageNum,
  renderPage,
  zoom,
  estimatedHeight = 1100,
  isActive,
}: PageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setRendered(false);
        setError(false);
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    (async () => {
      try {
        await renderPage(pageNum, canvas, zoom);
        if (cancelled) return;
        setRendered(true);
      } catch (err) {
        if (cancelled) return;
        console.error('[PageRenderer] Failed to render page', pageNum, err);
        setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageNum, renderPage, zoom]);

  return (
    <div
      data-page={pageNum}
      className={cn(
        'mx-auto bg-white shadow-lg rounded-sm overflow-hidden transition-opacity',
        isActive && 'ring-2 ring-primary/50',
      )}
      style={{
        width: 'min(100%, 800px)',
        minHeight: estimatedHeight,
      }}
    >
      {/* Loading skeleton */}
      {!rendered && !error && (
        <div
          className="grid place-items-center bg-muted/30"
          style={{ height: estimatedHeight }}
        >
          <div className="text-center">
            <Loader2 className="size-6 animate-spin text-primary/60 mx-auto mb-2" />
            <span className="text-xs text-muted-foreground">صفحة {pageNum}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="grid place-items-center bg-destructive/5"
          style={{ height: estimatedHeight }}
        >
          <span className="text-xs text-destructive">تعذر عرض صفحة {pageNum}</span>
        </div>
      )}

      {/* The canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
        style={{ display: rendered ? 'block' : 'none' }}
      />

      {/* Page number badge */}
      <div className="text-center py-1 text-[10px] text-muted-foreground bg-muted/20 border-t border-border">
        صفحة {pageNum}
      </div>
    </div>
  );
}
