'use client';

import { create } from 'zustand';
import type { ViewState } from '@/lib/types';

interface NavState extends ViewState {
  setView: (view: ViewState['view']) => void;
  openSheikh: (sheikhId: string) => void;
  openSearch: (query: string) => void;
  setSection: (section: ViewState['section']) => void;
  goHome: () => void;
  /**
   * Internal: update state WITHOUT pushing a new history entry. Used by the
   * popstate handler to sync the store with the browser's current history
   * state (back/forward navigation).
   */
  _syncFromHistory: (state: ViewState) => void;
}

/**
 * Navigation store backed by the browser History API.
 *
 * Why: without this, pressing the browser's Back button on any sub-page
 * (e.g. /videos, /sheikh) would exit the site entirely, because the SPA
 * doesn't push history entries by default. Users expect Back to return to
 * the previous in-app view, NOT to leave the site.
 *
 * Strategy:
 *   - Every navigation action (setView, openSheikh, openSearch, goHome)
 *     pushes a NEW history entry via `history.pushState()`.
 *   - A global `popstate` listener (registered in `src/app/page.tsx`)
 *     catches Back/Forward and calls `_syncFromHistory()` to update the
 *     store WITHOUT pushing another entry.
 *   - When the user is on the home page and presses Back, the history
 *     stack is empty, so the browser's default behavior takes over
 *     (exit to the previous site or close the tab) — which is the
 *     desired behavior.
 *
 * State persistence: each history entry carries a copy of the ViewState
 * in its `state` field, so the store can be restored exactly when the
 * user navigates back/forward.
 */
export const useNavStore = create<NavState>((set) => ({
  view: 'home',
  sheikhId: undefined,
  searchQuery: undefined,
  section: undefined,

  setView: (view) => {
    const next: ViewState = { view, sheikhId: undefined, searchQuery: undefined, section: undefined };
    pushHistory(next);
    set(next);
  },

  openSheikh: (sheikhId) => {
    const next: ViewState = { view: 'sheikh', sheikhId, searchQuery: undefined };
    pushHistory(next);
    set(next);
  },

  openSearch: (searchQuery) => {
    const next: ViewState = { view: 'search', searchQuery, sheikhId: undefined };
    pushHistory(next);
    set(next);
  },

  setSection: (section) => set({ section }),

  goHome: () => {
    const next: ViewState = { view: 'home', sheikhId: undefined, searchQuery: undefined, section: undefined };
    pushHistory(next);
    set(next);
  },

  _syncFromHistory: (state) => set(state),
}));

/**
 * Push a new entry to the browser's history stack with real App Router paths.
 */
function pushHistory(state: ViewState): void {
  if (typeof window === 'undefined') return;
  const path = viewStateToPath(state);
  try {
    window.history.pushState(state, '', path);
  } catch {
    // Ignore error on long titles
  }
}

/**
 * Convert a ViewState to a clean URL path.
 *   home            → /
 *   videos          → /videos
 *   sheikh (id=X)   → /sheikh/X
 *   search (q=Y)    → /search?q=Y
 */
export function viewStateToPath(state: ViewState): string {
  switch (state.view) {
    case 'home':
      return '/';
    case 'sheikh':
      return `/sheikh/${encodeURIComponent(state.sheikhId || '')}`;
    case 'search':
      return `/search?q=${encodeURIComponent(state.searchQuery || '')}`;
    default:
      return `/${state.view}`;
  }
}

export function viewStateToHash(state: ViewState): string {
  return viewStateToPath(state);
}

/**
 * Parse a URL path or hash back into a ViewState.
 */
export function hashToViewState(pathOrHash: string): ViewState | null {
  const cleaned = pathOrHash.replace(/^[#/]+/, '');
  if (!cleaned) return { view: 'home' };
  const parts = cleaned.split('?')[0].split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'home' };
  const [kind, ...rest] = parts;
  switch (kind) {
    case 'home':
      return { view: 'home' };
    case 'sheikh':
      return { view: 'sheikh', sheikhId: decodeURIComponent(rest.join('/')) };
    case 'search': {
      const q = pathOrHash.includes('?q=') ? decodeURIComponent(pathOrHash.split('?q=')[1]) : '';
      return { view: 'search', searchQuery: q };
    }
    case 'quran':
    case 'hadith':
    case 'videos':
    case 'shorts':
    case 'live':
    case 'radio':
    case 'fatwa':
    case 'books':
    case 'articles':
    case 'favorites':
    case 'history':
    case 'downloads':
    case 'settings':
      return { view: kind };
    default:
      return null;
  }
}
