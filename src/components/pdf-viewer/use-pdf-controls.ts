'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { usePdfViewer } from '@/hooks/use-pdf-viewer';

type PdfViewerHookReturn = ReturnType<typeof usePdfViewer>;

export function usePdfControls(viewer: PdfViewerHookReturn) {
  // ─── Focus mode (auto-hide controls) ─────────────────────────────
  const [focusMode, setFocusMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (focusMode) {
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) {
      Promise.resolve().then(() => setControlsVisible(true));
      return;
    }
    Promise.resolve().then(() => showControlsTemporarily());
  }, [focusMode, showControlsTemporarily]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          if (viewer.viewMode === 'single') {
            e.preventDefault();
            viewer.nextPage();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          if (viewer.viewMode === 'single') {
            e.preventDefault();
            viewer.prevPage();
          }
          break;
        case 'Home':
          e.preventDefault();
          viewer.goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          viewer.goToPage(viewer.numPages);
          break;
        case '+':
        case '=':
          e.preventDefault();
          viewer.zoomIn();
          break;
        case '-':
          e.preventDefault();
          viewer.zoomOut();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            viewer.toggleFullscreen();
          }
          break;
        case 'b':
        case 'B':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            viewer.toggleBookmark(viewer.currentPage);
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewer]);

  // ─── Mouse wheel zoom (Ctrl + scroll) ────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) viewer.zoomIn();
        else viewer.zoomOut();
      }
    },
    [viewer],
  );

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // ─── Touch gestures (pinch zoom) ─────────────────────────────────
  const touchRef = useRef<{ distance: number | null }>({ distance: null });
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current.distance = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchRef.current.distance) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        const diff = newDistance - touchRef.current.distance;
        if (Math.abs(diff) > 10) {
          if (diff > 0) viewer.zoomIn();
          else viewer.zoomOut();
          touchRef.current.distance = newDistance;
        }
      }
    },
    [viewer],
  );

  const handleTouchEnd = useCallback(() => {
    touchRef.current.distance = null;
  }, []);

  return {
    focusMode,
    setFocusMode,
    controlsVisible,
    showControlsTemporarily,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
