import type { Metadata } from 'next';
import { SectionView } from '@/components/library/SectionView';

export const metadata: Metadata = {
  title: 'المقاطع القصيرة (شورتس) | منصة نور',
  description: 'مقاطع دعوية وتربوية وفتاوى سريعة ومختصرات نافعة من كبار المشايخ.',
};

export default function ShortsPage() {
  return <SectionView section="shorts" />;
}
