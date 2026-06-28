'use client';

import { Home, Users, Search, Heart, Settings } from 'lucide-react';
import { useNavStore } from '@/stores/nav.store';
import type { ViewKind } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NavItem {
  view: ViewKind;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'home', label: 'الرئيسية', icon: Home },
  { view: 'sheikhs', label: 'مشايخ', icon: Users },
  { view: 'search', label: 'بحث', icon: Search },
  { view: 'favorites', label: 'مفضلة', icon: Heart },
  { view: 'settings', label: 'إعدادات', icon: Settings },
];

/**
 * Mobile bottom navigation bar — shown only on small screens (lg:hidden).
 * Replaces the sidebar for quick navigation on phones.
 */
export function MobileNav() {
  const view = useNavStore((s) => s.view);
  const setView = useNavStore((s) => s.setView);
  const openSearch = useNavStore((s) => s.openSearch);

  const handleNav = (item: NavItem) => {
    if (item.view === 'search') {
      openSearch('');
    } else {
      setView(item.view);
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
      <div className="grid grid-cols-5 gap-1 px-2 py-1.5 safe-area-inset-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.view || (item.view === 'search' && view === 'search');
          return (
            <button
              key={item.view}
              onClick={() => handleNav(item)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('size-5', active && 'fill-primary/20')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
