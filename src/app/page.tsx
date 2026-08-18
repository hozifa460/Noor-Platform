'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { MediaPlayer } from '@/components/player/MediaPlayer';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { MobileNav } from '@/components/layout/MobileNav';
import { HomeView } from '@/components/home/HomeView';
import { FloatingAIButton } from '@/components/ai/FloatingAIButton';
import { useNavStore, hashToViewState } from '@/stores/nav.store';
import { usePlayerStore } from '@/stores/player.store';
import { useLibrarySync } from '@/hooks/use-library';
import { useLiveMonitor } from '@/hooks/use-live-monitor';
import { useSettingsStore } from '@/stores/settings.store';
import { useTheme } from 'next-themes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ViewState } from '@/lib/types';

// Dynamic lazy-loaded Hubs for lightning-fast initial load & optimal code-splitting
const QuranHubView = dynamic(() => import('@/components/quran/QuranHubView').then((m) => m.QuranHubView), {
  loading: () => <div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل المصحف الشريف...</div>,
});
const HadithHubView = dynamic(() => import('@/components/hadith/HadithHubView').then((m) => m.HadithHubView), {
  loading: () => <div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل موسوعة الحديث...</div>,
});
const BooksLibraryView = dynamic(() => import('@/components/books/BooksLibraryView').then((m) => m.BooksLibraryView), {
  loading: () => <div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل مكتبة الكتب...</div>,
});
const FatwaLibraryView = dynamic(() => import('@/components/fatwa/FatwaLibraryView').then((m) => m.FatwaLibraryView), {
  loading: () => <div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل منصة الفتاوى...</div>,
});
const RadioHubView = dynamic(() => import('@/components/radio/RadioHubView').then((m) => m.RadioHubView), {
  loading: () => <div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل الإذاعات الإسلامية...</div>,
});
const SearchView = dynamic(() => import('@/components/search/SearchView').then((m) => m.SearchView));
const SheikhsListView = dynamic(() => import('@/components/sheikh/SheikhsListView').then((m) => m.SheikhsListView));
const SheikhProfile = dynamic(() => import('@/components/sheikh/SheikhProfile').then((m) => m.SheikhProfile));
const SectionView = dynamic(() => import('@/components/library/SectionView').then((m) => m.SectionView));
const FavoritesView = dynamic(() => import('@/components/library/FavoritesView').then((m) => m.FavoritesView));
const HistoryView = dynamic(() => import('@/components/library/HistoryView').then((m) => m.HistoryView));
const DownloadsView = dynamic(() => import('@/components/library/DownloadsView').then((m) => m.DownloadsView));
const SettingsView = dynamic(() => import('@/components/library/SettingsView').then((m) => m.SettingsView));

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
      case 'quran':
        return <QuranHubView />;
      case 'hadith':
        return <HadithHubView />;
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
        return <RadioHubView />;
      case 'fatwa':
        return <FatwaLibraryView />;
      case 'books':
        return <BooksLibraryView />;
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
            <ErrorBoundary>
              {renderView()}
            </ErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>

      {/* Floating AI Assistant Button */}
      <FloatingAIButton />

      {/* Mobile bottom navigation */}
      <MobileNav />

      <MediaPlayer item={currentItem} onClose={closePlayer} />
    </div>
  );
}
