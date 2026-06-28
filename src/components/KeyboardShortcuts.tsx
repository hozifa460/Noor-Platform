'use client';

import { useEffect } from 'react';
import { useNavStore } from '@/stores/nav.store';

/**
 * Global keyboard shortcuts:
 *   /          → focus search
 *   g h        → go home
 *   g s        → go to sheikhs list
 *   g v        → go to videos
 *   g f        → go to favorites
 *   g d        → go to downloads
 *   Escape     → close player (if open) or go back
 *
 * Shortcuts are disabled when the user is typing in an input/textarea.
 */
export function KeyboardShortcuts() {
  const setView = useNavStore((s) => s.setView);
  const goHome = useNavStore((s) => s.goHome);

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      // Don't interfere with typing.
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // "/" focuses search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="ابحث"]');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // "g" prefix: wait for next key
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !gPressed) {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPressed = false;
        }, 800);
        return;
      }

      if (gPressed) {
        gPressed = false;
        if (gTimer) clearTimeout(gTimer);
        switch (e.key) {
          case 'h': goHome(); break;
          case 's': setView('sheikhs'); break;
          case 'v': setView('videos'); break;
          case 'f': setView('favorites'); break;
          case 'd': setView('downloads'); break;
          case 'l': setView('live'); break;
        }
        return;
      }

      // Escape: go home (simplified — could close modals etc.)
      if (e.key === 'Escape') {
        const player = document.querySelector('[role="dialog"]');
        if (!player) {
          goHome();
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setView, goHome]);

  return null;
}
