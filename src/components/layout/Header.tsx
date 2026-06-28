'use client';

import { Search, Moon, Sun, Menu, RefreshCw, Radio, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useNavStore } from '@/stores/nav.store';
import { useLibraryStore } from '@/stores/library.store';
import { useLibrarySync } from '@/hooks/use-library';
import { useMounted } from '@/hooks/use-mounted';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [query, setQuery] = useState('');
  const openSearch = useNavStore((s) => s.openSearch);
  const goHome = useNavStore((s) => s.goHome);
  const syncing = useLibraryStore((s) => s.syncing);
  const itemCount = useLibraryStore((s) => s.items.length);
  const { sync } = useLibrarySync();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) openSearch(query.trim());
  };

  return (
    <header className="glass sticky top-0 z-40 border-b border-border/60">
      <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 h-16">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onToggleSidebar}
          aria-label="فتح القائمة"
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo */}
        <button
          onClick={goHome}
          className="flex items-center gap-2 shrink-0 group"
          aria-label="الصفحة الرئيسية"
        >
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-lg shadow-primary/20">
            <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-5z" />
              <path d="M9 12h6" />
            </svg>
          </div>
          <div className="hidden sm:flex flex-col leading-tight text-right">
            <span className="font-bold text-base">منصة النور</span>
            <span className="text-[10px] text-muted-foreground">Islamic Streaming</span>
          </div>
        </button>

        {/* Search */}
        <form
          onSubmit={submitSearch}
          className="flex-1 max-w-xl mx-auto relative"
        >
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن شيخ، محاضرة، سورة، فتوى..."
            className="pr-10 pl-16 h-10 bg-background/60"
            aria-label="بحث"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="مسح"
            >
              <X className="size-4" />
            </button>
          )}
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-8"
          >
            بحث
          </Button>
        </form>

        {/* Status + actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="hidden md:flex gap-1.5 px-2 py-1">
            <Radio className={`size-3 ${syncing ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
            <span className="text-[10px]">{itemCount} عنصر</span>
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => sync()}
            disabled={syncing}
            aria-label="تحديث المكتبة"
            title="مزامنة الآن"
            className="relative"
          >
            <RefreshCw className={`size-5 ${syncing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="تبديل الوضع الليلي"
          >
            {mounted && theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
