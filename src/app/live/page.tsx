import type { Metadata } from 'next';
import { SectionView } from '@/components/library/SectionView';

export const metadata: Metadata = {
  title: 'البث المباشر والدروس الحية | منصة نور',
  description: 'بث مباشر من الحرمين الشريفين والقنوات الإسلامية والدروس العلمية الحية.',
};

export default function LivePage() {
  return <SectionView section="live" />;
}
