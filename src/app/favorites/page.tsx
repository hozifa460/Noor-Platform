import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { FavoritesView } from '@/components/library/FavoritesView';

export const metadata: Metadata = {
  title: 'المفضلة والمحفوظات | منصة نور',
  description: 'المحتوى القرآني والحديثي والكتب المحفوظة للوصول السريع.',
  openGraph: {
    title: 'المفضلة والمحفوظات | منصة نور',
    description: 'المحتوى القرآني والحديثي والكتب المحفوظة للوصول السريع.',
  },
};

export default function FavoritesPage() {
  return (
    <AppShell>
      <FavoritesView />
    </AppShell>
  );
}
