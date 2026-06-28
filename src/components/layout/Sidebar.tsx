'use client';

import Link from 'next/link';
import {
  Home,
  Users,
  PlayCircle,
  Zap,
  Radio,
  BookOpen,
  FileQuestion,
  FileText,
  Heart,
  History,
  Download,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavStore } from '@/stores/nav.store';
import { useLibraryStore } from '@/stores/library.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useHistoryStore } from '@/stores/history.store';
import { useDownloadsStore } from '@/stores/downloads.store';
import type { ViewKind } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NavItem {
  view: ViewKind;
  label: string;
  labelEn: string;
  icon: LucideIcon;
  badge?: 'library' | 'favorites' | 'history' | 'downloads';
}

const MAIN_NAV: NavItem[] = [
  { view: 'home', label: 'الرئيسية', labelEn: 'Home', icon: Home },
  { view: 'sheikhs', label: 'المشايخ', labelEn: 'Sheikhs', icon: Users },
];

const CONTENT_NAV: NavItem[] = [
  { view: 'videos', label: 'الفيديوهات', labelEn: 'Videos', icon: PlayCircle, badge: 'library' },
  { view: 'shorts', label: 'شورتس', labelEn: 'Shorts', icon: Zap, badge: 'library' },
  { view: 'live', label: 'البث المباشر', labelEn: 'Live', icon: Radio },
  { view: 'radio', label: 'الإذاعات', labelEn: 'Radio', icon: Radio },
  { view: 'fatwa', label: 'الفتاوى', labelEn: 'Fatwas', icon: FileQuestion },
  { view: 'books', label: 'الكتب', labelEn: 'Books', icon: BookOpen },
  { view: 'articles', label: 'المقالات', labelEn: 'Articles', icon: FileText },
];

const PERSONAL_NAV: NavItem[] = [
  { view: 'favorites', label: 'المفضلة', labelEn: 'Favorites', icon: Heart, badge: 'favorites' },
  { view: 'history', label: 'السجل', labelEn: 'History', icon: History, badge: 'history' },
  { view: 'downloads', label: 'التنزيلات', labelEn: 'Downloads', icon: Download, badge: 'downloads' },
  { view: 'settings', label: 'الإعدادات', labelEn: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const view = useNavStore((s) => s.view);
  const setView = useNavStore((s) => s.setView);

  const libraryItems = useLibraryStore((s) => s.items);
  const favoritesCount = useFavoritesStore((s) => s.favorites.length);
  const historyCount = useHistoryStore((s) => s.history.length);
  const downloadsCount = useDownloadsStore((s) => s.downloads.length);

  const getBadge = (b?: NavItem['badge']) => {
    if (!b) return null;
    if (b === 'library') return libraryItems.length;
    if (b === 'favorites') return favoritesCount;
    if (b === 'history') return historyCount;
    if (b === 'downloads') return downloadsCount;
    return null;
  };

  const handleNavigate = (v: ViewKind) => {
    setView(v);
    onClose();
  };

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="px-3 py-2">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          const badge = getBadge(item.badge);
          return (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                active && 'bg-primary/12 text-primary font-medium',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active && 'text-primary')} />
              <span className="flex-1 text-right">{item.label}</span>
              {badge !== null && badge > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 min-w-5 px-1.5 justify-center">
                  {badge > 999 ? '999+' : badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 lg:top-16 right-0 lg:right-auto z-40 lg:z-10',
          'h-screen lg:h-[calc(100vh-4rem)] w-72 lg:w-64 shrink-0',
          'bg-sidebar border-l border-sidebar-border lg:border-l-0 lg:border-r',
          'transform transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-sidebar-border">
          <span className="font-bold">القائمة</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X className="size-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-4rem)] lg:h-full">
          {renderSection('الرئيسية', MAIN_NAV)}
          {renderSection('المحتوى', CONTENT_NAV)}
          {renderSection('الشخصي', PERSONAL_NAV)}

          <div className="px-4 py-4 mt-2 mx-3 mb-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/15">
            <p className="text-xs font-semibold mb-1 text-foreground">منصة النور</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              قاعدة بيانات موزعة على GitHub و GitLab. تتم مزامنة المحتوى تلقائيًا كل بضع دقائق.
            </p>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
