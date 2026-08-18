'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/search/SearchView').then(m => m.SearchView), {
  ssr: false,
});

export default function SearchPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
