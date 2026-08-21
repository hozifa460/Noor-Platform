"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { MobileNav } from "@/components/layout/MobileNav";
import { FloatingAIButton } from "@/components/ai/FloatingAIButton";
import { usePlayerStore } from "@/stores/player.store";
import { useLibrarySync } from "@/hooks/use-library";
import { useLiveMonitor } from "@/hooks/use-live-monitor";
import { useSettingsStore } from "@/stores/settings.store";
import { useTheme } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const closePlayer = usePlayerStore((s) => s.close);

  useLibrarySync();
  useLiveMonitor();

  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const rtl = useSettingsStore((s) => s.rtl);
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language || 'ar';
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    }
  }, [language, rtl]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ServiceWorkerRegister />
      <KeyboardShortcuts />
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 pb-24 lg:pb-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>

      <FloatingAIButton />
      <MobileNav />
      <MediaPlayer item={currentItem} onClose={closePlayer} />
    </div>
  );
}
