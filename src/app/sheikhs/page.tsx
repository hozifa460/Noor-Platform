'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/sheikh/SheikhsListView').then(m => m.SheikhsListView), {
  ssr: false,
});

export default function SheikhsPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
