'use client';

import { Github, Gitlab, RefreshCw, Shield } from 'lucide-react';
import { useLibraryStore } from '@/stores/library.store';

export function Footer() {
  const lastSync = useLibraryStore((s) => s.lastSync);
  const repoStatus = useLibraryStore((s) => s.repoStatus);

  const formatTime = (ts: number | null) => {
    if (!ts) return 'لم تتم المزامنة بعد';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'منذ ثوانٍ';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    return `منذ ${Math.floor(diff / 3600)} ساعة`;
  };

  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="px-4 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Shield className="size-4 text-primary" />
            <span>منصة النور — منصة بث إسلامية تعتمد على مستودعات GitHub و GitLab</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Github className="size-4" />
              <Gitlab className="size-4" />
              <span>مصادر: {repoStatus.length || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="size-3" />
              <span>{formatTime(lastSync)}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
