import type { Metadata } from 'next';
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
  return <SettingsView />;
}
