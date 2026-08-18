import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsView } from '@/components/library/SettingsView';

export const metadata: Metadata = {
  title: 'الإعدادات والتخصيص | منصة نور',
  description: 'تخصيص المظهر، خطوط المصحف، وضع القراءة، وإدارة التخزين المؤقت في منصة نور.',
  openGraph: {
    title: 'الإعدادات والتخصيص | منصة نور',
    description: 'تخصيص المظهر، خطوط المصحف، وضع القراءة، وإدارة التخزين المؤقت في منصة نور.',
  },
};

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}
