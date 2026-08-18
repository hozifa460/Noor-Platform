'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/quran/QuranHubView').then(m => m.QuranHubView), {
  ssr: false,
});

export default function QuranPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
