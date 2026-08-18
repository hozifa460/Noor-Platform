'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/library/DownloadsView').then(m => m.DownloadsView), {
  ssr: false,
});

export default function DownloadsPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
