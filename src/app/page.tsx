'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { MediaPlayer } from '@/components/player/MediaPlayer';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { MobileNav } from '@/components/layout/MobileNav';
import { HomeView } from '@/components/home/HomeView';
import { SheikhsListView } from '@/components/sheikh/SheikhsListView';
import { SheikhProfile } from '@/components/sheikh/SheikhProfile';
import { SectionView } from '@/components/library/SectionView';
import { FavoritesView } from '@/components/library/FavoritesView';
import { HistoryView } from '@/components/library/HistoryView';
import { DownloadsView } from '@/components/library/DownloadsView';
import { SettingsView } from '@/components/library/SettingsView';
import { SearchView } from '@/components/search/SearchView';
import { useNavStore, hashToViewState } from '@/stores/nav.store';
import { usePlayerStore } from '@/stores/player.store';
import { useLibrarySync } from '@/hooks/use-library';
import { useLiveMonitor } from '@/hooks/use-live-monitor';
import { useSettingsStore } from '@/stores/settings.store';
import { useTheme } from 'next-themes';
import type { ViewState } from '@/lib/types';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const view = useNavStore((s) => s.view);
  const sheikhId = useNavStore((s) => s.sheikhId);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const closePlayer = usePlayerStore((s) => s.close);

  // Initialize library sync and theme on mount.
  useLibrarySync();
  // Periodically refresh `liveStatus` on live items so ended broadcasts
  // move from "مباشر الآن" to "بثوث سابقة" automatically.
  useLiveMonitor();
  const theme = useSettingsStore((s) => s.theme);
  const { setTheme } = useTheme();

  // Sync settings theme with next-themes.
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // ─── History API integration ────────────────────────────────────
  //
  // On mount: replace the initial history entry with a home ViewState so
  // the history stack starts clean. This ensures the FIRST back press on
  // any sub-page returns to home (not exit the site).
  //
  // On popstate (back/forward button): restore the ViewState from the
  // history entry's `state` field. If state is null (user pressed Back
  // past the initial entry), fall back to parsing the URL hash, then to
  // home.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed the initial history entry with home state. Use replaceState so
    // we don't add a duplicate entry on top of the browser's initial one.
    const initialState: ViewState = { view: 'home' };
    // If there's already a hash (e.g. user pasted #/videos), restore from it.
    const fromHash = hashToViewState(window.location.hash);
    const seed = fromHash || initialState;
    window.history.replaceState(seed, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as ViewState | null;
      if (state && state.view) {
        useNavStore.getState()._syncFromHistory(state);
      } else {
        // No state — try parsing the hash, then fall back to home.
        const fromHash = hashToViewState(window.location.hash);
        useNavStore.getState()._syncFromHistory(fromHash || { view: 'home' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll to top on view change (but NOT on popstate — let the browser
  // restore the original scroll position naturally).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view, sheikhId]);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeView />;
      case 'sheikhs':
        return <SheikhsListView />;
      case 'sheikh':
        return sheikhId ? <SheikhProfile sheikhId={sheikhId} /> : <HomeView />;
      case 'videos':
        return <SectionView section="videos" />;
      case 'shorts':
        return <SectionView section="shorts" />;
      case 'live':
        return <SectionView section="live" />;
      case 'radio':
        return <SectionView section="radio" />;
      case 'fatwa':
        return <SectionView section="fatwa" />;
      case 'books':
        return <SectionView section="books" />;
      case 'articles':
        return <SectionView section="articles" />;
      case 'favorites':
        return <FavoritesView />;
      case 'history':
        return <HistoryView />;
      case 'downloads':
        return <DownloadsView />;
      case 'settings':
        return <SettingsView />;
      case 'search':
        return <SearchView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ServiceWorkerRegister />
      <KeyboardShortcuts />
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 pb-24 lg:pb-6">
            {renderView()}
          </div>
          <Footer />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      <MediaPlayer item={currentItem} onClose={closePlayer} />
    </div>
  );
}
