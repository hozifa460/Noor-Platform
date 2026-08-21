import type { Metadata } from 'next';
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
  return <FavoritesView />;
}
