import type { Metadata } from 'next';
import { SectionView } from '@/components/library/SectionView';

export const metadata: Metadata = {
  title: 'المقالات والبحوث الإسلامية | منصة نور',
  description: 'مقالات شرعية وبحوث علمية مؤصلة ومقتطفات من رسائل الأئمة والعلماء.',
};

export default function ArticlesPage() {
  return <SectionView section="articles" />;
}
