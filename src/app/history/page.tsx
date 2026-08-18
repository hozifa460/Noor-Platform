'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/library/HistoryView').then(m => m.HistoryView), {
  ssr: false,
});

export default function HistoryPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
