import type { Metadata } from 'next';
import { HomeView } from '@/components/home/HomeView';

export const metadata: Metadata = {
  title: 'منصة نور — الموسوعة الإسلامية الشاملة للقرآن والحديث والفتاوى والتراث',
  description:
    'الموسوعة الإسلامية الشاملة: تلاوات القرآن الكريم، أمهات كتب الحديث والتفاسير والفقه، وموسوعة الفتاوى الشرعية، والإذاعات الإسلامية المباشرة.',
};

export default function HomePage() {
  return <HomeView />;
}
