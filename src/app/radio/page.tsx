'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/radio/RadioHubView').then(m => m.RadioHubView), {
  ssr: false,
});

export default function RadioPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
