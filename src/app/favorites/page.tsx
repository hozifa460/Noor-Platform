'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/library/FavoritesView').then(m => m.FavoritesView), {
  ssr: false,
});

export default function FavoritesPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
