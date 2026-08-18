'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/hadith/HadithHubView').then(m => m.HadithHubView), {
  ssr: false,
});

export default function HadithPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
