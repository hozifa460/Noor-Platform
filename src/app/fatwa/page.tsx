'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/fatwa/FatwaLibraryView').then(m => m.FatwaLibraryView), {
  ssr: false,
});

export default function FatwaPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
