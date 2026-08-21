import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts:
 *   /          → focus search
 *   g h        → go home (/)
 *   g s        → go to sheikhs list (/sheikhs)
 *   g q        → go to quran (/quran)
 *   g m        → go to hadith (/hadith)
 *   g b        → go to books (/books)
 *   g r        → go to radio (/radio)
 *   g v        → go to videos (/videos)
 *   g f        → go to favorites (/favorites)
 *   g d        → go to downloads (/downloads)
 *   Escape     → close open dialog/drawer or go back
 *
 * Shortcuts are disabled when the user is typing in an input/textarea.
 */
export function KeyboardShortcuts() {
  const router = useRouter();

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
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="ابحث"], input[type="search"], input[aria-label*="بحث"], input[type="text"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
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
          case 'h': router.push('/'); break;
          case 's': router.push('/sheikhs'); break;
          case 'q': router.push('/quran'); break;
          case 'm': router.push('/hadith'); break;
          case 'b': router.push('/books'); break;
          case 'r': router.push('/radio'); break;
          case 'v': router.push('/videos'); break;
          case 'f': router.push('/favorites'); break;
          case 'd': router.push('/downloads'); break;
          case 'l': router.push('/live'); break;
        }
        return;
      }

      // Escape: close open drawers/modals first
      if (e.key === 'Escape') {
        const modalOrDrawer = document.querySelector('[role="dialog"], [data-state="open"], .fixed.inset-0');
        if (!modalOrDrawer) {
          router.push('/');
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return null;
}
