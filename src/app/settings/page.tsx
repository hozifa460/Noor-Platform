'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/library/SettingsView').then(m => m.SettingsView), {
  ssr: false,
});

export default function SettingsPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
