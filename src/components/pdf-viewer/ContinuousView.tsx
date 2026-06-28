'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageRenderer } from './PageRenderer';
import type { UsePdfViewerResult } from '@/hooks/use-pdf-viewer';

const ESTIMATED_PAGE_HEIGHT = 1100;
const PADDING = 12;

interface ContinuousViewProps {
  viewer: UsePdfViewerResult;
}

/**
 * Virtualized continuous scroll view.
 *
 * Only renders pages near the viewport (typically 5-7 pages at a time),
 * regardless of total page count. Spacers above and below maintain the
 * correct scroll height so the scrollbar stays accurate.
 *
 * This keeps the DOM at ~5-7 elements even for 1000+ page PDFs,
 * preventing memory leaks and browser crashes.
 */
export function ContinuousView({ viewer }: ContinuousViewProps) {
  const { pdfDoc, numPages, zoom, currentPage, renderPage, goToPage } = viewer;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 5 });
  const [pageHeight, setPageHeight] = useState(ESTIMATED_PAGE_HEIGHT);
  const visiblePageRef = useRef(currentPage);

  // Detect which page is currently in view based on scroll position.
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || numPages === 0) return;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const effectiveHeight = pageHeight + PADDING;

    const topPage = Math.max(
      1,
      Math.min(numPages, Math.floor(scrollTop / effectiveHeight) + 1),
    );
    const pagesInView = Math.ceil(viewportHeight / effectiveHeight) + 2;

    const start = Math.max(1, topPage - 1);
    const end = Math.min(numPages, topPage + pagesInView + 1);

    setVisibleRange((prev) => {
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });

    // Update current page for progress tracking.
    if (topPage !== visiblePageRef.current) {
      visiblePageRef.current = topPage;
      goToPage(topPage);
    }
  }, [numPages, pageHeight, goToPage]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !pdfDoc) return;
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pdfDoc, handleScroll]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => handleScroll());
    ro.observe(container);
    return () => ro.disconnect();
  }, [handleScroll]);

  // Scroll to current page when it changes (e.g., from page input).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !pdfDoc) return;
    // Only scroll if the page is significantly different from what's visible.
    const effectiveHeight = pageHeight + PADDING;
    const expectedScrollTop = (currentPage - 1) * effectiveHeight;
    const actualScrollTop = container.scrollTop;
    const diff = Math.abs(expectedScrollTop - actualScrollTop);
    if (diff > effectiveHeight * 1.5) {
      container.scrollTo({ top: expectedScrollTop, behavior: 'smooth' });
    }
  }, [currentPage, pdfDoc, pageHeight]);

  if (!pdfDoc) return null;

  const effectiveHeight = pageHeight + PADDING;
  const aboveHeight = (visibleRange.start - 1) * effectiveHeight;
  const belowHeight = Math.max(
    0,
    (numPages - visibleRange.end) * effectiveHeight,
  );

  const pagesToRender: number[] = [];
  for (let p = visibleRange.start; p <= visibleRange.end; p++) {
    pagesToRender.push(p);
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-auto h-full"
      style={{ direction: 'ltr' }}
    >
      <div style={{ width: '100%' }}>
        {aboveHeight > 0 && <div style={{ height: aboveHeight }} />}
        {pagesToRender.map((pageNum) => (
          <PageRenderer
            key={pageNum}
            pageNum={pageNum}
            renderPage={renderPage}
            zoom={zoom}
            estimatedHeight={pageHeight}
            isActive={pageNum === currentPage}
          />
        ))}
        {belowHeight > 0 && <div style={{ height: belowHeight }} />}
      </div>
    </div>
  );
}
