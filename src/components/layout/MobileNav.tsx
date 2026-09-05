'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Scroll, Library, Radio, Search, Sparkles } from 'lucide-react';
import { useNavStore } from '@/stores/nav-store';
import type { ViewKind } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NavItem {
  view: ViewKind;
  href: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'home', href: '/', label: 'الرئيسية', icon: Home },
  { view: 'quran', href: '/quran', label: 'القرآن', icon: BookOpen },
  { view: 'hadith', href: '/hadith', label: 'الحديث', icon: Scroll },
  { view: 'adhkar', href: '/adhkar', label: 'الأذكار', icon: Sparkles },
  { view: 'books', href: '/books', label: 'المكتبة', icon: Library },
  { view: 'radio', href: '/radio', label: 'الإذاعات', icon: Radio },
  { view: 'search', href: '/search', label: 'بحث', icon: Search },
];

/**
 * Mobile bottom navigation bar — shown only on small screens (lg:hidden).
 * Direct Next.js App Router navigation across all primary Islamic hubs.
 */
export function MobileNav() {
  const pathname = usePathname();
  const setView = useNavStore((s) => s.setView);

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border shadow-lg">
      <div className="grid grid-cols-7 gap-0.5 px-1 py-1.5 safe-area-inset-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setView(item.view)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-lg transition-colors',
                active ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('size-4 sm:size-5', active && 'stroke-[2.5] text-primary')} />
              <span className="text-[9px] sm:text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
